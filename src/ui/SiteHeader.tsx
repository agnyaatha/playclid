"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FAMILIES, findGame, getGame } from "@/games/registry";
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
          <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#f0e9d8_40%,#a59a80)]" />
          <span>Table Craft</span>
        </Link>
        <GameMenu />
        <div className="ml-auto">
          <ThemeButton />
        </div>
      </nav>
    </header>
  );
}
