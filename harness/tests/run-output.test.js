/**
 * Script Name : run-output.test.js
 * Description : Run-owned output invariant tests across all destination classes.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-15
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Every case here is a permanent regression for the defect class where a
 * run's own output resolved onto a curated location: the approved tree, the
 * approval manifest, or sealed evidence. The directory-symlink and
 * file-hardlink reproductions from 2026-09-07 and the 2026-09-14 isolated
 * comparison reproduction (see work-logs/evidence/2026-09-14-h5gameui-01c/
 * and spec-reviews/2026-09-14-h5gameui-01c/) live on as these tests rather
 * than as scripts. Initialization tests cover the fixed run-output
 * location: entry-point ownership, the wipe that separates invocations, and
 * the shared run identity.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import * as comparator from "../runner/compare.js";
import { targetTouchesProtected } from "../runner/output-safety.js";
import {
  assertRunOutputParent,
  assertRunOwnedPath,
  curatedRoots,
  initializeRunOutput,
  readCaseRecords,
  readRunState,
  stripObsoleteRunOutputEnvironment,
  writeRunFile,
} from "../runner/run-output.js";
import { PNG } from "pngjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CASE_ID = "core-meter-vertical/modern/desktop/resting.png";

function png(width, height, [r, g, b]) {
  const image = new PNG({ width, height });
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = r;
    image.data[i + 1] = g;
    image.data[i + 2] = b;
    image.data[i + 3] = 255;
  }
  return PNG.sync.write(image);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

const BLACK = png(4, 4, [0, 0, 0]);
const WHITE = png(4, 4, [255, 255, 255]);

/** A scratch goldens fixture: approved tree, manifest, and curated-root set. */
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "h5gameui-runout-"));
  const goldensRoot = join(directory, "goldens");
  const approvedRoot = join(goldensRoot, "approved");
  const approvedPath = join(approvedRoot, ...CASE_ID.split("/"));
  const manifestPath = join(goldensRoot, "approval-manifest.json");
  mkdirSync(dirname(approvedPath), { recursive: true });
  writeFileSync(approvedPath, BLACK);
  writeFileSync(
    manifestPath,
    JSON.stringify(
      { version: 1, algorithm: "sha256", entries: { [CASE_ID]: sha256(BLACK) } },
      null,
      2,
    ) + "\n",
  );
  return {
    directory,
    goldensRoot,
    approvedRoot,
    approvedPath,
    manifestPath,
    curated: [approvedRoot, manifestPath, join(directory, "work-logs", "evidence")],
    manifestBefore: null,
  };
}

/** The fixed run-output location for one scratch repository root. */
function runDirectory(state) {
  return join(state.directory, "harness", "scratch", "run");
}

function hashTree(root) {
  const hashes = {};
  const walk = (directory, prefix = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(directory, entry.name), relative);
      else hashes[relative] = sha256(readFileSync(join(directory, entry.name)));
    }
  };
  walk(root);
  return hashes;
}

test("a run-output location that resolves onto approved through a directory symlink is refused and preserves every curated byte", () => {
  const state = fixture();
  state.manifestBefore = readFileSync(state.manifestPath);
  const approvedBefore = hashTree(state.approvedRoot);
  // The alias: the run-output location is a symlink onto the approved tree.
  const aliasedLocation = join(state.directory, "run-target");
  symlinkSync(state.approvedRoot, aliasedLocation);

  assert.throws(
    () =>
      assertRunOutputParent(aliasedLocation, {
        curatedRoots: state.curated,
        cwd: state.directory,
      }),
    /curated location/,
  );

  assert.deepEqual(hashTree(state.approvedRoot), approvedBefore);
  assert.deepEqual(readFileSync(state.manifestPath), state.manifestBefore);
  rmSync(state.directory, { recursive: true, force: true });
});

