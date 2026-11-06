#!/usr/bin/env node
// Checks the reviewed law alias table (config/law-aliases.v1.json) and the
// combined vocabulary ceiling, and writes the owner's review packet. It makes
// no network call: scripts/acquire-demo-index.mjs is the only fetcher
// (index condition A3), and no build, check, demo:build or test script runs
// this one (design T1.2: a separate approved step).
//
//   node scripts/build-vocab.mjs [--aliases <file>] [--vocab-dir <dir>]
//                                [--review-packet <path outside the repository>]
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import Ajv2020 from "ajv/dist/2020.js";
import {
  canonicalJson,
  compareCodeUnits,
} from "../src/core/canonical-json.mjs";
import { parseCitation } from "../src/demo/cite-patterns.ts";
import { maskProtectedSpans } from "../src/demo/nation-mask.ts";
import { personalPatternHits } from "../src/demo/personal-guard.ts";

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ALIAS_PATH = join(REPO, "config", "law-aliases.v1.json");
export const VOCAB_DIR = join(REPO, "docs", "demo-data", "vocab");
const SCHEMA_PATH = join(REPO, "schemas", "law-aliases.schema.v1.json");

/** Index conditions E2 and E3. */
export const LIMITS = Object.freeze({
  aliasBytes: 128 * 1024,
  aliasEntries: 400,
  vocabFileBytes: 512 * 1024,
  vocabTotalBytes: 1024 * 1024,
  vocabTotalGzipBytes: 400 * 1000,
});

let validate;
function schemaValidator() {
  validate ??= new Ajv2020({ strict: true, allErrors: true }).compile(
    JSON.parse(readFileSync(SCHEMA_PATH, "utf8")),
  );
  return validate;
}

function* strings(value, path = "") {
  if (typeof value === "string") yield [path, value];
  else if (Array.isArray(value))
    for (const [i, v] of value.entries()) yield* strings(v, `${path}[${i}]`);
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      yield [`${path}.${k}#key`, k];
      yield* strings(v, `${path}.${k}`);
    }
}

/** Personal-pattern and Nation-name hits in one string (conditions G1, G3). */
export function stringProblems(text, names = []) {
  const problems = [];
  if (personalPatternHits(text).length) problems.push("personal pattern");
  if (
    maskProtectedSpans(text, { names }).spans.some(
      (s) => s.kind === "nation_name",
    )
  )
    problems.push("Nation name shape");
  return problems;
}

/**
 * Every problem with the alias table text; [] when it passes. `names` adds
 * exact names to the structural Nation-name mask (tests pass the probes).
 */
export function aliasProblems(text, { names = [] } = {}) {
  const problems = [];
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > LIMITS.aliasBytes)
    problems.push(
      `alias table is ${bytes} bytes; the cap is ${LIMITS.aliasBytes}`,
    );
  let file;
  try {
    file = JSON.parse(text);
  } catch (error) {
    return [...problems, `alias table is not JSON: ${error.message}`];
  }
  const check = schemaValidator();
  if (!check(file))
    for (const e of check.errors ?? [])
      problems.push(`schema: ${e.instancePath || "/"} ${e.message}`);
  const entries = Array.isArray(file?.entries) ? file.entries : [];
  if (entries.length > LIMITS.aliasEntries)
    problems.push(
      `${entries.length} entries; the cap is ${LIMITS.aliasEntries}`,
    );
  for (let i = 1; i < entries.length; i += 1)
    if (
      compareCodeUnits(entries[i - 1]?.popularName, entries[i]?.popularName) >=
      0
    )
      problems.push(
        `entries[${i}] is out of popularName order or repeats a name`,
      );
  for (const [i, entry] of entries.entries()) {
    for (const [j, c] of (entry?.citations ?? []).entries()) {
      const parsed = typeof c?.text === "string" ? parseCitation(c.text) : null;
      if (
        !parsed ||
        parsed.kind !== "usc" ||
        parsed.title !== c.title ||
        parsed.section !== c.section ||
        parsed.etSeq !== c.etSeq ||
        parsed.pattern.id !== c.pattern?.id ||
        parsed.pattern.version !== c.pattern?.version
      )
        problems.push(
          `entries[${i}].citations[${j}] does not parse as its fields say`,
        );
    }
  }
  for (const [path, value] of strings(file))
    for (const p of stringProblems(value, names))
      problems.push(`${path || "/"}: ${p}`);
  return problems;
}

