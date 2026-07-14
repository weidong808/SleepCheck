let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const v = speechSynthesis.getVoices();
  if (v.length) cachedVoices = v;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refreshVoices();
  speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}

const PREFERRED_NAMES = [
  "Samantha",
  "Ava",
  "Allison",
  "Susan",
  "Karen",
  "Moira",
  "Tessa",
  "Fiona",
  "Serena",
  "Daniel",
  "Arthur",
  "Martha",
];

function quality(v: SpeechSynthesisVoice): number {
  let q = 0;
  if (/natural|neural|enhanced|premium|siri/i.test(v.name)) q += 4;
  if (PREFERRED_NAMES.some((n) => v.name.includes(n))) q += 2;
  if (/^en/i.test(v.lang)) q += 1;
  if (/google/i.test(v.name)) q -= 1; // Google voices cut off long utterances
  return q;
}

/** English voices, best-sounding first. May be empty until voiceschanged fires. */
export function listVoices(): SpeechSynthesisVoice[] {
  refreshVoices();
  return cachedVoices
    .filter((v) => /^en/i.test(v.lang))
    .sort((a, b) => quality(b) - quality(a));
}

export function pickVoice(preferredName?: string | null): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }
  refreshVoices();
  if (preferredName) {
    const exact = cachedVoices.find((v) => v.name === preferredName);
    if (exact) return exact;
  }
  return listVoices()[0] ?? cachedVoices[0] ?? null;
}

export function speakText(
  text: string,
  opts: { rate: number; pitch: number; volume?: number; voiceName?: string | null },
  onEnd?: () => void,
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts.rate;
  u.pitch = opts.pitch;
  u.volume = opts.volume ?? 0.86;
  const voice = pickVoice(opts.voiceName);
  if (voice) u.voice = voice;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  speechSynthesis.speak(u);
}

export function cancelSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
}

export function pauseSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  speechSynthesis.pause();
}

export function resumeSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  speechSynthesis.resume();
}
