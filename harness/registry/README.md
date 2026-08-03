<!--
---
title: "Scenario Registry"
description: "The single scenario declaration, its schema, and the validator"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-03"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: harness
  - tech: [javascript, node]
related_documents:
  - "[Conformance Harness](../README.md)"
  - "[Token Reference](../../docs/token-reference.md)"
---
-->

# Scenario Registry

One machine-readable declaration per specimen: stable ID, layer membership,
required tokens, theme and viewport coverage, initial state, scripted
interactions, and named capture checkpoints. Four consumers — the reference
application, the Playwright runner, the dependency auditor, and the metrics block
— read this declaration and no other source. The token vocabulary and theme roster
the validator checks against are derived from `src/`, not redeclared here, so a
renamed token or theme surfaces as a validation failure.

---

## 1. Contents

```text
registry/
├── scenarios.js   # THE single declaration: theme roster + scenario array
├── layers.js      # Frozen four-layer architecture (foundations→consumers)
├── source.js      # Node reader: derives tokens + themes from src/
├── schema.js      # Pure validator + the shared interaction-action vocabulary
├── validate.js    # CLI entry (npm run validate)
└── README.md      # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [scenarios.js](scenarios.js) | The single scenario declaration | ✅ Active |
| [layers.js](layers.js) | Frozen layer names and dependency direction | ✅ Active |
| [source.js](source.js) | Derives the token vocabulary and theme roster from `src/` | ✅ Active |
| [schema.js](schema.js) | Pure registry validator and the action vocabulary | ✅ Active |
| [validate.js](validate.js) | CLI entry that runs the validator | ✅ Active |

---

## 3. Scenario fields

| Field | Meaning |
|-------|---------|
| `id` | Stable, unique specimen identifier |
| `layer` | One of `foundations`, `core`, `modules`, `consumers` |
| `tokens` | Required tokens; each must exist in `src/tokens/` |
| `themes` | Theme coverage; each must exist in `src/themes/` |
| `viewports` | Named capture viewports |
| `interactions` | Scripted actions the runner drives (`schema.js` defines the verbs) |
| `checkpoints` | Named capture points, each `after` zero or more interactions |
| `dependsOn` | Specimen IDs this one depends on (auditor-enforced) |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Conformance Harness](../README.md) | Parent directory |
| [Token Reference](../../docs/token-reference.md) | The vocabulary the validator derives from `src/` |
| [Dependency Auditor](../auditor/README.md) | Reads `layer` and `dependsOn` from this registry |
