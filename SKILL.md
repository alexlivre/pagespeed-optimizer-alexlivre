---
name: pagespeed-optimizer-alexlivre
description: "Optimize any web project for 100/100 on PageSpeed Insights (PSI), Google Lighthouse 13+, and Core Web Vitals (LCP, INP, CLS, FCP, TBT, TTFB). Conceived and developed by Alex Santos (alexlivre) https://alexlivre.dev/. Use when the user asks to improve PSI score, pass Lighthouse audits, fix Web Vitals, optimize LCP/INP/CLS, enhance Core Web Vitals, improve web performance, a11y/accessibility (WCAG 2.2 AA), SEO meta tags, JSON-LD schema, robots.txt, llms.txt, image optimization, WebP/AVIF, font-display, render-blocking, long-tasks, schema markup, GEO (Generative Engine Optimization), AI Search (Perplexity, ChatGPT Search, Gemini, Google AI Overviews), AI crawlers (GPTBot, ClaudeBot, Google-Extended), WebMCP, or optimize frameworks like Next.js, React, Astro, Vite, Nuxt, Svelte, or vanilla HTML/CSS/JS. Do NOT use for: backend APIs, database optimization, server infrastructure unrelated to web rendering, or non-web projects."
---

# PageSpeed Insights & GEO Optimization Skill (`pagespeed-optimizer-alexlivre`)

