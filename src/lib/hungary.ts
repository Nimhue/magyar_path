/** A simplified outline of Hungary and a projection onto an SVG box. */

export const OUTLINE = [
  [16.11, 46.87], [16.4, 47.15], [16.54, 47.39], [16.42, 47.6], [16.65, 47.75], [17.07, 48.0], [17.25, 48.02], [17.7, 47.77],
  [18.0, 47.75], [18.5, 47.77], [18.75, 47.82], [18.95, 47.95], [19.0, 48.07], [19.5, 48.2], [19.9, 48.15], [20.3, 48.3],
  [20.8, 48.57], [21.4, 48.56], [21.7, 48.4], [22.15, 48.42], [22.9, 47.95], [22.3, 47.75], [21.95, 47.4], [21.65, 46.95],
  [21.25, 46.4], [20.75, 46.17], [20.3, 46.1], [19.6, 46.17], [19.1, 45.97], [18.85, 45.9], [18.4, 45.75], [17.6, 45.95],
  [17.25, 46.25], [16.6, 46.48], [16.3, 46.55],
];
export const DANUBE = [
  [17.1, 48.06], [17.7, 47.8], [18.4, 47.79], [18.75, 47.84], [18.95, 47.82], [19.07, 47.62], [19.05, 47.4], [18.97, 47.0],
  [18.9, 46.5], [18.86, 45.9],
];
export const TISZA = [[22.1, 48.38], [21.4, 48.2], [21.05, 47.6], [20.25, 47.15], [20.15, 46.6], [20.2, 46.15]];

export function projection(W: number, pad = 0) {
  const LON0 = 15.95, LON1 = 23.05, LAT0 = 48.7, LAT1 = 45.65;
  // keep the real shape: a degree of longitude is ~0.68 of a degree of latitude here
  const H = Math.round(((LAT0 - LAT1) / ((LON1 - LON0) * 0.68)) * W);
  const x = (lon: number) => pad + ((lon - LON0) / (LON1 - LON0)) * (W - 2 * pad);
  const y = (lat: number) => pad + ((LAT0 - lat) / (LAT0 - LAT1)) * (H - 2 * pad);
  const pts = (list: number[][]) => list.map(([lo, la]) => `${x(lo).toFixed(1)},${y(la).toFixed(1)}`).join(" ");
  return { W, H, x, y, pts };
}

/** Pushes overlapping pins apart so every one stays tappable. Returns new positions. */
export function spread(points: { x: number; y: number }[], minDist: number, W: number, H: number) {
  const pos = points.map((p) => ({ ...p }));
  for (let it = 0; it < 120; it++) {
    for (let i = 0; i < pos.length; i++)
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < minDist) {
          const push = (minDist - d) / 2;
          const ux = d < 0.02 ? 1 : dx / d;
          const uy = d < 0.02 ? 0 : dy / d;
          pos[i].x -= ux * push;
          pos[i].y -= uy * push;
          pos[j].x += ux * push;
          pos[j].y += uy * push;
        }
      }
    for (let i = 0; i < pos.length; i++) {
      pos[i].x += (points[i].x - pos[i].x) * 0.04;
      pos[i].y += (points[i].y - pos[i].y) * 0.04;
      pos[i].x = Math.min(W - minDist / 2, Math.max(minDist / 2, pos[i].x));
      pos[i].y = Math.min(H - minDist / 2, Math.max(minDist / 2, pos[i].y));
    }
  }
  return pos;
}
