<!--
---
title: "Computed Framework Metrics"
description: "Resolved framework scope, generated metrics, and current-run membership requirements"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-05"
version: "1.2"
status: "Active"
tags:
  - type: directory-readme
  - domain: harness
  - tech: [javascript, node, css]
related_documents:
  - "[Conformance Harness](../README.md)"
  - "[Playwright Runner](../runner/README.md)"
---
-->

# Computed Framework Metrics

The metrics generator resolves one explicit framework scope, computes every
published value from that scope, and writes `metrics.json` for the reference
application. The scope contains the token, core, module, and theme trees plus
the two consumer entry points. Harness, documentation, staging, and reference
materials are outside the framework metric boundary.

Metrics run after Playwright. `membership.js` requires `membership.json` to
carry the current Playwright run ID and to be no older than that run's state
file. A missing or stale report fails before `metrics.json` can be published.

---

## 1. Contents

```text
metrics/
├── color.js          # Color parsing, conversion, and contrast ratios
├── contrast.js       # Designed-pairing contrast gate and declarations
├── membership.js     # Current Playwright-run freshness guard
├── metrics.js        # Generated metric block and build gates
├── pairings.js       # Designed semantic pairing table
├── scope.js          # Explicit framework scope and raster classifier
└── README.md         # This file
```

`metrics.json` is generated and gitignored.

---

## 2. Metric Gates

| Gate | Requirement |
|------|-------------|
| Raster assets | Zero raster files in the resolved scope, with case-insensitive extensions |
| Layer dependencies | Zero illegal registry dependencies, including module-to-module dependencies |
| Contrast | Every designed pair meets its text or non-text threshold |
| Membership freshness | Membership belongs to and follows the current Playwright run |
| Membership classification | Every rendered observation is designed or has a named outcome; unclassified observations are zero |

The capture-checkpoint count is registry-derived as scenario themes multiplied
by viewports multiplied by checkpoints.

The metrics block publishes five membership coverage values from the current
browser run: designed pair identities, distinct observed pair identities,
total pairing observations, counted exclusions by reason, and unclassified
observations. The final value is a hard gate and must remain zero.

`Static off-origin references` is a source scan of framework CSS and
JavaScript. It is deliberately named separately from the runtime off-origin
request count observed by the published-preview smoke test. `Contrast
failures` counts failures from the designed-pair contrast gate; it is not a
claim to cover every accessibility requirement.

---

## 3. Related

| Document | Relationship |
|----------|--------------|
| [Conformance Harness](../README.md) | Parent directory and execution order |
| [Playwright Runner](../runner/README.md) | Produces current-run membership evidence |
