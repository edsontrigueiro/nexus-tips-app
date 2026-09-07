"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminConfiguracoesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [casaNome, setCasaNome] = useState("");
  const [casaLink, setCasaLink] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("app_settings")
        .select("casa_nome, casa_link")
        .eq("id", 1)
        .maybeSingle();
      setCasaNome(data?.casa_nome || "");
      setCasaLink(data?.casa_link || "");
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("app_settings")
      .update({
        casa_nome: casaNome || null,
        casa_link: casaLink || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    if (!error) setSaved(true);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">ADMIN</span>
        <h1 className="text-2xl font-bold mt-2 mb-1">Configurações</h1>
        <p className="text-text2 text-sm">
          Casa de apostas base — usada no botão de cadastro que aparece no dashboard de
          todo usuário. Cada sinal ainda pode apontar pra uma casa diferente, se você
          preencher o link dele em Sinais.
        </p>
      </div>

      {loading ? (
        <div className="card p-7 text-center text-sm text-text2">Carregando…</div>
      ) : (
        <form onSubmit={salvar} className="card p-6 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text2">Nome da casa</label>
            <input
              className="input-field"
              placeholder="Ex: Bet365"
              value={casaNome}
              onChange={(e) => setCasaNome(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text2">Link de cadastro (afiliado)</label>
            <input
              className="input-field"
              placeholder="https://..."
              value={casaLink}
              onChange={(e) => setCasaLink(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary text-sm px-5 py-2.5 self-start" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
            {saved && <span className="text-success text-xs font-semibold">Salvo ✓</span>}
          </div>
        </form>
      )}
    </div>
  );
}
