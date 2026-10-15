import { useEffect, useMemo, useRef, useState } from "react";
import { cardById, cardsByLesson, config, lessonById, type Card } from "../content";
import { LessonPicker } from "../components/LessonPicker";
import { MascotSays } from "../components/Mascot";
import { ChoiceQ, ListenQ, MatchQ, TypeQ } from "../components/Questions";
import { Empty, Icon, PageHead, SpeakButton } from "../components/ui";
import { sample, shuffle } from "../lib/answer";
import { confetti } from "../lib/celebrate";
import { isUnlocked, unlockedLessons } from "../lib/progress";
import { href } from "../lib/router";
import { hasHungarianVoice } from "../lib/speech";
import { addXp, getState, update, useProgress } from "../lib/store";
import { Locked } from "./Vocab";

type Question =
  | { kind: "hu-en"; card: Card; options: string[] }
  | { kind: "en-hu"; card: Card; options: string[] }
  | { kind: "listen"; card: Card; options: string[] }
  | { kind: "type"; card: Card }
  | { kind: "match"; cards: Card[] };

const quizzable = (c: Card) => c.kind !== "rule";

function distractors(card: Card, pool: Card[], field: "hu" | "en", n = 3): string[] {
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

export function QuizPage({ args }: { args: string[] }) {
  const p = useProgress();
  const [a] = args;
  if (a === "speed") return <SpeedRound />;
  if (a === "mistakes") {
    const cards = Object.keys(p.mistakes)
      .map((id) => cardById[id])
      .filter(Boolean);
    return <QuizRunner key="mistakes" title="Mistake notebook" cards={cards} mode="mistakes" back="quiz" />;
  }
  if (a) {
    const l = lessonById[a];
    if (!l) return <PageHead title="Lesson not found" back={href("quiz")} />;
    if (!isUnlocked(l.id, p)) return <Locked back="quiz" />;
    return <QuizRunner key={a} title={l.title} cards={cardsByLesson[a]} mode="lesson" lessonId={a} back="quiz" />;
  }
  const mistakes = Object.keys(p.mistakes).length;
  return (
    <div className="stack-lg">
      <PageHead title="Kvíz" sub="Quizzes built from your vocabulary" />
      <div className="cta-grid">
        <a className="cta warn" href={href("quiz/mistakes")} aria-disabled={!mistakes}>
          <span className="cta-kicker">Mistake notebook</span>
          <span className="cta-title">{mistakes ? `${mistakes} word${mistakes > 1 ? "s" : ""} to fix` : "No mistakes saved"}</span>
          <Icon name="back" />
        </a>
        <a className="cta speed" href={href("quiz/speed")}>
          <span className="cta-kicker">60-second speed round</span>
          <span className="cta-title">{p.speedBest ? `Best: ${p.speedBest} correct` : "How many can you get?"}</span>
          <Icon name="bolt" />
        </a>
      </div>
      <section>
        <h2 className="section-title">Lesson quizzes</h2>
        <p className="muted">Score {config.quizPassMark}% or more to complete a lesson. You can retake a quiz as often as you like.</p>
        <LessonPicker
          hrefFor={(id) => href(`quiz/${id}`)}
          detail={(id) => (p.quizBest[id] === undefined ? "Not taken yet" : `Best score ${p.quizBest[id]}%`)}
        />
      </section>
    </div>
  );
}

function QuizRunner(props: RunProps) {
  const [round, setRound] = useState(0);
  return <QuizRun key={round} {...props} onRestart={() => setRound((r) => r + 1)} />;
}

interface RunProps {
  title: string;
  cards: Card[];
  mode: "lesson" | "mistakes";
  lessonId?: string;
  back: string;
}

function QuizRun({ title, cards, mode, lessonId, back, onRestart }: RunProps & { onRestart: () => void }) {
  const p = useProgress();
  const [questions] = useState(() => {
    const pool = unlockedLessons(getState()).flatMap((l) => cardsByLesson[l.id]).filter(quizzable);
    return buildQuiz(cards, pool.length >= 8 ? pool : cards, mode === "mistakes" ? Math.min(12, cards.length) : 12);
  });
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<Card[]>([]);
  const done = questions.length > 0 && i >= questions.length;
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const passed = pct >= config.quizPassMark;

  useEffect(() => {
    if (!done) return;
    if (mode === "lesson" && lessonId) {
      const prevBest = getState().quizBest[lessonId] ?? 0;
      update((d) => void (d.quizBest[lessonId] = Math.max(prevBest, pct)));
      if (passed && prevBest < config.quizPassMark) addXp(25);
    }
    if (passed) confetti();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (!questions.length)
    return (
      <div className="stack">
        <PageHead title={title} back={href(back)} />
        <Empty>{mode === "mistakes" ? "Your mistake notebook is empty. Nice work!" : "This lesson has no quiz words."}</Empty>
      </div>
    );

  const q = questions[i];

  const answer = (correct: boolean, cardsHit: Card[], wrongCards: Card[] = []) => {
    update((d) => {
      for (const c of wrongCards) d.mistakes[c.id] = (d.mistakes[c.id] ?? 0) + 1;
      if (correct && mode === "mistakes") for (const c of cardsHit) delete d.mistakes[c.id];
      if (correct && mode === "lesson") for (const c of cardsHit) if (d.mistakes[c.id]) delete d.mistakes[c.id];
    });
    if (correct) {
      setScore((s) => s + 1);
      addXp(5);
    } else setMissed((m) => [...m, ...wrongCards]);
    setI((n) => n + 1);
  };

  if (done) {
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
              : passed
                ? "You passed this quiz."
                : `You need ${config.quizPassMark}% to complete the lesson. Review the words below and try again.`}
          </span>
        </MascotSays>
        {missed.length > 0 && (
          <section>
            <h2 className="section-title">Review these</h2>
            <ul className="word-list">
              {[...new Map(missed.map((c) => [c.id, c])).values()].map((c) => (
                <li key={c.id}>
                  <SpeakButton text={c.hu} small />
                  <div className="wl-main">
                    <strong lang="hu">{c.hu}</strong>
                    <span>{c.en}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="row gap wrap">
          <button className="btn primary" onClick={onRestart}>
            New quiz
          </button>
          {lessonId && (
            <a className="btn" href={href(`lesson/${lessonId}`)}>
              Back to lesson
            </a>
          )}
        </div>
      </div>
    );
  }

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
      <QuestionView key={i} q={q} onAnswer={answer} />
      {p.teacher && <p className="muted small-print">Teacher mode is on: all lessons are unlocked.</p>}
    </div>
  );
}

function QuestionView({ q, onAnswer }: { q: Question; onAnswer: (ok: boolean, hit: Card[], wrong?: Card[]) => void }) {
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
          explain={q.card.note}
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
          explain={q.card.note}
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
          explain={q.card.note}
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

function SpeedRound() {
  const p = useProgress();
  const pool = useMemo(() => unlockedLessons(getState()).flatMap((l) => cardsByLesson[l.id]).filter(quizzable), []);
  const [phase, setPhase] = useState<"ready" | "play" | "end">("ready");
  const [left, setLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);
  const [card, setCard] = useState<Card>(() => sample(pool, 1)[0]);
  const [flash, setFlash] = useState<string | null>(null);
  const options = useMemo(() => distractors(card, pool, "en"), [card, pool]);
  const prevBest = useRef(p.speedBest);

  useEffect(() => {
    if (phase !== "play") return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "play" && left <= 0) {
      setPhase("end");
      if (score > 0) addXp(score * 2);
      if (score > getState().speedBest) {
        update((d) => void (d.speedBest = score));
        if (score >= 5) confetti();
      }
    }
  }, [left, phase, score]);

  const pick = (o: string) => {
    const ok = o === card.en;
    setFlash(ok ? "ok" : "no");
    setTries((t) => t + 1);
    if (ok) setScore((s) => s + 1);
    setTimeout(() => {
      setFlash(null);
      let next = sample(pool, 1)[0];
      if (next.id === card.id) next = sample(pool, 1)[0];
      setCard(next);
    }, ok ? 180 : 600);
  };

  if (phase === "ready")
    return (
      <div className="stack-lg">
        <PageHead title="Speed round" sub="60 seconds · words from every lesson you've unlocked" back={href("quiz")} />
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
        <PageHead title="Speed round" back={href("quiz")} />
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
          <a className="btn" href={href("quiz")}>
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
