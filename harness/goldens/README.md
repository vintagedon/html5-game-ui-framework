<!--
---
title: "Golden Captures"
description: "Approved baseline and candidate capture trees for the golden comparison workflow"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-03"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: harness
  - tech: [playwright]
related_documents:
  - "[Conformance Harness](../README.md)"
  - "[Playwright Runner](../runner/README.md)"
---
-->

# Golden Captures

Two distinct trees. The runner writes captures to `candidates/` and compares them
against `approved/`. The approved tree holds the operator-approved baseline and is
tracked; the candidate tree is a build artifact and is gitignored.

**Agents never approve goldens and never write the approved path.** Approval is an
operator action carrying the same posture as a push or a merge. An agent that breaks
a golden and regenerates the approved file has deleted a failing test while
producing something that looks like work product. This unit captures the first
candidate set and presents it for approval; it does not approve it.

---

## 1. Contents

```text
goldens/
├── approved/     # Operator-approved baseline (tracked; empty until approved)
│   └── .gitkeep
├── candidates/   # Runner output, one PNG per (scenario × theme × checkpoint) (gitignored)
└── README.md     # This file
```

A capture's path is `<scenario-id>/<theme>/<checkpoint>.png`, identical under both
trees so a candidate compares against its like-named baseline.

---

## 2. Workflow

| Step | Action | Who |
|------|--------|-----|
| Capture | `npm run capture` writes `candidates/` (no comparison) | Agent |
| Approve | Copy a reviewed candidate to the same path under `approved/` | **Operator** |
| Compare | `npm run test` compares each candidate to `approved/`; a diff fails the run | Agent |

With no approved baseline, a checkpoint is reported "awaiting approval" rather than
failing — the expected state until the operator approves the first set.

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Conformance Harness](../README.md) | Parent directory |
| [Playwright Runner](../runner/README.md) | Writes candidates; runs the comparison |
