/** Facts about the site itself, shared by the metadata, sitemap, robots rules, sharing images and structured data. */

export const SITE_NAME = "PlayClid";

/** One sentence that works as a search snippet and a link preview. */
export const SITE_DESCRIPTION =
  "Free snooker, pool and carrom trainer in your browser. Practise on a real physics table, follow guided drills and lessons, and take on challenges. No sign-up.";

export const SITE_KEYWORDS = [
  "snooker practice",
  "snooker training app",
  "pool trainer",
  "8-ball pool practice",
  "9-ball",
  "carrom online",
  "billiards",
  "three-cushion",
  "crokinole",
  "shuffleboard",
  "cue sports lessons",
  "billiards physics simulator",
  "aiming drills",
  "cue ball control",
];

/**
 * The public address, used for absolute links in previews and the sitemap. NEXT_PUBLIC_SITE_URL wins (set it once a
 * custom domain is live); on Vercel the production domain is known at build time; locally it is localhost.
 */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL("http://localhost:3000");
}

/** Only the production deployment should be indexed; Vercel preview builds must stay out of search results. */
export const isIndexable = () => !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";

/** Serialise structured data for a <script> tag, escaping `<` so no string can close the tag early. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

/**
 * Metadata for one page: its title, description, canonical address and link preview. A page's `openGraph` replaces
 * the layout's rather than merging with it, so the shared fields are repeated here.
 */
export function pageMetadata({ title, description, path, game, index = true }: { title: string; description: string; path: string; game: string; index?: boolean }) {
  // A segment's opengraph-image only reaches that exact route, so pages below a game name its preview themselves.
  const images = [{ url: `/${game}/opengraph-image`, width: 1200, height: 630, alt: `${title} · ${SITE_NAME}` }];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website" as const, siteName: SITE_NAME, locale: "en_GB", url: path, title: `${title} · ${SITE_NAME}`, description, images },
    twitter: { card: "summary_large_image" as const, title: `${title} · ${SITE_NAME}`, description, images },
    ...(index ? {} : { robots: { index: false, follow: true } }),
  };
}

/** schema.org breadcrumbs from the home page down, given [name, path] pairs below it. */
export function breadcrumbs(trail: [string, string][]) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [[SITE_NAME, "/"] as [string, string], ...trail].map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: new URL(path, base).href })),
  };
}
