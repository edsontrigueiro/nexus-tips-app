import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/DashboardSidebar";

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

  return (
    <div className="min-h-screen flex bg-bg text-text">
      <DashboardSidebar name={profile?.name || user.email || "Você"} subscribed={!!activeSub} />
      <div className="flex-1 flex flex-col">
        <div className="h-16 flex-none flex items-center justify-end px-8 border-b border-border">
          <div
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide border ${
              activeSub
                ? "bg-success/10 border-success text-success"
                : "bg-elevated border-border text-text2"
            }`}
          >
            {activeSub ? "ASSINATURA ATIVA" : "CONTA GRATUITA"}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </div>
    </div>
  );
}
