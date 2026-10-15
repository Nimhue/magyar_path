/** Lesson completion and unlocking rules. */
import { cardsByLesson, config, lessons, type Card } from "../content";
import type { Progress } from "./store";
import type { Lesson } from "../content/schema";

export interface LessonStatus {
  cardsSeen: number;
  cardsTotal: number;
  quizBest: number | null;
  drillsDone: number;
  drillsTotal: number;
  readingsDone: number;
  readingsTotal: number;
  complete: boolean;
  /** 0–1, for progress rings */
  fraction: number;
}

export function lessonStatus(lesson: Lesson, p: Progress): LessonStatus {
  const cards: Card[] = cardsByLesson[lesson.id] ?? [];
  const cardsSeen = cards.filter((c) => p.cards[c.id]?.seen).length;
  const quizBest = p.quizBest[lesson.id] ?? null;
  const drillsDone = lesson.exercises.filter((id) => p.drills[id]?.done).length;
  const readingsDone = lesson.readings.filter((id) => p.readings[id]?.done).length;
  const quizOk = (quizBest ?? 0) >= config.quizPassMark;
  const complete = cardsSeen === cards.length && quizOk && drillsDone === lesson.exercises.length;
  const parts = [
    cards.length ? cardsSeen / cards.length : 1,
    Math.min(1, (quizBest ?? 0) / config.quizPassMark),
    lesson.exercises.length ? drillsDone / lesson.exercises.length : 1,
  ];
  return {
    cardsSeen,
    cardsTotal: cards.length,
    quizBest,
    drillsDone,
    drillsTotal: lesson.exercises.length,
    readingsDone,
    readingsTotal: lesson.readings.length,
    complete,
    fraction: complete ? 1 : parts.reduce((a, b) => a + b, 0) / parts.length,
  };
}

/** A lesson is open if it's the first, the previous one is complete, or the teacher unlocked everything. */
export function isUnlocked(lessonId: string, p: Progress): boolean {
  if (p.teacher) return true;
  const i = lessons.findIndex((l) => l.id === lessonId);
  if (i <= 0) return true;
  return lessonStatus(lessons[i - 1], p).complete;
}

export function unlockedLessons(p: Progress) {
  return lessons.filter((l) => isUnlocked(l.id, p));
}

/** The lesson the learner should be working on now. */
export function currentLesson(p: Progress) {
  return lessons.find((l) => isUnlocked(l.id, p) && !lessonStatus(l, p).complete) ?? lessons[lessons.length - 1];
}
