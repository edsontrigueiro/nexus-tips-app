"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Logo } from "@/components/Logo";

export function AdminShell({
  name,
  children,
}: {
  name: string;
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

      <AdminSidebar name={name} open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra mobile — some no desktop (md:hidden). */}
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
          <span className="text-[10px] font-bold text-primary tracking-wide">ADMIN</span>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8 min-w-0">{children}</div>
      </div>
    </div>
  );
}
