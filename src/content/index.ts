/**
 * Loads every JSON file in /content at build time. Adding a lesson is just
 * dropping a new file into /content/lessons — no code changes needed.
 */
import {
  ConfigSchema,
  ExerciseSetSchema,
  GrammarSchema,
  LessonSchema,
  ReadingSchema,
  type ExerciseSet,
  type Grammar,
  type Lesson,
  type Reading,
  type VocabItem,
} from "./schema";
import rawConfig from "../../content/config.json";

const lessonFiles = import.meta.glob("../../content/lessons/*.json", { eager: true, import: "default" });
const grammarFiles = import.meta.glob("../../content/grammar/*.json", { eager: true, import: "default" });
const exerciseFiles = import.meta.glob("../../content/exercises/*.json", { eager: true, import: "default" });
const readingFiles = import.meta.glob("../../content/readings/*.json", { eager: true, import: "default" });

export const config = ConfigSchema.parse(rawConfig);

export const lessons: Lesson[] = Object.values(lessonFiles)
  .map((f) => LessonSchema.parse(f))
  .sort((a, b) => a.order - b.order);

export const grammar: Grammar[] = Object.values(grammarFiles)
  .map((f) => GrammarSchema.parse(f))
  .sort((a, b) => a.order - b.order);

export const exerciseSets: Record<string, ExerciseSet> = Object.fromEntries(
  Object.values(exerciseFiles).map((f) => {
    const s = ExerciseSetSchema.parse(f);
    return [s.id, s];
  })
);

export const readings: Record<string, Reading> = Object.fromEntries(
  Object.values(readingFiles).map((f) => {
    const r = ReadingSchema.parse(f);
    return [r.id, r];
  })
);

/** A flashcard: one vocab item, with a stable id and its lesson. */
export interface Card extends VocabItem {
  id: string;
  lessonId: string;
  group: string;
}

export const cardsByLesson: Record<string, Card[]> = Object.fromEntries(
  lessons.map((l) => [
    l.id,
    l.vocab.flatMap((g) =>
      g.items.map((v) => ({ ...v, id: `${l.id}:${v.hu}`, lessonId: l.id, group: g.name }))
    ),
  ])
);

export const allCards: Card[] = lessons.flatMap((l) => cardsByLesson[l.id]);
export const cardById: Record<string, Card> = Object.fromEntries(allCards.map((c) => [c.id, c]));

export const lessonById: Record<string, Lesson> = Object.fromEntries(lessons.map((l) => [l.id, l]));
export const grammarById: Record<string, Grammar> = Object.fromEntries(grammar.map((g) => [g.id, g]));

/** Lower-case word → meaning, built from single-word vocab across all lessons. */
export function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[„”“"'’!?.,:;()…–—]/g, "")
    .trim();
}
export const dictionary: Record<string, string> = {};
for (const c of allCards) {
  if (c.kind === "rule") continue;
  const key = normalizeWord(c.hu);
  if (key && !key.includes(" ") && !(key in dictionary)) dictionary[key] = c.en;
}
