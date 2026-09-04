"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/dashboard/eventos", label: "Eventos" },
  { href: "/dashboard/planos", label: "Planos de assinatura" },
  { href: "/dashboard/suporte", label: "Suporte" },
];

export function DashboardSidebar({
  name,
  subscribed,
}: {
  name: string;
  subscribed: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-64 flex-none bg-gradient-to-b from-bg2 to-[#060D1C] border-r border-border flex flex-col">
      <div className="p-6 pb-4">
        <span className="font-bold text-sm tracking-wide">NEXUS TIPS</span>
      </div>

      <div className="flex-1 px-3.5 flex flex-col gap-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3.5 py-2.5 rounded-lg text-sm border-l-[2.5px] transition-colors ${
                active
                  ? "bg-elevated text-text border-primary font-semibold"
                  : "text-text2 border-transparent hover:bg-elevated"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 flex flex-col gap-2">
        <div className="card p-3.5 flex items-center gap-2.5">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate">{name}</span>
            <span
              className={`text-[10px] font-bold tracking-wide ${
                subscribed ? "text-success" : "text-text2"
              }`}
            >
              {subscribed ? "NEXUS PRO ATIVO" : "CONTA GRATUITA"}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-muted hover:text-text2 text-left px-1"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}
