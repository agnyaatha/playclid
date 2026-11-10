import type { Table } from "@/core/types";
import type { Viewport } from "./geometry";

/** The materials of a table, shared by the 2D and 3D renderers so the two views always match. */
export interface TableSurface {
  cloth: string;
  /** Darker tone of the cloth, for the vignette and the cushion faces. */
  clothShade: string;
  cushion: string;
  rail: string;
  railDark: string;
  /** Sights, plates and trim. */
  trim: string;
}

/** Everything the renderers need to know about how one game looks. */
export interface GameTheme {
  surface: TableSurface;
  /** Metres of rail around the playing area, including the cushion band. */
  frame: number;
  /** Metres of cushion between the cloth and the rail. */
  band: number;
  /** Balls are spheres; carrom coins are flat discs. */
  shape: "sphere" | "disc";
  ballColour(id: string): string;
  /** Draw the table markings (baulk line and D, carrom baselines, ...) on top of the cloth. */
  drawMarkings(ctx: CanvasRenderingContext2D, vp: Viewport, table: Table): void;
  /**
   * Paint marks on a ball face centred at (cx, cy) with radius r: pool stripes and numbers, carrom rings. Called
   * before shading is applied, by the 2D sprite builder.
   */
  decorateBall?(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, id: string): void;
  /** Paint the full equirectangular surface of a 3D ball, for games whose balls carry stripes or numbers. */
  paintBall3D?(ctx: CanvasRenderingContext2D, w: number, h: number, id: string): void;
}
