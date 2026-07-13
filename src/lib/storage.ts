export type TabId = "sounds" | "stories" | "breathe" | "timer";

export type BreathModeId = "calm" | "box" | "release";

export type SoundState = {
  active: boolean;
  vol: number;
};

export type SleepPreferences = {
  version: 1;
  tab: TabId;
  sounds: Record<string, SoundState>;
  storyId: string | null;
  rate: number;
  pitch: number;
  breathMode: BreathModeId;
  breathVoice: boolean;
  lastTimerMinutes: number;
};

export const STORAGE_KEY = "sleepcheck.preferences.v1";

export const defaultPreferences = (): SleepPreferences => ({
  version: 1,
  tab: "sounds",
  sounds: {},
  storyId: null,
  rate: 0.68,
  pitch: 0.86,
  breathMode: "calm",
  breathVoice: true,
  lastTimerMinutes: 30,
});

export function loadPreferences(): SleepPreferences {
  if (typeof window === "undefined") return defaultPreferences();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreferences();
    const parsed = JSON.parse(raw) as Partial<SleepPreferences>;
    return {
      ...defaultPreferences(),
      ...parsed,
      version: 1,
      sounds: parsed.sounds ?? {},
    };
  } catch {
    return defaultPreferences();
  }
}

export function savePreferences(prefs: SleepPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore quota / private mode failures.
  }
}
