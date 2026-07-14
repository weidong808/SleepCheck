"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconMoon,
  IconPlay,
  IconShare,
  IconStop,
  soundIcon,
} from "@/components/Icons";
import { BREATH_MODES } from "@/lib/breath";
import { APP_NAME } from "@/lib/brand";
import { audioEngine } from "@/lib/audioEngine";
import {
  PRESETS,
  buildShareUrl,
  decodeMix,
  mixLabel,
} from "@/lib/presets";
import { SAMPLE_SRCS, SOUNDS } from "@/lib/sounds";
import {
  type StreakStats,
  getStreakStats,
  recordNight,
} from "@/lib/streaks";
import {
  cancelSpeech,
  listVoices,
  pauseSpeech,
  resumeSpeech,
  speakText,
} from "@/lib/speech";
import { STORIES } from "@/lib/stories";
import {
  type BreathModeId,
  type SleepPreferences,
  type SoundState,
  type TabId,
  loadPreferences,
  savePreferences,
} from "@/lib/storage";

const TIMER_OPTIONS = [15, 30, 45, 60];
const DEFAULT_PRESET = "rainy-cabin";
const VOICE_PREVIEW = "The rain has settled in, and the room is warm. Rest now.";

export function SleepApp() {
  const [prefs, setPrefs] = useState<SleepPreferences | null>(null);
  const [reading, setReading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [paragraph, setParagraph] = useState(-1);
  const [breathRunning, setBreathRunning] = useState(false);
  const [breathPhase, setBreathPhase] = useState("Ready");
  const [breathCount, setBreathCount] = useState(4);
  const [breathBig, setBreathBig] = useState(false);
  const [timerLeft, setTimerLeft] = useState<number | null>(null);
  const [customMins, setCustomMins] = useState("");
  const [sharedMix, setSharedMix] = useState<Record<string, number> | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [streak, setStreak] = useState<StreakStats | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showMixer, setShowMixer] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const readingRef = useRef(false);
  const paragraphRef = useRef(-1);
  const storyIdRef = useRef<string | null>(null);
  const rateRef = useRef(0.68);
  const pitchRef = useRef(0.86);
  const voiceNameRef = useRef<string | null>(null);
  const breathVoiceRef = useRef(true);
  const breathTimerRef = useRef<number | null>(null);
  const sleepTimerRef = useRef<number | null>(null);
  const readNextRef = useRef<() => void>(() => {});
  const preloadedRef = useRef(false);

  useEffect(() => {
    const loaded = loadPreferences();
    const sounds: Record<string, SoundState> = { ...loaded.sounds };
    for (const s of SOUNDS) {
      if (!sounds[s.id]) sounds[s.id] = { active: false, vol: s.vol };
      else sounds[s.id] = { ...sounds[s.id], active: false };
    }
    if (!loaded.storyId) loaded.storyId = STORIES[0]?.id ?? null;
    const t = window.setTimeout(() => {
      setPrefs({ ...loaded, sounds });
      setStreak(getStreakStats());
      const params = new URLSearchParams(window.location.search);
      const rawMix = params.get("mix");
      const presetId = params.get("preset");
      if (rawMix) {
        setSharedMix(decodeMix(rawMix));
      } else if (presetId) {
        const p = PRESETS.find((x) => x.id === presetId);
        if (p) setSharedMix(p.mix);
      }
    }, 0);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Voices load asynchronously on most platforms.
    const updateVoices = () => setVoices(listVoices());
    updateVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speechSynthesis.addEventListener?.("voiceschanged", updateVoices);
    }

    // Warm the audio cache on first interaction (user gesture unlocks audio).
    const warm = () => {
      if (preloadedRef.current) return;
      preloadedRef.current = true;
      audioEngine.preload(SAMPLE_SRCS);
    };
    window.addEventListener("pointerdown", warm, { once: true });

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", warm);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        speechSynthesis.removeEventListener?.("voiceschanged", updateVoices);
      }
    };
  }, []);

  useEffect(() => {
    if (!prefs) return;
    savePreferences(prefs);
    storyIdRef.current = prefs.storyId;
    rateRef.current = prefs.rate;
    pitchRef.current = prefs.pitch;
    voiceNameRef.current = prefs.voiceName;
    breathVoiceRef.current = prefs.breathVoice;
  }, [prefs]);

  useEffect(() => {
    return () => {
      audioEngine.stopAll();
      cancelSpeech();
      if (breathTimerRef.current) window.clearInterval(breathTimerRef.current);
      if (sleepTimerRef.current) window.clearInterval(sleepTimerRef.current);
    };
  }, []);

  const updatePrefs = useCallback((patch: Partial<SleepPreferences>) => {
    setPrefs((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const markWindDown = useCallback(() => {
    setStreak(recordNight());
  }, []);

  const activeSounds = useMemo(() => {
    if (!prefs) return [];
    return SOUNDS.filter((s) => prefs.sounds[s.id]?.active);
  }, [prefs]);

  const selectedStory = useMemo(
    () => STORIES.find((s) => s.id === prefs?.storyId) ?? STORIES[0],
    [prefs?.storyId],
  );

  const playing = reading || activeSounds.length > 0;

  const nowTitle = reading
    ? selectedStory?.title ?? "Story"
    : activePreset
      ? PRESETS.find((p) => p.id === activePreset)?.name ??
        activeSounds.map((s) => s.label).join(" + ")
      : activeSounds.length
        ? activeSounds.map((s) => s.label).join(" + ")
        : "Ready for tonight";

  const nowSub = reading
    ? "Reading softly. Close your eyes."
    : activeSounds.length
      ? "Playing. Set a timer and put the phone down."
      : "Pick a scene below, or just press play.";

  // Lock-screen / media-key controls.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!playing) {
      ms.playbackState = "none";
      ms.metadata = null;
      return;
    }
    ms.metadata = new MediaMetadata({
      title: nowTitle,
      artist: APP_NAME,
      artwork: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    });
    ms.playbackState = "playing";
    try {
      ms.setActionHandler("pause", () => {
        audioEngine.suspend();
        pauseSpeech();
        ms.playbackState = "paused";
      });
      ms.setActionHandler("play", () => {
        audioEngine.resume();
        resumeSpeech();
        ms.playbackState = "playing";
      });
    } catch {
      /* unsupported handlers */
    }
    return () => {
      try {
        ms.setActionHandler("pause", null);
        ms.setActionHandler("play", null);
      } catch {
        /* noop */
      }
    };
  }, [playing, nowTitle]);

  const startSound = (id: string, vol: number) => {
    const def = SOUNDS.find((s) => s.id === id);
    if (!def) return;
    audioEngine.start(id, def.type, vol, def.src);
  };

  const toggleSound = (id: string) => {
    if (!prefs) return;
    const def = SOUNDS.find((s) => s.id === id);
    if (!def) return;
    const current = prefs.sounds[id] ?? { active: false, vol: def.vol };
    const nextActive = !current.active;
    if (nextActive) {
      startSound(id, current.vol);
      markWindDown();
    } else {
      audioEngine.stop(id);
    }
    setActivePreset(null);
    updatePrefs({
      sounds: { ...prefs.sounds, [id]: { ...current, active: nextActive } },
    });
  };

  const applyMix = (mix: Record<string, number>, presetId?: string) => {
    if (!prefs) return;
    audioEngine.stopAll();
    const nextSounds: Record<string, SoundState> = { ...prefs.sounds };
    for (const id of Object.keys(nextSounds)) {
      nextSounds[id] = { ...nextSounds[id], active: false };
    }
    for (const [id, vol] of Object.entries(mix)) {
      if (!SOUNDS.some((s) => s.id === id)) continue;
      nextSounds[id] = { active: true, vol };
      startSound(id, vol);
    }
    setActivePreset(presetId ?? null);
    updatePrefs({
      sounds: nextSounds,
      tab: "sleep",
      ...(presetId ? { lastPresetId: presetId } : {}),
    });
    markWindDown();
  };

  const stopStory = useCallback(() => {
    readingRef.current = false;
    setReading(false);
    setPaused(false);
    setParagraph(-1);
    paragraphRef.current = -1;
    cancelSpeech();
  }, []);

  const stopAllAudio = useCallback(() => {
    audioEngine.stopAll();
    stopStory();
    setActivePreset(null);
    setPrefs((prev) => {
      if (!prev) return prev;
      const nextSounds = { ...prev.sounds };
      for (const id of Object.keys(nextSounds)) {
        nextSounds[id] = { ...nextSounds[id], active: false };
      }
      return { ...prev, sounds: nextSounds };
    });
  }, [stopStory]);

  /** The one big button. */
  const togglePlay = () => {
    if (playing) {
      stopAllAudio();
      return;
    }
    const presetId = prefs?.lastPresetId ?? DEFAULT_PRESET;
    const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
    applyMix(preset.mix, preset.id);
  };

  const shareMix = async () => {
    if (!prefs) return;
    const mix: Record<string, number> = {};
    for (const s of SOUNDS) {
      const st = prefs.sounds[s.id];
      if (st?.active) mix[s.id] = st.vol;
    }
    if (!Object.keys(mix).length) return;
    const url = buildShareUrl(mix);
    const title = `${APP_NAME} mix: ${mixLabel(mix)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setShareNote("Shared");
      } else {
        await navigator.clipboard.writeText(url);
        setShareNote("Link copied");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareNote("Link copied");
      } catch {
        setShareNote(null);
      }
    }
    window.setTimeout(() => setShareNote(null), 2200);
  };

  const setSoundVol = (id: string, vol: number) => {
    if (!prefs) return;
    const current = prefs.sounds[id];
    if (!current) return;
    audioEngine.setVol(id, vol);
    updatePrefs({ sounds: { ...prefs.sounds, [id]: { ...current, vol } } });
  };

  useEffect(() => {
    readNextRef.current = () => {
      const story = STORIES.find((s) => s.id === storyIdRef.current);
      if (!readingRef.current || !story) return;
      if (paragraphRef.current >= story.paras.length) {
        stopStory();
        return;
      }
      setParagraph(paragraphRef.current);
      speakText(
        story.paras[paragraphRef.current],
        {
          rate: rateRef.current,
          pitch: pitchRef.current,
          voiceName: voiceNameRef.current,
        },
        () => {
          if (!readingRef.current) return;
          paragraphRef.current += 1;
          window.setTimeout(() => readNextRef.current(), 850);
        },
      );
    };
  }, [stopStory]);

  const startStory = () => {
    if (!selectedStory) return;
    readingRef.current = true;
    paragraphRef.current = 0;
    setReading(true);
    setPaused(false);
    setParagraph(0);
    markWindDown();
    readNextRef.current();
  };

  const togglePauseStory = () => {
    if (!reading) return;
    if (paused) {
      resumeSpeech();
      setPaused(false);
    } else {
      pauseSpeech();
      setPaused(true);
    }
  };

  const previewVoice = () => {
    if (!prefs) return;
    speakText(VOICE_PREVIEW, {
      rate: prefs.rate,
      pitch: prefs.pitch,
      voiceName: prefs.voiceName,
    });
  };

  const sayCue = (phase: string) => {
    if (!breathVoiceRef.current) return;
    const words: Record<string, string> = {
      Inhale: "breathe in",
      Hold: "hold gently",
      Exhale: "breathe out slowly",
    };
    speakText(words[phase] || phase, {
      rate: 0.48,
      pitch: 0.78,
      volume: 0.45,
      voiceName: voiceNameRef.current,
    });
  };

  const stopBreath = () => {
    if (breathTimerRef.current) {
      window.clearInterval(breathTimerRef.current);
      breathTimerRef.current = null;
    }
    setBreathRunning(false);
    setBreathPhase("Ready");
    setBreathCount(4);
    setBreathBig(false);
  };

  const startBreath = () => {
    if (breathRunning) {
      stopBreath();
      return;
    }
    const mode = prefs?.breathMode ?? "calm";
    const m = BREATH_MODES[mode];
    let i = 0;
    let left = m.durs[0];
    const apply = () => {
      const ph = m.phases[i];
      left = m.durs[i];
      setBreathPhase(ph);
      setBreathCount(left);
      setBreathBig(ph === "Inhale" || ph === "Hold");
      sayCue(ph);
    };
    apply();
    setBreathRunning(true);
    markWindDown();
    breathTimerRef.current = window.setInterval(() => {
      left -= 1;
      if (left <= 0) {
        i = (i + 1) % m.phases.length;
        apply();
      } else {
        setBreathCount(left);
      }
    }, 1000);
  };

  const clearSleepTimer = () => {
    if (sleepTimerRef.current) {
      window.clearInterval(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setTimerLeft(null);
  };

  const startTimer = (mins: number) => {
    clearSleepTimer();
    const total = mins * 60;
    setTimerLeft(total);
    updatePrefs({ lastTimerMinutes: mins });
    let left = total;
    sleepTimerRef.current = window.setInterval(() => {
      left -= 1;
      setTimerLeft(left);
      if (left === 60) audioEngine.fadeTo(0, 56);
      if (left <= 0) {
        clearSleepTimer();
        stopAllAudio();
        audioEngine.fadeTo(0.82, 0.5);
      }
    }, 1000);
  };

  const cancelTimer = () => {
    clearSleepTimer();
    audioEngine.fadeTo(0.82, 2);
  };

  if (!prefs) {
    return (
      <div className="shell">
        <p className="text-muted text-sm">Preparing your quiet room…</p>
      </div>
    );
  }

  const tab = prefs.tab;
  const storyFill =
    selectedStory && paragraph >= 0
      ? ((paragraph + 1) / selectedStory.paras.length) * 100
      : 0;
  const timerLabel =
    timerLeft == null
      ? ""
      : `${Math.floor(timerLeft / 60)}:${String(timerLeft % 60).padStart(2, "0")}`;

  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 15% 0%, var(--hero-glow), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 10%, rgba(217,161,62,0.07), transparent 50%)",
        }}
      />

      <div className="shell">
        <header className="mb-8 flex items-center justify-between gap-4 pb-2">
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
            {APP_NAME}
          </p>
          <div className="flex items-center gap-4 text-sm">
            {streak && streak.current > 0 && (
              <span
                className="flex items-center gap-1.5 text-muted"
                title={`Wind-down streak · best ${streak.best}`}
              >
                <IconMoon className="h-4 w-4 text-accent" />
                {streak.current} night{streak.current === 1 ? "" : "s"}
              </span>
            )}
            <Link
              href="/about"
              className="text-muted transition-colors hover:text-foreground"
            >
              About
            </Link>
          </div>
        </header>

        {sharedMix && (
          <div className="panel mb-6 flex flex-wrap items-center justify-between gap-4 border-accent/40 p-5">
            <div>
              <p className="section-label">A sleep mix was shared with you</p>
              <p className="mt-2 text-lg text-foreground">{mixLabel(sharedMix)}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  applyMix(sharedMix);
                  setSharedMix(null);
                  window.history.replaceState(null, "", window.location.pathname);
                }}
              >
                Play this mix
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSharedMix(null);
                  window.history.replaceState(null, "", window.location.pathname);
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ——— Player ——— */}
        <section className="panel mb-8 p-6 sm:p-8">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Stop everything" : "Play last scene"}
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full border transition-all sm:h-24 sm:w-24 ${
                playing
                  ? "border-accent/60 bg-accent/15 text-accent"
                  : "border-border bg-card text-foreground hover:border-accent/50 hover:text-accent"
              }`}
            >
              {playing ? (
                <IconStop className="h-8 w-8" />
              ) : (
                <IconPlay className="h-9 w-9 translate-x-0.5" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="section-label">Tonight</p>
              <h1 className="display mt-1 truncate text-3xl text-foreground sm:text-4xl">
                {nowTitle}
              </h1>
              <p className="mt-1.5 text-sm text-muted">{nowSub}</p>
            </div>
            {playing && (
              <button
                type="button"
                onClick={shareMix}
                className="hidden shrink-0 items-center gap-2 border border-border px-3 py-2 text-sm text-muted transition-colors hover:text-foreground sm:flex"
              >
                <IconShare className="h-4 w-4" />
                {shareNote ?? "Share"}
              </button>
            )}
          </div>

          {/* Timer row */}
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
            <span className="mr-1 text-xs text-muted">Sleep timer</span>
            {timerLeft == null ? (
              <>
                {TIMER_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent/50 hover:text-foreground"
                    onClick={() => startTimer(m)}
                  >
                    {m}m
                  </button>
                ))}
                <form
                  className="flex items-center"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const m = parseInt(customMins, 10);
                    if (Number.isFinite(m) && m >= 1 && m <= 480) {
                      startTimer(m);
                      setCustomMins("");
                    }
                  }}
                >
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={customMins}
                    onChange={(e) => setCustomMins(e.target.value)}
                    placeholder="…"
                    aria-label="Custom timer minutes"
                    className="w-14 border border-border bg-transparent px-2 py-1.5 text-center text-sm text-foreground outline-none [appearance:textfield]"
                  />
                  <button
                    type="submit"
                    className="border border-l-0 border-border px-2.5 py-1.5 text-sm text-muted hover:text-foreground"
                  >
                    Set
                  </button>
                </form>
              </>
            ) : (
              <>
                <span className="font-mono text-lg text-foreground">{timerLabel}</span>
                <span className="text-xs text-muted">
                  {timerLeft <= 60 ? "fading to silence…" : "until fade-out"}
                </span>
                <button
                  type="button"
                  className="ml-2 border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
                  onClick={cancelTimer}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </section>

        {/* ——— Nav ——— */}
        <nav className="tab-bar mb-8" aria-label="App sections">
          {(
            [
              ["sleep", "Sleep"],
              ["stories", "Stories"],
              ["breathe", "Breathe"],
            ] as Array<[TabId, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`tab-btn ${tab === id ? "active" : ""}`}
              onClick={() => updatePrefs({ tab: id })}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ——— Sleep: scenes + mixer ——— */}
        {tab === "sleep" && (
          <section>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PRESETS.map((p) => {
                const Icon = soundIcon(p.icon);
                const isActive = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`sound-card text-left transition-colors ${
                      isActive ? "active" : ""
                    }`}
                    onClick={() => (isActive ? stopAllAudio() : applyMix(p.mix, p.id))}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center border border-border text-muted">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span
                        className={`mt-1 h-2 w-2 rounded-full ${
                          isActive ? "bg-accent" : "bg-border"
                        }`}
                      />
                    </span>
                    <span className="mt-3 block text-base font-medium text-foreground">
                      {p.name}
                    </span>
                    <span className="mt-1 block text-sm text-muted">{p.desc}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="mt-8 flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
              onClick={() => setShowMixer((v) => !v)}
              aria-expanded={showMixer}
            >
              <span
                className={`inline-block transition-transform ${showMixer ? "rotate-90" : ""}`}
              >
                ›
              </span>
              Fine-tune your own mix
            </button>

            {showMixer && (
              <div className="mt-4 flex flex-col gap-2">
                {SOUNDS.map((s) => {
                  const st = prefs.sounds[s.id];
                  const active = Boolean(st?.active);
                  const Icon = soundIcon(s.id);
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-4 border px-4 py-3 transition-colors ${
                        active ? "border-accent/40 bg-accent/5" : "border-border"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => toggleSound(s.id)}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center border ${
                            active
                              ? "border-accent/50 text-accent"
                              : "border-border text-muted"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {s.label}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {s.desc}
                          </span>
                        </span>
                      </button>
                      {active && (
                        <input
                          type="range"
                          min={0}
                          max={0.8}
                          step={0.01}
                          value={st?.vol ?? s.vol}
                          onChange={(e) => setSoundVol(s.id, parseFloat(e.target.value))}
                          aria-label={`${s.label} volume`}
                          className="w-28 sm:w-40"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ——— Stories ——— */}
        {tab === "stories" && selectedStory && (
          <section className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              {STORIES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`story-row ${selectedStory.id === s.id ? "selected" : ""}`}
                  onClick={() => {
                    stopStory();
                    updatePrefs({ storyId: s.id });
                  }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-border font-mono text-xs text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">
                      {s.title}
                    </span>
                    <span className="mt-1 block text-xs text-muted">{s.meta}</span>
                  </span>
                </button>
              ))}
            </div>

            <article className="panel flex flex-col gap-5 p-6 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn btn-primary" onClick={startStory}>
                  {reading ? "Restart" : "Read to me"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={togglePauseStory}
                  disabled={!reading}
                >
                  {paused ? "Resume" : "Pause"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={stopStory}>
                  Stop
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="border border-border bg-background/40 p-3 sm:col-span-2">
                  <span className="mb-2 flex items-center justify-between text-xs text-muted">
                    <span>Voice</span>
                    <button
                      type="button"
                      className="text-accent hover:underline"
                      onClick={previewVoice}
                    >
                      Preview
                    </button>
                  </span>
                  <select
                    value={prefs.voiceName ?? ""}
                    onChange={(e) =>
                      updatePrefs({ voiceName: e.target.value || null })
                    }
                    className="w-full border border-border bg-card px-2 py-2 text-sm text-foreground outline-none"
                  >
                    <option value="">Auto — best available on this device</option>
                    {voices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-xs text-muted">
                    Tip: many devices hide their most natural voices — try a few.
                  </span>
                </label>
                <label className="border border-border bg-background/40 p-3">
                  <span className="mb-2 flex justify-between text-xs text-muted">
                    <span>Speed</span>
                    <span>
                      {prefs.rate < 0.66
                        ? "Very slow"
                        : prefs.rate < 0.78
                          ? "Slow"
                          : "Relaxed"}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0.55}
                    max={0.9}
                    step={0.01}
                    value={prefs.rate}
                    onChange={(e) => updatePrefs({ rate: parseFloat(e.target.value) })}
                  />
                </label>
                <label className="border border-border bg-background/40 p-3">
                  <span className="mb-2 flex justify-between text-xs text-muted">
                    <span>Warmth</span>
                    <span>
                      {prefs.pitch < 0.82
                        ? "Warm"
                        : prefs.pitch < 0.94
                          ? "Gentle"
                          : "Bright"}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0.72}
                    max={1.02}
                    step={0.01}
                    value={prefs.pitch}
                    onChange={(e) => updatePrefs({ pitch: parseFloat(e.target.value) })}
                  />
                </label>
              </div>

              <div className="h-px bg-border">
                <div
                  className="h-px bg-accent transition-[width] duration-500"
                  style={{ width: `${storyFill}%` }}
                />
              </div>
              <div className="max-h-[300px] overflow-auto border border-border bg-background/50 p-5 text-[0.95rem] leading-[1.9] text-muted">
                {selectedStory.paras.map((p, i) => (
                  <p
                    key={i}
                    className={`mb-4 last:mb-0 ${i === paragraph ? "text-foreground" : ""}`}
                  >
                    {p}
                  </p>
                ))}
              </div>
            </article>
          </section>
        )}

        {/* ——— Breathe ——— */}
        {tab === "breathe" && (
          <section className="panel grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="section-label">Guided breathing</p>
              <h2 className="display mt-3 text-4xl text-foreground">
                Slow the body first.
              </h2>
              <div className="mt-6 flex flex-wrap gap-2">
                {(Object.keys(BREATH_MODES) as BreathModeId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`border px-3 py-2 text-sm transition-colors ${
                      prefs.breathMode === id
                        ? "border-accent/50 bg-accent/10 text-foreground"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                    onClick={() => updatePrefs({ breathMode: id })}
                  >
                    {BREATH_MODES[id].name}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" onClick={startBreath}>
                  {breathRunning ? "Stop" : "Begin"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => updatePrefs({ breathVoice: !prefs.breathVoice })}
                >
                  {prefs.breathVoice ? "Voice on" : "Voice off"}
                </button>
              </div>
            </div>
            <div className="flex min-h-[260px] items-center justify-center border border-border bg-background/40">
              <div
                className={`flex h-36 w-36 flex-col items-center justify-center border border-border transition-transform duration-[4000ms] ease-in-out ${
                  breathBig ? "scale-125 border-accent/40" : "scale-100"
                }`}
              >
                <p className="section-label">{breathPhase}</p>
                <p className="display mt-2 text-5xl text-foreground">{breathCount}</p>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-14 border-t border-border pt-6 text-sm text-muted">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>Everything stays on this device. Not medical advice.</p>
            <p className="font-mono text-xs tracking-wide uppercase">{APP_NAME}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
