import { suggestShot } from "@/core/ai/advisor";
import { findPot, findSolution } from "@/core/lessons/solver";
import { getGame } from "@/games/registry";
import type { AdvisorRequest, AdvisorResponse } from "./protocol";

/** Handle one advisor request. The worker and the main-thread fallback both call this, so they cannot differ. */
export function handleAdvisorRequest(req: AdvisorRequest): AdvisorResponse {
  try {
    const { game, lessons } = getGame(req.gameId);
    const table = game.createTable();
    if (req.kind === "suggest") {
      return { id: req.id, kind: "suggest", suggestion: suggestShot(game, table, req.request) };
    }
    if (req.kind === "findPot") {
      return { id: req.id, kind: "findPot", pot: findPot(game, table, req.bodies, req.targets, req.params) };
    }
    const lesson = lessons.find((l) => l.id === req.lessonId);
    if (!lesson || lesson.kind !== "drill") return { id: req.id, kind: "solve", controls: null };
    return { id: req.id, kind: "solve", controls: findSolution(game, table, lesson, req.params)?.controls ?? null };
  } catch (e) {
    return { id: req.id, kind: "error", message: e instanceof Error ? e.message : String(e) };
  }
}
