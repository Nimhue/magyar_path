import { useMemo, useState } from "react";
import { allCards, cardsByDict, config, dictCatById, dictionaryCats, sourceLabel, type Card } from "../content";
import { Empty, Icon, Meaning, PageHead, SpeakButton } from "../components/ui";
import { shuffle } from "../lib/answer";
import { href } from "../lib/router";
import { dueCards, newCards } from "../lib/srs";
import { useProgress } from "../lib/store";
import { Session } from "./Vocab";

export function DictionaryPage({ id }: { id?: string }) {
  if (id && dictCatById[id]) return <Category id={id} />;
  return <Overview />;
}

function Overview() {
  const p = useProgress();
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return allCards
      .filter((c) => c.kind !== "rule" && (c.hu.toLowerCase().includes(t) || c.en.toLowerCase().includes(t) || (c.ro ?? "").toLowerCase().includes(t)))
      .slice(0, 40);
  }, [q]);
  return (
    <div className="stack-lg">
      <PageHead title="Szótár" sub="Dictionary · themed word collections, always open" />
      <label className="search">
        <Icon name="search" size={18} />
        <input
          id="dict-search"
          type="search"
          placeholder="Search every word: Hungarian, English or Romanian"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      {q.trim().length >= 2 ? (
        <ul className="word-list">
          {results.map((c) => (
            <WordRow key={c.id} c={c} source />
          ))}
          {!results.length && <Empty>No words match “{q}”.</Empty>}
        </ul>
      ) : (
        <div className="cat-grid">
          {dictionaryCats.map((c) => {
            const cards = cardsByDict[c.id];
            const learned = cards.filter((x) => (p.cards[x.id]?.reps ?? 0) > 0).length;
            return (
              <a key={c.id} href={href(`dict/${c.id}`)} className={"cat-tile tone-" + c.color}>
                <span className="cat-mark" aria-hidden="true">
                  {c.mark}
                </span>
                <span className="cat-text">
                  <strong lang="hu">{c.title}</strong>
                  <span>{c.titleEn}</span>
                </span>
                <span className="cat-meta tabnum">
                  {learned}/{cards.length}
                </span>
                <span className="cat-bar">
                  <i style={{ width: `${(learned / cards.length) * 100}%` }} />
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WordRow({ c, source }: { c: Card; source?: boolean }) {
  const p = useProgress();
  return (
    <li>
      <SpeakButton text={c.hu} small />
      <div className="wl-main">
        <strong lang="hu">{c.hu}</strong>
        <Meaning en={c.en} ro={c.ro} />
        {c.note && <em>{c.note}</em>}
        {source && <em className="src">{sourceLabel(c)}</em>}
      </div>
      {(p.cards[c.id]?.reps ?? 0) > 0 && <Icon name="check" size={16} title="Learned" />}
    </li>
  );
}

function Category({ id }: { id: string }) {
  const p = useProgress();
  const cat = dictCatById[id];
  const cards = cardsByDict[id];
  const groups = cat.groups.map((g) => g.name);
  const [group, setGroup] = useState("all");
  const [session, setSession] = useState<Card[] | null>(null);
  const pool = group === "all" ? cards : cards.filter((c) => c.group === group);
  const unseen = newCards(pool, p);
  const due = dueCards(pool, p);
  const learned = cards.filter((x) => (p.cards[x.id]?.reps ?? 0) > 0).length;

  if (session) return <Session title={cat.title} cards={session} onExit={() => setSession(null)} exitLabel="Back to the category" />;

  return (
    <div className="stack-lg">
      <PageHead title={cat.title} sub={`${cat.titleEn} · ${learned} of ${cards.length} learned`} back={href("dict")} />
      {cat.intro && <p className="intro-line">{cat.intro}</p>}
      <div className="action-row">
        <button className="btn primary" disabled={!unseen.length} onClick={() => setSession(unseen.slice(0, config.newCardsPerDay))}>
          <Icon name="cards" size={18} /> Learn {Math.min(unseen.length, config.newCardsPerDay) || ""} new
        </button>
        <button className="btn" disabled={!due.length} onClick={() => setSession(shuffle(due))}>
          <Icon name="repeat" size={18} /> Review {due.length || ""}
        </button>
        <a className="btn" href={href(`quiz/dict/${id}`)}>
          <Icon name="quiz" size={18} /> Quiz
        </a>
        <a className="btn" href={href(`play/memory/${id}`)}>
          <Icon name="game" size={18} /> Memory
        </a>
      </div>
      <div className="chips scroll" role="group" aria-label="Groups">
        <button className={"chip btnchip" + (group === "all" ? " sel" : "")} onClick={() => setGroup("all")}>
          All
        </button>
        {groups.map((g) => (
          <button key={g} className={"chip btnchip" + (group === g ? " sel" : "")} onClick={() => setGroup(g)}>
            {g.split(" · ")[1] ?? g}
          </button>
        ))}
      </div>
      {(group === "all" ? cat.groups : cat.groups.filter((g) => g.name === group)).map((g) => (
        <section key={g.name}>
          <h2 className="section-title">{g.name}</h2>
          <ul className="word-list">
            {cards
              .filter((c) => c.group === g.name)
              .map((c) => (
                <WordRow key={c.id} c={c} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
