<!--
---
title: "Display Contract and Framework Review"
description: "The adopted 1080p-based 16:9 requirement, current branch and review state, and the implementation handoff"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-14"
version: "1.0"
status: "Active"
tags:
  - type: report
  - domain: foundations
  - tech: [css, javascript, html, playwright]
related_documents:
  - "[Project Charter](project-charter.md)"
  - "[Post-Amendment Review](post-amendment-review-2026-09-07.md)"
  - "[Module Ladder](reference-corpus/ui-pack-capability-map.md)"
---
-->

# Display Contract and Framework Review

The operator has fixed the game UI design space at 1920x1080, 16:9, with
1080p, 1440p, and 2160p as the only supported presentation targets.
[Charter section 4.1.1](project-charter.md#411-game-display-contract) is the
authoritative contract. This review records the current implementation gap
and the work that must accompany adoption. The requirement is recorded;
runtime implementation is pending.

## 1. Framework state

Reviewed on ML01 on 2026-09-14, starting from a clean tree at `7074fd4` on
`spec/2026-08-18-h5gameui-01-meter-status-family-and-reference-navigation`.
[PR #3](https://github.com/vintagedon/html5-game-ui-framework/pull/3) is open,
with the same head and base `e0909a6`. No active framework implementation spec
was found in the central queue; the rung 1 spec and its A2 repair spec are
archived under August.

| Area | Current implementation |
|------|------------------------|
| Foundations | Frozen 83-token semantic vocabulary, layered CSS, four themes, zero runtime rasters |
| Core | Panel, button, input, continuous/segmented/pip meters, vertical variants and damage trail; technique specimens |
| Modules | No module implementation; `src/modules/` contains its README |
| Reference and harness | Eleven registered scenarios, four sections, 165 recorded capture cases |
| Game host | No shared fixed-stage fit API in the CSS/ESM entry points |
| Display coverage | Legacy 1280x800 desktop and 480x900 compact captures; neither is a supported game presentation target under the new contract |

The jam-kit purpose is to retain useful UI work from games so the next idea
can reach a playable loop using defaults. The renderer-agnostic UI boundary
and one-way backport rule support that purpose. A shared stage belongs to
Foundations; each game still owns its composition and engine integration.
The meter family is Core, not an existing composed module family.

The agreed module ladder remains inventory/character sheet, tooltip/stat
deltas, equipment compare, map chrome, then cards/rarity after meters. The
display contract constrains all those surfaces without reordering the ladder.
A live game proving a surface remains its owner until the authorized backport.

## 2. Pending review work

The [September 7 review](post-amendment-review-2026-09-07.md) still has five
undispositioned findings:

| Finding | Work awaiting disposition |
|---------|---------------------------|
| PA-001 | Comparison output can overwrite approved baseline bytes through an alias |
| PA-002 | The documented fresh-clone test sequence fails when generated metrics are absent |
| PA-003 | Vertical segmented fill and damage trail shrink across their width as well as height |
| PA-004 | The declared browser floor and the discrete meters' CSS requirements disagree |
| PA-005 | Routine reports target a sealed historical evidence directory |

The [September 8 Kilo review](https://github.com/vintagedon/html5-game-ui-framework/pull/3#issuecomment-5487637585)
is complete. It reports all twelve findings from its earlier pass fixed and
raises nine further items. These overlap the PA output-safety work and must
be reconciled rather than counted as nine unrelated new defects.

| Reported item | Review status in this session |
|---------------|-------------------------------|
| JSON/JUnit output directories bypass validation when an output name is absent | Confirmed by reading `outputFileFromDirectory` and the directory checks in `harness/runner/output-safety.js`; no overwrite reproduction run |
| Process tests can use the fixed historical report fallback outside scratch | Confirmed by reading the process-test environment and default report path; these tests were not executed |
| Symlink/parent-path normalization evades the declared guard invariant | Reported by Kilo; needs bounded reproduction in the repair unit |
| Missing approved root causes a safety check to return without validation | Reported by Kilo; visible in `assertApprovedPathSafe`; caller consequences need repair-unit verification |
| Recovered establishment candidates skip approved-path validation | Reported by Kilo; needs repair-unit verification |
| Temporary-file cleanup assertion inspects the wrong directory | Reported by Kilo; needs repair-unit verification |
| Capture CLI ignores refused finalization in its exit status | Reported by Kilo; needs repair-unit verification |
| Module-failure report merge lacks a discriminating test | Reported by Kilo; needs repair-unit verification |
| Runner README's corpus byte count is stale | Reported by Kilo; reconcile with the final approved corpus |

**Correction to the earlier merge rationale.** The September 7 review says all
five PA defects already exist on the default branch. That conflates the
pre-A2 branch with `main`. At the current PR base `e0909a6`,
`src/core/components.css` has no segmented or vertical meter family and no
`round()` expression. PA-003 and the discrete-meter dependency implicated in
PA-004 originate in this open branch, even though both predate A2. The older
review remains a historical record; its blanket default-branch claim must
not be used as the merge justification. Reconcile the later review and these
provenance facts before treating PR #3 as ready.

The PR description also stops at Amendment 1 and omits A2 and the PA review.
It needs an operator publication update when this branch is next pushed.
This documentation decision does not resolve any PA disposition.

## 3. Implementation handoff

The next framework work unit should implement the charter's stage contract
as a bounded foundation change. The source observations below identify what
that unit must address; no runtime API names are frozen by this review.

1. Provide one shared 1920x1080 stage host through the published CSS/ESM
   consumption path. Fit, center, and resize the whole stage using the charter
   formula. Game composition stays inside it; documentation chrome stays
   outside it. Include a standalone consumer fixture that imports only the
   published entries, so reference-app helpers cannot supply missing behavior.
2. Make stage-internal sizing independent of the browser viewport. In
   particular, `src/tokens/primitives.css` defines the large font size with
   `clamp(1.75rem, 4vw, 3rem)`. Preserve frozen semantic names while selecting
   stage-relative or fixed logical values. Classify the document-level
   `100vh` in `src/core/base.css` and the reference sidebar's viewport rules
   by ownership; outer browser tooling does not need game-layout conversion.
3. Make the registry express the three supported game targets from one
   declaration, and validate their contract. Separate tool-page navigation
   checks from game-stage conformance. Replace the legacy compact game-layout
   requirement in the migration, with explicit accounting for retired capture
   identities. Do not rename old files and imply they prove a different size.
4. Verify real content and enabled controls at 1080p first. At 1440p and 2160p,
   compare critical bounds relative to the stage origin against the same
   base state at factors 4/3 and 2, allowing normal rounding. Check actual
   pointer/keyboard operation and occlusion independently of scale equality.
   A bounded fit check covers letterboxing without a new responsive matrix.
5. Repair PA-001/PA-005 and reconcile the related Kilo findings before baseline
   migration. Record the exact visual causes and affected identities. Existing
   approved PNGs and manifest entries require the established operator
   retirement/replacement process; only canonical capture establishes absent
   baselines. Coordinate the PA-003 repair with this transition if its
   disposition permits, to avoid approving the same affected renders twice.

All four themes continue to consume the same layout. This is a small display
contract with a shared implementation, not a per-game breakpoint system.

## 4. Consumer boundaries

Within Parameters' active Spec 03a already records the three supported sizes.
Its ending-panel work is a content-capacity guard: the reported 720p clip is
outside the supported set, and the added epilogue content is the reason to
protect the 1080p budget. Its fixed stage, `33vh` conversion, composition
change, and 1440x900 harness replacement stay in its framework migration unit.
The game's planned 78/22 split is a consumer decision, not a framework default.

Dungeon Crawler's active Spec 02a already authors one 1920x1080 shell and
scales to the same three targets. It reserves a 1280x720 internal playfield
inside that shell; this is valid and does not make 720p an outer UI target.
That amendment explicitly limits its acceptance to the three sizes, so the
framework's general host-fit behavior is not a new demand on that in-flight
unit.

Existing pins and game-owned code remain governed by their own specs.
Future migrations and backports normalize to the charter. No game repository,
archived spec, recorded baseline, or published preview changes in this unit.

## 5. Verification scope

This is a source, branch, spec, and review-state inspection plus a
documentation change. Registry validation and documentation consistency are
checked locally. It is not a fresh full-browser certification of the meter
branch. The full test and capture paths were deliberately not invoked:
PA-005 and the newly reported process-test fallback can write sealed evidence.