/** Raw and gzip size of the vocabulary files plus the alias table (condition E2). */
export function vocabularyCeiling(
  vocabDir = VOCAB_DIR,
  aliasPath = ALIAS_PATH,
) {
  const problems = [];
  const files = existsSync(vocabDir)
    ? readdirSync(vocabDir)
        .filter((n) => n.endsWith(".json"))
        .sort(compareCodeUnits)
        .map((n) => join(vocabDir, n))
    : [];
  let rawBytes = 0;
  let gzipBytes = 0;
  for (const path of [...files, aliasPath]) {
    const bytes = readFileSync(path);
    if (path !== aliasPath && bytes.length > LIMITS.vocabFileBytes)
      problems.push(
        `${relative(REPO, path)} is ${bytes.length} bytes; the cap is ${LIMITS.vocabFileBytes}`,
      );
    rawBytes += bytes.length;
    gzipBytes += gzipSync(bytes, { level: 9 }).length;
  }
  if (rawBytes > LIMITS.vocabTotalBytes)
    problems.push(
      `vocabulary is ${rawBytes} bytes raw; the cap is ${LIMITS.vocabTotalBytes}`,
    );
  if (gzipBytes > LIMITS.vocabTotalGzipBytes)
    problems.push(
      `vocabulary is ${gzipBytes} bytes gzipped; the cap is ${LIMITS.vocabTotalGzipBytes}`,
    );
  return { files: files.length, rawBytes, gzipBytes, problems };
}

export function entriesDigest(entries) {
  return createHash("sha256")
    .update(canonicalJson(entries), "utf8")
    .digest("hex");
}

/** The owner's review packet: each entry, the count and the SHA-256 of the canonical entries. */
export function reviewPacket(file) {
  const entries = file.entries ?? [];
  const lines = [
    "# Law alias table: review packet",
    "",
    `Entries: ${entries.length}`,
    `SHA-256 of the canonical entries: ${entriesDigest(entries)}`,
    "",
    "Approve each entry only after reading its OLRC page. No entry may name a Nation.",
    "",
  ];
  for (const e of entries) {
    lines.push(
      `- ${e.popularName}: ${e.citations.map((c) => c.text).join("; ")}`,
    );
    lines.push(`  ${e.olrcUrl} (read ${e.reviewedOn} by ${e.reviewerRole})`);
  }
  return `${lines.join("\n")}\n`;
}

export function insideRepo(path) {
  const rel = relative(REPO, resolve(path));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function writeReviewPacket(path, file) {
  if (insideRepo(path))
    throw new Error("The review packet goes outside the repository.");
  writeFileSync(path, reviewPacket(file), "utf8");
}

function main(argv) {
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const aliasPath = resolve(arg("--aliases") ?? ALIAS_PATH);
  const vocabDir = resolve(arg("--vocab-dir") ?? VOCAB_DIR);
  const packet = arg("--review-packet");
  const text = readFileSync(aliasPath, "utf8");
  const ceiling = vocabularyCeiling(vocabDir, aliasPath);
  const problems = [...aliasProblems(text), ...ceiling.problems];
  console.log(
    `aliases ${JSON.parse(text).entries?.length ?? 0} entries; vocabulary ${ceiling.files} files, ${ceiling.rawBytes} bytes raw, ${ceiling.gzipBytes} gzipped`,
  );
  if (problems.length) {
    for (const p of problems) console.error(p);
    return 1;
  }
  if (packet) {
    writeReviewPacket(packet, JSON.parse(text));
    console.log(`review packet written to ${packet}`);
  }
  return 0;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = main(process.argv.slice(2));
