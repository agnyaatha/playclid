"use client";

import Link from "next/link";
import type { GameId } from "@/core/game";
import type { WatchLesson } from "@/core/lessons/schema";
import { useProgress } from "@/core/progress/useProgress";

const TAG_LABEL: Record<string, string> = { S: "Snooker", P: "Pool", B: "Both" };

/** A watch-and-practise lesson: external video links, an at-the-table task, and a manual "done" mark. */
export function WatchLessonView({ gameId, lesson, nextHref }: { gameId: GameId; lesson: WatchLesson; nextHref?: string }) {
  const { byLesson, save } = useProgress(gameId);
  const done = byLesson.get(lesson.id)?.completed ?? false;

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-10">
      <header>
        <p className="eyebrow">{lesson.moduleTitle}</p>
        <h1 className="display mt-2 text-4xl font-semibold leading-tight">{lesson.title.replace(/^Watch: /, "")}</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">{lesson.goal}</p>
      </header>

      <section aria-labelledby="videos">
        <h2 id="videos" className="sr-only">
          Videos
        </h2>
        <ol className="flex flex-col divide-y divide-line border-y border-line">
          {lesson.videos.map((v, i) => (
            <li key={v.url}>
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="flex min-h-14 items-center gap-4 py-3 transition-colors hover:text-brass">
                <span className="display w-6 shrink-0 text-right text-lg tabular-nums text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1">{v.title}</span>
                {v.tags?.[0] && <span className="shrink-0 text-xs text-muted">{TAG_LABEL[v.tags[0]] ?? v.tags[0]}</span>}
                <span className="sr-only">(opens on YouTube)</span>
                <span aria-hidden className="text-muted">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      {lesson.practice && (
        <section aria-labelledby="practice" className="panel border-l-2 !border-l-brass p-5">
          <h2 id="practice" className="eyebrow">
            At the table
          </h2>
          <p className="mt-2 leading-relaxed">{lesson.practice}</p>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={done}
          onClick={() => save({ gameId, lessonId: lesson.id, kind: "watch", score: 0, testScore: 0, attempts: 0, stars: 0, at: Date.now() })}
          className="btn btn-primary"
        >
          {done ? "Done" : "Mark as done"}
        </button>
        {nextHref && (
          <Link href={nextHref} className="btn btn-ghost">
            Next lesson
          </Link>
        )}
        <Link href={`/${gameId}`} className="btn btn-quiet">
          Curriculum
        </Link>
      </div>
    </article>
  );
}
