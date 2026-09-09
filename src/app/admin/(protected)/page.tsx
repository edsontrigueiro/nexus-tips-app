"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLANOS } from "@/lib/types";
import type { Subscription, Signal, SupportTicket, Profile } from "@/lib/types";

function mrrDeAssinaturas(subs: Subscription[], adminIds: Set<string>) {
  // MRR aproximado: normaliza cada plano ativo pro equivalente mensal. Assinaturas de
  // contas admin nunca entram aqui (mesmo que tenham valor > 0, ex: teste manual) — e
  // assinaturas patrocinadas já têm valor 0, então já saem sozinhas da soma.
  const fatorMensal: Record<string, number> = { mensal: 1, semestral: 1 / 6, anual: 1 / 12 };
  return subs
    .filter((s) => !adminIds.has(s.user_id))
    .reduce((acc, s) => acc + s.valor * (fatorMensal[s.plano] ?? 1), 0);
}

export default function AdminVisaoGeralPage() {
  const supabase = createClient();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    async function init() {
      const [subsRes, signalsRes, ticketsRes, usersRes] = await Promise.all([
        supabase.from("subscriptions").select("*"),
        supabase.from("signals").select("*"),
        supabase.from("support_tickets").select("*"),
        supabase.from("profiles").select("*"),
      ]);
      setSubs(subsRes.data || []);
      setSignals(signalsRes.data || []);
      setTickets(ticketsRes.data || []);
      setUsers(usersRes.data || []);
      setLoading(false);

      // Cada uma dessas tabelas está no publication `supabase_realtime` (ver migration) —
      // cadastro, assinatura e cancelamento aparecem aqui assim que acontecem, sem refresh.
      channels.push(
        supabase
          .channel("admin-overview-subs")
          .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, (payload) => {
            setSubs((prev) => {
              if (payload.eventType === "INSERT") return [...prev, payload.new as Subscription];
              if (payload.eventType === "UPDATE")
                return prev.map((s) => (s.id === (payload.new as Subscription).id ? (payload.new as Subscription) : s));
              if (payload.eventType === "DELETE") return prev.filter((s) => s.id !== (payload.old as Subscription).id);
              return prev;
            });
          })
          .subscribe()
      );
      channels.push(
        supabase
          .channel("admin-overview-signals")
          .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, (payload) => {
            setSignals((prev) => {
              if (payload.eventType === "INSERT") return [...prev, payload.new as Signal];
              if (payload.eventType === "UPDATE")
                return prev.map((s) => (s.id === (payload.new as Signal).id ? (payload.new as Signal) : s));
              if (payload.eventType === "DELETE") return prev.filter((s) => s.id !== (payload.old as Signal).id);
              return prev;
            });
          })
          .subscribe()
      );
      channels.push(
        supabase
          .channel("admin-overview-tickets")
          .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, (payload) => {
            setTickets((prev) => {
              if (payload.eventType === "INSERT") return [...prev, payload.new as SupportTicket];
              if (payload.eventType === "UPDATE")
                return prev.map((t) => (t.id === (payload.new as SupportTicket).id ? (payload.new as SupportTicket) : t));
              return prev;
            });
          })
          .subscribe()
      );
      channels.push(
        supabase
          .channel("admin-overview-users")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => {
            setUsers((prev) => [...prev, payload.new as Profile]);
          })
          .subscribe()
      );
    }

    init();
    return () => channels.forEach((c) => supabase.removeChannel(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assinaturasAtivas = subs.filter((s) => s.status === "ativa");
  const sinaisNoAr = signals.filter((s) => s.status === "no_ar");
  const ticketsAbertos = tickets.filter((t) => t.status === "aberto");
  const adminIds = new Set(users.filter((u) => u.role === "admin").map((u) => u.id));
  const mrr = mrrDeAssinaturas(assinaturasAtivas, adminIds);

  const cards = [
    { label: "MRR ESTIMADO", value: loading ? "—" : `R$ ${mrr.toFixed(2)}` },
    { label: "ASSINANTES ATIVOS", value: loading ? "—" : assinaturasAtivas.length },
    { label: "USUÁRIOS CADASTRADOS", value: loading ? "—" : users.length },
    { label: "SINAIS NO AR", value: loading ? "—" : sinaisNoAr.length },
    { label: "TICKETS ABERTOS", value: loading ? "—" : ticketsAbertos.length },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">ADMIN</span>
        <h1 className="text-2xl font-bold mt-2 mb-1">Visão geral</h1>
        <p className="text-text2 text-sm">Atualiza sozinho conforme os eventos acontecem.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="text-[10px] font-bold text-text2 tracking-wide">{c.label}</div>
            <div className="text-xl font-bold mt-2 font-mono">{c.value}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-sm font-bold text-text2 mb-3">ÚLTIMAS ASSINATURAS</div>
        <div className="flex flex-col gap-2">
          {[...subs]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 5)
            .map((s) => (
              <div key={s.id} className="card p-4 flex items-center justify-between">
                <div className="text-sm">
                  {PLANOS[s.plano].label} · R$ {s.valor.toFixed(2)}
                </div>
                <span
                  className={`text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border ${
                    s.status === "ativa"
                      ? "bg-success/10 border-success text-success"
                      : s.status === "cancelada"
                      ? "bg-danger/10 border-danger text-danger"
                      : "bg-warning/10 border-warning text-warning"
                  }`}
                >
                  {s.status.toUpperCase()}
                </span>
              </div>
            ))}
          {subs.length === 0 && !loading && (
            <div className="card p-6 text-center text-sm text-text2">Nenhuma assinatura ainda.</div>
          )}
        </div>
      </div>
    </div>
  );
}
