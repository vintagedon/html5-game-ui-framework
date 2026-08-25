<!--
---
title: "Golden Captures"
description: "Recorded baselines, candidate captures, and the integrity manifest for the diff-only review workflow"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-05"
version: "2.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: harness
  - tech: [playwright]
related_documents:
  - "[Conformance Harness](../README.md)"
  - "[Playwright Runner](../runner/README.md)"
  - "[Harness Review](../../docs/harness-review-2026-08-05.md)"
  - "[Agent Instructions](../../AGENTS.md)"
---
-->

# Golden Captures

Two distinct trees plus a durable manifest. The runner writes captures to
`candidates/`, compares them against `approved/`, and records a baseline
automatically for any case that has none. The approved tree and
`approval-manifest.json` are tracked; the candidate tree is a build artifact
and is gitignored.

**Establishing is the only write a run performs.** An agent never modifies or
deletes a baseline that exists: a capture that disagrees with its baseline is
a failure to surface, never a file to refresh, because a regenerated capture
looks like work product rather than like a deletion. Accepting a changed
render is an operator action performed by deleting the baseline PNG and its
manifest entry, which appears in the diff as a deletion.

---

## 1. Contents

```text
goldens/
├── approved/                # Recorded baseline PNGs (tracked)
│   └── .gitkeep
├── candidates/              # Runner output (gitignored)
├── approval-manifest.json   # Case identity to baseline PNG SHA-256 (tracked)
└── README.md                # This file
```

A capture's path is `<scenario-id>/<theme>/<viewport>/<checkpoint>.png`,
identical under both trees so a candidate compares against its like-named
baseline. The viewport comes from the registry and the path is also its
manifest key. The section a scenario is filed under never enters the path.

The manifest format is a JSON object with `version: 1`, `algorithm: "sha256"`,
and an `entries` object whose keys are capture identities and whose values are
lowercase SHA-256 hashes of baseline PNG bytes. The manifest is an integrity
record: it is what detects a baseline file that has been corrupted or swapped,
and the run itself records entries as it establishes baselines.

---

## 2. Workflow

| Step | Action | Who |
|------|--------|-----|
| Capture | `npm run capture` writes `candidates/` | Agent |
| Record | A case with no baseline writes its PNG into `approved/` and its entry into the manifest, reported as `established` | Agent (automatic) |
| Compare | Every recorded case compares pixel-by-pixel; a disagreement fails with its diff under `candidates/` | Agent |
| Accept | Delete the baseline PNG and its manifest entry; the next run re-records it against the new render | **Operator** |

Recording is automatic and establishing is additive. The operator reviews a
failing diff and either fixes the regression or accepts the new render by
deleting the baseline and its entry, which shows up in the diff as a deletion
and is the honest representation of what accepting a changed render is.

| Manifest entry | PNG on disk | Comparator result |
|----------------|-------------|-------------------|
| Absent | Absent | `established` (PNG written, entry recorded) |
| Absent | Present | Failure `baseline-entry-missing`: a PNG nobody recorded is a hand-edited tree, surfaced not adopted |
| Present | Absent | Failure `baseline-missing` |
| Present | Unreadable, unparseable, or size-mismatched | Failure |
| Present | Hash-mismatched | Failure |
| Present | Hash-matched, pixels differ beyond threshold | Failure with the diff surfaced |
| Present | Hash-matched and pixels matched | Pass |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Conformance Harness](../README.md) | Parent directory |
| [Playwright Runner](../runner/README.md) | Writes candidates; runs the comparison and the recording |
| [Harness Review](../../docs/harness-review-2026-08-05.md) | Operator decisions that moved the harness to this model |
| [Agent Instructions](../../AGENTS.md) | The recorded-baseline constraint, stated identically |
