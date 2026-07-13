# SleepCheck

Calm wind-down companion: gentle soundscapes, bedtime stories, guided breathing, and a sleep timer.

**Tagline:** Ease your mind into sleep.

## What V1 includes

| Feature | How it works |
|--------|----------------|
| Sounds | Browser **Web Audio** synthesis (no streamed audio files) |
| Stories | Hand-written stories + device **speechSynthesis** TTS |
| Breathe | Local guided breathing modes |
| Timer | Fade-to-silence sleep timer |
| Preferences | **localStorage only** — no login, no cloud DB |

## What V1 is not

- Not medical advice / not a sleep disorder treatment
- Not microphone or wearable sleep tracking
- Not ChatGPT/Claude/ElevenLabs API narration
- No accounts or Supabase in V1

## Local development

```bash
cd sleepcheck
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Deploy target: Vercel → `sleep.weidong-shi.com`
- Hub site: [weidong-shi.com](https://weidong-shi.com)

## License

MIT © Weidong Shi — see [LICENSE](LICENSE).
