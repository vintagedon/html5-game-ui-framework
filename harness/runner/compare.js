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
 * or swapped is detected. Establishment candidates stay in memory until the
 * complete run passes its comparisons and conformance checks. The commit point
 * creates absent PNGs and adds their manifest entries together. It never
 * modifies or deletes an existing baseline PNG or manifest entry.
 */

import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
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

export function assertApprovedPathSafe(approvedRoot, approvedPath) {
  if (!approvedRoot) return;
  const root = resolve(approvedRoot);
  const target = resolve(approvedPath);
  const fromRoot = relative(root, target);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error(`approved path escapes approved root: ${approvedPath}`);
  }
  let cursor = root;
  for (const segment of ["", ...fromRoot.split(sep)]) {
    if (segment) cursor = join(cursor, segment);
    try {
      if (lstatSync(cursor).isSymbolicLink()) {
        throw new Error(`approved path has symlink ancestor: ${cursor}`);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

function baselineTemporaryPrefix(caseId) {
  const visibleCase = caseId.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 96);
  const identityHash = sha256(Buffer.from(caseId)).slice(0, 12);
  return `.h5gameui-baseline-${visibleCase}-${identityHash}-`;
}

function removeMatchingStaleLinks(candidate, manifestPath, io) {
  const directory = dirname(manifestPath);
  const prefix = baselineTemporaryPrefix(candidate.caseId);
  const approvedStat = lstatSync(candidate.approvedPath);
  const readFile = io.readFile ?? readFileSync;
  const remove = io.remove ?? ((target) => rmSync(target, { force: true }));
  for (const name of readdirSync(directory)) {
    if (!name.startsWith(prefix) || !name.endsWith(".tmp")) continue;
    const temporaryPath = join(directory, name);
    let temporaryStat;
    try {
      temporaryStat = lstatSync(temporaryPath);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    if (!temporaryStat.isFile()) continue;
    if (temporaryStat.dev !== approvedStat.dev || temporaryStat.ino !== approvedStat.ino) continue;
    if (sha256(readFile(temporaryPath)) !== candidate.hash) continue;
    remove(temporaryPath);
  }
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
      let baselinePng;
      try {
        baselinePng = readFileSync(approvedPath);
      } catch {
        return failure(caseId, "baseline-entry-missing", { baselinePresent });
      }
      if (sha256(baselinePng) === sha256(candidatePng)) {
        return {
          status: "unrecorded",
          reason: "baseline-entry-recoverable",
          caseId,
          baselinePresent,
        };
      }
      // The existing failure stays stable for hand-edited or foreign PNGs.
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
 * Stage one establishment candidate in memory. A matching PNG with no entry
 * is an interrupted prior commit and may recover its entry. Any other existing
 * PNG is refused. Durable writes belong to commitBaselineEstablishment.
 *
 * @param {{approvedPath:string, caseId:string, candidatePng:Buffer, manifest:{entries:Record<string,string>}}} options
 * @returns {{approvedPath:string, caseId:string, candidatePng:Buffer, hash:string, baselinePresent:boolean}}
 */
export function establishBaseline({
  approvedPath,
  approvedRoot,
  caseId,
  candidatePng,
  manifest,
}) {
  assertApprovedPathSafe(approvedRoot, approvedPath);
  if (manifest?.entries?.[caseId]) {
    throw new Error(`refusing to establish "${caseId}": a manifest entry already exists`);
  }
  if (existsSync(approvedPath)) {
    let baselinePng;
    try {
      baselinePng = readFileSync(approvedPath);
    } catch {
      throw new Error(`refusing to establish "${caseId}": a baseline PNG already exists`);
    }
    if (sha256(baselinePng) !== sha256(candidatePng)) {
      throw new Error(`refusing to establish "${caseId}": a baseline PNG already exists`);
    }
  }
  return {
    approvedPath,
    approvedRoot,
    caseId,
    candidatePng,
    hash: sha256(candidatePng),
    baselinePresent: existsSync(approvedPath),
  };
}

/**
 * Merge established entries into the on-disk manifest. Existing entries are
 * never rewritten: a key collision with a different hash aborts the run.
 *
 * @param {{
 *   entries: {caseId: string, hash: string}[],
 *   path?: string,
 *   io?: {writeFile?:(path:string, data:Buffer, options:object)=>void, rename?:(from:string, to:string)=>void, remove?:(path:string)=>void}
 * }} options
 * @returns {{written: number, totalEntries: number}}
 */
export function writeManifestEntries({
  entries,
  path = APPROVAL_MANIFEST_PATH,
  io = {},
}) {
  const current = readApprovalManifest(path);
  if (!entries.length) {
    return { written: 0, totalEntries: Object.keys(current.entries).length };
  }
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
  const contents = Buffer.from(
    JSON.stringify({ version: 1, algorithm: "sha256", entries: merged }, null, 2) + "\n",
  );
  const totalEntries = Object.keys(merged).length;
  const temporaryPath = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`,
  );
  const writeFile = io.writeFile ?? writeFileSync;
  const rename = io.rename ?? renameSync;
  const remove = io.remove ?? ((target) => rmSync(target, { force: true }));
  try {
    writeFile(temporaryPath, contents, { flag: "wx", mode: 0o644 });
    // The rename is the final fallible operation: the old manifest remains
    // byte-identical until the complete replacement is ready to publish.
    rename(temporaryPath, path);
  } catch (error) {
    try {
      remove(temporaryPath);
    } catch {
      // Preserve the publication error. A same-directory temp is not live
      // approval state and can be removed by the next housekeeping pass.
    }
    throw error;
  }
  return { written: entries.length, totalEntries };
}

/**
 * Commit every staged candidate after the complete run has passed. All
 * filesystem states are validated before the first write. An interruption
 * after a PNG write can leave only a hash-matching orphan, which a later green
 * run recovers without rewriting the PNG.
 *
 * @param {{
 *   candidates:Array<{approvedPath:string, caseId:string, candidatePng:Buffer, hash:string}>,
 *   comparisonResults:Array<{status:string}>,
 *   conformanceFailures:Array<unknown>,
 *   runFailed:boolean,
 *   path?:string,
 *   manifestIo?: {writeFile?:Function, rename?:Function, remove?:Function}
 *   pngIo?: {writeFile?:Function, readFile?:Function, link?:Function, remove?:Function}
 * }} options
 * @returns {{committed:boolean, writtenPngs:number, recoveredPngs:number, writtenEntries:number, totalEntries:number}}
 */
export function commitBaselineEstablishment({
  candidates,
  comparisonResults,
  conformanceFailures,
  runFailed,
  path = APPROVAL_MANIFEST_PATH,
  manifestIo,
  pngIo = {},
}) {
  const current = readApprovalManifest(path);
  const comparisonFailed = comparisonResults.some((result) => result.status === "failure");
  if (runFailed || comparisonFailed || conformanceFailures.length) {
    return {
      committed: false,
      writtenPngs: 0,
      recoveredPngs: 0,
      writtenEntries: 0,
      totalEntries: Object.keys(current.entries).length,
    };
  }
  if (!candidates.length) {
    return {
      committed: true,
      writtenPngs: 0,
      recoveredPngs: 0,
      writtenEntries: 0,
      totalEntries: Object.keys(current.entries).length,
    };
  }

  const seen = new Set();
  const plannedWrites = [];
  const recoveredCandidates = [];
  let recoveredPngs = 0;
  for (const candidate of candidates) {
    if (seen.has(candidate.caseId)) {
      throw new Error(`refusing to establish duplicate case "${candidate.caseId}"`);
    }
    seen.add(candidate.caseId);
    if (current.entries[candidate.caseId]) {
      throw new Error(
        `refusing to establish "${candidate.caseId}": a manifest entry already exists`,
      );
    }
    if (sha256(candidate.candidatePng) !== candidate.hash) {
      throw new Error(`refusing to establish "${candidate.caseId}": candidate hash changed`);
    }
    if (existsSync(candidate.approvedPath)) {
      let existingPng;
      try {
        existingPng = readFileSync(candidate.approvedPath);
      } catch {
        throw new Error(
          `refusing to establish "${candidate.caseId}": a baseline PNG already exists`,
        );
      }
      if (sha256(existingPng) !== candidate.hash) {
        throw new Error(
          `refusing to establish "${candidate.caseId}": a baseline PNG already exists`,
        );
      }
      recoveredPngs += 1;
      recoveredCandidates.push(candidate);
    } else {
      plannedWrites.push(candidate);
    }
  }

  for (const candidate of plannedWrites) {
    assertApprovedPathSafe(candidate.approvedRoot, candidate.approvedPath);
    mkdirSync(dirname(candidate.approvedPath), { recursive: true });
    assertApprovedPathSafe(candidate.approvedRoot, candidate.approvedPath);
    const temporaryPath = join(
      dirname(path),
      `${baselineTemporaryPrefix(candidate.caseId)}${process.pid}-${randomUUID()}.tmp`,
    );
    const writeFile = pngIo.writeFile ?? writeFileSync;
    const readFile = pngIo.readFile ?? readFileSync;
    const link = pngIo.link ?? linkSync;
    const remove = pngIo.remove ?? ((target) => rmSync(target, { force: true }));
    try {
      writeFile(temporaryPath, candidate.candidatePng, { flag: "wx", mode: 0o644 });
      if (sha256(readFile(temporaryPath)) !== candidate.hash) {
        throw new Error(`refusing to establish "${candidate.caseId}": staged PNG hash changed`);
      }
      assertApprovedPathSafe(candidate.approvedRoot, candidate.approvedPath);
      link(temporaryPath, candidate.approvedPath);
      remove(temporaryPath);
    } catch (error) {
      try {
        remove(temporaryPath);
      } catch {
        // A non-raster temp is not approved state. Preserve the primary error.
      }
      throw error;
    }
  }
  for (const candidate of recoveredCandidates) {
    removeMatchingStaleLinks(candidate, path, pngIo);
  }
  const manifestResult = writeManifestEntries({
    entries: candidates,
    path,
    io: manifestIo,
  });
  return {
    committed: true,
    writtenPngs: plannedWrites.length,
    recoveredPngs,
    writtenEntries: manifestResult.written,
    totalEntries: manifestResult.totalEntries,
  };
}
