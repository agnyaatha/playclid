"use client";

import { FxLayer } from "./fx/FxLayer";
import type { useTableSession } from "./useTableSession";

/** Everything drawn over the table on every screen: effects, and the power meter while pulling back. */
export function TableOverlay({ session }: { session: ReturnType<typeof useTableSession> }) {
  const { meter, controls, input } = session;
  return (
    <>
      <FxLayer projectRef={session.projectRef} />
      {meter && (
        <div className="power-meter" style={{ left: meter.x, top: Math.max(meter.y - 56, 8) }} role="meter" aria-label="Power" aria-valuemin={0} aria-valuemax={1} aria-valuenow={controls.power}>
          <span className="tabular-nums">{(controls.power * input.maxSpeed).toFixed(1)} m/s</span>
          <span className="power-track">
            <span className="power-fill" style={{ width: `${controls.power * 100}%` }} />
          </span>
        </div>
      )}
    </>
  );
}

/** A notice over the top of the table, for things the player has to act on or should not miss. */
export function TableBanner({ tone, title, onClose, children }: { tone: "bad" | "note"; title?: string; onClose?: () => void; children?: React.ReactNode }) {
  return (
    <div role="status" className={`table-banner ${tone === "bad" ? "border-bad/60" : "border-brass/60"}`}>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className="text-muted [&_strong]:text-ivory">{children}</div>
      </div>
      {onClose && (
        <button type="button" aria-label="Dismiss" onClick={onClose} className="btn btn-quiet !min-h-7 !px-1.5 text-base">
          ×
        </button>
      )}
    </div>
  );
}
