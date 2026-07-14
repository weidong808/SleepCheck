"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { soundIcon } from "@/components/Icons";
import { BREATH_MODES } from "@/lib/breath";
import { APP_NAME, SITE_HOME_URL } from "@/lib/brand";
import { audioEngine } from "@/lib/audioEngine";
import {
  PRESETS,
  buildShareUrl,
  decodeMix,
  mixLabel,
} from "@/lib/presets";
import { SOUNDS } from "@/lib/sounds";
import {
  type StreakStats,
  getStreakStats,
  recordNight,
} from "@/lib/streaks";
import {
  cancelSpeech,
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
  const [timerTotal, setTimerTotal] = useState(0);
  const [customMins, setCustomMins] = useState("");
  const [sharedMix, setSharedMix] = useState<Record<string, number> | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [streak, setStreak] = useState<StreakStats | null>(null);

  const readingRef = useRef(false);
  const paragraphRef = useRef(-1);
  const storyIdRef = useRef<string | null>(null);
  const rateRef = useRef(0.68);
  const pitchRef = useRef(0.86);
  const breathVoiceRef = useRef(true);
  const breathTimerRef = useRef<number | null>(null);
  const sleepTimerRef = useRef<number | null>(null);
  const readNextRef = useRef<() => void>(() => {});

  useEffect(() => {
    const loaded = loadPreferences();
    const sounds: Record<string, SoundState> = { ...loaded.sounds };
    for (const s of SOUNDS) {
      if (!sounds[s.id]) sounds[s.id] = { active: false, vol: s.vol };
      else sounds[s.id] = { ...sounds[s.id], active: false };
    }
    if (!loaded.storyId) loaded.storyId = STORIES[0]?.id ?? null;
    // Defer to avoid sync setState-in-effect lint on hydration bootstrap.
    const t = window.setTimeout(() => {
      setPrefs({ ...loaded, sounds });
      setStreak(getStreakStats());

      // Shared mix or preset arriving via URL (?mix=rain:0.4,fire:0.3 | ?preset=rainy-cabin).
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

    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!prefs) return;
    savePreferences(prefs);
    storyIdRef.current = prefs.storyId;
    rateRef.current = prefs.rate;
    pitchRef.current = prefs.pitch;
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

  /** Count tonight toward the wind-down streak. */
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

  const statusText = reading
    ? "Story reading"
    : activeSounds.length
      ? "Soundscape playing"
      : "Ready for tonight";

  const nowTitle = reading
    ? `Reading ${selectedStory?.title ?? "story"}`
    : activeSounds.length
      ? activeSounds.map((s) => s.label).join(" + ")
      : "No audio playing";

  const nowSub = reading
    ? "A calm browser voice is guiding the story."
    : activeSounds.length
      ? "Soundscape is gently playing."
      : "Tap rain, ocean, or a story to begin.";

  // Lock-screen / media-key controls while the soundscape plays.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const playing = reading || activeSounds.length > 0;
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
      // Some browsers reject unsupported handlers.
    }
    return () => {
      try {
        ms.setActionHandler("pause", null);
        ms.setActionHandler("play", null);
      } catch {
        /* noop */
      }
    };
  }, [reading, activeSounds, nowTitle]);

  const toggleSound = (id: string) => {
    if (!prefs) return;
    const def = SOUNDS.find((s) => s.id === id);
    if (!def) return;
    const current = prefs.sounds[id] ?? { active: false, vol: def.vol };
    const nextActive = !current.active;
    const nextSounds = {
      ...prefs.sounds,
      [id]: { ...current, active: nextActive },
    };
    if (nextActive) {
      audioEngine.start(id, def.type, current.vol);
      markWindDown();
    } else {
      audioEngine.stop(id);
    }
    updatePrefs({ sounds: nextSounds });
  };

  /** Replace the current soundscape with a preset / shared mix. */
  const applyMix = (mix: Record<string, number>) => {
    if (!prefs) return;
    audioEngine.stopAll();
    const nextSounds: Record<string, SoundState> = { ...prefs.sounds };
    for (const id of Object.keys(nextSounds)) {
      nextSounds[id] = { ...nextSounds[id], active: false };
    }
    for (const [id, vol] of Object.entries(mix)) {
      const def = SOUNDS.find((s) => s.id === id);
      if (!def) continue;
      nextSounds[id] = { active: true, vol };
      audioEngine.start(id, def.type, vol);
    }
    updatePrefs({ sounds: nextSounds, tab: "sounds" });
    markWindDown();
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
    window.setTimeout(() => setShareNote(null), 2500);
  };

  const setSoundVol = (id: string, vol: number) => {
    if (!prefs) return;
    const current = prefs.sounds[id];
    if (!current) return;
    audioEngine.setVol(id, vol);
    updatePrefs({
      sounds: { ...prefs.sounds, [id]: { ...current, vol } },
    });
  };

  const stopStory = useCallback(() => {
    readingRef.current = false;
    setReading(false);
    setPaused(false);
    setParagraph(-1);
    paragraphRef.current = -1;
    cancelSpeech();
  }, []);

  const stopAllAudio = () => {
    audioEngine.stopAll();
    stopStory();
    if (!prefs) return;
    const nextSounds = { ...prefs.sounds };
    for (const id of Object.keys(nextSounds)) {
      nextSounds[id] = { ...nextSounds[id], active: false };
    }
    updatePrefs({ sounds: nextSounds });
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
        { rate: rateRef.current, pitch: pitchRef.current },
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

  const sayCue = (phase: string) => {
    if (!breathVoiceRef.current) return;
    const words: Record<string, string> = {
      Inhale: "breathe in",
      Hold: "hold gently",
      Exhale: "breathe out slowly",
    };
    speakText(words[phase] || phase, { rate: 0.48, pitch: 0.78, volume: 0.45 });
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
    setTimerTotal(total);
    setTimerLeft(total);
    updatePrefs({ lastTimerMinutes: mins });
    let left = total;
    sleepTimerRef.current = window.setInterval(() => {
      left -= 1;
      setTimerLeft(left);
      if (left === 60) audioEngine.fadeTo(0, 56);
      if (left <= 0) {
        clearSleepTimer();
        audioEngine.stopAll();
        stopStory();
        setPrefs((prev) => {
          if (!prev) return prev;
          const nextSounds = { ...prev.sounds };
          for (const id of Object.keys(nextSounds)) {
            nextSounds[id] = { ...nextSounds[id], active: false };
          }
          return { ...prev, sounds: nextSounds };
        });
      }
    }, 1000);
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
  const timerPct =
    timerLeft != null && timerTotal > 0
      ? (1 - timerLeft / timerTotal) * 100
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
        <header className="mb-10 flex items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
              {APP_NAME}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Wind-down companion
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted sm:inline">{statusText}</span>
            <Link href="/about" className="text-muted transition-colors hover:text-foreground">
              About
            </Link>
            <a
              href={SITE_HOME_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted transition-colors hover:text-foreground"
            >
              weidong-shi.com
            </a>
          </div>
        </header>

        {sharedMix && (
          <div className="panel mb-8 flex flex-wrap items-center justify-between gap-4 border-accent/40 p-5">
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

        <section className="mb-10 grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="panel relative overflow-hidden p-8 sm:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-80"
              style={{
                background:
                  "radial-gradient(circle at 85% 15%, rgba(217,161,62,0.12), transparent 28%)",
              }}
            />
            <div className="relative max-w-xl">
              <p className="eyebrow">Local-only · no account</p>
              <h1 className="display mt-5 text-4xl leading-[1.05] text-foreground sm:text-5xl md:text-6xl">
                Ease your mind{" "}
                <em className="text-accent not-italic">into sleep.</em>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
                Layer quiet soundscapes, follow a slow breath, then let a soft
                device voice read a bedtime story — all on your machine.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => updatePrefs({ tab: "stories" })}
                >
                  Start a story
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => updatePrefs({ tab: "sounds" })}
                >
                  Mix sounds
                </button>
              </div>
            </div>
          </div>

          <aside className="panel flex flex-col justify-between p-6 sm:p-7">
            <div>
              <p className="section-label">Tonight&apos;s session</p>
              <h2 className="display mt-4 text-3xl text-foreground">{nowTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{nowSub}</p>
            </div>
            <div className="mt-8 flex items-end justify-between gap-4 border-t border-border pt-5">
              <div className="flex gap-8">
                <div>
                  <p className="section-label">Active layers</p>
                  <p className="mt-2 text-2xl text-foreground">
                    {activeSounds.length}
                  </p>
                </div>
                <div>
                  <p className="section-label">Night streak</p>
                  <p className="mt-2 text-2xl text-foreground">
                    {streak?.current ?? 0}
                    {streak && streak.best > 1 && (
                      <span className="ml-2 text-xs text-muted">
                        best {streak.best}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {activeSounds.length > 0 && (
                  <button type="button" className="btn btn-secondary" onClick={shareMix}>
                    {shareNote ?? "Share mix"}
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={stopAllAudio}>
                  Stop all
                </button>
              </div>
            </div>
          </aside>
        </section>

        <nav className="tab-bar mb-8" aria-label="App sections">
          {(
            [
              ["sounds", "Sounds"],
              ["stories", "Stories"],
              ["breathe", "Breathe"],
              ["timer", "Timer"],
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

        {tab === "sounds" && (
          <section>
            <div className="mb-6 max-w-2xl">
              <h2 className="display text-3xl text-foreground">Soundscapes</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Generated in your browser with the Web Audio API — nothing is
                streamed from a server.
              </p>
            </div>
            <div className="mb-8">
              <p className="section-label mb-3">One-tap scenes</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="border border-border px-3 py-2 text-left text-sm text-muted transition-colors hover:border-accent/50 hover:text-foreground"
                    onClick={() => applyMix(p.mix)}
                    title={p.desc}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SOUNDS.map((s) => {
                const st = prefs.sounds[s.id];
                const active = Boolean(st?.active);
                const Icon = soundIcon(s.id);
                return (
                  <div key={s.id} className={`sound-card ${active ? "active" : ""}`}>
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 text-left"
                      onClick={() => toggleSound(s.id)}
                    >
                      <span className="flex h-10 w-10 items-center justify-center border border-border text-muted">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span
                        className={`mt-1 h-2 w-2 rounded-full ${
                          active ? "bg-accent" : "bg-border"
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => toggleSound(s.id)}
                    >
                      <div className="text-base font-medium text-foreground">
                        {s.label}
                      </div>
                      <div className="mt-1 text-sm text-muted">{s.desc}</div>
                    </button>
                    {active && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="range"
                          min={0}
                          max={0.8}
                          step={0.01}
                          value={st?.vol ?? s.vol}
                          onChange={(e) =>
                            setSoundVol(s.id, parseFloat(e.target.value))
                          }
                          aria-label={`${s.label} volume`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "stories" && selectedStory && (
          <section>
            <div className="mb-6 max-w-2xl">
              <h2 className="display text-3xl text-foreground">Sleep stories</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Written scenes narrated by your device&apos;s built-in voice — not
                a cloud AI service.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="flex flex-col gap-2">
                {STORIES.map((s) => (
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
                      {String(STORIES.findIndex((x) => x.id === s.id) + 1).padStart(2, "0")}
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

              <article className="panel flex min-h-[440px] flex-col gap-5 p-6 sm:p-7">
                <div>
                  <p className="section-label">Now reading</p>
                  <h3 className="display mt-3 text-3xl text-foreground">
                    {selectedStory.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted">{selectedStory.meta}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" onClick={startStory}>
                    Read to me
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
                  <label className="border border-border bg-background/40 p-3">
                    <span className="mb-2 flex justify-between text-xs text-muted">
                      <span>Narration speed</span>
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
                      onChange={(e) =>
                        updatePrefs({ rate: parseFloat(e.target.value) })
                      }
                    />
                  </label>
                  <label className="border border-border bg-background/40 p-3">
                    <span className="mb-2 flex justify-between text-xs text-muted">
                      <span>Voice warmth</span>
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
                      onChange={(e) =>
                        updatePrefs({ pitch: parseFloat(e.target.value) })
                      }
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
                      className={`mb-4 last:mb-0 ${
                        i === paragraph ? "text-foreground" : ""
                      }`}
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </article>
            </div>
          </section>
        )}

        {tab === "breathe" && (
          <section className="panel grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="section-label">Guided breathing</p>
              <h2 className="display mt-3 text-4xl text-foreground">
                Slow the body first.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                Optional spoken cues use your device voice. Switch to silent
                visuals anytime.
              </p>
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

        {tab === "timer" && (
          <section>
            <div className="mb-6 max-w-2xl">
              <h2 className="display text-3xl text-foreground">Sleep timer</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Everything fades gently in the final minute, then silence.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TIMER_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="border border-border bg-card px-4 py-8 text-center transition-colors hover:border-foreground/30"
                  onClick={() => startTimer(m)}
                >
                  <span className="display block text-4xl text-foreground">{m}</span>
                  <span className="mt-2 block text-xs text-muted">minutes</span>
                </button>
              ))}
            </div>
            <form
              className="mt-3 flex flex-wrap items-center gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const m = parseInt(customMins, 10);
                if (Number.isFinite(m) && m >= 1 && m <= 480) {
                  startTimer(m);
                  setCustomMins("");
                }
              }}
            >
              <label className="flex items-center gap-3 border border-border bg-card px-4 py-3">
                <span className="text-xs text-muted">Custom</span>
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={customMins}
                  onChange={(e) => setCustomMins(e.target.value)}
                  placeholder={String(prefs.lastTimerMinutes)}
                  className="w-20 bg-transparent text-lg text-foreground outline-none [appearance:textfield]"
                  aria-label="Custom timer minutes"
                />
                <span className="text-xs text-muted">min</span>
              </label>
              <button type="submit" className="btn btn-secondary">
                Start
              </button>
            </form>
            {timerLeft != null && (
              <div className="panel mt-4 flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="section-label">
                    {timerLeft <= 60 ? "Fading to silence" : "Timer running"}
                  </p>
                  <p className="display mt-2 text-4xl text-foreground">{timerLabel}</p>
                  <div className="mt-4 h-px w-48 bg-border">
                    <div
                      className="h-px bg-accent"
                      style={{ width: `${timerPct}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    clearSleepTimer();
                    audioEngine.fadeTo(0.78, 2);
                  }}
                >
                  Cancel timer
                </button>
              </div>
            )}
          </section>
        )}

        <footer className="mt-14 border-t border-border pt-6 text-sm text-muted">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>Preferences stay on this device. Not medical advice.</p>
            <p className="font-mono text-xs tracking-wide uppercase">
              {APP_NAME}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
