/** Számok: a numbers trainer from nulla to egybillió: listening, writing, building, prices, years, time, facts and the ladder. */
import { useEffect, useMemo, useRef, useState } from "react";
import { MascotSays } from "../components/Mascot";
import { Icon, PageHead } from "../components/ui";
import { check, shuffle } from "../lib/answer";
import { confetti } from "../lib/celebrate";
import { acceptedForms, confusables, randomNumber, sameNumberWords, timeForms, toHungarian, toTokens } from "../lib/numbers";
import { Buddy } from "../components/Mascot";
import { go, href } from "../lib/router";
import { sfx } from "../lib/sound";
import { canSpeak, speak } from "../lib/speech";
import { addXp, bump, update, useProgress } from "../lib/store";

type Mode = "listen" | "write" | "build" | "prices" | "years" | "time" | "facts";
const MODES: { id: Mode; hu: string; en: string; icon: string }[] = [
  { id: "listen", hu: "Hallás", en: "Hear it, type the digits", icon: "speaker" },
  { id: "write", hu: "Írás", en: "See digits, write the word", icon: "pencil" },
  { id: "build", hu: "Építő", en: "Build the number from word tiles", icon: "cards" },
  { id: "facts", hu: "Nagy számok", en: "Read giant numbers from real facts", icon: "globe" },
  { id: "prices", hu: "Árak", en: "Prices in forint", icon: "bag" },
  { id: "years", hu: "Évszámok", en: "Years", icon: "hash" },
  { id: "time", hu: "Idő", en: "What time is it?", icon: "clock" },
];
const RANGES = [
  { id: "20", max: 20, label: "0–20" },
  { id: "100", max: 100, label: "0–100" },
  { id: "1000", max: 1000, label: "0–1000" },
  { id: "9999", max: 9999, label: "9999" },
  { id: "m", max: 1e6, label: "millió" },
  { id: "md", max: 1e9, label: "milliárd" },
  { id: "b", max: 1e12, label: "billió" },
];
const ROUND = 10;
const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

interface Q {
  prompt: string;
  /** play the audio first and hide the digits */
  listen?: boolean;
  sub?: string;
  say?: string;
  /** typed answers */
  typed?: { accept: string[]; digits?: boolean; show: string };
  /** word tiles to put in order */
  build?: { tokens: string[]; tiles: string[]; show: string };
  /** multiple choice */
  options?: string[];
  answer?: string;
  explain?: string;
}

const fmtN = (n: number) => n.toLocaleString("hu-HU");
const DECOYS = ["két", "kettő", "tizen", "huszon", "száz", "ezer", "millió", "milliárd", "billió", "egy", "öt", "hat", "hét", "negyven", "hetven"];

export function buildQ(n: number): Q {
  const tokens = toTokens(n).filter((t) => t !== "-");
  const decoys = shuffle(DECOYS.filter((d) => !tokens.includes(d))).slice(0, 2);
  return {
    prompt: fmtN(n),
    sub: "Tap the tiles in order",
    say: toHungarian(n),
    build: { tokens, tiles: shuffle([...tokens, ...decoys]), show: toHungarian(n) },
  };
}

/** A number whose word form is short enough to build from tiles. */
function buildable(max: number) {
  for (let i = 0; i < 40; i++) {
    const n = randomNumber(max);
    const k = toTokens(n).filter((t) => t !== "-").length;
    if (k >= 2 && k <= 9) return n;
  }
  return rnd(11, 99);
}

export function chooseWordQ(n: number, sub = "Which is it in Hungarian?"): Q {
  const opts = shuffle([n, ...confusables(n, 3)]).map((v) => toHungarian(v));
  return { prompt: fmtN(n), sub, say: toHungarian(n), options: opts, answer: toHungarian(n) };
}

export function hearDigitsQ(n: number): Q {
  return { prompt: "Which number do you hear?", listen: true, say: toHungarian(n), options: shuffle([n, ...confusables(n, 3)]).map(fmtN), answer: fmtN(n), explain: toHungarian(n) };
}

