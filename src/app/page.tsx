import Link from "next/link";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/core/site";
import { FAMILIES, getGame } from "@/games/registry";
import { HeroTable } from "@/ui/HeroTable";
import { JsonLd } from "@/ui/JsonLd";
import { ShareButton } from "@/ui/ShareButton";

const GAME_IDS = FAMILIES.flatMap((f) => f.ids);
const GAME_NAMES = GAME_IDS.map((id) => getGame(id).game.name);
const LESSON_COUNT = GAME_IDS.reduce((n, id) => n + getGame(id).lessons.length, 0);

const FEATURES = [
  {
    title: "Real ball physics",
    text: "Sliding, rolling and spin, throw and squirt, cushion rebounds and pocket jaws, built on published measurements of real balls and cloth. What works here works on the table.",
  },
  {
    title: "Lessons that fade the aids",
    text: `${LESSON_COUNT} step-by-step lessons and drills, from stance and straight pots to breaks and safety. Aiming lines help at first and fall away as you improve.`,
  },
  {
    title: "Challenges and a coach",
    text: "Clear-the-table puzzles in a set number of shots, a coach that suggests a shot, and stats that show where your game is improving.",
  },
  {
    title: "Free, private, offline",
    text: "No account, no ads, no download. Progress stays on your device, and once loaded the app works without a connection. Add it to your home screen like an app.",
  },
];

const FAQ = [
  { q: `Is ${SITE_NAME} free?`, a: "Yes. Every game, lesson and challenge is free, with no account and no ads." },
  { q: "Which games can I learn?", a: `${GAME_NAMES.slice(0, -1).join(", ")} and ${GAME_NAMES[GAME_NAMES.length - 1]}.` },
  {
    q: "How realistic is the physics?",
    a: "Each shot is solved exactly with an event-based engine: balls slide, roll and spin; cut shots throw; side spin squirts the cue ball; cushions and pocket jaws bounce balls as real ones do. The values come from published billiards research, such as Alciatore's measurements and Mathavan's cushion model.",
  },
  { q: "Does it work on my phone?", a: "Yes. It runs in any modern browser on phones, tablets and computers, and can be added to your home screen to use offline." },
  { q: "Where is my progress saved?", a: "On your own device, in the browser. Nothing is uploaded, so there is nothing to sign up for. Clearing your browser data resets it." },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col overflow-x-clip">
      <section className="relative isolate min-h-[34rem] lg:min-h-[calc(100dvh-var(--header)-9rem)]">
        <div className="absolute inset-y-0 left-[34%] right-[-34%] -z-10 hidden opacity-95 md:block">
          <div className="hero-table absolute inset-0">
            <HeroTable />
          </div>
        </div>
        <div className="absolute inset-x-0 top-[17rem] h-64 -z-10 md:hidden">
          <div className="hero-table absolute inset-0">
            <HeroTable />
          </div>
        </div>
        <div className="max-w-xl px-5 pt-14 sm:px-10 lg:pt-24">
          <p className="eyebrow rise">Free snooker, pool and carrom trainer</p>
          <h1 className="display rise mt-4 text-[3.25rem] font-semibold leading-[0.98] sm:text-7xl" style={{ animationDelay: "80ms" }}>
            Learn the table, one shot at a time.
          </h1>
          <p className="rise mt-5 max-w-md text-lg leading-relaxed text-muted max-md:hidden" style={{ animationDelay: "160ms" }}>
            A real physics engine under guided drills that fade the aiming aids as you improve. Your progress stays on this device.
          </p>
        </div>
      </section>

      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: SITE_NAME,
            url: siteUrl().href,
            description: SITE_DESCRIPTION,
            applicationCategory: "GameApplication",
            applicationSubCategory: "Sports training",
            operatingSystem: "Any (web browser)",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            image: new URL("/opengraph-image", siteUrl()).href,
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Games you can learn on ${SITE_NAME}`,
            itemListElement: GAME_IDS.map((id, i) => ({ "@type": "ListItem", position: i + 1, name: getGame(id).game.name, url: new URL(`/${id}`, siteUrl()).href })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          },
        ]}
      />

      {FAMILIES.map((family) => (
        <section key={family.title} aria-label={family.title} className="relative border-t border-line bg-ink">
          <h2 className="eyebrow px-5 pt-6 sm:px-10">{family.title}</h2>
          <ul className="grid md:grid-cols-3">
            {family.ids.map((id, i) => {
              const entry = getGame(id);
              return (
                <li key={id} className={`flex flex-col gap-3 px-5 py-6 sm:px-10 ${i > 0 ? "border-line max-md:border-t md:border-l" : ""}`}>
                  <div className="flex items-baseline justify-between">
                    <h3 className="display text-3xl font-semibold">{entry.game.name}</h3>
                    <span className="text-xs tabular-nums text-muted">{entry.lessons.length} lessons</span>
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-muted">{entry.blurb}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/${id}`} className="btn btn-primary">
                      Start learning
                    </Link>
                    <Link href={`/${id}/practice`} className="btn btn-ghost">
                      Practice
                    </Link>
                    {entry.challenges.length > 0 && (
                      <Link href={`/${id}/challenges`} className="btn btn-ghost">
                        Challenges
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section aria-labelledby="why" className="border-t border-line bg-ink px-5 py-12 sm:px-10">
        <h2 id="why" className="display text-4xl font-semibold">A practice table that plays like the real one</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">
          {SITE_NAME} is a free snooker, pool and carrom trainer that runs in your browser. Line up a shot, see where every ball will go,
          then learn to play it without the guides.
        </p>
        <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <h3 className="display text-2xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq" className="border-t border-line bg-ink px-5 py-12 sm:px-10">
        <h2 id="faq" className="display text-4xl font-semibold">Questions</h2>
        <div className="mt-6 flex max-w-3xl flex-col divide-y divide-line border-y border-line">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group py-4">
              <summary className="cursor-pointer list-none text-lg font-semibold marker:hidden">
                <span className="mr-2 inline-block text-brass transition-transform group-open:rotate-90">›</span>
                {q}
              </summary>
              <p className="mt-2 pl-5 leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="share" className="border-t border-line bg-ink px-5 py-12 sm:px-10">
        <h2 id="share" className="display text-3xl font-semibold">Know someone who plays?</h2>
        <p className="mt-2 max-w-xl leading-relaxed text-muted">Send them the table. It is free and opens straight in the browser.</p>
        <div className="mt-5">
          <ShareButton title={SITE_NAME} text="Learn snooker, pool and carrom on a real physics table. Free, in your browser." className="btn btn-primary" />
        </div>
      </section>
    </main>
  );
}
