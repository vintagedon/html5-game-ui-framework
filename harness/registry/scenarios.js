/**
 * Script Name : scenarios.js
 * Description : THE single scenario declaration. Four consumers read this and no other source.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * This file is the unit's central artifact. Each specimen declares its layer
 * membership, required tokens, theme and viewport coverage, initial state,
 * scripted interactions, and named capture checkpoints. The reference
 * application, the Playwright runner, the dependency auditor, and the metrics
 * block all import this file. A scenario field written literally outside this
 * file is a second source of truth and a defect.
 *
 * The first four registrations (panel, button, input, meter) lift the Phase 1
 * "provisional proof specimen" qualifier: a component without a registered
 * scenario is incomplete, and these now have one.
 */

import { LAYERS } from "./layers.js";

const ALL_THEMES = ["modern", "arcade", "sci-fi", "fantasy"];

const DESKTOP = { name: "desktop", width: 1280, height: 800 };

// Status-family chrome gets a portrait second viewport; swatch and spike
// specimens do not (H-006: viewports are per scenario).
const COMPACT = { name: "compact", width: 480, height: 900 };

// The section roster drives the reference application's navigation. A nav
// tree, routing table, or page list written anywhere outside this file is a
// second source of truth and a defect. Section membership is navigation, not
// identity: it never enters a capture identity, so sections can be rearranged
// without invalidating a single baseline.
const SECTIONS = [
  {
    id: "foundations",
    title: "Foundations",
    summary: "Primitive palette scales and the semantic roles every layer consumes.",
  },
  {
    id: "core",
    title: "Core",
    summary: "Domain-neutral primitives a consumer uses without translating game concepts.",
  },
  {
    id: "status",
    title: "Status",
    summary: "The meter family: continuous, segmented, and pip shapes in both orientations, with a lagging damage trail.",
  },
  {
    id: "technique",
    title: "Technique",
    summary: "Zero-raster technique proofs: generated surfaces, ornament, and displaced geometry from text assets.",
  },
];

