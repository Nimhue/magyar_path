/**
 * Content schema. Every JSON file under /content is checked against these
 * schemas at build time (npm run validate), so a typo fails the deploy
 * instead of breaking the live site.
 */
import { z } from "zod";

const id = z.string().regex(/^[a-z0-9-]+$/, "ids use lowercase letters, digits and dashes");

export const VocabItemSchema = z.object({
  hu: z.string().min(1),
  en: z.string().min(1),
  /** Romanian meaning (optional; shown when the learner picks Romanian in Settings) */
  ro: z.string().optional(),
  note: z.string().optional(),
  /** word = single word, phrase = sentence/expression, rule = grammar fact (not used in quizzes) */
  kind: z.enum(["word", "phrase", "rule"]).default("word"),
});

export const VocabGroupSchema = z.object({
  name: z.string(),
  items: z.array(VocabItemSchema).min(1),
});

export const LessonSchema = z.object({
  id,
  order: z.number().int().positive(),
  title: z.string(),
  titleEn: z.string(),
  /** class date, YYYY-MM-DD; omit for self-study units */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1"]).default("A1"),
  summary: z.string(),
  /** stop on the "journey around Hungary" map: shown on the path and when the lesson is finished */
  place: z
    .object({
      name: z.string(),
      fact: z.string(),
      lon: z.number().optional(),
      lat: z.number().optional(),
      /** drawing on the journey trail: parliament, palace, castle, village, church, basilica, fortress, lake (guessed from the name if left out) */
      icon: z.enum(["parliament", "palace", "castle", "village", "church", "basilica", "fortress", "lake", "star"]).optional(),
    })
    .optional(),
  grammar: z.array(id).default([]),
  exercises: z.array(id).default([]),
  readings: z.array(id).default([]),
  /** choose-your-path stories (content/stories) */
  stories: z.array(id).default([]),
  homework: z.array(z.string()).default([]),
  vocab: z.array(VocabGroupSchema).min(1),
});

const SectionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), text: z.string() }),
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("tip"), tone: z.enum(["info", "warn"]).default("info"), text: z.string() }),
  z.object({
    type: z.literal("table"),
    caption: z.string().optional(),
    head: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
  z.object({
    type: z.literal("examples"),
    items: z.array(z.object({ hu: z.string(), en: z.string(), note: z.string().optional() })),
  }),
  z.object({
    type: z.literal("pairs"),
    items: z.array(z.object({ a: z.string(), aEn: z.string(), b: z.string(), bEn: z.string() })),
  }),
  z.object({ type: z.literal("widget"), widget: z.enum(["harmony", "article", "van", "conjugate", "possessive", "location"]) }),
]);

export const GrammarSchema = z.object({
  id,
  order: z.number(),
  title: z.string(),
  titleEn: z.string(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1"]).default("A1"),
  /** lesson where this topic is introduced */
  lesson: id,
  summary: z.string(),
  sections: z.array(SectionSchema).min(1),
});

const ExerciseItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("choice"),
    prompt: z.string(),
    promptEn: z.string().optional(),
    options: z.array(z.string()).min(2),
    answer: z.string(),
    explain: z.string().optional(),
  }),
  z.object({
    type: z.literal("type"),
    prompt: z.string(),
    promptEn: z.string().optional(),
    answer: z.union([z.string(), z.array(z.string()).min(1)]),
    hint: z.string().optional(),
    explain: z.string().optional(),
  }),
  z.object({
    type: z.literal("listen"),
    say: z.string(),
    options: z.array(z.string()).min(2),
    answer: z.string(),
    explain: z.string().optional(),
  }),
  z.object({
    type: z.literal("sort"),
    prompt: z.string(),
    buckets: z.array(z.string()).min(2),
    items: z.array(z.object({ text: z.string(), bucket: z.string() })).min(2),
    explain: z.string().optional(),
  }),
  z.object({
    type: z.literal("match"),
    prompt: z.string(),
    pairs: z.array(z.object({ left: z.string(), right: z.string() })).min(2),
    explain: z.string().optional(),
  }),
  z.object({
    type: z.literal("order"),
    /** what the sentence should say, e.g. in English */
    prompt: z.string(),
    /** word tiles in any order; the correct order is the answer */
    tiles: z.array(z.string()).min(2),
    answer: z.union([z.string(), z.array(z.string()).min(1)]),
    explain: z.string().optional(),
  }),
]);

