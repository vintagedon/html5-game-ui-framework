/**
 * Script Name : compare.js
 * Description : Candidate-vs-approved pixel comparison for golden captures.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * The runner writes captures to the candidate path and compares them against the
 * approved path only when an approved baseline exists. Agents never write the
 * approved path, so a missing baseline is reported as "awaiting approval" rather
 * than as a failure. pixelmatch measures the diff; a single-platform, single-
 * browser golden is near-pixel-stable, so the tolerance is tight but absorbs
 * anti-aliasing. A token-value change touches enough pixels to exceed any
 * reasonable tolerance, which is exactly what the Gate 2.5 mutation proves.
 */

import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

// Per-channel color sensitivity (0 = exact, 1 = anything). 0.1 absorbs minor
// anti-aliasing while still flagging a real color change.
const THRESHOLD = 0.1;
// Fail when more than this fraction of pixels differ. Single-browser goldens are
// near-exact; a real regression moves far more than this.
const MAX_RATIO = 0.002;

/**
 * @param {Buffer} candidatePng PNG bytes just captured
 * @param {string} approvedPath absolute path to the approved baseline
 * @returns {{status:"match"|"diff"|"size", diffPixels?:number, total?:number, ratio?:number}}
 */
export function compareCapture(candidatePng, approvedPath) {
  let baseline;
  try {
    baseline = PNG.sync.read(readFileSync(approvedPath));
  } catch {
    return { status: "awaiting" };
  }

  const actual = PNG.sync.read(candidatePng);
  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    return { status: "size", diffPixels: -1, total: actual.width * actual.height };
  }

  const { width, height } = actual;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(actual.data, baseline.data, diff.data, width, height, { threshold: THRESHOLD });
  const total = width * height;
  const ratio = diffPixels / total;
  return ratio <= MAX_RATIO
    ? { status: "match", diffPixels, total, ratio }
    : { status: "diff", diffPixels, total, ratio };
}
