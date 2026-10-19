/** "Utazás · Your journey": a scrollable trail over rolling hills, one landmark per lesson. */
import { useEffect, useRef } from "react";
import { lessons } from "../content";
import { DANUBE, OUTLINE, TISZA, projection } from "../lib/hungary";
import { currentLesson, isUnlocked, lessonStatus } from "../lib/progress";
import { href } from "../lib/router";
import { useProgress } from "../lib/store";
import { Landmark, landmarkFor } from "./Landmarks";
import { Buddy } from "./Mascot";

const SP = 124;
const PADX = 74;
const H = 236;
const TONES = ["red", "green", "blue", "purple", "paprika", "teal", "pink", "yellow"];
const yAt = (i: number) => 134 + 30 * Math.sin(i * 1.35 + 0.4);

function hills(width: number, base: number, amp: number, period: number, phase: number) {
  let d = `M0 ${H} L0 ${base}`;
  for (let x = 0; x <= width + period; x += period / 2) {
    const k = Math.round(x / (period / 2));
    const y = base + (k % 2 ? -amp : amp * 0.3) * (1 + 0.25 * Math.sin(k + phase));
    d += ` Q${x - period / 4} ${y} ${x} ${base}`;
  }
  return d + ` L${width + period} ${H} Z`;
}

function road(pts: { x: number; y: number }[], from = 0, to = pts.length - 1) {
  let d = `M${pts[from].x} ${pts[from].y}`;
  for (let i = from + 1; i <= to; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    d += ` C${a.x + SP / 2} ${a.y} ${b.x - SP / 2} ${b.y} ${b.x} ${b.y}`;
  }
  return d;
}

function MiniMap({ cur }: { cur: string }) {
  const pr = projection(120, 4);
  const stops = lessons.filter((l) => l.place?.lon !== undefined && l.place?.lat !== undefined);
  return (
    <svg className="mini-map" viewBox={`0 0 ${pr.W} ${pr.H}`} aria-hidden="true">
      <polygon points={pr.pts(OUTLINE)} className="hu-land" />
      <polyline points={pr.pts(DANUBE)} className="hu-river" />
      <polyline points={pr.pts(TISZA)} className="hu-river" />
      {stops.map((l) => (
        <circle
          key={l.id}
          cx={pr.x(l.place!.lon!)}
          cy={pr.y(l.place!.lat!)}
          r={l.id === cur ? 4 : 2.2}
          className={l.id === cur ? "mm-cur" : "mm-dot"}
        />
      ))}
    </svg>
  );
}

