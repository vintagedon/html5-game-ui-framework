/**
 * Script Name : render.js
 * Description : Turn a scenario declaration into reference-page DOM.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Browser ESM. The reference page imports the registry and this renderer and
 * builds every specimen from the declaration, so the page source carries no
 * per-scenario markup: adding a scenario to the registry makes it appear with no
 * other file edited. The interaction targets a scenario declares (e.g.
 * .gc-button[data-variant="resting"]) resolve against [data-scenario="<id>"],
 * which is the contract the Playwright runner relies on.
 *
 * The renderer produces framework specimens (.gc-panel, .gc-button, ...) and
 * reference chrome (.token-swatch, .scenario-head) that sits above the token
 * layer. Scenario DATA never lives here; only the structural mapping does.
 */

import { SPECIMEN_TYPES } from "./specimens.js";

/** @param {string} tag @param {string[][]} [attrs] @param {(Node|string)[]} [kids] */
function el(tag, attrs = [], kids = []) {
  const node = document.createElement(tag);
  for (const [k, v] of attrs) {
    if (k === "class") node.className = v;
    else if (k === "style") node.setAttribute("style", v);
    else node.setAttribute(k, v);
  }
  for (const kid of kids) node.append(kid);
  return node;
}

function swatch({ token, on, label }) {
  const style = on
    ? `--reference-swatch: var(${token}); --reference-on-swatch: var(${on})`
    : `--reference-swatch: var(${token})`;
  return el("div", [["class", "token-swatch"], ["style", style]], [el("code", [["class", "token-name"]], [label])]);
}

function buttonSample({ label, variant, pressed, disabled }) {
  return el(
    "button",
    [
      ["class", "gc-button"],
      ["type", "button"],
      ["data-variant", variant],
      ...(disabled ? [["disabled", ""]] : []),
      ...(pressed !== undefined ? [["aria-pressed", String(pressed)]] : []),
    ],
    [label],
  );
}

function inputSample({ label, variant, placeholder, value, disabled }) {
  const id = `gc-input-${variant}`;
  const lab = el("label", [["class", "token-label"], ["for", id]], [label]);
  const input = el(
    "input",
    [
      ["class", "gc-input"],
      ["id", id],
      ["data-variant", variant],
      ...(placeholder ? [["placeholder", placeholder]] : []),
      ...(value != null ? [["value", value]] : []),
      ...(disabled ? [["disabled", ""]] : []),
    ],
  );
  return [lab, input];
}

/** Build the specimen root element for one scenario. */
export function specimenRoot(s) {
  const c = s.config || {};
  switch (s.specimen) {
    case "palette":
    case "semantic":
      return el("div", [["class", "gc-specimen token-grid"]], (c.swatches || []).map(swatch));

    case "panel":
      return el("article", [["class", "gc-specimen gc-panel"]], [
        el("h3", [], [c.heading || s.title]),
        el("p", [["class", "section-copy"]], [c.copy || ""]),
      ]);

    case "button":
      return el("article", [["class", "gc-specimen gc-panel proof-card"]], [
        el("h3", [], [s.title]),
        el("div", [["class", "proof-row"]], (c.samples || []).map(buttonSample)),
      ]);

    case "input":
      return el("article", [["class", "gc-specimen gc-panel proof-card"]], [
        el("h3", [], [s.title]),
        ...((c.samples || []).flatMap(inputSample)),
      ]);

    case "meter":
      return el("article", [["class", "gc-specimen gc-panel proof-card"]], [
        el("h3", [], [s.title]),
        ...(c.samples || []).map((m) => {
          const head = el("div", [["class", "meter-label"]], [
            el("span", [], [m.label]),
            el("span", [["data-meter-display", ""]], [m.display]),
          ]);
          const fill = el("div", [
            ["class", "gc-meter__fill"],
            ["style", `--gc-meter-value: ${m.value}%`],
          ]);
          const meter = el(
            "div",
            [
              ["class", "gc-meter"],
              ["data-variant", m.variant],
              ["role", "meter"],
              ["aria-label", m.label],
              ["aria-valuemin", "0"],
              ["aria-valuemax", "100"],
              ["aria-valuenow", String(m.value)],
            ],
            [fill],
          );
          return el("div", [], [head, meter]);
        }),
      ]);

    case "spike":
      return el(
        "article",
        [["class", "gc-specimen gc-panel gc-spike"]],
        [
          el("span", [["class", "gc-spike__ornament"], ["aria-hidden", "true"]]),
          el("h3", [["class", "spike-heading"]], [c.heading || s.title]),
          el("p", [["class", "spike-copy"]], [c.copy || ""]),
          el(
            "ul",
            [["class", "spike-evidence"]],
            (c.evidence || []).map((e) => el("li", [], [e])),
          ),
        ],
      );

    default:
      throw new TypeError(
        `Unknown specimen "${s.specimen}". Expected one of: ${SPECIMEN_TYPES.join(", ")}`,
      );
  }
}

/** Build a full scenario section (header + specimen root) for the page. */
export function scenarioSection(s) {
  const meta = `${s.layer} · ${s.themes.join("/")} · ${s.tokens.length} token(s)`;
  return el("section", [["class", "reference-section"], ["data-scenario", s.id], ["data-layer", s.layer]], [
    el("header", [["class", "scenario-head"]], [
      el("h2", [["class", "section-heading"]], [s.title]),
      el("p", [["class", "scenario-meta"]], [meta]),
      el("p", [["class", "section-copy"]], [s.summary]),
    ]),
    el("div", [["class", "scenario-body"]], [specimenRoot(s)]),
  ]);
}
