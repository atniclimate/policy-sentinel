import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { TextDecoder, types } from "node:util";
import { URL } from "node:url";
import {
  hasStateJurisdictionEvidence,
  parseJurisdictionAssociation,
  US_STATE_CODES,
} from "../core/jurisdiction-reference.mjs";

export const ANALYZED_CORPUS_V2_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/analyzed-corpus.schema.v2.json";
export const ANALYZED_CORPUS_V2_SCHEMA_VERSION = "2.0.0";
export const ANALYZED_CORPUS_V21_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/analyzed-corpus.schema.v2.1.json";
export const ANALYZED_CORPUS_V21_SCHEMA_VERSION = "2.1.0";
const CATALOGS = [
  "sourceProfiles",
  "captures",
  "works",
  "versions",
  "renditions",
  "segments",
  "events",
  "relationships",
  "analyses",
  "findings",
  "coverage",
];
const ROOT = [
  "$schema",
  "schemaVersion",
  "kind",
  "id",
  "runId",
  "trustDomain",
  "generatedAt",
  ...CATALOGS,
  "contentDigest",
];
const DATE_PRECISIONS = ["year", "month", "day", "unknown"];
const ID = /^[a-z][a-z0-9:._-]{0,191}$/u;
const DIGEST = /^[a-f0-9]{64}$/u;
const VERSION = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;
const MAX_TEXT_BYTES = 64 * 1024 * 1024;
const MAX_CORPUS_CHARACTERS = 128 * 1024 * 1024;
const MAX_NODES = 500000;
const own = (value, key) => Object.hasOwn(value, key);
const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
const intrinsicByteLength = Object.getOwnPropertyDescriptor(
  typedArrayPrototype,
  "byteLength",
).get;
const intrinsicBuffer = Object.getOwnPropertyDescriptor(
  typedArrayPrototype,
  "buffer",
).get;
const intrinsicSet = typedArrayPrototype.set;

