/**
 * Script Name : baseline-reporter.js
 * Description : Stage golden candidates for post-process baseline commit.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-01
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Candidate PNGs arrive as in-memory test attachments. A canonical capture
 * wrapper gives the reporter a one-run inherited pipe. The reporter never
 * accepts a caller path and never approves a baseline. Only the wrapper can
 * authenticate the in-memory transaction and finalize it after every gate.
 */

import { fstatSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, posix, relative, resolve, sep, win32 } from "node:path";
import { fileURLToPath } from "node:url";

import {
  commitBaselineEstablishment,
  establishBaseline,
  assertApprovedPathSafe,
  readApprovalManifest,
} from "./compare.js";

export const BASELINE_ATTACHMENT_TYPE =
  "application/vnd.h5gameui.baseline-establishment+png";
export const BASELINE_COMPARISON_TYPE =
  "application/vnd.h5gameui.baseline-comparison+json";
export const BASELINE_TRANSACTION_PROTOCOL = "h5gameui-baseline-pipe-v1";
const ATTACHMENT_PREFIX = "baseline-establishment:";
const COMPARISON_PREFIX = "baseline-comparison:";
const DEFAULT_APPROVED_ROOT = fileURLToPath(
  new URL("../goldens/approved/", import.meta.url),
);

function candidateBody(attachment) {
  if (attachment.body) return Buffer.from(attachment.body);
  if (attachment.path) return readFileSync(attachment.path);
  throw new Error(`baseline attachment "${attachment.name}" has no PNG body`);
}

function caseIdentity(name) {
  const prefix = name.startsWith(ATTACHMENT_PREFIX)
    ? ATTACHMENT_PREFIX
    : COMPARISON_PREFIX;
  const caseId = name.slice(prefix.length);
  if (
    !caseId ||
    caseId.includes("\\") ||
    posix.isAbsolute(caseId) ||
    win32.isAbsolute(caseId) ||
    caseId.split("/").includes("..")
  ) {
    throw new Error(`invalid baseline attachment identity "${caseId}"`);
  }
  return caseId;
}

function approvedPathForCase(approvedRoot, caseId) {
  const identity = caseIdentity(`${ATTACHMENT_PREFIX}${caseId}`);
  const root = resolve(approvedRoot);
  const approvedPath = resolve(root, ...identity.split("/"));
  const fromRoot = relative(root, approvedPath);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error(`invalid baseline attachment identity "${caseId}"`);
  }
  assertApprovedPathSafe(root, approvedPath);
  return approvedPath;
}

function comparisonBody(attachment) {
  const parsed = JSON.parse(candidateBody(attachment).toString("utf8"));
  return {
    status: parsed.status,
    reason: parsed.reason,
    caseId: caseIdentity(attachment.name),
  };
}

function errorText(error) {
  return error?.message || String(error);
}

function canonicalTransactionFd({ transactionFd, protocol, authorization }) {
  if (
    protocol !== BASELINE_TRANSACTION_PROTOCOL ||
    !authorization ||
    !Number.isInteger(transactionFd) ||
    transactionFd < 0
  ) {
    return undefined;
  }
  try {
    const descriptor = fstatSync(transactionFd);
    return descriptor.isFIFO() || descriptor.isSocket()
      ? transactionFd
      : undefined;
  } catch {
    return undefined;
  }
}

function emptyTransaction() {
  return {
    runFailed: false,
    comparisonResults: [],
    conformanceFailures: [],
    candidates: [],
  };
}

/**
 * Parse and authenticate one transaction already collected in memory by the
 * canonical wrapper.
 *
 * @param {{serialized:string|Buffer, authorization:string, approvedRoot?:string}} options
 */
