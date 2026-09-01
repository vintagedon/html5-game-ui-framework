/**
 * Script Name : reference.js
 * Description : Build the registry-driven reference views and switch themes by root attribute.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * The page carries no per-scenario and no per-section markup. This module
 * imports the single registry declaration and the shared renderer, builds the
 * navigation tree from the registry's section roster, routes hash locations
 * (`#/` for the landing view, `#/<section-id>` for a section view) with no
 * build step, renders each view's scenarios from the declaration, generates
 * the theme toolbar from the registry's theme roster, and switches themes by
 * setting data-gc-theme on <html> with no reload. The landing view also
 * surfaces the computed metrics block (generated at build time) and the
 * dependency-audit result, both of which read the same registry.
 */

import { registry } from "../harness/registry/scenarios.js";
import { scenarioSection } from "../harness/app/render.js";
import { audit } from "../harness/auditor/auditor.js";

const root = document.documentElement;

function scenariosInSection(sectionId) {
  return registry.scenarios.filter((s) => s.section === sectionId);
}

/** The routed section id, or "" for the landing view. Unknown hashes land. */
function activeSectionId() {
  const route = decodeURIComponent(location.hash.replace(/^#\/?/, "")).replace(/\/+$/, "");
  return registry.sections.some((s) => s.id === route) ? route : "";
}

function buildThemeToolbar() {
  const toolbar = document.getElementById("theme-toolbar");
  const status = document.createElement("span");
  status.className = "theme-status";
  status.setAttribute("aria-live", "polite");

  function selectTheme(theme) {
    root.dataset.gcTheme = theme;
    status.innerHTML = "";
    status.append("Theme: ", Object.assign(document.createElement("strong"), { textContent: theme }));
    for (const btn of toolbar.querySelectorAll("[data-theme-choice]")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.themeChoice === theme));
    }
  }

  for (const theme of registry.themes) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gc-button";
    btn.dataset.themeChoice = theme;
    btn.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
    btn.addEventListener("click", () => selectTheme(theme));
    toolbar.append(btn);
  }
  toolbar.append(status);
  selectTheme(root.dataset.gcTheme || registry.themes[0]);
}

/** The persistent indented nav tree: roster sections, active one expanded. */
function buildNav() {
  const nav = document.getElementById("reference-nav");
  const home = document.createElement("a");
  home.className = "reference-nav__home";
  home.href = "#/";
  home.textContent = "Overview";
  nav.append(home);

  for (const section of registry.sections) {
    const branch = document.createElement("div");
    branch.className = "reference-nav__branch";
    branch.dataset.navBranch = section.id;

    const link = document.createElement("a");
    link.className = "reference-nav__section-link";
    link.href = `#/${section.id}`;
    link.dataset.navSection = section.id;
    link.textContent = section.title;
    branch.append(link);

    const items = document.createElement("ul");
    items.className = "reference-nav__items";
    for (const scenario of scenariosInSection(section.id)) {
      const item = document.createElement("li");
      const itemLink = document.createElement("a");
      itemLink.className = "reference-nav__item-link";
      itemLink.href = `#/${section.id}`;
      itemLink.dataset.scenarioNav = scenario.id;
      itemLink.textContent = scenario.title;
      item.append(itemLink);
      items.append(item);
    }
    branch.append(items);
    nav.append(branch);
  }

  // A second-level click keeps the section route and scrolls to its scenario.
  nav.addEventListener("click", (event) => {
    const link = event.target.closest("[data-scenario-nav]");
    if (!link) return;
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) return;
    const target = document.querySelector(`[data-scenario="${link.dataset.scenarioNav}"]`);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ block: "start" });
  });
}

