import type { Scoreboard as ScoreboardData } from "@/core/rules";

/** How many potted balls each player's tray shows, most recent last. */
const TRAY = 16;

interface Props {
  board: ScoreboardData;
  /** Balls each player has potted, in order. */
  trays?: string[][];
  ballColour?: (id: string) => string;
}

/** A brass-topped scoring plaque: scores, the live break, what is on, what is left, and each player's potted balls. */
export function Scoreboard({ board, trays, ballColour }: Props) {
  return (
    <section aria-label="Scoreboard" className="panel overflow-hidden border-t-2 !border-t-brass">
      <div className="flex items-stretch">
        {board.players.map((p, i) => {
          const active = !board.over && i === board.current;
          return (
            <div key={p.label} aria-current={active ? "true" : undefined} className={`flex min-w-0 flex-1 flex-col justify-center px-3 py-1.5 sm:flex-none sm:min-w-36 ${active ? "bg-brass/15" : ""} ${i > 0 ? "border-l border-line" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`truncate text-xs ${active ? "text-ivory" : "text-muted"}`}>{p.label}</span>
                <span key={p.score} className="display pip-pop text-2xl font-semibold tabular-nums leading-none">{p.score}</span>
              </div>
              {trays && ballColour && (
                <ul className="mt-1 flex h-3 items-center gap-0.5 overflow-hidden" aria-label={`Balls potted by ${p.label}`}>
                  {(trays[i] ?? []).slice(-TRAY).map((id, k) => (
                    <li key={`${id}-${k}`} title={id} className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/40" style={{ background: ballColour(id) }} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {board.breakPoints > 0 && !board.over && (
          <div className="flex flex-col items-center justify-center border-l border-line bg-brass/10 px-4">
            <span className="eyebrow !text-[0.5625rem]">Break</span>
            <span key={board.breakPoints} className="display fx-star text-3xl font-semibold tabular-nums leading-none text-brass">
              {board.breakPoints}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-4 border-l border-line px-3 py-1.5 text-xs">
          {board.over ? (
            <p className="font-semibold text-brass">{board.result ?? "Frame over"}</p>
          ) : (
            <div className="text-right">
              <p>
                <span className="text-muted">On </span>
                <span className="font-semibold">{board.on}</span>
              </p>
              {board.remaining !== undefined && (
                <p className="tabular-nums text-muted">
                  <span className="font-semibold text-ivory">{board.remaining}</span> left
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      {board.warning && <p className="border-t border-bad/40 bg-bad/10 px-3 py-1 text-center text-xs font-semibold text-bad">{board.warning}</p>}
    </section>
  );
}
