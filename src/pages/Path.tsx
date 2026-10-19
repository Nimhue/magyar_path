import { allCards, cardsByLesson, config, lessons } from "../content";
import { JourneyMap } from "../components/JourneyMap";
import { QuestCard } from "./Practice";
import { useState } from "react";
import { cloudAvailable, useCloud } from "../lib/cloud";
import { MascotSays, mascotName } from "../components/Mascot";
import { Icon, Meaning, Ring, SpeakButton } from "../components/ui";
import { currentLesson, isUnlocked, lessonStatus, unlockedLessons } from "../lib/progress";
import { href } from "../lib/router";
import { dueCards } from "../lib/srs";
import { levelFor, liveStreak, useProgress, type Progress } from "../lib/store";
import type { Lesson } from "../content/schema";
import { CATS, factOfDay, wordOfDay } from "../lib/discover";



const DAILY_GOAL = 50;

export function nextStep(l: Lesson, p: Progress): { label: string; to: string } {
  const st = lessonStatus(l, p);
  if (st.cardsSeen < st.cardsTotal)
    return { label: `Learn the words (${st.cardsTotal - st.cardsSeen} new)`, to: `vocab/${l.id}` };
  if ((st.quizBest ?? 0) < config.quizPassMark) return { label: "Take the lesson quiz", to: `quiz/${l.id}` };
  if (st.drillsDone < st.drillsTotal) return { label: "Finish the grammar drills", to: `drills/${l.id}` };
  if (st.readingsDone < st.readingsTotal) return { label: "Bonus: read a short text", to: `read/${l.readings[0]}` };
  if (l.stories.some((s) => !p.stories[s])) return { label: "Bonus: play the story", to: `story/${l.stories.find((s) => !p.stories[s])}` };
  if (!p.boss[l.id]?.won) return { label: "Bonus: beat the boss", to: `quiz/boss/${l.id}` };
  return { label: "Review the lesson", to: `lesson/${l.id}` };
}

