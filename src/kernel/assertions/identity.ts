import addFormats from "ajv-formats";

import {
  assertJsonValue,
  immutableCanonicalClone,
  type DeepReadonly,
  type JsonValue,
} from "./canonical-json";
import { isRfc3339DateTime } from "./temporal";

export const ASSERTION_CONTRACT_VERSION = "1.0.0" as const;

export interface SourceQualifiedIdentity {
  sourceId: string;
  sourceRecordId: string;
}

export interface SourceProvenance {
  sourceIdentity: SourceQualifiedIdentity;
  sourceUrl: string;
  sourcePath: string;
  retrievedAt: string;
  sourceUpdatedAt: string | null;
  adapterId: string;
  adapterVersion: string;
  sourceContentDigest: string;
  validationState: "validated";
}

type JsonObject = Record<string, unknown>;

const SOURCE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PREDICATE_PATTERN = /^[a-z][a-z0-9_]*$/;
const SEMANTIC_VERSION_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const URI_FORMAT = addFormats.get("uri", "full");

function isUri(value: string): boolean {
  return URI_FORMAT instanceof RegExp
    ? URI_FORMAT.test(value)
    : typeof URI_FORMAT === "function" && URI_FORMAT(value);
}
const SOURCE_FACT_PREDICATES = new Set([
  "instrument_identifier",
  "instrument_title",
  "rendition_identifier",
  "rendition_digest",
  "event_identifier",
  "event_label",
  "actor_label",
  "source_status_label",
  "observed_time",
  "published_time",
  "effective_time",
  "valid_time",
  "status_as_of",
  "relationship_label",
  "equivalence_label",
]);
export const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

function fail(path: string, detail: string): never {
  throw new TypeError(`${path}: ${detail}`);
}

function objectValue(value: unknown, path: string): JsonObject {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(path, "expected a plain object");
  }
  return value as JsonObject;
}

function exactKeys(
  value: JsonObject,
  path: string,
  expected: readonly string[],
): void {
  const expectedSet = new Set(expected);
  for (const key of Object.keys(value)) {
    if (!expectedSet.has(key)) {
      fail(`${path}.${key}`, "unexpected field");
    }
  }
  for (const key of expected) {
    if (!Object.hasOwn(value, key)) {
      fail(`${path}.${key}`, "required field is absent");
    }
  }
}

function nonEmptyString(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    [...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 32 || codePoint === 127;
    })
  ) {
    fail(
      path,
      "expected exact non-empty trimmed text without control characters",
    );
  }
  return value;
}

export function validateSha256Hex(value: unknown, path = "$digest"): string {
  if (typeof value !== "string" || !SHA256_HEX_PATTERN.test(value)) {
    fail(path, "expected a lowercase SHA-256 hex digest");
  }
  return value;
}

function validateSourceQualifiedIdentityMutable(
  value: unknown,
  path: string,
): SourceQualifiedIdentity {
  const object = objectValue(value, path);
  exactKeys(object, path, ["sourceId", "sourceRecordId"]);
  const sourceId = nonEmptyString(object.sourceId, `${path}.sourceId`);
  if (!SOURCE_ID_PATTERN.test(sourceId)) {
    fail(`${path}.sourceId`, "expected a lowercase source identifier");
  }
  return {
    sourceId,
    sourceRecordId: nonEmptyString(
      object.sourceRecordId,
      `${path}.sourceRecordId`,
    ),
  };
}

export function validateSourceQualifiedIdentity(
  value: unknown,
  path = "$",
): DeepReadonly<SourceQualifiedIdentity> {
  assertJsonValue(value);
  return immutableCanonicalClone(
    validateSourceQualifiedIdentityMutable(value, path) as unknown as JsonValue,
  ) as DeepReadonly<SourceQualifiedIdentity>;
}

function exactHttpsUrl(value: unknown, path: string): string {
  const parsedValue = nonEmptyString(value, path);
  let url: URL;
  try {
    url = new URL(parsedValue);
  } catch {
    fail(path, "expected an absolute HTTPS URL");
  }
  if (
    !isUri(parsedValue) ||
    !parsedValue.startsWith("https://") ||
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    fail(path, "expected an absolute credential-free HTTPS URL");
  }
  return parsedValue;
}

