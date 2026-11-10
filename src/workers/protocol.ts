import type { AdviceRequest, Suggestion } from "@/core/ai/advisor";
import type { ControlState, GameId } from "@/core/game";
import type { PotFound } from "@/core/lessons/solver";
import type { SimParams } from "@/core/sim/params";
import type { Body } from "@/core/types";

/** Messages between the UI and the advisor worker. Everything is plain data so it can cross the thread boundary. */
export type AdvisorRequest =
  | { id: number; kind: "suggest"; gameId: GameId; request: AdviceRequest }
  | { id: number; kind: "solve"; gameId: GameId; lessonId: string; params?: SimParams }
  | { id: number; kind: "findPot"; gameId: GameId; bodies: Body[]; targets: string[]; params?: SimParams };

export type AdvisorResponse =
  | { id: number; kind: "suggest"; suggestion: Suggestion | null }
  | { id: number; kind: "solve"; controls: ControlState | null }
  | { id: number; kind: "findPot"; pot: PotFound | null }
  | { id: number; kind: "error"; message: string };
