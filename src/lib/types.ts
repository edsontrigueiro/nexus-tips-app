// Tipos compartilhados, espelhando o schema em supabase/migrations/0001_init.sql.
// Mantenha isto em sincronia manualmente por enquanto (dá pra gerar automático depois
// com `supabase gen types typescript`, quando o projeto Supabase já existir).

export type Role = "user" | "admin";

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  time_coracao: string | null;
  banca_inicial: number | null;
  tutorial_completo: boolean;
  created_at: string;
}

export type Plano = "mensal" | "semestral" | "anual";
export type SubscriptionStatus = "ativa" | "cancelada" | "atrasada";

export interface Subscription {
  id: string;
  user_id: string;
  plano: Plano;
  valor: number;
  status: SubscriptionStatus;
  provider: string;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  canceled_at: string | null;
}

export type SignalStatus = "no_ar" | "green" | "red";
export type SignalTipo = "simples" | "bilhete";

export interface Signal {
  id: string;
  competicao: string;
  time_a: string;
  time_b: string;
  mercado: string;
  odd: number;
  estrategia: string | null;
  rationale: string | null;
  status: SignalStatus;
  live: boolean;
  tipo: SignalTipo;
  published_by: string | null;
  created_at: string;
}

// Um jogo dentro de um bilhete (sinal com tipo "bilhete"). Só existe quando o sinal
// combina múltiplos jogos — um sinal "simples" não tem nenhuma linha aqui.
export interface SignalLeg {
  id: string;
  signal_id: string;
  competicao: string;
  time_a: string;
  time_b: string;
  mercado: string;
  odd: number;
  ordem: number;
  created_at: string;
}

export type OperationStatus = "andamento" | "green" | "red";

export interface Operation {
  id: string;
  user_id: string;
  signal_id: string;
  valor: number;
  status: OperationStatus;
  created_at: string;
}

export type TicketStatus = "aberto" | "respondido" | "fechado";

export interface SupportTicket {
  id: string;
  user_id: string;
  assunto: string;
  status: TicketStatus;
  prioridade: "alta" | "media" | "baixa";
  created_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender: "user" | "admin";
  text: string;
  created_at: string;
}

// Preços vigentes — mesmos valores usados no protótipo. Ajuste aqui quando a promoção
// de lançamento (48h) acabar.
export const PLANOS = {
  mensal: { label: "Mensal", valor: 47.9, valorPadrao: 97.9 },
  semestral: { label: "Semestral", valor: 397.9 },
  anual: { label: "Anual", valor: 697.9 },
} as const;
