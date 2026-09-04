"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Signal } from "@/lib/types";

const ESTRATEGIAS = ["Valor esperado", "Overreaction de mercado", "Modelo estatístico", "Live trading"];

export default function AdminSinaisPage() {
  const supabase = createClient();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const [form, setForm] = useState({
    competicao: "",
    time_a: "",
    time_b: "",
    mercado: "",
    odd: "",
    estrategia: ESTRATEGIAS[0],
    rationale: "",
    live: false,
  });

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const { data } = await supabase.from("signals").select("*").order("created_at", { ascending: false });
      setSignals(data || []);
      setLoading(false);

      channel = supabase
        .channel("admin-sinais")
        .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, (payload) => {
          setSignals((prev) => {
            if (payload.eventType === "INSERT") return [payload.new as Signal, ...prev];
            if (payload.eventType === "UPDATE")
              return prev.map((s) => (s.id === (payload.new as Signal).id ? (payload.new as Signal) : s));
            if (payload.eventType === "DELETE") return prev.filter((s) => s.id !== (payload.old as Signal).id);
            return prev;
          });
        })
        .subscribe();
    }
    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setPublishing(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Esse insert é o que faz o sinal aparecer na hora na página Eventos de todo
    // usuário ativo — é a mesma tabela, com Realtime ligado (ver migration).
    const { error } = await supabase.from("signals").insert({
      competicao: form.competicao,
      time_a: form.time_a,
      time_b: form.time_b,
      mercado: form.mercado,
      odd: parseFloat(form.odd),
      estrategia: form.estrategia,
      rationale: form.rationale || null,
      live: form.live,
      published_by: user?.id,
    });

    setPublishing(false);
    if (!error) {
      setForm({
        competicao: "",
        time_a: "",
        time_b: "",
        mercado: "",
        odd: "",
        estrategia: ESTRATEGIAS[0],
        rationale: "",
        live: false,
      });
    }
  }

  async function atualizarStatus(id: string, status: "green" | "red" | "no_ar") {
    setUpdating(id);
    await supabase.from("signals").update({ status }).eq("id", id);
    setUpdating(null);
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">ADMIN</span>
        <h1 className="text-2xl font-bold mt-2 mb-1">Sinais</h1>
        <p className="text-text2 text-sm">Publicar aqui reflete na hora em Eventos, para todos os usuários.</p>
      </div>

      <form onSubmit={publicar} className="card p-6 flex flex-col gap-3.5">
        <div className="text-sm font-bold">Publicar novo sinal</div>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="input-field"
            placeholder="Competição"
            value={form.competicao}
            onChange={(e) => setForm({ ...form, competicao: e.target.value })}
            required
          />
          <div className="flex items-center gap-2 text-xs text-text2">
            <input
              type="checkbox"
              checked={form.live}
              onChange={(e) => setForm({ ...form, live: e.target.checked })}
            />
            Jogo ao vivo
          </div>
          <input
            className="input-field"
            placeholder="Time A"
            value={form.time_a}
            onChange={(e) => setForm({ ...form, time_a: e.target.value })}
            required
          />
          <input
            className="input-field"
            placeholder="Time B"
            value={form.time_b}
            onChange={(e) => setForm({ ...form, time_b: e.target.value })}
            required
          />
          <input
            className="input-field"
            placeholder="Mercado (ex: Over 2.5 gols)"
            value={form.mercado}
            onChange={(e) => setForm({ ...form, mercado: e.target.value })}
            required
          />
          <input
            className="input-field"
            type="number"
            step="0.01"
            min="1"
            placeholder="Odd"
            value={form.odd}
            onChange={(e) => setForm({ ...form, odd: e.target.value })}
            required
          />
          <select
            className="input-field col-span-2"
            value={form.estrategia}
            onChange={(e) => setForm({ ...form, estrategia: e.target.value })}
          >
            {ESTRATEGIAS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <textarea
            className="input-field col-span-2 min-h-20 resize-none"
            placeholder="Rationale (opcional) — a análise por trás do sinal"
            value={form.rationale}
            onChange={(e) => setForm({ ...form, rationale: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary py-2.5 text-sm self-start px-6" disabled={publishing}>
          {publishing ? "Publicando…" : "Publicar sinal"}
        </button>
      </form>

      <div>
        <div className="text-sm font-bold text-text2 mb-3">SINAIS PUBLICADOS ({signals.length})</div>
        {loading ? (
          <div className="card p-7 text-center text-sm text-text2">Carregando…</div>
        ) : (
          <div className="flex flex-col gap-3">
            {signals.map((s) => (
              <div key={s.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] text-muted font-semibold">{s.competicao}</div>
                  <div className="text-sm font-semibold truncate">
                    {s.time_a} x {s.time_b} · {s.mercado} · ODD {s.odd}
                  </div>
                </div>
                <div className="flex-none flex items-center gap-2">
                  <button
                    onClick={() => atualizarStatus(s.id, "green")}
                    disabled={updating === s.id}
                    className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border ${
                      s.status === "green"
                        ? "bg-success text-bg border-success"
                        : "border-success text-success"
                    }`}
                  >
                    GREEN
                  </button>
                  <button
                    onClick={() => atualizarStatus(s.id, "red")}
                    disabled={updating === s.id}
                    className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border ${
                      s.status === "red" ? "bg-danger text-bg border-danger" : "border-danger text-danger"
                    }`}
                  >
                    RED
                  </button>
                  <button
                    onClick={() => atualizarStatus(s.id, "no_ar")}
                    disabled={updating === s.id}
                    className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border ${
                      s.status === "no_ar" ? "bg-info text-bg border-info" : "border-info text-info"
                    }`}
                  >
                    NO AR
                  </button>
                </div>
              </div>
            ))}
            {signals.length === 0 && (
              <div className="card p-7 text-center text-sm text-text2">Nenhum sinal publicado ainda.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
