import { useEffect, useMemo, useRef, useState } from "react";
import {
  allDictCards,
  cardById,
  cardsByDict,
  cardsByLesson,
  config,
  dictCatById,
  exerciseSets,
  lessonById,
  type Card,
} from "../content";
import type { ExerciseItem } from "../content/schema";
import { LessonPicker } from "../components/LessonPicker";
import { MascotSays } from "../components/Mascot";
import { ChoiceQ, ListenQ, MatchQ, TypeQ } from "../components/Questions";
import { ComboBadge, Empty, Icon, Meaning, PageHead, SpeakButton, comboMultiplier } from "../components/ui";
import { sample, shuffle } from "../lib/answer";
import { confetti } from "../lib/celebrate";
import { isUnlocked, unlockedLessons } from "../lib/progress";
import { href } from "../lib/router";
import { sfx } from "../lib/sound";
import { hasHungarianVoice } from "../lib/speech";
import { addXp, bump, getState, recordCombo, update, useProgress, type Progress } from "../lib/store";
import { ItemView } from "./Drills";
import { Locked } from "./Vocab";

export type Question =
  | { kind: "hu-en"; card: Card; options: string[] }
  | { kind: "en-hu"; card: Card; options: string[] }
  | { kind: "listen"; card: Card; options: string[] }
  | { kind: "type"; card: Card }
  | { kind: "match"; cards: Card[] };

export const quizzable = (c: Card) => c.kind !== "rule";

/** Cards the learner may practise: unlocked lessons plus the whole dictionary. */
export function practicePool(p: Progress, withDict = false) {
  const lessonsPool = unlockedLessons(p).flatMap((l) => cardsByLesson[l.id]).filter(quizzable);
  return withDict ? [...lessonsPool, ...allDictCards.filter(quizzable)] : lessonsPool;
}

export function distractors(card: Card, pool: Card[], field: "hu" | "en", n = 3): string[] {
  const same = pool.filter((c) => c.id !== card.id && c[field] !== card[field] && c.kind === card.kind);
  const other = pool.filter((c) => c.id !== card.id && c[field] !== card[field] && c.kind !== card.kind);
  const picks = [...new Set([...shuffle(same), ...shuffle(other)].map((c) => c[field]))].slice(0, n);
  return shuffle([card[field], ...picks]);
}

/** Builds a varied quiz from a set of cards; wrong options come from the wider pool. */
export function buildQuiz(cards: Card[], pool: Card[], size = 12): Question[] {
  const eligible = cards.filter(quizzable);
  const voice = hasHungarianVoice();
  const qs: Question[] = [];
  let rest = shuffle(eligible);
  if (eligible.length >= 10) {
    const m = rest.filter((c) => c.kind === "word").slice(0, 4);
    if (m.length === 4) {
      qs.push({ kind: "match", cards: m });
      rest = rest.filter((c) => !m.includes(c));
    }
  }
  const picks = rest.slice(0, size - qs.length);
  picks.forEach((card, i) => {
    const typeable = card.kind === "word" && card.hu.length <= 22;
    const slot = i % 5;
    if (slot === 2 && typeable) qs.push({ kind: "type", card });
    else if (slot === 3 && voice) qs.push({ kind: "listen", card, options: distractors(card, pool, "hu") });
    else if (slot === 1 || slot === 3) qs.push({ kind: "en-hu", card, options: distractors(card, pool, "hu") });
    else qs.push({ kind: "hu-en", card, options: distractors(card, pool, "en") });
  });
  const match = qs.find((q) => q.kind === "match");
  const others: Question[] = shuffle(qs.filter((q) => q.kind !== "match"));
  if (match) others.splice(Math.min(4, others.length), 0, match);
  return others;
}

/** Tracks answers in a row and pays out XP with a multiplier. */
export function useCombo() {
  const [combo, setCombo] = useState(0);
  const hit = (correct: boolean, baseXp: number) => {
    if (correct) {
      const next = combo + 1;
      setCombo(next);
      recordCombo(next);
      bump("correct");
      if (next === 5 || next === 10) sfx("combo");
      addXp(baseXp * comboMultiplier(next));
    } else setCombo(0);
  };
  return { combo, hit };
}

