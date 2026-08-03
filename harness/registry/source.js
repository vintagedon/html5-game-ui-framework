/**
 * Script Name : source.js
 * Description : Read the frozen framework source to derive the token vocabulary and theme roster.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Node-only. The validator derives the set of valid token names and the theme
 * roster from the framework source under src/ rather than from a second
 * hand-maintained list, so the registry can only name tokens and themes that
 * actually exist. A renamed token in src/ propagates here with no edit to the
 * harness.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;
const SRC_ROOT = join(REPO_ROOT, "src");

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Every `--gc-*` custom property declared in the token files. Includes primitive,
 * semantic, and component tiers, because a scenario may legitimately reference a
 * component token (e.g. --gc-button-fill) or a primitive it is reviewing.
 * @param {string} [srcRoot]
 * @returns {string[]}
 */
export function readTokenVocabulary(srcRoot = SRC_ROOT) {
  const dir = join(srcRoot, "tokens");
  const files = ["primitives.css", "semantic.css", "components.css"];
  const names = new Set();
  for (const file of files) {
    const text = stripComments(readFileSync(join(dir, file), "utf8"));
    for (const m of text.matchAll(/--gc-[a-z0-9-]+\s*:/g)) {
      names.add(m[0].replace(/\s*:/, ""));
    }
  }
  return [...names].sort();
}

/**
 * The theme roster, derived from the `data-gc-theme="..."` selectors in
 * src/themes/*.css. Order is file-then-first-appearance. A theme file that does
 * not declare its root selector is invisible here.
 * @param {string} [srcRoot]
 * @returns {string[]}
 */
export function readThemeRoster(srcRoot = SRC_ROOT) {
  const dir = join(srcRoot, "themes");
  const files = readdirSync(dir).filter((f) => f.endsWith(".css")).sort();
  const themes = new Set();
  for (const file of files) {
    const text = stripComments(readFileSync(join(dir, file), "utf8"));
    for (const m of text.matchAll(/data-gc-theme="([^"]+)"/g)) {
      themes.add(m[1]);
    }
  }
  return [...themes];
}

/**
 * The full resolved scope (token vocabulary + theme roster + frozen layers),
 * the environment the schema validator checks scenarios against.
 * @param {string} [srcRoot]
 * @returns {{tokens: string[], themes: string[], layers: string[]}}
 */
export function readContract(srcRoot = SRC_ROOT) {
  return {
    tokens: readTokenVocabulary(srcRoot),
    themes: readThemeRoster(srcRoot),
  };
}

export { REPO_ROOT, SRC_ROOT };
