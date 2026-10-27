/**
 * Cseppek: Drops-style vocabulary. Short timed sessions, one topic at a time, big pictures and quick taps.
 * Each word climbs 4 levels (meet it → pick it → hear it → spell it); a learned word also counts as a reviewed flashcard.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { cardsByDict, cardsByLesson, dictionaryCats, type Card } from "../content";
import { MascotSays } from "../components/Mascot";
import { Icon, PageHead, Ring } from "../components/ui";
import { sample, shuffle } from "../lib/answer";
import { confetti } from "../lib/celebrate";
import { myWordCards } from "../lib/discover";
import { emojiFor, hueFor } from "../lib/emoji";
import { unlockedLessons } from "../lib/progress";
import { go, href } from "../lib/router";
import { schedule } from "../lib/srs";
import { sfx } from "../lib/sound";
import { canSpeak, speak } from "../lib/speech";
import { addXp, bump, getState, update, useProgress, type Progress } from "../lib/store";

const LEARNED = 4;
const ok = (c: Card) => c.kind !== "rule" && c.hu.length <= 26 && c.en.length <= 60;

interface Topic {
  id: string;
  title: string;
  sub: string;
  emoji: string;
  cards: Card[];
}

function topics(p: Progress): Topic[] {
  const pic = (cards: Card[], fallback: string) => cards.map((c) => emojiFor(c.en)).find(Boolean) ?? fallback;
  const out: Topic[] = [];
  const mine = myWordCards(p).filter(ok);
  if (mine.length >= 4) out.push({ id: "mine", title: "Saját szavaim", sub: "My words", emoji: "💛", cards: mine });
  for (const l of unlockedLessons(p)) {
    const cards = cardsByLesson[l.id].filter(ok);
    out.push({ id: `l:${l.id}`, title: `${l.order}. ${l.title}`, sub: l.titleEn, emoji: pic(cards, "📘"), cards });
  }
  for (const c of dictionaryCats) {
    const cards = cardsByDict[c.id].filter(ok);
    out.push({ id: `d:${c.id}`, title: c.title, sub: c.titleEn, emoji: pic(cards, "📗"), cards });
  }
  return out;
}

export function DropsPage({ topic }: { topic?: string }) {
  const p = useProgress();
  const all = useMemo(() => topics(p), [p.teacher, Object.keys(p.myWords ?? {}).length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [minutes, setMinutes] = useState(() => {
    try {
      return Number(localStorage.getItem("magyar-path:drops-min")) || 5;
    } catch {
      return 5;
    }
  });
  const t = topic ? all.find((x) => x.id === decodeURIComponent(topic)) : undefined;
  const [run, setRun] = useState(0);
  if (t) return <Session key={`${t.id}-${run}`} topic={t} seconds={minutes * 60} onAgain={() => setRun((r) => r + 1)} />;

  const setMin = (m: number) => {
    setMinutes(m);
    try {
      localStorage.setItem("magyar-path:drops-min", String(m));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="stack-lg">
      <PageHead title="Cseppek" sub="Drops · a few minutes a day, one topic at a time" back={href("vocab")} />
      <section className="panel stack drops-intro">
        <p className="muted small-print">
          Pick a topic and play for a few minutes: meet a word, tap it, hear it, spell it. Every word climbs four levels, and learned words join your
          flashcard reviews.
        </p>
        <div className="seg" role="tablist" aria-label="Session length">
          {[2, 5, 10].map((m) => (
            <button key={m} role="tab" aria-selected={minutes === m} onClick={() => setMin(m)}>
              {m} min
            </button>
          ))}
        </div>
      </section>
      <div className="drop-topics">
        {all.map((tp) => {
          const learned = tp.cards.filter((c) => (p.drops?.[c.id] ?? 0) >= LEARNED).length;
          return (
            <a key={tp.id} href={href(`drops/${encodeURIComponent(tp.id)}`)} className="drop-topic" style={{ ["--h" as string]: hueFor(tp.id) }}>
              <Ring value={tp.cards.length ? learned / tp.cards.length : 0} size={74} stroke={5}>
                <span className="dt-emoji" aria-hidden="true">
                  {tp.emoji}
                </span>
              </Ring>
              <strong lang="hu">{tp.title}</strong>
              <span className="muted small-print">
                {tp.sub} · {learned}/{tp.cards.length}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- session ---------------- */

type Step =
  | { kind: "intro"; card: Card }
  | { kind: "pick"; card: Card; options: Card[] }
  | { kind: "meaning"; card: Card; options: Card[]; listen: boolean }
  | { kind: "spell"; card: Card; letters: string[] }
  | { kind: "match"; cards: Card[] };

