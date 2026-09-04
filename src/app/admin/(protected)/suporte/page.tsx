"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupportTicket, SupportMessage, Profile } from "@/lib/types";

export default function AdminSuportePage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [users, setUsers] = useState<Record<string, Profile>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const [ticketsRes, usersRes] = await Promise.all([
        supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*"),
      ]);
      setTickets(ticketsRes.data || []);
      const map: Record<string, Profile> = {};
      (usersRes.data || []).forEach((u: Profile) => (map[u.id] = u));
      setUsers(map);
      setLoading(false);

      // Chamado novo aberto por qualquer usuário aparece aqui na hora.
      channel = supabase
        .channel("admin-suporte-tickets")
        .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, (payload) => {
          setTickets((prev) => {
            if (payload.eventType === "INSERT") return [payload.new as SupportTicket, ...prev];
            if (payload.eventType === "UPDATE")
              return prev.map((t) => (t.id === (payload.new as SupportTicket).id ? (payload.new as SupportTicket) : t));
            return prev;
          });
        })
        .subscribe();
    }
    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (!selected) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadMessages() {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", selected)
        .order("created_at", { ascending: true });
      setMessages(data || []);

      channel = supabase
        .channel(`admin-ticket-${selected}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${selected}` },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as SupportMessage]);
          }
        )
        .subscribe();
    }
    loadMessages();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [selected, supabase]);

  async function enviarResposta() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from("support_messages")
      .insert({ ticket_id: selected, sender: "admin", text: reply })
      .select()
      .single();
    if (!error) {
      await supabase.from("support_tickets").update({ status: "respondido" }).eq("id", selected);
      setTickets((prev) =>
        prev.map((t) => (t.id === selected ? { ...t, status: "respondido" as const } : t))
      );
    }
    setSending(false);
    if (!error && data) {
      setMessages((prev) => [...prev, data as SupportMessage]);
      setReply("");
    }
  }

  async function fecharTicket() {
    if (!selected) return;
    await supabase.from("support_tickets").update({ status: "fechado" }).eq("id", selected);
    setTickets((prev) => prev.map((t) => (t.id === selected ? { ...t, status: "fechado" as const } : t)));
  }

  const statusColor: Record<string, string> = {
    aberto: "bg-warning/10 border-warning text-warning",
    respondido: "bg-info/10 border-info text-info",
    fechado: "bg-muted/10 border-border text-muted",
  };

  const selectedTicket = tickets.find((t) => t.id === selected);

  return (
    <div className="flex gap-6 max-w-5xl">
      <div className="w-80 flex-none flex flex-col gap-4">
        <div>
          <span className="text-xs font-bold tracking-wide text-primary">ADMIN</span>
          <h1 className="text-xl font-bold mt-2 mb-1">Suporte</h1>
          <p className="text-text2 text-sm">
            {tickets.filter((t) => t.status === "aberto").length} chamado(s) aberto(s).
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {loading ? (
            <div className="text-xs text-text2">Carregando…</div>
          ) : tickets.length === 0 ? (
            <div className="text-xs text-text2">Nenhum chamado ainda.</div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`card p-3.5 text-left transition-colors ${
                  selected === t.id ? "border-primary" : ""
                }`}
              >
                <div className="text-sm font-semibold truncate">{t.assunto}</div>
                <div className="text-[11px] text-text2 truncate mt-0.5">
                  {users[t.user_id]?.name || users[t.user_id]?.email}
                </div>
                <span
                  className={`inline-block mt-1.5 text-[10px] font-bold tracking-wide rounded-full px-2 py-0.5 border ${
                    statusColor[t.status]
                  }`}
                >
                  {t.status.toUpperCase()}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1">
        {!selected ? (
          <div className="card p-10 text-center text-sm text-text2">
            Selecione um chamado ao lado.
          </div>
        ) : (
          <div className="card p-5 flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="text-sm font-bold">{selectedTicket?.assunto}</div>
                <div className="text-xs text-text2">
                  {users[selectedTicket?.user_id || ""]?.email}
                </div>
              </div>
              {selectedTicket?.status !== "fechado" && (
                <button onClick={fecharTicket} className="btn-outline text-xs px-3 py-1.5">
                  Fechar chamado
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-auto max-h-[380px]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                    m.sender === "admin"
                      ? "self-end bg-primary/15 border border-primary/30"
                      : "self-start bg-elevated border border-border"
                  }`}
                >
                  <div className="text-[10px] font-bold text-muted mb-1">
                    {m.sender === "admin" ? "NEXUS TIPS" : "USUÁRIO"}
                  </div>
                  {m.text}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <input
                className="input-field text-sm flex-1"
                placeholder="Responder…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviarResposta()}
              />
              <button onClick={enviarResposta} disabled={sending} className="btn-primary text-xs px-4">
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
