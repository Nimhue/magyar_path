/** Tiny synthesized sound effects and haptics. No audio files needed. */
import { getState } from "./store";

let ctx: AudioContext | null = null;

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.12) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.02);
}

export type Sfx = "good" | "bad" | "combo" | "win" | "tap" | "flip";

export function sfx(kind: Sfx) {
  if (!getState().settings.sound) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    switch (kind) {
      case "good":
        tone(660, 0, 0.12);
        tone(880, 0.08, 0.16);
        break;
      case "bad":
        tone(220, 0, 0.18, "triangle", 0.1);
        tone(180, 0.1, 0.22, "triangle", 0.1);
        navigator.vibrate?.(40);
        break;
      case "combo":
        [660, 880, 1100].forEach((f, i) => tone(f, i * 0.06, 0.12, "sine", 0.1));
        break;
      case "win":
        [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.25, "triangle", 0.1));
        break;
      case "tap":
        tone(520, 0, 0.05, "sine", 0.05);
        break;
      case "flip":
        tone(400, 0, 0.06, "sine", 0.05);
        tone(600, 0.04, 0.06, "sine", 0.04);
        break;
    }
  } catch {
    /* audio blocked */
  }
}
