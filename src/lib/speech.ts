export function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }
  const voices = speechSynthesis.getVoices() || [];
  const preferred = [
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
  return (
    voices.find(
      (v) =>
        /natural|neural|enhanced|premium/i.test(v.name) && /^en/i.test(v.lang),
    ) ||
    voices.find((v) => preferred.some((n) => v.name.includes(n))) ||
    voices.find((v) => /^en-US/i.test(v.lang) && !/google/i.test(v.name)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null
  );
}

export function speakText(
  text: string,
  opts: { rate: number; pitch: number; volume?: number },
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
  const voice = pickVoice();
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
