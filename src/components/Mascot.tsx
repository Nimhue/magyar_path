/** Bodza the puli: a Hungarian sheepdog who cheers you on. */
export type Mood = "happy" | "neutral" | "sad" | "party";

const cords = [18, 26, 34, 42, 50, 58, 66, 74, 82, 90, 98];

export function Puli({ mood = "happy", size = 88 }: { mood?: Mood; size?: number }) {
  return (
    <svg
      className={`puli puli-${mood}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Bodza the puli dog"
    >
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
        {/* ears */}
        <path d="M22 50c-8 6-10 20-6 30 6-2 10-12 10-24z" fill="var(--puli)" stroke="var(--puli-cord)" strokeWidth="1.5" />
        <path d="M98 50c8 6 10 20 6 30-6-2-10-12-10-24z" fill="var(--puli)" stroke="var(--puli-cord)" strokeWidth="1.5" />
        {/* eyes */}
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
        {/* fringe over the eyes */}
        <path
          d="M30 52c4-14 14-22 30-22s26 8 30 22c-4-4-8-5-10-3-2-5-6-7-10-4-2-5-7-6-10-6s-8 1-10 6c-4-3-8-1-10 4-2-2-6-1-10 3z"
          fill="var(--puli)"
          stroke="var(--puli-cord)"
          strokeWidth="1.5"
        />
        {/* nose and mouth */}
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
      </g>
      {mood === "party" && (
        <g>
          <path d="M48 26 60 2l12 24z" fill="var(--red)" />
          <circle cx="60" cy="3" r="4" fill="var(--yellow)" />
          <circle cx="54" cy="18" r="2" fill="#fff" />
          <circle cx="64" cy="13" r="2" fill="#fff" />
        </g>
      )}
    </svg>
  );
}

export function MascotSays({ mood, children }: { mood: Mood; children: React.ReactNode }) {
  return (
    <div className="mascot-says">
      <Puli mood={mood} size={72} />
      <div className="bubble">{children}</div>
    </div>
  );
}

const cheers = ["Szuper!", "Ügyes vagy!", "Nagyon jó!", "Kiváló!", "Így tovább!", "Bravó!"];
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
  "Semmi baj!": "No problem!",
  "Majdnem!": "Almost!",
  "Próbáld újra!": "Try again!",
  "Nem baj, tanulunk!": "That's okay, we're learning!",
};
