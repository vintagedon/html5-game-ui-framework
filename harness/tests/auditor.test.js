/**
 * Script Name : auditor.test.js
 * Description : Assert layer dependency violations and their hard-gate output.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import assert from "node:assert/strict";
import test from "node:test";

import * as auditor from "../auditor/auditor.js";
import { registry } from "../registry/scenarios.js";

function moduleViolationRegistry() {
  return {
    scenarios: [
      { id: "module-a", layer: "modules", dependsOn: ["module-b"] },
      { id: "module-b", layer: "modules", dependsOn: [] },
    ],
  };
}

test("a module-to-module dependency is named by the auditor", () => {
  const result = auditor.audit(moduleViolationRegistry());

  assert.equal(result.violations.length, 1);
  assert.equal(
    result.violations[0],
    '"module-a" (modules) depends on "module-b" (modules); modules may depend only on [foundations, core]',
  );
});

test("dependency violations become hard-gate failures", () => {
  assert.equal(typeof auditor.dependencyGateFailures, "function");
  const failures = auditor.dependencyGateFailures(
    auditor.audit(moduleViolationRegistry()),
  );

  assert.equal(failures.length, 1);
  assert.match(failures[0], /1 dependency violation/);
  assert.match(failures[0], /module-a.*modules.*module-b.*modules/);
});

test("the real registry has zero dependency violations", () => {
  const result = auditor.audit(registry);

  assert.equal(result.violations.length, 0);
  assert.match(result.summary, /^Zero violations/);
});
