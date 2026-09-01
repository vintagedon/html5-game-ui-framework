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
