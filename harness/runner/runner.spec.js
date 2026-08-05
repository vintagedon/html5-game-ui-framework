/**
 * Script Name : runner.spec.js
 * Description : Registry-driven Playwright runner: drive declared interactions, capture declared checkpoints.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Imports the SAME registry the reference page renders from and drives each
 * declared interaction, taking a capture at each declared checkpoint under each
 * declared theme and viewport. No scenario id, interaction, or viewport is
 * written literally here. They all come from the registry. The Gate 2.4
 * mutation test relies on that: changing a scenario's theme coverage in the
 * registry changes both the rendered page and this runner's executed matrix.
 *
 * Modes:
 *   GC_CAPTURE=1  write candidate captures; do not fail on a missing/diffing
 *                 approved baseline (first-run candidate generation).
 *   (default)     compare each candidate against the approved baseline; fail on
 *                 a diff. A missing baseline is reported, not fatal, until the
 *                 operator approves goldens (agents never write the approved path).
 */

import { test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "../registry/scenarios.js";
import { compareCapture, readApprovalManifest } from "./compare.js";
import {
  buildCases,
  captureIdentity,
  resolveCheckpointInteractions,
} from "./cases.js";
import { semanticDeclarations } from "../metrics/contrast.js";
import { designedPairs } from "../metrics/pairings.js";
import {
  buildMembershipReport,
  createMembershipCollector,
  inspectRenderedSpecimen,
  recordMembershipSample,
} from "./membership.js";

const CAPTURE = !!process.env.GC_CAPTURE;
const BASE = process.env.GC_BASE_URL || "http://127.0.0.1:8123";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CANDIDATES = join(ROOT, "goldens/candidates");
const APPROVED = join(ROOT, "goldens/approved");
const PAGE = `${BASE}/reference/`;
const RUN_ID = randomUUID();
const RUN_STATE = join(ROOT, "runner/playwright-run.json");
const approvalManifest = readApprovalManifest();

// One case per scenario x theme x viewport x checkpoint, all registry-sourced.
const cases = buildCases(registry);
const SEMANTIC_DECLARATIONS = semanticDeclarations();
const DESIGNED_KEYS = new Set(
  designedPairs().map(([foreground, background]) =>
    `${foreground}|${background}`,
  ),
);
const membershipCollector = createMembershipCollector({
  designedKeys: DESIGNED_KEYS,
  expectedSamples: cases.length,
});

/** Resolve an interaction target selector within the scenario's section. */
function within(id, selector) {
  return `[data-scenario="${id}"] ${selector}`;
}

/** Execute one declared interaction on the page. */
async function runInteraction(page, id, it) {
  const target = within(id, it.target || "");
  switch (it.action) {
    case "hover":
      await page.locator(target).hover();
      break;
    case "click":
      await page.locator(target).click();
      break;
    case "focus":
      await page.locator(target).focus();
      break;
    case "type":
      await page.locator(target).fill(String(it.value ?? ""));
      break;
    case "toggle-pressed":
      await page.locator(target).evaluate((el) => el.setAttribute("aria-pressed", "true"));
      break;
    case "set-value":
      await page
        .locator(target)
        .evaluate((el, v) => el.style.setProperty("--gc-meter-value", `${v}%`), String(it.value));
      break;
    case "wait":
      await page.waitForTimeout(Number(it.value) || 0);
      break;
    case "noop":
      break;
    default:
      throw new Error(`runner has no implementation for action "${it.action}"`);
  }
}

// The manifest records every scenario, theme, viewport, and checkpoint case,
// so the single-declaration mutation test can observe the matrix directly.
const manifest = [];
const goldenCounts = { pass: 0, awaiting: 0, failure: 0 };

test.beforeAll(() => {
  writeFileSync(
    RUN_STATE,
    JSON.stringify(
      { version: 1, runId: RUN_ID, startedAt: new Date().toISOString() },
      null,
      2,
    ) + "\n",
  );
});

for (const c of cases) {
  test(
    `${c.id} [${c.theme}] [${c.viewport.name}] ${c.checkpoint.name}`,
    async ({ page }) => {
      await page.setViewportSize({
        width: c.viewport.width,
        height: c.viewport.height,
      });
      await page.goto(PAGE, { waitUntil: "networkidle" });
      await page.locator(`[data-scenario="${c.id}"]`).waitFor({ state: "visible" });
      await page.addStyleTag({
        content: ":where(*, *::before, *::after) { transition: none !important; animation: none !important; }",
      });

      // Set this case's theme on the root, then let transitions settle.
      await page.evaluate((t) => {
        document.documentElement.dataset.gcTheme = t;
      }, c.theme);
      await page.waitForTimeout(160);

      // Run the interactions this checkpoint is declared "after", in order.
      for (const interaction of resolveCheckpointInteractions(
        c.scenario,
        c.checkpoint,
      )) {
        await runInteraction(page, c.id, interaction);
      }
      await page.waitForTimeout(80);

      // Membership is sampled from the exact interacted state photographed
      // below. The shared case loop makes capture and classification one
      // traversal and the report asserts that all matrix cases contributed.
      const membershipSample = await page.evaluate(inspectRenderedSpecimen, {
        scenarioId: c.id,
        declarations: SEMANTIC_DECLARATIONS,
      });
      recordMembershipSample(membershipCollector, c, membershipSample);

      const rel = captureIdentity(c);
      const candidatePath = join(CANDIDATES, rel);
      const approvedPath = join(APPROVED, rel);
      mkdirSync(dirname(candidatePath), { recursive: true });

      const png = await page
        .locator(`[data-scenario="${c.id}"] .gc-specimen`)
        .screenshot({ type: "png", animations: "disabled" });
      writeFileSync(candidatePath, png);

      if (CAPTURE) {
        manifest.push({
          id: c.id,
          theme: c.theme,
          viewport: c.viewport.name,
          checkpoint: c.checkpoint.name,
          capture: rel,
          golden: "captured",
        });
        return;
      }

      const result = compareCapture(png, {
        approvedPath,
        caseId: rel,
        manifest: approvalManifest,
      });
      goldenCounts[result.status]++;
      manifest.push({
        id: c.id,
        theme: c.theme,
        viewport: c.viewport.name,
        checkpoint: c.checkpoint.name,
        capture: rel,
        golden: result.status,
        reason: result.reason,
      });
      if (result.status === "failure") {
        const pixelDetail = result.diffPixels >= 0
          ? `: ${result.diffPixels}/${result.total} pixels (${(result.ratio * 100).toFixed(2)}%)`
          : "";
        throw new Error(`golden ${result.reason} for ${rel}${pixelDetail}`);
      }
    },
  );
}

// After the run, persist the executed matrix for inspection/mutation tests.
test.afterAll(async () => {
  mkdirSync(CANDIDATES, { recursive: true });
  writeFileSync(join(CANDIDATES, "matrix.json"), JSON.stringify(manifest, null, 2) + "\n");
  const membershipReport = buildMembershipReport(membershipCollector, {
    runId: RUN_ID,
  });
  writeFileSync(
    join(ROOT, "runner/membership.json"),
    JSON.stringify(membershipReport, null, 2) + "\n",
  );
  const coverage = membershipReport.coverage;
  console.log(
    `\nmembership: ${coverage.designedPairIdentities} designed identities; ${coverage.distinctObservedIdentities} distinct observed; ${coverage.totalObservations} total observations; ${Object.values(coverage.exclusionsByReason).reduce((sum, count) => sum + count, 0)} exclusions; ${coverage.unclassifiedObservations} unclassified`,
  );
  if (!CAPTURE) {
    console.log(
      `\ngoldens: ${goldenCounts.pass} approved pass, ${goldenCounts.awaiting} awaiting operator approval, ${goldenCounts.failure} failure`,
    );
  }
  if (membershipReport.failures.length) {
    throw new Error(
      `membership: ${membershipReport.failures.length} unclassified observation(s):\n  ` +
        membershipReport.failures.map((failure) => {
          const context = [
            failure.scenario,
            failure.theme,
            failure.viewport,
            failure.checkpoint,
          ].filter(Boolean).join("/");
          return `${context ? `${context}: ` : ""}${failure.detail}`;
        }).join("\n  "),
    );
  }
});
