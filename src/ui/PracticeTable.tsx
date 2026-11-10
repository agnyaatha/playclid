"use client";

import { useRef, useState } from "react";
import { perturb, SKILLS, type SkillName } from "@/core/ai/advisor";
import { makeRng } from "@/core/ai/rng";
import type { ControlState, GameId } from "@/core/game";
import { prefsStore } from "@/core/prefs/store";
import { usePref } from "@/core/prefs/usePref";
import type { RulesState } from "@/core/rules";
import type { Body, ShotResult } from "@/core/types";
import { TableView } from "@/views/TableView";
import { PlaybackControls } from "./controls/PlaybackControls";
import { ShotControls } from "./controls/ShotControls";
import { Callout, Field, Segmented, Slider, Toggle } from "./kit";
import { Scoreboard } from "./Scoreboard";
import { useAdvisor } from "./useAdvisor";
import { CLOTH_SCALE_MAX, CLOTH_SCALE_MIN } from "./useSimParams";
import { tableKeys, useTableSession } from "./useTableSession";

const isSkill = (v: unknown): v is SkillName => typeof v === "string" && v in SKILLS;
const SKILL_LABEL: Record<SkillName, string> = { beginner: "Beginner", club: "Club", expert: "Expert" };
type Tab = "shot" | "coach" | "table";

function summarise(r: ShotResult, strikerId: string): string {
  const first = r.events.find((e) => e.type === "collision");
  const firstHit = first && first.type === "collision" ? (first.a === strikerId ? first.b : first.a) : null;
  const potted = r.events.flatMap((e) => (e.type === "pocket" ? [e.body] : []));
  return [firstHit ? `First ball hit: ${firstHit}` : "No ball hit", potted.length ? `Potted: ${potted.join(", ")}` : null].filter(Boolean).join(" · ");
}

interface Snapshot {
  bodies: Body[];
  frame: RulesState | null;
}

