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

The **Lighthouse CLI** is the canonical validator for PageSpeed Insights scores. Treat `npx lighthouse <url> --view` as the final gate before declaring a page done — not as a step in every iteration. Local HTTP scoring caps at ~81/100 in Best Practices because of the `is-on-https` audit; always validate BP against an HTTPS URL (or with `--ignore-certificate-errors` against a local HTTPS dev server).

---

## 2. Lighthouse CLI (Local & CI)

```bash
# Install (requires Node 22.19+ for Lighthouse 13)
npm install -g lighthouse

# Run against a local or remote URL
lighthouse https://example.com/ --view

# Headless output as JSON
lighthouse https://example.com/ --output json --output-path ./lh.json --quiet

# Mobile preset, Slow 4G + 4x CPU throttle (the default)
lighthouse https://example.com/ --preset=desktop

# Run multiple times to smooth variance
lighthouse https://example.com/ --only-categories=performance --quiet --form-factor=mobile
```

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
        deviceScaleFactor: 2.625
      throttling:
        rttMs: 150
        throughputKbps: 1638.4
        cpuSlowdownMultiplier: 4
      chromeFlags: '--no-sandbox'
      preset: undefined    # ensure preset doesn't override formFactor
  assert:
      chromeFlags: '--no-sandbox'
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
      'render-blocking-insight':     ['error', { maxLength: 0 }]
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

# Via the CrUX API (free, no key)
curl "https://chromeuxreport.googleapis.com/v1/records:queryRecord?formFactor=PHONE&origin=example.com&key="
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

// 2. Validate JSON-LD and MCP manifests parse cleanly
document.querySelectorAll?.('script[type="application/ld+json"]').forEach(s => JSON.parse(s.textContent));
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

1. **Testing only desktop**: Mobile is 2-3× worse and is what Google primarily uses. Always run mobile-throttled runs.
2. **One-shot PSI scores**: A single run has ±5 point variance. Use `--quiet --numberOfRuns=3` in CI.
3. **Lab passing ≠ field passing**: A 100 lab score can coexist with field INP of 400ms because the lab does not exercise the long interactions users trigger.
4. **Ignoring 3rd-party scripts**: Analytics, chat widgets, and ad scripts add hundreds of milliseconds of TBT that lab scores do not always capture. Audit them quarterly.
5. **Not testing on slow devices**: 4× CPU throttle in DevTools approximates a mid-range Android. Use it for any user-facing change.
