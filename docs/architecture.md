# SleepCheck architecture

SleepCheck is a local-first wind-down companion in the **AI in Action** series. The live product is the demonstration; the engineering process — intent, boundaries, review, and shipping — is the durable product.

- **Live:** https://sleepcheck.weidong-shi.com  
- **Hub:** https://weidong-shi.com  
- **Source:** https://github.com/weidong808/SleepCheck  
- **Series roadmap:** https://github.com/weidong808/ai-in-action-roadmap  

> **Wellness disclaimer:** SleepCheck is not medical advice and not a treatment for sleep disorders. It does not perform clinical sleep tracking.

---

## 1. Product journey

From idea to continuous improvement:

```mermaid
flowchart LR
  A[Problem] --> B[Product thinking]
  B --> C[Requirements]
  C --> D[Architecture]
  D --> E[AI-assisted build]
  E --> F[Testing]
  F --> G[CI/CD]
  G --> H[Cloud / Vercel]
  H --> I[Feedback]
  I --> J[Continuous improvement]
  J --> C
```

ASCII equivalent:

```
Problem → Product thinking → Requirements → Architecture
        → AI-assisted development → Testing → CI/CD → Cloud
        → Feedback → Continuous improvement ──┐
                    ▲─────────────────────────┘
```

| Stage | SleepCheck focus |
|--------|------------------|
| Problem | Night-time calm without accounts or dashboards |
| Product thinking | Player-first, local-first, natural soundscapes + stories |
| Requirements | Offline-capable PWA, gapless audio, shareable mixes, brand parity with RetireCheck |
| Architecture | Next.js client + Web Audio + localStorage + service worker |
| AI-assisted build | Intent-driven prompts inside written constraints |
| Testing | Preference/mix contracts, audio resume, soak listens |
| CI/CD | Typecheck, build, preview → production |
| Cloud | Vercel + custom domain under weidong-shi.com |
| Feedback | Scene clarity, lock-screen controls, share fidelity |
| Continuous improvement | Roadmap-driven polish, not “add another AI feature” |

---

## 2. Client architecture

SleepCheck is intentionally **client-heavy**. There is no separate calculation API (contrast with RetireCheck’s ASP.NET domain). Runtime “domain” lives in the browser.

```mermaid
flowchart TB
  subgraph Hub["weidong-shi.com — AI in Action"]
    Brand[Parent brand chrome]
  end

  subgraph App["Next.js App Router PWA — Vercel"]
    UI[SleepApp UI<br/>Scenes · Stories · Breathe · Timer]
    AE[AudioEngine<br/>Web Audio API]
    TTS[speechSynthesis TTS]
    Store[localStorage preferences + streak]
    SW[Service worker<br/>app shell + audio cache]
  end

  Brand --> UI
  UI --> AE
  UI --> TTS
  UI --> Store
  SW --> UI
  SW --> AE
```

ASCII equivalent:

```
┌──────────────────────────────────────────────────┐
│  Next.js App Router (Vercel PWA)                 │
│                                                  │
│  ┌─────────────┐  ┌──────────────────────────┐   │
│  │ SleepApp UI │→ │ AudioEngine (Web Audio)  │   │
│  │ tabs/player │  │ loops + synth + master FX│   │
│  └──────┬──────┘  └──────────────────────────┘   │
│         │                                        │
│         ├→ speechSynthesis (stories / breathe)   │
│         ├→ localStorage (prefs + streak)         │
│         └→ Service worker (offline shell/audio)  │
└──────────────────────────────────────────────────┘
         ▲
         │ brand / series
┌────────┴─────────┐
│  weidong-shi.com │
└──────────────────┘
```

### Key modules

| Area | Responsibility |
|------|----------------|
| `SleepApp` / pages | Player-first UI: scenes, mix, timer, stories, breathe |
| `audioEngine.ts` | Web Audio graph: sampled ambience, live noise/binaural, crossfade loops, fade-to-silence |
| `sounds.ts` / `public/audio/` | Sound catalog + offline-rendered MP3 loops |
| `stories.ts` + `speech.ts` | Story content + device TTS pacing / narrator selection |
| `storage.ts` | Versioned preferences schema in `localStorage` |
| `public/sw.js` | Installable offline shell and cached audio |
| `brand.ts` | Shared AI in Action naming, hub URL, RetireCheck sibling link |

