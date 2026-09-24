# Measurement, CI, and Continuous Monitoring

Target: **reproducible 90-100 scores** in CI and **continuous visibility** into field data.

This reference is the bridge between "code that should be fast" and "code that *is* fast in production". The SKILL.md checklist is the human gate; this file is the machine gate.

---

## 1. Lab Data vs Field Data — Decision Tree

```
                 ┌───────────────────────────┐
                 │ What do I need?           │
                 └─────────────┬─────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼─────┐          ┌─────▼─────┐          ┌─────▼─────┐
   │ Debug a  │          │  Catch    │          │  Know     │
   │ single   │          │  regressions│         │  real-user│
   │ page     │          │  in CI    │          │  perf     │
   └────┬─────┘          └─────┬─────┘          └─────┬─────┘
        │                      │                      │
   ┌────▼─────┐          ┌─────▼─────┐          ┌─────▼─────┐
   │ Lighthouse│         │ Lighthouse │          │  CrUX     │
   │ CLI / DevTools│     │ CI         │          │  + RUM    │
   └──────────┘          └───────────┘          └───────────┘
        LAB                   LAB                  FIELD
```

**Rule of thumb**:
- **Lab** is reproducible, deterministic, run-anytime. Use it for CI and local debugging.
- **Field** is what Google uses for ranking. Use it to monitor what real users experience over time.

If they disagree, **trust field data for ranking decisions**, lab for debugging.

The **Lighthouse CLI** is the practical validator for PageSpeed Insights *categories*, but it is **not** a faithful reproduction of PSI. Its *simulated* throttling reconstructs the load timeline instead of observing a real one, and it does not reproduce a stylesheet that lands after the first paint. Measured on one production URL: the CLI reported CLS 0.003 (98/100 — pass) while PSI reported 1.014 (76/100 — fail). Treat a CLI pass as necessary, not sufficient, and for CSS delivery run `scripts/cls-stress.mjs` (§9). Treat `npx lighthouse <url> --view` as the gate before declaring a page done — not as a step in every iteration. Local HTTP scoring caps at ~81/100 in Best Practices because of the `is-on-https` audit; always validate BP against an HTTPS URL (or with `--ignore-certificate-errors` against a local HTTPS dev server).

---

## 2. Lighthouse CLI (Local & CI)

```bash
# Install (requires Node 22.19+ for Lighthouse 13)
npm install -g lighthouse

# Run against a local or remote URL
lighthouse https://example.com/ --view

# Headless output as JSON
lighthouse https://example.com/ --output json --output-path ./lh.json --quiet

# Mobile is the default: 4G throttling + 4x CPU slowdown
lighthouse https://example.com/

# Desktop is a separate run with the desktop preset
lighthouse https://example.com/ --preset=desktop

# Single category for fast local feedback
lighthouse https://example.com/ --only-categories=performance --quiet --form-factor=mobile
```

> **Known blind spot.** Both runs above use *simulated* throttling, which reconstructs the load timeline rather than observing a real load. It does not reproduce a late stylesheet, so it can report a passing CLS on a page PSI scores at 1.0. §9 covers the test that does catch it.

The `--only-categories` flag targets specific audits; useful for fast CI feedback loops.

---

## 3. Lighthouse CI (`@lhci/cli`)

Lighthouse CI runs Lighthouse against a list of URLs on every PR, fails the build on score regressions, and tracks metrics over time in a dashboard.

### 3.1. Install

```bash
npm install --save-dev @lhci/cli
```

### 3.2. `lighthouserc.yml` — mobile + desktop runs

Asserts **both** mobile (default, what Google uses for ranking) and desktop. Mobile is harder to pass, so the threshold is the same — fix mobile first, desktop follows.

