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
  "Aria",
  "Jenny",
  "Sonia",
  "Libby",
  "Guy",
  "Ryan",
];

/** Warm default when no natural/enhanced voice exists (e.g. Chrome). */
const FALLBACK_VOICE = /google uk english female/i;

function isCharming(name: string): boolean {
  return /natural|neural|enhanced|premium|siri/i.test(name);
}

function quality(v: SpeechSynthesisVoice): number {
  let q = 0;
  if (/natural|neural/i.test(v.name)) q += 6;
  if (/enhanced|premium|siri/i.test(v.name)) q += 4;
  if (PREFERRED_NAMES.some((n) => v.name.includes(n))) q += 2;
  if (/^en/i.test(v.lang)) q += 1;
  if (/google/i.test(v.name)) q -= 1; // Google voices cut off long utterances
  if (FALLBACK_VOICE.test(v.name)) q += 3; // …but UK Female is the warmest standard voice
  return q;
}

/** English voices, best-sounding first. May be empty until voiceschanged fires. */
export function listVoices(): SpeechSynthesisVoice[] {
  refreshVoices();
  return cachedVoices
    .filter((v) => /^en/i.test(v.lang))
    .sort((a, b) => quality(b) - quality(a));
}

export type Narrator = {
  name: string; // exact system voice name (stored in prefs)
  label: string; // friendly display name
  tag: string; // "Natural" | "Enhanced" | "Standard"
};

function friendlyLabel(name: string): string {
  return (
    name
      .replace(/^Microsoft\s+/i, "")
      .replace(/\s*Online\s*\(Natural\)/i, "")
      .replace(/\s*\((Natural|Enhanced|Premium)\)/gi, "")
      .replace(/\s*-\s*English\s*\(.+\)$/i, "")
      .replace(/\s+English\s*\(.+\)$/i, "")
      .replace(/Multilingual/i, "")
      .trim() || name
  );
}

function tagOf(name: string): string {
  if (/natural|neural/i.test(name)) return "Natural";
  if (/enhanced|premium|siri/i.test(name)) return "Enhanced";
  return "Standard";
}

/** Curated shortlist of the most pleasant narrators on this device. */
export function listNarrators(max = 6): Narrator[] {
  const seen = new Set<string>();
  const out: Narrator[] = [];
  for (const v of listVoices()) {
    const label = friendlyLabel(v.name);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ name: v.name, label, tag: tagOf(v.name) });
    if (out.length >= max) break;
  }
  return out;
}

/** True if this device exposes at least one natural/neural voice. */
export function hasNaturalVoice(): boolean {
  return listVoices().some((v) => isCharming(v.name));
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
  const ranked = listVoices();
  const best = ranked[0];
  // Auto mode: prefer genuinely charming voices; otherwise fall back to
  // Google UK English Female — the warmest of the standard voices.
  if (best && isCharming(best.name)) return best;
  const ukFemale = ranked.find((v) => FALLBACK_VOICE.test(v.name));
  if (ukFemale) return ukFemale;
  return best ?? cachedVoices[0] ?? null;
}

export type SpeakOpts = {
  rate: number;
  pitch: number;
  volume?: number;
  voiceName?: string | null;
};

export function speakText(text: string, opts: SpeakOpts, onEnd?: () => void) {
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

let chainId = 0;
let chainPaused = false;
let breathTimer: number | null = null;
let afterBreath: (() => void) | null = null;

function clearBreathTimer() {
  if (typeof window === "undefined") return;
  if (breathTimer != null) {
    window.clearTimeout(breathTimer);
    breathTimer = null;
  }
}

/**
 * Storyteller delivery: speak sentence by sentence with breathing pauses
 * and a touch of prosody variation, so device TTS sounds less flat.
 */
export function speakSentences(text: string, opts: SpeakOpts, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  const id = ++chainId;
  chainPaused = false;
  clearBreathTimer();
  afterBreath = null;

  const sentences = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  let i = 0;

  const next = () => {
    if (id !== chainId) return;
    if (i >= sentences.length) {
      onEnd?.();
      return;
    }
    const sentence = sentences[i];
    i += 1;
    // Subtle per-sentence variation keeps the voice from droning.
    const rate = opts.rate * (0.97 + Math.random() * 0.05);
    const pitch = opts.pitch * (0.985 + Math.random() * 0.03);
    speakText(
      sentence,
      { ...opts, rate, pitch },
      () => {
        if (id !== chainId) return;
        // Longer breath after longer sentences.
        const delay = Math.min(650, 280 + sentence.length * 2.2);
        const continueChain = () => {
          if (id !== chainId) return;
          next();
        };
        afterBreath = continueChain;
        if (chainPaused) return;
        breathTimer = window.setTimeout(() => {
          breathTimer = null;
          afterBreath = null;
          continueChain();
        }, delay);
      },
    );
  };
  next();
}

export function cancelSpeech() {
  chainId += 1; // invalidate any pending sentence chain
  chainPaused = false;
  clearBreathTimer();
  afterBreath = null;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
}

export function pauseSpeech() {
  chainPaused = true;
  clearBreathTimer(); // keep afterBreath so resume can continue the chain
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  speechSynthesis.pause();
}

export function resumeSpeech() {
  chainPaused = false;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  speechSynthesis.resume();
  // If we were paused between sentences, continue the chain.
  if (afterBreath && !speechSynthesis.speaking && !speechSynthesis.pending) {
    const fn = afterBreath;
    afterBreath = null;
    fn();
  }
}
