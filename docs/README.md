<!--
---
title: "Documentation"
description: "Project documentation, standards, and reference materials"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-07-25"
version: "1.3"
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

Project documentation. The project charter holds frozen scope, architecture, and acceptance criteria. The `documentation-standards/` subdirectory contains the template library and guidelines that govern all documentation in the repository.

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
├── project-charter.md              # Frozen scope, architecture, acceptance criteria
└── README.md                       # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [project-charter.md](project-charter.md) | Frozen scope, architecture, roadmap, and acceptance criteria | Active |

The staged manifest for the repository's initial commit is written by the initialization unit and lands here once that commit exists.

---

## 3. Subdirectories

| Directory | Description |
|-----------|-------------|
| [documentation-standards/](documentation-standards/README.md) | Template library for READMEs, KB articles, charters, one-pagers, script headers, and guidelines |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Repository Root](../README.md) | Parent directory |
| [AGENTS.md](../AGENTS.md) | Agent context loading references these docs |
| [Tagging Strategy](documentation-standards/tagging-strategy.md) | Controlled vocabulary for all frontmatter in this repository |
