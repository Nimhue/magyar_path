import { useEffect, useRef, useState } from "react";
import { lessons } from "./content";
import { Puli } from "./components/Mascot";
import { Icon, Toaster, toast } from "./components/ui";
import { confetti } from "./lib/celebrate";
import { newTrophies } from "./lib/game";
import { lessonStatus } from "./lib/progress";
import { href, useRoute } from "./lib/router";
import { sfx } from "./lib/sound";
import { getState, levelFor, liveStreak, update, useProgress } from "./lib/store";
import { applyTheme, watchSystemTheme } from "./lib/themes";
import { useCloud } from "./lib/cloud";
import { setMissingVoiceHandler } from "./lib/speech";
import { PathPage } from "./pages/Path";
import { LessonPage } from "./pages/Lesson";
import { VocabPage } from "./pages/Vocab";
import { GrammarPage } from "./pages/Grammar";
import { QuizPage } from "./pages/Quiz";
import { DrillsPage } from "./pages/Drills";
import { ReadingPage } from "./pages/Reading";
import { NotesPage } from "./pages/Notes";
import { SettingsPage } from "./pages/Settings";
import { DictionaryPage } from "./pages/Dictionary";
import { PracticePage } from "./pages/Practice";
import { GamesPage } from "./pages/Games";
import { StoryPage } from "./pages/Story";
import { TrophiesPage } from "./pages/Trophies";
import { DevicesPage } from "./pages/Devices";
import { CulturePage } from "./pages/Culture";
import { PlacePage } from "./pages/Place";
import { NumbersPage } from "./pages/Numbers";

const NAV = [
  { id: "", label: "Path", icon: "home", match: ["", "lesson"] },
  { id: "vocab", label: "Vocab", icon: "cards", match: ["vocab"] },
  { id: "dict", label: "Szótár", icon: "globe", match: ["dict"] },
  { id: "practice", label: "Practice", icon: "game", match: ["practice", "quiz", "drills", "play", "numbers"] },
  { id: "grammar", label: "Grammar", icon: "book", match: ["grammar"] },
  { id: "read", label: "Read", icon: "read", match: ["read", "story"] },
  { id: "notes", label: "Notes", icon: "notes", match: ["notes"] },
  { id: "kultura", label: "Kultúra", icon: "compass", match: ["kultura", "discover"] },
];

function useTheme(palette: string, mode: "system" | "light" | "dark") {
  useEffect(() => {
    applyTheme(palette, mode);
    return watchSystemTheme(() => applyTheme(palette, mode));
  }, [palette, mode]);
}

/** Celebrates the moment a lesson becomes complete (and the next one unlocks). */
function useLessonCelebration() {
  const p = useProgress();
  const done = lessons.filter((l) => lessonStatus(l, p).complete).map((l) => l.id);
  const prev = useRef<string[] | null>(null);
  const [justDone, setJustDone] = useState<string | null>(null);
  useEffect(() => {
    if (prev.current && !p.teacher) {
      const fresh = done.find((id) => !prev.current!.includes(id));
      if (fresh) {
        setJustDone(fresh);
        confetti();
        sfx("win");
      }
    }
    prev.current = done;
  }, [done.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  return [justDone, () => setJustDone(null)] as const;
}

/** Records newly earned trophies and level-ups, and shows a toast for each. */
function useRewards() {
  const p = useProgress();
  const lastLevel = useRef(levelFor(p.xp).level);
  useEffect(() => {
    const earned = newTrophies(p);
    if (earned.length) {
      update((d) => {
        for (const t of earned) d.trophies[t.id] = new Date().toISOString();
      });
      earned.forEach((t, i) => setTimeout(() => toast(`Trophy: ${t.titleHu}`, `${t.title}. ${t.desc}`, "trophy"), i * 600));
      sfx("combo");
    }
    const lvl = levelFor(p.xp).level;
    if (lvl > lastLevel.current) {
      toast(`Level ${lvl}!`, "Szintlépés! Check the wardrobe for new outfits.", "info");
      sfx("win");
    }
    lastLevel.current = lvl;
  }, [p]);
}

function SyncDot() {
  const c = useCloud();
  if (!c.session) return null;
  return (
    <a
      href={href("devices")}
      className={"sync-dot " + c.state}
      title={c.state === "error" ? c.message : c.state === "offline" ? "Offline" : c.state === "syncing" ? "Syncing…" : "Synced"}
      aria-label={`Sync status: ${c.state}`}
    >
      <Icon name="repeat" size={16} />
    </a>
  );
}

setMissingVoiceHandler(() =>
  toast("No Hungarian voice on this device", "Settings → Hungarian voice shows how to add one in a minute.", "info")
);

export function App() {
  const route = useRoute();
  const p = useProgress();
  useTheme(p.settings.palette, p.settings.theme);
  useRewards();
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
    case "dict":
      page = <DictionaryPage id={route[1]} />;
      break;
    case "practice":
      page = <PracticePage />;
      break;
    case "play":
      page = <GamesPage args={route.slice(1)} />;
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
    case "story":
      page = <StoryPage id={route[1]} />;
      break;
    case "kultura":
      page = <CulturePage args={route.slice(1)} />;
      break;
    case "discover":
      page = <PlacePage id={route[1]} />;
      break;
    case "numbers":
      page = <NumbersPage mode={route[1]} />;
      break;
    case "notes":
      page = <NotesPage />;
      break;
    case "settings":
      page = <SettingsPage />;
      break;
    case "me":
      page = <TrophiesPage />;
      break;
    case "devices":
      page = <DevicesPage />;
      break;
    case "transfer":
      page = <DevicesPage code={route[1]} />;
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
          <a href={href("me")} className={"stat-pill streak" + (streak ? " on" : "")} title="Day streak">
            <Icon name="flame" size={16} /> {streak}
          </a>
          <a href={href("me")} className="stat-pill xp" title={`Level ${lvl.level}: ${lvl.into}/${lvl.span} XP to next level`}>
            <Icon name="star" size={16} /> Lv {lvl.level}
            <span className="xp-mini" aria-hidden="true">
              <i style={{ width: `${(lvl.into / lvl.span) * 100}%` }} />
            </span>
          </a>
          {p.teacher && <span className="stat-pill teacher">Teacher</span>}
          <SyncDot />
          <a className="icon-btn" href={href("settings")} aria-label="Settings">
            <Icon name="gear" />
          </a>
        </div>
      </header>

      <nav className="nav" aria-label="Sections">
        {NAV.map((n) => (
          <a key={n.id} href={href(n.id)} className={"nav-item" + (n.match.includes(section) ? " active" : "")}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>

      <main className="main">{page}</main>
      <Toaster />

      {doneLesson && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="done-title">
          <div className="modal">
            <Puli mood="party" size={110} />
            <h2 id="done-title">Lecke kész!</h2>
            <p>
              You finished <strong>{doneLesson.title}</strong>
              {doneLesson.place ? (
                <>
                  {" "}
                  and reached <strong>{doneLesson.place.name}</strong>
                </>
              ) : null}
              .
              {nextLesson ? (
                <>
                  {" "}
                  <strong>{nextLesson.title}</strong> is now unlocked
                  {nextLesson.place ? `: next stop ${nextLesson.place.name}` : ""}.
                </>
              ) : (
                " That's every lesson so far. New ones appear after your next class."
              )}
            </p>
            {nextLesson?.place && <p className="muted small-print">{nextLesson.place.fact}</p>}
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

// expose for quick debugging in the browser console
if (import.meta.env.DEV) (window as unknown as { magyar: unknown }).magyar = { getState };
