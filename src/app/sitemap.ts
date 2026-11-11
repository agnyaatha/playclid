import type { MetadataRoute } from "next";
import { siteUrl } from "@/core/site";
import { GAMES } from "@/games/registry";

/** Every public page: the home page, each game's hub and sections, and every lesson and challenge. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const at = (path: string, priority: number, changeFrequency: "weekly" | "monthly" = "monthly") => ({
    url: new URL(path, base).href,
    changeFrequency,
    priority,
  });
  return [
    at("/", 1, "weekly"),
    ...Object.entries(GAMES).flatMap(([id, entry]) => [
      at(`/${id}`, 0.9, "weekly"),
      at(`/${id}/practice`, 0.8),
      ...(entry!.challenges.length ? [at(`/${id}/challenges`, 0.7)] : []),
      ...entry!.lessons.map((l) => at(`/${id}/lessons/${l.id}`, 0.6)),
      ...entry!.challenges.map((c) => at(`/${id}/challenges/${c.id}`, 0.5)),
    ]),
    at("/privacy", 0.2),
  ];
}
