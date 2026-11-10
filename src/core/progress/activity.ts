/** Lifetime practice totals, kept on this device alongside the preferences. */
export interface Activity {
  /** Shots played on each local date, as YYYY-MM-DD. */
  days: Record<string, number>;
  shots: number;
  pots: number;
  bestBreak: number;
  bestStreak: number;
}

export const EMPTY_ACTIVITY: Activity = { days: {}, shots: 0, pots: 0, bestBreak: 0, bestStreak: 0 };

export const isActivity = (v: unknown): v is Activity => {
  const a = v as Partial<Activity> | null;
  return !!a && typeof a.days === "object" && a.days !== null && [a.shots, a.pots, a.bestBreak, a.bestStreak].every((n) => typeof n === "number");
};

export const DAILY_GOAL = 20;
/** Only recent days are needed to work out a streak. */
const KEEP_DAYS = 120;

const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function previousDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

/** Consecutive days of practice ending today, or ending yesterday while today is still open. */
export function currentStreak(a: Activity, today: string): number {
  let day = a.days[today] ? today : previousDay(today);
  let n = 0;
  while (a.days[day]) {
    n++;
    day = previousDay(day);
  }
  return n;
}

export function addShot(a: Activity, today: string, pots: number, breakPoints: number): Activity {
  const entries = Object.entries({ ...a.days, [today]: (a.days[today] ?? 0) + 1 }).sort(([x], [y]) => (x < y ? -1 : 1));
  const next: Activity = { ...a, days: Object.fromEntries(entries.slice(-KEEP_DAYS)), shots: a.shots + 1, pots: a.pots + pots, bestBreak: Math.max(a.bestBreak, breakPoints) };
  return { ...next, bestStreak: Math.max(a.bestStreak, currentStreak(next, today)) };
}

export interface Badge {
  name: string;
  hint: string;
  earned: boolean;
}

export function badges(a: Activity): Badge[] {
  const badge = (name: string, hint: string, have: number, need: number): Badge => ({ name, hint, earned: have >= need });
  return [
    badge("First pot", "Pot a ball", a.pots, 1),
    badge("Hundred pots", "Pot 100 balls", a.pots, 100),
    badge("Thousand shots", "Play 1,000 shots", a.shots, 1000),
    badge("Three in a row", "Practise 3 days running", a.bestStreak, 3),
    badge("Full week", "Practise 7 days running", a.bestStreak, 7),
    badge("Twenty break", "Make a break of 20", a.bestBreak, 20),
    badge("Half century", "Make a break of 50", a.bestBreak, 50),
    badge("Century", "Make a break of 100", a.bestBreak, 100),
  ];
}
