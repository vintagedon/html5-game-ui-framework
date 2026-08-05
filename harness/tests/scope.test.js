/**
 * Script Name : scope.test.js
 * Description : Assert metric-scope file classification behavior.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import assert from "node:assert/strict";
import test from "node:test";

import * as scope from "../metrics/scope.js";

test("raster detection is case-insensitive", () => {
  assert.equal(typeof scope.isRasterPath, "function");
  assert.equal(scope.isRasterPath("src/core/asset.png"), true);
  assert.equal(scope.isRasterPath("src/core/asset.PNG"), true);
  assert.equal(scope.isRasterPath("src/core/asset.WebP"), true);
  assert.equal(scope.isRasterPath("src/core/asset.png.txt"), false);
});
