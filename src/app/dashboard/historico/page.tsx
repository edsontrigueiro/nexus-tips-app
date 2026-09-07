import { createClient } from "@/lib/supabase/server";
import type { Signal, SignalLeg } from "@/lib/types";

type SignalRow = Signal & { signal_legs: SignalLeg[] };

export default async function HistoricoPage() {
  const supabase = createClient();

  // Histórico é da plataforma inteira (todo sinal já encerrado), não das operações de um
  // usuário — por isso não é travado por assinatura, igual no protótipo.
  const { data: signalsData } = await supabase
    .from("signals")
    .select("*, signal_legs(*)")
    .in("status", ["green", "red"])
    .order("created_at", { ascending: false });

  const signals: SignalRow[] = (signalsData as SignalRow[]) || [];
  const greens = signals.filter((s) => s.status === "green").length;
  const reds = signals.filter((s) => s.status === "red").length;
  const assertividade = signals.length ? Math.round((greens / signals.length) * 100) : null;

  const statusColor: Record<string, string> = {
    green: "bg-success/10 border-success text-success",
    red: "bg-danger/10 border-danger text-danger",
  };

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs font-bold tracking-wide text-primary">HISTÓRICO</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Sinais já encerrados</h1>
        <p className="text-text2 text-sm">
          Todo sinal publicado na plataforma, com o resultado real — sem edição, sem esconder red.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="text-xs font-semibold text-text2">SINAIS ENCERRADOS</div>
          <div className="font-mono text-2xl font-semibold mt-2.5">{signals.length}</div>
        </div>
        <div className="card p-6">
          <div className="text-xs font-semibold text-text2">ASSERTIVIDADE</div>
          <div className="font-mono text-2xl font-semibold mt-2.5">
            {assertividade === null ? "—" : `${assertividade}%`}
          </div>
        </div>
        <div className="card p-6">
          <div className="text-xs font-semibold text-text2">GREENS / REDS</div>
          <div className="font-mono text-2xl font-semibold mt-2.5">
            <span className="text-success">{greens}</span>
            <span className="text-muted text-base"> / </span>
            <span className="text-danger">{reds}</span>
          </div>
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="card p-7 text-center text-sm text-text2">
          Nenhum sinal encerrado ainda. Assim que o time confirmar um resultado, ele aparece aqui.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {signals.map((signal) => {
            const isBilhete = signal.tipo === "bilhete";
            const legs = (signal.signal_legs || []).slice().sort((a, b) => a.ordem - b.ordem);
            return (
              <div key={signal.id} className="card p-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isBilhete && (
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        BILHETE
                      </span>
                    )}
                    <div className="text-[10px] text-muted font-semibold tracking-wide">
                      {signal.competicao} ·{" "}
                      {new Date(signal.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>
                  </div>

                  {isBilhete ? (
                    <>
                      <div className="text-sm font-bold mt-1">{legs.length} jogos combinados</div>
                      <div className="flex flex-col gap-1 mt-2">
                        {legs.map((leg) => (
                          <div key={leg.id} className="text-xs text-text2">
                            <span className="font-semibold text-text">
                              {leg.time_a} x {leg.time_b}
                            </span>{" "}
                            <span className="text-muted">
                              · {leg.mercado} · ODD {leg.odd}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-bold mt-1">
                        {signal.time_a} x {signal.time_b}
                      </div>
                      <div className="text-xs text-text2 mt-1">
                        <span className="font-semibold text-text">{signal.mercado}</span>
                        {signal.estrategia && <span className="text-muted"> · {signal.estrategia}</span>}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex-none flex flex-col items-end gap-1.5">
                  <span
                    className={`text-[10px] font-bold tracking-wide rounded-full px-2.5 py-1 border whitespace-nowrap ${
                      statusColor[signal.status]
                    }`}
                  >
                    {signal.status === "green" ? "GREEN" : "RED"}
                  </span>
                  <span className="font-mono text-lg font-semibold">{signal.odd}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
