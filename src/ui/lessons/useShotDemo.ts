"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ControlState } from "@/core/game";
import { prefersReducedMotion } from "../fx/bus";
import type { useTableSession } from "../useTableSession";

export type DemoStep = "prepare" | "aim" | "power" | "shot";

/** The short way round from one angle to another, in radians. */
export function angleDelta(from: number, to: number): number {
  const d = (to - from) % (2 * Math.PI);
  return d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d;
}

const AIM_MS = 1300;
const POWER_MS = 1100;
/** How long each stage rests on screen so the caption can be read. */
const HOLD_MS = 900;
const SLOW_MOTION = 0.6;
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * Walks through a good shot on the real table: sweep the aim onto it, wind up the power, then play it slowly with
 * captions. It scores nothing and puts the player's controls back afterwards.
 */
export function useShotDemo(session: ReturnType<typeof useTableSession>, solve: () => Promise<ControlState | null>, onFinish: (found: boolean) => void) {
  const [step, setStep] = useState<DemoStep | null>(null);
  const [plan, setPlan] = useState<ControlState | null>(null);
  const run = useRef(0);
  const raf = useRef(0);
  const saved = useRef<ControlState | null>(null);

  /** Move the controls smoothly; resolves false if the demo was stopped meanwhile. */
  const tween = useCallback((ms: number, id: number, apply: (k: number) => void) => {
    return new Promise<boolean>((resolve) => {
      const duration = prefersReducedMotion() ? 0 : ms;
      const started = performance.now();
      const frame = (now: number) => {
        if (run.current !== id) return resolve(false);
        const t = duration === 0 ? 1 : Math.min(1, (now - started) / duration);
        apply(ease(t));
        if (t < 1) raf.current = requestAnimationFrame(frame);
        else setTimeout(() => resolve(run.current === id), HOLD_MS);
      };
      raf.current = requestAnimationFrame(frame);
    });
  }, []);

  const { setControls, play, simulate, initial, controls } = session;

  const start = async () => {
    const id = ++run.current;
    const before = controls;
    saved.current = before;
    setStep("prepare");
    const shot = await solve();
    if (run.current !== id) return;
    if (!shot) {
      setStep(null);
      onFinish(false);
      return;
    }
    setPlan(shot);

    setStep("aim");
    const turn = angleDelta(before.aim, shot.aim);
    setControls({ ...shot, aim: before.aim, power: 0.06 });
    if (!(await tween(AIM_MS, id, (k) => setControls({ ...shot, aim: before.aim + turn * k, power: 0.06 })))) return;

    setStep("power");
    if (!(await tween(POWER_MS, id, (k) => setControls({ ...shot, power: 0.06 + (shot.power - 0.06) * k })))) return;

    setStep("shot");
    play(
      simulate(initial, shot),
      () => {
        if (run.current !== id) return;
        run.current++;
        setStep(null);
        setControls(before);
        onFinish(true);
      },
      SLOW_MOTION,
    );
  };

  const stop = () => {
    run.current++;
    cancelAnimationFrame(raf.current);
    if (step === "shot") session.skip();
    if (saved.current) setControls(saved.current);
    setStep(null);
  };

  useEffect(
    () => () => {
      run.current++;
      cancelAnimationFrame(raf.current);
    },
    [],
  );

  return { step, plan, start, stop };
}
