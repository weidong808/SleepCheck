# SleepCheck

Calm wind-down companion: natural soundscapes, bedtime stories, guided breathing, and a sleep timer.

**Tagline:** Ease your mind into sleep.

| | |
|--------|--------|
| **Live demo** | [sleepcheck.weidong-shi.com](https://sleepcheck.weidong-shi.com) |
| **Architecture** | [docs/architecture.md](docs/architecture.md) |
| **Series** | [AI in Action on weidong-shi.com](https://weidong-shi.com) · [SleepCheck case study article](https://weidong-shi.com/articles/ai-in-action-sleepcheck) |
| **Roadmap** | [ai-in-action-roadmap](https://github.com/weidong808/ai-in-action-roadmap) |

## Features

| Feature | How it works |
|--------|----------------|
| Sounds | Studio-quality ambience loops (rain, ocean, fire, wind, creek, crickets) rendered offline with event-based DSP, played gaplessly via Web Audio; noise colors + binaural synthesized live |
| Scenes | One-tap presets (Rainy Cabin, Moonlit Shore, …) with a single big play button |
| Share | Shareable mix links (`?mix=rain:0.50,fire:0.42`) via Web Share API / clipboard |
| Stories | 5 illustrated stories + device **speechSynthesis** TTS with narrator chips, sentence pacing, and preview |
| Breathe | Local guided breathing modes |
| Timer | Fade-to-silence sleep timer, quick picks + custom minutes, inline in the player |
| Streak | Local-only nightly wind-down streak (a night spans until 5am) |
| PWA | Installable, offline app shell + cached audio, lock-screen media controls |
| Preferences | **localStorage only** — no login, no cloud DB |

## Regenerating the soundscapes

The ambience loops in `public/audio/` are rendered by `scripts/gen_audio.py`
(numpy + ffmpeg). All filtering is circular (FFT-based) so every loop is
mathematically seamless; the audio engine crossfades loop passes to stay
gapless regardless of MP3 padding.

```bash
python3 scripts/gen_audio.py /tmp/loops rain ocean fire wind stream crickets
for f in rain ocean fire wind stream crickets; do
  ffmpeg -y -i /tmp/loops/$f.wav -codec:a libmp3lame -q:a 4 public/audio/$f.mp3
done
```

## What this is not

- Not medical advice / not a sleep disorder treatment
- Not microphone or wearable sleep tracking
- Not ChatGPT/Claude/ElevenLabs API narration
- No accounts or Supabase

## Local development

```bash
cd sleepcheck
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Deploy target: Vercel → `sleepcheck.weidong-shi.com`
- Hub site: [weidong-shi.com](https://weidong-shi.com)

## License

MIT © Weidong Shi — see [LICENSE](LICENSE).
