export interface TablePoint {
  x: number;
  y: number;
}

/** Turns a table position into pixels inside the table box, for whichever view is showing. */
export type Project = (p: TablePoint) => TablePoint | null;

export type FxEvent =
  | { kind: "glow"; at: TablePoint }
  | { kind: "float"; at: TablePoint; text: string }
  | { kind: "toast"; title: string; detail?: string }
  | { kind: "verdict"; text: string; tone: "good" | "bad" | "note" }
  | { kind: "confetti" };

const decorative = new Set<FxEvent["kind"]>(["glow", "float", "confetti"]);

/** Hands one-off effects to the overlay without re-rendering the screen that raised them. */
class FxBus {
  /** Set from the player's settings; information such as verdicts is always delivered. */
  celebrations = true;
  private listeners = new Set<(e: FxEvent) => void>();

  subscribe(listener: (e: FxEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: FxEvent) {
    if (decorative.has(event.kind) && (!this.celebrations || prefersReducedMotion())) return;
    this.listeners.forEach((l) => l(event));
  }
}

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const tableFx = new FxBus();
