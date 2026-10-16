import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useProgress } from "../lib/store";
import { canSpeak, speak } from "../lib/speech";

/** Renders **bold** and *italic* inside content strings. */
export function Fmt({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : p.startsWith("*") && p.length > 2 ? (
          <em key={i}>{p.slice(1, -1)}</em>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

const paths: Record<string, ReactNode> = {
  home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  cards: (
    <>
      <rect x="3" y="6" width="13" height="15" rx="2" />
      <path d="M8 3h11a2 2 0 0 1 2 2v12" />
    </>
  ),
  book: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7" />,
  quiz: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5V14M12 17.5v.01" />
    </>
  ),
  pencil: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  read: <path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" />,
  notes: <path d="M5 3h10l4 4v14H5zM15 3v4h4M9 12h6M9 16h6" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  speaker: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  flame: <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z" />,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />,
  back: <path d="M15 5l-7 7 7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  folder: <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  repeat: <path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" />,
  pin: <path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4z" />,
  edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
  download: <path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16" />,
  upload: <path d="M12 21V9m0 0-5 5m5-5 5 5M4 3h16" />,
  trophy: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  game: <path d="M6 9h4M8 7v4M15 10h.01M18 8h.01M7 4h10a5 5 0 0 1 5 5v4a4 4 0 0 1-7 2.6L14 15h-4l-1 .6A4 4 0 0 1 2 13V9a5 5 0 0 1 5-5z" />,
  heart: <path d="M12 21s-7-4.4-9.3-9A5.3 5.3 0 0 1 12 6a5.3 5.3 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z" />,
  map: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" />,
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 22 9.8C22 6 17.5 3 12 3z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7" r="1" />
      <circle cx="15" cy="7" r="1" />
    </>
  ),
  crown: <path d="M3 18h18M4 18 3 7l5 4 4-7 4 7 5-4-1 11" />,
  sword: <path d="M14.5 17.5 21 11V3h-8l-6.5 6.5M13 19l-6-6M16 16l-4 4M8 16l-4 4" />,
};

export function Icon({ name, size = 20, title }: { name: keyof typeof paths | string; size?: number; title?: string }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {paths[name]}
    </svg>
  );
}

export function SpeakButton({ text, small }: { text: string; small?: boolean }) {
  if (!canSpeak()) return null;
  return (
    <button
      type="button"
      className={"speak-btn" + (small ? " small" : "")}
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      aria-label={`Listen: ${text}`}
    >
      <Icon name="speaker" size={small ? 16 : 18} />
    </button>
  );
}

export function Ring({ value, size = 44, stroke = 5, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--action)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

export function PageHead({ title, sub, back }: { title: string; sub?: string; back?: string }) {
  return (
    <div className="page-head">
      {back && (
        <a className="back" href={back} aria-label="Back">
          <Icon name="back" />
        </a>
      )}
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/** English meaning, with the Romanian one underneath when the learner wants it. */
export function Meaning({ en, ro, inline }: { en: string; ro?: string; inline?: boolean }) {
  const p = useProgress();
  const showRo = p.settings.showRo && ro;
  if (inline)
    return (
      <span className="meaning">
        {en}
        {showRo && <span className="ro" lang="ro"> · {ro}</span>}
      </span>
    );
  return (
    <span className="meaning stacked">
      <span>{en}</span>
      {showRo && (
        <span className="ro" lang="ro">
          <abbr title="Romanian">RO</abbr> {ro}
        </span>
      )}
    </span>
  );
}

/** "×3 combo" badge shown during quizzes and games. */
export function ComboBadge({ combo }: { combo: number }) {
  if (combo < 3) return null;
  const mult = comboMultiplier(combo);
  return (
    <span className={"combo" + (combo >= 10 ? " hot" : "")} aria-live="polite" key={combo}>
      <Icon name="flame" size={14} /> {combo} in a row · ×{mult}
    </span>
  );
}

export const comboMultiplier = (combo: number) => (combo >= 10 ? 3 : combo >= 5 ? 2 : 1);

/* ---------- toasts ---------- */
type ToastMsg = { id: number; title: string; body?: string; kind?: "trophy" | "quest" | "info" };
let toastId = 0;
const toastListeners = new Set<(t: ToastMsg) => void>();
export function toast(title: string, body?: string, kind: ToastMsg["kind"] = "info") {
  const t = { id: ++toastId, title, body, kind };
  toastListeners.forEach((l) => l(t));
}

export function Toaster() {
  const [list, setList] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const on = (t: ToastMsg) => {
      setList((l) => [...l, t].slice(-2));
      setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 4200);
    };
    toastListeners.add(on);
    return () => void toastListeners.delete(on);
  }, []);
  return (
    <div className="toasts" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={"toast " + (t.kind ?? "info")}>
          <Icon name={t.kind === "trophy" ? "trophy" : t.kind === "quest" ? "check" : "star"} size={20} />
          <div>
            <strong>{t.title}</strong>
            {t.body && <span>{t.body}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
