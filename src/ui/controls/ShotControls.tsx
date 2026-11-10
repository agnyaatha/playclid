"use client";

import type { ControlState, InputScheme } from "@/core/game";
import type { AimAids } from "@/views/2d/draw";
import { Chip, Field, Slider } from "../kit";
import { SpinPad } from "../SpinPad";

const DEG = Math.PI / 180;

const AID_LABELS: Record<keyof AimAids, string> = {
  aimLine: "Aim line",
  ghostBall: "Ghost ball",
  prediction: "Prediction",
};

const NUDGES = [
  ["−1°", 1],
  ["−0.1°", 0.1],
  ["+0.1°", -0.1],
  ["+1°", -1],
] as const;

interface Props {
  input: InputScheme;
  controls: ControlState;
  onChange: (patch: Partial<ControlState>) => void;
  /** Aids this screen offers; all three when omitted, none when empty. */
  availableAids?: Array<keyof AimAids>;
  aids: AimAids;
  onAids: (a: AimAids) => void;
}

/** Power, aim, striker position, tip position and aids: every input to a shot, on one panel. */
export function ShotControls({ input, controls, onChange, availableAids, aids, onAids }: Props) {
  const aimDeg = (((controls.aim / DEG) % 360) + 360) % 360;
  const aidKeys = availableAids ?? (Object.keys(AID_LABELS) as Array<keyof AimAids>);

  return (
    <div className="flex flex-col gap-4">
      <Field label="Power" htmlFor="power" value={`${(controls.power * input.maxSpeed).toFixed(1)} m/s`}>
        <Slider id="power" min={0.02} max={1} step={0.01} value={controls.power} onChange={(power) => onChange({ power })} />
      </Field>

      {input.placement && (
        <Field label={input.placement.label} htmlFor="placement">
          <Slider id="placement" min={input.placement.min} max={input.placement.max} step={0.01} value={controls.spinX} onChange={(spinX) => onChange({ spinX })} />
        </Field>
      )}

      <Field label="Aim" value={`${aimDeg.toFixed(1)}°`}>
        <div className="mt-1 grid grid-cols-4 gap-1.5">
          {NUDGES.map(([label, d]) => (
            <button key={label} type="button" className="btn btn-ghost !min-h-10 !px-0 text-xs tabular-nums" aria-label={`Turn aim ${label}`} onClick={() => onChange({ aim: controls.aim + d * DEG })}>
              {label}
            </button>
          ))}
        </div>
      </Field>

      {input.tipOffset && (
        <div className="flex items-center gap-4">
          <SpinPad value={{ x: controls.spinX, y: controls.spinY }} onChange={(v) => onChange({ spinX: v.x, spinY: v.y })} maxOffset={input.tipOffset.max} />
          <div className="min-w-0 text-[0.8125rem] leading-snug text-muted">
            <p className="font-medium text-ivory">Cue tip</p>
            <p className="mt-0.5">Up for follow, down for draw, sides for spin. Stay inside the ring to avoid a miscue.</p>
            <button type="button" className="btn btn-quiet !px-0" onClick={() => onChange({ spinX: 0, spinY: 0 })}>
              Centre the tip
            </button>
          </div>
        </div>
      )}

      {aidKeys.length > 0 && <AidChips keys={aidKeys} aids={aids} onAids={onAids} />}
    </div>
  );
}

/** One switch per aiming aid. */
export function AidChips({ keys = Object.keys(AID_LABELS) as Array<keyof AimAids>, aids, onAids }: { keys?: Array<keyof AimAids>; aids: AimAids; onAids: (a: AimAids) => void }) {
  return (
    <div role="group" aria-label="Aiming aids" className="flex flex-wrap gap-1.5">
      {keys.map((key) => (
        <Chip key={key} on={aids[key]} onClick={() => onAids({ ...aids, [key]: !aids[key] })}>
          {AID_LABELS[key]}
        </Chip>
      ))}
    </div>
  );
}
