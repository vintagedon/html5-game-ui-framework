/**
 * Script Name : compare.test.js
 * Description : Assert approval-manifest and PNG comparison state transitions.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Tests use real PNG encoding, hashing, and scratch filesystem paths. Each case
 * names one durable approval state so missing or damaged approved files can
 * never collapse into the unapproved `awaiting` state.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PNG } from "pngjs";

import * as comparator from "../runner/compare.js";

const CASE_ID = "scenario/theme/checkpoint.png";
const EMPTY_MANIFEST = { version: 1, algorithm: "sha256", entries: {} };

function png(width, height, [r, g, b, a = 255]) {
  const image = new PNG({ width, height });
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = r;
    image.data[i + 1] = g;
    image.data[i + 2] = b;
    image.data[i + 3] = a;
  }
  return PNG.sync.write(image);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function manifestWith(hash) {
  return {
    version: 1,
    algorithm: "sha256",
    entries: { [CASE_ID]: hash },
  };
}

function compare(candidatePng, approvedPath, manifest = EMPTY_MANIFEST) {
  return comparator.compareCapture(candidatePng, {
    approvedPath,
    caseId: CASE_ID,
    manifest,
  });
}

function withScratch(run) {
  const directory = mkdtempSync(join(tmpdir(), "h5gameui-compare-"));
  try {
    return run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("the checked-in approval manifest is empty", () => {
  assert.equal(typeof comparator.readApprovalManifest, "function");
  const manifest = comparator.readApprovalManifest();
  assert.equal(manifest.version, 1);
  assert.equal(manifest.algorithm, "sha256");
  assert.equal(Object.keys(manifest.entries).length, 0);
});

test("an unapproved case with no PNG is awaiting", () =>
  withScratch((directory) => {
    const result = compare(png(2, 2, [0, 0, 0]), join(directory, "absent.png"));

    assert.deepEqual(result, {
      status: "awaiting",
      reason: "unapproved",
      approved: false,
      baselinePresent: false,
    });
  }));

test("an unapproved case with a PNG is awaiting and reported unapproved", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "unapproved.png");
    writeFileSync(approvedPath, png(2, 2, [0, 0, 0]));

    const result = compare(png(2, 2, [0, 0, 0]), approvedPath);
    assert.deepEqual(result, {
      status: "awaiting",
      reason: "unapproved-baseline-present",
      approved: false,
      baselinePresent: true,
    });
  }));

test("an approved case with a missing PNG fails", () =>
  withScratch((directory) => {
    const result = compare(
      png(2, 2, [0, 0, 0]),
      join(directory, "missing.png"),
      manifestWith("0".repeat(64)),
    );

    assert.equal(result.status, "failure");
    assert.equal(result.reason, "approved-baseline-missing");
    assert.equal(result.caseId, CASE_ID);
  }));

test("an approved case with an unreadable PNG fails", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "directory-not-file.png");
    mkdirSync(approvedPath);

    const result = compare(
      png(2, 2, [0, 0, 0]),
      approvedPath,
      manifestWith("0".repeat(64)),
    );
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "approved-baseline-unreadable");
  }));

test("an approved case with an unparseable PNG fails", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "corrupt.png");
    const corrupt = Buffer.from("not a png");
    writeFileSync(approvedPath, corrupt);

    const result = compare(
      png(2, 2, [0, 0, 0]),
      approvedPath,
      manifestWith(sha256(corrupt)),
    );
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "approved-baseline-unparseable");
  }));

test("an approved case with a size-mismatched PNG fails", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "approved.png");
    const baseline = png(2, 2, [0, 0, 0]);
    writeFileSync(approvedPath, baseline);

    const result = compare(png(3, 2, [0, 0, 0]), approvedPath, manifestWith(sha256(baseline)));
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "approved-baseline-size-mismatch");
  }));

test("an approved case with a hash-mismatched PNG fails", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "approved.png");
    const expected = png(2, 2, [0, 0, 255]);
    const replaced = png(2, 2, [255, 0, 0]);
    writeFileSync(approvedPath, replaced);

    const result = compare(expected, approvedPath, manifestWith(sha256(expected)));
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "approved-baseline-hash-mismatch");
  }));

test("an approved case with matching integrity and pixels passes", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "approved.png");
    const baseline = png(2, 2, [0, 0, 0]);
    writeFileSync(approvedPath, baseline);

    const result = compare(baseline, approvedPath, manifestWith(sha256(baseline)));
    assert.equal(result.status, "pass");
    assert.equal(result.reason, "match");
    assert.equal(result.approved, true);
  }));

test("an approved case with matching integrity but different pixels fails", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "approved.png");
    const baseline = png(2, 2, [0, 0, 0]);
    writeFileSync(approvedPath, baseline);

    const result = compare(
      png(2, 2, [255, 255, 255]),
      approvedPath,
      manifestWith(sha256(baseline)),
    );
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "pixel-difference");
  }));
