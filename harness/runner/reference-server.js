/**
 * Script Name : reference-server.js
 * Description : Static reference server that renders absent metrics honestly.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-15
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * A plain static file server for the reference application, replacing the
 * previous python http.server for harness runs. It differs from a generic
 * static server in exactly one way: when the generated metrics artifact is
 * absent, requesting it succeeds with an explicit not-generated payload
 * instead of a 404, so the reference page renders "metrics are not
 * generated" as a visible state on a fresh clone rather than failing a
 * request before the documented sequence ever produces the artifact.
 */

import { createReadStream } from "node:fs";
import { statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const METRICS_ARTIFACT = "/harness/metrics/metrics.json";
const NOT_GENERATED_PAYLOAD = JSON.stringify({ generated: false }) + "\n";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function argumentsByName(argv) {
  const values = { root: REPO_ROOT };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      values.root = resolve(argv[index + 1]);
      index += 1;
    } else if (!values.port) {
      values.port = Number.parseInt(argv[index], 10);
    }
  }
  return values;
}

const { port = 0, root } = argumentsByName(process.argv.slice(2));
const boundary = root.endsWith(sep) ? root : `${root}${sep}`;

function sendFile(response, path) {
  // Stream open and read errors are asynchronous: a synchronous try/catch
  // around the handler cannot see them, and an unhandled stream error would
  // take the whole server down. Answer 404 when headers allow it, and tear
  // the socket down rather than the process when they do not.
  const stream = createReadStream(path);
  stream.once("error", () => {
    if (response.headersSent) {
      response.destroy();
      return;
    }
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });
  response.writeHead(200, {
    "Content-Type": CONTENT_TYPES[extname(path)] || "application/octet-stream",
  });
  stream.pipe(response);
}

const server = createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url || "/", "http://127.0.0.1").pathname,
    );
    let path = join(root, pathname.replace(/^\/+/, ""));
    if (!path.startsWith(boundary) && path !== root) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    // The one behavioral addition over a static server: absence of the
    // generated artifact answers with an explicit not-generated state.
    if (pathname === METRICS_ARTIFACT) {
      try {
        const status = statSync(path);
        if (!status.isFile()) throw new Error("not a file");
      } catch {
        response.writeHead(200, { "Content-Type": CONTENT_TYPES[".json"] });
        response.end(NOT_GENERATED_PAYLOAD);
        return;
      }
    }
    if (statSync(path).isDirectory()) {
      // A directory request is handled, never streamed open: without an
      // index file the read stream would fail asynchronously and crash the
      // process, so the index is verified to exist and be a file first.
      const index = join(path, "index.html");
      let indexStatus;
      try {
        indexStatus = statSync(index);
      } catch {
        indexStatus = undefined;
      }
      if (!indexStatus?.isFile()) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }
      path = index;
    }
    sendFile(response, path);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  console.log(`reference server listening on http://127.0.0.1:${address.port}/ serving ${root}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
