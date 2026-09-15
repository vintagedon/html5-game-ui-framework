/**
 * Script Name : smoke-published-process.test.js
 * Description : Exercise published smoke reporting through its browser process.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-01
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  createReadStream,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SMOKE_PATH = fileURLToPath(new URL("../runner/smoke-published.js", import.meta.url));

function listen(server) {
  return new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
}

function close(server) {
  return new Promise((resolveClose) => server.close(resolveClose));
}

function runProcess(executable, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(executable, args, {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.once("error", rejectRun);
    child.once("close", (status) => {
      resolveRun({
        status: status ?? 1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
  });
}

function referenceServer(root, injectedUrl, injectedScript) {
  const boundary = root.endsWith(sep) ? root : `${root}${sep}`;
  return createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url || "/", "http://127.0.0.1").pathname,
      );
      let path = resolve(root, pathname.replace(/^\/+/, ""));
      if (path !== root && !path.startsWith(boundary)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      if (statSync(path).isDirectory()) path = join(path, "index.html");
      if (path === join(root, "reference", "index.html")) {
        const injections = [
          injectedUrl ? `<script>fetch(${JSON.stringify(injectedUrl)}).catch(() => {});</script>` : "",
          injectedScript ?? "",
        ].filter(Boolean).join("");
        const html = readFileSync(path, "utf8").replace(
          "</body>",
          `${injections}</body>`,
        );
        response.writeHead(200, { "Content-Type": CONTENT_TYPES[".html"] });
        response.end(html);
        return;
      }
      response.writeHead(200, {
        "Content-Type": CONTENT_TYPES[extname(path)] || "application/octet-stream",
      });
      createReadStream(path).pipe(response);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

test("published smoke aggregates deduplicated off-origin observations at run level", async (t) => {
  const scratch = mkdtempSync(join(tmpdir(), "h5gameui-smoke-"));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));

  const offOriginServer = createServer((_request, response) => {
    response.writeHead(204, { "Access-Control-Allow-Origin": "*" });
    response.end();
  });
  await listen(offOriginServer);
  t.after(() => close(offOriginServer));
  const offOriginAddress = offOriginServer.address();
  const injectedUrl = `http://127.0.0.1:${offOriginAddress.port}/induced-request`;

  const server = referenceServer(REPO_ROOT, injectedUrl);
  await listen(server);
  t.after(() => close(server));
  const address = server.address();
  const resultPath = join(scratch, "published-smoke.json");
  const run = await runProcess(process.execPath, [
    SMOKE_PATH,
    "--url",
    `http://127.0.0.1:${address.port}/reference/`,
    "--result",
    resultPath,
  ]);

  assert.equal(run.status, 1, `${run.stdout}\n${run.stderr}`);
  const report = JSON.parse(readFileSync(resultPath, "utf8"));
  const perView = report.views.flatMap((view) => view.offOriginRequests);
  assert.ok(perView.some((item) => item.url === injectedUrl));
  assert.ok(
    report.assertions.some(
      (assertion) => assertion.id.endsWith(":off-origin-requests") && !assertion.pass,
    ),
    "the induced observation must continue to fail a per-view assertion",
  );
  assert.deepEqual(
    report.network.offOriginRequests,
    [...new Map(perView.map((item) => [item.url, item])).values()],
  );
});

test("published smoke merges induced module failures into the run-level report", async (t) => {
  const scratch = mkdtempSync(join(tmpdir(), "h5gameui-smoke-"));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));

  // A same-origin script that 404s is a module-load failure in every view.
  // Removing the per-view merge into network.moduleFailures must make this
  // test fail, which is the discrimination the merge previously lacked.
  const missingModule = "/induced-missing-module.js";
  const server = referenceServer(REPO_ROOT, undefined, `<script src="${missingModule}" defer></script>`);
  await listen(server);
  t.after(() => close(server));
  const address = server.address();
  const resultPath = join(scratch, "published-smoke.json");
  const run = await runProcess(process.execPath, [
    SMOKE_PATH,
    "--url",
    `http://127.0.0.1:${address.port}/reference/`,
    "--result",
    resultPath,
  ]);

  assert.equal(run.status, 1, `${run.stdout}\n${run.stderr}`);
  const report = JSON.parse(readFileSync(resultPath, "utf8"));
  const perView = report.views.flatMap((view) => view.moduleFailures);
  assert.ok(
    perView.some((item) => item.url.endsWith(missingModule)),
    "the induced module failure must be observed per view",
  );
  assert.ok(
    report.assertions.some(
      (assertion) => assertion.id.endsWith(":module-load-failures") && !assertion.pass,
    ),
    "the induced module failure must continue to fail a per-view assertion",
  );
  assert.ok(
    report.network.moduleFailures.some((item) => item.url.endsWith(missingModule)),
    "the induced module failure must appear in the run-level report",
  );
});
