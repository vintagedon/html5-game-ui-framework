/**
 * Script Name : compare.js
 * Description : Candidate-vs-approved pixel comparison for golden captures.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * The checked-in approval manifest is the durable record distinguishing a case
 * that has never been approved from one whose approved PNG is missing or damaged.
 * Only the operator adds entries. A manifest entry binds a case identity to the
 * SHA-256 of its approved PNG; any missing, unreadable, unparseable, mismatched,
 * or visually different approved case is a failure rather than "awaiting".
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

export const APPROVAL_MANIFEST_PATH = fileURLToPath(
  new URL("../goldens/approval-manifest.json", import.meta.url),
);

// Per-channel color sensitivity (0 = exact, 1 = anything). 0.1 absorbs minor
// anti-aliasing while still flagging a real color change.
const THRESHOLD = 0.1;
// Fail when more than this fraction of pixels differ. Single-browser goldens are
// near-exact; a real regression moves far more than this.
const MAX_RATIO = 0.002;

/**
 * Read and validate the durable approval manifest.
 * @param {string} [path]
 * @returns {{version:1, algorithm:"sha256", entries:Record<string,string>}}
 */
export function readApprovalManifest(path = APPROVAL_MANIFEST_PATH) {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (manifest?.version !== 1) throw new Error("approval manifest version must be 1");
  if (manifest?.algorithm !== "sha256") {
    throw new Error('approval manifest algorithm must be "sha256"');
  }
  if (!manifest.entries || typeof manifest.entries !== "object" || Array.isArray(manifest.entries)) {
    throw new Error("approval manifest entries must be an object");
  }
  for (const [caseId, hash] of Object.entries(manifest.entries)) {
    if (!/^[0-9a-f]{64}$/i.test(hash)) {
      throw new Error(`approval manifest entry "${caseId}" must contain a SHA-256 hash`);
    }
  }
  return manifest;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function failure(caseId, reason, detail = {}) {
  return { status: "failure", reason, approved: true, caseId, ...detail };
}

/**
 * @param {Buffer} candidatePng PNG bytes just captured
 * @param {{approvedPath:string, caseId:string, manifest:{entries:Record<string,string>}}} options
 * @returns {{status:"awaiting"|"pass"|"failure", reason:string, approved:boolean, caseId?:string, baselinePresent?:boolean, diffPixels?:number, total?:number, ratio?:number}}
 */
export function compareCapture(candidatePng, { approvedPath, caseId, manifest }) {
  const approvedHash = manifest?.entries?.[caseId];
  if (!approvedHash) {
    const baselinePresent = existsSync(approvedPath);
    return {
      status: "awaiting",
      reason: baselinePresent ? "unapproved-baseline-present" : "unapproved",
      approved: false,
      baselinePresent,
    };
  }

  let baselinePng;
  try {
    baselinePng = readFileSync(approvedPath);
  } catch (error) {
    return failure(
      caseId,
      error?.code === "ENOENT"
        ? "approved-baseline-missing"
        : "approved-baseline-unreadable",
      { error: String(error?.message || error) },
    );
  }

  const actualHash = sha256(baselinePng);
  if (actualHash !== approvedHash.toLowerCase()) {
    return failure(caseId, "approved-baseline-hash-mismatch", {
      expectedHash: approvedHash.toLowerCase(),
      actualHash,
    });
  }

  let baseline;
  try {
    baseline = PNG.sync.read(baselinePng);
  } catch (error) {
    return failure(caseId, "approved-baseline-unparseable", {
      error: String(error?.message || error),
    });
  }

  let actual;
  try {
    actual = PNG.sync.read(candidatePng);
  } catch (error) {
    return failure(caseId, "candidate-unparseable", {
      error: String(error?.message || error),
    });
  }

  if (actual.width !== baseline.width || actual.height !== baseline.height) {
    return failure(caseId, "approved-baseline-size-mismatch", {
      actualSize: `${actual.width}x${actual.height}`,
      approvedSize: `${baseline.width}x${baseline.height}`,
      diffPixels: -1,
      total: actual.width * actual.height,
    });
  }

  const { width, height } = actual;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(actual.data, baseline.data, diff.data, width, height, { threshold: THRESHOLD });
  const total = width * height;
  const ratio = diffPixels / total;
  if (ratio > MAX_RATIO) {
    return failure(caseId, "pixel-difference", { diffPixels, total, ratio });
  }
  return {
    status: "pass",
    reason: "match",
    approved: true,
    caseId,
    diffPixels,
    total,
    ratio,
  };
}