/** Free practice on any registered game: a full table, undo and replay, optional rules, and an AI coach. */
export function PracticeTable({ gameId }: { gameId: GameId }) {
  const [frame, setFrame] = useState<RulesState | null>(null);
  const [nominated, setNominated] = useState<string | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [lastResult, setLastResult] = useState<ShotResult | null>(null);
  const [message, setMessage] = useState("Drag on the table to aim, set power and spin, then shoot.");
  const [skill, setSkill] = usePref<SkillName>("skill", "club", isSkill);
  const [opponent, setOpponent] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [tab, setTab] = useState<Tab>("shot");

  // The computer's turn reads these, so a turn that starts later never sees stale settings.
  const opponentRef = useRef(false);
  const seedRef = useRef(1);
  const rngRef = useRef(makeRng(2026));
  const advisor = useAdvisor();

  const boardRulesReady = frame !== null;
  const session = useTableSession({
    gameId,
    makeInitial: (game, table) => game.createInitialBodies(table),
    blocked: thinking,
  });
  const { game, input, rules, table, bodies, setBodies, controls, patch, simParams, playing, play, skip, speed, setSpeed } = session;

  const board = rules && frame ? rules.scoreboard(frame) : null;
  const computersTurn = !!(opponent && board && board.current === 1 && !board.over);
  const canShoot = session.canShoot && !board?.over && !computersTurn;
  const nominations = rules?.nominations && frame ? rules.nominations(frame, bodies) : null;
  const missOffered = !!(rules?.missOffered && frame && rules.missOffered(frame) && history.length > 0);
  const inHand = !!(rules?.ballInHand && frame && rules.ballInHand(frame));
  const freeBall = board?.on.startsWith("Free ball");

  /** The balls the player may play now: from the rules when they are on, otherwise every ball but the striker. */
  const targetsFor = (frameNow: RulesState | null, bodiesNow: Body[], nom: string | null) =>
    rules?.targets && frameNow
      ? rules.targets(frameNow, bodiesNow, nom)
      : bodiesNow.filter((b) => b.id !== input.strikerId && b.state !== "pocketed").map((b) => ({ id: b.id, value: 1 }));

  /** Play one shot from the given position, then judge it and hand over to the next player. */
  const fire = (ctl: ControlState, bodiesNow: Body[], frameNow: RulesState | null, nomNow: string | null) => {
    const result = session.simulate(bodiesNow, ctl);
    setHistory((h) => [...h, { bodies: bodiesNow, frame: frameNow }].slice(-50));
    setLastResult(result);
    play(result, () => {
      if (rules && frameNow) {
        const j = rules.judge(frameNow, result, { table, nominated: nomNow });
        setBodies(j.bodies);
        setFrame(j.state);
        setNominated(null);
        setMessage(j.message);
        void computerTurn(j.state, j.bodies);
        return;
      }
      const after = game.afterShot?.(result, table) ?? { bodies: result.final };
      setBodies(after.bodies);
      setMessage(summarise(result, input.strikerId) + (after.note ? ` · ${after.note}` : ""));
    });
  };

  /** If it is the computer's turn, choose a shot at the chosen skill and play it. */
  const computerTurn = async (frameNow: RulesState, bodiesNow: Body[]) => {
    if (!opponentRef.current || !rules) return;
    const sb = rules.scoreboard(frameNow);
    if (sb.over || sb.current !== 1) return;
    setThinking(true);
    setMessage("The computer is thinking…");
    const level = SKILLS[prefsStore.get<SkillName>("skill", "club")];
    const s = await advisor.suggest(gameId, { bodies: bodiesNow, targets: targetsFor(frameNow, bodiesNow, null), skill: level, seed: seedRef.current++, params: simParams });
    setThinking(false);
    if (!opponentRef.current) return;
    const planned = s?.controls ?? { aim: input.defaultAim, power: 0.2, spinX: 0, spinY: 0 };
    const ctl = perturb(planned, level, rngRef.current);
    session.setControls(ctl);
    fire(ctl, bodiesNow, frameNow, null);
  };

  const shoot = () => {
    if (canShoot) fire(controls, bodies, frame, nominated);
  };

  const suggest = async () => {
    if (!canShoot) return;
    setThinking(true);
    setMessage("The coach is thinking…");
    const s = await advisor.suggest(gameId, { bodies, targets: targetsFor(frame, bodies, nominated), skill: SKILLS[skill], seed: seedRef.current++, params: simParams });
    setThinking(false);
    if (s) {
      session.setControls(s.controls);
      setMessage(`Coach: ${s.note}`);
      setTab("shot");
    } else {
      setMessage("Coach: no shot found from here.");
    }
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev || playing || thinking) return;
    setBodies(prev.bodies);
    setFrame(prev.frame);
    setNominated(null);
    setHistory((h) => h.slice(0, -1));
    setLastResult(null);
    setMessage("Shot undone.");
  };

  /** Foul and a miss: the offender plays again from where the balls were, and the penalty stands. */
  const askReplay = () => {
    const prev = history[history.length - 1];
    if (!prev || !prev.frame || !frame || !rules?.replayAfterMiss || playing || thinking) return;
    const next = rules.replayAfterMiss(prev.frame, frame);
    setBodies(prev.bodies);
    setFrame(next);
    setNominated(null);
    setHistory((h) => h.slice(0, -1));
    setLastResult(null);
    setMessage("Miss: the shot is replayed from the original position. The foul points stand.");
    void computerTurn(next, prev.bodies);
  };

  const startFrame = (withRules: boolean) => {
    if (!withRules) {
      opponentRef.current = false;
      setOpponent(false);
    }
    setBodies(game.createInitialBodies(table));
    setFrame(withRules && rules ? rules.newFrame() : null);
    setNominated(null);
    setHistory([]);
    setLastResult(null);
    setMessage(withRules ? "Frame started. Player 1 to break." : "New rack.");
  };

  const toggleOpponent = (on: boolean) => {
    opponentRef.current = on;
    setOpponent(on);
    if (on && frame) void computerTurn(frame, bodies);
  };

  const players = board?.players.map((p) => (opponent && p.label === "Player 2" ? { ...p, label: "Computer" } : p));

  return (
    <div className="stage flex-1" onKeyDown={(e) => tableKeys(e, session.nudgeDegrees, shoot)}>
      <div className="stage-table">
        {board && players && <Scoreboard board={{ ...board, players }} />}
        <TableView
          {...session.tableProps}
          aiming={canShoot ? session.tableProps.aiming : undefined}
          onPoint={(p) => {
            if (inHand && !playing && !thinking) {
              const moved = game.placeStriker?.(table, bodies, p);
              if (moved) setBodies(moved);
              return;
            }
            if (canShoot) session.aimAt(p);
          }}
          label={`${game.name} table. Drag to aim; left and right arrow keys fine-tune the aim; Enter shoots.`}
        />
      </div>

      <aside className="dock" aria-label="Controls">
        <div className="px-4 pt-3">
          <Segmented
            label="Panel"
            value={tab}
            onChange={setTab}
            options={[
              { value: "shot", label: "Shot" },
              { value: "coach", label: "Coach" },
              { value: "table", label: "Table" },
            ]}
          />
        </div>

        <div className="dock-body">
          {tab === "shot" && (
            <>
              {nominations && (
                <Field label={freeBall ? "Nominate the free ball" : "Nominate the colour"} htmlFor="nominate">
                  <select id="nominate" value={nominated ?? ""} onChange={(e) => setNominated(e.target.value || null)} className="select mt-1 w-full">
                    <option value="">{freeBall ? "Choose a ball…" : "First colour hit"}</option>
                    {nominations.map((c) => (
                      <option key={c} value={c}>
                        {c.startsWith("red") ? `Red ${c.slice(3)}` : c[0].toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <ShotControls input={input} controls={controls} onChange={patch} aids={session.aids} onAids={session.setAids} />
            </>
          )}

          {tab === "coach" && (
            <>
              <p className="text-sm leading-relaxed text-muted">The coach searches this exact position with the real physics, and sets up the best shot it finds for the level you choose.</p>
              <Field label="Skill level">
                <div className="mt-1">
                  <Segmented label="Skill level" value={skill} onChange={setSkill} options={(Object.keys(SKILLS) as SkillName[]).map((s) => ({ value: s, label: SKILL_LABEL[s] }))} />
                </div>
              </Field>
              <button type="button" className="btn btn-ghost" disabled={!canShoot} onClick={() => void suggest()}>
                {thinking ? "Thinking…" : "Suggest a shot"}
              </button>
            </>
          )}

          {tab === "table" && (
            <>
              {rules && <Toggle label="Play by the rules" checked={boardRulesReady} disabled={playing || thinking} onChange={startFrame} />}
              {frame && <Toggle label="Player 2 is the computer" checked={opponent} disabled={playing || thinking} onChange={toggleOpponent} />}
              <Field label="Table speed" htmlFor="cloth" value={`${clothLabel(session.clothScale)} · ${session.clothScale.toFixed(2)}×`}>
                <Slider id="cloth" min={CLOTH_SCALE_MIN} max={CLOTH_SCALE_MAX} step={0.05} value={session.clothScale} disabled={playing || thinking} onChange={session.setClothScale} />
                <p className="mt-1 text-xs leading-relaxed text-muted">Scales the cloth friction. Tune it until shots match the table you play on.</p>
              </Field>
            </>
          )}
        </div>

        <div className="dock-foot">
          {missOffered && !computersTurn && (
            <Callout tone="note">
              <p>No ball on was hit. You can have the shot played again from where the balls were.</p>
              <button type="button" onClick={askReplay} disabled={playing || thinking} className="btn btn-ghost mt-2 !min-h-9">
                Ask for a replay
              </button>
            </Callout>
          )}
          {inHand && game.placeStriker && !computersTurn && <Callout tone="note">Cue ball in hand: tap the table to place it, then aim and shoot.</Callout>}
          <p className="min-h-9 text-[0.8125rem] leading-snug text-muted" aria-live="polite">
            {message}
          </p>
          <button type="button" disabled={!canShoot} onClick={shoot} className="btn btn-primary !min-h-12 text-base">
            Shoot
          </button>
          <PlaybackControls playing={playing} speed={speed} onSpeed={setSpeed} onSkip={skip} canReplay={!!lastResult} onReplay={() => lastResult && play(lastResult)}>
            <button type="button" disabled={playing || thinking || history.length === 0} onClick={undo} className="btn btn-quiet">
              Undo
            </button>
            <button type="button" disabled={playing || thinking} onClick={() => startFrame(frame !== null)} className="btn btn-quiet">
              {frame ? "New frame" : "New rack"}
            </button>
          </PlaybackControls>
        </div>
      </aside>
    </div>
  );
}

const clothLabel = (k: number) => (k < 1 ? "Faster" : k > 1 ? "Slower" : "Standard");
