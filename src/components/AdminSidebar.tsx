"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/sinais", label: "Sinais" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/assinaturas", label: "Assinaturas" },
  { href: "/admin/suporte", label: "Suporte" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

export function AdminSidebar({
  name,
  open,
  onClose,
}: {
  name: string;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div
      className={`w-64 flex-none bg-gradient-to-b from-bg2 to-[#060D1C] border-r border-border flex flex-col fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:z-auto ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="p-6 pb-4 flex items-center justify-between">
        <div>
          <Logo size={26} />
          <div className="text-[10px] font-bold text-primary tracking-wide mt-1.5">ADMIN</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar menu"
          className="md:hidden w-8 h-8 flex-none flex items-center justify-center rounded-lg text-text2 hover:bg-elevated"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 px-3.5 flex flex-col gap-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
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
        <div className="card p-3.5">
          <span className="text-xs font-semibold truncate block">{name}</span>
          <span className="text-[10px] text-muted">acesso administrativo</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-muted hover:text-text2 text-left px-1"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
