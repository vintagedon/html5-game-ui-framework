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
 */
import { defineConfig, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BASELINE_TRANSACTION_PROTOCOL } from "./baseline-reporter.js";
import {
  assertSafePlaywrightArguments,
  assertSafePlaywrightEnvironment,
  targetTouchesProtected,
} from "./output-safety.js";

const RUNNER_DIR = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BASELINE_REPORTER = fileURLToPath(
  new URL("./baseline-reporter.js", import.meta.url),
);
const GOLDENS_ROOT = fileURLToPath(new URL("../goldens/", import.meta.url));
const DEFAULT_JSON_REPORT = join(
    REPO_ROOT,
    "..",
    "work-logs/evidence/2026-08-05-h5gameui-03/gate-3.3-playwright-results.json",
  );
const PROTECTED_OUTPUT_ROOTS = [
  GOLDENS_ROOT,
  process.env.GC_ADDITIONAL_PROTECTED_OUTPUT_ROOT,
].filter(Boolean);

export function safeJsonReportPath(
  requested,
  { approvedRoot, fallback = DEFAULT_JSON_REPORT } = {},
) {
  const protectedRoots = approvedRoot ? [approvedRoot] : PROTECTED_OUTPUT_ROOTS;
  const fallbackPath = resolve(process.cwd(), fallback);
  if (targetTouchesProtected(fallbackPath, { protectedRoots })) {
    throw new Error(
      `Configured Playwright JSON fallback is not a safe output path: ${fallbackPath}`,
    );
  }
  if (!requested) return fallbackPath;
  const requestedPath = resolve(process.cwd(), requested);
  return targetTouchesProtected(requestedPath, { protectedRoots })
    ? fallbackPath
    : requestedPath;
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
const JSON_REPORT = safeJsonReportPath(process.env.GC_PLAYWRIGHT_JSON);
mkdirSync(dirname(JSON_REPORT), { recursive: true });
const canonicalBaselineProtocol =
  process.env.GC_BASELINE_PROTOCOL === BASELINE_TRANSACTION_PROTOCOL;

export default defineConfig({
  testDir: RUNNER_DIR,
  testMatch: /(?:runner|published-meter-consumption)\.spec\.js$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
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
