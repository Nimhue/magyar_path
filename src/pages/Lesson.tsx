import { config, exerciseSets, grammarById, lessonById, lessons, readings, stories } from "../content";
import { Icon, PageHead, Ring } from "../components/ui";
import { isUnlocked, lessonStatus } from "../lib/progress";
import { href } from "../lib/router";
import { update, useProgress } from "../lib/store";
import { nextStep } from "./Path";

export function LessonPage({ id }: { id?: string }) {
  const p = useProgress();
  const l = id ? lessonById[id] : undefined;
  if (!l) return <PageHead title="Lesson not found" back={href("")} />;
  if (!isUnlocked(l.id, p)) {
    const prev = lessons[lessons.indexOf(l) - 1];
    return (
      <div className="stack">
        <PageHead title={l.title} sub={l.titleEn} back={href("")} />
        <div className="panel center">
          <Icon name="lock" size={32} />
          <p>
            Finish <strong>{prev.title}</strong> first: see every flashcard, score {config.quizPassMark}% on the quiz and
            pass its drills.
          </p>
          <a className="btn primary" href={href(`lesson/${prev.id}`)}>
            Go to lesson {prev.order}
          </a>
        </div>
      </div>
    );
  }
  const st = lessonStatus(l, p);
  const step = nextStep(l, p);
  const quizOk = (st.quizBest ?? 0) >= config.quizPassMark;
  const date = l.date
    ? new Date(l.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })
    : "Self-study unit";

  const steps = [
    {
      done: st.cardsSeen === st.cardsTotal,
      icon: "cards",
      title: "Flashcards",
      detail: `${st.cardsSeen} of ${st.cardsTotal} seen`,
      to: `vocab/${l.id}`,
    },
    {
      done: quizOk,
      icon: "quiz",
      title: "Lesson quiz",
      detail: st.quizBest === null ? `Score ${config.quizPassMark}% or more` : `Best ${st.quizBest}% · need ${config.quizPassMark}%`,
      to: `quiz/${l.id}`,
    },
    {
      done: st.drillsDone === st.drillsTotal,
      icon: "pencil",
      title: "Grammar drills",
      detail: `${st.drillsDone} of ${st.drillsTotal} sets passed`,
      to: `drills/${l.id}`,
    },
  ];

  return (
    <div className="stack-lg">
      <PageHead title={`${l.order}. ${l.title}`} sub={`${l.titleEn} · ${date}`} back={href("")} />
      <div className="panel lesson-intro">
        <Ring value={st.fraction} size={64} stroke={7}>
          <b>{Math.round(st.fraction * 100)}%</b>
        </Ring>
        <div>
          <p>{l.summary}</p>
          {!st.complete && (
            <a className="btn primary small" href={href(step.to)}>
              Next: {step.label}
            </a>
          )}
          {st.complete && <p className="ok-text">Lesson complete. Keep reviewing to remember it.</p>}
        </div>
      </div>

      <section>
        <h2 className="section-title">To finish this lesson</h2>
        <ul className="steps">
          {steps.map((s) => (
            <li key={s.title}>
              <a className={"step" + (s.done ? " done" : "")} href={href(s.to)}>
                <span className="step-icon">{s.done ? <Icon name="check" /> : <Icon name={s.icon} />}</span>
                <span className="step-text">
                  <strong>{s.title}</strong>
                  <span className="muted">{s.detail}</span>
                </span>
                <Icon name="back" size={16} />
              </a>
            </li>
          ))}
        </ul>
      </section>

      {l.place && (
        <section className="panel place-card">
          <span className="cta-kicker">
            <Icon name="map" size={14} /> Stop {l.order} · {l.place.name}
          </span>
          <p>{l.place.fact}</p>
        </section>
      )}

      <section>
        <h2 className="section-title">Bonus challenges</h2>
        <ul className="steps">
          <li>
            <a className={"step boss-step" + (p.boss[l.id]?.won ? " done" : "")} href={href(`quiz/boss/${l.id}`)}>
              <span className="step-icon">{p.boss[l.id]?.won ? <Icon name="crown" /> : <Icon name="sword" />}</span>
              <span className="step-text">
                <strong>Boss challenge</strong>
                <span className="muted">
                  {p.boss[l.id]?.won ? `Beaten · best ${p.boss[l.id].bestHearts}/3 hearts` : "15 mixed questions, 3 hearts, win a crown"}
                </span>
              </span>
              <Icon name="back" size={16} />
            </a>
          </li>
          {l.stories.map((sid) => (
            <li key={sid}>
              <a className={"step" + (p.stories[sid] ? " done" : "")} href={href(`story/${sid}`)}>
                <span className="step-icon">{p.stories[sid] ? <Icon name="check" /> : <Icon name="game" />}</span>
                <span className="step-text">
                  <strong>{stories[sid].title}</strong>
                  <span className="muted">Story · {stories[sid].titleEn}</span>
                </span>
                <Icon name="back" size={16} />
              </a>
            </li>
          ))}
        </ul>
      </section>

      {l.readings.length > 0 && (
        <section>
          <h2 className="section-title">Bonus reading</h2>
          <ul className="steps">
            {l.readings.map((rid) => {
              const r = readings[rid];
              const done = p.readings[rid]?.done;
              return (
                <li key={rid}>
                  <a className={"step" + (done ? " done" : "")} href={href(`read/${rid}`)}>
                    <span className="step-icon">{done ? <Icon name="check" /> : <Icon name="read" />}</span>
                    <span className="step-text">
                      <strong>{r.title}</strong>
                      <span className="muted">{r.titleEn}</span>
                    </span>
                    <Icon name="back" size={16} />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {l.grammar.length > 0 && (
        <section>
          <h2 className="section-title">Grammar in this lesson</h2>
          <div className="chips wrap">
            {l.grammar.map((g) => (
              <a key={g} className="chip link" href={href(`grammar/${g}`)}>
                <Icon name="book" size={14} /> {grammarById[g].titleEn}
              </a>
            ))}
          </div>
        </section>
      )}

      {l.homework.length > 0 && (
        <section>
          <h2 className="section-title">Házi feladat · Homework</h2>
          <ul className="homework">
            {l.homework.map((h, i) => {
              const key = `${l.id}:${i}`;
              return (
                <li key={key}>
                  <label>
                    <input
                      type="checkbox"
                      id={`hw-${key}`}
                      checked={!!p.homework[key]}
                      onChange={(e) => update((d) => void (d.homework[key] = e.target.checked))}
                    />
                    <span>{h}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="muted small-print">
        Drill sets: {l.exercises.map((x) => exerciseSets[x]?.titleEn).join(", ")}
      </p>
    </div>
  );
}
