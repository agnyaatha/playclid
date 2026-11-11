"use client";

import { Toggle } from "@/ui/kit";
import { useAnalyticsConsent } from "./Analytics";

/** The analytics switch, for the privacy page: the same choice as the banner and Settings. */
export function PrivacyChoice() {
  const { consent, setConsent, enabled } = useAnalyticsConsent();
  if (!enabled) return <p className="text-muted">Usage statistics are not collected on this copy of the site.</p>;
  return (
    <div className="max-w-sm rounded-xl border border-line p-4">
      <Toggle label="Share anonymous usage stats" checked={consent === "granted"} onChange={(on) => setConsent(on ? "granted" : "denied")} />
    </div>
  );
}
