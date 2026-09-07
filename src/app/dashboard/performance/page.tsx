"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Signal } from "@/lib/types";

type Periodo = "todo" | "mes" | "ano";

function statsFor(signals: Signal[]) {
  const greens = signals.filter((s) => s.status === "green").length;
  const reds = signals.filter((s) => s.status === "red").length;
  const total = greens + reds;
  const assertividade = total ? Math.round((greens / total) * 100) : null;
  return { greens, reds, total, assertividade };
}

export default function PerformancePage() {
  const supabase = createClient();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("todo");

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

  const filtered = useMemo(() => {
    if (periodo === "todo") return signals;
    return signals.filter((s) => {
      const d = new Date(s.created_at);
      if (periodo === "ano") return d.getFullYear() === now.getFullYear();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [signals, periodo, now]);

  const stats = statsFor(filtered);

  // Últimos 12 meses com pelo menos um sinal encerrado, mais recente primeiro.
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
          month: "long",
          year: "numeric",
        });
        return { key, label, ...statsFor(list) };
      });
  }, [signals]);

  const periodos: { id: Periodo; label: string }[] = [
    { id: "todo", label: "Todo o período" },
    { id: "mes", label: "Este mês" },
    { id: "ano", label: "Este ano" },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
            <path d="M4 19V10M10 19V5M16 19V13M22 19V8" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-bold tracking-wide text-primary">PERFORMANCE</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Performance da plataforma</h1>
        <p className="text-text2 text-sm">
          Todo sinal encerrado conta — sem esconder red, sem número inflado.
        </p>
      </div>

      <div className="inline-flex bg-surface border border-border rounded-[10px] p-1 w-fit">
        {periodos.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={`px-4 py-2 rounded-[7px] text-[12.5px] font-semibold transition-colors ${
              periodo === p.id ? "bg-primary text-white" : "text-text2 hover:text-text"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-7 text-center text-sm text-text2">Carregando…</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-6">
              <div className="text-xs font-semibold text-text2">SINAIS ENCERRADOS</div>
              <div className="font-mono text-2xl font-semibold mt-2.5">{stats.total}</div>
            </div>
            <div className="card p-6">
              <div className="text-xs font-semibold text-text2">ASSERTIVIDADE</div>
              <div className="font-mono text-2xl font-semibold mt-2.5 text-success">
                {stats.assertividade === null ? "—" : `${stats.assertividade}%`}
              </div>
            </div>
            <div className="card p-6">
              <div className="text-xs font-semibold text-text2">GREENS / REDS</div>
              <div className="font-mono text-2xl font-semibold mt-2.5">
                <span className="text-success">{stats.greens}</span>
                <span className="text-muted text-base"> / </span>
                <span className="text-danger">{stats.reds}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-bold text-text2 mb-3">MÊS A MÊS</div>
            {monthly.length === 0 ? (
              <div className="card p-7 text-center text-sm text-text2">
                Ainda não há sinais encerrados suficientes para montar um histórico mensal.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {monthly.map((m) => (
                  <div key={m.key} className="card p-4 flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold capitalize">{m.label}</span>
                    <div className="flex items-center gap-5">
                      <span className="text-xs text-text2">
                        <span className="text-success font-semibold">{m.greens}</span> /{" "}
                        <span className="text-danger font-semibold">{m.reds}</span>
                      </span>
                      <span className="font-mono text-sm font-semibold w-14 text-right">
                        {m.assertividade === null ? "—" : `${m.assertividade}%`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
