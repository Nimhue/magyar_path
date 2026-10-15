import { useEffect, useState } from "react";
import { allCards, config, lessons } from "../content";
import { Icon, PageHead } from "../components/ui";
import { href } from "../lib/router";
import { canSpeak, hasHungarianVoice, onVoices, speak } from "../lib/speech";
import { exportProgress, importProgress, resetProgress, update, useProgress } from "../lib/store";
import { download } from "./Notes";

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text.normalize("NFC").trim().toLowerCase()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function SettingsPage() {
  const p = useProgress();
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [voice, setVoice] = useState(hasHungarianVoice());
  useEffect(() => {
    const off = onVoices(() => setVoice(hasHungarianVoice()));
    return () => void off();
  }, []);

  return (
    <div className="stack-lg">
      <PageHead title="Beállítások" sub="Settings" back={href("")} />

      <section className="panel stack">
        <h2 className="section-title">You</h2>
        <label className="field">
          <span>Your name (for greetings)</span>
          <input
            id="set-name"
            value={p.settings.name}
            placeholder="e.g. Anna"
            onChange={(e) => update((d) => void (d.settings.name = e.target.value))}
          />
        </label>
        <div className="field">
          <span>Theme</span>
          <div className="seg">
            {(["system", "light", "dark"] as const).map((t) => (
              <button key={t} aria-selected={p.settings.theme === t} onClick={() => update((d) => void (d.settings.theme = t))}>
                {t === "system" ? "Auto" : t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Flashcards start with</span>
          <div className="seg">
            <button aria-selected={p.settings.direction === "hu"} onClick={() => update((d) => void (d.settings.direction = "hu"))}>
              Hungarian
            </button>
            <button aria-selected={p.settings.direction === "en"} onClick={() => update((d) => void (d.settings.direction = "en"))}>
              English
            </button>
          </div>
        </div>
      </section>

      <section className="panel stack">
        <h2 className="section-title">Pronunciation</h2>
        {!canSpeak() ? (
          <p className="muted">This browser can't speak text aloud.</p>
        ) : voice ? (
          <p>A Hungarian voice is installed on this device.</p>
        ) : (
          <p className="warn-text">
            No Hungarian voice found. Audio will use a default voice and sound wrong. On iPhone: Settings → Accessibility → Spoken Content →
            Voices → Hungarian. On Android: install Hungarian in Google text-to-speech. Listening questions are skipped in quizzes until a
            voice is available.
          </p>
        )}
        <button className="btn small" onClick={() => speak("Jó napot kívánok! Örülök, hogy itt vagy.")} disabled={!canSpeak()}>
          <Icon name="speaker" size={16} /> Test voice
        </button>
      </section>

      <section className="panel stack">
        <h2 className="section-title">Teacher mode</h2>
        {p.teacher ? (
          <>
            <p>Teacher mode is on: every lesson is unlocked on this device.</p>
            <button className="btn small" onClick={() => update((d) => void (d.teacher = false))}>
              Turn off teacher mode
            </button>
          </>
        ) : (
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = (await sha256(code)) === config.teacherCodeHash;
              if (ok) {
                update((d) => void (d.teacher = true));
                setCode("");
                setCodeMsg(null);
              } else setCodeMsg("That code isn't right.");
            }}
          >
            <p className="muted">Teachers can unlock every lesson to preview or assign them.</p>
            <label className="field">
              <span>Teacher code</span>
              <input id="teacher-code" type="password" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
            </label>
            {codeMsg && <p className="warn-text">{codeMsg}</p>}
            <button className="btn small" disabled={!code.trim()}>
              Unlock all lessons
            </button>
          </form>
        )}
      </section>

      <section className="panel stack">
        <h2 className="section-title">Your progress</h2>
        <p className="muted">
          {p.xp} XP · {Object.values(p.cards).filter((c) => c.seen).length} of {allCards.length} cards seen · {lessons.length} lessons. Progress is
          saved in this browser only. Download it to move to another device.
        </p>
        <div className="row gap wrap">
          <button className="btn small" onClick={() => download(`magyar-progress-${new Date().toISOString().slice(0, 10)}.json`, exportProgress())}>
            <Icon name="download" size={16} /> Download progress
          </button>
          <label className="btn small">
            <Icon name="upload" size={16} /> Restore progress
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  importProgress(await f.text());
                  setMsg("Progress restored.");
                } catch (err) {
                  setMsg((err as Error).message);
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {msg && <p className="muted">{msg}</p>}
        {!resetting ? (
          <button className="linkish danger" onClick={() => setResetting(true)}>
            Reset all progress…
          </button>
        ) : (
          <div className="confirm">
            <span>This erases XP, streaks, card history and scores on this device. Notes are kept.</span>
            <div className="row gap">
              <button
                className="btn danger small"
                onClick={() => {
                  resetProgress();
                  setResetting(false);
                  setMsg("Progress reset.");
                }}
              >
                Reset
              </button>
              <button className="btn small" onClick={() => setResetting(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
