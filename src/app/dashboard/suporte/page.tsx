"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupportTicket, SupportMessage } from "@/lib/types";

export default function SuportePage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const [assunto, setAssunto] = useState("");
  const [texto, setTexto] = useState("");
  const [creating, setCreating] = useState(false);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setTickets(data || []);
      setLoading(false);
    }
    init();
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

      // Assim que o admin responde no painel, a mensagem cai aqui na hora.
      channel = supabase
        .channel(`ticket-${selected}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${selected}` },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as SupportMessage]);
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "support_tickets", filter: `id=eq.${selected}` },
          (payload) => {
            setTickets((prev) =>
              prev.map((t) => (t.id === selected ? (payload.new as SupportTicket) : t))
            );
          }
        )
        .subscribe();
    }
    loadMessages();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [selected, supabase]);

  async function criarTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !assunto.trim() || !texto.trim()) return;
    setCreating(true);

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({ user_id: userId, assunto })
      .select()
      .single();

    if (!ticketError && ticket) {
      await supabase
        .from("support_messages")
        .insert({ ticket_id: ticket.id, sender: "user", text: texto });
      setTickets((prev) => [ticket as SupportTicket, ...prev]);
      setSelected(ticket.id);
      setAssunto("");
      setTexto("");
    }
    setCreating(false);
  }

  async function enviarResposta() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from("support_messages")
      .insert({ ticket_id: selected, sender: "user", text: reply })
      .select()
      .single();
    setSending(false);
    if (!error && data) {
      setMessages((prev) => [...prev, data as SupportMessage]);
      setReply("");
    }
  }

  const statusColor: Record<string, string> = {
    aberto: "bg-warning/10 border-warning text-warning",
    respondido: "bg-info/10 border-info text-info",
    fechado: "bg-muted/10 border-border text-muted",
  };

  return (
    <div className="flex gap-6 max-w-5xl">
      <div className="w-72 flex-none flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
              <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.4A8.5 8.5 0 1 1 21 11.5z" />
            </svg>
            <span className="text-xs font-bold tracking-wide text-primary">SUPORTE</span>
          </div>
          <h1 className="text-xl font-bold mb-1">Seus chamados</h1>
        </div>

        <form onSubmit={criarTicket} className="card p-4 flex flex-col gap-2.5">
          <div className="text-xs font-bold text-text2">Novo chamado</div>
          <input
            className="input-field text-sm"
            placeholder="Assunto"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            required
          />
          <textarea
            className="input-field text-sm min-h-20 resize-none"
            placeholder="Descreva sua dúvida ou problema"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary text-xs py-2.5" disabled={creating}>
            {creating ? "Enviando…" : "Abrir chamado"}
          </button>
        </form>

        <div className="flex items-center gap-2 text-muted text-[11px] px-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Tempo médio de resposta: algumas horas, todos os dias.
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
            Selecione um chamado ao lado ou abra um novo.
          </div>
        ) : (
          <div className="card p-5 flex flex-col gap-4 h-full">
            <div className="flex flex-col gap-3 flex-1 overflow-auto max-h-[420px]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                    m.sender === "user"
                      ? "self-end bg-primary/15 border border-primary/30"
                      : "self-start bg-elevated border border-border"
                  }`}
                >
                  <div className="text-[10px] font-bold text-muted mb-1">
                    {m.sender === "user" ? "VOCÊ" : "NEXUS TIPS"}
                  </div>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-border">
              <input
                className="input-field text-sm flex-1"
                placeholder="Escreva uma mensagem…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviarResposta()}
              />
              <button
                onClick={enviarResposta}
                disabled={sending}
                className="btn-primary text-xs px-4"
              >
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
