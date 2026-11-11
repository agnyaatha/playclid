"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePref } from "@/core/prefs/usePref";
import { useAnalyticsConsent } from "./analytics/Analytics";
import { AidChips } from "./controls/ShotControls";
import { GuideSettings } from "./controls/GuideSettings";
import { Field, Sheet, Slider, Toggle } from "./kit";
import { TourAnimation } from "./TourAnimation";
import { CLOTH_SCALE_MAX, CLOTH_SCALE_MIN } from "./useSimParams";
import type { useTableSession } from "./useTableSession";

const clothLabel = (k: number) => (k < 1 ? "Faster" : k > 1 ? "Slower" : "Standard");

const KEYS: [string[], string][] = [
  [["Drag"], "Aim at a point on the table"],
  [["Pull back"], "From the ball: set power, let go to shoot"],
  [["←", "→"], "Fine-tune the aim by 0.1°"],
  [["Shift", "←", "→"], "Turn the aim by 1°"],
  [["Enter"], "Shoot, with the table focused"],
  [["?"], "Show or hide this list"],
];

const TOUR = (striker: string) => [
  { title: "Aim", text: `Press anywhere on the table and the ${striker} aims there. Drag to adjust, and the guide line shows where the shot will go.` },
  { title: "Set the power", text: `Use the Power slider, or grab the ${striker} and pull back. The further you pull, the harder the shot.` },
  { title: "Shoot", text: `Press Shoot, or let go after pulling back. Letting go on the ${striker} cancels. Settings are on the table's top corner.` },
];

const noSubscribe = () => () => {};

/** The settings and keyboard-help buttons that float on the table, and the panels they open. */
export function TableTools({ session }: { session: ReturnType<typeof useTableSession> }) {
  const [panel, setPanel] = useState<"settings" | "keys" | null>(null);
  const analytics = useAnalyticsConsent();
  const { fx, setFx } = session;
  const striker = session.input.tipOffset ? "cue ball" : "striker";
  const [tourDone, setTourDone] = usePref<boolean>("tourDone", false);
  const [step, setStep] = useState(0);
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const finishTour = () => setTourDone(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "?" || t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return;
      setPanel((p) => (p === "keys" ? null : "keys"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button type="button" className="tool" aria-label="Keyboard shortcuts" title="Keyboard shortcuts" onClick={() => setPanel("keys")}>
        ?
      </button>
      <button type="button" className="tool" aria-label="Settings" title="Settings" onClick={() => setPanel("settings")}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </svg>
      </button>

      <Sheet open={panel === "settings"} onClose={() => setPanel(null)} title="Settings">
        <section className="flex flex-col gap-3" aria-label="Effects">
          <p className="eyebrow">Effects</p>
          <Toggle label="Celebrations" checked={fx.celebrations} onChange={(celebrations) => setFx({ ...fx, celebrations })} />
          <Toggle label="Replay great shots" checked={fx.replayGreat} disabled={!fx.celebrations} onChange={(replayGreat) => setFx({ ...fx, replayGreat })} />
          <Toggle label="Sound" checked={fx.sound} onChange={(on) => setFx({ ...fx, sound: on })} />
          <Field label="Volume" htmlFor="volume" value={`${Math.round(fx.volume * 100)}%`}>
            <Slider id="volume" min={0} max={1} step={0.05} value={fx.volume} disabled={!fx.sound} onChange={(volume) => setFx({ ...fx, volume })} />
          </Field>
        </section>

        {analytics.enabled && (
          <section className="flex flex-col gap-3" aria-label="Privacy">
            <p className="eyebrow">Privacy</p>
            <Toggle label="Share anonymous usage stats" checked={analytics.consent === "granted"} onChange={(on) => analytics.setConsent(on ? "granted" : "denied")} />
            <p className="-mt-2 text-xs leading-relaxed text-muted">Counts visits and which parts you use, through Google Analytics. Never used for ads.</p>
          </section>
        )}

        {!session.lesson && (
          <>
            <section className="flex flex-col gap-3" aria-label="Aiming aids">
              <p className="eyebrow">Aiming aids</p>
              <AidChips aids={session.aids} onAids={session.setAids} />
            </section>
            <GuideSettings guides={session.guides} onChange={session.setGuides} />
            <section className="flex flex-col gap-3" aria-label="Table">
              <p className="eyebrow">Table</p>
              <Field label="Table speed" htmlFor="cloth" value={`${clothLabel(session.clothScale)} · ${session.clothScale.toFixed(2)}×`}>
                <Slider id="cloth" min={CLOTH_SCALE_MIN} max={CLOTH_SCALE_MAX} step={0.05} value={session.clothScale} disabled={session.playing} onChange={session.setClothScale} />
                <p className="mt-1 text-xs leading-relaxed text-muted">Scales the cloth friction. Tune it until shots match the table you play on.</p>
              </Field>
            </section>
          </>
        )}
      </Sheet>

      <Sheet open={hydrated && !tourDone} onClose={finishTour} title={TOUR(striker)[step].title} centre>
        <TourAnimation step={step} />
        <p className="text-sm leading-relaxed text-muted">{TOUR(striker)[step].text}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs tabular-nums text-muted">
            {step + 1} of {TOUR(striker).length}
          </span>
          <button type="button" className="btn btn-primary" onClick={() => (step + 1 < TOUR(striker).length ? setStep(step + 1) : finishTour())}>
            {step + 1 < TOUR(striker).length ? "Next" : "Start playing"}
          </button>
        </div>
      </Sheet>

      <Sheet open={panel === "keys"} onClose={() => setPanel(null)} title="Keyboard shortcuts" centre>
        <dl className="flex flex-col gap-2.5 text-sm">
          {KEYS.map(([keys, what]) => (
            <div key={what} className="flex items-center justify-between gap-4">
              <dt className="flex gap-1">
                {keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </dt>
              <dd className="text-right text-muted">{what}</dd>
            </div>
          ))}
        </dl>
      </Sheet>
    </>
  );
}
