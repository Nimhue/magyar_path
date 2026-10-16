import { useEffect, useState } from "react";
import { allCards, config, lessons } from "../content";
import { Icon, PageHead } from "../components/ui";
import { href } from "../lib/router";
import { canSpeak, hungarianVoices, isEdge, onVoices, platform, speak } from "../lib/speech";
import { exportProgress, importProgress, resetProgress, update, useProgress } from "../lib/store";
import { PALETTES } from "../lib/themes";
import { AccountPanel } from "./Devices";
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

  return (
    <div className="stack-lg">
      <PageHead title="Beállítások" sub="Settings" back={href("")} />

      <AccountPanel />
      <a className="cta" href={href("devices")}>
        <span className="cta-kicker">Phone → laptop</span>
        <span className="cta-title">Move to another device with a code</span>
        <Icon name="back" />
      </a>

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
        <h2 className="section-title">Colour theme</h2>
        <div className="palette-grid" role="radiogroup" aria-label="Colour theme">
          {PALETTES.map((pal) => (
            <button
              key={pal.id}
              role="radio"
              aria-checked={p.settings.palette === pal.id}
              className={"palette" + (p.settings.palette === pal.id ? " sel" : "")}
              onClick={() => update((d) => void (d.settings.palette = pal.id))}
            >
              <span className="swatches-row" aria-hidden="true">
                {pal.swatch.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <strong lang="hu">{pal.name}</strong>
              <span className="muted small-print">{pal.nameEn}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel stack">
        <h2 className="section-title">Learning</h2>
        <label className="toggle">
          <input
            id="set-ro"
            type="checkbox"
            checked={p.settings.showRo}
            onChange={(e) => update((d) => void (d.settings.showRo = e.target.checked))}
          />
          <span>
            <strong>Show Romanian meanings</strong>
            <span className="muted small-print">Under the English on flashcards, word lists and feedback</span>
          </span>
        </label>
        <label className="toggle">
          <input
            id="set-sound"
            type="checkbox"
            checked={p.settings.sound}
            onChange={(e) => update((d) => void (d.settings.sound = e.target.checked))}
          />
          <span>
            <strong>Sound effects</strong>
            <span className="muted small-print">Little chimes for right and wrong answers</span>
          </span>
        </label>
        <a className="linkish" href={href("me")}>
          <Icon name="trophy" size={16} /> Trophies, study buddy and wardrobe
        </a>
      </section>

      <VoicePanel />

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

const HOW: Record<string, { title: string; steps: string[] }> = {
  windows: {
    title: "On Windows",
    steps: [
      "Easiest: open this site in Microsoft Edge. It comes with natural-sounding Hungarian voices (Noémi and Tamás).",
      "Or install one for every browser: Settings → Time & language → Speech → Manage voices → Add voices → Magyar (Hungarian). Then restart the browser.",
      "Chrome and Opera don't always show Windows voices. If it still sounds English there, use Edge for listening practice.",
    ],
  },
  mac: {
    title: "On a Mac",
    steps: ["System Settings → Accessibility → Spoken Content → System voice → Manage Voices… → Hungarian (Tünde) → download.", "Restart the browser."],
  },
  ios: {
    title: "On iPhone or iPad",
    steps: ["Settings → Accessibility → Spoken Content → Voices → Hungarian → download Tünde (pick the Enhanced one if offered).", "Close and reopen the browser."],
  },
  android: {
    title: "On Android",
    steps: [
      "Settings → System → Languages → Text-to-speech output → Speech Services by Google (gear icon) → Install voice data → Magyar (Hungarian).",
      "Reopen Chrome.",
    ],
  },
  linux: { title: "On Linux", steps: ["Install a Hungarian voice for speech-dispatcher (e.g. espeak-ng), or use Chrome with Google voices."] },
  other: { title: "On this device", steps: ["Look for text-to-speech settings and add a Hungarian (Magyar) voice, then reopen the browser."] },
};

function VoicePanel() {
  const p = useProgress();
  const [list, setList] = useState(hungarianVoices());
  useEffect(() => {
    const off = onVoices(() => setList(hungarianVoices()));
    return () => void off();
  }, []);
  const how = HOW[platform()];
  return (
    <section className="panel stack">
      <h2 className="section-title">Hungarian voice</h2>
      {!canSpeak() ? (
        <p className="muted">This browser can't speak text aloud.</p>
      ) : list.length ? (
        <>
          <p>
            {list.length} Hungarian voice{list.length > 1 ? "s" : ""} found on this device.
            {platform() === "windows" && !isEdge() && !list.some((v) => /natural|online/i.test(v.name))
              ? " For the most natural sound, try Microsoft Edge."
              : ""}
          </p>
          <label className="field">
            <span>Voice</span>
            <select
              id="set-voice"
              value={p.settings.voice}
              onChange={(e) => {
                update((d) => void (d.settings.voice = e.target.value));
                setTimeout(() => speak("Szia! Jó napot kívánok!"), 50);
              }}
            >
              <option value="">Automatic (best available)</option>
              {list.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <div className="stack">
          <p className="warn-text">
            This device has no Hungarian voice, so the app stays quiet rather than reading Hungarian with an English accent. Listening
            questions are skipped until you add one.
          </p>
          <div className="voice-how">
            <strong>{how.title}</strong>
            <ol>
              {how.steps.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
      <button className="btn small" onClick={() => speak("Jó napot kívánok! Örülök, hogy itt vagy.")} disabled={!list.length}>
        <Icon name="speaker" size={16} /> Test voice
      </button>
    </section>
  );
}
