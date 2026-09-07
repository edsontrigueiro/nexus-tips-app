import type { Signal } from "@/lib/types";
import { VALOR_UNIDADE_PCT } from "@/lib/types";

// Sugestão de entrada configurada pelo admin num sinal, traduzida pra texto (e, quando
// dá, um valor em R$ pra pré-preencher o campo "valor" na hora de marcar a operação).
// bancaAtual vem do perfil do usuário (banca_inicial) — sem ela, só dá pra mostrar
// percentual/unidades como número puro, sem converter pra reais.
export function sugestaoDoSinal(
  signal: Signal,
  bancaAtual: number | null
): { texto: string; valorReais: number | null } | null {
  if (!signal.sugestao_tipo || signal.sugestao_valor == null) return null;
  const v = signal.sugestao_valor;

  if (signal.sugestao_tipo === "valor") {
    return { texto: `R$ ${v.toFixed(2)}`, valorReais: v };
  }

  if (signal.sugestao_tipo === "percentual") {
    const reais = bancaAtual ? (bancaAtual * v) / 100 : null;
    return {
      texto: `${v}% da banca${reais !== null ? ` (≈ R$ ${reais.toFixed(2)})` : ""}`,
      valorReais: reais,
    };
  }

  // unidades
  const reais = bancaAtual ? (bancaAtual * VALOR_UNIDADE_PCT * v) / 100 : null;
  return {
    texto: `${v} unidade${v !== 1 ? "s" : ""} (1 un. = ${VALOR_UNIDADE_PCT}% da banca)${
      reais !== null ? ` ≈ R$ ${reais.toFixed(2)}` : ""
    }`,
    valorReais: reais,
  };
}
