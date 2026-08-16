/**
 * Script Name : reference-corpus.test.js
 * Description : Validate the tracked UI pack catalog and derived map from tracked artifacts alone.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-16
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * These tests run in a public clone where the private reference-files-ui/
 * tree is absent. They validate the catalog schema, stable IDs, enums,
 * canonical ordering and formatting, cross-reference reconciliation, the
 * license and source-kind coherence rules, the game-rule exclusion contract
 * for core and module destinations, and the derivation bond between the
 * catalog and the human-readable capability map (digest stamp, traceable
 * rows, and rubric ordering). The live source audit against the private
 * corpus is a separate ML01-only command: npm run corpus:audit.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  canonicalCatalogText,
  validateCatalog,
} from "../../scripts/reference-corpus/validate-catalog.mjs";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CATALOG_PATH = path.join(REPOSITORY_ROOT, "docs", "reference-corpus", "ui-pack-inventory.json");
const MAP_PATH = path.join(REPOSITORY_ROOT, "docs", "reference-corpus", "ui-pack-capability-map.md");

async function loadCatalog() {
  const text = await readFile(CATALOG_PATH, "utf8");
  return { text, catalog: JSON.parse(text) };
}

function laneRows(mapText, laneHeading) {
  const headingIndex = mapText.indexOf(laneHeading);
  assert.ok(headingIndex > 0, `map must contain "${laneHeading}"`);
  const nextHeading = mapText.indexOf("\n#", headingIndex + laneHeading.length);
  const section = mapText.slice(headingIndex, nextHeading === -1 ? undefined : nextHeading);
  const rows = [];
  for (const line of section.split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length === 14 && /^CAP-\d{3}$/.test(cells[1])) {
      rows.push({
        id: cells[1],
        factors: cells.slice(3, 10).map((value) => Number(value)),
        total: Number(cells[10]),
        readiness: cells[11],
      });
    }
  }
  return rows;
}

test("catalog is canonically formatted and schema-valid", async () => {
  const { text, catalog } = await loadCatalog();
  assert.equal(canonicalCatalogText(catalog), text, "catalog must round-trip canonical formatting");
  assert.deepEqual(validateCatalog(catalog), []);
});

test("catalog snapshot counts reconcile with its pack records", async () => {
  const { catalog } = await loadCatalog();
  assert.equal(catalog.snapshot.packCount, catalog.packs.length);
  const fileCount = catalog.packs.reduce((sum, pack) => sum + pack.snapshot.fileCount, 0);
  const totalBytes = catalog.packs.reduce((sum, pack) => sum + pack.snapshot.totalBytes, 0);
  assert.equal(catalog.snapshot.fileCount, fileCount);
  assert.equal(catalog.snapshot.totalBytes, totalBytes);
});

test("map carries the digest of the current catalog bytes", async () => {
  const { text } = await loadCatalog();
  const mapText = await readFile(MAP_PATH, "utf8");
  const digest = createHash("sha256").update(text).digest("hex");
  assert.ok(
    mapText.includes(`catalog-digest: sha256:${digest}`),
    "map must embed the digest of the catalog it was derived from; regenerate the map when the catalog changes",
  );
});

test("every catalog entity and snapshot figure is traceable in the map", async () => {
  const { catalog } = await loadCatalog();
  const mapText = await readFile(MAP_PATH, "utf8");
  for (const pack of catalog.packs) {
    assert.ok(mapText.includes(pack.id), `map must mention pack ${pack.id}`);
  }
  for (const capability of catalog.capabilities) {
    assert.ok(mapText.includes(capability.id), `map must mention capability ${capability.id}`);
    assert.ok(mapText.includes(capability.name), `map must mention capability name "${capability.name}"`);
  }
  for (const group of catalog.overlapGroups) {
    assert.ok(mapText.includes(group.id), `map must mention overlap group ${group.id}`);
  }
  for (const candidate of catalog.gameCandidates) {
    assert.ok(mapText.includes(candidate.id), `map must mention game candidate ${candidate.id}`);
  }
  assert.ok(mapText.includes(`| Immediate packs | ${catalog.snapshot.packCount} |`));
  assert.ok(mapText.includes(`| Recursive files | ${catalog.snapshot.fileCount} |`));
  assert.ok(mapText.includes(`| Total bytes | ${catalog.snapshot.totalBytes} `));
  assert.ok(mapText.includes(catalog.snapshot.corpusDigest));
});

test("map keeps three lanes and the coordination rule", async () => {
  const mapText = await readFile(MAP_PATH, "utf8");
  assert.ok(mapText.includes("### 5.1 Game-driven candidates"));
  assert.ok(mapText.includes("### 5.2 Independent module candidates"));
  assert.ok(mapText.includes("### 5.3 Reference lab candidates"));
  assert.ok(mapText.includes("A candidate has one active implementation owner."));
  assert.ok(mapText.includes("it does not repin GameUI mid-spec"));
  assert.ok(mapText.includes("Vector Vortex's current role"));
});

test("lane tables expose every rubric factor and follow the declared tie-break", async () => {
  const mapText = await readFile(MAP_PATH, "utf8");
  const lanes = [
    "### 5.1 Game-driven candidates",
    "### 5.2 Independent module candidates",
    "### 5.3 Reference lab candidates",
  ];
  for (const lane of lanes) {
    const rows = laneRows(mapText, lane);
    assert.ok(rows.length >= 2, `${lane} must rank at least two capabilities`);
    for (const row of rows) {
      assert.equal(row.factors.length, 7, "every row exposes seven rubric factors");
      assert.ok(row.factors.every((value) => Number.isInteger(value) && value >= 0 && value <= 3));
      assert.equal(row.total, row.factors.reduce((sum, value) => sum + value, 0), "totals must be the sum of visible factors");
    }
    const expected = [...rows].sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.factors[4] !== a.factors[4]) return b.factors[4] - a.factors[4];
      if (b.factors[0] !== a.factors[0]) return b.factors[0] - a.factors[0];
      return a.id.localeCompare(b.id);
    });
    assert.deepEqual(
      rows.map((row) => row.id),
      expected.map((row) => row.id),
      `${lane} must be ordered by total, then licensing clarity, then evidence depth, then capability ID`,
    );
  }
});

test("removing licensing clarity, consumer pressure, or overlap safety changes a fixture's expected order", async () => {
  const mapText = await readFile(MAP_PATH, "utf8");
  const rows = laneRows(mapText, "### 5.1 Game-driven candidates");

  const rank = (list) =>
    [...list].sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.factors[4] !== a.factors[4]) return b.factors[4] - a.factors[4];
      if (b.factors[0] !== a.factors[0]) return b.factors[0] - a.factors[0];
      return a.id.localeCompare(b.id);
    });
  const baseline = rank(rows).map((row) => row.id);

  for (const [factorIndex, targetId] of [
    [4, "CAP-005"],
    [2, "CAP-001"],
    [6, "CAP-006"],
  ]) {
    const mutated = structuredClone(rows);
    const target = mutated.find((row) => row.id === targetId);
    assert.ok(target.factors[factorIndex] > 0, `fixture precondition: ${targetId} must hold a removable factor value`);
    target.factors[factorIndex] -= 1;
    target.total = target.factors.reduce((sum, value) => sum + value, 0);
    const reordered = rank(mutated).map((row) => row.id);
    assert.notDeepEqual(
      baseline,
      reordered,
      `lowering factor index ${factorIndex} must be load-bearing in the lane order`,
    );
  }
});

test("every UIREF finding carries a statement, evidence, recommendation, and a closed question", async () => {
  const mapText = await readFile(MAP_PATH, "utf8");
  const matches = [...mapText.matchAll(/### (UIREF-\d{3}) — ([^\n]+)\n([\s\S]*?)(?=\n### UIREF-|\n---\n\n\*\*Stop condition)/g)];
  assert.ok(matches.length >= 8, "the map must present a bounded set of review findings");
  const seen = new Set();
  for (const [, id, title, body] of matches) {
    assert.ok(!seen.has(id), `review ID ${id} must be unique`);
    seen.add(id);
    assert.ok(title.trim().length > 0);
    assert.ok(body.includes("**Statement.**"));
    assert.ok(body.includes("**Recommendation.**"));
    assert.ok(body.includes("**Question.**"));
    const questionLine = body.split("**Question.**")[1].trim();
    assert.ok(
      /\([a-z0-9-]+( \/ [a-z0-9-]+)+\)\s*$/.test(questionLine),
      `${id} must close with a yes-or-no or choose-one question in parentheses`,
    );
    assert.ok(body.includes("`") || body.includes("CAP-") || body.includes("OVL-") || body.includes("GC-"), `${id} must cite evidence IDs`);
  }
});

test("fixtures: wrong source kind, missing mappings, and dropped exclusions all fail validation", async () => {
  const { catalog } = await loadCatalog();

  const audioOnIconPack = structuredClone(catalog);
  const iconPack = audioOnIconPack.packs.find((pack) => pack.id === "runic-relic-rpg-icons-144");
  iconPack.sourceKinds = [...iconPack.sourceKinds, "audio-source"];
  assert.ok(
    validateCatalog(audioOnIconPack).some((error) => error.includes("audio-source")),
    "claiming audio-source without audio files must fail",
  );

  const genreLabelOnly = structuredClone(catalog);
  genreLabelOnly.gameCandidates[0].engineCapability = "";
  assert.ok(
    validateCatalog(genreLabelOnly).some((error) => error.includes("engine capability")),
    "a game candidate without an engine capability mapping must fail",
  );

  const droppedExclusion = structuredClone(catalog);
  const tabCapability = droppedExclusion.capabilities.find((capability) => capability.id === "CAP-002");
  tabCapability.excludedConcerns = tabCapability.excludedConcerns.slice(0, 2);
  assert.ok(
    validateCatalog(droppedExclusion).some((error) => error.includes('must exclude "canvas-webgl-rendering"')),
    "a core destination without all four exclusions must fail",
  );

  const promoted = structuredClone(catalog);
  const promotedCapability = promoted.capabilities.find((capability) => capability.id === "CAP-019");
  promotedCapability.destination = "module";
  promotedCapability.excludedConcerns = ["game-rules", "persistence-ownership", "canvas-webgl-rendering", "vendor-specific-styling"];
  promotedCapability.purpose = "Ship the bundle's LocalStorage save-manager and achievement persistence as a framework module";
  assert.ok(
    validateCatalog(promoted).some((error) => error.includes("claims ownership of game rules")),
    "promoting achievement persistence as a framework module must fail",
  );

  const scatteredEvidence = structuredClone(catalog);
  const toastPack = scatteredEvidence.packs.find((pack) => pack.id === "achievement-toast-notification-system-html5");
  toastPack.evidence[0].path = "marketing/itch-cover-630x500.png";
  assert.ok(
    validateCatalog(scatteredEvidence).some((error) => error.includes("non-documentary file")),
    "citing binary assets file-by-file must fail the redaction rule",
  );

  const silentLicense = structuredClone(catalog);
  const grimoire = silentLicense.packs.find((pack) => pack.id === "obsidian-grimoire-ui");
  grimoire.licenseFacts.finishedProductUse = "unclear";
  assert.ok(
    validateCatalog(silentLicense).some((error) => error.includes("license-review-required")),
    "an unclear license fact must reroute the pack to license review",
  );
});
