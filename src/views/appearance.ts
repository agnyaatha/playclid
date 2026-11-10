import type { GameTheme, TableSurface } from "./2d/theme";

export type ThemeId = "club" | "tournament" | "mahogany" | "slate" | "daylight";

export interface Appearance {
  name: string;
  blurb: string;
  /** Page, accent and cloth, for the picker's preview. */
  swatch: [string, string, string];
  /** The browser's own toolbar colour. */
  barColour: string;
  /** The 3D room behind the table, top to bottom. */
  room: [string, string, string];
  /** Cue tables take these materials. Left out, each game keeps its own. */
  cloth?: Pick<TableSurface, "cloth" | "clothShade" | "cushion">;
  /** Rail materials, for every table including the carrom board. */
  rail?: Pick<TableSurface, "rail" | "railDark" | "trim">;
}

/** The colours of the app itself are the matching `[data-theme]` blocks in globals.css. */
export const THEMES: Record<ThemeId, Appearance> = {
  club: {
    name: "Club Night",
    blurb: "Felt, brass and ivory under one low light.",
    swatch: ["#0b0f0d", "#d4a94e", "#11734a"],
    barColour: "#0b0f0d",
    room: ["#080b09", "#13201a", "#1c2a22"],
  },
  tournament: {
    name: "Tournament",
    blurb: "Arena blue, like a televised final.",
    swatch: ["#0a1020", "#6cc6ff", "#1c5fa8"],
    barColour: "#0a1020",
    room: ["#060a14", "#0f1a30", "#172644"],
    cloth: { cloth: "#1c5fa8", clothShade: "#123f73", cushion: "#174e8c" },
    rail: { rail: "#20242e", railDark: "#0a0c12", trim: "#c8d6e8" },
  },
  mahogany: {
    name: "Mahogany",
    blurb: "Wine-red cloth in a panelled room.",
    swatch: ["#170c0c", "#e0a458", "#8c1f2e"],
    barColour: "#170c0c",
    room: ["#0e0606", "#21100e", "#301915"],
    cloth: { cloth: "#8c1f2e", clothShade: "#5a1320", cushion: "#741a27" },
    rail: { rail: "#4f2212", railDark: "#230d07", trim: "#e0a458" },
  },
  slate: {
    name: "Slate",
    blurb: "Cool grey cloth with a teal accent.",
    swatch: ["#101214", "#3fd1b6", "#46565f"],
    barColour: "#101214",
    room: ["#090a0c", "#15181b", "#20252a"],
    cloth: { cloth: "#46565f", clothShade: "#2c383f", cushion: "#3a4851" },
    rail: { rail: "#23272b", railDark: "#0c0e10", trim: "#3fd1b6" },
  },
  daylight: {
    name: "Daylight",
    blurb: "Bright and clear, for a sunny room.",
    swatch: ["#f4f0e6", "#0e6e47", "#11734a"],
    barColour: "#f4f0e6",
    room: ["#ece7da", "#ddd6c4", "#c9c1ac"],
    rail: { rail: "#a9743f", railDark: "#6e4722", trim: "#f0d9a0" },
  },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
export const DEFAULT_THEME: ThemeId = "club";
export const isThemeId = (v: unknown): v is ThemeId => typeof v === "string" && v in THEMES;

const styled = new Map<string, GameTheme>();

/**
 * A game's table in an app theme. The result is cached, because the table views rebuild when handed a new object.
 * With `colourTable` off, only the 3D room changes and each game keeps its traditional materials.
 */
export function styleTable(base: GameTheme, id: ThemeId, colourTable = true): GameTheme {
  const key = `${base.surface.cloth}/${id}/${colourTable}`;
  let out = styled.get(key);
  if (!out) {
    const t = THEMES[id];
    // A carrom board is bare wood, so it takes a theme's rail and trim but never its cloth.
    const cloth = colourTable && base.shape === "sphere" ? t.cloth : undefined;
    const rail = colourTable ? t.rail : undefined;
    out = { ...base, room: t.room, surface: { ...base.surface, ...cloth, ...rail } };
    styled.set(key, out);
  }
  return out;
}
