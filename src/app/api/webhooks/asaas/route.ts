import { NextResponse, type NextRequest } from "next/server";
// Fase 2: importe `createClient` de "@supabase/supabase-js" aqui quando descomentar o
// bloco de escrita no banco abaixo (a service role key ignora RLS, então usamos o
// client "puro" do supabase-js em vez do wrapper de sessão em @/lib/supabase).

// STUB — Fase 2 (cobrança automática via Asaas). Ainda não processa pagamento real.
//
// Quando a integração for ativada, este endpoint passa a ser o único lugar que escreve
// em `subscriptions` a partir de eventos de cobrança (hoje, no MVP, quem escreve é o
// próprio app em /dashboard/planos, direto do navegador do usuário).
//
// Como ativar (veja o README, seção "Fase 2: cobrança automática"):
//   1. Criar a assinatura na Asaas a partir de /dashboard/planos (client-side, via API
//      route própria) em vez de inserir direto na tabela.
//   2. Configurar essa URL (https://seu-dominio.com/api/webhooks/asaas) como webhook no
//      painel da Asaas, apontando para os eventos PAYMENT_CONFIRMED, PAYMENT_RECEIVED,
//      PAYMENT_OVERDUE e SUBSCRIPTION_DELETED (ou equivalentes da Pagar.me).
//   3. Preencher ASAAS_WEBHOOK_TOKEN no .env — a Asaas manda esse token de volta em cada
//      request (configurável no painel deles) e é isso que autentica a chamada abaixo.
//   4. Descomentar o bloco de escrita no banco mais abaixo.
//
// Usa a service role key (nunca exposta no navegador) porque webhook não tem sessão de
// usuário — precisa ignorar RLS pra gravar em `subscriptions` de qualquer usuário.

export async function POST(request: NextRequest) {
  const token = request.headers.get("asaas-access-token");
  if (!process.env.ASAAS_WEBHOOK_TOKEN || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "token inválido" }, { status: 401 });
  }

  const payload = await request.json();

  // Log só pra debug em dev — troque por observabilidade de verdade antes de ativar em produção.
  console.log("[asaas webhook] evento recebido:", payload?.event);

  // --- Fase 2: descomente e ajuste ao formato real de payload da Asaas/Pagar.me ---
  //
  // const supabaseAdmin = createClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.SUPABASE_SERVICE_ROLE_KEY!
  // );
  //
  // const providerSubscriptionId = payload?.subscription;
  //
  // if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(payload?.event)) {
  //   await supabaseAdmin
  //     .from("subscriptions")
  //     .update({ status: "ativa" })
  //     .eq("provider_subscription_id", providerSubscriptionId);
  // }
  //
  // if (payload?.event === "PAYMENT_OVERDUE") {
  //   await supabaseAdmin
  //     .from("subscriptions")
  //     .update({ status: "atrasada" })
  //     .eq("provider_subscription_id", providerSubscriptionId);
  // }
  //
  // if (payload?.event === "SUBSCRIPTION_DELETED") {
  //   await supabaseAdmin
  //     .from("subscriptions")
  //     .update({ status: "cancelada", canceled_at: new Date().toISOString() })
  //     .eq("provider_subscription_id", providerSubscriptionId);
  // }

  return NextResponse.json({ received: true });
}
