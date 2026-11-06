// Static index validator (index conditions K2, as adjusted by D-125). Pure
// reads under one directory; no network. Used by validate-demo-index.mjs, by
// finish-demo-build.mjs and by the acquisition before it writes anything.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { compareCodeUnits } from "../../src/core/canonical-json.mjs";
import { sha256Bytes } from "../../src/pipeline/hashing.mjs";
import { PATTERN_SET_VERSION } from "../../src/demo/cite-patterns.ts";
import { VERBATIM_FIELDS } from "../../src/demo/index-types.ts";
import { hasPersonalPattern } from "../../src/demo/personal-guard.ts";
import {
  CREDENTIAL_PATTERNS,
  FORBIDDEN_OUTPUT,
  OFFICIAL_HOSTS,
  SCHEMA_PATH,
  VOCAB_KIND_OF_PATH,
  comparePart,
  kindOfPath,
  loadNationProbe,
  manifestBytes,
  probeHit,
  shardBytes,
  sourceIdOfPath,
} from "./common.mjs";

const KiB = 1024;
const MiB = 1024 * KiB;
/** Condition E. Raw bytes are the hard cap; gzip is the second check. */
export const CAPS = Object.freeze({
  manifestBytes: 64 * KiB,
  vocabFileBytes: 512 * KiB,
  vocabTotalBytes: MiB,
  vocabTotalGzipBytes: 400_000,
  shardBytes: 1.5 * MiB,
  shardGzipBytes: 400_000,
  totalWarnBytes: 8 * MiB,
  totalBytes: 12 * MiB,
  totalGzipBytes: 2_500_000,
});
/** Condition C3 as adjusted by D-125: reported now, build-failing from 2027-01-01. */
export const STALE_DAYS = 180;
export const STALE_ENFORCED_FROM = "2027-01-01T00:00:00Z";
/** The law alias table carries popularName under its own schema. */
const OTHER_SCHEMA_VERBATIM = new Set(["popularName"]);
const MODEL_WORDS = /jev|typesafe|parallel|model|probability|confidence/i;
const MARKUP = /[<>]|&#|&lt;|&gt;|&amp;/;
const ANY_URL = /https?:\/\/|www\./i;
const FILE_STATUSES = new Set(["current", "retained_after_failed_refresh"]);
const SUBDIRS = new Set(["vocab", "cfr", "usc"]);

const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
let validators;
function compiled() {
  if (validators) return validators;
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    // Conditional `required` lists name properties declared by the parent object.
    strictRequired: false,
    allowUnionTypes: true,
  });
  addFormats(ajv);
  ajv.addSchema(schema);
  const get = (name) => ajv.getSchema(`${schema.$id}#/$defs/${name}`);
  validators = {
    manifest: get("manifest"),
    "cfr-authority-shard": get("cfrAuthorityShard"),
    "usc-source-credit-shard": get("uscSourceCreditShard"),
    vocabulary: get("vocabularyFile"),
    sourceRights: get("sourceRights"),
  };
  return validators;
}

/** Validate one value against a named schema definition; returns error lines. */
export function schemaErrors(name, value) {
  const validate = compiled()[name];
  if (validate(value)) return [];
  return (validate.errors ?? [])
    .slice(0, 8)
    .map((e) => `${e.instancePath || "/"} ${e.message}`);
}

/** Property names whose schema carries $comment "verbatim" (F6). */
export function schemaVerbatimFields(node = schema, out = new Set()) {
  if (Array.isArray(node)) {
    for (const item of node) schemaVerbatimFields(item, out);
  } else if (node && typeof node === "object") {
    for (const [name, sub] of Object.entries(node.properties ?? {})) {
      if (sub && sub.$comment === "verbatim") out.add(name);
    }
    for (const sub of Object.values(node)) schemaVerbatimFields(sub, out);
  }
  return out;
}

/** Every [key, value] pair of string values, with the key that holds it. */
function* strings(value, key = "") {
  if (typeof value === "string") yield [key, value];
  else if (Array.isArray(value)) for (const v of value) yield* strings(v, key);
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) yield* strings(v, k);
}
function* keys(value) {
  if (Array.isArray(value)) for (const v of value) yield* keys(v);
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      yield k;
      yield* keys(v);
    }
}
function* patterns(value) {
  if (Array.isArray(value)) for (const v of value) yield* patterns(v);
  else if (value && typeof value === "object") {
    if (value.pattern && typeof value.pattern === "object") yield value.pattern;
    for (const v of Object.values(value)) yield* patterns(v);
  }
}

