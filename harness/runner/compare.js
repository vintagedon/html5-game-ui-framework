/**
 * Script Name : compare.js
 * Description : Recorded-baseline comparison and establishment for golden captures.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * The checked-in manifest is the integrity record binding a case identity to
 * the SHA-256 of its baseline PNG, so a baseline file that has been corrupted
 * or swapped is detected. Establishing a baseline where none exists is the
 * only write this module performs: it copies the candidate PNG into the
 * approved tree and records its hash. There is no code path that modifies or
 * deletes an existing baseline PNG or manifest entry; a capture that
 * disagrees with its baseline is a failure to surface, never a file to
 * refresh, and accepting a changed render is the operator deleting the
 * baseline and its entry (a deletion in the diff).
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
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
 * Read and validate the durable baseline manifest.
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

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function failure(caseId, reason, detail = {}) {
  return { status: "failure", reason, caseId, ...detail };
}

/**
 * Classify one capture against its recorded baseline. Pure: this function
 * never writes. `unrecorded` is the only state that may be established
 * afterward, by establishBaseline below.
 *
 * @param {Buffer} candidatePng PNG bytes just captured
 * @param {{approvedPath:string, caseId:string, manifest:{entries:Record<string,string>}}} options
 * @returns {{status:"unrecorded"|"pass"|"failure", reason:string, caseId?:string, baselinePresent?:boolean, diffPixels?:number, total?:number, ratio?:number, diffPng?:PNG}}
 */
export function compareCapture(candidatePng, { approvedPath, caseId, manifest }) {
  const baselineHash = manifest?.entries?.[caseId];
  if (!baselineHash) {
    const baselinePresent = existsSync(approvedPath);
    if (baselinePresent) {
      // A PNG nobody recorded is a hand-edited tree; it is surfaced, not adopted.
      return failure(caseId, "baseline-entry-missing", { baselinePresent });
    }
    return { status: "unrecorded", reason: "no-baseline", caseId, baselinePresent: false };
  }

  let baselinePng;
  try {
    baselinePng = readFileSync(approvedPath);
  } catch (error) {
    return failure(
      caseId,
      error?.code === "ENOENT"
        ? "baseline-missing"
        : "baseline-unreadable",
      { error: String(error?.message || error) },
    );
  }

  const actualHash = sha256(baselinePng);
  if (actualHash !== baselineHash.toLowerCase()) {
    return failure(caseId, "baseline-hash-mismatch", {
      expectedHash: baselineHash.toLowerCase(),
      actualHash,
    });
  }

  let baseline;
  try {
    baseline = PNG.sync.read(baselinePng);
  } catch (error) {
    return failure(caseId, "baseline-unparseable", {
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
    return failure(caseId, "baseline-size-mismatch", {
      actualSize: `${actual.width}x${actual.height}`,
      baselineSize: `${baseline.width}x${baseline.height}`,
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
    return failure(caseId, "pixel-difference", { diffPixels, total, ratio, diffPng: diff });
  }
  return {
    status: "pass",
    reason: "match",
    caseId,
    diffPixels,
    total,
    ratio,
  };
}

/**
 * Establish a baseline where none exists: write the candidate PNG into the
 * approved tree and return its manifest entry. The only write an agent
 * performs; refuses if any baseline or entry already exists for the case.
 *
 * @param {{approvedPath:string, caseId:string, candidatePng:Buffer, manifest:{entries:Record<string,string>}}} options
 * @returns {{caseId:string, hash:string}}
 */
export function establishBaseline({ approvedPath, caseId, candidatePng, manifest }) {
  if (manifest?.entries?.[caseId]) {
    throw new Error(`refusing to establish "${caseId}": a manifest entry already exists`);
  }
  if (existsSync(approvedPath)) {
    throw new Error(`refusing to establish "${caseId}": a baseline PNG already exists`);
  }
  mkdirSync(dirname(approvedPath), { recursive: true });
  writeFileSync(approvedPath, candidatePng);
  return { caseId, hash: sha256(candidatePng) };
}

/**
 * Merge established entries into the on-disk manifest. Existing entries are
 * never rewritten: a key collision with a different hash aborts the run.
 *
 * @param {{entries: {caseId: string, hash: string}[], path?: string}} options
 * @returns {{written: number, totalEntries: number}}
 */
export function writeManifestEntries({ entries, path = APPROVAL_MANIFEST_PATH }) {
  const current = readApprovalManifest(path);
  const merged = { ...current.entries };
  for (const { caseId, hash } of entries) {
    const existing = merged[caseId];
    if (existing != null && existing.toLowerCase() !== hash) {
      throw new Error(
        `refusing to rewrite manifest entry "${caseId}": recorded ${existing}, captured ${hash}`,
      );
    }
    merged[caseId] = hash;
  }
  writeFileSync(
    path,
    JSON.stringify({ version: 1, algorithm: "sha256", entries: merged }, null, 2) + "\n",
  );
  return { written: entries.length, totalEntries: Object.keys(merged).length };
}
