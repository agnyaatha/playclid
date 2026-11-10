"use client";

import { useEffect } from "react";

/** Registers the offline service worker in production builds only, so development never serves stale files. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is optional: the app works the same without it */
    });
  }, []);
  return null;
}
