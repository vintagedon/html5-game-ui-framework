/**
 * Script Name : browser-floor.test.js
 * Description : Assert the floor manifest agrees with the charter and source presence clears the floors.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-15
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Runs in the ordinary documented test command. Fails when a listed feature
 * form present in published source requires a version above a declared
 * floor, and when the manifest disagrees with the charter's authoritative
 * floor row. The mutation cases drive the real source scan over fixture
 * source, not a hand-fed violation list, so the discrimination claimed here
 * is the discrimination the checker performs. One case pins the scan's
 * honest limit: it reports substring presence and does not verify argument
 * forms, which is why same-type arguments are an operator-reviewed
 * declaration rather than something this suite proves.
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  charterFloors,
  floorViolations,
  loadFloorManifest,
  scanPublishedSource,
} from "../floor/check.js";

function withScratch(run) {
  const directory = mkdtempSync(join(tmpdir(), "h5gameui-floor-"));
  try {
    return run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("every listed feature form present in published source clears the declared floors", () => {
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

test("the source scan reports a fixture form present and fails it above the floor", () => {
  const manifest = loadFloorManifest();
  const floors = charterFloors();
  // The mutation drives the real scan: fixture source carrying a synthetic
  // form, scanned through scanPublishedSource exactly as published source is.
  withScratch((directory) => {
    writeFileSync(
      join(directory, "mutation.css"),
      "a { width: hypothetical-above-floor(down, 100%, 10px); }\n",
    );
    const mutated = {
      ...manifest,
      features: [
        ...manifest.features,
        {
          feature: "hypothetical-above-floor()",
          form: "hypothetical-above-floor(",
          requires: { chrome: 999, edge: 999, firefox: 999, safari: 999 },
          sources: ["synthetic mutation fixture"],
        },
      ],
    };
    const scan = scanPublishedSource(mutated, directory);
    const reported = scan.present.map((feature) => feature.feature);
    assert.ok(
      reported.includes("hypothetical-above-floor()"),
      "the real scan must find the mutated form in source",
    );
    const violations = floorViolations({ manifest: mutated, floors, present: scan.present });
    assert.ok(
      violations.some((violation) => violation.includes("above the declared floor")),
      violations.join("; "),
    );
  });
});

test("the scan reports substring presence, not argument forms", () => {
  const manifest = loadFloorManifest();
  const floors = charterFloors();
  // The mixed-type round() form from the first review, placed in fixture
  // source: the scan finds round( present and scores it against the
  // manifest's same-type Safari requirement, and that is all it does. That
  // this yields no violation is the honest limit the manifest declares:
  // same-type arguments are an operator-reviewed assumption, and a mixed-type
  // form in real source is a stop condition for the operator, not something
  // this check can catch.
  withScratch((directory) => {
    writeFileSync(join(directory, "mixed.css"), "a { top: round(down, 100%, 10px); }\n");
    const scan = scanPublishedSource(manifest, directory);
    const round = scan.present.find((feature) => feature.feature === "round()");
    assert.ok(round, "the scan reports the round( form present");
    assert.deepEqual(
      floorViolations({ manifest, floors, present: scan.present }),
      [],
      "the scan verifies presence only; argument forms are a reviewed assumption",
    );
  });
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
