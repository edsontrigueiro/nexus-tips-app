"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Subscription } from "@/lib/types";
import { AdminUserModal } from "@/components/AdminUserModal";

export default function AdminUsuariosPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    async function init() {
      const [usersRes, subsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*").eq("status", "ativa"),
      ]);
      setUsers(usersRes.data || []);
      setSubs(subsRes.data || []);
      setLoading(false);

      // Todo novo cadastro dispara o trigger `handle_new_user` (insert em `profiles`)
      // e cai direto nesta lista, sem precisar recarregar a página.
      channels.push(
        supabase
          .channel("admin-usuarios")
          .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload) => {
            setUsers((prev) => {
              if (payload.eventType === "INSERT") return [payload.new as Profile, ...prev];
              if (payload.eventType === "UPDATE")
                return prev.map((u) => (u.id === (payload.new as Profile).id ? (payload.new as Profile) : u));
              return prev;
            });
          })
          .subscribe()
      );
      channels.push(
        supabase
          .channel("admin-usuarios-subs")
          .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, (payload) => {
            setSubs((prev) => {
              if (payload.eventType === "INSERT" && (payload.new as Subscription).status === "ativa")
                return [...prev, payload.new as Subscription];
              if (payload.eventType === "UPDATE") {
                const updated = payload.new as Subscription;
                const withoutOld = prev.filter((s) => s.id !== updated.id);
                return updated.status === "ativa" ? [...withoutOld, updated] : withoutOld;
              }
              return prev;
            });
          })
          .subscribe()
      );
    }
    init();
    return () => channels.forEach((c) => supabase.removeChannel(c));
  }, [supabase]);

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">ADMIN</span>
        <h1 className="text-2xl font-bold mt-2 mb-1">Usuários</h1>
        <p className="text-text2 text-sm">{users.length} cadastrados no total.</p>
      </div>

      <input
        className="input-field max-w-sm"
        placeholder="Buscar por nome ou e-mail…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="card p-7 text-center text-sm text-text2">Carregando…</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((u) => {
            const ativo = subs.some((s) => s.user_id === u.id);
            return (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className="card p-4 flex items-center justify-between text-left transition-colors hover:border-primary/40"
              >
                <div>
                  <div className="text-sm font-semibold">{u.name || "Sem nome"}</div>
                  <div className="text-xs text-text2">{u.email}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {u.phone || "Telefone não informado"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border ${
                      ativo
                        ? "bg-success/10 border-success text-success"
                        : "bg-elevated border-border text-text2"
                    }`}
                  >
                    {ativo ? "ASSINANTE" : "GRATUITO"}
                  </span>
                  {u.role === "admin" && (
                    <span className="text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border bg-primary/10 border-primary text-primary">
                      ADMIN
                    </span>
                  )}
                  {!u.ativo && (
                    <span className="text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border bg-danger/10 border-danger text-danger">
                      INATIVO
                    </span>
                  )}
                  <span className="text-[10px] text-muted font-mono">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="card p-7 text-center text-sm text-text2">Nenhum usuário encontrado.</div>
          )}
        </div>
      )}

      {selected && <AdminUserModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
