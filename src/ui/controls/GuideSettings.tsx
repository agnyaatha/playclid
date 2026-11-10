"use client";

import { REACH_MAX, type GuideOptions } from "@/views/2d/prediction";
import { Field, Slider, Toggle } from "../kit";

interface Props {
  guides: GuideOptions;
  onChange: (g: GuideOptions) => void;
}

/** The optional behaviour of the aiming guides. */
export function GuideSettings({ guides, onChange }: Props) {
  return (
    <div role="group" aria-label="Aiming guides" className="flex flex-col gap-3">
      <p className="eyebrow">Aiming guides</p>
      <Toggle label="Show angles" checked={guides.angles} onChange={(angles) => onChange({ ...guides, angles })} />
      <Toggle label="Follow cushions and corners" checked={guides.cushions} onChange={(cushions) => onChange({ ...guides, cushions })} />
      <Field label="Extend the lines" htmlFor="reach" value={guides.reach === 1 ? "True distance" : `${guides.reach}× further`}>
        <Slider id="reach" min={1} max={REACH_MAX} step={0.5} value={guides.reach} onChange={(reach) => onChange({ ...guides, reach })} />
        <p className="mt-1 text-xs leading-relaxed text-muted">At true distance a line ends where this shot really stops. Further shows where the same line leads, and marks the real stopping point.</p>
      </Field>
    </div>
  );
}