/** The landing view's section cards, each with its registry-derived count. */
function buildLanding() {
  const grid = document.getElementById("section-index-grid");
  for (const section of registry.sections) {
    const card = document.createElement("article");
    card.className = "section-card";
    card.dataset.navSection = section.id;

    const heading = document.createElement("h3");
    heading.textContent = section.title;

    const summary = document.createElement("p");
    summary.className = "section-copy";
    summary.textContent = section.summary;

    const count = document.createElement("span");
    count.className = "section-card-count";
    count.dataset.sectionCount = section.id;
    count.textContent = `${scenariosInSection(section.id).length} specimen(s)`;

    const link = document.createElement("a");
    link.className = "section-card-link";
    link.href = `#/${section.id}`;
    link.dataset.navSection = section.id;
    link.textContent = `Open ${section.title}`;

    card.append(heading, summary, count, link);
    grid.append(card);
  }
  document.getElementById("section-index").hidden = false;
}

function updateNavState(sectionId) {
  for (const branch of document.querySelectorAll("[data-nav-branch]")) {
    const active = branch.dataset.navBranch === sectionId;
    branch.dataset.active = String(active);
    const link = branch.querySelector(".reference-nav__section-link");
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  const home = document.querySelector(".reference-nav__home");
  if (sectionId) home.removeAttribute("aria-current");
  else home.setAttribute("aria-current", "page");
}

function renderSectionHead(sectionId) {
  const head = document.getElementById("section-view-head");
  head.replaceChildren();
  const section = registry.sections.find((s) => s.id === sectionId);
  if (!section) return;
  const heading = document.createElement("h2");
  heading.className = "section-heading";
  heading.textContent = section.title;
  const summary = document.createElement("p");
  summary.className = "section-copy";
  summary.textContent = section.summary;
  head.append(heading, summary);
}

/** Hash routing: one shell, landing or one section view, no reload. */
function renderView() {
  const sectionId = activeSectionId();
  const landing = document.getElementById("view-landing");
  const sectionView = document.getElementById("view-section");

  if (sectionId) {
    landing.hidden = true;
    const host = document.getElementById("scenarios");
    host.replaceChildren();
    for (const scenario of scenariosInSection(sectionId)) {
      host.append(scenarioSection(scenario));
    }
    renderSectionHead(sectionId);
    sectionView.hidden = false;
  } else {
    sectionView.hidden = true;
    landing.hidden = false;
  }
  updateNavState(sectionId);

}

function metricCard({ label, value, scope }) {
  const card = document.createElement("div");
  card.className = "metric-card";
  const v = document.createElement("span");
  v.className = "metric-value";
  v.textContent = String(value);
  const l = document.createElement("span");
  l.className = "metric-label";
  l.textContent = label;
  card.append(v, l);
  if (scope) {
    const s = document.createElement("span");
    s.className = "metric-scope";
    s.textContent = scope;
    card.append(s);
  }
  return card;
}

async function buildMetrics() {
  const section = document.getElementById("metrics");
  const grid = document.getElementById("metrics-grid");
  try {
    const res = await fetch("../harness/metrics/metrics.json", { cache: "no-cache" });
    if (!res.ok) return;
    const data = await res.json();
    grid.innerHTML = "";
    for (const m of data.metrics || []) grid.append(metricCard(m));
    if (data.generatedAt) {
      const stamp = document.createElement("p");
      stamp.className = "section-copy";
      stamp.textContent = `Generated ${data.generatedAt} from ${data.scopeSummary || "the resolved framework paths"}.`;
      grid.before(stamp);
    }
    section.hidden = false;
  } catch {
    // Metrics are a build artifact; absent until `npm run metrics` runs.
  }
}

function buildAuditor() {
  const section = document.getElementById("auditor");
  const body = document.getElementById("auditor-body");
  const result = audit(registry);
  body.innerHTML = "";

  const summary = document.createElement("p");
  summary.className = "section-copy";
  summary.textContent = result.summary;
  body.append(summary);

  if (result.violations.length) {
    const list = document.createElement("ul");
    list.className = "audit-violations";
    for (const v of result.violations) {
      const li = document.createElement("li");
      li.textContent = v;
      list.append(li);
    }
    body.append(list);
  }
  section.hidden = false;
}

buildThemeToolbar();
buildNav();
buildLanding();
buildAuditor();
buildMetrics();
renderView();
window.addEventListener("hashchange", renderView);
