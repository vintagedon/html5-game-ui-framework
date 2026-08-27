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
 * Golden model: a case with no recorded baseline establishes one (the only
 * write a run performs); a case whose capture disagrees with its baseline
 * fails and surfaces its diff. No code path here rewrites or deletes an
 * existing baseline PNG or manifest entry. `GC_CAPTURE=1` behaves the same;
 * every run captures, compares, and establishes what is missing.
 */

import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { registry } from "../registry/scenarios.js";
import {
  compareCapture,
  establishBaseline,
  readApprovalManifest,
  writeManifestEntries,
} from "./compare.js";
import {
  buildCases,
  captureIdentity,
  resolveCheckpointInteractions,
} from "./cases.js";
import { semanticDeclarations } from "../metrics/contrast.js";
import { designedPairs } from "../metrics/pairings.js";
import { moduleResponseFailure } from "./smoke-assertions.js";
import {
  buildMembershipReport,
  createMembershipCollector,
  inspectRenderedSpecimen,
  recordMembershipSample,
} from "./membership.js";
import { applyMeterValue, applyTogglePressed } from "./interactions.js";

const BASE = process.env.GC_BASE_URL || "http://127.0.0.1:8123";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CANDIDATES = join(ROOT, "goldens/candidates");
const APPROVED = join(ROOT, "goldens/approved");
const PAGE = `${BASE}/reference/`;
const RUN_ID = randomUUID();
const RUN_STATE = join(ROOT, "runner/playwright-run.json");
const approvalManifest = readApprovalManifest();
// Baselines established during this run, merged once in afterAll. A run
// performs no other write into the approved tree or the manifest.
const establishedEntries = [];

// One case per scenario x theme x viewport x checkpoint, all registry-sourced.
const cases = buildCases(registry);
const METER_SCENARIOS = registry.scenarios.filter((s) => s.specimen === "meter");
const QUANTIZED_SAMPLES = METER_SCENARIOS.flatMap((s) =>
  (s.config.samples || [])
    .filter((m) => m.shape === "segmented" || m.shape === "pips")
    .map((m) => ({ scenarioId: s.id, variant: m.variant, shape: m.shape })),
);
const TRAIL_SAMPLES = METER_SCENARIOS.flatMap((s) =>
  (s.config.samples || [])
    .filter((m) => m.trail != null)
    .map((m) => ({ scenarioId: s.id, variant: m.variant })),
);
const SETTLE_STYLE =
  ":where(*, *::before, *::after) { transition: none !important; animation: none !important; }";
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

/** The section view URL that renders one scenario, straight from the registry. */
function sectionUrl(sectionId) {
  return `${PAGE}#/${sectionId}`;
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
      await page.locator(target).evaluate(applyTogglePressed);
      break;
    case "set-value":
      await page
        .locator(target)
        .evaluate(applyMeterValue, String(it.value));
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
const goldenCounts = { pass: 0, established: 0, failure: 0 };

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
      await page.goto(sectionUrl(c.scenario.section), { waitUntil: "networkidle" });
      await page.locator(`[data-scenario="${c.id}"]`).waitFor({ state: "visible" });
      await page.addStyleTag({ content: SETTLE_STYLE });

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

      const result = compareCapture(png, {
        approvedPath,
        caseId: rel,
        manifest: approvalManifest,
      });

      if (result.status === "unrecorded") {
        // The one write a run performs: establish an absent baseline.
        establishedEntries.push(
          establishBaseline({ approvedPath, caseId: rel, candidatePng: png, manifest: approvalManifest }),
        );
      }

      goldenCounts[result.status === "unrecorded" ? "established" : result.status]++;
      manifest.push({
        id: c.id,
        theme: c.theme,
        viewport: c.viewport.name,
        checkpoint: c.checkpoint.name,
        capture: rel,
        golden: result.status === "unrecorded" ? "established" : result.status,
        reason: result.reason,
      });
      if (result.status === "failure") {
        if (result.diffPng) {
          writeFileSync(
            join(CANDIDATES, `${rel.replace(/\.png$/, "")}.diff.png`),
            PNG.sync.write(result.diffPng),
          );
        }
        const pixelDetail = result.diffPixels >= 0
          ? `: ${result.diffPixels}/${result.total} pixels (${(result.ratio * 100).toFixed(2)}%)`
          : "";
        throw new Error(`golden ${result.reason} for ${rel}${pixelDetail}`);
      }
    },
  );
}

