<!--
---
title: "Golden Captures"
description: "Approved baseline and candidate capture trees for the golden comparison workflow"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-05"
version: "1.1"
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

Two distinct trees plus a durable approval manifest. The runner writes captures
to `candidates/` and compares them against `approved/`. The approved tree and
`approval-manifest.json` are tracked; the candidate tree is a build artifact and
is gitignored.

**Agents never approve goldens and never write the approved path.** Approval is an
operator action carrying the same posture as a push or a merge. An agent that breaks
a golden and regenerates the approved file has deleted a failing test while
producing something that looks like work product. This unit captures the first
candidate set and presents it for approval; it does not approve it.

---

## 1. Contents

```text
goldens/
├── approved/                # Operator-approved PNGs (tracked; empty until approved)
│   └── .gitkeep
├── candidates/              # Runner output (gitignored)
├── approval-manifest.json   # Approved case identity to PNG SHA-256 (tracked)
└── README.md                # This file
```

A capture's path is `<scenario-id>/<theme>/<viewport>/<checkpoint>.png`,
identical under both trees so a candidate compares against its like-named
baseline. The viewport comes from the registry and the path is also its
manifest key.

The manifest format is a JSON object with `version: 1`, `algorithm: "sha256"`,
and an `entries` object whose keys are capture identities and whose values are
lowercase SHA-256 hashes of approved PNG bytes. The checked-in entry count is
zero. Only the operator copies a reviewed PNG into `approved/` and adds its
manifest entry.

---

## 2. Workflow

| Step | Action | Who |
|------|--------|-----|
| Capture | `npm run capture` writes `candidates/` (no comparison) | Agent |
| Approve | Copy a reviewed candidate to `approved/` and record its SHA-256 in the manifest | **Operator** |
| Compare | `npm run test` verifies manifest integrity, then compares candidate pixels | Agent |

Approval is durable state. A missing entry means the case is unapproved; an entry
means its PNG must remain present, readable, parseable, hash-matched, size-matched,
and visually matched.

| Manifest entry | PNG on disk | Comparator result |
|----------------|-------------|-------------------|
| Absent | Absent | `awaiting` |
| Absent | Present | `awaiting`, reported as an unapproved baseline |
| Present | Absent | Failure |
| Present | Unreadable, unparseable, or size-mismatched | Failure |
| Present | Hash-mismatched | Failure |
| Present | Hash-matched and pixels matched | Pass |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Conformance Harness](../README.md) | Parent directory |
| [Playwright Runner](../runner/README.md) | Writes candidates; runs the comparison |
