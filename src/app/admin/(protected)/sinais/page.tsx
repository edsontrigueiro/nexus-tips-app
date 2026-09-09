"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Signal, SignalLeg, SignalTipo, SugestaoTipo } from "@/lib/types";

type SignalRow = Signal & { signal_legs: SignalLeg[] };

const ESTRATEGIAS = ["Valor esperado", "Overreaction de mercado", "Modelo estatístico", "Live trading"];

const SUGESTAO_LABELS: Record<SugestaoTipo, string> = {
  percentual: "% da banca",
  unidades: "Unidades",
  valor: "Valor fixo (R$)",
};

interface LegForm {
  competicao: string;
  time_a: string;
  time_b: string;
  mercado: string;
  odd: string;
}

const EMPTY_LEG: LegForm = { competicao: "", time_a: "", time_b: "", mercado: "", odd: "" };

export default function AdminSinaisPage() {
  const supabase = createClient();
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [tipo, setTipo] = useState<SignalTipo>("simples");
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
  const [bilheteTitulo, setBilheteTitulo] = useState("");
  const [legs, setLegs] = useState<LegForm[]>([{ ...EMPTY_LEG }, { ...EMPTY_LEG }]);

  // Direcionamento pra casa de apostas e sugestão de entrada — valem tanto pra sinal
  // simples quanto pra bilhete, por isso ficam fora do "form"/"legs" específicos de cada um.
  const [casaNome, setCasaNome] = useState("");
  const [casaLink, setCasaLink] = useState("");
  const [defaultCasa, setDefaultCasa] = useState({ nome: "", link: "" });
  const [sugestaoTipo, setSugestaoTipo] = useState<SugestaoTipo | "nenhuma">("nenhuma");
  const [sugestaoValor, setSugestaoValor] = useState("");

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const [{ data }, { data: settings }] = await Promise.all([
        supabase.from("signals").select("*, signal_legs(*)").order("created_at", { ascending: false }),
        supabase.from("app_settings").select("casa_nome, casa_link").eq("id", 1).maybeSingle(),
      ]);
      setSignals((data as SignalRow[]) || []);
      // Pré-preenche com a casa "base" cadastrada em Configurações — o admin só precisa
      // trocar quando o jogo específico for direcionar pra outro lugar.
      const nomeBase = settings?.casa_nome || "";
      const linkBase = settings?.casa_link || "";
      setDefaultCasa({ nome: nomeBase, link: linkBase });
      setCasaNome(nomeBase);
      setCasaLink(linkBase);
      setLoading(false);

      channel = supabase
        .channel("admin-sinais")
        .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, (payload) => {
          setSignals((prev) => {
            if (payload.eventType === "UPDATE")
              return prev.map((s) =>
                s.id === (payload.new as Signal).id ? { ...s, ...(payload.new as Signal) } : s
              );
            if (payload.eventType === "DELETE") return prev.filter((s) => s.id !== (payload.old as Signal).id);
            // INSERT: recarrega pra já trazer os legs do bilhete junto (payload não traz join).
            return prev;
          });
        })
        .subscribe();
    }
    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addLeg() {
    setLegs((prev) => [...prev, { ...EMPTY_LEG }]);
  }
  function removeLeg(i: number) {
    setLegs((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateLeg(i: number, field: keyof LegForm, value: string) {
    setLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  const oddCombinada = legs.reduce((acc, l) => {
    const v = parseFloat(l.odd);
    return isNaN(v) || v <= 0 ? acc : acc * v;
  }, 1);

  function resetForm() {
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
    setBilheteTitulo("");
    setLegs([{ ...EMPTY_LEG }, { ...EMPTY_LEG }]);
    setCasaNome(defaultCasa.nome);
    setCasaLink(defaultCasa.link);
    setSugestaoTipo("nenhuma");
    setSugestaoValor("");
  }

  async function reloadSignals() {
    const { data } = await supabase
      .from("signals")
      .select("*, signal_legs(*)")
      .order("created_at", { ascending: false });
    setSignals((data as SignalRow[]) || []);
  }

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setPublishing(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const sugestaoValorNum = parseFloat(sugestaoValor.replace(",", "."));
    const sugestaoCampos =
      sugestaoTipo !== "nenhuma" && !isNaN(sugestaoValorNum) && sugestaoValorNum > 0
        ? { sugestao_tipo: sugestaoTipo, sugestao_valor: sugestaoValorNum }
        : { sugestao_tipo: null, sugestao_valor: null };

    if (tipo === "simples") {
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
        tipo: "simples",
        casa_nome: casaNome || null,
        casa_link: casaLink || null,
        ...sugestaoCampos,
        published_by: user?.id,
      });
      setPublishing(false);
      if (!error) {
        resetForm();
        reloadSignals();
      }
      return;
    }

    // Bilhete: valida que tem pelo menos 2 jogos com odd válida.
    const legsValidas = legs.filter(
      (l) => l.competicao && l.time_a && l.time_b && l.mercado && parseFloat(l.odd) > 0
    );
    if (legsValidas.length < 2) {
      setPublishing(false);
      alert("Um bilhete precisa de pelo menos 2 jogos preenchidos, com odd.");
      return;
    }

    const { data: novoSinal, error: signalError } = await supabase
      .from("signals")
      .insert({
        competicao: bilheteTitulo || "Bilhete",
        time_a: "Bilhete",
        time_b: `${legsValidas.length} jogos`,
        mercado: "Múltiplos mercados",
        odd: Number(oddCombinada.toFixed(2)),
        estrategia: form.estrategia,
        rationale: form.rationale || null,
        live: form.live,
        tipo: "bilhete",
        casa_nome: casaNome || null,
        casa_link: casaLink || null,
        ...sugestaoCampos,
        published_by: user?.id,
      })
      .select()
      .single();

    if (signalError || !novoSinal) {
      setPublishing(false);
      alert("Erro ao publicar o bilhete. Tente novamente.");
      return;
    }

    const { error: legsError } = await supabase.from("signal_legs").insert(
      legsValidas.map((l, i) => ({
        signal_id: novoSinal.id,
        competicao: l.competicao,
        time_a: l.time_a,
        time_b: l.time_b,
        mercado: l.mercado,
        odd: parseFloat(l.odd),
        ordem: i,
      }))
    );

    setPublishing(false);
    if (!legsError) {
      resetForm();
      reloadSignals();
    } else {
      alert("O bilhete foi criado, mas houve erro ao salvar os jogos. Confira e recrie se necessário.");
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
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold">Publicar novo sinal</div>
          <div className="inline-flex bg-surface border border-border rounded-[10px] p-1">
            <button
              type="button"
              onClick={() => setTipo("simples")}
              className={`px-3.5 py-1.5 rounded-[7px] text-[12px] font-semibold transition-colors ${
                tipo === "simples" ? "bg-primary text-white" : "text-text2 hover:text-text"
              }`}
            >
              Simples
            </button>
            <button
              type="button"
              onClick={() => setTipo("bilhete")}
              className={`px-3.5 py-1.5 rounded-[7px] text-[12px] font-semibold transition-colors ${
                tipo === "bilhete" ? "bg-primary text-white" : "text-text2 hover:text-text"
              }`}
            >
              Bilhete (vários jogos)
            </button>
          </div>
        </div>

        <div className="border border-border rounded-lg p-3.5 flex flex-col gap-3">
          <div className="text-[10px] font-bold text-muted tracking-wide">
            DIRECIONAMENTO E SUGESTÃO DE ENTRADA
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="input-field text-sm"
              placeholder="Nome da casa (ex: Bet365)"
              value={casaNome}
              onChange={(e) => setCasaNome(e.target.value)}
            />
            <input
              className="input-field text-sm"
              placeholder="Link de direcionamento (opcional)"
              value={casaLink}
              onChange={(e) => setCasaLink(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              className="input-field text-sm"
              value={sugestaoTipo}
              onChange={(e) => setSugestaoTipo(e.target.value as SugestaoTipo | "nenhuma")}
            >
              <option value="nenhuma">Sem sugestão de valor</option>
              {(Object.keys(SUGESTAO_LABELS) as SugestaoTipo[]).map((t) => (
                <option key={t} value={t}>
                  {SUGESTAO_LABELS[t]}
                </option>
              ))}
            </select>
            <input
              className="input-field text-sm"
              type="number"
              step="0.01"
              min="0"
              placeholder={
                sugestaoTipo === "percentual"
                  ? "Ex: 2 (= 2% da banca)"
                  : sugestaoTipo === "unidades"
                  ? "Ex: 1.5 unidades"
                  : sugestaoTipo === "valor"
                  ? "Ex: 50 (R$ 50,00)"
                  : "Escolha um tipo ao lado"
              }
              value={sugestaoValor}
              onChange={(e) => setSugestaoValor(e.target.value)}
              disabled={sugestaoTipo === "nenhuma"}
            />
          </div>
          <p className="text-[11px] text-muted">
            O nome/link vêm pré-preenchidos da casa base (Configurações) — troque só se
            este jogo específico for pra outro lugar. A sugestão aparece pro usuário na
            página Eventos, junto do botão de marcar operação.
          </p>
        </div>

        {tipo === "simples" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="input-field"
                placeholder="Título do bilhete (ex: Bilhete Rodada 24)"
                value={bilheteTitulo}
                onChange={(e) => setBilheteTitulo(e.target.value)}
              />
              <div className="flex items-center gap-2 text-xs text-text2">
                <input
                  type="checkbox"
                  checked={form.live}
                  onChange={(e) => setForm({ ...form, live: e.target.checked })}
                />
                Algum jogo ao vivo
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {legs.map((leg, i) => (
                <div key={i} className="border border-border rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted tracking-wide">JOGO {i + 1}</span>
                    {legs.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeLeg(i)}
                        className="text-[11px] font-semibold text-danger hover:opacity-80"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      className="input-field text-xs py-2"
                      placeholder="Competição"
                      value={leg.competicao}
                      onChange={(e) => updateLeg(i, "competicao", e.target.value)}
                    />
                    <input
                      className="input-field text-xs py-2"
                      placeholder="Mercado"
                      value={leg.mercado}
                      onChange={(e) => updateLeg(i, "mercado", e.target.value)}
                    />
                    <input
                      className="input-field text-xs py-2"
                      placeholder="Time A"
                      value={leg.time_a}
                      onChange={(e) => updateLeg(i, "time_a", e.target.value)}
                    />
                    <input
                      className="input-field text-xs py-2"
                      placeholder="Time B"
                      value={leg.time_b}
                      onChange={(e) => updateLeg(i, "time_b", e.target.value)}
                    />
                    <input
                      className="input-field text-xs py-2 col-span-2"
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="Odd deste jogo"
                      value={leg.odd}
                      onChange={(e) => updateLeg(i, "odd", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addLeg}
              className="btn-outline text-xs px-4 py-2 self-start"
            >
              + Adicionar jogo
            </button>

            <div className="flex items-center justify-between bg-elevated rounded-lg px-4 py-3">
              <span className="text-xs font-semibold text-text2">ODD COMBINADA DO BILHETE</span>
              <span className="font-mono text-lg font-semibold">{oddCombinada.toFixed(2)}</span>
            </div>

            <select
              className="input-field"
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
              className="input-field min-h-20 resize-none"
              placeholder="Rationale (opcional) — a análise por trás do bilhete"
              value={form.rationale}
              onChange={(e) => setForm({ ...form, rationale: e.target.value })}
            />
          </div>
        )}

        <button type="submit" className="btn-primary py-2.5 text-sm self-start px-6" disabled={publishing}>
          {publishing ? "Publicando…" : tipo === "bilhete" ? "Publicar bilhete" : "Publicar sinal"}
        </button>
      </form>

      <div>
        <div className="text-sm font-bold text-text2 mb-3">SINAIS PUBLICADOS ({signals.length})</div>
        {loading ? (
          <div className="card p-7 text-center text-sm text-text2">Carregando…</div>
        ) : (
          <div className="flex flex-col gap-3">
            {signals.map((s) => {
              const expanded = expandedId === s.id;
              return (
                <div key={s.id} className="card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {s.tipo === "bilhete" && (
                          <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            BILHETE
                          </span>
                        )}
                        <div className="text-[10px] text-muted font-semibold">{s.competicao}</div>
                      </div>
                      <div className="text-sm font-semibold truncate">
                        {s.tipo === "bilhete"
                          ? `${s.signal_legs?.length || 0} jogos combinados · ODD ${s.odd}`
                          : `${s.time_a} x ${s.time_b} · ${s.mercado} · ODD ${s.odd}`}
                      </div>
                      {s.tipo === "bilhete" && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : s.id)}
                          className="text-[11px] font-semibold text-text2 hover:text-text mt-1"
                        >
                          {expanded ? "Ocultar jogos" : "Ver jogos"}
                        </button>
                      )}
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

                  {expanded && s.tipo === "bilhete" && (
                    <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                      {(s.signal_legs || [])
                        .slice()
                        .sort((a, b) => a.ordem - b.ordem)
                        .map((leg) => (
                          <div key={leg.id} className="flex items-center justify-between text-xs">
                            <span className="text-text2">
                              <span className="text-muted">{leg.competicao} · </span>
                              {leg.time_a} x {leg.time_b}{" "}
                              <span className="text-muted">— {leg.mercado}</span>
                            </span>
                            <span className="font-mono font-semibold">{leg.odd}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
            {signals.length === 0 && (
              <div className="card p-7 text-center text-sm text-text2">Nenhum sinal publicado ainda.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
