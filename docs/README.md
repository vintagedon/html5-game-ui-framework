<!--
---
title: "Documentation"
description: "Project documentation, standards, and reference materials"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-05"
version: "1.5"
status: "Active"
tags:
  - type: directory-readme
  - domain: documentation
related_documents:
  - "[html5-game-ui-framework](https://github.com/vintagedon/html5-game-ui-framework)"
  - "[Project Charter](project-charter.md)"
---
-->

# Documentation

Project documentation. The project charter holds frozen scope, architecture,
and acceptance criteria. The token and cascade references describe the frozen
foundations contract. The foundations review records the approved Phase 1
decisions, and the harness review holds the current operator decision surface.
The `documentation-standards/` subdirectory governs repository documentation.

---

## 1. Contents

```
docs/
├── documentation-standards/        # Template library and guidelines
│   ├── primary-readme-template.md
│   ├── interior-readme-template.md
│   ├── general-kb-template.md
│   ├── worklog-readme-template.md
│   ├── one-pager-template.md
│   ├── project-charter-template.md
│   ├── code-commenting-dual-audience.md
│   ├── writing-style-guide.md
│   ├── tagging-strategy.md
│   ├── script-header-python.md
│   ├── script-header-shell.md
│   ├── script-header-powershell.md
│   └── README.md
├── cascade-and-overrides.md         # Layer precedence and consumer override contract
├── foundations-review-2026-08-02.md  # Closed Phase 1 decisions
├── harness-review-2026-08-05.md     # H-001 through H-006 decisions
├── project-charter.md              # Frozen scope, architecture, acceptance criteria
├── reference-corpus/               # UI pack catalog and capability map (public-derived)
│   ├── ui-pack-inventory.json
│   ├── ui-pack-capability-map.md
│   └── README.md
├── token-reference.md              # Frozen semantic vocabulary and tier boundaries
└── README.md                       # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [cascade-and-overrides.md](cascade-and-overrides.md) | Cascade order, zero-specificity defaults, and important-layer reversal | Active |
| [foundations-review-2026-08-02.md](foundations-review-2026-08-02.md) | Closed approval questions for Phase 1 foundations and the spike | Approved |
| [harness-review-2026-08-05.md](harness-review-2026-08-05.md) | Evidence and yes-or-no questions for the harness operator review | Under Review |
| [project-charter.md](project-charter.md) | Frozen scope, architecture, roadmap, and acceptance criteria | Active |
| [token-reference.md](token-reference.md) | Three-tier contract and frozen semantic vocabulary | Active |

---

## 3. Subdirectories

| Directory | Description |
|-----------|-------------|
| [documentation-standards/](documentation-standards/README.md) | Template library for READMEs, KB articles, charters, one-pagers, script headers, and guidelines |
| [reference-corpus/](reference-corpus/README.md) | Tracked catalog and ranked capability map derived from the gitignored `reference-files-ui/` corpus; facts and technique only, never pack source |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Repository Root](../README.md) | Parent directory |
| [AGENTS.md](../AGENTS.md) | Agent context loading references these docs |
| [Tagging Strategy](documentation-standards/tagging-strategy.md) | Controlled vocabulary for all frontmatter in this repository |
