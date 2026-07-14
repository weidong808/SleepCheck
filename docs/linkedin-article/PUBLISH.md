# Publish SleepCheck LinkedIn article

Full launch sequence (teaser + article + follow-ups): see **`LAUNCH-PACKAGE.md`**.

## Assets in this folder

| File | Use |
|------|-----|
| `LAUNCH-PACKAGE.md` | Teaser post, first comment, optional follow-ups |
| `ARTICLE.md` | Full LinkedIn article (paste draft) |
| `00-cover-og.png` | LinkedIn article cover |
| `01-hero-player.png` | Desktop player — also good teaser attach |
| `02-scene-selected.png` | Scene selected |
| `03-stories.png` | Stories tab |
| `04-mobile-player.png` | Mobile player |
| `05-architecture.png` / `.svg` | Reference Architecture |
| `diagram-product-journey.png` / `.svg` | Product journey |
| `diagram-human-ai.png` / `.svg` | Engineer vs AI Assistant |

Hub mirror: `weidong-website/public/images/sleepcheck/linkedin/`  
Site architecture figure: `weidong-website/public/images/sleepcheck/sleepcheck-architecture.png`

## LinkedIn steps

1. Article is published: https://www.linkedin.com/pulse/ai-action-2-from-idea-sleepcheck-weidong-shi-0fwrc
2. Post the **teaser** from `LAUNCH-PACKAGE.md` §1 (URL already filled in).
3. Immediately add the **first comment** (`LAUNCH-PACKAGE.md` §2).

### Article upload (already done)

1. LinkedIn → **Write article** (pulse).
2. Title: `AI in Action #2: From an Idea to SleepCheck`
3. Set cover from `00-cover-og.png`.
4. Paste body from `ARTICLE.md` (skip the metadata tables at the top).
5. At each **`[IMAGE: …]`** marker, delete the marker line and **Insert image** from this folder. Keep the caption under the image.
6. Publish, then use the pulse URL in the teaser.

**Note:** Product screenshots (`01`–`04`) are retina (~2MB). If upload is slow, resize to 50% width before inserting.

## After publish

`externalUrl` is already set on the SleepCheck entry in `weidong-website/src/content/articles.ts`.

## Do not include

Monetization, pricing, tiers, Stripe, auth product plans, wearables, or commercial roadmap.