test("initialization refuses a fixed location behind a symlink and never wipes through it", () => {
  const state = fixture();
  state.manifestBefore = readFileSync(state.manifestPath);
  const approvedBefore = hashTree(state.approvedRoot);
  mkdirSync(join(state.directory, "harness", "scratch"), { recursive: true });
  // The fixed location itself is a link onto the approved tree: wiping it
  // would delete curated bytes, so initialization must refuse it first.
  symlinkSync(state.approvedRoot, runDirectory(state));

  assert.throws(
    () => initializeRunOutput({ repoRoot: state.directory, curatedRoots: state.curated }),
    /curated location/,
  );

  assert.deepEqual(hashTree(state.approvedRoot), approvedBefore);
  assert.deepEqual(readFileSync(state.manifestPath), state.manifestBefore);
  rmSync(state.directory, { recursive: true, force: true });
});

test("a candidate write behind a file hardlink onto an approved PNG is refused and preserves curated bytes", () => {
  const state = fixture();
  state.manifestBefore = readFileSync(state.manifestPath);
  const approvedBefore = hashTree(state.approvedRoot);
  const initialized = initializeRunOutput({
    repoRoot: state.directory,
    curatedRoots: state.curated,
  });
  // A hardlink pre-planted at the candidate destination shares an inode with
  // the approved PNG. Exclusive creation inside the run directory refuses it
  // instead of writing through the shared inode.
  const candidatePath = join(initialized.runDirectory, "candidates", ...CASE_ID.split("/"));
  mkdirSync(dirname(candidatePath), { recursive: true });
  linkSync(state.approvedPath, candidatePath);

  assert.throws(
    () =>
      writeRunFile(initialized.runDirectory, `candidates/${CASE_ID}`, WHITE, {
        curatedRoots: state.curated,
        cwd: state.directory,
      }),
    /EEXIST|already exists/,
  );

  assert.deepEqual(hashTree(state.approvedRoot), approvedBefore);
  assert.deepEqual(readFileSync(state.manifestPath), state.manifestBefore);
  rmSync(state.directory, { recursive: true, force: true });
});

test("a location that normalizes into a curated root is refused in both the .. form and the symlinked-parent form", () => {
  const state = fixture();

  // The .. form: a raw path string whose normalization lands exactly on the
  // approved root.
  const normalizing = [state.directory, "runs", "..", "goldens", "approved"].join("/");
  assert.equal(normalizing.includes(".."), true);
  assert.throws(
    () =>
      assertRunOutputParent(normalizing, {
        curatedRoots: state.curated,
        cwd: state.directory,
      }),
    /curated location/,
  );

  // The symlinked-parent form: the parent itself is a link onto approved.
  const linkedParent = join(state.directory, "linked-runs");
  symlinkSync(state.approvedRoot, linkedParent);
  assert.throws(
    () =>
      assertRunOutputParent(linkedParent, {
        curatedRoots: state.curated,
        cwd: state.directory,
      }),
    /curated location/,
  );

  // A parent under the sealed-evidence root is refused too, including when
  // the evidence root does not exist yet.
  const sealedParent = join(state.directory, "work-logs", "evidence", "2026-08-05-x", "..");
  assert.equal(existsSync(join(state.directory, "work-logs")), false);
  assert.throws(
    () =>
      assertRunOutputParent(sealedParent, {
        curatedRoots: state.curated,
        cwd: state.directory,
      }),
    /curated location/,
  );

  // A sibling of the approved tree reached through .. is safe once
  // normalized: goldens/runs touches no curated root.
  const safeParent = [state.goldensRoot, "approved", "..", "runs"].join("/");
  assert.equal(safeParent.includes(".."), true);
  assert.doesNotThrow(() =>
    assertRunOutputParent(safeParent, {
      curatedRoots: state.curated,
      cwd: state.directory,
    }),
  );
  rmSync(state.directory, { recursive: true, force: true });
});

