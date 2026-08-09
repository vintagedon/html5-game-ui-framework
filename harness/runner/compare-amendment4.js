/**
 * Script Name : compare-amendment4.js
 * Description : Validate the two Amendment 4 before/after capture pairs.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { assertChangedPair, comparePngBuffers } from "./amendment4-evidence.js";

function argumentsByName(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!name?.startsWith("--") || argv[index + 1] == null) {
      throw new Error(`invalid argument at ${name || "<end>"}`);
    }
    values[name.slice(2)] = argv[index + 1];
  }
  return values;
}

const args = argumentsByName(process.argv.slice(2));
if (!args["capture-dir"] || !args.result) {
  throw new Error("usage: compare-amendment4.js --capture-dir DIR --result FILE");
}

const captureDir = resolve(args["capture-dir"]);
const resultPath = resolve(args.result);
const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  captureDir,
  ok: false,
  pairs: {},
  failures: [],
};

for (const name of ["panel", "edges"]) {
  try {
    const beforePath = join(captureDir, `h5gameui-a4-before-${name}.png`);
    const afterPath = join(captureDir, `h5gameui-a4-after-${name}.png`);
    const comparison = comparePngBuffers(
      readFileSync(beforePath),
      readFileSync(afterPath),
    );
    report.pairs[name] = { beforePath, afterPath, ...comparison };
    assertChangedPair(name, comparison);
  } catch (error) {
    report.failures.push(error.message);
  }
}

report.ok = report.failures.length === 0;
writeFileSync(resultPath, JSON.stringify(report, null, 2) + "\n");
if (!report.ok) {
  console.error(`AMENDMENT 4 EVIDENCE FAILED:\n  ${report.failures.join("\n  ")}`);
  process.exit(1);
}

for (const [name, pair] of Object.entries(report.pairs)) {
  console.log(
    `${name}: ${pair.differentPixels}/${pair.totalPixels} pixels differ; ` +
      `${pair.beforeSha256} -> ${pair.afterSha256}`,
  );
}
console.log("AMENDMENT 4 EVIDENCE OK");
