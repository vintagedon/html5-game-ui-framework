/**
 * Script Name : smoke-assertions.test.js
 * Description : Assert published-preview smoke verdicts and diagnostics.
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

const EXPECTED = {
  sections: [
    { id: "foundations", scenarioIds: ["foundations-palette", "foundations-semantic"] },
    { id: "core", scenarioIds: ["core-panel"] },
  ],
  themes: 4,
  scenarioCount: 3,
};

function landingView(overrides = {}) {
  return {
    view: "landing",
    kind: "landing",
    scenarioIds: [],
    themeControlCount: 4,
    themeSwitched: true,
    consoleErrors: [],
    moduleFailures: [],
    offOriginRequests: [],
    navSectionIds: ["foundations", "core"],
    sectionCounts: { foundations: 2, core: 1 },
    metricsVisible: true,
    metricCardCount: 22,
    auditorVisible: true,
    auditorViolationCount: 0,
    auditorSummary: "Zero violations.",
    ...overrides,
  };
}

function sectionView(id, overrides = {}) {
  return {
    view: id,
    kind: "section",
    scenarioIds: EXPECTED.sections.find((s) => s.id === id).scenarioIds,
    themeControlCount: 4,
    themeSwitched: true,
    consoleErrors: [],
    moduleFailures: [],
    offOriginRequests: [],
    ...overrides,
  };
}

test("a complete walk passes every assertion separately", () => {
  const assertions = buildSmokeAssertions(
    [landingView(), sectionView("foundations"), sectionView("core")],
    EXPECTED,
  );

  assert.deepEqual(
    assertions.map(({ id }) => id),
    [
      "landing:scenarios-render",
      "landing:theme-controls",
      "landing:theme-switch",
      "landing:console-errors",
      "landing:module-load-failures",
      "landing:off-origin-requests",
      "landing:section-links",
      "landing:section-counts",
      "landing:metrics-visible",
      "landing:metric-cards",
      "landing:auditor-visible",
      "landing:auditor-clean",
      "foundations:scenarios-render",
      "foundations:theme-controls",
      "foundations:theme-switch",
      "foundations:console-errors",
      "foundations:module-load-failures",
      "foundations:off-origin-requests",
      "core:scenarios-render",
      "core:theme-controls",
      "core:theme-switch",
      "core:console-errors",
      "core:module-load-failures",
      "core:off-origin-requests",
    ],
  );
  assert.ok(assertions.every(({ pass }) => pass));
});

test("a section view rendering the wrong scenario set fails by name", () => {
  const assertions = buildSmokeAssertions(
    [sectionView("core", { scenarioIds: ["core-panel", "stray-scenario"] })],
    EXPECTED,
  );
  const failure = assertions.find(({ id }) => id === "core:scenarios-render");

  assert.equal(failure.pass, false);
  assert.match(failure.detail, /stray-scenario/);
});

test("the landing view must render no scenario sections", () => {
  const assertions = buildSmokeAssertions(
    [landingView({ scenarioIds: ["core-panel"] })],
    EXPECTED,
  );
  const failure = assertions.find(({ id }) => id === "landing:scenarios-render");

  assert.equal(failure.pass, false);
});

test("a landing count that disagrees with the registry fails by section", () => {
  const assertions = buildSmokeAssertions(
    [landingView({ sectionCounts: { foundations: 2, core: 9 } })],
    EXPECTED,
  );
  const failure = assertions.find(({ id }) => id === "landing:section-counts");

  assert.equal(failure.pass, false);
  assert.match(failure.detail, /core: observed 9, expected 1/);
});

test("a theme toolbar that cannot switch fails on that view", () => {
  const assertions = buildSmokeAssertions(
    [sectionView("foundations", { themeSwitched: false })],
    EXPECTED,
  );
  const failure = assertions.find(({ id }) => id === "foundations:theme-switch");

  assert.equal(failure.pass, false);
});

test("a missing required module is named in its failed assertion", () => {
  const moduleFailures = [
    {
      url: "https://gameui.donfather.site/harness/registry/scenarios.js",
      status: 404,
      reason: "HTTP 404",
    },
  ];
  const assertions = buildSmokeAssertions(
    [sectionView("core", { moduleFailures })],
    EXPECTED,
  );
  const failure = assertions.find(({ id }) => id === "core:module-load-failures");

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
