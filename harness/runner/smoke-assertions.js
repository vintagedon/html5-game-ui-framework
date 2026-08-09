/**
 * Script Name : smoke-assertions.js
 * Description : Build separate published-preview smoke-test assertions.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Pure verdict construction keeps the smoke test's acceptance contract under
 * Node unit coverage. The browser collector supplies observations, while this
 * module decides which claims pass and formats actionable failure details.
 */

function assertion(id, label, expected, observed, pass, detail) {
  return { id, label, expected, observed, pass, detail };
}

function failureDetail(items) {
  if (!items.length) return "none";
  return items
    .map((item) => {
      if (typeof item === "string") return item;
      const status = item.status == null ? "" : ` HTTP ${item.status}`;
      const reason = item.reason ? ` (${item.reason})` : "";
      return `${item.url || "unknown URL"}${status}${reason}`;
    })
    .join("; ");
}

/**
 * Classify an HTTP response to a browser module request. nginx can answer a
 * missing path with an HTML fallback and status 200, so status alone cannot
 * prove that a module loaded.
 * @param {{url: string, status: number, resourceType: string, contentType?: string}} response
 * @returns {{url: string, status: number, reason: string, resourceType: string}|null}
 */
export function moduleResponseFailure(response) {
  if (response.resourceType !== "script") return null;

  const contentType = response.contentType || "missing content type";
  const statusPass = response.status >= 200 && response.status < 400;
  const typePass = /(?:java|ecma)script|application\/wasm/i.test(contentType);
  if (statusPass && typePass) return null;

  return {
    url: response.url,
    status: response.status,
    reason: statusPass
      ? `module response has ${contentType}`
      : `HTTP ${response.status}`,
    resourceType: response.resourceType,
  };
}

/**
 * Build one result row for every published-preview acceptance assertion.
 * @param {object} observed
 * @param {{expectedScenarios: number, expectedThemes: number}} expected
 * @returns {{id: string, label: string, expected: unknown, observed: unknown, pass: boolean, detail: string}[]}
 */
export function buildSmokeAssertions(observed, expected) {
  const consoleErrors = observed.consoleErrors || [];
  const moduleFailures = observed.moduleFailures || [];
  const offOriginRequests = observed.offOriginRequests || [];

  return [
    assertion(
      "scenarios-render",
      "Seven scenarios render",
      expected.expectedScenarios,
      observed.scenarioCount,
      observed.scenarioCount === expected.expectedScenarios,
      `${observed.scenarioCount} rendered scenario(s)`,
    ),
    assertion(
      "theme-controls",
      "Four theme controls are present",
      expected.expectedThemes,
      observed.themeControlCount,
      observed.themeControlCount === expected.expectedThemes,
      `${observed.themeControlCount} theme control(s)`,
    ),
    assertion(
      "metrics-visible",
      "Metrics block is visible",
      true,
      observed.metricsVisible,
      observed.metricsVisible === true,
      `visible=${observed.metricsVisible}`,
    ),
    assertion(
      "metric-cards",
      "Metrics block has cards",
      "greater than 0",
      observed.metricCardCount,
      observed.metricCardCount > 0,
      `${observed.metricCardCount} metric card(s)`,
    ),
    assertion(
      "auditor-visible",
      "Dependency auditor block is visible",
      true,
      observed.auditorVisible,
      observed.auditorVisible === true,
      `visible=${observed.auditorVisible}`,
    ),
    assertion(
      "auditor-clean",
      "Dependency auditor reports zero violations",
      0,
      observed.auditorViolationCount,
      observed.auditorViolationCount === 0,
      observed.auditorSummary || `${observed.auditorViolationCount} violation(s)`,
    ),
    assertion(
      "console-errors",
      "Console errors are zero",
      0,
      consoleErrors.length,
      consoleErrors.length === 0,
      failureDetail(consoleErrors),
    ),
    assertion(
      "module-load-failures",
      "Module load failures are zero",
      0,
      moduleFailures.length,
      moduleFailures.length === 0,
      failureDetail(moduleFailures),
    ),
    assertion(
      "off-origin-requests",
      "Runtime off-origin requests are zero",
      0,
      offOriginRequests.length,
      offOriginRequests.length === 0,
      failureDetail(offOriginRequests),
    ),
  ];
}
