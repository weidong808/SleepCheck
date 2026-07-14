# SleepCheck × AI in Action #2 — LinkedIn Launch Package

Paste-ready. Sequence: publish the **article** first, then the **teaser post** drives traffic to it.

**Published article:** https://www.linkedin.com/pulse/ai-action-2-from-idea-sleepcheck-weidong-shi-0fwrc

Assets: this folder (`docs/linkedin-article/`).

---

## 1 · Teaser feed post (day 0 — distribution)

*Plain text — LinkedIn posts don't render markdown.*  
*Attach: `01-hero-player.png` (or `00-cover-og.png` if you prefer a simpler cover).*

```
AI in Action #2 is live.

My first case study (RetireCheck) explored AI-assisted development for a financial planning tool. This time, I wanted to tackle a completely different challenge: building a calm, local-first sleep companion as a Progressive Web App.

The article isn't just about SleepCheck—it's about the engineering process behind it: product thinking, architecture, design decisions, testing, CI/CD, and where AI genuinely helped (and where human judgment remained essential).

If you're interested in AI-assisted software engineering, I'd love to hear your thoughts. What architectural decisions would you have made differently?

AI in Action — AI accelerates development. Engineering judgment shapes the product.

Full article: https://www.linkedin.com/pulse/ai-action-2-from-idea-sleepcheck-weidong-shi-0fwrc
Live app: https://sleepcheck.weidong-shi.com

#AIinAction #AIEngineering #SoftwareArchitecture #Cursor #ClaudeCode #Cowork #PWA #LocalFirst
```

---

## 2 · First comment (post immediately under the teaser)

```
In the article:
• Design principles that became architectural constraints
• Reference architecture (UX → domain → browser → engineering platform)
• Engineer vs AI Assistant responsibilities
• Why quality includes sensory experience—not just correctness
• Build → Validate → Improve → Document → Share

Article: https://www.linkedin.com/pulse/ai-action-2-from-idea-sleepcheck-weidong-shi-0fwrc
Live app: https://sleepcheck.weidong-shi.com
Source: https://github.com/weidong808/SleepCheck
Series roadmap: https://github.com/weidong808/ai-in-action-roadmap
```

*(Optional attach under the comment: `05-architecture.png` or `diagram-human-ai.png`.)*

---

## 3 · Full article (LinkedIn Write article / pulse)

Published:
https://www.linkedin.com/pulse/ai-action-2-from-idea-sleepcheck-weidong-shi-0fwrc

Source draft: `ARTICLE.md` · Cover: `00-cover-og.png`

---

## 4 · Optional follow-up #1 (day 3–4): architecture

*Attach: `05-architecture.png`*

```
RetireCheck centered on deterministic financial calculations.
SleepCheck centers on uninterrupted sensory experience.

Different products deserve different architectures.

For SleepCheck, the reference architecture keeps the core domain in the browser:
User experience → Application domain → Browser platform → Engineering platform

Design decisions (no account, no backend in the critical path, on-device data, offline, one codebase) and honest trade-offs (no cloud sync, device voices vary, prefs stay local) are part of the architecture story—not an afterthought.

Full write-up: https://www.linkedin.com/pulse/ai-action-2-from-idea-sleepcheck-weidong-shi-0fwrc
Live: https://sleepcheck.weidong-shi.com

#SoftwareArchitecture #AIinAction #PWA
```

---

## 5 · Optional follow-up #2 (day 7–8): Engineer vs AI Assistant

*Attach: `diagram-human-ai.png`*

```
In AI in Action, the labels matter.

Engineer — owns judgment and outcomes.
AI Assistant — accelerates inside constraints.

Product direction, architecture, trade-offs, validation, and accountability stay human.
Scaffolding, exploration, and wiring go faster with an assistant.
Neither side replaces the other.

That's the distinction I'm building this series to demonstrate—app by app, domain by domain.

Article: https://www.linkedin.com/pulse/ai-action-2-from-idea-sleepcheck-weidong-shi-0fwrc

#AIinAction #EngineeringLeadership #AIAssistedDevelopment
```

---

## Checklist

- [x] Publish LinkedIn article from `ARTICLE.md`
- [x] Copy pulse URL into teaser + first comment + follow-ups
- [ ] Post teaser with screenshot
- [ ] Add first comment immediately
- [x] Wire `externalUrl` on hub `articles.ts` once live
- [ ] Optional: follow-ups on day 3–4 and 7–8

Do not mention monetization, tiers, Stripe, or commercial roadmap in any of these posts.
