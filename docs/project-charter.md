<!--
---
schema: fixed-address-doc-v1
document_type: project-charter
status: Active
owner: "VintageDon"
updated: 2026-09-15
title: "html5-game-ui-framework Project Charter"
description: "Frozen scope, architecture, and acceptance criteria for a renderer-agnostic browser game UI framework"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-07-25"
version: "1.7"
tags:
  - type: charter
  - domain: foundations
  - tech: [css, javascript, svg, playwright]
related_documents:
  - "[html5-game-ui-framework](https://github.com/vintagedon/html5-game-ui-framework)"
  - "[AGENTS.md](../AGENTS.md)"
  - "[Tagging Strategy](documentation-standards/tagging-strategy.md)"
---
-->

# html5-game-ui-framework Project Charter

## 1. Identity and Purpose

`html5-game-ui-framework` is a renderer-agnostic UI framework for browser games, built on DOM and CSS, whose reference application is simultaneously its component registry, dependency auditor, metrics dashboard, interaction runner, and visual regression suite. Documentation and conformance are generated from one source, so they cannot drift.

It exists because the available options force a choice between kits that ship megabytes of licensed raster art and hand-rolling chrome per project. This project takes the third path: a small, themeable, text-only kit whose visual identity comes from CSS and inline SVG technique rather than image files, validated against real games rather than a gallery of specimens.

The repository is public and MIT licensed, the same posture as every other repository in this estate. The framework is a portfolio artifact and shared internal tooling rather than a commercial product: no paid tier, no marketplace listing, no licensing arrangement.

The framework itself is never deployed. Its reference application is served as a local preview at `gameui.donfather.site` and goes nowhere else. Games built on the framework deploy to Azure Static Web Apps, and that is the consuming project's concern rather than this one's.

---

## 2. Scope and Boundaries

**In scope (v1):**

- A three-tier token contract (primitive, semantic, component) with frozen semantic vocabulary
- Declared cascade layer order, `:where()` zero-specificity wrapping, and `color-mix()` state derivation
- Four themes, switched by a root attribute rather than by stylesheet topology: **modern** (default), **arcade**, **sci-fi**, and **fantasy**. Each is an independently removable file in the theme layer overriding semantic tokens only, so removing a theme file leaves a working modern default.
- Core primitives, added only under consumer pressure
- Modules composed from core primitives
- A reference application driven by a machine-readable scenario registry
- A Playwright scenario runner with golden image comparison against approved captures
- A computed metrics block rendered from the repository rather than hand-entered
- The game stage contract: one 1920x1080 logical layout, uniformly scaled to the three supported 16:9 presentation targets (section 4.1.1), with DOM chrome composed over a renderer-owned playfield
- Rogue Cellar Starter as the first integration target, held locally and never published

**In scope (v2/future):**

- Additional consumers beyond the first
- One published demo game, an original built against the proven framework
- A dialogue and visual-novel module, deferred until Within Parameters completes its current delivery sequence
- A tier scale beyond the status family, evidenced by three independent card and inventory sources

**Out of scope:**

- A layout engine, immediate-mode builder, or UI DSL. The browser supplies DOM, flexbox, grid, focus handling, accessibility semantics, and CSS animation. Reimplementing them turns this into engine development.
- Commercial distribution of any kind, including itch.io listings, marketplace bundles, and paid licensing
- `file://` operation. Games built on this framework ship over https, so the framework does not carry the constraints `file://` support imposes on Playwright configuration, bundle targets, and font delivery.
- Cross-browser pixel goldens. Font rasterization makes cross-platform pixel equality an expensive false target.
- Separate game layouts for mobile, portrait, ultrawide, 720p, or other resolutions and aspect ratios. Non-matching browser windows fit the same logical stage as defined in section 4.1.1.
- Redistribution of any harvested reference pack, in whole or in minimally modified form

