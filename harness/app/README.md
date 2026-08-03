<!--
---
title: "Reference Renderer"
description: "Shared registry-to-DOM renderer for the reference application"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-03"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: harness
  - tech: [javascript]
related_documents:
  - "[Conformance Harness](../README.md)"
  - "[Scenario Registry](../registry/README.md)"
---
-->

# Reference Renderer

Browser ESM that turns a scenario declaration into reference-page markup. The
page imports the registry and this renderer and builds a section per scenario, so
the page source carries no per-scenario markup: adding a scenario to the registry
makes it appear with no other file edited.

The interaction targets a scenario declares (for example
`.gc-button[data-variant="resting"]`) resolve against `[data-scenario="<id>"]`,
which is the same contract the Playwright runner relies on.

---

## 1. Contents

```text
app/
├── render.js   # specimen builders and the scenario-section factory
└── README.md   # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [render.js](render.js) | `specimenRoot(scenario)` and `scenarioSection(scenario)` | ✅ Active |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Conformance Harness](../README.md) | Parent directory |
| [Scenario Registry](../registry/README.md) | The declaration this renders |
| [Playwright Runner](../runner/README.md) | Reads the same targets this produces |
