// Shared pieces of the static index acquisition and validator (index
// conditions 2026-11-05 as adjusted by D-125). No network, no writes.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJson } from "../../src/core/canonical-json.mjs";
import { US_STATE_NAMES } from "../../src/core/jurisdiction-reference.mjs";
import { serializeJson } from "../../src/pipeline/hashing.mjs";
import {
  BIA_RECOGNITION_2026,
  parseRecognitionEntries,
  verifyReviewedRecognitionInventory,
} from "../../src/adapters/bia/recognition-registry.ts";
import { maskProtectedSpans } from "../../src/demo/nation-mask.ts";
import { hasPersonalPattern } from "../../src/demo/personal-guard.ts";

export const ACQUIRE_VERSION = "1.0.0";
export const APPROVAL_REF = "D-125";
export const SCHEMA_REF = "../../schemas/demo-index.schema.v1.json";
export const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

export { insideRepo } from "../repository-path.mjs";
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

/** A trailing ", <State>" list such as ", Arizona, California & Nevada". */
const STATE_ALT = Object.values(US_STATE_NAMES)
  .map((s) => s.replaceAll(" ", "\\s+"))
  .join("|");
const TRAILING_STATES = new RegExp(
  `\\s*,\\s*(?:${STATE_ALT})(?:\\s*(?:,\\s*&?|&|and)\\s*(?:${STATE_ALT}))*$`,
  "i",
);

/**
 * Nation-name probe names: every raw entry parsed from the official
 * recognition notice HTML at `path` (saved outside the repository), or, by
 * default, from the committed structure fixture.
 */
export function loadProbeNames(
  path,
  { requireReviewedInventory = false } = {},
) {
  const file = path ?? DEFAULT_PROBE_FIXTURE;
  const entries = parseRecognitionEntries(readFileSync(file, "utf8"), "html");
  if (requireReviewedInventory) verifyReviewedRecognitionInventory(entries);
  const names = new Set();
  for (const { exactText } of entries) {
    names.add(exactText);
    const head = headName(exactText);
    if (head) names.add(head);
    // G3: the name is also printed without its state ("Example Owingeh").
    const bare = head.replace(TRAILING_STATES, "");
    if (bare) names.add(bare);
  }
  const source = path
    ? "recognition input (--nation-names)"
    : "committed recognition structure fixture";
  const fileHashes = probeHashFile(names, entries.length);
  return {
    source,
    names: [...names],
    entryCount: entries.length,
    hashes: new Set(fileHashes.hashes),
    maxWords: fileHashes.maxWords,
  };
}

/**
 * G3: the full list of 575 federally recognized Nations. The notice prints
 * 577 entry paragraphs. Coverage is pinned separately.
 */
export const FULL_PROBE_ENTRIES = BIA_RECOGNITION_2026.expectedNationCount;
// SHA-256 of the sorted, LF-joined normalized hashes in the reviewed v1 list.
const REVIEWED_HASH_DIGEST =
  "d447f36359fe4c6226ca20f6b84b2ab28c72bded32e16093078b6e952d1f4798";
const REVIEWED_MAX_WORDS = 17;
export const INCOMPLETE_PROBE =
  "Nation-name probes do not cover the reviewed 575-Nation inventory at its required word span (G3)";
function reviewedHashes(hashes) {
  const sorted = [...hashes].sort();
  return (
    sorted.every(
      (hash) => typeof hash === "string" && /^[0-9a-f]{64}$/.test(hash),
    ) && sha256Hex(sorted.join("\n")) === REVIEWED_HASH_DIGEST
  );
}

export function isFullProbe(probe) {
  if (
    !Number.isSafeInteger(probe.entryCount) ||
    probe.entryCount < FULL_PROBE_ENTRIES ||
    !Number.isSafeInteger(probe.maxWords) ||
    probe.maxWords < REVIEWED_MAX_WORDS ||
    !probe.hashes?.size
  )
    return false;
  if (reviewedHashes(probe.hashes)) return true;
  const baseline =
    probe.baselineHashes ??
    (existsSync(PROBE_HASH_PATH)
      ? JSON.parse(readFileSync(PROBE_HASH_PATH, "utf8")).hashes
      : undefined);
  return (
    Array.isArray(baseline) &&
    reviewedHashes(baseline) &&
    baseline.every((hash) => probe.hashes.has(hash))
  );
}

/**
 * Decision 10 (2026-11-06): the committed hashed probes. The owner keeps the
 * plain list and writes this file with scripts/make-nation-probe-hashes.mjs.
 */
export const PROBE_HASH_PATH = fileURLToPath(
  new URL("../../config/nation-name-probes.sha256.v1.json", import.meta.url),
);
/**
 * NFC, lower case, then words are runs of letters, marks and digits joined by
 * one space, so punctuation and line breaks separate words. Each name is also
 * hashed without a leading "the".
 */
export const PROBE_NORMALIZATION = "nfc-lower-words.v1";

const probeWords = (text) =>
  text
    .normalize("NFC")
    .toLowerCase()
    .normalize("NFC")
    .match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
const sha256Hex = (text) =>
  createHash("sha256").update(text, "utf8").digest("hex");

/** The hash file for a plain list: hashes, counts and version, never a name. */
export function probeHashFile(names, entryCount) {
  const forms = new Set();
  for (const name of names) {
    const words = probeWords(name);
    for (const form of words[0] === "the" ? [words, words.slice(1)] : [words])
      if (form.length) forms.add(form.join(" "));
  }
  // A form that begins with another listed form never sets the run length:
  // the scan reaches the shorter form first from the same word. All forms stay
  // hashed, so the count check in hashedProbe is unchanged.
  const lengths = [...forms].map((form) => {
    const words = form.split(" ");
    for (let n = 1; n < words.length; n += 1)
      if (forms.has(words.slice(0, n).join(" "))) return 0;
    return words.length;
  });
  return {
    artifactType: "nation-name-probe-hashes",
    normalization: PROBE_NORMALIZATION,
    entryCount,
    maxWords: Math.max(0, ...lengths),
    hashes: [...forms].map(sha256Hex).sort(),
  };
}

