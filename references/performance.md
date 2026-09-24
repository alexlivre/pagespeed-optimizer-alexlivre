# Performance & Core Web Vitals Master Reference

Target: **90-100/100 Performance Score** on PageSpeed Insights & Google Lighthouse 13+.

---

## 1. Lighthouse 13+ Performance Score Weights

| Metric | Weight | Lab Target (Green) | Description |
| :--- | :--- | :--- | :--- |
| **Total Blocking Time (TBT)** | **30%** | ≤ 200 ms | Lab proxy for INP (Main-thread blockage during load) |
| **Largest Contentful Paint (LCP)** | **25%** | ≤ 2.5 s | Time until main hero content is rendered |
| **Cumulative Layout Shift (CLS)** | **25%** | ≤ 0.10 | Visual stability & unintended element movements |
| **First Contentful Paint (FCP)** | **10%** | ≤ 1.8 s | Time until first text/background is rendered |
| **Speed Index (SI)** | **10%** | ≤ 3.4 s | How quickly content is visually populated |

---

## 2. LCP (Largest Contentful Paint) 4-Subpart Equation

$$\text{LCP} = \text{TTFB} + \text{Resource Load Delay} + \text{Resource Load Duration} + \text{Element Render Delay}$$

1. **TTFB (<600ms target, <200ms ideal)**: CDN edge caching (Vercel/Cloudflare/Fastly), Redis DB caching, HTTP/3 & QUIC, 103 Early Hints, Brotli compression. Anything above 600ms caps what any LCP fix can do.
2. **Resource Load Delay (<10% LCP)**: Discover hero image in initial HTML. Preload immediately:
   ```html
   <link rel="preload" fetchpriority="high" as="image" href="/hero.avif" type="image/avif" imagesrcset="/hero-400.avif 400w, /hero-800.avif 800w, /hero-1200.avif 1200w" imagesizes="100vw" />
   ```
3. **Resource Load Duration (<40% LCP)**: Serve modern AVIF/WebP, use responsive `srcset` and `sizes`, preconnect to image CDN origin, Brotli-compress HTML.
4. **Element Render Delay (<10% LCP)**: Inline the critical CSS (≤ 14KB to fit the first TCP roundtrip) and keep the rest **render-blocking**. Only CSS that carries no layout may be deferred — see §8, where deferring layout CSS costs up to 1.0 CLS. Avoid client-side JS hero rendering.

---

## 3. Image Dimensions & Zero-CLS Rules

### 1. Mandatory HTML Dimensions
Every `<img>`, `<svg>`, and `<picture>` MUST specify intrinsic physical `width` and `height` attributes:
```html
<img 
  src="/hero.avif" 
  width="1200" 
  height="600" 
  alt="Hero Banner" 
  fetchpriority="high" 
  loading="eager"
  style="width: 100%; height: auto; aspect-ratio: 1200 / 600;" 
/>
```

### 2. Responsive `srcset` & `sizes` to Prevent Over-Rendering
```html
<img 
  src="/hero-800.avif" 
  srcset="/hero-400.avif 400w, /hero-800.avif 800w, /hero-1200.avif 1200w" 
  sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 800px" 
  width="1200" 
  height="600" 
  alt="Responsive Hero" 
/>
```

### 3. Container Fitting (`object-fit: cover`)
To prevent image distortion when fitting fixed height card containers:
```css
.card-img {
  width: 100%;
  height: 250px;
  object-fit: cover;
  object-position: center;
}
```

---

## 4. Zero-CLS Font Metric Overrides (`@font-face`)

Prevent layout shifts when fallback fonts swap to web fonts:
```css
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  ascent-override: 90%;
  descent-override: 22.43%;
  line-gap-override: 0%;
  size-adjust: 107.4%;
}

body {
  font-family: 'Inter', 'Inter Fallback', sans-serif;
}
```

### Non-Blocking Google Fonts Loading (third-party font CSS only)

