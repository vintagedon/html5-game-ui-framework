/**
 * Script Name : compare.test.js
 * Description : Assert recorded-baseline comparison states and establishment.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Tests use real PNG encoding, hashing, and scratch filesystem paths. Each
 * case names one durable baseline state so a missing, unrecorded, or damaged
 * baseline cannot collapse into an establishable state. Transaction tests
 * also cover failed-run discard and interrupted-write recovery.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PNG } from "pngjs";

import * as comparator from "../runner/compare.js";
import BaselineReporter, {
  BASELINE_ATTACHMENT_TYPE,
  BASELINE_COMPARISON_TYPE,
  BASELINE_TRANSACTION_PROTOCOL,
  finalizeBaselineTransaction,
  parseBaselineTransaction,
} from "../runner/baseline-reporter.js";
import { runCanonicalCapture } from "../runner/capture.js";
import { safeJsonReportPath } from "../runner/playwright.config.js";

const CASE_ID = "scenario/theme/checkpoint.png";
const EMPTY_MANIFEST = { version: 1, algorithm: "sha256", entries: {} };

function png(width, height, [r, g, b, a = 255]) {
  const image = new PNG({ width, height });
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = r;
    image.data[i + 1] = g;
    image.data[i + 2] = b;
    image.data[i + 3] = a;
  }
  return PNG.sync.write(image);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function manifestWith(hash) {
  return {
    version: 1,
    algorithm: "sha256",
    entries: { [CASE_ID]: hash },
  };
}

function writeManifest(path, manifest = EMPTY_MANIFEST) {
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
}

function temporaryBaselineFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true })
    .map(String)
    .filter((name) => name.includes(".h5gameui-baseline-") && name.endsWith(".tmp"));
}

function compare(candidatePng, approvedPath, manifest = EMPTY_MANIFEST) {
  return comparator.compareCapture(candidatePng, {
    approvedPath,
    caseId: CASE_ID,
    manifest,
  });
}

function withScratch(run) {
  const directory = mkdtempSync(join(tmpdir(), "h5gameui-compare-"));
  try {
    return run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function withScratchAsync(run) {
  const directory = mkdtempSync(join(tmpdir(), "h5gameui-compare-"));
  try {
    return await run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function stageReporterTransaction({ candidate, authorization, comparison = true }) {
  const reporterUrl = new URL("../runner/baseline-reporter.js", import.meta.url).href;
  const script =
    `import BaselineReporter, { BASELINE_ATTACHMENT_TYPE, BASELINE_COMPARISON_TYPE } from ${JSON.stringify(reporterUrl)};\n` +
    `const reporter = new BaselineReporter({ transactionFd: 3, protocol: ${JSON.stringify(BASELINE_TRANSACTION_PROTOCOL)}, authorization: ${JSON.stringify(authorization)} });\n` +
    `const attachments = [{ name: ${JSON.stringify(`baseline-establishment:${CASE_ID}`)}, contentType: BASELINE_ATTACHMENT_TYPE, body: Buffer.from(${JSON.stringify(candidate.toString("base64"))}, "base64") }];\n` +
    (comparison
      ? `attachments.push({ name: ${JSON.stringify(`baseline-comparison:${CASE_ID}`)}, contentType: BASELINE_COMPARISON_TYPE, body: Buffer.from(${JSON.stringify(JSON.stringify({ status: "unrecorded", reason: "no-baseline", caseId: CASE_ID }))}) });\n`
      : "") +
    `reporter.onTestEnd({}, { status: "passed", errors: [], attachments });\n` +
    `reporter.onEnd({ status: "passed" });\n`;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    { stdio: ["ignore", "pipe", "pipe", "pipe"] },
  );
  assert.equal(result.status, 0, String(result.stderr));
  return result.output[3];
}

test("the checked-in manifest is a valid integrity record", () => {
  assert.equal(typeof comparator.readApprovalManifest, "function");
  const manifest = comparator.readApprovalManifest();
  assert.equal(manifest.version, 1);
  assert.equal(manifest.algorithm, "sha256");
  assert.equal(typeof manifest.entries, "object");
});

test("a case with no entry and no PNG is unrecorded, the only establishable state", () =>
  withScratch((directory) => {
    const result = compare(png(2, 2, [0, 0, 0]), join(directory, "absent.png"));

    assert.deepEqual(result, {
      status: "unrecorded",
      reason: "no-baseline",
      caseId: CASE_ID,
      baselinePresent: false,
    });
  }));

test("a hash-matching PNG with no manifest entry is recoverable", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "unrecorded.png");
    const candidate = png(2, 2, [0, 0, 0]);
    writeFileSync(approvedPath, candidate);

    const result = compare(candidate, approvedPath);
    assert.equal(result.status, "unrecorded");
    assert.equal(result.reason, "baseline-entry-recoverable");
    assert.equal(result.baselinePresent, true);
  }));

test("a hash-mismatching PNG with no manifest entry keeps the existing failure", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "unrecorded.png");
    writeFileSync(approvedPath, png(2, 2, [255, 0, 0]));

    const result = compare(png(2, 2, [0, 0, 0]), approvedPath);
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "baseline-entry-missing");
    assert.equal(result.baselinePresent, true);
  }));

test("a recorded case with a missing PNG fails", () =>
  withScratch((directory) => {
    const result = compare(
      png(2, 2, [0, 0, 0]),
      join(directory, "missing.png"),
      manifestWith("0".repeat(64)),
    );

    assert.equal(result.status, "failure");
    assert.equal(result.reason, "baseline-missing");
    assert.equal(result.caseId, CASE_ID);
  }));

test("a recorded case with an unreadable PNG fails", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "directory-not-file.png");
    mkdirSync(approvedPath);

    const result = compare(
      png(2, 2, [0, 0, 0]),
      approvedPath,
      manifestWith("0".repeat(64)),
    );
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "baseline-unreadable");
  }));

test("a recorded case with an unparseable PNG fails", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "corrupt.png");
    const corrupt = Buffer.from("not a png");
    writeFileSync(approvedPath, corrupt);

    const result = compare(
      png(2, 2, [0, 0, 0]),
      approvedPath,
      manifestWith(sha256(corrupt)),
    );
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "baseline-unparseable");
  }));

test("a recorded case with a size-mismatched PNG fails", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "approved.png");
    const baseline = png(2, 2, [0, 0, 0]);
    writeFileSync(approvedPath, baseline);

    const result = compare(png(3, 2, [0, 0, 0]), approvedPath, manifestWith(sha256(baseline)));
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "baseline-size-mismatch");
  }));

test("a recorded case with a hash-mismatched PNG fails", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "approved.png");
    const expected = png(2, 2, [0, 0, 255]);
    const replaced = png(2, 2, [255, 0, 0]);
    writeFileSync(approvedPath, replaced);

    const result = compare(expected, approvedPath, manifestWith(sha256(expected)));
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "baseline-hash-mismatch");
  }));

test("a recorded case with matching integrity and pixels passes", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "approved.png");
    const baseline = png(2, 2, [0, 0, 0]);
    writeFileSync(approvedPath, baseline);

    const result = compare(baseline, approvedPath, manifestWith(sha256(baseline)));
    assert.equal(result.status, "pass");
    assert.equal(result.reason, "match");
  }));

test("a recorded case with matching integrity but different pixels fails with the diff surfaced", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "approved.png");
    const baseline = png(2, 2, [0, 0, 0]);
    writeFileSync(approvedPath, baseline);

    const result = compare(
      png(2, 2, [255, 255, 255]),
      approvedPath,
      manifestWith(sha256(baseline)),
    );
    assert.equal(result.status, "failure");
    assert.equal(result.reason, "pixel-difference");
    assert.equal(result.diffPixels, 4);
    assert.ok(result.diffPng, "the diff image must be surfaced with the failure");
  }));

test("a comparison failure alone prevents baseline establishment", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedPath = join(directory, "unrecorded", "case.png");
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath);

    const staged = comparator.establishBaseline({
      approvedPath,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });
    assert.equal(
      existsSync(approvedPath),
      false,
      "an unrecorded candidate must stay in memory until the run commit point",
    );
    const regression = {
      status: "failure",
      reason: "pixel-difference",
      caseId: "later/theme/checkpoint.png",
    };
    const committed = comparator.commitBaselineEstablishment({
      candidates: [staged],
      comparisonResults: [
        { status: "unrecorded", reason: "no-baseline", caseId: CASE_ID },
        regression,
      ],
      conformanceFailures: [],
      runFailed: false,
      path: manifestPath,
    });

    assert.equal(committed.committed, false);
    assert.equal(existsSync(approvedPath), false);
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], undefined);
  }));

test("a conformance failure alone prevents baseline establishment", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedPath = join(directory, "unrecorded", "case.png");
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath);

    const staged = comparator.establishBaseline({
      approvedPath,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });
    const committed = comparator.commitBaselineEstablishment({
      candidates: [staged],
      comparisonResults: [
        { status: "unrecorded", reason: "no-baseline", caseId: CASE_ID },
      ],
      conformanceFailures: ["membership failure"],
      runFailed: false,
      path: manifestPath,
    });

    assert.equal(committed.committed, false);
    assert.equal(existsSync(approvedPath), false);
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], undefined);
  }));

test("a run failure alone prevents baseline establishment", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedPath = join(directory, "unrecorded", "case.png");
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath);

    const staged = comparator.establishBaseline({
      approvedPath,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });
    const committed = comparator.commitBaselineEstablishment({
      candidates: [staged],
      comparisonResults: [
        { status: "unrecorded", reason: "no-baseline", caseId: CASE_ID },
      ],
      conformanceFailures: [],
      runFailed: true,
      path: manifestPath,
    });

    assert.equal(committed.committed, false);
    assert.equal(existsSync(approvedPath), false);
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], undefined);
  }));

test("the reporter stages canonical candidates in a pipe without approving", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedRoot = join(directory, "approved");
    const approvedPath = join(approvedRoot, CASE_ID);
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath);

    const serialized = stageReporterTransaction({
      candidate,
      authorization: "controlled-capture",
      comparison: false,
    });

    assert.equal(
      existsSync(approvedPath),
      false,
      "a reporter cannot approve before the Playwright process exit is known",
    );
    assert.ok(
      serialized.length > 0,
      "the controlled run must stage into its inherited pipe",
    );
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], undefined);
  }));

test("a later process failure rejects a reporter-staged transaction", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedRoot = join(directory, "approved");
    const approvedPath = join(approvedRoot, CASE_ID);
    const authorization = "controlled-capture";
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath);

    const transaction = parseBaselineTransaction({
      serialized: stageReporterTransaction({ candidate, authorization }),
      authorization,
      approvedRoot,
    });
    const result = finalizeBaselineTransaction({
      transaction,
      processSucceeded: false,
      manifestPath,
    });

    assert.equal(result.committed, false);
    assert.equal(existsSync(approvedPath), false);
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], undefined);
  }));

test("a successful canonical process finalizes its staged transaction", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedRoot = join(directory, "approved");
    const approvedPath = join(approvedRoot, CASE_ID);
    const authorization = "controlled-capture";
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath);

    const transaction = parseBaselineTransaction({
      serialized: stageReporterTransaction({ candidate, authorization }),
      authorization,
      approvedRoot,
    });
    const result = finalizeBaselineTransaction({
      transaction,
      processSucceeded: true,
      manifestPath,
    });

    assert.equal(result.committed, true);
    assert.deepEqual(readFileSync(approvedPath), candidate);
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], sha256(candidate));
  }));

test("a metrics process failure prevents canonical baseline finalization", async () =>
  withScratchAsync(async (directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedRoot = join(directory, "approved");
    const approvedPath = join(approvedRoot, CASE_ID);
    const playwrightScript = join(directory, "fake-playwright.mjs");
    const metricsScript = join(directory, "fake-metrics.mjs");
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath);
    writeFileSync(
      playwrightScript,
      `import { writeFileSync } from "node:fs";\n` +
        `writeFileSync(3, JSON.stringify({\n` +
        `  version: 1,\n` +
        `  authorization: process.env.GC_BASELINE_AUTHORIZATION,\n` +
        `  runFailed: false,\n` +
        `  comparisonResults: [{ status: "unrecorded", reason: "no-baseline", caseId: ${JSON.stringify(CASE_ID)} }],\n` +
        `  conformanceFailures: [],\n` +
        `  candidates: [{ caseId: ${JSON.stringify(CASE_ID)}, candidateBase64: ${JSON.stringify(candidate.toString("base64"))} }],\n` +
        `}, null, 2) + "\\n");\n`,
    );
    writeFileSync(metricsScript, "process.exitCode = 23;\n");

    const result = await runCanonicalCapture({
      repoRoot: directory,
      playwrightCli: playwrightScript,
      playwrightConfig: join(directory, "unused.config.mjs"),
      metricsScript,
      manifestPath,
      approvedRoot,
    });

    assert.equal(result.status, 23, "the canonical command must surface metrics failure");
    assert.equal(
      existsSync(approvedPath),
      false,
      "a failed metrics gate must leave the staged PNG outside the approved tree",
    );
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], undefined);
  }));

test("the canonical wrapper drains a transaction larger than the pipe buffer", async () =>
  withScratchAsync(async (directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedRoot = join(directory, "approved");
    const approvedPath = join(approvedRoot, CASE_ID);
    const playwrightScript = join(directory, "fake-playwright.mjs");
    const metricsScript = join(directory, "fake-metrics.mjs");
    const candidate = Buffer.alloc(1024 * 1024, 7);
    writeManifest(manifestPath);
    writeFileSync(
      playwrightScript,
      `import { writeFileSync } from "node:fs";\n` +
        `writeFileSync(3, JSON.stringify({\n` +
        `  version: 1,\n` +
        `  authorization: process.env.GC_BASELINE_AUTHORIZATION,\n` +
        `  runFailed: false,\n` +
        `  comparisonResults: [{ status: "unrecorded", reason: "no-baseline", caseId: ${JSON.stringify(CASE_ID)} }],\n` +
        `  conformanceFailures: [],\n` +
        `  candidates: [{ caseId: ${JSON.stringify(CASE_ID)}, candidateBase64: Buffer.alloc(1024 * 1024, 7).toString("base64") }],\n` +
        `}, null, 2) + "\\n");\n`,
    );
    writeFileSync(metricsScript, "process.exitCode = 0;\n");

    const result = await runCanonicalCapture({
      repoRoot: directory,
      playwrightCli: playwrightScript,
      playwrightConfig: join(directory, "unused.config.mjs"),
      metricsScript,
      manifestPath,
      approvedRoot,
    });

    assert.equal(result.status, 0);
    assert.equal(result.finalized.committed, true);
    assert.deepEqual(readFileSync(approvedPath), candidate);
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], sha256(candidate));
  }));

test("the canonical wrapper rejects a transaction that exceeds its byte limit", async () =>
  withScratchAsync(async (directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedRoot = join(directory, "approved");
    const playwrightScript = join(directory, "fake-playwright.mjs");
    const metricsScript = join(directory, "fake-metrics.mjs");
    writeManifest(manifestPath);
    writeFileSync(
      playwrightScript,
      `import { writeFileSync } from "node:fs";\n` +
        `writeFileSync(3, Buffer.alloc(1024 * 1024, 7));\n`,
    );
    writeFileSync(metricsScript, "process.exitCode = 0;\n");

    await assert.rejects(
      runCanonicalCapture({
        repoRoot: directory,
        playwrightCli: playwrightScript,
        playwrightConfig: join(directory, "unused.config.mjs"),
        metricsScript,
        manifestPath,
        approvedRoot,
        transactionByteLimit: 64 * 1024,
      }),
      /baseline transaction exceeds 65536 bytes/,
    );
    assert.deepEqual(readApprovalEntries(manifestPath), {});
    assert.equal(existsSync(approvedRoot), false);
  }));

test("the reporter rejects slash and backslash path escapes", () => {
  const reporter = new BaselineReporter();
  for (const caseId of [
    "../outside.png",
    "..\\outside.png",
    "/absolute.png",
    "C:/absolute.png",
    "C:\\absolute.png",
    "\\\\server\\share\\outside.png",
  ]) {
    assert.throws(
      () =>
        reporter.onTestEnd({}, {
          attachments: [{
            name: `baseline-establishment:${caseId}`,
            contentType: BASELINE_ATTACHMENT_TYPE,
            body: Buffer.from([1, 2, 3]),
          }],
        }),
      /invalid baseline attachment identity/,
      caseId,
    );
  }
});

test("a candidate path with a symlink ancestor cannot escape approved", () =>
  withScratch((directory) => {
    const approvedRoot = join(directory, "approved");
    const outsideRoot = join(directory, "outside");
    const manifestPath = join(directory, "approval-manifest.json");
    const escapedPath = join(outsideRoot, "theme", "checkpoint.png");
    mkdirSync(approvedRoot);
    mkdirSync(outsideRoot);
    symlinkSync(outsideRoot, join(approvedRoot, "redirect"));
    writeManifest(manifestPath);
    const candidate = png(2, 2, [10, 20, 30]);

    assert.throws(
      () => {
        const transaction = parseBaselineTransaction({
          serialized: JSON.stringify({
            version: 1,
            authorization: "controlled-capture",
            runFailed: false,
            comparisonResults: [{ status: "unrecorded" }],
            conformanceFailures: [],
            candidates: [{
              caseId: "redirect/theme/checkpoint.png",
              candidateBase64: candidate.toString("base64"),
            }],
          }),
          authorization: "controlled-capture",
          approvedRoot,
        });
        finalizeBaselineTransaction({
          transaction,
          processSucceeded: true,
          manifestPath,
        });
      },
      /symlink ancestor/,
    );
    assert.equal(existsSync(escapedPath), false);
    assert.deepEqual(readApprovalEntries(manifestPath), {});
  }));

test("a direct grep-filtered Playwright run cannot approve an unrecorded case", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedRoot = join(directory, "approved");
    const approvedPath = join(approvedRoot, CASE_ID);
    const configPath = join(directory, "playwright.config.mjs");
    const specPath = join(directory, "partial.spec.mjs");
    const playwrightModule = new URL(
      "../../node_modules/@playwright/test/index.mjs",
      import.meta.url,
    ).href;
    const reporterPath = fileURLToPath(
      new URL("../runner/baseline-reporter.js", import.meta.url),
    );
    const playwrightCli = fileURLToPath(
      new URL("../../node_modules/@playwright/test/cli.js", import.meta.url),
    );
    writeManifest(manifestPath);
    writeFileSync(
      specPath,
      `import { test } from ${JSON.stringify(playwrightModule)};\n` +
        `test("partial unrecorded", async ({}, testInfo) => {\n` +
        `  await testInfo.attach(${JSON.stringify(`baseline-establishment:${CASE_ID}`)}, {\n` +
        `    body: Buffer.from([1, 2, 3]),\n` +
        `    contentType: ${JSON.stringify(BASELINE_ATTACHMENT_TYPE)},\n` +
        `  });\n` +
        `});\n`,
    );
    writeFileSync(
      configPath,
      `import { defineConfig } from ${JSON.stringify(playwrightModule)};\n` +
        `export default defineConfig({\n` +
        `  testDir: ${JSON.stringify(directory)},\n` +
        `  testMatch: /partial\\.spec\\.mjs$/,\n` +
        `  reporter: [[${JSON.stringify(reporterPath)}, {\n` +
        `    manifestPath: ${JSON.stringify(manifestPath)},\n` +
        `    approvedRoot: ${JSON.stringify(approvedRoot)},\n` +
        `  }]],\n` +
        `});\n`,
    );
    const {
      GC_BASELINE_TRANSACTION: _transaction,
      GC_BASELINE_AUTHORIZATION: _authorization,
      ...directEnvironment
    } = process.env;

    const result = spawnSync(
      process.execPath,
      [playwrightCli, "test", "--config", configPath, "--grep", "partial unrecorded"],
      { cwd: directory, env: directEnvironment, encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(
      existsSync(approvedPath),
      false,
      "a direct filtered invocation must never establish an approved baseline",
    );
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], undefined);
  }));

test("a direct grep run cannot redirect the configured JSON reporter into approved", () =>
  withScratch((directory) => {
    const approvedRoot = join(directory, "goldens", "approved");
    const target = join(approvedRoot, "json-report-sentinel");
    const sentinel = Buffer.from("approved JSON sentinel\n");
    const configPath = join(directory, "playwright.config.mjs");
    const specPath = join(directory, "json.spec.mjs");
    const playwrightModule = new URL(
      "../../node_modules/@playwright/test/index.mjs",
      import.meta.url,
    ).href;
    const publicConfig = new URL("../runner/playwright.config.js", import.meta.url).href;
    const playwrightCli = fileURLToPath(
      new URL("../../node_modules/@playwright/test/cli.js", import.meta.url),
    );
    mkdirSync(approvedRoot, { recursive: true });
    writeFileSync(target, sentinel);
    writeFileSync(
      specPath,
      `import { test } from ${JSON.stringify(playwrightModule)};\n` +
        `test("json redirect", () => {});\n`,
    );
    writeFileSync(
      configPath,
      `import baseConfig from ${JSON.stringify(publicConfig)};\n` +
        `export default { ...baseConfig, testDir: ${JSON.stringify(directory)}, testMatch: /json\\.spec\\.mjs$/, webServer: undefined };\n`,
    );
    const result = spawnSync(
      process.execPath,
      [playwrightCli, "test", "--config", configPath, "--grep", "json redirect"],
      {
        cwd: directory,
        env: {
          ...process.env,
          GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT: join(directory, "goldens"),
          GC_PLAYWRIGHT_JSON: target,
        },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(readFileSync(target), sentinel);
  }));

test("native JSON and last-run output files fail closed inside scratch goldens", () =>
  withScratch((directory) => {
    const goldensRoot = join(directory, "goldens");
    const approvedRoot = join(goldensRoot, "approved");
    const jsonTarget = join(approvedRoot, "native-json-sentinel");
    const lastRunTarget = join(goldensRoot, "approval-manifest.json");
    const sentinel = Buffer.from("native output sentinel\n");
    const configPath = join(directory, "playwright.config.mjs");
    const specPath = join(directory, "native-output.spec.mjs");
    const playwrightModule = new URL(
      "../../node_modules/@playwright/test/index.mjs",
      import.meta.url,
    ).href;
    const publicConfig = new URL("../runner/playwright.config.js", import.meta.url).href;
    const playwrightCli = fileURLToPath(
      new URL("../../node_modules/@playwright/test/cli.js", import.meta.url),
    );
    mkdirSync(approvedRoot, { recursive: true });
    writeFileSync(jsonTarget, sentinel);
    writeFileSync(lastRunTarget, sentinel);
    writeFileSync(
      specPath,
      `import { test } from ${JSON.stringify(playwrightModule)};\n` +
        `test("native output", () => {});\n`,
    );
    writeFileSync(
      configPath,
      `import baseConfig from ${JSON.stringify(publicConfig)};\n` +
        `export default { ...baseConfig, testDir: ${JSON.stringify(directory)}, testMatch: /native-output\\.spec\\.mjs$/, webServer: undefined };\n`,
    );
    const result = spawnSync(
      process.execPath,
      [playwrightCli, "test", "--config", configPath, "--grep", "native output"],
      {
        cwd: directory,
        env: {
          ...process.env,
          GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT: goldensRoot,
          GC_PLAYWRIGHT_JSON: join(directory, "safe-results.json"),
          PLAYWRIGHT_JSON_OUTPUT_FILE: jsonTarget,
          PLAYWRIGHT_LAST_RUN_OUTPUT_FILE: lastRunTarget,
        },
        encoding: "utf8",
      },
    );
    assert.notEqual(result.status, 0, "unsafe native outputs must fail during config load");
    assert.deepEqual(readFileSync(jsonTarget), sentinel);
    assert.deepEqual(readFileSync(lastRunTarget), sentinel);
  }));

test("native JSON DIR and NAME cannot be activated by a reporter override", () =>
  withScratch((directory) => {
    const goldensRoot = join(directory, "goldens");
    const approvedRoot = join(goldensRoot, "approved");
    const target = join(approvedRoot, "native-dir-name-sentinel");
    const sentinel = Buffer.from("native DIR NAME sentinel\n");
    const configPath = join(directory, "playwright.config.mjs");
    const specPath = join(directory, "native-dir.spec.mjs");
    const playwrightModule = new URL(
      "../../node_modules/@playwright/test/index.mjs",
      import.meta.url,
    ).href;
    const publicConfig = new URL("../runner/playwright.config.js", import.meta.url).href;
    const playwrightCli = fileURLToPath(
      new URL("../../node_modules/@playwright/test/cli.js", import.meta.url),
    );
    mkdirSync(approvedRoot, { recursive: true });
    writeFileSync(target, sentinel);
    writeFileSync(
      specPath,
      `import { test } from ${JSON.stringify(playwrightModule)};\n` +
        `test("native dir name", () => {});\n`,
    );
    writeFileSync(
      configPath,
      `import baseConfig from ${JSON.stringify(publicConfig)};\n` +
        `export default { ...baseConfig, testDir: ${JSON.stringify(directory)}, testMatch: /native-dir\\.spec\\.mjs$/, webServer: undefined };\n`,
    );
    const result = spawnSync(
      process.execPath,
      [playwrightCli, "test", "--config", configPath, "--reporter", "json"],
      {
        cwd: directory,
        env: {
          ...process.env,
          GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT: goldensRoot,
          PLAYWRIGHT_JSON_OUTPUT_DIR: approvedRoot,
          PLAYWRIGHT_JSON_OUTPUT_NAME: "native-dir-name-sentinel",
        },
        encoding: "utf8",
      },
    );
    assert.notEqual(result.status, 0, "reporter overrides must fail during config load");
    assert.deepEqual(readFileSync(target), sentinel);
  }));

test("native reporter outputs reject symlinks in both protected directions", () =>
  withScratch((directory) => {
    const goldensRoot = join(directory, "goldens");
    const approvedRoot = join(goldensRoot, "approved");
    const outsideTarget = join(directory, "outside-results.json");
    const insideTarget = join(approvedRoot, "inside-results.json");
    const insideLink = join(approvedRoot, "inside-link.json");
    const outsideLink = join(directory, "outside-link.json");
    const sentinel = Buffer.from("reporter symlink sentinel\n");
    const configPath = join(directory, "playwright.config.mjs");
    const specPath = join(directory, "reporter-symlink.spec.mjs");
    const playwrightModule = new URL(
      "../../node_modules/@playwright/test/index.mjs",
      import.meta.url,
    ).href;
    const publicConfig = new URL("../runner/playwright.config.js", import.meta.url).href;
    const playwrightCli = fileURLToPath(
      new URL("../../node_modules/@playwright/test/cli.js", import.meta.url),
    );
    mkdirSync(approvedRoot, { recursive: true });
    writeFileSync(outsideTarget, sentinel);
    writeFileSync(insideTarget, sentinel);
    symlinkSync(outsideTarget, insideLink);
    symlinkSync(insideTarget, outsideLink);
    writeFileSync(
      specPath,
      `import { test } from ${JSON.stringify(playwrightModule)};\n` +
        `test("reporter symlink", () => {});\n`,
    );
    writeFileSync(
      configPath,
      `import baseConfig from ${JSON.stringify(publicConfig)};\n` +
        `export default { ...baseConfig, testDir: ${JSON.stringify(directory)}, testMatch: /reporter-symlink\\.spec\\.mjs$/, webServer: undefined };\n`,
    );
    for (const target of [insideLink, outsideLink]) {
      const result = spawnSync(
        process.execPath,
        [playwrightCli, "test", "--config", configPath, "--grep", "reporter symlink"],
        {
          cwd: directory,
          env: {
            ...process.env,
            GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT: goldensRoot,
            GC_PLAYWRIGHT_JSON: join(directory, "safe-results.json"),
            PLAYWRIGHT_JSON_OUTPUT_FILE: target,
          },
          encoding: "utf8",
        },
      );
      assert.notEqual(result.status, 0, "a protected lexical or canonical relationship must fail closed");
      assert.equal(lstatSync(target).isSymbolicLink(), true);
      assert.deepEqual(readFileSync(outsideTarget), sentinel);
      assert.deepEqual(readFileSync(insideTarget), sentinel);
    }
  }));

for (const linkKind of ["final", "parent"]) {
  test(`native reporter output rejects a dangling ${linkKind} symlink before tests`, () =>
    withScratch((directory) => {
      const goldensRoot = join(directory, "goldens");
      const approvedRoot = join(goldensRoot, "approved");
      const danglingFinalTarget = join(approvedRoot, "future-results.json");
      const danglingFinalLink = join(directory, "dangling-results.json");
      const danglingParentTarget = join(approvedRoot, "future-directory");
      const danglingParentLink = join(directory, "dangling-parent");
      const configPath = join(directory, "playwright.config.mjs");
      const specPath = join(directory, "dangling-reporter.spec.mjs");
      const playwrightModule = new URL(
        "../../node_modules/@playwright/test/index.mjs",
        import.meta.url,
      ).href;
      const publicConfig = new URL("../runner/playwright.config.js", import.meta.url).href;
      const playwrightCli = fileURLToPath(
        new URL("../../node_modules/@playwright/test/cli.js", import.meta.url),
      );
      mkdirSync(approvedRoot, { recursive: true });
      symlinkSync(danglingFinalTarget, danglingFinalLink);
      symlinkSync(danglingParentTarget, danglingParentLink);
      const output = linkKind === "final"
        ? danglingFinalLink
        : join(danglingParentLink, "results.json");
      const protectedTarget = linkKind === "final"
        ? danglingFinalTarget
        : join(danglingParentTarget, "results.json");
      const link = linkKind === "final" ? danglingFinalLink : danglingParentLink;
      const marker = join(directory, `${linkKind}-link-test-ran`);
      writeFileSync(
        specPath,
        `import { test } from ${JSON.stringify(playwrightModule)};\n` +
          `import { writeFileSync } from "node:fs";\n` +
          `test("dangling reporter", () => writeFileSync(process.env.GC_TEST_MARKER, "ran\\n"));\n`,
      );
      writeFileSync(
        configPath,
        `import baseConfig from ${JSON.stringify(publicConfig)};\n` +
          `export default { ...baseConfig, testDir: ${JSON.stringify(directory)}, testMatch: /dangling-reporter\\.spec\\.mjs$/, webServer: undefined };\n`,
      );
      const result = spawnSync(
        process.execPath,
        [playwrightCli, "test", "--config", configPath, "--grep", "dangling reporter"],
        {
          cwd: directory,
          env: {
            ...process.env,
            GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT: goldensRoot,
            GC_PLAYWRIGHT_JSON: join(directory, "safe-results.json"),
            GC_TEST_MARKER: marker,
            PLAYWRIGHT_JSON_OUTPUT_FILE: output,
          },
          encoding: "utf8",
        },
      );
      assert.notEqual(result.status, 0, "a dangling output link must fail during config load");
      assert.equal(existsSync(marker), false, "Playwright must not reach the test body");
      assert.equal(existsSync(protectedTarget), false);
      assert.equal(lstatSync(link).isSymbolicLink(), true);
    }));
}

test("an unsafe configured JSON fallback fails before reporter construction", () =>
  withScratch((directory) => {
    const goldensRoot = join(directory, "goldens");
    const approvedRoot = join(goldensRoot, "approved");
    const protectedTarget = join(approvedRoot, "future-configured-results.json");
    const danglingFallback = join(directory, "configured-results.json");
    const marker = join(directory, "configured-fallback-test-ran");
    const configPath = join(directory, "playwright.config.mjs");
    const specPath = join(directory, "configured-fallback.spec.mjs");
    const playwrightModule = new URL(
      "../../node_modules/@playwright/test/index.mjs",
      import.meta.url,
    ).href;
    const publicConfig = new URL("../runner/playwright.config.js", import.meta.url).href;
    const playwrightCli = fileURLToPath(
      new URL("../../node_modules/@playwright/test/cli.js", import.meta.url),
    );
    mkdirSync(approvedRoot, { recursive: true });
    symlinkSync(protectedTarget, danglingFallback);
    writeFileSync(
      specPath,
      `import { test } from ${JSON.stringify(playwrightModule)};\n` +
        `import { writeFileSync } from "node:fs";\n` +
        `test("configured fallback", () => writeFileSync(process.env.GC_TEST_MARKER, "ran\\n"));\n`,
    );
    writeFileSync(
      configPath,
      `import baseConfig, { safeJsonReportPath } from ${JSON.stringify(publicConfig)};\n` +
        `const outputFile = safeJsonReportPath(undefined, { approvedRoot: ${JSON.stringify(approvedRoot)}, fallback: ${JSON.stringify(danglingFallback)} });\n` +
        `export default { ...baseConfig, testDir: ${JSON.stringify(directory)}, testMatch: /configured-fallback\\.spec\\.mjs$/, webServer: undefined, reporter: [["json", { outputFile }]] };\n`,
    );
    const result = spawnSync(
      process.execPath,
      [playwrightCli, "test", "--config", configPath, "--grep", "configured fallback"],
      {
        cwd: directory,
        env: {
          ...process.env,
          GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT: goldensRoot,
          GC_PLAYWRIGHT_JSON: join(directory, "safe-results.json"),
          GC_TEST_MARKER: marker,
        },
        encoding: "utf8",
      },
    );
    assert.notEqual(result.status, 0, "an unsafe configured fallback must fail during config load");
    assert.equal(existsSync(marker), false, "Playwright must not reach the test body");
    assert.equal(existsSync(protectedTarget), false);
    assert.equal(lstatSync(danglingFallback).isSymbolicLink(), true);
  }));

test("the public config rejects PW_TEST_REPORTER before loading custom code", () =>
  withScratch((directory) => {
    const goldensRoot = join(directory, "goldens");
    const sentinelPath = join(goldensRoot, "reporter-sentinel");
    const reporterPath = join(directory, "custom-reporter.mjs");
    const configPath = join(directory, "playwright.config.mjs");
    const specPath = join(directory, "reporter-env.spec.mjs");
    const playwrightModule = new URL(
      "../../node_modules/@playwright/test/index.mjs",
      import.meta.url,
    ).href;
    const publicConfig = new URL("../runner/playwright.config.js", import.meta.url).href;
    const playwrightCli = fileURLToPath(
      new URL("../../node_modules/@playwright/test/cli.js", import.meta.url),
    );
    mkdirSync(goldensRoot);
    writeFileSync(sentinelPath, "original\n");
    writeFileSync(
      reporterPath,
      `import { writeFileSync } from "node:fs";\n` +
        `export default class { constructor() { writeFileSync(${JSON.stringify(sentinelPath)}, "mutated\\n"); } }\n`,
    );
    writeFileSync(
      specPath,
      `import { test } from ${JSON.stringify(playwrightModule)};\n` +
        `test("reporter env", () => {});\n`,
    );
    writeFileSync(
      configPath,
      `import baseConfig from ${JSON.stringify(publicConfig)};\n` +
        `export default { ...baseConfig, testDir: ${JSON.stringify(directory)}, testMatch: /reporter-env\\.spec\\.mjs$/, webServer: undefined };\n`,
    );
    const result = spawnSync(
      process.execPath,
      [playwrightCli, "test", "--config", configPath],
      {
        cwd: directory,
        env: {
          ...process.env,
          GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT: goldensRoot,
          GC_PLAYWRIGHT_JSON: join(directory, "safe-results.json"),
          PW_TEST_REPORTER: reporterPath,
        },
        encoding: "utf8",
      },
    );
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(sentinelPath, "utf8"), "original\n");
  }));

test("the npm comparison wrapper rejects PW_TEST_REPORTER before Playwright", () =>
  withScratch((directory) => {
    const sentinelPath = join(directory, "reporter-sentinel");
    const reporterPath = join(directory, "custom-reporter.mjs");
    writeFileSync(sentinelPath, "original\n");
    writeFileSync(
      reporterPath,
      `import { writeFileSync } from "node:fs";\n` +
        `export default class { constructor() { writeFileSync(${JSON.stringify(sentinelPath)}, "mutated\\n"); } }\n`,
    );
    const result = spawnSync(
      "npm",
      ["run", "playwright", "--", "--grep", "no such test", "--pass-with-no-tests"],
      {
        cwd: fileURLToPath(new URL("../../", import.meta.url)),
        env: {
          ...process.env,
          GC_PLAYWRIGHT_JSON: join(directory, "safe-results.json"),
          PW_TEST_REPORTER: reporterPath,
        },
        encoding: "utf8",
      },
    );
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(sentinelPath, "utf8"), "original\n");
  }));

test("canonical capture strips native reporter outputs before Playwright", async () =>
  withScratchAsync(async (directory) => {
    const goldensRoot = join(directory, "goldens");
    const approvedRoot = join(goldensRoot, "approved");
    const manifestPath = join(goldensRoot, "approval-manifest.json");
    const manifestBefore = Buffer.from(JSON.stringify(EMPTY_MANIFEST, null, 2) + "\n");
    const configPath = join(directory, "playwright.config.mjs");
    const specPath = join(directory, "canonical-native.spec.mjs");
    const metricsScript = join(directory, "metrics.mjs");
    const playwrightModule = new URL(
      "../../node_modules/@playwright/test/index.mjs",
      import.meta.url,
    ).href;
    const publicConfig = new URL("../runner/playwright.config.js", import.meta.url).href;
    const playwrightCli = fileURLToPath(
      new URL("../../node_modules/@playwright/test/cli.js", import.meta.url),
    );
    mkdirSync(approvedRoot, { recursive: true });
    writeFileSync(manifestPath, manifestBefore);
    writeFileSync(
      specPath,
      `import { test } from ${JSON.stringify(playwrightModule)};\n` +
        `test("canonical native output", () => {});\n`,
    );
    writeFileSync(
      configPath,
      `import baseConfig from ${JSON.stringify(publicConfig)};\n` +
        `export default { ...baseConfig, testDir: ${JSON.stringify(directory)}, testMatch: /canonical-native\\.spec\\.mjs$/, webServer: undefined };\n`,
    );
    writeFileSync(metricsScript, "process.exitCode = 0;\n");
    const reporterPath = join(directory, "canonical-custom-reporter.mjs");
    writeFileSync(
      reporterPath,
      `import { writeFileSync } from "node:fs";\n` +
        `export default class { constructor() { writeFileSync(${JSON.stringify(manifestPath)}, "mutated by reporter\\n"); } }\n`,
    );
    const nativeOutputs = {
      PLAYWRIGHT_JSON_OUTPUT_FILE: manifestPath,
      PLAYWRIGHT_JSON_OUTPUT_DIR: goldensRoot,
      PLAYWRIGHT_JSON_OUTPUT_NAME: "approval-manifest.json",
      PLAYWRIGHT_JUNIT_OUTPUT_FILE: manifestPath,
      PLAYWRIGHT_JUNIT_OUTPUT_DIR: goldensRoot,
      PLAYWRIGHT_JUNIT_OUTPUT_NAME: "approval-manifest.json",
      PLAYWRIGHT_BLOB_OUTPUT_FILE: manifestPath,
      PLAYWRIGHT_BLOB_OUTPUT_DIR: goldensRoot,
      PLAYWRIGHT_BLOB_OUTPUT_NAME: "approval-manifest.json",
      PLAYWRIGHT_HTML_OUTPUT_DIR: goldensRoot,
      PLAYWRIGHT_HTML_REPORT: goldensRoot,
      PLAYWRIGHT_LAST_RUN_OUTPUT_FILE: manifestPath,
      PW_TEST_REPORTER: reporterPath,
    };
    const previousNativeOutputs = Object.fromEntries(
      Object.keys(nativeOutputs).map((name) => [name, process.env[name]]),
    );
    const previousProtectedRoot = process.env.GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT;
    Object.assign(process.env, nativeOutputs);
    process.env.GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT = goldensRoot;
    try {
      const result = await runCanonicalCapture({
        repoRoot: directory,
        playwrightCli,
        playwrightConfig: configPath,
        metricsScript,
        manifestPath,
        approvedRoot,
      });
      assert.equal(result.status, 0);
      assert.deepEqual(readFileSync(manifestPath), manifestBefore);
    } finally {
      for (const [name, previous] of Object.entries(previousNativeOutputs)) {
        if (previous === undefined) delete process.env[name];
        else process.env[name] = previous;
      }
      if (previousProtectedRoot === undefined) {
        delete process.env.GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT;
      } else {
        process.env.GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT = previousProtectedRoot;
      }
    }
  }));

test("the npm comparison command refuses destructive output routing", () =>
  withScratch((directory) => {
    const goldensRoot = join(directory, "goldens");
    const approvedRoot = join(goldensRoot, "approved");
    const sentinel = join(approvedRoot, "baseline-sentinel.png");
    const linkParent = join(directory, "goldens-parent-link");
    mkdirSync(approvedRoot, { recursive: true });
    symlinkSync(directory, linkParent);
    writeFileSync(sentinel, Buffer.from("scratch raster sentinel\n"));
    const targets = [
      ["--output", goldensRoot],
      [`--output=${approvedRoot}`],
      ["--output", join(approvedRoot, "nested")],
      ["--output", join(linkParent, "goldens")],
      ["--last-failed-file", join(goldensRoot, "approval-manifest.json")],
    ];
    for (const outputArguments of targets) {
      const result = spawnSync(
        "npm",
        ["run", "playwright", "--", ...outputArguments, "--grep", "no such test", "--pass-with-no-tests"],
        {
          cwd: fileURLToPath(new URL("../../", import.meta.url)),
          env: {
            ...process.env,
            GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT: goldensRoot,
            GC_PLAYWRIGHT_JSON: join(directory, "safe-results.json"),
          },
          encoding: "utf8",
        },
      );
      assert.notEqual(result.status, 0, "protected output must be rejected before cleanup");
      assert.equal(existsSync(sentinel), true);
    }
  }));

test("the npm comparison command preserves a protected symlink to outside", () =>
  withScratch((directory) => {
    const goldensRoot = join(directory, "goldens");
    const outsideRoot = join(directory, "outside-output");
    const outputLink = join(goldensRoot, "output-link");
    mkdirSync(goldensRoot);
    mkdirSync(outsideRoot);
    symlinkSync(outsideRoot, outputLink);
    const linkTarget = readlinkSync(outputLink);
    const result = spawnSync(
      "npm",
      ["run", "playwright", "--", "--output", outputLink, "--grep", "no such test", "--pass-with-no-tests"],
      {
        cwd: fileURLToPath(new URL("../../", import.meta.url)),
        env: {
          ...process.env,
          GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT: goldensRoot,
          GC_PLAYWRIGHT_JSON: join(directory, "safe-results.json"),
        },
        encoding: "utf8",
      },
    );
    assert.notEqual(result.status, 0, "lexically protected output must fail before cleanup");
    assert.equal(lstatSync(outputLink).isSymbolicLink(), true);
    assert.equal(readlinkSync(outputLink), linkTarget);
  }));

test("the npm comparison command preserves a dangling output symlink", () =>
  withScratch((directory) => {
    const goldensRoot = join(directory, "goldens");
    const approvedRoot = join(goldensRoot, "approved");
    const protectedTarget = join(approvedRoot, "future-output");
    const outputLink = join(directory, "dangling-output");
    mkdirSync(approvedRoot, { recursive: true });
    symlinkSync(protectedTarget, outputLink);
    const linkTarget = readlinkSync(outputLink);
    const result = spawnSync(
      "npm",
      ["run", "playwright", "--", "--output", outputLink, "--grep", "no such test", "--pass-with-no-tests"],
      {
        cwd: fileURLToPath(new URL("../../", import.meta.url)),
        env: {
          ...process.env,
          GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT: goldensRoot,
          GC_PLAYWRIGHT_JSON: join(directory, "safe-results.json"),
        },
        encoding: "utf8",
      },
    );
    assert.notEqual(result.status, 0, "a dangling output link must fail before cleanup");
    assert.equal(lstatSync(outputLink).isSymbolicLink(), true);
    assert.equal(readlinkSync(outputLink), linkTarget);
    assert.equal(existsSync(protectedTarget), false);
  }));

test("the npm comparison command rejects an alternate config before loading it", () =>
  withScratch((directory) => {
    const sentinel = join(directory, "config-sentinel");
    const maliciousConfig = join(directory, "alternate.config.mjs");
    writeFileSync(sentinel, "original\n");
    writeFileSync(
      maliciousConfig,
      `import { writeFileSync } from "node:fs";\n` +
        `writeFileSync(${JSON.stringify(sentinel)}, "mutated\\n");\n` +
        `export default { testDir: ${JSON.stringify(directory)} };\n`,
    );
    for (const configArguments of [
      ["--config", maliciousConfig],
      [`--config=${maliciousConfig}`],
      ["-c", maliciousConfig],
    ]) {
      const result = spawnSync(
        "npm",
        ["run", "playwright", "--", ...configArguments, "--pass-with-no-tests"],
        {
          cwd: fileURLToPath(new URL("../../", import.meta.url)),
          env: { ...process.env, GC_PLAYWRIGHT_JSON: join(directory, "safe-results.json") },
          encoding: "utf8",
        },
      );
      assert.notEqual(result.status, 0);
      assert.equal(readFileSync(sentinel, "utf8"), "original\n");
    }
  }));

test("the JSON reporter rejects an outside symlink parent that resolves into approved", () =>
  withScratch((directory) => {
    const approvedRoot = join(directory, "approved");
    const linkParent = join(directory, "outside-link");
    const fallback = join(directory, "safe", "results.json");
    mkdirSync(approvedRoot);
    symlinkSync(approvedRoot, linkParent);
    assert.equal(
      safeJsonReportPath(join(linkParent, "results.json"), {
        approvedRoot,
        fallback,
      }),
      fallback,
    );
  }));

test("a direct grep run cannot stage through a regular fd inside approved", () =>
  withScratch((directory) => {
    const approvedRoot = join(directory, "approved");
    const manifestPath = join(directory, "approval-manifest.json");
    const forgedTransactionPath = join(
      approvedRoot,
      ".a2.3-forged-regular-fd.json",
    );
    const sentinel = Buffer.from("approved-tree sentinel\n");
    const configPath = join(directory, "playwright.config.mjs");
    const specPath = join(directory, "forged.spec.mjs");
    const playwrightModule = new URL(
      "../../node_modules/@playwright/test/index.mjs",
      import.meta.url,
    ).href;
    const publicConfig = new URL("../runner/playwright.config.js", import.meta.url).href;
    const playwrightCli = fileURLToPath(
      new URL("../../node_modules/@playwright/test/cli.js", import.meta.url),
    );
    mkdirSync(approvedRoot);
    writeManifest(manifestPath);
    const manifestBefore = readFileSync(manifestPath);
    assert.equal(existsSync(forgedTransactionPath), false);
    writeFileSync(forgedTransactionPath, sentinel);
    const forgedFd = openSync(forgedTransactionPath, "r+");
    writeFileSync(
      specPath,
      `import { test } from ${JSON.stringify(playwrightModule)};\n` +
        `test("forged partial", async ({}, testInfo) => {\n` +
        `  await testInfo.attach(${JSON.stringify(`baseline-establishment:${CASE_ID}`)}, {\n` +
        `    body: Buffer.from([1, 2, 3]),\n` +
        `    contentType: ${JSON.stringify(BASELINE_ATTACHMENT_TYPE)},\n` +
        `  });\n` +
        `});\n`,
    );
    writeFileSync(
      configPath,
      `import baseConfig from ${JSON.stringify(publicConfig)};\n` +
        `export default {\n` +
        `  ...baseConfig,\n` +
        `  testDir: ${JSON.stringify(directory)},\n` +
        `  testMatch: /forged\\.spec\\.mjs$/,\n` +
        `  webServer: undefined,\n` +
        `};\n`,
    );

    try {
      const result = spawnSync(
        process.execPath,
        [playwrightCli, "test", "--config", configPath, "--grep", "forged partial"],
        {
          cwd: directory,
          env: {
            ...process.env,
            GC_BASELINE_TRANSACTION: forgedTransactionPath,
            GC_BASELINE_AUTHORIZATION: "caller-forged-authorization",
            GC_BASELINE_PROTOCOL: BASELINE_TRANSACTION_PROTOCOL,
            GC_PLAYWRIGHT_JSON: join(directory, "results.json"),
          },
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe", forgedFd],
        },
      );

      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.deepEqual(
        readFileSync(forgedTransactionPath),
        sentinel,
        "a regular descriptor must never receive a staged transaction",
      );
      assert.deepEqual(readFileSync(manifestPath), manifestBefore);
    } finally {
      closeSync(forgedFd);
      rmSync(forgedTransactionPath, { force: true });
    }
  }));

function readApprovalEntries(path) {
  return JSON.parse(readFileSync(path, "utf8")).entries;
}

test("a successful run commits PNGs and manifest entries at one commit point", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedPath = join(directory, "nested", "case.png");
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath);

    const staged = comparator.establishBaseline({
      approvedPath,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });
    assert.equal(existsSync(approvedPath), false, "staging must remain in memory");

    const committed = comparator.commitBaselineEstablishment({
      candidates: [staged],
      comparisonResults: [{ status: "unrecorded", reason: "no-baseline", caseId: CASE_ID }],
      conformanceFailures: [],
      runFailed: false,
      path: manifestPath,
    });

    assert.equal(committed.committed, true);
    assert.equal(committed.writtenPngs, 1);
    assert.equal(committed.recoveredPngs, 0);
    assert.deepEqual(readFileSync(approvedPath), candidate);
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], sha256(candidate));
  }));

test("a matching orphan is recovered without rewriting its PNG", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedPath = join(directory, "orphan.png");
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath);
    writeFileSync(approvedPath, candidate);
    const fixedTime = new Date("2001-01-01T00:00:00.000Z");
    utimesSync(approvedPath, fixedTime, fixedTime);
    const before = statSync(approvedPath).mtimeMs;

    const result = compare(candidate, approvedPath);
    const staged = comparator.establishBaseline({
      approvedPath,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });
    const committed = comparator.commitBaselineEstablishment({
      candidates: [staged],
      comparisonResults: [result],
      conformanceFailures: [],
      runFailed: false,
      path: manifestPath,
    });

    assert.equal(committed.recoveredPngs, 1);
    assert.equal(committed.writtenPngs, 0);
    assert.equal(statSync(approvedPath).mtimeMs, before);
    assert.deepEqual(readFileSync(approvedPath), candidate);
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], sha256(candidate));
  }));

test("a partial PNG staging write cannot publish a mismatching orphan", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedPath = join(directory, "approved", "case.png");
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath);
    const manifestBefore = readFileSync(manifestPath);
    const staged = comparator.establishBaseline({
      approvedPath,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });
    assert.throws(
      () => comparator.commitBaselineEstablishment({
        candidates: [staged],
        comparisonResults: [{ status: "unrecorded" }],
        conformanceFailures: [],
        runFailed: false,
        path: manifestPath,
        pngIo: {
          writeFile(path, contents, options) {
            writeFileSync(path, contents.subarray(0, 12), options);
            const error = new Error("simulated partial PNG EFBIG");
            error.code = "EFBIG";
            throw error;
          },
        },
      }),
      (error) => error?.code === "EFBIG",
    );
    assert.equal(existsSync(approvedPath), false);
    assert.deepEqual(readFileSync(manifestPath), manifestBefore);
    assert.deepEqual(
      readdirSync(dirname(approvedPath)).filter((name) => name.endsWith(".tmp")),
      [],
    );
  }));

test("candidate PNG staging uses the manifest sibling area outside approved", () =>
  withScratch((directory) => {
    const goldensRoot = join(directory, "goldens");
    const manifestPath = join(goldensRoot, "approval-manifest.json");
    const approvedRoot = join(goldensRoot, "approved");
    const approvedPath = join(approvedRoot, CASE_ID);
    const candidate = png(2, 2, [10, 20, 30]);
    let stagedPath;
    mkdirSync(goldensRoot);
    writeManifest(manifestPath);
    const staged = comparator.establishBaseline({
      approvedPath,
      approvedRoot,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });
    assert.throws(
      () => comparator.commitBaselineEstablishment({
        candidates: [staged],
        comparisonResults: [{ status: "unrecorded" }],
        conformanceFailures: [],
        runFailed: false,
        path: manifestPath,
        pngIo: {
          writeFile(path) {
            stagedPath = path;
            throw new Error("observe staging path");
          },
        },
      }),
      /observe staging path/,
    );
    assert.equal(dirname(stagedPath), goldensRoot);
    assert.equal(stagedPath.startsWith(approvedRoot), false);
    assert.match(stagedPath, /scenario_theme_checkpoint\.png/);
  }));

test("an interruption after atomic PNG install leaves a recoverable complete orphan", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedRoot = join(directory, "approved");
    const approvedPath = join(approvedRoot, "case.png");
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath);
    const manifestBefore = readFileSync(manifestPath);
    const staged = comparator.establishBaseline({
      approvedPath,
      approvedRoot,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });
    assert.throws(
      () => comparator.commitBaselineEstablishment({
        candidates: [staged],
        comparisonResults: [{ status: "unrecorded" }],
        conformanceFailures: [],
        runFailed: false,
        path: manifestPath,
        pngIo: {
          link(from, to) {
            linkSync(from, to);
            const error = new Error("simulated interruption after PNG link");
            error.code = "EINTR";
            throw error;
          },
        },
      }),
      (error) => error?.code === "EINTR",
    );
    assert.deepEqual(readFileSync(approvedPath), candidate);
    assert.deepEqual(readFileSync(manifestPath), manifestBefore);
    const fixedTime = new Date("2001-01-01T00:00:00.000Z");
    utimesSync(approvedPath, fixedTime, fixedTime);
    const before = statSync(approvedPath).mtimeMs;

    const recovered = comparator.establishBaseline({
      approvedPath,
      approvedRoot,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });
    const committed = comparator.commitBaselineEstablishment({
      candidates: [recovered],
      comparisonResults: [{ status: "unrecorded" }],
      conformanceFailures: [],
      runFailed: false,
      path: manifestPath,
    });
    assert.equal(committed.recoveredPngs, 1);
    assert.equal(statSync(approvedPath).mtimeMs, before);
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], sha256(candidate));
  }));

test("SIGKILL after atomic install leaves a stale link that green recovery removes", () =>
  withScratch((directory) => {
    const goldensRoot = join(directory, "goldens");
    const manifestPath = join(goldensRoot, "approval-manifest.json");
    const approvedRoot = join(goldensRoot, "approved");
    const approvedPath = join(approvedRoot, CASE_ID);
    const candidate = png(2, 2, [10, 20, 30]);
    const comparatorUrl = new URL("../runner/compare.js", import.meta.url).href;
    mkdirSync(goldensRoot);
    writeManifest(manifestPath);
    const childScript =
      `import { linkSync } from "node:fs";\n` +
      `import { establishBaseline, commitBaselineEstablishment } from ${JSON.stringify(comparatorUrl)};\n` +
      `const candidatePng = Buffer.from(${JSON.stringify(candidate.toString("base64"))}, "base64");\n` +
      `const staged = establishBaseline({\n` +
      `  approvedPath: ${JSON.stringify(approvedPath)},\n` +
      `  approvedRoot: ${JSON.stringify(approvedRoot)},\n` +
      `  caseId: ${JSON.stringify(CASE_ID)},\n` +
      `  candidatePng,\n` +
      `  manifest: ${JSON.stringify(EMPTY_MANIFEST)},\n` +
      `});\n` +
      `commitBaselineEstablishment({\n` +
      `  candidates: [staged], comparisonResults: [{ status: "unrecorded" }],\n` +
      `  conformanceFailures: [], runFailed: false, path: ${JSON.stringify(manifestPath)},\n` +
      `  pngIo: { link(from, to) { linkSync(from, to); process.kill(process.pid, "SIGKILL"); } },\n` +
      `});\n`;
    const killed = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", childScript],
      { encoding: "utf8" },
    );
    assert.equal(killed.signal, "SIGKILL", killed.stdout + killed.stderr);
    assert.deepEqual(readFileSync(approvedPath), candidate);
    assert.deepEqual(readApprovalEntries(manifestPath), {});
    const staleBefore = temporaryBaselineFiles(goldensRoot);
    assert.equal(staleBefore.length, 1);
    const fixedTime = new Date("2001-01-01T00:00:00.000Z");
    utimesSync(approvedPath, fixedTime, fixedTime);
    const before = statSync(approvedPath).mtimeMs;

    const recovered = comparator.establishBaseline({
      approvedPath,
      approvedRoot,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });
    const committed = comparator.commitBaselineEstablishment({
      candidates: [recovered],
      comparisonResults: [{ status: "unrecorded", reason: "baseline-entry-recoverable" }],
      conformanceFailures: [],
      runFailed: false,
      path: manifestPath,
      manifestIo: {
        writeFile(path, contents, options) {
          assert.deepEqual(temporaryBaselineFiles(goldensRoot), []);
          writeFileSync(path, contents, options);
        },
      },
    });
    assert.equal(committed.recoveredPngs, 1);
    assert.equal(statSync(approvedPath).mtimeMs, before);
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], sha256(candidate));
    assert.deepEqual(temporaryBaselineFiles(goldensRoot), []);
    assert.match(staleBefore[0], /scenario_theme_checkpoint\.png/);
  }));

test("a partial manifest write leaves the live manifest intact and the PNG recoverable", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedPath = join(directory, "approved", "case.png");
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath);
    const manifestBefore = readFileSync(manifestPath);
    const staged = comparator.establishBaseline({
      approvedPath,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });

    assert.throws(
      () =>
        comparator.commitBaselineEstablishment({
          candidates: [staged],
          comparisonResults: [{
            status: "unrecorded",
            reason: "no-baseline",
            caseId: CASE_ID,
          }],
          conformanceFailures: [],
          runFailed: false,
          path: manifestPath,
          manifestIo: {
            writeFile(path, contents, options) {
              writeFileSync(path, contents.subarray(0, 24), options);
              const error = new Error("simulated partial manifest EIO");
              error.code = "EIO";
              throw error;
            },
          },
        }),
      (error) => error?.code === "EIO",
    );
    assert.deepEqual(readFileSync(manifestPath), manifestBefore);
    assert.deepEqual(readFileSync(approvedPath), candidate);
    assert.doesNotThrow(() => comparator.readApprovalManifest(manifestPath));

    const recovered = comparator.establishBaseline({
      approvedPath,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });
    const committed = comparator.commitBaselineEstablishment({
      candidates: [recovered],
      comparisonResults: [{
        status: "unrecorded",
        reason: "baseline-entry-recoverable",
        caseId: CASE_ID,
      }],
      conformanceFailures: [],
      runFailed: false,
      path: manifestPath,
    });

    assert.equal(committed.recoveredPngs, 1);
    assert.equal(committed.writtenPngs, 0);
    assert.equal(readApprovalEntries(manifestPath)[CASE_ID], sha256(candidate));
  }));

test("a manifest rename failure preserves the live manifest and removes its temp", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedPath = join(directory, "approved", "case.png");
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath);
    const manifestBefore = readFileSync(manifestPath);
    const staged = comparator.establishBaseline({
      approvedPath,
      caseId: CASE_ID,
      candidatePng: candidate,
      manifest: EMPTY_MANIFEST,
    });

    assert.throws(
      () =>
        comparator.commitBaselineEstablishment({
          candidates: [staged],
          comparisonResults: [{
            status: "unrecorded",
            reason: "no-baseline",
            caseId: CASE_ID,
          }],
          conformanceFailures: [],
          runFailed: false,
          path: manifestPath,
          manifestIo: {
            rename() {
              const error = new Error("simulated manifest rename EIO");
              error.code = "EIO";
              throw error;
            },
          },
        }),
      (error) => error?.code === "EIO",
    );

    assert.deepEqual(readFileSync(manifestPath), manifestBefore);
    assert.deepEqual(readFileSync(approvedPath), candidate);
    assert.doesNotThrow(() => comparator.readApprovalManifest(manifestPath));
    assert.deepEqual(
      readdirSync(directory).filter((name) => name.endsWith(".tmp")),
      [],
    );
  }));

test("a second successful run performs no baseline write", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const approvedPath = join(directory, "approved.png");
    const candidate = png(2, 2, [10, 20, 30]);
    writeManifest(manifestPath, manifestWith(sha256(candidate)));
    writeFileSync(approvedPath, candidate);
    const fixedTime = new Date("2001-01-01T00:00:00.000Z");
    utimesSync(manifestPath, fixedTime, fixedTime);
    utimesSync(approvedPath, fixedTime, fixedTime);
    const manifestTime = statSync(manifestPath).mtimeMs;
    const pngTime = statSync(approvedPath).mtimeMs;

    const result = compare(candidate, approvedPath, manifestWith(sha256(candidate)));
    const committed = comparator.commitBaselineEstablishment({
      candidates: [],
      comparisonResults: [result],
      conformanceFailures: [],
      runFailed: false,
      path: manifestPath,
    });

    assert.equal(committed.committed, true);
    assert.equal(committed.writtenEntries, 0);
    assert.equal(statSync(manifestPath).mtimeMs, manifestTime);
    assert.equal(statSync(approvedPath).mtimeMs, pngTime);
  }));

test("establish refuses a case whose manifest entry already exists", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "absent.png");
    assert.throws(
      () =>
        comparator.establishBaseline({
          approvedPath,
          caseId: CASE_ID,
          candidatePng: png(2, 2, [0, 0, 0]),
          manifest: manifestWith("0".repeat(64)),
        }),
      /refusing to establish .* a manifest entry already exists/,
    );
    assert.equal(
      comparator.APPROVAL_MANIFEST_PATH.length > 0 && approvedPath.includes("absent"),
      true,
    );
  }));

test("establish refuses a case whose baseline PNG does not match the capture", () =>
  withScratch((directory) => {
    const approvedPath = join(directory, "present.png");
    writeFileSync(approvedPath, png(2, 2, [255, 0, 0]));

    assert.throws(
      () =>
        comparator.establishBaseline({
          approvedPath,
          caseId: CASE_ID,
          candidatePng: png(2, 2, [0, 0, 0]),
          manifest: EMPTY_MANIFEST,
        }),
      /refusing to establish .* a baseline PNG already exists/,
    );
  }));

test("the manifest merge adds entries and never rewrites an existing one", () =>
  withScratch((directory) => {
    const manifestPath = join(directory, "approval-manifest.json");
    const existing = png(2, 2, [1, 1, 1]);
    const fresh = png(2, 2, [2, 2, 2]);
    writeFileSync(
      manifestPath,
      JSON.stringify(
        { version: 1, algorithm: "sha256", entries: { existing: sha256(existing) } },
        null,
        2,
      ) + "\n",
    );

    const added = comparator.writeManifestEntries({
      entries: [{ caseId: "fresh", hash: sha256(fresh) }],
      path: manifestPath,
    });
    assert.equal(added.written, 1);
    assert.equal(added.totalEntries, 2);

    const merged = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(merged.entries.existing, sha256(existing));
    assert.equal(merged.entries.fresh, sha256(fresh));

    assert.throws(
      () =>
        comparator.writeManifestEntries({
          entries: [{ caseId: "existing", hash: sha256(fresh) }],
          path: manifestPath,
        }),
      /refusing to rewrite manifest entry "existing"/,
    );
  }));
