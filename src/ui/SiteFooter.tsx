"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAME } from "@/core/site";
import { FAMILIES, getGame } from "@/games/registry";

/** A table page fills the screen; anything below it would only add a scrollbar. */
const isTablePage = (path: string) => /^\/[^/]+\/(practice|lessons\/[^/]+|challenges\/[^/]+)\/?$/.test(path);

/** Links to every game on the content pages, which helps visitors and search engines find their way around. */
export function SiteFooter() {
  const path = usePathname();
  if (isTablePage(path)) return null;
  return (
    <footer className="border-t border-line bg-ink px-5 py-10 text-sm sm:px-10">
      <nav aria-label="Games" className="grid gap-6 sm:grid-cols-3">
        {FAMILIES.map((f) => (
          <div key={f.title}>
            <p className="eyebrow">{f.title}</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {f.ids.map((id) => (
                <li key={id}>
                  <Link href={`/${id}`} className="text-muted transition-colors hover:text-ivory">
                    Learn {getGame(id).game.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-muted">
        <span>{SITE_NAME} · free, no account, works offline</span>
        <Link href="/privacy" className="transition-colors hover:text-ivory">
          Privacy
        </Link>
      </div>
    </footer>
  );
}
