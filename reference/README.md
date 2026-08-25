<!--
---
title: "Registry-Driven Reference Application"
description: "Published multi-view conformance surface generated from the scenario registry"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-25"
version: "2.1"
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

The application is multi-view over one shell. Routing is hash-based with no
build step: `#/` renders the landing view (section index with registry-derived
specimen counts, computed metrics, dependency audit) and `#/<section-id>`
renders the scenarios the registry files under that section. Navigation is a
persistent indented tree built from the registry's section roster; the theme
toolbar is present in every view and switches themes in place, because a theme
swapping over unchanged markup is what the site exists to demonstrate. Theme is
never a route.

Navigation is reference chrome (`.reference-nav` and descendants), not a
framework component: it carries no `.gc-` class and lives outside `src/`,
because tab-like chrome is held behind the Vector Vortex backport under the
coordination rule in `AGENTS.md`.

---

## 1. Contents

```text
reference/
├── index.html       # Application shell: nav, landing view, section view
├── reference.css    # Reference chrome and composition in the consumer overrides layer
├── reference.js     # Registry rendering, hash routing, theme switching, metrics, audit
└── README.md        # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [index.html](index.html) | Registry-driven multi-view application shell | Active |
| [reference.css](reference.css) | Reference-page chrome and layout outside framework metric scope | Active |
| [reference.js](reference.js) | Builds nav and views from the registry roster, renders scenarios, audit findings, metrics, and theme controls | Active |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Repository README](../README.md) | Repository orientation |
| [Conformance Harness](../harness/README.md) | Registry, runner, metrics, and auditor architecture |
| [Project Charter](../docs/project-charter.md) | Frozen acceptance criteria and preview boundary |
