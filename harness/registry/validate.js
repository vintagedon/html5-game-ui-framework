/**
 * Script Name : validate.js
 * Description : CLI entry that validates the registry against the frozen contract.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * `npm run validate`. Derives the valid token vocabulary and theme roster from
 * src/ (source.js), reads the frozen layers, and runs the pure schema validator
 * (schema.js). Prints a one-line-per-scenario report plus any contract drift
 * between the registry's theme roster and the theme files. Exits non-zero on any
 * error, so a CI/publish gate can treat validation as a hard failure.
 */

import { registry } from "./scenarios.js";
import { LAYERS } from "./layers.js";
import { readContract } from "./source.js";
import { validateRegistry } from "./schema.js";

const contract = { ...readContract(), layers: LAYERS };

const rosterDrift = registry.themes.filter((t) => !contract.themes.includes(t));
const undeclaredThemeFiles = contract.themes.filter((t) => !registry.themes.includes(t));

const errors = validateRegistry(registry, contract);

console.log(`registry: ${registry.scenarios.length} scenario(s), ${registry.themes.length} theme(s)`);
console.log(`contract: ${contract.tokens.length} tokens, ${contract.themes.length} themes derived from src/`);
console.log(`layers:   ${LAYERS.join(", ")}`);

if (rosterDrift.length) {
  errors.push(`registry declares themes not present in src/themes: ${rosterDrift.join(", ")}`);
}
if (undeclaredThemeFiles.length) {
  errors.push(`src/themes declares themes absent from the registry roster: ${undeclaredThemeFiles.join(", ")}`);
}

const tokenUse = new Set();
for (const s of registry.scenarios) (s.tokens || []).forEach((t) => tokenUse.add(t));
console.log(`coverage: ${tokenUse.size} distinct token(s) referenced across scenarios`);

if (errors.length) {
  console.error(`\nVALIDATION FAILED: ${errors.length} error(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("\nVALIDATION PASSED");
