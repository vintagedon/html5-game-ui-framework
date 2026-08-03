/**
 * Script Name : reference.js
 * Description : Switches the Phase 1 reference surface by root theme attribute.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * This temporary interaction contains no registry, persistence, fetch, or
 * stylesheet swapping. Phase 2 replaces the entire hand-authored surface.
 */

const root = document.documentElement;
const status = document.querySelector("[data-theme-status]");
const choices = document.querySelectorAll("[data-theme-choice]");

function selectTheme(theme) {
  root.dataset.gcTheme = theme;
  status.textContent = theme;

  for (const choice of choices) {
    const selected = choice.dataset.themeChoice === theme;
    choice.setAttribute("aria-pressed", String(selected));
  }
}

for (const choice of choices) {
  choice.addEventListener("click", () => selectTheme(choice.dataset.themeChoice));
}

selectTheme(root.dataset.gcTheme || "modern");
