import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { GAMES } from "@/games/registry";
import { breadcrumbs, isIndexable, jsonLd, pageMetadata, siteUrl } from "./site";

describe("site metadata", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the explicit site URL, then Vercel's production domain, then localhost", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(siteUrl().origin).toBe("http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "table-craft.vercel.app");
    expect(siteUrl().origin).toBe("https://table-craft.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tablecraft.example");
    expect(siteUrl().origin).toBe("https://tablecraft.example");
  });

  it("keeps Vercel preview deployments out of search results", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isIndexable()).toBe(false);
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
    vi.stubEnv("VERCEL_ENV", "production");
    expect(isIndexable()).toBe(true);
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it("lists every game, lesson and challenge in the sitemap, each once", () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    expect(new Set(urls).size).toBe(urls.length);
    for (const [id, entry] of Object.entries(GAMES)) {
      expect(urls).toContain(`/${id}`);
      expect(urls).toContain(`/${id}/practice`);
      for (const l of entry!.lessons) expect(urls).toContain(`/${id}/lessons/${l.id}`);
      for (const c of entry!.challenges) expect(urls).toContain(`/${id}/challenges/${c.id}`);
    }
    // Personal stats are not for search engines.
    expect(urls.some((u) => u.endsWith("/stats"))).toBe(false);
  });

  it("gives each page a canonical address, a description and its game's preview image", () => {
    const m = pageMetadata({ title: "Pot the black", description: "A drill.", path: "/snooker/lessons/x", game: "snooker" });
    expect(m.alternates.canonical).toBe("/snooker/lessons/x");
    expect(m.openGraph.images[0].url).toBe("/snooker/opengraph-image");
    expect(m.twitter.card).toBe("summary_large_image");
    expect(pageMetadata({ title: "t", description: "d", path: "/p", game: "pool", index: false })).toHaveProperty("robots.index", false);
  });

  it("escapes structured data so a string cannot close its script tag", () => {
    expect(jsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("<");
    const crumbs = breadcrumbs([["Snooker", "/snooker"]]);
    expect(crumbs.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });
});
