/**
 * Script Name : schema.test.js
 * Description : Assert the scenario registry schema and renderer vocabulary.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Node's built-in test runner exercises the pure registry validator directly.
 * A small DOM stand-in lets the renderer's unknown-specimen behavior be tested
 * without adding a browser or DOM package to the unit-test floor.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { specimenRoot } from "../app/render.js";
import { registry } from "../registry/scenarios.js";
import { validateRegistry } from "../registry/schema.js";

const CONTRACT = {
  tokens: ["--gc-test-token"],
  themes: ["modern"],
  layers: ["foundations", "core", "modules", "consumers"],
};

function validScenario(id) {
  return {
    id,
    layer: "core",
    title: `Scenario ${id}`,
    specimen: "panel",
    initialState: "A panel is visible in its resting state.",
    tokens: ["--gc-test-token"],
    themes: ["modern"],
    viewports: [{ name: "desktop", width: 1280, height: 800 }],
    interactions: [],
    checkpoints: [{ name: "resting", after: [] }],
    dependsOn: [],
  };
}

function validRegistry(scenarios = [validScenario("one")]) {
  return { themes: ["modern"], scenarios };
}

function installDocumentStandIn() {
  const previous = globalThis.document;
  globalThis.document = {
    createElement(tag) {
      return {
        tag,
        attributes: new Map(),
        children: [],
        className: "",
        setAttribute(name, value) {
          this.attributes.set(name, value);
        },
        append(...children) {
          this.children.push(...children);
        },
      };
    },
  };
  return () => {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  };
}

test("validateRegistry always returns an array for malformed roots", () => {
  for (const input of [null, "not-an-object", { themes: ["modern"] }]) {
    assert.ok(Array.isArray(validateRegistry(input, CONTRACT)));
  }
});

test("malformed scenario members do not hide errors in later scenarios", async (t) => {
  const cases = [
    {
      name: "invalid interaction object",
      third: { ...validScenario("three"), interactions: [null] },
      expected: /scenario "three": interaction invalid/,
    },
    {
      name: "interaction without a name",
      third: {
        ...validScenario("three"),
        interactions: [{ action: "noop" }],
      },
      expected: /scenario "three": interaction missing name/,
    },
    {
      name: "invalid checkpoint object",
      third: { ...validScenario("three"), checkpoints: [null] },
      expected: /scenario "three": checkpoint invalid/,
    },
    {
      name: "checkpoint without a name",
      third: { ...validScenario("three"), checkpoints: [{ after: [] }] },
      expected: /scenario "three": checkpoint missing name/,
    },
  ];

  for (const entry of cases) {
    await t.test(entry.name, () => {
      const fourth = { ...validScenario("four"), title: "" };
      const fifth = { ...validScenario("five"), layer: "unknown" };
      const errors = validateRegistry(
        validRegistry([validScenario("one"), validScenario("two"), entry.third, fourth, fifth]),
        CONTRACT,
      );

      assert.ok(Array.isArray(errors));
      assert.match(errors.join("\n"), entry.expected);
      assert.match(errors.join("\n"), /scenario "four": missing title/);
      assert.match(errors.join("\n"), /scenario "five": undeclared layer "unknown"/);
    });
  }
});

test("an unknown specimen produces a validation error", () => {
  const scenario = { ...validScenario("unknown-specimen"), specimen: "not-a-specimen" };
  const errors = validateRegistry(validRegistry([scenario]), CONTRACT);

  assert.match(errors.join("\n"), /unknown specimen "not-a-specimen"/);
});

test("a checkpoint after value must be an array", () => {
  const scenario = {
    ...validScenario("wrong-after"),
    checkpoints: [{ name: "resting", after: "interaction-name" }],
  };
  const errors = validateRegistry(validRegistry([scenario]), CONTRACT);

  assert.match(errors.join("\n"), /checkpoint "resting" after must be an array/);
});

test("initialState is required", () => {
  const scenario = validScenario("missing-initial-state");
  delete scenario.initialState;
  const errors = validateRegistry(validRegistry([scenario]), CONTRACT);

  assert.match(errors.join("\n"), /missing initialState/);
});

test("all registered scenarios declare a nonempty initialState", () => {
  assert.equal(registry.scenarios.length, 7);
  for (const scenario of registry.scenarios) {
    assert.equal(typeof scenario.initialState, "string", scenario.id);
    assert.match(scenario.initialState, /\S/, scenario.id);
  }
});

test("the renderer throws on an unknown specimen", () => {
  const restoreDocument = installDocumentStandIn();
  try {
    assert.throws(
      () => specimenRoot({ specimen: "not-a-specimen", config: {} }),
      /Unknown specimen "not-a-specimen"/,
    );
  } finally {
    restoreDocument();
  }
});
