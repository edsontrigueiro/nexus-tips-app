"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLANOS } from "@/lib/types";
import type { Subscription, Profile } from "@/lib/types";

type Filtro = "todas" | "ativa" | "cancelada" | "atrasada";

export default function AdminAssinaturasPage() {
  const supabase = createClient();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [users, setUsers] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const [subsRes, usersRes] = await Promise.all([
        supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*"),
      ]);
      setSubs(subsRes.data || []);
      const map: Record<string, Profile> = {};
      (usersRes.data || []).forEach((u: Profile) => (map[u.id] = u));
      setUsers(map);
      setLoading(false);

      // Assinatura nova (checkout simulado no MVP, ou webhook Asaas na fase 2) e
      // cancelamento aparecem aqui na hora — mesma tabela `subscriptions`.
      channel = supabase
        .channel("admin-assinaturas")
        .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, (payload) => {
          setSubs((prev) => {
            if (payload.eventType === "INSERT") return [payload.new as Subscription, ...prev];
            if (payload.eventType === "UPDATE")
              return prev.map((s) => (s.id === (payload.new as Subscription).id ? (payload.new as Subscription) : s));
            if (payload.eventType === "DELETE") return prev.filter((s) => s.id !== (payload.old as Subscription).id);
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

  async function cancelar(sub: Subscription) {
    setBusy(sub.id);
    await supabase
      .from("subscriptions")
      .update({ status: "cancelada", canceled_at: new Date().toISOString() })
      .eq("id", sub.id);
    setBusy(null);
  }

  const visiveis = filtro === "todas" ? subs : subs.filter((s) => s.status === filtro);
  // Assinaturas de contas admin nunca contam na receita (mesmo que tenham valor > 0),
  // e assinaturas patrocinadas já têm valor 0, então saem sozinhas dessa soma.
  const receitaAtiva = subs
    .filter((s) => s.status === "ativa" && users[s.user_id]?.role !== "admin")
    .reduce((acc, s) => acc + s.valor, 0);

  const statusColor: Record<string, string> = {
    ativa: "bg-success/10 border-success text-success",
    cancelada: "bg-danger/10 border-danger text-danger",
    atrasada: "bg-warning/10 border-warning text-warning",
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">ADMIN</span>
        <h1 className="text-2xl font-bold mt-2 mb-1">Assinaturas</h1>
        <p className="text-text2 text-sm">Controle financeiro das assinaturas.</p>
      </div>

      <div className="card p-5 flex items-center justify-between max-w-xs">
        <div>
          <div className="text-[10px] font-bold text-text2 tracking-wide">SOMA DAS ATIVAS</div>
          <div className="text-xl font-bold font-mono mt-1">R$ {receitaAtiva.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["todas", "ativa", "cancelada", "atrasada"] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-lg border ${
              filtro === f ? "bg-elevated border-primary text-text" : "border-border text-text2"
            }`}
          >
            {f === "todas" ? "Todas" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-7 text-center text-sm text-text2">Carregando…</div>
      ) : (
        <div className="flex flex-col gap-2">
          {visiveis.map((s) => (
            <div key={s.id} className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {users[s.user_id]?.name || users[s.user_id]?.email || s.user_id}
                </div>
                <div className="text-xs text-text2">
                  {PLANOS[s.plano].label} · R$ {s.valor.toFixed(2)} · {s.provider}
                </div>
              </div>
              <div className="flex-none flex items-center gap-3 flex-wrap">
                <span
                  className={`text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border ${statusColor[s.status]}`}
                >
                  {s.status.toUpperCase()}
                </span>
                {s.status === "ativa" && (
                  <button
                    onClick={() => cancelar(s)}
                    disabled={busy === s.id}
                    className="text-xs text-danger font-semibold disabled:opacity-40"
                  >
                    {busy === s.id ? "Cancelando…" : "Cancelar"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {visiveis.length === 0 && (
            <div className="card p-7 text-center text-sm text-text2">Nenhuma assinatura nesse filtro.</div>
          )}
        </div>
      )}
    </div>
  );
}
