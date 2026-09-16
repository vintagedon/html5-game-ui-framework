/**
 * Script Name : runner-restart.test.js
 * Description : A failed first case must not stop the remaining cases after a worker restart.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-16
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Reproduces review finding R4 (2026-09-16-h5gameui-01c, worker-restart.log):
 * a fixed-name run-state write in beforeAll failed with EEXIST once Playwright
 * restarted a worker after a failed test, so every later case failed in the
 * hook at zero test duration and never produced a comparison. The permanent
 * regression runs the real comparison wrapper in a scratch repository copy
 * whose first selected case fails against a corrupted manifest hash and
 * asserts the remaining cases still execute and aggregate.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const COPY_LIST = ["reference", "src", "harness", "package.json"];
/** One scenario with four cases: enough for a first failure plus survivors. */
const GREP = "core-spike";

/** Pick a free localhost port so a parallel test file cannot collide. */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
    probe.once("error", reject);
  });
}

/** A scratch repository copy with the real runner, config, and goldens. */
function scratchRepository(port) {
  const directory = mkdtempSync(join(tmpdir(), "h5gameui-restart-"));
  for (const entry of COPY_LIST) {
    cpSync(join(REPO_ROOT, entry), join(directory, entry), {
      recursive: true,
      filter: (source) => !source.includes(join("harness", "scratch")),
    });
  }
  // The wrapper resolves @playwright/test relative to itself; the installed
  // tree is shared read-only through a link rather than copied.
  symlinkSync(join(REPO_ROOT, "node_modules"), join(directory, "node_modules"));
  rmSync(join(directory, "harness", "metrics", "metrics.json"), { force: true });
  // The copy is a disposable fixture: its web server moves to a private port
  // so a concurrently running test file cannot share or race it.
  const configPath = join(directory, "harness", "runner", "playwright.config.js");
  writeFileSync(
    configPath,
    readFileSync(configPath, "utf8").replaceAll("8123", String(port)),
  );
  return directory;
}

/** Corrupt the manifest hash of the first capture the grep filter selects. */
function corruptFirstManifestEntry(directory) {
  const manifestPath = join(directory, "harness", "goldens", "approval-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const target = Object.keys(manifest.entries)
    .filter((caseId) => caseId.startsWith(`${GREP}/`))
    .sort()[0];
  assert.ok(target, "the scratch manifest must carry cases for the grep filter");
  manifest.entries[target] = manifest.entries[target].slice(0, -1) + "0";
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return { manifestPath, target };
}

test("a run whose first case fails still runs its remaining cases to completion", async () => {
  const port = await freePort();
  const directory = scratchRepository(port);
  try {
    const { target } = corruptFirstManifestEntry(directory);
    const result = spawnSync(
      process.execPath,
      [join(directory, "harness", "runner", "playwright.js"), "--grep", GREP],
      {
        cwd: directory,
        encoding: "utf8",
        timeout: 300_000,
        env: { ...process.env, GC_BASE_URL: `http://127.0.0.1:${port}` },
      },
    );

    // The corrupted case fails the run; the exit status must say so.
    assert.notEqual(result.status, 0, "the corrupted baseline must fail the run");
    assert.match(result.stdout + result.stderr, new RegExp(target.replaceAll("/", "\\/")));

    const runDirectory = join(directory, "harness", "scratch", "run");
    const recordsDirectory = join(runDirectory, "records");
    const recordFiles = existsSync(recordsDirectory)
      ? readdirSync(recordsDirectory, { recursive: true, withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
          .map((entry) => join(entry.parentPath, entry.name).slice(recordsDirectory.length + 1))
      : [];
    const spikeRecords = recordFiles.filter((name) => name.startsWith(GREP));
    // Four cases exist for the filter; every one of them must have executed
    // and written its record, which is exactly what the EEXIST defect broke.
    assert.equal(
      spikeRecords.length,
      4,
      `every selected case must produce a record, got ${spikeRecords.join(", ")}`,
    );

    const matrix = JSON.parse(
      readFileSync(join(runDirectory, "candidates", "matrix.json"), "utf8"),
    );
    assert.equal(matrix.length, 4, "the rebuilt matrix aggregates every case");
    const failed = matrix.filter((entry) => entry.golden === "failure");
    assert.equal(failed.length, 1, "only the corrupted case fails");
    assert.equal(failed[0].capture, target);
    assert.equal(failed[0].reason, "baseline-hash-mismatch");
    assert.equal(
      existsSync(join(runDirectory, "membership.json")),
      true,
      "the aggregates survive the worker restart",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
