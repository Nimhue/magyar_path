/** Discover Hungary: categories, passport stamps, "my words" and the word / fact of the day. */
import { allDictCards, cardsByLesson, places, type Card } from "../content";
import type { DiscoverCategory } from "../content/schema";
import { unlockedLessons } from "./progress";
import { addXp, bump, getState, today, update, type Progress } from "./store";

export const CATS: Record<DiscoverCategory, { hu: string; en: string; ro: string; tone: string; icon: string }> = {
  legend: { hu: "Legendák", en: "Legends", ro: "Legende", tone: "purple", icon: "sparkle" },
  tale: { hu: "Népmesék", en: "Folk tales", ro: "Basme", tone: "pink", icon: "book" },
  history: { hu: "Történelem", en: "History", ro: "Istorie", tone: "red", icon: "castle" },
  invention: { hu: "Feltalálók", en: "Inventions and famous people", ro: "Invenții și oameni celebri", tone: "blue", icon: "bulb" },
  food: { hu: "Ételek", en: "Food", ro: "Mâncare", tone: "paprika", icon: "bowl" },
  nature: { hu: "Természet", en: "Nature", ro: "Natură", tone: "green", icon: "leaf" },
  tradition: { hu: "Hagyományok", en: "Traditions", ro: "Tradiții", tone: "yellow", icon: "mask" },
  music: { hu: "Zene", en: "Music", ro: "Muzică", tone: "teal", icon: "note" },
  language: { hu: "Nyelv", en: "Language", ro: "Limbă", tone: "gray", icon: "chat" },
};
export const CAT_ORDER = Object.keys(CATS) as DiscoverCategory[];

/** Marks a place as visited (quest counter) once per day. */
const visitedToday = new Set<string>();
export function visitPlace(id: string) {
  if (visitedToday.has(id)) return;
  visitedToday.add(id);
  bump("place");
}

/** Stamps the passport. Returns true the first time. */
export function stampPlace(id: string): boolean {
  if (getState().stamps?.[id]) return false;
  update((d) => void ((d.stamps ??= {})[id] = new Date().toISOString()));
  addXp(15);
  return true;
}

/* ---------- my words ---------- */

export function hasMyWord(p: Progress, hu: string) {
  const w = p.myWords?.[hu];
  return !!w && !w.removed;
}

export function addMyWord(hu: string, en: string, ro: string | undefined, from: string) {
  update((d) => void ((d.myWords ??= {})[hu] = { en, ro, from, at: Date.now() }));
}

export function removeMyWord(hu: string) {
  update((d) => {
    const w = d.myWords?.[hu];
    if (w) d.myWords[hu] = { ...w, removed: true, at: Date.now() };
  });
}

export function myWordCards(p: Progress): Card[] {
  return Object.entries(p.myWords ?? {})
    .filter(([, w]) => !w.removed)
    .sort((a, b) => a[1].at - b[1].at)
    .map(([hu, w]) => ({ hu, en: w.en, ro: w.ro, kind: "word" as const, id: `mine:${hu}`, lessonId: "mine", group: w.from }));
}

/* ---------- of the day ---------- */

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function wordOfDay(p: Progress, date = today()): Card | null {
  const pool = [...unlockedLessons(p).flatMap((l) => cardsByLesson[l.id]), ...allDictCards].filter(
    (c) => c.kind === "word" && c.hu.length > 2
  );
  if (!pool.length) return null;
  return pool[hash("w" + date) % pool.length];
}

export function factOfDay(date = today()) {
  const all = places.flatMap((pl) => pl.facts.map((f) => ({ ...f, place: pl })));
  return all.length ? all[hash("f" + date) % all.length] : null;
}
