/**
 * Script Name : color.test.js
 * Description : Assert WCAG contrast math and CSS color resolution paths.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Published fixtures come from W3C WCAG material:
 *   https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
 *   https://www.w3.org/WAI/WCAG21/Techniques/general/G207.html
 *   https://www.w3.org/WAI/WCAG22/Techniques/general/G183
 */

import assert from "node:assert/strict";
import test from "node:test";

import { contrastRatio, parseColor } from "../metrics/color.js";
import * as contrast from "../metrics/contrast.js";

const PUBLISHED_RATIO_TOLERANCE = 0.06;

function assertApprox(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function assertColor(actual, expected) {
  assert.ok(actual, "expected a resolved color");
  assertApprox(actual.L, expected.L);
  assertApprox(actual.C, expected.C);
  assertApprox(actual.h, expected.h);
}

test("contrastRatio matches published W3C reference values", () => {
  const cases = [
    { foreground: "#ffffff", background: "#ffffff", ratio: 1 },
    { foreground: "#000000", background: "#ffffff", ratio: 21 },
    { foreground: "#e3660e", background: "#ffffff", ratio: 3.4 },
    { foreground: "#3366cc", background: "#000000", ratio: 3.9 },
  ];

  for (const entry of cases) {
    const actual = contrastRatio(
      parseColor(entry.foreground),
      parseColor(entry.background),
    );
    assertApprox(actual, entry.ratio, PUBLISHED_RATIO_TOLERANCE);
  }
});

test("resolveColor accepts a direct literal", () => {
  assert.equal(typeof contrast.resolveColor, "function");
  assertColor(contrast.resolveColor("oklch(0.5 0.2 30)", {}), {
    L: 0.5,
    C: 0.2,
    h: 30,
  });
});

test("resolveColor follows one-hop and multi-hop var chains", () => {
  const map = {
    "--gc-one": "oklch(0.4 0.1 20)",
    "--gc-two": "var(--gc-one)",
    "--gc-three": "var(--gc-two)",
  };

  assertColor(contrast.resolveColor("var(--gc-two)", map), {
    L: 0.4,
    C: 0.1,
    h: 20,
  });
  assertColor(contrast.resolveColor("var(--gc-three)", map), {
    L: 0.4,
    C: 0.1,
    h: 20,
  });
});

test("resolveColor applies a var fallback", () => {
  assertColor(
    contrast.resolveColor("var(--gc-missing, oklch(0.6 0.05 80))", {}),
    { L: 0.6, C: 0.05, h: 80 },
  );
});

test("resolveColor returns null for an unresolvable var chain", () => {
  const map = {
    "--gc-a": "var(--gc-b)",
    "--gc-b": "var(--gc-a)",
  };

  assert.equal(contrast.resolveColor("var(--gc-a)", map), null);
});

test("resolveColor mixes OKLCH colors with both percentages", () => {
  assertColor(
    contrast.resolveColor(
      "color-mix(in oklch, oklch(0.2 0 0) 25%, oklch(0.6 0 0) 75%)",
      {},
    ),
    { L: 0.5, C: 0, h: 0 },
  );
});

test("resolveColor infers an omitted color-mix percentage", () => {
  assertColor(
    contrast.resolveColor(
      "color-mix(in oklch, oklch(0.2 0 0) 20%, oklch(0.6 0 0))",
      {},
    ),
    { L: 0.52, C: 0, h: 0 },
  );
});
