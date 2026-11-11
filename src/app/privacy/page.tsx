import Link from "next/link";
import { pageMetadata, SITE_NAME } from "@/core/site";
import { PrivacyChoice } from "@/ui/analytics/PrivacyChoice";

export const metadata = pageMetadata({
  title: "Privacy",
  description: `What ${SITE_NAME} stores on your device, what usage statistics it collects with your consent, and how to change your choice.`,
  path: "/privacy",
  game: "snooker",
});

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function Privacy() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-12 leading-relaxed">
      <h1 className="display text-5xl font-semibold">Privacy</h1>
      <p className="text-muted">
        {SITE_NAME} has no accounts and asks for nothing about you. This page explains the little it does store and send.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl font-semibold">On your device</h2>
        <p className="text-muted">
          Your lesson progress, scores and settings (theme, sound, 2D or 3D, aiming aids) are saved in your browser&apos;s local
          storage so they are there next time. They never leave your device and are not cookies. Clearing your browser&apos;s
          site data removes them.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl font-semibold">Usage statistics, only if you agree</h2>
        <p className="text-muted">
          If you choose <strong>Allow</strong>, the site loads Google Analytics, which sets cookies (named <code>_ga</code> and{" "}
          <code>_ga_…</code>) to count visits and see which games and sections are used: pages viewed, shots played, lessons
          finished and views switched. Google receives your IP address with each request, as with any website it serves. Ads
          features are turned off and nothing you type is sent. Until you choose, and if you decline, Google Analytics is not
          loaded and no analytics cookies are set.
        </p>
        <p className="text-muted">You can change your mind at any time, here or under Settings on any table:</p>
        <PrivacyChoice />
        <p className="text-sm text-muted">Turning it off stops collection straight away and deletes the analytics cookies from this browser.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl font-semibold">Hosting</h2>
        <p className="text-muted">
          The site is served by Vercel, which keeps short-lived request logs (such as IP addresses) to run and protect the
          service.
        </p>
      </section>

      {CONTACT && (
        <section className="flex flex-col gap-2">
          <h2 className="display text-2xl font-semibold">Contact</h2>
          <p className="text-muted">
            Questions about your data: <a className="text-brass underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </p>
        </section>
      )}

      <Link href="/" className="btn btn-ghost self-start">
        Back to the games
      </Link>
    </main>
  );
}