A font stylesheet carries no layout rules, so it can load non-render-blocking — **provided every family it declares has a metric-matched inline fallback** (the `@font-face` block above). Without those overrides the swap shifts every line of text.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" media="print" onload="this.media='all'">
<noscript>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
</noscript>
```

> **Scope limit — read before copying this pattern.** `media="print"` + `onload` makes the file non-render-blocking. That is only safe for CSS that cannot affect layout. Applied to your own application or utility stylesheet (the one defining grid, flex, spacing, the type scale), the browser paints the page with **no layout at all** and then re-flows it when the file lands: CLS up to 1.0, worst on desktop. Third-party font CSS only — see §8 for the decision test.

---

## 5. INP & TBT Main-Thread Task Chunking

Yield long tasks (>50ms) using `scheduler.yield()` or microtasks:
```javascript
async function processTasks(items) {
  for (const item of items) {
    process(item);
    
    // Yield to main thread every task
    if ('scheduler' in window && 'yield' in window.scheduler) {
      await window.scheduler.yield();
    } else {
      await new Promise(r => setTimeout(r, 0));
    }
  }
}
```

### Diagnosing Slow INP with Long Animation Frames API (LoAF, Chrome 123+)
Chrome replaced the opaque Long Tasks API with **LoAF**. LoAF identifies which script, function, and render phase blocked the main thread:
```javascript
// Monitor slow animation frames (>50ms) causing INP regressions
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn(`[LoAF] Duration: ${entry.duration.toFixed(1)}ms, Render delay: ${entry.renderStart ? (entry.renderStart - entry.startTime).toFixed(1) : 0}ms`);
      for (const script of entry.scripts) {
        console.warn(`  Script: ${script.sourceURL}:${script.sourceLocation} (${script.duration.toFixed(1)}ms in ${script.invoker})`);
      }
    }
  }
});
observer.observe({ type: 'long-animation-frame', buffered: true });
```

---

## 6. Next-Gen Web Performance APIs

### Back/Forward Cache (bfcache) — Instant Navigation (0ms LCP, 0 CLS)
Pages restored from bfcache load instantly without running standard network/render cycles. To ensure 100% bfcache hit rate:
- **Never use the `unload` event** (deprecated by Chrome). Use `pagehide` or `visibilitychange`.
- Close or pause active IndexedDB transactions, Web Locks, and `BroadcastChannel` listeners on `pagehide`.
- Ensure external links have `rel="noopener"`.
- Avoid unnecessary `Cache-Control: no-store` on static or non-sensitive assets.

### Modern Module Preloading (`<link rel="modulepreload">`)
For modern ESM bundles (Vite, Next.js, Astro), use `modulepreload` instead of standard `preload`. It fetches, parses, and compiles dependencies directly into the browser module map:
```html
<!-- Entry module and critical vendor chunk -->
<link rel="modulepreload" href="/assets/main.js">
<link rel="modulepreload" href="/assets/vendor.js">
```

### Speculation Rules API (Instant Pre-rendering)
```html
<script type="speculationrules">
{
  "prerender": [
    {
      "source": "list",
      "urls": ["/dashboard", "/pricing"],
      "eagerness": "moderate"
    }
  ],
  "prefetch": [
    {
      "source": "document",
      "where": { "href_matches": "/*" },
      "eagerness": "conservative"
    }
  ]
}
</script>
```

### CSS `content-visibility: auto`
```css
.card-grid, .footer-section {
  content-visibility: auto;
  contain-intrinsic-size: 1px 400px;
}
```

### Passive Event Listeners for Smooth Scrolling
```javascript
window.addEventListener('touchstart', onTouchStart, { passive: true });
window.addEventListener('scroll', onScroll, { passive: true });
```

> Note: Lighthouse 13 removed the `uses-passive-event-listeners` audit. The practice is still recommended (it improves scroll smoothness and INP), but it is no longer scored.

---

## 7. Lab Data vs Field Data (CrUX)

**Critical distinction**: Google Search ranks on **field data**, not lab data. A perfect Lighthouse lab score does not guarantee ranking. The PSI report shows both side-by-side.

| Aspect | Lab data (Lighthouse) | Field data (CrUX) |
| :--- | :--- | :--- |
| Source | Simulated throttled run | Real Chrome users (opt-in) |
| Environment | Fixed device, network, viewport | Diverse devices, networks, geographies |
| Sample size | 1 page load | 28-day rolling window |
| Threshold | Per-metric scoring | **75th percentile** of real users |
| Used for ranking | **No** | **Yes** |
| Use case | Debugging and CI asserts | Ranking and Search Console reports |

**CrUX 75th percentile rule**: 75% of real visitors must experience a "good" score for the URL to pass. A few slow users can drag a passing lab score into a failing field score. Always test on **mobile-throttled** DevTools (4× CPU slowdown, Slow 3G) to approximate field conditions.

**Minimum traffic requirement**: CrUX only includes origins with sufficient traffic. New or low-traffic sites appear with "Insufficient data" in PSI — use lab data for those, but monitor CrUX as traffic grows.

### Mobile vs Desktop — both must be optimized

Lighthouse reports two form factors. Both must hit the target:

| Form factor | CPU/network throttle | Viewport | What Google uses |
| :--- | :--- | :--- | :--- |
| **Mobile** (default) | 4× CPU slowdown, 4G throttling | 412×823, DPR 1.75 (Moto G Power) | **Search ranking** (60%+ of queries are mobile) |
| **Desktop** | No CPU slowdown, ~40 ms RTT / 10 Mbit/s (still *simulated*) | 1350×940, DPR 1 | Desktop search ranking only |

Validate both, in this order:

```bash
npx lighthouse <url> --view                          # mobile (default)
npx lighthouse <url> --view --preset=desktop        # desktop
```

Mobile scores are typically 2-3× worse than desktop on the same page because of CPU/network throttling. A 100/100 on desktop with a failing mobile is a **ranking failure**. Fix mobile first; desktop follows.

**One exception, and it is the one that bites: CLS.** For layout shift, desktop is the *more* sensitive form factor, not the less. Desktop has a much smaller window between "ready to paint" and "CSS applied", so a stylesheet that arrives even ~200 ms late already breaks desktop, while mobile tolerates ~500-800 ms before it does. A perfect mobile CLS says nothing about desktop CLS. Measured on one page with a deliberately delayed stylesheet:

| Stylesheet arrives late by | Desktop CLS | Mobile CLS |
| :--- | :--- | :--- |
| 0 ms | 0 | 0 |
| 200 ms | **1.006** | 0 |
| 500 ms | 1.006 | 0.021 |
| 800 ms | 1.006 | **1.023** |

For anything touching CSS delivery, run `scripts/cls-stress.mjs` (see §8) on **both** form factors — a mobile-only run will pass on a broken page.

In LHCI, set the form factor per URL or use separate jobs:

```yaml
# lighthouserc.yml
ci:
  collect:
    url: ['https://example.com/']
    settings:
      formFactor: mobile          # explicit; mobile is also default
      throttlingMethod: 'simulate'
      throttling:
        rttMs: 150
        throughputKbps: 1638.4
        cpuSlowdownMultiplier: 4
