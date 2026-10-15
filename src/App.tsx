import { useEffect, useRef, useState } from "react";
import { lessons } from "./content";
import { Puli } from "./components/Mascot";
import { Icon } from "./components/ui";
import { confetti } from "./lib/celebrate";
import { lessonStatus } from "./lib/progress";
import { href, useRoute } from "./lib/router";
import { levelFor, liveStreak, useProgress } from "./lib/store";
import { PathPage } from "./pages/Path";
import { LessonPage } from "./pages/Lesson";
import { VocabPage } from "./pages/Vocab";
import { GrammarPage } from "./pages/Grammar";
import { QuizPage } from "./pages/Quiz";
import { DrillsPage } from "./pages/Drills";
import { ReadingPage } from "./pages/Reading";
import { NotesPage } from "./pages/Notes";
import { SettingsPage } from "./pages/Settings";

const NAV = [
  { id: "", label: "Path", icon: "home" },
  { id: "vocab", label: "Vocab", icon: "cards" },
  { id: "grammar", label: "Grammar", icon: "book" },
  { id: "quiz", label: "Quiz", icon: "quiz" },
  { id: "drills", label: "Drills", icon: "pencil" },
  { id: "read", label: "Read", icon: "read" },
  { id: "notes", label: "Notes", icon: "notes" },
];

function useTheme(theme: "system" | "light" | "dark") {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);
}

/** Celebrates the moment a lesson becomes complete (and the next one unlocks). */
function useLessonCelebration() {
  const p = useProgress();
  const done = lessons.filter((l) => lessonStatus(l, p).complete).map((l) => l.id);
  const prev = useRef<string[] | null>(null);
  const [justDone, setJustDone] = useState<string | null>(null);
  useEffect(() => {
    if (prev.current) {
      const fresh = done.find((id) => !prev.current!.includes(id));
      if (fresh) {
        setJustDone(fresh);
        confetti();
      }
    }
    prev.current = done;
  }, [done.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  return [justDone, () => setJustDone(null)] as const;
}

export function App() {
  const route = useRoute();
  const p = useProgress();
  useTheme(p.settings.theme);
  const [justDone, closeDone] = useLessonCelebration();
  const section = route[0] ?? "";
  const lvl = levelFor(p.xp);
  const streak = liveStreak(p);

  let page;
  switch (section) {
    case "lesson":
      page = <LessonPage id={route[1]} />;
      break;
    case "vocab":
      page = <VocabPage args={route.slice(1)} />;
      break;
    case "grammar":
      page = <GrammarPage id={route[1]} />;
      break;
    case "quiz":
      page = <QuizPage args={route.slice(1)} />;
      break;
    case "drills":
      page = <DrillsPage args={route.slice(1)} />;
      break;
    case "read":
      page = <ReadingPage id={route[1]} />;
      break;
    case "notes":
      page = <NotesPage />;
      break;
    case "settings":
      page = <SettingsPage />;
      break;
    default:
      page = <PathPage />;
  }

  const doneLesson = justDone ? lessons.find((l) => l.id === justDone) : null;
  const nextLesson = doneLesson ? lessons.find((l) => l.order > doneLesson.order) : null;

  return (
    <div className="shell">
      <header className="topbar">
        <a href={href("")} className="brand" aria-label="Magyar Path home">
          <span className="brand-mark">Á</span>
          <span className="brand-name">Magyar Path</span>
        </a>
        <div className="top-stats">
          <span className={"stat-pill streak" + (streak ? " on" : "")} title="Day streak">
            <Icon name="flame" size={16} /> {streak}
          </span>
          <span className="stat-pill xp" title={`Level ${lvl.level}: ${lvl.into}/${lvl.span} XP to next level`}>
            <Icon name="star" size={16} /> Lv {lvl.level}
          </span>
          {p.teacher && <span className="stat-pill teacher">Teacher</span>}
          <a className="icon-btn" href={href("settings")} aria-label="Settings">
            <Icon name="gear" />
          </a>
        </div>
      </header>

      <nav className="nav" aria-label="Sections">
        {NAV.map((n) => (
          <a key={n.id} href={href(n.id)} className={"nav-item" + (section === n.id || (n.id === "" && section === "lesson") ? " active" : "")}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>

      <main className="main">{page}</main>

      {doneLesson && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="done-title">
          <div className="modal">
            <Puli mood="party" size={110} />
            <h2 id="done-title">Lecke kész!</h2>
            <p>
              You finished <strong>{doneLesson.title}</strong>.
              {nextLesson ? (
                <>
                  {" "}
                  <strong>{nextLesson.title}</strong> is now unlocked.
                </>
              ) : (
                " That's every lesson so far. New ones appear after your next class."
              )}
            </p>
            <div className="row gap">
              {nextLesson && (
                <a className="btn primary" href={href(`lesson/${nextLesson.id}`)} onClick={closeDone}>
                  Open next lesson
                </a>
              )}
              <button className="btn" onClick={closeDone}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
