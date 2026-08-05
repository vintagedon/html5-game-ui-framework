/**
 * Script Name : runner.test.js
 * Description : Assert registry-driven case identity and checkpoint resolution.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import assert from "node:assert/strict";
import test from "node:test";

import { registry } from "../registry/scenarios.js";

async function runnerCases() {
  try {
    return await import("../runner/cases.js");
  } catch {
    assert.fail("runner case helpers must exist as a pure module");
  }
}

test("the case matrix is scenario by theme by viewport by checkpoint", async () => {
  const { buildCases } = await runnerCases();
  const fixture = {
    scenarios: [
      {
        id: "fixture",
        themes: ["modern", "arcade"],
        viewports: [
          { name: "desktop", width: 1280, height: 800 },
          { name: "compact", width: 800, height: 600 },
        ],
        checkpoints: [
          { name: "resting", after: [] },
          { name: "focused", after: ["focus"] },
        ],
        interactions: [{ name: "focus", action: "focus", target: "button" }],
      },
    ],
  };

  const cases = buildCases(fixture);
  assert.equal(cases.length, 8);
  assert.deepEqual(
    new Set(cases.map((entry) => entry.viewport.name)),
    new Set(["desktop", "compact"]),
  );
});

test("the real registry produces 53 viewport-qualified cases", async () => {
  const { buildCases, captureIdentity } = await runnerCases();
  const cases = buildCases(registry);

  assert.equal(cases.length, 53);
  assert.equal(
    captureIdentity(cases[0]),
    "foundations-palette/modern/desktop/resting.png",
  );
  assert.ok(cases.every((entry) => entry.viewport.width === 1280));
  assert.ok(cases.every((entry) => entry.viewport.height === 800));
});

test("the viewport roster remains one entry per scenario", () => {
  assert.equal(registry.scenarios.length, 7);
  for (const scenario of registry.scenarios) {
    assert.equal(scenario.viewports.length, 1, scenario.id);
  }
});

test("a checkpoint referencing a missing interaction throws", async () => {
  const { resolveCheckpointInteractions } = await runnerCases();
  const scenario = {
    id: "missing-interaction",
    interactions: [{ name: "present", action: "noop" }],
  };
  const checkpoint = { name: "broken", after: ["absent"] };

  assert.throws(
    () => resolveCheckpointInteractions(scenario, checkpoint),
    /scenario "missing-interaction" checkpoint "broken" references missing interaction "absent"/,
  );
});
