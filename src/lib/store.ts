/**
 * All learner progress lives here, saved to localStorage on this device.
 * Kept in one plain object so it can later be synced to a backend
 * (e.g. Supabase) by swapping load()/persist() — nothing else changes.
 */
import { useSyncExternalStore } from "react";

export interface CardState {
  seen: boolean;
  reps: number;
  interval: number; // days
  ease: number;
  due: number; // epoch ms
  lapses: number;
  /** when it was last reviewed (epoch ms), used to merge devices */
  at?: number;
}

/** Things that count toward daily quests and trophies. */
export type Counter = "card" | "correct" | "combo5" | "game" | "story" | "dict" | "drill" | "xp" | "quiz" | "place";

/** A word the learner saved from Discover, a song or a recipe. removed = deleted (kept so devices agree). */
export interface MyWord {
  en: string;
  ro?: string;
  from: string;
  at: number;
  removed?: boolean;
}

export interface Settings {
  theme: "system" | "light" | "dark";
  palette: string;
  direction: "hu" | "en";
  name: string;
  showRo: boolean;
  sound: boolean;
  /** mascot's outfit: "auto" picks the best unlocked one */
  outfit: string;
  /** which mascot cheers you on */
  mascot: string;
  /** preferred Hungarian voice name, "" = automatic */
  voice: string;
}

export interface Progress {
  version: 1;
  cards: Record<string, CardState>;
  quizBest: Record<string, number>;
  drills: Record<string, { best: number; done: boolean }>;
  readings: Record<string, { done: boolean; score: number }>;
  stories: Record<string, "great" | "ok" | "oops">;
  boss: Record<string, { won: boolean; bestHearts: number }>;
  games: Record<string, { plays: number; best: number }>;
  homework: Record<string, boolean>;
  mistakes: Record<string, number>;
  xp: number;
  xpByDay: Record<string, number>;
  streak: { count: number; best: number; last: string | null };
  daily: { date: string; xp: number; newCards: number; counts: Partial<Record<Counter, number>>; claimed: string[] };
  totals: Partial<Record<Counter, number>>;
  bestCombo: number;
  speedBest: number;
  flags: { nightOwl?: boolean; earlyBird?: boolean; perfectQuiz?: boolean };
  trophies: Record<string, string>;
  /** Discover Hungary passport: place id → date stamped */
  stamps: Record<string, string>;
  /** "My words" flashcard deck, keyed by the Hungarian word */
  myWords: Record<string, MyWord>;
  teacher: boolean;
  settings: Settings;
  /** last local change (epoch ms) */
  updatedAt: number;
}

const KEY = "magyar-path:v1";

export const today = () => dayKey(new Date());
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const freshDaily = () => ({ date: today(), xp: 0, newCards: 0, counts: {}, claimed: [] as string[] });

function fresh(): Progress {
  return {
    version: 1,
    cards: {},
    quizBest: {},
    drills: {},
    readings: {},
    stories: {},
    boss: {},
    games: {},
    homework: {},
    mistakes: {},
    xp: 0,
    xpByDay: {},
    streak: { count: 0, best: 0, last: null },
    daily: freshDaily(),
    totals: {},
    bestCombo: 0,
    speedBest: 0,
    flags: {},
    trophies: {},
    stamps: {},
    myWords: {},
    teacher: false,
    settings: { theme: "system", palette: "barack", direction: "hu", name: "", showRo: true, sound: true, outfit: "auto", mascot: "cirmi", voice: "" },
    updatedAt: 0,
  };
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const base = fresh();
      const p = { ...base, ...JSON.parse(raw) } as Progress;
      p.settings = { ...base.settings, ...p.settings };
      p.daily = { ...freshDaily(), ...p.daily };
      if (p.daily.date !== today()) p.daily = freshDaily();
      return p;
    }
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return fresh();
}

let state: Progress = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getState() {
  return state;
}

const changeListeners = new Set<() => void>();
/** Called after every local change (used to schedule a cloud sync). */
export function onLocalChange(fn: () => void) {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

export function update(fn: (draft: Progress) => void) {
  const next = structuredClone(state);
  if (next.daily.date !== today()) next.daily = freshDaily();
  fn(next);
  next.updatedAt = Date.now();
  state = next;
  persist();
  listeners.forEach((l) => l());
  changeListeners.forEach((l) => l());
}

/** Replace the whole state (after merging with another device) without counting as a local change. */
export function replaceState(next: Progress) {
  if (next.daily.date !== today()) next.daily = freshDaily();
  state = next;
  persist();
  listeners.forEach((l) => l());
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state
  );
}

function dayDiff(a: string, b: string) {
  return Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);
}

/** Count something for quests and trophies. */
export function bump(counter: Counter, n = 1) {
  update((p) => {
    p.daily.counts[counter] = (p.daily.counts[counter] ?? 0) + n;
    p.totals[counter] = (p.totals[counter] ?? 0) + n;
  });
}

/** Award XP and keep the daily streak going. */
export function addXp(n: number) {
  if (n <= 0) return;
  update((p) => {
    const t = today();
    p.xp += n;
    p.daily.xp += n;
    p.daily.counts.xp = (p.daily.counts.xp ?? 0) + n;
    p.xpByDay[t] = (p.xpByDay[t] ?? 0) + n;
    const h = new Date().getHours();
    if (h >= 22 || h < 3) p.flags.nightOwl = true;
    if (h >= 4 && h < 7) p.flags.earlyBird = true;
    if (p.streak.last !== t) {
      p.streak.count = p.streak.last && dayDiff(p.streak.last, t) === 1 ? p.streak.count + 1 : 1;
      p.streak.last = t;
      p.streak.best = Math.max(p.streak.best, p.streak.count);
    }
  });
}

export function recordCombo(n: number) {
  if (n > getState().bestCombo) update((p) => void (p.bestCombo = n));
  if (n === 5) bump("combo5");
}

/** Streak shown to the user: 0 if they missed yesterday. */
export function liveStreak(p: Progress) {
  if (!p.streak.last) return 0;
  return dayDiff(p.streak.last, today()) <= 1 ? p.streak.count : 0;
}

export function levelFor(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 40)) + 1;
  const floor = 40 * (level - 1) ** 2;
  const ceil = 40 * level ** 2;
  return { level, into: xp - floor, span: ceil - floor };
}

/** XP for the last 7 days, oldest first. */
export function weekXp(p: Progress) {
  const out: { day: string; label: string; xp: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    out.push({ day: k, label: d.toLocaleDateString("hu-HU", { weekday: "short" }).replace(".", ""), xp: p.xpByDay[k] ?? 0 });
  }
  return out;
}

export function exportProgress(): string {
  return JSON.stringify(state, null, 2);
}

export function importProgress(json: string) {
  const parsed = JSON.parse(json);
  if (parsed?.version !== 1) throw new Error("This file is not a Magyar Path progress backup.");
  update((p) => Object.assign(p, fresh(), parsed, { settings: { ...fresh().settings, ...parsed.settings } }));
}

export function resetProgress() {
  update((p) => Object.assign(p, fresh(), { settings: p.settings }));
}
