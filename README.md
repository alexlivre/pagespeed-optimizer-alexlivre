# PageSpeed Insights & GEO Optimizer (`pagespeed-optimizer-alexlivre`)

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/alexlivre/pagespeed-optimizer-alexlivre/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Conceived and developed by [Alex Santos (alexlivre)](https://alexlivre.dev/)** • [GitHub: @alexlivre](https://github.com/alexlivre) • [Collection: skills-alexlivre](https://github.com/alexlivre/skills-alexlivre)

A universal AI agent skill for analyzing, auditing, and optimizing web applications to **100/100** on [PageSpeed Insights](https://pagespeed.web.dev/) and Google Lighthouse 13+ across **Performance**, **Accessibility**, **Best Practices**, **SEO**, and **GEO (Generative Engine Optimization)** for AI search engines (Perplexity, ChatGPT Search, Gemini, Google AI Overviews, Claude).

> **Calibrated for Lighthouse 13+ (Oct 2025)**, **Lighthouse 13.3 Agentic Browsing (May 2026)**, and **WCAG 2.2 AA (Oct 2023)**. Reflects Google's June 15, 2026 clarification that `llms.txt` is a coding-assistant navigation aid, **not a Google Search ranking signal**.

---

## What the skill does

When loaded, the skill guides an AI agent through:

1. **Stack detection** — identifies whether the target is static HTML, Next.js, Vite, Astro, Nuxt, Svelte, or vanilla JS
2. **Core Web Vitals optimization** — LCP < 2.5s, INP < 200ms, CLS < 0.1, FCP < 1.8s, TTFB < 600ms
3. **Accessibility (WCAG 2.2 AA, target 100/100)** — semantic HTML, 9 new SCs (Focus Not Obscured, Target Size, Accessible Auth, etc.)
4. **Best Practices (target 100/100)** — CSP `strict-dynamic`, COOP/COEP, security headers, no console errors
5. **SEO & GEO** — JSON-LD `@graph` with `Speakable`, meta tags, canonical, hreflang, `llms.txt` decision matrix, AI crawler policy, WebMCP
6. **Verification** — Lighthouse CLI as the canonical final gate (`npx lighthouse <url> --view`)

---

## 📁 Skill Structure

```
pagespeed-optimizer-alexlivre/
├── SKILL.md                          # Main entrypoint — agent loads this
├── scripts/
│   ├── audit.mjs                     # Automated dual Lighthouse runner (mobile + desktop)
│   ├── verify-rules.mjs              # Deterministic rule & code linter gate (prevents AI shortcuts)
│   └── convert-images.mjs            # Native Node.js batch WebP/AVIF converter & <picture> generator
├── recipes/                          # Production-hardened server configurations
│   ├── nginx.conf                    # Nginx (Brotli, 1-year immutable caching, CSP, HSTS)
│   ├── apache.htaccess               # Apache (.htaccess mod_deflate, mod_expires, headers)
│   ├── next.config.js                # Next.js 15/16 App Router (image optimization, headers)
│   └── astro.config.mjs              # Astro 5 (prefetching, image service, compression)
├── templates/                        # Turnkey GEO, crawler & agent manifests
│   ├── llms.txt                      # Answer.AI standard format with Entity Disambiguation
│   ├── llms-full.txt                 # Full markdown knowledge base template
│   ├── robots.txt                    # 3-profile crawler policy (Search Allowed vs Training Blocked)
│   └── mcp-manifest.json             # WebMCP declarative agent manifest
├── demo-page/                        # 100/100 benchmark reference implementation
│   ├── index.html
│   ├── server.js
│   └── package.json
└── references/
    ├── business-protection.md        # The Iron Law: tracking, conversion & attribution safety
    ├── performance.md                # Core Web Vitals, LoAF API, bfcache, modulepreload
    ├── accessibility.md              # WCAG 2.2 AA, contrast, focus, reduced motion, color-scheme
    ├── best-practices.md             # Security headers, CSP strict-dynamic, unload deprecation
    ├── seo.md                        # Meta tags, OpenGraph, JSON-LD @graph, hreflang, RSS
    ├── geo.md                        # GEO: llms.txt decision matrix, WebMCP, AI crawlers
    ├── measurement.md                # CrUX History API, CrUX Vis, Lighthouse CI, web-vitals RUM
    └── framework-recipes.md          # Next.js 15/16, Vite, Astro 5, View Transitions, Vanilla HTML
```

---

## 💻 Installing the Skill

Part of the **[skills-alexlivre](https://github.com/alexlivre/skills-alexlivre)** repository. The skill works seamlessly across all major AI agent and vibe coding tools (**Claude Code**, **OpenCode**, **Antigravity CLI**, **Cursor**, **Windsurf**, and **Roo Code**).

### Option 1 — Via `skills` CLI (Canonical & Recommended)

Install directly from this repository using the standard `skills` package manager:

```bash
# Global install (all projects)
npx skills add alexlivre/pagespeed-optimizer-alexlivre -g -y

# Project-level install
npx skills add alexlivre/pagespeed-optimizer-alexlivre -y
```

---

### Option 2 — From the `skills-alexlivre` Collection / One-Liner

If you prefer installing from the complete [skills-alexlivre](https://github.com/alexlivre/skills-alexlivre) collection:

- **Linux / macOS / WSL**:
  ```bash
  curl -fsSL https://raw.githubusercontent.com/alexlivre/skills-alexlivre/main/install.sh | bash
  ```

- **Windows (PowerShell)**:
  ```powershell
  irm https://raw.githubusercontent.com/alexlivre/skills-alexlivre/main/install.ps1 | iex
  ```

- **Via Monorepo Package Specifier**:
  ```bash
  npx skills add alexlivre/skills-alexlivre@pagespeed-optimizer-alexlivre -g -y
  ```

---

### Option 3 — Manual Installation

First, clone the repository:

```bash
git clone https://github.com/alexlivre/pagespeed-optimizer-alexlivre.git
```

#### Global Install:
```bash
# Claude Code & Universal Agent Skills
mkdir -p ~/.agents/skills ~/.claude/skills
cp -r pagespeed-optimizer-alexlivre ~/.agents/skills/pagespeed-optimizer-alexlivre
cp -r pagespeed-optimizer-alexlivre ~/.claude/skills/pagespeed-optimizer-alexlivre

# OpenCode
mkdir -p ~/.opencode/skills
cp -r pagespeed-optimizer-alexlivre ~/.opencode/skills/pagespeed-optimizer-alexlivre

# Antigravity CLI (AGY)
mkdir -p ~/.gemini/antigravity-cli/skills
cp -r pagespeed-optimizer-alexlivre ~/.gemini/antigravity-cli/skills/pagespeed-optimizer-alexlivre
```

#### Project-Level Install:
```bash
# In your target project root
mkdir -p .agents/skills
cp -r /path/to/pagespeed-optimizer-alexlivre .agents/skills/pagespeed-optimizer-alexlivre
```

The agent will auto-detect the skill by matching the `description` field against your prompt.

---

## 🔧 Installing Lighthouse CLI

The skill teaches optimizations, but **`npx lighthouse` is how you verify them**. Lighthouse runs the same engine that powers [pagespeed.web.dev](https://pagespeed.web.dev/), so a 100/100 in the CLI equals 100/100 on PSI.

### Requirements

| Requirement | Minimum | Notes |
| :--- | :--- | :--- |
| Node.js | **22.19+** | Lighthouse 13 hard requirement. Older Node will fail. |
| npm | 10+ | Bundled with Node 22 |
| Chromium | Latest | Auto-installed by Lighthouse on first run. Or use your existing Chrome/Edge install. |
| Disk space | ~500 MB | For Chromium download |
| RAM | 2 GB free | Chrome runs the audits |

Check your Node version:

```bash
node --version   # must be v22.19.0 or higher
```

If your Node is older, install it via [nvm](https://github.com/nvm-sh/nvm) (macOS/Linux) or [nvm-windows](https://github.com/coreybutler/nvm-windows):

```bash
nvm install 22
nvm use 22
```

### Install Lighthouse

```bash
# Global install (recommended — use anywhere)
npm install -g lighthouse

# Verify installation
lighthouse --version
# Should print: 13.x.x
```

For CI or project-local use:

```bash
npm install --save-dev @lhci/cli lighthouse
```

### First run

```bash
# Test against a public site (auto-downloads Chromium on first run)
npx lighthouse https://example.com --view
```

This takes ~30 seconds. The `--view` flag opens the HTML report in your browser when done.

### Troubleshooting

| Problem | Fix |
| :--- | :--- |
| `Cannot find module 'lighthouse'` | Re-run `npm install -g lighthouse` |
| `Chromium failed to launch` (Linux) | Install deps: `sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libxss1 libasound2` |
| `EPERM` on Windows temp | Close all Chrome windows, then retry |
| `Chrome not found` | Install Google Chrome or set `CHROME_PATH=/path/to/chrome` |
| Score varies run-to-run | Add `--quiet` and run 3 times: median is the truth |
| Want JSON for CI | Add `--output json --output-path ./lh.json` |

### Running against HTTPS locally

Lighthouse requires HTTPS to validate the `is-on-https` audit. For local dev:

- **Option A**: Deploy a staging URL on Vercel/Netlify/Cloudflare (free HTTPS)
- **Option B**: Generate a self-signed cert and run `npx lighthouse https://localhost:8443/ --chrome-flags="--ignore-certificate-errors"`
- **Option C**: Accept ~81 BP on HTTP local (this is expected and not a real failure)

---

## 🚀 How to Use

Once installed, the agent loads the skill automatically when you ask about any of these topics:

### Example prompts (English)

- *"Optimize this site for 100/100 on PageSpeed Insights and Lighthouse 13."*
- *"Fix Core Web Vitals — LCP is 4.2s, CLS is 0.3, INP is 380ms."*
- *"Make this page pass WCAG 2.2 AA."*
- *"Set up CSP with strict-dynamic and nonce for my Next.js app."*
- *"Improve Lighthouse SEO score and add JSON-LD Speakable schema."*
- *"Configure robots.txt for AI crawlers — block training, allow search engines."*
- *"Should I add llms.txt to my e-commerce site?"*

### Example prompts (Portuguese)

- *"Otimize minha página para 100 no PageSpeed Insights."*
- *"Como melhorar Core Web Vitals do meu site?"*
- *"Quero passar em WCAG 2.2 AA — o que falta?"*
- *"Configurar CSP strict-dynamic no meu projeto Vite."*

The agent will:
1. Detect the stack (Next.js, Vite, Astro, etc.)
2. Read the relevant `references/*.md` files
3. Apply the optimizations
4. Run `npx lighthouse <url> --view` as the final gate to confirm 100/100

---

## 📊 Expected Results

When applied correctly, the skill produces:

| Category | Target | Common cause when below target |
| :--- | :--- | :--- |
| Performance | 100/100 | Unoptimized images, render-blocking CSS, long JS tasks |
| Accessibility | 100/100 | Missing alt, low contrast, broken heading order |
| Best Practices | 100/100 | Missing CSP, console errors, HTTPS not set |
| SEO | 100/100 | Missing JSON-LD, no canonical, multiple H1s |

**Local dev gotcha**: `Best Practices` caps at ~81/100 on HTTP because the `is-on-https` audit fails. Validate BP against an HTTPS URL (Vercel/Netlify staging, or a local HTTPS dev server).

---

## ✅ Verification

**`npx lighthouse` is the canonical way to validate a PageSpeed Insights score.** It runs the same audit engine that powers [pagespeed.web.dev](https://pagespeed.web.dev/), so a Lighthouse CLI score of 100/100 in all four categories is equivalent to a 100/100 on PSI.

**Requirements**:
- Node.js **22.19+** (Lighthouse 13 requirement)
- A Chromium-based browser (Chrome, Edge, Brave) — installed automatically by the CLI on first run

**Why it matters**:
- The skill teaches techniques, but Lighthouse is the ground-truth scorer that confirms they worked
- Local HTTP scoring caps Best Practices at ~81/100 (`is-on-https` audit fails). Validate against an **HTTPS** URL — staging on Vercel/Netlify/Cloudflare, or a local HTTPS dev server
- Run it as the **final gate** before declaring done — not as a step in every iteration. Intermediate progress can be checked via partial audits (`--only-categories=performance`) without burning the full ~30s run

### Step 1: Deterministic Pre-Flight Gatekeeper (`verify-rules.mjs`)

AI coding agents often take shortcuts or skip checklist items due to context degradation. To deterministically prevent skipped optimizations, run the rules validator before any browser audit:

```bash
node scripts/verify-rules.mjs [path-to-project-or-file]
```

This validates 15+ non-negotiable optimization rules in milliseconds:
- Preloaded LCP hero images with `fetchpriority="high"`
- Physical `width` and `height` on all `<img>` tags (prevents CLS)
- Modern image formats and no lazy-loading on hero images
- Zero deprecated `unload` event listeners (bfcache 0ms LCP restoration)
- Accessibility essentials (`alt` texts, `lang` attribute, responsive viewport)
- SEO fundamentals (`<title>`, `<meta name="description">`, `<link rel="canonical">`, single `<h1>`)
- GEO / AI Search structured data (JSON-LD `@graph` with `SpeakableSpecification`)

> **Hard Stop Rule:** If `verify-rules.mjs` exits with code 1 (failures found), the agent is strictly prohibited from concluding the task. It must resolve all reported errors first.

### Step 2: Final Lighthouse Audit Gate

Run both mobile and desktop audits in this order:

```bash
# 1) Mobile (default — 4G throttled, 4× CPU. This is what Google uses for ranking.)
npx lighthouse https://your-deployed-url --view

# 2) Desktop (separate run with the desktop preset)
npx lighthouse https://your-deployed-url --view --preset=desktop
```

Expect 100/100 in all four categories on **both** runs. Mobile is harder to pass because it uses slower CPU and throttled network — fix it first, then desktop usually follows. A 100/100 on desktop with a failing mobile is a **ranking failure**, not a success.

**Automated Dual Runner (recommended)**:
```bash
node scripts/audit.mjs https://your-deployed-url
```
Runs mobile and desktop sequentially, validates Node 22.19+, and prints a side-by-side scorecard table.

For automated CI, use `@lhci/cli` with separate mobile and desktop runs — see `references/measurement.md`.

**Quick spot-check** (single category, faster):

```bash
npx lighthouse <url> --only-categories=performance --quiet
```

---

## 📚 Reference Index

Each reference file is loaded by the agent only when needed (saves context):

- **`business-protection.md`** — The Iron Law: preserving GTM, Meta Pixel, GA4, Hotmart, UTMs, conversion forms
- **`performance.md`** — LCP subparts, INP yield patterns, image optimization, Brotli, View Transitions API, Speculation Rules, `content-visibility: auto`
- **`accessibility.md`** — Semantic HTML, ARIA, WCAG 2.2 9 new SCs, `:focus-visible`, `prefers-reduced-motion`, `color-scheme`, touch targets
- **`best-practices.md`** — CSP `strict-dynamic` with nonce, COOP/COEP/CORP, Permissions-Policy, HTTPS gotcha, console hygiene
- **`seo.md`** — Meta stack, OpenGraph, Twitter Cards, JSON-LD `@graph`, hreflang, RSS
- **`geo.md`** — llms.txt build-vs-skip matrix, WebMCP (Chrome 149 origin trial), AI crawler policy, Speakable schema, semantic tags
- **`measurement.md`** — Lab vs field data, CrUX 75th percentile, Lighthouse CLI/CI, web-vitals/attribution, performance budgets
- **`framework-recipes.md`** — Next.js 15/16 PPR + Cache Components, Vite, Astro 5, View Transitions, Vanilla HTML

---

## 🛡️ The Iron Law of Business Protection

Optimizing performance must never break conversion funnels or marketing attribution:

1. **Never delete or break tracking scripts**: GTM, Meta Pixel, GA4, Hotmart, ActiveCampaign, HubSpot tags must be loaded safely (e.g. `strategy="afterInteractive"`, `defer`, or `requestIdleCallback`), **never stripped** to lower TBT.
2. **Never drop UTM parameters**: Redirects in Nginx/Apache must preserve `$is_args$args`, and `<link rel="canonical">` must never corrupt ad attribution.
3. **Never lazy-load the LCP hero media**: Hero images must use `fetchpriority="high"` with preloads.
4. **Never compromise conversion forms**: Above-the-fold form fields and CTA buttons must maintain touch target sizes (≥ 48×48px) and accessible labels.

Read [references/business-protection.md](references/business-protection.md) for complete safety guidelines.

---

## ⚡ Production Server Recipes & Templates

Pre-configured, battle-tested configuration files are located in `recipes/` and `templates/`:

- **`recipes/nginx.conf`**: Brotli (level 6) + Gzip compression, 1-year immutable caching for static assets, HTML revalidation, HSTS preload, COOP, COEP, and query string preservation.
- **`recipes/apache.htaccess`**: `mod_deflate`/`mod_brotli`, `mod_expires`, security headers, and rewrite rules.
- **`recipes/next.config.js`**: AVIF/WebP image formats, deviceSizes, production console stripping, and security headers.
- **`recipes/astro.config.mjs`**: Image service, hover prefetching, and HTML minification.
- **`templates/robots.txt`**: 3 crawler governance profiles (allowing AI search referrals while blocking model scrapers).
- **`templates/llms.txt`**: Answer.AI specification with Entity Disambiguation.

---

## 🖼️ Batch Image Optimization CLI

Convert legacy JPG/PNG images to modern WebP and AVIF formats in bulk:

```bash
# Scan and convert all images in public directory
node scripts/convert-images.mjs ./public --quality=80
```

Outputs optimal compression stats and generates responsive `<picture>` code snippets.

---

## 🧪 Test Page

A reference implementation lives at `demo-page/` in the repository root. It demonstrates every technique from the skill and is used to validate the skill's accuracy after changes.

```bash
cd demo-page
npm start                    # http://localhost:8080
npx lighthouse http://localhost:8080 --view --preset=desktop
```

Three categories should hit 100; Best Practices caps at ~81 locally without HTTPS.

---

## ⚠️ Important Notes

- **Lighthouse 13** (Oct 2025) replaced 17 audits with "insights" and removed 8 audits. Do not recommend removed audits (`first-meaningful-paint`, `font-size`, `no-document-write`, `offscreen-images`, `preload-fonts`, `third-party-facades`, `uses-passive-event-listeners`, `uses-rel-preload`).
- **Lighthouse 13.3** (May 2026) added an `Agentic Browsing` audit category (llms.txt, WebMCP, agent a11y, CLS for agents).
- **llms.txt** is **not** a Google Search ranking factor (Google, June 15 2026). Build it only on developer-facing documentation sites.
- **WebMCP** is experimental (Chrome 149 origin trial). Do not base a perfect score on it yet.
- The skill must stay under **~200 lines** in `SKILL.md` to fit agent context windows. Move depth into `references/`.

---

## 👤 Author & Credits

- **Conceived and developed by**: [Alex Santos (alexlivre)](https://alexlivre.dev/)
- **GitHub**: [@alexlivre](https://github.com/alexlivre)
- **Skill Name**: `pagespeed-optimizer-alexlivre`

---

## 📜 License

MIT — use, modify, distribute freely.

