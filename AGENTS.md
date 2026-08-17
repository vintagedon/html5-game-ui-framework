<!--
---
title: "Agent Instructions"
description: "Repository identity, architectural constraints, documentation conventions, and spec execution pattern for html5-game-ui-framework"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-02"
version: "1.2"
status: "Active"
tags:
  - type: reference
  - domain: foundations
  - tech: [css, javascript, html, svg, playwright]
related_documents:
  - "[Project Charter](docs/project-charter.md)"
  - "[README](README.md)"
  - "[Tagging Strategy](docs/documentation-standards/tagging-strategy.md)"
---
-->

# Agent Instructions

## Repository Identity

`html5-game-ui-framework` is a renderer-agnostic UI framework for browser games, built on DOM and CSS, whose reference application is simultaneously its component registry, dependency auditor, metrics dashboard, interaction runner, and visual regression suite. Its visual identity comes from CSS and inline SVG technique rather than image files.

The repository is public and MIT licensed. It is a portfolio artifact and shared internal tooling, not a commercial product.

The framework is a UI layer for games and nothing more. It does not know about game logic, engines, or deployment. Its reference application publishes to a local ML01 nginx preview at `gameui.donfather.site` and goes nowhere else. Games built on the framework deploy to Azure Static Web Apps, which is the consuming project's concern and is not tracked here.

## Context Loading

Agents working on this repository should load context in this order:

1. This file (`AGENTS.md`), which covers repository identity, constraints, and conventions
2. `README.md` for project overview and current state
3. `docs/project-charter.md` for frozen scope, architecture, and acceptance criteria
4. `internal-files/one-pager-html5-game-ui-framework.md` for the reasoning behind those commitments: why each constraint is load-bearing, where the requirements came from, and what is still open. **This file is gitignored and is absent from every public clone. If it is not present, that is normal; continue with the remaining steps.**
5. `docs/documentation-standards/` for templates and standards to follow
6. Any domain-specific docs referenced below

The charter is authoritative. Where the one-pager and the charter disagree, the charter wins and the disagreement is a defect in the one-pager.

`AGENTS.md` is a router. It carries identity, the non-negotiable constraints, and pointers. Architecture, scope, acceptance criteria, and rationale live in the charter. Templates and vocabulary live in `docs/documentation-standards/`. Do not duplicate them here.

## Architectural Constraints

These are non-negotiable. Each exists because violating it breaks something an agent cannot see from inside a single task.

- **Never regenerate golden images.** Golden approval is an operator action, with the same posture as pushes and merges. An agent that breaks a golden and regenerates it has deleted a failing test, and a regenerated capture looks like work product rather than like a deletion. When a golden fails, stop and surface the diff.
- **No raster assets in the framework or its themes.** Texture, ornament, and frames are produced with CSS and inline SVG. The framework raster count is a published metric and its correct value is zero.
- **No module may depend on another module.** Modules compose core primitives. A primitive that two modules both need is promoted to core, never shared sideways.
- **Frozen token names are API.** Renaming a semantic token is a major version. Values stay tunable until v1.0; the vocabulary does not. No hue-named tokens (`pink`), no domain-named tokens (`mana`, `hp`, `xp`).
- **Harvest requirements and technique, never source.** Reference packs under `reference-files-*` may be read to learn what a component must do and how an effect is achieved. Their rule blocks, markup, and files are never copied into this repository. Their licences prohibit redistribution as a component library, and this repository is exactly that. A pack with no local licence file records that no terms were in the archive, not that it is restricted; because nothing from a pack is redistributed, a missing terms file never gates derived-technique work. A pack whose terms forbid derived products is the one exception and is studied for nothing.
- **A component without a registered scenario is incomplete.** Scenario registration ships in the same change as the component, not afterward.

## Candidate Coordination

A capability can originate in either track. It may start in a game and be backported when the game finishes, or start in the framework, feed a game that works out its kinks, and have the refined version backported later. Origin is not fixed; the framework and games are two independent tracks that meet only at backport.

Backport is one-way and one-time. A game in flight pins the framework version it started on and rides it to completion; the framework never reaches into an active game, and a framework change never forces an update on a game already building. When a game finishes, or when a game surface is already mature enough to seed the framework, that result is reviewed once and folded in. There is no live sync and no mid-flight reconciliation.

The single scheduling constraint is one owner at a time: two tracks do not actively iterate the same surface in parallel. A surface a game is currently proving is not also built in the framework until that game backports it; everything no live game is actively proving is free to build in the framework now. The capability map in `docs/reference-corpus/` applies this rule to its ranked lanes and queue.

## Documentation Conventions

- All Markdown files require YAML frontmatter (see `docs/documentation-standards/tagging-strategy.md`)
  - Exempt: standard repo furniture (CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, licenses), template files in `docs/documentation-standards/`, and source materials in `internal-files/`
- New directories require an interior README (see `docs/documentation-standards/interior-readme-template.md`)
- Script files require language-appropriate headers (see `docs/documentation-standards/script-header-*.md`)
- Follow dual-audience commenting (see `docs/documentation-standards/code-commenting-dual-audience.md`)
- Follow writing style conventions (see `docs/documentation-standards/writing-style-guide.md`)
- Agents never coin tags. Record vocabulary gaps for operator triage and use the closest existing value.
- Agents never delete files; move unnecessary files to `recycle-bin/` with documented justification

## Executing a Work Spec

Repositories are flat peers under `/opt/agents/repos/`. The spec queue and work logs are shared estate directories at that same level, not a parent workspace:

```
/opt/agents/repos/
├── html5-game-ui-framework/   # this repository
├── cluster-coordination-office/
├── local-agent-skills/        # lifecycle skills
├── spec/                      # active spec queue
└── work-logs/                 # worklogs and registry
```

1. Run the `spec-startup` skill before the first deliverable. Confirm the tree is clean, then branch as `spec/YYYY-MM-DD-h5gameui-NN-topic` off the default branch.
2. Read the spec in full before the first change.
3. Work the deliverables in the spec's execution order. One commit per gate, each referencing its gate number.
4. Append to a single worklog in `/opt/agents/repos/work-logs/` at each gate; seal it at the end. A worklog mirrors its spec filename with `spec` replaced by `worklog`, so `2026-07-26-h5gameui-spec-00-repository-hydration-and-init.md` produces `2026-07-26-h5gameui-worklog-00-repository-hydration-and-init.md`.
5. Run the `spec-closeout` skill. It performs the docs and consistency passes, commits locally, writes the worklog, appends the registry row, and archives the spec into its month folder.

Agents commit locally and never push. The operator reviews, pushes, and merges.

## Commit Messages

- Present tense, imperative mood
- 72-character first line limit
- Reference the gate number in parentheses, for example: `Freeze semantic token vocabulary (1.0.2)`
- Reference issues after the first line

## Session Pattern

1. Load context (this file, README, charter)
2. Work within defined scope
3. Document changes appropriately
4. Update work-logs if significant work completed
