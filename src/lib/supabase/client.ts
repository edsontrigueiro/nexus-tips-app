"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente Supabase para uso em Client Components ("use client").
// Usa a anon key pública — o RLS do banco (ver migration 0001_init.sql) é quem garante
// que cada usuário só lê/escreve o que pode.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