export function QuizPage({ args }: { args: string[] }) {
  const p = useProgress();
  const [a, b] = args;
  if (a === "speed") return <SpeedRound />;
  if (a === "mistakes") {
    const cards = Object.keys(p.mistakes)
      .map((id) => cardById[id])
      .filter(Boolean);
    return <QuizRunner key="mistakes" title="Mistake notebook" cards={cards} mode="mistakes" back="practice" />;
  }
  if (a === "dict" && b && dictCatById[b])
    return <QuizRunner key={b} title={dictCatById[b].title} cards={cardsByDict[b]} mode="dict" back={`dict/${b}`} />;
  if (a === "boss" && b) {
    const l = lessonById[b];
    if (!l) return <PageHead title="Lesson not found" back={href("practice")} />;
    if (!isUnlocked(l.id, p)) return <Locked back="practice" />;
    return <BossWrapper lessonId={b} />;
  }
  if (a) {
    const l = lessonById[a];
    if (!l) return <PageHead title="Lesson not found" back={href("quiz")} />;
    if (!isUnlocked(l.id, p)) return <Locked back="quiz" />;
    return <QuizRunner key={a} title={l.title} cards={cardsByLesson[a]} mode="lesson" lessonId={a} back={`lesson/${a}`} />;
  }
  return (
    <div className="stack-lg">
      <PageHead title="Kvíz" sub="Quizzes built from your vocabulary" back={href("practice")} />
      <p className="muted">Score {config.quizPassMark}% or more to complete a lesson. Retake a quiz as often as you like.</p>
      <LessonPicker
        hrefFor={(id) => href(`quiz/${id}`)}
        detail={(id) => (p.quizBest[id] === undefined ? "Not taken yet" : `Best score ${p.quizBest[id]}%`)}
      />
    </div>
  );
}

interface RunProps {
  title: string;
  cards: Card[];
  mode: "lesson" | "mistakes" | "dict";
  lessonId?: string;
  back: string;
}

function QuizRunner(props: RunProps) {
  const [round, setRound] = useState(0);
  return <QuizRun key={round} {...props} onRestart={() => setRound((r) => r + 1)} />;
}

