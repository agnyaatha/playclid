import { notFound } from "next/navigation";
import { pageMetadata } from "@/core/site";
import { Suspense } from "react";
import { RouteLoader } from "@/ui/loading/RouteLoader";
import { GAMES, findGame } from "@/games/registry";
import { StatsView } from "@/ui/lessons/StatsView";

type Params = Promise<{ game: string }>;

export function generateStaticParams() {
  return Object.keys(GAMES).map((game) => ({ game }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const entry = findGame((await params).game);
  if (!entry) return { title: "Not found" };
  // Stats are the visitor's own progress, stored on their device: nothing for a search engine to show.
  return pageMetadata({ title: `${entry.game.name} stats`, description: `Your ${entry.game.name} progress and shot statistics.`, path: `/${entry.id}/stats`, game: entry.id, index: false });
}

export default function Stats({ params }: { params: Params }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-10">
      <Suspense fallback={<RouteLoader />}>
        <StatsContent params={params} />
      </Suspense>
    </main>
  );
}

async function StatsContent({ params }: { params: Params }) {
  const entry = findGame((await params).game);
  if (!entry) notFound();
  return (
    <>
      <header>
        <p className="eyebrow">{entry.game.name}</p>
        <h1 className="display mt-2 text-5xl font-semibold">Your numbers</h1>
        <p className="mt-3 text-muted">How your potting holds up with and without the aids. Stored only on this device.</p>
      </header>
      <StatsView gameId={entry.id} />
    </>
  );
}
