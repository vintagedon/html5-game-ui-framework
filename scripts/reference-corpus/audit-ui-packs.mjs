/**
 * Script Name  : audit-ui-packs.mjs
 * Description  : ML01-only source audit reconciling the tracked UI pack catalog against the live corpus.
 * Repository   : html5-game-ui-framework
 * Author       : VintageDon (https://github.com/vintagedon/)
 * Created      : 2026-08-16
 * Link         : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Compares docs/reference-corpus/ui-pack-inventory.json with the private
 * reference-files-ui/ tree: immediate pack coverage one-for-one, recomputed
 * file and byte counts, extension counts, runtime evidence, pack digests,
 * and the corpus digest, plus existence of every cited evidence path. The
 * audit reads the corpus and never writes inside it. It fails on symbolic
 * links, paths resolving outside the corpus root, and any drift between the
 * tracked catalog and the live tree. It requires the private corpus and is
 * therefore not part of public CI; harness/tests/reference-corpus.test.js
 * validates the tracked catalog alone.
 *
 * Usage
 * -----
 *     npm run corpus:audit
 *     node scripts/reference-corpus/audit-ui-packs.mjs --root /path/to/corpus-copy
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { scanCorpus, SOURCE_ROOT_NAME } from "./corpus-scan.mjs";
import { canonicalCatalogText, validateCatalog } from "./validate-catalog.mjs";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CATALOG_PATH = path.join(REPOSITORY_ROOT, "docs", "reference-corpus", "ui-pack-inventory.json");

function parseArguments(argv) {
  const rootFlagIndex = argv.indexOf("--root");
  if (rootFlagIndex !== -1 && argv[rootFlagIndex + 1]) {
    return { corpusRoot: path.resolve(argv[rootFlagIndex + 1]) };
  }
  return { corpusRoot: path.join(REPOSITORY_ROOT, SOURCE_ROOT_NAME) };
}

async function pathExists(absolutePath) {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { corpusRoot } = parseArguments(process.argv.slice(2));
  const failures = [];
  const notes = [];

  if (!(await pathExists(corpusRoot))) {
    console.error(`source audit: corpus root not found at ${corpusRoot}`);
    console.error(
      "The private UI corpus exists only on ML01. A public clone cannot run this audit; " +
        "the tracked catalog is validated by harness/tests/reference-corpus.test.js instead.",
    );
    process.exit(1);
  }

  const catalogText = await fs.readFile(CATALOG_PATH, "utf8");
  let catalog;
  try {
    catalog = JSON.parse(catalogText);
  } catch (error) {
    console.error(`source audit: catalog is not valid JSON (${error.message})`);
    process.exit(1);
  }

  if (canonicalCatalogText(catalog) !== catalogText) {
    failures.push("catalog file is not canonically formatted (2-space indent, trailing newline)");
  }

  failures.push(...validateCatalog(catalog));

  console.log(`source audit: scanning ${corpusRoot}`);
  const report = await scanCorpus(corpusRoot);
  notes.push(...report.findings);

  const livePackIds = [...report.packs.keys()];
  const catalogPackIds = catalog.packs.map((pack) => pack.id);
  for (const packId of livePackIds) {
    if (!catalogPackIds.includes(packId)) failures.push(`live pack "${packId}" has no catalog record`);
  }
  for (const packId of catalogPackIds) {
    if (!livePackIds.includes(packId)) failures.push(`catalog pack "${packId}" does not exist in the corpus`);
  }

  for (const pack of catalog.packs) {
    const label = `pack ${pack.id}`;
    const live = report.packs.get(pack.id);

    if (live) {
      if (pack.snapshot.fileCount !== live.fileCount) {
        failures.push(`${label}: fileCount ${pack.snapshot.fileCount} != live ${live.fileCount}`);
      }
      if (pack.snapshot.totalBytes !== live.totalBytes) {
        failures.push(`${label}: totalBytes ${pack.snapshot.totalBytes} != live ${live.totalBytes}`);
      }
      if (JSON.stringify(pack.snapshot.extensionCounts) !== JSON.stringify(live.extensionCounts)) {
        failures.push(`${label}: extensionCounts do not match the live corpus`);
      }
      if (pack.snapshot.digest !== live.digest) {
        failures.push(`${label}: digest ${pack.snapshot.digest} != live ${live.digest}`);
      }
      if (JSON.stringify(pack.runtimeEvidence) !== JSON.stringify(live.runtimeEvidence)) {
        failures.push(`${label}: runtimeEvidence does not match the live corpus`);
      }

      for (const entry of pack.evidence) {
        if (!(await pathExists(path.join(corpusRoot, pack.id, entry.path)))) {
          failures.push(`${label}: evidence path "${entry.path}" does not exist`);
        }
      }
      const locator = pack.licenseEvidence.locator;
      if (locator && !(await pathExists(path.join(corpusRoot, pack.id, locator)))) {
        failures.push(`${label}: license locator "${locator}" does not exist`);
      }
    }

    const consoleStatus = live ? "ok" : "missing";
    console.log(`  ${consoleStatus.padEnd(7)} ${pack.id}`);
  }

  const snapshot = catalog.snapshot;
  if (snapshot.packCount !== report.corpus.packCount) {
    failures.push(`corpus: packCount ${snapshot.packCount} != live ${report.corpus.packCount}`);
  }
  if (snapshot.fileCount !== report.corpus.fileCount) {
    failures.push(`corpus: fileCount ${snapshot.fileCount} != live ${report.corpus.fileCount}`);
  }
  if (snapshot.totalBytes !== report.corpus.totalBytes) {
    failures.push(`corpus: totalBytes ${snapshot.totalBytes} != live ${report.corpus.totalBytes}`);
  }
  if (JSON.stringify(snapshot.extensionCounts) !== JSON.stringify(report.corpus.extensionCounts)) {
    failures.push("corpus: extensionCounts do not match the live corpus");
  }
  if (snapshot.corpusDigest !== report.corpus.corpusDigest) {
    failures.push(`corpus: digest ${snapshot.corpusDigest} != live ${report.corpus.corpusDigest}`);
  }

  if (report.findings.some((finding) => finding.startsWith("symbolic-link"))) {
    failures.push("corpus: symbolic link encountered; the audit never follows links");
  }
  if (report.findings.some((finding) => finding.startsWith("path-escapes-root"))) {
    failures.push("corpus: a path resolved outside the corpus root");
  }

  for (const note of notes) {
    console.log(`  note    ${note}`);
  }
  console.log(
    `corpus: ${report.corpus.packCount} packs, ${report.corpus.fileCount} files, ` +
      `${report.corpus.totalBytes} bytes, digest ${report.corpus.corpusDigest}`,
  );

  if (failures.length > 0) {
    console.error(`source audit: FAILED with ${failures.length} problem(s):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.error("source audit: passed");
}

main().catch((error) => {
  console.error(`source audit: unexpected failure: ${error.stack}`);
  process.exit(1);
});