**Critical constraint: agents never regenerate golden images.** Golden approval is an operator action carrying the same posture as pushes and merges. An agent that breaks a golden and regenerates it has deleted a failing test, and a regenerated capture looks like work product rather than like a deletion.

**Critical constraint: no raster assets in the framework or its themes.** Texture, ornament, and ornamental frames are produced with CSS and inline SVG. The rule covers what ships to a running game. Repository documentation art under `assets/` is outside it and is tracked normally. Consumer game art is out of scope for this rule because consumer games are not tracked in this repository.

**Critical constraint: no module may depend on another module.** Modules compose core primitives. A primitive that two modules both need is promoted to core rather than shared sideways.

**Critical constraint: frozen token names are API.** Renaming a semantic token is a major version. Exact values (spacing, color, shadow, motion timing) remain tunable until v1.0; the vocabulary and invariants do not.

**Critical constraint: harvest requirements and technique, never source.** Reference packs may be read to learn what a component must do and how an effect is achieved. Their rule blocks, markup, and files are never copied into this repository. The applicable pack licences prohibit redistribution as a component library, and a public repository is exactly that.

---

## 3. Objectives and Acceptance Criteria

### Primary Outcome

A browser game UI framework that a consumer game can adopt without a build step or an external runtime dependency, themed by swapping a root attribute, with every component's states, keyboard behavior, and appearance held stable by an automated regression suite that runs from the same registry the documentation renders.

### Secondary Outcome

A demonstrated methodology: specification-driven agent execution against a conformance surface that makes drift visible rather than relying on review to catch it.

### Acceptance Criteria

**Foundations:**

- Semantic token names are declared and marked frozen, with no hue-named and no domain-named entries
- Cascade layer order is declared in one place and every component rule sits inside a layer
- Component rules are wrapped in `:where()` so consumer overrides need no specificity escalation
- Four themes render the same markup with no change to stylesheet topology
- Interactive state derives from base tokens via `color-mix()` rather than being enumerated per theme
- Game UI uses the fixed logical stage and supported presentation targets in section 4.1.1; typography, spacing, and component geometry scale together without resolution-dependent reflow

**Harness:**

- Every specimen declares dependency level, required tokens, theme and viewport coverage, initial state, scripted interactions, and named capture checkpoints
- The reference application renders entirely from that registry
- Playwright consumes the same registry with no duplicated scenario definitions
- A module declaring a dependency on another module renders as a visible failure on the page, not only in the test run
- Golden captures are committed and compared; a diff fails the run

**Metrics:**

- The metrics block is computed from the repository at build time, with no hand-entered values
- Its scanned paths and exclusions are declared in one place before implementation, so every count states what it counted
- It reports raw and minified CSS and JavaScript size, compressed package size, foundation, core and module counts, theme count, framework raster asset count, external network request count, registered scenario and capture counts, dependency violations, and accessibility failures
- Framework raster asset count is zero. The count covers framework and theme paths, meaning what ships to a running game. Repository documentation art is excluded and the exclusion is declared rather than implied
- External network request count is zero

**Consumer integration:**

- Rogue Cellar Starter runs with `src/app.js` and `styles.css` replaced by framework composition, with `simulation.js`, `renderer.js`, and `input.js` unmodified
- The game stage presents the same layout at 1920x1080, 2560x1440, and 3840x2160, at scale factors 1, 4/3, and 2 respectively
- At those targets, visible content and controls fit their stage regions, enabled controls receive real pointer and keyboard input, and scaling preserves geometry; a clipped base layout fails even when its scaling is uniform
- Non-matching browser windows preserve the complete 16:9 stage through uniform fit and centered letterboxing; they do not introduce another game layout
- Its integration is registered as scenarios with a fixed seed and scripted input

---

## 4. Project Details

### 4.1 Technology and Methodology

DOM and CSS, ESM JavaScript, inline SVG for iconography and generated texture. No build step required for consumption. No external runtime dependency. Node and Playwright are development tooling only.

**Frozen decisions.** These are API-adjacent and are settled here so no spec has to invent them.

