/**
 * Script Name : playwright.config.js
 * Description : Chromium-only Playwright configuration for the conformance harness.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * ML01 runs Chromium headless only; Firefox and WebKit are unavailable on this
 * host (charter §4.1, spec-02 Execution Environment). Goldens are therefore
 * single-browser, single-platform, consistent with the charter's ruling that
 * cross-browser pixel goldens are out of scope. No project is configured for a
 * browser the host cannot run.
 *
 * Every destination this configuration hands Playwright, the JSON report, and
 * the native test-output directory, lives in one fresh run-owned directory
 * created at import time beneath a validated parent. GC_PLAYWRIGHT_JSON
 * selects that parent; it is never an exact output file, because a
 * caller-named existing file can alias curated bytes through a hardlink no
 * ancestor check can see. An unsafe parent fails configuration load before
 * any write.
 */
import { defineConfig, devices } from "@playwright/test";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BASELINE_TRANSACTION_PROTOCOL } from "./baseline-reporter.js";
import {
  assertSafePlaywrightArguments,
  assertSafePlaywrightEnvironment,
} from "./output-safety.js";
import {
  curatedRoots,
  DEFAULT_RUN_PARENT,
  provisionRunDirectory,
  RUN_OUTPUT_ENVIRONMENT_KEY,
} from "./run-output.js";

const RUNNER_DIR = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BASELINE_REPORTER = fileURLToPath(
  new URL("./baseline-reporter.js", import.meta.url),
);
const CURATED_ROOTS = curatedRoots();
const PROTECTED_OUTPUT_ROOTS = [
  ...CURATED_ROOTS,
  process.env.GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT,
].filter(Boolean);

/**
 * Resolve this run's output parent, provision a fresh run directory beneath
 * it, and report the resolved location. The parent is GC_PLAYWRIGHT_JSON when
 * the caller selected one, otherwise the gitignored scratch parent inside the
 * repository. Validation failures throw before any directory is created.
 *
 * @param {{environment?: object, cwd?: string}} [options]
 * @returns {{runDirectory: string, jsonReport: string}}
 */
export function resolveRunOutput({
  environment = process.env,
  cwd = REPO_ROOT,
} = {}) {
  const runDirectory = provisionRunDirectory({
    parent: environment.GC_PLAYWRIGHT_JSON || DEFAULT_RUN_PARENT,
    curatedRoots: CURATED_ROOTS,
    additionalRoots: environment.GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT
      ? [environment.GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT]
      : [],
    cwd,
  });
  const jsonReport = join(runDirectory, "playwright-results.json");
  console.log(`goldens: run output directory ${runDirectory}`);
  return { runDirectory, jsonReport };
}

assertSafePlaywrightEnvironment(process.env, {
  protectedRoots: PROTECTED_OUTPUT_ROOTS,
  cwd: process.cwd(),
});
assertSafePlaywrightArguments(process.argv.slice(2), {
  protectedRoots: PROTECTED_OUTPUT_ROOTS,
  cwd: process.cwd(),
  allowConfig: true,
});
const RUN_OUTPUT = resolveRunOutput();
// Worker processes inherit the main-process environment after the config
// loads, so the runner spec writes its candidates, state, and reports into
// the same freshly provisioned directory the reporters use.
process.env[RUN_OUTPUT_ENVIRONMENT_KEY] = RUN_OUTPUT.runDirectory;
const JSON_REPORT = RUN_OUTPUT.jsonReport;
const canonicalBaselineProtocol =
  process.env.GC_BASELINE_PROTOCOL === BASELINE_TRANSACTION_PROTOCOL;

export default defineConfig({
  testDir: RUNNER_DIR,
  testMatch: /(?:runner|published-meter-consumption)\.spec\.js$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  outputDir: join(RUN_OUTPUT.runDirectory, "test-output"),
  reporter: [
    ["list"],
    ["json", { outputFile: JSON_REPORT }],
    [
      BASELINE_REPORTER,
      {
        transactionFd: canonicalBaselineProtocol ? 3 : undefined,
        protocol: canonicalBaselineProtocol
          ? BASELINE_TRANSACTION_PROTOCOL
          : undefined,
        authorization: canonicalBaselineProtocol
          ? process.env.GC_BASELINE_AUTHORIZATION
          : undefined,
      },
    ],
  ],
  snapshotPathTemplate: "",
  expect: { toHaveScreenshot: { animations: "disabled" } },

  // The reference application is a static page. A local file server serves the
  // repository root so the page resolves ../src/gc.css and ../harness/* with
  // the same paths it uses under the nginx preview.
  webServer: {
    command: "python3 -m http.server 8123 --bind 127.0.0.1",
    url: "http://127.0.0.1:8123/reference/",
    cwd: REPO_ROOT,
    reuseExistingServer: true,
    timeout: 30_000,
  },

  use: {
    baseURL: "http://127.0.0.1:8123",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  // Single Chromium project. This host cannot run Firefox or WebKit, so none is
  // declared; claiming cross-browser coverage would be false.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: undefined },
    },
  ],
});
