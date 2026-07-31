import { Buffer } from "node:buffer";

const SOURCE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INTERNAL_ID_PATTERN = /^psr:[a-z0-9]+(?:-[a-z0-9]+)*:[A-Za-z0-9._~:-]+$/;
const URL_SAFE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function makeStableRecordId(sourceId, sourceRecordId) {
  if (!SOURCE_ID_PATTERN.test(sourceId)) {
    throw new TypeError(`invalid source ID: ${sourceId}`);
  }
  if (typeof sourceRecordId !== "string" || sourceRecordId.length === 0) {
    throw new TypeError("source record ID must be a non-empty string");
  }

  const encoded = Buffer.from(sourceRecordId, "utf8").toString("base64url");
  return `psr:${sourceId}:${encoded}`;
}

export function assertStableRecordId(internalId) {
  if (!INTERNAL_ID_PATTERN.test(internalId)) {
    throw new TypeError(`invalid stable record ID: ${internalId}`);
  }
  return internalId;
}

export function toUrlSafeId(internalId) {
  assertStableRecordId(internalId);
  return Buffer.from(internalId, "utf8").toString("base64url");
}

export function assertUrlSafeId(value) {
  if (!URL_SAFE_ID_PATTERN.test(value)) {
    throw new TypeError(`invalid URL-safe ID: ${value}`);
  }
  return value;
}

export function recordIdentityKey(record) {
  return `${record.source.id}\u0000${record.source.recordId}`;
}
