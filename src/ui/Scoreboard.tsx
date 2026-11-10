import type { Scoreboard as ScoreboardData } from "@/core/rules";

/** A brass-topped scoring plaque: scores, the player at the table, their break and what is on. */
export function Scoreboard({ board }: { board: ScoreboardData }) {
  return (
    <section aria-label="Scoreboard" className="panel flex items-stretch overflow-hidden border-t-2 !border-t-brass">
      {board.players.map((p, i) => {
        const active = !board.over && i === board.current;
        return (
          <div key={p.label} aria-current={active ? "true" : undefined} className={`flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-1.5 sm:flex-none sm:gap-6 ${active ? "bg-brass/15" : ""} ${i > 0 ? "border-l border-line" : ""}`}>
            <span className={`truncate text-xs ${active ? "text-ivory" : "text-muted"}`}>{p.label}</span>
            <span className="display text-2xl font-semibold tabular-nums leading-none">{p.score}</span>
          </div>
        );
      })}
      <div className="ml-auto flex items-center gap-4 border-l border-line px-3 py-1.5 text-xs">
        {board.over ? (
          <p className="font-semibold text-brass">{board.result ?? "Frame over"}</p>
        ) : (
          <>
            <p>
              <span className="text-muted">On </span>
              <span className="font-semibold">{board.on}</span>
            </p>
            {board.breakPoints > 0 && (
              <p>
                <span className="text-muted">Break </span>
                <span className="font-semibold tabular-nums">{board.breakPoints}</span>
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
