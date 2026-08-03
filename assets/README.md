<!--
---
title: "Assets"
description: "Project images, banners, and visual resources authored for this repository"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-02"
version: "1.2"
status: "Active"
tags:
  - type: directory-readme
  - domain: documentation
related_documents:
  - "[Repository Root](../README.md)"
---
-->

# Assets

The repository logo and documentation imagery. This is the operator's own artwork and it is tracked in version control.

It is not a home for framework assets. The framework ships no raster files at all; texture, ornament, and iconography are generated from CSS and inline SVG, and the framework raster count is a published metric whose correct value is zero. It is also not a home for third-party art, which lives under the gitignored `reference-files-*` trees.

---

## 1. Contents

```
assets/
├── repo-logo.png           # Square repository logo, used in the root README header
└── README.md               # This file
```

---

## 2. Related

| Document | Relationship |
|----------|--------------|
| [Repository Root](../README.md) | Parent directory; renders the logo in its header |
| [Project Charter](../docs/project-charter.md) | States the zero-raster constraint this directory is exempt from |

---

## 3. Conventions

**Naming:** descriptive, lowercase, hyphenated: `architecture-diagram.png`, `project-banner.svg`.

**Formats:** SVG for diagrams and icons, PNG or JPG for screenshots and photographic images. Avoid large uncompressed formats.

**References:** link with relative paths, `![Alt text](assets/filename.png)` from the repository root or `![Alt text](../assets/filename.png)` from a subdirectory.

**Scope:** documentation imagery only. Anything a component or theme would load at runtime does not belong here, because no component or theme loads an image file.
