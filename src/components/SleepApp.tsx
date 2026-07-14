"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconMoon,
  IconPlay,
  IconShare,
  IconStop,
  NarratorAvatar,
  soundIcon,
} from "@/components/Icons";
import { BREATH_MODES } from "@/lib/breath";
import { APP_NAME, APP_TAGLINE, SITE_HOME_URL } from "@/lib/brand";
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
  type Narrator,
  cancelSpeech,
  hasNaturalVoice,
  listNarrators,
  listVoices,
  pauseSpeech,
  resumeSpeech,
  speakSentences,
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
const VOICE_PREVIEW =
  "You are standing at the edge of a quiet forest, just as evening begins to soften the sky.";

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
  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showAllVoices, setShowAllVoices] = useState(false);
  const [naturalAvailable, setNaturalAvailable] = useState(true);

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
  const timerLeftRef = useRef<number | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

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
    const updateVoices = () => {
      setNarrators(listNarrators());
      setAllVoices(listVoices());
      setNaturalAvailable(hasNaturalVoice());
    };
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
    // Un-duck the ambience — unless the sleep timer owns the fade right now.
    if (timerLeftRef.current == null || timerLeftRef.current > 61) {
      audioEngine.fadeTo(0.82, 1.5);
    }
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
      speakSentences(
        story.paras[paragraphRef.current],
        {
          rate: rateRef.current,
          pitch: pitchRef.current,
          voiceName: voiceNameRef.current,
        },
        () => {
          if (!readingRef.current) return;
          paragraphRef.current += 1;
          window.setTimeout(() => readNextRef.current(), 1100);
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
    // Duck the soundscape so the narrator sits clearly on top.
    if (timerLeftRef.current == null || timerLeftRef.current > 61) {
      audioEngine.fadeTo(0.38, 1.2);
    }
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

  /** Selecting a narrator also plays a short sample so choosing is instant. */
  const chooseNarrator = (name: string | null) => {
    if (!prefs || reading) {
      updatePrefs({ voiceName: name });
      return;
    }
    updatePrefs({ voiceName: name });
    speakText(VOICE_PREVIEW, {
      rate: prefs.rate,
      pitch: prefs.pitch,
      voiceName: name,
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
    void wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
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
    // Keep the screen awake while the person follows the visual guide.
    if ("wakeLock" in navigator) {
      (navigator as Navigator & {
        wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
      }).wakeLock
        .request("screen")
        .then((s) => {
          wakeLockRef.current = s;
        })
        .catch(() => {});
    }
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
    timerLeftRef.current = null;
  };

  const startTimer = (mins: number) => {
    clearSleepTimer();
    const total = mins * 60;
    setTimerLeft(total);
    timerLeftRef.current = total;
    updatePrefs({ lastTimerMinutes: mins });
    let left = total;
    sleepTimerRef.current = window.setInterval(() => {
      left -= 1;
      setTimerLeft(left);
      timerLeftRef.current = left;
      if (left === 60) audioEngine.fadeTo(0, 56);
      if (left <= 0) {
        clearSleepTimer();
        stopAllAudio();
        // Restore master volume only after node-level fades finish,
        // so nothing blips back in audibly after the timer ends.
        window.setTimeout(() => audioEngine.fadeTo(0.82, 0.5), 1600);
      }
    }, 1000);
  };

  const cancelTimer = () => {
    clearSleepTimer();
    audioEngine.fadeTo(reading ? 0.38 : 0.82, 2);
  };

  // Countdown in the tab title so the timer is visible from anywhere.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title =
      timerLeft != null
        ? `${Math.floor(timerLeft / 60)}:${String(timerLeft % 60).padStart(2, "0")} · ${APP_NAME}`
        : `${APP_NAME} — ${APP_TAGLINE}`;
  }, [timerLeft]);

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
  const showEdgeTip =
    !naturalAvailable &&
    typeof navigator !== "undefined" &&
    /Windows/i.test(navigator.userAgent);

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
          <Link href="/" className="group flex items-center gap-3">
            <Image
              src="/icon-192.png"
              alt={`${APP_NAME} logo`}
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-lg border border-border transition-colors group-hover:border-accent/50"
            />
            <span>
              <span className="display block text-2xl leading-none text-foreground transition-colors group-hover:text-accent">
                {APP_NAME}
              </span>
              <span className="mt-1 block font-mono text-[10px] tracking-[0.18em] text-muted uppercase">
                {APP_TAGLINE}
              </span>
            </span>
          </Link>
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
                <span role="timer" className="font-mono text-lg text-foreground">
                  {timerLabel}
                </span>
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
                const isActive = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={isActive}
                    className={`relative h-36 overflow-hidden border text-left transition-all sm:h-40 ${
                      isActive
                        ? "border-accent/60"
                        : "border-border hover:border-foreground/30"
                    }`}
                    onClick={() => (isActive ? stopAllAudio() : applyMix(p.mix, p.id))}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${p.image})` }}
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(9,11,10,0.05) 0%, rgba(9,11,10,0.35) 55%, rgba(9,11,10,0.82) 100%)",
                      }}
                    />
                    <span className="relative z-10 flex h-full flex-col justify-end p-4">
                      <span className="display block text-xl leading-tight text-foreground">
                        {p.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted">{p.desc}</span>
                    </span>
                    <span
                      className={`absolute top-3 right-3 z-10 h-2 w-2 rounded-full ${
                        isActive ? "bg-accent" : "bg-border"
                      }`}
                    />
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
                        aria-pressed={active}
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
          <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              {STORIES.map((s) => {
                const selected = selectedStory.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`relative h-28 overflow-hidden border text-left transition-all ${
                      selected
                        ? "border-accent/60"
                        : "border-border hover:border-foreground/30"
                    }`}
                    onClick={() => {
                      stopStory();
                      updatePrefs({ storyId: s.id });
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${s.image})` }}
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(9,11,10,0.85) 0%, rgba(9,11,10,0.45) 55%, rgba(9,11,10,0.15) 100%)",
                      }}
                    />
                    <span className="relative z-10 flex h-full flex-col justify-end p-4">
                      <span className="display block text-lg leading-tight text-foreground">
                        {s.title}
                      </span>
                      <span className="mt-1 block text-xs text-muted">{s.meta}</span>
                    </span>
                    {selected && (
                      <span className="absolute top-3 right-3 z-10 h-2 w-2 rounded-full bg-accent" />
                    )}
                  </button>
                );
              })}
            </div>

            <article className="panel flex flex-col overflow-hidden">
              {/* Scene banner */}
              <div className="relative h-44 shrink-0 sm:h-52">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${selectedStory.image})` }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(9,11,10,0.1) 0%, rgba(9,11,10,0.55) 70%, var(--card) 100%)",
                  }}
                />
                <div className="absolute right-0 bottom-0 left-0 z-10 flex items-end justify-between gap-4 p-5 sm:p-6">
                  <div>
                    <h3 className="display text-3xl text-foreground drop-shadow">
                      {selectedStory.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted">{selectedStory.meta}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-5 p-6 sm:p-7">
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

                {/* Narrator picker */}
                <div className="border border-border bg-background/40 p-4">
                  <p className="mb-3 text-xs text-muted">
                    Narrator — tap to hear a sample
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={prefs.voiceName == null}
                      className={`flex items-center gap-2 border py-1.5 pr-3 pl-1.5 text-sm transition-colors ${
                        prefs.voiceName == null
                          ? "border-accent/50 bg-accent/10 text-foreground"
                          : "border-border text-muted hover:text-foreground"
                      }`}
                      onClick={() => chooseNarrator(null)}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border border-accent/40 bg-accent/10 transition-all ${
                          prefs.voiceName == null
                            ? "ring-2 ring-accent"
                            : "opacity-75"
                        }`}
                      >
                        <IconMoon className="h-4 w-4 text-accent" />
                      </span>
                      Auto
                    </button>
                    {narrators.map((n) => (
                      <button
                        key={n.name}
                        type="button"
                        aria-pressed={prefs.voiceName === n.name}
                        className={`flex items-center gap-2 border py-1.5 pr-3 pl-1.5 text-sm transition-colors ${
                          prefs.voiceName === n.name
                            ? "border-accent/50 bg-accent/10 text-foreground"
                            : "border-border text-muted hover:text-foreground"
                        }`}
                        onClick={() => chooseNarrator(n.name)}
                      >
                        <span
                          className={`inline-flex shrink-0 rounded-full transition-all ${
                            prefs.voiceName === n.name
                              ? "ring-2 ring-accent"
                              : "opacity-75"
                          }`}
                        >
                          <NarratorAvatar
                            name={n.name}
                            gender={n.gender}
                            className="block h-7 w-7 rounded-full"
                          />
                        </span>
                        {n.label}
                        {n.tag !== "Standard" && (
                          <span className="border border-accent/40 px-1.5 py-0.5 text-[10px] tracking-wide text-accent uppercase">
                            {n.tag}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {showEdgeTip && (
                    <p className="mt-3 text-xs text-muted">
                      Tip: on Windows, opening this app in{" "}
                      <span className="text-foreground">Microsoft Edge</span> unlocks
                      free natural-sounding narrator voices.
                    </p>
                  )}
                  <button
                    type="button"
                    className="mt-3 text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
                    onClick={() => setShowAllVoices((v) => !v)}
                  >
                    {showAllVoices ? "Hide all voices" : `All device voices (${allVoices.length})`}
                  </button>
                  {showAllVoices && (
                    <select
                      value={prefs.voiceName ?? ""}
                      onChange={(e) => chooseNarrator(e.target.value || null)}
                      className="mt-2 w-full border border-border bg-card px-2 py-2 text-sm text-foreground outline-none"
                    >
                      <option value="">Auto — best available</option>
                      {allVoices.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
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
                <div className="max-h-[280px] overflow-auto border border-border bg-background/50 p-5 text-[0.95rem] leading-[1.9] text-muted">
                  {selectedStory.paras.map((p, i) => (
                    <p
                      key={i}
                      className={`mb-4 last:mb-0 ${i === paragraph ? "text-foreground" : ""}`}
                    >
                      {p}
                    </p>
                  ))}
                </div>
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
                aria-live="polite"
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

        <footer className="mt-16 border-t border-border pt-8 text-sm text-muted">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/icon-192.png"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-md border border-border"
                />
                <span className="display text-lg text-foreground">{APP_NAME}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed">
                A calm wind-down companion. Everything stays on this device — no
                account, no tracking. Not medical advice.
              </p>
            </div>
            <div className="flex gap-12 text-xs">
              <div>
                <p className="section-label mb-3">App</p>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/about"
                      className="transition-colors hover:text-foreground"
                    >
                      About
                    </Link>
                  </li>
                  <li>
                    <a
                      href={`${SITE_HOME_URL}/projects/sleep`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-foreground"
                    >
                      Project notes
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="section-label mb-3">More</p>
                <ul className="space-y-2">
                  <li>
                    <a
                      href={SITE_HOME_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 transition-colors hover:text-foreground"
                    >
                      <Image
                        src="/ws-mark.svg"
                        alt=""
                        width={18}
                        height={18}
                        unoptimized
                        className="h-[18px] w-[18px] rounded"
                      />
                      weidong-shi.com
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://retirecheck.weidong-shi.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-foreground"
                    >
                      RetireCheck
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t border-border pt-5 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Weidong Shi. All rights reserved.</p>
            <p className="font-mono tracking-wide uppercase">
              Built with Next.js · Deployed on Vercel
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
