import { useEffect, useMemo, useRef, useState } from "react";
import { allDictCards, cardsByDict, dictCatById, exerciseSets, type Card } from "../content";
import { MascotSays } from "../components/Mascot";
import { OrderQ } from "../components/Questions";
import { ComboBadge, Empty, Icon, Meaning, PageHead, SpeakButton } from "../components/ui";
import { sample, shuffle } from "../lib/answer";
import { confetti } from "../lib/celebrate";
import { unlockedLessons } from "../lib/progress";
import { href } from "../lib/router";
import { sfx } from "../lib/sound";
import { canSpeak, hasHungarianVoice, speak } from "../lib/speech";
import { addXp, bump, getState, update, useProgress } from "../lib/store";
import { classify } from "./Grammar";
import { distractors, practicePool, useCombo } from "./Quiz";

export const GAMES = [
  { id: "memory", title: "Memória", titleEn: "Memory pairs", desc: "Flip cards to find Hungarian–English pairs.", tone: "purple" },
  { id: "rain", title: "Szóeső", titleEn: "Word rain", desc: "Catch the right word before it hits the ground.", tone: "blue" },
  { id: "builder", title: "Mondatépítő", titleEn: "Sentence builder", desc: "Put the word tiles in the right order.", tone: "green" },
  { id: "petals", title: "Szirmok", titleEn: "Petals (hangman)", desc: "Guess the word letter by letter before the flower loses its petals.", tone: "pink" },
  { id: "harmony", title: "Mély vagy magas?", titleEn: "Vowel harmony sort", desc: "Sort words into back, front and mixed as fast as you can.", tone: "paprika" },
  { id: "bingo", title: "Hallás-bingó", titleEn: "Listening bingo", desc: "Hear a word, find it on your card, get three in a row.", tone: "teal" },
] as const;

function recordGame(id: string, score: number, xp: number) {
  bump("game");
  update((d) => {
    const g = d.games[id] ?? { plays: 0, best: 0 };
    d.games[id] = { plays: g.plays + 1, best: Math.max(g.best, score) };
  });
  addXp(xp);
}

/** Words to play with: unlocked lessons + dictionary words you've learned (or a category). */
function useGamePool(catId?: string) {
  return useMemo(() => {
    const p = getState();
    if (catId && cardsByDict[catId]) return cardsByDict[catId].filter((c) => c.kind !== "rule");
    const learnedDict = allDictCards.filter((c) => (p.cards[c.id]?.reps ?? 0) > 0);
    let pool = [...practicePool(p), ...learnedDict];
    if (pool.length < 12) pool = [...pool, ...allDictCards.filter((c) => c.kind !== "rule")];
    return pool;
  }, [catId]);
}

export function GamesPage({ args }: { args: string[] }) {
  const [id, cat] = args;
  switch (id) {
    case "memory":
      return <Memory catId={cat} />;
    case "rain":
      return <Rain />;
    case "builder":
      return <Builder />;
    case "petals":
      return <Petals />;
    case "harmony":
      return <HarmonySort />;
    case "bingo":
      return <Bingo />;
  }
  return <GameGrid />;
}

export function GameGrid() {
  const p = useProgress();
  return (
    <div className="game-grid">
      {GAMES.map((g) => (
        <a key={g.id} href={href(`play/${g.id}`)} className={"game-tile tone-" + g.tone}>
          <span className="gt-title" lang="hu">
            {g.title}
          </span>
          <span className="gt-en">{g.titleEn}</span>
          <span className="gt-desc">{g.desc}</span>
          <span className="gt-best">{p.games[g.id] ? `Best: ${p.games[g.id].best} · played ${p.games[g.id].plays}×` : "New!"}</span>
        </a>
      ))}
    </div>
  );
}

function EndScreen({
  title,
  big,
  line,
  mood,
  onAgain,
  back = "practice",
}: {
  title: string;
  big: string;
  line: string;
  mood: "party" | "happy" | "neutral" | "sad";
  onAgain: () => void;
  back?: string;
}) {
  return (
    <div className="stack-lg">
      <PageHead title={title} back={href(back)} />
      <div className="score-card">
        <div className="score-big ok">{big}</div>
      </div>
      <MascotSays mood={mood}>
        <strong>{mood === "party" ? "Fantasztikus!" : mood === "sad" ? "Majdnem!" : "Ügyes!"}</strong>
        <span>{line}</span>
      </MascotSays>
      <div className="row gap wrap">
        <button className="btn primary" onClick={onAgain}>
          Play again
        </button>
        <a className="btn" href={href(back)}>
          Done
        </a>
      </div>
    </div>
  );
}

