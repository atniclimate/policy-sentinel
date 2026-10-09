import { createServer } from "node:http";
import { safeFile } from "../../../core/local-output-bindings.mjs";

const fail = (code) => {
  throw new Error(code);
};

const contentType = (path) =>
  ({
    html: "text/html; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json; charset=utf-8",
    svg: "image/svg+xml",
    txt: "text/plain; charset=utf-8",
    md: "text/plain; charset=utf-8",
  })[path.split(".").at(-1)] ?? "application/octet-stream";
export function createLoopbackOutputServer(files, port = 4179) {
  if (
    !(files instanceof Map) ||
    !Number.isInteger(port) ||
    port < 0 ||
    port > 65535
  )
    fail("INVALID_SERVE_CONFIGURATION");
  const server = createServer((request, response) => {
    const expectedHost = `127.0.0.1:${server.address().port}`;
    const ownOrigin = `http://${expectedHost}`;
    // No DNS-rebinding host, cross-origin embedding, proxying, logs, or directory fallback.
    if (
      request.headers.host !== expectedHost ||
      (request.headers.origin && request.headers.origin !== ownOrigin) ||
      request.headers["sec-fetch-site"] === "cross-site" ||
      !["GET", "HEAD"].includes(request.method)
    ) {
      response.writeHead(403);
      response.end();
      return;
    }
    const url = request.url;
    const name = url === "/" ? "index.html" : url.slice(1);
    if (!url.startsWith("/") || !safeFile(name) || !files.has(name)) {
      response.writeHead(404);
      response.end();
      return;
    }
    const bytes = files.get(name);
    response.writeHead(200, {
      "content-type": contentType(name),
      "content-length": bytes.length,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "cross-origin-resource-policy": "same-origin",
      "content-security-policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    });
    response.end(request.method === "HEAD" ? undefined : bytes);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
