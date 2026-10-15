/** Checks typed answers, forgiving case and punctuation but not accents. */
export type Verdict = "correct" | "accent" | "wrong";

const clean = (s: string) =>
  s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[„”“"'’!?.,:;()…]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Accepts "A / B" style answers and arrays of alternatives. */
export function alternatives(answer: string | string[]): string[] {
  const list = Array.isArray(answer) ? answer : [answer];
  return list.flatMap((a) => [a, ...a.split(/\s*\/\s*/)]).filter(Boolean);
}

export function check(input: string, answer: string | string[]): Verdict {
  const given = clean(input);
  if (!given) return "wrong";
  const alts = alternatives(answer).map(clean);
  if (alts.includes(given)) return "correct";
  if (alts.map(stripAccents).includes(stripAccents(given))) return "accent";
  return "wrong";
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
