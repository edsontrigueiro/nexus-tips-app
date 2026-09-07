"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TIMES = [
  "Flamengo", "Palmeiras", "Corinthians", "São Paulo", "Grêmio", "Internacional",
  "Atlético-MG", "Vasco", "Fluminense", "Botafogo", "Cruzeiro", "Santos", "Bahia",
  "Sport", "Fortaleza", "Ceará", "Athletico-PR", "Coritiba", "Bragantino", "Goiás",
  "Vitória", "Criciúma", "Cuiabá", "Juventude", "Real Madrid", "Barcelona",
  "Manchester City", "Liverpool", "Manchester United", "Chelsea", "PSG",
  "Bayern de Munique", "Juventus",
];

type StepKind = "generic" | "team" | "banca";

interface Step {
  kind: StepKind;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    kind: "generic",
    title: "Bem-vindo à Nexus Tips",
    desc: "Inteligência esportiva com dados organizados para decisões mais claras. Vamos te mostrar rapidamente onde encontrar cada coisa.",
  },
  {
    kind: "team",
    title: "Qual é o seu time do coração?",
    desc: "A gente destaca os jogos e as tips do seu time direto na Visão geral.",
  },
  {
    kind: "banca",
    title: "Qual sua banca inicial?",
    desc: "Isso ajuda a Gestão a calcular sua performance desde o primeiro dia.",
  },
  {
    kind: "generic",
    title: "Histórico",
    desc: "Acompanhe todas as tips já analisadas e seus resultados confirmados, com dados sempre atualizados.",
  },
  {
    kind: "generic",
    title: "Eventos",
    desc: "Veja os eventos monitorados pela plataforma. Essa aba fica travada até você ativar uma assinatura.",
  },
  {
    kind: "generic",
    title: "Planos de assinatura",
    desc: "Ative um plano para liberar os Eventos completos e a aba de Gestão da sua banca.",
  },
];

const ChartIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
    <path d="M4 19V10M10 19V5M16 19V13M22 19V8" strokeLinecap="round" />
  </svg>
);

export function OnboardingTutorial() {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState(0);
  const [teamQuery, setTeamQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [banca, setBanca] = useState("500");

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setReady(true);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("tutorial_completo, time_coracao, banca_inicial")
        .eq("id", user.id)
        .single();
      if (data && !data.tutorial_completo) {
        setShow(true);
        if (data.time_coracao) setSelectedTeam(data.time_coracao);
        if (data.banca_inicial) setBanca(String(data.banca_inicial));
      }
      setReady(true);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready || !show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const filteredTeams = teamQuery
    ? TIMES.filter((t) => t.toLowerCase().includes(teamQuery.toLowerCase()))
    : TIMES;
  const hasExactMatch = TIMES.some((t) => t.toLowerCase() === teamQuery.toLowerCase());
  const showCustomOption = teamQuery.trim().length > 0 && !hasExactMatch;

  function skip() {
    setStep(STEPS.length - 1);
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function finish() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const bancaNum = parseFloat(banca.replace(",", "."));
      await supabase
        .from("profiles")
        .update({
          tutorial_completo: true,
          ...(selectedTeam ? { time_coracao: selectedTeam } : {}),
          banca_inicial: isNaN(bancaNum) ? null : bancaNum,
        })
        .eq("id", user.id);
    }
    setSaving(false);
    setShow(false);
    router.refresh();
  }

  function next() {
    if (isLast) {
      finish();
    } else {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-bg flex flex-col">
      <div className="flex justify-end px-8 pt-6">
        <button onClick={skip} className="text-xs font-semibold text-text2 hover:text-text">
          Pular tutorial
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-md flex flex-col items-center text-center gap-5">
          <div className="text-[11px] font-bold tracking-wide text-primary">
            PASSO {step + 1} DE {STEPS.length}
          </div>

          {current.kind === "generic" && (
            <div className="w-[88px] h-[88px] rounded-2xl bg-surface border border-border flex items-center justify-center">
              <ChartIcon />
            </div>
          )}

          <h1 className="text-2xl font-bold">{current.title}</h1>
          <p className="text-text2 text-sm leading-relaxed">{current.desc}</p>

          {current.kind === "team" && (
            <div className="w-full flex flex-col gap-4 text-left">
              <div className="relative">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                </svg>
                <input
                  className="input-field pl-9 text-sm"
                  placeholder="Buscar um time…"
                  value={teamQuery}
                  onChange={(e) => setTeamQuery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {filteredTeams.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTeam(t)}
                    className={`text-xs font-semibold px-3 py-2.5 rounded-lg border text-left transition-colors ${
                      selectedTeam === t
                        ? "bg-primary text-white border-primary"
                        : "bg-surface border-border text-text2 hover:text-text"
                    }`}
                  >
                    {t}
                  </button>
                ))}
                {showCustomOption && (
                  <button
                    onClick={() => setSelectedTeam(teamQuery.trim())}
                    className="text-xs font-semibold px-3 py-2.5 rounded-lg border border-dashed border-border text-text2 hover:text-text text-left col-span-2"
                  >
                    Usar &quot;{teamQuery.trim()}&quot;
                  </button>
                )}
              </div>
              {selectedTeam && (
                <p className="text-xs text-text2">
                  Combinado — vamos destacar jogos e tips do{" "}
                  <strong className="text-text">{selectedTeam}</strong> pra você.
                </p>
              )}
            </div>
          )}

          {current.kind === "banca" && (
            <div className="w-full flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-text2">Banca inicial</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted font-mono">
                  R$
                </span>
                <input
                  className="input-field pl-10 text-sm font-mono"
                  value={banca}
                  onChange={(e) => setBanca(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </div>
              <p className="text-[11px] text-muted">
                Você pode ajustar isso a qualquer momento na aba Gestão.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-8 pb-8">
        <button
          onClick={back}
          className={`text-sm font-semibold text-text2 hover:text-text ${step === 0 ? "invisible" : ""}`}
        >
          ← Voltar
        </button>
        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
        <button onClick={next} disabled={saving} className="btn-primary text-sm px-5 py-2.5">
          {saving ? "Salvando…" : isLast ? "Ir para o dashboard" : "Próximo"}
        </button>
      </div>
    </div>
  );
}
