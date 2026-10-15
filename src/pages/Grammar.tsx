import { useState } from "react";
import { grammar, grammarById, lessonById } from "../content";
import type { GrammarSection } from "../content/schema";
import { Fmt, Icon, PageHead, SpeakButton } from "../components/ui";
import { isUnlocked } from "../lib/progress";
import { href } from "../lib/router";
import { useProgress } from "../lib/store";

export function GrammarPage({ id }: { id?: string }) {
  if (id) return <Topic id={id} />;
  const byLesson = new Map<string, typeof grammar>();
  for (const g of grammar) byLesson.set(g.lesson, [...(byLesson.get(g.lesson) ?? []), g]);
  return (
    <div className="stack-lg">
      <PageHead title="Nyelvtan" sub="Grammar reference · always open, grows with every lesson" />
      {[...byLesson.entries()].map(([lid, topics]) => (
        <section key={lid}>
          <h2 className="section-title">
            {lessonById[lid].order}. {lessonById[lid].title}
          </h2>
          <div className="topic-grid">
            {topics.map((g) => (
              <a key={g.id} className="topic" href={href(`grammar/${g.id}`)}>
                <span className="topic-level">{g.level}</span>
                <strong>{g.titleEn}</strong>
                <span className="topic-hu" lang="hu">
                  {g.title}
                </span>
                <span className="muted">{g.summary}</span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Topic({ id }: { id: string }) {
  const p = useProgress();
  const g = grammarById[id];
  if (!g) return <PageHead title="Topic not found" back={href("grammar")} />;
  const l = lessonById[g.lesson];
  const idx = grammar.indexOf(g);
  const prev = grammar[idx - 1];
  const next = grammar[idx + 1];
  return (
    <div className="stack-lg grammar">
      <PageHead title={g.titleEn} sub={`${g.title} · ${g.level} · Lesson ${l.order}`} back={href("grammar")} />
      <p className="lead">{g.summary}</p>
      {g.sections.map((s, i) => (
        <Section key={i} s={s} />
      ))}
      {isUnlocked(l.id, p) && l.exercises.length > 0 && (
        <a className="cta" href={href(`drills/${l.id}`)}>
          <span className="cta-kicker">Practice</span>
          <span className="cta-title">Drills for lesson {l.order}</span>
          <Icon name="back" />
        </a>
      )}
      <div className="row between">
        {prev ? (
          <a className="btn" href={href(`grammar/${prev.id}`)}>
            ← {prev.titleEn}
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a className="btn" href={href(`grammar/${next.id}`)}>
            {next.titleEn} →
          </a>
        )}
      </div>
    </div>
  );
}

function Section({ s }: { s: GrammarSection }) {
  switch (s.type) {
    case "heading":
      return <h2 className="g-h">{s.text}</h2>;
    case "text":
      return (
        <p className="g-text">
          <Fmt text={s.text} />
        </p>
      );
    case "tip":
      return (
        <aside className={"tip " + s.tone}>
          <Fmt text={s.text} />
        </aside>
      );
    case "table":
      return (
        <figure className="table-wrap">
          {s.caption && <figcaption>{s.caption}</figcaption>}
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  {s.head.map((h, i) => (
                    <th key={i}>
                      <Fmt text={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j}>
                        <Fmt text={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );
    case "examples":
      return (
        <ul className="examples">
          {s.items.map((e, i) => (
            <li key={i}>
              <SpeakButton text={e.hu} small />
              <div>
                <strong lang="hu">{e.hu}</strong>
                <span>{e.en}</span>
                {e.note && <em>{e.note}</em>}
              </div>
            </li>
          ))}
        </ul>
      );
    case "pairs":
      return (
        <ul className="pairs">
          {s.items.map((pr, i) => (
            <li key={i}>
              <div className="pair">
                <SpeakButton text={pr.a} small />
                <strong lang="hu">{pr.a}</strong>
                <span>{pr.aEn}</span>
              </div>
              <span className="vs">vs</span>
              <div className="pair">
                <SpeakButton text={pr.b} small />
                <strong lang="hu">{pr.b}</strong>
                <span>{pr.bEn}</span>
              </div>
            </li>
          ))}
        </ul>
      );
    case "widget":
      return s.widget === "harmony" ? <HarmonyWidget /> : s.widget === "article" ? <ArticleWidget /> : <VanWidget />;
  }
}

const BACK = "aáoóuú";
const FRONT = "eéiíöőüű";
const FRONT_ROUND = "öőüű";

export function classify(word: string) {
  const w = word.toLowerCase();
  const vowels = [...w].filter((c) => BACK.includes(c) || FRONT.includes(c));
  const hasBack = vowels.some((v) => BACK.includes(v));
  const hasFront = vowels.some((v) => FRONT.includes(v));
  const type = !vowels.length ? null : hasBack && hasFront ? "vegyes" : hasBack ? "mély" : "magas";
  const last = vowels[vowels.length - 1];
  const hasRound = vowels.some((v) => FRONT_ROUND.includes(v));
  const back = type === "mély" || (type === "vegyes" && (!hasRound || BACK.includes(last)));
  return { type, back };
}

function HarmonyWidget() {
  const [w, setW] = useState("zsiráf");
  const { type, back } = classify(w.trim());
  return (
    <div className="widget">
      <label className="widget-label" htmlFor="harmony-input">
        Vowel harmony checker
      </label>
      <input id="harmony-input" className="type-input" value={w} onChange={(e) => setW(e.target.value)} lang="hu" autoComplete="off" />
      <div className="vowel-row" aria-label="Letters with vowels highlighted">
        {[...w].map((c, i) => (
          <span key={i} className={BACK.includes(c.toLowerCase()) ? "v-back" : FRONT.includes(c.toLowerCase()) ? "v-front" : ""}>
            {c}
          </span>
        ))}
      </div>
      {type ? (
        <div className="widget-out">
          <span className={"badge " + (type === "magas" ? "front" : type === "mély" ? "back" : "mixed")}>{type} hangrendű</span>
          <span>
            “in”: <strong lang="hu">{w.trim() + (back ? "ban" : "ben")}</strong>
            <span className="muted"> ({back ? "-ban, back" : "-ben, front"})</span>
          </span>
        </div>
      ) : (
        <p className="muted">Type a word with at least one vowel.</p>
      )}
      <p className="muted small-print">
        <span className="v-back">blue</span> = back vowel, <span className="v-front">orange</span> = front vowel. Some words change slightly
        before an ending; this tool only shows the vowel choice.
      </p>
    </div>
  );
}

function ArticleWidget() {
  const [w, setW] = useState("óra");
  const t = w.trim();
  const az = /^[aáeéiíoóöőuúüű]/i.test(t);
  return (
    <div className="widget">
      <label className="widget-label" htmlFor="article-input">
        Which article?
      </label>
      <input id="article-input" className="type-input" value={w} onChange={(e) => setW(e.target.value)} lang="hu" autoComplete="off" />
      {t && (
        <div className="widget-out">
          <span className="badge back">the</span>
          <strong lang="hu">
            {az ? "az" : "a"} {t}
          </strong>
          <span className="badge mixed">a / an</span>
          <strong lang="hu">egy {t}</strong>
        </div>
      )}
      <p className="muted small-print">{t && (az ? "Starts with a vowel → az." : "Starts with a consonant → a.")}</p>
    </div>
  );
}

const PEOPLE = [
  { hu: "én", en: "I", verb: "vagyok", pl: false, enVerb: "am" },
  { hu: "te", en: "you", verb: "vagy", pl: false, enVerb: "are" },
  { hu: "Ön", en: "you (formal)", verb: "", pl: false, enVerb: "are" },
  { hu: "ő", en: "he / she", verb: "", pl: false, enVerb: "is" },
  { hu: "mi", en: "we", verb: "vagyunk", pl: true, enVerb: "are" },
  { hu: "ti", en: "you all", verb: "vagytok", pl: true, enVerb: "are" },
  { hu: "Önök", en: "you all (formal)", verb: "", pl: true, enVerb: "are" },
  { hu: "ők", en: "they", verb: "", pl: true, enVerb: "are" },
];
const WORDS = [
  { sg: "diák", pl: "diákok", en: "student", enPl: "students" },
  { sg: "mérnök", pl: "mérnökök", en: "engineer", enPl: "engineers" },
  { sg: "tanár", pl: "tanárok", en: "teacher", enPl: "teachers" },
  { sg: "magyar", pl: "magyarok", en: "Hungarian", enPl: "Hungarian" },
  { sg: "német", pl: "németek", en: "German", enPl: "German" },
];

function VanWidget() {
  const [pi, setPi] = useState(3);
  const [wi, setWi] = useState(0);
  const per = PEOPLE[pi];
  const word = WORDS[wi];
  const pred = per.pl ? word.pl : word.sg;
  const sentence = [per.hu, pred, per.verb].filter(Boolean).join(" ") + ".";
  const cap = sentence[0].toUpperCase() + sentence.slice(1);
  const isNoun = wi < 3;
  const enPred = per.pl ? word.enPl : isNoun ? `a ${word.en}`.replace("a engineer", "an engineer") : word.en;
  return (
    <div className="widget">
      <span className="widget-label">Sentence builder</span>
      <div className="chips wrap" role="radiogroup" aria-label="Person">
        {PEOPLE.map((x, i) => (
          <button key={x.hu} role="radio" aria-checked={i === pi} className={"chip btnchip" + (i === pi ? " sel" : "")} onClick={() => setPi(i)}>
            {x.hu}
          </button>
        ))}
      </div>
      <div className="chips wrap" role="radiogroup" aria-label="Word">
        {WORDS.map((x, i) => (
          <button key={x.sg} role="radio" aria-checked={i === wi} className={"chip btnchip" + (i === wi ? " sel" : "")} onClick={() => setWi(i)}>
            {x.sg}
          </button>
        ))}
      </div>
      <div className="widget-out sentence">
        <SpeakButton text={cap} small />
        <strong lang="hu">{cap}</strong>
      </div>
      <p className="muted">
        {per.en[0].toUpperCase() + per.en.slice(1)} {per.enVerb} {enPred}.
        {!per.verb && (
          <>
            {" "}
            <span className="badge warn">no van!</span>
          </>
        )}
      </p>
      {per.pl && <p className="muted small-print">With plural people the word takes the plural ending -k (you'll learn this soon).</p>}
    </div>
  );
}
