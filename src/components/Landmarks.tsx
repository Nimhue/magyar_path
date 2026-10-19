/** Little landmark drawings for the journey trail (48 × 48 box). */
import type { ReactNode } from "react";

const W = "var(--lm-light)";

const LANDMARKS: Record<string, ReactNode> = {
  parliament: (
    <>
      <path d="M4 40c4-2 8 2 12 0s8 2 12 0 8 2 12 0 4 2 4 2" stroke="var(--t-blue)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <rect x="6" y="25" width="36" height="11" rx="1.5" />
      <path d="M16 25a8 8 0 0 1 16 0z" />
      <rect x="23" y="11" width="2" height="7" rx="1" />
      <path d="M8 25v-6l2-3 2 3v6zM36 25v-6l2-3 2 3v6z" />
      <path d="M11 29v4M15 29v4M19 29v4M29 29v4M33 29v4M37 29v4" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 36v-5a2 2 0 0 1 4 0v5z" fill={W} />
    </>
  ),
  palace: (
    <>
      <rect x="4" y="24" width="40" height="14" rx="1.5" />
      <path d="M17 24h14l-7-8z" />
      <path d="M21 16a3 3 0 0 1 6 0z" />
      <path d="M8 28v5M12 28v5M16 28v5M32 28v5M36 28v5M40 28v5" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M21 38v-6a3 3 0 0 1 6 0v6z" fill={W} />
      <path d="M4 42h40" stroke="var(--t-green)" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  castle: (
    <>
      <path d="M2 44c6-9 38-9 44 0z" fill="var(--t-green)" />
      <path d="M10 37V19h2v-3h2v3h2v-3h2v3h2v18z" />
      <path d="M20 37V24h18v13z" />
      <path d="M30 24V12h2V9h2v3h2V9h2v3h2v12z" />
      <path d="M14 24v4M34 16v4M25 29v3" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M26 37v-4a3 3 0 0 1 6 0v4z" fill={W} />
    </>
  ),
  village: (
    <>
      <path d="M6 24 24 9l18 15z" />
      <rect x="10" y="24" width="28" height="15" rx="1" />
      <path d="M16 39v-8h5v8z" fill={W} />
      <rect x="26" y="28" width="7" height="6" rx="1" fill={W} />
      <path d="M21 17h6" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <circle cx="6" cy="38" r="2.5" fill="var(--t-pink)" />
      <circle cx="42" cy="37" r="2.5" fill="var(--t-yellow)" />
      <path d="M2 41h44" stroke="var(--t-green)" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  church: (
    <>
      <path d="M18 18 24 3l6 15z" />
      <rect x="19" y="18" width="10" height="21" />
      <rect x="8" y="26" width="32" height="13" rx="1" />
      <path d="M8 26 13 20h6M40 26l-5-6h-6" />
      <circle cx="24" cy="23" r="2" fill={W} />
      <path d="M22 39v-6a2 2 0 0 1 4 0v6z" fill={W} />
      <path d="M12 30v4M36 30v4" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M2 41h44" stroke="var(--t-green)" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  basilica: (
    <>
      <path d="M12 24a12 12 0 0 1 24 0z" />
      <rect x="22.5" y="6" width="3" height="7" rx="1.5" />
      <rect x="11" y="24" width="26" height="15" />
      <path d="M15 27v9M19 27v9M23 27v9M27 27v9M31 27v9" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 39V22l2.5-4 2.5 4v17zM39 39V22l2.5-4 2.5 4v17z" />
      <path d="M2 41h44" stroke="var(--t-blue)" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  fortress: (
    <>
      <path d="M2 44c6-8 38-8 44 0z" fill="var(--t-green)" />
      <path d="M5 37V25h3v-3h3v3h3v-3h3v3h3v12z" />
      <path d="M33 37V14l2-6 2 6v23z" />
      <rect x="31.5" y="17" width="7" height="2" rx="1" />
      <path d="M23 37V28h6v9z" />
      <path d="M10 29v4M15 29v4" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  lake: (
    <>
      <circle cx="37" cy="11" r="5" fill="var(--t-yellow)" />
      <path d="M22 30V8l12 22z" />
      <path d="M20 30V12L11 30z" opacity="0.7" />
      <path d="M10 32h28l-4 5H14z" />
      <path d="M3 41c4-2 7 2 11 0s7 2 11 0 7 2 11 0 7 2 9 1" stroke="var(--t-blue)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
  star: <path d="m24 6 5.5 11.2 12.3 1.8-8.9 8.7 2.1 12.3L24 34.2 13 40l2.1-12.3-8.9-8.7 12.3-1.8z" />,
};

const BY_NAME: Record<string, string> = {
  budapest: "parliament",
  gödöllő: "palace",
  visegrád: "castle",
  hollókő: "village",
  szentendre: "church",
  esztergom: "basilica",
  eger: "fortress",
  balaton: "lake",
};

export function landmarkFor(name: string, icon?: string) {
  if (icon && LANDMARKS[icon]) return icon;
  const n = name.toLowerCase();
  for (const [k, v] of Object.entries(BY_NAME)) if (n.includes(k)) return v;
  return "star";
}

export function Landmark({ kind, x, y, size = 40 }: { kind: string; x: number; y: number; size?: number }) {
  return (
    <svg x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
      {LANDMARKS[kind] ?? LANDMARKS.star}
    </svg>
  );
}
