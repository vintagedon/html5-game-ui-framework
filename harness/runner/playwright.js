/**
 * Script Name : playwright.js
 * Description : Run filtered comparisons with protected output routing.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-01
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Ordinary comparison filters remain available. The config and reporter chain
 * stay fixed, while output paths are validated before Playwright can clear a
 * directory or construct a built-in reporter.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  assertSafePlaywrightArguments,
  assertSafePlaywrightEnvironment,
} from "./output-safety.js";
import { curatedRoots } from "./run-output.js";

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
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [PLAYWRIGHT_CLI, "test", "--config", PLAYWRIGHT_CONFIG, ...args],
      { cwd: REPO_ROOT, env: process.env, stdio: "inherit" },
    );
    child.once("error", reject);
    child.once("close", (status) => resolve(status ?? 1));
  });
}

const status = await runComparison();
if (status !== 0) process.exitCode = status;
