/**
 * The study buddies: Cirmi the cat, Bari the peach, Pepi the paprika and Bodza the puli.
 * All share one 120×120 layout (eyes at y≈60) so outfits fit every one of them.
 */
import { useId, type ReactNode } from "react";
import { currentOutfit } from "../lib/game";
import { useProgress } from "../lib/store";

export type Mood = "happy" | "neutral" | "sad" | "party";

export const MASCOTS = [
  { id: "cirmi", name: "Cirmi", what: "a ginger kitten", hu: "cica" },
  { id: "bari", name: "Bari", what: "a sweet peach", hu: "barack" },
  { id: "pepi", name: "Pepi", what: "a little paprika", hu: "paprika" },
  { id: "bodza", name: "Bodza", what: "a puli sheepdog", hu: "puli" },
] as const;

export function mascotName(id: string) {
  return MASCOTS.find((m) => m.id === id)?.name ?? "Cirmi";
}

/** Eyes, blush and mouth shared by the cat, peach and paprika. */
function Face({ mood, eyeY = 60, mouthY = 76, ink = "#3B2420" }: { mood: Mood; eyeY?: number; mouthY?: number; ink?: string }) {
  return (
    <g>
      <ellipse cx="37" cy={eyeY + 12} rx="7" ry="4.5" fill="#FF8FA3" opacity=".55" />
      <ellipse cx="83" cy={eyeY + 12} rx="7" ry="4.5" fill="#FF8FA3" opacity=".55" />
      {mood === "party" ? (
        <>
          <path d={`M41 ${eyeY + 2}q7-9 14 0`} stroke={ink} strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d={`M65 ${eyeY + 2}q7-9 14 0`} stroke={ink} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </>
      ) : mood === "sad" ? (
        <>
          <ellipse cx="48" cy={eyeY + 1} rx="6" ry="6.5" fill={ink} />
          <ellipse cx="72" cy={eyeY + 1} rx="6" ry="6.5" fill={ink} />
          <circle cx="50" cy={eyeY - 1.5} r="2.2" fill="#fff" />
          <circle cx="74" cy={eyeY - 1.5} r="2.2" fill="#fff" />
          <path d={`M40 ${eyeY - 9}l9 3M80 ${eyeY - 9}l-9 3`} stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
          <path d={`M44 ${eyeY + 8}q-2 5 0 8 2-3 0-8z`} fill="#7FC4F0" />
        </>
      ) : (
        <>
          <ellipse cx="48" cy={eyeY} rx="6.5" ry="7.5" fill={ink} />
          <ellipse cx="72" cy={eyeY} rx="6.5" ry="7.5" fill={ink} />
          <circle cx="50.5" cy={eyeY - 2.8} r="2.6" fill="#fff" />
          <circle cx="74.5" cy={eyeY - 2.8} r="2.6" fill="#fff" />
          <circle cx="46" cy={eyeY + 3} r="1.2" fill="#fff" opacity=".8" />
          <circle cx="70" cy={eyeY + 3} r="1.2" fill="#fff" opacity=".8" />
        </>
      )}
      {mood === "sad" ? (
        <path d={`M53 ${mouthY + 4}q7-6 14 0`} stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      ) : mood === "neutral" ? (
        <path d={`M55 ${mouthY + 1}h10`} stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      ) : mood === "party" ? (
        <path d={`M52 ${mouthY - 1}q8 12 16 0z`} fill={ink} />
      ) : (
        <path d={`M53 ${mouthY - 1}q3.5 4 7 0q3.5 4 7 0`} stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </g>
  );
}

function Cat({ mood }: { mood: Mood }) {
  const fur = "#F4A962";
  const dark = "#DD8743";
  const cream = "#FFF1E2";
  return (
    <g>
      <path d="M90 104c14-4 20-18 14-32-3-6-9-6-9 0 0 8 0 18-10 22" fill="none" stroke={fur} strokeWidth="9" strokeLinecap="round" />
      <path d="M103 74c-2-4-6-5-8-2" fill="none" stroke={dark} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="60" cy="100" rx="32" ry="15" fill={fur} />
      <ellipse cx="60" cy="102" rx="17" ry="10" fill={cream} />
      <path d="M24 52 29 16l25 20z" fill={fur} />
      <path d="M96 52 91 16 66 36z" fill={fur} />
      <path d="M31 44 33 25l13 11z" fill="#F7B7C1" />
      <path d="M89 44 87 25 74 36z" fill="#F7B7C1" />
      <ellipse cx="60" cy="62" rx="38" ry="31" fill={fur} />
      <path d="M53 34q2 5 1 10M60 32v10M67 34q-2 5-1 10" stroke={dark} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M22 62q6 0 9 3M98 62q-6 0-9 3" stroke={dark} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="60" cy="77" rx="14" ry="10" fill={cream} />
      <Face mood={mood} />
      <path d="M57 69.5h6l-3 3.5z" fill="#F07C93" />
      <path d="M44 77H26M44 81l-17 4M76 77h18M76 81l17 4" stroke="#C9773A" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
      <ellipse cx="46" cy="113" rx="8" ry="5" fill={cream} />
      <ellipse cx="74" cy="113" rx="8" ry="5" fill={cream} />
    </g>
  );
}

function Peach({ mood }: { mood: Mood }) {
  const id = useId().replace(/:/g, "");
  return (
    <g>
      <defs>
        <radialGradient id={`pg${id}`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#FFD2B0" />
          <stop offset=".6" stopColor="#FFA885" />
          <stop offset="1" stopColor="#F27E6C" />
        </radialGradient>
      </defs>
      <ellipse cx="47" cy="111" rx="9" ry="5" fill="#E9735F" />
      <ellipse cx="73" cy="111" rx="9" ry="5" fill="#E9735F" />
      <path d="M60 30c-26-4-42 16-42 40 0 22 18 40 42 40s42-18 42-40c0-24-16-44-42-40z" fill={`url(#pg${id})`} />
      <path d="M60 31c-8 10-10 22-6 34" stroke="#E36F5E" strokeWidth="2.5" fill="none" opacity=".45" strokeLinecap="round" />
      <path d="M60 32c0-8 3-13 7-17" stroke="#7A5637" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M66 18c6-10 20-12 28-6-6 9-18 12-28 6z" fill="#7DBA6E" />
      <path d="M68 17c7-4 15-5 22-3" stroke="#5E9A52" strokeWidth="1.5" fill="none" />
      <ellipse cx="38" cy="48" rx="8" ry="5" fill="#fff" opacity=".35" transform="rotate(-30 38 48)" />
      <Face mood={mood} eyeY={64} mouthY={80} />
    </g>
  );
}

function Paprika({ mood }: { mood: Mood }) {
  return (
    <g>
      <path d="M60 30C32 26 23 46 27 68c4 22 17 38 33 46 16-8 29-24 33-46 4-22-5-42-33-38z" fill="#E8402F" />
      <path d="M60 32c-5 18-5 50 0 80" stroke="#C72E22" strokeWidth="2.5" fill="none" opacity=".5" />
      <path d="M38 40c-6 14-5 32 4 50" stroke="#C72E22" strokeWidth="2" fill="none" opacity=".35" />
      <path d="M82 40c6 14 5 32-4 50" stroke="#C72E22" strokeWidth="2" fill="none" opacity=".35" />
      <ellipse cx="38" cy="54" rx="5" ry="12" fill="#fff" opacity=".35" transform="rotate(14 38 54)" />
      <path d="M40 34q9-12 20-5 11-7 20 5-10 4-20 3-10 1-20-3z" fill="#4E9A3E" />
      <path d="M60 30c0-10 5-16 13-19" stroke="#3E7F30" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Face mood={mood} eyeY={62} mouthY={78} ink="#3A1410" />
    </g>
  );
}

function Puli({ mood }: { mood: Mood }) {
  return (
    <g>
      <path d="M18 70c0-28 18-48 42-48s42 20 42 48v26H18z" fill="var(--puli)" />
      {[18, 26, 34, 42, 50, 58, 66, 74, 82, 90, 98].map((x, i) => (
        <rect key={x} x={x - 4} y={78 + (i % 2) * 3} width="9" height={26 - (i % 3) * 3} rx="4.5" fill="var(--puli)" stroke="var(--puli-cord)" strokeWidth="1.5" />
      ))}
      <path d="M22 50c-8 6-10 20-6 30 6-2 10-12 10-24z" fill="var(--puli)" stroke="var(--puli-cord)" strokeWidth="1.5" />
      <path d="M98 50c8 6 10 20 6 30-6-2-10-12-10-24z" fill="var(--puli)" stroke="var(--puli-cord)" strokeWidth="1.5" />
      <Face mood={mood} ink="#11131A" />
      <path
        d="M30 52c4-14 14-22 30-22s26 8 30 22c-4-4-8-5-10-3-2-5-6-7-10-4-2-5-7-6-10-6s-8 1-10 6c-4-3-8-1-10 4-2-2-6-1-10 3z"
        fill="var(--puli)"
        stroke="var(--puli-cord)"
        strokeWidth="1.5"
      />
      <ellipse cx="60" cy="71" rx="5.5" ry="4" fill="#11131A" />
    </g>
  );
}

function Outfit({ id }: { id: string }) {
  switch (id) {
    case "scarf":
      return (
        <g>
          <rect x="26" y="86" width="68" height="5" rx="2.5" fill="#D93A3A" />
          <rect x="26" y="91" width="68" height="5" fill="#FFFFFF" />
          <rect x="26" y="96" width="68" height="5" rx="2.5" fill="#2A8A56" />
          <path d="M78 96l6 16 7-2-5-15z" fill="#2A8A56" />
        </g>
      );
    case "glasses":
      return (
        <g>
          <rect x="37" y="52" width="22" height="16" rx="7" fill="#11131A" opacity=".88" />
          <rect x="61" y="52" width="22" height="16" rx="7" fill="#11131A" opacity=".88" />
          <path d="M59 58h2" stroke="#11131A" strokeWidth="3" />
          <path d="M41 56l5-2M65 56l5-2" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".7" />
        </g>
      );
    case "kalap":
      return (
        <g>
          <ellipse cx="60" cy="30" rx="30" ry="5" fill="#2A2A33" />
          <path d="M44 30c0-13 6-19 16-19s16 6 16 19z" fill="#34343F" />
          <rect x="44" y="23" width="32" height="4.5" fill="#D93A3A" />
          <path d="M72 22c6-6 10-12 8-18-3 5-7 9-10 12z" fill="#E0A71F" />
        </g>
      );
    case "flowers":
      return (
        <g>
          {[
            [32, 36, "#D7263D"],
            [41, 28, "#F2A900"],
            [51, 24, "#1B4FA0"],
            [62, 23, "#D7263D"],
            [73, 25, "#2A8A56"],
            [82, 30, "#F2A900"],
            [89, 38, "#B565A7"],
          ].map(([x, y, c], i) => (
            <g key={i}>
              <circle cx={x as number} cy={y as number} r="5.5" fill={c as string} />
              <circle cx={x as number} cy={y as number} r="2" fill="#FFF6D6" />
            </g>
          ))}
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M42 34l2-13 9 7 7-11 7 11 9-7 2 13z" fill="#E0A71F" stroke="#A87708" strokeWidth="1.5" />
          <circle cx="52" cy="29" r="2.2" fill="#D93A3A" />
          <circle cx="60" cy="27" r="2.2" fill="#2F6FCB" />
          <circle cx="68" cy="29" r="2.2" fill="#2A8A56" />
          <g transform="rotate(14 60 12)">
            <rect x="58.5" y="5" width="3" height="11" fill="#E0A71F" />
            <rect x="55.5" y="8" width="9" height="3" fill="#E0A71F" />
          </g>
        </g>
      );
    case "pumpkin":
      return (
        <g>
          <ellipse cx="60" cy="32" rx="32" ry="5.5" fill="#3B2457" />
          <path d="M46 32C48 20 54 6 76 0c-6 8-8 18-8 32z" fill="#4E2F73" />
          <rect x="47" y="26" width="20" height="4.5" fill="#EE7A2B" />
          <circle cx="76" cy="1" r="3" fill="#F2C452" />
        </g>
      );
    case "santa":
      return (
        <g>
          <path d="M36 34c4-16 16-25 32-22 9 2 15 9 17 18z" fill="#D93A3A" />
          <path d="M68 12c11 0 18 6 20 15" stroke="#D93A3A" strokeWidth="7" fill="none" strokeLinecap="round" />
          <circle cx="89" cy="30" r="5.5" fill="#fff" />
          <rect x="33" y="30" width="56" height="8" rx="4" fill="#fff" />
        </g>
      );
    case "bunny":
      return (
        <g>
          <path d="M44 32c-6-14-6-28 2-30 8 2 8 18 6 30z" fill="#F4F0EC" stroke="#E2D8CF" strokeWidth="1.5" />
          <path d="M47 28c-3-9-3-18 0-20 3 2 4 12 3 20z" fill="#F7C6CF" />
          <path d="M76 32c6-14 6-28-2-30-8 2-8 18-6 30z" fill="#F4F0EC" stroke="#E2D8CF" strokeWidth="1.5" />
          <path d="M73 28c3-9 3-18 0-20-3 2-4 12-3 20z" fill="#F7C6CF" />
        </g>
      );
    default:
      return null;
  }
}

const HEADWEAR = new Set(["kalap", "flowers", "crown", "pumpkin", "santa", "bunny"]);

export function Buddy({
  mood = "happy",
  size = 88,
  outfit,
  kind,
}: {
  mood?: Mood;
  size?: number;
  outfit?: string;
  kind?: string;
}) {
  const p = useProgress();
  const o = outfit ?? currentOutfit(p);
  const k = kind ?? p.settings.mascot ?? "cirmi";
  const name = mascotName(k);
  return (
    <svg className={`puli puli-${mood}`} width={size} height={size} viewBox="0 -6 120 126" role="img" aria-label={`${name}, your study buddy`}>
      <ellipse cx="60" cy="116" rx="36" ry="4.5" fill="var(--shadow-ink)" />
      <g className="puli-body">
        {k === "bari" ? <Peach mood={mood} /> : k === "pepi" ? <Paprika mood={mood} /> : k === "bodza" ? <Puli mood={mood} /> : <Cat mood={mood} />}
        <Outfit id={o} />
      </g>
      {mood === "party" && !HEADWEAR.has(o) && (
        <g>
          <path d="M50 28 60 4l10 24z" fill="var(--brand)" />
          <circle cx="60" cy="5" r="4" fill="var(--yellow)" />
          <circle cx="56" cy="19" r="1.8" fill="#fff" />
          <circle cx="64" cy="14" r="1.8" fill="#fff" />
        </g>
      )}
    </svg>
  );
}

export { Buddy as Puli };

export function MascotSays({ mood, children }: { mood: Mood; children: ReactNode }) {
  return (
    <div className="mascot-says">
      <Buddy mood={mood} size={72} />
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
