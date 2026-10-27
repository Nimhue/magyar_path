/** Mesék: Magyar népmesék episodes (Hungarian original + official English dub) and "My scenes". */
import { useEffect, useMemo, useRef, useState } from "react";
import { taleById, tales } from "../content";
import type { Tale } from "../content/schema";
import { SaveWord, TapText, Trans } from "../components/CultureBits";
import { MascotSays } from "../components/Mascot";
import { YouTubePlayer, type PlayerApi } from "../components/YouTube";
import { Icon, PageHead, SpeakButton, toast } from "../components/ui";
import { shuffle } from "../lib/answer";
import { confetti } from "../lib/celebrate";
import { addMyWord } from "../lib/discover";
import { href } from "../lib/router";
import { sfx } from "../lib/sound";
import { addXp, bump, getState, update, useProgress, type MyScene } from "../lib/store";

const LEVEL = ["", "Könnyű · Easy", "Közepes · Medium", "Nehezebb · Harder"];
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------------- list (a tab inside Kultúra) ---------------- */

export function TalesTab() {
  const p = useProgress();
  const done = tales.filter((t) => (p.tales?.[t.id]?.best ?? 0) > 0).length;
  return (
    <section className="stack">
      <div className="panel stack tales-intro">
        <div className="row between wrap gap">
          <h2 className="section-title">Magyar népmesék</h2>
          <span className="chip tabnum">
            <Icon name="star" size={14} /> {done}/{tales.length} done
          </span>
        </div>
        <p className="muted small-print">
          The classic Hungarian cartoon series, embedded from the studio's official YouTube channels. For each tale: read an easy version first, watch it
          in Hungarian, check yourself with the English version, then answer three questions. Tap <strong>Save this moment</strong> while watching to keep a
          line you liked in <a href={href("kultura/jelenetek")}>My scenes</a>.
        </p>
      </div>
      <div className="tale-grid">
        {tales.map((t) => {
          const st = p.tales?.[t.id];
          return (
            <a key={t.id} href={href(`mese/${t.id}`)} className={"tale-card" + (st?.best ? " done" : "")}>
              <img src={`https://i.ytimg.com/vi/${t.video.hu}/mqdefault.jpg`} alt="" loading="lazy" referrerPolicy="no-referrer" />
              <span className="tc-body">
                <span className="tc-kicker">
                  {LEVEL[t.level]}
                  {t.video.en ? " · HU + EN" : " · HU"}
                </span>
                <strong lang="hu">{t.title}</strong>
                <span className="muted small-print">{t.titleEn}</span>
              </span>
              {st?.best ? (
                <span className="tc-score tabnum">
                  {st.best}/{t.questions.length}
                </span>
              ) : null}
            </a>
          );
        })}
      </div>
      <p className="muted small-print">
        Magyar népmesék © Kecskemétfilm / Pannónia. Videos play from YouTube and need an internet connection.
      </p>
    </section>
  );
}

/* ---------------- one tale ---------------- */

type Step = "read" | "hu" | "en" | "quiz";

export function TalePage({ id }: { id?: string }) {
  const t = id ? taleById[id] : undefined;
  if (!t) return <PageHead title="Tale not found" back={href("kultura/mesek")} />;
  return <TaleView key={t.id} t={t} />;
}