export class AnalyzedCorpusV2Error extends TypeError {
  constructor(code) {
    super(`Analyzed corpus v2 rejected input: ${code}`);
    this.name = "AnalyzedCorpusV2Error";
    this.code = code;
  }
}
function fail(code) {
  throw new AnalyzedCorpusV2Error(code);
}
function requireValue(condition, code) {
  if (!condition) fail(code);
}
function copyBytes(value) {
  requireValue(
    types.isUint8Array(value) && !types.isProxy(value),
    "INVALID_BYTES",
  );
  requireValue(
    types.isArrayBuffer(intrinsicBuffer.call(value)),
    "INVALID_BYTES",
  );
  const length = intrinsicByteLength.call(value);
  requireValue(length > 0 && length <= MAX_TEXT_BYTES, "OBJECT_BYTE_LIMIT");
  const copy = Buffer.allocUnsafe(length);
  intrinsicSet.call(copy, value);
  return copy;
}
function snapshot(
  value,
  ancestors = new Set(),
  budget = { nodes: 0, chars: 0 },
  depth = 0,
) {
  requireValue(++budget.nodes <= MAX_NODES && depth <= 40, "INPUT_LIMIT");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    requireValue(Number.isSafeInteger(value), "UNSAFE_NUMBER");
    return value;
  }
  if (typeof value === "string") {
    budget.chars += value.length;
    requireValue(
      budget.chars <= MAX_CORPUS_CHARACTERS && value.isWellFormed(),
      "INPUT_LIMIT",
    );
    return value;
  }
  requireValue(
    typeof value === "object" && !types.isProxy(value),
    "PLAIN_JSON_REQUIRED",
  );
  requireValue(!ancestors.has(value), "PLAIN_JSON_REQUIRED");
  const array = Array.isArray(value);
  requireValue(
    Object.getPrototypeOf(value) ===
      (array ? Array.prototype : Object.prototype) ||
      (!array && Object.getPrototypeOf(value) === null),
    "PLAIN_JSON_REQUIRED",
  );
  const descriptors = Object.getOwnPropertyDescriptors(value);
  requireValue(
    Reflect.ownKeys(descriptors).every(
      (key) =>
        typeof key === "string" &&
        "value" in descriptors[key] &&
        ((key === "length" && array) || descriptors[key].enumerable),
    ),
    "PLAIN_JSON_REQUIRED",
  );
  ancestors.add(value);
  let result;
  if (array) {
    requireValue(
      Object.keys(descriptors).length === value.length + 1 &&
        value.length <= 100000,
      "INPUT_LIMIT",
    );
    result = [];
    for (let index = 0; index < value.length; index++) {
      requireValue(own(descriptors, String(index)), "PLAIN_JSON_REQUIRED");
      result.push(
        snapshot(descriptors[index].value, ancestors, budget, depth + 1),
      );
    }
  } else {
    result = Object.create(null);
    for (const key of Object.keys(descriptors)) {
      requireValue(
        !["__proto__", "prototype", "constructor"].includes(key),
        "PLAIN_JSON_REQUIRED",
      );
      result[key] = snapshot(
        descriptors[key].value,
        ancestors,
        budget,
        depth + 1,
      );
    }
  }
  ancestors.delete(value);
  return result;
}
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
    .join(",")}}`;
}
function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}
export function canonicalV2Digest(value) {
  return hash(canonical(snapshot(value)));
}
function seal(value) {
  const { contentDigest, ...body } = value;
  const expected = hash(canonical(body));
  if (contentDigest !== undefined)
    requireValue(contentDigest === expected, "CONTENT_DIGEST_MISMATCH");
  return { ...body, contentDigest: expected };
}
function verifySeal(value) {
  requireValue(
    typeof value.contentDigest === "string" && DIGEST.test(value.contentDigest),
    "CONTENT_DIGEST_REQUIRED",
  );
  seal(value);
}
function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
// Only complete, module-validated and recursively frozen corpus snapshots enter
// this set. Caller-frozen objects and equal digests do not establish trust.
const validatedCorpora = new WeakSet();
function rememberValidatedCorpus(value) {
  if (!validatedCorpora.has(value)) {
    freeze(value);
    validatedCorpora.add(value);
  }
  return value;
}
function keys(value, expected) {
  requireValue(
    value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === expected.length &&
      Object.keys(value).every((key) => expected.includes(key)),
    "CLOSED_SHAPE_REQUIRED",
  );
}
function text(value, max = 4096, allowEmpty = false) {
  requireValue(
    typeof value === "string" &&
      (allowEmpty || value.length > 0) &&
      value.length <= max,
    "INVALID_TEXT",
  );
  requireValue(
    !/[^\t\n\r\u0020-\u007e\u0080-\u{10ffff}]/u.test(value),
    "INVALID_TEXT",
  );
}
function id(value) {
  requireValue(typeof value === "string" && ID.test(value), "INVALID_ID");
}
function digest(value) {
  requireValue(
    typeof value === "string" && DIGEST.test(value),
    "INVALID_DIGEST",
  );
}
function count(value, max = Number.MAX_SAFE_INTEGER) {
  requireValue(
    Number.isSafeInteger(value) && value >= 0 && value <= max,
    "INVALID_COUNT",
  );
}
function values(value, min = 0, max = 100000) {
  requireValue(
    Array.isArray(value) && value.length >= min && value.length <= max,
    "ARRAY_LIMIT",
  );
  return value;
}
function strings(value, min = 0, max = 1000) {
  values(value, min, max).forEach((entry) => text(entry));
}
function choice(value, options) {
  requireValue(options.includes(value), "INVALID_ENUM");
}
function timestamp(value) {
  requireValue(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value),
    "INVALID_TIMESTAMP",
  );
  const parsed = new Date(value);
  requireValue(
    !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().replace(".000Z", "Z") ===
        value.replace(".000Z", "Z"),
    "INVALID_TIMESTAMP",
  );
  return parsed.getTime();
}
function date(value) {
  keys(value, ["value", "precision"]);
  choice(value.precision, DATE_PRECISIONS);
  if (value.precision === "unknown") {
    requireValue(value.value === null, "INVALID_DATE");
    return null;
  }
  const pattern = {
    year: /^\d{4}$/u,
    month: /^\d{4}-\d{2}$/u,
    day: /^\d{4}-\d{2}-\d{2}$/u,
  }[value.precision];
  requireValue(
    typeof value.value === "string" && pattern.test(value.value),
    "INVALID_DATE",
  );
  const start =
    value.value + { year: "-01-01", month: "-01", day: "" }[value.precision];
  timestamp(`${start}T00:00:00Z`);
  return start;
}
function url(value, profile = null) {
  text(value, 4096);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("UNSAFE_URL");
  }
  requireValue(
    parsed.protocol === "https:" &&
      parsed.username === "" &&
      parsed.password === "" &&
      parsed.port === "" &&
      parsed.hash === "" &&
      !/%(?:2e|2f|5c|00)/iu.test(value) &&
      !/\\/u.test(value),
    "UNSAFE_URL",
  );
  requireValue(
    !["localhost", "localhost.localdomain"].includes(parsed.hostname) &&
      !/^(?:\d+\.|\[)/u.test(parsed.hostname) &&
      parsed.hostname.includes("."),
    "UNSAFE_URL",
  );
  for (const key of parsed.searchParams.keys())
    requireValue(
      !/(?:token|key|secret|password|auth|signature|credential)/iu.test(key),
      "UNSAFE_URL",
    );
  if (profile)
    requireValue(
      profile.hosts.includes(parsed.hostname) &&
        profile.pathPrefixes.some((prefix) =>
          parsed.pathname.startsWith(prefix),
        ),
      "URL_OUTSIDE_PROFILE",
    );
  return parsed;
}
function method(value) {
  keys(value, ["id", "version"]);
  id(value.id);
  requireValue(VERSION.test(value.version), "INVALID_VERSION");
}
function reviewer(value, generatedAt) {
  keys(value, ["name", "kind", "reviewedAt"]);
  text(value.name, 256);
  choice(value.kind, ["agent", "human", "rule"]);
  requireValue(
    timestamp(value.reviewedAt) <= timestamp(generatedAt),
    "FUTURE_REVIEW",
  );
}
function catalog(value, name, globalIds) {
  const map = new Map();
  for (const entry of values(value, 0, 100000)) {
    requireValue(
      entry !== null && typeof entry === "object" && !Array.isArray(entry),
      "CLOSED_SHAPE_REQUIRED",
    );
    id(entry.id);
    verifySeal(entry);
    requireValue(!globalIds.has(entry.id), "DUPLICATE_ID");
    globalIds.add(entry.id);
    map.set(entry.id, entry);
  }
  if (["sourceProfiles", "coverage"].includes(name))
    requireValue(map.size > 0, "EMPTY_CORE_CATALOG");
  return map;
}
function resolve(map, key) {
  const value = map.get(key);
  requireValue(value !== undefined, "UNRESOLVED_REFERENCE");
  return value;
}
function refs(list, map, min = 0) {
  values(list, min);
  requireValue(new Set(list).size === list.length, "DUPLICATE_REFERENCE");
  return list.map((key) => {
    id(key);
    return resolve(map, key);
  });
}
function segmentBytes(segment, maps) {
  const rendition = resolve(maps.renditions, segment.renditionId);
  return maps.renditionBuffers
    .get(rendition.id)
    .subarray(segment.startByte, segment.endByte);
}
function pointer(value, path) {
  requireValue(
    typeof path === "string" &&
      /^\/(?:[^/~]|~[01])+(?:\/(?:[^/~]|~[01])+)*$/u.test(path),
    "INVALID_PROVENANCE_POINTER",
  );
  let current = value;
  for (const key of path
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    requireValue(
      current !== null && typeof current === "object" && own(current, key),
      "INVALID_PROVENANCE_POINTER",
    );
    current = current[key];
  }
  requireValue(
    current === null || typeof current !== "object",
    "PROVENANCE_LEAF_REQUIRED",
  );
  return current;
}
function provenance(record, required, maps, permittedProfileId = null) {
  const seen = new Set();
  for (const entry of values(record.fieldProvenance, required.length, 10000)) {
    keys(entry, [
      "field",
      "mode",
      "captureId",
      "sourceLocator",
      "segmentIds",
      "ruleId",
    ]);
    requireValue(
      !seen.has(entry.field) && required.includes(entry.field),
      "PROVENANCE_POINTER_SET",
    );
    seen.add(entry.field);
    const fieldValue = pointer(record, entry.field);
    choice(entry.mode, ["source_attested", "deterministic"]);
    const capture = resolve(maps.captures, entry.captureId);
    if (permittedProfileId !== null)
      requireValue(
        capture.sourceProfileId === permittedProfileId,
        "PROVENANCE_SOURCE_MISMATCH",
      );
    text(entry.sourceLocator, 2048);
    const sourceSegments = refs(entry.segmentIds, maps.segments);
    if (sourceSegments.length === 0) {
      requireValue(
        [
          "$capture.requestedUrl",
          "$capture.finalUrl",
          "$capture.retrievedAt",
        ].includes(entry.sourceLocator),
        "PROVENANCE_EVIDENCE_REQUIRED",
      );
      requireValue(
        entry.mode === "source_attested" &&
          fieldValue === capture[entry.sourceLocator.slice("$capture.".length)],
        "CAPTURE_PROPERTY_PROVENANCE_MISMATCH",
      );
    }
    for (const segment of sourceSegments)
      requireValue(
        resolve(maps.renditions, segment.renditionId).captureId === capture.id,
        "PROVENANCE_CAPTURE_MISMATCH",
      );
    if (sourceSegments.length > 0 && entry.mode === "source_attested")
      requireValue(
        typeof fieldValue === "string" &&
          sourceSegments.some((segment) =>
            segmentBytes(segment, maps).toString("utf8").includes(fieldValue),
          ),
        "SOURCE_ATTESTED_VALUE_NOT_IN_EVIDENCE",
      );
    if (entry.mode === "deterministic") id(entry.ruleId);
    else requireValue(entry.ruleId === null, "UNDECLARED_DERIVATION");
  }
  requireValue(seen.size === required.length, "PROVENANCE_REQUIRED");
}
function assertSegmentScope(segmentIds, versionId, maps) {
  for (const segment of refs(segmentIds, maps.segments, 1))
    requireValue(
      resolve(maps.renditions, segment.renditionId).versionId === versionId,
      "EVIDENCE_VERSION_MISMATCH",
    );
}

function jurisdictionAssociations(work, maps, generatedAt, trustDomain) {
  const seen = new Set();
  for (const association of values(work.jurisdictionRefs, 0, 256)) {
    keys(association, [
      "jurisdictionRef",
      "basis",
      "evidence",
      "reviewState",
      "versionId",
      "segmentIds",
      "reviewer",
    ]);
    const {
      versionId,
      segmentIds,
      reviewer: reviewedBy,
      ...shared
    } = association;
    parseJurisdictionAssociation(JSON.stringify(shared), work.id);
    requireValue(
      !association.jurisdictionRef.startsWith("us-state:") ||
        US_STATE_CODES.includes(association.jurisdictionRef.slice(9)),
      "JURISDICTION_STATE_UNKNOWN",
    );
    requireValue(
      !association.jurisdictionRef.startsWith("nation:") ||
        (trustDomain === "synthetic_test_only" &&
          association.jurisdictionRef.startsWith("nation:synthetic-")),
      "JURISDICTION_NATION_REGISTRY_REQUIRED",
    );
    requireValue(
      association.evidence.exactSubject !== undefined,
      "JURISDICTION_EXACT_SUBJECT_REQUIRED",
    );
    requireValue(
      !association.jurisdictionRef.startsWith("us-state:") ||
        hasStateJurisdictionEvidence(
          association.jurisdictionRef,
          association.evidence.exactSubject.text,
        ),
      "JURISDICTION_STATE_EXACT_IDENTITY",
    );
    requireValue(
      !association.jurisdictionRef.startsWith("nation:") ||
        association.evidence.exactSubject.text
          .split(/[^a-z0-9:-]+/u)
          .includes(association.jurisdictionRef),
      "JURISDICTION_NATION_EXACT_IDENTITY",
    );
    const identity = `${association.jurisdictionRef}@${association.basis}@${versionId}`;
    requireValue(!seen.has(identity), "DUPLICATE_JURISDICTION_ASSOCIATION");
    seen.add(identity);
    const version = resolve(maps.versions, versionId);
    requireValue(version.workId === work.id, "JURISDICTION_WORK_MISMATCH");
    assertSegmentScope(segmentIds, versionId, maps);
    const evidenceSegments = refs(segmentIds, maps.segments, 1);
    requireValue(
      evidenceSegments.every((segment) => {
        const rendition = resolve(maps.renditions, segment.renditionId);
        const capture = resolve(maps.captures, rendition.captureId);
        return (
          capture.sourceProfileId === work.sourceProfileId &&
          capture.finalUrl === association.evidence.url
        );
      }),
      "JURISDICTION_SOURCE_MISMATCH",
    );
    requireValue(
      evidenceSegments.some((segment) => {
        const bytes = maps.renditionBuffers.get(segment.renditionId);
        return (
          segment.locator.value === association.evidence.locator &&
          bytes
            .subarray(segment.startByte, segment.endByte)
            .toString("utf8")
            .includes(association.evidence.exactSubject.text)
        );
      }),
      "JURISDICTION_STATEMENT_REPLAY",
    );
    if (association.reviewState === "reviewed")
      requireValue(reviewedBy !== null, "JURISDICTION_REVIEW_REQUIRED");
    if (reviewedBy !== null) {
      reviewer(reviewedBy, generatedAt);
      requireValue(
        evidenceSegments.every((segment) => {
          const rendition = resolve(maps.renditions, segment.renditionId);
          return (
            timestamp(
              resolve(maps.captures, rendition.captureId).retrievedAt,
            ) <= timestamp(reviewedBy.reviewedAt)
          );
        }),
        "JURISDICTION_REVIEW_PRECEDES_EVIDENCE",
      );
    }
  }
}
function validate(value, schemaVersion = "2.0.0") {
  requireValue(
    ["2.0.0", "2.1.0"].includes(schemaVersion),
    "UNSUPPORTED_CORPUS_VERSION",
  );
  keys(value, ROOT);
  verifySeal(value);
  requireValue(
    value.$schema ===
      (schemaVersion === "2.0.0"
        ? ANALYZED_CORPUS_V2_SCHEMA_ID
        : ANALYZED_CORPUS_V21_SCHEMA_ID) &&
      value.schemaVersion === schemaVersion &&
      value.kind === "analyzed_corpus",
    "UNSUPPORTED_CORPUS_VERSION",
  );
  id(value.id);
  id(value.runId);
  choice(value.trustDomain, ["real_source_local", "synthetic_test_only"]);
  const generatedAt = timestamp(value.generatedAt);
  const globalIds = new Set([value.id]);
  const maps = Object.fromEntries(
    CATALOGS.map((name) => [name, catalog(value[name], name, globalIds)]),
  );
  maps.renditionBuffers = new Map();
  // These indexes belong to this validation pass; every catalog entry still
  // receives its full shape, reference, digest and evidence checks below.
  const renditionIdsByVersion = new Map();
  const evidencedRenditionIds = new Set();
  const versionedWorkIds = new Set(
    value.versions.map((version) => version.workId),
  );
  const workCountsByProfile = new Map();
  const versionCountsByProfile = new Map();
  requireValue(
    new Set(
      [...maps.sourceProfiles.values()].map((profile) => profile.sourceId),
    ).size <= 4,
    "SOURCE_FAMILY_LIMIT",
  );
  requireValue(
    new Set(
      [...maps.sourceProfiles.values()].flatMap((profile) => profile.hosts),
    ).size <= 10,
    "ACQUISITION_HOST_LIMIT",
  );
  const compoundSources = new Set();
  for (const profile of maps.sourceProfiles.values()) {
    keys(profile, [
      "id",
      "sourceId",
      "interfaceId",
      "operator",
      "publisher",
      "authorityLabel",
      "hosts",
      "pathPrefixes",
      "review",
      "uses",
      "contentDigest",
    ]);
    id(profile.sourceId);
    id(profile.interfaceId);
    text(profile.operator);
    text(profile.publisher);
    text(profile.authorityLabel);
    const compound = `${profile.sourceId}@${profile.interfaceId}`;
    requireValue(!compoundSources.has(compound), "DUPLICATE_INTERFACE");
    compoundSources.add(compound);
    strings(profile.hosts, 1, 10);
    strings(profile.pathPrefixes, 1, 100);
    requireValue(
      new Set(profile.hosts).size === profile.hosts.length &&
        new Set(profile.pathPrefixes).size === profile.pathPrefixes.length,
      "DUPLICATE_INTERFACE_RULE",
    );
    for (const host of profile.hosts) {
      requireValue(url(`https://${host}/`).hostname === host, "UNSAFE_HOST");
      if (value.trustDomain === "synthetic_test_only")
        requireValue(host.endsWith(".invalid"), "SYNTHETIC_ORIGIN_REQUIRED");
      else requireValue(!host.endsWith(".invalid"), "REAL_ORIGIN_REQUIRED");
    }
    for (const prefix of profile.pathPrefixes)
      requireValue(
        prefix.startsWith("/") &&
          !/[?#\\%]/u.test(prefix) &&
          !prefix.split("/").some((part) => part === "." || part === ".."),
        "UNSAFE_PATH_PREFIX",
      );
    keys(profile.review, [
      "reviewer",
      "reviewedAt",
      "expiresAt",
      "evidenceUrls",
    ]);
    text(profile.review.reviewer, 256);
    strings(profile.review.evidenceUrls, 1, 100);
    profile.review.evidenceUrls.forEach((evidence) => url(evidence));
    requireValue(
      timestamp(profile.review.reviewedAt) <= generatedAt &&
        (timestamp(profile.review.expiresAt) > generatedAt ||
          [...maps.coverage.values()].some(
            (coverage) =>
              coverage.sourceProfileId === profile.id &&
              coverage.status === "unavailable" &&
              coverage.failureStage === "source_review_expired",
          )) &&
        timestamp(profile.review.reviewedAt) <
          timestamp(profile.review.expiresAt),
      "SOURCE_REVIEW_NOT_CURRENT",
    );
    keys(profile.uses, [
      "capture",
      "analysis",
      "localDisplay",
      "localExport",
      "excerpts",
      "publicRedistribution",
    ]);
    requireValue(
      profile.uses.capture === true &&
        profile.uses.analysis === true &&
        typeof profile.uses.excerpts === "boolean",
      "LOCAL_USE_NOT_ALLOWED",
    );
    choice(profile.uses.localDisplay, [
      "full_text",
      "excerpt",
      "metadata_link",
    ]);
    choice(profile.uses.localExport, [
      "full_text",
      "excerpt",
      "metadata_link",
      "prohibited",
    ]);
    requireValue(
      profile.uses.publicRedistribution === "prohibited",
      "PUBLIC_DISTRIBUTION_CLOSED",
    );
    if (
      profile.uses.localDisplay === "excerpt" ||
      profile.uses.localExport === "excerpt"
    )
      requireValue(profile.uses.excerpts, "EXCERPT_USE_CLOSED");
  }
  for (const capture of maps.captures.values()) {
    keys(capture, [
      "id",
      "sourceProfileId",
      "sourceProfileDigest",
      "operationId",
      "requestedUrl",
      "finalUrl",
      "retrievedAt",
      "mediaType",
      "encodedBytes",
      "decodedBytes",
      "objectDigest",
      "objectPath",
      "contentDigest",
    ]);
    const profile = resolve(maps.sourceProfiles, capture.sourceProfileId);
    requireValue(
      capture.sourceProfileDigest === profile.contentDigest,
      "SOURCE_PROFILE_DIGEST_MISMATCH",
    );
    id(capture.operationId);
    url(capture.requestedUrl, profile);
    url(capture.finalUrl, profile);
    const retrievedAt = timestamp(capture.retrievedAt);
    requireValue(
      retrievedAt >= timestamp(profile.review.reviewedAt) &&
        retrievedAt < timestamp(profile.review.expiresAt) &&
        retrievedAt <= generatedAt,
      "CAPTURE_REVIEW_CHRONOLOGY",
    );
    choice(capture.mediaType, [
      "text/plain",
      "text/html",
      "application/xhtml+xml",
      "application/xml",
      "text/xml",
      "application/pdf",
      "application/json",
    ]);
    count(capture.encodedBytes, MAX_TEXT_BYTES);
    count(capture.decodedBytes, MAX_TEXT_BYTES);
    requireValue(
      capture.encodedBytes > 0 && capture.decodedBytes > 0,
      "EMPTY_CAPTURE",
    );
    digest(capture.objectDigest);
    requireValue(
      capture.objectPath ===
        `objects/sha256/${capture.objectDigest.slice(0, 2)}/${capture.objectDigest.slice(2, 4)}/${capture.objectDigest}` ||
        capture.objectPath === `objects/${capture.objectDigest}.bin`,
      "OBJECT_PATH_MISMATCH",
    );
  }
  const operations = [...maps.captures.values()].map(
    (capture) => `${capture.sourceProfileId}@${capture.operationId}`,
  );
  requireValue(
    new Set(operations).size === operations.length,
    "DUPLICATE_OPERATION_CAPTURE",
  );
  for (const rendition of maps.renditions.values()) {
    keys(rendition, [
      "id",
      "versionId",
      "captureId",
      "parser",
      "mediaType",
      "outputDigest",
      "byteLength",
      "text",
      "authorityLabel",
      "warnings",
      "omittedSourceLocators",
      "contentDigest",
    ]);
    resolve(maps.versions, rendition.versionId);
    const capture = resolve(maps.captures, rendition.captureId);
    const profile = resolve(maps.sourceProfiles, capture.sourceProfileId);
    keys(rendition.parser, ["id", "version", "configDigest"]);
    id(rendition.parser.id);
    requireValue(
      VERSION.test(rendition.parser.version),
      "INVALID_PARSER_VERSION",
    );
    digest(rendition.parser.configDigest);
    requireValue(
      rendition.mediaType === "text/plain",
      "CANONICAL_TEXT_REQUIRED",
    );
    text(rendition.text, MAX_TEXT_BYTES);
    requireValue(
      !rendition.text.includes("\r") && !rendition.text.startsWith("\ufeff"),
      "CANONICAL_UTF8_LF_REQUIRED",
    );
    const bytes = Buffer.from(rendition.text, "utf8");
    maps.renditionBuffers.set(rendition.id, bytes);
    requireValue(
      bytes.length <= MAX_TEXT_BYTES &&
        rendition.byteLength === bytes.length &&
        rendition.outputDigest === hash(bytes),
      "RENDITION_INTEGRITY",
    );
    requireValue(
      rendition.authorityLabel === profile.authorityLabel,
      "RENDITION_AUTHORITY_MISMATCH",
    );
    strings(rendition.warnings, 0, 100);
    strings(rendition.omittedSourceLocators, 0, 200);
    requireValue(
      rendition.omittedSourceLocators.every(
        (locator) => locator.startsWith("/") && !/[\r\n]/.test(locator),
      ),
      "INVALID_OMISSION_LOCATOR",
    );
    const renditionIds = renditionIdsByVersion.get(rendition.versionId) ?? [];
    renditionIds.push(rendition.id);
    renditionIdsByVersion.set(rendition.versionId, renditionIds);
  }
  for (const segment of maps.segments.values()) {
    keys(segment, [
      "id",
      "renditionId",
      "startByte",
      "endByte",
      "textDigest",
      "contextDigest",
      "locator",
      "contentDigest",
    ]);
    const rendition = resolve(maps.renditions, segment.renditionId);
    evidencedRenditionIds.add(rendition.id);
    count(segment.startByte);
    count(segment.endByte);
    requireValue(
      segment.startByte < segment.endByte &&
        segment.endByte <= rendition.byteLength,
      "SEGMENT_RANGE",
    );
    const bytes = maps.renditionBuffers.get(rendition.id);
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.subarray(segment.startByte, segment.endByte),
      );
    } catch {
      fail("SEGMENT_UTF8_BOUNDARY");
    }
    requireValue(
      hash(bytes.subarray(segment.startByte, segment.endByte)) ===
        segment.textDigest &&
        hash(
          bytes.subarray(
            Math.max(0, segment.startByte - 32),
            Math.min(bytes.length, segment.endByte + 32),
          ),
        ) === segment.contextDigest,
      "SEGMENT_INTEGRITY",
    );
    requireValue(
      segment.id ===
        evidenceSegmentId(
          rendition.id,
          rendition.outputDigest,
          segment.startByte,
          segment.endByte,
          segment.textDigest,
        ),
      "SEGMENT_ID_MISMATCH",
    );
    keys(segment.locator, [
      "type",
      "value",
      "headingPath",
      "printedPageLabel",
      "physicalPageIndex",
    ]);
    choice(segment.locator.type, [
      "structural_path",
      "paragraph",
      "line",
      "page",
    ]);
    text(segment.locator.value, 2048);
    strings(segment.locator.headingPath, 0, 100);
    if (segment.locator.printedPageLabel !== null)
      text(segment.locator.printedPageLabel, 128);
    if (segment.locator.physicalPageIndex !== null)
      count(segment.locator.physicalPageIndex, 100000);
    if (segment.locator.type === "page")
      requireValue(
        segment.locator.physicalPageIndex !== null,
        "PDF_PAGE_REQUIRED",
      );
  }
  const workIdentities = new Set();
  for (const work of maps.works.values()) {
    keys(work, [
      "id",
      "sourceProfileId",
      "sourceIdentifier",
      "title",
      "instrumentClass",
      "governmentContext",
      "issuerRoles",
      "relevance",
      "taxonomy",
      "fieldProvenance",
      "contentDigest",
      ...(schemaVersion === "2.1.0" ? ["jurisdictionRefs"] : []),
    ]);
    resolve(maps.sourceProfiles, work.sourceProfileId);
    text(work.sourceIdentifier);
    text(work.title, 8192);
    choice(work.instrumentClass, [
      "regulation",
      "proposed_rule",
      "final_rule",
      "statute",
      "bill",
      "executive_order",
      "judicial_opinion",
      "intergovernmental_agreement",
      "agency_policy",
      "notice",
    ]);
    text(work.governmentContext, 256);
    requireValue(
      work.relevance === "general_jurisdiction" &&
        work.taxonomy === "Unclassified",
      "GENERAL_JURISDICTION_BOUNDARY",
    );
    const identity = `${work.sourceProfileId}@${work.sourceIdentifier}`;
    requireValue(!workIdentities.has(identity), "DUPLICATE_WORK_IDENTITY");
    workIdentities.add(identity);
    const required = [
      "/sourceIdentifier",
      "/title",
      "/instrumentClass",
      "/governmentContext",
    ];
    values(work.issuerRoles, 1, 100).forEach((role, index) => {
      keys(role, ["role", "label"]);
      choice(role.role, [
        "issuer",
        "speaker",
        "party",
        "regulator",
        "legislative_sponsor",
      ]);
      text(role.label);
      required.push(
        `/issuerRoles/${index}/role`,
        `/issuerRoles/${index}/label`,
      );
    });
    provenance(work, required, maps, work.sourceProfileId);
    if (schemaVersion === "2.1.0")
      jurisdictionAssociations(
        work,
        maps,
        value.generatedAt,
        value.trustDomain,
      );
    requireValue(versionedWorkIds.has(work.id), "WORK_WITHOUT_VERSION");
    workCountsByProfile.set(
      work.sourceProfileId,
      (workCountsByProfile.get(work.sourceProfileId) ?? 0) + 1,
    );
  }
  const versionIdentities = new Set();
  for (const version of maps.versions.values()) {
    keys(version, [
      "id",
      "workId",
      "sourceVersionIdentifier",
      "sourceStatusLabel",
      "dates",
      "observedAt",
      "renditionIds",
      "fieldProvenance",
      "contentDigest",
    ]);
    const work = resolve(maps.works, version.workId);
    text(version.sourceVersionIdentifier);
    text(version.sourceStatusLabel);
    const identity = `${version.workId}@${version.sourceVersionIdentifier}`;
    requireValue(
      !versionIdentities.has(identity),
      "DUPLICATE_VERSION_IDENTITY",
    );
    versionIdentities.add(identity);
    keys(version.dates, ["publication", "sourceVersion"]);
    const required = ["/sourceVersionIdentifier", "/sourceStatusLabel"];
    for (const key of ["publication", "sourceVersion"])
      if (date(version.dates[key]) !== null)
        required.push(`/dates/${key}/value`);
    const renditions = refs(version.renditionIds, maps.renditions, 1);
    let observedAt = Number.POSITIVE_INFINITY;
    for (const rendition of renditions) {
      requireValue(
        rendition.versionId === version.id,
        "RENDITION_VERSION_MISMATCH",
      );
      const capture = resolve(maps.captures, rendition.captureId);
      requireValue(
        capture.sourceProfileId === work.sourceProfileId,
        "VERSION_SOURCE_MISMATCH",
      );
      observedAt = Math.min(observedAt, timestamp(capture.retrievedAt));
      requireValue(
        evidencedRenditionIds.has(rendition.id),
        "RENDITION_WITHOUT_EVIDENCE",
      );
    }
    requireValue(
      timestamp(version.observedAt) === observedAt,
      "VERSION_OBSERVATION_MISMATCH",
    );
    const actualRenditions = (
      renditionIdsByVersion.get(version.id) ?? []
    ).sort();
    requireValue(
      canonical([...version.renditionIds].sort()) ===
        canonical(actualRenditions),
      "RENDITION_REFERENCE_SET",
    );
    provenance(version, required, maps, work.sourceProfileId);
    versionCountsByProfile.set(
      work.sourceProfileId,
      (versionCountsByProfile.get(work.sourceProfileId) ?? 0) + 1,
    );
  }
  for (const event of maps.events.values()) {
    keys(event, [
      "id",
      "workId",
      "versionId",
      "type",
      "date",
      "sourceStatedAt",
      "sourceLabel",
      "segmentIds",
      "fieldProvenance",
      "contentDigest",
    ]);
    const version = resolve(maps.versions, event.versionId);
    requireValue(version.workId === event.workId, "EVENT_WORK_MISMATCH");
    choice(event.type, [
      "published",
      "enacted",
      "effective",
      "amended",
      "repealed",
      "corrected",
      "withdrawn",
    ]);
    text(event.sourceLabel);
    const required = ["/sourceLabel"];
    if (date(event.date) !== null) required.push("/date/value");
    if (date(event.sourceStatedAt) !== null)
      required.push("/sourceStatedAt/value");
    refs(event.segmentIds, maps.segments, 1);
    provenance(event, required, maps);
    for (const entry of event.fieldProvenance)
      requireValue(
        entry.segmentIds.every((segmentId) =>
          event.segmentIds.includes(segmentId),
        ),
        "EVENT_PROVENANCE_SCOPE",
      );
  }
  for (const relationship of maps.relationships.values()) {
    keys(relationship, [
      "id",
      "fromVersionId",
      "type",
      "target",
      "sourceLabel",
      "sourceStatedAt",
      "segmentIds",
      "contentDigest",
    ]);
    resolve(maps.versions, relationship.fromVersionId);
    choice(relationship.type, [
      "cites",
      "amends",
      "corrects",
      "repeals",
      "supersedes",
    ]);
    text(relationship.sourceLabel);
    date(relationship.sourceStatedAt);
    assertSegmentScope(
      relationship.segmentIds,
      relationship.fromVersionId,
      maps,
    );
    requireValue(
      relationship.segmentIds.some((segmentId) =>
        segmentBytes(resolve(maps.segments, segmentId), maps)
          .toString("utf8")
          .includes(relationship.sourceLabel),
      ),
      "RELATIONSHIP_SOURCE_LABEL_NOT_IN_EVIDENCE",
    );
    keys(relationship.target, [
      "state",
      "workId",
      "versionId",
      "sourceIdentifier",
      "candidateVersionIds",
    ]);
    const target = relationship.target;
    choice(target.state, ["resolved", "unresolved", "ambiguous"]);
    text(target.sourceIdentifier);
    const candidates = refs(target.candidateVersionIds, maps.versions);
    if (target.state === "resolved") {
      const targetVersion = resolve(maps.versions, target.versionId);
      const work = resolve(maps.works, target.workId);
      requireValue(
        targetVersion.workId === work.id &&
          target.sourceIdentifier === work.sourceIdentifier &&
          target.versionId !== relationship.fromVersionId &&
          candidates.length === 0,
        "RELATIONSHIP_TARGET_MISMATCH",
      );
    } else {
      requireValue(
        target.workId === null && target.versionId === null,
        "UNRESOLVED_TARGET_REQUIRED",
      );
      requireValue(
        target.state === "unresolved"
          ? candidates.length === 0
          : candidates.length >= 2,
        "AMBIGUOUS_TARGET_REQUIRED",
      );
    }
  }
  for (const analysis of maps.analyses.values()) {
    keys(analysis, [
      "id",
      "versionId",
      "kind",
      "method",
      "reviewer",
      "uncertainty",
      "codes",
      "contentDigest",
    ]);
    resolve(maps.versions, analysis.versionId);
    requireValue(
      analysis.kind === "institutional_procedure",
      "INVALID_ANALYSIS_KIND",
    );
    method(analysis.method);
    reviewer(analysis.reviewer, value.generatedAt);
    choice(analysis.uncertainty, ["provisional", "reviewed"]);
    for (const code of values(analysis.codes, 1, 1000)) {
      keys(code, ["dimension", "value", "segmentIds"]);
      choice(code.dimension, [
        "actor",
        "action",
        "object",
        "modality",
        "trigger",
        "condition",
        "exception",
        "procedure",
        "review_requirement",
        "time_constraint",
      ]);
      text(code.value);
      assertSegmentScope(code.segmentIds, analysis.versionId, maps);
      if (code.dimension === "modality")
        choice(code.value, [
          "obligation",
          "permission",
          "prohibition",
          "unknown",
        ]);
    }
  }
  for (const finding of maps.findings.values()) {
    keys(finding, [
      "id",
      "question",
      "populationVersionIds",
      "method",
      "reviewer",
      "disposition",
      "claim",
      "supportingSegmentIds",
      "contrarySegmentIds",
      "missingEvidence",
      "rivalExplanations",
      "nextDisconfirmingTest",
      "analysisIds",
      "contentDigest",
    ]);
    text(finding.question, 8192);
    text(finding.claim, 16384);
    method(finding.method);
    reviewer(finding.reviewer, value.generatedAt);
    choice(finding.disposition, ["provisional", "null", "rejected"]);
    refs(finding.populationVersionIds, maps.versions, 1);
    refs(finding.analysisIds, maps.analyses);
    const support = refs(finding.supportingSegmentIds, maps.segments);
    const contrary = refs(finding.contrarySegmentIds, maps.segments);
    requireValue(
      !finding.supportingSegmentIds.some((key) =>
        finding.contrarySegmentIds.includes(key),
      ),
      "CONTRADICTORY_EVIDENCE_ROLE",
    );
    if (finding.disposition === "provisional")
      requireValue(support.length > 0, "FINDING_SUPPORT_REQUIRED");
    for (const segment of [...support, ...contrary])
      requireValue(
        finding.populationVersionIds.includes(
          resolve(maps.renditions, segment.renditionId).versionId,
        ),
        "FINDING_POPULATION_MISMATCH",
      );
    for (const analysisId of finding.analysisIds)
      requireValue(
        finding.populationVersionIds.includes(
          resolve(maps.analyses, analysisId).versionId,
        ),
        "FINDING_ANALYSIS_MISMATCH",
      );
    strings(finding.missingEvidence, 0, 100);
    strings(finding.rivalExplanations, 1, 100);
    text(finding.nextDisconfirmingTest, 8192);
  }
  const covered = new Set();
  for (const coverage of maps.coverage.values()) {
    keys(coverage, [
      "id",
      "sourceProfileId",
      "status",
      "documentCount",
      "versionCount",
      "from",
      "through",
      "dataAsOf",
      "lastSuccessfulAt",
      "failureStage",
      "lastKnownGoodDigest",
      "limitations",
      "exclusions",
      "contentDigest",
    ]);
    resolve(maps.sourceProfiles, coverage.sourceProfileId);
    requireValue(
      !covered.has(coverage.sourceProfileId),
      "DUPLICATE_SOURCE_COVERAGE",
    );
    covered.add(coverage.sourceProfileId);
    const documentCount =
      workCountsByProfile.get(coverage.sourceProfileId) ?? 0;
    const versionCount =
      versionCountsByProfile.get(coverage.sourceProfileId) ?? 0;
    requireValue(
      coverage.documentCount === documentCount &&
        coverage.versionCount === versionCount,
      "COVERAGE_COUNT_MISMATCH",
    );
    const from = date(coverage.from);
    const through = date(coverage.through);
    if (from !== null && through !== null)
      requireValue(from <= through, "COVERAGE_DATE_RANGE");
    strings(coverage.limitations, 1, 100);
    strings(coverage.exclusions, 0, 100);
    choice(coverage.status, ["healthy", "degraded", "unavailable"]);
    if (coverage.status === "unavailable")
      requireValue(
        documentCount === 0 &&
          coverage.dataAsOf === null &&
          coverage.lastSuccessfulAt === null &&
          coverage.lastKnownGoodDigest === null &&
          coverage.failureStage !== null,
        "UNAVAILABLE_SOURCE_STATE",
      );
    else {
      requireValue(
        documentCount > 0 &&
          timestamp(coverage.dataAsOf) <=
            timestamp(coverage.lastSuccessfulAt) &&
          timestamp(coverage.lastSuccessfulAt) <= generatedAt,
        "HEALTH_TIMESTAMP_STATE",
      );
      if (coverage.status === "healthy")
        requireValue(
          coverage.failureStage === null &&
            coverage.lastKnownGoodDigest === null,
          "HEALTHY_SOURCE_STATE",
        );
      else {
        text(coverage.failureStage, 256);
        digest(coverage.lastKnownGoodDigest);
      }
    }
    if (coverage.failureStage !== null) text(coverage.failureStage, 256);
  }
  requireValue(
    covered.size === maps.sourceProfiles.size,
    "SOURCE_COVERAGE_REQUIRED",
  );
  return value;
}

