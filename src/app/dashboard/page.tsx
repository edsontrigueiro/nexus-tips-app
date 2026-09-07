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

  const { data: allOperations } = await supabase
    .from("operations")
    .select("*, signals(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const operations = (allOperations || []).filter((op) => op.status === "andamento");
  const settled = (allOperations || []).filter((op) => op.status !== "andamento");
  const greens = settled.filter((op) => op.status === "green").length;
  const reds = settled.filter((op) => op.status === "red").length;
  const minhaAssertividade = settled.length ? Math.round((greens / settled.length) * 100) : null;

  // Assertividade da plataforma nos últimos 30 dias — calculada de verdade a partir dos
  // sinais encerrados, não um número fixo no código.
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const { data: sinaisRecentes } = await supabase
    .from("signals")
    .select("status")
    .in("status", ["green", "red"])
    .gte("created_at", trintaDiasAtras.toISOString());
  const plataformaGreens = (sinaisRecentes || []).filter((s) => s.status === "green").length;
  const plataformaTotal = sinaisRecentes?.length || 0;
  const assertividadePlataforma = plataformaTotal
    ? Math.round((plataformaGreens / plataformaTotal) * 100)
    : null;

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span className="text-xs font-bold tracking-wide text-primary">VISÃO GERAL</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Sua operação em um lugar só</h1>
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
        Ir para Eventos
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <div>
        <div className="text-sm font-bold text-text2 mb-3">
          OPERAÇÕES EM ANDAMENTO ({operations.length})
        </div>
        {operations.length > 0 ? (
          <div className="flex flex-col gap-3">
            {operations.map((op: any) => (
              <div key={op.id} className="card p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {op.signals.time_a} x {op.signals.time_b}
                  </div>
                  <div className="text-xs text-text2 mt-0.5">{op.signals.mercado}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px] text-muted">
                      ODD {op.signals.odd} · R$ {op.valor}
                    </div>
                    <div className="font-mono text-sm font-semibold text-info mt-0.5">
                      R$ {(op.signals.odd * op.valor).toFixed(2)}
                    </div>
                  </div>
                  <span className="bg-info/15 text-info text-[10px] font-bold px-3 py-1.5 rounded-md whitespace-nowrap">
                    EM ANDAMENTO
                  </span>
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

      {activeSub && (
        <Link
          href="/dashboard/gestao"
          className="card p-5 flex items-center justify-between hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-elevated border border-border flex-none flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                <path d="M4 19V10M10 19V5M16 19V13M22 19V8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold">Suas conquistas</div>
              <div className="text-xs text-text2 mt-0.5">
                Sequência de greens, banca e performance — tudo em Gestão.
              </div>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="text-xs font-semibold text-text2">ASSERTIVIDADE NEXUS TIPS · 30 DIAS</div>
          <div className="text-[11px] text-muted mt-1">Performance geral da plataforma.</div>
          <div className="font-mono text-2xl font-semibold text-success mt-2.5">
            {assertividadePlataforma === null ? "—" : `${assertividadePlataforma}%`}
          </div>
        </div>
        <div className="card p-6">
          <div className="text-xs font-semibold text-text2">SUA ASSERTIVIDADE</div>
          <div className="text-[11px] text-muted mt-1">Baseado nas suas operações marcadas.</div>
          <div className="font-mono text-2xl font-semibold mt-2.5">
            {minhaAssertividade === null ? "—" : `${minhaAssertividade}%`}
          </div>
        </div>
        <div className="card p-6">
          <div className="text-xs font-semibold text-text2">GREENS / REDS</div>
          <div className="text-[11px] text-muted mt-1">Operações já confirmadas.</div>
          <div className="font-mono text-2xl font-semibold mt-2.5">
            <span className="text-success">{greens}</span>
            <span className="text-muted text-base"> / </span>
            <span className="text-danger">{reds}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
