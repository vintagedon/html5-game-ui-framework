/**
 * Script Name : compare.test.js
 * Description : Assert recorded-baseline comparison states and establishment.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Tests use real PNG encoding, hashing, and scratch filesystem paths. Each
 * case names one durable baseline state so a missing, unrecorded, or damaged
 * baseline can never collapse into the establishable `unrecorded` state, and
 * so the establish path is proven to refuse every existing baseline.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
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

test("the checked-in manifest is a valid integrity record", () => {
  assert.equal(typeof comparator.readApprovalManifest, "function");
  const manifest = comparator.readApprovalManifest();
  assert.equal(manifest.version, 1);
  assert.equal(manifest.algorithm, "sha256");
  assert.equal(typeof manifest.entries, "object");
});

test("a case with no entry and no PNG is unrecorded, the only establishable state", () =>
  withScratch((directory) => {
    const result = compare(png(2, 2, [0, 0, 0]), join(directory, "absent.png"));

    assert.deepEqual(result, {
      status: "unrecorded",
      reason: "no-baseline",
      caseId: CASE_ID,
      baselinePresent: false,
    });
  }));

test("a PNG with no manifest entry fails as a hand-edited tree", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "unrecorded.png");
    writeFileSync(approvedPath, png(2, 2, [0, 0, 0]));

    const result = compare(png(2, 2, [0, 0, 0]), approvedPath);
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "baseline-entry-missing");
    assert.equal(result.baselinePresent, true);
  }));

test("a recorded case with a missing PNG fails", () =>
  withScratch((directory) => {
    const result = compare(
      png(2, 2, [0, 0, 0]),
      join(directory, "missing.png"),
      manifestWith("0".repeat(64)),
    );

    assert.equal(result.status, "failure");
    assert.equal(result.reason, "baseline-missing");
    assert.equal(result.caseId, CASE_ID);
  }));

test("a recorded case with an unreadable PNG fails", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "directory-not-file.png");
    mkdirSync(approvedPath);

    const result = compare(
      png(2, 2, [0, 0, 0]),
      approvedPath,
      manifestWith("0".repeat(64)),
    );
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "baseline-unreadable");
  }));

test("a recorded case with an unparseable PNG fails", () =>
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
    assert.equal(result.reason, "baseline-unparseable");
  }));

test("a recorded case with a size-mismatched PNG fails", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "approved.png");
    const baseline = png(2, 2, [0, 0, 0]);
    writeFileSync(approvedPath, baseline);

    const result = compare(png(3, 2, [0, 0, 0]), approvedPath, manifestWith(sha256(baseline)));
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "baseline-size-mismatch");
  }));

test("a recorded case with a hash-mismatched PNG fails", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "approved.png");
    const expected = png(2, 2, [0, 0, 255]);
    const replaced = png(2, 2, [255, 0, 0]);
    writeFileSync(approvedPath, replaced);

    const result = compare(expected, approvedPath, manifestWith(sha256(expected)));
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "baseline-hash-mismatch");
  }));

test("a recorded case with matching integrity and pixels passes", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "approved.png");
    const baseline = png(2, 2, [0, 0, 0]);
    writeFileSync(approvedPath, baseline);

    const result = compare(baseline, approvedPath, manifestWith(sha256(baseline)));
    assert.equal(result.status, "pass");
    assert.equal(result.reason, "match");
  }));

test("a recorded case with matching integrity but different pixels fails with the diff surfaced", () =>
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
    assert.equal(result.diffPixels, 4);
    assert.ok(result.diffPng, "the diff image must be surfaced with the failure");
  }));

test("establish writes the baseline PNG and returns its entry", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "nested", "case.png");
    const candidate = png(2, 2, [10, 20, 30]);

    const entry = comparator.establishBaseline({
      approvedPath,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });

    assert.equal(entry.caseId, CASE_ID);
    assert.equal(entry.hash, sha256(candidate));
    assert.deepEqual(readFileSync(approvedPath), candidate);
  }));

test("establish refuses a case whose manifest entry already exists", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "absent.png");
    assert.throws(
      () =>
        comparator.establishBaseline({
          approvedPath,
          caseId: CASE_ID,
          candidatePng: png(2, 2, [0, 0, 0]),
          manifest: manifestWith("0".repeat(64)),
        }),
      /refusing to establish .* a manifest entry already exists/,
    );
    assert.equal(
      comparator.APPROVAL_MANIFEST_PATH.length > 0 && approvedPath.includes("absent"),
      true,
    );
  }));

test("establish refuses a case whose baseline PNG already exists", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "present.png");
    writeFileSync(approvedPath, png(2, 2, [0, 0, 0]));

    assert.throws(
      () =>
        comparator.establishBaseline({
          approvedPath,
          caseId: CASE_ID,
          candidatePng: png(2, 2, [0, 0, 0]),
          manifest: EMPTY_MANIFEST,
        }),
      /refusing to establish .* a baseline PNG already exists/,
    );
  }));

test("the manifest merge adds entries and never rewrites an existing one", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const existing = png(2, 2, [1, 1, 1]);
    const fresh = png(2, 2, [2, 2, 2]);
    writeFileSync(
      manifestPath,
      JSON.stringify(
        { version: 1, algorithm: "sha256", entries: { existing: sha256(existing) } },
        null,
        2,
      ) + "\n",
    );

    const added = comparator.writeManifestEntries({
      entries: [{ caseId: "fresh", hash: sha256(fresh) }],
      path: manifestPath,
    });
    assert.equal(added.written, 1);
    assert.equal(added.totalEntries, 2);

    const merged = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(merged.entries.existing, sha256(existing));
    assert.equal(merged.entries.fresh, sha256(fresh));

    assert.throws(
      () =>
        comparator.writeManifestEntries({
          entries: [{ caseId: "existing", hash: sha256(fresh) }],
          path: manifestPath,
        }),
      /refusing to rewrite manifest entry "existing"/,
    );
  }));
