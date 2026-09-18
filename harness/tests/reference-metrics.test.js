/**
 * Script Name : reference-metrics.test.js
 * Description : Assert the documented metrics generator and the states the reference page renders.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-15
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * The acceptance check invokes the documented generation path, the same
 * `node harness/metrics/metrics.js` command `npm run metrics` runs, against
 * a scratch copy of the static tree, and asserts the artifact and the values
 * the reference page renders from it. A generator that writes nothing leaves
 * the artifact absent, so the computed-values assertions fail against the
 * not-generated state instead of passing vacuously: the real generator is in
 * the loop. An absent artifact remains a rendered state, observed from
 * rendered output: the block becomes visible and says metrics are not
 * generated. Server and browser resources are released on every path,
 * including browser launch failure, so a missing browser fails the test
 * rather than hanging the suite.
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "@playwright/test";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SERVER_PATH = fileURLToPath(new URL("../runner/reference-server.js", import.meta.url));
const METRICS_SCRIPT = "harness/metrics/metrics.js";

/** A scratch copy of the static tree the reference page and generator use. */
function scratchReferenceTree() {
  const directory = mkdtempSync(join(tmpdir(), "h5gameui-refmetrics-"));
  for (const [source, destination] of [
    ["reference", "reference"],
    ["src", "src"],
    ["harness/registry", "harness/registry"],
    ["harness/app", "harness/app"],
    ["harness/auditor", "harness/auditor"],
    ["harness/metrics", "harness/metrics"],
    ["harness/runner", "harness/runner"],
  ]) {
    cpSync(join(REPO_ROOT, source), join(directory, destination), { recursive: true });
  }
  // The generator resolves clean-css and terser through the installed tree;
  // it is shared read-only through a link rather than copied.
  symlinkSync(join(REPO_ROOT, "node_modules"), join(directory, "node_modules"));
  rmSync(join(directory, "harness/metrics/metrics.json"), { force: true });
  return directory;
}

/** Seed the run state and membership evidence the generator consumes. */
function seedRunEvidence(tree) {
  const runDirectory = join(tree, "harness", "scratch", "run");
  mkdirSync(runDirectory, { recursive: true });
  const runId = "11111111-2222-3333-4444-555555555555";
  writeFileSync(
    join(runDirectory, "playwright-run.json"),
    JSON.stringify({ version: 1, runId, startedAt: new Date().toISOString() }, null, 2) + "\n",
  );
  // Written after the run state so the membership report does not predate it.
  writeFileSync(
    join(runDirectory, "membership.json"),
    JSON.stringify(
      {
        version: 2,
        runId,
        generatedAt: new Date().toISOString(),
        samples: { expected: 0, observed: 0 },
        coverage: {
          designedPairIdentities: 0,
          distinctObservedIdentities: 0,
          totalObservations: 0,
          exclusionsByReason: {},
          unclassifiedObservations: 0,
        },
        pairings: [],
        exclusions: [],
        failures: [],
      },
      null,
      2,
    ) + "\n",
  );
  return runId;
}

/** Run the documented generator command in one scratch tree. */
function runMetricsGenerator(tree) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [METRICS_SCRIPT], {
      cwd: tree,
      encoding: "utf8",
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (status) => resolve({ status: status ?? 1, stdout, stderr }));
  });
}

/** Start the reference server, registering cleanup the moment it spawns. */
function startServer(root) {
  return new Promise((resolveStart, rejectStart) => {
    let child;
    let output = "";
    let settled = false;
    const failTimer = setTimeout(() => {
      const error = new Error(`reference server did not start: ${output}`);
      settle(error);
      if (child) child.kill("SIGKILL");
    }, 15_000);
    const settle = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(failTimer);
      if (error) rejectStart(error);
    };
    try {
      child = spawn(process.execPath, [SERVER_PATH, "0", "--root", root]);
    } catch (error) {
      settle(error);
      return;
    }
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/listening on http:\/\/127\.0\.0\.1:(\d+)\//);
      if (match && !settled) {
        settled = true;
        clearTimeout(failTimer);
        resolveStart({ child, port: Number(match[1]) });
      }
    });
    child.once("error", (error) => settle(error));
    child.once("exit", () => settle(new Error(`reference server exited early: ${output}`)));
  });
}

/** Stop a started server and resolve once its process has exited. */
function stopServer(child) {
  return new Promise((resolveStop) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolveStop();
      return;
    }
    const killTimer = setTimeout(() => child.kill("SIGKILL"), 5_000);
    killTimer.unref();
    child.once("exit", () => {
      clearTimeout(killTimer);
      resolveStop();
    });
    child.kill("SIGTERM");
  });
}

