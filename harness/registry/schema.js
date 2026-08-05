/**
 * Script Name : schema.js
 * Description : Pure schema validation for the scenario registry.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Pure: no file system, no console. validateRegistry(registry, contract) returns
 * a list of human-readable error strings. An empty list means the registry is
 * internally consistent and names only tokens, themes, and layers that the
 * contract says exist. The contract (tokens, themes) is read from src/ by
 * source.js; layers come from layers.js. The validator is therefore the gate
 * that stops a scenario from naming a token or theme that does not exist, which
 * would otherwise produce a green run of a broken specimen.
 */

import { SPECIMEN_TYPES } from "../app/specimens.js";

/**
 * The interaction verbs the runner knows how to drive. Defined here and imported
 * by the runner so a scenario cannot declare an action nobody executes.
 */
export const ACTIONS = [
  "hover", // move pointer onto target
  "click", // click target (button press/active)
  "focus", // keyboard-focus target
  "type", // enter text value into target
  "toggle-pressed", // set aria-pressed on target (selected state)
  "set-value", // set a numeric value, e.g. meter fill width
  "wait", // settle (animations / transitions) for value ms
  "noop", // no DOM change; names a checkpoint baseline
];

const POSITIVE_INT = (n) => Number.isInteger(n) && n > 0;

function push(errors, scope, msg) {
  errors.push(`${scope}: ${msg}`);
}

/**
 * Validate a registry against a contract.
 * @param {{themes?: string[], scenarios?: any[]}} registry
 * @param {{tokens: string[], themes: string[], layers: string[]}} contract
 * @returns {string[]} error strings; empty when valid
 */
export function validateRegistry(registry, contract) {
  const errors = [];
  const tokenSet = new Set(contract.tokens);
  const themeSet = new Set(contract.themes);
  const layerSet = new Set(contract.layers);
  const actionSet = new Set(ACTIONS);
  const specimenSet = new Set(SPECIMEN_TYPES);

  if (!registry || typeof registry !== "object") {
    return ["registry: must be an object"];
  }

  const roster = Array.isArray(registry.themes) ? registry.themes : [];
  if (roster.length === 0) {
    push(errors, "registry", "declares no theme roster");
  }
  for (const t of roster) {
    if (!themeSet.has(t)) push(errors, "registry.themes", `unknown theme "${t}"`);
  }

  const scenarios = Array.isArray(registry.scenarios) ? registry.scenarios : [];
  if (scenarios.length === 0) {
    push(errors, "registry", "declares no scenarios");
  }

  const ids = new Set();
  for (const s of scenarios) {
    const where = `scenario "${s && s.id ? s.id : "<no id>"}"`;

    if (!s || typeof s !== "object") {
      push(errors, "registry.scenarios", "entry is not an object");
      continue;
    }
    if (typeof s.id !== "string" || !s.id) {
      push(errors, "registry.scenarios", "entry missing stable id");
      continue;
    }
    if (ids.has(s.id)) push(errors, where, "duplicate id");
    ids.add(s.id);

    if (!layerSet.has(s.layer)) push(errors, where, `undeclared layer "${s.layer}"`);
    if (typeof s.title !== "string" || !s.title) push(errors, where, "missing title");
    if (typeof s.specimen !== "string" || !s.specimen) {
      push(errors, where, "missing specimen");
    } else if (!specimenSet.has(s.specimen)) {
      push(errors, where, `unknown specimen "${s.specimen}"`);
    }
    if (typeof s.initialState !== "string" || !s.initialState.trim()) {
      push(errors, where, "missing initialState");
    }

    if (!Array.isArray(s.tokens)) {
      push(errors, where, "tokens must be an array");
    } else {
      for (const tok of s.tokens) {
        if (!tokenSet.has(tok)) push(errors, where, `names nonexistent token "${tok}"`);
      }
    }

    if (!Array.isArray(s.themes) || s.themes.length === 0) {
      push(errors, where, "must declare at least one theme");
    } else {
      for (const t of s.themes) {
        if (!themeSet.has(t)) push(errors, where, `names nonexistent theme "${t}"`);
      }
    }

    if (!Array.isArray(s.viewports) || s.viewports.length === 0) {
      push(errors, where, "must declare at least one viewport");
    } else {
      s.viewports.forEach((v, i) => {
        if (!v || typeof v !== "object") {
          push(errors, where, `viewport[${i}] invalid`);
          return;
        }
        if (typeof v.name !== "string" || !v.name) push(errors, where, `viewport[${i}] missing name`);
        if (!POSITIVE_INT(v.width)) push(errors, where, `viewport[${i}] width must be a positive integer`);
        if (!POSITIVE_INT(v.height)) push(errors, where, `viewport[${i}] height must be a positive integer`);
      });
    }

    const interactionNames = new Set();
    if (!Array.isArray(s.interactions)) {
      push(errors, where, "interactions must be an array");
    } else {
      for (const it of s.interactions) {
        if (!it || typeof it !== "object") {
          push(errors, where, "interaction invalid");
          continue;
        }
        if (typeof it.name !== "string" || !it.name) {
          push(errors, where, "interaction missing name");
          continue;
        }
        if (interactionNames.has(it.name)) push(errors, where, `duplicate interaction "${it.name}"`);
        interactionNames.add(it.name);
        if (!actionSet.has(it.action)) push(errors, where, `interaction "${it.name}" uses unknown action "${it.action}"`);
      }
    }

    if (!Array.isArray(s.checkpoints) || s.checkpoints.length === 0) {
      push(errors, where, "must declare at least one checkpoint");
    } else {
      const cpNames = new Set();
      for (const cp of s.checkpoints) {
        if (!cp || typeof cp !== "object") {
          push(errors, where, "checkpoint invalid");
          continue;
        }
        if (typeof cp.name !== "string" || !cp.name) {
          push(errors, where, "checkpoint missing name");
          continue;
        }
        if (cpNames.has(cp.name)) push(errors, where, `duplicate checkpoint "${cp.name}"`);
        cpNames.add(cp.name);
        if ("after" in cp && !Array.isArray(cp.after)) {
          push(errors, where, `checkpoint "${cp.name}" after must be an array`);
          continue;
        }
        const after = cp.after || [];
        for (const a of after) {
          if (!interactionNames.has(a)) push(errors, where, `checkpoint "${cp.name}" references unknown interaction "${a}"`);
        }
      }
    }

    if (!Array.isArray(s.dependsOn)) {
      push(errors, where, "dependsOn must be an array");
    }
  }

  return errors;
}