/** Real numbers for "Nagy számok", rounded the way people say them. */
const FACTS: { n: number; hu: string; en: string; ro: string }[] = [
  { n: 1_700_000, hu: "Budapesten kb. … ember él.", en: "About this many people live in Budapest.", ro: "Atâția oameni trăiesc aproximativ în Budapesta." },
  { n: 9_600_000, hu: "Magyarországon kb. … ember él.", en: "About this many people live in Hungary.", ro: "Atâția oameni trăiesc aproximativ în Ungaria." },
  { n: 19_000_000, hu: "Romániában kb. … ember él.", en: "About this many people live in Romania.", ro: "Atâția oameni trăiesc aproximativ în România." },
  { n: 8_000_000_000, hu: "A Földön kb. … ember él.", en: "About this many people live on Earth.", ro: "Atâția oameni trăiesc aproximativ pe Pământ." },
  { n: 384_400, hu: "A Hold kb. … kilométerre van.", en: "The Moon is about this many km away.", ro: "Luna este la aproximativ atâția km." },
  { n: 150_000_000, hu: "A Nap kb. … kilométerre van.", en: "The Sun is about this many km away.", ro: "Soarele este la aproximativ atâția km." },
  { n: 300_000, hu: "A fény másodpercenként kb. … kilométert tesz meg.", en: "Light travels about this many km per second.", ro: "Lumina parcurge aproximativ atâția km pe secundă." },
  { n: 2850, hu: "A Duna kb. … kilométer hosszú.", en: "The Danube is about this many km long.", ro: "Dunărea are aproximativ atâția km lungime." },
  { n: 8849, hu: "A Mount Everest … méter magas.", en: "Mount Everest is this many metres high.", ro: "Muntele Everest are atâția metri înălțime." },
  { n: 86_000_000_000, hu: "Az emberi agyban kb. … idegsejt van.", en: "The human brain has about this many nerve cells.", ro: "Creierul uman are aproximativ atâtea neuroni." },
  { n: 100_000, hu: "A szívünk naponta kb. …-et dobban.", en: "Our heart beats about this many times a day.", ro: "Inima bate de aproximativ atâtea ori pe zi." },
  { n: 594, hu: "A Balaton … négyzetkilométer.", en: "Lake Balaton covers this many square km.", ro: "Balatonul are atâția kilometri pătrați." },
  { n: 1_000_000_000_000, hu: "Ez egy egyes és tizenkét nulla.", en: "A one with twelve zeros: English says trillion, Hungarian (and Romanian) say billió / bilion.", ro: "Un unu cu douăsprezece zerouri: bilion." },
  { n: 1_000_000_000, hu: "Ez egy egyes és kilenc nulla.", en: "A one with nine zeros: English says billion, Hungarian says milliárd (Romanian: miliard).", ro: "Un unu cu nouă zerouri: miliard." },
];

function factQ(): Q {
  const f = FACTS[rnd(0, FACTS.length - 1)];
  const q = chooseWordQ(f.n, f.hu);
  return { ...q, explain: `${f.en} RO: ${f.ro}` };
}

