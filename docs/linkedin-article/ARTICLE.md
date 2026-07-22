# AI in Action #2: From an Idea to SleepCheck

**LinkedIn paste draft** — insert images where marked. File names match this folder.

---

## Suggested LinkedIn title

AI in Action #2: From an Idea to SleepCheck

## Suggested subtitle / lead

How product thinking, architecture, and AI-assisted engineering shipped a production-ready local-first PWA — and why judgment stays human.

## Cover image

**[IMAGE: 00-cover-og.png]**  
Caption: SleepCheck — AI in Action #2

---

AI changes where engineers spend their time—not who owns the decisions.

SleepCheck is the demonstration. It is **AI in Action #2**: a real, production-ready, local-first Progressive Web App built around product thinking, architecture, testing, and continuous improvement. Live at sleepcheck.weidong-shi.com.

The engineering process — intent, boundaries, review, and shipping discipline — is the durable product. The application proves that process works.

**Wellness disclaimer:** SleepCheck is a wind-down companion, not medical advice and not a treatment for sleep disorders. It does not track sleep with a microphone or wearable.

---

### The product journey

**[IMAGE: diagram-product-journey.png]**  
Caption: From idea → constraints → AI-assisted build → live app → feedback loop

Every AI in Action application follows the same methodology: **Build → Validate → Improve → Document → Share**. SleepCheck is one full pass through that loop.

---

### The problem

Most “sleep apps” ask for an account before they offer calm. They push dashboards, streaks behind a login wall, and cloud narration that needs a network at the worst possible moment — when you are already in bed.

I wanted the opposite: open the app, press play, and stay in the night. No signup. No tracking server. Natural soundscapes and soft stories that feel like a finished product—not a demo of an API key.

---

### Design principles

Before features, before prompts, the product needed a philosophy:

- Local-first before cloud-first
- Player-first before feature-first
- Calm before analytics
- Privacy before accounts
- Progressive Web App (PWA)
- One codebase across desktop and mobile

These principles became the architectural constraints that guided every engineering decision and every AI prompt.

---

### What shipped

**[IMAGE: 01-hero-player.png]**  
Caption: Player-first first viewport — scenes, timer, and one clear play affordance

**[IMAGE: 02-scene-selected.png]**  
Caption: A selected scene — the mix stays on-device and can be shared as a URL

**[IMAGE: 03-stories.png]**  
Caption: Guided bedtime stories via browser speech synthesis

**[IMAGE: 04-mobile-player.png]**  
Caption: One codebase — installable Progressive Web App on mobile

What users get:

- Local-first experience
- Natural soundscapes
- Guided bedtime stories
- Browser speech synthesis
- Progressive Web App
- Offline capability

---

### Reference architecture

Unlike RetireCheck, which centered on deterministic financial calculations, SleepCheck centers on uninterrupted sensory experience.

Different products deserve different architectures.

SleepCheck intentionally keeps its core domain entirely inside the browser.

**[IMAGE: 05-architecture.png]**  
Caption: Reference architecture — local-first Progressive Web App; no backend in the critical path

---

### Engineer and AI Assistant responsibilities

**[IMAGE: diagram-human-ai.png]**  
Caption: Engineers own judgment and outcomes; the AI assistant accelerates inside constraints

The workflow is intent-driven:

- **Engineer** — product direction, architecture and boundaries, trade-offs, validation, accountability, and sensory QA
- **AI assistant** — scaffolding, refactoring, UI exploration, tests and docs assistance, debugging support—never production judgment
- **Pipeline** — typecheck, build, and deploy gates on every meaningful change. The assistant proposes; git and CI dispose

---

### Testing what matters at night

Users rarely notice exceptions.

They notice:

- an audio click
- an interrupted story
- a timer that ends abruptly

Quality therefore includes sensory experience, not just correctness.

Validation focused on the failure modes people feel in the dark: preference persistence, shareable mix links, audio resume after browser suspension, long-loop soak tests, timer fade behavior, and offline PWA installs. Preview deployments make review concrete—open the build, press play, and listen.

---

### Takeaways

1. Define product philosophy before writing prompts.
2. Architecture should follow the domain—not the technology stack.
3. AI accelerates implementation.
4. Engineers remain responsible for judgment.
5. Quality includes both functional correctness and user experience.
6. The highest leverage now comes from architecture, context engineering, validation, and continuous delivery.

---

### Closing

RetireCheck and SleepCheck solve very different problems.

Yet both follow the same engineering philosophy.

**Build → Validate → Improve → Document → Share**

That is the foundation of the AI in Action series.

Every future application explores a different domain while demonstrating the same engineering discipline.

AI accelerates software delivery.

Experienced engineering judgment shapes the final product.

---

If you're also exploring AI-assisted software engineering, I'd enjoy hearing how you're approaching architecture, testing, and product design.

### Links

- LinkedIn article: https://www.linkedin.com/pulse/ai-action-2-from-idea-sleepcheck-weidong-shi-0fwrc
- Live app: https://sleepcheck.weidong-shi.com
- Source: https://github.com/weidong808/SleepCheck
- Hub case study: https://weidong-shi.com/work/sleepcheck
- Long-form on the hub: https://weidong-shi.com/insights/ai-in-action-sleepcheck
- Public series roadmap: https://github.com/weidong808/ai-in-action-roadmap
- Previous: RetireCheck / AI in Action #1 on the hub and LinkedIn

---

*AI in Action — educational engineering showcase. Build · Validate · Improve · Document · Share.*

#AIinAction #AIEngineering #SoftwareArchitecture #Cursor #ClaudeCode #Cowork
