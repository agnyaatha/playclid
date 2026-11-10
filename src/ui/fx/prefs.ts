export interface FxPrefs {
  celebrations: boolean;
  sound: boolean;
  volume: number;
  /** Replay a long pot or a double in slow motion, straight after it is played. */
  replayGreat: boolean;
}

export const DEFAULT_FX: FxPrefs = { celebrations: true, sound: true, volume: 0.7, replayGreat: true };

export const isFxPrefs = (v: unknown): v is FxPrefs => {
  const f = v as Partial<FxPrefs> | null;
  return !!f && typeof f.celebrations === "boolean" && typeof f.sound === "boolean" && typeof f.replayGreat === "boolean" && typeof f.volume === "number" && f.volume >= 0 && f.volume <= 1;
};
