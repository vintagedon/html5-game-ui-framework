/**
 * Script Name : smoke-assertions.js
 * Description : Build published-preview smoke assertions for the section walk.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Pure verdict construction keeps the smoke test's acceptance contract under
 * Node unit coverage. The browser collector supplies per-view observations
 * for the landing view and every section view; this module decides which
 * claims pass and formats actionable failure details. Expected values come
 * from the registry walk the caller passes in, never from a fixed list.
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

function sortedList(items) {
  return [...items].sort();
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
 * Build the per-view assertion rows for a completed walk.
 *
 * @param {Array<{view: string, kind: "landing"|"section", scenarioIds: string[], themeControlCount: number, themeSwitched: boolean, consoleErrors: Array, moduleFailures: Array, offOriginRequests: Array, navSectionIds?: string[], sectionCounts?: Record<string, number>, metricsVisible?: boolean, metricCardCount?: number, auditorVisible?: boolean, auditorViolationCount?: number, auditorSummary?: string}>} views
 * @param {{sections: Array<{id: string, scenarioIds: string[]}>, themes: number, scenarioCount: number}} expected
 * @returns {{id: string, label: string, expected: unknown, observed: unknown, pass: boolean, detail: string}[]}
 */
export function buildSmokeAssertions(views, expected) {
  const expectedBySection = new Map(expected.sections.map((s) => [s.id, s.scenarioIds]));
  const assertions = [];

  for (const view of views) {
    const where = view.kind === "landing" ? "landing" : `section ${view.view}`;
    const expectedScenarios = view.kind === "landing"
      ? []
      : sortedList(expectedBySection.get(view.view) || []);

    assertions.push(
      assertion(
        `${view.view}:scenarios-render`,
        `${where} renders exactly the scenarios the registry files under it`,
        expectedScenarios,
        sortedList(view.scenarioIds || []),
        JSON.stringify(sortedList(view.scenarioIds || [])) === JSON.stringify(expectedScenarios),
        `${(view.scenarioIds || []).length} rendered: ${sortedList(view.scenarioIds || []).join(", ") || "none"}`,
      ),
      assertion(
        `${view.view}:theme-controls`,
        `${where} presents the theme toolbar`,
        expected.themes,
        view.themeControlCount,
        view.themeControlCount === expected.themes,
        `${view.themeControlCount} theme control(s)`,
      ),
      assertion(
        `${view.view}:theme-switch`,
        `${where} switches themes in place`,
        true,
        view.themeSwitched,
        view.themeSwitched === true,
        `switched=${view.themeSwitched}`,
      ),
      assertion(
        `${view.view}:console-errors`,
        `${where} console errors are zero`,
        0,
        (view.consoleErrors || []).length,
        (view.consoleErrors || []).length === 0,
        failureDetail(view.consoleErrors || []),
      ),
      assertion(
        `${view.view}:module-load-failures`,
        `${where} module load failures are zero`,
        0,
        (view.moduleFailures || []).length,
        (view.moduleFailures || []).length === 0,
        failureDetail(view.moduleFailures || []),
      ),
      assertion(
        `${view.view}:off-origin-requests`,
        `${where} runtime off-origin requests are zero`,
        0,
        (view.offOriginRequests || []).length,
        (view.offOriginRequests || []).length === 0,
        failureDetail(view.offOriginRequests || []),
      ),
    );

    if (view.kind === "landing") {
      const rosterIds = sortedList(expected.sections.map((s) => s.id));
      const navIds = sortedList(view.navSectionIds || []);
      assertions.push(
        assertion(
          "landing:section-links",
          "Landing view links every roster section",
          rosterIds,
          navIds,
          JSON.stringify(navIds) === JSON.stringify(rosterIds),
          `${navIds.join(", ") || "none"}`,
        ),
        assertion(
          "landing:section-counts",
          "Landing view specimen counts match the registry",
          expected.sections.map((s) => `${s.id}=${s.scenarioIds.length}`).join(" "),
          expected.sections.map((s) => `${s.id}=${(view.sectionCounts || {})[s.id]}`).join(" "),
          expected.sections.every(
            (s) => (view.sectionCounts || {})[s.id] === s.scenarioIds.length,
          ),
          expected.sections
            .map((s) => `${s.id}: observed ${(view.sectionCounts || {})[s.id]}, expected ${s.scenarioIds.length}`)
            .join("; "),
        ),
        assertion(
          "landing:metrics-visible",
          "Metrics block is visible on the landing view",
          true,
          view.metricsVisible,
          view.metricsVisible === true,
          `visible=${view.metricsVisible}`,
        ),
        assertion(
          "landing:metric-cards",
          "Metrics block has cards",
          "greater than 0",
          view.metricCardCount,
          view.metricCardCount > 0,
          `${view.metricCardCount} metric card(s)`,
        ),
        assertion(
          "landing:auditor-visible",
          "Dependency auditor block is visible on the landing view",
          true,
          view.auditorVisible,
          view.auditorVisible === true,
          `visible=${view.auditorVisible}`,
        ),
        assertion(
          "landing:auditor-clean",
          "Dependency auditor reports zero violations",
          0,
          view.auditorViolationCount,
          view.auditorViolationCount === 0,
          view.auditorSummary || `${view.auditorViolationCount} violation(s)`,
        ),
      );
    }
  }

  return assertions;
}
