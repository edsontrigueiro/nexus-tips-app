"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Logo } from "@/components/Logo";

// Casca do dashboard: no desktop (md+) é o layout de sempre, sidebar fixa ao lado do
// conteúdo. No mobile o menu lateral vira uma gaveta escondida por padrão — só o essencial
// (hambúrguer, logo, status da assinatura) fica numa barra compacta no topo, do jeito que
// um app de verdade se comporta, em vez do layout de PC espremido na tela do celular.
export function DashboardShell({
  name,
  subscribed,
  casaNome,
  casaLink,
  children,
}: {
  name: string;
  subscribed: boolean;
  casaNome?: string | null;
  casaLink?: string | null;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-bg text-text">
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      <DashboardSidebar
        name={name}
        subscribed={subscribed}
        casaNome={casaNome}
        casaLink={casaLink}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra mobile — some no desktop (md:hidden). Substitui o header de PC de baixo. */}
        <div className="h-14 flex-none flex items-center justify-between px-4 border-b border-border md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="w-9 h-9 flex-none flex items-center justify-center rounded-lg text-text2 hover:bg-elevated"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <Logo size={22} />
          <span
            className={`rounded-full w-2.5 h-2.5 flex-none ${
              subscribed ? "bg-success" : "bg-muted"
            }`}
            aria-label={subscribed ? "Assinatura ativa" : "Conta gratuita"}
          />
        </div>

        {/* Header de desktop — some no mobile (hidden, md:flex). */}
        <div className="h-16 flex-none hidden md:flex items-center justify-end px-8 border-b border-border">
          <div
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide border ${
              subscribed
                ? "bg-success/10 border-success text-success"
                : "bg-elevated border-border text-text2"
            }`}
          >
            {subscribed ? "ASSINATURA ATIVA" : "CONTA GRATUITA"}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8 min-w-0">{children}</div>
      </div>
    </div>
  );
}
