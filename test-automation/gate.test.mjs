/**
 * Regression tests for the deterministic gate.
 *
 * Why this exists: the CSS-delivery class of bug is invisible to Lighthouse's simulated
 * throttling (a lab CLS pass is not proof), so the static gate is the only cheap defence.
 * A gate nobody tests drifts into always-green. These two tests pin both directions:
 * the reference demo must clear it, and a known-bad page must fail it loudly.
 *
 *   node --test test-automation/
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const GATE = path.join(ROOT, 'scripts', 'verify-rules.mjs');
const FIXTURE = path.join(HERE, 'fixtures', 'broken-css-delivery.html.fixture');

function runGate(target) {
  try {
    const stdout = execFileSync(process.execPath, [GATE, target], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, output: stdout };
  } catch (err) {
    return { code: err.status ?? 1, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

test('the reference demo clears the gate', () => {
  const { code, output } = runGate(path.join(ROOT, 'demo-page'));
  assert.equal(code, 0, `expected demo-page to pass, got exit ${code}\n${output}`);
  assert.match(output, /0 Failed/);
});

test('the gate fails a page that ships any of the three CSS/image layout traps', () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-fixture-'));
  fs.copyFileSync(FIXTURE, path.join(scratch, 'index.html'));

  try {
    const { code, output } = runGate(scratch);
    assert.equal(code, 1, 'a page with a non-render-blocking stylesheet must fail the gate');
    assert.match(output, /non-render-blocking stylesheet/i);
    assert.match(output, /content-visibility:auto without contain-intrinsic-size/i);
    assert.match(output, /width-descriptor srcset but no sizes/i);
    assert.match(output, /3 Failed/);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