/** Observe the rendered metrics state on one scratch tree. */
async function observeMetricsState(tree) {
  const { child, port } = await startServer(tree);
  let browser;
  try {
    // The launch itself is inside the guarded region: a missing browser
    // releases the server on this path instead of leaking it.
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/reference/`, { waitUntil: "networkidle" });
    return await page.evaluate(() => {
      const section = document.querySelector("#metrics");
      const grid = document.querySelector("#metrics-grid");
      return {
        visible: Boolean(section && !section.hidden),
        notGenerated: Boolean(grid?.querySelector("[data-metrics-state='not-generated']")),
        // The generation stamp is rendered beside the grid, inside the section.
        generatedStamp: Boolean(section?.querySelector("[data-metrics-state='generated']")),
        cardCount: grid ? grid.querySelectorAll(".metric-card").length : 0,
        firstCardText: grid?.querySelector(".metric-card")?.textContent ?? null,
      };
    });
  } finally {
    if (browser) await browser.close();
    await stopServer(child);
  }
}

test("an absent metrics artifact renders a visible not-generated state", async () => {
  const tree = scratchReferenceTree();
  try {
    const observed = await observeMetricsState(tree);
    assert.equal(observed.visible, true, "the metrics section must be visible");
    assert.equal(
      observed.notGenerated,
      true,
      "the not-generated state must be rendered, observed from rendered output",
    );
    assert.equal(observed.cardCount, 0);
  } finally {
    rmSync(tree, { recursive: true, force: true });
  }
});

test("the documented generator produces the artifact the reference page renders as computed values", async () => {
  const tree = scratchReferenceTree();
  try {
    seedRunEvidence(tree);
    const generated = await runMetricsGenerator(tree);
    assert.equal(
      generated.status,
      0,
      `the real generator must succeed in the scratch tree\n${generated.stdout}\n${generated.stderr}`,
    );

    // The artifact the generator wrote, not a hand-constructed fixture.
    const artifact = JSON.parse(
      readFileSync(join(tree, "harness/metrics/metrics.json"), "utf8"),
    );
    assert.ok(artifact.generatedAt, "the generated artifact carries its stamp");
    const labels = artifact.metrics.map((metric) => metric.label);
    assert.ok(labels.includes("Semantic tokens (foundation)"));
    const rasters = artifact.metrics.find((metric) => metric.label === "Framework rasters");
    assert.equal(rasters.value, 0, "the framework raster count is computed as zero");

    const observed = await observeMetricsState(tree);
    assert.equal(observed.visible, true);
    assert.equal(observed.notGenerated, false, "the generated state replaces the notice");
    assert.equal(observed.generatedStamp, true);
    assert.ok(
      observed.cardCount > 0,
      `computed cards must render from the generated artifact, got ${JSON.stringify(observed)}`,
    );
    assert.match(
      observed.firstCardText || "",
      /Semantic tokens|Raw CSS|Minified/,
      "a rendered card carries a real computed metric",
    );
  } finally {
    rmSync(tree, { recursive: true, force: true });
  }
});

test("the reference server answers an absent artifact with the not-generated payload", async () => {
  const tree = scratchReferenceTree();
  let server;
  try {
    server = await startServer(tree);
    const response = await fetch(`http://127.0.0.1:${server.port}/harness/metrics/metrics.json`);
    const body = await response.json();
    assert.equal(response.status, 200, "absence must answer successfully, not 404");
    assert.deepEqual(body, { generated: false });
  } finally {
    if (server) await stopServer(server.child);
    rmSync(tree, { recursive: true, force: true });
  }
});

test("a directory request without index.html is handled and the server survives it", async () => {
  const tree = scratchReferenceTree();
  let server;
  try {
    server = await startServer(tree);
    for (const directoryPath of ["/", "/src/"]) {
      const response = await fetch(`http://127.0.0.1:${server.port}${directoryPath}`);
      assert.equal(response.status, 404, `${directoryPath} must be handled, not streamed open`);
      assert.equal(await response.text(), "Not found");
    }
    // The bad directory requests must not take the server down: a valid
    // reference request still succeeds afterwards.
    const reference = await fetch(`http://127.0.0.1:${server.port}/reference/`);
    assert.equal(reference.status, 200);
    assert.match(reference.headers.get("content-type") || "", /text\/html/);
  } finally {
    if (server) await stopServer(server.child);
    rmSync(tree, { recursive: true, force: true });
  }
});