function sourceSnapshot(value, sourceProfileId) {
  const works = value.works.filter(
    (work) => work.sourceProfileId === sourceProfileId,
  );
  const workIds = new Set(works.map((work) => work.id));
  const versions = value.versions.filter((version) =>
    workIds.has(version.workId),
  );
  const versionIds = new Set(versions.map((version) => version.id));
  const renditions = value.renditions.filter((rendition) =>
    versionIds.has(rendition.versionId),
  );
  const renditionIds = new Set(renditions.map((rendition) => rendition.id));
  return {
    profile: value.sourceProfiles.find(
      (profile) => profile.id === sourceProfileId,
    ),
    captures: value.captures.filter(
      (capture) => capture.sourceProfileId === sourceProfileId,
    ),
    works,
    versions,
    renditions,
    segments: value.segments.filter((segment) =>
      renditionIds.has(segment.renditionId),
    ),
    events: value.events.filter((event) => versionIds.has(event.versionId)),
    relationships: value.relationships.filter((relationship) =>
      versionIds.has(relationship.fromVersionId),
    ),
  };
}
function verifyPriorEvidence(value, options, supported = false) {
  const safe = snapshot(options ?? { lastKnownGoodCorpora: [] });
  keys(safe, ["lastKnownGoodCorpora"]);
  values(safe.lastKnownGoodCorpora, 0, 32);
  const prior = new Map(
    safe.lastKnownGoodCorpora.map((candidate) => {
      validate(candidate, supported ? candidate.schemaVersion : "2.0.0");
      return [candidate.contentDigest, candidate];
    }),
  );
  requireValue(
    prior.size === safe.lastKnownGoodCorpora.length,
    "DUPLICATE_PRIOR_CORPUS",
  );
  const check = (current, ancestors) => {
    requireValue(!ancestors.has(current.contentDigest), "LKG_CYCLE");
    const chain = new Set([...ancestors, current.contentDigest]);
    for (const health of current.coverage.filter(
      (entry) => entry.status === "degraded",
    )) {
      const previous = prior.get(health.lastKnownGoodDigest);
      requireValue(
        previous !== undefined &&
          timestamp(previous.generatedAt) < timestamp(current.generatedAt) &&
          previous.trustDomain === current.trustDomain &&
          previous.schemaVersion === current.schemaVersion &&
          previous.runId === current.runId,
        "VERIFIED_PRIOR_CORPUS_REQUIRED",
      );
      const previousHealth = previous.coverage.find(
        (entry) => entry.sourceProfileId === health.sourceProfileId,
      );
      requireValue(
        previousHealth !== undefined &&
          previousHealth.status !== "unavailable" &&
          health.dataAsOf === previousHealth.dataAsOf &&
          health.lastSuccessfulAt === previousHealth.lastSuccessfulAt &&
          canonical(health.from) === canonical(previousHealth.from) &&
          canonical(health.through) === canonical(previousHealth.through),
        "LKG_ORIGINAL_TIME_REQUIRED",
      );
      requireValue(
        canonical(sourceSnapshot(current, health.sourceProfileId)) ===
          canonical(sourceSnapshot(previous, health.sourceProfileId)),
        "LKG_SOURCE_SNAPSHOT_MISMATCH",
      );
      check(previous, chain);
    }
  };
  check(value, new Set());
  return value;
}

