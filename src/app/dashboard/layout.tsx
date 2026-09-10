import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { temAcessoLiberado } from "@/lib/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O middleware já redireciona quem não está logado, isso aqui é só um cinto de segurança.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: activeSub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "ativa")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: settings } = await supabase
    .from("app_settings")
    .select("casa_nome, casa_link")
    .eq("id", 1)
    .maybeSingle();

  return (
    <>
      <OnboardingTutorial />
      <DashboardShell
        name={profile?.name || user.email || "Você"}
        subscribed={temAcessoLiberado(profile?.role, !!activeSub)}
        casaNome={settings?.casa_nome || null}
        casaLink={settings?.casa_link || null}
      >
        {children}
      </DashboardShell>
    </>
  );
}
