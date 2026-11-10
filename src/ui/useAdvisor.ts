"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AdviceRequest, Suggestion } from "@/core/ai/advisor";
import type { ControlState, GameId } from "@/core/game";
import type { PotFound } from "@/core/lessons/solver";
import type { SimParams } from "@/core/sim/params";
import type { Body } from "@/core/types";
import { handleAdvisorRequest } from "@/workers/handler";
import type { AdvisorRequest, AdvisorResponse } from "@/workers/protocol";

/** Omit that distributes over a union, so each request kind keeps its own fields. */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/** The advisor normally answers within a few seconds, even on a full table. */
const ADVISOR_TIMEOUT_MS = 30_000;

type Pending = { req: AdvisorRequest; resolve: (r: AdvisorResponse) => void };

/**
 * Talks to the advisor Web Worker so searching for shots never freezes the page. If workers are unavailable (or the
 * worker fails to start) the same handler runs on the main thread instead, after yielding once so the UI can update.
 */
export function useAdvisor() {
  const workerRef = useRef<Worker | null>(null);
  const failed = useRef(false);
  const nextId = useRef(1);
  const pending = useRef(new Map<number, Pending>());

  const fallBack = useCallback(() => {
    failed.current = true;
    workerRef.current?.terminate();
    workerRef.current = null;
    for (const [id, p] of pending.current) {
      pending.current.delete(id);
      setTimeout(() => p.resolve(handleAdvisorRequest(p.req)), 0);
    }
  }, []);

  const worker = useCallback((): Worker | null => {
    if (failed.current) return null;
    if (workerRef.current) return workerRef.current;
    try {
      const w = new Worker(new URL("../workers/advisor.worker.ts", import.meta.url), { type: "module" });
      w.onmessage = (e: MessageEvent<AdvisorResponse>) => {
        const p = pending.current.get(e.data.id);
        if (p) {
          pending.current.delete(e.data.id);
          p.resolve(e.data);
        }
      };
      w.onerror = () => fallBack();
      workerRef.current = w;
      return w;
    } catch {
      failed.current = true;
      return null;
    }
  }, [fallBack]);

  const send = useCallback(
    (req: DistributiveOmit<AdvisorRequest, "id">) =>
      new Promise<AdvisorResponse>((resolve) => {
        const full = { ...req, id: nextId.current++ } as AdvisorRequest;
        const w = worker();
        if (!w) {
          setTimeout(() => resolve(handleAdvisorRequest(full)), 0);
          return;
        }
        pending.current.set(full.id, { req: full, resolve });
        w.postMessage(full);
        // A stuck worker must not leave the screen "thinking" for ever.
        setTimeout(() => {
          if (pending.current.delete(full.id)) resolve({ id: full.id, kind: "error", message: "timed out" });
        }, ADVISOR_TIMEOUT_MS);
      }),
    [worker],
  );

  useEffect(() => {
    const map = pending.current;
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      map.clear();
    };
  }, []);

  const suggest = useCallback(
    async (gameId: GameId, request: AdviceRequest): Promise<Suggestion | null> => {
      const r = await send({ kind: "suggest", gameId, request });
      return r.kind === "suggest" ? r.suggestion : null;
    },
    [send],
  );

  const solve = useCallback(
    async (gameId: GameId, lessonId: string, params?: SimParams): Promise<ControlState | null> => {
      const r = await send({ kind: "solve", gameId, lessonId, params });
      return r.kind === "solve" ? r.controls : null;
    },
    [send],
  );

  const findPot = useCallback(
    async (gameId: GameId, bodies: Body[], targets: string[], params?: SimParams): Promise<PotFound | null> => {
      const r = await send({ kind: "findPot", gameId, bodies, targets, params });
      return r.kind === "findPot" ? r.pot : null;
    },
    [send],
  );

  return { suggest, solve, findPot };
}
