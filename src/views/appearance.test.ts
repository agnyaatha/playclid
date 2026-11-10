import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { carromTheme } from "@/games/carrom/theme";
import { snookerTheme } from "@/games/snooker/theme";
import { DEFAULT_THEME, isThemeId, styleTable, THEME_IDS } from "./appearance";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** A theme's colour tokens, with anything it does not set falling back to the defaults on :root. */
function tokens(id: string): Record<string, string> {
  const read = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    const body = css.slice(start, css.indexOf("}", start));
    return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
  };
  return { ...read(":root"), ...(id === DEFAULT_THEME ? {} : read(`[data-theme="${id}"]`)) };
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each(THEME_IDS)("the %s theme", (id) => {
  const t = tokens(id);

  it("has a colour block in the stylesheet", () => {
    if (id !== DEFAULT_THEME) expect(css).toContain(`[data-theme="${id}"]`);
  });

  it("has readable text on the page and on panels", () => {
    for (const bg of [t.ink, t.panel, t.raised]) {
      expect(contrast(t.ivory, bg)).toBeGreaterThanOrEqual(7);
      expect(contrast(t.muted, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("has readable accent buttons and accent text", () => {
    expect(contrast(t["on-accent"], t.brass)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.brass, t.panel)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("table styling", () => {
  it("leaves the classic theme's materials alone", () => {
    expect(styleTable(snookerTheme, "club").surface).toEqual(snookerTheme.surface);
  });

  it("recolours a cue table's cloth and rail", () => {
    const s = styleTable(snookerTheme, "mahogany").surface;
    expect(s.cloth).not.toBe(snookerTheme.surface.cloth);
    expect(s.rail).not.toBe(snookerTheme.surface.rail);
  });

  it("keeps a carrom board wooden, changing only its rail", () => {
    const s = styleTable(carromTheme, "tournament").surface;
    expect(s.cloth).toBe(carromTheme.surface.cloth);
    expect(s.rail).not.toBe(carromTheme.surface.rail);
  });

  it("can keep the traditional table under any theme", () => {
    expect(styleTable(snookerTheme, "slate", false).surface).toEqual(snookerTheme.surface);
  });

  it("returns the same object for the same choice, so views do not rebuild", () => {
    expect(styleTable(snookerTheme, "slate")).toBe(styleTable(snookerTheme, "slate"));
  });

  it("rejects unknown stored values", () => {
    expect(isThemeId("slate")).toBe(true);
    expect(isThemeId("neon")).toBe(false);
  });
});
