"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { GameId } from "@/core/game";
import { buildDemo } from "@/core/lessons/demo";
import type { Demo } from "@/core/lessons/schema";
import { stateAt } from "@/core/sim/playback";
import type { Body } from "@/core/types";
import { getGame } from "@/games/registry";
import { TableCanvas } from "@/views/2d/TableCanvas";
import { DEFAULT_GUIDES, predictShot } from "@/views/2d/prediction";
import { styleTable } from "@/views/appearance";
import type { PaintFn } from "@/views/paint";
import { useAppTheme } from "../ThemeButton";

/** How long the aim is shown before the shot, and the finished position after it, in milliseconds. */
const AIM_MS = 1600;
const HOLD_MS = 1800;
/** Long shots are cut short so the loop keeps moving. */
const MAX_SECONDS = 9;

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );

/**
 * A lesson illustration: the layout, the aim held for a moment, then the shot played by the real engine. It loops
 * while on screen. With reduced motion it waits for the Play button and plays once.
 */
export function ShotDemo({ gameId, demo }: { gameId: GameId; demo: Demo }) {
  const { theme: appTheme, colourTable } = useAppTheme();
  // The shot is solved once; every loop replays the same result.
  const { game, theme, table, built, result, prediction } = useMemo(() => {
    const { game, theme } = getGame(gameId);
    const table = game.createTable();
    const built = buildDemo(game, table, demo);
    return {
      game,
      theme,
      table,
      built,
      result: built.shot ? game.simulate(table, built.bodies, built.shot) : null,
      prediction: built.shot ? predictShot(game, table, built.bodies, built.shot, undefined, DEFAULT_GUIDES) : null,
    };
  }, [gameId, demo]);

  const reduced = useReducedMotion();
  const [paused, setPaused] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const paintRef = useRef<PaintFn | null>(null);
  const displayRef = useRef<Body[] | null>(null);

  // Until the viewer chooses, it plays unless they prefer reduced motion.
  const isPaused = paused ?? reduced;
  const active = !!result && visible && !isPaused;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    io.observe(box);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!active || !result) return;
    const cloth = game.params.cloth;
    const end = Math.min(result.duration, MAX_SECONDS);
    let raf = 0;
    let timer = 0;
    const showAim = () => {
      displayRef.current = null;
      setPlaying(false);
      paintRef.current?.();
      timer = window.setTimeout(play, AIM_MS);
    };
    const play = () => {
      let t = 0;
      let last = performance.now();
      displayRef.current = stateAt(result, 0, cloth);
      setPlaying(true);
      const step = (now: number) => {
        t += Math.min(0.05, (now - last) / 1000);
        last = now;
        displayRef.current = stateAt(result, Math.min(t, end), cloth);
        paintRef.current?.();
        if (t < end) raf = requestAnimationFrame(step);
        else if (reduced) timer = window.setTimeout(() => setPaused(true), HOLD_MS);
        else timer = window.setTimeout(showAim, HOLD_MS);
      };
      raf = requestAnimationFrame(step);
    };
    // Reduced motion: the viewer pressed Play, so go straight to the shot.
    timer = window.setTimeout(reduced ? play : showAim, 0);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      // The aim overlay comes back when this stops, which repaints the starting position.
      displayRef.current = null;
    };
  }, [active, result, reduced, game]);

  const showingAim = !!built.shot && (!active || !playing);
  const aiming = useMemo(
    () =>
      showingAim
        ? { aim: built.aim, power: built.power, prediction, aids: { aimLine: true, ghostBall: true, prediction: !!demo.showPath } }
        : undefined,
    [showingAim, built, prediction, demo.showPath],
  );
  const markers = useMemo(() => (demo.zone ? [{ ...demo.zone, kind: "zone" as const }] : undefined), [demo.zone]);
  const aspect = (table.length + 2 * theme.frame) / (table.width + 2 * theme.frame);

  return (
    <figure className="flex flex-col gap-2">
      <div ref={boxRef} className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: aspect } as CSSProperties}>
        <TableCanvas
          table={table}
          theme={styleTable(theme, appTheme, colourTable)}
          strikerId={game.input.strikerId}
          bodies={built.bodies}
          displayRef={displayRef}
          aiming={aiming}
          markers={markers}
          paintRef={paintRef}
          label={demo.caption}
        />
      </div>
      <div className="flex items-start gap-3">
        <figcaption className="min-w-0 flex-1 text-sm leading-relaxed text-muted">{demo.caption}</figcaption>
        {result && (
          <button type="button" onClick={() => setPaused(!isPaused)} className="btn btn-quiet -mt-1.5 shrink-0 text-sm">
            {isPaused ? "Play" : "Pause"}
          </button>
        )}
      </div>
    </figure>
  );
}
