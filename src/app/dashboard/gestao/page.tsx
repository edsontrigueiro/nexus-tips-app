"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Operation, Signal } from "@/lib/types";

type OperationRow = Operation & { signals: Signal };

function oddEfetiva(op: OperationRow): number {
  return op.odd_obtida ?? op.signals.odd;
}

function profitOf(op: OperationRow): number {
  if (op.status === "green") return op.valor * (oddEfetiva(op) - 1);
  if (op.status === "red") return -op.valor;
  return 0;
}

// Formata como o app mostra dinheiro em outros lugares (R$ 1234.56), mas compacto o
// bastante pra caber no eixo do gráfico.
function fmtEixo(v: number): string {
  const sinal = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sinal}${Math.abs(Math.round(v))}`;
}

function fmtDataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ProfitChart({ series, dates }: { series: number[]; dates: string[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (series.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-muted border border-dashed border-border rounded-lg">
        Marque e feche mais operações para ver sua curva de lucro aqui.
      </div>
    );
  }

  const w = 600;
  const h = 200;
  const padL = 46;
  const padR = 8;
  const padT = 14;
  const padB = 22;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const min = Math.min(0, ...series);
  const max = Math.max(0, ...series);
  const range = max - min || 1;

  const xAt = (i: number) => padL + (i / (series.length - 1)) * plotW;
  const yAt = (v: number) => padT + plotH - ((v - min) / range) * plotH;

  const linePoints = series.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const areaPoints = `${xAt(0).toFixed(1)},${yAt(0).toFixed(1)} ${linePoints} ${xAt(
    series.length - 1
  ).toFixed(1)},${yAt(0).toFixed(1)}`;

  const last = series[series.length - 1];
  const positivo = last >= 0;
  // Tokens reais do design system (Success/Danger) — o rascunho anterior usava verde/vermelho
  // genéricos que não batiam com --success/--danger definidos em tailwind.config.ts.
  const cor = positivo ? "#16C784" : "#F0445E";
  const gradientId = positivo ? "profitUp" : "profitDown";

  const ticks = [max, max - range / 2, min];

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.round(((relX - padL) / plotW) * (series.length - 1));
    setHoverIdx(Math.max(0, Math.min(series.length - 1, idx)));
  }

  const hoverX = hoverIdx !== null ? xAt(hoverIdx) : null;
  const hoverY = hoverIdx !== null ? yAt(series[hoverIdx]) : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-48 cursor-crosshair"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={w - padR}
              y1={yAt(t)}
              y2={yAt(t)}
              stroke="#1C2940"
              strokeWidth="1"
              strokeDasharray={Math.abs(t) < 0.01 ? "4 3" : undefined}
            />
            <text
              x={padL - 8}
              y={yAt(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="9.5"
              fontFamily="var(--font-geist-mono)"
              fill="#66758A"
            >
              {fmtEixo(t)}
            </text>
          </g>
        ))}

        <polygon points={areaPoints} fill={`url(#${gradientId})`} />
        <polyline
          points={linePoints}
          fill="none"
          stroke={cor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hoverX !== null && hoverY !== null && (
          <>
            <line
              x1={hoverX}
              x2={hoverX}
              y1={padT}
              y2={h - padB}
              stroke="#66758A"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={hoverX} cy={hoverY} r="4" fill={cor} stroke="#0D1728" strokeWidth="2" />
          </>
        )}

        <text x={padL} y={h - 6} fontSize="9.5" fontFamily="var(--font-geist-mono)" fill="#66758A">
          {fmtDataCurta(dates[0])}
        </text>
        <text
          x={w - padR}
          y={h - 6}
          textAnchor="end"
          fontSize="9.5"
          fontFamily="var(--font-geist-mono)"
          fill="#66758A"
        >
          {fmtDataCurta(dates[dates.length - 1])}
        </text>
      </svg>

      {hoverIdx !== null && hoverX !== null && (
        <div
          className="absolute top-1.5 -translate-x-1/2 bg-elevated border border-border rounded-lg px-2.5 py-1.5 pointer-events-none whitespace-nowrap shadow-lg"
          style={{ left: `${(hoverX / w) * 100}%` }}
        >
          <div className="text-[9px] text-muted font-mono">{fmtDataCurta(dates[hoverIdx])}</div>
          <div
            className={`text-[12px] font-mono font-semibold ${
              series[hoverIdx] >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {series[hoverIdx] >= 0 ? "+" : ""}
            R$ {series[hoverIdx].toFixed(2)}
          </div>
        </div>
      )}
    </div>
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

  // Ordenado por quando FECHOU (finalizada_em), não por quando foi marcada — é isso que
  // faz o gráfico contar uma linha do tempo real de resultado, não de cliques do usuário.
  // finalizada_em só existe a partir da sync de status (trigger on_signal_resolved); cai
  // pra created_at nas operações antigas que fecharam antes dessa migration existir.
  const settled = useMemo(
    () =>
      operations
        .filter((o) => o.status !== "andamento")
        .slice()
        .sort(
          (a, b) =>
            new Date(a.finalizada_em ?? a.created_at).getTime() -
            new Date(b.finalizada_em ?? b.created_at).getTime()
        ),
    [operations]
  );

  const totalProfit = useMemo(() => settled.reduce((acc, o) => acc + profitOf(o), 0), [settled]);
  const saldoAtual = (bancaInicial ?? 0) + totalProfit;
  const performancePct = bancaInicial ? (totalProfit / bancaInicial) * 100 : null;
  const greens = settled.filter((o) => o.status === "green").length;
  const reds = settled.length - greens;
  const assertividade = settled.length ? Math.round((greens / settled.length) * 100) : null;
  const oddMedia = useMemo(
    () => (settled.length ? settled.reduce((acc, o) => acc + oddEfetiva(o), 0) / settled.length : null),
    [settled]
  );

  const profitSeries = useMemo(() => {
    let running = 0;
    return settled.map((o) => {
      running += profitOf(o);
      return running;
    });
  }, [settled]);
  const profitDates = useMemo(
    () => settled.map((o) => o.finalizada_em ?? o.created_at),
    [settled]
  );

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="card p-6">
          <div className="text-xs font-semibold text-text2">ODD MÉDIA</div>
          <div className="font-mono text-2xl font-semibold mt-2.5">
            {oddMedia === null ? "—" : oddMedia.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold text-text2">LUCRO ACUMULADO</div>
          <div className="text-[11px] text-muted font-mono">
            {greens} green{greens !== 1 ? "s" : ""} · {reds} red{reds !== 1 ? "s" : ""}
            {assertividade !== null ? ` · ${assertividade}%` : ""}
          </div>
        </div>
        <ProfitChart series={profitSeries} dates={profitDates} />
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
