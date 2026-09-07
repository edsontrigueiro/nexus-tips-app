"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Signal, Operation } from "@/lib/types";

type Filtro = "todos" | "vivo" | "encerrados";

export default function EventosPage() {
  const supabase = createClient();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let signalsChannel: ReturnType<typeof supabase.channel> | null = null;
    let operationsChannel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: activeSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "ativa")
        .limit(1)
        .maybeSingle();
      setSubscribed(!!activeSub);

      const { data: signalsData } = await supabase
        .from("signals")
        .select("*")
        .order("created_at", { ascending: false });
      setSignals(signalsData || []);

      const { data: opsData } = await supabase
        .from("operations")
        .select("*")
        .eq("user_id", user.id);
      setOperations(opsData || []);

      setLoading(false);

      // Assim que o admin publica um sinal (INSERT em `signals`), esse canal recebe o
      // evento em tempo real e a lista abaixo atualiza sozinha — sem refresh da página.
      signalsChannel = supabase
        .channel("eventos-signals")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "signals" },
          (payload) => {
            setSignals((prev) => {
              if (payload.eventType === "INSERT") {
                return [payload.new as Signal, ...prev];
              }
              if (payload.eventType === "UPDATE") {
                return prev.map((s) =>
                  s.id === (payload.new as Signal).id ? (payload.new as Signal) : s
                );
              }
              if (payload.eventType === "DELETE") {
                return prev.filter((s) => s.id !== (payload.old as Signal).id);
              }
              return prev;
            });
          }
        )
        .subscribe();

      operationsChannel = supabase
        .channel("eventos-operations")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "operations", filter: `user_id=eq.${user.id}` },
          (payload) => {
            setOperations((prev) => {
              if (payload.eventType === "INSERT") {
                return [...prev, payload.new as Operation];
              }
              if (payload.eventType === "UPDATE") {
                return prev.map((o) =>
                  o.id === (payload.new as Operation).id ? (payload.new as Operation) : o
                );
              }
              return prev;
            });
          }
        )
        .subscribe();
    }

    init();

    return () => {
      if (signalsChannel) supabase.removeChannel(signalsChannel);
      if (operationsChannel) supabase.removeChannel(operationsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function marcarOperacao(signal: Signal) {
    if (!userId || !subscribed) return;
    setMarking(signal.id);
    const { data, error } = await supabase
      .from("operations")
      .insert({ user_id: userId, signal_id: signal.id, valor: 100 })
      .select()
      .single();
    setMarking(null);
    if (!error && data) {
      setOperations((prev) => [...prev, data as Operation]);
    }
  }

  const statusLabel: Record<string, string> = {
    no_ar: "NO AR",
    green: "GREEN",
    red: "RED",
  };
  const statusColor: Record<string, string> = {
    no_ar: "bg-info/10 border-info text-info",
    green: "bg-success/10 border-success text-success",
    red: "bg-danger/10 border-danger text-danger",
  };

  const filtros: { id: Filtro; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "vivo", label: "Ao vivo" },
    { id: "encerrados", label: "Encerrados" },
  ];

  const filteredSignals = signals.filter((s) => {
    if (filtro === "vivo") return s.live;
    if (filtro === "encerrados") return s.status === "green" || s.status === "red";
    return true;
  });

  const header = (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
          <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="round" />
        </svg>
        <span className="text-xs font-bold tracking-wide text-primary">EVENTOS</span>
      </div>
      <h1 className="text-2xl font-bold mb-1">Sinais monitorados</h1>
      <p className="text-text2 text-sm">
        Atualiza automaticamente assim que um novo sinal é publicado.
      </p>
    </div>
  );

  if (!loading && !subscribed) {
    return (
      <div className="flex flex-col gap-5 max-w-3xl">
        {header}
        <div className="relative">
          <div
            className="flex flex-col gap-3 blur-[5px] opacity-40 pointer-events-none"
            aria-hidden
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5">
                <div className="text-[10px] text-muted font-semibold tracking-wide">
                  COMPETIÇÃO · HOJE
                </div>
                <div className="text-sm font-bold mt-1">Time A x Time B</div>
                <div className="text-xs text-text2 mt-1">Mercado monitorado</div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="w-11 h-11 rounded-full bg-elevated border border-border flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA8BC" strokeWidth="2">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-base">Eventos travados</div>
              <p className="text-text2 text-sm mt-1 max-w-xs">
                Assine um plano para liberar os eventos monitorados em tempo real.
              </p>
            </div>
            <Link href="/dashboard/planos" className="btn-primary text-sm px-5 py-2.5">
              Ver planos de assinatura
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      {header}

      <div className="inline-flex bg-surface border border-border rounded-[10px] p-1 w-fit">
        {filtros.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-4 py-2 rounded-[7px] text-[12.5px] font-semibold transition-colors ${
              filtro === f.id ? "bg-primary text-white" : "text-text2 hover:text-text"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-7 text-center text-sm text-text2">Carregando…</div>
      ) : filteredSignals.length === 0 ? (
        <div className="card p-7 text-center text-sm text-text2">
          {signals.length === 0
            ? "Nenhum sinal publicado ainda. Assim que o time lançar um, ele aparece aqui na hora."
            : "Nenhum sinal nesse filtro agora."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredSignals.map((signal) => {
            const alreadyMarked = operations.some((o) => o.signal_id === signal.id);
            const expanded = expandedId === signal.id;
            return (
              <div key={signal.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      {signal.live && <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
                      <span className="text-[10px] text-muted font-semibold tracking-wide">
                        {signal.competicao}
                      </span>
                    </div>
                    <div className="text-sm font-bold mt-1">
                      {signal.time_a} x {signal.time_b}
                    </div>
                    <div className="text-xs text-text2 mt-1">
                      <span className="font-semibold text-text">{signal.mercado}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span
                      className={`text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border whitespace-nowrap ${
                        statusColor[signal.status]
                      }`}
                    >
                      {signal.live ? "AO VIVO · " : ""}
                      {statusLabel[signal.status]}
                    </span>
                    <span className="font-mono text-lg font-semibold">{signal.odd}</span>
                  </div>
                </div>

                {signal.rationale && (
                  <button
                    onClick={() => setExpandedId(expanded ? null : signal.id)}
                    className="text-[12px] font-semibold text-text2 hover:text-text mt-3"
                  >
                    {expanded ? "Ocultar análise" : "Ver análise"}
                  </button>
                )}

                {expanded && signal.rationale && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10.5px] font-bold tracking-wide text-primary">
                        POR QUE ESSE SINAL FOI APROVADO
                      </span>
                      {signal.estrategia && (
                        <span className="text-[9.5px] font-bold text-muted bg-elevated px-2 py-1 rounded">
                          {signal.estrategia}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text2 leading-relaxed">{signal.rationale}</p>
                  </div>
                )}

                <div className="flex justify-end pt-3 mt-3 border-t border-border">
                  <button
                    onClick={() => marcarOperacao(signal)}
                    disabled={alreadyMarked || marking === signal.id}
                    className="btn-primary text-xs px-4 py-2 disabled:opacity-40"
                  >
                    {alreadyMarked
                      ? "Operação marcada ✓"
                      : marking === signal.id
                      ? "Marcando…"
                      : "Marcar operação"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
