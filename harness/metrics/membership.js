/**
 * Script Name : membership.js
 * Description : Require metrics membership evidence from the current Playwright run.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import { readFileSync, statSync } from "node:fs";

function readJson(path, label) {
  let source;
  try {
    source = readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(`${label} is absent or unreadable at ${path}: ${error.message}`);
  }

  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${label} is not valid JSON at ${path}: ${error.message}`);
  }
}

/** Read membership only when it belongs to, and follows, the current run. */
export function readCurrentMembership({ runStatePath, membershipPath }) {
  const runState = readJson(runStatePath, "Playwright run state");
  const membership = readJson(membershipPath, "membership report");

  if (typeof runState.runId !== "string" || !runState.runId) {
    throw new Error("Playwright run state has no runId");
  }
  if (typeof membership.runId !== "string" || !membership.runId) {
    throw new Error("membership report has no runId");
  }
  if (membership.runId !== runState.runId) {
    throw new Error(
      `membership report belongs to Playwright run "${membership.runId}", current run is "${runState.runId}"`,
    );
  }

  const runMtime = statSync(runStatePath).mtimeMs;
  const membershipMtime = statSync(membershipPath).mtimeMs;
  if (membershipMtime < runMtime) {
    throw new Error("membership report predates the current Playwright run");
  }

  return membership;
}
