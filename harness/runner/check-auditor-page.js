/**
 * Script Name : check-auditor-page.js
 * Description : Verify that the reference page visibly renders dependency-audit results.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import { createReadStream, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";

import { chromium } from "@playwright/test";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

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

function staticServer(root) {
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

const args = argumentsByName(process.argv.slice(2));
if (!args.root || !args.result) {
  throw new Error("usage: check-auditor-page.js --root DIR --result FILE");
}

const root = resolve(args.root);
const resultPath = resolve(args.result);
const result = {
  version: 1,
  generatedAt: new Date().toISOString(),
  root,
  url: null,
  auditor: null,
  ok: false,
  error: null,
};

const server = staticServer(root);
let browser;
try {
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  result.url = `http://127.0.0.1:${address.port}/reference/`;

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(result.url, { waitUntil: "networkidle" });
  await page.locator("#auditor:not([hidden])").waitFor({ state: "visible" });

  result.auditor = await page.locator("#auditor").evaluate((section) => {
    const style = getComputedStyle(section);
    const bounds = section.getBoundingClientRect();
    const violations = [...section.querySelectorAll(".audit-violations li")]
      .map((item) => item.textContent.trim());
    return {
      hidden: section.hidden,
      display: style.display,
      visibility: style.visibility,
      width: bounds.width,
      height: bounds.height,
      summary: section.querySelector(".section-copy")?.textContent.trim() || "",
      violations,
      visible:
        !section.hidden &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        bounds.width > 0 &&
        bounds.height > 0,
    };
  });

  if (!result.auditor.visible) {
    throw new Error("dependency audit section is not visibly rendered");
  }
  if (result.auditor.violations.length) {
    throw new Error(
      `${result.auditor.violations.length} visible dependency violation(s):\n  ${result.auditor.violations.join("\n  ")}`,
    );
  }
  result.ok = true;
} catch (error) {
  result.error = error.stack || error.message;
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
  mkdirSync(dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n");
}

if (!result.ok) {
  console.error(`AUDITOR PAGE CHECK FAILED: ${result.error}`);
} else {
  console.log(`AUDITOR PAGE OK: ${result.auditor.summary}`);
}
