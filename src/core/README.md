<!--
---
title: "Core Source"
description: "Domain-neutral framework primitives and shared base behavior"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-03"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: core
  - tech: [css]
related_documents:
  - "[Framework Source](../README.md)"
  - "[Cascade and Overrides](../../docs/cascade-and-overrides.md)"
---
-->

# Core Source

This directory contains domain-neutral CSS primitives. Every default selector
is wrapped in `:where()` so consumers can override it without specificity
escalation.

---

## 1. Contents

```text
core/
├── base.css          # Reset, document defaults, and specificity probe
├── components.css    # Phase 1 proof specimens and state bindings
└── README.md     # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [base.css](base.css) | Layered base rules and Phase 1 core defaults | Active |
| [components.css](components.css) | Button, panel, input, meter, and zero-raster spike proof styles | Active |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Framework Source](../README.md) | Parent directory |
| [Cascade and Overrides](../../docs/cascade-and-overrides.md) | Consumer override contract |
