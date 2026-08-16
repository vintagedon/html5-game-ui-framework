<!--
---
title: "Scripts"
description: "Repository tooling that supports the conformance and research workflows"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-16"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: harness
  - tech: [node]
related_documents:
  - "[Repository Root](../README.md)"
  - "[Reference Corpus Scripts](reference-corpus/README.md)"
---
-->

# Scripts

Repository tooling organized by workflow. Scripts here are development
aids, never runtime dependencies: everything runs on the existing Node
toolchain with built-in modules only.

---

## 1. Contents

```
scripts/
├── reference-corpus/     # Scanner, validator, and source audit for the UI pack catalog
└── README.md             # This file
```

---

## 3. Subdirectories

| Directory | Description |
|-----------|-------------|
| [reference-corpus/](reference-corpus/README.md) | Catalog scanner, pure validator, and the ML01-only source audit |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Repository Root](../README.md) | Parent directory |
| [Reference Corpus](../docs/reference-corpus/README.md) | The artifacts the corpus scripts validate |
