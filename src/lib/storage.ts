export type TabId = "sleep" | "stories" | "breathe";

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
  voiceName: string | null;
  breathMode: BreathModeId;
  breathVoice: boolean;
  lastTimerMinutes: number;
  lastPresetId: string | null;
};

export const STORAGE_KEY = "sleepcheck.preferences.v1";

export const defaultPreferences = (): SleepPreferences => ({
  version: 1,
  tab: "sleep",
  sounds: {},
  storyId: null,
  rate: 0.68,
  pitch: 0.86,
  voiceName: null,
  breathMode: "calm",
  breathVoice: true,
  lastTimerMinutes: 30,
  lastPresetId: null,
});

export function loadPreferences(): SleepPreferences {
  if (typeof window === "undefined") return defaultPreferences();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreferences();
    const parsed = JSON.parse(raw) as Partial<SleepPreferences> & {
      tab?: string;
    };
    // Migrate pre-redesign tab ids ("sounds"/"timer" fold into "sleep").
    const tab: TabId =
      parsed.tab === "stories" || parsed.tab === "breathe"
        ? parsed.tab
        : "sleep";
    return {
      ...defaultPreferences(),
      ...parsed,
      tab,
      version: 1,
      sounds: parsed.sounds ?? {},
      voiceName: parsed.voiceName ?? null,
      lastPresetId: parsed.lastPresetId ?? null,
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
