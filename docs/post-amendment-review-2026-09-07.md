<!--
---
title: "Post-Amendment Review 2026-09-07"
description: "Operator review surface for the rung 1 amendment: five inherited defects surfaced by independent verification of A2, with provenance and closed questions"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-07"
version: "1.0"
status: "Active"
tags:
  - type: report
  - domain: [core, harness]
  - tech: [css, javascript, playwright, node]
related_documents:
  - "[Status Family Review 2026-08-18](status-family-review-2026-08-18.md)"
  - "[Harness Review 2026-08-05](harness-review-2026-08-05.md)"
  - "[Project Charter](project-charter.md)"
  - "[Golden Captures](../harness/goldens/README.md)"
  - "[Agent Instructions](../AGENTS.md)"
---
-->

# Post-Amendment Review 2026-09-07

This is the operator review surface for the rung 1 amendment (A2.1 through
A2.8, `a819634` through `0003621`). It records five findings surfaced by an
independent verification pass over the unpushed amendment, each with an ID, a
statement, evidence, provenance, one closed question, and a disposition slot
the operator fills.

**The amendment itself is sound.** Every A2 repair verified. All five findings
below predate A2; none is a regression introduced by it. The distinction
matters for the merge decision and is recorded per finding under
**Provenance**.

Method note: this review was produced by a reviewer occupant separate from the
builder occupant that executed A2, working against the live ML01 checkout and
against disposable snapshots of it. Findings PA-001 and PA-002 were reproduced
rather than inferred. The live checkout, its approved baselines, its history,
and the published preview were not modified.

## Verified amendment scope

| Claim | Verification |
|-------|--------------|
| Eight amendment commits, clean tree | `git log` A2.1 to A2.8; `git diff` and untracked scan both empty at `0003621` |
| Exactly sixteen baseline PNGs changed | `git diff e444930..0003621 --stat`: sixteen PNGs, all `core-meter-vertical`, four themes by two viewports by two states; the other 149 approved PNGs unchanged |
| Node suite | 118 passed, fresh snapshot and warm control |
| Browser suite | 175 passed and 1 failed on a fresh snapshot; 176 passed on the warm control (see PA-002) |
| Golden comparisons | 165 passed in both runs |
| A2 repairs substantiated | Corrected pip count, published count defaults, navigation scrolling, malformed-route handling, landing cleanup, smoke aggregation, transaction and recovery safeguards |

## Evidence location

Reproduction scripts, hashes, run logs, screenshots, and reports for PA-001
and PA-002 were produced on the operator workstation and are **not yet in the
estate**. They belong at `work-logs/evidence/2026-09-07-h5gameui-01b/`
alongside the rung 1 evidence set, and relocating them is a deliverable of the
follow-up spec. Until then the reproductions exist only in disposable
snapshots and a local report, which is the least durable artifact this review
produced.

## Findings

### PA-001: A comparison run can overwrite an approved baseline before reporting the mismatch

**Statement.** When the candidate output directory resolves onto the approved
directory, a comparison run writes the candidate PNG over the approved PNG and
only then reports a hash mismatch. Reproduced with both a directory symlink
and a file hardlink, so rejecting symlinks alone does not close it. The
failure mode that matters is not the lost file, which is recoverable from git,
but the run that follows: after the overwrite the approved file and the
candidate are the same bytes, so a re-run compares the file against itself and
passes. The defect manufactures a false green.

**Evidence.** The unconditional candidate write precedes the comparison in
[harness/runner/compare.js](../harness/runner/compare.js). Both link
reproductions were performed in disposable copies; artifacts pending
relocation per **Evidence location** above.

**Provenance.** Pre-existing. The candidate write originates in `d33ae3d`
(2026-08-03), which introduced `compare.js` with the pixel comparator, and is
present unchanged at the pre-amendment commit `e444930`. A2.3 (`f8d2839`) adds
the canonical wrapper, output-safety checks, and deferred establishment around
this path without altering the write itself. A2 hardens the establish path and
leaves the compare path uncovered.

**Related.** PA-005 is the same defect class against a different curated
location. A repair scoped to "protect approved baselines" will not close it.
The invariant that closes both is that run-owned output never resolves to a
curated location: a run writes to a private path the caller cannot name, and
promotion into a curated tree happens only through explicit finalization.

**Question.** Repair PA-001 narrowly at the compare path, or adopt the
run-owned-output invariant across compare, report, and any future run
destination in one change? (narrow-compare / invariant-across-destinations)

**Disposition.** _Pending operator._

### PA-002: The documented first test run fails on a fresh clone

**Statement.** The reference page requests a generated metrics file that does
not exist in a fresh checkout. The resulting 404 fails the console-error
assertion, and because metrics generation runs after the browser suite, the
documented command never reaches the step that would produce the file.
Generating metrics first is not a straight reordering: metrics generation
itself requires browser-generated membership evidence.

**Evidence.** Fresh-snapshot run: 175 browser tests passed, 1 failed on the
missing-metrics 404. Warm control with the metrics artifact present: 176
passed. The `npm test` sequence is declared in
[package.json](../package.json); the documented invocation is in
[README.md](../README.md) under Getting Started.

**Provenance.** Pre-existing. Not introduced or altered by A2.

**Scope note.** The warm control establishes a warm-state dependency. It does
not establish how every historical run was prepared, and no other
missing-artifact failure appeared in the cold run.

**Question.** Add an explicit bootstrap sequence to the documented first run,
or make the metrics request tolerate its own absence on first load? The
general console-error assertion is preserved either way.
(explicit-bootstrap / tolerate-absent-metrics)

