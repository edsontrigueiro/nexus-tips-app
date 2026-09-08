"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SupportTicket, SupportMessage } from "@/lib/types";

type Categoria = "Acesso" | "Operações" | "Financeiro" | "Segurança";
const CATEGORIAS: Categoria[] = ["Acesso", "Operações", "Financeiro", "Segurança"];

// Perguntas frequentes — todo texto aqui reflete o que o app realmente faz hoje. Nada de
// prometer recuperação automática de senha, 2FA ou qualquer coisa que não existe: se não tem
// no código, a resposta manda abrir um chamado em vez de inventar um recurso.
const FAQ: { id: string; categoria: Categoria; pergunta: string; resposta: string }[] = [
  {
    id: "cadastro",
    categoria: "Acesso",
    pergunta: "Como faço para criar minha conta?",
    resposta:
      "Na página de cadastro você informa nome, e-mail, senha e telefone com DDD — o telefone é obrigatório e a conta não é criada sem ele.",
  },
  {
    id: "senha",
    categoria: "Acesso",
    pergunta: "Esqueci minha senha. Como recupero o acesso?",
    resposta:
      "Ainda não temos redefinição de senha automática. Abra um chamado aqui no Suporte informando o e-mail cadastrado que a equipe restabelece o acesso manualmente.",
  },
  {
    id: "conta-desativada",
    categoria: "Acesso",
    pergunta: "Minha conta foi desativada. O que fazer?",
    resposta:
      "Uma conta desativada pelo admin não consegue logar até ser reativada. Abra um chamado explicando o caso — a reativação é feita manualmente pela equipe.",
  },
  {
    id: "sinal",
    categoria: "Operações",
    pergunta: "Como funciona um sinal enviado pela Nexus Tips?",
    resposta:
      "Cada sinal nasce \"no ar\" e depois é encerrado como green (ganhou) ou red (perdeu). Um sinal pode ser simples (um jogo só) ou um bilhete, que combina vários jogos.",
  },
  {
    id: "marcar-operacao",
    categoria: "Operações",
    pergunta: "Como marco que peguei uma operação?",
    resposta:
      "Na página Eventos, ao abrir um sinal ativo, você informa o valor apostado e confirma. Isso cria uma operação vinculada ao seu usuário, que depois aparece no seu Histórico com o resultado.",
  },
  {
    id: "unidade",
    categoria: "Operações",
    pergunta: "O que significa \"unidade\" na sugestão de valor?",
    resposta:
      "1 unidade equivale a 1% da banca inicial que você informou no tutorial. É só uma referência de tamanho de aposta — você decide o valor final que vai colocar.",
  },
  {
    id: "cobranca",
    categoria: "Financeiro",
    pergunta: "Como funciona a cobrança da assinatura?",
    resposta:
      "Os planos são mensal, semestral e anual, com valor fixo e renovação automática conforme o período escolhido. Você acompanha o vencimento e o status em Planos de assinatura.",
  },
  {
    id: "cancelar",
    categoria: "Financeiro",
    pergunta: "Posso cancelar minha assinatura quando quiser?",
    resposta:
      "Sim. Na página Planos de assinatura existe o botão \"Cancelar assinatura\", que é autoatendimento — não precisa abrir chamado pra isso.",
  },
  {
    id: "banca",
    categoria: "Financeiro",
    pergunta: "A Nexus Tips mexe no dinheiro da minha banca?",
    resposta:
      "Não. A Nexus Tips não movimenta o dinheiro da sua banca — a gestão da banca é sempre sua, marcando manualmente as operações que você realmente fez.",
  },
  {
    id: "dados",
    categoria: "Segurança",
    pergunta: "Meus dados estão protegidos?",
    resposta:
      "Sim. Os dados ficam no Supabase, com autenticação por senha e políticas de acesso (RLS) que restringem cada usuário aos próprios dados — só o admin enxerga o restante da base.",
  },
  {
    id: "atividade-suspeita",
    categoria: "Segurança",
    pergunta: "Notei algo estranho na minha conta. O que faço?",
    resposta:
      "Abra um chamado aqui no Suporte descrevendo o que percebeu. A equipe verifica o acesso e o histórico da conta e retorna com as próximas etapas.",
  },
];

const HeadsetIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
    <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.4A8.5 8.5 0 1 1 21 11.5z" />
  </svg>
);

const WhatsappIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.5 0-10 4.5-10 10 0 1.77.46 3.45 1.27 4.9L2 22l5.25-1.38A9.96 9.96 0 0 0 12.04 22c5.5 0 10-4.5 10-10s-4.5-10-10-10zm0 18.2c-1.6 0-3.13-.43-4.46-1.24l-.32-.19-3.11.82.83-3.03-.2-.31A8.17 8.17 0 0 1 3.8 12c0-4.55 3.7-8.24 8.24-8.24 4.55 0 8.24 3.7 8.24 8.24s-3.69 8.2-8.24 8.2zm4.51-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.23.89 2.41 1.02 2.58.12.17 1.75 2.67 4.24 3.75.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29z" />
  </svg>
);

const TicketIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
  </svg>
);

export default function SuportePage() {
  const supabase = createClient();
  const [view, setView] = useState<"faq" | "tickets">("faq");

  // ---- FAQ ----
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<Categoria | "todas">("todas");
  const [aberta, setAberta] = useState<string | null>(null);

  const faqFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return FAQ.filter((f) => {
      if (categoria !== "todas" && f.categoria !== categoria) return false;
      if (!termo) return true;
      return (
        f.pergunta.toLowerCase().includes(termo) || f.resposta.toLowerCase().includes(termo)
      );
    });
  }, [busca, categoria]);

  // ---- Canais oficiais ----
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);

  // ---- Chamados (mesma lógica de sempre, só que agora vive dentro da view "tickets") ----
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
      const { data: settings } = await supabase
        .from("app_settings")
        .select("whatsapp_link")
        .eq("id", 1)
        .maybeSingle();
      setWhatsappLink(settings?.whatsapp_link || null);

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

  function abrirTickets(focarNovo: boolean) {
    setView("tickets");
    if (focarNovo) setSelected(null);
  }

  return (
    <div className="flex gap-6 max-w-6xl">
      <div className="flex-1 flex flex-col gap-5 min-w-0">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HeadsetIcon />
            <span className="text-xs font-bold tracking-wide text-primary">SUPORTE</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">
            {view === "faq" ? "Central de ajuda" : "Seus chamados"}
          </h1>
          <p className="text-text2 text-sm">
            {view === "faq"
              ? "Respostas rápidas para as dúvidas mais comuns."
              : "Acompanhe suas conversas com a equipe de suporte."}
          </p>
        </div>

        {view === "tickets" && (
          <button
            onClick={() => setView("faq")}
            className="text-xs font-semibold text-primary self-start flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Voltar para Perguntas frequentes
          </button>
        )}

        {view === "faq" ? (
          <>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#66758A"
                  strokeWidth="2"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                </svg>
                <input
                  className="input-field text-sm pl-9 w-full"
                  placeholder="Buscar uma pergunta…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoria("todas")}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
                  categoria === "todas"
                    ? "bg-primary/15 border-primary text-primary"
                    : "border-border text-text2 hover:bg-elevated"
                }`}
              >
                Todas
              </button>
              {CATEGORIAS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoria(c)}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
                    categoria === c
                      ? "bg-primary/15 border-primary text-primary"
                      : "border-border text-text2 hover:bg-elevated"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2.5">
              {faqFiltrada.length === 0 ? (
                <div className="card p-8 text-center text-sm text-text2">
                  Nenhuma pergunta encontrada. Tente outro termo ou abra um chamado.
                </div>
              ) : (
                faqFiltrada.map((f) => {
                  const aberto = aberta === f.id;
                  return (
                    <div key={f.id} className="card overflow-hidden">
                      <button
                        onClick={() => setAberta(aberto ? null : f.id)}
                        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                      >
                        <span className="text-sm font-semibold">{f.pergunta}</span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#66758A"
                          strokeWidth="2.2"
                          className={`flex-none transition-transform ${aberto ? "rotate-180" : ""}`}
                        >
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {aberto && (
                        <div className="px-5 pb-4 text-sm text-text2 leading-relaxed border-t border-border pt-3.5">
                          {f.resposta}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="flex gap-6">
            <div className="w-72 flex-none flex flex-col gap-4">
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
        )}
      </div>

      <div className="w-72 flex-none flex flex-col gap-4">
        <div className="card p-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-text2">CANAIS OFICIAIS</div>
          {whatsappLink ? (
            <Link
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-lg bg-success/15 border border-success/40 text-success hover:bg-success/25 transition-colors"
            >
              <WhatsappIcon />
              Falar no WhatsApp
            </Link>
          ) : (
            <p className="text-[11px] text-muted">
              Nenhum canal externo configurado no momento — use os chamados abaixo.
            </p>
          )}
        </div>

        <div className="card p-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-text2">PRECISA FALAR COM O SUPORTE?</div>
          <p className="text-[11px] text-muted leading-relaxed">
            Não achou sua resposta nas perguntas frequentes? Abra um chamado e a equipe
            responde por aqui mesmo.
          </p>
          <button
            onClick={() => abrirTickets(true)}
            className="btn-primary text-xs py-2.5 flex items-center justify-center gap-2"
          >
            <TicketIcon />
            Abrir ticket
          </button>
          <button
            onClick={() => abrirTickets(false)}
            className="btn-outline text-xs py-2.5"
          >
            Acompanhar tickets{tickets.length > 0 ? ` (${tickets.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
