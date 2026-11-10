"use client";

import { useRef } from "react";

export interface Spin {
  /** Side offset as a fraction of ball radius; right is positive. */
  x: number;
  /** Vertical offset as a fraction of ball radius; up (follow) is positive. */
  y: number;
}

interface Props {
  value: Spin;
  onChange: (v: Spin) => void;
  /** Largest allowed offset before a miscue, as a fraction of ball radius. */
  maxOffset: number;
}

const SIZE = 120;
const C = SIZE / 2;
const BALL_R = 56;

/** The cue-ball face: tap where the tip should hit. The dashed ring marks the miscue limit. */
export function SpinPad({ value, onChange, maxOffset }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  const set = (e: React.PointerEvent) => {
    const box = ref.current!.getBoundingClientRect();
    const k = SIZE / box.width;
    let x = ((e.clientX - box.left) * k - C) / BALL_R;
    let y = -((e.clientY - box.top) * k - C) / BALL_R;
    const m = Math.hypot(x, y);
    if (m > maxOffset) {
      x = (x / m) * maxOffset;
      y = (y / m) * maxOffset;
    }
    onChange({ x, y });
  };

  const nudge = (dx: number, dy: number) => {
    let x = value.x + dx;
    let y = value.y + dy;
    const m = Math.hypot(x, y);
    if (m > maxOffset) {
      x = (x / m) * maxOffset;
      y = (y / m) * maxOffset;
    }
    onChange({ x, y });
  };

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-[7.5rem] w-[7.5rem] shrink-0 cursor-crosshair touch-none select-none rounded-full"
      role="slider"
      tabIndex={0}
      aria-label="Where the cue tip strikes the ball. Arrow keys move it."
      aria-valuetext={`${Math.round(value.y * 100)} percent up, ${Math.round(value.x * 100)} percent right`}
      aria-valuenow={Math.round(value.y * 100)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        set(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons) set(e);
      }}
      onKeyDown={(e) => {
        const step = 0.05;
        const map: Record<string, [number, number]> = { ArrowUp: [0, step], ArrowDown: [0, -step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
        const d = map[e.key];
        if (!d) return;
        e.preventDefault();
        e.stopPropagation();
        nudge(d[0], d[1]);
      }}
    >
      <defs>
        <radialGradient id="spin-ball" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f0e9d8" />
          <stop offset="100%" stopColor="#a89d84" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={BALL_R} fill="url(#spin-ball)" />
      <line x1={C - BALL_R} y1={C} x2={C + BALL_R} y2={C} stroke="#8c8370" strokeOpacity="0.5" strokeDasharray="2 4" />
      <line x1={C} y1={C - BALL_R} x2={C} y2={C + BALL_R} stroke="#8c8370" strokeOpacity="0.5" strokeDasharray="2 4" />
      <circle cx={C} cy={C} r={BALL_R * maxOffset} fill="none" stroke="#b6452f" strokeWidth="1.2" strokeDasharray="4 3" />
      <circle cx={C + value.x * BALL_R} cy={C - value.y * BALL_R} r={7} fill="#2f6f9f" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}
