/**
 * Script Name  : corpus-scan.mjs
 * Description  : Read-only scanner for the private reference-files-ui pack corpus.
 * Repository   : html5-game-ui-framework
 * Author       : VintageDon (https://github.com/vintagedon/)
 * Created      : 2026-08-16
 * Link         : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Walks every immediate child pack of a resolved UI corpus root and computes,
 * per pack and for the corpus as a whole, recursive file counts, byte totals,
 * normalized extension counts, runtime-evidence counts, and content digests.
 * It never writes inside the scanned tree, never follows symbolic links, and
 * resolves no path outside the root; either condition is returned as a
 * blocking finding. Individual file hashes are folded into pack digests and
 * are never exposed as a per-file listing.
 *
 * Usage
 * -----
 *     import { scanCorpus } from "./corpus-scan.mjs";
 *     const report = scanCorpus(rootDir);
 */

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/** Repository-relative name of the private corpus root. */
export const SOURCE_ROOT_NAME = "reference-files-ui";

/** Extension classes that feed the committed runtime-evidence counts. */
const EXTENSION_CLASSES = {
  htmlDocuments: [".html", ".htm"],
  stylesheets: [".css"],
  scripts: [".js", ".mjs", ".cjs"],
  dataFiles: [".json"],
  images: [".png", ".webp", ".gif", ".svg", ".jpg", ".jpeg"],
  audioFiles: [".wav", ".ogg", ".mp3", ".flac"],
  editableSources: [".aseprite", ".ora", ".kra", ".psd"],
};

const CLASS_BY_EXTENSION = new Map(
  Object.entries(EXTENSION_CLASSES).flatMap(([className, extensions]) =>
    extensions.map((extension) => [extension, className]),
  ),
);

/** Normalize a filename extension: lowercase with leading dot, or "(none)". */
function normalizeExtension(fileName) {
  const raw = path.posix.extname(fileName).toLowerCase();
  return raw === "" ? "(none)" : raw;
}

/** SHA-256 hex digest of a buffer. */
function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/** Recursively collect relative file entries under a pack directory. */
async function collectPackFiles(rootDir, packId, findings) {
  const files = [];
  const directories = [packId];

  while (directories.length > 0) {
    const relativeDir = directories.pop();
    const entries = await fs.readdir(path.join(rootDir, relativeDir), {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const relativePath = path.posix.join(relativeDir, entry.name);
      if (entry.isSymbolicLink()) {
        findings.push(`symbolic-link: ${relativePath}`);
        continue;
      }
      if (entry.isDirectory()) {
        directories.push(relativePath);
        continue;
      }
      if (!entry.isFile()) {
        findings.push(`non-regular-entry: ${relativePath}`);
        continue;
      }
      files.push(relativePath);
    }
    if (entries.length === 0) {
      findings.push(`empty-directory: ${relativeDir}`);
    }
  }

  return files.sort();
}

/** Fold one pack's file metadata into counts and a deterministic digest. */
async function measurePack(rootDir, resolvedRoot, packId, findings) {
  const extensionCounts = {};
  const runtimeEvidence = {
    runnableHtmlPresent: false,
    htmlDocuments: 0,
    stylesheets: 0,
    scripts: 0,
    dataFiles: 0,
    images: 0,
    audioFiles: 0,
    editableSources: 0,
  };
  const digestLines = [];
  let totalBytes = 0;

  const relativeFiles = await collectPackFiles(rootDir, packId, findings);
  for (const relativePath of relativeFiles) {
    const absolutePath = path.join(rootDir, relativePath);
    const resolved = await fs.realpath(absolutePath);
    if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
      findings.push(`path-escapes-root: ${relativePath}`);
      continue;
    }

    const { byteLength, fileHash } = await fs
      .readFile(absolutePath)
      .then((buffer) => ({ byteLength: buffer.byteLength, fileHash: hashBuffer(buffer) }));

    const fileName = path.posix.basename(relativePath);
    const extension = normalizeExtension(fileName);
    extensionCounts[extension] = (extensionCounts[extension] ?? 0) + 1;

    const className = CLASS_BY_EXTENSION.get(extension);
    if (className) runtimeEvidence[className] += 1;

    totalBytes += byteLength;
    digestLines.push(`${relativePath}\0${byteLength}\0${fileHash}\n`);
  }

  runtimeEvidence.runnableHtmlPresent = runtimeEvidence.htmlDocuments > 0;

  const sortedExtensionCounts = {};
  for (const key of Object.keys(extensionCounts).sort()) {
    sortedExtensionCounts[key] = extensionCounts[key];
  }

  digestLines.sort();
  const digest = createHash("sha256").update(digestLines.join("")).digest("hex");

  return {
    fileCount: relativeFiles.length,
    totalBytes,
    extensionCounts: sortedExtensionCounts,
    digest: `sha256:${digest}`,
    runtimeEvidence,
  };
}

/**
 * Scan a corpus root directory and return per-pack and corpus measurements.
 *
 * @param {string} rootDir - Absolute path to a directory containing pack subdirectories.
 * @returns {Promise<{packs: Map<string, object>, corpus: object, findings: string[]}>}
 */
export async function scanCorpus(rootDir) {
  const resolvedRoot = await fs.realpath(rootDir);
  const entryNames = (await fs.readdir(rootDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const findings = [];
  const packs = new Map();
  const corpusExtensionCounts = {};
  let corpusFileCount = 0;
  let corpusTotalBytes = 0;

  for (const packId of entryNames) {
    const measurement = await measurePack(rootDir, resolvedRoot, packId, findings);
    packs.set(packId, measurement);
    corpusFileCount += measurement.fileCount;
    corpusTotalBytes += measurement.totalBytes;
    for (const [extension, count] of Object.entries(measurement.extensionCounts)) {
      corpusExtensionCounts[extension] = (corpusExtensionCounts[extension] ?? 0) + count;
    }
  }

  const sortedCorpusExtensions = {};
  for (const key of Object.keys(corpusExtensionCounts).sort()) {
    sortedCorpusExtensions[key] = corpusExtensionCounts[key];
  }

  const corpusDigestLines = [...packs.entries()]
    .map(([packId, measurement]) => `${packId}\0${measurement.digest}\n`)
    .sort();
  const corpusDigest = createHash("sha256")
    .update(corpusDigestLines.join(""))
    .digest("hex");

  return {
    packs,
    corpus: {
      packCount: packs.size,
      fileCount: corpusFileCount,
      totalBytes: corpusTotalBytes,
      extensionCounts: sortedCorpusExtensions,
      corpusDigest: `sha256:${corpusDigest}`,
    },
    findings,
  };
}
