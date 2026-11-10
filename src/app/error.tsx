"use client";

import Link from "next/link";

/** Shown if a page throws: a way back instead of a blank screen. Saved progress is not affected. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-4 px-5 py-16">
      <p className="eyebrow">Foul</p>
      <h1 className="display text-4xl font-semibold">Something went wrong at the table.</h1>
      <p className="text-muted">Your saved progress is safe. Try again, or head back to the start.</p>
      <div className="flex gap-2">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Home
        </Link>
      </div>
    </main>
  );
}