function validateSourceProvenanceMutable(
  value: unknown,
  path: string,
): SourceProvenance {
  const object = objectValue(value, path);
  exactKeys(object, path, [
    "sourceIdentity",
    "sourceUrl",
    "sourcePath",
    "retrievedAt",
    "sourceUpdatedAt",
    "adapterId",
    "adapterVersion",
    "sourceContentDigest",
    "validationState",
  ]);
  const retrievedAt = object.retrievedAt;
  if (!isRfc3339DateTime(retrievedAt)) {
    fail(
      `${path}.retrievedAt`,
      "expected an RFC 3339 date-time with mandatory offset",
    );
  }
  const sourceUpdatedAt = object.sourceUpdatedAt;
  if (sourceUpdatedAt !== null && !isRfc3339DateTime(sourceUpdatedAt)) {
    fail(
      `${path}.sourceUpdatedAt`,
      "expected null or an RFC 3339 date-time with mandatory offset",
    );
  }
  if (object.validationState !== "validated") {
    fail(`${path}.validationState`, "expected validated");
  }

  return {
    sourceIdentity: validateSourceQualifiedIdentityMutable(
      object.sourceIdentity,
      `${path}.sourceIdentity`,
    ),
    sourceUrl: exactHttpsUrl(object.sourceUrl, `${path}.sourceUrl`),
    sourcePath: nonEmptyString(object.sourcePath, `${path}.sourcePath`),
    retrievedAt,
    sourceUpdatedAt,
    adapterId: (() => {
      const adapterId = nonEmptyString(object.adapterId, `${path}.adapterId`);
      if (!SOURCE_ID_PATTERN.test(adapterId)) {
        fail(`${path}.adapterId`, "expected a lowercase adapter identifier");
      }
      return adapterId;
    })(),
    adapterVersion: (() => {
      const adapterVersion = nonEmptyString(
        object.adapterVersion,
        `${path}.adapterVersion`,
      );
      if (!SEMANTIC_VERSION_PATTERN.test(adapterVersion)) {
        fail(`${path}.adapterVersion`, "expected a semantic version");
      }
      return adapterVersion;
    })(),
    sourceContentDigest: validateSha256Hex(
      object.sourceContentDigest,
      `${path}.sourceContentDigest`,
    ),
    validationState: "validated",
  };
}

export function validateSourceProvenance(
  value: unknown,
  path = "$",
): DeepReadonly<SourceProvenance> {
  assertJsonValue(value);
  return immutableCanonicalClone(
    validateSourceProvenanceMutable(value, path) as unknown as JsonValue,
  ) as DeepReadonly<SourceProvenance>;
}

function encodeIdentityPart(value: string, path: string): string {
  return Buffer.from(nonEmptyString(value, path), "utf8").toString("base64url");
}

function sourceIdentityParts(identity: SourceQualifiedIdentity): {
  sourceId: string;
  sourceRecordId: string;
} {
  const validated = validateSourceQualifiedIdentity(identity);
  return {
    sourceId: validated.sourceId,
    sourceRecordId: encodeIdentityPart(
      validated.sourceRecordId,
      "$.sourceRecordId",
    ),
  };
}

export function createInstrumentId(identity: SourceQualifiedIdentity): string {
  const parts = sourceIdentityParts(identity);
  return `k0:instrument:${parts.sourceId}:${parts.sourceRecordId}`;
}

export function createVersionId(
  identity: SourceQualifiedIdentity,
  renditionIdentifier: string,
  renditionDigest: string,
): string {
  const parts = sourceIdentityParts(identity);
  return `k0:version:${parts.sourceId}:${parts.sourceRecordId}:${encodeIdentityPart(
    renditionIdentifier,
    "$.renditionIdentifier",
  )}:${validateSha256Hex(renditionDigest, "$.renditionDigest")}`;
}

export function createFactId(
  identity: SourceQualifiedIdentity,
  sourcePath: string,
  predicate: string,
  sourceContentDigest: string,
): string {
  const parts = sourceIdentityParts(identity);
  const validatedPredicate = nonEmptyString(predicate, "$.predicate");
  if (
    !PREDICATE_PATTERN.test(validatedPredicate) ||
    !SOURCE_FACT_PREDICATES.has(validatedPredicate)
  ) {
    fail("$.predicate", "expected an allowlisted source-fact predicate");
  }
  return `k0:fact:${parts.sourceId}:${parts.sourceRecordId}:${encodeIdentityPart(
    sourcePath,
    "$.sourcePath",
  )}:${validatedPredicate}:${validateSha256Hex(
    sourceContentDigest,
    "$.sourceContentDigest",
  )}`;
}

export function createEventId(
  identity: SourceQualifiedIdentity,
  eventIdentifier: string,
): string {
  const parts = sourceIdentityParts(identity);
  return `k0:event:${parts.sourceId}:${parts.sourceRecordId}:${encodeIdentityPart(
    eventIdentifier,
    "$.eventIdentifier",
  )}`;
}
