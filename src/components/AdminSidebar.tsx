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
];

export function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="w-64 flex-none bg-gradient-to-b from-bg2 to-[#060D1C] border-r border-border flex flex-col">
      <div className="p-6 pb-4">
        <Logo size={26} />
        <div className="text-[10px] font-bold text-primary tracking-wide mt-1.5">ADMIN</div>
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
