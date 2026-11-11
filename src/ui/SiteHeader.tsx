"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { REPO_URL, SITE_NAME } from "@/core/site";
import { FAMILIES, findGame, getGame } from "@/games/registry";
import { AppMark } from "./AppMark";
import { Sheet } from "./kit";
import { ThemeButton } from "./ThemeButton";

/** Opens a list of every game by family, and shows which one you are in. */
function GameMenu() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const current = findGame(path.split("/")[1] ?? "");
  return (
    <>
      <button type="button" className="chip !min-h-8 cursor-pointer gap-1.5 text-ivory" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {current?.game.name ?? "Games"}
        <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Games" centre>
        {FAMILIES.map((f) => (
          <section key={f.title} aria-label={f.title}>
            <p className="eyebrow">{f.title}</p>
            <ul className="mt-1.5 flex flex-col">
              {f.ids.map((id) => (
                <li key={id}>
                  <Link href={`/${id}`} aria-current={current?.id === id ? "page" : undefined} onClick={() => setOpen(false)} className={`display block rounded-md px-2 py-1.5 text-lg font-semibold transition-colors hover:bg-raised ${current?.id === id ? "text-brass" : ""}`}>
                    {getGame(id).game.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Sheet>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 h-[var(--header)] border-b border-line bg-ink/90 backdrop-blur">
      <nav className="flex h-full items-center gap-4 px-4 sm:gap-7" aria-label="Main">
        <Link href="/" className="display flex items-center gap-2 text-[1.0625rem] font-semibold">
          <AppMark size={22} />
          <span>{SITE_NAME}</span>
        </Link>
        <GameMenu />
        <div className="ml-auto flex items-center gap-2">
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="tool !h-8 !w-8" aria-label={`${SITE_NAME} on GitHub (opens in a new tab)`} title="View the source on GitHub">
            {/* GitHub's mark (Octicons mark-github). */}
            <svg viewBox="0 0 16 16" width="17" height="17" fill="currentColor" aria-hidden>
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
          </a>
          <ThemeButton />
        </div>
      </nav>
    </header>
  );
}
