"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { GameId } from "@/core/game";
import { ballName } from "@/core/lessons/insight";
import { aidsForAttempt, buildLessonBodies, evaluateShot, isTestAttempt, starsFor, totalAttempts } from "@/core/lessons/logic";
import type { DrillLesson } from "@/core/lessons/schema";
import { usePref } from "@/core/prefs/usePref";
import { useProgress } from "@/core/progress/useProgress";
import { pocketAimPoint } from "@/core/table";
import type { ShotResult } from "@/core/types";
import type { Marker } from "@/views/2d/draw";
import { TableView } from "@/views/TableView";
import { PlaybackControls } from "../controls/PlaybackControls";
import { ShotControls } from "../controls/ShotControls";
import { prefersReducedMotion, tableFx } from "../fx/bus";
import { sound } from "../fx/sound";
import { Callout, Segmented, Stars, Thinking } from "../kit";
import { TableBanner, TableOverlay } from "../TableOverlay";
import { TableTools } from "../TableTools";
import { useAdvisor } from "../useAdvisor";
import { tableKeys, useTableSession } from "../useTableSession";
import { useShotDemo, type DemoStep } from "./useShotDemo";

const NONE: string[] = [];
const noSubscribe = () => () => {};

interface AttemptRecord {
  success: boolean;
  test: boolean;
  reasons: string[];
}

interface Summary {
  score: number;
  testScore: number;
  stars: number;
  newBest: boolean;
}