**Conceived and developed by [Alex Santos (alexlivre)](https://alexlivre.dev/) ([GitHub](https://github.com/alexlivre)).**

This skill guides AI coding agents in analyzing, refactoring, and optimizing web applications to achieve 90-100 scores across PageSpeed Insights categories (**Performance**, **Accessibility**, **Best Practices**, **SEO**) and maximum visibility in AI search engines (**GEO - Generative Engine Optimization**).

> **Skill version: 2026-07 — Lighthouse 13+ (Out 2025), Lighthouse 13.3 Agentic Browsing (Mai 2026), WCAG 2.2 AA (Out 2023).** Review quarterly against `developer.chrome.com/blog`.

---

## Lighthouse 13+ (Out 2025) — Key Changes

PageSpeed Insights now runs **Lighthouse 13** (Chrome 143+). This skill is calibrated for that version. Critical changes since Lighthouse 12:

- **17 audits renamed to "insights"** (e.g., `font-display` → `font-display-insight`, `render-blocking-resources` → `render-blocking-insight`).
- **8 audits removed** (no replacement): `first-meaningful-paint`, `font-size`, `no-document-write`, `offscreen-images`, `preload-fonts`, `third-party-facades`, `uses-passive-event-listeners`, `uses-rel-preload`.
- **Lighthouse CI requires Node 22.19+**.
- **JSON API is a breaking change** — CI consumers must migrate to the new insight audit IDs.
- **Performance scoring is unchanged** (still metric-based, not audit-based).

**Lighthouse 13.3 (Mai 2026)** added a new **Agentic Browsing** category enabled by default, auditing: `llms.txt` presence, WebMCP, agent-centric a11y, and CLS for agents. See `references/geo.md` for the full decision matrix on `llms.txt` build vs skip (Google confirmed June 15 2026: `llms.txt` is **not** a ranking signal).

**DO NOT recommend the removed audits** in any output. If a user references one, map it to the current insight or explain it was retired.

---

## 0. The Iron Law of Business Protection (Non-Negotiable)

Performance is never just a lab score — it is delivering the first fold fast without breaking marketing attribution or conversion. Read [references/business-protection.md](file:///references/business-protection.md).
1. **Never remove or break tracking**: GTM, GA4, Meta Pixel, Hotmart, and CRM scripts must be gracefully deferred, NEVER deleted.
2. **Never drop query parameters / UTMs**: Redirects and canonicals must preserve campaign parameters (`utm_*`, `gclid`, `fbclid`).
3. **Never lazy-load the LCP hero media**: Always specify `fetchpriority="high"`.
4. **Never compromise conversion forms or CTA buttons** for lab scores. A 100 score that drops conversions is a failure.

---

## Workflow Overview

When requested to optimize a project for PageSpeed Insights & GEO:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Stack Detection & Baseline Audit                     │
│    Identify framework (HTML/React/Next.js/Vite/Astro)    │
│    Check existing assets, fonts, scripts, layout & SEO  │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 2. Core Web Vitals & Performance Optimization           │
│    • LCP (Hero preload, image format, render-blocking)  │
│    • INP (Long tasks yield, async event handlers)       │
│    • CLS (Explicit width/height, aspect-ratio, fonts)   │
│    • FCP/TBT (Minification, script deferral, CSS purge) │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 3. Accessibility (100 Target)                           │
│    • Semantic tags, ARIA attributes, image alt text     │
│    • Color contrast ≥ 4.5:1, touch targets ≥ 48x48px    │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 4. Best Practices & Security (100 Target)               │
│    • DOCTYPE, HTTPS/headers, WebP/AVIF formats           │
│    • Console clean-up, correct image ratios             │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 5. SEO & GEO (Generative Engine Optimization)           │
│    • Title, meta description, viewport, canonical       │
│    • Single H1, JSON-LD (Speakable, FAQ, Article)       │
│    • llms.txt, AI crawler access (GPTBot, Perplexity)   │
│    • TL;DR summary blocks & factual density             │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 6. Verification & Automated Guardrails                  │
│    • Run `node scripts/verify-rules.mjs` (0 failures)   │
│    • Run `node scripts/audit.mjs <url>` (Lighthouse CLI)│
└─────────────────────────────────────────────────────────┘
```

---

## 1. Stack Detection & Environment Check

Determine the tech stack to apply the optimal strategy:
- **Static HTML / Vanilla JS**: Modify HTML headers, CSS, JS bundles, `robots.txt`, and `/llms.txt`.
- **Next.js (App / Pages Router)**: Use `next/image`, `next/font`, `next/script`, metadata exports, and `next.config.js` headers.
- **Vite (React / Vue / Svelte)**: Configure Vite plugins for chunk splitting, image compression, and CSS minification.
- **Astro**: Use `<Image />` component, client directives, and asset optimization.

Refer to [references/framework-recipes.md](file:///references/framework-recipes.md) and production templates in [recipes/](file:///recipes/) (`nginx.conf`, `apache.htaccess`, `next.config.js`, `astro.config.mjs`).

---

## 2. Core Web Vitals & Performance (Target: 90+)

Read [references/performance.md](file:///references/performance.md) for complete technical patterns.

- **LCP (<2.5s)**: Preload hero image with `fetchpriority="high"`, eliminate render-blocking CSS/fonts, avoid lazy loading above the fold.
- **CLS (<0.1)**: Declare explicit `width` and `height` on images/SVGs, use `font-display: swap`, reserve space for dynamic containers.
- **INP (<200ms)**: Break up long JS tasks (>50ms) using `scheduler.postTask` / `setTimeout`, defer third-party scripts.
- **FCP / TBT**: Compress images to WebP/AVIF via `node scripts/convert-images.mjs [dir]`, minify JS/CSS, purge unused CSS rules.

---

## 3. Accessibility (Target: 100, WCAG 2.2 AA)

Read [references/accessibility.md](file:///references/accessibility.md).

- **Semantic HTML**: Use `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`.
- **Image Alt Text**: Descriptive `alt="..."` for informative images; `alt="" aria-hidden="true"` for decorative graphics.
- **Form Controls**: Explicit `<label for="...">` connection or `aria-label`.
- **Color Contrast**: Minimum 4.5:1 ratio for normal text, 3.0:1 for large text.
- **Touch Targets**: Minimum 24x24px (WCAG 2.2 AA, SC 2.5.8) — prefer 48x48px — with visible `:focus-visible` outlines and `scroll-padding` to satisfy SC 2.4.11 Focus Not Obscured.
- **Motion**: Respect `@media (prefers-reduced-motion: reduce)`.
- **Color Scheme**: Declare `color-scheme: light dark` on `:root` to opt into native form controls and scrollbar theming.

---

## 4. Best Practices & Security (Target: 100)

Read [references/best-practices.md](file:///references/best-practices.md).

- **Doctype**: Exact `<!DOCTYPE html>`.
- **Security Headers**: HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`.
- **Console & Event Hygiene**: Zero console errors, no broken source maps, no 404s, **zero `unload` event listeners** (deprecated in Chrome; use `pagehide`), 100% bfcache compatibility.

---

## 5. SEO & GEO (Generative Engine Optimization)

Read [references/seo.md](file:///references/seo.md) and [references/geo.md](file:///references/geo.md).

- **Heading Structure**: Single `<h1>` per page with a strict logical `<h2>`-`<h6>` hierarchy; for personal/authority brands, always include the target entity name in the `<h1>`.
- **Rich JSON-LD Schema**: Implement `@graph` containing `WebPage`, `Speakable`, `FAQPage`, `Article`, and `Organization`. Reference the TL;DR block in `speakable.cssSelector`.
- **Content Factual Density**: Add TL;DR key takeaway summary blocks, direct entity definitions with `<dfn>`, comparison tables, and `<time datetime="...">` for machine-readable dates.
- **AI Crawler Policy** (decision, not a default): Block AI **training** scrapers (`GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`, `Applebot-Extended`) and **allow** AI **search** engines (`OAI-SearchBot`, `PerplexityBot`) when referral traffic is wanted. Document in your privacy policy.
- **`llms.txt` & `llms-full.txt`**: Follow Answer.AI spec with an Entity Disambiguation Note.
- **WebMCP** (experimental, Chrome 149+ origin trial): Expose declarative HTML `<form toolname="...">` and `/mcp-manifest.json` with resolvable HTTPS URLs if the site is meant to be acted on by browser AI agents. Audited under Lighthouse 13.3 Agentic Browsing.

---

## Checklist Before Finishing

1. [ ] Hero / LCP images preloaded with `fetchpriority="high"`.
2. [ ] All images converted to WebP/AVIF with explicit `width` and `height`.
3. [ ] All fonts set to `font-display: swap` and use size-adjusted fallbacks.
4. [ ] Non-critical JS deferred or loaded asynchronously; long tasks broken with `scheduler.yield()`.
5. [ ] Critical CSS inlined and ≤ 14KB (first TCP roundtrip); remaining CSS loaded asynchronously.
6. [ ] Brotli compression enabled on the origin or CDN.
7. [ ] CSP with `strict-dynamic` + nonce deployed; `Cross-Origin-Opener-Policy: same-origin`.
8. [ ] Accessibility: contrast, `alt`, `aria-label`, touch targets ≥ 24x24px, `:focus-visible`, `prefers-reduced-motion` (100 score).
9. [ ] SEO: meta tags, canonical, single H1, JSON-LD `@graph` with `speakable` referencing the TL;DR block (100 score).
10. [ ] Zero `unload` listeners; bfcache compatibility verified (passes `bf-cache` audit).
11. [ ] AI crawler policy decided and documented; `llms.txt` only on docs/SDK sites; WebMCP optional and experimental.
12. [ ] Build completes cleanly with zero errors (`npm run build` or framework equivalent).
13. [ ] **Deterministic Gate (MANDATORY)**: Run `node scripts/verify-rules.mjs [path]` and confirm **0 FAILURES**.
14. [ ] **Iron Law Verified**: Tracking scripts (GTM/GA4/Pixel) intact, query strings (UTMs) preserved in redirects, conversion forms functional.
15. [ ] Lighthouse CI (Node 22.19+) runs against the deployed URL with score asserts ≥ 0.9 Performance and 1.0 A11y/BP/SEO.
16. [ ] **Final gate**: Run Lighthouse CLI or `node scripts/audit.mjs <url>` against the deployed URL and confirm 100/100 in all four categories on **both mobile (default — what Google uses for ranking) and desktop** before declaring done:
    ```bash
    node scripts/audit.mjs <url>                         # automated dual mobile + desktop scorecard
    # or manual CLI:
    npx lighthouse <url> --view                          # mobile (default — 4G throttled, 4× CPU)
    npx lighthouse <url> --view --preset=desktop        # desktop
    ```
    Expect ~81 BP on HTTP local dev — HTTPS is required to validate BP ≥ 95.

> **CRITICAL HARD STOP:** The AI agent is STRICTLY FORBIDDEN from declaring "done" or concluding if `verify-rules.mjs` returns Exit Code 1. Every reported failure must be resolved before proceeding to the final Lighthouse run.