// Meter family synchronization. These run where a drift would otherwise fail
// silently: in the browser, against computed geometry, for every registered
// shape and orientation. Targets derive from the registry, never a fixed list.
test("meter fill geometry, visible text, and accessible value agree across the family", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const observations = [];
  for (const section of registry.sections) {
    const scenarios = METER_SCENARIOS.filter((s) => s.section === section.id);
    if (!scenarios.length) continue;
    await page.goto(sectionUrl(section.id), { waitUntil: "networkidle" });
    await page.addStyleTag({ content: SETTLE_STYLE });
    for (const scenario of scenarios) {
      await page.locator(`[data-scenario="${scenario.id}"]`).waitFor({ state: "visible" });
    }

    observations.push(
      ...(await page.evaluate(() => {
        // Pips clip their paint rather than their box, so a pip fill's honest
        // geometry is how many unit centers it still hit-tests over; segmented
        // and continuous fills size their box directly.
        const filledUnits = (meter, fill, vertical, count) => {
          const box = meter.getBoundingClientRect();
          const style = getComputedStyle(meter);
          // Probes resolve against the fill's box, which is the meter's content
          // box: the border belongs to the track, not to any unit.
          const innerW = box.width - Number.parseFloat(style.borderLeftWidth) - Number.parseFloat(style.borderRightWidth);
          const innerH = box.height - Number.parseFloat(style.borderTopWidth) - Number.parseFloat(style.borderBottomWidth);
          let filled = 0;
          for (let i = 0; i < count; i += 1) {
            const x = vertical ? box.x + box.width / 2 : box.x + Number.parseFloat(style.borderLeftWidth) + ((i + 0.5) * innerW) / count;
            const y = vertical
              ? box.y + box.height - Number.parseFloat(style.borderBottomWidth) - ((i + 0.5) * innerH) / count
              : box.y + box.height / 2;
            const hit = document.elementFromPoint(x, y);
            if (hit && (hit === fill || fill.contains(hit))) filled += 1;
          }
          return filled;
        };
        const fillFraction = (meter, fill, vertical) => {
          const box = meter.getBoundingClientRect();
          const style = getComputedStyle(meter);
          const inner = vertical
            ? box.height - Number.parseFloat(style.borderTopWidth) - Number.parseFloat(style.borderBottomWidth)
            : box.width - Number.parseFloat(style.borderLeftWidth) - Number.parseFloat(style.borderRightWidth);
          const fillBox = fill.getBoundingClientRect();
          return vertical ? fillBox.height / inner : fillBox.width / inner;
        };
        const out = [];
        for (const sectionElement of document.querySelectorAll("[data-scenario]")) {
          for (const meter of sectionElement.querySelectorAll(".gc-meter")) {
            meter.scrollIntoView({ block: "center", inline: "center" });
            const fill = meter.querySelector(".gc-meter__fill");
            const display = meter.parentElement?.querySelector("[data-meter-display]");
            const shape = meter.dataset.shape || "continuous";
            const vertical = meter.dataset.orientation === "vertical";
            const countRaw = getComputedStyle(meter).getPropertyValue("--gc-meter-count").trim();
            const count = countRaw ? Number(countRaw) : null;
            const fraction = shape === "pips"
              ? filledUnits(meter, fill, vertical, count) / count
              : fillFraction(meter, fill, vertical);
            out.push({
              scenario: sectionElement.dataset.scenario,
              variant: meter.dataset.variant,
              shape,
              orientation: meter.dataset.orientation || "horizontal",
              aria: Number(meter.getAttribute("aria-valuenow")),
              displayText: display ? display.textContent : null,
              fraction,
              count,
            });
          }
        }
        return out;
      })),
    );
  }

  expect(observations.length).toBeGreaterThan(0);
  const seen = new Set();
  for (const o of observations) {
    const where = `${o.scenario}/${o.variant} (${o.shape}/${o.orientation})`;
    expect(o.displayText, `${where} display text`).toBe(`${o.aria}%`);
    const expectedFraction = o.count
      ? Math.round((o.count * o.aria) / 100) / o.count
      : o.aria / 100;
    expect(
      Math.abs(o.fraction - expectedFraction),
      `${where} fill geometry vs accessible value`,
    ).toBeLessThan(0.01);
    seen.add(`${o.shape}/${o.orientation}`);
  }
  for (const coverage of [
    "continuous/horizontal",
    "segmented/horizontal",
    "pips/horizontal",
    "continuous/vertical",
    "segmented/vertical",
    "pips/vertical",
  ]) {
    expect(seen.has(coverage), `geometry must be observed for ${coverage}`).toBe(true);
  }
});

