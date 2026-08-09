/**
 * Script Name : scope.js
 * Description : The resolved framework metric scope: one explicit path list, cited by every count.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Resolves charter §4.1's metric-scope rule, consistent with F-005's approved
 * boundary: the token, core, module, and theme source trees, plus the two entry
 * points a consumer actually includes (src/gc.css and src/gc.js). Everything else
 * — assets/, docs/, reference/, harness/, internal-files/, recycle-bin/, the
 * reference-files-* trees — is excluded and the exclusion is declared here rather
 * than implied. Every metric below and in metrics.js reads this list, so a count
 * always states what it counted. A zero over this list is not a zero over nothing.
 */

import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;

// The four F-005 directories plus the two consumer entry points.
export const SCOPE_DIRS = ["src/tokens", "src/core", "src/modules", "src/themes"];
export const SCOPE_ENTRY_FILES = ["src/gc.css", "src/gc.js"];

export const RASTER_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".bmp", ".ico", ".tiff"];

export const EXCLUDED = [
  "assets/",
  "docs/",
  "reference/",
  "harness/",
  "internal-files/",
  "staging/",
  "recycle-bin/",
  "reference-files-*/",
];

/** True when a path has a raster extension, regardless of filename casing. */
export function isRasterPath(path) {
  const normalized = path.toLowerCase();
  return RASTER_EXTS.some((extension) => normalized.endsWith(extension));
}

/** Every file under the resolved scope, as repo-relative paths. */
export function listScopeFiles() {
  const out = [];
  for (const dir of SCOPE_DIRS) {
    const abs = join(REPO_ROOT, dir);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      (function walk(d) {
        for (const e of readdirSync(d, { withFileTypes: true })) {
          const p = join(d, e.name);
          if (e.isDirectory()) walk(p);
          else if (e.isFile()) out.push(relative(REPO_ROOT, p));
        }
      })(abs);
    }
  }
  for (const f of SCOPE_ENTRY_FILES) out.push(f);
  return out.sort();
}

/** Repo-relative framework paths in scope, for reporting. */
export function scopeSummary() {
  return [...SCOPE_DIRS, ...SCOPE_ENTRY_FILES].join(", ");
}

export { REPO_ROOT };
