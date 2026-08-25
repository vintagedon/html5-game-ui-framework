<!--
---
title: "Status Family Review 2026-08-18"
description: "Operator review surface for ladder rung 1: the meter and status family, reference navigation, and the recorded baseline model"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-25"
version: "1.0"
status: "Under Review"
tags:
  - type: report
  - domain: [core, harness]
  - tech: [css, javascript, html, svg, playwright, node]
related_documents:
  - "[Project Charter](project-charter.md)"
  - "[Harness Review 2026-08-05](harness-review-2026-08-05.md)"
  - "[UI Pack Capability Map](reference-corpus/ui-pack-capability-map.md)"
  - "[Agent Instructions](../AGENTS.md)"
---
-->

# Status Family Review 2026-08-18

This is the operator review surface for ladder rung 1. Every finding below
carries an ID, a statement, evidence as a file and line or a named results
file under `work-logs/evidence/2026-08-25-h5gameui-04/`, and one closed
question. The published preview at
[gameui.donfather.site/reference/](https://gameui.donfather.site/reference/)
is the rendered artifact these findings measure.

Method note: the executor's model cannot view images, so rendered-result
evidence here is programmatic: computed DOM geometry and colors probed on the
published site, and pixel counts from recorded baselines and diff runs. The
published screenshots referenced below are the same renders for operator
inspection, and each closed question is answerable without writing prose.

## Findings

### MTR-001: Segmented quantization reads as whole units at partial values under all four themes

**Statement.** At a partial value (63 percent on an eight-segment meter, five
segments), the segmented fill renders at 62.1 to 62.4 percent of track width
under every theme, which is five whole segments (62.5 percent) with no partial
artifact at either end; the driven states at 25, 0, and 100 percent land on
two, zero, and eight whole units the same way.

**Evidence.** Published-site geometry probe per theme in
`work-logs/evidence/2026-08-25-h5gameui-04/gate-4.0.7-published-probes.json`
(segmented fill percentages by theme); the whole-unit browser test in
[harness/runner/runner.spec.js](../harness/runner/runner.spec.js) asserts
exact unit counts at 0, 43, and 100 percent across shapes and orientations;
recorded baselines under
[harness/goldens/approved/core-meter-segmented/](../harness/goldens/approved/core-meter-segmented/)
carry the rendered states.

**Question.** Quantization rounds to the nearest unit (63 percent shows
five segments, not four). Keep nearest, or switch to floor so a meter never
overstates its value? (nearest / floor)

### MTR-002: The damage trail reads through a theme-constant red that predates the arcade palette pass

**Statement.** The trail renders at `oklch(0.5 0.22 27)` under every theme,
including arcade, where it sits between the arcade accent at lightness 0.82
and the track at 0.09; the red is legible against all four tracks, but under
arcade it is the only strongly saturated warm element beside the green
accent, which is the recorded arcade-accent design debt showing through
rather than a new defect.

**Evidence.** Computed-color probe in
`work-logs/evidence/2026-08-25-h5gameui-04/gate-4.0.7-published-probes.json`
(trail, fill, and track colors per theme); the trail derives from
`--gc-status-danger` in [src/tokens/components.css](../src/tokens/components.css)
(line 29); the arcade resting render is
`work-logs/evidence/2026-08-25-h5gameui-04/gate-4.0.7-damage-arcade-resting.png`.

**Question.** Does the trail read as intentional under arcade as-is, or does
this rung force the arcade palette pass earlier than planned? (reads-fine /
force-palette-pass)

### MTR-003: The pip strip exposes one meter value, and its accessible name is the only semantic carrying the count

**Statement.** The pip shape renders a single `role="meter"` element whose
`aria-valuenow` moves in lockstep with its painted units (proven at 0, 30,
43, 70, and 100 percent), so a screen reader hears a percentage, not
"seven of ten"; the count itself lives only in the painted dots and the
`--gc-meter-count` channel, which is honest for charges but thinner than a
list of discrete states would be.

**Evidence.** DOM probe in
`work-logs/evidence/2026-08-25-h5gameui-04/gate-4.0.7-published-probes.json`
(pips carry `role="meter"`, `aria-valuenow="70"`); the sync test in
[harness/runner/runner.spec.js](../harness/runner/runner.spec.js) and
[harness/tests/meter-family.test.js](../harness/tests/meter-family.test.js)
drive `set-value` on every shape; the render contract is
[harness/app/render.js](../harness/app/render.js) (meter builder).

**Question.** Keep `role="meter"` for pips, or revisit as a discrete-state
list when a consumer game exercises it? (keep-meter / revisit-on-consumer)

### MTR-004: The nav tree is two levels deep and carries four sections now, with room for six rungs only if sections stay flat

**Statement.** The rendered navigation is a persistent tree with sections at
level one and the active section's scenario titles at level two; today that
is four sections and eleven scenario links, and at the planned six rungs the
first level grows past ten entries, at which point either sections group by
rung or the tree needs a second expansion level.

**Evidence.** The nav is built entirely from the registry roster in
[reference/reference.js](../reference/reference.js) (`buildNav`, line 66);
the roster is [harness/registry/scenarios.js](../harness/registry/scenarios.js)
(`SECTIONS`, line 36); the landing render is
`work-logs/evidence/2026-08-25-h5gameui-04/gate-4.0.7-published-landing.png`.

**Question.** Is the flat two-level tree the right shape through rung 3, or
should the roster gain rung grouping before the second rung lands? (flat-through-rung-3 / group-by-rung-now)

### MTR-005: The compact viewport holds the status family with no horizontal overflow anywhere

**Statement.** At 480 by 900 every view (landing and all four sections)
renders without horizontal overflow and with the nav visible above the
content, and all 60 compact-viewport family cases recorded baselines clean,
which supports extending compact beyond the family; the non-family specimens
(palette grids, the spike) have no compact baseline yet, so extension is a
capture-cost decision rather than a rendering risk.

**Evidence.** Compact overflow probe (all views false) in
`work-logs/evidence/2026-08-25-h5gameui-04/gate-4.0.7-published-probes.json`;
60 compact rows in the recorded matrix
(`work-logs/evidence/2026-08-25-h5gameui-04/gate-4.0.2-matrix-pre-refactor.json`
is the pre-family comparison); viewport scoping is asserted in
[harness/tests/runner.test.js](../harness/tests/runner.test.js).

**Question.** Extend the compact viewport to every scenario at rung 2, or
keep it family-scoped until a consumer needs portrait chrome elsewhere?
(extend-all / keep-family-scoped)

### MTR-006: The renderer was deterministic before the dispatch refactor

**Statement.** Two consecutive pre-refactor capture runs produced 53 of 53
byte-identical PNGs, so the gate 4.0.2 refactor was verified against a
stable render and no nondeterminism source was found.

**Evidence.**
`work-logs/evidence/2026-08-25-h5gameui-04/gate-4.0.2-pre-refactor-determinism.json`
(53/53 byte-identical, zero differing).

**Question.** Accept single-run determinism checks as sufficient for future
behavior-preserving refactors, or always require two pre-refactor runs?
(single-run-sufficient / always-two-runs)

### MTR-007: The comparator absorbs a subtle surface-tone shift that a strong accent shift catches

**Statement.** A one-palette-tone shift of the modern raised surface
(lightness 0.99 to 0.96) passed a full comparison run clean, while an accent
reassignment failed 28 cases with pixel-difference details (for example
10.92 percent of pixels); the per-pixel threshold of 0.1 with a 0.2 percent
area ratio, approved as the metric definition in H-003, absorbs small uniform
surface shifts by design.

**Evidence.** The absorbing run:
`work-logs/evidence/2026-08-25-h5gameui-04/gate-4.0.6-mutation-run.txt` (169
passed, exit 0); the catching run:
`work-logs/evidence/2026-08-25-h5gameui-04/gate-4.0.6-mutation-accent-run.txt`
(28 pixel-difference failures, exit 1, baselines byte-identical after);
thresholds are [harness/runner/compare.js](../harness/runner/compare.js)
(THRESHOLD and MAX_RATIO, lines 33 to 36).

**Question.** Tighten the comparator (for example a mean-delta check beside
the area ratio) in a follow-up spec, or accept the current sensitivity as
the approved metric definition? (tighten-in-followup / accept-current)

## Verification index

| Claim | Evidence |
|-------|----------|
| Published preview serves every view | `gate-4.0.7-published-smoke.json`: 5 views, 36 assertions, all pass |
| Theme controls switch in place on every view | Same file, `theme-switch` assertions per view |
| Auditor at zero violations on the landing view | Same file, `landing:auditor-clean` |
| 165 recorded baselines reconcile | Manifest entries 165, approved PNGs 165, matrix rows 165 |
| Failing runs never rewrite baselines | `gate-4.0.6-mutation-accent-run.txt` plus tree diff recorded in the worklog |
| Re-record after deletion touches one case | `gate-4.0.6-reestablish-run.txt` |
| Entry kept without PNG fails | `gate-4.0.6-entry-kept-run.txt` |
| Sync test discriminates | `gate-4.0.3-mutation-aria-only.txt` (3 failing tests under mutation) |

The published probes referenced by MTR-001, MTR-002, MTR-003, and MTR-005
are consolidated in
`work-logs/evidence/2026-08-25-h5gameui-04/gate-4.0.7-published-probes.json`.
