"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ControlState, Game, GameId } from "@/core/game";
import { usePref } from "@/core/prefs/usePref";
import type { AidName } from "@/core/lessons/schema";
import type { Body, ShotResult, Table } from "@/core/types";
import { getGame } from "@/games/registry";
import type { AimAids } from "@/views/2d/draw";
import { predictShot } from "@/views/2d/prediction";
import type { PaintFn } from "@/views/paint";
import { useShotPlayer } from "./useShotPlayer";
import { useSimParams } from "./useSimParams";

const DEFAULT_AIDS: AimAids = { aimLine: true, ghostBall: true, prediction: true };
const isAids = (v: unknown): v is AimAids =>
  !!v && typeof v === "object" && ["aimLine", "ghostBall", "prediction"].every((k) => typeof (v as Record<string, unknown>)[k] === "boolean");

interface Options {
  gameId: GameId;
  /** The starting position. */
  makeInitial: (game: Game, table: Table) => Body[];
  /** The starting controls, once the position is known. */
  makeControls?: (game: Game, bodies: Body[]) => ControlState;
  /** Something other than playback stops the player shooting (a finished attempt, the computer's turn). */
  blocked?: boolean;
  /** Aids this screen permits; all of them when omitted. */
  allowedAids?: AidName[];
}

/**
 * Everything a table screen shares: the game, position, controls, playback, physics settings and the aim preview.
 * Free practice, drills and break drills differ only in what they do around a shot.
 */
export function useTableSession({ gameId, makeInitial, makeControls, blocked = false, allowedAids }: Options) {
  const { game, theme } = getGame(gameId);
  const { input, rules } = game;
  const table = useMemo(() => game.createTable(), [game]);
  const [initial] = useState(() => makeInitial(game, table));
  const [bodies, setBodies] = useState<Body[]>(initial);
  const [controls, setControls] = useState<ControlState>(
    () => makeControls?.(game, initial) ?? { aim: input.defaultAim, power: 0.35, spinX: 0, spinY: 0 },
  );
  const [aids, setAids] = usePref<AimAids>("aids", DEFAULT_AIDS, isAids);
  const { params: simParams, scale: clothScale, setScale: setClothScale } = useSimParams(game);

  const paintRef = useRef<PaintFn | null>(null);
  const player = useShotPlayer(game, paintRef, simParams);

  const shown = useMemo(() => game.place?.(bodies, controls) ?? bodies, [game, bodies, controls]);
  const striker = shown.find((b) => b.id === input.strikerId);
  const canShoot = !!striker && striker.state !== "pocketed" && !player.playing && !blocked;

  const allowedKey = allowedAids?.join() ?? "all";
  const effectiveAids = useMemo<AimAids>(() => {
    const allowed = allowedKey === "all" ? null : allowedKey.split(",");
    const on = (k: AidName) => aids[k] && (!allowed || allowed.includes(k));
    return { aimLine: on("aimLine"), ghostBall: on("ghostBall"), prediction: on("prediction") };
  }, [aids, allowedKey]);
  const anyAid = effectiveAids.aimLine || effectiveAids.ghostBall || effectiveAids.prediction;

  const prediction = useMemo(
    () => (canShoot && anyAid ? predictShot(game, table, shown, input.buildShot(controls), simParams) : null),
    [canShoot, anyAid, game, table, shown, input, controls, simParams],
  );

  const aiming = useMemo(
    () => (canShoot ? { aim: controls.aim, power: controls.power, prediction, aids: effectiveAids } : undefined),
    [canShoot, controls.aim, controls.power, prediction, effectiveAids],
  );

  const patch = useCallback((p: Partial<ControlState>) => setControls((c) => ({ ...c, ...p })), []);
  const nudgeDegrees = useCallback((deg: number) => setControls((c) => ({ ...c, aim: c.aim + (deg * Math.PI) / 180 })), []);
  const onAimDelta = useCallback((rad: number) => setControls((c) => ({ ...c, aim: c.aim + rad })), []);

  /** Turn the aim towards a point on the table. */
  const aimAt = (p: { x: number; y: number }) => {
    if (!striker || !canShoot) return;
    const dx = p.x - striker.position.x;
    const dy = p.y - striker.position.y;
    if (Math.hypot(dx, dy) > 0.02) patch({ aim: Math.atan2(dy, dx) });
  };

  /** Run a shot from a position, applying this game's striker placement and the player's table-speed setting. */
  const simulate = (start: Body[], c: ControlState): ShotResult =>
    game.simulate(table, game.place?.(start, c) ?? start, input.buildShot(c), { params: simParams });

  const tableProps = {
    table,
    theme,
    strikerId: input.strikerId,
    bodies: shown,
    displayRef: player.displayRef,
    paintRef,
    aiming,
    onAimDelta,
  };

  return {
    game,
    input,
    rules,
    table,
    initial,
    bodies,
    setBodies,
    shown,
    striker,
    controls,
    setControls,
    patch,
    nudgeDegrees,
    aids,
    setAids,
    simParams,
    clothScale,
    setClothScale,
    canShoot,
    simulate,
    aimAt,
    tableProps,
    ...player,
  };
}

/** Arrow keys fine-tune the aim (Shift for bigger steps) and Enter on the table shoots. */
export function tableKeys(e: React.KeyboardEvent, nudge: (deg: number) => void, shoot: () => void) {
  const step = e.shiftKey ? 1 : 0.1;
  if (e.key === "ArrowLeft") nudge(step);
  else if (e.key === "ArrowRight") nudge(-step);
  else if (e.key === "Enter" && (e.target as HTMLElement).tagName === "CANVAS") shoot();
  else return;
  e.preventDefault();
}