function TaleView({ t }: { t: Tale }) {
  const p = useProgress();
  const [step, setStep] = useState<Step>("read");
  const i = tales.findIndex((x) => x.id === t.id);
  const next = tales[i + 1];
  const glossary = useMemo(
    () => Object.fromEntries(t.words.map((w) => [w.hu.split(/[,(]/)[0].trim(), p.settings.showRo ? `${w.en} · RO: ${w.ro}` : w.en])),
    [t, p.settings.showRo]
  );
  const steps: { id: Step; hu: string; en: string }[] = [
    { id: "read", hu: "1 Olvasd", en: "Read" },
    { id: "hu", hu: "2 Magyarul", en: "Watch in Hungarian" },
    { id: "en", hu: "3 Angolul", en: "Check in English" },
    { id: "quiz", hu: "4 Kvíz", en: "Quiz" },
  ];

  return (
    <div className="stack-lg tale">
      <PageHead title={t.title} sub={`${t.titleEn}${t.episode ? ` · ${t.episode}` : ""} · ${LEVEL[t.level]}`} back={href("kultura/mesek")} />
      <div className="tale-steps" role="tablist">
        {steps.map((s) => (
          <button key={s.id} role="tab" aria-selected={step === s.id} className={"tale-step" + (step === s.id ? " on" : "")} onClick={() => setStep(s.id)}>
            <strong>{s.hu}</strong>
            <span>{s.en}</span>
          </button>
        ))}
      </div>

      {step === "read" && (
        <section className="stack">
          <div className="panel stack">
            <h2 className="section-title">Mielőtt megnézed · Before you watch</h2>
            <p className="muted small-print">My easy retelling, not the cartoon's script: the narrator uses richer Hungarian. Knowing the story and the key words first makes it much easier to follow. Tap any word.</p>
            <ol className="story-lines">
              {t.summary.map((s, k) => (
                <li key={k}>
                  <div className="sl-hu">
                    <TapText text={s.hu} glossary={glossary} from={t.title} />
                    <SpeakButton text={s.hu} small />
                  </div>
                  <Trans en={s.en} ro={s.ro} />
                </li>
              ))}
            </ol>
          </div>
          <WordList t={t} />
          <button className="btn primary" onClick={() => setStep("hu")}>
            <Icon name="play" size={16} /> Watch it in Hungarian
          </button>
        </section>
      )}

      {step === "hu" && <WatchHu t={t} onNext={() => setStep(t.video.en ? "en" : "quiz")} />}

      {step === "en" &&
        (t.video.en ? (
          <section className="stack">
            <p className="muted small-print">
              The official English dub. Watch it to check what you understood. Did you catch the same story?
            </p>
            <YouTubePlayer videoId={t.video.en} expectedTitle={t.video.enTitle} captions="en" />
            <button className="btn primary" onClick={() => setStep("quiz")}>
              Take the quiz
            </button>
          </section>
        ) : (
          <section className="stack">
            <MascotSays mood="neutral">
              <strong>No official English version of this one</strong>
              <span>Read the English lines of the story instead, then try the quiz.</span>
            </MascotSays>
            <ol className="story-lines">
              {t.summary.map((s, k) => (
                <li key={k}>
                  <span>{s.en}</span>
                </li>
              ))}
            </ol>
            <button className="btn primary" onClick={() => setStep("quiz")}>
              Take the quiz
            </button>
          </section>
        ))}

      {step === "quiz" && <TaleQuiz t={t} />}

      {next && (
        <a className="cta" href={href(`mese/${next.id}`)}>
          <span className="cta-kicker">Next tale</span>
          <span className="cta-title" lang="hu">
            {next.title}
          </span>
          <Icon name="back" />
        </a>
      )}
    </div>
  );
}

function WordList({ t }: { t: Tale }) {
  const p = useProgress();
  if (!t.words.length) return null;
  return (
    <section className="stack">
      <h2 className="section-title">Figyeld ezeket · Listen for these</h2>
      <ul className="word-rows">
        {t.words.map((w) => (
          <li key={w.hu}>
            <span className="wr-hu" lang="hu">
              {w.hu}
            </span>
            <span className="wr-mean">
              {w.en}
              {p.settings.showRo && <span className="ro"> · {w.ro}</span>}
            </span>
            <span className="row gap-s">
              <SpeakButton text={w.hu.split(/[,(]/)[0]} small />
              <SaveWord hu={w.hu} en={w.en} ro={w.ro} from={t.title} small />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WatchHu({ t, onNext }: { t: Tale; onNext: () => void }) {
  const [cc, setCc] = useState(false);
  const [heard, setHeard] = useState<Set<string>>(new Set());
  const api = useRef<PlayerApi | null>(null);
  const [moment, setMoment] = useState<number | null>(null);

  const markWatched = () =>
    update((d) => {
      d.tales ??= {};
      d.tales[t.id] = { best: d.tales[t.id]?.best ?? 0, watched: true };
    });

  return (
    <section className="stack">
      <YouTubePlayer
        videoId={t.video.hu}
        expectedTitle={t.video.huTitle}
        captions={cc ? "hu" : undefined}
        onApi={(p) => (api.current = p)}
        onEnd={markWatched}
      />
      <div className="row between wrap gap">
        <label className="toggle">
          <input id="tale-cc" type="checkbox" checked={cc} onChange={(e) => setCc(e.target.checked)} />
          <span>Hungarian subtitles (if YouTube has them)</span>
        </label>
        <button
          className="btn small"
          onClick={() => {
            const now = api.current?.getCurrentTime() ?? 0;
            api.current?.pauseVideo();
            setMoment(now);
          }}
        >
          <Icon name="clock" size={15} /> Save this moment
        </button>
      </div>

      {moment !== null && <SaveMoment t={t} at={moment} onDone={() => setMoment(null)} />}

      <div className="panel stack">
        <h3 className="section-title">Hallottad? · Did you hear it?</h3>
        <p className="muted small-print">Tap a word when you hear it in the cartoon.</p>
        <div className="heard-chips">
          {t.words.map((w) => {
            const word = w.hu.split(/[,(]/)[0].trim();
            const on = heard.has(word);
            return (
              <button
                key={word}
                className={"heard-chip" + (on ? " on" : "")}
                aria-pressed={on}
                onClick={() => {
                  setHeard((h) => {
                    const n = new Set(h);
                    if (n.has(word)) n.delete(word);
                    else n.add(word);
                    if (n.size === t.words.length) {
                      sfx("combo");
                      toast("Mindet hallottad!", "You caught every word.", "info");
                    }
                    return n;
                  });
                  sfx("tap");
                }}
              >
                {on && <Icon name="check" size={13} />} <span lang="hu">{word}</span>
              </button>
            );
          })}
        </div>
      </div>
      <button
        className="btn primary"
        onClick={() => {
          markWatched();
          onNext();
        }}
      >
        {t.video.en ? "I watched it: now in English" : "I watched it: take the quiz"}
      </button>
    </section>
  );
}

function SaveMoment({ t, at, onDone }: { t: Tale; at: number; onDone: () => void }) {
  const [hu, setHu] = useState("");
  const [en, setEn] = useState("");
  const [toWords, setToWords] = useState(true);
  return (
    <form
      className="panel stack save-moment"
      onSubmit={(e) => {
        e.preventDefault();
        const scene: MyScene = {
          kind: "clip",
          tale: t.id,
          video: t.video.hu,
          start: Math.max(0, Math.floor(at - 8)),
          end: Math.ceil(at + 1),
          hu: hu.trim(),
          en: en.trim(),
          at: Date.now(),
        };
        update((d) => void ((d.myScenes ??= {})[newId()] = scene));
        if (toWords && scene.hu && scene.en) addMyWord(scene.hu, scene.en, undefined, `Mesék: ${t.title}`);
        sfx("win");
        toast("Scene saved", "Find it in Kultúra → My scenes.", "info");
        onDone();
      }}
    >
      <strong>
        <Icon name="clock" size={16} /> Moment at {fmtTime(at)}
      </strong>
      <span className="muted small-print">The scene keeps the 8 seconds before this point. Write down what you heard (even a word or two is great).</span>
      <label className="field">
        <span>What they said (Hungarian)</span>
        <input id="mom-hu" value={hu} onChange={(e) => setHu(e.target.value)} lang="hu" placeholder="e.g. Hol volt, hol nem volt…" autoComplete="off" />
      </label>
      <label className="field">
        <span>Meaning (English)</span>
        <input id="mom-en" value={en} onChange={(e) => setEn(e.target.value)} placeholder="e.g. Once upon a time…" autoComplete="off" />
      </label>
      <label className="toggle">
        <input id="mom-words" type="checkbox" checked={toWords} onChange={(e) => setToWords(e.target.checked)} />
        <span>Also add it to My words flashcards</span>
      </label>
      <div className="row gap">
        <button className="btn primary" disabled={!hu.trim()}>
          Save scene
        </button>
        <button type="button" className="btn" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function TaleQuiz({ t }: { t: Tale }) {
  const qs = useMemo(() => t.questions.map((q) => ({ ...q, options: shuffle(q.options) })), [t]);
  const [ans, setAns] = useState<Record<number, string>>({});
  const [round, setRound] = useState(0);
  const right = qs.filter((q, k) => ans[k] === q.answer).length;
  const finished = Object.keys(ans).length === qs.length;
  useEffect(() => {
    if (!finished) return;
    {
      const prev = getState().tales?.[t.id];
      update((d) => {
        d.tales ??= {};
        d.tales[t.id] = { best: Math.max(prev?.best ?? 0, right), watched: true };
      });
      if (!prev?.best && right > 0) {
        bump("story");
        addXp(right === qs.length ? 20 : 10);
      }
      if (right === qs.length) {
        confetti();
        sfx("win");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, round]);

  return (
    <section className="panel stack" key={round}>
      <h2 className="section-title">Kvíz · Quiz</h2>
      {qs.map((q, k) => (
        <div key={k} className="pq">
          <strong lang="hu">{q.q}</strong>
          {q.qEn && <span className="muted small-print">{q.qEn}</span>}
          <div className="options compact">
            {q.options.map((o) => {
              const picked = ans[k];
              const cls = picked ? (o === q.answer ? " right" : o === picked ? " wrong" : "") : "";
              return (
                <button
                  key={o}
                  lang="hu"
                  className={"option" + cls}
                  disabled={!!picked}
                  onClick={() => {
                    setAns((a) => ({ ...a, [k]: o }));
                    const ok = o === q.answer;
                    sfx(ok ? "good" : "bad");
                    if (ok) bump("correct");
                  }}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {finished && (
        <div className="stack">
          <MascotSays mood={right === qs.length ? "party" : right ? "happy" : "sad"}>
            <strong>
              {right}/{qs.length} · {right === qs.length ? "Szép munka!" : "Majdnem!"}
            </strong>
            <span>{right === qs.length ? "You followed a real Hungarian cartoon." : "Watch it once more and try again."}</span>
          </MascotSays>
          {right < qs.length && (
            <button
              className="btn"
              onClick={() => {
                setAns({});
                setRound((r) => r + 1);
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------------- my scenes ---------------- */

export function MyScenesTab() {
  const p = useProgress();
  const list = Object.entries(p.myScenes ?? {})
    .filter(([, s]) => !s.removed)
    .sort((a, b) => b[1].at - a[1].at);
  const [playing, setPlaying] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const remove = (id: string) =>
    update((d) => {
      const s = d.myScenes[id];
      if (s) d.myScenes[id] = { ...s, removed: true, at: Date.now() };
    });

  return (
    <section className="stack">
      <div className="panel stack">
        <h2 className="section-title">Saját jelenetek · My scenes</h2>
        <p className="muted small-print">
          Two kinds of scene live here. <strong>Clips</strong> are moments you saved while watching a tale; they replay right from that point.{" "}
          <strong>Lines</strong> are sentences you wrote down from any show you watch with Hungarian audio (Friends, Gravity Falls…). Add the original line
          and the Hungarian dub line, and they become flashcards.
        </p>
        {!adding && (
          <button className="btn primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} /> Add a line from a show
          </button>
        )}
        {adding && <AddLine onDone={() => setAdding(false)} />}
      </div>

      {!list.length ? (
        <MascotSays mood="happy">
          <strong>No scenes yet</strong>
          <span>
            Open a tale in <a href={href("kultura/mesek")}>Mesék</a> and tap “Save this moment” while it plays, or add a line from a show above.
          </span>
        </MascotSays>
      ) : (
        <ul className="scene-list">
          {list.map(([id, s]) => (
            <li key={id} className={"scene " + s.kind}>
              <div className="row between gap">
                <span className="scene-kicker">
                  <Icon name={s.kind === "clip" ? "play" : "chat"} size={13} />{" "}
                  {s.kind === "clip" ? `${taleById[s.tale ?? ""]?.title ?? "Mese"} · ${fmtTime(s.start ?? 0)}` : s.show || "Show"}
                </span>
                <button className="icon-btn" onClick={() => remove(id)} aria-label="Delete scene">
                  <Icon name="trash" size={16} />
                </button>
              </div>
              {s.original && <p className="scene-orig">“{s.original}”</p>}
              <div className="row gap">
                <strong lang="hu" className="scene-hu">
                  {s.hu}
                </strong>
                <SpeakButton text={s.hu} small />
              </div>
              {s.en && s.en !== s.original && <Trans en={s.en} ro={s.ro} />}
              {s.note && <span className="muted small-print">{s.note}</span>}
              {s.kind === "clip" && s.video && (
                <>
                  {playing === id ? (
                    <YouTubePlayer videoId={s.video} start={s.start} end={s.end} expectedTitle={taleById[s.tale ?? ""]?.video.huTitle} />
                  ) : (
                    <button className="btn small" onClick={() => setPlaying(id)}>
                      <Icon name="play" size={14} /> Play the scene
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddLine({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState("");
  const [original, setOriginal] = useState("");
  const [hu, setHu] = useState("");
  const [en, setEn] = useState("");
  const [note, setNote] = useState("");
  const [toWords, setToWords] = useState(true);
  return (
    <form
      className="stack add-line"
      onSubmit={(e) => {
        e.preventDefault();
        const scene: MyScene = {
          kind: "line",
          show: show.trim(),
          original: original.trim() || undefined,
          hu: hu.trim(),
          en: (en.trim() || original.trim()),
          note: note.trim() || undefined,
          at: Date.now(),
        };
        update((d) => void ((d.myScenes ??= {})[newId()] = scene));
        if (toWords && scene.hu && scene.en) addMyWord(scene.hu, scene.en, undefined, scene.show || "My scenes");
        sfx("win");
        onDone();
      }}
    >
      <label className="field">
        <span>Show and episode</span>
        <input id="line-show" value={show} onChange={(e) => setShow(e.target.value)} placeholder="e.g. Jóbarátok S01E03" autoComplete="off" />
      </label>
      <label className="field">
        <span>Original line (English)</span>
        <input id="line-orig" value={original} onChange={(e) => setOriginal(e.target.value)} placeholder="e.g. How you doin'?" autoComplete="off" />
      </label>
      <label className="field">
        <span>Hungarian dub line</span>
        <input id="line-hu" lang="hu" value={hu} onChange={(e) => setHu(e.target.value)} placeholder="what the Hungarian voice says" autoComplete="off" />
      </label>
      <label className="field">
        <span>Meaning in English (if different from the original)</span>
        <input id="line-en" value={en} onChange={(e) => setEn(e.target.value)} autoComplete="off" />
      </label>
      <label className="field">
        <span>Note (optional)</span>
        <input id="line-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. they translated the joke differently" autoComplete="off" />
      </label>
      <label className="toggle">
        <input id="line-words" type="checkbox" checked={toWords} onChange={(e) => setToWords(e.target.checked)} />
        <span>Also add it to My words flashcards</span>
      </label>
      <div className="row gap">
        <button className="btn primary" disabled={!hu.trim()}>
          Save line
        </button>
        <button type="button" className="btn" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