function fmtDate(d?: string) {
  if (!d) return "Self-study";
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function PathPage() {
  const p = useProgress();
  const cur = currentLesson(p);
  const step = nextStep(cur, p);
  const due = dueCards(unlockedLessons(p).flatMap((l) => cardsByLesson[l.id]), p).length;
  const learned = allCards.filter((c) => (p.cards[c.id]?.reps ?? 0) > 0).length;
  const lvl = levelFor(p.xp);
  const streak = liveStreak(p);
  const mistakes = Object.keys(p.mistakes).length;
  const hour = new Date().getHours();
  const hello = hour < 10 ? "Jó reggelt" : hour < 18 ? "Szia" : "Jó estét";
  const name = p.settings.name ? `, ${p.settings.name}` : "";

  return (
    <div className="stack-lg">
      <section className="hero">
        <MascotSays mood={p.daily.xp >= DAILY_GOAL ? "party" : "happy"}>
          <strong>
            {hello}
            {name}!
          </strong>
          <span>
            {p.daily.xp >= DAILY_GOAL
              ? "Daily goal reached. Ügyes vagy!"
              : p.xp === 0
                ? `I'm ${mascotName(p.settings.mascot)}. Let's learn Hungarian, one lesson at a time.`
                : `${DAILY_GOAL - p.daily.xp} XP to today's goal.`}
          </span>
        </MascotSays>
        <div className="hero-stats">
          <div className="hs">
            <Ring value={p.daily.xp / DAILY_GOAL} size={52} stroke={6}>
              <Icon name="bolt" size={18} />
            </Ring>
            <div>
              <b>
                {Math.min(p.daily.xp, DAILY_GOAL)}/{DAILY_GOAL}
              </b>
              <span>today</span>
            </div>
          </div>
          <div className="hs">
            <span className={"big-icon flame" + (streak ? " on" : "")}>
              <Icon name="flame" size={26} />
            </span>
            <div>
              <b>{streak}</b>
              <span>day streak</span>
            </div>
          </div>
          <div className="hs">
            <span className="big-icon star">
              <Icon name="star" size={26} />
            </span>
            <div>
              <b>Lv {lvl.level}</b>
              <span>{p.xp} XP</span>
            </div>
          </div>
          <div className="hs">
            <span className="big-icon cards">
              <Icon name="cards" size={24} />
            </span>
            <div>
              <b>{learned}</b>
              <span>words learned</span>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-grid">
        <a className="cta primary" href={href(step.to)}>
          <span className="cta-kicker">
            Lesson {cur.order} · {cur.title}
          </span>
          <span className="cta-title">{step.label}</span>
          <Icon name="back" />
        </a>
        <a className={"cta" + (due ? " due" : "")} href={href("vocab/review")}>
          <span className="cta-kicker">Spaced review</span>
          <span className="cta-title">{due ? `${due} card${due > 1 ? "s" : ""} to review` : "All caught up"}</span>
          <Icon name="back" />
        </a>
        {mistakes > 0 && (
          <a className="cta warn" href={href("quiz/mistakes")}>
            <span className="cta-kicker">Mistake notebook</span>
            <span className="cta-title">Fix {mistakes} tricky word{mistakes > 1 ? "s" : ""}</span>
            <Icon name="back" />
          </a>
        )}
      </section>

      <SaveBanner />

      <QuestCard />

      <JourneyMap />

      <section>
        <h2 className="section-title">Your path</h2>
        <ol className="path">
          {lessons.map((l, i) => {
            const open = isUnlocked(l.id, p);
            const st = lessonStatus(l, p);
            const state = !open ? "locked" : st.complete ? "done" : l.id === cur.id ? "current" : "open";
            const body = (
              <>
                <div className={"node " + state}>
                  {state === "locked" ? <Icon name="lock" size={18} /> : state === "done" ? <Icon name="check" size={20} /> : l.order}
                </div>
                <div className="path-card">
                  <div className="path-meta">
                    <span>
                      {fmtDate(l.date)}
                      {l.place ? ` · ${l.place.name}` : ""}
                    </span>
                    <span className="lvl">
                      {p.boss[l.id]?.won && (
                        <span className="crown" title="Boss beaten">
                          <Icon name="crown" size={14} />
                        </span>
                      )}
                      {l.level}
                    </span>
                  </div>
                  <strong className="path-title">{l.title}</strong>
                  <span className="muted">{l.titleEn}</span>
                  {open ? (
                    <div className="chips">
                      <span className={"chip" + (st.cardsSeen === st.cardsTotal ? " ok" : "")}>
                        <Icon name="cards" size={14} /> {st.cardsSeen}/{st.cardsTotal}
                      </span>
                      <span className={"chip" + ((st.quizBest ?? 0) >= config.quizPassMark ? " ok" : "")}>
                        <Icon name="quiz" size={14} /> {st.quizBest === null ? "—" : `${st.quizBest}%`}
                      </span>
                      <span className={"chip" + (st.drillsDone === st.drillsTotal ? " ok" : "")}>
                        <Icon name="pencil" size={14} /> {st.drillsDone}/{st.drillsTotal}
                      </span>
                    </div>
                  ) : (
                    <span className="lock-note">Finish lesson {lessons[i - 1].order} to unlock</span>
                  )}
                </div>
              </>
            );
            return (
              <li key={l.id} className={"path-step " + state}>
                {open ? (
                  <a href={href(`lesson/${l.id}`)} className="path-link">
                    {body}
                  </a>
                ) : (
                  <div className="path-link" aria-disabled="true">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <OfTheDay />
    </div>
  );
}

/** Word and fact of the day: a little extra after the study path. */
function OfTheDay() {
  const p = useProgress();
  const w = wordOfDay(p);
  const f = factOfDay();
  return (
    <section className="stack">
      <h2 className="section-title">Ma · Today's extras</h2>
      <div className="otd-grid">
        {w && (
          <div className="otd word">
            <span className="otd-kicker">
              <Icon name="star" size={14} /> A nap szava · Word of the day
            </span>
            <div className="row gap">
              <strong lang="hu" className="otd-word">
                {w.hu}
              </strong>
              <SpeakButton text={w.hu} small />
            </div>
            <Meaning en={w.en} ro={w.ro} />
            {w.note && <span className="muted small-print">{w.note}</span>}
          </div>
        )}
        {f && (
          <a className={`otd fact tone-${CATS[f.place.category].tone}`} href={href(`discover/${f.place.id}`)}>
            <span className="otd-kicker">
              <Icon name="bulb" size={14} /> A nap ténye · Fact of the day
            </span>
            <span className="otd-fact">{f.en}</span>
            {p.settings.showRo && (
              <span className="ro small-print" lang="ro">
                {f.ro}
              </span>
            )}
            <span className="otd-more">
              {f.place.name}: read the story <Icon name="next" size={14} />
            </span>
          </a>
        )}
      </div>
      <a className="cta discover-cta" href={href("kultura")}>
        <span className="cta-kicker">Kultúra · when you want a break</span>
        <span className="cta-title">Discover Hungary: legends, songs, sayings and recipes</span>
        <Icon name="compass" />
      </a>
    </section>
  );
}

function SaveBanner() {
  const p = useProgress();
  const cloud = useCloud();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem("magyar-path:hide-save") === "1";
    } catch {
      return false;
    }
  });
  if (hidden || cloud.session || !cloudAvailable() || p.xp < 20) return null;
  return (
    <aside className="save-banner">
      <Icon name="heart" size={20} />
      <div>
        <strong>Keep your streak safe</strong>
        <span>Progress lives only in this browser. A free account (no email) saves it and syncs your phone and laptop.</span>
      </div>
      <div className="row gap">
        <a className="btn primary small" href={href("devices")}>
          Create account
        </a>
        <button
          className="icon-btn"
          aria-label="Hide this"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem("magyar-path:hide-save", "1");
            } catch {
              /* ignore */
            }
          }}
        >
          <Icon name="x" size={18} />
        </button>
      </div>
    </aside>
  );
}
