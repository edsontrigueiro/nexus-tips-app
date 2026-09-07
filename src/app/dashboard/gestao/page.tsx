"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Operation, Signal } from "@/lib/types";

type OperationRow = Operation & { signals: Signal };

function profitOf(op: OperationRow): number {
  if (op.status === "green") return op.valor * (op.signals.odd - 1);
  if (op.status === "red") return -op.valor;
  return 0;
}

function ProfitChart({ series }: { series: number[] }) {
  if (series.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-muted">
        Marque e feche mais operações para ver sua curva de lucro aqui.
      </div>
    );
  }
  const w = 300;
  const h = 110;
  const min = Math.min(0, ...series);
  const max = Math.max(0, ...series);
  const range = max - min || 1;
  const points = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const zeroY = h - ((0 - min) / range) * h;
  const last = series[series.length - 1];
  const stroke = last >= 0 ? "#16A34A" : "#DC2626";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
      <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="#1E2938" strokeWidth="1" strokeDasharray="4 3" />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

export default function GestaoPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [bancaInicial, setBancaInicial] = useState<number | null>(null);
  const [operations, setOperations] = useState<OperationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("banca_inicial")
        .eq("id", user.id)
        .single();
      setBancaInicial(profile?.banca_inicial ?? null);

      const { data: opsData } = await supabase
        .from("operations")
        .select("*, signals(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      const ops = (opsData || []) as OperationRow[];
      setOperations(ops);
      setValores(Object.fromEntries(ops.map((o) => [o.id, String(o.valor)])));
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const andamento = useMemo(() => operations.filter((o) => o.status === "andamento"), [operations]);
  const settled = useMemo(() => operations.filter((o) => o.status !== "andamento"), [operations]);

  const totalProfit = useMemo(() => settled.reduce((acc, o) => acc + profitOf(o), 0), [settled]);
  const saldoAtual = (bancaInicial ?? 0) + totalProfit;
  const performancePct = bancaInicial ? (totalProfit / bancaInicial) * 100 : null;
  const greens = settled.filter((o) => o.status === "green").length;
  const reds = settled.length - greens;
  const assertividade = settled.length ? Math.round((greens / settled.length) * 100) : null;

  const profitSeries = useMemo(() => {
    let running = 0;
    return settled.map((o) => {
      running += profitOf(o);
      return running;
    });
  }, [settled]);

  const currentStreak = useMemo(() => {
    const chronDesc = [...settled].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    let streak = 0;
    for (const o of chronDesc) {
      if (o.status === "green") streak++;
      else break;
    }
    return streak;
  }, [settled]);

  const maiorOdd = useMemo(() => {
    const greenOps = settled.filter((o) => o.status === "green");
    if (greenOps.length === 0) return null;
    return Math.max(...greenOps.map((o) => o.signals.odd));
  }, [settled]);

  async function salvarValor(op: OperationRow) {
    const raw = valores[op.id];
    const parsed = parseFloat((raw || "").replace(",", "."));
    if (isNaN(parsed) || parsed <= 0 || parsed === op.valor) return;
    setSavingId(op.id);
    const { error } = await supabase.from("operations").update({ valor: parsed }).eq("id", op.id);
    setSavingId(null);
    if (!error) {
      setOperations((prev) => prev.map((o) => (o.id === op.id ? { ...o, valor: parsed } : o)));
      setSavedId(op.id);
      setTimeout(() => setSavedId((id) => (id === op.id ? null : id)), 1500);
    }
  }

  if (loading) {
    return <div className="card p-7 text-center text-sm text-text2 max-w-3xl">Carregando…</div>;
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
            <rect x="3" y="6" width="18" height="13" rx="2" />
            <path d="M3 10h18" />
            <circle cx="16" cy="14.5" r="1.3" fill="#2563EB" stroke="none" />
          </svg>
          <span className="text-xs font-bold tracking-wide text-primary">GESTÃO</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Sua banca</h1>
        <p className="text-text2 text-sm">
          Calculado a partir da sua banca inicial e das operações que você marcou.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="text-xs font-semibold text-text2">BANCA INICIAL</div>
          <div className="font-mono text-2xl font-semibold mt-2.5">
            {bancaInicial === null ? "—" : `R$ ${bancaInicial.toFixed(2)}`}
          </div>
        </div>
        <div className="card p-6">
          <div className="text-xs font-semibold text-text2">SALDO ATUAL</div>
          <div
            className={`font-mono text-2xl font-semibold mt-2.5 ${
              totalProfit > 0 ? "text-success" : totalProfit < 0 ? "text-danger" : ""
            }`}
          >
            {bancaInicial === null ? "—" : `R$ ${saldoAtual.toFixed(2)}`}
          </div>
        </div>
        <div className="card p-6">
          <div className="text-xs font-semibold text-text2">PERFORMANCE</div>
          <div
            className={`font-mono text-2xl font-semibold mt-2.5 ${
              (performancePct ?? 0) > 0 ? "text-success" : (performancePct ?? 0) < 0 ? "text-danger" : ""
            }`}
          >
            {performancePct === null ? "—" : `${performancePct >= 0 ? "+" : ""}${performancePct.toFixed(1)}%`}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-semibold text-text2">LUCRO ACUMULADO</div>
          <div className="text-[11px] text-muted">
            {greens} green{greens !== 1 ? "s" : ""} · {reds} red{reds !== 1 ? "s" : ""}
            {assertividade !== null ? ` · ${assertividade}% de assertividade` : ""}
          </div>
        </div>
        <ProfitChart series={profitSeries} />
      </div>

      <div>
        <div className="text-sm font-bold text-text2 mb-3">
          OPERAÇÕES EM ANDAMENTO ({andamento.length})
        </div>
        {andamento.length === 0 ? (
          <div className="card p-7 text-center text-sm text-text2">
            Nenhuma operação em andamento agora. Marque um sinal em Eventos para começar.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {andamento.map((op) => (
              <div key={op.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {op.signals.time_a} x {op.signals.time_b}
                  </div>
                  <div className="text-xs text-text2 mt-0.5">
                    {op.signals.mercado} · ODD {op.signals.odd}
                  </div>
                </div>
                <div className="flex-none flex items-center gap-2">
                  <span className="text-xs text-muted font-mono">R$</span>
                  <input
                    className="input-field w-24 text-sm font-mono py-1.5"
                    value={valores[op.id] ?? ""}
                    onChange={(e) =>
                      setValores((prev) => ({ ...prev, [op.id]: e.target.value.replace(/[^0-9.,]/g, "") }))
                    }
                    onBlur={() => salvarValor(op)}
                  />
                  <span className="text-[10px] text-success font-semibold w-12">
                    {savingId === op.id ? "Salvando…" : savedId === op.id ? "Salvo ✓" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="text-sm font-bold text-text2 mb-3">CONQUISTAS</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-5">
            <div className="text-xs font-semibold text-text2">SEQUÊNCIA ATUAL</div>
            <div className="font-mono text-xl font-semibold mt-2 text-success">
              {currentStreak > 0 ? `${currentStreak} green${currentStreak !== 1 ? "s" : ""} seguido${currentStreak !== 1 ? "s" : ""}` : "—"}
            </div>
            <p className="text-[11px] text-muted mt-1">Contando a partir da sua operação mais recente.</p>
          </div>
          <div className="card p-5">
            <div className="text-xs font-semibold text-text2">MAIOR ODD GREENADA</div>
            <div className="font-mono text-xl font-semibold mt-2">{maiorOdd === null ? "—" : maiorOdd}</div>
            <p className="text-[11px] text-muted mt-1">Sua melhor operação fechada com green.</p>
          </div>
          <div className="card p-5 opacity-60">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-text2">DISCIPLINA DE RISCO</div>
              <span className="text-[9px] font-bold text-muted bg-elevated px-2 py-0.5 rounded">EM BREVE</span>
            </div>
            <div className="font-mono text-xl font-semibold mt-2">—</div>
            <p className="text-[11px] text-muted mt-1">
              Vamos comparar o valor de cada operação com o recomendado para sua banca.
            </p>
          </div>
          <div className="card p-5 opacity-60">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-text2">META DE BANCA</div>
              <span className="text-[9px] font-bold text-muted bg-elevated px-2 py-0.5 rounded">EM BREVE</span>
            </div>
            <div className="font-mono text-xl font-semibold mt-2">—</div>
            <p className="text-[11px] text-muted mt-1">
              Em breve você vai poder definir uma meta de crescimento e acompanhar o progresso aqui.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
