<!--
---
title: "Reference Corpus Scripts"
description: "Scanner, validator, and source-audit tooling for the UI pack catalog"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-17"
version: "1.1"
status: "Active"
tags:
  - type: directory-readme
  - domain: [research, harness]
  - tech: [node]
related_documents:
  - "[Reference Corpus](../../docs/reference-corpus/README.md)"
  - "[Scripts](../README.md)"
---
-->

# Reference Corpus Scripts

Node tooling for the UI reference corpus catalog, built on built-in
modules only (`node:crypto`, `node:fs`, `node:path`, `node:process`).
Two of the three modules run anywhere a public clone runs; the audit
additionally requires the private corpus that exists only on ML01.

---

## 1. Contents

```
scripts/reference-corpus/
├── corpus-scan.mjs        # Read-only scanner: counts and digests per pack
├── validate-catalog.mjs   # Pure schema and relationship validator
├── audit-ui-packs.mjs     # ML01-only CLI reconciling catalog against the corpus
└── README.md              # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [corpus-scan.mjs](corpus-scan.mjs) | Walks a corpus root without following symbolic links or leaving it; computes per-pack and corpus counts, extension classes, runtime evidence, and digests | ✅ Active |
| [validate-catalog.mjs](validate-catalog.mjs) | Validates a parsed catalog value: enums, stable IDs (pack ids are exact directory names and may carry version dots), canonical ordering, bidirectional references, license coherence under the operator-resolution model (facts are grounded in local terms or the recorded resolution; only genuinely unclear facts route to licence review), source-kind consistency, redaction rules, and the game-rule exclusion contract for core and module destinations | ✅ Active |
| [audit-ui-packs.mjs](audit-ui-packs.mjs) | Compares the tracked catalog with the live private corpus one-for-one and verifies every cited evidence path exists | ✅ Active |

---

## 3. Digest Boundary

Each pack digest is SHA-256 over sorted `path\0byteLength\0fileHash`
tuples; the corpus digest is SHA-256 over sorted `packId\0packDigest`
tuples. Individual file hashes exist only inside that fold. The audit
therefore detects any byte-level drift in the corpus while the tracked
catalog never carries a reconstructive file listing.

---

## 4. Usage

```console
npm run corpus:audit                          # ML01, against the live corpus
node scripts/reference-corpus/audit-ui-packs.mjs --root /path/to/copy
npm run corpus:test                           # anywhere, tracked artifacts only
```

The audit exits non-zero with a clear message when the private root is
absent, when a symbolic link or root escape is encountered, or when any
count, digest, or evidence path drifts from the catalog.

---

## 5. Related

| Document | Relationship |
|----------|--------------|
| [Reference Corpus](../../docs/reference-corpus/README.md) | The artifacts this tooling validates |
| [Scripts](../README.md) | Parent directory |
