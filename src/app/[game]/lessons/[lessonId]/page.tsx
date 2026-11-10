import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RouteLoader } from "@/ui/loading/RouteLoader";
import { GAMES, findGame } from "@/games/registry";
import { BreakPlayer } from "@/ui/lessons/BreakPlayer";
import { DrillPlayer } from "@/ui/lessons/DrillPlayer";
import { lessonHref, nextLesson } from "@/ui/lessons/lessonNav";
import { WatchLessonView } from "@/ui/lessons/WatchLessonView";

type Params = Promise<{ game: string; lessonId: string }>;

export function generateStaticParams() {
  return Object.entries(GAMES).flatMap(([game, entry]) => entry!.lessons.map((l) => ({ game, lessonId: l.id })));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { game, lessonId } = await params;
  const lesson = findGame(game)?.lessons.find((l) => l.id === lessonId);
  return { title: lesson?.title ?? "Not found" };
}

export default function LessonPage({ params }: { params: Params }) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<RouteLoader />}>
        <LessonContent params={params} />
      </Suspense>
    </main>
  );
}

async function LessonContent({ params }: { params: Params }) {
  const { game, lessonId } = await params;
  const entry = findGame(game);
  const lesson = entry?.lessons.find((l) => l.id === lessonId);
  if (!entry || !lesson) notFound();

  const next = nextLesson(entry.lessons, lesson.id);
  const nextHref = next ? lessonHref(entry.id, next.id) : undefined;

  if (lesson.kind === "drill") return <DrillPlayer key={lesson.id} gameId={entry.id} lesson={lesson} nextHref={nextHref} />;
  if (lesson.kind === "break") return <BreakPlayer key={lesson.id} gameId={entry.id} lesson={lesson} nextHref={nextHref} />;
  return <WatchLessonView gameId={entry.id} lesson={lesson} nextHref={nextHref} />;
}
