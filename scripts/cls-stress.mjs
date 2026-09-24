#!/usr/bin/env node

/**
 * Late-CSS CLS Stress Test (zero dependencies)
 * Part of pagespeed-optimizer-alexlivre — https://alexlivre.dev/
 *
 * Why this exists
 * ---------------
 * Lighthouse's *simulated* throttling does not reproduce a stylesheet that lands after the
 * first paint. Measured on the same production URL: Lighthouse CLI reported CLS 0.003 while
 * PageSpeed Insights reported 1.014. The CLI passed; PSI failed. A lab CLS pass is not proof.
 *
 * This script deliberately delays the stylesheet so it arrives after the first paint and
 * measures the resulting layout shift in a real browser over raw CDP.
 *
 * It always runs BOTH form factors unless told otherwise, because the two are not equally
 * sensitive: a page that breaks desktop at ~200ms of CSS lateness can still pass on mobile
 * at ~500ms. Running only mobile hides the bug.
 *
 * Usage
 * -----
 *   node scripts/cls-stress.mjs <url> [--delay=1200] [--threshold=0.1] [--form-factor=both]
 *   node scripts/cls-stress.mjs http://localhost:8080
 *   node scripts/cls-stress.mjs https://example.com --form-factor=mobile
 *
 * Requires Node 22+ (uses the built-in WebSocket) and a local Chrome/Chromium.
 * Set CHROME_PATH if it lives somewhere unusual.
 *
 * Exit codes: 0 = passed on every selected form factor, 1 = at least one failed.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
  console.log(`
\x1b[36m========================================================\x1b[0m
\x1b[1m Late-CSS CLS Stress Test (pagespeed-optimizer-alexlivre)\x1b[0m
\x1b[36m========================================================\x1b[0m

Usage:
  node scripts/cls-stress.mjs <url> [options]

Options:
  --delay=<ms>          How late the stylesheet arrives (default: 1200)
  --threshold=<value>   CLS ceiling before it counts as a failure (default: 0.1)
  --form-factor=<f>     desktop | mobile | both (default: both)
  --match=<pattern>     CDP URL pattern for the stylesheet (default: *.css*)
  --help, -h            Show this help

Notes:
  - Simulated Lighthouse throttling cannot see this bug. That is the whole point.
  - \`both\` is the default because desktop breaks at a much smaller CSS delay than mobile.
  - Set CHROME_PATH=/path/to/chrome if Chrome is not found automatically.
`);
  process.exit(0);
}

const url = argv.find((a) => !a.startsWith('--'));
if (!url) {
  console.error('Missing <url>. Run with --help for usage.');
  process.exit(1);
}

const value = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const DELAY_MS = Number(value('delay', '1200'));
const THRESHOLD = Number(value('threshold', '0.1'));
const MATCH = value('match', '*.css*');
const FORM_FACTOR = value('form-factor', 'both');

if (!['desktop', 'mobile', 'both'].includes(FORM_FACTOR)) {
  console.error(`Invalid --form-factor "${FORM_FACTOR}". Use desktop, mobile or both.`);
  process.exit(1);
}

/**
 * Matches Lighthouse's own defaults so the CLS measured here is the CLS PSI would see.
 * Mobile is MOTOGPOWER_EMULATION_METRICS (412x823 @1.75) and desktop is 1350x940 @1 — see
 * lighthouse/core/config/constants.js. The DPR matters for the responsive-image advice even
 * though it does not change layout-shift fractions.
 */
const FORM_FACTORS = {
  desktop: { label: 'Desktop 1350x940 @1x', metrics: { width: 1350, height: 940, deviceScaleFactor: 1, mobile: false } },
  mobile: {
    label: 'Mobile 412x823 @1.75x',
    metrics: { width: 412, height: 823, deviceScaleFactor: 1.75, mobile: true },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
  },
};

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

function findChrome() {
  const found = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error('Chrome/Chromium not found. Set CHROME_PATH to the browser binary.');
  }
  return found;
}

/** Minimal CDP client over Node's built-in WebSocket. */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.onmessage = (event) => this.#dispatch(JSON.parse(event.data));
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error(`Cannot reach the DevTools endpoint at ${wsUrl}`));
    });
    return new Cdp(ws);
  }

  #dispatch(message) {
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
      return;
    }
    if (message.method) {
      for (const listener of this.listeners) listener(message);
    }
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  on(listener) {
    this.listeners.push(listener);
  }

  close() {
    try {
      this.ws.close();
    } catch {
      /* already closed */
    }
  }
}

