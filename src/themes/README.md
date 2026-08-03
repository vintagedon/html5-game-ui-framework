<!--
---
title: "Theme Source"
description: "Removable semantic-token theme files for the framework"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-03"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: themes
  - tech: [css]
related_documents:
  - "[Token Reference](../../docs/token-reference.md)"
  - "[Project Charter](../../docs/project-charter.md)"
---
-->

# Theme Source

Each file in this directory selects one root `data-gc-theme` value and
populates semantic tokens inside the `theme` layer. Theme files do not declare
primitive tokens, component tokens, selectors for component internals, or
interactive state variants.

---

## 1. Contents

```text
themes/
├── modern.css    # Explicit modern theme; semantic defaults also provide fallback
└── README.md     # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [modern.css](modern.css) | Flat surfaces, soft depth, smooth motion, and normal-case type | Active |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Framework Source](../README.md) | Parent directory |
| [Token Reference](../../docs/token-reference.md) | Public roles populated by themes |
