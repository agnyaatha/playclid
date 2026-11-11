import { notFound } from "next/navigation";
import { breadcrumbs, pageMetadata, SITE_NAME, siteUrl } from "@/core/site";
import { JsonLd } from "@/ui/JsonLd";
import { Suspense } from "react";
import { RouteLoader } from "@/ui/loading/RouteLoader";
import { GAMES, findGame } from "@/games/registry";
import { CurriculumList } from "@/ui/lessons/CurriculumList";

type Params = Promise<{ game: string }>;

export function generateStaticParams() {
  return Object.keys(GAMES).map((game) => ({ game }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const entry = findGame((await params).game);
  if (!entry) return { title: "Not found" };
  return pageMetadata({
    title: `Learn ${entry.game.name}: free lessons and drills`,
    description: `${entry.blurb} ${entry.lessons.length} free step-by-step lessons on a physics-based ${entry.game.name} table, in your browser.`,
    path: `/${entry.id}`, game: entry.id,
  });
}

/** The shell is the same for every game; the game itself is read from the URL inside the Suspense boundary. */
/** The shell is the same for every game; the game itself is read from the URL inside the Suspense boundary. */
export default function GameHub({ params }: { params: Params }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 lg:py-14">
      <Suspense fallback={<RouteLoader />}>
        <Hub params={params} />
      </Suspense>
    </main>
  );
}

async function Hub({ params }: { params: Params }) {
  const entry = findGame((await params).game);
  if (!entry) notFound();
  const name = entry.game.name;
  return (
    <>
      <JsonLd
        data={[
          breadcrumbs([[name, `/${entry.id}`]]),
          {
            "@context": "https://schema.org",
            "@type": "Course",
            name: `Learn ${name}`,
            description: entry.blurb,
            url: new URL(`/${entry.id}`, siteUrl()).href,
            provider: { "@type": "Organization", name: SITE_NAME, url: siteUrl().href },
            isAccessibleForFree: true,
            educationalLevel: "Beginner",
            inLanguage: "en",
            numberOfLessons: entry.lessons.length,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD", category: "Free" },
            hasCourseInstance: { "@type": "CourseInstance", courseMode: "Online", courseWorkload: `PT${entry.lessons.length * 10}M` },
          },
        ]}
      />
      <CurriculumList gameId={entry.id} />
    </>
  );
}
