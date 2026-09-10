"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BancaMovimento, BancaMovimentoTipo, Operation, Signal } from "@/lib/types";

type OperationRow = Operation & { signals: Signal };

function oddEfetiva(op: OperationRow): number {
  return op.odd_obtida ?? op.signals.odd;
}

function profitOf(op: OperationRow): number {
  if (op.status === "green") return op.valor * (oddEfetiva(op) - 1);
  if (op.status === "red") return -op.valor;
  return 0;
}

function formatData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MOVIMENTO_LABEL: Record<BancaMovimentoTipo, string> = {
  aporte: "Aporte",
  saque: "Saque",
  ajuste: "Ajuste",
};

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
  const [movimentos, setMovimentos] = useState<BancaMovimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Formulário de movimentação de banca (aporte, saque ou ajuste de correção).
  const [tipoMovimento, setTipoMovimento] = useState<BancaMovimentoTipo>("aporte");
  const [valorMovimento, setValorMovimento] = useState("");
  const [notaMovimento, setNotaMovimento] = useState("");
  const [salvandoMovimento, setSalvandoMovimento] = useState(false);
  const [erroMovimento, setErroMovimento] = useState<string | null>(null);

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

      const [{ data: opsData }, { data: movData }] = await Promise.all([
        supabase
          .from("operations")
          .select("*, signals(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("banca_movimentos")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      const ops = (opsData || []) as OperationRow[];
      setOperations(ops);
      setValores(Object.fromEntries(ops.map((o) => [o.id, String(o.valor)])));
      setMovimentos((movData as BancaMovimento[]) || []);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const andamento = useMemo(() => operations.filter((o) => o.status === "andamento"), [operations]);
  // "Cancelada" não é green nem red — não entra no cálculo de lucro (profitOf já trata isso
  // devolvendo 0 pra qualquer status que não seja green/red), mas também não fica parada em
  // "andamento" pra sempre: por isso ela sai daqui e cai direto no histórico.
  const settled = useMemo(
    () => operations.filter((o) => o.status === "green" || o.status === "red"),
    [operations]
  );

  const totalProfit = useMemo(() => settled.reduce((acc, o) => acc + profitOf(o), 0), [settled]);
  // Soma de todos os aportes/saques/ajustes que a pessoa registrou manualmente — ver
  // supabase/migrations/0009_banca_horario_cancelado.sql. Nunca guardamos um "saldo atual"
  // solto no banco: ele é sempre recalculado a partir do histórico, pra nunca dessincronizar.
  const totalMovimentos = useMemo(() => movimentos.reduce((acc, m) => acc + m.valor, 0), [movimentos]);
  const saldoAtual = (bancaInicial ?? 0) + totalProfit + totalMovimentos;
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
    return Math.max(...greenOps.map((o) => oddEfetiva(o)));
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

  async function registrarMovimento() {
    if (!userId) return;
    setErroMovimento(null);
    const parsed = parseFloat(valorMovimento.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      setErroMovimento("Informe um valor válido, maior que zero.");
      return;
    }

    // Aporte e saque são sempre um delta na banca; ajuste é diferente: a pessoa informa o
    // saldo CORRETO (o número que ela vê na casa de apostas dela agora), e a gente calcula
    // sozinho a diferença pra registrar como delta — sem isso, ela teria que fazer essa
    // conta na mão toda vez que a banca dessincronizar por algum motivo fora do app.
    let delta: number;
    if (tipoMovimento === "aporte") delta = parsed;
    else if (tipoMovimento === "saque") delta = -parsed;
    else delta = parsed - saldoAtual;

    if (tipoMovimento === "ajuste" && delta === 0) {
      setErroMovimento("Esse já é o saldo atual — nada pra ajustar.");
      return;
    }

    setSalvandoMovimento(true);
    const { data, error } = await supabase
      .from("banca_movimentos")
      .insert({
        user_id: userId,
        tipo: tipoMovimento,
        valor: delta,
        nota: notaMovimento.trim() || null,
      })
      .select()
      .single();
    setSalvandoMovimento(false);

    if (error) {
      setErroMovimento("Não deu pra registrar agora. Tenta de novo em alguns segundos.");
      return;
    }
    setMovimentos((prev) => [data as BancaMovimento, ...prev]);
    setValorMovimento("");
    setNotaMovimento("");
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
          Calculado a partir da sua banca inicial, das operações que você marcou e dos
          aportes/saques que você registrar abaixo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              saldoAtual - (bancaInicial ?? 0) > 0
                ? "text-success"
                : saldoAtual - (bancaInicial ?? 0) < 0
                ? "text-danger"
                : ""
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
          <p className="text-[10px] text-muted mt-1">Só considera o lucro das operações, não aportes/saques.</p>
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

      <div className="card p-6">
        <div className="text-sm font-bold text-text2 mb-3">MOVIMENTAR BANCA</div>

        <div className="inline-flex bg-surface border border-border rounded-[10px] p-1 w-fit mb-3">
          {(["aporte", "saque", "ajuste"] as BancaMovimentoTipo[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTipoMovimento(t);
                setErroMovimento(null);
              }}
              className={`px-4 py-2 rounded-[7px] text-[12.5px] font-semibold transition-colors ${
                tipoMovimento === t ? "bg-primary text-white" : "text-text2 hover:text-text"
              }`}
            >
              {MOVIMENTO_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-semibold text-text2">
              {tipoMovimento === "ajuste" ? "Qual o saldo correto agora?" : "Valor"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">
                R$
              </span>
              <input
                className="input-field pl-8 text-sm font-mono py-2 w-full"
                value={valorMovimento}
                onChange={(e) => setValorMovimento(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-semibold text-text2">Nota (opcional)</label>
            <input
              className="input-field text-sm py-2 w-full"
              value={notaMovimento}
              onChange={(e) => setNotaMovimento(e.target.value)}
              placeholder={
                tipoMovimento === "aporte"
                  ? "Ex: depósito na casa"
                  : tipoMovimento === "saque"
                  ? "Ex: saque de lucro"
                  : "Ex: corrigindo diferença"
              }
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={registrarMovimento}
              disabled={salvandoMovimento}
              className="btn-primary text-xs px-4 py-2.5 disabled:opacity-40 w-full sm:w-auto"
            >
              {salvandoMovimento ? "Salvando…" : "Registrar"}
            </button>
          </div>
        </div>
        {erroMovimento && <p className="text-xs text-danger mt-2">{erroMovimento}</p>}

        {movimentos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2 max-h-64 overflow-y-auto">
            {movimentos.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-xs gap-2">
                <div className="min-w-0">
                  <span className="font-semibold">{MOVIMENTO_LABEL[m.tipo]}</span>
                  <span className="text-muted"> · {formatData(m.created_at)}</span>
                  {m.nota && <span className="text-muted truncate"> · {m.nota}</span>}
                </div>
                <span className={`font-mono flex-none ${m.valor > 0 ? "text-success" : m.valor < 0 ? "text-danger" : "text-muted"}`}>
                  {m.valor > 0 ? "+" : ""}
                  R$ {m.valor.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
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
              <div key={op.id} className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                    {op.signals.tipo === "bilhete" && (
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-none">
                        BILHETE
                      </span>
                    )}
                    {op.signals.tipo === "bilhete"
                      ? op.signals.time_b
                      : `${op.signals.time_a} x ${op.signals.time_b}`}
                  </div>
                  <div className="text-xs text-text2 mt-0.5">
                    {op.signals.tipo === "bilhete" ? "Combinados" : op.signals.mercado} · ODD {oddEfetiva(op)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