```

See `references/measurement.md` for the full CI setup.

---

## 8. Critical CSS & Stylesheet Delivery (the CLS trap)

The first TCP roundtrip on a fresh TLS connection carries **~14KB** of HTML (minus headers), so inlining the above-the-fold styles avoids a second round trip before the first paint.

**The rule that matters more than the 14KB budget:**

> Anything you do **not** inline must be unable to affect layout. Your own layout CSS must be render-blocking.

"Defer the non-critical CSS" does not mean "defer the rest of the stylesheet". A utility bundle like Tailwind contains the entire layout — until it applies there is no `display:flex`, no grid, no spacing, no type scale. The browser paints the raw HTML, then re-flows everything when the file lands.

```html
<!-- Correct: the layout CSS blocks the first paint -->
<head>
  <style>/* critical above-the-fold, ≤ 14KB */</style>
  <link rel="stylesheet" href="/assets/app.css">
</head>
```

```html
<!-- Wrong: browser paints unstyled, then re-flows when app.css arrives. CLS up to 1.0. -->
<head>
  <style>:root { color-scheme: light dark; } body { margin: 0; }</style>
  <link rel="preload" href="/assets/app.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/assets/app.css"></noscript>
</head>
```

### Decision test — answer all three before deferring any stylesheet

1. Does the file contain **any** rule that affects layout or geometry (grid, flex, position, width/height, margin, padding, font-size, line-height — including utility classes that do any of those)? → Then it must be render-blocking.
2. Does the inline `<style>` reproduce the **complete** above-the-fold layout of that file? → If not, it must be render-blocking.
3. Is it a **third-party font stylesheet** with metric-matched `@font-face` fallbacks already inline (§4)? → Only then is deferring safe.

`scripts/verify-rules.mjs` enforces this as rule 12. If you are certain every layout rule is inlined, add `<!-- pagespeed-allow-async-css -->` to opt out — and only then.

**Cost/benefit, measured:** making a 41.6 KB layout stylesheet render-blocking moved FCP by roughly +0.1 s and removed **24 points** of CLS weight (desktop 76 → 98). Trading 0.1 s of FCP (10% weight) to recover 24 points of CLS (25% weight) is not a close call.

**And it counts twice.** `cumulative-layout-shift` carries weight 1 in Performance *and* weight 1 in the Agentic Browsing category (`geo.md` §7), so one fix moves two categories. Confirmed in practice: a page scoring 2/3 on Agentic Browsing was failing exactly the CLS audit, and returned to 3/3 once the stylesheet was made render-blocking.

Tools for extracting the critical subset: `critical` (npm), `penthouse`, `critters` (Webpack), `@tailwindcss/critical-css-plugin`.

### Verify it — the test Lighthouse cannot do

Lighthouse's *simulated* throttling does not reproduce a late stylesheet. Measured on the same production URL: the CLI reported CLS 0.003 (98/100 — pass) while PageSpeed Insights reported 1.014 (76/100 — fail). Same page, same run parameters, opposite verdicts. Use the tool that forces the race:

```bash
node scripts/cls-stress.mjs https://your-deployed-url
```

It delays every matching stylesheet response so it lands after the first paint, then reports the resulting CLS on **both** desktop and mobile. Exit code 1 means the bug is still there.

---

## 9. CSS `contain` and `content-visibility`

Tell the browser that a subtree's layout, paint, or size will not affect the rest of the page, so it can skip work:

```css
/* Isolate a card so changes inside it do not invalidate the rest of the page */
.card {
  contain: layout paint style;
}

