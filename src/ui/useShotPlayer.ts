"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { Game } from "@/core/game";
import { usePref } from "@/core/prefs/usePref";
import { stateAt } from "@/core/sim/playback";
import type { Body, ShotResult } from "@/core/types";
import type { SimParams } from "@/core/sim/params";
import type { PaintFn } from "@/views/paint";

/** Longest real time one animation frame may advance (s). */
const MAX_FRAME_DT = 0.1;

const isSpeed = (v: unknown): v is number => v === 0.5 || v === 1 || v === 2 || v === 4;

/**
 * Plays a finished ShotResult as an animation. Frames are drawn through `paintRef` straight from the closed-form
 * motion, so React only re-renders when playback starts or stops.
 */
export function useShotPlayer(game: Game, paintRef: MutableRefObject<PaintFn | null>, params?: SimParams, onEvent?: (result: ShotResult, index: number) => void) {
  const displayRef = useRef<Body[] | null>(null);
  const rafRef = useRef(0);
  const speedRef = useRef(1);
  const skipRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = usePref<number>("speed", 1, isSpeed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const play = useCallback(
    (result: ShotResult, onDone?: () => void, rate = 1) => {
      cancelAnimationFrame(rafRef.current);
      skipRef.current = false;
      setPlaying(true);
      onEvent?.(result, -1);
      let t = 0;
      let next = 0;
      let last = performance.now();
      const step = (now: number) => {
        // A frame's timestamp can precede the call that queued it, and a hidden tab pauses frames entirely: clamp the
        // step so neither runs time backwards nor jumps the shot to its end (firing every sound at once) on return.
        const frameDt = Math.min(Math.max((now - last) / 1000, 0), MAX_FRAME_DT);
        const simDt = frameDt * speedRef.current * rate;
        t += simDt;
        last = now;
        // Before the end check: a shot often finishes on its last event, such as the final pot.
        while (!skipRef.current && next < result.events.length && result.events[next].t <= t) onEvent?.(result, next++);
        if (skipRef.current || t >= result.duration) {
          displayRef.current = null;
          setPlaying(false);
          onDone?.();
          return;
        }
        displayRef.current = stateAt(result, t, (params ?? game.params).cloth);
        paintRef.current?.(simDt);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [game, paintRef, params, onEvent],
  );

  const skip = useCallback(() => {
    skipRef.current = true;
  }, []);

  return { displayRef, playing, speed, setSpeed, play, skip };
}
