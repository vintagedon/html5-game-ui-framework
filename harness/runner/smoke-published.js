/**
 * Script Name : smoke-published.js
 * Description : Smoke-test the published reference application through its views.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Walks the registry: the landing view plus every section view on the roster.
 * Each view must render exactly the scenarios the registry files under it,
 * present a working theme toolbar, and stay clean of console errors, module
 * load failures, and runtime off-origin requests. The landing view
 * additionally carries the section index with registry-derived counts, the
 * computed metrics block, and the dependency auditor at zero violations.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium } from "@playwright/test";

import { registry } from "../registry/scenarios.js";
import {
  buildSmokeAssertions,
  moduleResponseFailure,
} from "./smoke-assertions.js";

function argumentsByName(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!name?.startsWith("--") || argv[index + 1] == null) {
      throw new Error(`invalid argument at ${name || "<end>"}`);
    }
    values[name.slice(2)] = argv[index + 1];
  }
  return values;
}

function uniqueBy(items, key) {
  return [...new Map(items.map((item) => [key(item), item])).values()];
}

const args = argumentsByName(process.argv.slice(2));
if (!args.url || !args.result) {
  throw new Error(
    "usage: smoke-published.js --url URL --result FILE [--expected-scenarios N]",
  );
}

// Optional cross-check: when a count is supplied it must agree with the
// registry the walk is about to perform.
const expectedSections = registry.sections.map((section) => ({
  id: section.id,
  scenarioIds: registry.scenarios
    .filter((s) => s.section === section.id)
    .map((s) => s.id),
}));
const expected = {
  sections: expectedSections,
  themes: registry.themes.length,
  scenarioCount: registry.scenarios.length,
};

if (args["expected-scenarios"] != null) {
  const expectedScenarios = Number.parseInt(args["expected-scenarios"], 10);
  if (!Number.isInteger(expectedScenarios) || expectedScenarios < 0) {
    throw new Error(`expected-scenarios must be a nonnegative integer, got ${args["expected-scenarios"]}`);
  }
  if (expectedScenarios !== expected.scenarioCount) {
    throw new Error(
      `expected-scenarios cross-check failed: ${expectedScenarios} supplied, registry declares ${expected.scenarioCount}`,
    );
  }
}

const url = new URL(args.url).href;
const origin = new URL(url).origin;
const resultPath = resolve(args.result);

const views = [
  { view: "landing", kind: "landing", hash: "#/" },
  ...expectedSections.map((section) => ({
    view: section.id,
    kind: "section",
    hash: `#/${section.id}`,
  })),
];

const pageErrors = [];
const network = { requests: [], offOriginRequests: [], failedResponses: [], moduleFailures: [] };
const collectedViews = [];

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  for (const view of views) {
    const consoleErrors = [];
    const offOriginRequests = [];
    const moduleFailures = [];

    const offConsole = (message) => {
      if (message.type() !== "error") return;
      consoleErrors.push({
        url: message.location().url || url,
        reason: message.text(),
      });
    };
    const offPageError = (error) => {
      pageErrors.push(error.stack || error.message);
      consoleErrors.push({ url, reason: `page error: ${error.message}` });
    };
    const offRequest = (request) => {
      const requestUrl = request.url();
      network.requests.push({ url: requestUrl, resourceType: request.resourceType(), view: view.view });
      if (new URL(requestUrl).origin !== origin) {
        offOriginRequests.push({ url: requestUrl, reason: request.resourceType() });
      }
    };
    const offResponse = (response) => {
      const responseObservation = {
        url: response.url(),
        status: response.status(),
        reason: `HTTP ${response.status()}`,
        resourceType: response.request().resourceType(),
        contentType: response.headers()["content-type"] || "",
      };
      if (response.status() >= 400) network.failedResponses.push({ ...responseObservation, view: view.view });
      const moduleFailure = moduleResponseFailure(responseObservation);
      if (moduleFailure) moduleFailures.push(moduleFailure);
    };
    const offRequestFailed = (request) => {
      const failure = {
        url: request.url(),
        status: null,
        reason: request.failure()?.errorText || "request failed",
        resourceType: request.resourceType(),
      };
      network.failedResponses.push({ ...failure, view: view.view });
      if (failure.resourceType === "script") moduleFailures.push(failure);
    };

    page.on("console", offConsole);
    page.on("pageerror", offPageError);
    page.on("request", offRequest);
    page.on("response", offResponse);
    page.on("requestfailed", offRequestFailed);

    await page.goto(`${url}${view.hash}`, { waitUntil: "networkidle", timeout: 30_000 });

    const observed = await page.evaluate(() => {
      const visible = (element) => {
        if (!element || element.hidden) return false;
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          bounds.width > 0 &&
          bounds.height > 0
        );
      };
      const metrics = document.querySelector("#metrics");
      const auditor = document.querySelector("#auditor");
      return {
        scenarioIds: [...document.querySelectorAll("#scenarios [data-scenario]")].map(
          (element) => element.dataset.scenario,
        ),
        themeControlCount: document.querySelectorAll("[data-theme-choice]").length,
        navSectionIds: [...document.querySelectorAll("#reference-nav [data-nav-section]")].map(
          (element) => element.dataset.navSection,
        ),
        sectionCounts: Object.fromEntries(
          [...document.querySelectorAll("[data-section-count]")].map((element) => [
            element.dataset.sectionCount,
            Number(element.textContent.match(/\d+/)?.[0] ?? -1),
          ]),
        ),
        metricsVisible: visible(metrics),
        metricCardCount: document.querySelectorAll("#metrics .metric-card").length,
        auditorVisible: visible(auditor),
        auditorViolationCount: document.querySelectorAll("#auditor .audit-violations li").length,
        auditorSummary: document.querySelector("#auditor .section-copy")?.textContent.trim() || "",
      };
    });

    // The theme toolbar must switch themes in place on every view.
    const themeBefore = await page.evaluate(() => document.documentElement.dataset.gcTheme);
    const themeTarget = registry.themes.find((theme) => theme !== themeBefore) ?? registry.themes[0];
    await page.locator(`[data-theme-choice="${themeTarget}"]`).click();
    const themeAfter = await page.evaluate(() => document.documentElement.dataset.gcTheme);
    observed.themeSwitched = themeAfter === themeTarget;

    page.off("console", offConsole);
    page.off("pageerror", offPageError);
    page.off("request", offRequest);
    page.off("response", offResponse);
    page.off("requestfailed", offRequestFailed);

    collectedViews.push({
      view: view.view,
      kind: view.kind,
      scenarioIds: observed.scenarioIds,
      themeControlCount: observed.themeControlCount,
      themeSwitched: observed.themeSwitched,
      consoleErrors: uniqueBy(consoleErrors, (item) => `${item.url}|${item.reason}`),
      moduleFailures: uniqueBy(moduleFailures, (item) => `${item.url}|${item.status}|${item.reason}`),
      offOriginRequests: uniqueBy(offOriginRequests, (item) => item.url),
      navSectionIds: observed.navSectionIds,
      sectionCounts: observed.sectionCounts,
      metricsVisible: observed.metricsVisible,
      metricCardCount: observed.metricCardCount,
      auditorVisible: observed.auditorVisible,
      auditorViolationCount: observed.auditorViolationCount,
      auditorSummary: observed.auditorSummary,
    });
  }
} catch (error) {
  pageErrors.push(error.stack || error.message);
} finally {
  if (browser) await browser.close();
}

const assertions = buildSmokeAssertions(collectedViews, expected);
const ok = pageErrors.length === 0 && assertions.every(({ pass }) => pass);

const result = {
  version: 2,
  generatedAt: new Date().toISOString(),
  url,
  origin,
  expected,
  views: collectedViews,
  network: {
    ...network,
    moduleFailures: uniqueBy(network.moduleFailures, (item) => `${item.url}|${item.status}|${item.reason}`),
    offOriginRequests: uniqueBy(network.offOriginRequests, (item) => item.url),
  },
  pageErrors,
  assertions,
  ok,
};

mkdirSync(dirname(resultPath), { recursive: true });
writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n");

for (const assertion of assertions) {
  console.log(
    `SMOKE ${assertion.pass ? "PASS" : "FAIL"} ${assertion.id}: ${assertion.detail}`,
  );
}
if (pageErrors.length) console.error(`SMOKE ERROR: ${pageErrors.join("\n")}`);
if (!ok) {
  console.error(
    `PUBLISHED SMOKE FAILED: ${assertions.filter(({ pass }) => !pass).length} assertion(s) failed; report=${resultPath}`,
  );
  process.exitCode = 1;
} else {
  console.log(`PUBLISHED SMOKE OK: ${url}; report=${resultPath}`);
}