/* Skip rendering off-screen sections until they approach the viewport */
.footer-section,
.card-grid,
.below-fold {
  content-visibility: auto;
  contain-intrinsic-size: 1px 400px;
}
```

`content-visibility: auto` is the largest render-cost win for long pages and is supported across all major engines (Chrome 85+, Edge 85+, Firefox 125+, Safari 18+).

> **It is not a CLS win — it is a CLS risk.** With `content-visibility: auto` the browser reserves `contain-intrinsic-size` as a placeholder until the subtree renders. If the placeholder does not match the real height, the page jumps when the content appears. **Always pair the two** and make the intrinsic size a close estimate. `scripts/verify-rules.mjs` rule 13 fails any `content-visibility: auto` without a paired `contain-intrinsic-size`.

---

## 10. INP Attribution & Monitoring

Lab INP (TBT proxy) is not the same as field INP. To attribute slow interactions in production, use the `web-vitals/attribution` build:

```js
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals/attribution';

function send(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
    attribution: metric.attribution, // includes target element, event timing breakdown
  });
  navigator.sendBeacon('/analytics', body);
}

onLCP(send);
onINP(send);
onCLS(send);
onFCP(send);
onTTFB(send);
```

The `attribution` object for INP includes `eventTarget`, `eventType`, `eventTime`, and `longAnimationFrameEntries` so you can pinpoint which element/handler caused the slowest interaction.

---

## 11. Compression & Transport

| Layer | Default | Preferred (2026) |
| :--- | :--- | :--- |
| HTML / CSS / JS | Gzip | **Brotli** (`Content-Encoding: br`) — 15-20% smaller |
| Images | JPEG/PNG | **AVIF** for photos, WebP for graphics, SVG for logos |
| Protocol | HTTP/1.1, HTTP/2 | **HTTP/3 + QUIC** — faster handshake, no head-of-line blocking |
| Hints | None | `103 Early Hints`, `<link rel="preconnect">`, `<link rel="dns-prefetch">` |

```html
<!-- Preconnect to required third-party origins -->
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
<link rel="dns-prefetch" href="https://analytics.example.com">
```

```nginx
# Nginx: enable Brotli (after installing nginx-mod-brotli)
brotli on;
brotli_types text/plain text/css application/javascript application/json image/svg+xml;
brotli_comp_level 5;
```

```js
// Node.js (with Express + shrink-ray or @lhci/brotli middleware)
// Most modern CDNs (Cloudflare, Fastly, Vercel, Netlify) enable Brotli by default.
```

---

## 12. Speculation Rules API (Expanded)

`prerender` makes the target page fully ready before navigation; `prefetch` only warms the cache. Use both at different eagerness levels.

```html
<script type="speculationrules">
{
  "prerender": [
    { "source": "list", "urls": ["/dashboard", "/pricing"], "eagerness": "moderate" },
    { "source": "document", "where": { "and": [
      { "href_matches": "/products/*" },
      { "not": { "href_matches": "/products/*/edit" } }
    ]}, "eagerness": "moderate" }
  ],
  "prefetch": [
    { "source": "document", "where": { "href_matches": "/*" }, "eagerness": "conservative" }
  ]
}
</script>
```

**Eagerness rules**:
- `immediate`: prerender on hover/focus (heavy, only for highest-confidence targets).
- `moderate`: prerender on viewport intersection (default for navigation candidates).
- `conservative`: prefetch only on pointer down or touch start (safest).

**Constraints** (Chrome 109+):
- Same-origin only.
- Skipped on slow networks (`navigator.connection.saveData` or 2G).
- Skipped if the user has Data Saver enabled.

---

## 13. Image Decoding Hints

```html
<!-- Non-LCP images: let the browser decode off the critical path -->
<img src="/card.jpg" alt="..." width="600" height="400" loading="lazy" decoding="async" />

