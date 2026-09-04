"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PLANOS } from "@/lib/types";
import type { Plano, Subscription } from "@/lib/types";

export default function PlanosPage() {
  const supabase = createClient();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "ativa")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveSub(data);
      setLoading(false);
    }
    init();
  }, [supabase]);

  async function assinar(plano: Plano) {
    if (!userId) return;
    setBusy(plano);
    // MVP: assinatura é registrada diretamente (sem cobrança real ainda).
    // Fase 2: aqui entra a chamada à Asaas/Pagar.me para criar a cobrança recorrente
    // e o webhook em /api/webhooks/asaas passa a ser quem grava/atualiza essa linha.
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plano,
        valor: PLANOS[plano].valor,
        status: "ativa",
        provider: "manual",
      })
      .select()
      .single();
    setBusy(null);
    if (!error && data) {
      setActiveSub(data as Subscription);
      router.refresh();
    }
  }

  async function cancelar() {
    if (!activeSub) return;
    setBusy("cancelar");
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelada", canceled_at: new Date().toISOString() })
      .eq("id", activeSub.id);
    setBusy(null);
    if (!error) {
      setActiveSub(null);
      router.refresh();
    }
  }

  if (loading) {
    return <div className="card p-7 text-center text-sm text-text2 max-w-3xl">Carregando…</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">PLANOS</span>
        <h1 className="text-2xl font-bold mt-2 mb-1">Assinatura</h1>
        <p className="text-text2 text-sm">
          Assine para liberar a marcação de operações nos eventos monitorados.
        </p>
      </div>

      {activeSub ? (
        <div className="card p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">
              Plano atual: {PLANOS[activeSub.plano].label}
            </div>
            <div className="text-xs text-text2 mt-1">
              R$ {activeSub.valor.toFixed(2)} · ativa desde{" "}
              {new Date(activeSub.created_at).toLocaleDateString("pt-BR")}
            </div>
          </div>
          <button
            onClick={cancelar}
            disabled={busy === "cancelar"}
            className="btn-outline text-xs px-4 py-2.5 border-danger text-danger disabled:opacity-40"
          >
            {busy === "cancelar" ? "Cancelando…" : "Cancelar assinatura"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(PLANOS) as Plano[]).map((key) => {
            const p = PLANOS[key];
            return (
              <div key={key} className="card p-6 flex flex-col gap-4">
                <div>
                  <div className="text-xs font-bold tracking-wide text-text2">
                    {p.label.toUpperCase()}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold">R$ {p.valor.toFixed(2)}</span>
                    {"valorPadrao" in p && p.valorPadrao && (
                      <span className="text-xs text-muted line-through">
                        R$ {p.valorPadrao.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => assinar(key)}
                  disabled={busy === key}
                  className="btn-primary text-xs py-2.5 disabled:opacity-40"
                >
                  {busy === key ? "Processando…" : "Assinar"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted leading-relaxed">
        Nexus Tips não movimenta o dinheiro da sua banca — a gestão da banca é sempre sua,
        marcando manualmente as operações realizadas.
      </p>
    </div>
  );
}
