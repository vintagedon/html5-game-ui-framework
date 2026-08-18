<!--
---
title: "UI Pack Capability Map"
description: "Ranked operator review surface derived from the UI reference corpus catalog"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-17"
version: "1.1"
status: "Active"
tags:
  - type: report
  - domain: [research, consumers]
  - tech: [node]
related_documents:
  - "[Reference Corpus README](README.md)"
  - "[UI Pack Inventory](ui-pack-inventory.json)"
  - "[Project Charter](../project-charter.md)"
---
-->

<!-- catalog-digest: sha256:e88a590049b39f1f2c6c57163dbd635087ecfc9af6f9a2258e3123caae5313bc -->
<!-- derivation: every table row and count below traces to ui-pack-inventory.json; the test suite fails this document when the catalog changes without regeneration -->

# UI Pack Capability Map

This map is the operator decision surface for the private UI reference corpus. It is derived from the canonical catalog ([ui-pack-inventory.json](ui-pack-inventory.json)) and recommends; it does not decide. Nothing on this page authorizes a component, theme, game, or downstream spec. Approval happens only when the operator answers the [UIREF review questions](#8-review-findings-and-questions).

**Coordination rule (binding for later work):**

1. A candidate has one active implementation owner.
2. If an independent framework module lands before a game dispatches, that game may pin and consume it.
3. If a game has already started, it does not repin GameUI mid-spec. It finishes its game-local candidate, and later backport or reconciliation decides the framework result.
4. Reference labs may proceed in parallel when they do not claim ownership of a runtime module under active development.

---

## Operator Resolutions (2026-08-16)

The operator has answered the licensing and coordination questions. The remaining UIREF items are forward-queue choices, not blockers.

- **UIREF-001 confirmed.** Licenses complete but silent on attribution are recorded as `attribution: not-supported`.
- **UIREF-002 and the no-terms cluster resolved.** The operator holds the vendor terms for these packs externally (predominantly Template Factory / Foundry, whose terms permit derived products), and the framework's posture is derived-technique-only under a never-copy rule, so no pack source is ever redistributed. A missing local terms file therefore records that nothing was in the archive, not a restriction, and does not gate derived work. All corpus packs are cleared for derived-technique use; the thirteen packs previously held for licence review are recorded as `derived-technique-only`, and licence review no longer gates CAP-007, CAP-008, CAP-009, CAP-010, or CAP-017. The one estate exception, an asset whose terms forbid derived products, is not part of this corpus.
- **UIREF-008 adopted.** The coordination rule above is standing policy and is codified in the framework `AGENTS.md`.

The §2 posture tables and §5 readiness cells below reflect this resolution and the reconciled 28-pack catalog; the §5 rubric factor scores still record the executor's original evidence audit, with licensing clarity scored before the resolution. UIREF-005, 006, 007, 009, and 010 remain open as the operator's next-queue choices.

---

## 1. Corpus Snapshot and Coverage Reconciliation

| Measure | Value |
|---|---|
| Immediate packs | 28 |
| Recursive files | 6407 |
| Total bytes | 201459226 (192.1 MiB) |
| Extension counts | .aseprite 33, .cs 1, .css 20, .csv 2, .gd 1, .gif 2, .gpl 1, .html 70, .js 52, .json 119, .md 77, .ogg 64, .ora 1, .png 4765, .ps1 2, .py 2, .rpy 2, .svg 969, .txt 14, .wav 188, .webp 22 |
| Corpus digest | `sha256:dc44ad604c7f5ba8ea9d399cbb556bcafccd8e377ebe7583ce93e6f89bc525a0` |

Coverage reconciles one-for-one: the source audit (`npm run corpus:audit`, ML01 only) confirms every immediate child directory of `reference-files-ui/` has exactly one pack record, every recorded count and digest recomputes from the live tree, and every cited evidence path exists. Five genuinely empty directories exist in the corpus and are recorded as findings, not repaired: `inventory-grid-grabber-html5/rosebud`, `progression-system-complete/neon-ui-sliders-and-bars-pack`, `skill-progression-system-complete/neon-ui-notifications-popup-pack`, `ui-tabs-fantasy-html5-tabs-pack/rosebud`, and `ui-tabs-fantasy-html5-tabs-pack/rosie/controls`. No symbolic links exist and no path resolves outside the root.

Four packs were added when the corpus grew from 24 to 28: `8bit-rpg-bars-ui-pack` and `impact-signal-combat-feedback-pack` are evidence-bearing corpus members, while `emberguard-combat-pixel-pack` and `pixel-combat-button-ui-pack-v1.0.1` are private, test-only, non-ranking feel-test fixtures (see §2 and §3).

## 2. License and Provenance Posture

Every pack in the corpus is licensed third-party or locally exported material. This repository is a public component library, and the operator resolution of 2026-08-16 (UIREF-002) clears every corpus pack for derived-technique use under the never-copy rule: requirements and technique may be learned, source is never copied or shipped. The shipping posture across all 28 packs is therefore `derived-technique-only`. Facts are grounded either in local pack terms, where they exist, or in the operator resolution, which holds the vendor terms externally.

| Evidence strength | Packs | Consequence |
|---|---|---|
| Pack license file present (14 packs) | `8bit-rpg-bars-ui-pack`, `achievement-toast-notification-system-html5`, `emberguard-combat-pixel-pack`, `gilded-grove-alchemy-card-pack`, `impact-juice-combat-polish-bundle`, `moonlit-pact-vn-gui-kit-renpy`, `obsidian-grimoire-ui`, `pixel-combat-button-ui-pack-v1.0.1`, `pixel-combat-text-status-fx-kit`, `runic-fantasy-ui-tabs`, `runic-relic-rpg-icons-144`, `tiny-save-settings-menu-starter`, `tiny-ui-sfx-pack`, `ui-feedback-sfx-pack-v2` | Facts recorded from local terms; posture `derived-technique-only` |
| README carries or defers to external terms (3 packs) | `equipment-compare-ui-pack`, `explorer-map-ui-pack`, `impact-signal-combat-feedback-pack` | Facts grounded in the operator resolution, which holds the vendor terms externally; posture `derived-technique-only` |
| No terms found locally (11 packs) | `card-system-pixel`, `inventory-grid-grabber-html5`, `inventory-loot-and-legend-inventory-pro`, `neon-rpg-icon-pack`, `neon-ui-mega-bundle`, `progression-system-complete`, `quest-journal-codex-ui-kit`, `skill-progression-system-complete`, `ui-rpg-cards`, `ui-tabs-fantasy-html5-tabs-pack`, `ui-theme-dark-fantasy` | A missing local terms file records that nothing was in the archive, not a restriction (operator resolution); posture `derived-technique-only` |

| Pack | License evidence | Use / redistribution / attribution | Shipping posture |
|---|---|---|---|
| `8bit-rpg-bars-ui-pack` | pack-license-file | supported / not-supported / not-supported | derived-technique-only |
| `achievement-toast-notification-system-html5` | pack-license-file | supported / not-supported / not-supported | derived-technique-only |
| `card-system-pixel` | none-found | supported / not-supported / not-supported (operator resolution) | derived-technique-only |
| `emberguard-combat-pixel-pack` | pack-license-file | supported / not-supported / not-supported | derived-technique-only |
| `equipment-compare-ui-pack` | readme-external-terms | supported / not-supported / not-supported (operator resolution) | derived-technique-only |
| `explorer-map-ui-pack` | readme-external-terms | supported / not-supported / not-supported (operator resolution) | derived-technique-only |
| `gilded-grove-alchemy-card-pack` | pack-license-file | supported / not-supported / not-supported | derived-technique-only |
| `impact-juice-combat-polish-bundle` | pack-license-file | supported / not-supported / not-supported | derived-technique-only |
| `impact-signal-combat-feedback-pack` | readme-external-terms | supported / not-supported / not-supported | derived-technique-only |
| `inventory-grid-grabber-html5` | none-found | supported / not-supported / not-supported (operator resolution) | derived-technique-only |
| `inventory-loot-and-legend-inventory-pro` | none-found | supported / not-supported / not-supported (operator resolution) | derived-technique-only |
| `moonlit-pact-vn-gui-kit-renpy` | pack-license-file | supported / not-supported / not-supported | derived-technique-only |
| `neon-rpg-icon-pack` | none-found | supported / not-supported / not-supported (operator resolution) | derived-technique-only |
| `neon-ui-mega-bundle` | none-found | supported / not-supported / not-supported (operator resolution) | derived-technique-only |
| `obsidian-grimoire-ui` | pack-license-file | supported / not-supported / not-supported | derived-technique-only |
| `pixel-combat-button-ui-pack-v1.0.1` | pack-license-file | supported / supported / supported (MIT; private test fixture) | derived-technique-only |
| `pixel-combat-text-status-fx-kit` | pack-license-file | supported / not-supported / not-supported | derived-technique-only |
| `progression-system-complete` | none-found | supported / not-supported / not-supported (operator resolution) | derived-technique-only |
| `quest-journal-codex-ui-kit` | none-found | supported / not-supported / not-supported (operator resolution) | derived-technique-only |
| `runic-fantasy-ui-tabs` | pack-license-file | supported / not-supported / not-supported | derived-technique-only |
| `runic-relic-rpg-icons-144` | pack-license-file | supported / not-supported / not-supported | derived-technique-only |
| `skill-progression-system-complete` | none-found | supported / not-supported / not-supported (operator resolution) | derived-technique-only |
| `tiny-save-settings-menu-starter` | pack-license-file | supported / not-supported / not-supported | derived-technique-only |
| `tiny-ui-sfx-pack` | pack-license-file | supported / not-supported / not-supported | derived-technique-only |
| `ui-feedback-sfx-pack-v2` | pack-license-file | supported / not-supported / not-supported | derived-technique-only |
| `ui-rpg-cards` | none-found | supported / not-supported / not-supported (operator resolution) | derived-technique-only |
| `ui-tabs-fantasy-html5-tabs-pack` | none-found | supported / not-supported / not-supported (operator resolution) | derived-technique-only |
| `ui-theme-dark-fantasy` | none-found | supported / not-supported / not-supported (operator resolution) | derived-technique-only |

Interpretation notes, per the operator resolution: licenses that are complete but silent on attribution are recorded as `not-supported` ("no attribution requirement appears in local terms") rather than `unclear` (UIREF-001 confirmed). For packs without local terms, the operator holds the vendor terms externally (predominantly Template Factory / Foundry, whose terms permit derived products) and the never-copy rule means no pack source is ever redistributed, so a missing terms file records absence, not a restriction (UIREF-002). The one estate exception, an asset whose terms forbid derived products, is not part of this corpus. `pixel-combat-button-ui-pack-v1.0.1` ships MIT and would even permit redistribution with notice retention; its private, test-only, non-ranking fixture classification, not its licence, keeps it out of framework ranking.

## 3. Pack-to-Capability Matrix

| Pack | Display name | Source kinds | Capabilities | Overlap groups | Disposition |
|---|---|---|---|---|---|
| `8bit-rpg-bars-ui-pack` | 8-bit RPG Bars UI Pack | visual-source, layout-manifest, data-recipe, documentation | CAP-018 | — | standalone-spec-candidate |
| `achievement-toast-notification-system-html5` | Achievement Toast + Notification System (HTML5) | interactive-code, data-recipe, documentation | CAP-001 | OVL-005 | game-driven-candidate |
| `card-system-pixel` | Card System Pixel (Aseprite card library) | visual-source, editable-source | CAP-011, CAP-012 | OVL-009 | hold-for-consumer |
| `emberguard-combat-pixel-pack` | Emberguard Combat Pixel Pack (private feel-test fixture) | visual-source, data-recipe, documentation | — | — | defer (private test fixture) |
| `equipment-compare-ui-pack` | RPG Equipment Compare UI Pack | visual-source, layout-manifest, data-recipe | CAP-008, CAP-010, CAP-011, CAP-017 | — | game-driven-candidate |
| `explorer-map-ui-pack` | Explorer Map UI Pack | visual-source, layout-manifest, data-recipe | CAP-007 | — | game-driven-candidate |
| `gilded-grove-alchemy-card-pack` | Gilded Grove Alchemy Card Pack | visual-source, layout-manifest, data-recipe | CAP-011, CAP-012 | OVL-009 | hold-for-consumer |
| `impact-juice-combat-polish-bundle` | Impact Juice Combat Polish Bundle | visual-source, audio-source, data-recipe, layout-manifest | CAP-005, CAP-006, CAP-013 | OVL-010 | reference-lab-candidate |
| `impact-signal-combat-feedback-pack` | Impact Signal Combat Feedback Pack | interactive-code, data-recipe, audio-source, visual-source, documentation | CAP-005, CAP-006, CAP-013 | OVL-010 | reference-lab-candidate |
| `inventory-grid-grabber-html5` | GridGrabber Grid Inventory (Rosebud export) | interactive-code, documentation | CAP-010 | OVL-006 | game-driven-candidate |
| `inventory-loot-and-legend-inventory-pro` | Loot and Legend Inventory Pro | interactive-code, visual-source, documentation | CAP-010, CAP-011, CAP-017 | OVL-006 | game-driven-candidate |
| `moonlit-pact-vn-gui-kit-renpy` | Moonlit Pact VN GUI Kit for Ren'Py | visual-source, audio-source, layout-manifest, data-recipe, documentation | CAP-013, CAP-015 | — | defer |
| `neon-rpg-icon-pack` | Neon RPG Icon Pack | visual-source, documentation | CAP-016 | OVL-007 | defer |
| `neon-ui-mega-bundle` | Neon UI Mega Bundle | interactive-code, documentation | CAP-004, CAP-018, CAP-020 | OVL-004 | game-driven-candidate |
| `obsidian-grimoire-ui` | Obsidian Grimoire UI (packaged product) | interactive-code, visual-source, documentation | CAP-004, CAP-018, CAP-021 | OVL-001 | defer |
| `pixel-combat-button-ui-pack-v1.0.1` | Pixel Combat Button UI Pack v1.0.1 (private feel-test fixture) | interactive-code, visual-source, data-recipe, documentation | — | — | defer (private test fixture) |
| `pixel-combat-text-status-fx-kit` | Pixel Combat Text & Status FX Kit | visual-source, editable-source, data-recipe, documentation | CAP-005, CAP-006 | OVL-010 | reference-lab-candidate |
| `progression-system-complete` | Progression System Complete (bundle snapshot one) | interactive-code, documentation | CAP-001, CAP-003, CAP-014, CAP-019 | OVL-003, OVL-004, OVL-005, OVL-011 | game-driven-candidate |
| `quest-journal-codex-ui-kit` | Quest Journal + Codex UI Kit | visual-source, layout-manifest, data-recipe | CAP-001, CAP-009, CAP-017 | — | game-driven-candidate |
| `runic-fantasy-ui-tabs` | Runic Fantasy UI Tabs (cleaned product) | interactive-code, layout-manifest, documentation | CAP-002 | OVL-002 | standalone-spec-candidate |
| `runic-relic-rpg-icons-144` | Runic Relic RPG Icons 144 | visual-source, data-recipe, documentation | CAP-016 | OVL-007 | defer |
| `skill-progression-system-complete` | Skill Progression System Complete (bundle snapshot two) | interactive-code | CAP-001, CAP-003, CAP-014, CAP-019 | OVL-003, OVL-004, OVL-005, OVL-011 | game-driven-candidate |
| `tiny-save-settings-menu-starter` | Tiny Save / Settings Menu Starter | interactive-code, documentation | CAP-002, CAP-003, CAP-004 | OVL-011 | standalone-spec-candidate |
| `tiny-ui-sfx-pack` | Tiny UI SFX Pack (64 procedural WAV) | audio-source, data-recipe, documentation | CAP-013 | OVL-008 | hold-for-consumer |
| `ui-feedback-sfx-pack-v2` | UI Feedback SFX Pack v2 (Template Foundry) | audio-source, data-recipe, documentation | CAP-013 | OVL-008 | hold-for-consumer |
| `ui-rpg-cards` | UI RPG Cards (Aseprite sheets) | visual-source, editable-source | CAP-011, CAP-012 | OVL-009 | hold-for-consumer |
| `ui-tabs-fantasy-html5-tabs-pack` | Runic Tab-Craft (raw Rosebud export) | interactive-code | CAP-002 | OVL-002 | standalone-spec-candidate |
| `ui-theme-dark-fantasy` | Obsidian Grimoire UI (raw Rosebud export) | interactive-code, visual-source | CAP-018, CAP-021 | OVL-001 | defer |

Every pack carries at least one evidence-supported capability or an explicit review disposition; no record is silently empty. The two private feel-test fixtures — `emberguard-combat-pixel-pack` (animated actors, hurt and death states, weapons, and impact targets) and `pixel-combat-button-ui-pack-v1.0.1` (disposable interaction targets with known normal, hover, pressed, and disabled states) — exist to feel-test impact, timing, shake, hit-stop, and readability without building throwaway fixtures. They carry the private, test-only, non-ranking classification with a recorded reason in the catalog, map to no capability, appear in no ranked lane, and no tracked-artifact test depends on their files.

## 4. Overlap and Version-Family Groups

| Group | Relationship | Members | Basis |
|---|---|---|---|
| OVL-001 | version-family | `obsidian-grimoire-ui`, `ui-theme-dark-fantasy` | Two snapshots of the Obsidian Grimoire product: a raw March 2026 Rosebud export and the packaged 1.1.0 product that carries license and docs. |
| OVL-002 | version-family | `runic-fantasy-ui-tabs`, `ui-tabs-fantasy-html5-tabs-pack` | Two snapshots of the fantasy tabs product: the raw Runic Tab-Craft Rosebud export and the cleaned upload that ships license, manifest, and docs. |
| OVL-003 | version-family | `progression-system-complete`, `skill-progression-system-complete` | Two snapshots of the progression bundle with 15 shared sub-pack names and version drift (for example idle-factory v2 versus v4 and clicker3 versus clicker-3). |
| OVL-004 | duplicate | `neon-ui-mega-bundle`, `progression-system-complete`, `skill-progression-system-complete` | The mega-bundle sliders-and-bars pack and its standalone variant carried inside both progression bundles. |
| OVL-005 | complementary-source | `achievement-toast-notification-system-html5`, `progression-system-complete`, `skill-progression-system-complete` | Independent notification implementations at different depths: a documented drop-in system and component-level notification packs. |
| OVL-006 | complementary-source | `inventory-grid-grabber-html5`, `inventory-loot-and-legend-inventory-pro` | Two inventory systems explicitly cross-referenced as beginner and advanced counterparts. |
| OVL-007 | complementary-source | `neon-rpg-icon-pack`, `runic-relic-rpg-icons-144` | Two RPG icon sets where the engraved SVG pack positions itself against the neon PNG set. |
| OVL-008 | complementary-source | `tiny-ui-sfx-pack`, `ui-feedback-sfx-pack-v2` | Two procedural UI SFX products with parallel category systems and index metadata. |
| OVL-009 | complementary-source | `card-system-pixel`, `gilded-grove-alchemy-card-pack`, `ui-rpg-cards` | Three independent card sources (SVG product, pixel Aseprite family, Aseprite sheet set) that together evidence the ordered tier scale. |
| OVL-010 | complementary-source | `impact-juice-combat-polish-bundle`, `impact-signal-combat-feedback-pack`, `pixel-combat-text-status-fx-kit` | Three combat-feedback sources converging on event-to-response recipes: a polish bundle carrying data recipes, a pixel text and status FX kit, and a cross-engine preset pack with a browser preview. |
| OVL-011 | complementary-source | `progression-system-complete`, `skill-progression-system-complete`, `tiny-save-settings-menu-starter` | Save and settings implementations converging from the starter menu and the save or settings systems carried inside both bundle snapshots. |

Groups record relationships from evidence and do not merge or prefer one purchased source. Where a version family pairs a raw export with a cleaned product, both remain recorded and the family's license question is surfaced rather than silently resolved.

### 4.1 Card-Source Framing and the Two-Treatment Intent (OVL-009)

OVL-009 holds three independent, derived-technique-only card sources — `card-system-pixel` (pixel Aseprite family), `gilded-grove-alchemy-card-pack` (SVG product), and `ui-rpg-cards` (Aseprite sheet set) — which together clear the charter's three-source gate for a card frame family.

**One component, two theme renderings.** The intended treatments are theme renderings of a single card component, not two components: a pixel treatment (arcade theme) and an alchemy treatment (fantasy theme), sharing one slot contract — energy, name, tier, item art, short description, and type or element. The slot contract is the component; the themes dress it.

**Embedded shine reference.** `card-system-pixel` bundles an embedded card-shine and rainbow animation effect (from argametina, not a separately listed pack). It is recorded as a card-shine and holographic technique reference for the cards module, studied as technique only.

**Zero-raster posture.** All card treatments are recreated in CSS and inline SVG and ship no pack raster. The pixel treatment renders pixel-style element bands rather than reproducing any pack's illustrated backgrounds.

### 4.2 Combat-Feedback Lab Deepening (OVL-010)

`impact-signal-combat-feedback-pack` joins `impact-juice-combat-polish-bundle` and `pixel-combat-text-status-fx-kit` in OVL-010, mapping to CAP-005, CAP-006, and CAP-013. Its 20 cross-engine presets deepen the non-owning combat-feedback lab's evidence — per-event timing recipes with an accessibility block, floating-text timing, and paired stingers — without claiming any runtime module. The two private feel-test fixtures exist to exercise exactly this lab's questions (impact, timing, shake, hit-stop, readability) against animated actors and known button states, and are excluded from ranking and from every ranked lane.

## 5. Ranked Candidate Lanes

Three lanes answer three different planning questions and are never collapsed into one master ranking: what a game should prove next (game-driven), what the framework can build without waiting (independent module), and what should be studied before either (reference lab). Rankings use seven rubric factors scored 0 to 3 — evidence depth, framework fit, real consumer pressure, interaction and accessibility value, licensing clarity, boundedness, and overlap safety — with the total shown per factor, never as an unexplained number. Tie-break order: higher total, then licensing clarity, then evidence depth, then ascending capability ID. Readiness `defer` entries are listed but not queueable.

### 5.1 Game-driven candidates

Games prove UI under real play pressure and hand candidates to later backport work.

| ID | Capability | Evidence | Fit | Consumer | Interaction | Licensing | Bounded | Overlap | Total | Readiness | Contributing packs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-001 | Notification region | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 20 | ready-to-spec | achievement-toast-notification-system-html5, progression-system-complete, skill-progression-system-complete, quest-journal-codex-ui-kit |
| CAP-005 | Combat feedback recipes | 3 | 2 | 3 | 2 | 3 | 3 | 3 | 19 | ready-to-spec | impact-juice-combat-polish-bundle, pixel-combat-text-status-fx-kit, impact-signal-combat-feedback-pack |
| CAP-006 | Combat text and status FX presentation | 3 | 2 | 3 | 2 | 3 | 2 | 3 | 18 | ready-to-spec | pixel-combat-text-status-fx-kit, impact-juice-combat-polish-bundle, impact-signal-combat-feedback-pack |
| CAP-015 | VN dialogue and choices | 3 | 3 | 1 | 3 | 3 | 2 | 3 | 18 | defer | moonlit-pact-vn-gui-kit-renpy |
| CAP-002 | Tab set | 3 | 3 | 2 | 3 | 2 | 3 | 2 | 18 | ready-to-spec | runic-fantasy-ui-tabs, ui-tabs-fantasy-html5-tabs-pack, tiny-save-settings-menu-starter |
| CAP-010 | Inventory grid and rarity | 3 | 3 | 2 | 2 | 1 | 2 | 2 | 15 | ready-to-spec | inventory-grid-grabber-html5, inventory-loot-and-legend-inventory-pro, equipment-compare-ui-pack |
| CAP-007 | Map and minimap chrome | 2 | 3 | 2 | 2 | 1 | 2 | 3 | 15 | ready-to-spec | explorer-map-ui-pack |
| CAP-017 | Tooltip and stat deltas | 2 | 3 | 2 | 3 | 1 | 2 | 2 | 15 | ready-to-spec | equipment-compare-ui-pack, inventory-loot-and-legend-inventory-pro, quest-journal-codex-ui-kit |
| CAP-008 | Equipment compare surface | 3 | 3 | 2 | 1 | 1 | 2 | 2 | 14 | ready-to-spec | equipment-compare-ui-pack |
| CAP-009 | Quest journal and codex | 2 | 3 | 1 | 2 | 1 | 2 | 3 | 14 | ready-to-spec | quest-journal-codex-ui-kit |
| CAP-012 | Card frame system | 3 | 2 | 1 | 1 | 2 | 2 | 2 | 13 | needs-game-proof | gilded-grove-alchemy-card-pack, card-system-pixel, ui-rpg-cards |
| CAP-014 | Skill tree and progression UI | 2 | 2 | 1 | 1 | 1 | 2 | 2 | 11 | needs-game-proof | progression-system-complete, skill-progression-system-complete |
| CAP-019 | Idle reward presentation | 2 | 1 | 1 | 1 | 1 | 1 | 3 | 10 | needs-game-proof | progression-system-complete, skill-progression-system-complete |

### 5.2 Independent module candidates

The framework can specify these without a dispatched game, subject to the coordination rule.

| ID | Capability | Evidence | Fit | Consumer | Interaction | Licensing | Bounded | Overlap | Total | Readiness | Contributing packs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-001 | Notification region | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 20 | ready-to-spec | achievement-toast-notification-system-html5, progression-system-complete, skill-progression-system-complete, quest-journal-codex-ui-kit |
| CAP-002 | Tab set | 3 | 3 | 2 | 3 | 2 | 3 | 2 | 18 | ready-to-spec | runic-fantasy-ui-tabs, ui-tabs-fantasy-html5-tabs-pack, tiny-save-settings-menu-starter |
| CAP-003 | Save and settings screen | 3 | 3 | 2 | 3 | 2 | 3 | 2 | 18 | ready-to-spec | tiny-save-settings-menu-starter, progression-system-complete, skill-progression-system-complete |
| CAP-004 | Settings input primitives | 2 | 3 | 2 | 3 | 2 | 3 | 3 | 18 | ready-to-spec | tiny-save-settings-menu-starter, neon-ui-mega-bundle, obsidian-grimoire-ui |
| CAP-018 | Meter and status bar family | 3 | 3 | 1 | 1 | 2 | 3 | 3 | 16 | ready-to-spec | obsidian-grimoire-ui, ui-theme-dark-fantasy, neon-ui-mega-bundle, 8bit-rpg-bars-ui-pack |
| CAP-011 | Rarity tier vocabulary | 3 | 3 | 1 | 1 | 2 | 3 | 2 | 15 | ready-to-spec | gilded-grove-alchemy-card-pack, equipment-compare-ui-pack, inventory-loot-and-legend-inventory-pro, card-system-pixel, ui-rpg-cards |
| CAP-007 | Map and minimap chrome | 2 | 3 | 2 | 2 | 1 | 2 | 3 | 15 | ready-to-spec | explorer-map-ui-pack |
| CAP-017 | Tooltip and stat deltas | 2 | 3 | 2 | 3 | 1 | 2 | 2 | 15 | ready-to-spec | equipment-compare-ui-pack, inventory-loot-and-legend-inventory-pro, quest-journal-codex-ui-kit |
| CAP-009 | Quest journal and codex | 2 | 3 | 1 | 2 | 1 | 2 | 3 | 14 | ready-to-spec | quest-journal-codex-ui-kit |

**The meter rung strengthened.** `8bit-rpg-bars-ui-pack` maps to CAP-018 with direct bar-shape evidence — segmented HP and MP meters, vertical bars, cast and boss bars, damage trails, pip strips, and a documented 9-slice modular parts system — strengthening the meter rung as the first ladder step. It deepens an existing capability rather than adding a new one; the rung was already queueable, and this evidence hardens it.

### 5.3 Reference lab candidates

Labs study technique and vocabulary without claiming runtime module ownership.

| ID | Capability | Evidence | Fit | Consumer | Interaction | Licensing | Bounded | Overlap | Total | Readiness | Contributing packs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-005 | Combat feedback recipes | 3 | 2 | 3 | 2 | 3 | 3 | 3 | 19 | ready-to-spec | impact-juice-combat-polish-bundle, pixel-combat-text-status-fx-kit, impact-signal-combat-feedback-pack |
| CAP-006 | Combat text and status FX presentation | 3 | 2 | 3 | 2 | 3 | 2 | 3 | 18 | ready-to-spec | pixel-combat-text-status-fx-kit, impact-juice-combat-polish-bundle, impact-signal-combat-feedback-pack |
| CAP-013 | UI feedback audio mapping | 3 | 1 | 2 | 1 | 3 | 2 | 3 | 15 | needs-game-proof | tiny-ui-sfx-pack, ui-feedback-sfx-pack-v2, impact-juice-combat-polish-bundle, moonlit-pact-vn-gui-kit-renpy, impact-signal-combat-feedback-pack |
| CAP-016 | Icon taxonomy and sizing | 2 | 2 | 1 | 1 | 2 | 2 | 3 | 13 | needs-game-proof | runic-relic-rpg-icons-144, neon-rpg-icon-pack |
| CAP-021 | Dark fantasy theme technique | 2 | 3 | 0 | 0 | 2 | 1 | 2 | 10 | defer | obsidian-grimoire-ui, ui-theme-dark-fantasy |
| CAP-020 | Neon theme technique | 2 | 3 | 0 | 0 | 1 | 1 | 2 | 9 | defer | neon-ui-mega-bundle |

## 6. Game-Selection Matrix

| ID | Game | Status | Complexity | New engine capability | GameUI capability pressure | Best supporting packs | Expected fit | Known risk |
|---|---|---|---|---|---|---|---|---|
| GC-001 | Vector Vortex | in-flight | moderate | Rotated Canvas playfield with topology shifts, deterministic fixed-tick loop, and seeded runs (Specs 01 through 03) | Wireframe shell, HUD strip, three-tab settings, pause and run-ended flow, feedback events, notifications, and audio mapping (Specs 02 and 03) | `achievement-toast-notification-system-html5`, `impact-juice-combat-polish-bundle`, `pixel-combat-text-status-fx-kit`, `tiny-save-settings-menu-starter`, `tiny-ui-sfx-pack`, `ui-feedback-sfx-pack-v2` | Currently in Specs 02 and 03; any GameUI backport is one separately approved spec afterward | Mid-spec repin is prohibited; game-local candidates must finish before backport reconciliation |
| GC-002 | Rogue Cellar Crawl | candidate | moderate | Canvas 2D tile roguelike with field-of-view, turn scheduling, and item generation | Canvas host chrome, inventory grid with rarity tiers, equipment compare, tooltips, minimap, quest log, and save slots | `equipment-compare-ui-pack`, `explorer-map-ui-pack`, `inventory-grid-grabber-html5`, `inventory-loot-and-legend-inventory-pro`, `neon-rpg-icon-pack`, `obsidian-grimoire-ui`, `quest-journal-codex-ui-kit`, `runic-fantasy-ui-tabs`, `runic-relic-rpg-icons-144`, `ui-tabs-fantasy-html5-tabs-pack`, `ui-theme-dark-fantasy` | Two to three specs mirroring the Vector Vortex arc: core playable, shell and UI, then polish | Its strongest evidence now carries resolved derived-technique-only posture; the module ladder schedules the inventory, compare, tooltip, and map surfaces when authorized |
| GC-003 | Alchemy Deck Run | candidate | moderate | Card draw and play loop with animated card transitions on DOM or Canvas | Card frames with rarity tiers, hand fan, deck viewer, and reward selection | `card-system-pixel`, `gilded-grove-alchemy-card-pack`, `ui-rpg-cards` | Two specs: core card play, then deck UI polish | The tier vocabulary must freeze first, and card animation belongs to the consumer renderer |
| GC-004 | Neon Idle Arcade | candidate | low | Tick-driven economy simulation with prestige reset | Meters, sliders, upgrade lists, skill tree, notifications, and settings | `achievement-toast-notification-system-html5`, `neon-ui-mega-bundle`, `progression-system-complete`, `runic-fantasy-ui-tabs`, `skill-progression-system-complete`, `tiny-save-settings-menu-starter` | Two specs | Progression rules dominate; much of the UI repeats already-proven primitives, so framework novelty is lowest |
| GC-005 | High-Score Arcade | candidate | low | Fixed-screen deterministic arcade loop with score state | Title and pause shell, settings, name entry, high-score table, and toasts | `achievement-toast-notification-system-html5`, `neon-ui-mega-bundle`, `tiny-save-settings-menu-starter`, `tiny-ui-sfx-pack`, `ui-feedback-sfx-pack-v2` | One to two specs | Little new UI beyond what Vector Vortex already exercises |
| GC-006 | Within Parameters migration | candidate | moderate | Existing visual novel engine; migration onto framework modules only | Dialogue panel, choices, dossier, route tracker, and save slots | `moonlit-pact-vn-gui-kit-renpy`, `tiny-save-settings-menu-starter` | Deferred by charter until the current delivery sequence completes | Charter-frozen sequencing; the dialogue module must not start early |

**Vector Vortex's current role.** Vector Vortex is in flight (Specs 02 and 03 in the central queue). It consumes the current published GameUI foundations and Core primitives by vendoring, produces game-local wireframe shell and feedback candidates under `vv-` ownership, and hands those candidates to a later, separately approved backport spec. It does not repin mid-spec, and no framework module may claim ownership of a surface Vector Vortex is actively proving: notification, settings, tab, and feedback candidates wait for its backport reconciliation unless the operator overrides in UIREF-005.

## 7. Module Ladder (Agreed)

The earlier proposed next queue is replaced by the agreed module ladder, recorded here from operator decision. The ladder is the standing build order for the framework's module work; it still authorizes nothing by itself, and each rung is a separately dispatched spec. No ladder item is added, removed, or reordered except by operator decision.

| Order | Rung | Shape | Basis |
|---|---|---|---|
| 1 | Meter and status family (CAP-018) | Core extension of the existing `.gc-meter` | Strengthened rung: three prior sources plus `8bit-rpg-bars-ui-pack` bar-shape evidence; no Vector Vortex collision; the meter primitive already exists |
| 2 | Inventory grid and character sheet (CAP-010) | Module | Two inventory systems plus the compare pack's rarity slots; grid semantics proven at two depths |
| 3 | Tooltip and stat deltas (CAP-017) | Core | Three citing sources; the placement, trigger, and delta-row contract is what the core spec freezes |
| 4 | Equipment compare (module) (CAP-008) | Module | Composed comparison screen with delta rows; consumes the tooltip core and the inventory's item surfaces |
| 5 | Map and minimap chrome (CAP-007) | Module | 16-marker set and 9-slice chrome surfaces; consumer world data plugs in at a fixed boundary |
| 6 | Cards plus rarity (CAP-011, CAP-012) | Foundations through module; the flagship, likely several specs | Three independent card sources (OVL-009) clear the three-source gate; two theme renderings of one card component on one slot contract (see §4.1) |

**Rarity freezes inside cards.** The rarity tier vocabulary freezes inside the cards module (rung 6), after the inventory and equipment rungs have supplied real item pressure. Because frozen token names are API, the early item modules (rungs 2 and 4) therefore take a neutral tier label plus a consumer-supplied accent marker rather than publishing a provisional rarity token. A provisional vocabulary that later renames would be a major-version break; the ladder waits for real pressure instead.

**Non-owning combat-feedback lab (parallel lane).** Separate from the ladder, the combat-feedback lab (CAP-005 and CAP-006) proceeds as a parallel reference-lab lane that claims no runtime module. It studies event vocabulary, timing, and presentation with the OVL-010 sources and the two private feel-test fixtures, and any runtime outcome is a later proposal, not a rung.

Holdfast's card implementation is strong evidence for rung 6 but is not a backport here: the game is unfinished, so under the coordination rule its actual backport waits until it is done. The three corpus card sources are sufficient to design the card module now without it.

## 8. Review Findings and Questions

Each finding carries its statement, the exact evidence it rests on, a recommendation, and one closed question. Answering a question is the operator's approval act; this spec's text is never an answer.

### UIREF-001 — Silent-attribution interpretation

**Statement.** Five packs ship complete local licenses that state use and redistribution terms but never mention attribution (evidence: `gilded-grove-alchemy-card-pack/LICENSE.txt`, `impact-juice-combat-polish-bundle/LICENSE.txt`, `moonlit-pact-vn-gui-kit-renpy/LICENSE.txt`, `obsidian-grimoire-ui/LICENSE.txt`, `runic-relic-rpg-icons-144/LICENSE.txt`).
**Recommendation.** Keep recording these as `attribution: not-supported` with the note that no requirement appears in local terms.
**Question.** Confirm this interpretation, or require `unclear` plus license review for licenses silent on attribution? (confirm / require-unclear)
**Resolved.** Confirmed; recorded `attribution: not-supported`. See the Operator Resolutions block above.

### UIREF-002 — Purchase-page terms not held locally

**Statement.** `equipment-compare-ui-pack/README.md` and `explorer-map-ui-pack/README.md` defer all terms to the itch.io purchase page and state the archive adds nothing; no terms text exists in either pack.
**Recommendation.** The operator records the purchase-page terms with purchase records (outside this repository), after which the catalog re-audits and the packs leave licence review.
**Question.** Approve recording those terms as the unlock path for CAP-007 and CAP-008 evidence? (yes / no)
**Resolved.** Superseded by the operator resolution: under derived-technique-only and the never-copy rule, a missing local terms file does not gate derived work, so these packs are cleared for framework derived use without recording purchase-page terms. Those terms would matter only if raw assets were ever shipped, which the framework never does. CAP-007 and CAP-008 evidence is unblocked.

### UIREF-003 — Raw-export twins and family terms

**Statement.** OVL-001 and OVL-002 pair raw Rosebud exports (`ui-theme-dark-fantasy`, `ui-tabs-fantasy-html5-tabs-pack`) with cleaned products that ship licenses (`obsidian-grimoire-ui`, `runic-fantasy-ui-tabs`).
**Recommendation.** Treat each cleaned product's license as governing its family for planning, while keeping both snapshots recorded.
**Question.** Confirm the family interpretation? (yes / no)

### UIREF-004 — Two progression bundle snapshots

**Statement.** OVL-003 records two snapshots of the progression bundle with version drift and two empty sub-pack directories (`progression-system-complete/neon-ui-sliders-and-bars-pack`, `skill-progression-system-complete/neon-ui-notifications-popup-pack`).
**Recommendation.** Designate `skill-progression-system-complete` (newer) as the canonical snapshot for future reading, retaining the older for drift evidence only.
**Question.** Confirm the newer snapshot as canonical, or keep both as peers? (confirm-newer / keep-both)

### UIREF-005 — Independent module ordering and Vector Vortex collision window

**Statement.** The independent lane's top ranks are CAP-001 (20), CAP-002 (18), CAP-003 (18), and CAP-004 (18), but Vector Vortex is actively proving notification, settings, and tab surfaces game-locally under the coordination rule, so those wait for backport reconciliation; CAP-011 (15) is the highest-ranked queueable-now item.
**Recommendation.** Queue CAP-011 first, hold CAP-002 and CAP-003 for the backport decision, and let CAP-001 follow the same gate.
**Question.** Accept this ordering, or pull any of CAP-001, CAP-002, or CAP-003 ahead of the gate now? (accept / pull-notification / pull-tabs / pull-settings)
**Resolved.** Superseded by the section 7 module ladder: meter (CAP-018) is rung 1 and rarity (CAP-011) folds into cards at rung 6, so CAP-011 is not queued standalone. Notification, tabs, and settings (CAP-001, CAP-002, CAP-003) still wait for the Vector Vortex backport under the coordination rule.

### UIREF-006 — First reference lab scope

**Statement.** CAP-005 (19) and CAP-006 (18) are the top reference-lab candidates, both resting on the two clear-license feedback packs (`impact-juice-combat-polish-bundle`, `pixel-combat-text-status-fx-kit`).
**Recommendation.** One lab spec covering both: a shared event vocabulary with presentation studies, claiming no runtime module ownership.
**Question.** Approve the combined lab scope, or split into two labs? (combined / split)

### UIREF-007 — Next game after Vector Vortex

**Statement.** GC-002 (Rogue Cellar Crawl) carries the broadest GameUI pressure and matches the charter's first-consumer plan, but its strongest evidence sits in license-unclear packs; GC-003 (Alchemy Deck Run) has clear-license evidence but needs the tier vocabulary frozen first.
**Recommendation.** Confirm Rogue Cellar Crawl as the next game dispatch, contingent on UIREF-001 and UIREF-002 answers.
**Question.** Confirm Rogue Cellar Crawl, choose Alchemy Deck Run instead, or defer the choice? (rogue-cellar / alchemy-deck / defer)
**Resolved in part.** The license contingency is cleared: GC-002's evidence carries resolved derived-technique posture and no longer sits in license-unclear packs. The next-game choice itself remains the operator's open decision.

### UIREF-008 — Coordination rule adoption

**Statement.** The four-bullet coordination rule at the top of this document governed this inventory's lane gates — it held CAP-001, CAP-002, and CAP-003 behind the Vector Vortex backport window in §5.2 and the queue order in §7 — and would govern all later framework and game scheduling.
**Recommendation.** Adopt it as standing policy for framework and game scheduling.
**Question.** Adopt as standing policy? (yes / no)
**Resolved.** Adopted as standing policy and codified in `AGENTS.md` in its two-way, pin-and-ride form. See the Operator Resolutions block above.

### UIREF-009 — Audio stays consumer-side

**Statement.** CAP-013's clearest sources (`tiny-ui-sfx-pack`, `ui-feedback-sfx-pack-v2`) are fully licensed, but the charter ships no audio runtime in the framework.
**Recommendation.** Restrict audio work to consumer recipes and per-game integration notes; no framework audio module is proposed.
**Question.** Confirm the consumer-recipe-only boundary for audio? (yes / no)

### UIREF-010 — Idle and technique backwaters

**Statement.** CAP-019 (10), CAP-020 (9), and CAP-021 (10) rank lowest: economy rules are game territory, and both theme techniques are already absorbed by the shipped arcade and fantasy themes plus the zero-raster spike.
**Recommendation.** Leave all three unqueued and revisit only under new consumer pressure.
**Question.** Confirm leaving CAP-019, CAP-020, and CAP-021 unqueued? (yes / no)

---

**Stop condition.** This inventory stops here. The operator reviews UIREF-001 through UIREF-010 and chooses which independent module, reference lab, backport, or next-game specifications to authorize. No recommended item dispatches automatically.
