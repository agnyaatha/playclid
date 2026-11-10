import { pocketAimPoint } from "../table";
import type { Table } from "../types";

const round = (n: number) => Math.round(n * 1e4) / 1e4;

/**
 * Ghost-ball layout for a drill: the object ball sits at `ball`, the pocket is where it must go, and the striker is
 * placed `distance` metres back along a line that meets the ghost ball at `cutDeg` to the pocket line (`side` picks
 * which way the striker is offset).
 */
export function cutLayout(
  table: Table,
  ballRadius: number,
  ball: { x: number; y: number },
  pocketId: string,
  cutDeg: number,
  distance: number,
  side: 1 | -1 = 1,
) {
  const pocket = pocketAimPoint(table.pockets.find((p) => p.id === pocketId)!);
  const len = Math.hypot(pocket.x - ball.x, pocket.y - ball.y);
  const u = { x: (pocket.x - ball.x) / len, y: (pocket.y - ball.y) / len };
  const ghost = { x: ball.x - u.x * 2 * ballRadius, y: ball.y - u.y * 2 * ballRadius };
  const th = (cutDeg * Math.PI * side) / 180;
  const a = { x: u.x * Math.cos(th) - u.y * Math.sin(th), y: u.x * Math.sin(th) + u.y * Math.cos(th) };
  const striker = { x: round(ghost.x - a.x * distance), y: round(ghost.y - a.y * distance) };
  return { striker, ghost, u };
}
