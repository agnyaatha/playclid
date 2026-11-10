"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

export function Stars({ n, size = "text-base", animate = false }: { n: number; size?: string; animate?: boolean }) {
  return (
    <span role="img" aria-label={`${n} of 3 stars`} className={`${size} leading-none tracking-tight text-brass`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={animate ? "fx-star" : undefined} style={animate ? { animationDelay: `${0.15 + i * 0.25}s` } : undefined}>
          ★
        </span>
      ))}
      <span className="text-raised">{"★".repeat(3 - n)}</span>
    </span>
  );
}

/** A modal on the native dialog: a drawer from the right by default, or a centred card. */
export function Sheet({ open, onClose, title, centre = false, children }: { open: boolean; onClose: () => void; title: string; centre?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`sheet ${centre ? "sheet-centre" : ""}`}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="display text-xl font-semibold">{title}</h2>
            <button type="button" className="btn btn-quiet !min-h-9" onClick={onClose}>
              Close
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** A native range styled by the design system; the track fill follows the value. */
export function Slider({
  id,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <input
      id={id}
      type="range"
      className="range"
      style={{ "--fill": fill } as CSSProperties}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function Field({ label, value, htmlFor, children }: { label: string; value?: ReactNode; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[0.8125rem]">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="font-medium">
            {label}
          </label>
        ) : (
          <span className="font-medium">{label}</span>
        )}
        {value !== undefined && <span className="tabular-nums text-muted">{value}</span>}
      </div>
      {children}
    </div>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

export function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-10 items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/** Five balls of a Newton's cradle clicking back and forth, for anything the player has to wait on. */
export function Thinking({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="cradle" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} />
        ))}
      </span>
      {label}
    </span>
  );
}

/** A row of mutually exclusive tabs or modes, with a highlight that rolls across to the chosen one. */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const seg = box.current;
    if (!seg) return;
    const place = () => {
      const on = seg.querySelector<HTMLElement>('button[aria-pressed="true"]');
      const thumb = seg.querySelector<HTMLElement>(".seg-thumb");
      if (!on || !thumb) return;
      thumb.style.width = `${on.offsetWidth}px`;
      thumb.style.transform = `translateX(${on.offsetLeft}px)`;
      thumb.style.setProperty("--roll", `${on.offsetLeft * 5}deg`);
      seg.dataset.placed = "";
    };
    place();
    // Only animate after the first placement has been painted, so the highlight does not sweep in on load.
    const frame = requestAnimationFrame(() => {
      seg.dataset.ready = "";
    });
    const watcher = new ResizeObserver(place);
    watcher.observe(seg);
    return () => {
      cancelAnimationFrame(frame);
      watcher.disconnect();
    };
  }, [value, options.length]);

  return (
    <div ref={box} className="seg" role="group" aria-label={label}>
      <span aria-hidden className="seg-thumb" />
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** The result callout shown after a shot. */
export function Callout({ tone, title, children }: { tone: "good" | "bad" | "note"; title?: string; children?: ReactNode }) {
  const colour = tone === "good" ? "border-good/50 bg-good/10" : tone === "bad" ? "border-bad/50 bg-bad/10" : "border-brass/50 bg-brass/10";
  return (
    <div className={`rounded-lg border px-3 py-2 text-[0.8125rem] leading-snug ${colour}`} aria-live="polite">
      {title && <p className="font-semibold">{title}</p>}
      {children}
    </div>
  );
}