function makeQ(mode: Mode, max: number): Q {
  if (mode === "build") return buildQ(buildable(max));
  if (mode === "facts") return factQ();
  if (mode === "listen") {
    const n = randomNumber(max);
    return { prompt: "Type the number you hear", listen: true, say: toHungarian(n), typed: { accept: [String(n)], digits: true, show: `${fmtN(n)} · ${toHungarian(n)}` } };
  }
  if (mode === "write") {
    const n = randomNumber(max);
    return { prompt: fmtN(n), sub: "Write it in Hungarian", say: toHungarian(n), typed: { accept: acceptedForms(n), show: toHungarian(n) } };
  }
  if (mode === "prices") {
    const base = [rnd(1, 9) * 10 + 0, rnd(10, 99) * 10, rnd(100, 999) * 10, rnd(1, 30) * 100 + [0, 50, 90][rnd(0, 2)]][rnd(0, 3)];
    const fakes = new Set<number>();
    while (fakes.size < 3) {
      const f = Math.max(10, base + [10, -10, 100, -100, 50, 1000, -1000, 90][rnd(0, 7)]);
      if (f !== base) fakes.add(f);
    }
    const fmt = (v: number) => `${v.toLocaleString("hu-HU")} Ft`;
    return {
      prompt: "Mennyibe kerül? How much is it?",
      listen: true,
      say: `${toHungarian(base, true)} forint`,
      options: shuffle([fmt(base), ...[...fakes].map(fmt)]),
      answer: fmt(base),
      explain: `${toHungarian(base, true)} forint`,
    };
  }
  if (mode === "years") {
    const y = [rnd(1000, 1899), rnd(1900, 1999), rnd(2000, 2030)][rnd(0, 2)];
    const near = new Set<number>();
    while (near.size < 3) {
      const f = y + [1, -1, 10, -10, 100, -100, 11, 9][rnd(0, 7)];
      if (f !== y && f > 999) near.add(f);
    }
    return {
      prompt: String(y),
      sub: "Which is this year?",
      say: toHungarian(y),
      options: shuffle([toHungarian(y), ...[...near].map((v) => toHungarian(v))]),
      answer: toHungarian(y),
      explain: y > 2000 ? "Above 2000 a hyphen separates the thousands." : "Years up to 2000 are one long word.",
    };
  }
  const h = rnd(1, 12);
  const m = [0, 5, 10, 15, 20, 30, 40, 45, 50][rnd(0, 8)];
  const t = timeForms(h, m);
  const others = new Set<string>();
  while (others.size < 3) {
    const oh = rnd(1, 12);
    const om = [0, 5, 10, 15, 20, 30, 40, 45, 50][rnd(0, 8)];
    const f = timeForms(oh, om).simple;
    if (f !== t.simple) others.add(f);
  }
  return {
    prompt: `${h}:${String(m).padStart(2, "0")}`,
    sub: "Hány óra van? What time is it?",
    say: t.simple,
    options: shuffle([t.simple, ...others]),
    answer: t.simple,
    explain: t.everyday ? `Everyday Hungarian also says: ${t.everyday}.` : undefined,
  };
}

let lastRange = RANGES[1];

export function NumbersPage({ mode: routeMode }: { mode?: string }) {
  return routeMode === "ladder" ? <Ladder /> : <NumbersHome routeMode={routeMode} />;
}

function NumbersHome({ routeMode }: { routeMode?: string }) {
  const p = useProgress();
  const mode = MODES.find((m) => m.id === routeMode)?.id ?? null;
  const [range, setRangeState] = useState(lastRange);
  const setRange = (r: (typeof RANGES)[number]) => setRangeState((lastRange = r));
  const [run, setRun] = useState(0);
  const setMode = (m: Mode | null) => go(m ? `numbers/${m}` : "numbers");
  if (mode)
    return (
      <NumberRun
        key={`${mode}-${run}`}
        mode={mode}
        max={range.max}
        onExit={() => setMode(null)}
        onAgain={() => setRun((r) => r + 1)}
      />
    );
  const best = p.games["numbers"]?.best;
  return (
    <div className="stack-lg">
      <PageHead title="Számok" sub="Numbers from nulla to egybillió" back={href("practice")} />
      <a className="ladder-cta" href={href("numbers/ladder")}>
        <span className="lc-steps" aria-hidden="true">
          {Array.from({ length: 10 }, (_, k) => (
            <i key={k} className={k < (p.games["ladder"]?.best ?? 0) ? "on" : ""} />
          ))}
        </span>
        <span className="lc-body">
          <span className="cta-kicker">Számlétra · The number ladder</span>
          <strong>
            {(p.games["ladder"]?.best ?? 0) >= 10 ? "You're the számkirály!" : `Rung ${(p.games["ladder"]?.best ?? 0) + 1} of 10: climb to egybillió`}
          </strong>
        </span>
        <Icon name="next" />
      </a>
      <section className="panel stack">
        <h2 className="section-title">How high?</h2>
        <div className="seg" role="tablist">
          {RANGES.map((r) => (
            <button key={r.id} role="tab" aria-selected={range.id === r.id} onClick={() => setRange(r)}>
              {r.label}
            </button>
          ))}
        </div>
        <span className="muted small-print">Used by Hallás, Írás and Építő. milliárd = English billion (10⁹), billió = English trillion (10¹²).</span>
      </section>
      <div className="mode-grid">
        {MODES.map((m) => (
          <button key={m.id} className="mode-card" onClick={() => setMode(m.id)} disabled={(m.id === "listen" || m.id === "prices") && !canSpeak()}>
            <span className="mode-icon">
              <Icon name={m.icon} size={22} />
            </span>
            <strong>{m.hu}</strong>
            <span className="muted small-print">{m.en}</span>
          </button>
        ))}
      </div>
      {best !== undefined && <p className="muted small-print">Best round so far: {best}/{ROUND}.</p>}
      <CheatSheet />
    </div>
  );
}