| Decision | Value | Reason |
|----------|-------|--------|
| Token prefix | `--gc-` | Continuous with the predecessor, so harvested rules port without renaming. Short enough to read inline. |
| Game display | One 1920x1080 logical stage; supported presentation targets 1920x1080, 2560x1440, and 3840x2160, all 16:9. See section 4.1.1. | Author and validate one layout; uniform scaling preserves the composition across the supported set. |
| Browser floor | Chrome and Edge 125, Safari 16.4, Firefox 128 | The binding features are `color-mix()` (Chrome 111), `round()` (Chrome and Edge 125), `@property` (Safari 16.4, Firefox 128), and `oklch()`. `@layer`, `:where()`, container queries, `backdrop-filter`, and SVG filters all clear that floor. No fallbacks are written for anything below it. The harness floor manifest and check under `harness/floor/` verify the manifest agrees with this row and that each declared feature form appears as a substring in published source with requirements the floor clears; argument-form assumptions such as same-type `round()` arguments are operator-reviewed declarations, not machine-verified. |
| Colour mixing space | OKLCH | Lightness is perceptually uniform, so one state-derivation recipe behaves the same against a near-black arcade base and a warm parchment fantasy base. sRGB mixing desaturates through grey and would need per-theme correction, which is exactly what `color-mix()` exists to avoid. |
| Theme selector | `<html data-gc-theme="modern">` | Matches the token prefix. One attribute, no reload, no stylesheet swap. |
| Icon geometry | Two families. **Chrome and input prompts** (Core): 24 by 24 viewBox, stroke-based, 2-unit stroke, round caps and joins, `stroke="currentColor"`, no fill except explicit optical corrections, 2-unit safe area. **Content** (shipped with the module that needs it): canonical 32 by 32 viewBox, filled silhouette, up to three local slots (`base`, `accent`, `rim`) bound to semantic or component tokens at the use site, no literal colours, geometry unchanged across themes. | Chrome icons sit inside buttons beside text, so inheriting text colour is correct and a second tone at 24 pixels reads as mud. Content icons carry per-theme recolouring through their three slots. No icon fonts, which are monochrome-only and cannot do either. |
| Glyphs and roles | Separate layers. A **glyph ID** names a concrete visible object: `sword`, `shield`, `potion-bottle`. A **semantic role** names a use: `attack`, `defend`, `restore`. A role-to-glyph map resolves one to the other and may differ per theme. | A token can recolour geometry; it cannot replace it. Rendering a broadsword under fantasy and a plasma bolt under sci-fi is a mapping change, not a token change, and conflating the two produces a contract that cannot be implemented. The no-domain-name rule governs token names, not the glyph catalog, where concrete domain nouns are exactly right. |
| Metric scope | The metrics block scans what the framework publishes to a consumer: the token, core, module, and theme source trees. It excludes `assets/`, `docs/`, `internal-files/`, `staging/`, `recycle-bin/`, the `reference-files-*` trees, and any harness or test path | Stated as a rule rather than a path list because the source layout lands in Phase 1. The implementation declares the resolved paths in one file, and every count states what it counted. |

Exact values (spacing, colour, shadow, motion timing) remain tunable. The decisions above do not.

Themes are self-hosted; web fonts, when used, are self-hosted OFL or Apache faces counted in the byte budget rather than loaded from a CDN.

Development follows a spec-driven pattern. Specs are authored against this charter, executed by coding agents on branches, and reviewed and merged by the operator. Agents do not push. The reference application is the conformance surface: a spec's output is checked against it rather than against reviewer memory.

### 4.1.1 Game Display Contract

**Operator decision, 2026-09-14.** Design game UI at **1920x1080 logical CSS pixels**, with a fixed **16:9** aspect ratio. This replaces the earlier consumer criterion requiring multiple aspect ratios. A 1440p mockup must be normalized to the 1080p coordinate system before implementation; it does not define a second layout.

