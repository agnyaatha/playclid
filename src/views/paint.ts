/** Repaints a table view now. `simDt` is simulated seconds since the last frame (3D uses it to spin the balls). */
export type PaintFn = (simDt?: number) => void;
