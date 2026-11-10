"use client";

import Link from "next/link";
import { useState } from "react";
import type { GameId } from "@/core/game";
import { buildLessonBodies } from "@/core/lessons/logic";
import type { BreakLesson } from "@/core/lessons/schema";
import { useProgress } from "@/core/progress/useProgress";
import type { RulesState } from "@/core/rules";
import type { ShotResult } from "@/core/types";
import { getGame } from "@/games/registry";
import { TableView } from "@/views/TableView";
import { PlaybackControls } from "../controls/PlaybackControls";
import { ShotControls } from "../controls/ShotControls";
import { tableFx } from "../fx/bus";
import { sound } from "../fx/sound";
import { Field, Stars } from "../kit";
import { TableOverlay } from "../TableOverlay";
import { TableTools } from "../TableTools";
import { tableKeys, useTableSession } from "../useTableSession";

const starsFor = (l: BreakLesson, points: number) => (points >= l.stars[2] ? 3 : points >= l.stars[1] ? 2 : points >= l.stars[0] ? 1 : 0);

/** One visit to the table: keep playing by the rules until the turn ends, then score the break. */
export function BreakPlayer({ gameId, lesson, nextHref }: { gameId: GameId; lesson: BreakLesson; nextHref?: string }) {
  const { save, byLesson } = useProgress(gameId);
  const [frame, setFrame] = useState<RulesState | null>(() => getGame(gameId).game.rules?.newFrame({ redsLeft: lesson.redsLeft }) ?? null);
  const [points, setPoints] = useState(0);
  const [shots, setShots] = useState(0);
  const [done, setDone] = useState<{ points: number; stars: number; newBest: boolean } | null>(null);
  const [nominated, setNominated] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ShotResult | null>(null);
  const [message, setMessage] = useState("Every point in this visit counts towards your break.");

  const session = useTableSession({ gameId, makeInitial: (game, table) => buildLessonBodies(game, table, lesson), blocked: done !== null });
  const { input, rules, table, bodies, setBodies, initial, controls, patch, playing, play, skip, speed, setSpeed, canShoot } = session;
  const nominations = rules?.nominations && frame ? rules.nominations(frame, bodies) : null;

  const shoot = () => {
    if (!canShoot || !rules || !frame) return;
    const result = session.simulate(bodies, controls);
    setLastResult(result);
    play(result, () => {
      const j = rules.judge(frame, result, { table, nominated });
      const total = points + (j.foul ? 0 : j.points);
      setBodies(j.bodies);
      setFrame(j.state);
      setNominated(null);
      setMessage(j.message);
      setPoints(total);
      setShots((n) => n + 1);
      const board = rules.scoreboard(j.state);
      const ended = board.current !== 0 || board.over;
      session.celebrate({ result, points: j.foul ? 0 : j.points, foul: j.foul, breakBefore: points, breakAfter: total, replay: !ended });
      // The visit ends when the turn passes (no pot or a foul) or the frame is over.
      if (ended) {
        const stars = starsFor(lesson, total);
        const before = byLesson.get(lesson.id);
        setDone({ points: total, stars, newBest: !!before && before.plays > 0 && total > before.bestScore });
        if (stars === 3) tableFx.emit({ kind: "confetti" });
        if (stars > 0 && session.fx.celebrations) sound.chime(stars as 1 | 2 | 3);
        save({ gameId, lessonId: lesson.id, kind: "break", score: total, testScore: 0, attempts: shots + 1, stars, at: Date.now() });
      }
    });
  };

  const retry = () => {
    setBodies(initial);
    setFrame(rules?.newFrame({ redsLeft: lesson.redsLeft }) ?? null);
    setPoints(0);
    setShots(0);
    setDone(null);
    setNominated(null);
    setLastResult(null);
    setMessage("Every point in this visit counts towards your break.");
  };

  return (
    <div className="stage flex-1" onKeyDown={(e) => tableKeys(e, session.nudgeDegrees, shoot)}>
      <div className="stage-table">
        <TableView {...session.tableProps} onPoint={session.aimAt} label={`${lesson.title}. Drag to aim; left and right arrow keys fine-tune the aim; Enter shoots.`} tools={<TableTools session={session} />} pull={session.makePull()} onPullShoot={shoot}>
          <TableOverlay session={session} />
        </TableView>
      </div>

      <aside className="dock" aria-label="Lesson">
        <div className="border-b border-line px-4 py-3">
          <p className="eyebrow">{lesson.moduleTitle}</p>
          <h1 className="display mt-0.5 text-xl font-semibold leading-tight">{lesson.title}</h1>
          <p className="mt-1 text-[0.8125rem] leading-snug text-muted">{lesson.goal}</p>
          <div className="mt-3 flex items-end justify-between">
            <p className="display text-4xl font-semibold tabular-nums leading-none" aria-label={`Break of ${points}`}>
              {points}
            </p>
            <p className="text-right text-xs tabular-nums text-muted">
              Stars at {lesson.stars.join(" · ")}
              <br />
              {shots} shot{shots === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {done ? (
          <div className="dock-body">
            <div className="flex items-center justify-between">
              <p className="display text-2xl font-semibold">Break of {done.points}</p>
              <Stars n={done.stars} size="text-2xl" animate />
            </div>
            {done.newBest && <p className="eyebrow fx-star self-start rounded-full border border-brass/60 bg-brass/10 px-3 py-1">New best</p>}
            <p className="text-sm text-muted">{message}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={retry} className="btn btn-primary">
                Go again
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
          </div>
        ) : (
          <>
            <div className="dock-body">
              {nominations && (
                <Field label="Nominate the colour" htmlFor="nominate">
                  <select id="nominate" value={nominated ?? ""} onChange={(e) => setNominated(e.target.value || null)} className="select mt-1 w-full">
                    <option value="">First colour hit</option>
                    {nominations.map((c) => (
                      <option key={c} value={c}>
                        {c[0].toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <ShotControls input={input} controls={controls} onChange={patch} availableAids={[]} aids={session.aids} onAids={session.setAids} />
              {lesson.tips && (
                <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-muted">
                  {lesson.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="dock-foot">
              <p className="min-h-9 text-[0.8125rem] leading-snug text-muted" aria-live="polite">
                {message}
              </p>
              <button type="button" disabled={!canShoot} onClick={shoot} className="btn btn-primary !min-h-12 text-base">
                Shoot
              </button>
              <PlaybackControls playing={playing} speed={speed} onSpeed={setSpeed} onSkip={skip} canReplay={!!lastResult} onReplay={() => lastResult && play(lastResult)} />
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
