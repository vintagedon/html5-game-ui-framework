/**
 * Script Name : reference-metrics.test.js
 * Description : Assert the metrics block renders absence and computed values.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-15
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * An absent metrics artifact is a rendered state, observed from rendered
 * output: the block becomes visible and says metrics are not generated. After
 * the artifact exists the block renders computed values, and the
 * computed-values check fails against a generator stub that writes nothing,
 * which is the same absent-artifact state.
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "@playwright/test";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SERVER_PATH = fileURLToPath(new URL("../runner/reference-server.js", import.meta.url));

/** A scratch copy of the static tree the reference page actually loads. */
function scratchReferenceTree() {
  const directory = mkdtempSync(join(tmpdir(), "h5gameui-refmetrics-"));
  for (const [source, destination] of [
    ["reference", "reference"],
    ["src", "src"],
    ["harness/registry", "harness/registry"],
    ["harness/app", "harness/app"],
    ["harness/auditor", "harness/auditor"],
    ["harness/metrics", "harness/metrics"],
  ]) {
    cpSync(join(REPO_ROOT, source), join(directory, destination), { recursive: true });
  }
  rmSync(join(directory, "harness/metrics/metrics.json"), { force: true });
  return directory;
}

function startServer(root) {
  return new Promise((resolveStart, rejectStart) => {
    const child = spawn(process.execPath, [SERVER_PATH, "0", "--root", root]);
    let output = "";
    const failTimer = setTimeout(
      () => rejectStart(new Error(`reference server did not start: ${output}`)),
      15_000,
    );
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/listening on http:\/\/127\.0\.0\.1:(\d+)\//);
      if (match) {
        clearTimeout(failTimer);
        resolveStart({ child, port: Number(match[1]) });
      }
    });
    child.once("error", rejectStart);
  });
}

/** Observe the rendered metrics state on one scratch tree. */
async function observeMetricsState(tree) {
  const { child, port } = await startServer(tree);
  const browser = await chromium.launch({ headless: true });
  try {
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
    await browser.close();
    child.kill("SIGTERM");
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

test("a present artifact renders computed values, and that check fails on a stub generator that writes nothing", async () => {
  const tree = scratchReferenceTree();
  try {
    // The generated shape the documented sequence produces: computed metric
    // rows with a generation stamp.
    mkdirSync(join(tree, "harness/metrics"), { recursive: true });
    writeFileSync(
      join(tree, "harness/metrics/metrics.json"),
      JSON.stringify({
        generatedAt: "2026-09-15T00:00:00.000Z",
        scopeSummary: "the resolved framework paths",
        metrics: [
          { label: "Semantic tokens (foundation)", value: 96, scope: "src/tokens/semantic.css" },
          { label: "Framework rasters", value: 0, scope: "raster scan of scope" },
        ],
      }, null, 2) + "\n",
    );
    const computed = await observeMetricsState(tree);
    const computedValuesCheck = (observed) =>
      observed.visible && observed.generatedStamp && observed.cardCount > 0 &&
      observed.firstCardText?.includes("Semantic tokens");

    assert.equal(computedValuesCheck(computed), true, `expected computed values, got ${JSON.stringify(computed)}`);

    // The stub-generator discrimination: a generator that writes nothing
    // leaves the artifact absent, and the same computed-values check fails
    // against that state instead of passing vacuously.
    rmSync(join(tree, "harness/metrics/metrics.json"), { force: true });
    const stubbed = await observeMetricsState(tree);
    assert.equal(
      computedValuesCheck(stubbed),
      false,
      "the computed-values check must fail when the generator wrote nothing",
    );
    assert.equal(stubbed.notGenerated, true);
  } finally {
    rmSync(tree, { recursive: true, force: true });
  }
});

test("the reference server answers an absent artifact with the not-generated payload", async () => {
  const tree = scratchReferenceTree();
  try {
    const { child, port } = await startServer(tree);
    const response = await fetch(`http://127.0.0.1:${port}/harness/metrics/metrics.json`);
    const body = await response.json();
    child.kill("SIGTERM");
    assert.equal(response.status, 200, "absence must answer successfully, not 404");
    assert.deepEqual(body, { generated: false });
  } finally {
    rmSync(tree, { recursive: true, force: true });
  }
});
