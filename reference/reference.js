/**
 * Script Name : reference.js
 * Description : Build the registry-driven reference page and switch themes by root attribute.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * The page carries no per-scenario markup. This module imports the single
 * registry declaration and the shared renderer, builds a section per scenario,
 * generates the theme toolbar from the registry's theme roster, and switches
 * themes by setting data-gc-theme on <html> with no reload. It also surfaces the
 * computed metrics block (generated at build time) and the dependency-audit
 * result, both of which read the same registry.
 */

import { registry } from "../harness/registry/scenarios.js";
import { scenarioSection } from "../harness/app/render.js";
import { audit } from "../harness/auditor/auditor.js";

const root = document.documentElement;

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

function buildScenarios() {
  const host = document.getElementById("scenarios");
  for (const scenario of registry.scenarios) {
    host.append(scenarioSection(scenario));
  }
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
buildScenarios();
buildAuditor();
buildMetrics();