function inventory(dir, errors) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      errors.push(`linked entry: ${entry.name}`);
    } else if (entry.isDirectory() && SUBDIRS.has(entry.name)) {
      for (const inner of readdirSync(join(dir, entry.name), {
        withFileTypes: true,
      })) {
        const path = `${entry.name}/${inner.name}`;
        if (inner.isSymbolicLink()) errors.push(`linked entry: ${path}`);
        else if (!inner.isFile()) errors.push(`nested directory: ${path}`);
        else if (!inner.name.endsWith(".json"))
          errors.push(`not a .json file: ${path}`);
        else files.push(path);
      }
    } else if (entry.isFile() && entry.name === "manifest.json") {
      files.push("manifest.json");
    } else {
      errors.push(`unexpected entry: ${entry.name}`);
    }
  }
  return files;
}

function scanStrings(label, value, { shard, probe }, errors) {
  for (const [key, text] of strings(value)) {
    const where = `${label} ${key}`;
    if (MARKUP.test(text)) errors.push(`${where}: markup or entity (G6)`);
    // An allowlisted official URL (an OLRC zip name holds "@") is not contact data.
    if (!/^https:\/\/\S+$/.test(text) && hasPersonalPattern(text))
      errors.push(`${where}: personal pattern (G1)`);
    if (probeHit(text, probe))
      errors.push(`${where}: Nation-name probe hit (G3)`);
    if (!VERBATIM_FIELDS.includes(key) && MODEL_WORDS.test(text))
      errors.push(`${where}: model word (G5)`);
    if (shard && ANY_URL.test(text)) errors.push(`${where}: URL in shard (G2)`);
    if (!shard)
      for (const m of text.matchAll(/https?:\/\/([^/\s"]+)/gi))
        if (!m[0].startsWith("https://") || !OFFICIAL_HOSTS.includes(m[1]))
          errors.push(`${where}: host not on the allowlist (G2)`);
  }
  for (const key of keys(value))
    if (MODEL_WORDS.test(key)) errors.push(`${label}: model word in key (G5)`);
}

function scanRaw(label, text, errors) {
  if (
    FORBIDDEN_OUTPUT.some((p) => p.test(text)) ||
    CREDENTIAL_PATTERNS.some((p) => p.test(text))
  )
    errors.push(`${label}: prohibited content (G7)`);
}

function checkSorted(label, values, compare, errors) {
  for (let i = 1; i < values.length; i += 1) {
    const order = compare(values[i - 1], values[i]);
    if (order === 0) errors.push(`${label}: duplicate ${values[i]}`);
    else if (order > 0) errors.push(`${label}: not sorted at ${values[i]}`);
  }
}

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function checkShard(entry, value, errors) {
  const label = entry.path;
  const source = entry.source;
  if (entry.entryCount !== value.entries.length)
    errors.push(`${label}: entryCount differs from entries`);
  const title = Number(/title-(\d+)/.exec(label)?.[1]);
  if (value.artifactType !== "vocabulary" && value.title !== title)
    errors.push(`${label}: title differs from the path`);
  if (value.artifactType === "vocabulary") {
    if (value.kind !== VOCAB_KIND_OF_PATH[label])
      errors.push(`${label}: vocabulary kind differs from the path`);
    checkSorted(
      label,
      value.entries.map((e) => e.id),
      compareCodeUnits,
      errors,
    );
  } else if (value.artifactType === "cfr-authority-shard") {
    if (
      value.editionYear !== source.editionYear ||
      value.revisedAsOfText !== source.revisedAsOfText ||
      !sameJson(value.volumes, source.volumes)
    )
      errors.push(`${label}: edition differs between manifest and shard`);
    // D1: the count identity, from the edition's own tables of contents.
    if (value.entries.length !== value.partsExpected - value.partsReserved)
      errors.push(
        `${label}: count identity fails (${value.entries.length} entries, ${value.partsExpected} expected, ${value.partsReserved} reserved)`,
      );
    if (value.entries.some((e) => e.title !== value.title))
      errors.push(`${label}: entry title differs from the shard`);
    checkSorted(
      label,
      value.entries.map((e) => e.part),
      comparePart,
      errors,
    );
    for (const e of value.entries)
      for (const field of e.omitted)
        if (e[field] !== null)
          errors.push(
            `${label} part ${e.part}: omitted ${field} still present`,
          );
  } else {
    if (
      value.releasePoint !== source.releasePoint ||
      value.publicationName !== source.publicationName ||
      value.currentThroughText !== source.currentThroughText
    )
      errors.push(`${label}: release point differs between manifest and shard`);
    if ((value.chapters === null) !== !label.includes("-ch-"))
      errors.push(`${label}: chapters differ from the path`);
    const prefix = `/us/usc/t${value.title}/`;
    if (value.entries.some((e) => !e.identifier.startsWith(prefix)))
      errors.push(`${label}: identifier outside the title`);
    checkSorted(
      label,
      value.entries.map((e) => e.identifier),
      compareCodeUnits,
      errors,
    );
    for (const e of value.entries)
      if (
        e.reclassifiedAs?.noteTextOmitted &&
        e.reclassifiedAs.noteText !== null
      )
        errors.push(`${label} ${e.identifier}: omitted noteText still present`);
  }
  // H5: one pattern-set version per file, equal to the table's.
  for (const p of patterns(value.entries))
    if (
      p.version !== entry.patternSetVersion ||
      p.version !== PATTERN_SET_VERSION
    ) {
      errors.push(`${label}: pattern version ${p.version} differs (H5)`);
      break;
    }
}

/**
 * Validate a docs/demo-data directory. `probe` is a loaded Nation-name probe,
 * or `names` are plain probe names (default: the committed fixture plus the
 * committed hash file); `now` sets the clock for the stale rule.
 */
export function validateDemoIndex(dir, options = {}) {
  const now = options.now ?? new Date();
  const probe =
    options.probe ??
    (options.names
      ? { source: options.probeSource ?? "caller", names: options.names }
      : loadNationProbe());
  const ctx = { probe };
  const errors = [];
  const warnings = [];
  const stale = [];
  const result = () => ({
    ok: errors.length === 0,
    errors,
    warnings,
    stale,
    fileCount,
    currentCount,
    totalBytes,
    probe: {
      source: probe.source,
      nameCount: probe.names.length,
      hashCount: probe.hashes?.size ?? 0,
    },
  });
  let fileCount = 0;
  let currentCount = 0;
  let totalBytes = 0;

  const found = inventory(dir, errors);
  if (!found.includes("manifest.json")) {
    errors.push("manifest.json is missing");
    return result();
  }
  const raw = readFileSync(join(dir, "manifest.json"));
  if (raw.length > CAPS.manifestBytes) errors.push("manifest.json over 64 KiB");
  let manifest;
  try {
    manifest = JSON.parse(raw.toString("utf8"));
  } catch {
    errors.push("manifest.json is not JSON");
    return result();
  }
  const schemaProblems = schemaErrors("manifest", manifest);
  if (schemaProblems.length) {
    errors.push(...schemaProblems.map((e) => `manifest.json schema: ${e}`));
    return result();
  }
  if (!manifestBytes(manifest).equals(raw))
    errors.push("manifest.json is not in canonical form (H1)");
  scanRaw("manifest.json", raw.toString("utf8"), errors);
  scanStrings("manifest.json", manifest, { shard: false, ...ctx }, errors);

  // F6: the manifest list, the type constant and the schema marks agree.
  const marked = [...schemaVerbatimFields()].sort();
  const expected = VERBATIM_FIELDS.filter(
    (f) => !OTHER_SCHEMA_VERBATIM.has(f),
  ).sort();
  if (!sameJson(manifest.verbatimFields, [...VERBATIM_FIELDS]))
    errors.push("manifest verbatimFields differ from VERBATIM_FIELDS (F6)");
  if (!sameJson(marked, expected))
    errors.push("schema verbatim marks differ from VERBATIM_FIELDS (F6)");

  const paths = manifest.files.map((f) => f.path);
  checkSorted("manifest files", paths, compareCodeUnits, errors);

  const withFile = new Set(
    manifest.files
      .filter((f) => FILE_STATUSES.has(f.status))
      .map((f) => f.path),
  );
  for (const path of found)
    if (path !== "manifest.json" && !withFile.has(path))
      errors.push(`${path}: file not listed in the manifest as present`);

  let vocabBytes = 0;
  const vocabBuffers = [];
  const allBuffers = [];
  for (const entry of manifest.files) {
    const label = entry.path;
    if (entry.kind !== kindOfPath(label))
      errors.push(`${label}: kind differs from the path`);
    if (entry.source && entry.source.id !== sourceIdOfPath(label))
      errors.push(
        `${label}: source ${entry.source.id} is not this path's source`,
      );
    if (entry.currentReference && entry.kind !== "cfr-authority-shard")
      errors.push(`${label}: currentReference on a file with no CFR part`);
    if (entry.source) {
      const age = (now - new Date(entry.source.retrievedAt)) / 86_400_000;
      if (age > STALE_DAYS) {
        stale.push(label);
        if (entry.staleAcknowledgedOn !== null)
          warnings.push(
            `${label}: stale, acknowledged ${entry.staleAcknowledgedOn}`,
          );
        else if (now >= new Date(STALE_ENFORCED_FROM))
          errors.push(`${label}: snapshot older than ${STALE_DAYS} days (C3)`);
        else
          warnings.push(
            `${label}: snapshot older than ${STALE_DAYS} days (C3, enforced from 2027-01-01)`,
          );
      }
    }
    if (!FILE_STATUSES.has(entry.status)) continue;
    if (!found.includes(label)) {
      errors.push(`${label}: listed as ${entry.status} but missing`);
      continue;
    }
    fileCount += 1;
    if (entry.status === "current") currentCount += 1;
    if (entry.patternSetVersion !== PATTERN_SET_VERSION)
      errors.push(
        `${label}: patternSetVersion is not ${PATTERN_SET_VERSION} (H5)`,
      );
    const bytes = readFileSync(join(dir, label));
    totalBytes += bytes.length;
    allBuffers.push(bytes);
    if (bytes.length !== entry.sizeBytes)
      errors.push(`${label}: size mismatch`);
    if (sha256Bytes(bytes) !== entry.sha256)
      errors.push(`${label}: hash mismatch`);
    const vocab = entry.kind === "vocabulary";
    if (vocab) {
      vocabBytes += bytes.length;
      vocabBuffers.push(bytes);
      if (bytes.length > CAPS.vocabFileBytes)
        errors.push(`${label}: over 512 KiB`);
    } else {
      if (bytes.length > CAPS.shardBytes) errors.push(`${label}: over 1.5 MiB`);
      if (gzipSync(bytes).length > CAPS.shardGzipBytes)
        errors.push(`${label}: over 400 KB gzipped`);
    }
    const text = bytes.toString("utf8");
    scanRaw(label, text, errors);
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      errors.push(`${label}: not JSON`);
      continue;
    }
    const problems = schemaErrors(entry.kind, value);
    if (problems.length) {
      errors.push(...problems.map((e) => `${label} schema: ${e}`));
      continue;
    }
    if (!shardBytes(value).equals(bytes))
      errors.push(`${label}: not in canonical form (H1)`);
    checkShard(entry, value, errors);
    scanStrings(label, value, { shard: true, ...ctx }, errors);
  }
  if (vocabBytes > CAPS.vocabTotalBytes)
    errors.push("vocabulary over 1 MiB in all");
  if (
    vocabBuffers.length &&
    gzipSync(Buffer.concat(vocabBuffers)).length > CAPS.vocabTotalGzipBytes
  )
    errors.push("vocabulary over 400 KB gzipped in all");
  if (totalBytes > CAPS.totalBytes) errors.push("demo-data over 12 MiB in all");
  else if (totalBytes > CAPS.totalWarnBytes)
    warnings.push("demo-data over 8 MiB in all");
  if (
    allBuffers.length &&
    gzipSync(Buffer.concat(allBuffers)).length > CAPS.totalGzipBytes
  )
    errors.push("demo-data over 2.5 MB gzipped in all");
  return result();
}