```yaml
ci:
  collect:
    startServerCommand: 'npm run start'
    url:
      - 'http://localhost:3000/'
      - 'http://localhost:3000/products'
      - 'http://localhost:3000/checkout'
    numberOfRuns: 3
    settings:
      # Mobile run (default form factor, what Google uses for ranking)
      formFactor: mobile
      throttlingMethod: 'simulate'
      screenEmulation:
        mobile: true
        width: 412
        height: 823
        deviceScaleFactor: 1.75
      throttling:
        rttMs: 150
        throughputKbps: 1638.4
        cpuSlowdownMultiplier: 4
      chromeFlags: '--no-sandbox'
      preset: undefined    # ensure preset doesn't override formFactor
  assert:
    assertions:
      # Score-based (Lighthouse 13 categories)
      'categories:performance':  ['error', { minScore: 0.9 }]
      'categories:accessibility': ['error', { minScore: 1.0 }]
      'categories:best-practices': ['error', { minScore: 1.0 }]
      'categories:seo': ['error', { minScore: 1.0 }]

      # Metric thresholds (75th percentile of the runs)
      'first-contentful-paint':       ['warn', { maxNumericValue: 1800 }]
      'largest-contentful-paint':     ['error', { maxNumericValue: 2500 }]
      'speed-index':                  ['warn', { maxNumericValue: 3400 }]
      'total-blocking-time':          ['error', { maxNumericValue: 200 }]
      'cumulative-layout-shift':      ['error', { maxNumericValue: 0.1 }]
      'interactive':                  ['warn', { maxNumericValue: 5000 }]

      # Resource budgets
      'resource-summary:script:size':    ['error', { maxNumericValue: 200000 }]
      'resource-summary:image:size':     ['warn',  { maxNumericValue: 500000 }]
      'resource-summary:stylesheet:size':['warn',  { maxNumericValue: 100000 }]
      'resource-summary:document:size':  ['warn',  { maxNumericValue: 50000 }]
      'resource-summary:third-party:size':['warn', { maxNumericValue: 300000 }]
      'resource-summary:total:size':     ['error', { maxNumericValue: 1500000 }]

      # Audit-specific (Lighthouse 13 insight IDs)
      # Do NOT assert `render-blocking-insight: maxLength 0` here. A render-blocking stylesheet is
      # frequently the *fix* for late-CSS CLS — chasing zero render-blocking resources pushes you
      # straight into the pattern that costs up to 1.0 CLS. Render-blocking on purpose is correct.
      'lcp-discovery-insight':       ['error', { maxLength: 0 }]
      'uses-long-cache-ttl':         ['error', { minLength: 1 }]
      'modern-image-formats':        ['warn',  { maxLength: 0 }]
  upload:
    target: 'temporary-public-storage'  # swap for LHCI server, Lighthouse Cloud, or GitHub Statuses
```

### 3.3. Run in CI (GitHub Actions example)

```yaml
name: Lighthouse CI
on: [pull_request]
jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run build
      - run: npx @lhci/cli autorun
```

---

## 4. Real User Monitoring (`web-vitals`)

Lab data only tells you what one simulated user experienced. Field data via `web-vitals` tells you what **75% of real users** experience, and lets you attribute slow interactions to the elements that caused them.

### 4.1. Basic setup (no attribution)

```js
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

function send({ name, value, id, rating }) {
  navigator.sendBeacon('/analytics/vitals', JSON.stringify({ name, value, id, rating }));
}

onLCP(send);
onINP(send);
onCLS(send);
onFCP(send);
onTTFB(send);
```

> **Gotcha**: `sendBeacon` POSTs to `/analytics/vitals`. If no backend exists at that path, Lighthouse flags `errors-in-console` with `405 Method Not Allowed`, costing **1 weight** in Best Practices. During local development or demos, fall back to `console.log` or `localStorage` until the endpoint exists.

### 4.2. With attribution (recommended)

Attribution tells you **which element** triggered the worst INP, **which image** was the LCP, and **which font** caused the CLS.

```js
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals/attribution';

function send(metric) {
  const { name, value, id, rating, attribution } = metric;
  navigator.sendBeacon('/analytics/vitals', JSON.stringify({
    name, value, id, rating,
    attribution: {
      // LCP
      lcpElement: attribution?.element?.outerHTML?.slice(0, 200),
      lcpUrl: attribution?.url,
      lcpTimeToFirstByte: attribution?.timeToFirstByte,
      // INP (with LoAF breakdown in Chrome 123+)
      inpEventTarget: attribution?.eventTarget?.outerHTML?.slice(0, 200),
      inpEventType: attribution?.eventType,
      inpEventTime: attribution?.eventTime,
      inpLoadState: attribution?.loadState,
      inpLoafScripts: attribution?.longAnimationFrameEntries?.[0]?.scripts?.map(s => ({
        source: s.sourceURL,
        duration: s.duration,
        invoker: s.invoker,
      })),
      // CLS
      clsLargestShiftTarget: attribution?.largestShiftTarget?.outerHTML?.slice(0, 200),
      clsLargestShiftValue: attribution?.largestShiftValue,
    },
  }));
}

// In web-vitals v4+, pass reportAllChanges to track SPA Soft Navigations:
const opts = { reportAllChanges: true };
onLCP(send, opts);
onINP(send, opts);
onCLS(send, opts);
onFCP(send);
onTTFB(send);
```