| Supported content viewport | Uniform scale |
|----------------------------|---------------|
| 1920x1080 (1080p) | 1 |
| 2560x1440 (1440p) | 4/3 |
| 3840x2160 (2160p) | 2 |

The dimensions describe the available browser content area in CSS pixels, not the monitor's advertised resolution. Device pixel ratio affects renderer backing-store sharpness, not the logical UI dimensions or the choice of layout. Consumer renderers retain ownership of their drawing resolution.

For an available host of width `W` and height `H`, use `s = min(W / 1920, H / 1080)`. Center the displayed `1920s` by `1080s` stage in the host; unused space forms letterbox or pillarbox bars. Intermediate sizes and smaller windows use the same fit operation, including fractional downscaling, without adding supported layout targets. Never stretch the axes independently or crop the stage to fill a window. Scale is continuous, not snapped to three values; the three resolutions are the required acceptance targets. The logical stage stays fixed even when its displayed size is smaller than 1080p.

All game chrome, text, controls, and overlays share that coordinate system. Width-, height-, and orientation-based layout breakpoints do not rearrange the game. Internal percentages resolve against stage regions; raw viewport units such as `vw` and `vh` must not drive stage-internal geometry or typography. The outer fit host may measure the browser window. Consumer composition determines the internal playfield, rail, and panel split within the stage; this contract does not impose a universal 78/22 split or a 16:9 aspect ratio on each internal panel.

Content must fit its authored 1080p region, with intentional internal scrolling where a surface needs it. Uniform scaling cannot repair overflow already present at the base size. DOM input must remain aligned with displayed controls; canvas or engine input adapters account for the stage offset and scale in their own integration boundary.

The reference application's navigation, documentation, and metrics are ordinary browser tooling. Game specimens and consumer compositions use the stage contract; the surrounding documentation may remain scrollable. Game conformance covers the three presentation targets. A bounded host-fit check may verify centering and letterboxing without creating a portrait, mobile, or sub-1080p layout matrix.

**Implementation status:** the requirement is adopted ahead of runtime enforcement. The current source has no shared stage host, and the registry still records legacy 1280x800 and 480x900 specimens. The [display contract review](display-contract-review-2026-09-14.md) identifies the implementation and baseline transition. Existing consumer pins remain in force; active games adopt through their own migration units or later backport decisions.

### 4.2 Architecture

Four layers, with dependency flowing in one direction only.

| Layer | Contains | May Depend On |
|-------|----------|---------------|
| Foundations | Token tiers, typography roles, spacing and sizing scales, motion, focus and state rules, cascade layer order, theme interface, canvas host and viewport behavior | Nothing |
| Core | Button, icon button, badge, chip, panel, card, meter, progress and segmented meter, tabs, dialog, drawer, toast and notification region, toggle, slider, select, tooltip, shell, rail, toolbar, viewport host | Foundations |
| Modules | HUD resource strip, event and combat log, inventory grid, dialogue panel and choices, reward selection, character dossier, route or quest tracker, pause screen, settings screen, main menu, save slot browser, touch control overlay | Foundations, Core |
| Consumers | Integration recipes and the per-game boundary between framework and game | Foundations, Core, Modules |

A component enters Core only when more than one plausible consumer can use it without translating a game concept into it. Foundations are designed deliberately because they are public API. Core and Modules are discovered under consumer pressure rather than decreed in advance.

The reference application renders all four layers from the scenario registry. Layer membership is declared per component, not inferred from selectors or imports.

**Harvest corpus.** The framework's requirements derive from artifacts that exist rather than from imagination. Sources are held locally and gitignored:

