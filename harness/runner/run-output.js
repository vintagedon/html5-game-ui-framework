/**
 * Script Name : run-output.js
 * Description : One fixed run-output location, curated-root guards, run-owned writes.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-15
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * The invariant this module enforces is the one AGENTS.md declares: every
 * byte a run writes, candidates and reports alike, lands in one fixed
 * gitignored scratch location inside the repository, initialized by the
 * supported entry points at the start of an invocation so a previous run's
 * results can never be read as this one's. There is no caller-configurable
 * output surface: no environment variable selects a parent, names a report
 * file, or hands a directory to a worker. Curated trees, the approved
 * baseline tree, the approval manifest, and every sealed evidence
 * directory, are refused as destinations in lexical and resolved space.
 * Promotion into a curated tree happens only through explicit baseline
 * finalization, never as a side effect of a run.
 *
 * Initialization is owned by the comparison and canonical-capture entry
 * points alone. Wiping and recreating the location there means worker
 * restarts reuse it without clearing it, and concurrent invocations are
 * unsupported: a second invocation would treat the first's directory as
 * its own after wiping it.
 */

import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { targetTouchesProtected } from "./output-safety.js";

export const RUNNER_DIR = fileURLToPath(new URL(".", import.meta.url));
export const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const APPROVED_ROOT = fileURLToPath(new URL("../goldens/approved/", import.meta.url));
export const APPROVAL_MANIFEST_PATH = fileURLToPath(
  new URL("../goldens/approval-manifest.json", import.meta.url),
);
/** The estate seals evidence under work-logs/evidence beside the repository. */
export const EVIDENCE_ROOT = resolve(REPO_ROOT, "..", "work-logs", "evidence");
/** The one fixed run-output location; gitignored, inside the repository. */
export const RUN_OUTPUT_ROOT = resolve(REPO_ROOT, "harness", "scratch", "run");
/** Invocation-wide run state, written by initialization and read by everyone. */
export const RUN_STATE_PATH = join(RUN_OUTPUT_ROOT, "playwright-run.json");
/**
 * Environment keys from the removed caller-configurable output surface.
 * Entry points delete them so a stale value can never influence a run.
 */
export const OBSOLETE_RUN_OUTPUT_ENVIRONMENT_KEYS = Object.freeze([
  "GC_PLAYWRIGHT_JSON",
  "GC_RUN_OUTPUT_DIR",
]);

/**
 * The curated locations run-owned output must never resolve onto. Derived
 * from this module's own location, never from the working directory, so a
 * caller cannot relocate the protected set by choosing where to run from.
 * The approved root and manifest path can be overridden for the same reason
 * canonical capture accepts them: a capture pointed at fixture locations
 * protects exactly those.
 *
 * @param {{repoRoot?: string, approvedRoot?: string, manifestPath?: string}} [options]
 * @returns {string[]}
 */
export function curatedRoots({ repoRoot = REPO_ROOT, approvedRoot, manifestPath } = {}) {
  return [
    approvedRoot ?? resolve(repoRoot, "harness/goldens/approved"),
    manifestPath ?? resolve(repoRoot, "harness/goldens/approval-manifest.json"),
    resolve(repoRoot, "..", "work-logs", "evidence"),
  ];
}

/**
 * Refuse a destination before any write when it touches a curated root in
 * lexical or resolved space, when it normalizes into one through `..`, or
 * when any existing path component is a symlink. A symlinked component is
 * refused regardless of destination: an output link whose target can
 * change after validation is an open alias, not a safe destination.
 *
 * @param {string} parent candidate output location
 * @param {{curatedRoots?: string[], additionalRoots?: string[], cwd?: string}} [options]
 */
export function assertRunOutputParent(
  parent,
  { curatedRoots: roots = curatedRoots(), additionalRoots = [], cwd = process.cwd() } = {},
) {
  const protectedRoots = [...roots, ...additionalRoots];
  if (!parent) {
    throw new Error("run output location is required");
  }
  if (targetTouchesProtected(parent, { protectedRoots, cwd })) {
    throw new Error(
      `run output location resolves onto a curated location: ${parent}`,
    );
  }
}

/**
 * Initialize the one fixed run-output location for one invocation. The
 * supported entry points call this before starting Playwright: anything a
 * previous invocation left in the location is removed, a fresh empty
 * directory is created, and the invocation-wide run state, including the
 * run identity every worker and the metrics step share, is written first.
 * Nothing else may wipe the location, so a worker restart reuses it and
 * keeps earlier results.
 *
 * @param {{repoRoot?: string, curatedRoots?: string[], additionalRoots?: string[], cwd?: string}} [options]
 * @returns {{runDirectory: string, runState: {version: number, runId: string, startedAt: string}}}
 */
export function initializeRunOutput({
  repoRoot = REPO_ROOT,
  curatedRoots: roots = curatedRoots({ repoRoot }),
  additionalRoots = [],
  cwd = process.cwd(),
} = {}) {
  const runDirectory = resolve(repoRoot, "harness", "scratch", "run");
  // Refuse before the wipe: a symlinked component or a curated relationship
  // must fail loudly rather than delete or write through an alias.
  assertRunOutputParent(runDirectory, { curatedRoots: roots, additionalRoots, cwd });
  rmSync(runDirectory, { recursive: true, force: true });
  mkdirSync(runDirectory, { recursive: true });
  assertRunOutputParent(runDirectory, { curatedRoots: roots, additionalRoots, cwd });
  const runState = {
    version: 1,
    runId: randomUUID(),
    startedAt: new Date().toISOString(),
  };
  writeRunFile(runDirectory, "playwright-run.json", JSON.stringify(runState, null, 2) + "\n", {
    curatedRoots: roots,
    additionalRoots,
    cwd,
  });
  return { runDirectory, runState };
}

