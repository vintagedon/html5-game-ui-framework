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

export default defineConfig({
  testDir: "./harness/runner",
  testMatch: /.*\.spec\.js$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  snapshotPathTemplate: "",
  expect: { toHaveScreenshot: { animations: "disabled" } },

  // The reference application is a static page. A local file server serves the
  // repository root so the page resolves ../src/gc.css and ../harness/* with
  // the same paths it uses under the nginx preview.
  webServer: {
    command: "python3 -m http.server 8123 --bind 127.0.0.1",
    url: "http://127.0.0.1:8123/reference/",
    cwd: process.cwd(),
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
