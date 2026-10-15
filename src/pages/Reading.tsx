import { useState } from "react";
import { dictionary, lessonById, lessons, normalizeWord, readings } from "../content";
import type { Reading } from "../content/schema";
import { MascotSays } from "../components/Mascot";
import { Icon, PageHead, SpeakButton } from "../components/ui";
import { confetti } from "../lib/celebrate";
import { isUnlocked } from "../lib/progress";
import { href } from "../lib/router";
import { speak } from "../lib/speech";
import { addXp, getState, update, useProgress } from "../lib/store";
import { Locked } from "./Vocab";

export function ReadingPage({ id }: { id?: string }) {
  const p = useProgress();
  if (id) {
    const r = readings[id];
    if (!r) return <PageHead title="Text not found" back={href("read")} />;
    if (!isUnlocked(r.lesson, p)) return <Locked back="read" />;
    return <Reader key={id} r={r} />;
  }
  return (
    <div className="stack-lg">
      <PageHead title="Olvasás" sub="Short texts that use only what you've learned · tap any word" />
      {lessons.map((l) => {
        const open = isUnlocked(l.id, p);
        if (!l.readings.length) return null;
        return (
          <section key={l.id}>
            <h2 className="section-title">
              {l.order}. {l.title}
            </h2>
            <ul className="steps">
              {l.readings.map((rid) => {
                const r = readings[rid];
                const done = p.readings[rid]?.done;
                return (
                  <li key={rid}>
                    {open ? (
                      <a className={"step" + (done ? " done" : "")} href={href(`read/${rid}`)}>
                        <span className="step-icon">{done ? <Icon name="check" /> : <Icon name="read" />}</span>
                        <span className="step-text">
                          <strong>{r.title}</strong>
                          <span className="muted">
                            {r.titleEn} · {r.paragraphs.length} paragraph{r.paragraphs.length > 1 ? "s" : ""}
                          </span>
                        </span>
                        <Icon name="back" size={16} />
                      </a>
                    ) : (
                      <div className="step locked">
                        <span className="step-icon">
                          <Icon name="lock" />
                        </span>
                        <span className="step-text">
                          <strong>{r.title}</strong>
                          <span className="muted">Unlocks with lesson {l.order}</span>
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function lookup(word: string, r: Reading): string | null {
  const w = normalizeWord(word);
  if (!w) return null;
  const g = Object.fromEntries(Object.entries(r.glossary).map(([k, v]) => [normalizeWord(k), v]));
  return g[w] ?? dictionary[w] ?? null;
}

function Reader({ r }: { r: Reading }) {
  const [word, setWord] = useState<{ text: string; meaning: string | null } | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const l = lessonById[r.lesson];
  const correct = r.questions.filter((q, i) => answers[i] === q.answer).length;

  const finish = () => {
    setChecked(true);
    const prev = getState().readings[r.id];
    const score = r.questions.length ? Math.round((correct / r.questions.length) * 100) : 100;
    update((d) => void (d.readings[r.id] = { done: true, score: Math.max(prev?.score ?? 0, score) }));
    if (!prev?.done) addXp(20);
    if (correct === r.questions.length) confetti();
  };

  return (
    <div className="stack-lg reader">
      <PageHead title={r.title} sub={`${r.titleEn} · Lesson ${l.order}`} back={href("read")} />
      {r.intro && <p className="intro-line">{r.intro}</p>}
      <article className="text-card" lang="hu">
        {r.paragraphs.map((para, pi) => {
          const speaker = para.match(/^([^:]{1,20}):\s/);
          const body = speaker ? para.slice(speaker[0].length) : para;
          return (
            <p key={pi} className={speaker ? "line" : ""}>
              <SpeakButton text={body} small />
              {speaker && <span className="speaker">{speaker[1]}</span>}
              {body.split(/(\s+)/).map((tok, ti) =>
                /^\s+$/.test(tok) ? (
                  tok
                ) : (
                  <button
                    key={ti}
                    className={"w" + (word?.text === tok ? " on" : "")}
                    onClick={() => {
                      setWord({ text: tok, meaning: lookup(tok, r) });
                      speak(normalizeWord(tok));
                    }}
                  >
                    {tok}
                  </button>
                )
              )}
            </p>
          );
        })}
      </article>

      {word && (
        <div className="word-pop" role="status">
          <div>
            <strong lang="hu">{normalizeWord(word.text)}</strong>
            <span>{word.meaning ?? "Not in your word list yet. Ask your teacher, or add it to your notes!"}</span>
          </div>
          <SpeakButton text={normalizeWord(word.text)} small />
          <button className="icon-btn" onClick={() => setWord(null)} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
      )}

      {r.questions.length > 0 && (
        <section className="stack">
          <h2 className="section-title">Értetted? · Did you understand?</h2>
          {r.questions.map((q, i) => (
            <fieldset key={i} className="rq">
              <legend>
                <span lang="hu">{q.q}</span>
                {q.qEn && <span className="muted"> · {q.qEn}</span>}
              </legend>
              <div className="options compact">
                {q.options.map((o) => {
                  const state = !checked ? (answers[i] === o ? " sel" : "") : o === q.answer ? " right" : answers[i] === o ? " wrong" : " dim";
                  return (
                    <button key={o} className={"option" + state} disabled={checked} onClick={() => setAnswers({ ...answers, [i]: o })}>
                      <span>{o}</span>
                    </button>
                  );
                })}
              </div>
              {checked && q.explain && <p className="muted small-print">{q.explain}</p>}
            </fieldset>
          ))}
          {!checked ? (
            <button className="btn primary block" disabled={Object.keys(answers).length < r.questions.length} onClick={finish}>
              Check answers
            </button>
          ) : (
            <MascotSays mood={correct === r.questions.length ? "party" : "happy"}>
              <strong>
                {correct}/{r.questions.length} correct
              </strong>
              <span>{correct === r.questions.length ? "Tökéletes! Perfect!" : "Read it once more and look at the words you missed."}</span>
            </MascotSays>
          )}
          {checked && (
            <div className="row gap wrap">
              <button
                className="btn"
                onClick={() => {
                  setChecked(false);
                  setAnswers({});
                }}
              >
                Try again
              </button>
              <a className="btn primary" href={href(`lesson/${r.lesson}`)}>
                Back to lesson
              </a>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
