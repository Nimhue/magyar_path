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
  place: z.object({ name: z.string(), fact: z.string(), lon: z.number().optional(), lat: z.number().optional() }).optional(),
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
  choices: z
    .array(
      z.object({
        text: z.string(),
        textEn: z.string().optional(),
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
  lesson: id,
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
export type Config = z.infer<typeof ConfigSchema>;
