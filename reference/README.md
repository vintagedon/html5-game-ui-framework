<!--
---
title: "Registry-Driven Reference Application"
description: "Published conformance surface generated from the scenario registry"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-05"
version: "2.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: harness
  - tech: [html, css, javascript, svg]
related_documents:
  - "[Conformance Harness](../harness/README.md)"
  - "[Project Charter](../docs/project-charter.md)"
---
-->

# Registry-Driven Reference Application

This directory contains the reference application rendered from the scenario
registry. It is the public-facing component registry, dependency-audit surface,
computed metrics dashboard, and interaction target for the Playwright runner.

---

## 1. Contents

```text
reference/
├── index.html       # Application shell with metrics, auditor, and scenario hosts
├── reference.css    # Reference composition in the consumer overrides layer
├── reference.js     # Registry rendering, theme switching, metrics, and audit output
└── README.md        # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [index.html](index.html) | Registry-driven conformance application shell | Active |
| [reference.css](reference.css) | Reference-page layout outside framework metric scope | Active |
| [reference.js](reference.js) | Renders registry scenarios, audit findings, metrics, and theme controls | Active |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Repository README](../README.md) | Repository orientation |
| [Conformance Harness](../harness/README.md) | Registry, runner, metrics, and auditor architecture |
| [Project Charter](../docs/project-charter.md) | Frozen acceptance criteria and preview boundary |
