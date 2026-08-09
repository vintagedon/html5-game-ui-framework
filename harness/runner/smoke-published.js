/**
 * Script Name : smoke-published.js
 * Description : Smoke-test the reference application through its published URL.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium } from "@playwright/test";

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

const expectedScenarios = Number.parseInt(args["expected-scenarios"] || "7", 10);
if (!Number.isInteger(expectedScenarios) || expectedScenarios < 0) {
  throw new Error(`expected-scenarios must be a nonnegative integer, got ${args["expected-scenarios"]}`);
}

const url = new URL(args.url).href;
const origin = new URL(url).origin;
const resultPath = resolve(args.result);
const consoleErrors = [];
const pageErrors = [];
const requests = [];
const offOriginRequests = [];
const failedResponses = [];
const moduleFailures = [];
const observed = {
  scenarioCount: 0,
  themeControlCount: 0,
  metricsVisible: false,
  metricCardCount: 0,
  metricLabels: [],
  auditorVisible: false,
  auditorViolationCount: 0,
  auditorSummary: "",
  consoleErrors,
  moduleFailures,
  offOriginRequests,
};
const result = {
  version: 1,
  generatedAt: new Date().toISOString(),
  url,
  origin,
  expected: { scenarios: expectedScenarios, themes: 4 },
  observed,
  network: { requests, offOriginRequests, failedResponses, moduleFailures },
  pageErrors,
  assertions: [],
  ok: false,
  error: null,
};

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    consoleErrors.push({
      url: message.location().url || url,
      reason: message.text(),
    });
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.stack || error.message);
    consoleErrors.push({ url, reason: `page error: ${error.message}` });
  });
  page.on("request", (request) => {
    const requestUrl = request.url();
    requests.push({ url: requestUrl, resourceType: request.resourceType() });
    if (new URL(requestUrl).origin !== origin) {
      offOriginRequests.push({ url: requestUrl, reason: request.resourceType() });
    }
  });
  page.on("response", (response) => {
    const responseObservation = {
      url: response.url(),
      status: response.status(),
      reason: `HTTP ${response.status()}`,
      resourceType: response.request().resourceType(),
      contentType: response.headers()["content-type"] || "",
    };
    if (response.status() >= 400) failedResponses.push(responseObservation);
    const moduleFailure = moduleResponseFailure(responseObservation);
    if (moduleFailure) moduleFailures.push(moduleFailure);
  });
  page.on("requestfailed", (request) => {
    const failure = {
      url: request.url(),
      status: null,
      reason: request.failure()?.errorText || "request failed",
      resourceType: request.resourceType(),
    };
    failedResponses.push(failure);
    if (failure.resourceType === "script") moduleFailures.push(failure);
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  Object.assign(
    observed,
    await page.evaluate(() => {
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
        scenarioCount: document.querySelectorAll("[data-scenario]").length,
        themeControlCount: document.querySelectorAll("[data-theme-choice]").length,
        metricsVisible: visible(metrics),
        metricCardCount: document.querySelectorAll("#metrics .metric-card").length,
        metricLabels: [...document.querySelectorAll("#metrics .metric-label")]
          .map((element) => element.textContent.trim()),
        auditorVisible: visible(auditor),
        auditorViolationCount: document.querySelectorAll("#auditor .audit-violations li").length,
        auditorSummary: document.querySelector("#auditor .section-copy")?.textContent.trim() || "",
      };
    }),
  );
} catch (error) {
  result.error = error.stack || error.message;
} finally {
  if (browser) await browser.close();
}

observed.consoleErrors = uniqueBy(consoleErrors, (item) => `${item.url}|${item.reason}`);
observed.moduleFailures = uniqueBy(moduleFailures, (item) => `${item.url}|${item.status}|${item.reason}`);
observed.offOriginRequests = uniqueBy(offOriginRequests, (item) => item.url);
result.network.failedResponses = uniqueBy(
  failedResponses,
  (item) => `${item.url}|${item.status}|${item.reason}`,
);
result.network.moduleFailures = observed.moduleFailures;
result.network.offOriginRequests = observed.offOriginRequests;
result.assertions = buildSmokeAssertions(observed, {
  expectedScenarios,
  expectedThemes: 4,
});
result.ok = !result.error && result.assertions.every(({ pass }) => pass);

mkdirSync(dirname(resultPath), { recursive: true });
writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n");

for (const assertion of result.assertions) {
  console.log(
    `SMOKE ${assertion.pass ? "PASS" : "FAIL"} ${assertion.id}: ${assertion.detail}`,
  );
}
if (result.error) console.error(`SMOKE ERROR: ${result.error}`);
if (!result.ok) {
  console.error(
    `PUBLISHED SMOKE FAILED: ${result.assertions.filter(({ pass }) => !pass).length} assertion(s) failed; report=${resultPath}`,
  );
  process.exitCode = 1;
} else {
  console.log(`PUBLISHED SMOKE OK: ${url}; report=${resultPath}`);
}
