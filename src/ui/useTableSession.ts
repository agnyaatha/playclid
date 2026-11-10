"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ControlState, Game, GameId } from "@/core/game";
import { greatShot, milestoneCrossed, milestoneTitle, pottedBalls, shotVerdict } from "@/core/lessons/insight";
import { usePref } from "@/core/prefs/usePref";
import type { AidName } from "@/core/lessons/schema";
import type { Body, ShotResult, Table } from "@/core/types";
import { getGame } from "@/games/registry";
import type { AimAids } from "@/views/2d/draw";
import type { PullHandlers } from "@/views/2d/TableCanvas";
import { DEFAULT_GUIDES, PLAIN_GUIDES, predictShot, REACH_MAX, type GuideOptions } from "@/views/2d/prediction";
import { styleTable } from "@/views/appearance";
import type { PaintFn } from "@/views/paint";
import { logShot } from "./ActivityCard";
import { prefersReducedMotion, tableFx, type Project } from "./fx/bus";
import { DEFAULT_FX, isFxPrefs, type FxPrefs } from "./fx/prefs";
import { sound } from "./fx/sound";
import { useAppTheme } from "./ThemeButton";
import { useShotPlayer } from "./useShotPlayer";
import { useSimParams } from "./useSimParams";

const DEFAULT_AIDS: AimAids = { aimLine: true, ghostBall: true, prediction: true };
const isAids = (v: unknown): v is AimAids =>
  !!v && typeof v === "object" && ["aimLine", "ghostBall", "prediction"].every((k) => typeof (v as Record<string, unknown>)[k] === "boolean");

const isGuides = (v: unknown): v is GuideOptions => {
  const g = v as Partial<GuideOptions> | null;
  return !!g && typeof g.angles === "boolean" && typeof g.cushions === "boolean" && typeof g.reach === "number" && g.reach >= 1 && g.reach <= REACH_MAX;
};

/** Pulling back less than this does nothing, in metres (or as a share of full power). */
const PULL_MIN = 0.04;
/** Pulling back this share of the table's short side is full power. */
const PULL_RANGE = 0.5;
const clampPower = (k: number) => Math.min(1, Math.max(0.02, k));

interface Celebration {
  result: ShotResult;
  points?: number;
  foul?: boolean;
  breakBefore?: number;
  breakAfter?: number;
  /** A great shot may be replayed in slow motion here; off where the screen moves straight on. */
  replay?: boolean;
  /** Count the shot in the player's lifetime totals; off for the computer's shots. */
  log?: boolean;
}

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
  /** Show every aid regardless of the player's settings, for a demonstration. */
  forceAids?: boolean;
}

/**
 * Everything a table screen shares: the game, position, controls, playback, physics settings and the aim preview.
 * Free practice, drills and break drills differ only in what they do around a shot.
 */
