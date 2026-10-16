/**
 * Spaced repetition (a simplified SM-2). Each rating schedules the card's
 * next review: wrong answers come back soon, easy ones wait longer.
 */
import type { Card } from "../content";
import type { CardState, Progress } from "./store";

export type Rating = "again" | "good" | "easy";

const MIN = 60_000;
const DAY = 86_400_000;

export function blank(): CardState {
  return { seen: false, reps: 0, interval: 0, ease: 2.5, due: 0, lapses: 0 };
}

export function schedule(prev: CardState | undefined, rating: Rating, now = Date.now()): CardState {
  const s = { ...(prev ?? blank()), seen: true, at: now };
  if (rating === "again") {
    s.reps = 0;
    s.interval = 0;
    s.lapses += 1;
    s.ease = Math.max(1.3, s.ease - 0.2);
    s.due = now + 10 * MIN;
    return s;
  }
  if (rating === "good") {
    s.interval = s.reps === 0 ? 1 : s.reps === 1 ? 3 : Math.round(s.interval * s.ease);
  } else {
    s.interval = s.reps === 0 ? 3 : Math.round(Math.max(s.interval, 1) * s.ease * 1.3);
    s.ease += 0.15;
  }
  s.reps += 1;
  s.due = now + s.interval * DAY;
  return s;
}

/** Preview label for a rating button, e.g. "3 d". */
export function nextLabel(prev: CardState | undefined, rating: Rating) {
  const s = schedule(prev, rating, 0);
  if (rating === "again") return "10 min";
  return s.interval === 1 ? "1 day" : `${s.interval} days`;
}

export function dueCards(cards: Card[], p: Progress, now = Date.now()) {
  return cards.filter((c) => {
    const s = p.cards[c.id];
    return s?.seen && s.due <= now;
  });
}

export function newCards(cards: Card[], p: Progress) {
  return cards.filter((c) => !p.cards[c.id]?.seen);
}
