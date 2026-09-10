// src/lib/access.ts (ARQUIVO NOVO)

// Regra central de "acesso liberado" (equivalente a assinatura paga: Eventos, Histórico,
// badge de assinatura etc). Duas situações liberam sem cobrança real:
// 1) Conta admin — sempre liberada, mesmo sem nenhuma linha em `subscriptions`.
// 2) Conta patrocinada — já é uma assinatura real (status "ativa", só que valor R$ 0 e
//    provider "patrocinada"), então `temAssinaturaAtiva` já vem `true` sozinha; não
//    precisa de nenhum caso especial aqui.
// Centralizado aqui pra não correr o risco de esquecer a regra do admin numa página nova.
export function temAcessoLiberado(
  role: string | null | undefined,
  temAssinaturaAtiva: boolean
): boolean {
  return temAssinaturaAtiva || role === "admin";
}
