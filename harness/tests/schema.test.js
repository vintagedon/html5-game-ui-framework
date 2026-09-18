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
import { SPECIMEN_TYPES } from "../app/specimens.js";
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
    section: "core",
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
  return {
    themes: ["modern"],
    sections: [
      { id: "core", title: "Core", summary: "Core primitives." },
      { id: "extra", title: "Extra", summary: "Another section." },
    ],
    scenarios,
  };
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

test("a scenario naming a section off the roster is rejected", () => {
  const scenario = { ...validScenario("stray-section"), section: "not-a-section" };
  const errors = validateRegistry(validRegistry([scenario]), CONTRACT);

  assert.match(errors.join("\n"), /names unknown section "not-a-section"/);
});

test("a scenario missing its section is rejected", () => {
  const scenario = validScenario("missing-section");
  delete scenario.section;
  const errors = validateRegistry(validRegistry([scenario]), CONTRACT);

  assert.match(errors.join("\n"), /missing section/);
});

test("a roster section with no scenarios is rejected", () => {
  const registryFixture = validRegistry([validScenario("one")]);
  const extra = registryFixture.sections.find((s) => s.id === "extra");
  assert.ok(extra, "fixture carries an unused roster section");
  const errors = validateRegistry(registryFixture, CONTRACT);

  assert.match(errors.join("\n"), /section "extra" has no scenarios/);
});

test("the real registry files every scenario under a nonempty roster section", () => {
  const errors = validateRegistry(registry, {
    tokens: registry.scenarios.flatMap((s) => s.tokens),
    themes: registry.themes,
    layers: ["foundations", "core", "modules", "consumers"],
  });
  assert.deepEqual(errors.filter((e) => e.includes("section")), []);

  const counts = new Map();
  for (const s of registry.scenarios) counts.set(s.section, (counts.get(s.section) || 0) + 1);
  for (const section of registry.sections) {
    assert.ok(counts.get(section.id) > 0, `section ${section.id} must not be empty`);
  }
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
  assert.equal(registry.scenarios.length, 11);
  for (const scenario of registry.scenarios) {
    assert.equal(typeof scenario.initialState, "string", scenario.id);
    assert.match(scenario.initialState, /\S/, scenario.id);
  }
});

test("every scenario declares a specimen inside the seven-value vocabulary", () => {
  assert.equal(SPECIMEN_TYPES.length, 7);
  const vocabulary = new Set(SPECIMEN_TYPES);
  for (const scenario of registry.scenarios) {
    assert.ok(vocabulary.has(scenario.specimen), `${scenario.id} names "${scenario.specimen}"`);
  }
});

test("the renderer throws on an unknown specimen and enumerates the supported types", () => {
  const restoreDocument = installDocumentStandIn();
  try {
    assert.throws(
      () => specimenRoot({ specimen: "not-a-specimen", config: {} }),
      (error) => {
        assert.match(error.message, /Unknown specimen "not-a-specimen"/);
        for (const type of SPECIMEN_TYPES) {
          assert.ok(
            error.message.includes(type),
            `the error message must enumerate "${type}"`,
          );
        }
        return true;
      },
    );
  } finally {
    restoreDocument();
  }
});
