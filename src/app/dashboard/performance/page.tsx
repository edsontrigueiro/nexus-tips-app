"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Signal } from "@/lib/types";

type Periodo = "todo" | "mes" | "ano";
const PAGE_SIZE = 10;

function statsFor(signals: Signal[]) {
  const greens = signals.filter((s) => s.status === "green").length;
  const reds = signals.filter((s) => s.status === "red").length;
  const total = greens + reds;
  const assertividade = total ? (greens / total) * 100 : null;
  return { greens, reds, total, assertividade };
}

const StatIcon = {
  alvo: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  bars: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V10M10 19V5M16 19V13M22 19V8" strokeLinecap="round" />
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  x: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
    </svg>
  ),
};

export default function PerformancePage() {
  const supabase = createClient();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("todo");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from("signals")
        .select("*")
        .in("status", ["green", "red"])
        .order("created_at", { ascending: false });
      setSignals(data || []);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = useMemo(() => new Date(), []);
  const customAtivo = Boolean(dataInicio || dataFim);

  const filtered = useMemo(() => {
    if (customAtivo) {
      const inicio = dataInicio ? new Date(dataInicio + "T00:00:00") : null;
      const fim = dataFim ? new Date(dataFim + "T23:59:59") : null;
      return signals.filter((s) => {
        const d = new Date(s.created_at);
        if (inicio && d < inicio) return false;
        if (fim && d > fim) return false;
        return true;
      });
    }
    if (periodo === "todo") return signals;
    return signals.filter((s) => {
      const d = new Date(s.created_at);
      if (periodo === "ano") return d.getFullYear() === now.getFullYear();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [signals, periodo, now, customAtivo, dataInicio, dataFim]);

  const stats = statsFor(filtered);

  // Últimos 12 meses com pelo menos um sinal encerrado, mais recente primeiro. Sempre a
  // partir de TODOS os sinais (não do filtro de período acima) — é uma visão histórica à
  // parte, igual ao protótipo de referência.
  const monthly = useMemo(() => {
    const buckets = new Map<string, Signal[]>();
    for (const s of signals) {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(s);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 12)
      .map(([key, list]) => {
        const [year, month] = key.split("-");
        const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
          month: "short",
          year: "numeric",
        });
        return { key, label, ...statsFor(list) };
      })
      .reverse();
  }, [signals]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  function mudarPeriodo(p: Periodo) {
    setPeriodo(p);
    setDataInicio("");
    setDataFim("");
    setPage(1);
  }

  const periodos: { id: Periodo; label: string }[] = [
    { id: "todo", label: "Todo histórico" },
    { id: "mes", label: "Mês atual" },
    { id: "ano", label: "Ano atual" },
  ];

  const statCards = [
    {
      icon: StatIcon.alvo,
      label: "Assertividade",
      value: stats.assertividade === null ? "—" : `${stats.assertividade.toFixed(1).replace(".", ",")}%`,
      desc: "Greens sobre eventos resolvidos como Green ou Red.",
    },
    {
      icon: StatIcon.bars,
      label: "Eventos",
      value: String(stats.total),
      desc: "Total de eventos confirmados no período.",
    },
    {
      icon: StatIcon.check,
      label: "Greens",
      value: String(stats.greens),
      desc: "Eventos encerrados com resultado positivo.",
    },
    {
      icon: StatIcon.x,
      label: "Reds",
      value: String(stats.reds),
      desc: "Eventos encerrados com resultado negativo.",
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
            <path d="M4 19V10M10 19V5M16 19V13M22 19V8" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-bold tracking-wide text-primary">PERFORMANCE</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Performance da plataforma</h1>
        <p className="text-text2 text-sm">
          Todo sinal encerrado conta — sem esconder red, sem número inflado. Aberto pra todo
          mundo, assinante ou não.
        </p>
      </div>

      <div className="card p-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-text2 mb-2.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 6h16M7 6v14M17 6v14M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
            Período da análise
          </div>
          <div className="inline-flex bg-surface border border-border rounded-[10px] p-1 w-fit">
            {periodos.map((p) => (
              <button
                key={p.id}
                onClick={() => mudarPeriodo(p.id)}
                className={`px-4 py-2 rounded-[7px] text-[12.5px] font-semibold transition-colors ${
                  !customAtivo && periodo === p.id ? "bg-primary text-white" : "text-text2 hover:text-text"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-text2">Início</label>
            <input
              type="date"
              className="input-field text-sm py-2"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-text2">Fim</label>
            <input
              type="date"
              className="input-field text-sm py-2"
              value={dataFim}
              onChange={(e) => {
                setDataFim(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-7 text-center text-sm text-text2">Carregando…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((c) => (
              <div key={c.label} className="card p-5">
                <div className="flex items-center gap-2 text-text2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-none">
                    {c.icon}
                  </span>
                  <span className="text-[13px] font-semibold">{c.label}</span>
                </div>
                <div className="font-mono text-2xl font-semibold mt-3">{c.value}</div>
                <p className="text-[11px] text-muted mt-1.5 leading-snug">{c.desc}</p>
              </div>
            ))}
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-1">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                <path d="M4 19V10M10 19V5M16 19V13M22 19V8" strokeLinecap="round" />
              </svg>
              <span className="font-bold">Histórico mês a mês</span>
            </div>
            <p className="text-text2 text-sm mb-4">
              Distribuição mensal de todos os eventos lançados e finalizados como Green ou Red.
            </p>

            {monthly.length === 0 ? (
              <div className="text-center text-sm text-text2 py-6">
                Ainda não há sinais encerrados suficientes pra montar um histórico mensal.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {monthly.map((m) => {
                  const greenPct = m.total ? (m.greens / m.total) * 100 : 0;
                  const redPct = m.total ? (m.reds / m.total) * 100 : 0;
                  return (
                    <div key={m.key} className="flex items-center gap-4">
                      <div className="w-28 flex-none">
                        <div className="text-sm font-bold capitalize">{m.label}</div>
                        <div className="text-[11px] text-muted">{m.total} eventos</div>
                      </div>
                      <div className="relative flex-1 h-9 rounded-lg overflow-hidden bg-elevated flex">
                        {m.greens > 0 && (
                          <div
                            className="bg-success flex items-center justify-start px-3 text-[11px] font-bold text-white whitespace-nowrap overflow-hidden"
                            style={{ width: `${greenPct}%` }}
                          >
                            {greenPct > 12 && `${m.greens} Green${m.greens !== 1 ? "s" : ""}`}
                          </div>
                        )}
                        {m.reds > 0 && (
                          <div
                            className="bg-danger flex items-center justify-start px-3 text-[11px] font-bold text-white whitespace-nowrap overflow-hidden"
                            style={{ width: `${redPct}%` }}
                          >
                            {redPct > 12 && `${m.reds} Red${m.reds !== 1 ? "s" : ""}`}
                          </div>
                        )}
                      </div>
                      <span className="flex-none text-xs font-bold bg-surface border border-border rounded-md px-2.5 py-1.5 w-20 text-center">
                        {m.assertividade === null ? "—" : `${m.assertividade.toFixed(1).replace(".", ",")}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="font-bold mb-1">Eventos detalhados</div>
            <p className="text-text2 text-sm mb-4">
              Lista dos eventos considerados no cálculo da performance, no período selecionado.
            </p>

            {pageItems.length === 0 ? (
              <div className="text-center text-sm text-text2 py-6">
                Nenhum evento encerrado nesse período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold tracking-wide text-muted border-b border-border">
                      <th className="pb-2.5 pr-3">Evento</th>
                      <th className="pb-2.5 px-3">Estratégia</th>
                      <th className="pb-2.5 px-3">Resultado</th>
                      <th className="pb-2.5 px-3">Odd</th>
                      <th className="pb-2.5 pl-3">Abertura do evento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((s) => (
                      <tr key={s.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-3">
                          <div className="font-semibold">
                            {s.tipo === "bilhete" ? `${s.time_b}` : `${s.time_a} x ${s.time_b}`}
                          </div>
                          <div className="text-[11px] text-muted">{s.mercado}</div>
                        </td>
                        <td className="py-3 px-3 text-text2">{s.estrategia || "—"}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 border ${
                              s.status === "green"
                                ? "bg-success/10 border-success text-success"
                                : "bg-danger/10 border-danger text-danger"
                            }`}
                          >
                            {s.status === "green" ? "Green" : "Red"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">{s.odd}</td>
                        <td className="py-3 pl-3 text-text2 whitespace-nowrap">
                          {new Date(s.created_at).toLocaleDateString("pt-BR")},{" "}
                          {new Date(s.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-xs text-muted">
                  Página {pageClamped} de {totalPages} · Mostrando{" "}
                  {(pageClamped - 1) * PAGE_SIZE + 1}-{Math.min(pageClamped * PAGE_SIZE, filtered.length)}{" "}
                  de {filtered.length} eventos
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pageClamped <= 1}
                    className="btn-outline text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={pageClamped >= totalPages}
                    className="btn-outline text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
