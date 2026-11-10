"use client";

import { useMemo } from "react";
import type { Game } from "@/core/game";
import { usePref } from "@/core/prefs/usePref";
import { scaleCloth } from "@/core/sim/params";

export const CLOTH_SCALE_MIN = 0.5;
export const CLOTH_SCALE_MAX = 1.6;

const isScale = (v: unknown): v is number => typeof v === "number" && v >= CLOTH_SCALE_MIN && v <= CLOTH_SCALE_MAX;

/** The game's physics with the player's table-speed setting applied (1 = published values; below 1 is a faster cloth). */
export function useSimParams(game: Game) {
  const [scale, setScale] = usePref<number>("clothScale", 1, isScale);
  const params = useMemo(() => scaleCloth(game.params, scale), [game, scale]);
  return { params, scale, setScale };
}
