/**
 * Script Name : capture-amendment4.js
 * Description : Capture styled Amendment 4 evidence from one isolated revision.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  createReadStream,
  mkdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";

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
if (!args.root || !args["output-dir"] || !args.label || !args.result) {
  throw new Error(
    "usage: capture-amendment4.js --root DIR --output-dir DIR --label before|after --result FILE [--stylesheet PATH]",
  );
}
if (!new Set(["before", "after"]).has(args.label)) {
  throw new Error(`label must be before or after, got ${args.label}`);
}

const root = resolve(args.root);
const outputDir = resolve(args["output-dir"]);
const resultPath = resolve(args.result);
const stylesheet = args.stylesheet || "/src/gc.css";
const revision = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const result = {
  version: 1,
  generatedAt: new Date().toISOString(),
  label: args.label,
  root,
  revision,
  stylesheet,
  stylesheetResponse: null,
  stylesheetPresentInCssom: false,
  stylesheetLoaded: false,
  computed: null,
  captures: {},
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
  const base = `http://127.0.0.1:${address.port}`;
  const stylesheetUrl = new URL(stylesheet, base).href;

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("response", (response) => {
    if (response.url() === stylesheetUrl) result.stylesheetResponse = response.status();
  });
  await page.setContent(
    `<!doctype html>
    <html lang="en" data-gc-theme="modern">
      <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="${stylesheetUrl}">
        <style>
          #a4-fixture { box-sizing: border-box; inline-size: 52rem; padding: 2rem; display: grid; gap: 1.5rem; }
          #a4-controls { display: grid; grid-template-columns: 12rem 1fr; gap: 1rem; align-items: center; }
        </style>
      </head>
      <body>
        <main id="a4-fixture">
          <article id="a4-panel" class="gc-panel">
            <h2>Panel edge</h2>
            <p>Raised panel with default border and soft elevation.</p>
          </article>
          <div id="a4-controls">
            <button class="gc-button" type="button">Button</button>
            <input class="gc-input" aria-label="Input" placeholder="Input">
          </div>
        </main>
      </body>
    </html>`,
    { waitUntil: "networkidle" },
  );

  const state = await page.evaluate((expectedStylesheet) => {
    const panel = document.querySelector("#a4-panel");
    const button = document.querySelector(".gc-button");
    const input = document.querySelector(".gc-input");
    const panelStyle = getComputedStyle(panel);
    const buttonStyle = getComputedStyle(button);
    const inputStyle = getComputedStyle(input);
    const stylesheetPresentInCssom = [...document.styleSheets].some(
      (sheet) => sheet.href === expectedStylesheet,
    );
    return {
      stylesheetPresentInCssom,
      semanticBorderDefault: getComputedStyle(document.documentElement)
        .getPropertyValue("--gc-border-default").trim(),
      panelBorderColor: panelStyle.borderTopColor,
      panelBorderWidth: panelStyle.borderTopWidth,
      panelBorderStyle: panelStyle.borderTopStyle,
      buttonBorderColor: buttonStyle.borderTopColor,
      buttonBorderWidth: buttonStyle.borderTopWidth,
      inputBorderColor: inputStyle.borderTopColor,
      inputBorderWidth: inputStyle.borderTopWidth,
    };
  }, stylesheetUrl);
  result.stylesheetPresentInCssom = state.stylesheetPresentInCssom;
  result.stylesheetLoaded =
    result.stylesheetResponse === 200 &&
    state.stylesheetPresentInCssom &&
    Boolean(state.semanticBorderDefault);
  result.computed = state;
  if (result.stylesheetResponse !== 200) {
    throw new Error(
      `framework stylesheet response was ${result.stylesheetResponse ?? "absent"}, expected 200: ${stylesheetUrl}`,
    );
  }
  if (!result.stylesheetLoaded) {
    throw new Error(
      `framework stylesheet unavailable before capture: cssom=${state.stylesheetPresentInCssom}, --gc-border-default=${state.semanticBorderDefault || "empty"}`,
    );
  }
  if (state.panelBorderStyle === "none" || Number.parseFloat(state.panelBorderWidth) <= 0) {
    throw new Error(
      `framework panel border unavailable before capture: ${state.panelBorderWidth} ${state.panelBorderStyle}`,
    );
  }

  mkdirSync(outputDir, { recursive: true });
  for (const [name, selector] of [["panel", "#a4-panel"], ["edges", "#a4-fixture"]]) {
    const path = join(outputDir, `h5gameui-a4-${args.label}-${name}.png`);
    const bytes = await page.locator(selector).screenshot({
      type: "png",
      animations: "disabled",
    });
    writeFileSync(path, bytes);
    result.captures[name] = {
      path,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    };
  }
  result.ok = true;
} catch (error) {
  result.error = error.stack || error.message;
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
  writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n");
}

if (!result.ok) {
  console.error(`AMENDMENT 4 CAPTURE FAILED: ${result.error}`);
} else {
  console.log(
    `AMENDMENT 4 ${result.label.toUpperCase()} CAPTURE OK: ${result.revision}; ` +
      `--gc-border-default=${result.computed.semanticBorderDefault}; ` +
      `panel=${result.computed.panelBorderWidth} ${result.computed.panelBorderColor}`,
  );
}
