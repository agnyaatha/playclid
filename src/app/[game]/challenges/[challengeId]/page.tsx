import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GAMES, findGame } from "@/games/registry";
import { ChallengePlayer } from "@/ui/lessons/ChallengePlayer";

type Params = Promise<{ game: string; challengeId: string }>;

export function generateStaticParams() {
  return Object.entries(GAMES).flatMap(([game, entry]) => entry!.challenges.map((c) => ({ game, challengeId: c.id })));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { game, challengeId } = await params;
  const challenge = findGame(game)?.challenges.find((c) => c.id === challengeId);
  return { title: challenge?.title ?? "Not found" };
}

export default function ChallengePage({ params }: { params: Params }) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<p className="p-6 text-muted">Setting up the table…</p>}>
        <ChallengeContent params={params} />
      </Suspense>
    </main>
  );
}

async function ChallengeContent({ params }: { params: Params }) {
  const { game, challengeId } = await params;
  const entry = findGame(game);
  const index = entry?.challenges.findIndex((c) => c.id === challengeId) ?? -1;
  if (!entry || index < 0) notFound();
  const challenge = entry.challenges[index];
  const next = entry.challenges[index + 1];
  return <ChallengePlayer key={challenge.id} gameId={entry.id} challenge={challenge} nextHref={next ? `/${entry.id}/challenges/${next.id}` : undefined} />;
}
