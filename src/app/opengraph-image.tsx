import { SITE_NAME } from "@/core/site";
import { SHARE_SIZE, shareCard } from "@/ui/og/ShareCard";

export const alt = `${SITE_NAME}: learn snooker, pool and carrom on a real physics table`;
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return shareCard({
    eyebrow: SITE_NAME,
    title: "Learn the table, one shot at a time.",
    subtitle: "Snooker, pool, carrom and five more games, with guided drills on a real physics table.",
    gameId: "snooker",
  });
}
