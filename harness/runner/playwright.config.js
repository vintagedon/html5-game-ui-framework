/**
 * Script Name : playwright.config.js
 * Description : Chromium-only Playwright configuration for the conformance harness.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * ML01 runs Chromium headless only; Firefox and WebKit are unavailable on
 * this host (charter §4.1, spec-02 Execution Environment). Goldens are therefore
 * single-browser, single-platform, consistent with the charter's ruling that
 * cross-browser pixel goldens are out of scope. No project is configured for a
 * browser the host cannot run.
 *
 * Every destination this configuration hands Playwright, the JSON report, and
 * the native test-output directory, lives in one fixed gitignored run-output
 * location inside the repository. There is no caller-configurable output
 * surface to guard: environment keys that would redirect native reporters are
 * validated first, so an override aimed at a curated location fails
 * configuration load, and every other destination override is then deleted
 * from the environment so Playwright's own environment-file precedence can
 * never displace the fixed destinations. The location is initialized by the
 * comparison and canonical-capture entry points, never by loading this
 * configuration, so a worker reusing the configuration cannot clear the run
 * it belongs to.
 */
import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BASELINE_TRANSACTION_PROTOCOL } from "./baseline-reporter.js";
import {
  assertSafePlaywrightArguments,
  assertSafePlaywrightEnvironment,
  PLAYWRIGHT_OUTPUT_ENVIRONMENT_KEYS,
} from "./output-safety.js";
import { curatedRoots, RUN_OUTPUT_ROOT } from "./run-output.js";

const RUNNER_DIR = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BASELINE_REPORTER = fileURLToPath(
  new URL("./baseline-reporter.js", import.meta.url),
);
const PROTECTED_OUTPUT_ROOTS = [
  ...curatedRoots(),
  process.env.GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT,
].filter(Boolean);

assertSafePlaywrightEnvironment(process.env, {
  protectedRoots: PROTECTED_OUTPUT_ROOTS,
  cwd: process.cwd(),
});
assertSafePlaywrightArguments(process.argv.slice(2), {
  protectedRoots: PROTECTED_OUTPUT_ROOTS,
  cwd: process.cwd(),
  allowConfig: true,
});
// A destination override that survived validation aimed outside the curated
// trees is ignored, not honored: Playwright reads these environment keys at
// reporter construction with precedence over the configured output file, so
// deleting them here is what keeps the fixed destinations authoritative for
// every invocation that loads this configuration.
for (const name of PLAYWRIGHT_OUTPUT_ENVIRONMENT_KEYS) {
  delete process.env[name];
}

const canonicalBaselineProtocol =
  process.env.GC_BASELINE_PROTOCOL === BASELINE_TRANSACTION_PROTOCOL;

export default defineConfig({
  testDir: RUNNER_DIR,
  testMatch: /(?:runner|published-meter-consumption)\.spec\.js$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  outputDir: join(RUN_OUTPUT_ROOT, "test-output"),
  reporter: [
    ["list"],
    ["json", { outputFile: join(RUN_OUTPUT_ROOT, "playwright-results.json") }],
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
  // the same paths it uses under the nginx preview. The server answers an
  // absent generated metrics artifact with an explicit not-generated payload
  // so a fresh clone renders that state instead of failing the request.
  webServer: {
    command: `node ${fileURLToPath(new URL("./reference-server.js", import.meta.url))} 8123`,
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