test("meter labels and values remain compositionally separated", async ({ page }) => {
  const verticalScenario = METER_SCENARIOS.find((s) =>
    (s.config.samples || []).some((sample) => sample.orientation === "vertical"),
  );
  expect(verticalScenario, "a vertical meter scenario must be registered").toBeTruthy();

  const seen = new Set();
  for (const viewport of verticalScenario.viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(sectionUrl(verticalScenario.section), { waitUntil: "networkidle" });
    await page.addStyleTag({ content: SETTLE_STYLE });

    for (const theme of verticalScenario.themes) {
      await page.evaluate((nextTheme) => {
        document.documentElement.dataset.gcTheme = nextTheme;
      }, theme);

      const readings = await page.evaluate(() =>
        [...document.querySelectorAll(".gc-meter")].map((meter) => {
          const labelRegion = meter.parentElement?.querySelector(".meter-label");
          const label = labelRegion?.querySelector("span:not([data-meter-display])");
          const value = labelRegion?.querySelector("[data-meter-display]");
          const labelBox = label?.getBoundingClientRect();
          const valueBox = value?.getBoundingClientRect();
          const inlineGap = labelBox && valueBox
            ? Math.max(valueBox.left - labelBox.right, labelBox.left - valueBox.right)
            : 0;
          const blockGap = labelBox && valueBox
            ? Math.max(valueBox.top - labelBox.bottom, labelBox.top - valueBox.bottom)
            : 0;
          const labelText = label?.textContent || "";
          const valueText = value?.textContent || "";

          return {
            variant: meter.dataset.variant,
            orientation: meter.dataset.orientation || "horizontal",
            distinctNodes: Boolean(label && value && label !== value),
            separation: Math.max(inlineGap, blockGap),
            abuttedText: labelRegion?.textContent === `${labelText}${valueText}`,
          };
        }),
      );

      for (const reading of readings) {
        const where = `${theme}/${viewport.name}/${reading.variant}/${reading.orientation}`;
        expect.soft(reading.distinctNodes, `${where}: label and value nodes`).toBe(true);
        expect.soft(reading.separation, `${where}: rendered label/value separation`).toBeGreaterThan(0);
        expect.soft(
          reading.abuttedText && reading.separation <= 0,
          `${where}: text must not read as <name><digits>% without whitespace or a box gap`,
        ).toBe(false);
        seen.add(`${theme}/${viewport.name}/${reading.orientation}`);
      }
    }
  }

  for (const theme of verticalScenario.themes) {
    for (const viewport of verticalScenario.viewports) {
      for (const orientation of ["horizontal", "vertical"]) {
        expect(
          seen.has(`${theme}/${viewport.name}/${orientation}`),
          `composition must cover ${theme}/${viewport.name}/${orientation}`,
        ).toBe(true);
      }
    }
  }
});

