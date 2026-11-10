import type { GameId } from "@/core/game";
import type { Lesson } from "@/core/lessons/schema";

export const lessonHref = (gameId: GameId, lessonId: string) => `/${gameId}/lessons/${lessonId}`;

/** The lesson after `id` in curriculum order, or null at the end. */
export function nextLesson(lessons: Lesson[], id: string): Lesson | null {
  const i = lessons.findIndex((l) => l.id === id);
  return i >= 0 && i + 1 < lessons.length ? lessons[i + 1] : null;
}

export interface ModuleGroup {
  module: string;
  title: string;
  lessons: Lesson[];
}

/** Group an ordered lesson list by module, keeping curriculum order. */
export function groupByModule(lessons: Lesson[]): ModuleGroup[] {
  const groups: ModuleGroup[] = [];
  for (const l of lessons) {
    let g = groups.find((x) => x.module === l.module);
    if (!g) {
      g = { module: l.module, title: l.moduleTitle, lessons: [] };
      groups.push(g);
    }
    g.lessons.push(l);
  }
  return groups;
}
