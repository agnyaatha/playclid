"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { usePref } from "@/core/prefs/usePref";
import { applyConsent, GA_ID, isConsent, type Consent } from "@/core/analytics/track";

const noSubscribe = () => () => {};

/** The visitor's analytics choice, or null if they have not been asked yet. */
export function useAnalyticsConsent() {
  const [consent, setStored] = usePref<Consent | null>("analytics", null, isConsent);
  const set = (c: Consent) => {
    setStored(c);
    if (GA_ID) applyConsent(GA_ID, c);
  };
  return { consent, setConsent: set, enabled: GA_ID !== null };
}

/**
 * Loads Google Analytics once the visitor agrees, and asks them first. Without a measurement ID it renders nothing.
 * Ads features are turned off: this is only for counting visits and what people use.
 */
export function Analytics() {
  const { consent, setConsent } = useAnalyticsConsent();
  // The stored choice is only known after hydration; asking before then would flash the banner at returning visitors.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (!GA_ID || !hydrated) return null;

  if (consent === "granted") {
    return (
      <>
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;` +
            `gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});` +
            `gtag('js',new Date());gtag('config','${GA_ID}',{allow_google_signals:false,allow_ad_personalization_signals:false});`}
        </Script>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      </>
    );
  }
  if (consent === "denied") return null;

  return (
    // A small card in the bottom-left corner, clear of the shot controls on the right.
    <div role="dialog" aria-label="Usage statistics" className="fixed bottom-3 left-3 right-3 z-50 sm:right-auto sm:max-w-sm">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-ink p-4 text-sm shadow-lg">
        <p>
          Can we count visits and which parts of Table Craft you use? It helps us decide what to improve. We use Google
          Analytics cookies only if you agree, and never for ads. You can change this in Settings.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" className="chip cursor-pointer" onClick={() => setConsent("denied")}>
            No thanks
          </button>
          <button type="button" className="chip cursor-pointer text-brass" aria-pressed onClick={() => setConsent("granted")}>
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
