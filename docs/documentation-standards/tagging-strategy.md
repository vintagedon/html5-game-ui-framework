<!--
---
title: "Tagging Strategy Guide"
description: "Controlled vocabulary for document classification in html5-game-ui-framework"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-07-25"
version: "3.0"
status: "Active"
tags:
  - type: guide
  - domain: documentation
related_documents:
  - "[html5-game-ui-framework](https://github.com/vintagedon/html5-game-ui-framework)"
  - "[Project Charter](../project-charter.md)"
  - "[Primary README Template](primary-readme-template.md)"
  - "[Interior README Template](interior-readme-template.md)"
  - "[General KB Template](general-kb-template.md)"
  - "[Worklog README Template](worklog-readme-template.md)"
  - "[One-Pager Template](one-pager-template.md)"
  - "[Project Charter Template](project-charter-template.md)"
---
-->

# Tagging Strategy Guide

## 1. Purpose

This guide defines the controlled tag vocabulary for `html5-game-ui-framework`. Consistent tagging enables human navigation and RAG system retrieval. This document is the authoritative source for allowed tag values in this repository. Documents may only use tags defined here.

---

## 2. Why Controlled Vocabulary

Uncontrolled tagging leads to synonyms fragmenting search (`database` vs `db` vs `databases`), inconsistent granularity (`postgres` vs `relational-database`), and tag proliferation that reduces signal. A controlled vocabulary defines allowed values upfront, ensuring consistency across contributors and time.

---

## 3. Tag Categories

Each category answers a different question about the document. Keep categories orthogonal; each captures a distinct dimension.

| Category | Question Answered | Required |
|----------|-------------------|----------|
| `type` | What kind of document is this? | Yes |
| `domain` | What subject area? | Yes |
| `status` | What's the lifecycle state? | Recommended |
| `tech` | What technologies involved? | When applicable |
| `framework` | What compliance framework? | Not used in this repository |

---

## 4. Domain Tags

Domain tags for this repository follow the framework's own dependency architecture. The first three (`foundations`, `core`, `modules`) are the layer boundaries the project is built on, so a document's domain tag also states which layer it governs.

### Building Your Domain Vocabulary

1. **Inventory content types.** What kinds of content does this repository contain? Group by function, not format.
2. **Define 5-12 domain values.** Cover your content without excessive overlap.
3. **Write boundary definitions.** One sentence per tag clarifying what belongs and what doesn't.

<!-- HYDRATE:DOMAIN -->

```yaml
domain:
  - foundations    # Token contract, typography roles, spacing, motion, cascade layers, theme mechanism
  - core           # Renderer-agnostic, domain-neutral primitives and their contracts
  - modules        # Composed game patterns that depend on core and never on each other
  - themes         # Theme packages, palettes, and the technique used to render them
  - harness        # Scenario registry, reference application, runner, goldens, metrics
  - consumers      # Integration targets, recipes, and the canvas host contract
  - research       # Harvest corpus analysis, technique notes, prior-art review
  - documentation  # Templates, standards, meta-content
```

### Boundary Definitions

| Tag | Belongs Here | Does Not Belong Here |
|-----|-------------|---------------------|
| `foundations` | Anything whose name is API: token names, layer order, state contracts, focus rules, theme interface | Individual component implementations |
| `core` | A primitive multiple consumers can use without translating game concepts into it | Anything naming a game mechanic |
| `modules` | A composition of core primitives serving a recognizable game pattern | A primitive other modules would need |
| `themes` | Palette values, per-theme technique, texture and ornament generation | The token names the theme fills in, which are `foundations` |
| `harness` | The registry format, the reference application, Playwright configuration, golden workflow, metric definitions | The components the harness renders |
| `consumers` | Integration notes, recipes, canvas host behavior, per-game boundary documentation | Game source, which is not tracked here |
| `research` | Analysis of the harvest corpus, technique derivation, competitive review | Anything asserting a project commitment, which is `foundations` or the charter |
| `documentation` | Templates, standards, tagging, writing style, meta-content | Project content of any kind |

### Boundary Rules

- If a document spans two domains, use the primary one. Multi-value only when genuinely split.
- `foundations` outranks `core` and `modules` when a document defines something the other layers must obey.
- A document about how a theme achieves an effect is `themes`. A document about the token the effect fills is `foundations`.

