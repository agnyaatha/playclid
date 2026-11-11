"use client";

import Link from "next/link";
import { useState } from "react";
import type { GameId } from "@/core/game";
import type { Lesson } from "@/core/lessons/schema";
import { useProgress } from "@/core/progress/useProgress";
import type { LessonProgress } from "@/core/progress/store";
import { getGame } from "@/games/registry";
import { ActivityCard } from "../ActivityCard";
import { Sheet, Stars } from "../kit";
import { groupByModule, lessonHref } from "./lessonNav";

const KIND: Record<Lesson["kind"], string> = { watch: "Learn", drill: "Drill", break: "Break" };

/** The curriculum as a numbered path, with each lesson's best result and the next thing to do. */
export function CurriculumList({ gameId }: { gameId: GameId }) {
  const { lessons, game, challenges } = getGame(gameId);
  const { byLesson, clear, entries } = useProgress(gameId);
  const [confirming, setConfirming] = useState(false);
  const groups = groupByModule(lessons);
  const done = lessons.filter((l) => byLesson.get(l.id)?.completed).length;
  const pct = Math.round((done / lessons.length) * 100);
  const upNext = lessons.find((l) => !byLesson.get(l.id)?.completed) ?? null;
  const ring = 2 * Math.PI * 44;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-14">
      <aside className="lg:sticky lg:top-[calc(var(--header)+2rem)] lg:self-start">
        <p className="eyebrow">Curriculum</p>
        <h1 className="display mt-2 text-5xl font-semibold">{game.name}</h1>
        <div className="mt-6 flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90" role="img" aria-label={`${pct}% complete`}>
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--raised)" strokeWidth="6" />
            <circle className="ring-fill" cx="50" cy="50" r="44" fill="none" stroke="var(--brass)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(pct / 100) * ring} ${ring}`} />
          </svg>
          <p className="text-sm text-muted">
            <span className="display block text-3xl font-semibold text-ivory tabular-nums">
              {done}
              <span className="text-lg text-muted"> / {lessons.length}</span>
            </span>
            lessons done
          </p>
        </div>
        <div className="mt-5">
          <ActivityCard />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {upNext && (
            <Link href={lessonHref(gameId, upNext.id)} className="btn btn-primary">
              {done === 0 ? "Start the first lesson" : "Continue"}
            </Link>
          )}
          {challenges.length > 0 && (
            <Link href={`/${gameId}/challenges`} className="btn btn-ghost">
              Challenges
            </Link>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/${gameId}/practice`} className="btn btn-ghost">
              Practice
            </Link>
            <Link href={`/${gameId}/stats`} className="btn btn-ghost">
              Stats
            </Link>
          </div>
          {entries.length > 0 && (
            <button type="button" onClick={() => setConfirming(true)} className="btn btn-quiet self-start !px-0 text-xs">
              Reset progress
            </button>
          )}
          <Sheet open={confirming} onClose={() => setConfirming(false)} title="Reset progress?" centre>
            <p className="text-sm text-muted">This clears all saved results for {game.name} on this device. It cannot be undone.</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  clear();
                  setConfirming(false);
                }}
              >
                Clear results
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
                Keep them
              </button>
            </div>
          </Sheet>
        </div>
      </aside>

      <ol className="flex flex-col">
        {groups.map((g, i) => (
          <li key={g.module} className="relative pb-9 pl-11">
            {i < groups.length - 1 && <span aria-hidden className="absolute bottom-0 left-[0.9375rem] top-8 w-px bg-line" />}
            <span aria-hidden className="display absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-line text-sm tabular-nums text-brass">
              {i + 1}
            </span>
            <h2 className="display pt-0.5 text-xl font-semibold">{g.title}</h2>
            <ul className="mt-3 flex flex-col gap-1.5">
              {g.lessons.map((l) => (
                <LessonRow key={l.id} gameId={gameId} lesson={l} progress={byLesson.get(l.id)} isNext={upNext?.id === l.id} />
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LessonRow({ gameId, lesson, progress, isNext }: { gameId: GameId; lesson: Lesson; progress?: LessonProgress; isNext: boolean }) {
  const scored = lesson.kind !== "watch" && progress && progress.plays > 0;
  return (
    <li>
      <Link
        href={lessonHref(gameId, lesson.id)}
        aria-current={isNext ? "step" : undefined}
        className={`group flex min-h-13 items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${isNext ? "border-brass/60 bg-brass/10" : "border-line hover:border-brass/50"}`}
      >
        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${progress?.completed ? "bg-good" : isNext ? "bg-brass" : "bg-raised"}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-medium">{lesson.title.replace(/^Watch: /, "")}</span>
          <span className="block text-xs text-muted">
            {KIND[lesson.kind]}
            {progress?.completed && !scored ? " · done" : ""}
          </span>
        </span>
        {scored && (
          <span className="shrink-0 text-right">
            <Stars n={progress.bestStars} />
            <span className="block text-xs tabular-nums text-muted">best {progress.bestScore}</span>
          </span>
        )}
      </Link>
    </li>
  );
}