### 4.3. Server endpoint (Express + BigQuery/Snowflake example)

```js
app.post('/analytics/vitals', express.text({ type: '*/*' }), (req, res) => {
  const event = JSON.parse(req.body);
  console.log('Web Vital:', event);
  // Forward to your analytics backend
  bigquery.dataset('perf').table('web_vitals').insert([event]).catch(console.error);
  res.status(204).end();
});
```

---

## 5. CrUX (Chrome User Experience Report)

CrUX is the **field data** Google Search uses to evaluate Core Web Vitals for ranking. The PageSpeed Insights report shows it when the origin has enough traffic (typically a few thousand unique visitors per day).

### 5.1. Check CrUX for any origin

```bash
# Via PageSpeed Insights (UI)
open "https://pagespeed.web.dev/analysis?url=https://example.com"

# Via the CrUX API (free tier — but an API key is required)
curl "https://chromeuxreport.googleapis.com/v1/records:queryRecord?formFactor=PHONE&origin=example.com&key=YOUR_API_KEY"
```

The response includes `largest_contentful_paint`, `interaction_to_next_paint`, `cumulative_layout_shift`, `first_contentful_paint`, and `experimental_time_to_first_byte` at the 75th percentile.

### 5.2. Track over time

Google deprecated the standalone Looker Studio CrUX Dashboard in favor of **CrUX Vis** and the **CrUX History API**.