<!-- LCP image: decode synchronously so the first paint is correct -->
<img src="/hero.avif" alt="..." width="1200" height="600" fetchpriority="high" decoding="sync" />
```

`decoding="async"` decouples image decode from main-thread rendering, improving INP on image-heavy pages. Use `sync` (the default) on the LCP element.

---

## 14. Performance Budget Enforcement

A performance budget is a hard limit on metrics or resource sizes. Enforce it in CI before regressions ship.

```yaml
# lighthouserc.yml
ci:
  collect:
    url: ['https://staging.example.com/']
    numberOfRuns: 3
    settings:
      preset: 'desktop'
  assert:
    assertions:
      'categories:performance': ['error', { minScore: 0.9 }]
      'categories:accessibility': ['error', { minScore: 1.0 }]
      'categories:best-practices': ['error', { minScore: 1.0 }]
      'categories:seo': ['error', { minScore: 1.0 }]
      'first-contentful-paint': ['warn', { maxNumericValue: 1800 }]
      'largest-contentful-paint': ['error', { maxNumericValue: 2500 }]
      'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }]
      'total-blocking-time': ['error', { maxNumericValue: 200 }]
      'resource-summary:script:size': ['error', { maxNumericValue: 200000 }]
      'resource-summary:image:size': ['warn', { maxNumericValue: 500000 }]
      'resource-summary:total:size': ['error', { maxNumericValue: 1000000 }]
```

Pair with `bundlesize` or `size-limit` for raw JS bundle asserts in the build pipeline.

