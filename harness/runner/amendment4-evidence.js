/**
 * Script Name : amendment4-evidence.js
 * Description : Compare Amendment 4 screenshot evidence by hash and pixels.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import { createHash } from "node:crypto";

import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

/** Return SHA-256 and exact pixel-difference facts for two PNG buffers. */
export function comparePngBuffers(beforeBuffer, afterBuffer) {
  const before = PNG.sync.read(beforeBuffer);
  const after = PNG.sync.read(afterBuffer);
  if (before.width !== after.width || before.height !== after.height) {
    throw new Error(
      `PNG dimensions differ: ${before.width}x${before.height} vs ${after.width}x${after.height}`,
    );
  }
  const beforeSha256 = createHash("sha256").update(beforeBuffer).digest("hex");
  const afterSha256 = createHash("sha256").update(afterBuffer).digest("hex");
  const differentPixels = pixelmatch(
    before.data,
    after.data,
    null,
    before.width,
    before.height,
    { threshold: 0 },
  );
  const totalPixels = before.width * before.height;
  return {
    beforeSha256,
    afterSha256,
    hashesEqual: beforeSha256 === afterSha256,
    width: before.width,
    height: before.height,
    differentPixels,
    totalPixels,
    differenceRatio: differentPixels / totalPixels,
  };
}

/** Reject evidence that cannot demonstrate a visible revision difference. */
export function assertChangedPair(name, comparison) {
  const defects = [];
  if (comparison.hashesEqual) defects.push("identical SHA-256 hashes");
  if (comparison.differentPixels === 0) defects.push("zero differing pixels");
  if (defects.length) {
    throw new Error(`${name}: ${defects.join(" and ")}`);
  }
}
