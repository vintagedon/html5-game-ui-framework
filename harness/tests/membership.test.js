/**
 * Script Name : membership.test.js
 * Description : Assert rendered membership identity and coverage accounting.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import assert from "node:assert/strict";
import test from "node:test";

import { semanticDeclarations } from "../metrics/contrast.js";

async function membershipHelpers() {
  try {
    return await import("../runner/membership.js");
  } catch {
    assert.fail("rendered membership helpers must exist as a pure module");
  }
}

test("rendered declarations retain source and semantic token identity", () => {
  const declarations = semanticDeclarations();
  const focus = declarations.find(
    (entry) => entry.s.includes(":focus-visible") && entry.fo,
  );
  const hover = declarations.find(
    (entry) => entry.s.includes(":hover") && entry.b,
  );
  const selected = declarations.find(
    (entry) => entry.s.includes('aria-pressed="true"') && entry.b,
  );
  const placeholder = declarations.find(
    (entry) => entry.p === "::placeholder" && entry.fc,
  );

  assert.deepEqual(focus.fo, {
    token: "--gc-focus-ring",
    semantic: "--gc-focus-ring",
    expression: "var(--gc-focus-ring)",
  });
  assert.equal(hover.b.token, "--gc-control-fill-hover");
  assert.equal(hover.b.semantic, "--gc-surface-interactive");
  assert.equal(selected.b.token, "--gc-control-fill-selected");
  assert.equal(selected.b.semantic, "--gc-control-fill-selected");
  assert.equal(placeholder.fc.semantic, "--gc-text-muted");
});

test("membership reports the five required coverage values", async () => {
  const {
    createMembershipCollector,
    recordMembershipSample,
    buildMembershipReport,
  } = await membershipHelpers();
  const collector = createMembershipCollector({
    designedKeys: new Set([
      "--gc-text-primary|--gc-surface-raised",
      "--gc-focus-ring|--gc-surface-raised",
    ]),
    expectedSamples: 1,
  });
  recordMembershipSample(
    collector,
    {
      id: "fixture",
      theme: "modern",
      viewport: { name: "desktop" },
      checkpoint: { name: "focus" },
    },
    {
      observations: [
        {
          channel: "text",
          element: "h3",
          foreground: { semantic: "--gc-text-primary" },
          background: { semantic: "--gc-surface-raised" },
        },
        {
          channel: "outline",
          element: "button.gc-button",
          foreground: { semantic: "--gc-focus-ring" },
          background: { semantic: "--gc-surface-raised" },
        },
      ],
      exclusions: [
        { reason: "structural-no-audited-channel", element: "div.proof-row" },
      ],
      failures: [],
    },
  );

  const report = buildMembershipReport(collector, { runId: "fixture-run" });
  assert.equal(report.coverage.designedPairIdentities, 2);
  assert.equal(report.coverage.distinctObservedIdentities, 2);
  assert.equal(report.coverage.totalObservations, 2);
  assert.deepEqual(report.coverage.exclusionsByReason, {
    "structural-no-audited-channel": 1,
  });
  assert.equal(report.coverage.unclassifiedObservations, 0);
  assert.equal(report.samples.observed, 1);
  assert.equal(report.samples.expected, 1);
  assert.equal(report.failures.length, 0);
});

test("the disabled-text exemption is contextual", async () => {
  const {
    createMembershipCollector,
    recordMembershipSample,
    buildMembershipReport,
  } = await membershipHelpers();
  const collector = createMembershipCollector({
    designedKeys: new Set(["--gc-text-primary|--gc-surface-raised"]),
    expectedSamples: 1,
  });
  recordMembershipSample(
    collector,
    {
      id: "fixture",
      theme: "modern",
      viewport: { name: "desktop" },
      checkpoint: { name: "active" },
    },
    {
      observations: [
        {
          channel: "text",
          element: "button.gc-button",
          foreground: { semantic: "--gc-text-disabled" },
          background: { semantic: "--gc-surface-raised" },
        },
      ],
      exclusions: [],
      failures: [],
    },
  );

  const report = buildMembershipReport(collector, { runId: "fixture-run" });
  assert.equal(report.coverage.unclassifiedObservations, 1);
  assert.match(report.failures[0].detail, /active element uses context-only token --gc-text-disabled/);
});
