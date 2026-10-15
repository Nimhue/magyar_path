/**
 * Question widgets shared by quizzes, drills and readings.
 * Each one shows its own feedback and calls onNext(correct) when the learner continues.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { check, shuffle, type Verdict } from "../lib/answer";
import { canSpeak, hasHungarianVoice, speak } from "../lib/speech";
import { AccentKeys } from "./AccentKeys";
import { MascotSays, cheer, cheerMeaning, console_ } from "./Mascot";
import { Fmt, Icon, SpeakButton } from "./ui";

export function Feedback({
  correct,
  title,
  children,
  onNext,
  speakText,
}: {
  correct: boolean;
  title?: string;
  children?: ReactNode;
  onNext: () => void;
  speakText?: string;
}) {
  const [line] = useState(() => (correct ? cheer() : console_()));
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => btn.current?.focus(), []);
  return (
    <div className={"feedback " + (correct ? "good" : "bad")} role="status">
      <MascotSays mood={correct ? "happy" : "sad"}>
        <strong>
          {title ?? line} <span className="muted tiny">{!title && cheerMeaning[line]}</span>
        </strong>
        {children}
        {speakText && (
          <span className="fb-speak">
            <SpeakButton text={speakText} small /> Listen
          </span>
        )}
      </MascotSays>
      <button ref={btn} className="btn primary block" onClick={onNext}>
        Continue
      </button>
    </div>
  );
}

export function ChoiceQ({
  prompt,
  sub,
  options,
  answer,
  explain,
  optionLang,
  speakAfter,
  onNext,
}: {
  prompt: ReactNode;
  sub?: ReactNode;
  options: string[];
  answer: string;
  explain?: string;
  optionLang?: "hu" | "en";
  speakAfter?: string;
  onNext: (correct: boolean) => void;
}) {
  const opts = useMemo(() => shuffle(options), [options]);
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === answer;
  return (
    <div className="q">
      <div className="q-prompt">{prompt}</div>
      {sub && <div className="q-sub">{sub}</div>}
      <div className="options">
        {opts.map((o, i) => {
          const state = picked === null ? "" : o === answer ? " right" : o === picked ? " wrong" : " dim";
          return (
            <button key={o} className={"option" + state} disabled={picked !== null} onClick={() => setPicked(o)} lang={optionLang}>
              <span className="opt-key">{i + 1}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <Feedback correct={correct} onNext={() => onNext(correct)} speakText={speakAfter}>
          {!correct && (
            <span>
              Answer: <strong>{answer}</strong>
            </span>
          )}
          {explain && (
            <span>
              <Fmt text={explain} />
            </span>
          )}
        </Feedback>
      )}
    </div>
  );
}

export function TypeQ({
  prompt,
  sub,
  answer,
  hint,
  explain,
  onNext,
}: {
  prompt: ReactNode;
  sub?: ReactNode;
  answer: string | string[];
  hint?: string;
  explain?: string;
  onNext: (correct: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const main = Array.isArray(answer) ? answer[0] : answer;
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="q">
      <div className="q-prompt">{prompt}</div>
      {sub && <div className="q-sub">{sub}</div>}
      <form
        className="type-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (verdict === null && value.trim()) setVerdict(check(value, answer));
        }}
      >
        <input
          ref={ref}
          id="type-answer"
          className={"type-input" + (verdict ? " " + verdict : "")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          readOnly={verdict !== null}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          lang="hu"
          placeholder="Type in Hungarian…"
          aria-label="Your answer"
        />
        {verdict === null && (
          <>
            <AccentKeys inputRef={ref} value={value} onChange={setValue} />
            {hint && <p className="muted small-print">Hint: {hint}</p>}
            <button className="btn primary block" disabled={!value.trim()}>
              Check
            </button>
          </>
        )}
      </form>
      {verdict !== null && (
        <Feedback
          correct={verdict === "correct"}
          title={verdict === "accent" ? "Majdnem! Almost — check the accents." : undefined}
          onNext={() => onNext(verdict === "correct")}
          speakText={main}
        >
          {verdict !== "correct" && (
            <span>
              Correct: <strong lang="hu">{main}</strong>
            </span>
          )}
          {explain && (
            <span>
              <Fmt text={explain} />
            </span>
          )}
        </Feedback>
      )}
    </div>
  );
}

export function ListenQ({
  say,
  options,
  answer,
  explain,
  onNext,
}: {
  say: string;
  options: string[];
  answer: string;
  explain?: string;
  onNext: (correct: boolean) => void;
}) {
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => speak(say), 250);
    return () => clearTimeout(t);
  }, [say]);
  const voiceOk = canSpeak() && hasHungarianVoice();
  return (
    <ChoiceQ
      prompt={
        <div className="listen">
          <button className="listen-btn" onClick={() => speak(say)} aria-label="Play the word again">
            <Icon name="speaker" size={34} />
          </button>
          <div>
            <span>Which word do you hear?</span>
            <button className="linkish" onClick={() => speak(say, 0.6)}>
              Play slowly
            </button>
          </div>
        </div>
      }
      sub={
        !voiceOk && (
          <span className="warn-text">
            This device has no Hungarian voice, so the audio may sound wrong.{" "}
            {reveal ? (
              <strong lang="hu">“{say}”</strong>
            ) : (
              <button className="linkish" onClick={() => setReveal(true)}>
                Show the word
              </button>
            )}
          </span>
        )
      }
      options={options}
      answer={answer}
      explain={explain}
      optionLang="hu"
      onNext={onNext}
    />
  );
}

export function MatchQ({
  prompt,
  pairs,
  explain,
  onNext,
}: {
  prompt: ReactNode;
  pairs: { left: string; right: string }[];
  explain?: string;
  onNext: (correct: boolean, missed: string[]) => void;
}) {
  const lefts = useMemo(() => shuffle(pairs.map((p) => p.left)), [pairs]);
  const rights = useMemo(() => shuffle(pairs.map((p) => p.right)), [pairs]);
  const [sel, setSel] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const done = matched.size === pairs.length;

  const pickRight = (r: string) => {
    if (!sel) return;
    const pair = pairs.find((p) => p.left === sel)!;
    if (pair.right === r) {
      setMatched(new Set(matched).add(sel));
      speak(sel);
    } else {
      setMissed((m) => (m.includes(sel) ? m : [...m, sel]));
      setFlash(r);
      setTimeout(() => setFlash(null), 450);
    }
    setSel(null);
  };
  const matchedRights = new Set(pairs.filter((p) => matched.has(p.left)).map((p) => p.right));

  return (
    <div className="q">
      <div className="q-prompt">{prompt}</div>
      <div className="q-sub muted">Tap a word on the left, then its partner on the right.</div>
      <div className="match">
        <div className="match-col">
          {lefts.map((l) => (
            <button
              key={l}
              lang="hu"
              className={"match-item" + (matched.has(l) ? " right" : sel === l ? " sel" : "")}
              disabled={matched.has(l) || done}
              onClick={() => setSel(sel === l ? null : l)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="match-col">
          {rights.map((r) => (
            <button
              key={r}
              className={"match-item" + (matchedRights.has(r) ? " right" : flash === r ? " wrong" : "")}
              disabled={matchedRights.has(r) || done || !sel}
              onClick={() => pickRight(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {done && (
        <Feedback correct={missed.length === 0} onNext={() => onNext(missed.length === 0, missed)}>
          {missed.length > 0 && <span>Tricky ones: {missed.join(", ")}</span>}
          {explain && (
            <span>
              <Fmt text={explain} />
            </span>
          )}
        </Feedback>
      )}
    </div>
  );
}

export function SortQ({
  prompt,
  buckets,
  items,
  explain,
  onNext,
}: {
  prompt: ReactNode;
  buckets: string[];
  items: { text: string; bucket: string }[];
  explain?: string;
  onNext: (correct: boolean) => void;
}) {
  const order = useMemo(() => shuffle(items), [items]);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const allPlaced = order.every((i) => placed[i.text]);
  const wrong = order.filter((i) => placed[i.text] !== i.bucket);
  return (
    <div className="q">
      <div className="q-prompt">{prompt}</div>
      <ul className="sort-list">
        {order.map((it) => {
          const state = !checked ? "" : placed[it.text] === it.bucket ? " right" : " wrong";
          return (
            <li key={it.text} className={"sort-row" + state}>
              <span className="sort-word" lang="hu">
                {it.text}
              </span>
              <div className="sort-buckets" role="radiogroup" aria-label={`Group for ${it.text}`}>
                {buckets.map((b) => (
                  <button
                    key={b}
                    role="radio"
                    aria-checked={placed[it.text] === b}
                    className={"bucket" + (placed[it.text] === b ? " sel" : "") + (checked && it.bucket === b ? " truth" : "")}
                    disabled={checked}
                    onClick={() => setPlaced({ ...placed, [it.text]: b })}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {!checked ? (
        <button className="btn primary block" disabled={!allPlaced} onClick={() => setChecked(true)}>
          Check
        </button>
      ) : (
        <Feedback correct={wrong.length === 0} onNext={() => onNext(wrong.length === 0)}>
          {wrong.length > 0 && (
            <span>
              {wrong.map((w) => (
                <span key={w.text} className="block-line">
                  <strong lang="hu">{w.text}</strong> → {w.bucket}
                </span>
              ))}
            </span>
          )}
          {explain && (
            <span>
              <Fmt text={explain} />
            </span>
          )}
        </Feedback>
      )}
    </div>
  );
}
