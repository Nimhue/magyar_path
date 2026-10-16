/** Bodza the puli: a Hungarian sheepdog who cheers you on and dresses up as you level up. */
import type { ReactNode } from "react";
import { currentOutfit } from "../lib/game";
import { useProgress } from "../lib/store";

export type Mood = "happy" | "neutral" | "sad" | "party";

const cords = [18, 26, 34, 42, 50, 58, 66, 74, 82, 90, 98];

function Outfit({ id }: { id: string }) {
  switch (id) {
    case "scarf":
      return (
        <g>
          <rect x="24" y="86" width="72" height="5" rx="2.5" fill="#D93A3A" />
          <rect x="24" y="91" width="72" height="5" fill="#FFFFFF" />
          <rect x="24" y="96" width="72" height="5" rx="2.5" fill="#2A8A56" />
          <path d="M80 96l6 18 7-2-5-17z" fill="#2A8A56" />
          <path d="M80 96l6 18" stroke="#fff" strokeWidth="2" />
        </g>
      );
    case "glasses":
      return (
        <g>
          <rect x="37" y="52" width="22" height="16" rx="6" fill="#11131A" opacity=".88" />
          <rect x="61" y="52" width="22" height="16" rx="6" fill="#11131A" opacity=".88" />
          <path d="M59 58h2" stroke="#11131A" strokeWidth="3" />
          <path d="M41 56l5-2" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".7" />
          <path d="M65 56l5-2" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".7" />
        </g>
      );
    case "kalap":
      return (
        <g>
          <ellipse cx="60" cy="28" rx="36" ry="6" fill="#1E1E24" />
          <path d="M42 28c0-14 6-20 18-20s18 6 18 20z" fill="#2A2A33" />
          <rect x="42" y="21" width="36" height="5" fill="#D93A3A" />
          <path d="M74 20c6-6 10-12 8-18-3 5-7 9-10 12z" fill="#E0A71F" />
        </g>
      );
    case "flowers":
      return (
        <g>
          {[
            [28, 36, "#D7263D"],
            [38, 28, "#F2A900"],
            [50, 23, "#1B4FA0"],
            [62, 22, "#D7263D"],
            [74, 24, "#2A8A56"],
            [85, 30, "#F2A900"],
            [93, 38, "#B565A7"],
          ].map(([x, y, c], i) => (
            <g key={i}>
              <circle cx={x as number} cy={y as number} r="6" fill={c as string} />
              <circle cx={x as number} cy={y as number} r="2.2" fill="#FFF6D6" />
            </g>
          ))}
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M38 32l2-14 10 8 10-12 10 12 10-8 2 14z" fill="#E0A71F" stroke="#A87708" strokeWidth="1.5" />
          <circle cx="50" cy="27" r="2.5" fill="#D93A3A" />
          <circle cx="60" cy="25" r="2.5" fill="#2F6FCB" />
          <circle cx="70" cy="27" r="2.5" fill="#2A8A56" />
          {/* the famously tilted cross */}
          <g transform="rotate(14 60 10)">
            <rect x="58.5" y="2" width="3" height="13" fill="#E0A71F" />
            <rect x="55" y="5.5" width="10" height="3" fill="#E0A71F" />
          </g>
        </g>
      );
    case "pumpkin":
      return (
        <g>
          <ellipse cx="60" cy="30" rx="38" ry="6" fill="#3B2457" />
          <path d="M44 30C46 18 52 4 74 -2c-6 8-8 18-8 32z" fill="#4E2F73" />
          <rect x="45" y="24" width="22" height="5" fill="#EE7A2B" />
        </g>
      );
    case "santa":
      return (
        <g>
          <path d="M34 34c4-18 18-28 36-24 10 2 16 10 18 20z" fill="#D93A3A" />
          <path d="M70 10c12 0 20 6 22 16" stroke="#D93A3A" strokeWidth="8" fill="none" strokeLinecap="round" />
          <circle cx="93" cy="30" r="6" fill="#fff" />
          <rect x="30" y="30" width="62" height="9" rx="4.5" fill="#fff" />
        </g>
      );
    case "bunny":
      return (
        <g>
          <path d="M40 30c-6-14-6-28 2-30 8 2 8 18 6 30z" fill="#F4F0EC" stroke="#E2D8CF" strokeWidth="1.5" />
          <path d="M43 26c-3-9-3-18 0-20 3 2 4 12 3 20z" fill="#F7C6CF" />
          <path d="M80 30c6-14 6-28-2-30-8 2-8 18-6 30z" fill="#F4F0EC" stroke="#E2D8CF" strokeWidth="1.5" />
          <path d="M77 26c3-9 3-18 0-20-3 2-4 12-3 20z" fill="#F7C6CF" />
        </g>
      );
    default:
      return null;
  }
}

const HEADWEAR = new Set(["kalap", "flowers", "crown", "pumpkin", "santa", "bunny"]);