function Pic({ card, size = 84 }: { card: Card; size?: number }) {
  const e = emojiFor(card.en);
  return e ? (
    <span className="drop-pic" style={{ fontSize: size }} aria-hidden="true">
      {e}
    </span>
  ) : (
    <span className="drop-pic letter" style={{ ["--h" as string]: hueFor(card.en), width: size * 1.3, height: size * 1.3, fontSize: size * 0.6 }} aria-hidden="true">
      {card.en.replace(/^(a|an|the|to) /i, "")[0]?.toUpperCase()}
    </span>
  );
}

const spellable = (c: Card) => /^[a-záéíóöőúüű]{2,10}$/i.test(c.hu);

function Session({ topic, seconds, onAgain }: { topic: Topic; seconds: number; onAgain: () => void }) {
  const [left, setLeft] = useState(seconds);
  const [step, setStep] = useState<Step | null>(null);
  const [n, setN] = useState(0);
  const [stats, setStatsState] = useState({ correct: 0, wrong: 0, learned: [] as string[] });
  const statsRef = useRef(stats);
  const setStats = (f: (s: typeof stats) => typeof stats) => setStatsState((s) => (statsRef.current = f(s)));
  const [over, setOver] = useState(false);
  const active = useRef<string[]>([]);
  const level = (id: string) => getState().drops?.[id] ?? 0;
  const setLevel = (c: Card, v: number) => {
    update((d) => void ((d.drops ??= {})[c.id] = v));
  };

  const pool = topic.cards;
  const others = (c: Card, k: number) => sample(pool.filter((x) => x.hu !== c.hu && x.en !== c.en), k);

  const nextStep = (): Step | null => {
    const act = active.current.filter((id) => level(id) > 0 && level(id) < LEARNED);
    active.current = act;
    const fresh = pool.filter((c) => !level(c.id) && !act.includes(c.id));
    const known = pool.filter((c) => level(c.id) >= 1);
    // every 5th step: a quick match round
    if (n > 0 && n % 5 === 0 && known.length >= 4) return { kind: "match", cards: sample(known, 4) };
    if (act.length < 3 && fresh.length) return { kind: "intro", card: fresh[0] };
    const candidates = act.length ? pool.filter((c) => act.includes(c.id)) : sample(pool.filter((c) => level(c.id) >= LEARNED), 1);
    if (!candidates.length) return fresh.length ? { kind: "intro", card: fresh[0] } : null;
    const lowest = Math.min(...candidates.map((c) => level(c.id)));
    const card = shuffle(candidates.filter((c) => level(c.id) === lowest))[0];
    const lv = level(card.id);
    if (lv <= 1 || lv >= LEARNED) return { kind: "pick", card, options: shuffle([card, ...others(card, 2)]) };
    if (lv === 2) return { kind: "meaning", card, options: shuffle([card, ...others(card, 2)]), listen: canSpeak() };
    if (spellable(card)) {
      const extra = sample("aeioásztlnkrgy".split("").filter((x) => !card.hu.toLowerCase().includes(x)), 2);
      return { kind: "spell", card, letters: shuffle([...card.hu.toLowerCase().split(""), ...extra]) };
    }
    return { kind: "meaning", card, options: shuffle([card, ...others(card, 2)]), listen: false };
  };

  useEffect(() => {
    setStep(nextStep());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  useEffect(() => {
    if (over) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [over]);

  const advance = () => {
    if (left <= 0) finish();
    else setN((x) => x + 1);
  };

  const finish = () => {
    if (over) return;
    setOver(true);
    bump("game");
    const st = statsRef.current;
    update((d) => {
      const g = (d.games["drops"] ??= { plays: 0, best: 0 });
      g.plays++;
      g.best = Math.max(g.best, st.learned.length);
    });
    addXp(Math.max(3, st.correct));
    if (st.learned.length >= 3) confetti();
    sfx("win");
  };

  const graduate = (c: Card) => {
    setLevel(c, LEARNED);
    update((d) => void (d.cards[c.id] = schedule(d.cards[c.id], "good")));
    if (c.lessonId.startsWith("dict:")) bump("dict");
    setStats((s) => ({ ...s, learned: s.learned.includes(c.hu) ? s.learned : [...s.learned, c.hu] }));
  };

  const answer = (c: Card, right: boolean) => {
    sfx(right ? "good" : "bad");
    bump("card");
    if (right) {
      bump("correct");
      const lv = level(c.id);
      if (lv + 1 >= LEARNED) graduate(c);
      else setLevel(c, Math.max(1, lv + 1));
    } else setLevel(c, Math.max(1, level(c.id) - 1));
    setStats((s) => ({ ...s, correct: s.correct + (right ? 1 : 0), wrong: s.wrong + (right ? 0 : 1) }));
  };

  if (over || (!step && n > 0))
    return (
      <div className="stack-lg">
        <PageHead title="Cseppek" sub={topic.sub} back={href("drops")} />
        <div className="drops-summary" style={{ ["--h" as string]: hueFor(topic.id) }}>
          <span className="ds-emoji">{topic.emoji}</span>
          <strong>{stats.learned.length ? `${stats.learned.length} new word${stats.learned.length > 1 ? "s" : ""} learned` : "Nice practice!"}</strong>
          <span>
            {stats.correct} right · {stats.wrong} to review
          </span>
          {stats.learned.length > 0 && (
            <div className="ds-words" lang="hu">
              {stats.learned.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
          )}
        </div>
        <div className="row gap wrap">
          <button className="btn primary" onClick={onAgain}>
            Another {Math.round(seconds / 60)} minutes
          </button>
          <button className="btn" onClick={() => go("drops")}>
            Other topics
          </button>
        </div>
      </div>
    );

  if (!step)
    return (
      <div className="stack-lg">
        <PageHead title="Cseppek" back={href("drops")} />
        <MascotSays mood="happy">
          <strong>All words learned here!</strong>
          <span>Pick another topic, or keep reviewing them in your flashcards.</span>
        </MascotSays>
      </div>
    );

  return (
    <div className="drops" style={{ ["--h" as string]: hueFor(topic.id) }}>
      <div className="drops-top">
        <a className="icon-btn" href={href("drops")} aria-label="Stop">
          <Icon name="x" size={20} />
        </a>
        <div className="drops-timer" aria-label={`${left} seconds left`}>
          <i style={{ width: `${(left / seconds) * 100}%` }} />
        </div>
        <span className="tabnum small-print">
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </span>
      </div>
      <StepView
        key={n}
        step={step}
        onIntro={(c, knowIt) => {
          if (knowIt) graduate(c);
          else {
            setLevel(c, 1);
            active.current = [...active.current, c.id];
          }
          advance();
        }}
        onAnswer={answer}
        onDone={advance}
      />
    </div>
  );
}

function StepView({
  step,
  onIntro,
  onAnswer,
  onDone,
}: {
  step: Step;
  onIntro: (c: Card, knowIt: boolean) => void;
  onAnswer: (c: Card, right: boolean) => void;
  onDone: () => void;
}) {
  const p = useProgress();
  const [picked, setPicked] = useState<string | null>(null);
  const card = "card" in step ? step.card : null;

  useEffect(() => {
    if (step.kind === "intro" || (step.kind === "meaning" && step.listen)) speak(step.card.hu);
  }, [step]);

  const choose = (c: Card) => {
    if (picked || !card) return;
    const right = c.id === card.id;
    setPicked(c.id);
    onAnswer(card, right);
    if (!right || step.kind === "meaning") speak(card.hu);
    setTimeout(onDone, right ? 650 : 1500);
  };

  if (step.kind === "intro")
    return (
      <div className="drop-card intro">
        <span className="drop-tag">Új szó · New word</span>
        <Pic card={step.card} size={96} />
        <button className="drop-word" lang="hu" onClick={() => speak(step.card.hu)}>
          {step.card.hu} <Icon name="speaker" size={20} />
        </button>
        <span className="drop-mean">{step.card.en}</span>
        {p.settings.showRo && step.card.ro && (
          <span className="drop-ro" lang="ro">
            {step.card.ro}
          </span>
        )}
        <div className="drop-actions">
          <button className="btn" onClick={() => onIntro(step.card, true)}>
            I know this
          </button>
          <button className="btn primary" onClick={() => onIntro(step.card, false)}>
            Got it <Icon name="next" size={16} />
          </button>
        </div>
      </div>
    );

  if (step.kind === "pick")
    return (
      <div className="drop-card">
        <Pic card={step.card} />
        <span className="drop-mean big">{step.card.en}</span>
        <div className="drop-tiles">
          {step.options.map((o) => (
            <button
              key={o.id}
              lang="hu"
              className={"drop-tile" + (picked ? (o.id === step.card.id ? " right" : o.id === picked ? " wrong" : " dim") : "")}
              onClick={() => choose(o)}
            >
              {o.hu}
            </button>
          ))}
        </div>
      </div>
    );

  if (step.kind === "meaning")
    return (
      <div className="drop-card">
        {step.listen ? (
          <button className="drop-listen" onClick={() => speak(step.card.hu)} aria-label="Listen again">
            <Icon name="speaker" size={44} />
          </button>
        ) : (
          <span className="drop-word static" lang="hu">
            {step.card.hu}
          </span>
        )}
        <span className="drop-tag">{step.listen ? "What did you hear?" : "What does it mean?"}</span>
        <div className="drop-tiles pics">
          {step.options.map((o) => (
            <button
              key={o.id}
              className={"drop-tile pic" + (picked ? (o.id === step.card.id ? " right" : o.id === picked ? " wrong" : " dim") : "")}
              onClick={() => choose(o)}
            >
              <Pic card={o} size={40} />
              <span>{o.en}</span>
            </button>
          ))}
        </div>
        {picked && (
          <span className="drop-word static small" lang="hu">
            {step.card.hu}
          </span>
        )}
      </div>
    );

  if (step.kind === "spell") return <Spell card={step.card} letters={step.letters} onAnswer={onAnswer} onDone={onDone} />;

  return <Match cards={step.cards} onAnswer={onAnswer} onDone={onDone} />;
}

function Spell({ card, letters, onAnswer, onDone }: { card: Card; letters: string[]; onAnswer: (c: Card, r: boolean) => void; onDone: () => void }) {
  const target = card.hu.toLowerCase();
  const [used, setUsed] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const typed = used.map((i) => letters[i]).join("");
  const tap = (i: number) => {
    if (result !== null || used.includes(i)) return;
    const next = [...used, i];
    const word = next.map((k) => letters[k]).join("");
    sfx("tap");
    if (!target.startsWith(word)) {
      // a wrong letter: show it, count it, move on
      setUsed(next);
      setResult(false);
      onAnswer(card, false);
      speak(card.hu);
      setTimeout(onDone, 1600);
      return;
    }
    setUsed(next);
    if (word === target) {
      setResult(true);
      onAnswer(card, true);
      speak(card.hu);
      setTimeout(onDone, 800);
    }
  };
  return (
    <div className="drop-card">
      <Pic card={card} size={64} />
      <span className="drop-mean big">{card.en}</span>
      <div className={"spell-slots" + (result === null ? "" : result ? " right" : " wrong")} lang="hu">
        {target.split("").map((ch, i) => (
          <span key={i} className={"slot" + (typed[i] ? " filled" : "")}>
            {result === false ? ch : typed[i] ?? ""}
          </span>
        ))}
      </div>
      <div className="spell-bank">
        {letters.map((l, i) => (
          <button key={i} className="spell-key" disabled={used.includes(i) || result !== null} onClick={() => tap(i)}>
            {l}
          </button>
        ))}
      </div>
      {result === null && (
        <button className="linkish small-print" onClick={() => setUsed(used.slice(0, -1))} disabled={!used.length}>
          Undo
        </button>
      )}
    </div>
  );
}

function Match({ cards, onAnswer, onDone }: { cards: Card[]; onAnswer: (c: Card, r: boolean) => void; onDone: () => void }) {
  const right = useMemo(() => shuffle(cards), [cards]);
  const [sel, setSel] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [bad, setBad] = useState<string | null>(null);
  const pickRight = (c: Card) => {
    if (!sel || done.includes(c.id)) return;
    const l = cards.find((x) => x.id === sel)!;
    const ok = l.id === c.id;
    onAnswer(l, ok);
    if (ok) {
      const next = [...done, c.id];
      setDone(next);
      setSel(null);
      speak(l.hu);
      if (next.length === cards.length) setTimeout(onDone, 500);
    } else {
      setBad(c.id);
      setTimeout(() => setBad(null), 500);
      setSel(null);
    }
  };
  return (
    <div className="drop-card">
      <span className="drop-tag">Párosítsd! · Match them</span>
      <div className="match-cols">
        <div>
          {cards.map((c) => (
            <button
              key={c.id}
              lang="hu"
              className={"drop-tile small" + (done.includes(c.id) ? " gone" : sel === c.id ? " sel" : "")}
              disabled={done.includes(c.id)}
              onClick={() => setSel(c.id)}
            >
              {c.hu}
            </button>
          ))}
        </div>
        <div>
          {right.map((c) => (
            <button
              key={c.id}
              className={"drop-tile small pic" + (done.includes(c.id) ? " gone" : bad === c.id ? " wrong" : "")}
              disabled={done.includes(c.id)}
              onClick={() => pickRight(c)}
            >
              <Pic card={c} size={26} />
              <span>{c.en}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