test("initialization creates a fresh empty location with shared run state, and a second invocation never reads the first's artifacts", () => {
  const state = fixture();
  const first = initializeRunOutput({
    repoRoot: state.directory,
    curatedRoots: state.curated,
  });
  assert.equal(first.runDirectory, runDirectory(state));
  assert.equal(readdirSync(first.runDirectory).length, 1, "a fresh location starts with only the run state");
  assert.deepEqual(readRunState({ runDirectory: first.runDirectory }), first.runState);

  // Artifacts of the first invocation: a stale record and aggregate.
  writeRunFile(
    first.runDirectory,
    "records/stale/case.json",
    JSON.stringify({ runId: first.runState.runId, capture: "stale/case.json" }) + "\n",
    { curatedRoots: state.curated, cwd: state.directory },
  );
  writeRunFile(
    first.runDirectory,
    "membership.json",
    "{}\n",
    { curatedRoots: state.curated, cwd: state.directory },
  );

  const second = initializeRunOutput({
    repoRoot: state.directory,
    curatedRoots: state.curated,
  });
  assert.equal(second.runDirectory, runDirectory(state));
  assert.notEqual(second.runState.runId, first.runState.runId);
  assert.equal(readdirSync(second.runDirectory).length, 1, "the previous invocation's artifacts are gone");
  assert.deepEqual(
    readCaseRecords({ runDirectory: second.runDirectory, runId: second.runState.runId }),
    [],
    "no record of the first invocation survives the second",
  );
  rmSync(state.directory, { recursive: true, force: true });
});

test("a case record stamped with a different run identity is refused, not adopted", () => {
  const state = fixture();
  const initialized = initializeRunOutput({
    repoRoot: state.directory,
    curatedRoots: state.curated,
  });
  writeRunFile(
    initialized.runDirectory,
    "records/other/case.json",
    JSON.stringify({ runId: "a-previous-run", capture: "other/case.json" }) + "\n",
    { curatedRoots: state.curated, cwd: state.directory },
  );

  assert.throws(
    () =>
      readCaseRecords({
        runDirectory: initialized.runDirectory,
        runId: initialized.runState.runId,
      }),
    /belongs to run a-previous-run/,
  );
  rmSync(state.directory, { recursive: true, force: true });
});

test("reading run state without initialization names the supported entry points", () => {
  const state = fixture();
  assert.throws(
    () => readRunState({ runDirectory: runDirectory(state) }),
    /initialized only by npm run playwright or npm run capture/,
  );
  rmSync(state.directory, { recursive: true, force: true });
});

test("the removed configuration surface is stripped from child environments", () => {
  const environment = stripObsoleteRunOutputEnvironment({
    GC_PLAYWRIGHT_JSON: "/tmp/somewhere",
    GC_RUN_OUTPUT_DIR: "/tmp/somewhere-else",
    PATH: process.env.PATH,
  });
  assert.equal("GC_PLAYWRIGHT_JSON" in environment, false);
  assert.equal("GC_RUN_OUTPUT_DIR" in environment, false);
  assert.equal(environment.PATH, process.env.PATH);
});

test("a changed image fails on repeated safe comparison without altering approved state", () => {
  const state = fixture();
  const manifest = comparator.readApprovalManifest(state.manifestPath);
  const compare = () =>
    comparator.compareCapture(WHITE, {
      approvedPath: state.approvedPath,
      caseId: CASE_ID,
      manifest,
    });

  const first = compare();
  const second = compare();

  assert.equal(first.status, "failure");
  assert.equal(first.reason, "pixel-difference");
  assert.equal(second.status, "failure");
  assert.equal(second.reason, "pixel-difference");
  assert.equal(sha256(readFileSync(state.approvedPath)), sha256(BLACK));
  assert.deepEqual(
    comparator.readApprovalManifest(state.manifestPath).entries[CASE_ID],
    sha256(BLACK),
  );
  rmSync(state.directory, { recursive: true, force: true });
});

