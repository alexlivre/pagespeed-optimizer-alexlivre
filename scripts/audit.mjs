#!/usr/bin/env node

/**
 * Dual Lighthouse Runner (Mobile & Desktop) — a real gate, not just a printer
 * Part of pagespeed-optimizer-alexlivre — https://alexlivre.dev/
 *
 * Runs Lighthouse for both form factors and evaluates score/metric thresholds,
 * exiting non-zero when any of them fails.
 *
 * Usage:
 *   node scripts/audit.mjs <url> [options]
 *
 * Options:
 *   --form-factor=<f>          both | mobile | desktop          (default: both)
 *   --min-performance=<n>      minimum Performance score        (default: 90)
 *   --min-accessibility=<n>    minimum Accessibility score      (default: 100)
 *   --min-best-practices=<n>   minimum Best Practices score     (default: 100)
 *   --min-seo=<n>              minimum SEO score                (default: 100)
 *   --max-cls=<n>              maximum CLS                      (default: 0.1)
 *   --keep-reports             keep the JSON reports in the OS temp dir
 *   --help, -h                 show this help
 *
 * Implementation notes:
 *   - Reports go to the OS temp directory, never into the analyzed project.
 *   - A non-zero exit from the Lighthouse CLI does NOT invalidate the report. On Windows
 *     chrome-launcher can throw EPERM while deleting its own temp dir *after* the audit
 *     finished; the JSON on disk is valid. We trust the file, not the exit code.
 *   - Simulated throttling cannot reproduce a late stylesheet, so a passing CLS here is not
 *     proof. Pair this with scripts/cls-stress.mjs.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MIN_NODE_MAJOR = 22;
const MIN_NODE_MINOR = 19;

const argv = process.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
  console.log(`
\x1b[36m========================================================\x1b[0m
\x1b[1m Dual Lighthouse Runner (pagespeed-optimizer-alexlivre)\x1b[0m
\x1b[36m========================================================\x1b[0m

Usage:
  node scripts/audit.mjs <url> [options]

Options:
  --form-factor=<f>         both | mobile | desktop          (default: both)
  --min-performance=<n>     minimum Performance score         (default: 90)
  --min-accessibility=<n>   minimum Accessibility score       (default: 100)
  --min-best-practices=<n>  minimum Best Practices score      (default: 100)
  --min-seo=<n>             minimum SEO score                 (default: 100)
  --max-cls=<n>             maximum CLS                       (default: 0.1)
  --keep-reports            keep the JSON reports in the OS temp dir
  --help, -h                show this help

Exit code 1 when any threshold fails, so this is safe to gate CI with.
Simulated throttling cannot see a late stylesheet — pair it with cls-stress.mjs.
`);
  process.exit(0);
}

const targetUrl = argv.find((a) => !a.startsWith('--'));
if (!targetUrl) {
  console.error('Missing <url>. Run with --help for usage.');
  process.exit(1);
}

const rawValue = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const numeric = (name, fallback, label) => {
  const parsed = Number(rawValue(name, fallback));
  if (!Number.isFinite(parsed)) {
    console.error(`Invalid --${name} value. Expected a number, got "${rawValue(name, fallback)}".`);
    process.exit(1);
  }
  return parsed;
};

const FORM_FACTOR = rawValue('form-factor', 'both');
const KEEP_REPORTS = argv.includes('--keep-reports');

/** Keyed by the same names extract() returns, so thresholds map 1:1 onto metrics. */
const THRESHOLDS = {
  performance: numeric('min-performance', '90'),
  accessibility: numeric('min-accessibility', '100'),
  bestPractices: numeric('min-best-practices', '100'),
  seo: numeric('min-seo', '100'),
};
const MAX_CLS = numeric('max-cls', '0.1');

const CATEGORY_LABEL = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  bestPractices: 'Best Practices',
  seo: 'SEO',
};

if (!['both', 'mobile', 'desktop'].includes(FORM_FACTOR)) {
  console.error(`Invalid --form-factor "${FORM_FACTOR}". Use both, mobile or desktop.`);
  process.exit(1);
}

function requireNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < MIN_NODE_MAJOR || (major === MIN_NODE_MAJOR && minor < MIN_NODE_MINOR)) {
    console.error(
      `\x1b[31m[FAIL]\x1b[0m Node.js ${process.versions.node} detected. Lighthouse 13 requires ` +
      `Node >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}.0.`
    );
    process.exit(1);
  }
}

function runAudit(formFactor) {
  const stamp = `${formFactor}-${Date.now()}-${process.pid}`;
  const reportPath = path.join(os.tmpdir(), `lh-${stamp}.json`);
  const profileDir = path.join(os.tmpdir(), `lh-profile-${stamp}`);
  const chromeFlags = `--headless=new --no-sandbox --user-data-dir=${profileDir}`;
  const preset = formFactor === 'desktop' ? '--preset=desktop' : '';

  // A dedicated --user-data-dir avoids the temp-profile collision that makes chrome-launcher
  // throw EPERM on Windows during cleanup.
  const cmd = `npx lighthouse "${targetUrl}" --output=json --output-path="${reportPath}" --quiet --chrome-flags="${chromeFlags}" ${preset}`;

  console.log(`Running Lighthouse [${formFactor.toUpperCase()}] against ${targetUrl}...`);

  let cliError = null;
  try {
    execSync(cmd, { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (err) {
    const stderr = (err.stderr || '').toString().trim();
    cliError = stderr.split('\n').filter(Boolean).slice(-2).join(' | ') || err.message;
  }

  // Trust the report file, not the exit code.
  let report = null;
  if (fs.existsSync(reportPath)) {
    try {
      report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      if (!KEEP_REPORTS) fs.unlinkSync(reportPath);
    } catch (parseError) {
      cliError = `${cliError ?? ''} report unreadable: ${parseError.message}`.trim();
    }
  }

  try {
    fs.rmSync(profileDir, { recursive: true, force: true });
  } catch {
    /* Windows may hold the profile briefly; the OS cleans temp eventually */
  }

  return { report, cliError, reportPath: KEEP_REPORTS ? reportPath : null };
}

function extract(report) {
  if (!report?.categories) return null;
  const { categories, audits } = report;
  const score = (key) => categories[key]?.score ?? null;
  const agentic = categories['agentic-browsing'];

  return {
    performance: score('performance'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),
    seo: score('seo'),
    // Lighthouse 13.3+ only; older CLI builds omit the category entirely.
    agenticBrowsing: agentic ? agentic.score : null,
    fcp: audits['first-contentful-paint']?.displayValue ?? 'N/A',
    lcp: audits['largest-contentful-paint']?.displayValue ?? 'N/A',
    tbt: audits['total-blocking-time']?.displayValue ?? 'N/A',
    cls: audits['cumulative-layout-shift']?.displayValue ?? 'N/A',
    clsNumeric: audits['cumulative-layout-shift']?.numericValue ?? null,
    si: audits['speed-index']?.displayValue ?? 'N/A',
  };
}

const toPercent = (score) => (score === null ? null : Math.round(score * 100));

function scoreCell(value, minimum) {
  if (value === null) return '\x1b[31m  n/a\x1b[0m  ';
  const code = value >= minimum ? '32' : '31';
  return `\x1b[${code}m${String(value).padStart(3)}/100\x1b[0m`;
}

requireNodeVersion();

const formFactors = FORM_FACTOR === 'both' ? ['mobile', 'desktop'] : [FORM_FACTOR];
const results = new Map();
const failures = [];

for (const formFactor of formFactors) {
  const { report, cliError, reportPath } = runAudit(formFactor);
  const metrics = extract(report);

  if (!metrics) {
    failures.push(`${formFactor}: no usable Lighthouse report${cliError ? ` — ${cliError}` : ''}`);
    results.set(formFactor, { metrics: null });
    continue;
  }

  // Only worth surfacing once we know the report itself is sound.
  if (cliError) {
    console.log(`\x1b[33m[NOTE]\x1b[0m ${formFactor}: the CLI exited non-zero after a valid run — ${cliError}`);
  }
  if (reportPath) {
    console.log(`  report kept at ${reportPath}`);
  }

  for (const [metric, minimum] of Object.entries(THRESHOLDS)) {
    const value = toPercent(metrics[metric]);
    if (value === null) {
      failures.push(`${formFactor}: ${CATEGORY_LABEL[metric]} score missing`);
    } else if (value < minimum) {
      failures.push(`${formFactor}: ${CATEGORY_LABEL[metric]} ${value}/100 (minimum ${minimum})`);
    }
  }

  if (metrics.clsNumeric !== null && metrics.clsNumeric > MAX_CLS) {
    failures.push(`${formFactor}: CLS ${metrics.cls} (maximum ${MAX_CLS})`);
  }

  results.set(formFactor, { metrics });
}

const metricsFor = (formFactor) => results.get(formFactor)?.metrics ?? null;
const hasBoth = Boolean(metricsFor('mobile') && metricsFor('desktop'));

console.log('\n========================================================');
console.log(` Lighthouse 13+ Scorecard: ${targetUrl}`);
console.log('========================================================');

if (hasBoth) {
  const columns = ['mobile', 'desktop'];
  console.log(' Category          | Mobile (Primary Ranking) | Desktop');
  console.log('-------------------|--------------------------|---------');
  for (const metric of Object.keys(THRESHOLDS)) {
    const cells = columns.map((formFactor) => {
      const value = toPercent(metricsFor(formFactor)[metric]);
      return scoreCell(value, THRESHOLDS[metric]);
    });
    console.log(` ${CATEGORY_LABEL[metric].padEnd(17)} | ${cells[0]}                  | ${cells[1]}`);
  }
  console.log('-------------------|--------------------------|---------');

  const rows = [
    ['FCP', 'fcp'],
    ['LCP', 'lcp'],
    ['TBT (INP proxy)', 'tbt'],
    ['CLS', 'cls'],
    ['Speed Index', 'si'],
  ];
  for (const [label, key] of rows) {
    const mobileValue = String(metricsFor('mobile')[key]);
    console.log(` ${label.padEnd(17)} | ${mobileValue.padEnd(24)} | ${metricsFor('desktop')[key]}`);
  }

  const mobileAgentic = metricsFor('mobile').agenticBrowsing;
  const desktopAgentic = metricsFor('desktop').agenticBrowsing;
  if (mobileAgentic === null && desktopAgentic === null) {
    console.log(' Agentic Browsing  | not reported by this Lighthouse build (13.3+ / PSI only)');
  } else {
    const show = (score) => (score === null ? 'n/a' : `${score}/3`);
    console.log(` Agentic Browsing  | ${show(mobileAgentic).padEnd(24)} | ${show(desktopAgentic)}`);
  }
} else {
  for (const formFactor of formFactors) {
    const metrics = metricsFor(formFactor);
    if (!metrics) continue;
    console.log(` ${formFactor.toUpperCase()}`);
    console.log('--------------------------------------------------------');
    for (const metric of Object.keys(THRESHOLDS)) {
      console.log(` ${CATEGORY_LABEL[metric].padEnd(15)}: ${scoreCell(toPercent(metrics[metric]), THRESHOLDS[metric])}`);
    }
    console.log('--------------------------------------------------------');
    console.log(` FCP: ${metrics.fcp} | LCP: ${metrics.lcp} | TBT: ${metrics.tbt} | CLS: ${metrics.cls} | SI: ${metrics.si}`);
    console.log(` Agentic Browsing: ${metrics.agenticBrowsing === null ? 'not reported by this build' : `${metrics.agenticBrowsing}/3`}`);
  }
}

console.log('========================================================');

if (targetUrl.startsWith('http://')) {
  console.log('\x1b[36m[Note]\x1b[0m Target is HTTP — Best Practices caps at ~81/100 because of `is-on-https`.');
  console.log('        Validate Best Practices against an HTTPS URL.\n');
}

if (failures.length > 0) {
  console.error(`\x1b[31m[GATE FAILED]\x1b[0m ${failures.length} threshold(s) missed:`);
  for (const failure of failures) console.error(`  • ${failure}`);
  console.error('\nReminder: simulated throttling cannot see a late stylesheet.');
  console.error('Run `node scripts/cls-stress.mjs <url>` before concluding.\n');
  process.exit(1);
}

console.log(`\x1b[32m[GATE CLEARED]\x1b[0m All thresholds met on ${formFactors.join(' and ')}.\n`);
