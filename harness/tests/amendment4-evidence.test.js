/**
 * Script Name : amendment4-evidence.test.js
 * Description : Assert Amendment 4 PNG evidence discrimination.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import assert from "node:assert/strict";
import test from "node:test";

import { PNG } from "pngjs";

async function evidenceHelpers() {
  try {
    return await import("../runner/amendment4-evidence.js");
  } catch {
    assert.fail("Amendment 4 evidence helpers must exist as a pure module");
  }
}

function solidPng(red) {
  const png = new PNG({ width: 2, height: 2 });
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = red;
    png.data[offset + 1] = 0;
    png.data[offset + 2] = 0;
    png.data[offset + 3] = 255;
  }
  return PNG.sync.write(png);
}

test("identical PNG evidence is rejected", async () => {
  const { comparePngBuffers, assertChangedPair } = await evidenceHelpers();
  const image = solidPng(40);
  const comparison = comparePngBuffers(image, image);

  assert.equal(comparison.hashesEqual, true);
  assert.equal(comparison.differentPixels, 0);
  assert.throws(
    () => assertChangedPair("fixture", comparison),
    /fixture.*identical SHA-256 hashes.*zero differing pixels/,
  );
});

test("a nonzero PNG difference passes the evidence check", async () => {
  const { comparePngBuffers, assertChangedPair } = await evidenceHelpers();
  const comparison = comparePngBuffers(solidPng(40), solidPng(120));

  assert.equal(comparison.hashesEqual, false);
  assert.equal(comparison.differentPixels, 4);
  assert.doesNotThrow(() => assertChangedPair("fixture", comparison));
});
