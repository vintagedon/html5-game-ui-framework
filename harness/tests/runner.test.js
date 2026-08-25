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

test("the real registry produces the full viewport-qualified case matrix", async () => {
  const { buildCases, captureIdentity } = await runnerCases();
  const cases = buildCases(registry);
  // Hand-computed expansion: scenario count x themes x viewports x checkpoints.
  // Desktop-only: palette 1 theme, semantic 4, panel 4, button 16, input 16,
  // spike 4 (45). Status family on desktop plus compact (8 cp-sets of 4
  // themes each): core-meter 2x4x2=16, segmented 4x4x2=32, pips 4x4x2=32,
  // vertical 2x4x2=16, damage 3x4x2=24 (120).
  const expected = 45 + 16 + 32 + 32 + 16 + 24;
  assert.equal(cases.length, expected);

  assert.equal(
    captureIdentity(cases[0]),
    "foundations-palette/modern/desktop/resting.png",
  );
});

test("the viewport roster stays desktop-only off the family and desktop plus compact on it", () => {
  assert.equal(registry.scenarios.length, 11);
  for (const scenario of registry.scenarios) {
    const names = scenario.viewports.map((v) => v.name);
    const family =
      scenario.id === "core-meter" || scenario.id.startsWith("core-meter-");
    if (family) {
      assert.deepEqual(names, ["desktop", "compact"], scenario.id);
      const compact = scenario.viewports.find((v) => v.name === "compact");
      assert.deepEqual(
        [compact.width, compact.height],
        [480, 900],
        scenario.id,
      );
    } else {
      assert.deepEqual(names, ["desktop"], scenario.id);
    }
  }
});

// Recorded before the compact viewport existed (work-logs/evidence/
// 2026-08-25-h5gameui-04/gate-4.0.2-matrix-pre-refactor.json). Every identity
// must keep appearing unchanged so established baselines survive roster edits.
const PRE_COMPACT_IDENTITIES = [
  "core-button/arcade/desktop/focus.png",
  "core-button/arcade/desktop/hover.png",
  "core-button/arcade/desktop/resting.png",
  "core-button/arcade/desktop/selected.png",
  "core-button/fantasy/desktop/focus.png",
  "core-button/fantasy/desktop/hover.png",
  "core-button/fantasy/desktop/resting.png",
  "core-button/fantasy/desktop/selected.png",
  "core-button/modern/desktop/focus.png",
  "core-button/modern/desktop/hover.png",
  "core-button/modern/desktop/resting.png",
  "core-button/modern/desktop/selected.png",
  "core-button/sci-fi/desktop/focus.png",
  "core-button/sci-fi/desktop/hover.png",
  "core-button/sci-fi/desktop/resting.png",
  "core-button/sci-fi/desktop/selected.png",
  "core-input/arcade/desktop/focused.png",
  "core-input/arcade/desktop/hover.png",
  "core-input/arcade/desktop/resting.png",
  "core-input/arcade/desktop/typed.png",
  "core-input/fantasy/desktop/focused.png",
  "core-input/fantasy/desktop/hover.png",
  "core-input/fantasy/desktop/resting.png",
  "core-input/fantasy/desktop/typed.png",
  "core-input/modern/desktop/focused.png",
  "core-input/modern/desktop/hover.png",
  "core-input/modern/desktop/resting.png",
  "core-input/modern/desktop/typed.png",
  "core-input/sci-fi/desktop/focused.png",
  "core-input/sci-fi/desktop/hover.png",
  "core-input/sci-fi/desktop/resting.png",
  "core-input/sci-fi/desktop/typed.png",
  "core-meter/arcade/desktop/drained.png",
  "core-meter/arcade/desktop/resting.png",
  "core-meter/fantasy/desktop/drained.png",
  "core-meter/fantasy/desktop/resting.png",
  "core-meter/modern/desktop/drained.png",
  "core-meter/modern/desktop/resting.png",
  "core-meter/sci-fi/desktop/drained.png",
  "core-meter/sci-fi/desktop/resting.png",
  "core-panel/arcade/desktop/resting.png",
  "core-panel/fantasy/desktop/resting.png",
  "core-panel/modern/desktop/resting.png",
  "core-panel/sci-fi/desktop/resting.png",
  "core-spike/arcade/desktop/resting.png",
  "core-spike/fantasy/desktop/resting.png",
  "core-spike/modern/desktop/resting.png",
  "core-spike/sci-fi/desktop/resting.png",
  "foundations-palette/modern/desktop/resting.png",
  "foundations-semantic/arcade/desktop/resting.png",
  "foundations-semantic/fantasy/desktop/resting.png",
  "foundations-semantic/modern/desktop/resting.png",
  "foundations-semantic/sci-fi/desktop/resting.png",
];

test("every pre-compact capture identity still appears unchanged", async () => {
  const { buildCases, captureIdentity } = await runnerCases();
  const identities = new Set(buildCases(registry).map(captureIdentity));
  assert.equal(PRE_COMPACT_IDENTITIES.length, 53);
  for (const identity of PRE_COMPACT_IDENTITIES) {
    assert.ok(identities.has(identity), `missing pre-existing identity ${identity}`);
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
