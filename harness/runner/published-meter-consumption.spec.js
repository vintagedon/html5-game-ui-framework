/**
 * Script Name : published-meter-consumption.spec.js
 * Description : Verify discrete meter defaults through the public CSS entry.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-31
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * This test deliberately hand-writes its document and loads only src/gc.css.
 * It must not import the registry, renderer, or any harness helper, because
 * those paths supply the inline count channel that a consumer does not have.
 */

import { expect, test } from "@playwright/test";

test("published CSS quantizes hand-written segmented and pip meters at their defaults", async ({ page }) => {
  // Establish the served-source URL before replacing the document with consumer markup.
  await page.goto("/src/gc.css");
  await page.setContent(`
    <link rel="stylesheet" href="/src/gc.css">
    <div class="gc-meter" data-shape="segmented" style="inline-size: 320px">
      <div class="gc-meter__fill" style="--gc-meter-value: 63%"></div>
    </div>
    <div class="gc-meter" data-shape="pips" style="inline-size: 320px">
      <div class="gc-meter__fill" style="--gc-meter-value: 63%"></div>
    </div>
  `);

  await page.waitForFunction(() =>
    getComputedStyle(document.querySelector(".gc-meter")).borderLeftWidth !== "0px",
  );

  const readings = await page.evaluate(() =>
    [...document.querySelectorAll(".gc-meter")].map((meter) => {
      const fill = meter.querySelector(".gc-meter__fill");
      const count = Number(getComputedStyle(meter).getPropertyValue("--gc-meter-count").trim());
      const meterBox = meter.getBoundingClientRect();
      const meterStyle = getComputedStyle(meter);
      const borderStart = Number.parseFloat(meterStyle.borderLeftWidth);
      const innerWidth = meterBox.width
        - borderStart
        - Number.parseFloat(meterStyle.borderRightWidth);
      let filledUnits = 0;

      for (let index = 0; index < count; index += 1) {
        const x = meterBox.x + borderStart + ((index + 0.5) * innerWidth) / count;
        const y = meterBox.y + meterBox.height / 2;
        const hit = document.elementFromPoint(x, y);
        if (hit === fill || fill.contains(hit)) filledUnits += 1;
      }

      return { shape: meter.dataset.shape, count, filledUnits };
    }),
  );

  expect(readings).toEqual([
    { shape: "segmented", count: 8, filledUnits: 5 },
    { shape: "pips", count: 10, filledUnits: 6 },
  ]);
});

// The vertical segmented cross-axis defect was recorded with the baselines
// (PA-003): the generic segmented quantized inline-size leaked onto the
// vertical orientation's cross axis. This test loads only published source
// with hand-written consumer markup and asserts both axes of both layers.
test("published vertical segmented meters hold their cross axis across themes", async ({ page }) => {
  await page.goto("/src/gc.css");
  await page.setContent(`
    <link rel="stylesheet" href="/src/gc.css">
    <div id="consumer-meters"></div>
  `);

  const readings = await page.evaluate(async () => {
    const host = document.querySelector("#consumer-meters");
    const observe = () => {
      const meter = document.querySelector(".gc-meter[data-shape='segmented']");
      const fill = meter.querySelector(".gc-meter__fill");
      const trail = meter.querySelector(".gc-meter__trail");
      const box = meter.getBoundingClientRect();
      const style = getComputedStyle(meter);
      const innerWidth = box.width
        - Number.parseFloat(style.borderLeftWidth)
        - Number.parseFloat(style.borderRightWidth);
      const innerHeight = box.height
        - Number.parseFloat(style.borderTopWidth)
        - Number.parseFloat(style.borderBottomWidth);
      const fillBox = fill.getBoundingClientRect();
      const trailBox = trail.getBoundingClientRect();
      return {
        fillCrossAxis: fillBox.width / innerWidth,
        fillAlongAxis: fillBox.height / innerHeight,
        trailCrossAxis: trailBox.width / innerWidth,
        trailAlongAxis: trailBox.height / innerHeight,
      };
    };

    const out = [];
    for (const theme of ["modern", "arcade", "sci-fi", "fantasy"]) {
      document.documentElement.dataset.gcTheme = theme;
      for (const [fillValue, trailValue] of [[0, 0], [59, 75], [100, 100]]) {
        host.innerHTML = `
          <div class="gc-meter" data-shape="segmented" data-orientation="vertical">
            <div class="gc-meter__trail" style="--gc-meter-trail-value: ${trailValue}%"></div>
            <div class="gc-meter__fill" style="--gc-meter-value: ${fillValue}%"></div>
          </div>
        `;
        // Let the fill and trail transitions settle on their final geometry.
        await new Promise((resolve) => setTimeout(resolve, 700));
        out.push({ theme, fillValue, trailValue, ...observe() });
      }
    }
    return out;
  });

  expect(readings.length).toBe(12);
  for (const reading of readings) {
    const where = `${reading.theme} at ${reading.fillValue}%`;
    // Cross axis: fill and trail span the usable inner track width, which
    // excludes the track border, at every value including 0 and 100.
    expect(Math.abs(reading.fillCrossAxis - 1), `${where} fill cross axis`).toBeLessThan(0.02);
    expect(Math.abs(reading.trailCrossAxis - 1), `${where} trail cross axis`).toBeLessThan(0.02);
    // Along axis: quantized to whole units with floor semantics. 59% on an
    // eight-segment meter occupies four segments (50%), which distinguishes
    // floor from nearest rounding (five segments) and from unquantized 59%.
    const expectedFillUnits = Math.floor((8 * reading.fillValue) / 100);
    const expectedTrailUnits = Math.floor((8 * reading.trailValue) / 100);
    expect(
      Math.abs(reading.fillAlongAxis - expectedFillUnits / 8),
      `${where} fill along axis`,
    ).toBeLessThan(0.02);
    expect(
      Math.abs(reading.trailAlongAxis - expectedTrailUnits / 8),
      `${where} trail along axis`,
    ).toBeLessThan(0.02);
  }
});

// Vertical pips paint through clip-path on a full-box fill, so their cross
// axis is set by the same vertical fill rule. Recorded as checked and clean;
// asserted here so a future rule reorder cannot regress it silently.
test("published vertical pip meters hold their cross axis", async ({ page }) => {
  await page.goto("/src/gc.css");
  await page.setContent(`
    <link rel="stylesheet" href="/src/gc.css">
    <div class="gc-meter" data-shape="pips" data-orientation="vertical">
      <div class="gc-meter__fill" style="--gc-meter-value: 43%"></div>
    </div>
  `);

  await page.waitForFunction(() =>
    getComputedStyle(document.querySelector(".gc-meter")).borderLeftWidth !== "0px",
  );
  await page.waitForTimeout(700);

  const reading = await page.evaluate(() => {
    const meter = document.querySelector(".gc-meter");
    const fill = meter.querySelector(".gc-meter__fill");
    const box = meter.getBoundingClientRect();
    const style = getComputedStyle(meter);
    const innerWidth = box.width
      - Number.parseFloat(style.borderLeftWidth)
      - Number.parseFloat(style.borderRightWidth);
    return { crossAxis: fill.getBoundingClientRect().width / innerWidth };
  });
  expect(Math.abs(reading.crossAxis - 1)).toBeLessThan(0.02);
});
