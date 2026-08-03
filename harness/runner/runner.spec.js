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
 * declared theme. No scenario id, interaction, or viewport is written literally
 * here — they all come from the registry. The Gate 2.4 mutation test relies on
 * that: changing a scenario's theme coverage in the registry changes both the
 * rendered page and this runner's executed matrix.
 *
 * Modes:
 *   GC_CAPTURE=1  write candidate captures; do not fail on a missing/diffing
 *                 approved baseline (first-run candidate generation).
 *   (default)     compare each candidate against the approved baseline; fail on
 *                 a diff. A missing baseline is reported, not fatal, until the
 *                 operator approves goldens (agents never write the approved path).
 */

import { test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "../registry/scenarios.js";
import { compareCapture } from "./compare.js";

const CAPTURE = !!process.env.GC_CAPTURE;
const BASE = process.env.GC_BASE_URL || "http://127.0.0.1:8123";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CANDIDATES = join(ROOT, "goldens/candidates");
const APPROVED = join(ROOT, "goldens/approved");
const PAGE = `${BASE}/reference/`;

// One case per (scenario × theme × checkpoint), all sourced from the registry.
const cases = [];
for (const s of registry.scenarios) {
  for (const theme of s.themes) {
    for (const cp of s.checkpoints) {
      cases.push({ id: s.id, theme, checkpoint: cp.name, scenario: s, after: cp.after });
    }
  }
}

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

// The manifest records every (scenario, theme, checkpoint) the runner executed,
// so the single-declaration mutation test can observe the matrix directly.
const manifest = [];

for (const c of cases) {
  test(`${c.id} [${c.theme}] ${c.checkpoint}`, async ({ page }) => {
    await page.goto(PAGE, { waitUntil: "networkidle" });
    await page.locator(`[data-scenario="${c.id}"]`).waitFor({ state: "visible" });

    // Set this case's theme on the root, then let transitions settle.
    await page.evaluate((t) => {
      document.documentElement.dataset.gcTheme = t;
    }, c.theme);
    await page.waitForTimeout(160);

    // Run the interactions this checkpoint is declared "after", in order.
    for (const name of c.after) {
      const it = c.scenario.interactions.find((i) => i.name === name);
      if (it) await runInteraction(page, c.id, it);
    }
    await page.waitForTimeout(80);

    const rel = `${c.id}/${c.theme}/${c.checkpoint}.png`;
    const candidatePath = join(CANDIDATES, rel);
    const approvedPath = join(APPROVED, rel);
    mkdirSync(dirname(candidatePath), { recursive: true });

    const png = await page
      .locator(`[data-scenario="${c.id}"] .gc-specimen`)
      .screenshot({ type: "png", animations: "disabled" });
    writeFileSync(candidatePath, png);

    manifest.push({ id: c.id, theme: c.theme, checkpoint: c.checkpoint });

    if (CAPTURE) return; // candidate generation: no comparison

    const result = compareCapture(png, approvedPath);
    if (result.status === "diff") {
      throw new Error(
        `golden diff for ${rel}: ${result.diffPixels}/${result.total} pixels (${(result.ratio * 100).toFixed(2)}%)`,
      );
    }
    if (result.status === "size") {
      throw new Error(`golden size mismatch for ${rel}`);
    }
    // "awaiting" (no approved baseline yet) is non-fatal until goldens are approved.
  });
}

// After the run, persist the executed matrix for inspection/mutation tests.
test.afterAll(async () => {
  mkdirSync(CANDIDATES, { recursive: true });
  writeFileSync(join(CANDIDATES, "matrix.json"), JSON.stringify(manifest, null, 2) + "\n");
});
