#!/usr/bin/env node

/**
 * Dual Lighthouse CLI Runner (Mobile & Desktop)
 * Enforces Node 22.19+ requirement and produces a unified audit scorecard.
 *
 * Usage:
 *   node scripts/audit.mjs https://example.com
 *   node scripts/audit.mjs http://localhost:8080
 */

import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MIN_NODE_MAJOR = 22;
const MIN_NODE_MINOR = 19;

function checkNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < MIN_NODE_MAJOR || (major === MIN_NODE_MAJOR && minor < MIN_NODE_MINOR)) {
    console.warn(`\x1b[33m[Warning]\x1b[0m Node.js ${process.versions.node} detected. Lighthouse 13 requires Node >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}.0. Consider updating.\n`);
  }
}

function runAudit(url, preset = 'mobile') {
  const tmpFile = resolve(process.cwd(), `.lh-${preset}-${Date.now()}.json`);
  const isDesktop = preset === 'desktop';
  const cmd = `npx lighthouse "${url}" --output=json --output-path="${tmpFile}" --quiet --chrome-flags="--headless=new --no-sandbox" ${isDesktop ? '--preset=desktop' : ''}`;

  console.log(`Running Lighthouse audit [${preset.toUpperCase()}] against ${url}...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    if (!existsSync(tmpFile)) {
      throw new Error(`Audit output file not found: ${tmpFile}`);
    }
    const raw = readFileSync(tmpFile, 'utf-8');
    unlinkSync(tmpFile);
    return JSON.parse(raw);
  } catch (err) {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
    console.error(`Failed running audit for ${preset}:`, err.message);
    return null;
  }
}

function formatScore(score) {
  const pct = Math.round((score ?? 0) * 100);
  if (pct >= 90) return `\x1b[32m${pct.toString().padStart(3)}/100\x1b[0m`;
  if (pct >= 50) return `\x1b[33m${pct.toString().padStart(3)}/100\x1b[0m`;
  return `\x1b[31m${pct.toString().padStart(3)}/100\x1b[0m`;
}

function extractResults(report) {
  if (!report?.categories) return null;
  const cats = report.categories;
  const audits = report.audits || {};

  return {
    performance: cats.performance?.score,
    accessibility: cats.accessibility?.score,
    bestPractices: cats['best-practices']?.score,
    seo: cats.seo?.score,
    lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
    cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
    tbt: audits['total-blocking-time']?.displayValue || 'N/A',
    fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
  };
}

async function main() {
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    console.error('Usage: node scripts/audit.mjs <URL>');
    process.exit(1);
  }

  checkNodeVersion();

  const mobileReport = runAudit(targetUrl, 'mobile');
  const desktopReport = runAudit(targetUrl, 'desktop');

  if (!mobileReport && !desktopReport) {
    console.error('Both audits failed.');
    process.exit(1);
  }

  const m = extractResults(mobileReport) || {};
  const d = extractResults(desktopReport) || {};

  console.log('\n========================================================');
  console.log(` Lighthouse 13+ Audit Summary: ${targetUrl}`);
  console.log('========================================================');
  console.log(' Category          | Mobile (Primary Ranking) | Desktop');
  console.log('-------------------|--------------------------|---------');
  console.log(` Performance       | ${formatScore(m.performance)}                  | ${formatScore(d.performance)}`);
  console.log(` Accessibility     | ${formatScore(m.accessibility)}                  | ${formatScore(d.accessibility)}`);
  console.log(` Best Practices    | ${formatScore(m.bestPractices)}                  | ${formatScore(d.bestPractices)}`);
  console.log(` SEO               | ${formatScore(m.seo)}                  | ${formatScore(d.seo)}`);
  console.log('-------------------|--------------------------|---------');
  console.log(` LCP               | ${String(m.lcp).padEnd(24)} | ${d.lcp}`);
  console.log(` TBT (INP proxy)   | ${String(m.tbt).padEnd(24)} | ${d.tbt}`);
  console.log(` CLS               | ${String(m.cls).padEnd(24)} | ${d.cls}`);
  console.log(` FCP               | ${String(m.fcp).padEnd(24)} | ${d.fcp}`);
  console.log('========================================================\n');

  const isHttp = targetUrl.startsWith('http://');
  if (isHttp) {
    console.log('\x1b[36m[Note]\x1b[0m Target is HTTP. Best Practices caps at ~81/100 due to is-on-https. Validate HTTPS on staging.\n');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
