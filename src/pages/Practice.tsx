import { lessons, scenarios } from "../content";
import { Icon, PageHead } from "../components/ui";
import { claimQuest, questProgress, todaysQuests } from "../lib/game";
import { isUnlocked } from "../lib/progress";
import { href } from "../lib/router";
import { sfx } from "../lib/sound";
import { useProgress } from "../lib/store";
import { GameGrid } from "./Games";

export function QuestCard() {
  const p = useProgress();
  const quests = todaysQuests();
  return (
    <section className="panel quests">
      <div className="row between">
        <h2 className="section-title">Napi küldetések · Daily quests</h2>
        <span className="muted small-print">New ones tomorrow</span>
      </div>
      <ul>
        {quests.map((q) => {
          const prog = questProgress(q, p);
          const done = prog >= q.goal;
          const claimed = p.daily.claimed.includes(q.id);
          return (
            <li key={q.id} className={"quest" + (claimed ? " claimed" : done ? " ready" : "")}>
              <div className="quest-main">
                <strong>{q.title}</strong>
                <div className="bar small">
                  <i style={{ width: `${(prog / q.goal) * 100}%` }} />
                </div>
              </div>
              {claimed ? (
                <span className="chip ok">
                  <Icon name="check" size={14} /> +{q.reward} XP
                </span>
              ) : done ? (
                <button
                  className="btn primary small"
                  onClick={() => {
                    sfx("combo");
                    claimQuest(q);
                  }}
                >
                  Claim +{q.reward}
                </button>
              ) : (
                <span className="muted tabnum small-print">
                  {prog}/{q.goal}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const SC_ICON: Record<string, string> = { "sc-jegy": "map", "sc-patika": "plus", "sc-orvos": "heart", "sc-etterem": "bowl", "sc-posta": "notes" };

export function PracticePage() {
  const p = useProgress();
  const mistakes = Object.keys(p.mistakes).length;
  const bossLessons = lessons.filter((l) => isUnlocked(l.id, p));
  return (
    <div className="stack-lg">
      <PageHead title="Gyakorlás" sub="Practice · quizzes, drills, games and boss fights" />
      <QuestCard />

      <section>
        <h2 className="section-title">Játékok · Mini-games</h2>
        <GameGrid />
      </section>

      <section>
        <h2 className="section-title">Kvízek és gyakorlatok · Quizzes and drills</h2>
        <div className="cta-grid">
          <a className="cta" href={href("quiz")}>
            <span className="cta-kicker">Vocabulary</span>
            <span className="cta-title">Lesson quizzes</span>
            <Icon name="back" />
          </a>
          <a className="cta" href={href("drills")}>
            <span className="cta-kicker">Grammar</span>
            <span className="cta-title">Grammar drills</span>
            <Icon name="back" />
          </a>
          <a className="cta speed" href={href("quiz/speed")}>
            <span className="cta-kicker">60-second speed round</span>
            <span className="cta-title">{p.speedBest ? `Best: ${p.speedBest} correct` : "How many can you get?"}</span>
            <Icon name="bolt" />
          </a>
          <a className="cta warn" href={href("quiz/mistakes")}>
            <span className="cta-kicker">Mistake notebook</span>
            <span className="cta-title">{mistakes ? `Fix ${mistakes} tricky word${mistakes > 1 ? "s" : ""}` : "No mistakes saved"}</span>
            <Icon name="back" />
          </a>
        </div>
      </section>

      <section>
        <h2 className="section-title">Számok · Numbers</h2>
        <a className="cta numbers-cta" href={href("numbers")}>
          <span className="cta-kicker">Listen, write, prices, years and the time</span>
          <span className="cta-title">{p.games["numbers"] ? `Numbers trainer · best ${p.games["numbers"].best}/10` : "Numbers trainer"}</span>
          <Icon name="hash" />
        </a>
      </section>

      <section>
        <h2 className="section-title">Túlélőcsomag · Survival pack</h2>
        <p className="muted">Everyday situations in Budapest, always open. Pick what you'd say; slips come with a tip.</p>
        <div className="scenario-grid">
          {scenarios.map((s, i) => {
            const res = p.stories[s.id];
            return (
              <a key={s.id} href={href(`story/${s.id}`)} className={`scenario tone-${["blue", "green", "red", "paprika", "yellow", "purple"][i % 6]}` + (res ? " done" : "")}>
                <span className="sc-icon">
                  <Icon name={SC_ICON[s.id] ?? "chat"} size={22} />
                </span>
                <strong lang="hu">{s.title}</strong>
                <span className="muted small-print">{s.titleEn}</span>
                {res && (
                  <span className="sc-done">
                    <Icon name={res === "great" ? "star" : "check"} size={13} />
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="section-title">Főellenségek · Boss challenges</h2>
        <p className="muted">One per lesson: 15 mixed questions and 3 hearts. Win to put a crown on your path.</p>
        <div className="boss-list">
          {bossLessons.map((l) => {
            const b = p.boss[l.id];
            return (
              <a key={l.id} href={href(`quiz/boss/${l.id}`)} className={"boss-chip" + (b?.won ? " won" : "")}>
                <Icon name={b?.won ? "crown" : "sword"} size={18} />
                <span>
                  {l.order}. {l.title}
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