function createCorpus(input, options, schemaVersion) {
  const safe = snapshot(input);
  keys(safe, ["id", "runId", "trustDomain", "generatedAt", ...CATALOGS]);
  const output = {
    $schema:
      schemaVersion === "2.0.0"
        ? ANALYZED_CORPUS_V2_SCHEMA_ID
        : ANALYZED_CORPUS_V21_SCHEMA_ID,
    schemaVersion,
    kind: "analyzed_corpus",
    ...safe,
  };
  for (const name of CATALOGS)
    output[name] = values(output[name])
      .map(seal)
      .sort((left, right) =>
        left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
      );
  return rememberValidatedCorpus(
    verifyPriorEvidence(
      validate(seal(output), schemaVersion),
      options,
      schemaVersion === "2.1.0",
    ),
  );
}
export function createAnalyzedCorpusV2(input, options) {
  return createCorpus(input, options, "2.0.0");
}
function parseCorpus(value, schemaVersion, options) {
  let parsed;
  if (validatedCorpora.has(value)) {
    requireValue(
      schemaVersion === null || value.schemaVersion === schemaVersion,
      "UNSUPPORTED_CORPUS_VERSION",
    );
    parsed = value;
  } else {
    const safe = snapshot(value);
    parsed = validate(safe, schemaVersion ?? safe.schemaVersion);
  }
  // Proof is request-specific: always inspect current options and prior corpora,
  // even when the immutable current corpus has already passed validation.
  return rememberValidatedCorpus(
    verifyPriorEvidence(parsed, options, parsed.schemaVersion === "2.1.0"),
  );
}
export function parseAnalyzedCorpusV2(value, options) {
  return parseCorpus(value, "2.0.0", options);
}
export function serializeAnalyzedCorpusV2(value, options) {
  return `${canonical(parseAnalyzedCorpusV2(value, options))}\n`;
}
export function createAnalyzedCorpusV21(input, options) {
  return createCorpus(input, options, "2.1.0");
}
export function parseAnalyzedCorpusV21(value, options) {
  return parseCorpus(value, "2.1.0", options);
}
export function serializeAnalyzedCorpusV21(value, options) {
  return `${canonical(parseAnalyzedCorpusV21(value, options))}\n`;
}
export function createSupportedAnalyzedCorpus(
  input,
  schemaVersion = "2.0.0",
  options,
) {
  requireValue(
    ["2.0.0", "2.1.0"].includes(schemaVersion),
    "UNSUPPORTED_CORPUS_VERSION",
  );
  return createCorpus(input, options, schemaVersion);
}
export function parseSupportedAnalyzedCorpus(value, options) {
  return parseCorpus(value, null, options);
}
export function serializeSupportedAnalyzedCorpus(value, options) {
  return `${canonical(parseSupportedAnalyzedCorpus(value, options))}\n`;
}
export function evidenceSegmentId(
  renditionId,
  renditionDigest,
  startByte,
  endByte,
  textDigest,
) {
  return `segment-${hash(canonical({ renditionId, renditionDigest, startByte, endByte, textDigest }))}`;
}
export function createEvidenceSegment({
  renditionId,
  renditionDigest,
  renditionBytes,
  startByte,
  endByte,
  locator,
}) {
  const bytes = copyBytes(renditionBytes);
  requireValue(
    bytes.length <= MAX_TEXT_BYTES && hash(bytes) === renditionDigest,
    "RENDITION_INTEGRITY",
  );
  count(startByte);
  count(endByte);
  requireValue(startByte < endByte && endByte <= bytes.length, "SEGMENT_RANGE");
  const textDigest = hash(bytes.subarray(startByte, endByte));
  return freeze(
    seal({
      id: evidenceSegmentId(
        renditionId,
        renditionDigest,
        startByte,
        endByte,
        textDigest,
      ),
      renditionId,
      startByte,
      endByte,
      textDigest,
      contextDigest: hash(
        bytes.subarray(
          Math.max(0, startByte - 32),
          Math.min(bytes.length, endByte + 32),
        ),
      ),
      locator: snapshot(locator),
    }),
  );
}
function replayCitation(
  {
    corpus,
    segmentId,
    objectBytes,
    renditionBytes,
    reextract,
    lastKnownGoodCorpora = [],
  },
  parse,
) {
  const parsed = parse(corpus, { lastKnownGoodCorpora });
  const segment = parsed.segments.find((entry) => entry.id === segmentId);
  requireValue(segment !== undefined, "UNRESOLVED_REFERENCE");
  const rendition = parsed.renditions.find(
    (entry) => entry.id === segment.renditionId,
  );
  const capture = parsed.captures.find(
    (entry) => entry.id === rendition.captureId,
  );
  const source = copyBytes(objectBytes);
  const extracted = copyBytes(renditionBytes);
  requireValue(
    source.length === capture.decodedBytes &&
      hash(source) === capture.objectDigest,
    "OBJECT_INTEGRITY",
  );
  requireValue(
    extracted.length === rendition.byteLength &&
      hash(extracted) === rendition.outputDigest &&
      extracted.equals(Buffer.from(rendition.text, "utf8")),
    "RENDITION_INTEGRITY",
  );
  if (reextract !== undefined) {
    requireValue(typeof reextract === "function", "INVALID_PARSER");
    const rebuilt = reextract(
      Buffer.from(source),
      rendition.parser,
      capture.mediaType,
    );
    requireValue(
      copyBytes(rebuilt).equals(extracted),
      "PARSER_REPLAY_MISMATCH",
    );
  }
  return freeze({
    kind: "corpus_citation_replay",
    corpusDigest: parsed.contentDigest,
    segmentId,
    versionId: rendition.versionId,
    captureId: capture.id,
    sourceUrl: capture.finalUrl,
    objectDigest: capture.objectDigest,
    renditionDigest: rendition.outputDigest,
    textDigest: segment.textDigest,
    contextDigest: segment.contextDigest,
    locator: segment.locator,
    quote: extracted
      .subarray(segment.startByte, segment.endByte)
      .toString("utf8"),
    parserReplay: reextract === undefined ? "not_performed" : "verified",
  });
}
export function replayCorpusCitation(input) {
  return replayCitation(input, parseAnalyzedCorpusV2);
}
export function replaySupportedCorpusCitation(input) {
  return replayCitation(input, parseSupportedAnalyzedCorpus);
}
export function projectLocalCorpusV2(value, options) {
  const corpus = parseAnalyzedCorpusV2(value, options);
  const profiles = new Map(
    corpus.sourceProfiles.map((profile) => [profile.id, profile]),
  );
  const works = new Map(corpus.works.map((work) => [work.id, work]));
  return freeze({
    kind: "local_corpus_projection",
    schemaVersion: "2.0.0",
    corpusId: corpus.id,
    corpusDigest: corpus.contentDigest,
    publication: "closed",
    records: corpus.versions.map((version) => {
      const work = works.get(version.workId);
      const profile = profiles.get(work.sourceProfileId);
      return {
        workId: work.id,
        versionId: version.id,
        sourceId: profile.sourceId,
        title: work.title,
        sourceIdentifier: work.sourceIdentifier,
        sourceVersionIdentifier: version.sourceVersionIdentifier,
        sourceStatusLabel: version.sourceStatusLabel,
        issuerRoles: work.issuerRoles,
        authorityLabel: profile.authorityLabel,
        governmentContext: work.governmentContext,
        instrumentClass: work.instrumentClass,
        relevance: work.relevance,
        taxonomy: work.taxonomy,
        dates: version.dates,
        observedAt: version.observedAt,
        displayPolicy: profile.uses.localDisplay,
        renditions: version.renditionIds.map((renditionId) => {
          const rendition = corpus.renditions.find(
            (entry) => entry.id === renditionId,
          );
          return {
            id: rendition.id,
            outputDigest: rendition.outputDigest,
            text:
              profile.uses.localDisplay === "full_text" ? rendition.text : null,
          };
        }),
      };
    }),
    coverage: corpus.coverage,
  });
}
