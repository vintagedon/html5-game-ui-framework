/**
 * Script Name : membership-freshness.test.js
 * Description : Assert metrics consume membership from the current Playwright run.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

async function membershipReader() {
  try {
    return await import("../metrics/membership.js");
  } catch {
    assert.fail("membership freshness reader must exist as a pure module");
  }
}

function withScratch(run) {
  const directory = mkdtempSync(join(tmpdir(), "h5gameui-membership-"));
  try {
    return run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

test("current membership requires the same Playwright run identity", async () => {
  const { readCurrentMembership } = await membershipReader();
  withScratch((directory) => {
    const runStatePath = join(directory, "playwright-run.json");
    const membershipPath = join(directory, "membership.json");
    writeJson(runStatePath, { version: 1, runId: "current" });
    writeJson(membershipPath, { version: 1, runId: "previous" });

    assert.throws(
      () => readCurrentMembership({ runStatePath, membershipPath }),
      /membership report belongs to Playwright run "previous", current run is "current"/,
    );
  });
});

test("current membership must not predate the Playwright run", async () => {
  const { readCurrentMembership } = await membershipReader();
  withScratch((directory) => {
    const runStatePath = join(directory, "playwright-run.json");
    const membershipPath = join(directory, "membership.json");
    writeJson(runStatePath, { version: 1, runId: "same" });
    writeJson(membershipPath, { version: 1, runId: "same" });
    utimesSync(membershipPath, new Date(1_000), new Date(1_000));
    utimesSync(runStatePath, new Date(2_000), new Date(2_000));

    assert.throws(
      () => readCurrentMembership({ runStatePath, membershipPath }),
      /membership report predates the current Playwright run/,
    );
  });
});

test("current membership returns a matching fresh report", async () => {
  const { readCurrentMembership } = await membershipReader();
  withScratch((directory) => {
    const runStatePath = join(directory, "playwright-run.json");
    const membershipPath = join(directory, "membership.json");
    const report = { version: 1, runId: "same", distinctPairings: 8 };
    writeJson(runStatePath, { version: 1, runId: "same" });
    writeJson(membershipPath, report);
    utimesSync(runStatePath, new Date(1_000), new Date(1_000));
    utimesSync(membershipPath, new Date(2_000), new Date(2_000));

    assert.deepEqual(
      readCurrentMembership({ runStatePath, membershipPath }),
      report,
    );
  });
});
