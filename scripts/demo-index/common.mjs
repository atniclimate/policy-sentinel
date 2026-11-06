// Shared pieces of the static index acquisition and validator (index
// conditions 2026-11-05 as adjusted by D-125). No network, no writes.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { canonicalJson } from "../../src/core/canonical-json.mjs";
import { serializeJson } from "../../src/pipeline/hashing.mjs";
import {
  BIA_RECOGNITION_2026,
  parseRecognitionEntries,
} from "../../src/adapters/bia/recognition-registry.ts";
import { maskProtectedSpans } from "../../src/demo/nation-mask.ts";
import { hasPersonalPattern } from "../../src/demo/personal-guard.ts";

export const ACQUIRE_VERSION = "1.0.0";
export const APPROVAL_REF = "D-125";
export const SCHEMA_REF = "../../schemas/demo-index.schema.v1.json";
export const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const SCHEMA_PATH = fileURLToPath(
  new URL("../../schemas/demo-index.schema.v1.json", import.meta.url),
);
export const DEFAULT_PROBE_FIXTURE = fileURLToPath(
  new URL(
    "../../fixtures/sources/bia/recognition-structure.html",
    import.meta.url,
  ),
);
export const OFFICIAL_HOSTS = Object.freeze([
  "www.ecfr.gov",
  "uscode.house.gov",
  "www.federalregister.gov",
  "www.govinfo.gov",
]);

/**
 * Generated-output refusals shared by scripts/finish-demo-build.mjs and the
 * index validator (G7). The quote is optional and a comma counts, so query
 * strings and call arguments are caught too.
 */
