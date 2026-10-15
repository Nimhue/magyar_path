import { useEffect, useState } from "react";
import { config, exerciseSets, lessonById } from "../content";
import type { ExerciseItem, ExerciseSet } from "../content/schema";
import { LessonPicker } from "../components/LessonPicker";
import { MascotSays } from "../components/Mascot";
import { ChoiceQ, ListenQ, MatchQ, SortQ, TypeQ } from "../components/Questions";
import { Fmt, Icon, PageHead } from "../components/ui";
import { confetti } from "../lib/celebrate";
import { isUnlocked } from "../lib/progress";
import { href } from "../lib/router";
import { addXp, getState, update, useProgress } from "../lib/store";
import { Locked } from "./Vocab";

export function DrillsPage({ args }: { args: string[] }) {
  const p = useProgress();
  const [lessonId, setId] = args;
  if (lessonId) {
    const l = lessonById[lessonId];
    if (!l) return <PageHead title="Lesson not found" back={href("drills")} />;
    if (!isUnlocked(l.id, p)) return <Locked back="drills" />;
    if (setId && exerciseSets[setId]) return <DrillWrapper key={setId} set={exerciseSets[setId]} />;
    return (
      <div className="stack-lg">
        <PageHead title={l.title} sub="Grammar drills" back={href("drills")} />
        <p className="muted">Score {config.drillPassMark}% or more on each set to pass it.</p>
        <ul className="steps">
          {l.exercises.map((id) => {
            const s = exerciseSets[id];
            const r = p.drills[id];
            return (
              <li key={id}>
                <a className={"step" + (r?.done ? " done" : "")} href={href(`drills/${l.id}/${id}`)}>
                  <span className="step-icon">{r?.done ? <Icon name="check" /> : <Icon name="pencil" />}</span>
                  <span className="step-text">
                    <strong>{s.title}</strong>
                    <span className="muted">
                      {s.titleEn} · {s.items.length} questions{r ? ` · best ${r.best}%` : ""}
                    </span>
                  </span>
                  <Icon name="back" size={16} />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  return (
    <div className="stack-lg">
      <PageHead title="Gyakorlás" sub="Grammar drills · short exercises for each grammar point" />
      <LessonPicker
        hrefFor={(id) => href(`drills/${id}`)}
        detail={(id) => {
          const sets = lessonById[id].exercises;
          return `${sets.filter((s) => p.drills[s]?.done).length}/${sets.length} sets passed`;
        }}
      />
    </div>
  );
}

function DrillWrapper({ set }: { set: ExerciseSet }) {
  const [round, setRound] = useState(0);
  return <DrillRun key={round} set={set} onRestart={() => setRound((r) => r + 1)} />;
}

function DrillRun({ set, onRestart }: { set: ExerciseSet; onRestart: () => void }) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const total = set.items.length;
  const done = i >= total;
  const pct = Math.round((score / total) * 100);
  const passed = pct >= config.drillPassMark;

  useEffect(() => {
    if (!done) return;
    const prev = getState().drills[set.id];
    update((d) => void (d.drills[set.id] = { best: Math.max(prev?.best ?? 0, pct), done: !!prev?.done || passed }));
    if (passed && !prev?.done) addXp(15);
    if (passed) confetti();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const next = (ok: boolean) => {
    if (ok) {
      setScore((s) => s + 1);
      addXp(3);
    }
    setI((n) => n + 1);
  };

  const back = href(`drills/${set.lesson}`);

  if (done)
    return (
      <div className="stack-lg">
        <PageHead title={set.title} sub={set.titleEn} back={back} />
        <div className="score-card">
          <div className={"score-big" + (passed ? " ok" : "")}>{pct}%</div>
          <p>
            {score} of {total} correct
          </p>
        </div>
        <MascotSays mood={passed ? "party" : "neutral"}>
          <strong>{passed ? "Ügyes vagy!" : "Még egyszer?"}</strong>
          <span>{passed ? "Set passed." : `You need ${config.drillPassMark}% to pass. One more try?`}</span>
        </MascotSays>
        <div className="row gap wrap">
          <button className="btn primary" onClick={onRestart}>
            Try again
          </button>
          <a className="btn" href={back}>
            All drills
          </a>
          <a className="btn" href={href(`lesson/${set.lesson}`)}>
            Back to lesson
          </a>
        </div>
      </div>
    );

  return (
    <div className="stack session">
      <div className="session-top">
        <a className="icon-btn" href={back} aria-label="Leave drill">
          <Icon name="x" />
        </a>
        <div className="bar">
          <i style={{ width: `${(i / total) * 100}%` }} />
        </div>
        <span className="muted tabnum">
          {i + 1}/{total}
        </span>
      </div>
      {i === 0 && set.intro && (
        <p className="intro-line">
          <Fmt text={set.intro} />
        </p>
      )}
      <ItemView key={i} item={set.items[i]} onNext={next} />
    </div>
  );
}

function ItemView({ item, onNext }: { item: ExerciseItem; onNext: (ok: boolean) => void }) {
  switch (item.type) {
    case "choice":
      return (
        <ChoiceQ
          prompt={<span className="prompt-text">{item.prompt}</span>}
          sub={item.promptEn}
          options={item.options}
          answer={item.answer}
          explain={item.explain}
          onNext={onNext}
        />
      );
    case "type":
      return (
        <TypeQ
          prompt={<span className="prompt-text">{item.prompt}</span>}
          sub={item.promptEn}
          answer={item.answer}
          hint={item.hint}
          explain={item.explain}
          onNext={onNext}
        />
      );
    case "listen":
      return <ListenQ say={item.say} options={item.options} answer={item.answer} explain={item.explain} onNext={onNext} />;
    case "sort":
      return (
        <SortQ
          prompt={<span className="prompt-text">{item.prompt}</span>}
          buckets={item.buckets}
          items={item.items}
          explain={item.explain}
          onNext={onNext}
        />
      );
    case "match":
      return (
        <MatchQ prompt={<span className="prompt-text">{item.prompt}</span>} pairs={item.pairs} explain={item.explain} onNext={(ok) => onNext(ok)} />
      );
  }
}
