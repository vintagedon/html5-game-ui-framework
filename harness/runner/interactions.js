/**
 * Script Name : interactions.js
 * Description : Apply synchronous specimen state changes in the browser.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * These functions are self-contained so Playwright can serialize them into the
 * page. They are also pure enough to exercise with the unit-test DOM stand-in.
 */

/** Mark a rendered toggle as selected. */
export function applyTogglePressed(element) {
  element.setAttribute("aria-pressed", "true");
}

/** Keep a rendered meter's visual, visible, and accessible values in sync. */
export function applyMeterValue(meter, value) {
  const fill = meter.querySelector(".gc-meter__fill");
  const display = meter.parentElement?.querySelector("[data-meter-display]");
  if (!fill || !display) {
    throw new Error("meter state requires a fill and visible display");
  }
  const normalized = String(value);
  fill.style.setProperty("--gc-meter-value", `${normalized}%`);
  display.textContent = `${normalized}%`;
  meter.setAttribute("aria-valuenow", normalized);
}
