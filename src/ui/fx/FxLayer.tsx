"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { tableFx, type FxEvent, type Project } from "./bus";

type Live = FxEvent & { id: number; px?: { x: number; y: number } };

/** How long each effect stays on screen, in milliseconds. */
const LIFE: Record<FxEvent["kind"], number> = { glow: 800, float: 1300, toast: 2400, verdict: 4200, confetti: 2400 };
const CONFETTI = ["#d4a94e", "#f0e9d8", "#66cf98", "#ec7f68"];

/** Pot glows, floating points, toasts and confetti, drawn over the table and gone without touching the screen below. */
export function FxLayer({ projectRef }: { projectRef: RefObject<Project | null> }) {
  const [items, setItems] = useState<Live[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const unsubscribe = tableFx.subscribe((e) => {
      const id = nextId.current++;
      const px = "at" in e ? (projectRef.current?.(e.at) ?? undefined) : undefined;
      if ("at" in e && !px) return;
      setItems((all) => [...(e.kind === "verdict" ? all.filter((x) => x.kind !== "verdict") : all), { ...e, id, px }]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        setItems((all) => all.filter((x) => x.id !== id));
      }, LIFE[e.kind]);
      timers.add(timer);
    });
    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, [projectRef]);

  const at = (i: Live): CSSProperties => ({ left: i.px?.x, top: i.px?.y });
  const verdict = items.findLast((i) => i.kind === "verdict");

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {items.map((i) => {
        if (i.kind === "glow") return <span key={i.id} className="fx-glow" style={at(i)} />;
        if (i.kind === "float")
          return (
            <span key={i.id} className="fx-float display" style={at(i)}>
              {i.text}
            </span>
          );
        if (i.kind === "toast")
          return (
            <div key={i.id} className="fx-toast" role="status">
              <p className="display text-3xl font-semibold leading-none sm:text-4xl">{i.title}</p>
              {i.detail && <p className="mt-1 text-sm text-muted">{i.detail}</p>}
            </div>
          );
        if (i.kind === "confetti") return <Confetti key={i.id} />;
        return null;
      })}
      {verdict?.kind === "verdict" && (
        <p key={verdict.id} role="status" className={`fx-verdict ${verdict.tone === "good" ? "border-good/60" : verdict.tone === "bad" ? "border-bad/60" : "border-line"}`}>
          {verdict.text}
        </p>
      )}
    </div>
  );
}

/** Random once per mount, which is the point of confetti, so it is decided when the state is created. */
function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 36 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      background: CONFETTI[i % CONFETTI.length],
      animationDelay: `${Math.random() * 0.4}s`,
      "--drift": `${(Math.random() - 0.5) * 140}px`,
      "--spin": `${Math.random() * 900 - 450}deg`,
    })),
  );
  return (
    <>
      {pieces.map((s, i) => (
        <span key={i} className="fx-confetti" style={s as CSSProperties} />
      ))}
    </>
  );
}