/**
 * Read the invocation-wide run state. A missing or malformed state means
 * no supported entry point initialized the run, which is the operator's
 * cue to use one rather than something to silently work around.
 *
 * @param {{runDirectory?: string}} [options]
 * @returns {{version: number, runId: string, startedAt: string}}
 */
export function readRunState({ runDirectory = RUN_OUTPUT_ROOT } = {}) {
  const statePath = join(runDirectory, "playwright-run.json");
  let state;
  try {
    state = JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    throw new Error(
      `no initialized Playwright run at ${runDirectory}; run output is initialized only by npm run playwright or npm run capture`,
    );
  }
  if (state?.version !== 1 || typeof state.runId !== "string" || !state.runId) {
    throw new Error(`run state at ${statePath} is not a valid version 1 run record`);
  }
  return state;
}

/**
 * Validate that one write destination belongs to a run-owned directory:
 * lexically inside it and free of symlinked components. Paired with the
 * exclusive create flag at the write site, this is what closes the file
 * hardlink form of the alias defect: a pre-existing entry at the destination
 * is refused rather than written through.
 *
 * @param {string} runDirectory run-owned directory
 * @param {string} destination candidate write path
 * @param {{curatedRoots?: string[], additionalRoots?: string[], cwd?: string}} [options]
 */
export function assertRunOwnedPath(
  runDirectory,
  destination,
  { curatedRoots: roots = curatedRoots(), additionalRoots = [], cwd = process.cwd() } = {},
) {
  assertRunOutputParent(destination, { curatedRoots: roots, additionalRoots, cwd });
  const fromRun = resolve(cwd, runDirectory);
  const target = resolve(cwd, destination);
  if (target !== fromRun && !target.startsWith(fromRun + sep)) {
    throw new Error(`run output destination escapes its run directory: ${destination}`);
  }
}

/**
 * Write one run-owned file: validated to belong to the run directory and
 * created exclusively, so a pre-existing entry at the destination (including
 * a hardlink sharing an inode with curated bytes) is refused rather than
 * written through. This is the write every per-case runner record, candidate,
 * and diff goes through; per-case destinations are unique, so an invocation
 * never collides with itself.
 *
 * @param {string} runDirectory run-owned directory
 * @param {string} relativePath destination relative to the run directory
 * @param {Buffer|string} contents
 * @param {{curatedRoots?: string[], additionalRoots?: string[], cwd?: string}} [options]
 */
export function writeRunFile(
  runDirectory,
  relativePath,
  contents,
  { curatedRoots: roots = curatedRoots(), additionalRoots = [], cwd = process.cwd() } = {},
) {
  const target = join(runDirectory, relativePath);
  assertRunOwnedPath(runDirectory, target, { curatedRoots: roots, additionalRoots, cwd });
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, { flag: "wx" });
  return target;
}

/**
 * Overwrite one run-owned file. Aggregates rebuilt from the complete set of
 * per-case records use this: a restarted worker's afterAll rebuilds the
 * superset, so replacing the prior aggregate loses nothing an earlier
 * worker contributed.
 *
 * @param {string} runDirectory run-owned directory
 * @param {string} relativePath destination relative to the run directory
 * @param {Buffer|string} contents
 * @param {{curatedRoots?: string[], additionalRoots?: string[], cwd?: string}} [options]
 */
export function overwriteRunFile(
  runDirectory,
  relativePath,
  contents,
  { curatedRoots: roots = curatedRoots(), additionalRoots = [], cwd = process.cwd() } = {},
) {
  const target = join(runDirectory, relativePath);
  assertRunOwnedPath(runDirectory, target, { curatedRoots: roots, additionalRoots, cwd });
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
  return target;
}

/**
 * Delete the removed caller-configurable output keys from an environment
 * so a stale value from the old surface can never reach a child process.
 *
 * @param {object} environment
 * @returns {object} a copy without the obsolete keys
 */
export function stripObsoleteRunOutputEnvironment(environment) {
  const clean = { ...environment };
  for (const name of OBSOLETE_RUN_OUTPUT_ENVIRONMENT_KEYS) delete clean[name];
  return clean;
}

/**
 * Read every per-case record this invocation wrote, validating that each
 * belongs to the current run identity. Records are the restart-safe unit
 * of aggregation: each case writes exactly one, so a worker restart adds
 * records rather than colliding with them, and the aggregates are rebuilt
 * from the complete set.
 *
 * @param {{runDirectory?: string, runId?: string}} [options]
 * @returns {Array<object>} records sorted by capture identity
 */
export function readCaseRecords({ runDirectory = RUN_OUTPUT_ROOT, runId } = {}) {
  const currentRunId = runId ?? readRunState({ runDirectory }).runId;
  const recordsDirectory = join(runDirectory, "records");
  let entries;
  try {
    entries = readdirSync(recordsDirectory, { recursive: true, withFileTypes: true });
  } catch {
    return [];
  }
  const records = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const path = join(entry.parentPath, entry.name);
    let record;
    try {
      record = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      throw new Error(`case record ${path} is not parseable: ${error.message}`);
    }
    if (record?.runId !== currentRunId) {
      throw new Error(
        `case record ${path} belongs to run ${record?.runId}, current run is ${currentRunId}`,
      );
    }
    records.push(record);
  }
  records.sort((a, b) => String(a.capture).localeCompare(String(b.capture)));
  return records;
}
