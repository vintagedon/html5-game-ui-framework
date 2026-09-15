/**
 * Script Name : check.js
 * Description : Verify published source clears the declared browser floor.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-15
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * The charter declares a browser floor under frozen decisions; this checker
 * keeps that declaration honest. It lists the floor-binding features actually
 * in use, the versions each requires with its compatibility source, and the
 * forms scanned for in published source. A feature present in src/ that needs
 * a version above a declared floor is a violation; a manifest that disagrees
 * with the charter's floor row is a violation of a different kind.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const FLOOR_MANIFEST_PATH = fileURLToPath(
  new URL("./browser-floor.json", import.meta.url),
);
export const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CHARTER_PATH = join(REPO_ROOT, "docs/project-charter.md");

/** Load and shape-check the floor manifest. */
export function loadFloorManifest(path = FLOOR_MANIFEST_PATH) {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (manifest.version !== 1) throw new Error("browser floor manifest version must be 1");
  for (const browser of ["chrome", "edge", "safari", "firefox"]) {
    if (typeof manifest.floors?.[browser] !== "number") {
      throw new Error(`browser floor manifest must declare a numeric floor for ${browser}`);
    }
  }
  if (!Array.isArray(manifest.features)) {
    throw new Error("browser floor manifest must carry a features array");
  }
  return manifest;
}

/** Parse the authoritative floor values out of the charter's frozen row. */
export function charterFloors(charterPath = CHARTER_PATH) {
  const charter = readFileSync(charterPath, "utf8");
  const row = charter.match(
    /\|\s*Browser floor\s*\|\s*Chrome and Edge (\d+), Safari (\d+(?:\.\d+)?), Firefox (\d+)\s*\|/,
  );
  if (!row) throw new Error("charter browser floor row not found or not parseable");
  return {
    chrome: Number(row[1]),
    edge: Number(row[1]),
    safari: Number(row[2]),
    firefox: Number(row[3]),
  };
}

/** Every file under one directory tree, relative paths joined to root. */
function filesUnder(root, filter) {
  const out = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(directory, entry.name));
      else if (!filter || filter(entry.name)) out.push(join(directory, entry.name));
    }
  };
  walk(root);
  return out;
}

/** Scan published source for each declared feature form. */
export function scanPublishedSource(
  manifest,
  sourceRoot = join(REPO_ROOT, "src"),
) {
  const files = filesUnder(sourceRoot, (name) => name.endsWith(".css") || name.endsWith(".js"));
  const present = [];
  for (const feature of manifest.features) {
    const locations = [];
    for (const file of files) {
      if (readFileSync(file, "utf8").includes(feature.form)) locations.push(file);
    }
    if (locations.length) present.push({ ...feature, locations });
  }
  return { present, filesScanned: files.length };
}

/**
 * Report every listed feature whose requirements exceed the declared floors,
 * and any disagreement between the manifest and the charter. The mutation
 * this exists to catch is a spec introducing a feature above the floor and
 * nothing comparing the two.
 */
export function floorViolations({ manifest, floors, present }) {
  const violations = [];
  for (const browser of Object.keys(manifest.floors)) {
    if (manifest.floors[browser] !== floors[browser]) {
      violations.push(
        `manifest floor for ${browser} (${manifest.floors[browser]}) disagrees with the charter (${floors[browser]})`,
      );
    }
  }
  for (const feature of present) {
    for (const [browser, required] of Object.entries(feature.requires)) {
      const declared = manifest.floors[browser];
      if (declared == null) {
        violations.push(`${feature.feature} requires ${browser} ${required} but no floor is declared`);
      } else if (required > declared) {
        violations.push(
          `${feature.feature} requires ${browser} ${required}, above the declared floor ${declared}`,
        );
      }
    }
  }
  return violations;
}
