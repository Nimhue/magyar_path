/**
 * Loads every JSON file in /content at build time. Adding a lesson, a story or
 * a dictionary category is just dropping a new file into /content.
 */
import {
  ConfigSchema,
  DictionarySchema,
  ExerciseSetSchema,
  GrammarSchema,
  LessonSchema,
  ReadingSchema,
  StorySchema,
  DiscoverSchema,
  ProverbsSchema,
  TwistersSchema,
  SongsSchema,
  RecipesSchema,
  TaleSchema,
  type Tale,
  type DiscoverPlace,
  type DictCategory,
  type ExerciseSet,
  type Grammar,
  type Lesson,
  type Reading,
  type Story,
  type VocabItem,
} from "./schema";
import rawConfig from "../../content/config.json";
import rawProverbs from "../../content/culture/proverbs.json";
import rawTwisters from "../../content/culture/tongue-twisters.json";
import rawSongs from "../../content/culture/songs.json";
import rawRecipes from "../../content/culture/recipes.json";

const lessonFiles = import.meta.glob("../../content/lessons/*.json", { eager: true, import: "default" });
const grammarFiles = import.meta.glob("../../content/grammar/*.json", { eager: true, import: "default" });
const exerciseFiles = import.meta.glob("../../content/exercises/*.json", { eager: true, import: "default" });
const readingFiles = import.meta.glob("../../content/readings/*.json", { eager: true, import: "default" });
const storyFiles = import.meta.glob("../../content/stories/*.json", { eager: true, import: "default" });
const dictFiles = import.meta.glob("../../content/dictionary/*.json", { eager: true, import: "default" });
const taleFiles = import.meta.glob("../../content/tales/*.json", { eager: true, import: "default" });
const discoverFiles = import.meta.glob("../../content/discover/*.json", { eager: true, import: "default" });

export const config = ConfigSchema.parse(rawConfig);

export const lessons: Lesson[] = Object.values(lessonFiles)
  .map((f) => LessonSchema.parse(f))
  .sort((a, b) => a.order - b.order);

export const grammar: Grammar[] = Object.values(grammarFiles)
  .map((f) => GrammarSchema.parse(f))
  .sort((a, b) => a.order - b.order);

const byId = <T extends { id: string }>(list: T[]): Record<string, T> => Object.fromEntries(list.map((x) => [x.id, x]));

export const exerciseSets: Record<string, ExerciseSet> = byId(Object.values(exerciseFiles).map((f) => ExerciseSetSchema.parse(f)));
export const readings: Record<string, Reading> = byId(Object.values(readingFiles).map((f) => ReadingSchema.parse(f)));
export const stories: Record<string, Story> = byId(Object.values(storyFiles).map((f) => StorySchema.parse(f)));
export const dictionaryCats: DictCategory[] = Object.values(dictFiles)
  .map((f) => DictionarySchema.parse(f))
  .sort((a, b) => a.order - b.order);
export const dictCatById = byId(dictionaryCats);

export const places: DiscoverPlace[] = Object.values(discoverFiles)
  .map((f) => DiscoverSchema.parse(f))
  .sort((a, b) => a.name.localeCompare(b.name, "hu"));
export const placeById = byId(places);
export const tales: Tale[] = Object.values(taleFiles)
  .map((f) => TaleSchema.parse(f))
  .sort((a, b) => a.order - b.order);
export const taleById = byId(tales);
export const proverbs = ProverbsSchema.parse(rawProverbs).items;
export const twisters = TwistersSchema.parse(rawTwisters).items;
export const songs = SongsSchema.parse(rawSongs).items;
export const recipes = RecipesSchema.parse(rawRecipes).items;
/** always-open scenario stories (no lesson), e.g. the survival pack */
export const scenarios = Object.values(stories).filter((s) => !s.lesson);

/** A flashcard: one vocab item, with a stable id and where it comes from. */
export interface Card extends VocabItem {
  id: string;
  /** lesson id, or "dict:<category>" for dictionary words */
  lessonId: string;
  group: string;
}

export const cardsByLesson: Record<string, Card[]> = Object.fromEntries(
  lessons.map((l) => [
    l.id,
    l.vocab.flatMap((g) => g.items.map((v) => ({ ...v, id: `${l.id}:${v.hu}`, lessonId: l.id, group: g.name }))),
  ])
);

export const cardsByDict: Record<string, Card[]> = Object.fromEntries(
  dictionaryCats.map((c) => [
    c.id,
    c.groups.flatMap((g) => g.items.map((v) => ({ ...v, id: `dict:${c.id}:${v.hu}`, lessonId: `dict:${c.id}`, group: g.name }))),
  ])
);

export const allLessonCards: Card[] = lessons.flatMap((l) => cardsByLesson[l.id]);
export const allDictCards: Card[] = dictionaryCats.flatMap((c) => cardsByDict[c.id]);
export const allCards: Card[] = [...allLessonCards, ...allDictCards];
export const cardById: Record<string, Card> = Object.fromEntries(allCards.map((c) => [c.id, c]));

export const lessonById: Record<string, Lesson> = byId(lessons);
export const grammarById: Record<string, Grammar> = byId(grammar);

export function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[„”“"'’!?.,:;()…–—]/g, "")
    .trim();
}

/** Lower-case word → meanings, from single-word vocab in lessons and the dictionary. */
export const dictionary: Record<string, { en: string; ro?: string }> = {};
for (const c of allCards) {
  if (c.kind === "rule") continue;
  const key = normalizeWord(c.hu);
  if (key && !key.includes(" ") && !(key in dictionary)) dictionary[key] = { en: c.en, ro: c.ro };
}

/** Where a card comes from, for labels. */
export function sourceLabel(c: Card) {
  if (c.lessonId.startsWith("dict:")) return dictCatById[c.lessonId.slice(5)]?.titleEn ?? "Dictionary";
  return lessonById[c.lessonId]?.title ?? "";
}

/** Meaning of a single word for tap-to-translate, with Romanian if wanted. */
export function lookupWord(word: string, glossary: Record<string, string>, showRo: boolean): string | null {
  const w = normalizeWord(word);
  if (!w) return null;
  for (const [k, v] of Object.entries(glossary)) if (normalizeWord(k) === w) return v;
  const d = dictionary[w];
  if (!d) return null;
  return showRo && d.ro ? `${d.en} · RO: ${d.ro}` : d.en;
}