| Option | Cost | When to use |
| :--- | :--- | :--- |
| [CrUX Vis](https://developer.chrome.com/docs/crux/vis) | Free | Official Google visualizer for 6-month historical CWV trends |
| [CrUX History API](https://developer.chrome.com/docs/crux/history-api) | Free | Programmatic access to weekly historical p75 metrics & breakdowns |
| SpeedCurve / DebugBear / Calibre | $15–500/mo | Continuous tracking, competitive benchmarks, daily alerts |

```bash
# Query historical CWV data (6-month weekly series) via CrUX History API:
curl "https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?origin=https://example.com&key=YOUR_API_KEY"
```

### 5.3. Set up an alert

When field INP p75 crosses 200ms (the "good/needs-improvement" threshold), page the on-call:

```js
import { onINP } from 'web-vitals/attribution';

onINP(({ value }) => {
  if (value > 200) {
    navigator.sendBeacon('/alerts/inp', JSON.stringify({ value, ts: Date.now() }));
  }
});
```

Run a daily CrUX API check in CI and fail if the origin drops out of "good" on any CWV.

---

## 6. Performance Budget Enforcement in Build

A **performance budget** is a hard limit on resource sizes or metric thresholds enforced during the build. Catch regressions before they reach production.

### 6.1. `bundlesize` (per-file JS/CSS limits)

```json
// package.json
"bundlesize": [
  { "path": "./dist/main.js", "maxSize": "100 KB" },
  { "path": "./dist/vendor.js", "maxSize": "200 KB" },
  { "path": "./dist/main.css", "maxSize": "30 KB" }
]
```

### 6.2. `size-limit` (per-import JS limits)

```json
// .size-limit.json
[
  { "name": "main",       "path": "dist/main.js",       "limit": "100 KB" },
  { "name": "vendor",     "path": "dist/vendor.js",     "limit": "200 KB" },
  { "name": "polyfills",  "path": "dist/polyfills.js",  "limit": "30 KB" },
  { "name": "total JS",   "path": "dist/*.js",          "limit": "300 KB" }
]
```

### 6.3. Combine with Lighthouse CI

Use both: bundles for "what is in the bundle", Lighthouse for "how the bundle affects the user". Neither alone is sufficient.

### 6.4. Pre-Lighthouse Local CI Guardrails (Zero-Dependency)
Before launching a 30-second headless browser Lighthouse run, catch fatal 404s and schema syntax breaks in milliseconds with a local pre-commit check:
```javascript
// scripts/pre-audit.js (run with node scripts/pre-audit.js)
import fs from 'node:fs';
import path from 'node:path';

// 1. Verify all local image src references in HTML actually exist on disk (prevents 404s)
const html = fs.readFileSync('index.html', 'utf8');
const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
let match;
while ((match = imgRegex.exec(html)) !== null) {
  const src = match[1];
  if (!src.startsWith('http') && !src.startsWith('data:')) {
    const cleanPath = src.split('?')[0].split('#')[0];
    if (!fs.existsSync(cleanPath)) {
      throw new Error(`[Pre-Audit Error] Referenced image does not exist: ${cleanPath}`);
    }
  }
}

// 2. Validate JSON-LD and MCP manifests parse cleanly.
//    This runs in Node, so `document` does not exist — regex the HTML string instead.
for (const block of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
  JSON.parse(block[1]);
}
if (fs.existsSync('mcp-manifest.json')) JSON.parse(fs.readFileSync('mcp-manifest.json', 'utf8'));

console.log('✓ Pre-audit passed: 0 missing assets, valid JSON schemas.');
```

---

## 7. Continuous Monitoring Stack (Recommended)

| Layer | Tool | Free tier? |
| :--- | :--- | :--- |
| Lab (per PR) | Lighthouse CI (`@lhci/cli`) | Yes |
| Field (synthetic) | WebPageTest or Checkly, hourly | Yes (limited) |
| Field (real users) | `web-vitals` + your own endpoint | Yes |
| CrUX tracking | CrUX API + Looker Studio | Yes |
| Continuous RUM + alerts | SpeedCurve / DebugBear / Calibre | No (~$15–500/mo) |

For most projects, the **lab (Lighthouse CI) + field (web-vitals RUM) + CrUX API check** stack is sufficient and entirely free.

---

## 8. Common Measurement Pitfalls

1. **Testing only one form factor**: Mobile is usually 2-3× worse because of CPU/network throttling — but **not for late-CSS CLS**, where desktop is the more fragile one (pitfall 7). Always run both.
2. **One-shot PSI scores**: A single run has ±5 point variance. Use `numberOfRuns: 3` in the LHCI config, or repeat the CLI run and take the median.
3. **Lab passing ≠ field passing**: A 100 lab score can coexist with field INP of 400ms because the lab does not exercise the long interactions users trigger.
4. **Ignoring 3rd-party scripts**: Analytics, chat widgets, and ad scripts add hundreds of milliseconds of TBT that lab scores do not always capture. Audit them quarterly.
5. **Not testing on slow devices**: 4× CPU throttle in DevTools approximates a mid-range Android. Use it for any user-facing change.
6. **Trusting a lab CLS pass**: Lighthouse's simulated throttling does not reproduce a stylesheet that arrives after the first paint. Measured on one production URL: the CLI reported 0.003 (pass) while PSI reported 1.014 (fail). A lab CLS pass is not proof — run §9.
7. **Assuming desktop is always the easier target**: for late-CSS CLS the opposite holds. Desktop breaks at ~200 ms of stylesheet lateness while mobile tolerates ~500-800 ms. A green mobile score can hide a completely broken desktop.

---

## 9. Late-CSS CLS Falsification Test

Lab tools score what they happen to observe. A stylesheet that lands *after* the first paint is a race, and simulated throttling usually wins that race on the page's behalf — so the bug stays invisible until a slower real-world fetch loses it.

`scripts/cls-stress.mjs` removes the luck: it drives a real Chrome over CDP, delays every matching stylesheet response so it is guaranteed to land after the first paint, and reports the resulting CLS.

```bash
node scripts/cls-stress.mjs https://your-deployed-url            # desktop + mobile (the default)
node scripts/cls-stress.mjs http://localhost:8080 --delay=500    # a smaller delay
node scripts/cls-stress.mjs https://example.com --form-factor=mobile
```

- **Zero dependencies.** Uses Node 22+'s built-in `WebSocket` to speak CDP directly. Needs a local Chrome/Chromium — set `CHROME_PATH` if it is not in a standard location.
- **Exit code 1** when CLS exceeds the threshold (default 0.1) on any selected form factor, so it is safe to gate CI with.
- **Always run `both`** (the default). A mobile-only run passes on a page that is badly broken on desktop.

Validated on a page whose 41.6 KB layout stylesheet was loaded non-render-blocking:

| Scenario | Desktop CLS | Mobile CLS | Verdict |
| :--- | :--- | :--- | :--- |
| CSS delayed 1200 ms, stylesheet non-render-blocking | **1.0069** | **1.0268** | FAIL |
| CSS delayed 1200 ms, stylesheet render-blocking | 0 | 0 | PASS |

That same page scored desktop **76/100 on PSI** and **98/100 on the Lighthouse CLI** — the CLI pass is exactly the false negative this test exists to remove.