| Source | Contributes |
|--------|------------|
| `gameui-browser-gaming-framework` (predecessor) | Thirteen component families, gallery, Playwright baseline, publish flow |
| Blastemoids template | Requirements catalog: menu, pause, settings, stats, high scores, extra-life, wave transition, versioned storage, gamepad and virtual controls |
| Rogue Cellar Starter | Canvas host, HUD chips, tabbed rail, log, inventory, icon controls |
| Within Parameters | Dialogue, route tracker, dossier, reward cards, resource meters |
| `neon-ui-mega-bundle` | Neon technique; also the origin of the predecessor's hue-named accent |
| `obsidian-grimoire-ui` | Dark fantasy technique and the six raster files the zero-raster spike replaces; origin of the predecessor's domain-named accent |
| `achievement-toast-*` | Module packaging shape: core split from demo shell, API and theme docs, examples, JSON presets |
| `impact-juice-*` | Motion expressed as data: hitstop, shake, flash, popup, and SFX pairing recipes |
| Card and inventory packs | Evidence for an ordered tier scale distinct from the status family |
| Save and settings packs | The best-evidenced module in the corpus, converging from four independent sources |

### 4.3 Roadmap

**Phase 0: Repository hydration**

- Charter, AGENTS.md, primary README, tagging strategy
- Interior READMEs, filename normalization, frontmatter conformance, writing-style pass

**Phase 1: Foundations**

- Token contract with frozen semantic vocabulary
- Cascade layers, `:where()` wrapping, `color-mix()` state derivation
- Theme mechanism and four themes
- Zero-raster technique spike against the dark fantasy theme
- A thin reference surface: one hand-authored page rendering the token scales, the four themes under the root switch, and the spike output. No registry, no runner, no goldens. It exists because a token contract that can only be read is not verifiable, and because the spike needs somewhere to render.

**Phase 2: Harness**

- Scenario registry format
- Reference application rendering from the registry, replacing the Phase 1 surface
- Playwright runner consuming the same registry
- Golden capture and comparison workflow
- Computed metrics block

**Phase 3: First consumer**

- Rogue Cellar integration, replacing its UI layer only
- Core primitives and modules built only as that integration forces them
- Each registered as a tested scenario as it lands
- Canvas host contract formalized against a real playfield
- Shared 1080p stage fit implemented and verified before new game compositions depend on it, with the legacy capture matrix transitioned through the baseline approval process

**Phase 4: Breadth**

- Additional consumers
- Within Parameters migration, after its current delivery sequence completes
- One original published demo game

---

## 5. Security and Compliance

This project has no regulatory obligations. It has licensing obligations, and they are the reason several boundaries in Section 2 exist.

Reference packs under `reference-files-assets/`, `reference-files-games/`, and `reference-files-ui/` are third-party licensed material held locally and excluded from version control. The applicable licences permit use and modification inside finished projects, and prohibit uploading, redistributing, or repackaging the source as templates, starter kits, asset packs, component libraries, or repositories. A public GitHub repository containing that source would breach those terms, and the prohibition is not lifted by the repository being free.

The permitted use is a finished end product. Consumer games deployed to `donfather.dev` or `donaldfountain.ai` are finished end products, and the licences state that normal browser delivery exposing client-side HTML, CSS, and JavaScript is permitted.

Third-party notice obligations that travel into a build are recorded in the consumer game, not in the framework. ROT.js is BSD-3-Clause and requires its copyright notice in any deploy that bundles it.

---

## 6. Operations, Support, and Maintenance

The framework has one deploy and it is a preview. `publish.sh` copies the reference application to `/opt/agents/www/gameui/`, where ML01 nginx serves it at `gameui.donfather.site` over the wildcard certificate. Resolution is hosts-file only, so the preview is internal and nothing about it is publicly reachable. The framework is not published to Azure Static Web Apps or anywhere else; the public artifact is the GitHub repository. Where a consuming game deploys is that game's business and is not tracked here.

The reference application is the maintenance surface. Metrics regenerate from the repository on each build, so the headline claims are either true at build time or visibly false. Golden captures are reviewed and approved by the operator on any intentional visual change and are never regenerated by an agent.

Theme and component additions carry their scenario registration in the same change. A component without a registered scenario is incomplete regardless of whether it renders.

