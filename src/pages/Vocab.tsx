import { useEffect, useMemo, useState } from "react";
import { cardsByLesson, config, lessonById, type Card } from "../content";
import { LessonPicker } from "../components/LessonPicker";
import { MascotSays, cheer } from "../components/Mascot";
import { Empty, Icon, Meaning, PageHead, SpeakButton } from "../components/ui";
import { shuffle } from "../lib/answer";
import { isUnlocked, unlockedLessons } from "../lib/progress";
import { href } from "../lib/router";
import { dueCards, newCards, nextLabel, schedule, type Rating } from "../lib/srs";
import { addXp, bump, getState, update, useProgress } from "../lib/store";
import { sfx } from "../lib/sound";
import { speak } from "../lib/speech";

export function VocabPage({ args }: { args: string[] }) {
  const p = useProgress();
  const [a] = args;
  if (a === "review") return <ReviewSession />;
  if (a) {
    const l = lessonById[a];
    if (!l) return <PageHead title="Lesson not found" back={href("vocab")} />;
    if (!isUnlocked(l.id, p)) return <Locked back="vocab" />;
    return <LessonDeck lessonId={a} />;
  }
  const due = dueCards(unlockedLessons(p).flatMap((l) => cardsByLesson[l.id]), p).length;
  return (
    <div className="stack-lg">
      <PageHead title="Szókincs" sub="Vocabulary · flashcards with spaced repetition" />
      <a className={"cta" + (due ? " due" : "")} href={href("vocab/review")}>
        <span className="cta-kicker">Spaced review</span>
        <span className="cta-title">{due ? `${due} card${due > 1 ? "s" : ""} are due` : "Nothing due right now"}</span>
        <Icon name="back" />
      </a>
      <section>
        <h2 className="section-title">Lessons</h2>
        <LessonPicker
          hrefFor={(id) => href(`vocab/${id}`)}
          detail={(id) => {
            const cards = cardsByLesson[id];
            const seen = cards.filter((c) => p.cards[c.id]?.seen).length;
            const d = dueCards(cards, p).length;
            return `${seen}/${cards.length} seen${d ? ` · ${d} due` : ""}`;
          }}
        />
      </section>
    </div>
  );
}

export function Locked({ back }: { back: string }) {
  return (
    <div className="stack">
      <PageHead title="Locked lesson" back={href(back)} />
      <div className="panel center">
        <Icon name="lock" size={32} />
        <p>Finish the lessons before this one to unlock it.</p>
        <a className="btn primary" href={href("")}>
          Back to your path
        </a>
      </div>
    </div>
  );
}

