/** "Journey around Hungary": each lesson is a stop on a stylised map. */
import { lessons } from "../content";
import { currentLesson, isUnlocked, lessonStatus } from "../lib/progress";
import { href } from "../lib/router";
import { useProgress } from "../lib/store";

const W = 340;
const H = 210;
const LON0 = 15.95;
const LON1 = 23.05;
const LAT0 = 48.7;
const LAT1 = 45.65;
const x = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * W;
const y = (lat: number) => ((LAT0 - lat) / (LAT0 - LAT1)) * H;
const pts = (list: number[][]) => list.map(([lo, la]) => `${x(lo).toFixed(1)},${y(la).toFixed(1)}`).join(" ");

const OUTLINE = [
  [16.11, 46.87], [16.4, 47.15], [16.54, 47.39], [16.42, 47.6], [16.65, 47.75], [17.07, 48.0], [17.25, 48.02], [17.7, 47.77],
  [18.0, 47.75], [18.5, 47.77], [18.75, 47.82], [18.95, 47.95], [19.0, 48.07], [19.5, 48.2], [19.9, 48.15], [20.3, 48.3],
  [20.8, 48.57], [21.4, 48.56], [21.7, 48.4], [22.15, 48.42], [22.9, 47.95], [22.3, 47.75], [21.95, 47.4], [21.65, 46.95],
  [21.25, 46.4], [20.75, 46.17], [20.3, 46.1], [19.6, 46.17], [19.1, 45.97], [18.85, 45.9], [18.4, 45.75], [17.6, 45.95],
  [17.25, 46.25], [16.6, 46.48], [16.3, 46.55],
];
const DANUBE = [
  [17.1, 48.06], [17.7, 47.8], [18.4, 47.79], [18.75, 47.84], [18.95, 47.82], [19.07, 47.62], [19.05, 47.4], [18.97, 47.0],
  [18.9, 46.5], [18.86, 45.9],
];
const TISZA = [
  [22.1, 48.38], [21.4, 48.2], [21.05, 47.6], [20.25, 47.15], [20.15, 46.6], [20.2, 46.15],
];

export function JourneyMap() {
  const p = useProgress();
  const cur = currentLesson(p);
  const stops = lessons.filter((l) => l.place?.lon !== undefined && l.place?.lat !== undefined);
  if (stops.length < 2) return null;
  const next = cur.place;
  return (
    <section className="panel journey">
      <div className="row between">
        <h2 className="section-title">Utazás · Your journey</h2>
        <span className="muted small-print tabnum">
          {stops.filter((l) => lessonStatus(l, p).complete).length}/{stops.length} stops
        </span>
      </div>
      <div className="journey-map">
        <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} role="img" aria-label="Map of Hungary with your lesson stops">
          <polygon points={pts(OUTLINE)} className="hu-land" />
          <polyline points={pts(DANUBE)} className="hu-river" />
          <polyline points={pts(TISZA)} className="hu-river" />
          <ellipse cx={x(17.72)} cy={y(46.87)} rx={x(18.17) - x(17.72)} ry="4" transform={`rotate(-22 ${x(17.72)} ${y(46.87)})`} className="hu-lake" />
          <polyline points={pts(stops.map((l) => [l.place!.lon!, l.place!.lat!]))} className="route" />
          <polyline
            points={pts(stops.filter((l) => lessonStatus(l, p).complete || l.id === cur.id).map((l) => [l.place!.lon!, l.place!.lat!]))}
            className="route done"
          />
          {stops.map((l) => {
            const st = lessonStatus(l, p);
            const open = isUnlocked(l.id, p);
            const state = st.complete ? "done" : l.id === cur.id ? "current" : open ? "open" : "locked";
            const cx = x(l.place!.lon!);
            const cy = y(l.place!.lat!);
            const dot = (
              <g className={"stop " + state}>
                {state === "current" && <circle cx={cx} cy={cy} r="13" className="pulse" />}
                <circle cx={cx} cy={cy} r="8" />
                <text x={cx} y={cy + 3.5} textAnchor="middle">
                  {l.order}
                </text>
                {state === "current" && (
                  <text x={cx + 12} y={cy - 11} className="stop-label">
                    {l.place!.name}
                  </text>
                )}
                <title>{`${l.order}. ${l.place!.name} · ${l.title}`}</title>
              </g>
            );
            return open ? (
              <a key={l.id} href={href(`lesson/${l.id}`)}>
                {dot}
              </a>
            ) : (
              <g key={l.id}>{dot}</g>
            );
          })}
        </svg>
      </div>
      {next && (
        <p className="journey-fact">
          <strong>
            {lessonStatus(cur, p).complete ? "You've reached" : "Next stop"}: {next.name}.
          </strong>{" "}
          {next.fact}
        </p>
      )}
    </section>
  );
}
