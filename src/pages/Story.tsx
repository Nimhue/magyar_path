import { useEffect, useRef, useState } from "react";
import { lessonById, lookupWord, normalizeWord, stories } from "../content";
import type { Story } from "../content/schema";
import { MascotSays } from "../components/Mascot";
import { Icon, PageHead, SpeakButton } from "../components/ui";
import { confetti } from "../lib/celebrate";
import { isUnlocked } from "../lib/progress";
import { href } from "../lib/router";
import { sfx } from "../lib/sound";
import { speak } from "../lib/speech";
import { addXp, bump, getState, update, useProgress } from "../lib/store";
import { Locked } from "./Vocab";

interface Line {
  who: "them" | "me" | "note";
  speaker?: string;
  text: string;
  en?: string;
  ro?: string;
}

export function StoryPage({ id }: { id?: string }) {
  const p = useProgress();
  const s = id ? stories[id] : undefined;
  const [round, setRound] = useState(0);
  if (!s) return <PageHead title="Story not found" back={href("read")} />;
  if (s.lesson && !isUnlocked(s.lesson, p)) return <Locked back="read" />;
  return <StoryRun key={round} s={s} onAgain={() => setRound((r) => r + 1)} />;
}

function StoryRun({ s, onAgain }: { s: Story; onAgain: () => void }) {
  const [node, setNode] = useState(s.start);
  const [log, setLog] = useState<Line[]>(() => lineFor(s, s.start));
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [slips, setSlips] = useState(0);
  const [word, setWord] = useState<{ w: string; m: string | null } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const n = s.nodes[node];

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log.length]);

  useEffect(() => {
    if (!n.end) return;
    const prev = getState().stories[s.id];
    const rank = { oops: 0, ok: 1, great: 2 } as const;
    update((d) => void (d.stories[s.id] = prev && rank[prev] > rank[n.end!] ? prev : n.end!));
    if (!prev) {
      bump("story");
      addXp(n.end === "great" ? 30 : 20);
    }
    if (n.end === "great") {
      confetti();
      sfx("win");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);

  const choose = (k: number) => {
    const c = n.choices[k];
    const isSlip = c.to.includes("oops") || !!c.note;
    if (isSlip) setSlips((x) => x + 1);
    sfx(isSlip ? "bad" : "tap");
    speak(c.text);
    const add: Line[] = [{ who: "me", text: c.text, en: c.textEn, ro: c.textRo }];
    if (c.note) add.push({ who: "note", text: c.note });
    setLog((l) => [...l, ...add, ...lineFor(s, c.to)]);
    setNode(c.to);
  };

  const lookup = (tok: string) => {
    setWord({ w: normalizeWord(tok), m: lookupWord(tok, s.glossary, getState().settings.showRo) });
  };

  return (
    <div className="stack story">
      <PageHead
        title={s.title}
        sub={`${s.titleEn} · ${s.lesson ? `Lesson ${lessonById[s.lesson].order}` : "Survival pack"}`}
        back={href(s.lesson ? "read" : "practice")}
      />
      {s.intro && <p className="intro-line">{s.intro}</p>}
      <div className="chat" aria-live="polite">
        {log.map((line, k) =>
          line.who === "note" ? (
            <p key={k} className="chat-note">
              <Icon name="star" size={14} /> {line.text}
            </p>
          ) : (
            <div key={k} className={"bubble-line " + line.who}>
              {line.speaker && <span className="chat-speaker">{line.speaker}</span>}
              <div className="chat-bubble">
                <p lang="hu">
                  {line.text.split(/(\s+)/).map((tok, ti) =>
                    /^\s+$/.test(tok) ? (
                      tok
                    ) : (
                      <button key={ti} className="w" onClick={() => lookup(tok)}>
                        {tok}
                      </button>
                    )
                  )}
                </p>
                <div className="chat-tools">
                  <SpeakButton text={line.text} small />
                  {line.en && (
                    <button
                      className="linkish small-print"
                      onClick={() => setShown((sh) => new Set(sh).add(k))}
                      aria-expanded={shown.has(k)}
                    >
                      {shown.has(k) ? (getState().settings.showRo && line.ro ? `${line.en} · RO: ${line.ro}` : line.en) : "Translate"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        )}
        <div ref={end} />
      </div>

      {word && (
        <div className="word-pop" role="status">
          <div>
            <strong lang="hu">{word.w}</strong>
            <span>{word.m ?? "Not in your word list yet."}</span>
          </div>
          <button className="icon-btn" onClick={() => setWord(null)} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
      )}

      {n.end ? (
        <div className="stack">
          <MascotSays mood={n.end === "great" ? "party" : n.end === "ok" ? "happy" : "sad"}>
            <strong>{n.end === "great" ? "Tökéletes vég! Perfect ending!" : "Vége! The end."}</strong>
            <span>{slips ? `You slipped ${slips} time${slips > 1 ? "s" : ""}, and that's how you learn.` : "Not a single slip!"}</span>
          </MascotSays>
          <div className="row gap wrap">
            <button className="btn primary" onClick={onAgain}>
              Play again
            </button>
            <a className="btn" href={href(s.lesson ? "read" : "practice")}>
              More stories
            </a>
          </div>
        </div>
      ) : (
        <div className="choices">
          <span className="muted small-print">What do you say?</span>
          {n.choices.map((c, k) => (
            <button key={k} className="option" lang="hu" onClick={() => choose(k)}>
              <span>{c.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function lineFor(s: Story, id: string): Line[] {
  const n = s.nodes[id];
  if (!n) return [];
  if (n.end && !n.speaker) return [{ who: "note", text: n.text }];
  return [{ who: "them", speaker: n.speaker, text: n.text, en: n.textEn || undefined, ro: n.textRo }];
}
