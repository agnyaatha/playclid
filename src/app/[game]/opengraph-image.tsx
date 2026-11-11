import { SITE_NAME } from "@/core/site";
import { GAMES, findGame } from "@/games/registry";
import { SHARE_SIZE, shareCard } from "@/ui/og/ShareCard";

export const alt = `A game table from ${SITE_NAME}, the free cue sports and table games trainer`;
export const size = SHARE_SIZE;
export const contentType = "image/png";

/** One preview per game, made at build time. Lessons and challenges inside the game share it. */
export function generateStaticParams() {
  return Object.keys(GAMES).map((game) => ({ game }));
}

export default async function Image({ params }: { params: Promise<{ game: string }> }) {
  const entry = findGame((await params).game) ?? { id: "snooker" as const, ...GAMES.snooker! };
  return shareCard({
    eyebrow: `${entry.game.name} · ${entry.lessons.length} free lessons`,
    title: `Learn ${entry.game.name}`,
    subtitle: entry.blurb,
    gameId: entry.id,
  });
}
