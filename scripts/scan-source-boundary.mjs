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

const candidates = listFiles(["-c", "-o", "--exclude-standard"]);
const findings = [];
let scanned = 0;
for (const file of candidates) {
  const content = await readFile(path.resolve(projectRoot, file));
  if (content.includes(0)) {
    continue;
  }
  scanned += 1;
  const text = content.toString("utf8");
  for (const [label, pattern] of credentialPatterns) {
    if (pattern.test(text)) {
      findings.push(`${file}: ${label}`);
    }
  }
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