function NumberRun({
  mode,
  max,
  onExit,
  onAgain,
  questions,
  title,
  onFinish,
}: {
  mode: Mode;
  max: number;
  onExit: () => void;
  onAgain: () => void;
  /** a fixed set of questions (the ladder) instead of a random round */
  questions?: Q[];
  title?: string;
  onFinish?: (score: number, total: number) => void;
}) {
  const qs = useMemo(() => questions ?? Array.from({ length: ROUND }, () => makeQ(mode, max)), [mode, max, questions]);
  const total = qs.length;
  const [i, setI] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<null | { ok: boolean; accent?: boolean; picked?: string }>(null);
  const [score, setScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = qs[i];
  const done = i >= qs.length;
  const modeInfo = MODES.find((m) => m.id === mode);

  useEffect(() => {
    if (done || !q.say) return;
    if (q.listen) speak(q.say);
    inputRef.current?.focus();
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!done) return;
    if (onFinish) {
      onFinish(score, total);
      return;
    }
    bump("game");
    update((d) => {
      const g = (d.games["numbers"] ??= { plays: 0, best: 0 });
      g.plays++;
      g.best = Math.max(g.best, score);
    });
    if (score >= 8) {
      confetti();
      sfx("win");
    }
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const heading = title ?? `Számok · ${modeInfo?.hu ?? ""}`;
  if (done && onFinish) return null;
  if (done)
    return (
      <div className="stack-lg">
        <PageHead title={heading} back={href("numbers")} />
        <MascotSays mood={score >= 8 ? "party" : score >= 5 ? "happy" : "sad"}>
          <strong>
            {score}/{total} right
          </strong>
          <span>{score >= 8 ? "Szuper! Numbers are tough in every language." : "Numbers take practice. Go again and it'll stick."}</span>
        </MascotSays>
        <div className="row gap">
          <button className="btn primary" onClick={onAgain}>
            Play again
          </button>
          <button className="btn" onClick={onExit}>
            Other modes
          </button>
        </div>
      </div>
    );

  const finish = (ok: boolean, extra: Partial<NonNullable<typeof result>> = {}) => {
    setResult({ ok, ...extra });
    sfx(ok ? "good" : "bad");
    if (ok) {
      setScore((s) => s + 1);
      bump("correct");
      addXp(2);
    }
    if (q.say && !q.listen) speak(q.say);
  };

  const submit = () => {
    if (!q.typed || result) return;
    if (q.typed.digits) {
      finish(input.replace(/\D/g, "") === q.typed.accept[0]);
      return;
    }
    if (q.typed.accept.some((a) => sameNumberWords(a, input.trim()))) {
      finish(true);
      return;
    }
    const v = check(input.replace(/-/g, ""), q.typed.accept.map((a) => a.replace(/-/g, "")));
    finish(v !== "wrong", { accent: v === "accent" });
  };

  const next = () => {
    setResult(null);
    setInput("");
    setI(i + 1);
  };

  return (
    <div className="stack-lg">
      <PageHead title={heading} sub={title ? `Question ${i + 1} of ${total}` : modeInfo?.en} back={href(title ? "numbers/ladder" : "numbers")} />
      <div className="bar">
        <i style={{ width: `${(i / total) * 100}%` }} />
      </div>
      <section className="panel stack center num-q">
        {q.listen ? (
          <>
            <span className="muted">{q.prompt}</span>
            <button className="btn big-listen" onClick={() => q.say && speak(q.say)} aria-label="Play again">
              <Icon name="speaker" size={32} />
            </button>
            <button className="linkish small-print" onClick={() => q.say && speak(q.say, 0.6)}>
              Slower
            </button>
          </>
        ) : (
          <>
            <span className={"num-big tabnum" + (mode === "time" ? " clock" : "") + (q.prompt.length > 9 ? " long" : "")}>{q.prompt}</span>
            {q.sub && <span className="muted">{q.sub}</span>}
          </>
        )}
      </section>

      {q.build ? (
        <TileBuilder key={i} q={q} onResult={(ok) => finish(ok)} done={!!result} onNext={next} last={i + 1 >= total} />
      ) : q.typed ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (result) next();
            else submit();
          }}
        >
          <input
            ref={inputRef}
            id="num-input"
            className={"type-input" + (result ? (result.ok ? " correct" : " wrong") : "")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            inputMode={q.typed.digits ? "numeric" : "text"}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={q.typed.digits ? "e.g. 42" : "e.g. negyvenkettő"}
            readOnly={!!result}
            aria-label="Your answer"
          />
          {result && (
            <p className={result.ok ? "ok-text" : "warn-text"}>
              {result.ok ? (result.accent ? "Right, but watch the accents: " : "Helyes! ") : "Not quite. It's "}
              <strong lang="hu">{q.typed.show}</strong>
            </p>
          )}
          <button className="btn primary" disabled={!result && !input.trim()}>
            {result ? (i + 1 >= total ? "See my score" : "Next") : "Check"}
          </button>
        </form>
      ) : (
        <div className="stack">
          <div className="options">
            {q.options!.map((o) => (
              <button
                key={o}
                lang="hu"
                className={"option" + (result ? (o === q.answer ? " right" : o === result.picked ? " wrong" : "") : "")}
                disabled={!!result}
                onClick={() => finish(o === q.answer, { picked: o })}
              >
                {o}
              </button>
            ))}
          </div>
          {result && (
            <>
              {q.explain && <p className="muted small-print">{q.explain}</p>}
              <button className="btn primary" onClick={next}>
                {i + 1 >= total ? "See my score" : "Next"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Számlétra: the number ladder ---------------- */

const RUNGS: { hu: string; en: string; gen: () => number; price?: boolean }[] = [
  { hu: "Egy, kettő, három", en: "0 to 10", gen: () => rnd(0, 10) },
  { hu: "Tizen-, huszon-", en: "11 to 29", gen: () => rnd(11, 29) },
  { hu: "Tízesek", en: "30 to 99", gen: () => rnd(30, 99) },
  { hu: "Száz", en: "100 to 999", gen: () => rnd(100, 999) },
  { hu: "Évszámok", en: "Years", gen: () => rnd(1000, 2030) },
  { hu: "Ezer", en: "Thousands", gen: () => randomNumber(99_999) },
  { hu: "Forint", en: "Prices", gen: () => rnd(10, 2500) * 10, price: true },
  { hu: "Millió", en: "Millions", gen: () => rnd(1, 999) * 1e6 + (Math.random() < 0.5 ? 0 : rnd(1, 99) * 1e4) },
  { hu: "Milliárd", en: "Billions (10⁹)", gen: () => rnd(1, 999) * 1e9 + (Math.random() < 0.5 ? 0 : rnd(1, 999) * 1e6) },
  { hu: "Billió", en: "Trillions (10¹²)", gen: () => [1e12, rnd(100, 999) * 1e9, 1e12][rnd(0, 2)] },
];
const RUNG_QS = 5;
const RUNG_PASS = 4;

function rungQuestions(k: number): Q[] {
  const r = RUNGS[k];
  return Array.from({ length: RUNG_QS }, (_, i) => {
    const n = r.gen();
    const kind = i % 3;
    if (kind === 0 && canSpeak()) return hearDigitsQ(n);
    if (kind === 1 && toTokens(n).filter((t) => t !== "-").length <= 10) return buildQ(n);
    const q = chooseWordQ(n);
    return r.price ? { ...q, prompt: `${fmtN(n)} Ft`, sub: "Mennyibe kerül?" } : q;
  });
}

function Ladder() {
  const p = useProgress();
  const cleared = p.games["ladder"]?.best ?? 0;
  const [rung, setRung] = useState<number | null>(null);
  const [result, setResult] = useState<{ rung: number; score: number } | null>(null);
  const qs = useMemo(() => (rung === null ? [] : rungQuestions(rung)), [rung]);

  if (rung !== null)
    return (
      <NumberRun
        key={rung}
        mode="write"
        max={0}
        questions={qs}
        title={`Számlétra · ${RUNGS[rung].hu}`}
        onExit={() => setRung(null)}
        onAgain={() => setRung(rung)}
        onFinish={(score) => {
          const passed = score >= RUNG_PASS;
          bump("game");
          update((d) => {
            const g = (d.games["ladder"] ??= { plays: 0, best: 0 });
            g.plays++;
            if (passed) g.best = Math.max(g.best, rung + 1);
          });
          if (passed) {
            confetti();
            sfx("win");
            addXp(10 + rung * 2);
          }
          setResult({ rung, score });
          setRung(null);
        }}
      />
    );

  return (
    <div className="stack-lg">
      <PageHead title="Számlétra" sub="The number ladder · from nulla to egybillió" back={href("numbers")} />
      {result && (
        <MascotSays mood={result.score >= RUNG_PASS ? "party" : "sad"}>
          <strong>
            {result.score}/{RUNG_QS} · {result.score >= RUNG_PASS ? `${RUNGS[result.rung].hu}: kész!` : "Majdnem!"}
          </strong>
          <span>
            {result.score >= RUNG_PASS
              ? result.rung === RUNGS.length - 1
                ? "You reached the top: egybillió! Te vagy a számkirály."
                : "Up you go: the next rung is open."
              : `Get ${RUNG_PASS} of ${RUNG_QS} to climb. Try that rung again.`}
          </span>
        </MascotSays>
      )}
      <ol className="ladder" aria-label="Ladder rungs, top is hardest">
        {RUNGS.map((r, k) => ({ r, k }))
          .reverse()
          .map(({ r, k }) => {
            const state = k < cleared ? "done" : k === cleared ? "next" : "locked";
            return (
              <li key={k} className={"rung " + state}>
                <button className="rung-btn" disabled={state === "locked"} onClick={() => setRung(k)}>
                  <span className="rung-num tabnum">{k + 1}</span>
                  <span className="rung-text">
                    <strong lang="hu">{r.hu}</strong>
                    <span className="muted small-print">{r.en}</span>
                  </span>
                  {state === "done" ? <Icon name="check" size={18} /> : state === "locked" ? <Icon name="lock" size={16} /> : <Icon name="play" size={16} />}
                </button>
                {state === "next" && (
                  <span className="rung-buddy" aria-hidden="true">
                    <Buddy mood="happy" size={56} />
                  </span>
                )}
              </li>
            );
          })}
      </ol>
      <p className="muted small-print">
        Each rung has {RUNG_QS} questions: hear it, build it from tiles, or pick the right words. Get {RUNG_PASS} right to climb.
      </p>
    </div>
  );
}

/** Tap word tiles in order to build a number. */
export function TileBuilder({
  q,
  onResult,
  done,
  onNext,
  last,
}: {
  q: Q;
  onResult: (ok: boolean) => void;
  done: boolean;
  onNext: () => void;
  last: boolean;
}) {
  const b = q.build!;
  const [picked, setPicked] = useState<number[]>([]);
  const [ok, setOk] = useState<boolean | null>(null);
  const built = picked.map((k) => b.tiles[k]);
  const tap = (k: number) => {
    if (done || picked.includes(k)) return;
    const next = [...picked, k];
    setPicked(next);
    sfx("tap");
    if (next.length === b.tokens.length) {
      const good = next.map((x) => b.tiles[x]).join("") === b.tokens.join("");
      setOk(good);
      onResult(good);
    }
  };
  return (
    <div className="stack">
      <div className={"build-line" + (ok === null ? "" : ok ? " right" : " wrong")} aria-live="polite">
        {built.length ? (
          built.map((t, k) => (
            <span key={k} className="build-piece" lang="hu">
              {t}
            </span>
          ))
        ) : (
          <span className="muted small-print">Your number appears here…</span>
        )}
      </div>
      {ok === false && (
        <p className="warn-text">
          Not quite. It's <strong lang="hu">{b.show}</strong>
        </p>
      )}
      {ok && (
        <p className="ok-text">
          Helyes! <strong lang="hu">{b.show}</strong>
        </p>
      )}
      <div className="tile-bank">
        {b.tiles.map((t, k) => (
          <button key={k} className={"num-tile" + (picked.includes(k) ? " used" : "")} disabled={done || picked.includes(k)} onClick={() => tap(k)} lang="hu">
            {t}
          </button>
        ))}
      </div>
      {!done ? (
        <div className="row gap">
          <button className="btn small" disabled={!picked.length} onClick={() => setPicked(picked.slice(0, -1))}>
            Undo
          </button>
          <button className="btn small" disabled={!picked.length} onClick={() => setPicked([])}>
            Clear
          </button>
        </div>
      ) : (
        <button className="btn primary" onClick={onNext}>
          {last ? "See my score" : "Next"}
        </button>
      )}
    </div>
  );
}

function CheatSheet() {
  const [open, setOpen] = useState(false);
  const rows: [number, string][] = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20, 21, 22, 30, 40, 50, 60, 70, 80, 90, 100, 200, 1000, 2000, 2026, 10_000, 100_000, 1_000_000, 2_500_000,
    1_000_000_000, 1_000_000_000_000,
  ].map((n) => [
    n,
    toHungarian(n),
  ]);
  return (
    <section className="panel stack">
      <button className="row between linkish" onClick={() => setOpen(!open)} aria-expanded={open}>
        <h2 className="section-title">Puska · Cheat sheet</h2>
        <Icon name={open ? "x" : "plus"} size={18} />
      </button>
      {open && (
        <>
          <ul className="num-table">
            {rows.map(([n, w]) => (
              <li key={n}>
                <span className="tabnum">{n.toLocaleString("hu-HU")}</span>
                <span lang="hu">{w}</span>
              </li>
            ))}
          </ul>
          <ul className="rule-list small-print">
            <li>
              <strong>2 = kettő or két.</strong> On its own: <em>kettő</em> (tizenkettő). In front of a noun or száz/ezer: <em>két</em> (két kávé,
              kétszáz).
            </li>
            <li>
              <strong>10 and 20 change:</strong> tíz → tizen- (tizenegy), húsz → huszon- (huszonegy).
            </li>
            <li>
              <strong>One word:</strong> numbers are written together, like ezerkilencszázötvenhat (1956). Above 2000, a hyphen splits the thousands:
              kétezer-huszonhat.
            </li>
            <li>
              <strong>Big ones:</strong> ezer (10³), millió (10⁶), <em>milliárd</em> (10⁹, English “billion”), <em>billió</em> (10¹², English “trillion”).
              Romanian works the same way: miliard, bilion.
            </li>
            <li>
              <strong>Hyphens above 2000</strong> go after each ezer / millió / milliárd when more follows: kétmillió-ötszázezer-tizenkettő.
            </li>
            <li>
              <strong>Nouns stay singular after numbers:</strong> három alma (three apples), not "almák".
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