---

## 7. Dependencies and Relationships

| Dependency | Relationship | Type |
|-----------|-------------|------|
| `gameui-browser-gaming-framework` | Predecessor; harvest source for components, gallery, and Playwright baseline. Preserved at `/opt/agents/repos-archive/gameui-browser-gaming-framework/`, not merged. | Upstream |
| `within-parameters-visual-novel` | Live consumer of the predecessor. Pinned to its vendored copy until its current delivery sequence completes. | Peer |
| Reference packs (Template Foundry and others) | Requirements and technique reference. Gitignored, never redistributed. | External data |
| Rogue Cellar Starter | First integration target. Held locally, never published. | External data |
| ROT.js | Bundled by Rogue Cellar under BSD-3-Clause. Notice travels with any deploy. | Upstream |
| ML01 nginx preview | Serves the reference application at `gameui.donfather.site`. The framework's only deploy. | Infrastructure |
| `project-template-repository` | Scaffolding source for documentation standards and agent conventions. | Upstream |

---

## 8. Metadata and History

| Field | Value |
|-------|-------|
| Author | VintageDon |
| Created | 2026-07-25 |
| Version | 1.6 |
| Status | Active |
| Repository | https://github.com/vintagedon/html5-game-ui-framework |

### Source Documents

| Document | Role |
|----------|------|
| `internal-files/one-pager-html5-game-ui-framework.md` (this repo) | Portable context unit. Written after this charter to hold the reasoning it compresses away. This charter is authoritative where the two disagree |
| `one-pager-html5-game-ui-framework.md` (predecessor repo, archived) | Earlier ideation capture for the predecessor effort. Superseded on commercial posture, `file://` operation, and consumer selection. Historical reference only |
| GDR outputs, three passes | Convergent research on modular architecture and zero-raster visual language |
| `gameui-browser-gaming-framework` charter and README | Predecessor scope and shipped component inventory |

### Lineage

On 2026-09-15, charter v1.7 raises the Chrome and Edge browser floor from 111 to 125, naming CSS `round()` as binding alongside `color-mix()`, `@property`, and `oklch()`; discrete meter quantization requires it, and no fallback is written below the floor. Safari 16.4 and Firefox 128 are unchanged; the `round()` expressions in published source use same-type percentage arguments, which Safari clears at 15.4, so mixed-type argument forms remain out of use and would be an operator decision if introduced. The declared floor and published source are now compared automatically by the floor manifest and check under `harness/floor/`.

On 2026-09-14, charter v1.6 records the operator's 1080p-based 16:9 display decision and limits supported presentation targets to 1080p, 1440p, and 2160p. Section 4.1.1 supersedes the previous multiple-aspect-ratio consumer criterion. Runtime enforcement remains follow-up work; this amendment does not change the browser-floor decision or authorize baseline replacement.

The project began as an itch.io commercial exercise and was reframed twice. The first reframe dropped commercial distribution, which removed the provenance and sellable-standard arguments for a ground-up rebuild and left only the predecessor's genuine technical debt. The second reframe dropped `file://` operation once Azure Static Web Apps became the deployment target, which removed a Playwright configuration, a classic bundle target, and a font delivery constraint that had each been built on top of the original storefront requirement.

The reference application's role was settled last. A survey of a CSS effects catalog supplied the browsing model, an existing token reference page supplied the contract discipline, and a demo runner with golden image comparison supplied the engineering model. Combining them turns the reference page from a demonstration of what was built into the surface that defines what components must satisfy.

### Multi-Model Contribution

| Model | Contribution |
|-------|-------------|
| Claude (Opus 5) | Repository and corpus review, harvest genealogy, constraint scoping, charter authorship |
| GPT (5.6 Sol) | Four-layer architecture proposal, metric definitions, golden environment pinning, sequencing correction |
| Gemini 3.1, GPT 5.6 Sol High, Fable 5 | Independent deep research passes on modular architecture and zero-raster visual language |
