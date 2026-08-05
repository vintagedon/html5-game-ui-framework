/**
 * Script Name : auditor.js
 * Description : Layer-dependency auditor reading declared layer membership from the registry.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Reads the layer a specimen declares and the IDs it depends on from the
 * scenario registry — not from selectors or an import graph. Enforces the
 * charter's one-direction dependency rule (§4.2): a layer may depend only on the
 * layers below it. The load-bearing case is "no module depends on another
 * module", which renders as a visible failure on the reference page rather than
 * only in a test result. Pure and dependency-free, so the browser page and the
 * Node test both import the same function.
 */

import { LAYER_CAN_DEPEND_ON } from "../registry/layers.js";

/**
 * Audit the registry's declared dependencies.
 * @param {{scenarios: any[]}} registry
 * @returns {{violations: string[], checked: number, summary: string}}
 */
export function audit(registry) {
  const scenarios = Array.isArray(registry?.scenarios) ? registry.scenarios : [];
  const byId = new Map(scenarios.map((s) => [s.id, s]));
  const violations = [];

  for (const s of scenarios) {
    const allowed = LAYER_CAN_DEPEND_ON[s.layer] || [];
    for (const dep of s.dependsOn || []) {
      const target = byId.get(dep);
      if (!target) {
        violations.push(`"${s.id}" depends on unknown specimen "${dep}"`);
        continue;
      }
      if (!allowed.includes(target.layer)) {
        violations.push(
          `"${s.id}" (${s.layer}) depends on "${dep}" (${target.layer}); ${s.layer} may depend only on [${allowed.join(", ") || "nothing"}]`,
        );
      }
    }
  }

  const checked = scenarios.length;
  const summary = violations.length
    ? `${violations.length} dependency violation(s) across ${checked} declaration(s).`
    : `Zero violations across ${checked} declaration(s). Every dependency points at a lower layer; no module depends on another module.`;

  return { violations, checked, summary };
}

/**
 * Convert dependency-auditor findings into metrics hard-gate failures.
 * Keeping this formatting beside the auditor makes the failure contract
 * unit-testable without executing the build-time metrics script.
 * @param {{violations?: string[]}} result
 * @returns {string[]}
 */
export function dependencyGateFailures(result) {
  const violations = Array.isArray(result?.violations) ? result.violations : [];
  if (!violations.length) return [];

  return [
    `${violations.length} dependency violation(s):\n  ${violations.join("\n  ")}`,
  ];
}
