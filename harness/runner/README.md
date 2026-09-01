<!--
---
title: "Playwright Runner"
description: "Chromium-only Playwright configuration and the registry-driven conformance runner"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-01"
version: "2.7"
status: "Active"
tags:
  - type: directory-readme
  - domain: harness
  - tech: [javascript, playwright, node]
related_documents:
  - "[Conformance Harness](../README.md)"
  - "[Scenario Registry](../registry/README.md)"
---
-->

# Playwright Runner

The runner imports the scenario registry, drives each declared interaction, and
takes a capture at each declared checkpoint. It reads the **same** registry the
reference application renders from, so no scenario is described twice. A change
to a scenario's theme coverage in the registry changes both the rendered page and
the runner's executed matrix.

Chromium only. ML01 cannot run Firefox or WebKit (charter §4.1, spec-02
Execution Environment), so no project is configured for a browser the host cannot
run, and goldens are single-browser, single-platform. Cross-browser pixel goldens
are out of scope.

---

## 1. Contents

```text
runner/
├── playwright.config.js  # Chromium-only config; serves the reference app locally
├── playwright.js         # Filterable comparison wrapper with output containment
├── output-safety.js      # Shared CLI, reporter-output, and symlink path guards
├── cases.js              # Viewport-qualified case identity and interaction lookup
├── runner.spec.js        # Registry-driven capture and comparison
├── interactions.js       # Serializable toggle and meter state changes
├── compare.js            # Recorded-baseline integrity, comparison, and establishment
├── baseline-reporter.js  # In-memory pipe staging and guarded finalization
├── capture.js            # Canonical complete capture process wrapper
├── amendment4-evidence.js # Pure historical PNG evidence comparison
├── capture-amendment4.js # Styled capture from an isolated revision
├── compare-amendment4.js # Historical pair report and hard gate
├── check-auditor-page.js # Visible dependency-auditor browser check
├── smoke-assertions.js  # Pure per-view smoke assertion verdicts
├── smoke-published.js   # Published-URL registry-walk smoke test
├── membership.js         # Browser inspection and pure coverage accounting
├── membership.json       # Generated current-run membership evidence
├── playwright-run.json   # Generated current-run identity and start time
└── README.md             # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [playwright.config.js](playwright.config.js) | Chromium project, local file server, output reporters, and baseline staging reporter | Active |
| [playwright.js](playwright.js) | Runs ordinary filtered comparisons through the fixed config after validating output routing | Active |
| [output-safety.js](output-safety.js) | Rejects output symlinks, then checks lexical and resolved relationships away from goldens | Active |
| [cases.js](cases.js) | Builds scenario by theme by viewport by checkpoint cases and capture identities | Active |
| [runner.spec.js](runner.spec.js) | Navigates each scenario's section view, sets each declared viewport, drives interactions, captures checkpoints, and records absent baselines | Active |
| [interactions.js](interactions.js) | Applies synchronous toggle and meter changes in browser and unit tests | Active |
| [compare.js](compare.js) | Baseline-manifest integrity, pixel comparison with surfaced diffs, and establishment | Active |
| [baseline-reporter.js](baseline-reporter.js) | Holds unrecorded captures in memory, stages through an inherited pipe, and parses guarded in-memory finalization state | Active |
| [capture.js](capture.js) | Runs fixed Playwright and metrics, drains and authenticates pipe staging, then finalizes | Active |
| [amendment4-evidence.js](amendment4-evidence.js) | Computes SHA-256 and exact pixel differences for historical evidence | Active |
| [capture-amendment4.js](capture-amendment4.js) | Serves and captures one isolated revision after a stylesheet guard | Active |
| [compare-amendment4.js](compare-amendment4.js) | Rejects identical or zero-difference historical capture pairs | Active |
| [check-auditor-page.js](check-auditor-page.js) | Confirms dependency findings are visible and fails on any rendered violation | Active |
| [smoke-assertions.js](smoke-assertions.js) | Builds separately reported per-view smoke verdicts | Active |
| [smoke-published.js](smoke-published.js) | Walks the published URL across the landing and every section view | Active |
| [membership.js](membership.js) | Inspects computed rendered channels and aggregates designed-pair membership | Active |

Each capture identity is
`<scenario-id>/<theme>/<viewport>/<checkpoint>.png`. The generated matrix records
the same viewport-qualified identity. A missing interaction named by a
checkpoint is an error rather than a skipped action.

The Playwright config is selected explicitly by the npm scripts. It starts the
local reference server and writes a JSON result to the spec evidence directory.
Before any test runs, the runner writes a unique run identity. The membership
report carries that identity so metrics cannot consume output from an older run.
Unrecorded captures and their comparison results travel to the baseline
reporter as in-memory attachments. Only `npm run capture` creates the inherited
pipe and drains it concurrently while Playwright runs, preventing pipe-buffer
deadlock while keeping candidate bytes in memory end-to-end. The pipe is capped
at 64 MiB (the current 165 PNG corpus is 5,817,646 bytes and 7,757,072 bytes
when each PNG is base64-encoded separately); a representative complete
transaction is 7,796,596 bytes, leaving 59,312,268 bytes of headroom. Overflow
terminates collection and cannot approve. The reporter
rejects regular-file and directory descriptors. It can stage through a pipe but
cannot approve; a caller-supplied pipe may therefore receive ephemeral staging
from that caller's own run without gaining finalization authority. The
fixed-argument wrapper waits for the complete Playwright process, parses and
authenticates the collected bytes, and runs metrics before it finalizes. No
fallible output or cleanup follows an approved write. Direct
`npm run playwright`, file, or `--grep` runs never establish a baseline. A
failed canonical run writes no approved baseline. `npm run playwright` routes
through `playwright.js`, which keeps the public config and reporter chain fixed.
It rejects config and reporter overrides and rejects `--output` or
`--last-failed-file` targets that are equal to, inside, or above protected
goldens in either lexical absolute-path space or nearest-existing-ancestor
resolved space. Both comparisons are required: a symlink lexically inside
goldens may point outside, while a symlink outside may resolve inside. The
shared guard uses `lstat` on each existing path component and rejects every
output path containing a symlink, including dangling final links and dangling
parents; Playwright output links are unsupported even when their target is
otherwise external. Link-free paths then receive both relationship checks. The
public config repeats output checks before reporter creation. Playwright 1.62
built-in JSON, JUnit, Blob, HTML, and last-run output environment paths receive
the same checks. Its internal `PW_TEST_REPORTER` variable appends a built-in or
arbitrary loaded reporter after the configured chain, so ordinary comparison
and public-config entry points reject it and canonical capture strips it with
all native output variables before spawning Playwright. The audited
`PW_TEST_DEBUG_REPORTERS` variable changes reporter diagnostics only; it does
not add or replace reporters. Safe link-free external evidence targets remain available.
These guards cover the repository npm commands and public config, not an
operator's unrelated arbitrary shell commands. Manifest publication writes a
complete same-directory temporary file and uses atomic rename as its final
fallible operation. A write or rename interruption preserves the old manifest;
any matching orphan PNG recovers its entry without rewriting the PNG on the next
complete green run. Candidate identities reject slash and backslash escapes,
their resolved approved paths must remain beneath the approved root, and no
existing path ancestor may be a symlink. New PNGs are fully staged to verified
non-raster temps beside the manifest, outside `approved/`, and installed without
overwrite by atomic hard link before manifest publication. A real interruption
can leave that temporary hard link beside the manifest. Matching-orphan
recovery removes it before publication only after verifying both inode identity
and candidate hash. The public configured JSON reporter passes both an
explicit target and its configured fallback/default through the same link and
protected-relationship guard before creating a directory or reporter. An
unsafe explicit target may use only a separately validated fallback; an unsafe
fallback fails config load without recursively selecting itself.

The capture loop performs membership inspection after the checkpoint's
interactions and immediately before its screenshot. The same loop records one
sample for every matrix case, and the generated report fails if its sample
count differs from the matrix count. The browser calls `getComputedStyle` for
text, placeholder text, each painted border side, effective painted
backgrounds, and focus outlines. Every result is a designed pairing, a named
failure, or one of the report's counted exclusion reasons. No second traversal
can drift away from the photographed states.

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Conformance Harness](../README.md) | Parent directory |
| [Scenario Registry](../registry/README.md) | The single declaration the runner reads |
| [Golden Captures](../goldens/README.md) | Recorded baseline and candidate capture trees |