test("the entry-less recovery path cannot record corrupted bytes once candidate writes refuse aliases", () => {
  const state = fixture();
  // Orphan state: approved PNG present, manifest entry absent.
  writeFileSync(
    state.manifestPath,
    JSON.stringify({ version: 1, algorithm: "sha256", entries: {} }, null, 2) + "\n",
  );
  const initialized = initializeRunOutput({
    repoRoot: state.directory,
    curatedRoots: state.curated,
  });
  const candidatePath = join(initialized.runDirectory, "candidates", ...CASE_ID.split("/"));
  mkdirSync(dirname(candidatePath), { recursive: true });
  linkSync(state.approvedPath, candidatePath);

  assert.throws(
    () =>
      writeRunFile(initialized.runDirectory, `candidates/${CASE_ID}`, WHITE, {
        curatedRoots: state.curated,
        cwd: state.directory,
      }),
    /EEXIST|already exists/,
  );

  // The approved bytes were never replaced, so the comparison classifies the
  // orphan honestly instead of recovering an alias as a baseline.
  const manifest = comparator.readApprovalManifest(state.manifestPath);
  const result = comparator.compareCapture(WHITE, {
    approvedPath: state.approvedPath,
    caseId: CASE_ID,
    manifest,
  });
  assert.equal(result.status, "failure");
  assert.equal(result.reason, "baseline-entry-missing");
  assert.throws(
    () =>
      comparator.establishBaseline({
        approvedPath: state.approvedPath,
        approvedRoot: state.approvedRoot,
        caseId: CASE_ID,
        candidatePng: WHITE,
        manifest,
      }),
    /refusing to establish/,
  );
  assert.deepEqual(
    comparator.readApprovalManifest(state.manifestPath).entries,
    {},
    "no manifest entry may record the candidate bytes",
  );
  assert.equal(sha256(readFileSync(state.approvedPath)), sha256(BLACK));
  rmSync(state.directory, { recursive: true, force: true });
});

test("run-owned destinations cannot escape their run directory", () => {
  const state = fixture();
  const initialized = initializeRunOutput({
    repoRoot: state.directory,
    curatedRoots: state.curated,
  });
  assert.throws(
    () =>
      assertRunOwnedPath(initialized.runDirectory, join(state.directory, "escape.png"), {
        curatedRoots: state.curated,
        cwd: state.directory,
      }),
    /escapes its run directory/,
  );
  assert.doesNotThrow(() =>
    assertRunOwnedPath(
      initialized.runDirectory,
      join(initialized.runDirectory, "candidates", "case.png"),
      {
        curatedRoots: state.curated,
        cwd: state.directory,
      },
    ),
  );
  rmSync(state.directory, { recursive: true, force: true });
});

test("a raw destination that resolves into a curated root only through symlink-then-.. is refused", () => {
  const state = fixture();
  // The kernel resolves outside/link -> approved/sub, so outside/link/../case.png
  // lands inside approved. Lexical normalization collapses link/.. first and
  // never looks at the symlink, which is the evasion this test pins.
  mkdirSync(join(state.directory, "outside"), { recursive: true });
  mkdirSync(join(state.approvedRoot, "sub"));
  symlinkSync(join(state.approvedRoot, "sub"), join(state.directory, "outside", "link"));
  const kernelEvasive = `${state.directory}/outside/link/../case.png`;

  assert.throws(
    () =>
      assertRunOutputParent(kernelEvasive, {
        curatedRoots: state.curated,
        cwd: state.directory,
      }),
    /curated location/,
  );
  assert.equal(
    targetTouchesProtected(kernelEvasive, {
      protectedRoots: state.curated,
      cwd: state.directory,
    }),
    true,
    "the guard must resolve components in kernel order",
  );
  rmSync(state.directory, { recursive: true, force: true });
});

test("the real repository's curated roots cover approved, the manifest, and sealed evidence", () => {
  const roots = curatedRoots();
  assert.equal(roots.length, 3);
  assert.equal(roots[0].endsWith(join("harness", "goldens", "approved")), true);
  assert.equal(roots[1].endsWith("approval-manifest.json"), true);
  assert.equal(roots[2].endsWith(join("work-logs", "evidence")), true);
});
