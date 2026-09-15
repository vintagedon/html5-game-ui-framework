/**
 * Script Name : browser-floor.test.js
 * Description : Assert published source clears the declared browser floor.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-15
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Runs in the ordinary documented test command. Fails when a listed feature
 * present in published source requires a version above a declared floor, and
 * when the manifest disagrees with the charter's authoritative floor row. The
 * mutation case proves the check discriminates: a synthetic feature above the
 * floor is reported.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  charterFloors,
  floorViolations,
  loadFloorManifest,
  scanPublishedSource,
} from "../floor/check.js";

test("every listed feature present in published source clears the declared floors", () => {
  const manifest = loadFloorManifest();
  const floors = charterFloors();
  const scan = scanPublishedSource(manifest);

  assert.ok(scan.filesScanned > 0, "published source must contain files to scan");
  assert.deepEqual(floorViolations({ manifest, floors, present: scan.present }), []);

  // The features that bind the floor are actually in use; a binding feature
  // nothing uses is a compatibility database entry, not a contract.
  const presentForms = new Set(scan.present.map((feature) => feature.feature));
  for (const feature of manifest.features) {
    if (feature.binding) {
      assert.ok(
        presentForms.has(feature.feature),
        `binding feature ${feature.feature} must be present in published source`,
      );
      assert.ok(
        Array.isArray(feature.sources) && feature.sources.length > 0,
        `${feature.feature} must record its compatibility source`,
      );
    }
  }
});

test("the floor check fails on a feature requiring a version above a declared floor", () => {
  const manifest = loadFloorManifest();
  const floors = charterFloors();
  const mutation = [
    {
      feature: "hypothetical-above-floor()",
      form: "hypothetical-above-floor(",
      requires: { chrome: 999, edge: 999, firefox: 999, safari: 999 },
    },
  ];
  const violations = floorViolations({ manifest, floors, present: mutation });
  assert.ok(violations.length > 0, "an above-floor feature must be reported");
  assert.ok(
    violations.some((violation) => violation.includes("above the declared floor")),
    violations.join("; "),
  );
});

test("the floor check fails when the manifest disagrees with the charter", () => {
  const manifest = loadFloorManifest();
  const driftedFloors = { ...charterFloors(), chrome: manifest.floors.chrome + 1 };
  const violations = floorViolations({
    manifest,
    floors: driftedFloors,
    present: [],
  });
  assert.ok(
    violations.some((violation) => violation.includes("disagrees with the charter")),
    violations.join("; "),
  );
});
