/**
 * Script Name : smoke-assertions.test.js
 * Description : Assert published-preview smoke-test verdicts and diagnostics.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSmokeAssertions,
  moduleResponseFailure,
} from "../runner/smoke-assertions.js";

function passingObservation() {
  return {
    scenarioCount: 7,
    themeControlCount: 4,
    metricsVisible: true,
    metricCardCount: 21,
    auditorVisible: true,
    auditorViolationCount: 0,
    consoleErrors: [],
    moduleFailures: [],
    offOriginRequests: [],
  };
}

test("a complete published page passes every assertion separately", () => {
  const assertions = buildSmokeAssertions(passingObservation(), {
    expectedScenarios: 7,
    expectedThemes: 4,
  });

  assert.deepEqual(
    assertions.map(({ id }) => id),
    [
      "scenarios-render",
      "theme-controls",
      "metrics-visible",
      "metric-cards",
      "auditor-visible",
      "auditor-clean",
      "console-errors",
      "module-load-failures",
      "off-origin-requests",
    ],
  );
  assert.ok(assertions.every(({ pass }) => pass));
});

test("a missing required module is named in its failed assertion", () => {
  const observed = passingObservation();
  observed.scenarioCount = 0;
  observed.themeControlCount = 0;
  observed.auditorVisible = false;
  observed.moduleFailures = [
    {
      url: "https://gameui.donfather.site/harness/registry/scenarios.js",
      status: 404,
      reason: "HTTP 404",
    },
  ];

  const assertions = buildSmokeAssertions(observed, {
    expectedScenarios: 7,
    expectedThemes: 4,
  });
  const failure = assertions.find(({ id }) => id === "module-load-failures");

  assert.equal(failure.pass, false);
  assert.match(failure.detail, /harness\/registry\/scenarios\.js/);
  assert.match(failure.detail, /404/);
});

test("an HTML response to a module request is a named load failure", () => {
  const failure = moduleResponseFailure({
    url: "https://gameui.donfather.site/harness/registry/scenarios.js",
    status: 200,
    resourceType: "script",
    contentType: "text/html; charset=utf-8",
  });

  assert.equal(failure.url.endsWith("/harness/registry/scenarios.js"), true);
  assert.equal(failure.status, 200);
  assert.match(failure.reason, /text\/html/);
});

test("a successful JavaScript module response is not a load failure", () => {
  assert.equal(
    moduleResponseFailure({
      url: "https://gameui.donfather.site/harness/registry/scenarios.js",
      status: 200,
      resourceType: "script",
      contentType: "text/javascript; charset=utf-8",
    }),
    null,
  );
});
