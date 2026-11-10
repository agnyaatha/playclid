"use client";

import { useEffect, useMemo, useRef } from "react";
import { stateAt } from "@/core/sim/playback";
import type { Body } from "@/core/types";
import { snooker, snookerShot } from "@/games/snooker";
import { snookerTheme } from "@/games/snooker/theme";
import { TableCanvas } from "@/views/2d/TableCanvas";
import { styleTable } from "@/views/appearance";
import type { PaintFn } from "@/views/paint";
import { useAppTheme } from "./ThemeButton";

/** The landing page's signature: the real engine playing break-offs on a loop. Static under reduced motion. */
export function HeroTable() {
  const { theme, colourTable } = useAppTheme();
  const table = useMemo(() => snooker.createTable(), []);
  const start = useMemo(() => snooker.createInitialBodies(table), [table]);
  const paintRef = useRef<PaintFn | null>(null);
  const displayRef = useRef<Body[] | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let timer = 0;
    let shot = 0;
    let stopped = false;

    const run = () => {
      if (stopped) return;
      // A hard shot up the table, just off-line so the white misses the brown and opens the pack.
      const aim = Math.PI / 2 + 0.082 + (shot++ % 5) * 0.0035;
      const result = snooker.simulate(table, start, snookerShot({ aim, speed: 4.6, sideOffset: 0, vertOffset: 0.1 }));
      let t = 0;
      let last = performance.now();
      const step = (now: number) => {
        t += Math.min(0.05, (now - last) / 1000) * 1.15;
        last = now;
        displayRef.current = stateAt(result, t, snooker.params.cloth);
        paintRef.current?.();
        if (t < Math.min(result.duration, 7)) raf = requestAnimationFrame(step);
        else timer = window.setTimeout(run, 900);
      };
      raf = requestAnimationFrame(step);
    };
    timer = window.setTimeout(run, 500);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [table, start]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <TableCanvas table={table} theme={styleTable(snookerTheme, theme, colourTable)} strikerId="white" bodies={start} displayRef={displayRef} paintRef={paintRef} label="" />
    </div>
  );
}
