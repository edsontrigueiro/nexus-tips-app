import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function VisaoGeralPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: activeSub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "ativa")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: operations } = await supabase
    .from("operations")
    .select("*, signals(*)")
    .eq("user_id", user.id)
    .eq("status", "andamento")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">VISÃO GERAL</span>
        <h1 className="text-2xl font-bold mt-2 mb-1">Sua operação em um lugar só</h1>
        <p className="text-text2 text-sm">
          Assinatura e operações em andamento, de relance.
        </p>
      </div>

      <div className="card p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`w-2.5 h-2.5 rounded-full ${activeSub ? "bg-success" : "bg-muted"}`}
          />
          <div>
            <div className="text-sm font-bold">
              {activeSub ? `Assinatura ativa — ${activeSub.plano}` : "Assinatura inativa"}
            </div>
            <div className="text-xs text-text2 mt-0.5">
              {activeSub
                ? "Eventos e marcação de operações liberados."
                : "Assine um plano para liberar os eventos monitorados."}
            </div>
          </div>
        </div>
        <Link
          href="/dashboard/planos"
          className={activeSub ? "btn-outline text-xs px-4 py-2.5" : "btn-primary text-xs px-4 py-2.5"}
        >
          {activeSub ? "Gerenciar assinatura" : "Ver planos"}
        </Link>
      </div>

      <Link
        href="/dashboard/eventos"
        className="btn-outline self-start flex items-center gap-2 text-sm px-5 py-3"
      >
        Ir para Eventos →
      </Link>

      <div>
        <div className="text-sm font-bold text-text2 mb-3">
          OPERAÇÕES EM ANDAMENTO ({operations?.length ?? 0})
        </div>
        {operations && operations.length > 0 ? (
          <div className="flex flex-col gap-3">
            {operations.map((op: any) => (
              <div key={op.id} className="card p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {op.signals.time_a} x {op.signals.time_b}
                  </div>
                  <div className="text-xs text-text2 mt-0.5">{op.signals.mercado}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted">
                    ODD {op.signals.odd} · R$ {op.valor}
                  </div>
                  <div className="font-mono text-sm font-semibold text-info mt-0.5">
                    R$ {(op.signals.odd * op.valor).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-7 text-center text-sm text-text2">
            Nenhuma operação em andamento agora. Marque um sinal em Eventos para começar.
          </div>
        )}
      </div>
    </div>
  );
}
