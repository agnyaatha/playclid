"use client";

interface Props {
  playing: boolean;
  speed: number;
  onSpeed: (s: number) => void;
  onSkip: () => void;
  onReplay?: () => void;
  canReplay?: boolean;
  children?: React.ReactNode;
}

/** Replay, skip and speed. Extra actions (undo, new frame) are passed as children. */
export function PlaybackControls({ playing, speed, onSpeed, onSkip, onReplay, canReplay, children }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-1">
      {playing ? (
        <button type="button" onClick={onSkip} className="btn btn-quiet">
          Skip
        </button>
      ) : (
        onReplay && (
          <button type="button" disabled={!canReplay} onClick={onReplay} className="btn btn-quiet">
            Replay
          </button>
        )
      )}
      {children}
      <label className="ml-auto flex items-center gap-1.5 text-xs text-muted">
        Speed
        <select value={speed} onChange={(e) => onSpeed(Number(e.target.value))} className="select">
          {[0.5, 1, 2, 4].map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
