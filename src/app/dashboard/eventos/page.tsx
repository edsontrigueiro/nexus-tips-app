"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Signal, Operation } from "@/lib/types";

export default function EventosPage() {
  const supabase = createClient();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">EVENTOS</span>
        <h1 className="text-2xl font-bold mt-2 mb-1">Sinais monitorados</h1>
        <p className="text-text2 text-sm">
          Atualiza automaticamente assim que um novo sinal é publicado.
        </p>
      </div>

      {!subscribed && (
        <div className="card p-4 border-warning/40 bg-warning/5 text-sm text-text2">
          Sua conta é gratuita — você pode ver os sinais, mas precisa de uma assinatura
          ativa para marcar operações.
        </div>
      )}

      {loading ? (
        <div className="card p-7 text-center text-sm text-text2">Carregando…</div>
      ) : signals.length === 0 ? (
        <div className="card p-7 text-center text-sm text-text2">
          Nenhum sinal publicado ainda. Assim que o time lançar um, ele aparece aqui na hora.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {signals.map((signal) => {
            const alreadyMarked = operations.some((o) => o.signal_id === signal.id);
            return (
              <div key={signal.id} className="card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] text-muted font-semibold tracking-wide">
                      {signal.competicao}
                    </div>
                    <div className="text-sm font-bold mt-0.5">
                      {signal.time_a} x {signal.time_b}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border ${
                      statusColor[signal.status]
                    }`}
                  >
                    {signal.live ? "AO VIVO · " : ""}
                    {statusLabel[signal.status]}
                  </span>
                </div>

                <div className="text-xs text-text2">
                  <span className="font-semibold text-text">{signal.mercado}</span> · ODD{" "}
                  <span className="font-mono">{signal.odd}</span>
                </div>

                {signal.rationale && (
                  <p className="text-xs text-text2 leading-relaxed">{signal.rationale}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted uppercase tracking-wide">
                    {signal.estrategia}
                  </span>
                  <button
                    onClick={() => marcarOperacao(signal)}
                    disabled={!subscribed || alreadyMarked || marking === signal.id}
                    className="btn-primary text-xs px-4 py-2 disabled:opacity-40"
                  >
                    {alreadyMarked
                      ? "Operação marcada"
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