export function parseBaselineTransaction({
  serialized,
  authorization,
  approvedRoot = DEFAULT_APPROVED_ROOT,
}) {
  if (!serialized?.length) return emptyTransaction();
  const transaction = JSON.parse(Buffer.from(serialized).toString("utf8"));
  if (transaction.version !== 1 || transaction.authorization !== authorization) {
    throw new Error("refusing unauthorized baseline transaction");
  }
  if (
    !Array.isArray(transaction.candidates) ||
    !Array.isArray(transaction.comparisonResults) ||
    !Array.isArray(transaction.conformanceFailures)
  ) {
    throw new Error("invalid baseline transaction shape");
  }
  return {
    runFailed: !!transaction.runFailed,
    comparisonResults: transaction.comparisonResults,
    conformanceFailures: transaction.conformanceFailures,
    candidates: transaction.candidates.map(({ caseId, candidateBase64 }) => ({
      caseId: caseIdentity(`${ATTACHMENT_PREFIX}${caseId}`),
      approvedRoot,
      approvedPath: approvedPathForCase(approvedRoot, caseId),
      candidatePng: Buffer.from(candidateBase64, "base64"),
    })),
  };
}

/**
 * Finalize a previously authenticated in-memory transaction. The process
 * outcome is an independent guard, not reporter state.
 *
 * @param {{transaction:object, processSucceeded:boolean, manifestPath?:string}} options
 */
export function finalizeBaselineTransaction({
  transaction,
  processSucceeded,
  manifestPath,
}) {
  const manifest = readApprovalManifest(manifestPath);
  const candidates = transaction.candidates.map((candidate) =>
    establishBaseline({ ...candidate, manifest }),
  );
  return commitBaselineEstablishment({
    candidates,
    comparisonResults: transaction.comparisonResults,
    conformanceFailures: transaction.conformanceFailures,
    runFailed: !processSucceeded || transaction.runFailed,
    path: manifestPath,
  });
}

export default class BaselineReporter {
  constructor(options = {}) {
    this.transactionFd = canonicalTransactionFd(options);
    this.authorization = options.authorization;
    this.attachments = [];
    this.comparisonResults = [];
    this.conformanceFailures = [];
    this.reporterFailed = false;
  }

  onTestEnd(_testCase, result) {
    const resultComparisons = [];
    for (const attachment of result.attachments || []) {
      if (
        attachment.contentType === BASELINE_ATTACHMENT_TYPE &&
        attachment.name.startsWith(ATTACHMENT_PREFIX)
      ) {
        this.attachments.push({
          caseId: caseIdentity(attachment.name),
          candidatePng: candidateBody(attachment),
        });
      }
      if (
        attachment.contentType === BASELINE_COMPARISON_TYPE &&
        attachment.name.startsWith(COMPARISON_PREFIX)
      ) {
        const comparison = comparisonBody(attachment);
        this.comparisonResults.push(comparison);
        resultComparisons.push(comparison);
      }
    }
    const comparisonFailed = resultComparisons.some(({ status }) => status === "failure");
    for (const error of result.errors || []) {
      const message = errorText(error);
      if (!comparisonFailed || !message.startsWith("golden ")) {
        this.conformanceFailures.push(message);
      }
    }
  }

  onError(error) {
    this.reporterFailed = true;
    this.conformanceFailures.push(errorText(error));
  }

  onEnd(result) {
    if (!this.attachments.length) return;
    if (this.transactionFd == null) {
      console.log(
        `goldens: discarded ${this.attachments.length} pending baseline(s); ` +
          "not a canonical capture",
      );
      return;
    }
    writeFileSync(
      this.transactionFd,
      JSON.stringify(
        {
          version: 1,
          authorization: this.authorization,
          runFailed: result.status !== "passed" || this.reporterFailed,
          comparisonResults: this.comparisonResults,
          conformanceFailures: this.conformanceFailures,
          candidates: this.attachments.map(({ caseId, candidatePng }) => ({
            caseId,
            candidateBase64: candidatePng.toString("base64"),
          })),
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      `goldens: staged ${this.attachments.length} pending baseline(s) for process finalization`,
    );
  }
}
