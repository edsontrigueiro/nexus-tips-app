"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

const ICONS = {
  grid: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  bolt: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="round" />
    </svg>
  ),
  wallet: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  clock: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bars: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V10M10 19V5M16 19V13M22 19V8" strokeLinecap="round" />
    </svg>
  ),
  card: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20" strokeLinecap="round" />
    </svg>
  ),
  headset: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20l1-5.4A8.5 8.5 0 1 1 21 11.5z" />
    </svg>
  ),
};

const Lock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#66758A" strokeWidth="2">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
  </svg>
);

function navGroups(subscribed: boolean) {
  return [
    {
      label: "PRINCIPAL",
      links: [
        { href: "/dashboard", label: "Visão geral", icon: ICONS.grid, locked: false },
        { href: "/dashboard/eventos", label: "Eventos", icon: ICONS.bolt, locked: !subscribed },
      ],
    },
    {
      label: "OPERAÇÃO",
      links: subscribed
        ? [
            { href: "/dashboard/gestao", label: "Gestão", icon: ICONS.wallet, locked: false },
            { href: "/dashboard/historico", label: "Histórico", icon: ICONS.clock, locked: false },
            { href: "/dashboard/performance", label: "Performance", icon: ICONS.bars, locked: false },
          ]
        : [{ href: "/dashboard/historico", label: "Histórico", icon: ICONS.clock, locked: false }],
    },
    {
      label: "CONTA",
      links: [
        { href: "/dashboard/planos", label: "Planos de assinatura", icon: ICONS.card, locked: false },
        { href: "/dashboard/suporte", label: "Suporte", icon: ICONS.headset, locked: false },
      ],
    },
  ];
}

export function DashboardSidebar({
  name,
  subscribed,
  casaNome,
  casaLink,
}: {
  name: string;
  subscribed: boolean;
  casaNome?: string | null;
  casaLink?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const groups = navGroups(subscribed);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-64 flex-none bg-gradient-to-b from-bg2 to-[#060D1C] border-r border-border flex flex-col">
      <div className="relative px-6 pt-6 pb-4">
        <div className="absolute top-1.5 left-5 w-16 h-16 bg-primary opacity-[0.18] blur-[20px] rounded-full pointer-events-none" />
        <div className="relative">
          <Logo size={26} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-3.5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] font-bold tracking-wide text-muted px-2.5 pt-4 pb-1.5">
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.links.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm border-l-[2.5px] transition-colors ${
                      active
                        ? "bg-elevated text-text border-primary font-semibold"
                        : "text-text2 border-transparent hover:bg-elevated"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {link.icon}
                      {link.label}
                    </span>
                    {link.locked && <Lock />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 flex flex-col gap-2">
        {casaLink && (
          
            href={casaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-[11px] font-semibold text-center py-2 rounded-lg"
          >
            Cadastre-se na {casaNome || "casa de apostas"}
          </a>
        )}
        <div
          className={`card p-3.5 flex items-center gap-2.5 ${
            subscribed ? "border-success/35" : ""
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full bg-elevated border-[1.5px] flex-none flex items-center justify-center ${
              subscribed ? "border-success" : "border-border"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA8BC" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-7 8-7s8 3 8 7" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs font-semibold truncate">{name}</span>
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide ${
                subscribed ? "text-success" : "text-text2"
              }`}
            >
              {subscribed && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
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
