"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "./fx/bus";

const CHALK = 7;

/** Add a short-lived decoration to a button, removed as soon as its animation ends. */
function burst(host: Element, className: string, style: Record<string, string>) {
  const el = document.createElement("span");
  el.className = className;
  el.setAttribute("aria-hidden", "true");
  for (const [k, v] of Object.entries(style)) el.style.setProperty(k, v);
  el.addEventListener("animationend", () => el.remove());
  host.append(el);
}

/**
 * One listener for the whole app: every button gets a ripple like a ball impact from where it was pressed, and Shoot
 * also gets a cue strike and a puff of chalk.
 */
export function ButtonEffects() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const host = (e.target as Element).closest?.(".btn:not(:disabled), .chip, .tool");
      if (!host || prefersReducedMotion()) return;
      const r = host.getBoundingClientRect();
      burst(host, "fx-ripple", { left: `${e.clientX - r.left}px`, top: `${e.clientY - r.top}px`, "--size": `${Math.max(r.width, r.height) * 2}px` });
      if (!host.classList.contains("btn-shoot")) return;
      if (!host.hasAttribute("data-flick")) burst(host, "fx-cue", {});
      for (let i = 0; i < CHALK; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 18 + Math.random() * 26;
        burst(host, "fx-chalk", { left: `${e.clientX - r.left}px`, top: `${e.clientY - r.top}px`, "--dx": `${Math.cos(a) * d}px`, "--dy": `${Math.sin(a) * d}px` });
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
