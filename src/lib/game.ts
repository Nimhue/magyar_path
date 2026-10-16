/** Daily quests, trophies and Bodza's outfits. */
import { allDictCards, cardsByDict, dictionaryCats, lessons } from "../content";
import { lessonStatus } from "./progress";
import { addXp, levelFor, liveStreak, today, update, type Counter, type Progress } from "./store";

export interface Quest {
  id: string;
  counter: Counter;
  goal: number;
  title: string;
  reward: number;
}

const POOL: Quest[] = [
  { id: "cards15", counter: "card", goal: 15, title: "Review 15 flashcards", reward: 15 },
  { id: "cards30", counter: "card", goal: 30, title: "Review 30 flashcards", reward: 25 },
  { id: "correct20", counter: "correct", goal: 20, title: "Answer 20 questions right", reward: 20 },
  { id: "combo", counter: "combo5", goal: 1, title: "Get 5 right in a row", reward: 15 },
  { id: "games2", counter: "game", goal: 2, title: "Play 2 mini-games", reward: 20 },
  { id: "story", counter: "story", goal: 1, title: "Finish a story or a reading", reward: 20 },
  { id: "dict5", counter: "dict", goal: 5, title: "Learn 5 dictionary words", reward: 15 },
  { id: "drill", counter: "drill", goal: 1, title: "Finish a grammar drill set", reward: 15 },
  { id: "quiz", counter: "quiz", goal: 1, title: "Finish a quiz", reward: 15 },
  { id: "xp60", counter: "xp", goal: 60, title: "Earn 60 XP", reward: 20 },
];

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Three quests per day, the same all day. */
export function todaysQuests(date = today()): Quest[] {
  const picked: Quest[] = [];
  let seed = hash(date);
  const pool = POOL.slice();
  while (picked.length < 3 && pool.length) {
    seed = hash(String(seed));
    const q = pool.splice(seed % pool.length, 1)[0];
    if (picked.some((p) => p.counter === q.counter)) continue;
    picked.push(q);
  }
  return picked;
}

export function questProgress(q: Quest, p: Progress) {
  return Math.min(q.goal, p.daily.counts[q.counter] ?? 0);
}

export function claimQuest(q: Quest) {
  update((p) => void p.daily.claimed.push(q.id));
  addXp(q.reward);
}

/* ---------- trophies ---------- */

export interface Trophy {
  id: string;
  title: string;
  titleHu: string;
  desc: string;
  test: (p: Progress) => boolean;
}

const learned = (p: Progress) => Object.values(p.cards).filter((c) => c.reps > 0).length;
const dictLearned = (p: Progress) => allDictCards.filter((c) => (p.cards[c.id]?.reps ?? 0) > 0).length;
const lessonsDone = (p: Progress) => lessons.filter((l) => lessonStatus(l, p).complete).length;

