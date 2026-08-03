<!--
---
title: "Conformance Harness"
description: "The scenario registry and its four consumers: reference app, Playwright runner, dependency auditor, and computed metrics"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-03"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: harness
  - tech: [javascript, playwright, node, css, html]
related_documents:
  - "[Project Charter](../docs/project-charter.md)"
  - "[Token Reference](../docs/token-reference.md)"
  - "[Foundations Review](../docs/foundations-review-2026-08-02.md)"
---
-->

# Conformance Harness

One scenario registry declares every specimen: its layer membership, required
tokens, theme and viewport coverage, initial state, scripted interactions, and
named capture checkpoints. Four consumers read that one declaration and no other
source. The reference application renders from it. The Playwright runner drives
the same interactions and compares captures against approved goldens. The
dependency auditor reads declared layer membership and renders violations on the
page. The metrics block is computed from the repository at build time.

The single-declaration property is the architecture: changing one field in the
registry changes what the page renders **and** what the runner tests. A scenario
field written literally outside the registry is a second source of truth and a
defect.

This directory is the harness, not the framework. The metric scope
(`harness/metrics/scope.js`) excludes it: a game consumes `src/`, never `harness/`.

---

## 1. Contents

```text
harness/
├── registry/     # The single scenario declaration, schema, and validator
├── app/          # Shared registry-to-DOM renderer used by the reference page
├── runner/       # Chromium Playwright config and registry-driven runner
├── goldens/      # Approved (tracked) and candidate (generated) capture trees
├── metrics/      # Resolved metric scope and the computed metrics generator
├── auditor/      # Layer-dependency auditor reading declared layer membership
└── README.md     # This file
```

---

## 2. Workflow

| npm script | What it does |
|------------|--------------|
| `npm run validate` | Validate the registry against its schema and the frozen vocabulary |
| `npm run metrics` | Compute metrics from the repository; fail on a raster, contrast, or pairing violation |
| `npm run build` | `validate` then `metrics`; prepares the reference application |
| `npm run test` | `build` then run the runner in compare mode against approved goldens |
| `npm run capture` | `build` then run the runner in capture mode, writing candidate goldens |

---

## 3. Subdirectories

| Directory | Description |
|-----------|-------------|
| [registry/](registry/README.md) | The scenario registry, the schema it must satisfy, and the validator |
| [app/](app/README.md) | The renderer that turns a scenario declaration into reference-page markup |
| [runner/](runner/README.md) | Playwright configuration (Chromium only) and the registry-driven runner |
| [goldens/](goldens/README.md) | Approved baseline captures (tracked) and candidate captures (generated) |
| [metrics/](metrics/README.md) | The resolved metric-scope path list and the computed metrics generator |
| [auditor/](auditor/README.md) | The dependency auditor that reads layer membership from the registry |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Repository Root](../README.md) | Parent directory |
| [Project Charter](../docs/project-charter.md) | Harness acceptance criteria (§3) and metric scope (§4.1) |
| [Token Reference](../docs/token-reference.md) | Frozen vocabulary and the designed-pairings table the contrast gate enforces |
