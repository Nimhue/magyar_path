/**
 * Hungarian text-to-speech through the browser's built-in voices.
 * If the device has no Hungarian voice we stay silent instead of letting an
 * English voice mangle the words, and point the learner to Settings.
 */
import { getState } from "./store";

const supported = typeof window !== "undefined" && "speechSynthesis" in window;
let voices: SpeechSynthesisVoice[] = [];
const listeners = new Set<() => void>();

function refresh() {
  if (!supported) return;
  voices = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().replace("_", "-").startsWith("hu"));
  listeners.forEach((l) => l());
}

if (supported) {
  refresh();
  speechSynthesis.addEventListener?.("voiceschanged", refresh);
  // some browsers fill the list late
  setTimeout(refresh, 1000);
}

/** Natural/online voices sound far better, so they come first. */
const score = (v: SpeechSynthesisVoice) =>
  (/natural|neural|online|premium|enhanced/i.test(v.name) ? 10 : 0) + (v.localService ? 0 : 2) + (/google/i.test(v.name) ? 1 : 0);

export const hungarianVoices = () => [...voices].sort((a, b) => score(b) - score(a));
export const canSpeak = () => supported;
export const hasHungarianVoice = () => voices.length > 0;
export const onVoices = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function pickVoice(): SpeechSynthesisVoice | null {
  const wanted = getState().settings.voice;
  const list = hungarianVoices();
  return list.find((v) => v.name === wanted) ?? list[0] ?? null;
}

let warned = false;
let onMissing: (() => void) | null = null;
/** Lets the UI show a hint the first time a word can't be spoken. */
export const setMissingVoiceHandler = (fn: () => void) => (onMissing = fn);

export function speak(text: string, rate = 0.9) {
  if (!supported) return;
  const voice = pickVoice();
  if (!voice) {
    if (!warned) {
      warned = true;
      onMissing?.();
    }
    return;
  }
  try {
    const clean = text.replace(/\s*\/\s*/g, ", ").replace(/\((.*?)\)/g, "").replace(/[„”“]/g, "");
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = voice.lang || "hu-HU";
    u.voice = voice;
    u.rate = /natural|neural|online/i.test(voice.name) ? rate + 0.05 : rate;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export type Platform = "windows" | "mac" | "ios" | "android" | "linux" | "other";
export function platform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Windows/.test(ua)) return "windows";
  if (/Macintosh/.test(ua)) return "mac";
  if (/Linux/.test(ua)) return "linux";
  return "other";
}
export const isEdge = () => /Edg\//.test(navigator.userAgent);
