/** Hungarian text-to-speech through the browser's built-in voices. */
let huVoice: SpeechSynthesisVoice | null = null;
const supported = typeof window !== "undefined" && "speechSynthesis" in window;
const listeners = new Set<() => void>();

function pickVoice() {
  if (!supported) return;
  const voices = speechSynthesis.getVoices();
  huVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("hu")) ?? null;
  listeners.forEach((l) => l());
}

if (supported) {
  pickVoice();
  speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}

export const canSpeak = () => supported;
export const hasHungarianVoice = () => !!huVoice;
export const onVoices = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function speak(text: string, rate = 0.85) {
  if (!supported) return;
  try {
    const clean = text.replace(/\s*\/\s*/g, ", ").replace(/\((.*?)\)/g, "").replace(/[„”“]/g, "");
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "hu-HU";
    u.rate = rate;
    if (huVoice) u.voice = huVoice;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}