export function useTableSession({ gameId, makeInitial, makeControls, blocked = false, allowedAids, forceAids = false }: Options) {
  const { game, theme: baseTheme } = getGame(gameId);
  const { theme: themeId, colourTable } = useAppTheme();
  const theme = styleTable(baseTheme, themeId, colourTable);
  const { input, rules } = game;
  const table = useMemo(() => game.createTable(), [game]);
  const [initial] = useState(() => makeInitial(game, table));
  const [bodies, setBodies] = useState<Body[]>(initial);
  const [controls, setControls] = useState<ControlState>(
    () => makeControls?.(game, initial) ?? { aim: input.defaultAim, power: 0.35, spinX: 0, spinY: 0 },
  );
  const [aids, setAids] = usePref<AimAids>("aids", DEFAULT_AIDS, isAids);
  const [guides, setGuides] = usePref<GuideOptions>("guides", DEFAULT_GUIDES, isGuides);
  const activeGuides = allowedAids ? PLAIN_GUIDES : guides;
  const { params: simParams, scale: clothScale, setScale: setClothScale } = useSimParams(game);

  const [fx, setFx] = usePref<FxPrefs>("fx", DEFAULT_FX, isFxPrefs);
  useEffect(() => {
    sound.configure(fx.sound, fx.volume);
    tableFx.celebrations = fx.celebrations;
  }, [fx]);

  const paintRef = useRef<PaintFn | null>(null);
  const projectRef = useRef<Project | null>(null);

  /** Sound and pocket glow, in step with the animation. Index -1 is the moment of the strike. */
  const onEvent = useCallback(
    (res: ShotResult, i: number) => {
      const speed = (b?: Body) => (b ? Math.hypot(b.velocity.x, b.velocity.y) : 0);
      if (i < 0) {
        sound.strike(speed(res.initial.find((b) => b.id === input.strikerId)));
        return;
      }
      const e = res.events[i];
      const before = i > 0 ? res.keyframes[i - 1] : res.initial;
      if (e.type === "collision") {
        const a = before.find((b) => b.id === e.a)!;
        const b = before.find((x) => x.id === e.b)!;
        sound.click(Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y), theme.shape === "disc");
      } else if (e.type === "cushion") {
        sound.thud(speed(before.find((b) => b.id === e.body)));
      } else if (e.type === "pocket") {
        sound.drop();
        const pocket = table.pockets.find((p) => p.id === e.pocket);
        if (pocket && !pocket.unmarked) tableFx.emit({ kind: "glow", at: pocket.position });
      }
    },
    [input, table, theme],
  );

  const player = useShotPlayer(game, paintRef, simParams, onEvent);

  const shown = useMemo(() => game.place?.(bodies, controls) ?? bodies, [game, bodies, controls]);
  const striker = shown.find((b) => b.id === input.strikerId);
  const canShoot = !!striker && striker.state !== "pocketed" && !player.playing && !blocked;

  const allowedKey = allowedAids?.join() ?? "all";
  const effectiveAids = useMemo<AimAids>(() => {
    const allowed = allowedKey === "all" ? null : allowedKey.split(",");
    const on = (k: AidName) => forceAids || (aids[k] && (!allowed || allowed.includes(k)));
    return { aimLine: on("aimLine"), ghostBall: on("ghostBall"), prediction: on("prediction") };
  }, [aids, allowedKey, forceAids]);
  const anyAid = effectiveAids.aimLine || effectiveAids.ghostBall || effectiveAids.prediction;

  const prediction = useMemo(
    () => (canShoot && anyAid ? predictShot(game, table, shown, input.buildShot(controls), simParams, activeGuides) : null),
    [canShoot, anyAid, game, table, shown, input, controls, simParams, activeGuides],
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

  const [meter, setMeter] = useState<{ x: number; y: number } | null>(null);
  const [pulled, setPulled] = useState(false);

  /** Pull back from the striker to aim and set the power, and let go to shoot. Letting go on the ball cancels. */
  const makePull = (enabled = canShoot): PullHandlers => ({
    start(p, tolerance, screen) {
      if (!enabled || !striker) return false;
      if (Math.hypot(p.x - striker.position.x, p.y - striker.position.y) > Math.max(striker.radius * 2.2, tolerance)) return false;
      setPulled(false);
      setMeter(screen);
      return true;
    },
    move(p) {
      if (!striker) return;
      const dx = striker.position.x - p.x;
      const dy = striker.position.y - p.y;
      const d = Math.hypot(dx, dy);
      setPulled(d > PULL_MIN);
      if (d > PULL_MIN) patch({ aim: Math.atan2(dy, dx), power: clampPower(d / (Math.min(table.width, table.length) * PULL_RANGE)) });
    },
    power(k) {
      setPulled(k > PULL_MIN);
      if (k > PULL_MIN) patch({ power: clampPower(k) });
    },
    end(fire) {
      setMeter(null);
      return fire && pulled;
    },
  });

  /** Run a shot from a position, applying this game's striker placement and the player's table-speed setting. */
  const simulate = (start: Body[], c: ControlState): ShotResult =>
    game.simulate(table, game.place?.(start, c) ?? start, input.buildShot(c), { params: simParams });

  /** Feedback once a shot has been judged: what happened, any points, and anything worth a fuss. */
  const celebrate = ({ result, points = 0, foul = false, breakBefore = 0, breakAfter = 0, replay = false, log = true }: Celebration) => {
    if (log) logShot(foul || game.noPotting ? 0 : pottedBalls(result, input.strikerId).length, breakAfter);
    if (!game.noPotting) tableFx.emit({ kind: "verdict", ...shotVerdict(result, input.strikerId, table, simParams.cloth) });
    if (foul) return;
    const lastPot = result.events.findLast((e) => e.type === "pocket" && e.body !== input.strikerId);
    const pocket = lastPot?.type === "pocket" ? table.pockets.find((p) => p.id === lastPot.pocket) : undefined;
    if (points > 0 && pocket) tableFx.emit({ kind: "float", at: pocket.position, text: `+${points}` });

    const milestone = milestoneCrossed(breakBefore, breakAfter);
    if (milestone !== null && fx.celebrations) {
      tableFx.emit({ kind: "toast", title: milestoneTitle(milestone), detail: "Keep it going" });
      if (milestone >= 50) tableFx.emit({ kind: "confetti" });
      sound.chime(milestone >= 100 ? 3 : milestone >= 50 ? 2 : 1);
    }

    const great = fx.celebrations ? greatShot(result, input.strikerId, table) : null;
    if (great) {
      if (milestone === null) tableFx.emit({ kind: "toast", title: great });
      if (replay && fx.replayGreat && !prefersReducedMotion()) player.play(result, undefined, 0.5);
    }
  };

  const tableProps = {
    table,
    theme,
    strikerId: input.strikerId,
    bodies: shown,
    displayRef: player.displayRef,
    paintRef,
    projectRef,
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
    guides,
    setGuides,
    fx,
    setFx,
    celebrate,
    projectRef,
    makePull,
    meter,
    /** Lessons fix the aids themselves, so they offer no aiming settings. */
    lesson: !!allowedAids,
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
