/**
 * Script Name : metrics.js
 * Description : Compute the framework metrics block from the repository at build time.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * `npm run metrics`. Every number is computed, never typed by hand, and every
 * count cites the resolved scope in harness/metrics/scope.js. Two gates fail the
 * run: a non-zero framework raster count, and a contrast violation (a designed
 * pair below its threshold — text 4.5:1 or non-text 3:1 — or an undesigned
 * source pairing). Amendment 4 removed the former `nonTextAdvisory` bucket so
 * non-text failures exit non-zero like any other. Writes
 * harness/metrics/metrics.json for the reference page.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import CleanCSS from "clean-css";
import { minify } from "terser";
import { isRasterPath, listScopeFiles, scopeSummary, REPO_ROOT } from "./scope.js";
import { readCurrentMembership } from "./membership.js";
import { contrastGate } from "./contrast.js";
import { EXEMPTIONS } from "./pairings.js";
import { registry } from "../registry/scenarios.js";
import { audit } from "../auditor/auditor.js";

const files = listScopeFiles();
const membership = readCurrentMembership({
  runStatePath: join(REPO_ROOT, "harness/runner/playwright-run.json"),
  membershipPath: join(REPO_ROOT, "harness/runner/membership.json"),
});
const read = (rel) => readFileSync(join(REPO_ROOT, rel), "utf8");
const cssFiles = files.filter((f) => f.endsWith(".css"));
const jsFiles = files.filter((f) => f.endsWith(".js"));
const cssSource = cssFiles.map(read).join("\n");
const jsSource = jsFiles.map(read).join("\n");

// --- Size metrics ---
const rawCss = Buffer.byteLength(cssSource, "utf8");
const rawJs = Buffer.byteLength(jsSource, "utf8");
const minCss = Buffer.byteLength(new CleanCSS({ rebase: false, returnPromise: false }).minify(cssSource).styles || "", "utf8");
const minJs = Buffer.byteLength((await minify(jsSource, { compress: true, mangle: false })).code || "", "utf8");
const compressed = gzipSync(Buffer.from(cssSource + "\n" + jsSource, "utf8")).length;

// --- Counts (each cites its source) ---
const semanticCss = read("src/tokens/semantic.css").replace(/\/\*[\s\S]*?\*\//g, "");
const semanticTokens = new Set([...semanticCss.matchAll(/(--gc-[a-z0-9-]+)\s*:/g)].map((m) => m[1])).size;
const byLayer = (l) => registry.scenarios.filter((s) => s.layer === l).length;
const themeCount = registry.themes.length;
const scenarioCount = registry.scenarios.length;
const captureCount = registry.scenarios.reduce(
  (count, scenario) =>
    count + scenario.themes.length * scenario.viewports.length * scenario.checkpoints.length,
  0,
);

// --- Raster gate ---
const rasters = files.filter(isRasterPath);

// --- External-request metric (static scan of scope source for off-origin refs) ---
const offOrigin = [];
const refRe = /url\(\s*(https?:)?\/\/|@import\s+(?:url\()\s*(https?:)?\/\//;
for (const f of [...cssFiles, ...jsFiles]) {
  if (refRe.test(read(f))) offOrigin.push(f);
}

// --- Contrast gate ---
const contrast = contrastGate();

// --- Dependency auditor ---
const dep = audit(registry);

const metrics = [
  { label: "Raw CSS (bytes)", value: rawCss, scope: "framework .css in scope" },
  { label: "Minified CSS (bytes)", value: minCss, scope: "clean-css, rebase off" },
  { label: "Raw JS (bytes)", value: rawJs, scope: "framework .js in scope" },
  { label: "Minified JS (bytes)", value: minJs, scope: "terser, compress on" },
  { label: "Compressed package (bytes)", value: compressed, scope: "gzip of scope css+js" },
  { label: "Semantic tokens (foundation)", value: semanticTokens, scope: "src/tokens/semantic.css" },
  { label: "Core specimens", value: byLayer("core"), scope: "registry layer=core" },
  { label: "Module specimens", value: byLayer("modules"), scope: "registry layer=modules" },
  { label: "Themes", value: themeCount, scope: "registry theme roster" },
  { label: "Framework rasters", value: rasters.length, scope: "raster scan of scope" },
  { label: "External requests", value: offOrigin.length, scope: "static scan of scope for off-origin url()/@import" },
  { label: "Scenarios", value: scenarioCount, scope: "registry" },
  { label: "Capture checkpoints", value: captureCount, scope: "registry: themes × viewports × checkpoints" },
  { label: "Dependency violations", value: dep.violations.length, scope: "auditor over registry declarations" },
  { label: "Accessibility failures", value: contrast.violations.length, scope: "contrast gate: designed pairs below threshold (text 4.5:1 + non-text 3:1); undesigned-pairing membership is enforced at test time by the Playwright runner" },
  { label: "Contrast coverage (pair×theme)", value: contrast.standingChecks, scope: `designed pairs (${contrast.standingChecks / contrast.themeCount}) × themes (${contrast.themeCount}); a ratio is computed for every one` },
  { label: "Contrast exemptions (declared)", value: EXEMPTIONS.length, scope: "enumerated in pairings.js; applied and counted by the runner: " + EXEMPTIONS.map((e) => `${e.token} (${e.reason})`).join("; ") },
  { label: "Designed pair identities", value: membership.coverage.designedPairIdentities, scope: "designed-pairing table identities" },
  { label: "Observed pair identities", value: membership.coverage.distinctObservedIdentities, scope: "distinct designed identities observed in rendered capture states" },
  { label: "Pairing observations", value: membership.coverage.totalObservations, scope: "all rendered observations across scenario × theme × viewport × checkpoint" },
  { label: "Membership exclusions", value: Object.values(membership.coverage.exclusionsByReason).reduce((sum, count) => sum + count, 0), scope: Object.entries(membership.coverage.exclusionsByReason).map(([reason, count]) => `${reason}: ${count}`).join("; ") },
  { label: "Unclassified observations", value: membership.coverage.unclassifiedObservations, scope: "rendered observations not mapped to a designed identity; must be zero" },
];

const out = {
  generatedAt: new Date().toISOString(),
  scopeSummary: scopeSummary(),
  scope: { dirs: ["src/tokens", "src/core", "src/modules", "src/themes"], entryFiles: ["src/gc.css", "src/gc.js"] },
  metrics,
  detail: {
    rasters,
    offOrigin,
    contrast,
    membership,
    auditor: dep,
  },
};

writeFileSync(join(REPO_ROOT, "harness/metrics/metrics.json"), JSON.stringify(out, null, 2) + "\n");

// --- Report + gates ---
for (const m of metrics) console.log(`${m.label.padEnd(34)} ${m.value}   [${m.scope}]`);

const gateFailures = [];
if (rasters.length) gateFailures.push(`framework raster count is ${rasters.length}, must be zero:\n  ${rasters.join("\n  ")}`);
if (contrast.violations.length) gateFailures.push(`${contrast.violations.length} contrast violation(s):\n  ${contrast.violations.join("\n  ")}`);
if (contrast.countAssertion) gateFailures.push(`contrast count assertion failed: ${contrast.countAssertion}`);
if (membership.coverage.unclassifiedObservations) gateFailures.push(`${membership.coverage.unclassifiedObservations} unclassified rendered observation(s); must be zero`);

if (gateFailures.length) {
  console.error(`\nMETRICS GATE FAILED:\n${gateFailures.join("\n")}`);
  process.exit(1);
}
console.log("\nMETRICS OK");