export const TROPHIES: Trophy[] = [
  { id: "first-card", titleHu: "Első lépés", title: "First step", desc: "Review your first flashcard", test: (p) => learned(p) >= 1 },
  { id: "words50", titleHu: "Szógyűjtő", title: "Word collector", desc: "Learn 50 words", test: (p) => learned(p) >= 50 },
  { id: "words150", titleHu: "Szókincs", title: "Vocabulary", desc: "Learn 150 words", test: (p) => learned(p) >= 150 },
  { id: "words400", titleHu: "Élő szótár", title: "Walking dictionary", desc: "Learn 400 words", test: (p) => learned(p) >= 400 },
  { id: "lesson1", titleHu: "Úton", title: "On the road", desc: "Finish your first lesson", test: (p) => lessonsDone(p) >= 1 },
  { id: "lesson4", titleHu: "Félúton", title: "Halfway there", desc: "Finish 4 lessons", test: (p) => lessonsDone(p) >= 4 },
  { id: "all-lessons", titleHu: "Körbeutazó", title: "Round trip", desc: "Finish every lesson so far", test: (p) => lessonsDone(p) === lessons.length },
  { id: "perfect", titleHu: "Hibátlan", title: "Flawless", desc: "Score 100% on a lesson quiz", test: (p) => !!p.flags.perfectQuiz },
  { id: "combo10", titleHu: "Lángoló", title: "On fire", desc: "Get 10 right in a row", test: (p) => p.bestCombo >= 10 },
  { id: "combo25", titleHu: "Megállíthatatlan", title: "Unstoppable", desc: "Get 25 right in a row", test: (p) => p.bestCombo >= 25 },
  { id: "streak3", titleHu: "Három nap", title: "Three days", desc: "Study 3 days in a row", test: (p) => p.streak.best >= 3 },
  { id: "streak7", titleHu: "Egy hét", title: "One week", desc: "Study 7 days in a row", test: (p) => p.streak.best >= 7 },
  { id: "streak30", titleHu: "Egy hónap", title: "One month", desc: "Study 30 days in a row", test: (p) => p.streak.best >= 30 },
  { id: "boss", titleHu: "Főnökverő", title: "Boss beater", desc: "Win a boss challenge", test: (p) => Object.values(p.boss).some((b) => b.won) },
  { id: "boss-perfect", titleHu: "Sértetlen", title: "Untouched", desc: "Win a boss challenge with all 3 hearts", test: (p) => Object.values(p.boss).some((b) => b.bestHearts === 3) },
  { id: "story", titleHu: "Mesélő", title: "Storyteller", desc: "Get a great ending in a story", test: (p) => Object.values(p.stories).includes("great") },
  { id: "stories5", titleHu: "Kalandor", title: "Adventurer", desc: "Finish 5 stories", test: (p) => Object.keys(p.stories).length >= 5 },
  { id: "gamer", titleHu: "Játékos", title: "Player", desc: "Try every mini-game", test: (p) => Object.keys(p.games).length >= 6 },
  { id: "dict", titleHu: "Felfedező", title: "Explorer", desc: "Learn words from 5 dictionary categories", test: (p) => dictionaryCats.filter((c) => cardsByDict[c.id].some((x) => (p.cards[x.id]?.reps ?? 0) > 0)).length >= 5 },
  { id: "dict100", titleHu: "Szótárfaló", title: "Dictionary devourer", desc: "Learn 100 dictionary words", test: (p) => dictLearned(p) >= 100 },
  { id: "night", titleHu: "Éjjeli bagoly", title: "Night owl", desc: "Study after 10 pm", test: (p) => !!p.flags.nightOwl },
  { id: "early", titleHu: "Korai madár", title: "Early bird", desc: "Study before 7 am", test: (p) => !!p.flags.earlyBird },
  { id: "level5", titleHu: "Ötödik szint", title: "Level 5", desc: "Reach level 5", test: (p) => levelFor(p.xp).level >= 5 },
  { id: "level10", titleHu: "Tizedik szint", title: "Level 10", desc: "Reach level 10", test: (p) => levelFor(p.xp).level >= 10 },
];

/** Returns trophies that are earned but not yet recorded. */
export function newTrophies(p: Progress) {
  return TROPHIES.filter((t) => !p.trophies[t.id] && t.test(p));
}

/* ---------- Bodza's wardrobe ---------- */

export interface Outfit {
  id: string;
  name: string;
  unlock: string;
  available: (p: Progress) => boolean;
}

export const OUTFITS: Outfit[] = [
  { id: "none", name: "Just Bodza", unlock: "Always", available: () => true },
  { id: "scarf", name: "Red-white-green scarf", unlock: "Level 2", available: (p) => levelFor(p.xp).level >= 2 },
  { id: "glasses", name: "Sunglasses", unlock: "Level 4", available: (p) => levelFor(p.xp).level >= 4 },
  { id: "kalap", name: "Shepherd's hat", unlock: "Level 6", available: (p) => levelFor(p.xp).level >= 6 },
  { id: "flowers", name: "Matyó flower crown", unlock: "7-day streak", available: (p) => p.streak.best >= 7 },
  { id: "crown", name: "Holy Crown", unlock: "Level 10", available: (p) => levelFor(p.xp).level >= 10 },
  { id: "pumpkin", name: "Witch hat (October)", unlock: "In October", available: () => new Date().getMonth() === 9 },
  { id: "santa", name: "Mikulás hat (December)", unlock: "In December", available: () => new Date().getMonth() === 11 },
  { id: "bunny", name: "Bunny ears (spring)", unlock: "March–April", available: () => [2, 3].includes(new Date().getMonth()) },
];

const AUTO_ORDER = ["santa", "pumpkin", "bunny", "crown", "flowers", "kalap", "glasses", "scarf", "none"];

export function currentOutfit(p: Progress): string {
  const chosen = p.settings.outfit;
  if (chosen !== "auto") {
    const o = OUTFITS.find((x) => x.id === chosen);
    if (o?.available(p)) return o.id;
  }
  return AUTO_ORDER.find((id) => OUTFITS.find((o) => o.id === id)!.available(p)) ?? "none";
}

export { liveStreak };