/** Accumulates CLS in the page before any document script runs. */
const CLS_OBSERVER = `
window.__cls = 0;
window.__shifts = [];
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      window.__cls += entry.value;
      window.__shifts.push(entry.value);
    }
  }
}).observe({ type: 'layout-shift', buffered: true });
`;

async function measure(formFactorKey) {
  const formFactor = FORM_FACTORS[formFactorKey];
  const chromePath = findChrome();
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cls-stress-'));

  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', '--mute-audio',
    `--user-data-dir=${profileDir}`, '--remote-debugging-port=0', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let stderrBuffer = '';
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for the DevTools endpoint')), 25000);
    chrome.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
      const match = stderrBuffer.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    chrome.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited early (${code})\n${stderrBuffer}`));
    });
  });

  const cdp = await Cdp.connect(endpoint);
  let lateRequests = 0;

  cdp.on((message) => {
    if (message.method !== 'Fetch.requestPaused') return;
    lateRequests++;
    const { sessionId } = message;
    const { requestId } = message.params;
    const proceed = () => cdp.send('Fetch.continueRequest', { requestId }, sessionId).catch(() => {});
    if (DELAY_MS > 0) setTimeout(proceed, DELAY_MS);
    else proceed();
  });

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: CLS_OBSERVER }, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', formFactor.metrics, sessionId);
  if (formFactor.userAgent) {
    await cdp.send('Emulation.setUserAgentOverride', { userAgent: formFactor.userAgent, platform: 'Android' }, sessionId);
  }
  await cdp.send('Network.enable', {}, sessionId);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: MATCH, requestStage: 'Request' }] }, sessionId);

  const loadFired = new Promise((resolve) => {
    cdp.on((message) => {
      if (message.method === 'Page.loadEventFired') resolve();
    });
  });

  await cdp.send('Page.navigate', { url }, sessionId);
  await Promise.race([loadFired, new Promise((resolve) => setTimeout(resolve, 45000))]);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const { result } = await cdp.send('Runtime.evaluate', {
    expression: `({
      cls: Number(window.__cls.toFixed(4)),
      shiftCount: window.__shifts.length,
      fcpMs: Math.round((performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0)
    })`,
    returnByValue: true,
  }, sessionId);

  cdp.close();
  chrome.kill();
  try {
    fs.rmSync(profileDir, { recursive: true, force: true });
  } catch {
    /* Windows can keep a handle on the profile briefly; the OS cleans temp eventually */
  }

  const metrics = result.value;
  return {
    formFactor: formFactorKey,
    label: formFactor.label,
    cssDelayMs: DELAY_MS,
    delayedRequests: lateRequests,
    ...metrics,
    verdict: metrics.cls > THRESHOLD ? 'FAIL' : 'PASS',
  };
}

const selected = FORM_FACTOR === 'both' ? ['desktop', 'mobile'] : [FORM_FACTOR];

console.log('\n========================================================');
console.log(' Late-CSS CLS Stress Test');
console.log('========================================================');
console.log(` Target     : ${url}`);
console.log(` CSS delay  : ${DELAY_MS} ms (after the first paint is the point)`);
console.log(` Threshold  : CLS > ${THRESHOLD} fails`);
console.log('--------------------------------------------------------');

const results = [];
let crashed = false;

for (const formFactor of selected) {
  try {
    results.push(await measure(formFactor));
  } catch (err) {
    crashed = true;
    console.error(`\x1b[31m✗ ${formFactor} run errored:\x1b[0m ${err.message}`);
  }
}

for (const result of results) {
  const colour = result.verdict === 'PASS' ? '32' : '31';
  console.log(
    ` ${result.label.padEnd(24)} CLS \x1b[${colour}m${String(result.cls).padStart(7)}\x1b[0m  ` +
    `\x1b[${colour}m${result.verdict}\x1b[0m  (shifts: ${result.shiftCount}, FCP: ${result.fcpMs}ms)`
  );
}

const failed = results.filter((result) => result.verdict === 'FAIL');
console.log('========================================================');

if (failed.length > 0) {
  console.error(`\x1b[31m[FAIL]\x1b[0m Late-CSS layout shift on: ${failed.map((r) => r.formFactor).join(', ')}.`);
  console.error('A stylesheet is arriving after the first paint. Make the CSS that carries layout render-blocking,');
  console.error('or inline the critical CSS and opt out explicitly in verify-rules.mjs.\n');
} else if (results.length === 0) {
  console.error('\x1b[31m[FAIL]\x1b[0m No run completed.\n');
} else {
  console.log(`\x1b[32m[PASS]\x1b[0m No late-CSS layout shift on ${results.map((r) => r.formFactor).join(' or ')}.\n`);
}

process.exit(failed.length > 0 || crashed || results.length === 0 ? 1 : 0);
