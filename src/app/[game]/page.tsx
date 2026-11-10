import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GAMES, findGame } from "@/games/registry";
import { CurriculumList } from "@/ui/lessons/CurriculumList";

type Params = Promise<{ game: string }>;

export function generateStaticParams() {
  return Object.keys(GAMES).map((game) => ({ game }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const entry = findGame((await params).game);
  return { title: entry ? `${entry.game.name} curriculum` : "Not found" };
}

/** The shell is the same for every game; the game itself is read from the URL inside the Suspense boundary. */
/** The shell is the same for every game; the game itself is read from the URL inside the Suspense boundary. */
export default function GameHub({ params }: { params: Params }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 lg:py-14">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Hub params={params} />
      </Suspense>
    </main>
  );
}

async function Hub({ params }: { params: Params }) {
  const entry = findGame((await params).game);
  if (!entry) notFound();
  return <CurriculumList gameId={entry.id} />;
}