export function JourneyMap() {
  const p = useProgress();
  const cur = currentLesson(p);
  const scroller = useRef<HTMLDivElement>(null);
  const width = PADX * 2 + SP * (lessons.length - 1);
  const pts = lessons.map((_, i) => ({ x: PADX + i * SP, y: yAt(i) }));
  const curIdx = Math.max(0, lessons.findIndex((l) => l.id === cur.id));
  const doneUpTo = curIdx;
  const finished = lessons.filter((l) => lessonStatus(l, p).complete).length;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, pts[curIdx].x - el.clientWidth / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curIdx]);

  if (lessons.length < 2) return null;
  const next = cur.place;

  return (
    <section className="panel journey">
      <div className="row between">
        <h2 className="section-title">Utazás · Your journey</h2>
        <span className="chip tabnum">
          {finished}/{lessons.length} stops
        </span>
      </div>
      <div className="trail-wrap">
        <MiniMap cur={cur.id} />
        <div className="trail-scroll" ref={scroller}>
          <div className="trail" style={{ width }}>
            <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label="Your journey: one stop per lesson">
              <circle cx={width - 60} cy={40} r={20} className="trail-sun" />
              {[0.12, 0.42, 0.7, 0.92].map((f, k) => (
                <g key={k} className="cloud" style={{ animationDelay: `${-k * 7}s` }} transform={`translate(${f * width} ${26 + (k % 2) * 18})`}>
                  <ellipse cx="0" cy="8" rx="22" ry="9" />
                  <ellipse cx="12" cy="2" rx="13" ry="10" />
                  <ellipse cx="-10" cy="4" rx="10" ry="8" />
                </g>
              ))}
              <path d={hills(width, 120, 26, 300, 0)} className="hill back" />
              <path d={hills(width, 168, 18, 220, 2)} className="hill front" />
              <path d={`M0 ${pts[0].y} L${pts[0].x} ${pts[0].y}`} className="road-edge" />
              <path d={road(pts)} className="road-edge" />
              <path d={`M0 ${pts[0].y} L${pts[0].x} ${pts[0].y}`} className="road" />
              <path d={road(pts)} className="road" />
              {doneUpTo > 0 && <path d={road(pts, 0, doneUpTo)} className="road-done" />}
              {pts.map((pt, i) => {
                const l = lessons[i];
                const st = lessonStatus(l, p);
                const open = isUnlocked(l.id, p);
                const state = st.complete ? "done" : l.id === cur.id ? "current" : open ? "open" : "locked";
                const tone = TONES[i % TONES.length];
                const stop = (
                  <g className={`tstop ${state} tone-${tone}`}>
                    {state === "current" && <circle cx={pt.x} cy={pt.y} r="38" className="tpulse" />}
                    <ellipse cx={pt.x} cy={pt.y + 33} rx="26" ry="5" className="tshadow" />
                    <circle cx={pt.x} cy={pt.y} r="30" className="tbadge" />
                    <Landmark kind={landmarkFor(l.place?.name ?? "", l.place?.icon)} x={pt.x} y={pt.y + 1} size={42} />
                    {state === "done" && (
                      <g transform={`translate(${pt.x - 26} ${pt.y - 44})`} className="tflag">
                        <path d="M0 0v22" />
                        <rect x="1" y="0" width="13" height="3.4" fill="#ce2939" />
                        <rect x="1" y="3.4" width="13" height="3.4" fill="#fff" />
                        <rect x="1" y="6.8" width="13" height="3.4" fill="#477050" />
                      </g>
                    )}
                    <circle cx={pt.x + 23} cy={pt.y - 22} r="11" className="tnum" />
                    <text x={pt.x + 23} y={pt.y - 18} textAnchor="middle" className="tnum-text">
                      {state === "done" ? "✓" : state === "locked" ? "·" : l.order}
                    </text>
                    <text x={pt.x} y={pt.y + 54} textAnchor="middle" className="tname">
                      {l.place?.name ?? l.title}
                    </text>
                    <text x={pt.x} y={pt.y + 69} textAnchor="middle" className="ttitle">
                      {l.title}
                    </text>
                    <title>{`${l.order}. ${l.place?.name ?? ""} · ${l.title}${state === "locked" ? " (locked)" : ""}`}</title>
                  </g>
                );
                return open ? (
                  <a key={l.id} href={href(`lesson/${l.id}`)} aria-label={`Lesson ${l.order}: ${l.title}`}>
                    {stop}
                  </a>
                ) : (
                  <g key={l.id}>{stop}</g>
                );
              })}
            </svg>
            <div className="trail-buddy" style={{ left: pts[curIdx].x - 70, top: pts[curIdx].y - 104 }} aria-hidden="true">
              <Buddy mood="happy" size={62} />
              <span className="trail-say">{lessonStatus(cur, p).complete ? "Kész!" : "Itt vagyunk!"}</span>
            </div>
          </div>
        </div>
      </div>
      {next && (
        <p className="journey-fact">
          <span className="postmark" style={{ fontSize: next.name.length > 7 ? "0.54rem" : undefined }}>{next.name}</span>
          <span>
            <strong>{lessonStatus(cur, p).complete ? "You've reached" : "Next stop"}: </strong>
            {next.fact}
          </span>
        </p>
      )}
    </section>
  );
}