---

## 5. Type Tags

| Tag | Use For |
|-----|---------|
| `project-root` | Repository root README |
| `directory-readme` | Interior README for any directory |
| `worklog` | Work log entries and milestone documentation |
| `charter` | Project charter (frozen scope and architectural commitments) |
| `one-pager` | Ideation capture (portable context unit for AI handoffs) |
| `guide` | Step-by-step procedures and how-to documents |
| `reference` | Lookup information: inventories, schemas, API docs, component contracts |
| `specification` | Specs for agent dispatch, formal requirements |
| `report` | Analysis, findings, audit results, summaries |
| `runbook` | Operational procedures for deployment or maintenance |
| `policy` | Governance policies: commitments and principles |
| `procedure` | SOPs: how activities are carried out |

---

## 6. Status Tags

| Tag | Description |
|-----|-------------|
| `draft` | In development, not yet complete |
| `active` | Current, maintained, approved |
| `under-review` | Scheduled or triggered review in progress |
| `deprecated` | Superseded, avoid for new work |
| `archived` | Historical reference only |

---

## 7. Tech Tags

Use canonical names, lowercase, hyphenated. Check for existing coverage before adding new tags.

<!-- HYDRATE:TECH -->

```yaml
tech:
  - css              # Including cascade layers, custom properties, color-mix, container queries
  - javascript       # ESM only
  - html
  - svg              # Inline SVG and SVG filters used as a raster replacement
  - playwright       # Chromium headless; the scenario runner and golden comparison
  - node             # Tooling and metric generation only, never a runtime dependency
  - nginx            # ML01 preview host serving the reference application at gameui.donfather.site
```

<!-- /HYDRATE:TECH -->

---

## 8. Framework Tags

This repository has no compliance component. The section is retained so that future documents have a defined place to record framework mappings if that changes.

<!-- HYDRATE:FRAMEWORK -->

| Tag | Framework |
|-----|-----------|
| _(none defined)_ | _(this repository has no compliance obligations)_ |

<!-- /HYDRATE:FRAMEWORK -->

---

## 9. Implementation

### Standard Frontmatter

```yaml
<!--
---
title: "Document Title"
description: "What this document covers"
author: "VintageDon (https://github.com/vintagedon/)"
date: "YYYY-MM-DD"
version: "1.0"
status: "Active"
tags:
  - type: guide
  - domain: core
  - tech: [css, javascript]
related_documents:
  - "[Related Doc](path/to/doc.md)"
---
-->
```

### Conventions

- Use lowercase, hyphenated values (`ci-cd` not `CI/CD` or `cicd`)
- Tech tags use canonical names
- One value per line for readability, or array syntax for multi-value
- `related_documents` links use relative paths within the repo
- The canonical repository URL is `https://github.com/vintagedon/html5-game-ui-framework`

### Exemptions

Frontmatter is not required on:

- Standard repository furniture: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `LICENSE-DATA`
- Template files in `docs/documentation-standards/`, whose frontmatter is illustrative rather than descriptive
- Private source material under `internal-files/`
- Anything under a gitignored reference directory

---

## 10. Maintaining the Vocabulary

### Adding New Tags

1. Check if an existing tag covers the concept
2. If not, add the new tag with a boundary definition to this document
3. Backfill existing documents if the new tag applies retroactively

Agents do not coin tags. An agent that needs a tag absent from this document records the gap for operator triage and uses the closest existing value.

### Governance

- This document is the authoritative source for allowed tag values
- Prefer broader tags over proliferating specific ones
- Review additions for overlap with existing tags

---

## 11. References

| Resource | Description |
|----------|-------------|
| [Project Charter](../project-charter.md) | Frozen scope; source of the domain vocabulary |
| [Primary README Template](primary-readme-template.md) | Shows tag usage in repository root READMEs |
| [Interior README Template](interior-readme-template.md) | Shows tag usage in directory READMEs |
| [General KB Template](general-kb-template.md) | Shows tag usage for standalone docs |
| [Worklog README Template](worklog-readme-template.md) | Shows tag usage for work log entries |
| [One-Pager Template](one-pager-template.md) | Shows tag usage for ideation documents |
| [Project Charter Template](project-charter-template.md) | Shows tag usage for project charters |
