import { notFound } from "next/navigation";
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
  return { title: entry ? `${entry.game.name} stats` : "Not found" };
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
