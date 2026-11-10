"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GAMES } from "@/games/registry";

const SHORT: Record<string, string> = { snooker: "Snooker", pool: "Pool", carrom: "Carrom" };

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 h-[var(--header)] border-b border-line bg-ink/90 backdrop-blur">
      <nav className="flex h-full items-center gap-4 px-4 sm:gap-7" aria-label="Main">
        <Link href="/" className="display flex items-center gap-2 text-[1.0625rem] font-semibold">
          <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#f0e9d8_40%,#a59a80)]" />
          <span className="hidden sm:inline">Cue Sports Trainer</span>
          <span className="sm:hidden">Trainer</span>
        </Link>
        <div className="flex items-center gap-4 text-sm sm:gap-6">
          {Object.keys(GAMES).map((id) => {
            const active = path === `/${id}` || path.startsWith(`/${id}/`);
            return (
              <Link
                key={id}
                href={`/${id}`}
                aria-current={active ? "page" : undefined}
                className={`relative py-1 transition-colors ${active ? "text-ivory after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-brass" : "text-muted hover:text-ivory"}`}
              >
                {SHORT[id] ?? id}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
