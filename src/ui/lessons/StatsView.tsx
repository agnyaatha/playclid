"use client";

import Link from "next/link";
import type { GameId } from "@/core/game";
import { computeStats } from "@/core/lessons/stats";
import { useProgress } from "@/core/progress/useProgress";
import { getGame } from "@/games/registry";
import { Stars } from "../kit";
import { lessonHref } from "./lessonNav";

const pct = (r: number | null) => (r === null ? "–" : `${Math.round(r * 100)}%`);

function Bar({ value }: { value: number }) {
  return (
    <span aria-hidden className="block h-1 w-full overflow-hidden rounded-full bg-raised">
      <span className="block h-full rounded-full bg-brass" style={{ width: `${Math.round(value * 100)}%` }} />
    </span>
  );
}

/** Local-only statistics: how well you pot with the aids on versus on the no-aid test shots. */
export function StatsView({ gameId }: { gameId: GameId }) {
  const { lessons } = getGame(gameId);
  const { entries } = useProgress(gameId);
  const { lessons: rows, overall } = computeStats(entries, lessons);

  if (overall.plays === 0) {
    return (
      <p className="panel p-6 text-muted">
        No drill results yet. Play a table drill from the{" "}
        <Link href={`/${gameId}`} className="text-ivory underline">
          curriculum
        </Link>{" "}
        and your numbers will appear here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3" aria-label="Overall">
        <Stat label="With aids" value={pct(overall.aidedRate)} />
        <Stat label="No aids" value={pct(overall.unaidedRate)} />
        <div className="col-span-2 sm:col-span-1">
          <Stat
            label="Difference"
            value={overall.gap === null ? "–" : `${overall.gap > 0 ? "+" : ""}${overall.gap} pts`}
            note={overall.gap === null ? undefined : overall.gap >= -10 ? "Your potting holds up without the aids." : "You lean on the aids. Try more no-aid practice."}
          />
        </div>
      </section>

      <section aria-label="By lesson">
        <h2 className="display mb-3 text-xl font-semibold">By lesson</h2>
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {rows.map((r) => (
            <li key={r.lessonId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_auto]">
              <Link href={lessonHref(gameId, r.lessonId)} className="truncate font-medium hover:text-brass">
                {r.title}
              </Link>
              <div className="max-sm:order-3 max-sm:col-span-2 sm:contents">
                <div className="flex gap-4 sm:contents">
                  <div className="flex-1 text-xs tabular-nums text-muted">
                    Aids {pct(r.aidedRate)}
                    <Bar value={r.aidedRate} />
                  </div>
                  <div className="flex-1 text-xs tabular-nums text-muted">
                    None {pct(r.unaidedRate)}
                    <Bar value={r.unaidedRate} />
                  </div>
                </div>
              </div>
              <Stars n={r.bestStars} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Whether fading aids helps learning is still debated in the research, so treat this as a guide, not a verdict.</p>
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="h-full bg-panel p-5">
      <div className="text-xs text-muted">{label}</div>
      <div className="display mt-1 text-4xl font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-1 text-xs text-muted">{note}</div>}
    </div>
  );
}
