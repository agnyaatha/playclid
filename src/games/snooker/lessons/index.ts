import type { Lesson } from "@/core/lessons/schema";
import { breakLessons } from "./breaks";
import { drillLessons } from "./drills";
import { watchLessons } from "./watch";

/** The snooker curriculum, ordered by module then lesson order (watch lessons come first in each module). */
export const snookerLessons: Lesson[] = [...watchLessons, ...drillLessons, ...breakLessons].sort(
  (a, b) => Number(a.module) - Number(b.module) || a.order - b.order,
);
