"use client";

import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import type { Body, Table } from "@/core/types";
import type { Project } from "@/ui/fx/bus";
import type { PaintFn } from "../paint";
import { drawScene, renderTableLayer, type Marker, type Scene } from "./draw";
import { fitViewport, toScreen, toTable, type Viewport } from "./geometry";
import type { GameTheme } from "./theme";

export interface PullHandlers {
  /** A press on the table; true if it grabbed the striker. `tolerance` is the grab distance in metres, `screen` the press in pixels. */
  start: (p: { x: number; y: number }, tolerance: number, screen: { x: number; y: number }) => boolean;
  /** The pointer's position on the table, in views where it can reach behind the striker. */
  move: (p: { x: number; y: number }) => void;
  /** Power directly, from 0 to 1, for the behind-the-ball view where the pointer cannot get behind the striker. */
  power: (k: number) => void;
  /** The pointer let go, or was cancelled when `fire` is false. True if the shot should be played. */
  end: (fire: boolean) => boolean;
}

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
  /** Grab the striker and pull back to aim and set the power; let go to shoot. */
  pull?: PullHandlers;
  onPullShoot?: () => void;
  /** Filled with a function that repaints immediately, so animation can bypass React rendering. */
  paintRef: MutableRefObject<PaintFn | null>;
  /** Filled with a function that turns a table position into pixels in this view. */
  projectRef?: MutableRefObject<Project | null>;
  label: string;
}

/** How close to the striker a press counts as grabbing it, in pixels: a comfortable fingertip. */
const GRAB_PX = 26;

/** How many striker positions the playback trail keeps. */
const TRAIL = 60;

/** Game-agnostic 2D table view. All per-frame drawing happens through `paintRef`, never through React state. */
export function TableCanvas({ table, theme, strikerId, bodies, displayRef, aiming, markers, onPoint, pull, onPullShoot, paintRef, projectRef, label }: Props) {
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
    if (!projectRef) return;
    projectRef.current = (p) => (stage.current ? toScreen(stage.current.vp, p) : null);
    return () => {
      projectRef.current = null;
    };
  }, [projectRef]);

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

  const pointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const vp = stage.current?.vp;
    if (!vp) return null;
    const r = e.currentTarget.getBoundingClientRect();
    return toTable(vp, e.clientX - r.left, e.clientY - r.top);
  };
  const pulling = useRef(false);
  const release = (fire: boolean) => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pull?.end(fire)) onPullShoot?.();
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
          const p = pointer(e);
          if (!p) return;
          const r = e.currentTarget.getBoundingClientRect();
          if (pull?.start(p, GRAB_PX / stage.current!.vp.scale, { x: e.clientX - r.left, y: e.clientY - r.top })) pulling.current = true;
          else onPoint?.(p);
        }}
        onPointerMove={(e) => {
          if (!e.buttons) return;
          const p = pointer(e);
          if (!p) return;
          if (pulling.current) pull?.move(p);
          else onPoint?.(p);
        }}
        onPointerUp={() => release(true)}
        onPointerCancel={() => release(false)}
      />
    </div>
  );
}
