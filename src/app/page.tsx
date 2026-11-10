import Link from "next/link";
import { GAMES } from "@/games/registry";
import { HeroTable } from "@/ui/HeroTable";

const BLURB: Record<string, string> = {
  snooker: "The full game on a true 12 ft table: from stance and straight pots to breaks, safety and escapes.",
  pool: "8-ball on a 9 ft table: potting angles, cue-ball control and ball in hand.",
  carrom: "Flick the striker from the baseline and pocket your colour, on a powdered board.",
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col overflow-x-clip">
      <section className="relative isolate min-h-[34rem] lg:min-h-[calc(100dvh-var(--header)-9rem)]">
        <div className="absolute inset-y-0 left-[34%] right-[-34%] -z-10 hidden opacity-95 md:block">
          <div className="hero-table absolute inset-0">
            <HeroTable />
          </div>
        </div>
        <div className="absolute inset-x-0 top-[17rem] h-64 -z-10 md:hidden">
          <div className="hero-table absolute inset-0">
            <HeroTable />
          </div>
        </div>
        <div className="max-w-xl px-5 pt-14 sm:px-10 lg:pt-24">
          <p className="eyebrow rise">Snooker · Pool · Carrom</p>
          <h1 className="display rise mt-4 text-[3.25rem] font-semibold leading-[0.98] sm:text-7xl" style={{ animationDelay: "80ms" }}>
            Learn the table, one shot at a time.
          </h1>
          <p className="rise mt-5 max-w-md text-lg leading-relaxed text-muted max-md:hidden" style={{ animationDelay: "160ms" }}>
            A real physics engine under guided drills that fade the aiming aids as you improve. Your progress stays on this device.
          </p>
        </div>
      </section>

      <section aria-label="Games" className="relative border-t border-line bg-ink">
        <ul className="grid md:grid-cols-3">
          {Object.entries(GAMES).map(([id, entry], i) => (
            <li key={id} className={`flex flex-col gap-3 px-5 py-7 sm:px-10 ${i > 0 ? "border-line max-md:border-t md:border-l" : ""}`}>
              <div className="flex items-baseline justify-between">
                <h2 className="display text-3xl font-semibold">{id[0].toUpperCase() + id.slice(1)}</h2>
                <span className="text-xs tabular-nums text-muted">{entry!.lessons.length} lessons</span>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted">{BLURB[id]}</p>
              <div className="flex gap-2">
                <Link href={`/${id}`} className="btn btn-primary">
                  Start learning
                </Link>
                <Link href={`/${id}/practice`} className="btn btn-ghost">
                  Practice table
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