/* ---------- Memory pairs ---------- */

function Memory({ catId }: { catId?: string }) {
  const [round, setRound] = useState(0);
  return <MemoryRun key={round} catId={catId} onAgain={() => setRound((r) => r + 1)} />;
}

function MemoryRun({ catId, onAgain }: { catId?: string; onAgain: () => void }) {
  const pool = useGamePool(catId);
  const [tiles] = useState(() => {
    const seen = new Set<string>();
    const picks: Card[] = [];
    for (const c of shuffle(pool)) {
      if (c.hu.length > 22 || c.en.length > 26 || seen.has(c.en) || seen.has(c.hu)) continue;
      seen.add(c.en);
      seen.add(c.hu);
      picks.push(c);
      if (picks.length === 6) break;
    }
    return shuffle(picks.flatMap((c) => [{ key: c.id + "-hu", pair: c.id, text: c.hu, hu: true }, { key: c.id + "-en", pair: c.id, text: c.en, hu: false }]));
  });
  const [open, setOpen] = useState<string[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const pairs = tiles.length / 2;
  const done = pairs > 0 && found.size === pairs;
  const back = catId ? `dict/${catId}` : "practice";

  useEffect(() => {
    if (!done) return;
    const score = Math.max(10, 100 - (moves - pairs) * 8);
    recordGame("memory", score, 10 + pairs * 2);
    confetti();
    sfx("win");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (pairs < 3) return <Empty>Not enough words yet. Learn a few more first.</Empty>;

  const flip = (key: string) => {
    if (open.length === 2 || open.includes(key)) return;
    const t = tiles.find((x) => x.key === key)!;
    if (found.has(t.pair)) return;
    sfx("flip");
    if (t.hu) speak(t.text);
    const next = [...open, key];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((k) => tiles.find((x) => x.key === k)!);
      if (a.pair === b.pair) {
        setTimeout(() => {
          setFound((f) => new Set(f).add(a.pair));
          setOpen([]);
          sfx("good");
        }, 350);
      } else setTimeout(() => setOpen([]), 900);
    }
  };

  if (done)
    return (
      <EndScreen
        title="Memória"
        big={`${moves} moves`}
        line={moves <= pairs + 2 ? "What a memory! Almost no wrong guesses." : `All ${pairs} pairs found. Fewer moves next time?`}
        mood={moves <= pairs + 2 ? "party" : "happy"}
        onAgain={onAgain}
        back={back}
      />
    );

  return (
    <div className="stack">
      <PageHead title="Memória" sub={catId ? dictCatById[catId]?.titleEn : "Find the pairs"} back={href(back)} />
      <div className="row between">
        <span className="muted">
          {found.size}/{pairs} pairs
        </span>
        <span className="muted tabnum">{moves} moves</span>
      </div>
      <div className="memory-grid">
        {tiles.map((t) => {
          const isOpen = open.includes(t.key) || found.has(t.pair);
          return (
            <button
              key={t.key}
              className={"mem-tile" + (isOpen ? " open" : "") + (found.has(t.pair) ? " found" : "") + (t.hu ? " hu" : "")}
              onClick={() => flip(t.key)}
              aria-label={isOpen ? t.text : "Hidden card"}
            >
              <span className="mem-back" aria-hidden="true">
                Á
              </span>
              <span className="mem-front" lang={t.hu ? "hu" : "en"}>
                {t.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Word rain ---------- */

interface Drop {
  id: number;
  text: string;
  ok: boolean;
  lane: number;
  y: number;
}

function Rain() {
  const [round, setRound] = useState(0);
  return <RainRun key={round} onAgain={() => setRound((r) => r + 1)} />;
}

function RainRun({ onAgain }: { onAgain: () => void }) {
  const pool = useGamePool();
  const [phase, setPhase] = useState<"ready" | "play" | "end">("ready");
  const [target, setTarget] = useState<Card | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const { combo, hit } = useCombo();
  const box = useRef<HTMLDivElement>(null);
  const speed = useRef(60);
  const idRef = useRef(0);

  const newRound = () => {
    const card = sample(pool, 1)[0];
    const opts = distractors(card, pool, "hu", 3);
    const lanes = shuffle([0, 1, 2, 3]);
    setTarget(card);
    setDrops(opts.map((text, k) => ({ id: ++idRef.current, text, ok: text === card.hu, lane: lanes[k], y: -60 - k * 45 })));
  };

  useEffect(() => {
    if (phase !== "play") return;
    let last = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const h = box.current?.clientHeight ?? 420;
      setDrops((ds) => {
        const moved = ds.map((d) => ({ ...d, y: d.y + speed.current * dt }));
        const missed = moved.find((d) => d.ok && d.y > h - 30);
        if (missed) {
          setTimeout(() => {
            sfx("bad");
            hit(false, 0);
            setLives((l) => l - 1);
            newRound();
          });
          return [];
        }
        return moved.filter((d) => d.y < h);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase === "play" && lives <= 0) {
      setPhase("end");
      recordGame("rain", score, 5 + score * 2);
      if (score >= 10) confetti();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lives]);

  const tap = (d: Drop) => {
    if (d.ok) {
      sfx("good");
      hit(true, 1);
      setScore((s) => s + 1);
      speed.current = Math.min(160, speed.current + 6);
      newRound();
    } else {
      sfx("bad");
      hit(false, 0);
      setLives((l) => l - 1);
      setDrops((ds) => ds.filter((x) => x.id !== d.id));
    }
  };

  if (pool.length < 4) return <Empty>Not enough words yet.</Empty>;

  if (phase === "ready")
    return (
      <div className="stack-lg">
        <PageHead title="Szóeső" sub="Word rain" back={href("practice")} />
        <MascotSays mood="happy">
          <strong>Esik a szó!</strong>
          <span>Hungarian words fall from the sky. Tap the one that means the English word at the bottom. You have 3 lives.</span>
        </MascotSays>
        <button
          className="btn primary block big"
          onClick={() => {
            speed.current = 60;
            newRound();
            setPhase("play");
          }}
        >
          Start
        </button>
      </div>
    );

  if (phase === "end")
    return (
      <EndScreen
        title="Szóeső"
        big={String(score)}
        line={`You caught ${score} word${score === 1 ? "" : "s"}. ${score >= 10 ? "Amazing reflexes!" : "Every round makes you faster."}`}
        mood={score >= 10 ? "party" : score >= 4 ? "happy" : "neutral"}
        onAgain={onAgain}
      />
    );

  return (
    <div className="stack session">
      <div className="session-top">
        <a className="icon-btn" href={href("practice")} aria-label="Leave game">
          <Icon name="x" />
        </a>
        <span className="tabnum strong">{score}</span>
        <span className="hearts">
          {[0, 1, 2].map((k) => (
            <span key={k} className={k < lives ? "heart" : "heart lost"}>
              <Icon name="heart" size={20} />
            </span>
          ))}
        </span>
      </div>
      <ComboBadge combo={combo} />
      <div className="rain-box" ref={box}>
        {drops.map((d) => (
          <button key={d.id} className="drop" lang="hu" style={{ left: `${d.lane * 25 + 1}%`, transform: `translateY(${d.y}px)` }} onClick={() => tap(d)}>
            {d.text}
          </button>
        ))}
        <div className="rain-ground" />
      </div>
      {target && (
        <div className="rain-target">
          <span className="muted">Catch:</span> <strong>{target.en}</strong>
        </div>
      )}
    </div>
  );
}

/* ---------- Sentence builder ---------- */

function Builder() {
  const [round, setRound] = useState(0);
  return <BuilderRun key={round} onAgain={() => setRound((r) => r + 1)} />;
}

function BuilderRun({ onAgain }: { onAgain: () => void }) {
  const [rounds] = useState(() => {
    const p = getState();
    const lessons = unlockedLessons(p);
    const fromDrills = lessons.flatMap((l) => l.exercises.flatMap((x) => exerciseSets[x]?.items ?? [])).flatMap((it) =>
      it.type === "order" ? [{ prompt: it.prompt, tiles: it.tiles, answer: it.answer }] : []
    );
    const fromCards = practicePool(p)
      .filter((c) => c.kind === "phrase")
      .map((c) => ({ c, words: c.hu.replace(/[„”]/g, "").split(/\s+/) }))
      .filter(({ words }) => words.length >= 3 && words.length <= 7)
      .map(({ c, words }) => ({ prompt: c.en, tiles: words, answer: words.join(" ") }));
    return shuffle([...shuffle(fromDrills).slice(0, 4), ...fromCards]).slice(0, 8);
  });
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const { combo, hit } = useCombo();
  const done = rounds.length > 0 && i >= rounds.length;

  useEffect(() => {
    if (!done) return;
    recordGame("builder", score, 5 + score * 3);
    if (score === rounds.length) confetti();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (!rounds.length) return <Empty>Finish lesson 3 to unlock sentences to build.</Empty>;
  if (done)
    return (
      <EndScreen
        title="Mondatépítő"
        big={`${score}/${rounds.length}`}
        line={score === rounds.length ? "Every sentence perfect!" : "Word order takes practice. The focus word goes right before the verb!"}
        mood={score === rounds.length ? "party" : score >= rounds.length / 2 ? "happy" : "neutral"}
        onAgain={onAgain}
      />
    );
  const r = rounds[i];
  return (
    <div className="stack session">
      <div className="session-top">
        <a className="icon-btn" href={href("practice")} aria-label="Leave game">
          <Icon name="x" />
        </a>
        <div className="bar">
          <i style={{ width: `${(i / rounds.length) * 100}%` }} />
        </div>
        <span className="muted tabnum">
          {i + 1}/{rounds.length}
        </span>
      </div>
      <ComboBadge combo={combo} />
      <OrderQ
        key={i}
        prompt={<span className="prompt-text">{r.prompt}</span>}
        tiles={r.tiles}
        answer={r.answer}
        onNext={(ok) => {
          hit(ok, 3);
          if (ok) setScore((s) => s + 1);
          setI((n) => n + 1);
        }}
      />
    </div>
  );
}

/* ---------- Petals (hangman) ---------- */

const ALPHABET = "aábcdeéfghiíjklmnoóöőpqrstuúüűvwxyz".split("");
const MAX_MISS = 6;

function Flower({ petals }: { petals: number }) {
  return (
    <svg viewBox="0 0 120 140" className="flower" role="img" aria-label={`${petals} petals left`}>
      <path d="M60 70v66" stroke="var(--green)" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 110c-14-2-22-12-24-20 12 0 22 8 24 20zM60 100c14-2 22-12 24-20-12 0-22 8-24 20z" fill="var(--green)" />
      {Array.from({ length: MAX_MISS }).map((_, k) => {
        const a = (k / MAX_MISS) * Math.PI * 2 - Math.PI / 2;
        const on = k < petals;
        return (
          <ellipse
            key={k}
            cx={60 + Math.cos(a) * 22}
            cy={48 + Math.sin(a) * 22}
            rx="13"
            ry="18"
            transform={`rotate(${(a * 180) / Math.PI + 90} ${60 + Math.cos(a) * 22} ${48 + Math.sin(a) * 22})`}
            fill={on ? "var(--brand)" : "transparent"}
            stroke={on ? "none" : "var(--line)"}
            strokeDasharray={on ? undefined : "3 3"}
            className="petal"
          />
        );
      })}
      <circle cx="60" cy="48" r="14" fill="var(--yellow)" />
    </svg>
  );
}

function Petals() {
  const [round, setRound] = useState(0);
  return <PetalsRun key={round} onAgain={() => setRound((r) => r + 1)} />;
}

function PetalsRun({ onAgain }: { onAgain: () => void }) {
  const pool = useGamePool();
  const [words] = useState(() =>
    shuffle(pool.filter((c) => c.kind === "word" && /^[a-záéíóöőúüű]{4,10}$/i.test(c.hu))).slice(0, 5)
  );
  const [i, setI] = useState(0);
  const [guessed, setGuessed] = useState<string[]>([]);
  const [solved, setSolved] = useState(0);
  const card = words[i];
  const target = card?.hu.toLowerCase() ?? "";
  const misses = guessed.filter((g) => !target.includes(g)).length;
  const won = !!card && [...target].every((ch) => guessed.includes(ch));
  const lost = misses >= MAX_MISS;
  const finished = words.length > 0 && i >= words.length;

  useEffect(() => {
    if (won) {
      sfx("good");
      speak(card.hu);
      setSolved((s) => s + 1);
    }
    if (lost) sfx("bad");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won, lost]);

  useEffect(() => {
    if (!finished) return;
    recordGame("petals", solved, 5 + solved * 4);
    if (solved === words.length) confetti();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (ALPHABET.includes(k) && !won && !lost && !guessed.includes(k)) setGuessed((g) => [...g, k]);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  if (!words.length) return <Empty>Not enough words yet.</Empty>;
  if (finished)
    return (
      <EndScreen
        title="Szirmok"
        big={`${solved}/${words.length}`}
        line={solved === words.length ? "Every word guessed. The flower survived!" : "Watch out for the accents: á and a are different letters!"}
        mood={solved === words.length ? "party" : solved >= 3 ? "happy" : "neutral"}
        onAgain={onAgain}
      />
    );

  return (
    <div className="stack session">
      <div className="session-top">
        <a className="icon-btn" href={href("practice")} aria-label="Leave game">
          <Icon name="x" />
        </a>
        <div className="bar">
          <i style={{ width: `${(i / words.length) * 100}%` }} />
        </div>
        <span className="muted tabnum">
          {i + 1}/{words.length}
        </span>
      </div>
      <div className="petals-top">
        <Flower petals={MAX_MISS - misses} />
        <div className="petals-hint">
          <span className="muted">Hint</span>
          <Meaning en={card.en} ro={card.ro} />
        </div>
      </div>
      <div className="slots" lang="hu" aria-label="Word to guess">
        {[...target].map((ch, k) => (
          <span key={k} className={"slot" + (guessed.includes(ch) || lost ? " shown" : "") + (lost && !guessed.includes(ch) ? " missed" : "")}>
            {guessed.includes(ch) || lost ? ch : ""}
          </span>
        ))}
      </div>
      {won || lost ? (
        <div className="stack">
          <p className={won ? "ok-text" : "warn-text"}>
            {won ? "Megvan! Got it!" : "The flower lost its petals."} The word is <strong lang="hu">{card.hu}</strong>{" "}
            <SpeakButton text={card.hu} small />
          </p>
          <button
            className="btn primary block"
            onClick={() => {
              setGuessed([]);
              setI((n) => n + 1);
            }}
          >
            {i + 1 < words.length ? "Next word" : "See results"}
          </button>
        </div>
      ) : (
        <div className="keyboard" role="group" aria-label="Letters">
          {ALPHABET.map((ch) => {
            const used = guessed.includes(ch);
            return (
              <button
                key={ch}
                className={"key" + (used ? (target.includes(ch) ? " hit" : " miss") : "")}
                disabled={used}
                onClick={() => {
                  sfx("tap");
                  setGuessed([...guessed, ch]);
                }}
              >
                {ch}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Vowel harmony sort ---------- */

function HarmonySort() {
  const [round, setRound] = useState(0);
  return <HarmonyRun key={round} onAgain={() => setRound((r) => r + 1)} />;
}

function HarmonyRun({ onAgain }: { onAgain: () => void }) {
  const pool = useGamePool();
  const words = useMemo(
    () =>
      shuffle(
        pool
          .filter((c) => c.kind === "word" && !/[\s.!?-]/.test(c.hu))
          .map((c) => ({ c, t: classify(c.hu).type }))
          .filter((x) => x.t)
      ),
    [pool]
  );
  const [phase, setPhase] = useState<"ready" | "play" | "end">("ready");
  const [left, setLeft] = useState(45);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const { combo, hit } = useCombo();

  useEffect(() => {
    if (phase !== "play") return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (phase === "play" && left <= 0) {
      setPhase("end");
      recordGame("harmony", score, 5 + score * 2);
      if (score >= 15) confetti();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  if (words.length < 5) return <Empty>Not enough words yet.</Empty>;
  const cur = words[i % words.length];
  const pick = (t: string) => {
    if (flash) return;
    const ok = t === cur.t;
    sfx(ok ? "good" : "bad");
    hit(ok, 1);
    if (ok) setScore((s) => s + 1);
    setFlash(ok ? "ok" : `no:${cur.t}`);
    setTimeout(() => {
      setFlash(null);
      setI((n) => n + 1);
    }, ok ? 200 : 900);
  };

  if (phase === "ready")
    return (
      <div className="stack-lg">
        <PageHead title="Mély vagy magas?" sub="Vowel harmony sort · 45 seconds" back={href("practice")} />
        <MascotSays mood="happy">
          <strong>Hangrend!</strong>
          <span>
            Look at the vowels. Only a á o ó u ú → <b>mély</b>. Only e é i í ö ő ü ű → <b>magas</b>. Both kinds → <b>vegyes</b>.
          </span>
        </MascotSays>
        <button className="btn primary block big" onClick={() => setPhase("play")}>
          Start
        </button>
      </div>
    );
  if (phase === "end")
    return (
      <EndScreen
        title="Mély vagy magas?"
        big={String(score)}
        line={`${score} words sorted in 45 seconds.`}
        mood={score >= 15 ? "party" : score >= 8 ? "happy" : "neutral"}
        onAgain={onAgain}
      />
    );
  return (
    <div className="stack session">
      <div className="session-top">
        <span className={"timer" + (left <= 10 ? " low" : "")}>{left}s</span>
        <div className="bar">
          <i style={{ width: `${(left / 45) * 100}%` }} />
        </div>
        <span className="tabnum strong">{score}</span>
      </div>
      <ComboBadge combo={combo} />
      <div className={"speed-card" + (flash ? (flash === "ok" ? " ok" : " no") : "")}>
        <span className="prompt-word" lang="hu">
          {cur.c.hu}
        </span>
        {flash?.startsWith("no:") && <span className="muted">→ {flash.slice(3)}</span>}
      </div>
      <div className="sort-btns">
        {(["mély", "vegyes", "magas"] as const).map((t) => (
          <button key={t} className={"sort-btn " + t} onClick={() => pick(t)}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Listening bingo ---------- */

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function Bingo() {
  const [round, setRound] = useState(0);
  return <BingoRun key={round} onAgain={() => setRound((r) => r + 1)} />;
}

function BingoRun({ onAgain }: { onAgain: () => void }) {
  const pool = useGamePool();
  const [grid] = useState(() => {
    const seen = new Set<string>();
    return shuffle(pool)
      .filter((c) => c.kind === "word" && c.hu.length <= 14 && !seen.has(c.hu) && seen.add(c.hu))
      .slice(0, 9);
  });
  const [calls] = useState(() => shuffle(grid.map((_, k) => k)));
  const [ci, setCi] = useState(0);
  const [marked, setMarked] = useState<number[]>([]);
  const [wrong, setWrong] = useState(0);
  const [reveal, setReveal] = useState(false);
  const voice = canSpeak() && hasHungarianVoice();
  const bingo = LINES.some((l) => l.every((k) => marked.includes(k)));
  const call = grid[calls[ci]];

  useEffect(() => {
    if (call && !bingo) {
      const t = setTimeout(() => speak(call.hu), 300);
      return () => clearTimeout(t);
    }
  }, [ci, bingo, call]);

  useEffect(() => {
    if (!bingo) return;
    sfx("win");
    confetti();
    recordGame("bingo", Math.max(1, 10 - wrong), 10 + Math.max(0, 6 - wrong) * 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bingo]);

  if (grid.length < 9) return <Empty>Not enough words yet.</Empty>;
  if (bingo)
    return (
      <EndScreen
        title="Bingó!"
        big="BINGÓ"
        line={`Three in a row after ${marked.length} calls${wrong ? ` and ${wrong} wrong tap${wrong > 1 ? "s" : ""}` : ", with no mistakes"}.`}
        mood={wrong === 0 ? "party" : "happy"}
        onAgain={onAgain}
      />
    );

  const tap = (k: number) => {
    if (marked.includes(k)) return;
    if (k === calls[ci]) {
      sfx("good");
      bump("correct");
      setMarked([...marked, k]);
      setCi((n) => n + 1);
      setReveal(false);
    } else {
      sfx("bad");
      setWrong((w) => w + 1);
    }
  };

  return (
    <div className="stack session">
      <PageHead title="Hallás-bingó" sub="Listening bingo" back={href("practice")} />
      <div className="bingo-call">
        <button className="listen-btn" onClick={() => call && speak(call.hu)} aria-label="Hear the word again">
          <Icon name="speaker" size={30} />
        </button>
        <div>
          <span>Which word did you hear?</span>
          <button className="linkish" onClick={() => call && speak(call.hu, 0.6)}>
            Play slowly
          </button>
          {(!voice || reveal) && call && (
            <span className="warn-text small-print">
              {reveal ? (
                <strong lang="hu">{call.hu}</strong>
              ) : (
                <>
                  No Hungarian voice on this device.{" "}
                  <button className="linkish" onClick={() => setReveal(true)}>
                    Show the word
                  </button>
                </>
              )}
            </span>
          )}
        </div>
      </div>
      <div className="bingo-grid">
        {grid.map((c, k) => (
          <button key={c.id} className={"bingo-cell" + (marked.includes(k) ? " on" : "")} onClick={() => tap(k)} lang="hu">
            <span>{c.hu}</span>
            {marked.includes(k) && <small>{c.en}</small>}
          </button>
        ))}
      </div>
      <p className="muted small-print center">Wrong taps: {wrong}</p>
    </div>
  );
}
