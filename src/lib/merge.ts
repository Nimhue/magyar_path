/**
 * Merges learner progress from two devices without losing work:
 * newest flashcard review wins, best scores win, streaks and XP never go down.
 */
import type { CardState, Progress } from "./store";

const maxRec = (a: Record<string, number>, b: Record<string, number>) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
};

const RANK = { oops: 0, ok: 1, great: 2 } as const;

export function mergeProgress(local: Progress, remote: Partial<Progress> | null | undefined): Progress {
  if (!remote || typeof remote !== "object") return local;
  const r = remote as Progress;
  const newer = (r.updatedAt ?? 0) > (local.updatedAt ?? 0) ? r : local;
  const out: Progress = structuredClone(local);

  // flashcards: the most recent review wins
  const cards: Record<string, CardState> = { ...local.cards };
  for (const [id, rc] of Object.entries(r.cards ?? {})) {
    const lc = cards[id];
    if (!lc || (rc.at ?? 0) > (lc.at ?? 0) || (!lc.at && !rc.at && rc.reps > lc.reps)) cards[id] = rc;
  }
  out.cards = cards;

  out.quizBest = maxRec(local.quizBest, r.quizBest ?? {});
  out.drills = { ...local.drills };
  for (const [id, d] of Object.entries(r.drills ?? {})) {
    const m = out.drills[id];
    out.drills[id] = { best: Math.max(m?.best ?? 0, d.best), done: !!m?.done || d.done };
  }
  out.readings = { ...local.readings };
  for (const [id, d] of Object.entries(r.readings ?? {})) {
    const m = out.readings[id];
    out.readings[id] = { done: !!m?.done || d.done, score: Math.max(m?.score ?? 0, d.score) };
  }
  out.stories = { ...local.stories };
  for (const [id, end] of Object.entries(r.stories ?? {})) {
    const m = out.stories[id];
    if (!m || RANK[end] > RANK[m]) out.stories[id] = end;
  }
  out.boss = { ...local.boss };
  for (const [id, b] of Object.entries(r.boss ?? {})) {
    const m = out.boss[id];
    out.boss[id] = { won: !!m?.won || b.won, bestHearts: Math.max(m?.bestHearts ?? 0, b.bestHearts) };
  }
  out.games = { ...local.games };
  for (const [id, g] of Object.entries(r.games ?? {})) {
    const m = out.games[id];
    out.games[id] = { plays: Math.max(m?.plays ?? 0, g.plays), best: Math.max(m?.best ?? 0, g.best) };
  }
  out.trophies = { ...(r.trophies ?? {}), ...local.trophies };
  out.flags = { ...(r.flags ?? {}), ...local.flags };
  for (const k of Object.keys(r.flags ?? {}) as (keyof Progress["flags"])[]) out.flags[k] = !!local.flags[k] || !!r.flags[k];

  out.xp = Math.max(local.xp, r.xp ?? 0);
  out.xpByDay = maxRec(local.xpByDay, r.xpByDay ?? {});
  out.totals = maxRec(local.totals as Record<string, number>, (r.totals ?? {}) as Record<string, number>);
  out.bestCombo = Math.max(local.bestCombo, r.bestCombo ?? 0);
  out.speedBest = Math.max(local.speedBest, r.speedBest ?? 0);

  // streak: the device that studied most recently knows the current streak
  const ls = local.streak;
  const rs = r.streak ?? { count: 0, best: 0, last: null };
  if ((rs.last ?? "") > (ls.last ?? "")) out.streak = { ...rs };
  else if (rs.last === ls.last) out.streak = { ...ls, count: Math.max(ls.count, rs.count) };
  out.streak.best = Math.max(ls.best, rs.best, out.streak.count);

  // today's quest counters
  if (r.daily && r.daily.date === local.daily.date) {
    out.daily = {
      date: local.daily.date,
      xp: Math.max(local.daily.xp, r.daily.xp),
      newCards: Math.max(local.daily.newCards, r.daily.newCards),
      counts: maxRec(local.daily.counts as Record<string, number>, (r.daily.counts ?? {}) as Record<string, number>),
      claimed: [...new Set([...local.daily.claimed, ...(r.daily.claimed ?? [])])],
    };
  } else if (r.daily && r.daily.date > local.daily.date) out.daily = structuredClone(r.daily);

  // things you change on purpose: take the most recent device's version
  out.homework = { ...(newer.homework ?? {}) };
  out.mistakes = { ...(newer.mistakes ?? {}) };
  out.settings = { ...local.settings, ...(newer.settings ?? {}) };
  out.teacher = local.teacher; // teacher mode stays per device
  out.updatedAt = Math.max(local.updatedAt ?? 0, r.updatedAt ?? 0);
  return out;
}
