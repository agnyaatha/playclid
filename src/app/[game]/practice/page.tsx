import { notFound } from "next/navigation";
import { pageMetadata } from "@/core/site";
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
  if (!entry) return { title: "Not found" };
  return pageMetadata({
    title: `${entry.game.name} practice table`,
    description: `Play ${entry.game.name} online on a free practice table with real ball physics, aiming guides and a coach. ${entry.blurb}`,
    path: `/${entry.id}/practice`, game: entry.id,
  });
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