test("segmented and pip fills land on whole units at empty, partial, and full values", async ({ page }) => {
  expect(QUANTIZED_SAMPLES.length).toBeGreaterThan(0);
  await page.setViewportSize({ width: 1280, height: 800 });
  const sections = [...new Set(
    QUANTIZED_SAMPLES.map((t) => registry.scenarios.find((s) => s.id === t.scenarioId).section),
  )];

  for (const sectionId of sections) {
    const targets = QUANTIZED_SAMPLES.filter(
      (t) => registry.scenarios.find((s) => s.id === t.scenarioId).section === sectionId,
    );
    await page.goto(sectionUrl(sectionId), { waitUntil: "networkidle" });
    await page.addStyleTag({ content: SETTLE_STYLE });

    for (const value of [0, 43, 100]) {
      for (const target of targets) {
        await page
          .locator(`[data-scenario="${target.scenarioId}"] .gc-meter[data-variant="${target.variant}"]`)
          .evaluate(applyMeterValue, String(value));
      }
      const readings = await page.evaluate((targets) => {
        const filledUnits = (meter, fill, vertical, count) => {
          const box = meter.getBoundingClientRect();
          const style = getComputedStyle(meter);
          const innerW = box.width - Number.parseFloat(style.borderLeftWidth) - Number.parseFloat(style.borderRightWidth);
          const innerH = box.height - Number.parseFloat(style.borderTopWidth) - Number.parseFloat(style.borderBottomWidth);
          let filled = 0;
          for (let i = 0; i < count; i += 1) {
            const x = vertical ? box.x + box.width / 2 : box.x + Number.parseFloat(style.borderLeftWidth) + ((i + 0.5) * innerW) / count;
            const y = vertical
              ? box.y + box.height - Number.parseFloat(style.borderBottomWidth) - ((i + 0.5) * innerH) / count
              : box.y + box.height / 2;
            const hit = document.elementFromPoint(x, y);
            if (hit && (hit === fill || fill.contains(hit))) filled += 1;
          }
          return filled;
        };
        const out = [];
        for (const target of targets) {
          const meter = document.querySelector(
            `[data-scenario="${target.scenarioId}"] .gc-meter[data-variant="${target.variant}"]`,
          );
          meter.scrollIntoView({ block: "center", inline: "center" });
          const fill = meter.querySelector(".gc-meter__fill");
          const shape = meter.dataset.shape || "continuous";
          const vertical = meter.dataset.orientation === "vertical";
          const count = Number(getComputedStyle(meter).getPropertyValue("--gc-meter-count").trim());
          let fraction;
          let units;
          if (shape === "pips") {
            units = filledUnits(meter, fill, vertical, count);
            fraction = units / count;
          } else {
            const box = meter.getBoundingClientRect();
            const style = getComputedStyle(meter);
            const fillBox = fill.getBoundingClientRect();
            fraction = vertical
              ? fillBox.height / (box.height - Number.parseFloat(style.borderTopWidth) - Number.parseFloat(style.borderBottomWidth))
              : fillBox.width / (box.width - Number.parseFloat(style.borderLeftWidth) - Number.parseFloat(style.borderRightWidth));
            units = fraction * count;
          }
          out.push({
            ...target,
            shape,
            value: Number(meter.getAttribute("aria-valuenow")),
            count,
            fraction,
            units,
          });
        }
        return out;
      }, targets);

      for (const r of readings) {
        const where = `${r.scenarioId}/${r.variant} (${r.shape}) at ${r.value}%`;
        const expectedUnits = Math.round((r.count * r.value) / 100);
        if (r.shape === "pips") {
          expect(r.units, `${where} filled pip count`).toBe(expectedUnits);
        } else {
          expect(Math.abs(r.units - expectedUnits), `${where} filled segment count`).toBeLessThan(0.05);
        }
        if (r.value === 0) {
          expect(r.units, `${where} must show no partial artifact when empty`).toBe(0);
        }
        if (r.value === 100) {
          expect(r.units, `${where} must fill every unit without an end artifact`).toBe(r.count);
        }
      }
    }
  }
});

test("the damage trail keeps the previous value's geometry while the fill moves", async ({ page }) => {
  expect(TRAIL_SAMPLES.length).toBeGreaterThan(0);
  await page.setViewportSize({ width: 1280, height: 800 });
  const trailSection = registry.scenarios.find(
    (s) => s.id === TRAIL_SAMPLES[0].scenarioId,
  ).section;
  await page.goto(sectionUrl(trailSection), { waitUntil: "networkidle" });
  await page.addStyleTag({ content: SETTLE_STYLE });

  const before = await page.evaluate((targets) => targets.map((target) => {
    const meter = document.querySelector(
      `[data-scenario="${target.scenarioId}"] .gc-meter[data-variant="${target.variant}"]`,
    );
    return { ...target, previous: Number(meter.getAttribute("aria-valuenow")) };
  }), TRAIL_SAMPLES);

  for (const target of before) {
    await page
      .locator(`[data-scenario="${target.scenarioId}"] .gc-meter[data-variant="${target.variant}"]`)
      .evaluate(applyMeterValue, "38");
  }

  const readings = await page.evaluate((targets) => {
    const out = [];
    for (const target of targets) {
      const meter = document.querySelector(
        `[data-scenario="${target.scenarioId}"] .gc-meter[data-variant="${target.variant}"]`,
      );
      const fill = meter.querySelector(".gc-meter__fill");
      const trail = meter.querySelector(".gc-meter__trail");
      const trackBox = meter.getBoundingClientRect();
      out.push({
        ...target,
        aria: Number(meter.getAttribute("aria-valuenow")),
        fillFraction: fill.getBoundingClientRect().width / trackBox.width,
        trailFraction: trail.getBoundingClientRect().width / trackBox.width,
      });
    }
    return out;
  }, TRAIL_SAMPLES);

  for (const r of readings) {
    const target = before.find((b) => b.scenarioId === r.scenarioId && b.variant === r.variant);
    const where = `${r.scenarioId}/${r.variant}`;
    expect(r.aria, `${where} accessible value`).toBe(38);
    expect(Math.abs(r.fillFraction - 0.38), `${where} fill geometry`).toBeLessThan(0.01);
    expect(
      Math.abs(r.trailFraction - target.previous / 100),
      `${where} trail holds the previous value`,
    ).toBeLessThan(0.01);
  }
});

