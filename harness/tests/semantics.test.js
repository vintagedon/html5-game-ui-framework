/**
 * Script Name : semantics.test.js
 * Description : Assert specimen state semantics before browser capture.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import assert from "node:assert/strict";
import test from "node:test";

import { specimenRoot } from "../app/render.js";
import { registry } from "../registry/scenarios.js";

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

async function interactionHelpers() {
  try {
    return await import("../runner/interactions.js");
  } catch {
    assert.fail("state interaction helpers must exist as a pure module");
  }
}

test("toggle state is false initially and true after its interaction", async () => {
  const scenario = registry.scenarios.find((entry) => entry.specimen === "button");
  const restore = installDocumentStandIn();
  try {
    const specimen = specimenRoot(scenario);
    const toggle = findElement(specimen, '[data-variant="toggle"]');
    assert.equal(toggle.getAttribute("aria-pressed"), "false");

    const { applyTogglePressed } = await interactionHelpers();
    applyTogglePressed(toggle);
    assert.equal(toggle.getAttribute("aria-pressed"), "true");
  } finally {
    restore();
  }
});

test("meter fill, label, and accessible value agree before and after drain", async () => {
  const scenario = registry.scenarios.find((entry) => entry.specimen === "meter");
  const restore = installDocumentStandIn();
  try {
    const specimen = specimenRoot(scenario);
    const meter = findElement(specimen, ".gc-meter");
    const fill = findElement(meter, ".gc-meter__fill");
    const display = findElement(specimen, "[data-meter-display]");

    assert.equal(fill.getAttribute("style"), "--gc-meter-value: 72%");
    assert.equal(display.textContent, "72%");
    assert.equal(meter.getAttribute("aria-valuenow"), "72");

    const { applyMeterValue } = await interactionHelpers();
    applyMeterValue(meter, "38");
    assert.equal(fill.getAttribute("style"), "--gc-meter-value: 38%");
    assert.equal(display.textContent, "38%");
    assert.equal(meter.getAttribute("aria-valuenow"), "38");
  } finally {
    restore();
  }
});
