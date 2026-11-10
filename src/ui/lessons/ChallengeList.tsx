"use client";

import Link from "next/link";
import type { GameId } from "@/core/game";
import { TIER_NAMES, type Challenge } from "@/core/lessons/challenges";
import { useProgress } from "@/core/progress/useProgress";
import { getGame } from "@/games/registry";
import { styleTable } from "@/views/appearance";
import { Stars } from "../kit";
import { useAppTheme } from "../ThemeButton";

/** A tiny plan of the layout, so each challenge is recognisable at a glance. */
function Preview({ gameId, challenge }: { gameId: GameId; challenge: Challenge }) {
  const { game, theme: base } = getGame(gameId);
  const { theme: themeId, colourTable } = useAppTheme();
  const theme = styleTable(base, themeId, colourTable);
  const table = game.createTable();
  const spots = game.spots?.(table) ?? {};
  const striker = game.input.strikerId;
  return (
    <svg viewBox={`0 0 ${table.length} ${table.width}`} className="h-14 w-auto shrink-0 rounded" style={{ background: theme.surface.cloth, aspectRatio: `${table.length} / ${table.width}` }} aria-hidden>
      {challenge.layout.map((b) => {
        const p = "spot" in b ? spots[b.spot] : b;
        const target = challenge.targets.includes(b.id);
        const r = Math.min(table.width, table.length) * 0.03;
        return <circle key={b.id} cx={p.y} cy={p.x} r={target || b.id === striker ? r * 1.35 : r} fill={b.id === striker ? "#f0e9d8" : target ? "#d4a94e" : "rgba(0,0,0,0.45)"} />;
      })}
    </svg>
  );
}

export function ChallengeList({ gameId }: { gameId: GameId }) {
  const { challenges } = getGame(gameId);
  const { byLesson } = useProgress(gameId);
  const earned = challenges.reduce((n, c) => n + (byLesson.get(c.id)?.bestStars ?? 0), 0);

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm tabular-nums text-muted">
        <span className="display text-2xl font-semibold text-ivory">{earned}</span> / {challenges.length * 3} stars
      </p>
      {([1, 2, 3] as const).map((tier) => (
        <section key={tier} aria-label={TIER_NAMES[tier]}>
          <h2 className="display text-xl font-semibold">{TIER_NAMES[tier]}</h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {challenges
              .filter((c) => c.tier === tier)
              .map((c) => {
                const best = byLesson.get(c.id);
                return (
                  <li key={c.id}>
                    <Link href={`/${gameId}/challenges/${c.id}`} className="flex items-center gap-3 rounded-lg border border-line p-2.5 transition-colors hover:border-brass/50">
                      <Preview gameId={gameId} challenge={c} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{c.title}</span>
                        <span className="block text-xs text-muted">
                          {c.targets.length} target{c.targets.length === 1 ? "" : "s"} · {c.shots} shots
                        </span>
                      </span>
                      <Stars n={best?.bestStars ?? 0} />
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
