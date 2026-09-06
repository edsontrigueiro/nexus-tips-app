"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANOS } from "@/lib/types";
import { Logo } from "@/components/Logo";

const DEMO_SIGNALS = [
  {
    comp: "PREMIER LEAGUE · HOJE, 16:00",
    timeA: "Arsenal",
    timeB: "Chelsea",
    mercado: "Mais de 1.5 gols",
    odd: "1.72",
    estrategia: "Momentum ofensivo",
    rationale:
      "Arsenal chega de três jogos seguidos em casa marcando ao menos 2 gols, e o Chelsea sofreu gols em 6 dos últimos 7 confrontos fora. O padrão ofensivo recente dos dois lados sustenta a expectativa de um jogo aberto.",
  },
  {
    comp: "LA LIGA · HOJE, 18:30",
    timeA: "Barcelona",
    timeB: "Atlético",
    mercado: "Ambas marcam",
    odd: "1.85",
    estrategia: "Consistência defensiva instável",
    rationale:
      "O Atlético não mantém o gol invicto há 5 rodadas visitando times do G6, enquanto o Barcelona não deixa de balançar a rede há 11 jogos seguidos como mandante. O histórico recente favorece um confronto com gols dos dois lados.",
  },
  {
    comp: "BRASILEIRÃO · AMANHÃ, 20:00",
    timeA: "Corinthians",
    timeB: "São Paulo",
    mercado: "Dupla chance 1X",
    odd: "1.95",
    estrategia: "Vantagem de mando",
    rationale:
      "O Corinthians não perde como mandante neste clássico há 4 edições, e o São Paulo tem historicamente um retrospecto mais equilibrado fora de casa nesse confronto direto. O contexto de mando pesa a favor de um resultado sem derrota para o time da casa.",
  },
];

const PILARES = [
  { titulo: "TECNOLOGIA", texto: "Dados e automação como base da experiência." },
  { titulo: "PRECISÃO", texto: "Informação organizada para decisões mais claras." },
  { titulo: "CONTROLE", texto: "Visão objetiva da operação e da performance." },
  { titulo: "CONFIANÇA", texto: "Comunicação séria, transparente e consistente." },
];

const ETAPAS = [
  "Análise disponível",
  "Oportunidade identificada",
  "Mercado monitorado",
  "Resultado confirmado",
  "Dados atualizados",
  "Performance em 30 dias",
];

