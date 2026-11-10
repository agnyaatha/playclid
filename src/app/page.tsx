import Link from "next/link";
import { FAMILIES, getGame } from "@/games/registry";
import { HeroTable } from "@/ui/HeroTable";

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
          <p className="eyebrow rise">Eight table games</p>
          <h1 className="display rise mt-4 text-[3.25rem] font-semibold leading-[0.98] sm:text-7xl" style={{ animationDelay: "80ms" }}>
            Learn the table, one shot at a time.
          </h1>
          <p className="rise mt-5 max-w-md text-lg leading-relaxed text-muted max-md:hidden" style={{ animationDelay: "160ms" }}>
            A real physics engine under guided drills that fade the aiming aids as you improve. Your progress stays on this device.
          </p>
        </div>
      </section>

      {FAMILIES.map((family) => (
        <section key={family.title} aria-label={family.title} className="relative border-t border-line bg-ink">
          <h2 className="eyebrow px-5 pt-6 sm:px-10">{family.title}</h2>
          <ul className="grid md:grid-cols-3">
            {family.ids.map((id, i) => {
              const entry = getGame(id);
              return (
                <li key={id} className={`flex flex-col gap-3 px-5 py-6 sm:px-10 ${i > 0 ? "border-line max-md:border-t md:border-l" : ""}`}>
                  <div className="flex items-baseline justify-between">
                    <h3 className="display text-3xl font-semibold">{entry.game.name}</h3>
                    <span className="text-xs tabular-nums text-muted">{entry.lessons.length} lessons</span>
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-muted">{entry.blurb}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/${id}`} className="btn btn-primary">
                      Start learning
                    </Link>
                    <Link href={`/${id}/practice`} className="btn btn-ghost">
                      Practice
                    </Link>
                    {entry.challenges.length > 0 && (
                      <Link href={`/${id}/challenges`} className="btn btn-ghost">
                        Challenges
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
