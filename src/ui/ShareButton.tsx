"use client";

import { useState } from "react";
import { track } from "@/core/analytics/track";

/**
 * Shares the current page: the phone's own share sheet where there is one (WhatsApp, Messages, Instagram...),
 * otherwise copies the link.
 */
export function ShareButton({ title, text, className = "btn btn-ghost" }: { title: string; text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        track("share", { method: "native", content_type: "page" });
      } catch {
        /* the visitor closed the share sheet */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track("share", { method: "copy_link", content_type: "page" });
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  return (
    <button type="button" className={className} onClick={share}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}
