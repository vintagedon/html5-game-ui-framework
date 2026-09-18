/**
 * Script Name : playwright.js
 * Description : Run filtered comparisons against the fixed run-output contract.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-01
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Ordinary comparison filters remain available. The config and reporter chain
 * stay fixed, destructive output routing is rejected before Playwright can
 * clear a directory, native destination overrides never reach the child, and
 * the fixed run-output location is initialized here so a fresh invocation
 * cannot read a previous one's results. Concurrent invocations are
 * unsupported: each initialization wipes the location.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  assertSafePlaywrightArguments,
  assertSafePlaywrightEnvironment,
  stripPlaywrightOutputEnvironment,
} from "./output-safety.js";
import { curatedRoots, initializeRunOutput, stripObsoleteRunOutputEnvironment } from "./run-output.js";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PLAYWRIGHT_CLI = fileURLToPath(
  new URL("../../node_modules/@playwright/test/cli.js", import.meta.url),
);
const PLAYWRIGHT_CONFIG = fileURLToPath(new URL("./playwright.config.js", import.meta.url));

function protectedRoots(environment) {
  return [
    ...curatedRoots(),
    environment.GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT,
  ].filter(Boolean);
}

export async function runComparison(args = process.argv.slice(2)) {
  const roots = protectedRoots(process.env);
  assertSafePlaywrightEnvironment(process.env, {
    protectedRoots: roots,
    cwd: REPO_ROOT,
  });
  assertSafePlaywrightArguments(args, {
    protectedRoots: roots,
    cwd: REPO_ROOT,
  });
  // Curated-aimed overrides were rejected above; every surviving destination
  // override and key from the removed configuration surface is deleted so
  // the child sees only the fixed destinations.
  const environment = stripObsoleteRunOutputEnvironment(
    stripPlaywrightOutputEnvironment(process.env),
  );
  const { runDirectory } = initializeRunOutput();
  console.log(`goldens: run output directory ${runDirectory}`);
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [PLAYWRIGHT_CLI, "test", "--config", PLAYWRIGHT_CONFIG, ...args],
      { cwd: REPO_ROOT, env: environment, stdio: "inherit" },
    );
    child.once("error", reject);
    child.once("close", (status) => resolve(status ?? 1));
  });
}

const status = await runComparison();
if (status !== 0) process.exitCode = status;
