/** Hungarian numbers in words, 0 to 999 999. */

const UNITS = ["", "egy", "kettő", "három", "négy", "öt", "hat", "hét", "nyolc", "kilenc"];
const TENS = ["", "tíz", "húsz", "harminc", "negyven", "ötven", "hatvan", "hetven", "nyolcvan", "kilencven"];
const TENS_PREFIX = ["", "tizen", "huszon", "harminc", "negyven", "ötven", "hatvan", "hetven", "nyolcvan", "kilencven"];

/** 2 is "két" in front of something (kétszáz, kétezer, két kávé) and "kettő" on its own. */
const unit = (d: number, inFront: boolean) => (d === 2 && inFront ? "két" : UNITS[d]);

function below100(n: number, inFront: boolean) {
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (u === 0) return TENS[t];
  return TENS_PREFIX[t] + unit(u, inFront);
}

function below1000(n: number, inFront: boolean) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const hs = h === 0 ? "" : (h === 1 ? "" : unit(h, true)) + "száz";
  return hs + (r ? below100(r, inFront) : "");
}

export function toHungarian(n: number, inFront = false): string {
  if (n === 0) return "nulla";
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  const ts = th === 0 ? "" : (th === 1 ? "" : below1000(th, true)) + "ezer";
  const rs = rest ? below1000(rest, inFront) : "";
  // above 2000 a hyphen separates the thousands: kétezer-huszonhárom
  return ts && rs && n > 2000 ? `${ts}-${rs}` : ts + rs;
}

/** Accepted spellings: also "két" for a final 2 and spaces instead of the hyphen. */
export function acceptedForms(n: number): string[] {
  const main = toHungarian(n);
  const out = new Set([main, main.replace("-", ""), main.replace("-", " ")]);
  for (const f of [...out]) if (f.endsWith("kettő")) out.add(f.slice(0, -5) + "két");
  if (n >= 100 && n < 200) out.add("egy" + main);
  if (n >= 1000 && n < 2000) out.add("egy" + main);
  return [...out];
}

/** Clock time the simple way: "három óra húsz perc", plus the everyday quarter forms. */
export function timeForms(h: number, m: number): { simple: string; everyday?: string } {
  const hh = h % 12 === 0 ? 12 : h % 12;
  const next = (hh % 12) + 1;
  const simple = `${toHungarian(hh, true)} óra${m ? " " + toHungarian(m, true) + " perc" : ""}`;
  const everyday =
    m === 15 ? `negyed ${unitWord(next)}` : m === 30 ? `fél ${unitWord(next)}` : m === 45 ? `háromnegyed ${unitWord(next)}` : undefined;
  return { simple, everyday };
}
const unitWord = (n: number) => toHungarian(n);
