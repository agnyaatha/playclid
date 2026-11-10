"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GameId } from "@/core/game";
import { challengeStars, clearOfBalls, TIER_NAMES, targetsLeft, type Challenge } from "@/core/lessons/challenges";
import { ballName } from "@/core/lessons/insight";
import { buildLessonBodies } from "@/core/lessons/logic";
import type { AidName } from "@/core/lessons/schema";
import { useProgress } from "@/core/progress/useProgress";
import type { ShotResult } from "@/core/types";
import type { Marker } from "@/views/2d/draw";
import { TableView } from "@/views/TableView";
import { PlaybackControls } from "../controls/PlaybackControls";
import { ShotControls } from "../controls/ShotControls";
import { tableFx } from "../fx/bus";
import { sound } from "../fx/sound";
import { Stars, Thinking } from "../kit";
import { TableOverlay } from "../TableOverlay";
import { TableTools } from "../TableTools";
import { useAdvisor } from "../useAdvisor";
import { tableKeys, useTableSession } from "../useTableSession";

/** The hardest challenges leave you with the aim line alone. */
const aidsFor = (tier: Challenge["tier"]): AidName[] => (tier === 3 ? ["aimLine"] : ["aimLine", "ghostBall"]);

/** Plays one challenge: pot the marked balls before the shots run out, from wherever the balls come to rest. */
export function ChallengePlayer({ gameId, challenge, nextHref }: { gameId: GameId; challenge: Challenge; nextHref?: string }) {
  const { save, byLesson } = useProgress(gameId);
  const advisor = useAdvisor();
  const [used, setUsed] = useState(0);
  const [done, setDone] = useState<{ cleared: boolean; stars: number; newBest: boolean } | null>(null);
  const [lastResult, setLastResult] = useState<ShotResult | null>(null);
  const [message, setMessage] = useState("The marked balls are your targets. Balls stay where they stop.");
  const [hintUsed, setHintUsed] = useState(false);
  const [thinking, setThinking] = useState(false);

  const session = useTableSession({
    gameId,
    makeInitial: (game, table) => buildLessonBodies(game, table, challenge),
    makeControls: (game, bodies) => {
      const s = bodies.find((b) => b.id === game.input.strikerId);
      const t = bodies.find((b) => b.id === challenge.targets[0]);
      return { aim: s && t ? Math.atan2(t.position.y - s.position.y, t.position.x - s.position.x) : game.input.defaultAim, power: 0.35, spinX: 0, spinY: 0 };
    },
    blocked: done !== null || thinking,
    allowedAids: aidsFor(challenge.tier),
  });
  const { game, input, table, bodies, setBodies, initial, controls, patch, simParams, playing, play, skip, speed, setSpeed, canShoot } = session;

  const left = targetsLeft(challenge, bodies);
  const remaining = challenge.shots - used;
  const markers = useMemo<Marker[]>(
    () => (playing ? [] : bodies.filter((b) => left.includes(b.id)).map((b) => ({ x: b.position.x, y: b.position.y, radius: b.radius * 1.7, kind: "pocket" as const }))),
    // `left` is derived from `bodies`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bodies, playing],
  );

  const shoot = () => {
    if (!canShoot) return;
    const result = session.simulate(bodies, controls);
    setLastResult(result);
    play(result, () => {
      const after = game.afterShot?.(result, table).bodies ?? result.final;
      const next = clearOfBalls(game.resetStriker?.(after) ?? after, input.strikerId, table);
      setBodies(next);
      session.celebrate({ result });

      const shots = used + 1;
      setUsed(shots);
      const stillLeft = targetsLeft(challenge, next);
      if (stillLeft.length < left.length && stillLeft.length > 0) setMessage(`Got one. ${stillLeft.length} to go.`);
      else if (stillLeft.length > 0) setMessage(`${challenge.shots - shots} shot${challenge.shots - shots === 1 ? "" : "s"} left.`);

      const cleared = stillLeft.length === 0;
      if (cleared || shots >= challenge.shots) {
        const stars = challengeStars(challenge, shots, cleared);
        const before = byLesson.get(challenge.id);
        setDone({ cleared, stars, newBest: !!before && before.plays > 0 && stars > before.bestStars });
        setMessage(cleared ? `Cleared in ${shots} shot${shots === 1 ? "" : "s"}.` : "Out of shots.");
        save({ gameId, lessonId: challenge.id, kind: "break", score: cleared ? challenge.shots - shots + 1 : 0, testScore: 0, attempts: shots, stars, at: Date.now() });
        if (stars === 3) tableFx.emit({ kind: "confetti" });
        if (cleared && session.fx.celebrations) sound.chime(stars as 1 | 2 | 3);
      }
    });
  };

  /** One free look per attempt: sets up a shot proven to pot a target. Only spent when it finds one. */
  const hint = async () => {
    if (!canShoot || hintUsed) return;
    setThinking(true);
    setMessage("Reading the table…");
    const pot = await advisor.findPot(gameId, bodies, left, simParams);
    setThinking(false);
    if (pot) {
      setHintUsed(true);
      session.setControls(pot.controls);
      setMessage(`Hint: this exact shot pots the ${ballName(pot.ball)}.`);
    } else {
      setMessage("No direct pot from here, so your hint is saved. Try moving a blocker out of the way.");
    }
  };

  const retry = () => {
    setBodies(initial);
    setUsed(0);
    setDone(null);
    setLastResult(null);
    setHintUsed(false);
    setMessage("The marked balls are your targets. Balls stay where they stop.");
  };

  return (
    <div className="stage flex-1" onKeyDown={(e) => tableKeys(e, session.nudgeDegrees, shoot)}>
      <div className="stage-table">
        <TableView {...session.tableProps} markers={markers} onPoint={session.aimAt} label={`${challenge.title}. Drag to aim; left and right arrow keys fine-tune the aim; Enter shoots.`} tools={<TableTools session={session} />} pull={session.makePull()} onPullShoot={shoot}>
          <TableOverlay session={session} />
        </TableView>
      </div>

      <aside className="dock" aria-label="Challenge">
        <div className="border-b border-line px-4 py-3">
          <p className="eyebrow">Challenge · {TIER_NAMES[challenge.tier]}</p>
          <h1 className="display mt-0.5 text-xl font-semibold leading-tight">{challenge.title}</h1>
          <p className="mt-1 text-[0.8125rem] leading-snug text-muted">{challenge.goal}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span>
              {left.length} target{left.length === 1 ? "" : "s"} left
            </span>
            <span className="tabular-nums">
              {remaining} shot{remaining === 1 ? "" : "s"} left
            </span>
          </div>
          <ol className="mt-2 flex items-center gap-1.5" aria-label="Shots">
            {Array.from({ length: challenge.shots }, (_, i) => (
              <li key={i} className={`shot-ball ${i < used ? "shot-gone" : ""}`} />
            ))}
          </ol>
        </div>

        {done ? (
          <div className="dock-body">
            <div className="flex items-center justify-between">
              <p className="display text-2xl font-semibold">{done.cleared ? "Cleared" : "Out of shots"}</p>
              <Stars n={done.stars} size="text-2xl" animate />
            </div>
            {done.newBest && <p className="eyebrow fx-star self-start rounded-full border border-brass/60 bg-brass/10 px-3 py-1">New best</p>}
            <p className="text-sm text-muted">
              {done.cleared
                ? done.stars === 3
                  ? "One shot per target. Perfect."
                  : `Three stars needs ${challenge.targets.length} shot${challenge.targets.length === 1 ? "" : "s"}.`
                : `${left.length} target${left.length === 1 ? "" : "s"} still on the table. The layout never changes, so you can plan it.`}
            </p>
            <div className="flex flex-wrap gap-2">
              {done.cleared && nextHref && (
                <Link href={nextHref} className="btn btn-primary">
                  Next challenge
                </Link>
              )}
              <button type="button" onClick={retry} className={`btn ${done.cleared && nextHref ? "btn-ghost" : "btn-primary"}`}>
                Try again
              </button>
              <Link href={`/${gameId}/challenges`} className="btn btn-quiet">
                All challenges
              </Link>
            </div>
            <PlaybackControls playing={playing} speed={speed} onSpeed={setSpeed} onSkip={skip} canReplay={!!lastResult} onReplay={() => lastResult && play(lastResult)} />
          </div>
        ) : (
          <>
            <div className="dock-body">
              <ShotControls input={input} controls={controls} onChange={patch} availableAids={[]} aids={session.aids} onAids={session.setAids} />
              <button type="button" className="btn btn-ghost" disabled={!canShoot || hintUsed} onClick={() => void hint()}>
                {thinking ? <Thinking label="Reading the table" /> : hintUsed ? "Hint used" : "Use your one hint"}
              </button>
            </div>
            <div className="dock-foot">
              <p className="min-h-9 text-[0.8125rem] leading-snug text-muted" aria-live="polite">
                {message}
              </p>
              <button type="button" disabled={!canShoot} onClick={shoot} data-flick={session.tableProps.theme.shape === "disc" || undefined} className="btn btn-primary btn-shoot !min-h-12 text-base">
                Shoot
              </button>
              <PlaybackControls playing={playing} speed={speed} onSpeed={setSpeed} onSkip={skip} canReplay={!!lastResult} onReplay={() => lastResult && play(lastResult)}>
                <button type="button" disabled={playing || thinking} onClick={retry} className="btn btn-quiet">
                  Restart
                </button>
              </PlaybackControls>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
