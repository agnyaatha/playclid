import type { SessionSummary } from "@/core/lessons/insight";

const pct = (r: number | null) => (r === null ? "–" : `${Math.round(r * 100)}%`);

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-raised px-2 py-1.5 text-center">
      <dd className="display text-lg font-semibold tabular-nums leading-tight">{value}</dd>
      <dt className="text-[0.6875rem] text-muted">{label}</dt>
    </div>
  );
}

/** This session's numbers: resets with each new frame or rack. */
export function SessionPanel({ summary, title = "This session" }: { summary: SessionSummary; title?: string }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <p className="eyebrow">{title}</p>
      <dl className="grid grid-cols-4 gap-1.5">
        <Stat label="Shots" value={summary.shots} />
        <Stat label="Pots" value={pct(summary.potRate)} />
        <Stat label="Long" value={pct(summary.longRate)} />
        <Stat label="Break" value={summary.highBreak} />
      </dl>
    </section>
  );
}