/** A checked hash file as a probe; throws on any other shape. */
export function hashedProbe(file, source) {
  const hashes = file?.hashes;
  const ok =
    file?.artifactType === "nation-name-probe-hashes" &&
    file.normalization === PROBE_NORMALIZATION &&
    Number.isInteger(file.entryCount) &&
    file.entryCount >= 0 &&
    Number.isSafeInteger(file.maxWords) &&
    file.maxWords >= 1 &&
    Array.isArray(hashes) &&
    hashes.length >= file.entryCount &&
    hashes.every(
      (h, i) =>
        typeof h === "string" &&
        /^[0-9a-f]{64}$/.test(h) &&
        (i === 0 || hashes[i - 1] < h),
    );
  if (!ok)
    throw new Error(
      `${source} is not a sorted Nation-name probe hash file (${PROBE_NORMALIZATION})`,
    );
  return {
    source,
    names: [],
    entryCount: file.entryCount,
    hashes: new Set(hashes),
    maxWords: file.maxWords,
  };
}

/**
 * The probe the checks use: the plain list at `namesPath` (default: the
 * committed fixture) plus the hash file. The default hash file may be absent;
 * a named one must exist. Full when either holds the full list.
 */
export function loadNationProbe({ namesPath, hashPath } = {}) {
  const plain = loadProbeNames(namesPath);
  const path = hashPath ?? PROBE_HASH_PATH;
  if (!hashPath && !existsSync(path)) return plain;
  const hashed = hashedProbe(
    JSON.parse(readFileSync(path, "utf8")),
    `hashed recognition list (${basename(path)})`,
  );
  // A separately supplied reviewed file or plain notice remains verifiable
  // after union with supplemental hashes, even when the default file is absent.
  const baseline = [hashed.hashes, plain.hashes].find(reviewedHashes);
  return {
    ...hashed,
    source: `${plain.source} + ${hashed.source}`,
    names: plain.names,
    hashes: new Set([...hashed.hashes, ...plain.hashes]),
    baselineHashes: baseline ? [...baseline] : undefined,
    maxWords: Math.max(plain.maxWords, hashed.maxWords),
    entryCount: Math.max(plain.entryCount, hashed.entryCount),
  };
}

/** True when a run of 1 to maxWords words of `text` hashes to a listed name. */
export function probeHashHit(text, probe) {
  if (!probe.hashes?.size) return false;
  const words = probeWords(text);
  for (let i = 0; i < words.length; i += 1) {
    let run = "";
    for (let n = i; n < words.length && n - i < probe.maxWords; n += 1) {
      run = n === i ? words[n] : `${run} ${words[n]}`;
      if (probe.hashes.has(sha256Hex(run))) return true;
    }
  }
  return false;
}

/** True when the structural mask or an injected name marks any span (G3). */
export const hasProtectedSpan = (text, names) =>
  maskProtectedSpans(text, { names }).spans.length > 0;

/** G3 with a whole probe: plain names, the structural mask and the hashes. */
export const probeHit = (text, probe) =>
  hasProtectedSpan(text, probe.names) || probeHashHit(text, probe);

const fold = (s) => s.normalize("NFC").replace(/\s+/g, " ").toLowerCase();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * An exact probe name present in text by itself: the same match
 * src/demo/nation-mask.ts's injected-name pass makes, but never a
 * STRUCTURAL anchor word (D-191: a named-in vocabulary entry skips only the
 * structural mask, never an exact name on the list).
 */
function exactNameHit(text, names) {
  const folded = fold(text);
  return (names ?? []).some((name) => {
    const n = fold(name).trim();
    return (
      n.length > 0 &&
      new RegExp(
        `(?<![\\p{L}\\p{N}])${escapeRe(n)}(?![\\p{L}\\p{N}])`,
        "u",
      ).test(folded)
    );
  });
}

/**
 * G3 for a named-in vocabulary label (D-191): the hashed recognition list
 * and an exact injected probe name, never the structural mask. `probe` is a
 * plain name list or a whole probe carrying the hashes, the same shape
 * wordingProblem and probeHit take.
 */
export function namedInProbeHit(text, probe) {
  const names = probe && !Array.isArray(probe) ? probe.names : probe;
  const hashHit =
    probe && !Array.isArray(probe) ? probeHashHit(text, probe) : false;
  return hashHit || exactNameHit(text, names);
}

/**
 * Why a named-in label (D-191) may still not be carried: the hashed
 * recognition list or an exact injected probe name (nation_name_probe), a
 * URL (G2), a personal pattern (G1) or markup (G6). Skips the structural
 * Nation-name mask the id is named in against.
 */
export function namedInWordingProblem(text, probe) {
  if (namedInProbeHit(text, probe)) return "nation_name_probe";
  if (/https?:\/\/|www\./i.test(text)) return "url";
  if (hasPersonalPattern(text)) return "personal_pattern";
  if (/[<>]|&#|&lt;|&gt;|&amp;/.test(text)) return "markup";
  return null;
}

/**
 * Why official wording may not be carried, or null: a Nation-name probe hit
 * (G3), a URL (G2), a personal pattern (G1) or markup (G6).
 */
export function wordingProblem(text, names) {
  // `names` is a plain name list, or a whole probe carrying the hashes (D-175).
  if (
    names && !Array.isArray(names)
      ? probeHit(text, names)
      : hasProtectedSpan(text, names)
  )
    return "nation_name_probe";
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