export const registry = {
  // The full theme roster. The validator cross-checks this against src/themes/*.
  themes: ALL_THEMES,

  // The navigation roster. The validator requires every scenario to file
  // under one of these and no roster section to be empty.
  sections: SECTIONS,

  scenarios: [
    {
      id: "foundations-palette",
      section: "foundations",
      layer: "foundations",
      title: "Primitive palette scales",
      summary:
        "Internal palette literals are visible here for contract review; framework rules never consume primitives directly.",
      specimen: "palette",
      initialState: "Primitive palette swatches are visible with no interaction applied.",
      tokens: [
        "--gc-palette-modern-00",
        "--gc-palette-modern-70",
        "--gc-palette-modern-accent",
        "--gc-palette-modern-accent-on",
        "--gc-palette-arcade-accent",
        "--gc-palette-arcade-accent-on",
        "--gc-palette-scifi-accent",
        "--gc-palette-scifi-accent-on",
        "--gc-palette-fantasy-15",
        "--gc-palette-fantasy-75",
      ],
      // Primitives are theme-constant literals; one capture is sufficient.
      themes: ["modern"],
      viewports: [DESKTOP],
      config: {
        swatches: [
          { token: "--gc-palette-modern-00", on: "--gc-palette-modern-95", label: "modern-00" },
          { token: "--gc-palette-modern-70", on: "--gc-palette-modern-00", label: "modern-70" },
          { token: "--gc-palette-arcade-accent", on: "--gc-palette-arcade-accent-on", label: "arcade-accent" },
          { token: "--gc-palette-scifi-accent", on: "--gc-palette-scifi-accent-on", label: "scifi-accent" },
          { token: "--gc-palette-fantasy-15", on: "--gc-palette-fantasy-92", label: "fantasy-15" },
          { token: "--gc-palette-fantasy-75", on: "--gc-palette-fantasy-00", label: "fantasy-75" },
        ],
      },
      interactions: [],
      checkpoints: [{ name: "resting", after: [] }],
      dependsOn: [],
    },

    {
      id: "foundations-semantic",
      section: "foundations",
      layer: "foundations",
      title: "Semantic roles",
      summary: "These swatches change in place when the root theme attribute changes.",
      specimen: "semantic",
      initialState: "Semantic role swatches are visible under the selected root theme.",
      tokens: [
        "--gc-surface-canvas",
        "--gc-surface-raised",
        "--gc-accent",
        "--gc-on-accent",
        "--gc-status-success",
        "--gc-on-status-success",
        "--gc-status-warning",
        "--gc-on-status-warning",
        "--gc-status-danger",
        "--gc-on-status-danger",
      ],
      themes: ALL_THEMES,
      viewports: [DESKTOP],
      config: {
        swatches: [
          { token: "--gc-surface-canvas", label: "--gc-surface-canvas" },
          { token: "--gc-surface-raised", label: "--gc-surface-raised" },
          { token: "--gc-accent", on: "--gc-on-accent", label: "--gc-accent" },
          { token: "--gc-status-success", on: "--gc-on-status-success", label: "--gc-status-success" },
          { token: "--gc-status-warning", on: "--gc-on-status-warning", label: "--gc-status-warning" },
          { token: "--gc-status-danger", on: "--gc-on-status-danger", label: "--gc-status-danger" },
        ],
      },
      interactions: [],
      checkpoints: [{ name: "resting", after: [] }],
      dependsOn: [],
    },

    {
      id: "core-panel",
      section: "core",
      layer: "core",
      title: "Panel levels",
      summary:
        "Raised content, structural border, themed depth, type roles, and generated surface technique share unchanged markup across themes.",
      specimen: "panel",
      initialState: "The panel is visible at its resting elevation and border state.",
      tokens: [
        "--gc-panel-fill",
        "--gc-panel-text",
        "--gc-panel-border",
        "--gc-surface-raised",
        "--gc-elevation-mid",
        "--gc-radius-panel",
      ],
      themes: ALL_THEMES,
      viewports: [DESKTOP],
      config: {
        heading: "Panel levels",
        copy: "A raised content plane with a structural border, themed depth, and generated surface treatment. The same markup renders under every theme.",
      },
      interactions: [],
      checkpoints: [{ name: "resting", after: [] }],
      dependsOn: [],
    },

    {
      id: "core-button",
      section: "core",
      layer: "core",
      title: "Button states",
      summary:
        "Hover, selected, and disabled fills derive from the same four OKLCH recipes under every theme.",
      specimen: "button",
      initialState: "Resting, unpressed toggle, and disabled buttons are visible.",
      tokens: [
        "--gc-button-fill",
        "--gc-button-text",
        "--gc-button-selected-text",
        "--gc-control-fill-hover",
        "--gc-control-fill-active",
        "--gc-control-fill-selected",
        "--gc-control-fill-disabled",
        "--gc-text-disabled",
      ],
      themes: ALL_THEMES,
      viewports: [DESKTOP],
      config: {
        samples: [
          { label: "Resting", variant: "resting" },
          { label: "Toggle", variant: "toggle", pressed: false },
          { label: "Disabled", variant: "disabled", disabled: true },
        ],
      },
      interactions: [
        { name: "hover", action: "hover", target: '.gc-button[data-variant="resting"]' },
        { name: "select", action: "toggle-pressed", target: '.gc-button[data-variant="toggle"]' },
        { name: "focus", action: "focus", target: '.gc-button[data-variant="resting"]' },
      ],
      checkpoints: [
        { name: "resting", after: [] },
        { name: "hover", after: ["hover"] },
        { name: "selected", after: ["select"] },
        { name: "focus", after: ["focus"] },
      ],
      dependsOn: [],
    },

    {
      id: "core-input",
      section: "core",
      layer: "core",
      title: "Text input",
      summary: "Hover, focus, typed, and disabled inputs share one recipe set across themes.",
      specimen: "input",
      initialState: "An empty enabled input and a populated disabled input are visible.",
      tokens: [
        "--gc-input-fill",
        "--gc-input-text",
        "--gc-input-placeholder",
        "--gc-input-border",
        "--gc-control-fill-hover",
        "--gc-control-fill-disabled",
      ],
      themes: ALL_THEMES,
      viewports: [DESKTOP],
      config: {
        samples: [
          { label: "Callsign", variant: "default", placeholder: "Enter callsign" },
          { label: "Unavailable", variant: "disabled", value: "Unavailable", disabled: true },
        ],
      },
      interactions: [
        { name: "hover", action: "hover", target: '.gc-input[data-variant="default"]' },
        { name: "focus", action: "focus", target: '.gc-input[data-variant="default"]' },
        { name: "type", action: "type", target: '.gc-input[data-variant="default"]', value: "Vector" },
      ],
      checkpoints: [
        { name: "resting", after: [] },
        { name: "hover", after: ["hover"] },
        { name: "focused", after: ["focus"] },
        { name: "typed", after: ["type"] },
      ],
      dependsOn: [],
    },

    {
      id: "core-meter",
      section: "status",
      layer: "core",
      title: "Meter",
      summary: "A track and fill whose value transitions on change, themed through semantic tokens.",
      specimen: "meter",
      initialState: "The charge meter displays and exposes a value of 72 percent.",
      tokens: ["--gc-meter-track", "--gc-meter-fill", "--gc-meter-text"],
      themes: ALL_THEMES,
      viewports: [DESKTOP, COMPACT],
      config: {
        samples: [{ label: "Charge", variant: "charge", value: 72, display: "72%" }],
      },
      interactions: [
        { name: "drain", action: "set-value", target: '.gc-meter[data-variant="charge"]', value: "38" },
      ],
      checkpoints: [
        { name: "resting", after: [] },
        { name: "drained", after: ["drain"] },
      ],
      dependsOn: [],
    },

    {
      id: "core-meter-segmented",
      section: "status",
      layer: "core",
      title: "Segmented meter",
      summary:
        "The fill quantizes to whole segments; the gaps are painted by the track, never emitted as markup.",
      specimen: "meter",
      initialState:
        "The segmented meter displays 63 percent with five of eight segments filled.",
      tokens: [
        "--gc-meter-track",
        "--gc-meter-fill",
        "--gc-meter-text",
      ],
      themes: ALL_THEMES,
      viewports: [DESKTOP, COMPACT],
      config: {
        samples: [
          {
            label: "Shield",
            variant: "shield",
            value: 63,
            display: "63%",
            shape: "segmented",
            count: "var(--gc-meter-segments)",
          },
        ],
      },
      interactions: [
        { name: "drain", action: "set-value", target: '.gc-meter[data-variant="shield"]', value: "25" },
        { name: "empty", action: "set-value", target: '.gc-meter[data-variant="shield"]', value: "0" },
        { name: "fill", action: "set-value", target: '.gc-meter[data-variant="shield"]', value: "100" },
      ],
      checkpoints: [
        { name: "resting", after: [] },
        { name: "drained", after: ["drain"] },
        { name: "emptied", after: ["empty"] },
        { name: "filled", after: ["fill"] },
      ],
      dependsOn: [],
    },

    {
      id: "core-meter-pips",
      section: "status",
      layer: "core",
      title: "Pip meter",
      summary:
        "Discrete units each read filled or empty; the pip count flows from a token through one custom property.",
      specimen: "meter",
      initialState: "The pip meter displays 70 percent with seven of ten pips filled.",
      tokens: [
        "--gc-meter-track",
        "--gc-meter-fill",
        "--gc-meter-text",
      ],
      themes: ALL_THEMES,
      viewports: [DESKTOP, COMPACT],
      config: {
        samples: [
          {
            label: "Charges",
            variant: "charges",
            value: 70,
            display: "70%",
            shape: "pips",
            count: "var(--gc-meter-pips)",
          },
        ],
      },
      interactions: [
        { name: "drain", action: "set-value", target: '.gc-meter[data-variant="charges"]', value: "30" },
        { name: "empty", action: "set-value", target: '.gc-meter[data-variant="charges"]', value: "0" },
        { name: "fill", action: "set-value", target: '.gc-meter[data-variant="charges"]', value: "100" },
      ],
      checkpoints: [
        { name: "resting", after: [] },
        { name: "drained", after: ["drain"] },
        { name: "emptied", after: ["empty"] },
        { name: "filled", after: ["fill"] },
      ],
      dependsOn: [],
    },

    {
      id: "core-meter-vertical",
      section: "status",
      layer: "core",
      title: "Vertical meters",
      summary:
        "The same shapes render bottom-anchored in vertical orientation from unchanged value channels.",
      specimen: "meter",
      initialState:
        "Vertical meters display velocity 64, heat 50, and cells 40 percent at rest.",
      tokens: [
        "--gc-meter-track",
        "--gc-meter-fill",
        "--gc-meter-text",
      ],
      themes: ALL_THEMES,
      viewports: [DESKTOP, COMPACT],
      config: {
        samples: [
          { label: "Velocity", variant: "velocity", value: 64, display: "64%", orientation: "vertical" },
          {
            label: "Heat",
            variant: "heat",
            value: 50,
            display: "50%",
            orientation: "vertical",
            shape: "segmented",
            count: "var(--gc-meter-segments)",
          },
          {
            label: "Cells",
            variant: "cells",
            value: 40,
            display: "40%",
            orientation: "vertical",
            shape: "pips",
            count: "var(--gc-meter-pips)",
          },
        ],
      },
      interactions: [
        { name: "drain", action: "set-value", target: '.gc-meter[data-variant="velocity"]', value: "22" },
      ],
      checkpoints: [
        { name: "resting", after: [] },
        { name: "drained", after: ["drain"] },
      ],
      dependsOn: [],
    },

    {
      id: "core-meter-damage",
      section: "status",
      layer: "core",
      title: "Damage trail",
      summary:
        "A secondary band holds the previous value behind the fill, reading as recent loss while the fill moves first.",
      specimen: "meter",
      initialState: "The hull meter reads 80 percent with no damage trail visible.",
      tokens: ["--gc-meter-track", "--gc-meter-fill", "--gc-meter-text", "--gc-meter-trail"],
      themes: ALL_THEMES,
      viewports: [DESKTOP, COMPACT],
      config: {
        samples: [{ label: "Hull", variant: "hull", value: 80, display: "80%", trail: 80 }],
      },
      interactions: [
        { name: "hit", action: "set-value", target: '.gc-meter[data-variant="hull"]', value: "38" },
        { name: "repair", action: "set-value", target: '.gc-meter[data-variant="hull"]', value: "91" },
      ],
      checkpoints: [
        { name: "resting", after: [] },
        { name: "damaged", after: ["hit"] },
        { name: "repaired", after: ["repair"] },
      ],
      dependsOn: [],
    },

    {
      id: "core-spike",
      section: "technique",
      layer: "core",
      title: "Dark-fantasy zero-raster spike",
      summary:
        "Procedural noise, vector scrollwork, inset light, and displaced geometry from text assets. The effect binds under fantasy; the element remains in the DOM under every theme.",
      specimen: "spike",
      initialState: "The generated surface and ornament are visible with no interaction applied.",
      tokens: [
        "--gc-surface-shape",
        "--gc-surface-edge-filter",
        "--gc-surface-texture",
        "--gc-ornament-color",
        "--gc-ornament-mask",
        "--gc-ornament-opacity",
        "--gc-border-strong",
        "--gc-elevation-high",
      ],
      themes: ALL_THEMES,
      viewports: [DESKTOP],
      config: {
        heading: "The Ashen Compact",
        copy: "A weathered charter surface produced from text assets: procedural noise, vector scrollwork, inset light, and displaced geometry.",
        evidence: [
          "Texture: SVG feTurbulence",
          "Filigree: SVG data-URI mask",
          "Embossing: layered inset shadows",
          "Edge: feDisplacementMap plus polygon",
        ],
      },
      interactions: [],
      checkpoints: [{ name: "resting", after: [] }],
      dependsOn: [],
    },
  ],
};

export { LAYERS, ALL_THEMES };
