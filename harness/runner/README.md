<!--
---
title: "Playwright Runner"
description: "Chromium-only Playwright configuration and the registry-driven conformance runner"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-03"
version: "1.0"
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
├── runner.spec.js        # Registry-driven capture and comparison
├── compare.js            # Manifest integrity and pixel comparator
└── README.md             # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [playwright.config.js](playwright.config.js) | Chromium project, local file server, viewport | ✅ Active |
| [runner.spec.js](runner.spec.js) | Drives declared interactions; captures checkpoints | 🔄 In Progress |
| [compare.js](compare.js) | Approval-manifest integrity and approved/candidate pixel comparison | 🔄 In Progress |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Conformance Harness](../README.md) | Parent directory |
| [Scenario Registry](../registry/README.md) | The single declaration the runner reads |
| [Golden Captures](../goldens/README.md) | Approved baseline and candidate capture trees |
