/** Számok: a numbers trainer for listening, writing, prices, years and clock times. */
import { useEffect, useMemo, useRef, useState } from "react";
import { MascotSays } from "../components/Mascot";
import { Icon, PageHead } from "../components/ui";
import { check, shuffle } from "../lib/answer";
import { confetti } from "../lib/celebrate";
import { acceptedForms, timeForms, toHungarian } from "../lib/numbers";
import { go, href } from "../lib/router";
import { sfx } from "../lib/sound";
import { canSpeak, speak } from "../lib/speech";
import { addXp, bump, update, useProgress } from "../lib/store";

type Mode = "listen" | "write" | "prices" | "years" | "time";
const MODES: { id: Mode; hu: string; en: string; icon: string }[] = [
  { id: "listen", hu: "Hallás", en: "Hear it, type the digits", icon: "speaker" },
  { id: "write", hu: "Írás", en: "See digits, write the word", icon: "pencil" },
  { id: "prices", hu: "Árak", en: "Prices in forint", icon: "bag" },
  { id: "years", hu: "Évszámok", en: "Years", icon: "hash" },
  { id: "time", hu: "Idő", en: "What time is it?", icon: "clock" },
];
const RANGES = [
  { id: "20", max: 20, label: "0–20" },
  { id: "100", max: 100, label: "0–100" },
  { id: "1000", max: 1000, label: "0–1000" },
  { id: "9999", max: 9999, label: "up to 9999" },
];
const ROUND = 10;
const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

interface Q {
  prompt: string;
  sub?: string;
  say?: string;
  /** typed answers */
  typed?: { accept: string[]; digits?: boolean; show: string };
  /** multiple choice */
  options?: string[];
  answer?: string;
  explain?: string;
}

function makeQ(mode: Mode, max: number): Q {
  if (mode === "listen") {
    const n = rnd(0, max);
    return { prompt: "Type the number you hear", say: toHungarian(n), typed: { accept: [String(n)], digits: true, show: `${n} · ${toHungarian(n)}` } };
  }
  if (mode === "write") {
    const n = rnd(0, max);
    return { prompt: n.toLocaleString("hu-HU"), sub: "Write it in Hungarian", say: toHungarian(n), typed: { accept: acceptedForms(n), show: toHungarian(n) } };
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
      <PageHead title="Számok" sub="Numbers trainer · prices, years and the time" back={href("practice")} />
      <section className="panel stack">
        <h2 className="section-title">How high?</h2>
        <div className="seg" role="tablist">
          {RANGES.map((r) => (
            <button key={r.id} role="tab" aria-selected={range.id === r.id} onClick={() => setRange(r)}>
              {r.label}
            </button>
          ))}
        </div>
        <span className="muted small-print">Used by "Hallás" and "Írás". Prices, years and times pick their own numbers.</span>
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

function NumberRun({ mode, max, onExit, onAgain }: { mode: Mode; max: number; onExit: () => void; onAgain: () => void }) {
  const qs = useMemo(() => Array.from({ length: ROUND }, () => makeQ(mode, max)), [mode, max]);
  const [i, setI] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<null | { ok: boolean; accent?: boolean; picked?: string }>(null);
  const [score, setScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = qs[i];
  const done = i >= qs.length;
  const modeInfo = MODES.find((m) => m.id === mode)!;

  useEffect(() => {
    if (done || !q.say) return;
    if (mode === "listen" || mode === "prices") speak(q.say);
    inputRef.current?.focus();
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!done) return;
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

  if (done)
    return (
      <div className="stack-lg">
        <PageHead title={`Számok · ${modeInfo.hu}`} back={href("numbers")} />
        <MascotSays mood={score >= 8 ? "party" : score >= 5 ? "happy" : "sad"}>
          <strong>
            {score}/{ROUND} right
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
    if (q.say && mode !== "listen" && mode !== "prices") speak(q.say);
  };

  const submit = () => {
    if (!q.typed || result) return;
    if (q.typed.digits) {
      finish(input.replace(/\D/g, "") === q.typed.accept[0]);
      return;
    }
    const v = check(input, q.typed.accept);
    finish(v !== "wrong", { accent: v === "accent" });
  };

  const next = () => {
    setResult(null);
    setInput("");
    setI(i + 1);
  };

  return (
    <div className="stack-lg">
      <PageHead title={`Számok · ${modeInfo.hu}`} sub={modeInfo.en} back={href("numbers")} />
      <div className="bar">
        <i style={{ width: `${(i / ROUND) * 100}%` }} />
      </div>
      <section className="panel stack center num-q">
        {mode === "listen" || mode === "prices" ? (
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
            <span className={"num-big tabnum" + (mode === "time" ? " clock" : "")}>{q.prompt}</span>
            {q.sub && <span className="muted">{q.sub}</span>}
          </>
        )}
      </section>

      {q.typed ? (
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
            {result ? (i + 1 >= ROUND ? "See my score" : "Next") : "Check"}
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
                {i + 1 >= ROUND ? "See my score" : "Next"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CheatSheet() {
  const [open, setOpen] = useState(false);
  const rows: [number, string][] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20, 21, 22, 30, 40, 50, 60, 70, 80, 90, 100, 200, 1000, 2000, 2026].map((n) => [
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
                <span className="tabnum">{n}</span>
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
              <strong>Nouns stay singular after numbers:</strong> három alma (three apples), not "almák".
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
