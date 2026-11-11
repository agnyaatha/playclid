/**
 * Usage analytics through Google Analytics 4. Nothing is sent unless a measurement ID is configured
 * (NEXT_PUBLIC_GA_ID) and the visitor has agreed; until then `track` does nothing. See docs/development/analytics.md.
 */

/** Only a well-formed GA4 ID is used, since it is written into an inline script. */
export const validGaId = (id: string | undefined): string | null => (id && /^G-[A-Z0-9]{4,20}$/.test(id) ? id : null);

export const GA_ID = validGaId(process.env.NEXT_PUBLIC_GA_ID);

export type Consent = "granted" | "denied";
export const isConsent = (v: unknown): v is Consent => v === "granted" || v === "denied";

/** The custom events the app sends. Page views (and so which section people open) are tracked by GA itself. */
export type EventName =
  /** A shot was played and judged. */
  | "shot"
  /** A lesson, drill, challenge or watch lesson was finished and saved to progress. */
  | "activity_complete"
  /** The table view was switched between 2D and 3D. */
  | "view_change"
  /** A visitor shared a link to the app (GA4's recommended event name). */
  | "share";

type Params = Record<string, string | number | boolean>;

/** The game and section of a path, e.g. /snooker/lessons/pot-1 is snooker / lessons. */
export function sectionOf(path: string): { game: string; section: string } {
  const [game, section] = path.split("?")[0].split("/").filter(Boolean);
  if (!game) return { game: "none", section: "home" };
  return { game, section: section ?? "overview" };
}

type Gtag = (...args: unknown[]) => void;
const gtag = (): Gtag | null => (typeof window === "undefined" ? null : ((window as { gtag?: Gtag }).gtag ?? null));

/** Send one event, tagged with the game and section it happened in. Does nothing without consent. */
export function track(name: EventName, params: Params = {}) {
  const g = gtag();
  if (!g) return;
  g("event", name, { ...sectionOf(window.location.pathname), ...params });
}

/** Apply a change of mind after GA has loaded: stop or resume sending, and drop its cookies on refusal. */
export function applyConsent(id: string, consent: Consent) {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, boolean>)[`ga-disable-${id}`] = consent !== "granted";
  gtag()?.("consent", "update", { analytics_storage: consent });
  if (consent === "denied") {
    for (const c of document.cookie.split(";")) {
      const name = c.split("=")[0].trim();
      if (name.startsWith("_ga")) document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname.replace(/^www\./, ".")}`;
    }
  }
}