export const ExerciseSetSchema = z.object({
  id,
  lesson: id,
  title: z.string(),
  titleEn: z.string(),
  intro: z.string().optional(),
  items: z.array(ExerciseItemSchema).min(1),
});

export const ReadingSchema = z.object({
  id,
  lesson: id,
  title: z.string(),
  titleEn: z.string(),
  intro: z.string().optional(),
  paragraphs: z.array(z.string()).min(1),
  /** extra word meanings for this text; lesson vocab is looked up automatically */
  glossary: z.record(z.string()).default({}),
  questions: z
    .array(
      z.object({
        q: z.string(),
        qEn: z.string().optional(),
        options: z.array(z.string()).min(2),
        answer: z.string(),
        explain: z.string().optional(),
      })
    )
    .default([]),
});

const StoryNodeSchema = z.object({
  /** who is talking (optional), e.g. "Pincér" */
  speaker: z.string().optional(),
  text: z.string(),
  /** English translation, revealed on tap */
  textEn: z.string(),
  /** Romanian translation (optional), shown with the English when Romanian is on */
  textRo: z.string().optional(),
  choices: z
    .array(
      z.object({
        text: z.string(),
        textEn: z.string().optional(),
        textRo: z.string().optional(),
        to: z.string(),
        /** short note shown after picking this choice */
        note: z.string().optional(),
      })
    )
    .default([]),
  /** set on final nodes: how the story ended */
  end: z.enum(["great", "ok", "oops"]).optional(),
});

export const StorySchema = z.object({
  id,
  /** lesson it belongs to (locked until then); leave out for always-open scenario packs */
  lesson: id.optional(),
  /** scenario pack, e.g. "survival": shown under Practice, always open */
  pack: z.string().optional(),
  title: z.string(),
  titleEn: z.string(),
  intro: z.string().optional(),
  start: z.string(),
  nodes: z.record(StoryNodeSchema),
  glossary: z.record(z.string()).default({}),
});

export const DictionarySchema = z.object({
  id,
  order: z.number(),
  title: z.string(),
  titleEn: z.string(),
  /** one of: red, paprika, yellow, green, teal, blue, purple, pink, gray */
  color: z.enum(["red", "paprika", "yellow", "green", "teal", "blue", "purple", "pink", "gray"]),
  /** big letter(s) on the category tile */
  mark: z.string().max(3),
  intro: z.string().optional(),
  groups: z.array(VocabGroupSchema).min(1),
});

const Tri = z.object({ hu: z.string().min(1), en: z.string().min(1), ro: z.string().min(1) });

export const DISCOVER_CATEGORIES = ["legend", "tale", "history", "invention", "food", "nature", "tradition", "music", "language"] as const;

/** One pin on the Discover Hungary map (content/discover). */
export const DiscoverSchema = z.object({
  id,
  name: z.string(),
  lon: z.number().min(16).max(23),
  lat: z.number().min(45.7).max(48.6),
  category: z.enum(DISCOVER_CATEGORIES),
  title: z.string(),
  titleEn: z.string(),
  titleRo: z.string(),
  /** the story, one easy Hungarian sentence per line with English and Romanian */
  story: z.array(Tri).min(2),
  facts: z.array(Tri).default([]),
  words: z.array(Tri).default([]),
  questions: z
    .array(z.object({ q: z.string(), qEn: z.string().optional(), options: z.array(z.string()).min(2), answer: z.string() }))
    .default([]),
});

