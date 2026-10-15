/**
 * Checks every content file before a build. Run: npm run validate
 * Fails with a readable list of problems if anything is wrong.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  ConfigSchema,
  ExerciseSetSchema,
  GrammarSchema,
  LessonSchema,
  ReadingSchema,
} from "../src/content/schema";

const root = join(import.meta.dirname, "..", "content");
const problems: string[] = [];

function load<T extends z.ZodTypeAny>(dir: string, schema: T): { file: string; data: z.infer<T> }[] {
  const out: { file: string; data: z.infer<T> }[] = [];
  for (const file of readdirSync(join(root, dir)).filter((f) => f.endsWith(".json")).sort()) {
    const path = `${dir}/${file}`;
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(root, dir, file), "utf8"));
    } catch (e) {
      problems.push(`${path}: not valid JSON (${(e as Error).message})`);
      continue;
    }
    const res = schema.safeParse(raw);
    if (!res.success) {
      for (const issue of res.error.issues) problems.push(`${path} → ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      continue;
    }
    out.push({ file: path, data: res.data });
  }
  return out;
}

const cfg = ConfigSchema.safeParse(JSON.parse(readFileSync(join(root, "config.json"), "utf8")));
if (!cfg.success) cfg.error.issues.forEach((i) => problems.push(`config.json → ${i.path.join(".")}: ${i.message}`));

const lessons = load("lessons", LessonSchema);
const grammar = load("grammar", GrammarSchema);
const exercises = load("exercises", ExerciseSetSchema);
const readings = load("readings", ReadingSchema);

function uniqueIds(list: { file: string; data: { id: string } }[], what: string) {
  const seen = new Map<string, string>();
  for (const { file, data } of list) {
    if (seen.has(data.id)) problems.push(`${file}: ${what} id "${data.id}" is also used in ${seen.get(data.id)}`);
    seen.set(data.id, file);
  }
  return new Set(seen.keys());
}
const lessonIds = uniqueIds(lessons, "lesson");
const grammarIds = uniqueIds(grammar, "grammar");
const exerciseIds = uniqueIds(exercises, "exercise");
const readingIds = uniqueIds(readings, "reading");

const orders = new Map<number, string>();
for (const { file, data } of lessons) {
  if (orders.has(data.order)) problems.push(`${file}: order ${data.order} is also used in ${orders.get(data.order)}`);
  orders.set(data.order, file);
  data.grammar.forEach((g) => grammarIds.has(g) || problems.push(`${file}: unknown grammar topic "${g}"`));
  data.exercises.forEach((x) => exerciseIds.has(x) || problems.push(`${file}: unknown exercise set "${x}"`));
  data.readings.forEach((r) => readingIds.has(r) || problems.push(`${file}: unknown reading "${r}"`));
  const words = new Set<string>();
  for (const g of data.vocab)
    for (const v of g.items) {
      if (words.has(v.hu)) problems.push(`${file}: "${v.hu}" appears twice in this lesson`);
      words.add(v.hu);
    }
}

for (const { file, data } of grammar)
  lessonIds.has(data.lesson) || problems.push(`${file}: unknown lesson "${data.lesson}"`);

for (const { file, data } of exercises) {
  lessonIds.has(data.lesson) || problems.push(`${file}: unknown lesson "${data.lesson}"`);
  data.items.forEach((it, i) => {
    const where = `${file} → items.${i}`;
    if ((it.type === "choice" || it.type === "listen") && !it.options.includes(it.answer))
      problems.push(`${where}: answer "${it.answer}" is not one of the options`);
    if (it.type === "sort")
      it.items.forEach((s) => it.buckets.includes(s.bucket) || problems.push(`${where}: bucket "${s.bucket}" not in buckets`));
  });
}

for (const { file, data } of readings) {
  lessonIds.has(data.lesson) || problems.push(`${file}: unknown lesson "${data.lesson}"`);
  data.questions.forEach((q, i) => q.options.includes(q.answer) || problems.push(`${file} → questions.${i}: answer not in options`));
}

if (problems.length) {
  console.error(`\n✗ Content check failed (${problems.length} problem${problems.length > 1 ? "s" : ""}):\n`);
  problems.forEach((p) => console.error("  • " + p));
  console.error("");
  process.exit(1);
}
console.log(
  `✓ Content OK: ${lessons.length} lessons, ${grammar.length} grammar topics, ${exercises.length} drill sets, ${readings.length} readings`
);
