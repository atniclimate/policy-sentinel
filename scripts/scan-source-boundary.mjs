import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const forbiddenTrackedPrefixes = [
  ".cache/",
  "ai-summaries/",
  "cached-responses/",
  "dist/",
  "generated-data/",
  "node_modules/",
  "private/",
  "public-data/",
  "raw-data/",
  "secrets/",
];
const forbiddenTrackedNames = new Set([".env"]);
const credentialPatterns = [
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ["GitHub fine-grained token", /\bgithub_pat_[A-Za-z0-9_]{30,}\b/],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["Google API key", /\bAIza[A-Za-z0-9_-]{35}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ["Stripe live secret", /\bsk_live_[A-Za-z0-9]{20,}\b/],
  ["npm token", /\bnpm_[A-Za-z0-9]{30,}\b/],
];

const listFiles = (arguments_) =>
  execFileSync("git", ["ls-files", ...arguments_, "-z"], {
    cwd: projectRoot,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)
    .map((file) => file.replaceAll("\\", "/"));

const tracked = listFiles([]);
for (const file of tracked) {
  const lower = file.toLowerCase();
  const basename = lower.split("/").at(-1);
  if (
    forbiddenTrackedNames.has(basename) ||
    basename.startsWith(".env.") ||
    forbiddenTrackedPrefixes.some((prefix) => lower.startsWith(prefix))
  ) {
    throw new Error(
      `forbidden generated, secret, or private path is tracked: ${file}`,
    );
  }
}

// Index conditions A6 and K4: docs/demo-data holds only the .json files its
// manifest names; raw downloads never land there.
const indexPrefix = "docs/demo-data/";
const indexTracked = tracked.filter((file) => file.startsWith(indexPrefix));
if (indexTracked.length > 0) {
  let named;
  try {
    const manifest = JSON.parse(
      await readFile(
        path.resolve(projectRoot, indexPrefix, "manifest.json"),
        "utf8",
      ),
    );
    named = new Set(manifest.files.map((entry) => entry.path));
  } catch {
    throw new Error(
      "docs/demo-data is tracked but its manifest.json cannot be read",
    );
  }
  for (const file of indexTracked) {
    const relative = file.slice(indexPrefix.length);
    if (/\.(?:xml|zip|html?|txt)$/i.test(file) || !file.endsWith(".json"))
      throw new Error(
        `raw or non-JSON file tracked under docs/demo-data: ${file}`,
      );
    if (relative !== "manifest.json" && !named.has(relative))
      throw new Error(
        `file under docs/demo-data is not named in its manifest: ${file}`,
      );
  }
}

const candidates = listFiles(["-c", "-o", "--exclude-standard"]);
// Index condition A3: no page or Worker code reaches the acquisition.
const pageScopes = ["demo/", "src/demo/", "worker/"];
const acquisitionImport =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["'][^"']*(?:acquire-demo-index|demo-index\/acquire)[^"']*["']/;
const boundaryFindings = [];
const findings = [];
let scanned = 0;
for (const file of candidates) {
  let content;
  try {
    content = await readFile(path.resolve(projectRoot, file));
  } catch (error) {
    // A tracked file deleted from the working tree but not staged has nothing to scan.
    if (error?.code === "ENOENT") continue;
    throw error;
  }
  if (content.includes(0)) {
    continue;
  }
  scanned += 1;
  const text = content.toString("utf8");
  if (
    pageScopes.some((scope) => file.startsWith(scope)) &&
    acquisitionImport.test(text)
  ) {
    boundaryFindings.push(`${file}: imports the index acquisition script`);
  }
  for (const [label, pattern] of credentialPatterns) {
    if (pattern.test(text)) {
      findings.push(`${file}: ${label}`);
    }
  }
}

if (boundaryFindings.length > 0) {
  throw new Error(
    `page or Worker code imports the index acquisition:\n${boundaryFindings
      .map((finding) => `- ${finding}`)
      .join("\n")}`,
  );
}

if (findings.length > 0) {
  throw new Error(
    `credential-like material found in source scope:\n${findings
      .map((finding) => `- ${finding}`)
      .join("\n")}`,
  );
}

console.log(
  `Source-boundary scan passed: ${tracked.length} tracked paths and ${scanned} source files checked.`,
);
