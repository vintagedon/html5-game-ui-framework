/**
 * Script Name : run-output.js
 * Description : Curated-root guards and fresh run-owned output provisioning.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-15
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * The invariant this module enforces is the one AGENTS.md declares: every
 * byte a run writes, candidates and reports alike, lands in a directory the
 * runner itself created fresh beneath a validated parent, so no caller-named
 * or pre-existing path can alias run output onto a curated tree. Curated
 * trees are the approved baseline tree, the approval manifest, and every
 * sealed evidence directory. Promotion into a curated tree happens only
 * through explicit baseline finalization, never as a side effect of a run.
 *
 * Why the caller selects a parent and never a file: path validation cannot
 * see a hardlink, so a caller-named existing file can share an inode with a
 * curated file while every ancestor check passes, whereas a file the runner
 * has just created inside a directory it has just created cannot be a
 * pre-existing alias of anything.
 */

import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
/** Default parent for run-owned output; gitignored, inside the repository. */
export const DEFAULT_RUN_PARENT = resolve(REPO_ROOT, "harness", "scratch");
export const LATEST_RUN_POINTER = join(DEFAULT_RUN_PARENT, "latest-run.json");
export const RUN_OUTPUT_ENVIRONMENT_KEY = "GC_RUN_OUTPUT_DIR";

/**
 * The curated locations run-owned output must never resolve onto. Derived
 * from this module's own location, never from the working directory, so a
 * caller cannot relocate the protected set by choosing where to run from.
 *
 * @param {{repoRoot?: string}} [options]
 * @returns {string[]}
 */
export function curatedRoots({ repoRoot = REPO_ROOT } = {}) {
  return [
    resolve(repoRoot, "harness/goldens/approved"),
    resolve(repoRoot, "harness/goldens/approval-manifest.json"),
    resolve(repoRoot, "..", "work-logs", "evidence"),
  ];
}

/**
 * Refuse a parent before any write when it touches a curated root in lexical
 * or resolved space, when it normalizes into one through `..`, or when any
 * existing path component is a symlink. A symlinked component is refused
 * regardless of destination: an output link whose target can change after
 * validation is an open alias, not a safe parent.
 *
 * @param {string} parent candidate parent location
 * @param {{curatedRoots?: string[], additionalRoots?: string[], cwd?: string}} [options]
 */
export function assertRunOutputParent(
  parent,
  { curatedRoots: roots = curatedRoots(), additionalRoots = [], cwd = process.cwd() } = {},
) {
  const protectedRoots = [...roots, ...additionalRoots];
  if (!parent) {
    throw new Error("run output parent is required");
  }
  if (targetTouchesProtected(parent, { protectedRoots, cwd })) {
    throw new Error(
      `run output parent resolves onto a curated location: ${parent}`,
    );
  }
}

/**
 * Create one fresh run-owned directory beneath a validated parent. The
 * directory name is unique per call and created without recursion, so the
 * runner can never adopt a pre-existing directory, and pre-existing files
 * (including hardlinks sharing an inode with curated bytes) cannot appear
 * inside it before the run writes.
 *
 * @param {{parent?: string, curatedRoots?: string[], additionalRoots?: string[], cwd?: string}} [options]
 * @returns {string} absolute path of the freshly created run directory
 */
export function provisionRunDirectory({
  parent = DEFAULT_RUN_PARENT,
  curatedRoots: roots = curatedRoots(),
  additionalRoots = [],
  cwd = process.cwd(),
} = {}) {
  const resolvedParent = resolve(cwd, parent);
  assertRunOutputParent(resolvedParent, { curatedRoots: roots, additionalRoots, cwd });
  mkdirSync(resolvedParent, { recursive: true });
  // Re-validate after creation so a symlinked or curated ancestor that only
  // became visible once the path existed is still refused before the run
  // directory itself is created.
  assertRunOutputParent(resolvedParent, { curatedRoots: roots, additionalRoots, cwd });
  const runDirectory = join(
    resolvedParent,
    `run-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`,
  );
  mkdirSync(runDirectory);
  assertRunOutputParent(runDirectory, { curatedRoots: roots, additionalRoots, cwd });
  return runDirectory;
}

/**
 * Validate that one write destination belongs to a run-owned directory:
 * lexically inside it and free of symlinked components. Paired with the
 * exclusive create flag at the write site, this is what closes the file
 * hardlink form of the alias defect: a pre-existing entry at the destination
 * is refused rather than written through.
 *
 * @param {string} runDirectory fresh run-owned directory
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
 * written through. This is the write every runner candidate and report goes
 * through.
 *
 * @param {string} runDirectory fresh run-owned directory
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
 * Record which run directory holds the newest runner state so the metrics
 * step, which runs as a separate process after Playwright, can find it. The
 * pointer is run-owned output in the gitignored scratch parent; the pointed
 * directory is validated, never trusted.
 *
 * @param {string} runDirectory
 * @param {{pointerPath?: string, curatedRoots?: string[], additionalRoots?: string[], cwd?: string}} [options]
 */
export function recordLatestRun(
  runDirectory,
  {
    pointerPath = LATEST_RUN_POINTER,
    curatedRoots: roots = curatedRoots(),
    additionalRoots = [],
    cwd = process.cwd(),
  } = {},
) {
  assertRunOwnedPath(dirname(pointerPath), pointerPath, {
    curatedRoots: roots,
    additionalRoots,
    cwd,
  });
  const resolved = resolve(cwd, runDirectory);
  assertRunOutputParent(resolved, { curatedRoots: roots, additionalRoots, cwd });
  writeFileSync(pointerPath, JSON.stringify({ runDirectory: resolved }, null, 2) + "\n");
}

/**
 * Resolve the run directory holding the newest runner state. Missing or
 * invalid pointers are surfaced as errors naming the recovery command.
 *
 * @param {{pointerPath?: string, curatedRoots?: string[], additionalRoots?: string[], cwd?: string}} [options]
 * @returns {string}
 */
export function readLatestRun({
  pointerPath = LATEST_RUN_POINTER,
  curatedRoots: roots = curatedRoots(),
  additionalRoots = [],
  cwd = process.cwd(),
} = {}) {
  let pointer;
  try {
    pointer = JSON.parse(readFileSync(pointerPath, "utf8"));
  } catch {
    throw new Error(
      `no recorded Playwright run found at ${pointerPath}; run npm run playwright first`,
    );
  }
  const runDirectory = pointer?.runDirectory;
  if (typeof runDirectory !== "string" || !runDirectory) {
    throw new Error(`run pointer at ${pointerPath} names no run directory`);
  }
  assertRunOutputParent(runDirectory, { curatedRoots: roots, additionalRoots, cwd });
  return resolve(cwd, runDirectory);
}