// Section navigation. The walk is registry-driven: every scenario must be
// reachable from the landing view in at most two clicks (section link, then
// scenario link), the theme toolbar must switch themes in every view, and the
// walk itself must stay clean of console errors, module failures, and
// off-origin requests.
test("every scenario is reachable from the landing view in at most two clicks", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const consoleErrors = [];
  const moduleFailures = [];
  const offOriginRequests = [];
  const origin = new URL(PAGE).origin;
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`page error: ${error.message}`));
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== origin) {
      offOriginRequests.push(request.url());
    }
  });
  page.on("response", (response) => {
    const failure = moduleResponseFailure({
      url: response.url(),
      status: response.status(),
      resourceType: response.request().resourceType(),
      contentType: response.headers()["content-type"] || "",
    });
    if (failure) moduleFailures.push(failure);
  });

  await page.goto(PAGE, { waitUntil: "networkidle" });

  // The landing view carries no scenario sections; it lists the roster.
  const landingScenarioCount = await page.locator("#scenarios [data-scenario]").count();
  expect(landingScenarioCount).toBe(0);

  async function switchThemeAndBack(viewLabel) {
    const before = await page.evaluate(() => document.documentElement.dataset.gcTheme);
    const controls = page.locator("[data-theme-choice]");
    const count = await controls.count();
    const target = before === registry.themes[0] && count > 1 ? registry.themes[1] : registry.themes[0];
    await page.locator(`[data-theme-choice="${target}"]`).click();
    const after = await page.evaluate(() => document.documentElement.dataset.gcTheme);
    expect(after, `${viewLabel}: theme toolbar must switch themes in place`).toBe(target);
    await page.locator(`[data-theme-choice="${before}"]`).click();
  }

  await switchThemeAndBack("landing");

  for (const section of registry.sections) {
    // Click one: the section link in the nav tree.
    await page.locator(`.reference-nav__section-link[data-nav-section="${section.id}"]`).click();
    await page.waitForURL(`**#/${section.id}`);

    const expected = registry.scenarios.filter((s) => s.section === section.id);
    for (const scenario of expected) {
      await page.locator(`[data-scenario="${scenario.id}"]`).waitFor({ state: "visible" });
    }
    const observedCount = await page.locator("#scenarios [data-scenario]").count();
    expect(observedCount, `section ${section.id} renders exactly its roster`).toBe(expected.length);

    // Click two: the scenario link in the expanded branch scrolls to it.
    if (expected.length) {
      await page.locator(`.reference-nav__item-link[data-scenario-nav="${expected[0].id}"]`).click();
      await page.locator(`[data-scenario="${expected[0].id}"]`).waitFor({ state: "visible" });
    }

    await switchThemeAndBack(`section ${section.id}`);
  }

  expect(consoleErrors, "console errors across the walk").toEqual([]);
  expect(moduleFailures, "module load failures across the walk").toEqual([]);
  expect(offOriginRequests, "off-origin requests across the walk").toEqual([]);
});

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
  if (establishedEntries.length) {
    const written = writeManifestEntries({ entries: establishedEntries });
    console.log(`goldens: recorded ${written.written} new baseline(s); manifest now holds ${written.totalEntries} entr(ies)`);
  }
  console.log(
    `\ngoldens: ${goldenCounts.pass} pass, ${goldenCounts.established} established, ${goldenCounts.failure} failure`,
  );
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