function LessonDeck({ lessonId }: { lessonId: string }) {
  const p = useProgress();
  const l = lessonById[lessonId];
  const cards = cardsByLesson[lessonId];
  const groups = [...new Set(cards.map((c) => c.group))];
  const [view, setView] = useState<"study" | "list">("study");
  const [group, setGroup] = useState<string>("all");
  const [session, setSession] = useState<Card[] | null>(null);
  const [q, setQ] = useState("");

  const pool = group === "all" ? cards : cards.filter((c) => c.group === group);
  const unseen = newCards(pool, p);
  const due = dueCards(pool, p);

  const start = (list: Card[]) => setSession(list.slice(0, config.newCardsPerDay));

  if (session)
    return (
      <Session
        title={l.title}
        cards={session}
        onExit={() => setSession(null)}
        exitLabel="Back to the deck"
      />
    );

  const shown = pool.filter((c) => !q || (c.hu + " " + c.en).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="stack-lg">
      <PageHead title={l.title} sub={`${cards.length} cards · ${l.titleEn}`} back={href("vocab")} />
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={view === "study"} onClick={() => setView("study")}>
          Study
        </button>
        <button role="tab" aria-selected={view === "list"} onClick={() => setView("list")}>
          Word list
        </button>
      </div>
      <div className="chips scroll" role="group" aria-label="Card groups">
        <button className={"chip btnchip" + (group === "all" ? " sel" : "")} onClick={() => setGroup("all")}>
          All
        </button>
        {groups.map((g) => (
          <button key={g} className={"chip btnchip" + (group === g ? " sel" : "")} onClick={() => setGroup(g)}>
            {g.split(" · ")[1] ?? g}
          </button>
        ))}
      </div>

      {view === "study" ? (
        <div className="stack">
          <button className="study-option" disabled={!unseen.length} onClick={() => start(unseen)}>
            <span className="so-num">{unseen.length}</span>
            <span>
              <strong>Learn new cards</strong>
              <span className="muted">
                {unseen.length ? `Up to ${config.newCardsPerDay} per session` : "You've seen every card here"}
              </span>
            </span>
          </button>
          <button className="study-option" disabled={!due.length} onClick={() => start(shuffle(due))}>
            <span className="so-num">{due.length}</span>
            <span>
              <strong>Review due cards</strong>
              <span className="muted">Cards scheduled for today</span>
            </span>
          </button>
          <button className="study-option" onClick={() => setSession(shuffle(pool))}>
            <span className="so-num">
              <Icon name="repeat" />
            </span>
            <span>
              <strong>Practice everything</strong>
              <span className="muted">All {pool.length} cards, shuffled</span>
            </span>
          </button>
        </div>
      ) : (
        <div className="stack">
          <label className="search">
            <Icon name="search" size={18} />
            <input id="vocab-search" type="search" placeholder="Search Hungarian or English" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <ul className="word-list">
            {shown.map((c) => (
              <li key={c.id}>
                <SpeakButton text={c.hu} small />
                <div className="wl-main">
                  <strong lang="hu">{c.hu}</strong>
                  <Meaning en={c.en} ro={c.ro} />
                  {c.note && <em>{c.note}</em>}
                </div>
                {p.cards[c.id]?.seen && <Icon name="check" size={16} title="Seen" />}
              </li>
            ))}
            {!shown.length && <Empty>No cards match “{q}”.</Empty>}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReviewSession() {
  const p = useProgress();
  const [cards] = useState(() => shuffle(dueCards(unlockedLessons(p).flatMap((l) => cardsByLesson[l.id]), p)));
  if (!cards.length)
    return (
      <div className="stack">
        <PageHead title="Spaced review" back={href("vocab")} />
        <MascotSays mood="happy">
          <strong>All caught up!</strong>
          <span>No cards are due. Learn new words in a lesson, or come back tomorrow.</span>
        </MascotSays>
        <a className="btn primary" href={href("vocab")}>
          Choose a lesson
        </a>
      </div>
    );
  return <Session title="Spaced review" cards={cards} onExit={() => (location.hash = "#/vocab")} exitLabel="Done" />;
}

/** One flashcard session. Rating a card schedules its next review. */
export function Session({ title, cards, onExit, exitLabel }: { title: string; cards: Card[]; onExit: () => void; exitLabel: string }) {
  const p = useProgress();
  const [queue, setQueue] = useState(cards);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [again, setAgain] = useState(0);
  const [dir, setDir] = useState(p.settings.direction);
  const total = cards.length;
  const card = queue[0];
  const done = !card;

  const rate = (r: Rating) => {
    if (!card) return;
    const prev = getState().cards[card.id];
    update((d) => void (d.cards[card.id] = schedule(prev, r)));
    addXp(r === "again" ? 1 : 2);
    bump("card");
    if (r !== "again" && !prev?.reps && card.lessonId.startsWith("dict:")) bump("dict");
    sfx(r === "again" ? "tap" : "good");
    setReviewed((n) => n + 1);
    setFlipped(false);
    if (r === "again") {
      setAgain((n) => n + 1);
      setQueue((qq) => {
        const rest = qq.slice(1);
        rest.splice(Math.min(3, rest.length), 0, card);
        return rest;
      });
    } else setQueue((qq) => qq.slice(1));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && e.key === "1") rate("again");
      else if (flipped && e.key === "2") rate("good");
      else if (flipped && e.key === "3") rate("easy");
      else if (e.key.toLowerCase() === "s" && card) speak(card.hu);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const state = card ? p.cards[card.id] : undefined;
  const front = useMemo(() => (card ? (dir === "hu" ? card.hu : card.en) : ""), [card, dir]);

  if (done)
    return (
      <div className="stack-lg">
        <PageHead title={title} />
        <MascotSays mood="party">
          <strong>{cheer()}</strong>
          <span>
            You went through {total} card{total > 1 ? "s" : ""}
            {again ? `, and repeated ${again} tricky one${again > 1 ? "s" : ""}` : ""}. They'll come back when it's time to review.
          </span>
        </MascotSays>
        <button className="btn primary" onClick={onExit}>
          {exitLabel}
        </button>
      </div>
    );

  return (
    <div className="stack session">
      <div className="session-top">
        <button className="icon-btn" onClick={onExit} aria-label="Leave session">
          <Icon name="x" />
        </button>
        <div className="bar" aria-label={`${reviewed} reviewed`}>
          <i style={{ width: `${Math.min(100, (reviewed / (total + again)) * 100)}%` }} />
        </div>
        <button className="chip btnchip" onClick={() => setDir(dir === "hu" ? "en" : "hu")} aria-label="Switch card direction">
          {dir === "hu" ? "HU → EN" : "EN → HU"}
        </button>
      </div>

      <div className="flip-stage">
        <button
          className={"flip-card" + (flipped ? " flipped" : "")}
          onClick={() => {
            sfx("flip");
            setFlipped((f) => !f);
          }}
          aria-label="Flip card"
        >
          <div className="face front">
            <span className="face-label">{card.group.split(" · ")[1] ?? card.group}</span>
            <span className="face-word" lang={dir === "hu" ? "hu" : "en"}>
              {front}
            </span>
            {!state?.seen && <span className="new-badge">New</span>}
            <span className="face-hint">Tap to flip</span>
          </div>
          <div className="face back">
            <span className="face-label">{dir === "hu" ? "English" : "Magyar"}</span>
            <span className="face-small" lang={dir === "hu" ? "hu" : "en"}>
              {dir === "hu" ? card.hu : card.en}
            </span>
            <span className="face-word">{dir === "hu" ? card.en : card.hu}</span>
            {p.settings.showRo && card.ro && (
              <span className="face-ro" lang="ro">
                <abbr title="Romanian">RO</abbr> {card.ro}
              </span>
            )}
            {card.note && <span className="face-note">{card.note}</span>}
          </div>
        </button>
        <div className="flip-speak">
          <SpeakButton text={card.hu} />
        </div>
      </div>

      {flipped ? (
        <div className="rate-row">
          <button className="rate again" onClick={() => rate("again")}>
            <strong>Again</strong>
            <span>{nextLabel(state, "again")}</span>
          </button>
          <button className="rate good" onClick={() => rate("good")}>
            <strong>Good</strong>
            <span>{nextLabel(state, "good")}</span>
          </button>
          <button className="rate easy" onClick={() => rate("easy")}>
            <strong>Easy</strong>
            <span>{nextLabel(state, "easy")}</span>
          </button>
        </div>
      ) : (
        <button className="btn primary block" onClick={() => setFlipped(true)}>
          Show answer
        </button>
      )}
      <p className="muted small-print center desktop-only">Space flips · 1 Again · 2 Good · 3 Easy · S listen</p>
    </div>
  );
}
