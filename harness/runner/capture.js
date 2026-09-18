/**
 * Script Name : capture.js
 * Description : Run every canonical capture gate before finalizing baselines.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-01
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * This is the only command authorized to establish approved baselines. It
 * starts Playwright with fixed, unfiltered arguments and an inherited pipe.
 * The pipe is drained concurrently so every candidate stays in memory without
 * blocking on the operating-system pipe buffer. A separate 64 MiB transaction
 * bound limits wrapper memory. Approval happens only after Playwright and
 * metrics both exit zero.
 */

import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  BASELINE_TRANSACTION_PROTOCOL,
  finalizeBaselineTransaction,
  parseBaselineTransaction,
} from "./baseline-reporter.js";
import { stripPlaywrightOutputEnvironment } from "./output-safety.js";
import { curatedRoots, initializeRunOutput, stripObsoleteRunOutputEnvironment } from "./run-output.js";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PLAYWRIGHT_CLI = fileURLToPath(
  new URL("../../node_modules/@playwright/test/cli.js", import.meta.url),
);
const PLAYWRIGHT_CONFIG = fileURLToPath(
  new URL("./playwright.config.js", import.meta.url),
);
const METRICS_SCRIPT = fileURLToPath(
  new URL("../metrics/metrics.js", import.meta.url),
);
export const BASELINE_TRANSACTION_BYTE_LIMIT = 64 * 1024 * 1024;

function stripBaselineAuthority(environment) {
  // Native Playwright output routing, the reporter extension hook, and the
  // keys of the removed caller-configurable output surface are deleted: the
  // canonical run owns its fixed destinations. Only baseline authority is
  // additionally removed here, because this wrapper is what grants it.
  const clean = stripObsoleteRunOutputEnvironment(
    stripPlaywrightOutputEnvironment(environment),
  );
  delete clean.GC_BASELINE_TRANSACTION;
  delete clean.GC_BASELINE_AUTHORIZATION;
  delete clean.GC_BASELINE_PROTOCOL;
  return clean;
}

function runProcess(executable, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, options);
    child.once("error", reject);
    child.once("close", (status) => resolve({ status: status ?? 1 }));
  });
}

function runPlaywright(executable, args, options, byteLimit) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      ...options,
      stdio: ["inherit", "inherit", "inherit", "pipe"],
    });
    const chunks = [];
    let byteCount = 0;
    let overflow = false;
    let pipeError;
    let killTimer;
    child.stdio[3].on("data", (chunk) => {
      byteCount += chunk.length;
      if (byteCount > byteLimit) {
        if (!overflow) {
          overflow = true;
          child.kill("SIGTERM");
          killTimer = setTimeout(() => child.kill("SIGKILL"), 1_000);
          killTimer.unref();
        }
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    child.stdio[3].once("error", (error) => {
      pipeError = error;
    });
    child.once("error", reject);
    child.once("close", (status) => {
      if (killTimer) clearTimeout(killTimer);
      if (overflow) {
        reject(new Error(`baseline transaction exceeds ${byteLimit} bytes`));
        return;
      }
      if (pipeError) {
        reject(pipeError);
        return;
      }
      resolve({
        status: status ?? 1,
        serialized: Buffer.concat(chunks),
      });
    });
  });
}

/**
 * Run the fixed Playwright and metrics processes, then finalize its staged
 * transaction only when both processes succeeded.
 * Filesystem path overrides keep the real process boundary testable in a
 * scratch tree; the command-line entry point always uses the fixed defaults.
 */
export async function runCanonicalCapture({
  repoRoot = REPO_ROOT,
  playwrightCli = PLAYWRIGHT_CLI,
  playwrightConfig = PLAYWRIGHT_CONFIG,
  metricsScript = METRICS_SCRIPT,
  manifestPath,
  approvedRoot,
  transactionByteLimit = BASELINE_TRANSACTION_BYTE_LIMIT,
} = {}) {
  const authorization = randomUUID();
  const cleanEnvironment = stripBaselineAuthority(process.env);
  // One invocation-wide owner initializes the fixed run-output location
  // before Playwright starts, so this capture cannot read a previous
  // invocation's results and its workers all share one run identity. The
  // curated set reflects the locations this capture actually finalizes
  // into when it is pointed at fixture trees.
  const { runDirectory } = initializeRunOutput({
    repoRoot,
    curatedRoots: curatedRoots({ repoRoot, approvedRoot, manifestPath }),
  });
  console.log(`goldens: run output directory ${runDirectory}`);
  const child = await runPlaywright(
    process.execPath,
    [playwrightCli, "test", "--config", playwrightConfig],
    {
      cwd: repoRoot,
      env: {
        ...cleanEnvironment,
        GC_BASELINE_AUTHORIZATION: authorization,
        GC_BASELINE_PROTOCOL: BASELINE_TRANSACTION_PROTOCOL,
      },
    },
    transactionByteLimit,
  );
  const transaction = parseBaselineTransaction({
    serialized: child.serialized,
    authorization,
    approvedRoot,
  });
  const metrics = child.status === 0
    ? await runProcess(process.execPath, [metricsScript], {
        cwd: repoRoot,
        env: cleanEnvironment,
        stdio: "inherit",
      })
    : { status: 1 };
  const processSucceeded = child.status === 0 && metrics.status === 0;
  const finalized = finalizeBaselineTransaction({
    transaction,
    processSucceeded,
    manifestPath,
  });
  // A refused finalization is a failed capture even when both child processes
  // exited zero: the run's own report can carry failures (runFailed,
  // conformance) that the exit statuses cannot see. The CLI maps a nonzero
  // status here to its exit code, so a refusal can never read as success.
  const refused = processSucceeded && !finalized.committed;
  return {
    status: refused ? 1 : child.status === 0 ? metrics.status : child.status,
    finalized,
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  if (process.argv.length > 2) {
    throw new Error("canonical capture accepts no filters or file arguments");
  }
  const result = await runCanonicalCapture();
  if (result.status !== 0) process.exitCode = result.status;
}
