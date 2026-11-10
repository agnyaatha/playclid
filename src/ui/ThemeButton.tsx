"use client";

import { useEffect, useState } from "react";
import { usePref } from "@/core/prefs/usePref";
import { DEFAULT_THEME, isThemeId, THEME_IDS, THEMES, type ThemeId } from "@/views/appearance";
import { Sheet, Toggle } from "./kit";

/** The chosen theme, and whether the table follows it. */
export function useAppTheme() {
  const [theme, setTheme] = usePref<ThemeId>("theme", DEFAULT_THEME, isThemeId);
  const [colourTable, setColourTable] = usePref<boolean>("themeTable", true);
  return { theme, setTheme, colourTable, setColourTable };
}

/** Opens the theme picker, and keeps the page in step with the choice. */
export function ThemeButton() {
  const { theme, setTheme, colourTable, setColourTable } = useAppTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEMES[theme].barColour);
  }, [theme]);

  return (
    <>
      <button type="button" className="tool !h-8 !w-8" aria-label="Change theme" title="Change theme" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-1.3-1-1.7-1-2.9 0-1 .8-1.8 2-1.8h2.5c2 0 3.5-1.6 3.5-3.5C21 6.5 17 3 12 3Z" />
          <circle cx="7.5" cy="11" r="1" fill="currentColor" />
          <circle cx="11" cy="7.5" r="1" fill="currentColor" />
          <circle cx="15.5" cy="8" r="1" fill="currentColor" />
        </svg>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Theme" centre>
        <ul className="flex flex-col gap-1.5">
          {THEME_IDS.map((id) => {
            const t = THEMES[id];
            return (
              <li key={id}>
                <button type="button" aria-pressed={theme === id} onClick={() => setTheme(id)} className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${theme === id ? "border-brass bg-brass/10" : "border-line hover:border-brass/50"}`}>
                  <span aria-hidden className="flex shrink-0 overflow-hidden rounded-md border border-line">
                    {t.swatch.map((c) => (
                      <span key={c} className="h-9 w-5" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="display block text-lg font-semibold leading-tight">{t.name}</span>
                    <span className="block text-xs text-muted">{t.blurb}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <Toggle label="Colour the table to match" checked={colourTable} onChange={setColourTable} />
      </Sheet>
    </>
  );
}
