import type { Table } from "@/core/types";
import { aimDirection } from "./coords";

export type CameraMode = "auto" | "pov" | "top";

export interface Pose {
  position: [number, number, number];
  target: [number, number, number];
  /** Camera up vector. Top-down uses it to keep baulk on the left, matching the 2D view. */
  up: [number, number, number];
}

export const FOV = 40;

/** Height at which a top-down camera sees the whole table with a margin for the rails. */
export function topHeight(aspect: number, table: Table, fovDeg = FOV, margin = 0.22): number {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  return Math.max((table.length / 2 + margin) / (t * aspect), (table.width / 2 + margin) / t);
}

export function topPose(aspect: number, table: Table, margin = 0.22): Pose {
  return {
    position: [table.length / 2, topHeight(aspect, table, FOV, margin), table.width / 2],
    target: [table.length / 2, 0, table.width / 2],
    up: [0, 0, -1],
  };
}

/** A long cue table is seen low along the line of aim. */
const CUE_VIEW = { back: 0.8, height: 0.52, ahead: 0.95 };
/** A square board is seen whole from over the player's shoulder, in multiples of its side. */
const BOARD_VIEW = { back: 0.66, height: 0.8, ahead: 0.36 };
/** The narrowest view at which the board's near corners fit without moving the camera back. */
const BOARD_ASPECT = 1.7;

/** Eye behind the striker on the aim line, a little above the cloth, looking down the line of aim. */
export function povPose(striker: { x: number; y: number }, aim: number, scale = 1, view = CUE_VIEW): Pose {
  const [dx, dz] = aimDirection(aim);
  const sx = striker.y;
  const sz = striker.x;
  const back = view.back * scale;
  const height = view.height * scale;
  const ahead = view.ahead * scale;
  return {
    position: [sx - dx * back, height, sz - dz * back],
    target: [sx + dx * ahead, 0.02, sz + dz * ahead],
    up: [0, 1, 0],
  };
}

/** The pose for a mode; "auto" aims from behind the cue ball and rises overhead while balls move. */
export function poseFor(
  mode: CameraMode,
  playing: boolean,
  aspect: number,
  table: Table,
  striker: { x: number; y: number } | null,
  aim: number,
  frame = 0.2,
): Pose {
  const top = mode === "top" || (mode === "auto" && playing) || !striker;
  if (top) return topPose(aspect, table, frame + 0.02);
  if (table.width === table.length) return povPose(striker!, aim, table.length * Math.max(1, BOARD_ASPECT / aspect), BOARD_VIEW);
  return povPose(striker!, aim, Math.min(1, Math.max(table.width, table.length) / 2.6));
}

const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const mix3 = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] => [
  mix(a[0], b[0], k),
  mix(a[1], b[1], k),
  mix(a[2], b[2], k),
];

export function lerpPose(a: Pose, b: Pose, k: number): Pose {
  return { position: mix3(a.position, b.position, k), target: mix3(a.target, b.target, k), up: mix3(a.up, b.up, k) };
}

export function poseDistance(a: Pose, b: Pose): number {
  const d = (p: [number, number, number], q: [number, number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  return Math.max(d(a.position, b.position), d(a.target, b.target), d(a.up, b.up));
}
