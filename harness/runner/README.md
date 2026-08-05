<!--
---
title: "Playwright Runner"
description: "Chromium-only Playwright configuration and the registry-driven conformance runner"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-05"
version: "1.4"
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
├── cases.js              # Viewport-qualified case identity and interaction lookup
├── runner.spec.js        # Registry-driven capture and comparison
├── interactions.js       # Serializable toggle and meter state changes
├── compare.js            # Manifest integrity and pixel comparator
├── amendment4-evidence.js # Pure historical PNG evidence comparison
├── capture-amendment4.js # Styled capture from an isolated revision
├── compare-amendment4.js # Historical pair report and hard gate
├── membership.js         # Browser inspection and pure coverage accounting
├── membership.json       # Generated current-run membership evidence
├── playwright-run.json   # Generated current-run identity and start time
└── README.md             # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [playwright.config.js](playwright.config.js) | Chromium project, local file server, and list plus JSON reporters | Active |
| [cases.js](cases.js) | Builds scenario by theme by viewport by checkpoint cases and capture identities | Active |
| [runner.spec.js](runner.spec.js) | Sets each declared viewport, drives interactions, and captures checkpoints | Active |
| [interactions.js](interactions.js) | Applies synchronous toggle and meter changes in browser and unit tests | Active |
| [compare.js](compare.js) | Approval-manifest integrity and approved/candidate pixel comparison | Active |
| [amendment4-evidence.js](amendment4-evidence.js) | Computes SHA-256 and exact pixel differences for historical evidence | Active |
| [capture-amendment4.js](capture-amendment4.js) | Serves and captures one isolated revision after a stylesheet guard | Active |
| [compare-amendment4.js](compare-amendment4.js) | Rejects identical or zero-difference historical capture pairs | Active |
| [membership.js](membership.js) | Inspects computed rendered channels and aggregates designed-pair membership | Active |

Each capture identity is
`<scenario-id>/<theme>/<viewport>/<checkpoint>.png`. The generated matrix records
the same viewport-qualified identity. A missing interaction named by a
checkpoint is an error rather than a skipped action.

The Playwright config is selected explicitly by the npm scripts. It starts the
local reference server and writes a JSON result to the spec evidence directory.
Before any test runs, the runner writes a unique run identity. The membership
report carries that identity so metrics cannot consume output from an older run.

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
| [Golden Captures](../goldens/README.md) | Approved baseline and candidate capture trees |
