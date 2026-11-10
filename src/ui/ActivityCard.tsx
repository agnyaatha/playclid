"use client";

import type { CSSProperties } from "react";
import { addShot, badges, currentStreak, DAILY_GOAL, dayKey, EMPTY_ACTIVITY, isActivity, type Activity } from "@/core/progress/activity";
import { prefsStore } from "@/core/prefs/store";
import { usePref } from "@/core/prefs/usePref";

/** Add one played shot to the lifetime totals. */
export function logShot(pots: number, breakPoints: number) {
  const stored = prefsStore.get<unknown>("activity", EMPTY_ACTIVITY);
  prefsStore.set("activity", addShot(isActivity(stored) ? stored : EMPTY_ACTIVITY, dayKey(new Date()), pots, breakPoints));
}

/** Today's goal and streak, and on the stats page the badges as well. */
export function ActivityCard({ showBadges = false }: { showBadges?: boolean }) {
  const [a] = usePref<Activity>("activity", EMPTY_ACTIVITY, isActivity);
  const today = dayKey(new Date());
  const played = a.days[today] ?? 0;
  const streak = currentStreak(a, today);
  const pct = Math.min(100, (played / DAILY_GOAL) * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="panel p-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">Today&apos;s goal</span>
          <span className="tabular-nums text-muted">
            {played} / {DAILY_GOAL} shots
          </span>
        </div>
        <div className="relative mt-3 h-1.5 rounded-full bg-raised" role="progressbar" aria-label="Today's goal" aria-valuemin={0} aria-valuemax={DAILY_GOAL} aria-valuenow={Math.min(played, DAILY_GOAL)}>
          <div className="progress-fill h-full rounded-full bg-brass" style={{ width: `${pct}%` }} />
          <span aria-hidden className="progress-ball" style={{ left: `${pct}%`, "--roll": `${pct * 12}deg` } as CSSProperties} />
        </div>
        <p className="mt-2 text-xs text-muted">{streak > 0 ? `${streak}-day streak` : "Play today to start a streak"}{a.bestStreak > streak ? ` · best ${a.bestStreak}` : ""}</p>
      </div>
      {showBadges && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Badges">
          {badges(a).map((b) => (
            <li key={b.name} className={`rounded-lg border p-3 ${b.earned ? "border-brass/60 bg-brass/10" : "border-line opacity-60"}`}>
              <p className="text-sm font-semibold">{b.name}</p>
              <p className="text-xs text-muted">{b.earned ? "Earned" : b.hint}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
