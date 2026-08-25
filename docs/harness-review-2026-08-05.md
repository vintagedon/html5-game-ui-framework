<!--
---
title: "Harness Review 2026-08-05"
description: "Operator decisions for the Phase 2 conformance harness, candidate goldens, metric definitions, and viewport roster"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-05"
version: "1.1"
status: "Active"
tags:
  - type: report
  - domain: harness
  - tech: [javascript, playwright, node, nginx]
related_documents:
  - "[Conformance Harness](../harness/README.md)"
  - "[Golden Captures](../harness/goldens/README.md)"
  - "[Project Charter](project-charter.md)"
---
-->

# Harness Review 2026-08-05

This is the operator decision surface for the Phase 2 conformance harness.
H-005 was settled by the published-preview smoke test. The remaining decisions
were recorded on 2026-08-18: H-001 and H-004 are superseded by the
recorded-baseline model in [AGENTS.md](../AGENTS.md), H-002 and H-003 are
resolved as stated, and H-006 adds the second viewport scoped to the status
family. The approval manifest's zero-entry state is no longer an unfulfilled
prerequisite; the manifest survives as an integrity record that the harness
itself records baselines into.

## Decision Summary

| ID | Subject | Status |
|----|---------|--------|
| [H-001](#h-001) | Candidate golden baseline | Superseded |
| [H-002](#h-002) | Registry schema freeze | Not frozen |
| [H-003](#h-003) | Metric definitions | Approved as defined |
| [H-004](#h-004) | Golden blessing process | Superseded |
| [H-005](#h-005) | Published preview | Yes, evidence-settled |
| [H-006](#h-006) | Second viewport | Yes, status family only |

<a id="h-001"></a>

## H-001: Candidate Golden Baseline

Statement: The regenerated candidate tree contains one unapproved image for each of the 53 viewport-qualified capture cases after the toggle and meter corrections.

Evidence:

- [`harness/goldens/candidates/matrix.json`](../harness/goldens/candidates/matrix.json)
  contains 53 rows, each marked `awaiting`, and the candidate tree contains 53
  PNG files.
- [`semantics.test.js`](../harness/tests/semantics.test.js#L106) proves that the
  toggle starts unpressed and becomes pressed; the meter test at line 122 proves
  that its fill, visible label, and accessible value stay synchronized.
- The post-repair capture result is
  `work-logs/evidence/2026-08-05-h5gameui-03/gate-3.5-capture-results.json`.
- [`approval-manifest.json`](../harness/goldens/approval-manifest.json#L1) has an
  empty `entries` object. No executor approval exists.

Question: Approve the 53 regenerated candidate captures as the golden baseline, yes or no?

Decision: Superseded. The 53-candidate hand-approval does not happen. Baselines are recorded automatically by gate 4.0.6, after the render reaches its final form in this spec. Rationale: hand-approving 53 PNGs before the harness could detect a single regression bought no protection that automatic recording does not.

<a id="h-002"></a>

## H-002: Registry Schema Freeze

Statement: The repaired registry schema validates a shared seven-value specimen vocabulary and requires a nonempty `initialState` for every scenario.

Evidence:

- [`specimens.js`](../harness/app/specimens.js#L14) is the shared specimen
  vocabulary consumed by validation and rendering.
- [`schema.js`](../harness/registry/schema.js#L47) validates the registry,
  rejects unknown specimens at line 89, and requires `initialState` at line 94.
- [`schema.test.js`](../harness/tests/schema.test.js#L71) directly exercises
  malformed members; the tests at lines 121, 128, 138, and 146 cover specimen,
  checkpoint, and initial-state requirements.
- The original unfixed red run is
  `work-logs/evidence/2026-08-05-h5gameui-03/gate-3.1-unfixed-schema-tests.txt`.

Question: Approve this registry schema, including the seven-value specimen vocabulary and required `initialState`, as frozen for Phase 3, yes or no?

Decision: Not frozen. The specimen vocabulary stays open and harness-internal. This rung adds no specimen type; `initialState` and the structural validations stay because they catch real registry defects.

<a id="h-003"></a>

## H-003: Metric Definitions

Statement: The metrics distinguish static off-origin references from runtime observation, name contrast failures precisely, and publish five browser-membership coverage values.

Evidence:

- [`metrics.js`](../harness/metrics/metrics.js#L87) defines `Static off-origin
  references`; line 91 defines `Contrast failures`; lines 94 through 98 define
  the five membership cards.
- [`metrics.json`](../harness/metrics/metrics.json) reports 48 designed pair
  identities, 13 observed pair identities, 660 observations, 145 classified
  exclusions, and 0 unclassified observations.
- [`membership.json`](../harness/runner/membership.json#L5) records 53 expected
  and 53 observed capture samples and breaks the 145 exclusions down by reason.
- The full capture-loop evidence is
  `work-logs/evidence/2026-08-05-h5gameui-03/gate-3.4-playwright-results.json`.

Question: Approve these metric definitions and the five coverage measures, yes or no?

Decision: Approved as defined.

<a id="h-004"></a>

## H-004: Golden Blessing Process

Statement: A checked-in manifest entry is the durable approval state, and only the operator may add an entry or an approved PNG.

Evidence:

- [`approval-manifest.json`](../harness/goldens/approval-manifest.json#L1) defines
  version 1, SHA-256, and zero entries.
- [`harness/goldens/README.md`](../harness/goldens/README.md#L45) defines the
  manifest format, operator-only workflow, and complete comparator state table.
- `work-logs/evidence/2026-08-05-h5gameui-03/gate-3.2-manifest-entry-missing-png.txt`
  proves that an entry without its approved PNG exits nonzero.
- `work-logs/evidence/2026-08-05-h5gameui-03/gate-3.2-manifest-entry-corrupt-png.txt`
  proves that an entry with a corrupt approved PNG exits nonzero.

Question: Approve the manifest-backed, operator-only golden blessing process, yes or no?

Decision: Superseded by the recorded-baseline model in [AGENTS.md](../AGENTS.md). The manifest survives as an integrity record, not as an approval ceremony. Rationale: the ceremony required an operator to hand-bless every capture before the suite could fail, and that cost was never paid.

<a id="h-005"></a>

## H-005: Published Preview

Statement: The published ML01 preview passed every required browser smoke assertion.

Evidence:

- Preview: [https://gameui.donfather.site/reference/](https://gameui.donfather.site/reference/)
- `work-logs/evidence/2026-08-05-h5gameui-03/gate-3.8-published-smoke-final.json`
  records nine separate passing assertions: 7 scenarios, 4 theme controls, a
  visible metrics block with 22 cards, a visible auditor with 0 violations,
  0 console errors, 0 module-load failures, and 0 runtime off-origin requests.
- `work-logs/evidence/2026-08-05-h5gameui-03/gate-3.8-final-publish.txt`
  records the successful publication and smoke command.

Question: Does the published preview render correctly, yes or no?

Answer: Yes.

<a id="h-006"></a>

## H-006: Second Viewport

Statement: Every current scenario uses one 1280 by 800 desktop viewport, while capture identity already includes the viewport name.

Evidence:

- [`scenarios.js`](../harness/registry/scenarios.js#L25) declares the sole
  `desktop` viewport used by all seven scenarios.
- [`cases.js`](../harness/runner/cases.js#L31) includes the viewport name in
  every durable capture identity.
- [`runner.test.js`](../harness/tests/runner.test.js#L51) proves that the real
  roster produces 53 desktop cases; the test at line 61 proves that each
  scenario currently has exactly one viewport.
- [`matrix.json`](../harness/goldens/candidates/matrix.json) records `desktop`
  in all 53 candidate identities.

Question: Add a second viewport and regenerate candidates before H-001 is answered, yes or no?

Decision: Yes, add a second viewport, scoped to the status-family scenarios only. Viewports are per scenario, and a second capture of a palette swatch grid buys nothing. Capture identity already carries the viewport name, so the roster extension is additive.
