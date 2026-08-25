/**
 * Script Name : meter-family.test.js
 * Description : Assert meter family state synchronization and token registration.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-25
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * The meter family's single most important behavior is that the visual fill,
 * the visible display text, and the accessible value move together. A meter
 * whose accessible value drifts from its fill fails silently everywhere else,
 * so these tests drive set-value through every registered shape and assert
 * all three channels agree, plus that every new meter token is registered.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { specimenRoot } from "../app/render.js";
import { registry } from "../registry/scenarios.js";
import { applyMeterValue } from "../runner/interactions.js";

class ElementStandIn {
  constructor(tag) {
    this.tag = tag;
    this.attributes = new Map();
    this.children = [];
    this.className = "";
    this.textContent = "";
    this.parentElement = null;
    this.style = {
      setProperty: (name, value) => {
        const declarations = new Map(
          String(this.attributes.get("style") || "")
            .split(";")
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => entry.split(":").map((part) => part.trim())),
        );
        declarations.set(name, value);
        this.attributes.set(
          "style",
          [...declarations].map(([key, item]) => `${key}: ${item}`).join("; "),
        );
      },
    };
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  append(...children) {
    for (const child of children) {
      if (typeof child === "string") {
        this.textContent += child;
      } else {
        child.parentElement = this;
        this.children.push(child);
      }
    }
  }

  querySelector(selector) {
    return findElement(this, selector);
  }
}

function matches(element, selector) {
  if (selector.startsWith(".")) {
    return element.className.split(/\s+/).includes(selector.slice(1));
  }
  const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
  if (!attribute) return false;
  const value = element.getAttribute(attribute[1]);
  return attribute[2] == null ? value != null : value === attribute[2];
}

function findElement(root, selector) {
  for (const child of root.children) {
    if (matches(child, selector)) return child;
    const nested = findElement(child, selector);
    if (nested) return nested;
  }
  return null;
}

function installDocumentStandIn() {
  const previous = globalThis.document;
  globalThis.document = {
    createElement(tag) {
      return new ElementStandIn(tag);
    },
  };
  return () => {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  };
}

function meterScenarios() {
  return registry.scenarios.filter((s) => s.specimen === "meter");
}

function collectMeters(specimen) {
  const meters = [];
  const visit = (node) => {
    for (const child of node.children) {
      if (child.className.split(/\s+/).includes("gc-meter")) meters.push(child);
      visit(child);
    }
  };
  visit(specimen);
  return meters;
}

test("the registry covers every family shape: continuous, segmented, pips, vertical, and damage trail", () => {
  const shapes = new Set();
  const orientations = new Set();
  let trail = false;
  for (const scenario of meterScenarios()) {
    for (const sample of scenario.config.samples) {
      shapes.add(sample.shape || "continuous");
      if (sample.orientation) orientations.add(sample.orientation);
      if (sample.trail != null) trail = true;
    }
  }
  assert.deepEqual([...shapes].sort(), ["continuous", "pips", "segmented"]);
  assert.ok(orientations.has("vertical"), "a vertical orientation sample must be registered");
  assert.ok(trail, "a damage trail sample must be registered");
  // The original continuous horizontal case keeps its identity and sample.
  const core = registry.scenarios.find((s) => s.id === "core-meter");
  assert.deepEqual(core.config.samples, [
    { label: "Charge", variant: "charge", value: 72, display: "72%" },
  ]);
});

test("initial render keeps fill value, display text, and aria-valuenow in agreement for every sample", () => {
  const restore = installDocumentStandIn();
  try {
    for (const scenario of meterScenarios()) {
      const specimen = specimenRoot(scenario);
      const meters = collectMeters(specimen);
      assert.ok(meters.length > 0, `${scenario.id} must render meters`);
      for (const meter of meters) {
        const aria = meter.getAttribute("aria-valuenow");
        const display = meter.parentElement.querySelector("[data-meter-display]");
        const fill = meter.querySelector(".gc-meter__fill");
        assert.ok(fill, "every meter renders a fill");
        assert.equal(
          fill.getAttribute("style"),
          `--gc-meter-value: ${aria}%`,
          `${scenario.id}: fill geometry channel must match the declared value`,
        );
        assert.equal(display.textContent, `${aria}%`);
        assert.equal(meter.getAttribute("role"), "meter");
        assert.equal(meter.getAttribute("aria-valuemin"), "0");
        assert.equal(meter.getAttribute("aria-valuemax"), "100");
      }
    }
  } finally {
    restore();
  }
});

test("set-value drives fill geometry channel, display text, and aria-valuenow together on every shape", () => {
  const restore = installDocumentStandIn();
  try {
    const drivenShapes = new Set();
    for (const scenario of meterScenarios()) {
      const specimen = specimenRoot(scenario);
      for (const meter of collectMeters(specimen)) {
        const shape = meter.getAttribute("data-shape") || "continuous";
        const orientation = meter.getAttribute("data-orientation") || "horizontal";
        const fill = meter.querySelector(".gc-meter__fill");
        const display = meter.parentElement.querySelector("[data-meter-display]");
        applyMeterValue(meter, "44");
        assert.equal(
          fill.getAttribute("style"),
          "--gc-meter-value: 44%",
          `${scenario.id} ${shape}/${orientation}: fill channel must move`,
        );
        assert.equal(
          display.textContent,
          "44%",
          `${scenario.id} ${shape}/${orientation}: display text must move`,
        );
        assert.equal(
          meter.getAttribute("aria-valuenow"),
          "44",
          `${scenario.id} ${shape}/${orientation}: accessible value must move`,
        );
        drivenShapes.add(`${shape}/${orientation}`);
      }
    }
    for (const expected of [
      "continuous/horizontal",
      "segmented/horizontal",
      "pips/horizontal",
      "continuous/vertical",
      "segmented/vertical",
      "pips/vertical",
    ]) {
      assert.ok(drivenShapes.has(expected), `set-value must be driven on ${expected}`);
    }
  } finally {
    restore();
  }
});

test("set-value moves the damage trail to the previous value while the fill moves to the new one", () => {
  const scenario = registry.scenarios.find((s) => s.id === "core-meter-damage");
  const restore = installDocumentStandIn();
  try {
    const specimen = specimenRoot(scenario);
    const meter = collectMeters(specimen)[0];
    const fill = meter.querySelector(".gc-meter__fill");
    const trail = meter.querySelector(".gc-meter__trail");
    const display = meter.parentElement.querySelector("[data-meter-display]");
    assert.ok(trail, "the damage sample renders a trail element");
    assert.equal(
      meter.getAttribute("style"),
      "--gc-meter-trail-value: 80%",
      "the initial trail value rides the meter's element-level channel",
    );

    applyMeterValue(meter, "38");
    assert.equal(fill.getAttribute("style"), "--gc-meter-value: 38%");
    assert.equal(
      trail.getAttribute("style"),
      "--gc-meter-trail-value: 80%",
      "the trail holds the previous value after a drop",
    );
    assert.equal(display.textContent, "38%");
    assert.equal(meter.getAttribute("aria-valuenow"), "38");

    applyMeterValue(meter, "61");
    assert.equal(fill.getAttribute("style"), "--gc-meter-value: 61%");
    assert.equal(
      trail.getAttribute("style"),
      "--gc-meter-trail-value: 38%",
      "the trail follows each previous value",
    );
    assert.equal(meter.getAttribute("aria-valuenow"), "61");
  } finally {
    restore();
  }
});

test("every --gc-meter-* component token is registered on a scenario and the sets reconcile exactly", () => {
  const tokenText = readFileSync(
    new URL("../../src/tokens/components.css", import.meta.url),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "");
  const defined = new Set();
  for (const match of tokenText.matchAll(/(--gc-meter-[a-z0-9-]+)\s*:/g)) {
    defined.add(match[1]);
  }
  const referenced = new Set();
  for (const scenario of registry.scenarios) {
    for (const token of scenario.tokens || []) {
      if (token.startsWith("--gc-meter-")) referenced.add(token);
    }
  }
  assert.deepEqual([...referenced].sort(), [...defined].sort());
  assert.ok(defined.size >= 6, "the family defines track, fill, text, trail, segments, and pips");
});

test("segment and pip counts ride the token-valued count channel, never sample markup", () => {
  const restore = installDocumentStandIn();
  try {
    for (const scenario of meterScenarios()) {
      const specimen = specimenRoot(scenario);
      for (const meter of collectMeters(specimen)) {
        const count = (meter.getAttribute("style") || "").match(/--gc-meter-count:\s*([^;]+)/);
        const shape = meter.getAttribute("data-shape");
        if (shape === "segmented" || shape === "pips") {
          assert.ok(count, `${scenario.id}: ${shape} meters must declare the count channel`);
          assert.match(
            count[1],
            /var\(--gc-meter-(segments|pips)\)/,
            "the count value must be token-valued",
          );
          assert.equal(meter.children.length, 1, "no count-derived child elements may be emitted");
        } else {
          assert.equal(count, null, "continuous meters need no count channel");
        }
      }
    }
  } finally {
    restore();
  }
});
