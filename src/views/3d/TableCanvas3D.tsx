"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import type { Body, Table } from "@/core/types";
import type { Marker, Scene } from "../2d/draw";
import type { PullHandlers } from "../2d/TableCanvas";
import type { GameTheme } from "../2d/theme";
import type { Project } from "@/ui/fx/bus";
import type { PaintFn } from "../paint";
import type { CameraMode } from "./camera";
import type { Scene3D } from "./Scene3D";

interface Props {
  table: Table;
  theme: GameTheme;
  strikerId: string;
  bodies: Body[];
  displayRef: RefObject<Body[] | null>;
  aiming?: Scene["aiming"];
  markers?: Marker[];
  cameraMode: CameraMode;
  /** Pointer position on the cloth in table coordinates (used in the overhead view). */
  onPoint?: (p: { x: number; y: number }) => void;
  pull?: PullHandlers;
  onPullShoot?: () => void;
  /** Horizontal drag in the behind-the-ball view: change of aim in radians, positive anticlockwise. */
  onAimDelta?: (radians: number) => void;
  paintRef: MutableRefObject<PaintFn | null>;
  projectRef?: MutableRefObject<Project | null>;
  label: string;
  /** Called once if WebGL cannot start or is lost, so the parent can fall back to the 2D view. */
  onUnavailable?: () => void;
}

/** Radians of aim per pixel dragged in the behind-the-ball view. */
const DRAG_SENSITIVITY = 0.0016;
/** How close to the striker a press grabs it, as a share of the table's short side. */
const GRAB_SHARE = 0.05;
/** In the behind-the-ball view, dragging down this share of the view's height is full power. */
const PULL_HEIGHT = 0.45;

/** React wrapper for Scene3D. Three.js is loaded on demand so the 2D-only pages stay light. */
export function TableCanvas3D({ table, theme, strikerId, bodies, displayRef, aiming, markers, cameraMode, onPoint, onAimDelta, pull, onPullShoot, paintRef, projectRef, label, onUnavailable }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene3D | null>(null);
  const rafRef = useRef(0);
  const latest = useRef({ bodies, aiming, markers, cameraMode });
  const lastX = useRef(0);
  const grabY = useRef(0);
  const pulling = useRef(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  // The parent passes a new closure each render; the scene must not be rebuilt because of that.
  const unavailable = useRef(onUnavailable);
  useEffect(() => {
    unavailable.current = onUnavailable;
  }, [onUnavailable]);

  const draw = useCallback(
    (simDt = 0) => {
      const scene = sceneRef.current;
      if (!scene) return false;
      const live = displayRef.current;
      return scene.render(live ?? latest.current.bodies, live !== null, simDt);
    },
    [displayRef],
  );

  /** Keep rendering until the camera has settled, then stop: nothing moves, nothing draws. */
  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = () => {
      rafRef.current = 0;
      if (draw(0)) rafRef.current = requestAnimationFrame(() => tickRef.current());
    };
  }, [draw]);
  const settle = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, []);

  const paint = useCallback<PaintFn>(
    (simDt = 0) => {
      if (draw(simDt)) settle();
    },
    [draw, settle],
  );

  useEffect(() => {
    paintRef.current = paint;
    return () => {
      paintRef.current = null;
    };
  }, [paint, paintRef]);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;

    const fail = () => {
      if (cancelled) return;
      setFailed(true);
      unavailable.current?.();
    };
    const onContextLost = (e: Event) => {
      e.preventDefault();
      fail();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    const start = async () => {
      try {
        const { Scene3D } = await import("./Scene3D");
        if (cancelled) return;
        const scene = new Scene3D(canvas, table, theme, strikerId);
        scene.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        sceneRef.current = scene;
        scene.resize(box.clientWidth, box.clientHeight, window.devicePixelRatio || 1);
        scene.setOverlay({ aiming: latest.current.aiming, markers: latest.current.markers, cameraMode: latest.current.cameraMode });
        paint();
        setReady(true);
      } catch {
        fail();
      }
    };
    void start();

    const ro = new ResizeObserver(() => {
      if (box.clientWidth === 0 || box.clientHeight === 0) return;
      sceneRef.current?.resize(box.clientWidth, box.clientHeight, window.devicePixelRatio || 1);
      paint();
    });
    ro.observe(box);

    return () => {
      cancelled = true;
      ro.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [table, theme, strikerId, paint]);

  useEffect(() => {
    if (!projectRef) return;
    projectRef.current = (p) => sceneRef.current?.project(p) ?? null;
    return () => {
      projectRef.current = null;
    };
  }, [projectRef]);

  useEffect(() => {
    latest.current = { bodies, aiming, markers, cameraMode };
    sceneRef.current?.setOverlay({ aiming, markers, cameraMode });
    paint();
  }, [bodies, aiming, markers, cameraMode, paint]);

  const behindBall = () => cameraMode === "pov" || (cameraMode === "auto" && displayRef.current === null);
  const release = (fire: boolean) => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pull?.end(fire)) onPullShoot?.();
  };

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[var(--muted)]">
        3D is not available in this browser, so the table has switched to 2D.
      </div>
    );
  }

  return (
    <div ref={boxRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full touch-none transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
        tabIndex={0}
        aria-label={label}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          lastX.current = e.clientX;
          grabY.current = e.clientY;
          const p = sceneRef.current?.pick(e.clientX, e.clientY);
          const r = e.currentTarget.getBoundingClientRect();
          if (p && pull?.start(p, Math.min(table.width, table.length) * GRAB_SHARE, { x: e.clientX - r.left, y: e.clientY - r.top })) {
            pulling.current = true;
            return;
          }
          if (!behindBall() && p) onPoint?.(p);
        }}
        onPointerMove={(e) => {
          if (!e.buttons) return;
          if (behindBall()) {
            onAimDelta?.(-(e.clientX - lastX.current) * DRAG_SENSITIVITY);
            lastX.current = e.clientX;
            if (pulling.current) pull?.power((e.clientY - grabY.current) / (e.currentTarget.clientHeight * PULL_HEIGHT));
            return;
          }
          const p = sceneRef.current?.pick(e.clientX, e.clientY);
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