/** Runs one drill: practice attempts with fading aids, then no-aid test attempts, scored and saved locally. */
export function DrillPlayer({ gameId, lesson, nextHref }: { gameId: GameId; lesson: DrillLesson; nextHref?: string }) {
  const total = totalAttempts(lesson);
  const { save, byLesson } = useProgress(gameId);
  const advisor = useAdvisor();
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<AttemptRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [lastResult, setLastResult] = useState<ShotResult | null>(null);
  const [tab, setTab] = useState<"shot" | "coach">("shot");
  const [demoRunning, setDemoRunning] = useState(false);

  const shotTaken = results.length > attempt;
  const finished = summary !== null;
  const allowed = aidsForAttempt(lesson, attempt);
  const testing = isTestAttempt(lesson, attempt);

  const session = useTableSession({
    gameId,
    makeInitial: (game, table) => buildLessonBodies(game, table, lesson),
    makeControls: (game, bodies) => {
      const s = bodies.find((b) => b.id === game.input.strikerId);
      const t = bodies.find((b) => b.id === lesson.success.pot?.ball);
      const aim = s && t ? Math.atan2(t.position.y - s.position.y, t.position.x - s.position.x) : game.input.defaultAim;
      return { aim, power: 0.35, spinX: 0, spinY: 0 };
    },
    blocked: shotTaken || finished || thinking,
    allowedAids: allowed,
    forceAids: demoRunning,
  });
  const { game, input, table, initial, setBodies, controls, patch, simParams, playing, play, skip, speed, setSpeed } = session;

  const demo = useShotDemo(session, () => advisor.solve(gameId, lesson.id, simParams), (found) => {
    setDemoRunning(false);
    setHint(found ? "Your turn. Line it up and play it yourself." : "Could not find a shot to show for this one.");
  });
  const canShoot = session.canShoot && !demoRunning;
  const canDemo = !testing && !shotTaken && !finished && !playing && !thinking;
  const startDemo = () => {
    setHint(null);
    setDemoRunning(true);
    void demo.start();
  };
  const stopDemo = () => {
    setDemoRunning(false);
    demo.stop();
  };

  // Show each drill's demonstration once, the first time it is opened, after the first-run tour has finished.
  const [tourDone] = usePref<boolean>("tourDone", false);
  const [demosSeen, setDemosSeen] = usePref<string[]>("demosSeen", NONE);
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const autoStarted = useRef(false);
  const startDemoRef = useRef(startDemo);
  useEffect(() => {
    startDemoRef.current = startDemo;
  });
  useEffect(() => {
    if (!hydrated || !tourDone || autoStarted.current || demosSeen.includes(lesson.id) || prefersReducedMotion()) return;
    autoStarted.current = true;
    setDemosSeen([...demosSeen, lesson.id]);
    startDemoRef.current();
  }, [hydrated, tourDone, demosSeen, lesson.id, setDemosSeen]);

  const targetName = lesson.success.pot ? ballName(lesson.success.pot.ball) : "ball";
  const striker = input.tipOffset ? "cue ball" : "striker";
  const spin = input.tipOffset && demo.plan ? (demo.plan.spinY > 0.05 ? " The tip is set high, for follow." : demo.plan.spinY < -0.05 ? " The tip is set low, for draw." : "") : "";
  const caption: Record<DemoStep, { title: string; text: ReactNode }> = {
    prepare: { title: "Watch how it's done", text: <Thinking label="Working out a good shot from here" /> },
    aim: { title: "1 · Aim", text: lesson.success.pot ? `The line runs to the ghost ball: where the ${striker} must be when it meets the ${targetName}.` : `The line shows where the ${striker} will go.` },
    power: { title: "2 · Power", text: `This shot needs about ${((demo.plan?.power ?? 0) * input.maxSpeed).toFixed(1)} m/s.${spin}` },
    shot: { title: "3 · Play it", text: lesson.success.zone ? "In slow motion. Watch where it finishes: inside the gold circle." : "In slow motion. Watch both balls after they meet." },
  };

  const markers = useMemo<Marker[]>(() => {
    const m: Marker[] = [];
    const { zone, pot } = lesson.success;
    if (zone) m.push({ x: zone.x, y: zone.y, radius: zone.radius, kind: "zone" });
    for (const id of pot?.pockets ?? []) {
      const p = table.pockets.find((k) => k.id === id);
      if (p) {
        const c = pocketAimPoint(p);
        m.push({ x: c.x, y: c.y, radius: p.radius * 1.4, kind: "pocket" });
      }
    }
    return m;
  }, [lesson, table]);

  const shoot = () => {
    if (!canShoot) return;
    const result = session.simulate(session.bodies, controls);
    setLastResult(result);
    setHint(null);
    play(result, () => {
      const outcome = evaluateShot(lesson, result, input.strikerId);
      const all = [...results, { success: outcome.success, test: testing, reasons: outcome.reasons }];
      setResults(all);
      setBodies(game.afterShot?.(result, table).bodies ?? result.final);
      session.celebrate({ result });
      if (outcome.success && session.fx.celebrations) sound.chime(1);
      if (all.length === total) {
        const score = all.filter((r) => r.success).length;
        const testScore = all.filter((r) => r.success && r.test).length;
        const stars = starsFor(lesson, score);
        const before = byLesson.get(lesson.id);
        setSummary({ score, testScore, stars, newBest: !!before && before.plays > 0 && score > before.bestScore });
        if (stars === 3) tableFx.emit({ kind: "confetti" });
        if (stars > 0 && session.fx.celebrations) sound.chime(stars as 1 | 2 | 3);
        save({ gameId, lessonId: lesson.id, kind: "drill", score, testScore, attempts: total, stars, at: Date.now() });
      }
    });
  };

  /** Ask the solver for a shot that passes this drill and set the controls to it (practice attempts only). */
  const showMe = async () => {
    setThinking(true);
    setHint(null);
    const c = await advisor.solve(gameId, lesson.id, simParams);
    setThinking(false);
    if (c) {
      session.setControls(c);
      setHint("These settings pot it. Try nudging the aim and power to feel how sensitive the shot is.");
      setTab("shot");
    } else {
      setHint("Could not find a shot for this one.");
    }
  };

  /** Play the solver's passing shot as an animation, from the lesson's starting layout. Scores nothing. */
  const watchGoodShot = async () => {
    setThinking(true);
    const c = await advisor.solve(gameId, lesson.id, simParams);
    setThinking(false);
    if (c) play(session.simulate(initial, c));
  };

  const next = () => {
    setHint(null);
    setAttempt((a) => a + 1);
    setBodies(initial);
    setLastResult(null);
  };

  const retry = () => {
    setHint(null);
    setAttempt(0);
    setResults([]);
    setSummary(null);
    setBodies(initial);
    setLastResult(null);
  };

  const last = results[attempt];
  const made = results.filter((r) => r.success).length;

  return (
    <div className="stage flex-1" onKeyDown={(e) => tableKeys(e, session.nudgeDegrees, shoot)}>
      <div className="stage-table">
        <TableView {...session.tableProps} markers={markers} onPoint={demoRunning ? undefined : session.aimAt} label={`${lesson.title}. Drag to aim; left and right arrow keys fine-tune the aim; Enter shoots.`} tools={<TableTools session={session} />} pull={session.makePull(canShoot)} onPullShoot={shoot}>
          <TableOverlay session={session} />
          {demo.step && (
            <TableBanner tone="note" title={caption[demo.step].title} onClose={stopDemo}>
              <p key={demo.step} className="rise">
                {caption[demo.step].text}
              </p>
            </TableBanner>
          )}
        </TableView>
      </div>

      <aside className="dock" aria-label="Lesson">
        <div className="border-b border-line px-4 py-3">
          <p className="eyebrow">{lesson.moduleTitle}</p>
          <h1 className="display mt-0.5 text-xl font-semibold leading-tight">{lesson.title}</h1>
          <p className="mt-1 text-[0.8125rem] leading-snug text-muted">{lesson.goal}</p>
          {lesson.success.zone && <p className="mt-1 text-[0.8125rem] text-brass">Finish the cue ball inside the gold circle.</p>}
          {!demoRunning && (
            <button type="button" className="btn btn-quiet !min-h-8 !px-0 text-brass" disabled={!canDemo} onClick={startDemo}>
              ▶ Watch how it&apos;s done
            </button>
          )}
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span>{finished ? "Finished" : `${testing ? "Test shot" : "Practice"} ${attempt + 1} of ${total}`}</span>
            <span className="tabular-nums">
              {made} / {results.length} made
            </span>
          </div>
          <ol className="mt-1.5 flex items-center gap-1" aria-label="Attempt results">
            {Array.from({ length: total }, (_, i) => {
              const r = results[i];
              const cls = r ? (r.success ? "bg-good" : "bg-bad") : i === attempt && !finished ? "bg-brass" : "bg-raised";
              return <li key={`${i}-${r ? r.success : "open"}`} title={r ? (r.success ? "Made" : "Missed") : "To play"} className={`h-1.5 flex-1 rounded-full ${cls} ${r ? "pip-pop" : ""} ${i === lesson.practiceAttempts ? "ml-1.5" : ""}`} />;
            })}
          </ol>
        </div>

        {finished && summary ? (
          <div className="dock-body">
            <div className="flex items-end justify-between">
              <p className="display text-4xl font-semibold tabular-nums leading-none">
                {summary.score}
                <span className="text-xl text-muted"> / {total}</span>
              </p>
              <Stars n={summary.stars} size="text-2xl" animate />
            </div>
            {summary.newBest && <p className="eyebrow fx-star self-start rounded-full border border-brass/60 bg-brass/10 px-3 py-1">New best</p>}
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-raised p-3">
                <dt className="text-xs text-muted">With aids</dt>
                <dd className="font-semibold tabular-nums">
                  {results.filter((r) => r.success && !r.test).length} of {lesson.practiceAttempts}
                </dd>
              </div>
              <div className="rounded-lg bg-raised p-3">
                <dt className="text-xs text-muted">No aids</dt>
                <dd className="font-semibold tabular-nums">
                  {summary.testScore} of {lesson.testAttempts}
                </dd>
              </div>
            </dl>
            <p className="text-sm text-muted">
              {summary.stars === 0 ? `A first star needs ${lesson.stars[0]} makes. Watch a good shot and go again.` : summary.stars < 3 ? `The next star is at ${lesson.stars[summary.stars]} makes.` : "Top marks. On to the next one."}
            </p>
            <div className="flex flex-wrap gap-2">
              {nextHref && (
                <Link href={nextHref} className="btn btn-primary">
                  Next lesson
                </Link>
              )}
              <button type="button" onClick={retry} className="btn btn-ghost">
                Try again
              </button>
              <Link href={`/${gameId}`} className="btn btn-quiet">
                Curriculum
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 pt-3">
              <Segmented
                label="Panel"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "shot", label: "Shot" },
                  { value: "coach", label: "Coach" },
                ]}
              />
            </div>
            <div className="dock-body">
              {tab === "shot" && <ShotControls input={input} controls={controls} onChange={patch} availableAids={allowed} aids={session.aids} onAids={session.setAids} />}
              {tab === "shot" && <p className="text-xs text-muted">{testing ? "Test shot: no aids. This one shows what has stuck." : "Aids fade as you go, then the last shots have none."}</p>}
              {tab === "coach" && (
                <>
                  {lesson.tips && (
                    <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted">
                      {lesson.tips.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  )}
                  {!testing && (
                    <button type="button" className="btn btn-ghost" onClick={() => void showMe()} disabled={!canShoot}>
                      {thinking ? <Thinking label="Working it out" /> : "Show me a good shot"}
                    </button>
                  )}
                  {testing && <p className="text-sm text-muted">The coach sits out the test shots.</p>}
                </>
              )}
            </div>
            <div className="dock-foot">
              {hint && <Callout tone="note">{hint}</Callout>}
              {shotTaken && !playing && last && (
                <Callout tone={last.success ? "good" : "bad"} title={last.success ? "Made it" : "Missed"}>
                  {!last.success && <p>{last.reasons.join(" ")}</p>}
                  {!last.success && (
                    <button type="button" onClick={() => void watchGoodShot()} disabled={thinking} className="btn btn-quiet !min-h-8 !px-0 text-ivory underline">
                      {thinking ? <Thinking label="Working it out" /> : "Watch a good shot"}
                    </button>
                  )}
                </Callout>
              )}
              {shotTaken && !playing ? (
                <button type="button" onClick={next} className="btn btn-primary !min-h-12 text-base">
                  Next attempt
                </button>
              ) : (
                <button type="button" disabled={!canShoot} onClick={shoot} data-flick={session.tableProps.theme.shape === "disc" || undefined} className="btn btn-primary btn-shoot !min-h-12 text-base">
                  Shoot
                </button>
              )}
              <PlaybackControls playing={playing} speed={speed} onSpeed={setSpeed} onSkip={skip} canReplay={!!lastResult} onReplay={() => lastResult && play(lastResult)} />
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
