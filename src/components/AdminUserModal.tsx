"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Subscription, Operation, Signal, SupportTicket } from "@/lib/types";
import { PLANOS } from "@/lib/types";

type Tab = "resumo" | "assinaturas" | "operacoes" | "suporte";

type OperationRow = Operation & { signals: Signal };

const statusSubColor: Record<string, string> = {
  ativa: "bg-success/10 border-success text-success",
  cancelada: "bg-muted/10 border-border text-muted",
  atrasada: "bg-warning/10 border-warning text-warning",
};

const statusOpColor: Record<string, string> = {
  andamento: "bg-info/10 border-info text-info",
  green: "bg-success/10 border-success text-success",
  red: "bg-danger/10 border-danger text-danger",
};

const statusTicketColor: Record<string, string> = {
  aberto: "bg-warning/10 border-warning text-warning",
  respondido: "bg-info/10 border-info text-info",
  fechado: "bg-muted/10 border-border text-muted",
};

export function AdminUserModal({ user, onClose }: { user: Profile; onClose: () => void }) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("resumo");
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [ops, setOps] = useState<OperationRow[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    async function load() {
      const [subsRes, opsRes, ticketsRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("operations")
          .select("*, signals(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("support_tickets")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setSubs(subsRes.data || []);
      setOps((opsRes.data as OperationRow[]) || []);
      setTickets(ticketsRes.data || []);
      setLoading(false);
    }
    load();
  }, [supabase, user.id]);

  const assinaturaAtiva = subs.find((s) => s.status === "ativa");
  const settled = ops.filter((o) => o.status !== "andamento");
  const greens = settled.filter((o) => o.status === "green").length;
  const reds = settled.filter((o) => o.status === "red").length;
  const assertividade = settled.length ? Math.round((greens / settled.length) * 100) : null;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "resumo", label: "Resumo" },
    { id: "assinaturas", label: "Assinaturas", count: subs.length },
    { id: "operacoes", label: "Operações", count: ops.length },
    { id: "suporte", label: "Suporte", count: tickets.length },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">{user.name || "Sem nome"}</h2>
                <span
                  className={`text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border ${
                    assinaturaAtiva
                      ? "bg-success/10 border-success text-success"
                      : "bg-elevated border-border text-text2"
                  }`}
                >
                  {assinaturaAtiva ? "ASSINANTE" : "GRATUITO"}
                </span>
                {user.role === "admin" && (
                  <span className="text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border bg-primary/10 border-primary text-primary">
                    ADMIN
                  </span>
                )}
              </div>
              <div className="text-xs text-text2 mt-1.5">{user.email}</div>
              <div className="text-xs text-muted mt-0.5">
                {user.phone || "Telefone não informado"}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="text-muted hover:text-text2 text-xl leading-none px-1"
            >
              ×
            </button>
          </div>

          <div className="flex gap-5 mt-5 border-b border-border -mb-6 pt-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`text-[13px] font-semibold pb-3 border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-primary text-text"
                    : "border-transparent text-text2 hover:text-text"
                }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className="ml-1.5 text-[10px] text-muted font-mono">{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          {loading ? (
            <div className="text-sm text-text2 text-center py-8">Carregando…</div>
          ) : tab === "resumo" ? (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold tracking-wide text-muted">
                    CADASTRADO EM
                  </div>
                  <div className="text-sm mt-1">
                    {new Date(user.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold tracking-wide text-muted">
                    TIME DO CORAÇÃO
                  </div>
                  <div className="text-sm mt-1">{user.time_coracao || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold tracking-wide text-muted">
                    BANCA INICIAL INFORMADA
                  </div>
                  <div className="text-sm mt-1 font-mono">
                    {user.banca_inicial ? `R$ ${user.banca_inicial.toFixed(2)}` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold tracking-wide text-muted">ID</div>
                  <div className="text-sm mt-1 font-mono truncate" title={user.id}>
                    {user.id.slice(0, 13)}…
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div>
                <div className="text-[10px] font-bold tracking-wide text-muted mb-2">
                  ASSINATURA ATUAL
                </div>
                {assinaturaAtiva ? (
                  <div className="card p-4 flex items-center justify-between border-success/35">
                    <div>
                      <div className="text-sm font-semibold">
                        {PLANOS[assinaturaAtiva.plano].label}
                      </div>
                      <div className="text-xs text-text2 mt-0.5">
                        Ativa desde{" "}
                        {new Date(assinaturaAtiva.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-semibold">
                      R$ {assinaturaAtiva.valor.toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div className="card p-4 text-sm text-text2">Sem assinatura ativa.</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="card p-4">
                  <div className="text-[10px] font-bold tracking-wide text-muted">
                    ASSERTIVIDADE
                  </div>
                  <div className="font-mono text-xl font-semibold mt-1.5">
                    {assertividade === null ? "—" : `${assertividade}%`}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-[10px] font-bold tracking-wide text-muted">
                    GREENS / REDS
                  </div>
                  <div className="font-mono text-xl font-semibold mt-1.5">
                    <span className="text-success">{greens}</span>
                    <span className="text-muted text-sm"> / </span>
                    <span className="text-danger">{reds}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : tab === "assinaturas" ? (
            <div className="flex flex-col gap-2.5">
              {subs.length === 0 ? (
                <div className="text-sm text-text2 text-center py-6">
                  Nenhuma assinatura registrada.
                </div>
              ) : (
                subs.map((s) => (
                  <div key={s.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{PLANOS[s.plano].label}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {new Date(s.created_at).toLocaleDateString("pt-BR")}
                        {s.canceled_at &&
                          ` · cancelada em ${new Date(s.canceled_at).toLocaleDateString("pt-BR")}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">R$ {s.valor.toFixed(2)}</span>
                      <span
                        className={`text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border ${statusSubColor[s.status]}`}
                      >
                        {s.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : tab === "operacoes" ? (
            <div className="flex flex-col gap-2.5">
              {ops.length === 0 ? (
                <div className="text-sm text-text2 text-center py-6">
                  Nenhuma operação marcada.
                </div>
              ) : (
                ops.map((o) => (
                  <div key={o.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        {o.signals.time_a} x {o.signals.time_b}
                      </div>
                      <div className="text-xs text-text2 mt-0.5">
                        {o.signals.mercado} · ODD {o.signals.odd} · R$ {o.valor}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border whitespace-nowrap ${statusOpColor[o.status]}`}
                    >
                      {o.status === "andamento" ? "EM ANDAMENTO" : o.status.toUpperCase()}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {tickets.length === 0 ? (
                <div className="text-sm text-text2 text-center py-6">
                  Nenhum chamado aberto.
                </div>
              ) : (
                tickets.map((t) => (
                  <div key={t.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{t.assunto}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {new Date(t.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border ${statusTicketColor[t.status]}`}
                    >
                      {t.status.toUpperCase()}
                    </span>
                  </div>
                ))
              )}
              {tickets.length > 0 && (
                <p className="text-[11px] text-muted mt-1">
                  Para responder, use a aba Suporte no menu do admin.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