function QuizRun({ title, cards, mode, lessonId, back, onRestart }: RunProps & { onRestart: () => void }) {
  const p = useProgress();
  const [questions] = useState(() => {
    const pool = mode === "dict" ? [...cards, ...allDictCards].filter(quizzable) : practicePool(getState());
    return buildQuiz(cards, pool.length >= 8 ? pool : cards, mode === "mistakes" ? Math.min(12, cards.length) : 12);
  });
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<Card[]>([]);
  const { combo, hit } = useCombo();
  const done = questions.length > 0 && i >= questions.length;
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const passed = pct >= config.quizPassMark;

  useEffect(() => {
    if (!done) return;
    bump("quiz");
    if (mode === "lesson" && lessonId) {
      const prevBest = getState().quizBest[lessonId] ?? 0;
      update((d) => {
        d.quizBest[lessonId] = Math.max(prevBest, pct);
        if (pct === 100) d.flags.perfectQuiz = true;
      });
      if (passed && prevBest < config.quizPassMark) addXp(25);
    }
    if (passed) {
      confetti();
      sfx("win");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (!questions.length)
    return (
      <div className="stack">
        <PageHead title={title} back={href(back)} />
        <Empty>{mode === "mistakes" ? "Your mistake notebook is empty. Nice work!" : "There are no quiz words here yet."}</Empty>
      </div>
    );

  const answer = (correct: boolean, cardsHit: Card[], wrongCards: Card[] = []) => {
    update((d) => {
      for (const c of wrongCards) d.mistakes[c.id] = (d.mistakes[c.id] ?? 0) + 1;
      if (correct) for (const c of cardsHit) delete d.mistakes[c.id];
    });
    hit(correct, 5);
    if (correct) setScore((s) => s + 1);
    else setMissed((m) => [...m, ...wrongCards]);
    setI((n) => n + 1);
  };

  if (done)
    return (
      <div className="stack-lg">
        <PageHead title={title} back={href(back)} />
        <div className="score-card">
          <div className={"score-big" + (passed ? " ok" : "")}>{pct}%</div>
          <p>
            {score} of {questions.length} correct
          </p>
        </div>
        <MascotSays mood={passed ? "party" : pct >= 50 ? "neutral" : "sad"}>
          <strong>{passed ? "Kiváló!" : "Majdnem!"}</strong>
          <span>
            {mode === "mistakes"
              ? passed
                ? "Fixed words leave your notebook. Keep going!"
                : "Words you got right have left the notebook. The rest are waiting."
              : mode === "dict"
                ? passed
                  ? "Great work on this category."
                  : "Have another look at the words below and try again."
                : passed
                  ? "You passed this quiz."
                  : `You need ${config.quizPassMark}% to complete the lesson. Review the words below and try again.`}
          </span>
        </MascotSays>
        {missed.length > 0 && <ReviewList cards={missed} />}
        <div className="row gap wrap">
          <button className="btn primary" onClick={onRestart}>
            New quiz
          </button>
          <a className="btn" href={href(back)}>
            Back
          </a>
        </div>
      </div>
    );

  return (
    <div className="stack session">
      <div className="session-top">
        <a className="icon-btn" href={href(back)} aria-label="Leave quiz">
          <Icon name="x" />
        </a>
        <div className="bar">
          <i style={{ width: `${(i / questions.length) * 100}%` }} />
        </div>
        <span className="muted tabnum">
          {i + 1}/{questions.length}
        </span>
      </div>
      <ComboBadge combo={combo} />
      <QuestionView key={i} q={questions[i]} onAnswer={answer} />
      {p.teacher && <p className="muted small-print">Teacher mode is on: all lessons are unlocked.</p>}
    </div>
  );
}

export function ReviewList({ cards }: { cards: Card[] }) {
  return (
    <section>
      <h2 className="section-title">Review these</h2>
      <ul className="word-list">
        {[...new Map(cards.map((c) => [c.id, c])).values()].map((c) => (
          <li key={c.id}>
            <SpeakButton text={c.hu} small />
            <div className="wl-main">
              <strong lang="hu">{c.hu}</strong>
              <Meaning en={c.en} ro={c.ro} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function explainFor(card: Card) {
  const ro = getState().settings.showRo && card.ro ? `Romanian: *${card.ro}*` : "";
  return [card.note, ro].filter(Boolean).join(" · ") || undefined;
}

export function QuestionView({ q, onAnswer }: { q: Question; onAnswer: (ok: boolean, hit: Card[], wrong?: Card[]) => void }) {
  switch (q.kind) {
    case "hu-en":
      return (
        <ChoiceQ
          prompt={
            <span className="prompt-word" lang="hu">
              {q.card.hu} <SpeakButton text={q.card.hu} small />
            </span>
          }
          sub="What does this mean?"
          options={q.options}
          answer={q.card.en}
          explain={explainFor(q.card)}
          onNext={(ok) => onAnswer(ok, [q.card], ok ? [] : [q.card])}
        />
      );
    case "en-hu":
      return (
        <ChoiceQ
          prompt={<span className="prompt-word">{q.card.en}</span>}
          sub="Choose the Hungarian"
          options={q.options}
          answer={q.card.hu}
          explain={explainFor(q.card)}
          optionLang="hu"
          speakAfter={q.card.hu}
          onNext={(ok) => onAnswer(ok, [q.card], ok ? [] : [q.card])}
        />
      );
    case "listen":
      return (
        <ListenQ
          say={q.card.hu}
          options={q.options}
          answer={q.card.hu}
          explain={`${q.card.hu} = ${q.card.en}`}
          onNext={(ok) => onAnswer(ok, [q.card], ok ? [] : [q.card])}
        />
      );
    case "type":
      return (
        <TypeQ
          prompt={<span className="prompt-word">{q.card.en}</span>}
          sub="Write it in Hungarian"
          answer={q.card.hu}
          explain={explainFor(q.card)}
          onNext={(ok) => onAnswer(ok, [q.card], ok ? [] : [q.card])}
        />
      );
    case "match":
      return (
        <MatchQ
          prompt="Match the pairs"
          pairs={q.cards.map((c) => ({ left: c.hu, right: c.en }))}
          onNext={(ok, missedLefts) =>
            onAnswer(
              ok,
              q.cards,
              q.cards.filter((c) => missedLefts.includes(c.hu))
            )
          }
        />
      );
  }
}

/* ---------- Boss challenge: mixed questions, 3 hearts ---------- */

type BossItem = { kind: "card"; q: Question } | { kind: "drill"; item: ExerciseItem };

function BossWrapper({ lessonId }: { lessonId: string }) {
  const [round, setRound] = useState(0);
  const [started, setStarted] = useState(false);
  const l = lessonById[lessonId];
  const rec = useProgress().boss[lessonId];
  if (!started)
    return (
      <div className="stack-lg">
        <PageHead title={`Boss: ${l.title}`} sub="15 mixed questions · 3 hearts" back={href(`lesson/${lessonId}`)} />
        <div className="boss-intro">
          <div className="hearts big">
            {[0, 1, 2].map((i) => (
              <Icon key={i} name="heart" size={34} />
            ))}
          </div>
          <p>
            Words, grammar and drills from lesson {l.order}, all mixed. Every mistake costs a heart. Lose all three and the boss wins.
            Beat it to earn a <strong>crown</strong> on your path and 50 XP.
          </p>
          {rec?.won && <p className="ok-text">You've beaten this boss{rec.bestHearts === 3 ? " without losing a heart" : ""}.</p>}
        </div>
        <button className="btn primary block big" onClick={() => setStarted(true)}>
          Fight!
        </button>
      </div>
    );
  return <BossRun key={round} lessonId={lessonId} onRestart={() => setRound((r) => r + 1)} />;
}

function BossRun({ lessonId, onRestart }: { lessonId: string; onRestart: () => void }) {
  const l = lessonById[lessonId];
  const [items] = useState<BossItem[]>(() => {
    const pool = practicePool(getState());
    const cardQs = buildQuiz(cardsByLesson[lessonId], pool, 9).map((q) => ({ kind: "card" as const, q }));
    const drillItems = l.exercises.flatMap((id) => exerciseSets[id]?.items ?? []);
    const drills = sample(drillItems, 15 - cardQs.length).map((item) => ({ kind: "drill" as const, item }));
    return shuffle([...cardQs, ...drills]);
  });
  const [i, setI] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [shake, setShake] = useState(false);
  const { combo, hit } = useCombo();
  const lost = hearts <= 0;
  const won = !lost && i >= items.length;

  useEffect(() => {
    if (!won && !lost) return;
    const prev = getState().boss[lessonId];
    update((d) => void (d.boss[lessonId] = { won: !!prev?.won || won, bestHearts: Math.max(prev?.bestHearts ?? 0, won ? hearts : 0) }));
    if (won) {
      if (!prev?.won) addXp(50);
      confetti();
      sfx("win");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won, lost]);

  const next = (ok: boolean) => {
    hit(ok, 4);
    if (!ok) {
      setHearts((h) => h - 1);
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
    setI((n) => n + 1);
  };

  if (won || lost)
    return (
      <div className="stack-lg">
        <PageHead title={`Boss: ${l.title}`} back={href(`lesson/${lessonId}`)} />
        <MascotSays mood={won ? "party" : "sad"}>
          <strong>{won ? "Győzelem! Victory!" : "A főnök nyert. The boss won."}</strong>
          <span>
            {won
              ? `You beat the boss with ${hearts} heart${hearts === 1 ? "" : "s"} left. A crown now sits on lesson ${l.order}.`
              : `You got through ${i} of ${items.length} questions. Review the lesson and try again.`}
          </span>
        </MascotSays>
        <div className="row gap wrap">
          <button className="btn primary" onClick={onRestart}>
            {won ? "Fight again" : "Try again"}
          </button>
          <a className="btn" href={href(`lesson/${lessonId}`)}>
            Back to lesson
          </a>
        </div>
      </div>
    );

  const it = items[i];
  return (
    <div className="stack session">
      <div className="session-top">
        <a className="icon-btn" href={href(`lesson/${lessonId}`)} aria-label="Leave boss challenge">
          <Icon name="x" />
        </a>
        <div className="bar boss-bar">
          <i style={{ width: `${(i / items.length) * 100}%` }} />
        </div>
        <span className={"hearts" + (shake ? " shake" : "")} aria-label={`${hearts} hearts left`}>
          {[0, 1, 2].map((k) => (
            <span key={k} className={k < hearts ? "heart" : "heart lost"}>
              <Icon name="heart" size={20} />
            </span>
          ))}
        </span>
      </div>
      <ComboBadge combo={combo} />
      {it.kind === "card" ? (
        <QuestionView key={i} q={it.q} onAnswer={(ok) => next(ok)} />
      ) : (
        <ItemView key={i} item={it.item} onNext={next} />
      )}
    </div>
  );
}

/* ---------- 60-second speed round ---------- */

function SpeedRound() {
  const p = useProgress();
  const pool = useMemo(() => practicePool(getState()), []);
  const [phase, setPhase] = useState<"ready" | "play" | "end">("ready");
  const [left, setLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);
  const [card, setCard] = useState<Card>(() => sample(pool, 1)[0]);
  const [flash, setFlash] = useState<string | null>(null);
  const options = useMemo(() => distractors(card, pool, "en"), [card, pool]);
  const prevBest = useRef(p.speedBest);
  const { combo, hit } = useCombo();

  useEffect(() => {
    if (phase !== "play") return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "play" && left <= 0) {
      setPhase("end");
      bump("game");
      update((d) => {
        const g = d.games.speed ?? { plays: 0, best: 0 };
        d.games.speed = { plays: g.plays + 1, best: Math.max(g.best, score) };
      });
      if (score > getState().speedBest) {
        update((d) => void (d.speedBest = score));
        if (score >= 5) confetti();
      }
    }
  }, [left, phase, score]);

  const pick = (o: string) => {
    const ok = o === card.en;
    setFlash(ok ? "ok" : "no");
    sfx(ok ? "good" : "bad");
    hit(ok, 2);
    setTries((t) => t + 1);
    if (ok) setScore((s) => s + 1);
    setTimeout(
      () => {
        setFlash(null);
        let next = sample(pool, 1)[0];
        if (next.id === card.id) next = sample(pool, 1)[0];
        setCard(next);
      },
      ok ? 180 : 600
    );
  };

  if (!pool.length) return <Empty>Unlock a lesson to play.</Empty>;

  if (phase === "ready")
    return (
      <div className="stack-lg">
        <PageHead title="Speed round" sub="60 seconds · words from every lesson you've unlocked" back={href("practice")} />
        <MascotSays mood="happy">
          <strong>Kész vagy? Ready?</strong>
          <span>Pick the English meaning as fast as you can. {p.speedBest ? `Your best is ${p.speedBest}.` : ""}</span>
        </MascotSays>
        <button className="btn primary block big" onClick={() => setPhase("play")}>
          Start
        </button>
      </div>
    );

  if (phase === "end")
    return (
      <div className="stack-lg">
        <PageHead title="Speed round" back={href("practice")} />
        <div className="score-card">
          <div className="score-big ok">{score}</div>
          <p>
            correct out of {tries} · {score > prevBest.current ? "New best!" : `Best: ${Math.max(prevBest.current, score)}`}
          </p>
        </div>
        <div className="row gap">
          <button
            className="btn primary"
            onClick={() => {
              prevBest.current = getState().speedBest;
              setScore(0);
              setTries(0);
              setLeft(60);
              setPhase("play");
            }}
          >
            Play again
          </button>
          <a className="btn" href={href("practice")}>
            Done
          </a>
        </div>
      </div>
    );

  return (
    <div className="stack session">
      <div className="session-top">
        <span className={"timer" + (left <= 10 ? " low" : "")}>{left}s</span>
        <div className="bar">
          <i style={{ width: `${(left / 60) * 100}%` }} />
        </div>
        <span className="tabnum strong">{score}</span>
      </div>
      <ComboBadge combo={combo} />
      <div className={"speed-card" + (flash ? " " + flash : "")}>
        <span className="prompt-word" lang="hu">
          {card.hu}
        </span>
      </div>
      <div className="options">
        {options.map((o) => (
          <button key={o} className={"option" + (flash && o === card.en ? " right" : "")} disabled={!!flash} onClick={() => pick(o)}>
            <span>{o}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
