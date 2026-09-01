/**
 * Script Name : validate-process.test.js
 * Description : Exercise registry validation through its real CLI module boundary.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-01
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const VALIDATE_URL = new URL("../registry/validate.js", import.meta.url);
const SCENARIOS_URL = new URL("../registry/scenarios.js", import.meta.url);

test("the validation CLI reports a missing section roster without a TypeError", (t) => {
  const scratch = mkdtempSync(join(tmpdir(), "h5gameui-validate-"));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));

  const fixturePath = join(scratch, "registry-without-sections.js");
  writeFileSync(
    fixturePath,
    `import { registry as sourceRegistry } from ${JSON.stringify(SCENARIOS_URL.href)};\n` +
      "const { sections: omittedSections, ...registry } = sourceRegistry;\n" +
      "export { registry };\n",
  );

  const loaderPath = join(scratch, "registry-loader.js");
  writeFileSync(
    loaderPath,
    `const validateUrl = ${JSON.stringify(VALIDATE_URL.href)};\n` +
      `const fixtureUrl = ${JSON.stringify(pathToFileURL(fixturePath).href)};\n` +
      "export async function resolve(specifier, context, nextResolve) {\n" +
      '  if (context.parentURL === validateUrl && specifier === "./scenarios.js") {\n' +
      "    return { url: fixtureUrl, shortCircuit: true };\n" +
      "  }\n" +
      "  return nextResolve(specifier, context);\n" +
      "}\n",
  );

  const result = spawnSync(
    process.execPath,
    ["--experimental-loader", loaderPath, fileURLToPath(VALIDATE_URL)],
    { cwd: fileURLToPath(new URL("../../", import.meta.url)), encoding: "utf8" },
  );

  assert.equal(result.status, 1, result.stderr);
  assert.doesNotMatch(result.stderr, /TypeError/);
  assert.match(result.stdout, /registry: 11 scenario\(s\), 4 theme\(s\), 0 section\(s\)/);
  assert.match(result.stderr, /VALIDATION FAILED:/);
  assert.match(result.stderr, /registry: declares no section roster/);
});
