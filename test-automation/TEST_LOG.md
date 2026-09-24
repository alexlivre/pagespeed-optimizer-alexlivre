# Test Execution Log

Coverage note: `verify-rules.mjs` is a static linter, so "line coverage" is not a meaningful
metric for it. Each run records the assertion count the gate actually printed, plus the
exit codes of the scripts involved.

---

## 2026-09 — Security hardening and gate validation

### Run 7: Security hardening, structured CLI execution and SECURITY.md
- **Commands**:
  - `node scripts/verify-rules.mjs ./demo-page`
  - `node --test test-automation/gate.test.mjs`
  - `uvx plugin-scanner scan . --format json`
- **Result**: PASSED
- **Gate assertions**: 20 passed, 0 failed
- **Regression tests**: 2 passed, 0 failed
- **HOL Security Scanner**: Score 100/100 (Grade A), 0 critical, 0 high, 0 medium, 0 low findings
- **Fixes**: Replaced string-interpolated child_process execution with validated URL and structured argument array (`spawnSync`), and published `SECURITY.md`.
- **Status**: [GATE CLEARED]

---

## 2026-09 — Gate hardening and the late-CSS CLS regression test

### Run 6: CSS-delivery rules and their regression tests
- **Commands**:
  - `node scripts/verify-rules.mjs ./demo-page`
  - `node --test test-automation/gate.test.mjs`
  - `node scripts/cls-stress.mjs <page with non-render-blocking CSS>`
  - `node scripts/cls-stress.mjs <same page with render-blocking CSS>`
- **Result**: PASSED
- **Gate assertions**: 20 passed, 0 failed on the reference demo; 17 passed, 3 failed on the
  deliberately broken fixture (the expected failures)
- **Regression tests**: 2 passed, 0 failed
- **cls-stress, broken page**: exit 1 — desktop CLS 1.0069, mobile CLS 1.0268
- **cls-stress, fixed page**: exit 0 — desktop CLS 0, mobile CLS 0
- **Also verified**: no valid Lighthouse report is discarded when the CLI exits non-zero, and
  report temp files land in the OS temp dir rather than the analyzed project
- **Status**: [GATE CLEARED]

Why this run exists: `verify-rules.mjs` had 17 assertions and none of them covered how the
stylesheet is delivered, which is how a page can score 98/100 on the Lighthouse CLI while
PageSpeed Insights reports CLS 1.014 and Performance 76/100 on the same URL.

---

## Date: 2026-09-19

### Run 5: Pre-commit Verification for README installation methods refinement
- **Command**: `node scripts/verify-rules.mjs ./demo-page`
- **Result**: PASSED
- **Assertions**: 17 passed, 0 failed
- **Status**: [GATE CLEARED] Ready for commit and push.

### Run 4: Pre-commit Verification for LICENSE, manual install fix & relative links
- **Command**: `node scripts/verify-rules.mjs ./demo-page`
- **Result**: PASSED
- **Assertions**: 17 passed, 0 failed
- **Status**: [GATE CLEARED] Ready for commit and push.

### Run 3: Pre-release Version 1.0.0 Verification
- **Command**: `node scripts/verify-rules.mjs ./demo-page`
- **Result**: PASSED
- **Assertions**: 17 passed, 0 failed
- **Status**: [GATE CLEARED] Ready for release v1.0.0.

### Run 2: Pre-commit Verification for README update
- **Command**: `node scripts/verify-rules.mjs ./demo-page`
- **Result**: PASSED
- **Assertions**: 17 passed, 0 failed
- **Status**: [GATE CLEARED] Ready for commit and push.

### Run 1: Initial Commit Verification
- **Command**: `node scripts/verify-rules.mjs ./demo-page`
- **Result**: PASSED
- **Assertions**: 17 passed, 0 failed
- **Status**: [GATE CLEARED] Ready for repository creation and initial commit.
