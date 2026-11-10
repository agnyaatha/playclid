import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RouteLoader } from "@/ui/loading/RouteLoader";
import { GAMES, findGame } from "@/games/registry";
import { ChallengeList } from "@/ui/lessons/ChallengeList";

type Params = Promise<{ game: string }>;

export function generateStaticParams() {
  return Object.entries(GAMES).flatMap(([game, entry]) => (entry!.challenges.length ? [{ game }] : []));
}

export async function generateMetadata({ params }: { params: Params }) {
  const entry = findGame((await params).game);
  return { title: entry ? `${entry.game.name} challenges` : "Not found" };
}

export default function Challenges({ params }: { params: Params }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <Suspense fallback={<RouteLoader />}>
        <ChallengesContent params={params} />
      </Suspense>
    </main>
  );
}

async function ChallengesContent({ params }: { params: Params }) {
  const entry = findGame((await params).game);
  if (!entry || entry.challenges.length === 0) notFound();
  return (
    <>
      <header>
        <p className="eyebrow">{entry.game.name}</p>
        <h1 className="display mt-2 text-5xl font-semibold">Challenges</h1>
        <p className="mt-3 text-muted">A scattered table, marked targets and a limited number of shots. Fewer shots earn more stars.</p>
      </header>
      <ChallengeList gameId={entry.id} />
    </>
  );
}
