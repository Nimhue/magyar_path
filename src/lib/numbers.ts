/** Hungarian numbers in words, from nulla up to egybillió (10^12) and beyond. */

const UNITS = ["", "egy", "kettő", "három", "négy", "öt", "hat", "hét", "nyolc", "kilenc"];
const TENS = ["", "tíz", "húsz", "harminc", "negyven", "ötven", "hatvan", "hetven", "nyolcvan", "kilencven"];
const TENS_PREFIX = ["", "tizen", "huszon", "harminc", "negyven", "ötven", "hatvan", "hetven", "nyolcvan", "kilencven"];

/** Hungarian uses the long scale: milliárd = 10^9 (English billion), billió = 10^12 (English trillion). */
export const SCALES: [number, string][] = [
  [1e12, "billió"],
  [1e9, "milliárd"],
  [1e6, "millió"],
  [1e3, "ezer"],
];

/** 2 is "két" in front of something (kétszáz, kétezer, két kávé) and "kettő" on its own. */
const unit = (d: number, inFront: boolean) => (d === 2 && inFront ? "két" : UNITS[d]);

/** The building blocks of a number from 1 to 999, e.g. 256 → ["két", "száz", "ötven", "hat"]. */
function groupTokens(g: number, inFront: boolean): string[] {
  const out: string[] = [];
  const h = Math.floor(g / 100);
  const r = g % 100;
  if (h) {
    if (h > 1) out.push(unit(h, true));
    out.push("száz");
  }
  if (r) {
    const t = Math.floor(r / 10);
    const u = r % 10;
    if (u === 0) out.push(TENS[t]);
    else {
      if (t) out.push(TENS_PREFIX[t]);
      out.push(unit(u, inFront));
    }
  }
  return out;
}

/**
 * The number as word pieces, with "-" where Hungarian writes a hyphen.
 * Above 2000, a hyphen separates each group of thousands: kétmillió-ötszázezer-tizenkettő.
 */
export function toTokens(n: number, inFront = false): string[] {
  n = Math.floor(Math.abs(n));
  if (n === 0) return ["nulla"];
  const parts: string[][] = [];
  let rest = n;
  for (const [size, word] of SCALES) {
    const g = Math.floor(rest / size);
    rest -= g * size;
    if (!g) continue;
    // a lone thousand up to 2000 is just "ezer" (1956 = ezerkilencszázötvenhat); everything else counts: egymillió, egyezer
    const head = g === 1 && size === 1e3 && n <= 2000 ? [] : toTokens(g, true).filter((t) => t !== "-");
    parts.push([...head, word]);
  }
  if (rest) parts.push(groupTokens(rest, inFront));
  const hyphen = n > 2000;
  return parts.flatMap((p, i) => (hyphen && i > 0 ? ["-", ...p] : p));
}

export function toHungarian(n: number, inFront = false): string {
  return toTokens(n, inFront).join("");
}

/** Accepted spellings: hyphens or spaces optional, "két" for a final 2, "egy" in front of száz/ezer. */
export function acceptedForms(n: number): string[] {
  const main = toHungarian(n);
  const out = new Set([main, main.replace(/-/g, ""), main.replace(/-/g, " ")]);
  for (const f of [...out]) if (f.endsWith("kettő")) out.add(f.slice(0, -5) + "két");
  if ((n >= 100 && n < 200) || (n >= 1000 && n < 2000)) out.add("egy" + main);
  for (const f of [...out]) if (f.includes("-egyezer")) out.add(f.replace("-egyezer", "-ezer"));
  return [...out];
}

/** Compare a typed answer ignoring hyphens, spaces and case. */
export const sameNumberWords = (a: string, b: string) => a.toLowerCase().replace(/[\s-]/g, "") === b.toLowerCase().replace(/[\s-]/g, "");

/** Clock time the simple way: "három óra húsz perc", plus the everyday quarter forms. */
export function timeForms(h: number, m: number): { simple: string; everyday?: string } {
  const hh = h % 12 === 0 ? 12 : h % 12;
  const next = (hh % 12) + 1;
  const simple = `${toHungarian(hh, true)} óra${m ? " " + toHungarian(m, true) + " perc" : ""}`;
  const everyday =
    m === 15 ? `negyed ${toHungarian(next)}` : m === 30 ? `fél ${toHungarian(next)}` : m === 45 ? `háromnegyed ${toHungarian(next)}` : undefined;
  return { simple, everyday };
}

const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/** A random number with up to `maxDigits` digits, mostly "round" so the words stay learnable. */
export function randomNumber(max: number): number {
  if (max <= 9999) return rnd(0, max);
  const maxDigits = String(max).length;
  const k = rnd(1, maxDigits - 1);
  let s = String(rnd(1, 9));
  for (let i = 1; i < k; i++) s += Math.random() < 0.55 ? "0" : String(rnd(0, 9));
  return Math.min(Number(s), max);
}

/** Numbers that look or sound like n: a digit changed, or the wrong scale (millió vs milliárd). */
export function confusables(n: number, count = 3): number[] {
  const out = new Set<number>();
  const s = String(n);
  let guard = 0;
  while (out.size < count && guard++ < 200) {
    const kind = rnd(0, 3);
    let v = n;
    if (kind === 0 && n >= 1000) v = Math.random() < 0.5 ? n * 1000 : Math.floor(n / 1000);
    else if (kind === 1) {
      const i = rnd(0, s.length - 1);
      const d = Number(s[i]);
      const nd = (d + rnd(1, 8)) % 10;
      if (i === 0 && nd === 0) continue;
      v = Number(s.slice(0, i) + nd + s.slice(i + 1));
    } else if (kind === 2) v = n + (Math.random() < 0.5 ? 1 : -1) * 10 ** rnd(0, Math.max(0, s.length - 1));
    else v = Number(s.split("").reverse().join("").replace(/^0+/, "") || "1");
    if (v !== n && v >= 0 && v <= 1e12) out.add(v);
  }
  return [...out];
}