**Disposition.** _Pending operator._

### PA-003: Vertical segmented fills shrink in width as well as height

**Statement.** A vertical segmented meter at 50 percent renders its fill at
9px of an 18px-wide track, shrinking across the axis it should hold constant.
All four themes reproduce it, as does standalone consumer markup outside the
reference application. The damage trail has the same problem. Existing tests
assert fill height only, so they pass; the approved screenshots were recorded
with the defect and therefore preserve it.

**Evidence.** Computed geometry probed against the published preview and
against standalone consumer markup. Fill sizing is in
[src/core/components.css](../src/core/components.css); the vertical cases are
the sixteen `core-meter-vertical` baselines re-recorded in A2.7.

**Provenance.** Pre-existing. Originates in the meter family implementation at
`7ed5d26`. The sixteen baselines A2.7 re-recorded already encoded this defect
before A2 touched them, so merging blesses nothing that is not already
blessed; the cost of merging first is one redundant re-approval of the same
sixteen files after the repair.

**Related.** This is the finding that most directly indicts screenshot
coverage as a defect detector. A recorded baseline cannot catch a defect it
was recorded with. The independent consumer-markup check is what caught it.

**Question.** Fix both axes and authorize the sixteen affected baseline
replacements in the follow-up, or fix the axis defect and defer baseline
re-approval to a separate operator pass? (fix-and-authorize /
fix-then-separate-approval)

**Disposition.** _Pending operator._

### PA-004: The declared browser floor does not support the CSS the discrete meters now require

**Statement.** Discrete meter quantization uses CSS `round()`. The charter
declares a browser floor of Chrome and Edge 111 under **Frozen decisions** and
states that no fallbacks are written below the floor. `round()` reaches Chrome
and Edge at 125. The declared contract and the shipped CSS disagree, and
Chromium-only testing cannot settle it because Chromium tests run above the
floor.

**Evidence.** Charter section 4.1, Frozen decisions, Browser floor row:
[docs/project-charter.md](project-charter.md). The quantization CSS is in
[src/core/components.css](../src/core/components.css), reached through the
discrete meter default mapping in A2.2 (`03fa55d`) and the floor quantization
in A1.3 (`f1e19f9`).

**Provenance.** Pre-existing as a contract mismatch. A2 did not introduce
`round()`.

**Scope note.** Only the Chrome and Edge floor is implicated by the evidence
gathered. Whether the declared Safari 16.4 and Firefox 128 floors also clear
`round()` was not verified and should be before any charter amendment is
drafted.

**Question.** This is a charter amendment either way, because the browser
floor sits under Frozen decisions rather than among the tunable values. Raise
the declared Chrome and Edge floor to 125, or hold 111 and implement a
`round()`-free quantization? (raise-floor / hold-floor-change-implementation)

**Disposition.** _Pending operator._

### PA-005: Routine report output targets a sealed evidence directory

**Statement.** The default report destination still names an August 5 gate
directory. Successive routine runs reuse that filename inside sealed
historical evidence, and canonical capture strips an existing destination
override rather than honoring it, so a caller cannot redirect away from it
through the supported path.

**Evidence.** Reporter destination defaults in
[harness/runner/playwright.config.js](../harness/runner/playwright.config.js)
and [harness/runner/baseline-reporter.js](../harness/runner/baseline-reporter.js);
the override-stripping behavior is described in
[harness/goldens/README.md](../harness/goldens/README.md).

**Provenance.** Mixed, and the only finding A2 makes worse. The stale default
predates the amendment. A2 additionally makes canonical capture discard the
destination override.

**Related.** Same defect class as PA-001: routine run output resolving onto a
curated, should-be-immutable location. Sealed evidence in this case, approved
baselines in the other.

**Question.** Route routine reports to a run-owned destination separate from
sealed evidence as part of the PA-001 invariant work, or as an independent
change? (with-pa-001 / independent)

**Disposition.** _Pending operator._

## Merge position

The reviewing occupant's initial recommendation was to hold merge pending a
bounded follow-up, and revised it after establishing provenance. The revised
position is recorded here as the one to act on:

A2 is beneficial repair work that improves the safety posture while leaving
five inherited defects uncovered. None of the five is made materially worse by
merging, and holding does not shorten the exposure window for any of them
because all five exist on the default branch already. PA-005 is the single
partial exception and its incremental cost is bounded to a stale default that
is already stale.

Recommended: merge A2, record PA-001 through PA-005 as inherited follow-up
work, and scope one repair spec after the dispositions above are filled.

## Follow-up scope

Held for the repair spec, in dependency order rather than severity order:

1. PA-001 lands before PA-003. PA-003's repair requires authorizing baseline
   replacements, and PA-001 is the defect that makes writes into the approved
   tree unsafe. Authorizing sixteen replacements over a known write hole
   inverts the safety argument.
2. PA-005 lands with PA-001 if the invariant answer is
   `invariant-across-destinations`.
3. PA-002 and PA-003 are independent of each other and of the above beyond
   item 1.
4. PA-004 is a charter decision and produces a charter amendment, not a code
   deliverable, unless the answer is `hold-floor-change-implementation`.
5. Relocate the PA-001 and PA-002 reproductions into
   `work-logs/evidence/2026-09-07-h5gameui-01b/` and promote them to permanent
   regression cases. The hardlink reproduction is the load-bearing one: it is
   what proves symlink rejection would have been the wrong repair.

Explicitly outside this scope: icons, palette work, comparator tuning
(MTR-007, already queued after rung 2), and new components. Strengthen
independent consumer-markup assertions on both sizing axes before expanding
the screenshot matrix.
