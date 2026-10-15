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
}

export interface Progress {
  version: 1;
  cards: Record<string, CardState>;
  quizBest: Record<string, number>;
  drills: Record<string, { best: number; done: boolean }>;
  readings: Record<string, { done: boolean; score: number }>;
  homework: Record<string, boolean>;
  mistakes: Record<string, number>;
  xp: number;
  streak: { count: number; best: number; last: string | null };
  daily: { date: string; xp: number; newCards: number };
  speedBest: number;
  teacher: boolean;
  settings: { theme: "system" | "light" | "dark"; direction: "hu" | "en"; name: string };
}

const KEY = "magyar-path:v1";

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function fresh(): Progress {
  return {
    version: 1,
    cards: {},
    quizBest: {},
    drills: {},
    readings: {},
    homework: {},
    mistakes: {},
    xp: 0,
    streak: { count: 0, best: 0, last: null },
    daily: { date: today(), xp: 0, newCards: 0 },
    speedBest: 0,
    teacher: false,
    settings: { theme: "system", direction: "hu", name: "" },
  };
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = { ...fresh(), ...JSON.parse(raw) } as Progress;
      p.settings = { ...fresh().settings, ...p.settings };
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

export function update(fn: (draft: Progress) => void) {
  const next = structuredClone(state);
  fn(next);
  if (next.daily.date !== today()) next.daily = { date: today(), xp: 0, newCards: 0 };
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

/** Award XP and keep the daily streak going. */
export function addXp(n: number) {
  update((p) => {
    const t = today();
    if (p.daily.date !== t) p.daily = { date: t, xp: 0, newCards: 0 };
    p.xp += n;
    p.daily.xp += n;
    if (p.streak.last !== t) {
      p.streak.count = p.streak.last && dayDiff(p.streak.last, t) === 1 ? p.streak.count + 1 : 1;
      p.streak.last = t;
      p.streak.best = Math.max(p.streak.best, p.streak.count);
    }
  });
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

export function exportProgress(): string {
  return JSON.stringify(state, null, 2);
}

export function importProgress(json: string) {
  const parsed = JSON.parse(json);
  if (parsed?.version !== 1) throw new Error("This file is not a Magyar Path progress backup.");
  update((p) => Object.assign(p, fresh(), parsed));
}

export function resetProgress() {
  update((p) => Object.assign(p, fresh(), { settings: p.settings }));
}
