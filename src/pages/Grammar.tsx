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
      switch (s.widget) {
        case "harmony":
          return <HarmonyWidget />;
        case "article":
          return <ArticleWidget />;
        case "conjugate":
          return <ConjugateWidget />;
        case "possessive":
          return <PossessiveWidget />;
        case "location":
          return <LocationWidget />;
        default:
          return <VanWidget />;
      }
  }
}

const BACK = "aáoóuú";
const FRONT = "eéiíöőüű";

export function classify(word: string) {
  const w = word.toLowerCase();
  const vowels = [...w].filter((c) => BACK.includes(c) || FRONT.includes(c));
  const hasBack = vowels.some((v) => BACK.includes(v));
  const hasFront = vowels.some((v) => FRONT.includes(v));
  const type = !vowels.length ? null : hasBack && hasFront ? "vegyes" : hasBack ? "mély" : "magas";
  const last = vowels[vowels.length - 1];
  // Mixed words: a back vowel or a "neutral" é/i/í at the end keeps them back (zsiráfban, kávéban, papírban);
  // a final short e or ö/ő/ü/ű makes them front (hotelben, Bukarestben).
  const back = type === "mély" || (type === "vegyes" && (BACK.includes(last) || "éií".includes(last)));
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

const ROUNDED = "öőüű";
const lastVowel = (w: string) => [...w.toLowerCase()].reverse().find((c) => BACK.includes(c) || FRONT.includes(c)) ?? "";
const lengthen = (w: string) => (w.endsWith("a") ? w.slice(0, -1) + "á" : w.endsWith("e") ? w.slice(0, -1) + "é" : w);
const endsInVowel = (w: string) => /[aáeéiíoóöőuúüű]$/i.test(w);

export function conjugate(verb: string) {
  const v = verb.trim().toLowerCase();
  const { back } = classify(v);
  const rounded = !back && ROUNDED.includes(lastVowel(v));
  const sibilant = /(s|sz|z)$/.test(v);
  const te = sibilant ? v + (back ? "ol" : rounded ? "öl" : "el") : v + "sz";
  return [
    ["én", v + (back ? "ok" : rounded ? "ök" : "ek")],
    ["te", te],
    ["Ön, ő", v],
    ["mi", v + (back ? "unk" : "ünk")],
    ["ti", v + (back ? "tok" : rounded ? "tök" : "tek")],
    ["Önök, ők", v + (back ? "nak" : "nek")],
  ] as const;
}

function ConjugateWidget() {
  const verbs = ["tanul", "beszél", "örül", "tud", "él", "kíván"];
  const [v, setV] = useState("tanul");
  const table = v.trim() ? conjugate(v) : [];
  const sib = /(s|sz|z)$/.test(v.trim());
  return (
    <div className="widget">
      <label className="widget-label" htmlFor="conj-input">
        Verb conjugator
      </label>
      <div className="chips wrap">
        {verbs.map((x) => (
          <button key={x} className={"chip btnchip" + (v === x ? " sel" : "")} onClick={() => setV(x)}>
            {x}
          </button>
        ))}
      </div>
      <input id="conj-input" className="type-input" value={v} onChange={(e) => setV(e.target.value)} lang="hu" autoComplete="off" />
      {table.length > 0 && (
        <div className="conj-table">
          {table.map(([who, form]) => (
            <div key={who} className="conj-row">
              <span className="muted">{who}</span>
              <strong lang="hu">{form}</strong>
              <SpeakButton text={form} small />
            </div>
          ))}
        </div>
      )}
      <p className="muted small-print">
        {sib
          ? "Verbs ending in -s, -sz or -z take -ol/-el/-öl for te (olvas → olvasol). You'll meet them soon."
          : "Works for regular verbs. Verbs ending in two consonants or -ít add a linking vowel for ti and ők (tanít → tanítotok)."}
      </p>
    </div>
  );
}

const POSS_EXCEPTIONS: Record<string, [string, string]> = {
  ház: ["házam", "házad"],
  név: ["nevem", "neved"],
  hónap: ["hónapom", "hónapod"],
  toll: ["tollam", "tollad"],
  fal: ["falam", "falad"],
};

export function possess(noun: string): [string, string] {
  const n = noun.trim().toLowerCase();
  if (POSS_EXCEPTIONS[n]) return POSS_EXCEPTIONS[n];
  if (endsInVowel(n)) return [lengthen(n) + "m", lengthen(n) + "d"];
  const { back } = classify(n);
  const lv = lastVowel(n);
  if (back) return [n + "om", n + "od"];
  if (ROUNDED.includes(lv)) return [n + "öm", n + "öd"];
  return [n + "em", n + "ed"];
}

function PossessiveWidget() {
  const [w, setW] = useState("feleség");
  const t = w.trim();
  const [my, your] = t ? possess(t) : ["", ""];
  const art = (x: string) => (/^[aáeéiíoóöőuúüű]/i.test(x) ? "az" : "a");
  return (
    <div className="widget">
      <label className="widget-label" htmlFor="poss-input">
        My and your
      </label>
      <input id="poss-input" className="type-input" value={w} onChange={(e) => setW(e.target.value)} lang="hu" autoComplete="off" />
      {t && (
        <div className="widget-out">
          <span className="badge back">my</span>
          <strong lang="hu">
            {art(my)} {my}
          </strong>
          <span className="badge mixed">your</span>
          <strong lang="hu">
            {art(your)} {your}
          </strong>
        </div>
      )}
      <p className="muted small-print">Some short words are exceptions (ház → házam, név → nevem). Compound words follow their last part.</p>
    </div>
  );
}

export function locative(place: string, hungarian: boolean) {
  const w = place.trim();
  if (!w) return "";
  const { back } = classify(w);
  const lv = lastVowel(w);
  if (hungarian) {
    if (endsInVowel(w)) return lengthen(w) + "n";
    return w + (back ? "on" : ROUNDED.includes(lv) ? "ön" : "en");
  }
  return lengthen(w) + (back ? "ban" : "ben");
}

function LocationWidget() {
  const [w, setW] = useState("Prága");
  const [hu, setHu] = useState(false);
  const out = locative(w, hu);
  return (
    <div className="widget">
      <label className="widget-label" htmlFor="loc-input">
        Where? Place + ending
      </label>
      <input id="loc-input" className="type-input" value={w} onChange={(e) => setW(e.target.value)} lang="hu" autoComplete="off" />
      <label className="toggle">
        <input id="loc-hu" type="checkbox" checked={hu} onChange={(e) => setHu(e.target.checked)} />
        <span>Hungary, a Hungarian town or an island (takes -n)</span>
      </label>
      {out && (
        <div className="widget-out sentence">
          <SpeakButton text={out} small />
          <strong lang="hu">{out}</strong>
          <span className="muted">= in {w.trim()}</span>
        </div>
      )}
      <p className="muted small-print">Try: Svájc, Berlin, Velence, Magyarország, Szeged, Siófok, Málta.</p>
    </div>
  );
}
