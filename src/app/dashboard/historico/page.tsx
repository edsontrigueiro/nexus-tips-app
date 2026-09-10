"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Operation, Signal } from "@/lib/types";
import { temAcessoLiberado } from "@/lib/access";

type OperationRow = Operation & { signals: Signal };
type Filtro = "todos" | "green" | "red" | "andamento";

function oddEfetiva(op: OperationRow): number {
  return op.odd_obtida ?? op.signals.odd;
}

function retornoOf(op: OperationRow): number | null {
  if (op.status === "green") return op.valor * oddEfetiva(op);
  if (op.status === "red") return 0;
  return null;
}

function formatData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoricoPage() {
  const supabase = createClient();
  const [subscribed, setSubscribed] = useState(false);
  const [operations, setOperations] = useState<OperationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: activeSub }, { data: profile }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "ativa")
          .limit(1)
          .maybeSingle(),
        supabase.from("profiles").select("role").eq("id", user.id).single(),
      ]);
      // Conta admin tem acesso liberado mesmo sem assinatura — ver src/lib/access.ts.
      const isSubscribed = temAcessoLiberado(profile?.role, !!activeSub);
      setSubscribed(isSubscribed);

      if (isSubscribed) {
        // Histórico agora é pessoal: as operações que ESTE usuário já marcou, com o
        // resultado de cada uma — por isso é travado por assinatura, igual Eventos.
        const { data } = await supabase
          .from("operations")
          .select("*, signals(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        setOperations((data as OperationRow[]) || []);
      }

      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => operations.filter((o) => filtro === "todos" || o.status === filtro),
    [operations, filtro]
  );

  const greens = operations.filter((o) => o.status === "green").length;
  const reds = operations.filter((o) => o.status === "red").length;
  const settled = greens + reds;
  const assertividade = settled ? Math.round((greens / settled) * 100) : null;

  const statusLabel: Record<string, string> = {
    andamento: "EM ANDAMENTO",
    green: "GREEN",
    red: "RED",
  };
  const statusColor: Record<string, string> = {
    andamento: "bg-info/10 border-info text-info",
    green: "bg-success/10 border-success text-success",
    red: "bg-danger/10 border-danger text-danger",
  };

  const filtros: { id: Filtro; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "green", label: "Green" },
    { id: "red", label: "Red" },
    { id: "andamento", label: "Em andamento" },
  ];

  const header = (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-xs font-bold tracking-wide text-primary">HISTÓRICO</span>
      </div>
      <h1 className="text-2xl font-bold mb-1">Suas operações</h1>
      <p className="text-text2 text-sm">
        Todas as operações que você já marcou, com o resultado de cada uma.
      </p>
    </div>
  );

  if (!loading && !subscribed) {
    return (
      <div className="flex flex-col gap-5 max-w-4xl">
        {header}
        <div className="relative">
          <div className="flex flex-col gap-2.5 blur-[5px] opacity-40 pointer-events-none" aria-hidden>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4">
                <div className="text-sm font-bold">Time A x Time B</div>
                <div className="text-xs text-text2 mt-1">R$ 100 · ODD 1.85 · GREEN</div>
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
              <div className="font-bold text-base">Histórico travado</div>
              <p className="text-text2 text-sm mt-1 max-w-xs">
                Assine um plano para acompanhar o histórico completo das suas operações.
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
    <div className="flex flex-col gap-5 max-w-4xl">
      {header}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="text-xs font-semibold text-text2">OPERAÇÕES ENCERRADAS</div>
          <div className="font-mono text-2xl font-semibold mt-2.5">{settled}</div>
        </div>
        <div className="card p-6">
          <div className="text-xs font-semibold text-text2">ASSERTIVIDADE</div>
          <div className="font-mono text-2xl font-semibold mt-2.5">
            {assertividade === null ? "—" : `${assertividade}%`}
          </div>
        </div>
        <div className="card p-6">
          <div className="text-xs font-semibold text-text2">GREENS / REDS</div>
          <div className="font-mono text-2xl font-semibold mt-2.5">
            <span className="text-success">{greens}</span>
            <span className="text-muted text-base"> / </span>
            <span className="text-danger">{reds}</span>
          </div>
        </div>
      </div>

      <div className="inline-flex bg-surface border border-border rounded-[10px] p-1 w-fit flex-wrap">
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
      ) : filtered.length === 0 ? (
        <div className="card p-7 text-center text-sm text-text2">
          {operations.length === 0
            ? "Você ainda não marcou nenhuma operação. Vá em Eventos para começar."
            : "Nenhuma operação nesse filtro agora."}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold text-text2 tracking-wide">
                  <th className="px-4 py-3">EVENTO</th>
                  <th className="px-4 py-3">RESULTADO</th>
                  <th className="px-4 py-3">STAKE</th>
                  <th className="px-4 py-3">ODD</th>
                  <th className="px-4 py-3">RETORNO</th>
                  <th className="px-4 py-3">FINALIZADA EM</th>
                  <th className="px-4 py-3">AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((op) => {
                  const isBilhete = op.signals.tipo === "bilhete";
                  const retorno = retornoOf(op);
                  const expanded = expandedId === op.id;
                  return (
                    <Fragment key={op.id}>
                      <tr className="border-b border-border last:border-0">
                        <td className="px-4 py-3 max-w-[220px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isBilhete && (
                              <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-none">
                                BILHETE
                              </span>
                            )}
                            <span className="font-semibold truncate">
                              {isBilhete ? op.signals.time_b : `${op.signals.time_a} x ${op.signals.time_b}`}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted truncate">
                            {isBilhete ? "Combinados" : op.signals.mercado}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border whitespace-nowrap ${statusColor[op.status]}`}
                          >
                            {statusLabel[op.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono whitespace-nowrap">
                          R$ {op.valor.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono">{oddEfetiva(op)}</td>
                        <td className="px-4 py-3 font-mono whitespace-nowrap">
                          {retorno === null ? (
                            "—"
                          ) : (
                            <span className={retorno > 0 ? "text-success" : "text-danger"}>
                              R$ {retorno.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text2 whitespace-nowrap">
                          {formatData(op.finalizada_em)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedId(expanded ? null : op.id)}
                            className="text-[12px] font-semibold text-primary hover:underline whitespace-nowrap"
                          >
                            {expanded ? "Ocultar" : "Ver detalhes"}
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-border last:border-0 bg-elevated/40">
                          <td colSpan={7} className="px-4 py-3.5 text-xs text-text2">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5">
                              <div>
                                <span className="text-muted">Competição:</span> {op.signals.competicao}
                              </div>
                              {op.signals.estrategia && (
                                <div>
                                  <span className="text-muted">Estratégia:</span> {op.signals.estrategia}
                                </div>
                              )}
                              {op.signals.casa_nome && (
                                <div>
                                  <span className="text-muted">Casa:</span> {op.signals.casa_nome}
                                </div>
                              )}
                              <div>
                                <span className="text-muted">Marcada em:</span> {formatData(op.created_at)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