const Check = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    className="flex-none mt-0.5 text-success"
  >
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function LandingPage() {
  const [demoStage, setDemoStage] = useState<"idle" | "loading" | "result">("idle");
  const [demoIndex, setDemoIndex] = useState(0);
  const demo = DEMO_SIGNALS[demoIndex];

  function startDemo() {
    setDemoStage("loading");
    setTimeout(() => setDemoStage("result"), 1400);
  }

  function nextDemo() {
    setDemoStage("loading");
    setDemoIndex((i) => (i + 1) % DEMO_SIGNALS.length);
    setTimeout(() => setDemoStage("result"), 1400);
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* NAV */}
      <div className="flex items-center justify-between px-8 md:px-16 py-5 border-b border-border sticky top-0 z-20 bg-bg/90 backdrop-blur">
        <Logo size={30} />
        <div className="flex items-center gap-3.5">
          <Link href="/login" className="text-text2 hover:text-text text-sm font-semibold px-4 py-2.5">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn-primary text-sm px-5 py-2.5">
            Criar conta
          </Link>
        </div>
      </div>

      {/* HERO */}
      <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16 px-8 md:px-16 py-16 md:py-20">
        <div className="flex-1 flex flex-col gap-5">
          <div className="inline-flex items-center gap-2 bg-surface border border-border rounded-md px-3 py-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[11px] font-bold tracking-widest text-info">
              INTELIGÊNCIA ESPORTIVA
            </span>
          </div>
          <h1 className="text-4xl md:text-[50px] font-bold leading-[1.1] tracking-tight">
            Inteligência esportiva. <span className="text-primary">Sem promessas vazias.</span>
          </h1>
          <p className="text-text2 text-base md:text-[17px] leading-relaxed max-w-lg">
            A Nexus Tips monitora eventos, organiza contexto e mostra o porquê de cada sinal —
            você decide com clareza, gerencia sua própria banca e acompanha sua performance em
            tempo real, com o histórico completo sempre visível.
          </p>
          <div className="flex flex-wrap gap-3.5 items-center mt-1.5">
            <Link href="/cadastro" className="btn-primary text-[15px] px-6 py-3.5">
              Criar conta grátis
            </Link>
            <a href="#planos" className="btn-outline text-[15px] px-6 py-3.5 inline-flex items-center">
              Ver planos
            </a>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Check />
            <span className="text-[12.5px] text-text2">
              Sem gestão do seu dinheiro pela Nexus Tips — a banca é 100% sua, sempre.
            </span>
          </div>
        </div>

        <div className="flex-1 flex justify-center relative w-full">
          <div className="absolute top-5 w-72 h-72 bg-primary opacity-[0.16] blur-[60px] rounded-full pointer-events-none" />
          <div className="relative card p-7 w-full max-w-[360px] shadow-2xl">
            <div className="text-[11px] font-bold tracking-wide text-info">{demo.comp}</div>
            <div className="mt-4 text-xl font-bold">{demo.timeA}</div>
            <div className="text-muted text-sm my-0.5">x</div>
            <div className="text-xl font-bold">{demo.timeB}</div>
            <div className="h-px bg-border my-5" />
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[11px] text-muted uppercase tracking-wide">Mercado</div>
                <div className="text-[15px] font-semibold mt-1.5">{demo.mercado}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted uppercase tracking-wide">Odd</div>
                <div className="font-mono text-2xl font-semibold mt-0.5">{demo.odd}</div>
              </div>
            </div>

            {demoStage === "idle" && (
              <button onClick={startDemo} className="btn-primary w-full text-sm py-3.5 mt-5">
                Visualizar análise
              </button>
            )}

            {demoStage === "loading" && (
              <div className="mt-5 flex items-center justify-center gap-2.5 bg-elevated rounded-lg py-3.5 animate-pulse">
                <div className="w-[18px] h-[18px] rounded-full border-[2.5px] border-primary/25 border-t-primary animate-spin" />
                <span className="text-[13px] font-semibold text-text2">
                  Analisando padrões do confronto…
                </span>
              </div>
            )}

            {demoStage === "result" && (
              <>
                <div className="mt-4.5 bg-primary/[0.08] border border-primary/30 rounded-[10px] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold tracking-wide text-primary">
                      POR QUE ESSE SINAL FOI APROVADO
                    </span>
                    <span className="text-[9.5px] font-bold text-muted bg-elevated px-2 py-1 rounded">
                      {demo.estrategia}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-text2 leading-relaxed mt-2.5">{demo.rationale}</p>
                </div>
                <button onClick={nextDemo} className="btn-outline w-full text-[13px] py-3 mt-3">
                  Ver outro exemplo
                </button>
                <div className="text-[10.5px] text-muted text-center mt-2.5">
                  Exemplo ilustrativo do produto — não é recomendação de aposta.
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* PILARES */}
      <div className="px-8 md:px-16 py-10">
        <h2 className="text-[23px] font-bold mb-1.5">Essência da marca</h2>
        <p className="text-text2 text-sm mb-7">
          Tecnologia, precisão, controle e confiança guiam cada decisão de produto.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4.5">
          {PILARES.map((p) => (
            <div key={p.titulo} className="card p-5.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="font-bold text-[13px] tracking-wide">{p.titulo}</span>
              </div>
              <p className="text-text2 text-[13px] leading-relaxed mt-2.5">{p.texto}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PERFORMANCE */}
      <div className="px-8 md:px-16 py-10">
        <h2 className="text-[23px] font-bold mb-1.5">Performance, sem caixa-preta</h2>
        <p className="text-text2 text-sm mb-6">
          Números calculados sobre os sinais publicados e encerrados na plataforma nos
          últimos 30 dias — sem projeção, sem promessa.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
          <div className="card p-6">
            <div className="text-xs font-semibold text-text2">ASSERTIVIDADE · 30 DIAS</div>
            <div className="text-[11px] text-muted mt-1">
              % de sinais encerrados como green.
            </div>
            <div className="font-mono text-3xl font-semibold text-success mt-3">94.8%</div>
          </div>
          <div className="card p-6">
            <div className="text-xs font-semibold text-text2">SINAIS PUBLICADOS · 30 DIAS</div>
            <div className="text-[11px] text-muted mt-1">
              Volume de análises entregues no período.
            </div>
            <div className="font-mono text-3xl font-semibold mt-3">142</div>
          </div>
          <div className="card p-6">
            <div className="text-xs font-semibold text-text2">GREENS / REDS · 30 DIAS</div>
            <div className="text-[11px] text-muted mt-1">
              Resultado bruto de tudo que foi encerrado.
            </div>
            <div className="font-mono text-3xl font-semibold mt-3">
              <span className="text-success">121</span>
              <span className="text-muted text-lg"> / </span>
              <span className="text-danger">21</span>
            </div>
          </div>
        </div>
      </div>

      {/* ETAPAS */}
      <div className="px-8 md:px-16 py-10">
        <h2 className="text-[23px] font-bold mb-1.5">
          O que você acompanha, do primeiro clique em diante
        </h2>
        <p className="text-text2 text-sm mb-6">
          Cada etapa do sinal fica visível — sem caixa-preta.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
          {ETAPAS.map((e) => (
            <div key={e} className="card px-4.5 py-4 text-[13.5px] font-semibold">
              {e}
            </div>
          ))}
        </div>
        <div className="mt-7 border-l-2 border-primary pl-4.5">
          <p className="text-lg font-semibold leading-relaxed">
            &quot;A Nexus Tips entrega inteligência para decisão. Não vende certeza.&quot;
          </p>
        </div>
      </div>

      {/* PRICING */}
      <div id="planos" className="px-8 md:px-16 py-10 pb-20">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1.5">
          <div>
            <h2 className="text-[23px] font-bold mb-1.5">Planos de assinatura</h2>
            <p className="text-text2 text-sm">
              Assine, acompanhe os eventos monitorados e gerencie sua própria banca — sem
              fidelidade, cancele quando quiser.
            </p>
          </div>
          <div className="inline-flex items-center gap-2.5 bg-warning/10 border border-warning rounded-lg px-4 py-2.5">
            <span className="w-[7px] h-[7px] rounded-full bg-warning animate-pulse" />
            <span className="text-[12.5px] font-bold text-warning">
              OFERTA DE LANÇAMENTO — 48H para travar o mensal por R$ {PLANOS.mensal.valor.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 mt-6">
          {/* MENSAL */}
          <div className="card p-7 flex flex-col">
            <div className="text-xs font-bold tracking-wide text-text2">MENSAL</div>
            <div className="flex items-baseline gap-2 mt-3">
              <div className="font-mono text-3xl font-semibold">
                R$ {PLANOS.mensal.valor.toFixed(2)}
                <span className="text-[13px] text-muted font-sans">/mês</span>
              </div>
            </div>
            <div className="text-xs text-muted mt-1">
              de <span className="line-through">R$ {PLANOS.mensal.valorPadrao.toFixed(2)}</span> —
              válido para quem assinar nas primeiras 48h de lançamento
            </div>
            <div className="h-px bg-border my-5" />
            <div className="flex flex-col gap-2.5 flex-1">
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Eventos ao vivo liberados
              </div>
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Gestão automática da banca
              </div>
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Histórico e performance completos
              </div>
            </div>
            <Link href="/cadastro" className="btn-outline w-full text-sm py-3.5 mt-5 text-center">
              Garantir por R$ {PLANOS.mensal.valor.toFixed(2)}
            </Link>
          </div>

          {/* ANUAL destaque */}
          <div className="card p-7 flex flex-col relative border-primary shadow-[0_12px_40px_rgba(37,99,235,0.18)]">
            <div className="absolute -top-3 left-7 bg-primary text-white text-[10.5px] font-bold px-3 py-1.5 rounded-md">
              MELHOR CUSTO-BENEFÍCIO
            </div>
            <div className="text-xs font-bold tracking-wide text-text2">ANUAL</div>
            <div className="flex items-baseline gap-2 mt-3">
              <div className="font-mono text-3xl font-semibold">
                R$ {PLANOS.anual.valor.toFixed(2)}
                <span className="text-[13px] text-muted font-sans">/ano</span>
              </div>
            </div>
            <div className="text-xs text-muted mt-1">equivalente a R$ 58,16/mês</div>
            <div className="inline-flex w-fit mt-2.5 bg-success/10 border border-success rounded px-2.5 py-1 text-[11.5px] font-bold text-success">
              Economize R$ 476,90 vs. mensal
            </div>
            <div className="h-px bg-border my-5" />
            <div className="flex flex-col gap-2.5 flex-1">
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Tudo do plano mensal
              </div>
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Preço travado por 12 meses
              </div>
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Maior economia entre os planos
              </div>
            </div>
            <Link href="/cadastro" className="btn-primary w-full text-sm py-3.5 mt-5 text-center">
              Assinar plano anual
            </Link>
          </div>

          {/* SEMESTRAL */}
          <div className="card p-7 flex flex-col">
            <div className="text-xs font-bold tracking-wide text-text2">SEMESTRAL</div>
            <div className="flex items-baseline gap-2 mt-3">
              <div className="font-mono text-3xl font-semibold">
                R$ {PLANOS.semestral.valor.toFixed(2)}
                <span className="text-[13px] text-muted font-sans">/6 meses</span>
              </div>
            </div>
            <div className="text-xs text-muted mt-1">equivalente a R$ 66,32/mês</div>
            <div className="inline-flex w-fit mt-2.5 bg-success/10 border border-success rounded px-2.5 py-1 text-[11.5px] font-bold text-success">
              Economize R$ 189,50 vs. mensal
            </div>
            <div className="h-px bg-border my-5" />
            <div className="flex flex-col gap-2.5 flex-1">
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Tudo do plano mensal
              </div>
              <div className="text-sm text-text2 flex gap-2">
                <Check />
                Preço travado por 6 meses
              </div>
            </div>
            <Link href="/cadastro" className="btn-outline w-full text-sm py-3.5 mt-5 text-center">
              Assinar plano semestral
            </Link>
          </div>
        </div>
        <div className="text-[11.5px] text-muted mt-4">
          Após as primeiras 48h de lançamento, o plano mensal passa a custar R${" "}
          {PLANOS.mensal.valorPadrao.toFixed(2)}/mês — os valores acima do semestral e anual
          usam esse preço cheio como referência de comparação.
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t border-border px-8 md:px-16 py-7">
        <div className="text-muted text-sm">Nexus Tips — Inteligência esportiva.</div>
      </div>
    </div>
  );
}
