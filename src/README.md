<!--
---
title: "Framework Source"
description: "Consumable CSS and ESM source for the game UI framework"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-03"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: foundations
  - tech: [css, javascript]
related_documents:
  - "[Project Charter](../docs/project-charter.md)"
  - "[Token Reference](../docs/token-reference.md)"
---
-->

# Framework Source

This directory contains the text-only source that a game consumes. Token,
core, module, and theme paths remain separate so dependency and asset metrics
can scan explicit boundaries.

---

## 1. Contents

```text
src/
├── core/         # Domain-neutral primitives and base behavior
├── themes/       # Removable semantic-token theme files
├── tokens/       # Primitive, semantic, and component token tiers
├── gc.css        # Public entry and single cascade layer order
└── README.md     # This file
```

---

## 3. Subdirectories

| Directory | Description |
|-----------|-------------|
| [core/](core/README.md) | Domain-neutral framework defaults and primitives |
| [themes/](themes/README.md) | Root-attribute themes that override semantic roles only |
| [tokens/](tokens/README.md) | Three-tier token contract and state recipes |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Repository README](../README.md) | Repository orientation |
| [Token Reference](../docs/token-reference.md) | Semantic vocabulary and boundaries |