### Data & privacy

- Preferences and streaks stay on-device (`sleepcheck.preferences.v1`).
- No accounts, no cloud database, no microphone/wearable tracking.
- Shareable mixes use query strings (`?mix=rain:0.50,fire:0.42`), not a backend playlist store.

### Audio pipeline (simplified)

```
MP3 loops (public/audio) ──decode──┐
                                   ├→ per-source GainNode → master → shelf → compressor → destination
Live synth (noise / binaural) ─────┘
```

Loops are generated offline (`scripts/gen_audio.py`) with circular FFT filtering for seamless joins. The engine crossfades loop passes and trims encoder padding so playback stays gapless.

---

## 3. Human vs AI responsibilities

```mermaid
flowchart LR
  subgraph Human["Human — judgment"]
    H1[Product intent]
    H2[ constrains / rules]
    H3[Architecture choices]
    H4[Diff review + listen tests]
    H5[Brand + wellness copy]
  end

  subgraph AI["AI — acceleration"]
    A1[UI scaffolding]
    A2[Refactors / Tailwind passes]
    A3[PWA / TTS helpers]
    A4[Boilerplate wiring]
  end

  subgraph Pipeline["Pipeline — truth"]
    P1[Typecheck]
    P2[Build]
    P3[Preview / production deploy]
  end

  Human --> AI
  AI --> Pipeline
  Pipeline --> Human
```

| Role | Owns |
|------|------|
| **Human** | Problem framing, player-first UX, local-first boundary, mix URL contract, streak definition, audio quality bar, wellness disclaimer, brand alignment with RetireCheck |
| **AI (Cursor)** | Component iteration, layout polish, service-worker/manifest wiring, TTS helpers, repetitive refactors inside those constraints |
| **Pipeline** | Typecheck, production build, Vercel preview/production — “Cursor proposes; git and CI dispose” |

Philosophy: AI changes **where** engineers spend time. The app is the demo; the process is the product.

---

## 4. Platform evolution toward AI in Action

SleepCheck is **#2** in a growing portfolio of production case studies under one parent brand.

```mermaid
flowchart TB
  Hub[weidong-shi.com hub]
  RC[RetireCheck<br/>domain math + API]
  SC[SleepCheck<br/>local-first PWA]
  Next[Future AI in Action apps]

  Hub --> RC
  Hub --> SC
  Hub --> Next

  Roadmap[ai-in-action-roadmap] -.-> Hub
  Roadmap -.-> RC
  Roadmap -.-> SC
  Roadmap -.-> Next
```

ASCII equivalent:

```
                    ┌─────────────────────┐
                    │   weidong-shi.com   │
                    │   AI in Action hub  │
                    └──────────┬──────────┘
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
   RetireCheck #1        SleepCheck #2         Future apps
   (C# domain + API)     (client PWA + audio)  (shared brand)
           │                   │
           └─────────┬─────────┘
                     ▼
         github.com/weidong808/ai-in-action-roadmap
```

### Shared series patterns

- Parent brand chrome and hub linking (`brand.ts` / site case studies)
- Intent-driven AI workflow: rules before prompts, human review, ship for real
- Production URLs under `*.weidong-shi.com`
- Case-study write-ups on the hub (LinkedIn drafts follow when ready)

### Deliberate divergence

| | RetireCheck | SleepCheck |
|---|-------------|------------|
| Core risk | Incorrect financial math | Audio glitches / broken calm UX |
| Architecture | Pure C# domain + API | Browser Web Audio + local storage |
| Auth / data | Stateless API calls | No accounts; device-local prefs |
| Deploy | Vercel + Render | Vercel PWA |

Same series thesis, domain-appropriate architecture.

---

## Related links

- Live app: https://sleepcheck.weidong-shi.com  
- Hub: https://weidong-shi.com  
- Hub article: https://weidong-shi.com/articles/ai-in-action-sleepcheck  
- RetireCheck article: https://weidong-shi.com/articles/ai-in-action-retirecheck  
- Roadmap: https://github.com/weidong808/ai-in-action-roadmap  
