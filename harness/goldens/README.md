<!--
---
title: "Golden Captures"
description: "Recorded baselines, candidate captures, and the integrity manifest for the diff-only review workflow"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-01"
version: "2.10"
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

**Establishing is the only approved-tree write a run performs.** Candidates
stay in memory during Playwright and travel through the canonical wrapper's
inherited pipe. The reporter rejects regular files and directories, including
descriptors aimed inside `approved/`. Only the fixed, unfiltered
`npm run capture` path may authenticate and finalize the collected bytes, after
the complete Playwright child and post-run metrics succeed. A caller that
supplies its own pipe can receive only ephemeral staging from its own process;
the reporter still cannot approve it. Direct, file-filtered, and `--grep` runs
never establish a baseline. A failed run, including a metrics failure, writes
no baseline. An
agent never modifies or deletes a baseline that exists: a capture that
disagrees with its baseline is a failure to surface, never a file to refresh,
because a regenerated capture looks like work product rather than like a
deletion.
Accepting a changed render is an operator action performed by deleting the
baseline PNG and its manifest entry, which appears in the diff as a deletion.

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

Manifest publication writes the complete replacement to a same-directory
temporary file and atomically renames it only when ready. A failed write or
rename leaves the prior manifest byte-identical; any already-created PNG is a
hash-matching orphan that the next complete green run recovers without rewrite.
PNG publication stages complete bytes to a verified non-raster temporary beside
the manifest, never under `approved/`, and atomically installs it without
overwrite by hard link. A partial staging write cannot become an approved PNG.
An interruption after installation can leave a complete hash-matching orphan
plus its sibling temporary hard link. The next complete green run verifies the
temporary's name, inode, and content against that orphan, removes it before
manifest publication, preserves the PNG mtime, and adds the entry. Unrelated
temporary files are never removed. Symlink ancestors are rejected.

Ordinary comparisons run through the fixed `npm run playwright` wrapper. It
rejects protected `--output` and last-run targets before Playwright's startup
cleanup, checking equal, descendant, and ancestor relationships in both lexical
and resolved path space after `lstat`-inspecting existing path components.
Every Playwright output path containing a symlink is rejected, including a
dangling final link or dangling parent; output links are unsupported regardless
of destination. It rejects alternate configs and reporters and leaves safe
filtering arguments available. Public-config checks also contain
Playwright's built-in reporter output environment variables and reject the
internal `PW_TEST_REPORTER` extension hook before reporter creation. Canonical
capture strips that hook and the native output variables so caller output
routing cannot mutate the manifest or approved tree before transaction
finalization. The configured JSON reporter validates its selected default or
fallback with the same link and protected-relationship checks as an explicit
target; an unsafe fallback fails config load before directory or reporter
creation.

---

## 2. Workflow

| Step | Action | Who |
|------|--------|-----|
| Capture | `npm run capture` writes `candidates/` | Agent |
| Record | `npm run capture` writes absent PNGs and entries only after Playwright, pipe authentication, and metrics succeed | Agent (automatic) |
| Compare | Every recorded case compares pixel-by-pixel; a disagreement fails with its diff under `candidates/` | Agent |
| Accept | Delete the baseline PNG and its manifest entry; the next run re-records it against the new render | **Operator** |

Recording is automatic and establishing is additive. The operator reviews a
failing diff and either fixes the regression or accepts the new render by
deleting the baseline and its entry, which shows up in the diff as a deletion
and is the honest representation of what accepting a changed render is.

| Manifest entry | PNG on disk | Comparator result |
|----------------|-------------|-------------------|
| Absent | Absent | Staged in memory, then established only after the complete run passes |
| Absent | Present, hash matches current capture | Recoverable at the successful-run commit point; entry added without rewriting the PNG |
| Absent | Present, hash differs from current capture | Failure `baseline-entry-missing`: surfaced, not adopted |
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