export const ProverbsSchema = z.object({
  items: z.array(
    z.object({ kind: z.enum(["proverb", "idiom"]), hu: z.string(), literal: z.string(), meaning: z.string(), ro: z.string() })
  ),
});

export const TwistersSchema = z.object({
  items: z.array(
    z.object({
      kind: z.enum(["classic", "practice"]),
      level: z.number().int().min(1).max(3),
      hu: z.string(),
      en: z.string(),
      ro: z.string(),
      tip: z.string().optional(),
    })
  ),
});

export const SongsSchema = z.object({
  items: z.array(
    z.object({
      id,
      kind: z.enum(["folk", "rhyme", "game", "christmas"]),
      title: z.string(),
      titleEn: z.string(),
      about: z.string(),
      lines: z.array(Tri).min(2),
    })
  ),
});

export const RecipesSchema = z.object({
  items: z.array(
    z.object({
      id,
      title: z.string(),
      titleEn: z.string(),
      titleRo: z.string(),
      serves: z.number(),
      minutes: z.number(),
      about: z.string(),
      ingredients: z.array(z.object({ amount: z.string(), hu: z.string(), en: z.string(), ro: z.string() })),
      steps: z.array(Tri).min(1),
      tip: z.string().optional(),
    })
  ),
});

const ytId = z.string().regex(/^[A-Za-z0-9_-]{11}$/, "a YouTube video id is 11 characters");

/** A Magyar népmesék episode, embedded from the official YouTube channels (content/tales). */
export const TaleSchema = z.object({
  id,
  order: z.number(),
  title: z.string(),
  titleEn: z.string(),
  titleRo: z.string(),
  episode: z.string().optional(),
  level: z.number().int().min(1).max(3),
  video: z.object({
    /** Hungarian original */
    hu: ytId,
    /** the YouTube title it should have; used to warn if a link starts pointing elsewhere */
    huTitle: z.string(),
    /** official English dub, if there is one */
    en: ytId.optional(),
    enTitle: z.string().optional(),
  }),
  /** Discover place this tale belongs to */
  place: id.optional(),
  summary: z.array(Tri).min(2),
  words: z.array(Tri).default([]),
  questions: z
    .array(z.object({ q: z.string(), qEn: z.string().optional(), options: z.array(z.string()).min(2), answer: z.string() }))
    .default([]),
});

export const ConfigSchema = z.object({
  appName: z.string(),
  /** quiz score (%) needed to finish a lesson */
  quizPassMark: z.number().min(0).max(100),
  /** drill score (%) needed for a drill set to count as done */
  drillPassMark: z.number().min(0).max(100),
  newCardsPerDay: z.number().int().positive(),
  /** SHA-256 hex of the teacher code (npm run teacher-hash -- yourcode) */
  teacherCodeHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type VocabItem = z.infer<typeof VocabItemSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Grammar = z.infer<typeof GrammarSchema>;
export type GrammarSection = Grammar["sections"][number];
export type ExerciseSet = z.infer<typeof ExerciseSetSchema>;
export type ExerciseItem = ExerciseSet["items"][number];
export type Reading = z.infer<typeof ReadingSchema>;
export type Story = z.infer<typeof StorySchema>;
export type StoryNode = Story["nodes"][string];
export type DictCategory = z.infer<typeof DictionarySchema>;
export type Tri = z.infer<typeof Tri>;
export type DiscoverPlace = z.infer<typeof DiscoverSchema>;
export type DiscoverCategory = DiscoverPlace["category"];
export type Proverb = z.infer<typeof ProverbsSchema>["items"][number];
export type Twister = z.infer<typeof TwistersSchema>["items"][number];
export type Song = z.infer<typeof SongsSchema>["items"][number];
export type Recipe = z.infer<typeof RecipesSchema>["items"][number];
export type Tale = z.infer<typeof TaleSchema>;
export type Config = z.infer<typeof ConfigSchema>;