export function Puli({ mood = "happy", size = 88, outfit }: { mood?: Mood; size?: number; outfit?: string }) {
  const p = useProgress();
  const o = outfit ?? currentOutfit(p);
  return (
    <svg className={`puli puli-${mood}`} width={size} height={size} viewBox="0 -6 120 126" role="img" aria-label="Bodza the puli dog">
      <ellipse cx="60" cy="112" rx="38" ry="5" fill="var(--shadow-ink)" />
      <g className="puli-body">
        <path d="M18 70c0-28 18-48 42-48s42 20 42 48v26H18z" fill="var(--puli)" />
        {cords.map((x, i) => (
          <rect
            key={x}
            x={x - 4}
            y={78 + (i % 2) * 3}
            width="9"
            height={26 - (i % 3) * 3}
            rx="4.5"
            fill="var(--puli)"
            stroke="var(--puli-cord)"
            strokeWidth="1.5"
          />
        ))}
        <path d="M22 50c-8 6-10 20-6 30 6-2 10-12 10-24z" fill="var(--puli)" stroke="var(--puli-cord)" strokeWidth="1.5" />
        <path d="M98 50c8 6 10 20 6 30-6-2-10-12-10-24z" fill="var(--puli)" stroke="var(--puli-cord)" strokeWidth="1.5" />
        {mood === "sad" ? (
          <>
            <path d="M42 60q6-5 12 0" stroke="var(--puli-eye)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M66 60q6-5 12 0" stroke="var(--puli-eye)" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : mood === "party" ? (
          <>
            <path d="M42 62q6-8 12 0" stroke="var(--puli-eye)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M66 62q6-8 12 0" stroke="var(--puli-eye)" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="48" cy="60" r="6.5" fill="#fff" />
            <circle cx="72" cy="60" r="6.5" fill="#fff" />
            <circle cx="49" cy="61" r="3.6" fill="#11131A" />
            <circle cx="73" cy="61" r="3.6" fill="#11131A" />
            <circle cx="50.2" cy="59.6" r="1.2" fill="#fff" />
            <circle cx="74.2" cy="59.6" r="1.2" fill="#fff" />
          </>
        )}
        <path
          d="M30 52c4-14 14-22 30-22s26 8 30 22c-4-4-8-5-10-3-2-5-6-7-10-4-2-5-7-6-10-6s-8 1-10 6c-4-3-8-1-10 4-2-2-6-1-10 3z"
          fill="var(--puli)"
          stroke="var(--puli-cord)"
          strokeWidth="1.5"
        />
        <ellipse cx="60" cy="72" rx="6" ry="4.5" fill="#11131A" />
        <circle cx="58" cy="70.5" r="1.3" fill="#fff" opacity=".6" />
        {mood === "sad" ? (
          <path d="M53 84q7-5 14 0" stroke="#11131A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : mood === "neutral" ? (
          <path d="M54 80h12" stroke="#11131A" strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <>
            <path d="M52 78q8 7 16 0" stroke="#11131A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M56 81q4 10 8 0z" fill="#F07C8A" />
          </>
        )}
        <Outfit id={o} />
      </g>
      {mood === "party" && !HEADWEAR.has(o) && (
        <g>
          <path d="M48 26 60 2l12 24z" fill="var(--brand)" />
          <circle cx="60" cy="3" r="4" fill="var(--yellow)" />
          <circle cx="54" cy="18" r="2" fill="#fff" />
          <circle cx="64" cy="13" r="2" fill="#fff" />
        </g>
      )}
    </svg>
  );
}

export function MascotSays({ mood, children }: { mood: Mood; children: ReactNode }) {
  return (
    <div className="mascot-says">
      <Puli mood={mood} size={72} />
      <div className="bubble">{children}</div>
    </div>
  );
}

const cheers = ["Szuper!", "Ügyes vagy!", "Nagyon jó!", "Kiváló!", "Így tovább!", "Bravó!", "Király!", "Tökéletes!"];
const comfort = ["Semmi baj!", "Majdnem!", "Próbáld újra!", "Nem baj, tanulunk!"];
export const cheer = () => cheers[Math.floor(Math.random() * cheers.length)];
export const console_ = () => comfort[Math.floor(Math.random() * comfort.length)];
export const cheerMeaning: Record<string, string> = {
  "Szuper!": "Super!",
  "Ügyes vagy!": "You're clever!",
  "Nagyon jó!": "Very good!",
  "Kiváló!": "Excellent!",
  "Így tovább!": "Keep it up!",
  "Bravó!": "Bravo!",
  "Király!": "Cool!",
  "Tökéletes!": "Perfect!",
  "Semmi baj!": "No problem!",
  "Majdnem!": "Almost!",
  "Próbáld újra!": "Try again!",
  "Nem baj, tanulunk!": "That's okay, we're learning!",
};
