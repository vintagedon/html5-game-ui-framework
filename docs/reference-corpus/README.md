<!--
---
title: "Reference Corpus"
description: "Catalog and capability map derived from the private UI reference pack corpus"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-17"
version: "1.1"
status: "Active"
tags:
  - type: directory-readme
  - domain: research
  - tech: [node]
related_documents:
  - "[Documentation](../README.md)"
  - "[Project Charter](../project-charter.md)"
  - "[UI Pack Capability Map](ui-pack-capability-map.md)"
---
-->

# Reference Corpus

This directory holds the tracked, public artifacts derived from the private
UI reference pack corpus under `reference-files-ui/` (gitignored, ML01
only). The catalog records what each pack is, what it contains, what its
local license evidence supports, and which framework capabilities it
evidences. The capability map turns that catalog into the ranked operator
review surface. Nothing here redistributes pack source: the tracked files
contain facts, counts, classifications, stable IDs, and pack-level digests
only.

The boundary between the two sides is fixed. The private tree is immutable
evidence: it is read by the audit, never written, and never curated in
place. The tracked artifacts are derived statements about that evidence:
they may report requirements and technique, and they may never reproduce
code, markup, styles, audio, images, editable sources, presets, or a
file-by-file manifest that could substitute for a purchased pack.

Evidence, recommendation, and approval are separate acts. The catalog
records evidence. The map recommends from that evidence. Only the
operator's answers to the map's `UIREF-*` questions approve anything, and
no recommended item dispatches automatically.

---

## 1. Contents

```
docs/reference-corpus/
├── ui-pack-inventory.json       # Canonical machine-readable catalog
├── ui-pack-capability-map.md    # Ranked operator review surface
└── README.md                    # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [ui-pack-inventory.json](ui-pack-inventory.json) | Deterministic catalog: corpus snapshot, 28 pack records (two of them private, test-only, non-ranking fixtures), capability, overlap, and game-candidate registers | ✅ Active |
| [ui-pack-capability-map.md](ui-pack-capability-map.md) | Derived map: license posture, pack matrix, three ranked lanes, game-selection matrix, module ladder with the non-owning lab lane, `UIREF-*` review questions | ✅ Active |

---

## 3. Catalog Schema

The catalog is UTF-8 JSON, canonically formatted (two-space indent, sorted
stable IDs, trailing newline), and validated from tracked artifacts alone
by `harness/tests/reference-corpus.test.js`:

- `schemaVersion` is fixed at `1`; `sourceRoot` is fixed at
  `reference-files-ui`.
- `snapshot` holds the immediate-pack count, recursive file count, total
  bytes, normalized extension counts, and a corpus SHA-256 computed over
  sorted pack ID plus pack digest tuples.
- Each `packs` record carries the exact top-level directory name as its
  stable `id`, a recursive snapshot with a pack digest computed over sorted
  path, byte-length, and file-hash tuples, source kinds, runtime-evidence
  counts, evidence pointers, license evidence and facts, a conservative
  shipping posture, capability and overlap references, best game
  consumers, and a disposition.
- `capabilities`, `overlapGroups`, and `gameCandidates` are normalized
  registers referenced both ways from pack records; every reference must
  resolve exactly once.

Individual file hashes and per-file listings are never committed: digests
fold them, so drift detection works without a reconstructive manifest.
Evidence pointers cite documentation, data, and code files, or whole
directories — never individual binary, image, audio, or editable-source
files.

---

## 4. Commands

| Command | Where it runs | What it does |
|---------|---------------|--------------|
| `npm run corpus:test` | Anywhere | Public-clone validation of schema, IDs, enums, relationships, derivation, and redaction |
| `npm run corpus:audit` | ML01 only | Live source audit reconciling the catalog against `reference-files-ui/` |

The audit fails clearly when the private corpus is absent, so it is not
part of `npm test`. A scratch mutation of the corpus (an unrecorded pack,
one changed byte, an altered digest, a missing evidence path, a symbolic
link) fails the audit; the corpus itself is never modified.

---

## 5. Related

| Document | Relationship |
|----------|--------------|
| [Documentation](../README.md) | Parent directory |
| [Project Charter](../project-charter.md) | Harvest boundary and licensing constraints this catalog operates under |
| [Corpus Scripts](../../scripts/reference-corpus/README.md) | Scanner, validator, and audit tooling |