export const FORBIDDEN_OUTPUT = Object.freeze([
  /api[_-]?key["']?\s*[:=,]\s*["']?[A-Za-z0-9]{16,}/i,
  /X-Api-Key["']?\s*[:,]\s*["']?[A-Za-z0-9]{16,}/i,
  /(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /[A-Za-z]:[\\/]+(?:Users|dev|policy-sentinel|ATNI-TERRA)[\\/]+/i,
  /sourceMappingURL\s*=/,
  /Passage note from the browser check\./,
  /Policy note from the browser check\./,
]);
/** The credential patterns of scripts/scan-source-boundary.mjs. */
export const CREDENTIAL_PATTERNS = Object.freeze([
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bAIza[A-Za-z0-9_-]{35}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bsk_live_[A-Za-z0-9]{20,}\b/,
  /\bnpm_[A-Za-z0-9]{30,}\b/,
]);

/** The files the page plans for; each starts unavailable with a null source. */
export const PLANNED_FILES = Object.freeze([
  "cfr/title-25.json",
  "cfr/title-36.json",
  "cfr/title-40.json",
  "cfr/title-43.json",
  "cfr/title-50.json",
  "usc/title-16.json",
  "usc/title-25.json",
  "usc/title-33.json",
  "usc/title-42.json",
  "vocab/cfr-titles.json",
  "vocab/fr-agencies.json",
  "vocab/fr-topics.json",
]);

export function kindOfPath(path) {
  if (path.startsWith("vocab/")) return "vocabulary";
  if (path.startsWith("cfr/")) return "cfr-authority-shard";
  return "usc-source-credit-shard";
}

/** The source id each path must carry (the closed source list of D-125). */
export function sourceIdOfPath(path) {
  if (path === "vocab/cfr-titles.json") return "ecfr";
  if (path.startsWith("vocab/")) return "federal-register-api";
  if (path.startsWith("cfr/")) return "govinfo-cfr-annual";
  return "olrc-uslm";
}

export const VOCAB_KIND_OF_PATH = Object.freeze({
  "vocab/fr-agencies.json": "fr_agency",
  "vocab/fr-topics.json": "fr_topic",
  "vocab/cfr-titles.json": "cfr_title",
});

export function unavailableEntry(path, patternSetVersion) {
  return {
    path,
    kind: kindOfPath(path),
    status: "unavailable",
    sha256: null,
    sizeBytes: null,
    entryCount: null,
    source: null,
    patternSetVersion,
    lastRefreshAttemptAt: null,
    failureStage: null,
    message: null,
    withdrawnOn: null,
    staleAcknowledgedOn: null,
    currentReference: null,
  };
}

export function initialManifest({
  generatedAt,
  patternSetVersion,
  verbatimFields,
}) {
  return {
    $schema: SCHEMA_REF,
    schemaVersion: "1.0.0",
    artifactType: "demo-index-manifest",
    generatedAt,
    generatedBy: {
      script: "scripts/acquire-demo-index.mjs",
      version: ACQUIRE_VERSION,
    },
    approvalRef: APPROVAL_REF,
    verbatimFields: [...verbatimFields],
    files: PLANNED_FILES.map((path) =>
      unavailableEntry(path, patternSetVersion),
    ),
  };
}

/** Shards and vocabulary files: compact canonical JSON, one trailing newline (H1). */
export const shardBytes = (value) =>
  Buffer.from(`${canonicalJson(value)}\n`, "utf8");
/** The manifest: pretty, two spaces, for review diffs (H1). */
export const manifestBytes = (value) =>
  Buffer.from(serializeJson(value), "utf8");

/** Numeric-aware part order: 1, 1a, 2, 10 (H2). */
export function comparePart(left, right) {
  const a = /^(\d+)(.*)$/.exec(left) ?? [left, "0", left];
  const b = /^(\d+)(.*)$/.exec(right) ?? [right, "0", right];
  const byNumber = Number(a[1]) - Number(b[1]);
  if (byNumber !== 0) return byNumber;
  return a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0;
}

/** The entry text with trailing parenthetical notes removed (as the test probes do). */
function headName(text) {
  let out = text.trim();
  while (out.endsWith(")")) {
    let depth = 0;
    let open = -1;
    for (let i = out.length - 1; i >= 0; i -= 1) {
      if (out[i] === ")") depth += 1;
      else if (out[i] === "(" && --depth === 0) {
        open = i;
        break;
      }
    }
    if (open <= 0) break;
    out = out.slice(0, open).trim();
  }
  return out;
}

/**
 * Nation-name probe names: every raw entry parsed from the official
 * recognition notice HTML at `path` (saved outside the repository), or, by
 * default, from the committed structure fixture.
 */
export function loadProbeNames(path) {
  const file = path ?? DEFAULT_PROBE_FIXTURE;
  const entries = parseRecognitionEntries(readFileSync(file, "utf8"), "html");
  const names = new Set();
  for (const { exactText } of entries) {
    names.add(exactText);
    const head = headName(exactText);
    if (head) names.add(head);
  }
  return {
    source: path
      ? "official recognition notice (--nation-names)"
      : "committed recognition structure fixture",
    names: [...names],
    entryCount: entries.length,
  };
}

/**
 * G3: the full list of 575 federally recognized Nations. The notice prints
 * 577 entry paragraphs (two are groupings), so at least 575 entries is full.
 */
export const FULL_PROBE_ENTRIES = BIA_RECOGNITION_2026.expectedNationCount;
export const isFullProbe = (probe) =>
  (probe.entryCount ?? 0) >= FULL_PROBE_ENTRIES;

/** True when the structural mask or an injected name marks any span (G3). */
export const hasProtectedSpan = (text, names) =>
  maskProtectedSpans(text, { names }).spans.length > 0;

/**
 * Why official wording may not be carried, or null: a Nation-name probe hit
 * (G3), a URL (G2), a personal pattern (G1) or markup (G6).
 */
export function wordingProblem(text, names) {
  if (hasProtectedSpan(text, names)) return "nation_name_probe";
  if (/https?:\/\/|www\./i.test(text)) return "url";
  if (hasPersonalPattern(text)) return "personal_pattern";
  if (/[<>]|&#|&lt;|&gt;|&amp;/.test(text)) return "markup";
  return null;
}

/** A failure with its source-health stage (D2). */
export class StageError extends Error {
  constructor(stage, message) {
    super(message);
    this.stage = stage;
  }
}

/** Remove URLs and cut to 240 characters, as sanitizePublicMessage does (D2). */
export function sanitizeMessage(message) {
  const text = String(message ?? "").trim() || "Source refresh failed.";
  return text
    .replaceAll(/https?:\/\/\S+/g, "[source]")
    .replaceAll(/www\.\S+/g, "[source]")
    .replaceAll(/[<>]/g, "")
    .slice(0, 240);
}
