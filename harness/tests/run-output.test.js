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
 * than as scripts.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
  provisionRunDirectory,
  writeRunFile,
} from "../runner/run-output.js";
import { PNG } from "pngjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CONFIG_URL = new URL("../runner/playwright.config.js", import.meta.url).href;
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

test("a run whose output parent resolves onto approved through a directory symlink is refused and preserves every curated byte", () => {
  const state = fixture();
  state.manifestBefore = readFileSync(state.manifestPath);
  const approvedBefore = hashTree(state.approvedRoot);
  // The alias: the run-output parent is a symlink onto the approved tree.
  const aliasedParent = join(state.directory, "runs");
  symlinkSync(state.approvedRoot, aliasedParent);

  assert.throws(
    () =>
      provisionRunDirectory({
        parent: aliasedParent,
        curatedRoots: state.curated,
        cwd: state.directory,
      }),
    /curated location/,
  );

  assert.deepEqual(hashTree(state.approvedRoot), approvedBefore);
  assert.deepEqual(readFileSync(state.manifestPath), state.manifestBefore);
  assert.equal(existsSync(join(state.directory, "run-")), false);
  rmSync(state.directory, { recursive: true, force: true });
});

test("a candidate write behind a file hardlink onto an approved PNG is refused and preserves curated bytes", () => {
  const state = fixture();
  state.manifestBefore = readFileSync(state.manifestPath);
  const approvedBefore = hashTree(state.approvedRoot);
  const runDirectory = provisionRunDirectory({
    parent: join(state.directory, "runs"),
    curatedRoots: state.curated,
    cwd: state.directory,
  });
  // A hardlink pre-planted at the candidate destination shares an inode with
  // the approved PNG. Exclusive creation inside the run directory refuses it
  // instead of writing through the shared inode.
  const candidatePath = join(runDirectory, "candidates", ...CASE_ID.split("/"));
  mkdirSync(dirname(candidatePath), { recursive: true });
  linkSync(state.approvedPath, candidatePath);

  assert.throws(
    () =>
      writeRunFile(runDirectory, `candidates/${CASE_ID}`, WHITE, {
        curatedRoots: state.curated,
        cwd: state.directory,
      }),
    /EEXIST|already exists/,
  );

  assert.deepEqual(hashTree(state.approvedRoot), approvedBefore);
  assert.deepEqual(readFileSync(state.manifestPath), state.manifestBefore);
  rmSync(state.directory, { recursive: true, force: true });
});

test("a parent that normalizes into a curated root is refused in both the .. form and the symlinked-parent form", () => {
  const state = fixture();

  // The .. form: a raw parent string whose normalization lands exactly on the
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

test("provisioning always creates a fresh directory and never adopts a pre-existing one", () => {
  const state = fixture();
  const parent = join(state.directory, "runs");
  const first = provisionRunDirectory({
    parent,
    curatedRoots: state.curated,
    cwd: state.directory,
  });
  const second = provisionRunDirectory({
    parent,
    curatedRoots: state.curated,
    cwd: state.directory,
  });

  assert.notEqual(first, second);
  assert.equal(dirname(first), parent);
  assert.equal(readdirSync(first).length, 0, "a fresh run directory starts empty");
  assert.equal(lstatSync(first).isDirectory(), true);
  rmSync(state.directory, { recursive: true, force: true });
});

test("an unsafe GC_PLAYWRIGHT_JSON parent is refused before any write", () => {
  const state = fixture();
  const unsafeParent = join(state.approvedRoot, "reports");
  const result = importConfig({
    GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT: state.goldensRoot,
    GC_PLAYWRIGHT_JSON: unsafeParent,
  }, state.directory);

  assert.notEqual(result.status, 0, "config load must refuse the curated parent");
  assert.equal(existsSync(unsafeParent), false, "nothing may be created inside the curated tree");
  assert.equal(existsSync(state.approvedPath), true);
  rmSync(state.directory, { recursive: true, force: true });
});

test("a safe GC_PLAYWRIGHT_JSON parent yields a fresh run-owned directory whose resolved location is reported", () => {
  const state = fixture();
  const parent = join(state.directory, "reports");
  const result = importConfig({ GC_PLAYWRIGHT_JSON: parent }, state.directory);

  assert.equal(result.status, 0, result.stderr);
  const match = result.stdout.match(/run output directory (\S+)/);
  assert.ok(match, "the resolved run output location must be reported");
  const runDirectory = match[1];
  assert.equal(dirname(runDirectory), parent, "the run directory is a fresh child of the selected parent");
  assert.equal(existsSync(runDirectory), true);
  assert.equal(readdirSync(runDirectory).length, 0);
  rmSync(state.directory, { recursive: true, force: true });
});

test("JSON and JUnit reporter directories with no output name resolve through the same validation", () => {
  const state = fixture();
  for (const key of ["PLAYWRIGHT_JSON_OUTPUT_DIR", "PLAYWRIGHT_JUNIT_OUTPUT_DIR"]) {
    const result = importConfig({
      GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT: state.goldensRoot,
      [key]: state.approvedRoot,
    }, state.directory);
    assert.notEqual(result.status, 0, `${key} aimed at a curated root must fail validation`);
    assert.equal(existsSync(join(state.approvedRoot, "run-")), false);
  }
  assert.equal(existsSync(state.approvedPath), true);
  rmSync(state.directory, { recursive: true, force: true });
});

test("the process-test report path resolves under scratch, not a sealed evidence location", () => {
  const result = importConfig({}, REPO_ROOT);
  assert.equal(result.status, 0, result.stderr);
  const match = result.stdout.match(/run output directory (\S+)/);
  assert.ok(match, "the resolved run output location must be reported");
  const runDirectory = match[1];
  const scratchParent = fileURLToPath(new URL("../../harness/scratch/", import.meta.url));
  assert.equal(
    runDirectory.startsWith(scratchParent),
    true,
    `report output must live under the scratch parent, got ${runDirectory}`,
  );
  assert.equal(
    runDirectory.includes(join("work-logs", "evidence")),
    false,
    "report output must never resolve under a sealed evidence location",
  );
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
  const runDirectory = provisionRunDirectory({
    parent: join(state.directory, "runs"),
    curatedRoots: state.curated,
    cwd: state.directory,
  });
  const candidatePath = join(runDirectory, "candidates", ...CASE_ID.split("/"));
  mkdirSync(dirname(candidatePath), { recursive: true });
  linkSync(state.approvedPath, candidatePath);

  assert.throws(
    () =>
      writeRunFile(runDirectory, `candidates/${CASE_ID}`, WHITE, {
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
  const runDirectory = provisionRunDirectory({
    parent: join(state.directory, "runs"),
    curatedRoots: state.curated,
    cwd: state.directory,
  });
  assert.throws(
    () =>
      assertRunOwnedPath(runDirectory, join(state.directory, "escape.png"), {
        curatedRoots: state.curated,
        cwd: state.directory,
      }),
    /escapes its run directory/,
  );
  assert.doesNotThrow(() =>
    assertRunOwnedPath(runDirectory, join(runDirectory, "candidates", "case.png"), {
      curatedRoots: state.curated,
      cwd: state.directory,
    }),
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

/** Import the real Playwright config once, capturing its provisioning output. */
function importConfig(environment, cwd) {
  return spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", `await import(${JSON.stringify(CONFIG_URL)})`],
    { cwd, env: { ...process.env, ...environment }, encoding: "utf8" },
  );
}
