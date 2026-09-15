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
feature that needs a version above the declared floor fails the ordinary test
command rather than waiting for a browser below the floor to break.

The check runs in `npm test` through
`harness/tests/browser-floor.test.js`. A spec that introduces a CSS feature
updates this manifest, its requirement versions, and its compatibility source
in the same change.
