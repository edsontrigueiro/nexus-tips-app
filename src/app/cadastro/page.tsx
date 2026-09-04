"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function CadastroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!acceptTerms) {
      setError("Aceite os termos para continuar.");
      return;
    }
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    // Isso cria o usuário em auth.users. O trigger `handle_new_user` (veja a migration)
    // cria automaticamente a linha correspondente em `profiles` — é esse insert que o
    // admin vê aparecer em tempo real na aba Usuários, sem nenhum código extra aqui.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* PAINEL DE MARCA */}
      <div className="hidden md:flex flex-1 relative bg-gradient-to-br from-bg2 to-bg border-r border-border p-12 flex-col justify-between overflow-hidden">
        <div className="absolute -top-16 -left-16 w-80 h-80 bg-primary opacity-20 blur-[80px] rounded-full" />
        <div className="relative">
          <Logo size={30} />
        </div>
        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight mb-4">
            Comece a decidir com dados.
          </h1>
          <p className="text-text2 text-sm leading-relaxed">
            Crie sua conta grátis e veja como a Nexus Tips organiza eventos, análises e
            performance — sem pagar nada até você decidir assinar.
          </p>
        </div>
        <div />
      </div>

      {/* FORM */}
      <div className="flex-1 flex items-center justify-center p-10">
        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-bold">Criar sua conta</h1>
            <p className="text-text2 text-sm mt-1">Leva menos de um minuto.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text2">Nome</label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text2">E-mail</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text2">Senha</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-text2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            Li e aceito os termos de uso e a política de privacidade.
          </label>

          {error && <p className="text-danger text-xs">{error}</p>}

          <button type="submit" className="btn-primary w-full py-3 text-sm" disabled={loading}>
            {loading ? "Criando conta…" : "Criar conta"}
          </button>

          <p className="text-center text-text2 text-sm">
            Já tem conta?{" "}
            <Link href="/login" className="text-info font-semibold">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
