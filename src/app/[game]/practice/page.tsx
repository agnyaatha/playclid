import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RouteLoader } from "@/ui/loading/RouteLoader";
import { GAMES, findGame } from "@/games/registry";
import { PracticeTable } from "@/ui/PracticeTable";

type Params = Promise<{ game: string }>;

export function generateStaticParams() {
  return Object.keys(GAMES).map((game) => ({ game }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const entry = findGame((await params).game);
  return { title: entry ? `${entry.game.name} practice` : "Not found" };
}

export default function Practice({ params }: { params: Params }) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<RouteLoader label="Racking the balls" />}>
        <PracticeContent params={params} />
      </Suspense>
    </main>
  );
}

async function PracticeContent({ params }: { params: Params }) {
  const entry = findGame((await params).game);
  if (!entry) notFound();
  return (
    <>
      <h1 className="sr-only">{entry.game.name} practice table</h1>
      <PracticeTable gameId={entry.id} />
    </>
  );
}
