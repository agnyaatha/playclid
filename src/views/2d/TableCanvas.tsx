"use client";

import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import type { Body, Table } from "@/core/types";
import type { PaintFn } from "../paint";
import { drawScene, renderTableLayer, type Marker, type Scene } from "./draw";
import { fitViewport, toTable, type Viewport } from "./geometry";
import type { GameTheme } from "./theme";

interface Props {
  table: Table;
  theme: GameTheme;
  strikerId: string;
  /** Resting bodies; replaced on screen by `displayRef.current` while a shot is playing. */
  bodies: Body[];
  displayRef: RefObject<Body[] | null>;
  /** Aim overlay; leave undefined while a shot plays. */
  aiming?: Scene["aiming"];
  /** Lesson targets drawn on the cloth. */
  markers?: Marker[];
  /** The player drags to aim: receives the pointer position in table coordinates. */
  onPoint?: (p: { x: number; y: number }) => void;
  /** Filled with a function that repaints immediately, so animation can bypass React rendering. */
  paintRef: MutableRefObject<PaintFn | null>;
  label: string;
}

/** How many striker positions the playback trail keeps. */
const TRAIL = 60;

/** Game-agnostic 2D table view. All per-frame drawing happens through `paintRef`, never through React state. */
export function TableCanvas({ table, theme, strikerId, bodies, displayRef, aiming, markers, onPoint, paintRef, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const stage = useRef<{ w: number; h: number; dpr: number; vp: Viewport; layer: HTMLCanvasElement } | null>(null);
  const latest = useRef({ bodies, aiming, markers });
  const trail = useRef<{ x: number; y: number }[]>([]);

  const paint = useCallback<PaintFn>(() => {
    const ctx = canvasRef.current?.getContext("2d");
    const st = stage.current;
    if (!ctx || !st) return;
    const live = displayRef.current;
    if (live) {
      const s = live.find((b) => b.id === strikerId);
      if (s && s.state !== "pocketed") {
        trail.current.push({ x: s.position.x, y: s.position.y });
        if (trail.current.length > TRAIL) trail.current.shift();
      }
    } else {
      trail.current = [];
    }
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    drawScene(ctx, st.vp, st.w, st.h, st.dpr, st.layer, {
      table,
      theme,
      cueId: strikerId,
      bodies: live ?? latest.current.bodies,
      aiming: latest.current.aiming,
      markers: latest.current.markers,
      trail: live ? trail.current : undefined,
    });
  }, [table, theme, strikerId, displayRef]);

  useEffect(() => {
    paintRef.current = paint;
    return () => {
      paintRef.current = null;
    };
  }, [paint, paintRef]);

  useEffect(() => {
    latest.current = { bodies, aiming, markers };
    paint();
  }, [bodies, aiming, markers, paint]);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const resize = () => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (w === 0 || h === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const vp = fitViewport(w, h, table, theme.frame);
      stage.current = { w, h, dpr, vp, layer: renderTableLayer(vp, w, h, dpr, table, theme) };
      paint();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    return () => ro.disconnect();
  }, [paint, table, theme]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const vp = stage.current?.vp;
    if (!vp || !onPoint) return;
    const r = e.currentTarget.getBoundingClientRect();
    onPoint(toTable(vp, e.clientX - r.left, e.clientY - r.top));
  };

  return (
    <div ref={boxRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        tabIndex={0}
        aria-label={label}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          point(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons) point(e);
        }}
      />
    </div>
  );
}
