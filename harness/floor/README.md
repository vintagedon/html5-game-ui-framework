<!--
---
title: "Browser Floor"
description: "The declared browser floor manifest and the check that published source clears it"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-15"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: harness
  - tech: [css, javascript, node]
related_documents:
  - "[Project Charter](../../docs/project-charter.md)"
  - "[Conformance Harness](../README.md)"
---
-->

# Browser Floor

One manifest, one check. `browser-floor.json` declares the browser floor and
the floor-binding features actually in use, each with the versions it requires
and the compatibility source those figures came from. The charter's frozen
browser-floor row is the authority; `check.js` compares the manifest against
it and scans published source (`src/`) for each declared feature form, so a
form that needs a version above the declared floor fails the ordinary test
command rather than waiting for a browser below the floor to break.

The guarantee is exactly that and no more. The source scan is substring
presence checking: it reports where a declared form occurs and scores that
occurrence against the manifest's requirement, and it does not parse how the
form's arguments are shaped. Assumptions such as `round()` taking only
same-type arguments, which Safari distinguishes from mixed-type forms, are
declarations recorded in the manifest and reviewed by the operator; the scan
cannot verify them and does not claim to.

The check runs in `npm test` through
`harness/tests/browser-floor.test.js`. A spec that introduces a CSS feature
updates this manifest, its requirement versions, and its compatibility source
in the same change.
