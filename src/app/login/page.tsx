"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  // useSearchParams (usado pra ler ?desativado=1) exige um Suspense boundary em volta
  // pra não quebrar o build estático — sem isso o Next recusa a exportar a página.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("desativado") === "1") {
      setError("Sua conta foi desativada. Fale com o suporte se acha que isso é um engano.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError("E-mail ou senha inválidos.");
      return;
    }

    // Checa aqui além do middleware pra dar feedback na hora, sem depender de um
    // redirect a mais — conta desativada não deve nem piscar o dashboard.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("ativo").eq("id", user.id).single();
      if (profile && profile.ativo === false) {
        await supabase.auth.signOut();
        setLoading(false);
        setError("Sua conta foi desativada. Fale com o suporte se acha que isso é um engano.");
        return;
      }
    }

    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex flex-1 relative bg-gradient-to-br from-bg2 to-bg border-r border-border p-12 flex-col justify-between overflow-hidden">
        <div className="absolute -top-16 -left-16 w-80 h-80 bg-primary opacity-20 blur-[80px] rounded-full" />
        <div className="relative">
          <Logo size={30} />
        </div>
        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight mb-4">Sua operação te espera.</h1>
          <p className="text-text2 text-sm leading-relaxed">
            Entre para ver os eventos monitorados, suas operações em andamento e a
            performance atualizada da sua banca.
          </p>
        </div>
        <div />
      </div>

      <div className="flex-1 flex items-center justify-center p-10">
        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-bold">Entrar na sua conta</h1>
            <p className="text-text2 text-sm mt-1">Acesse o dashboard da Nexus Tips.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text2">E-mail</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              required
            />
          </div>

          {error && <p className="text-danger text-xs">{error}</p>}

          <button type="submit" className="btn-primary w-full py-3 text-sm" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </button>

          <p className="text-center text-text2 text-sm">
            Não tem conta?{" "}
            <Link href="/cadastro" className="text-info font-semibold">
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
