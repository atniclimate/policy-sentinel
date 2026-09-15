/**
 * Private-only land parcel reference contract (LandParcel 1.0.0).
 *
 * FROZEN INTERFACE (Makah demo groundwork, 2026-09-15). Exported names,
 * signatures, constants and error codes below are the lease boundary between
 * the lead and the runtime/test workers.
 *
 * A parcel carries many co-existing land-status types and many ordered,
 * non-exclusive jurisdiction layers, each independently evidenced. There is
 * never a single winning jurisdiction. Nothing here is a legal land-status,
 * treaty-rights, jurisdiction, applicability or Nation-association
 * determination. No I/O, no provider call, no timer, no logging.
 */
import Ajv2020 from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import schema from "../../schemas/land-parcel.schema.v1.json";
import { PRIVATE_CONTEXT_PROTECTED_KEYS } from "./land-boundary-contracts";

export const LAND_PARCEL_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/land-parcel.schema.v1.json";
export const LAND_PARCEL_SCHEMA_VERSION = "1.0.0";

export const LAND_PARCEL_NONCLAIMS = Object.freeze([
  "not_a_legal_land_status_determination",
  "not_a_treaty_rights_determination",
  "not_a_jurisdiction_or_applicability_determination",
  "not_a_substitute_for_the_official_cadastral_or_trust_record",
] as const);

/** Same protected-key list as boundaries; re-exported for consumers. */
export const LAND_PARCEL_PROTECTED_KEYS = PRIVATE_CONTEXT_PROTECTED_KEYS;

export type LandParcelTrustDomain =
  "synthetic_test_only" | "private_local_authorized";
export type LandParcelSensitivity =
  "public" | "internal" | "restricted" | "privileged";
export type LandStatusType =
  | "tribal_trust"
  | "tribal_fee"
  | "allotted_trust"
  | "reservation_fee"
  | "ceded_territory_unresolved"
  | "state_land"
  | "county_land"
  | "private_fee"
  | "federal_land"
  | "unknown";
export type JurisdictionLayerLevel = "federal" | "state" | "county" | "tribal";
export type LandParcelValidationState = "pending" | "validated" | "rejected";

/** Land-status types that require sensitivity `restricted` or `privileged`. */
export const TRIBAL_LAND_STATUS_TYPES = Object.freeze([
  "tribal_trust",
  "tribal_fee",
  "allotted_trust",
  "reservation_fee",
] as const);

export interface LandStatusEvidence {
  readonly landStatusType: LandStatusType;
  readonly sourceLabel: string;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly sourceUpdatedAt: string | null;
  readonly evidenceBasis: string;
  readonly validationState: LandParcelValidationState;
}

export interface JurisdictionLayer {
  readonly level: JurisdictionLayerLevel;
  /** Display label only; never identity evidence. */
  readonly authorityName: string;
  /**
   * `nation:<slug>` for a tribal layer, null otherwise (schema-enforced). A
   * tribal layer matches records only through a validated
   * `nationAssociations` entry with this exact identifier, and the layer
   * itself has no identity standing until the identifier is bound to an
   * accepted identity record.
   */
  readonly nationId: string | null;
  readonly evidenceUrl: string;
  readonly evidenceDate: string;
}

export interface LandBoundaryReference {
  readonly boundaryId: string;
  readonly schemaVersion: "1.0.0";
}

export interface LandParcel {
  readonly $schema: typeof LAND_PARCEL_SCHEMA_ID;
  readonly schemaVersion: typeof LAND_PARCEL_SCHEMA_VERSION;
  /** `parcel:<letter-led slug>`; synthetic slugs start with `synthetic-`. A bare APN cannot satisfy the pattern; further opacity is producer discipline. */
  readonly parcelId: string;
  readonly trustDomain: LandParcelTrustDomain;
  readonly deploymentProfile: "private";
  readonly landStatusTypes: readonly LandStatusType[];
  readonly landStatusEvidence: readonly LandStatusEvidence[];
  readonly jurisdictionLayers: readonly JurisdictionLayer[];
  readonly boundaryRef: LandBoundaryReference | null;
  readonly sensitivity: LandParcelSensitivity;
  readonly nonClaims: typeof LAND_PARCEL_NONCLAIMS;
}

/**
 * Error codes, in check order. `path` starts at `$`.
 *
 * - INVALID_JSON, INPUT_LIMIT, PROTECTED_KEY, SCHEMA_INVALID: as for
 *   LandBoundary (same snapshot, same protected-key list, strict schema).
 * - LAND_STATUS_EVIDENCE_MISSING: a listed landStatusType other than
 *   `unknown` has no landStatusEvidence entry with that landStatusType.
 *   Path: `$/landStatusTypes/<index>`.
 * - LAND_STATUS_EVIDENCE_ORPHAN: a landStatusEvidence entry names a
 *   landStatusType not present in landStatusTypes, or names `unknown`.
 *   Path: `$/landStatusEvidence/<index>/landStatusType`.
 * - JURISDICTION_LAYER_DUPLICATE: two layers share the same level and
 *   authorityName (exact string equality). Path: the later layer.
 * - SENSITIVITY_TOO_LOW: any layer level `tribal` or any
 *   TRIBAL_LAND_STATUS_TYPES member with sensitivity `public` or
 *   `internal`. Path: `$/sensitivity`.
 * - TRUST_DOMAIN_MISMATCH: trustDomain `synthetic_test_only` requires the
 *   parcelId slug prefix `synthetic-` and, when boundaryRef is non-null, a
 *   boundaryId starting with `synthetic-`; `private_local_authorized`
 *   forbids both prefixes.
 * - SYNTHETIC_URL_REQUIRED: trustDomain `synthetic_test_only` with any
 *   landStatusEvidence.sourceUrl or jurisdictionLayers.evidenceUrl whose host
 *   does not end in `.invalid`.
 */
export const LAND_PARCEL_ERROR_CODES = Object.freeze([
  "INVALID_JSON",
  "INPUT_LIMIT",
  "PROTECTED_KEY",
  "SCHEMA_INVALID",
  "LAND_STATUS_EVIDENCE_MISSING",
  "LAND_STATUS_EVIDENCE_ORPHAN",
  "JURISDICTION_LAYER_DUPLICATE",
  "SENSITIVITY_TOO_LOW",
  "TRUST_DOMAIN_MISMATCH",
  "SYNTHETIC_URL_REQUIRED",
] as const);
export type LandParcelErrorCode = (typeof LAND_PARCEL_ERROR_CODES)[number];

export class LandParcelValidationError extends Error {
  constructor(
    readonly code: LandParcelErrorCode,
    readonly path: string,
    detail: string,
  ) {
    super(`${code} at ${path}: ${detail}`);
    this.name = "LandParcelValidationError";
  }
}

type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function fail(code: LandParcelErrorCode, path: string, detail: string): never {
  throw new LandParcelValidationError(code, path, detail);
}

/** Capture data descriptors once; never read a caller's getter or toJSON. */
function snapshot(value: unknown): JsonValue {
  const ancestors = new WeakSet<object>();
  let nodes = 0;
  let textUnits = 0;
  const visit = (input: unknown, path: string, depth: number): JsonValue => {
    nodes += 1;
    if (nodes > 200_000 || depth > 32) {
      fail("INPUT_LIMIT", path, "JSON node or depth limit exceeded");
    }
    if (input === null || typeof input === "boolean") return input;
    if (typeof input === "number") {
      if (!Number.isFinite(input)) {
        fail("INVALID_JSON", path, "expected a finite JSON number");
      }
      return input;
    }
    if (typeof input === "string") {
      textUnits += input.length;
      if (input.length > 8192 || textUnits > 4_194_304) {
        fail("INPUT_LIMIT", path, "JSON string budget exceeded");
      }
      return input;
    }
    if (typeof input !== "object") {
      fail("INVALID_JSON", path, "expected a plain JSON value");
    }
    if (ancestors.has(input)) fail("INVALID_JSON", path, "cyclic JSON input");
    ancestors.add(input);
    try {
      const array = Array.isArray(input);
      if (
        Object.getPrototypeOf(input) !==
        (array ? Array.prototype : Object.prototype)
      ) {
        fail("INVALID_JSON", path, "nonplain JSON container");
      }
      const keys = Reflect.ownKeys(input);
      if (keys.length > 4097) {
        fail("INPUT_LIMIT", path, "JSON container limit exceeded");
      }
      const descriptors = new Map<string, PropertyDescriptor>();
      for (const key of keys) {
        if (typeof key !== "string") {
          fail("INVALID_JSON", path, "symbol keys are prohibited");
        }
        textUnits += key.length;
        if (key.length > 256 || textUnits > 4_194_304) {
          fail("INPUT_LIMIT", path, "JSON key budget exceeded");
        }
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (
          descriptor === undefined ||
          !("value" in descriptor) ||
          (!(array && key === "length") && !descriptor.enumerable)
        ) {
          fail("INVALID_JSON", path, "only enumerable data properties allowed");
        }
        descriptors.set(key, descriptor);
      }
      if (array) {
        const length = descriptors.get("length")?.value as unknown;
        if (
          typeof length !== "number" ||
          !Number.isSafeInteger(length) ||
          length < 0 ||
          length > 4096
        ) {
          fail("INPUT_LIMIT", path, "JSON array limit exceeded");
        }
        if (keys.length !== length + 1) {
          fail("INVALID_JSON", path, "sparse or extended array");
        }
        const result: JsonValue[] = [];
        for (let index = 0; index < length; index += 1) {
          const descriptor = descriptors.get(String(index));
          if (!descriptor) fail("INVALID_JSON", path, "sparse JSON array");
          result.push(visit(descriptor.value, `${path}/${index}`, depth + 1));
        }
        return result;
      }
      const result: { [key: string]: JsonValue } = {};
      for (const [key, descriptor] of descriptors) {
        Object.defineProperty(result, key, {
          value: visit(descriptor.value, `${path}/field`, depth + 1),
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
      return result;
    } catch (error) {
      if (error instanceof LandParcelValidationError) throw error;
      fail("INVALID_JSON", path, "JSON reflection failed");
    } finally {
      ancestors.delete(input);
    }
  };
  return visit(value, "$", 0);
}

function scanProtectedKeys(value: JsonValue, path: string): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanProtectedKeys(item, `${path}/${index}`));
    return;
  }
  for (const key of Object.keys(value)) {
    if ((LAND_PARCEL_PROTECTED_KEYS as readonly string[]).includes(key)) {
      fail("PROTECTED_KEY", `${path}/${key}`, "protected key present");
    }
    scanProtectedKeys(value[key] as JsonValue, `${path}/field`);
  }
}

const ajv = new Ajv2020({ strict: true, allErrors: false });
addFormats(ajv);
ajv.addSchema(schema);
const validate: ValidateFunction = ajv.getSchema(LAND_PARCEL_SCHEMA_ID)!;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
    .join(",")}}`;
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function detached<T>(value: T): T {
  return freeze(JSON.parse(canonical(value)) as T);
}

function hostIsSyntheticInvalid(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".invalid");
  } catch {
    return false;
  }
}

function checkLandStatusEvidenceMissing(parcel: LandParcel): void {
  parcel.landStatusTypes.forEach((landStatusType, index) => {
    if (landStatusType === "unknown") return;
    const hasEvidence = parcel.landStatusEvidence.some(
      (evidence) => evidence.landStatusType === landStatusType,
    );
    if (!hasEvidence) {
      fail(
        "LAND_STATUS_EVIDENCE_MISSING",
        `$/landStatusTypes/${index}`,
        "listed land-status type has no supporting evidence entry",
      );
    }
  });
}

function checkLandStatusEvidenceOrphan(parcel: LandParcel): void {
  parcel.landStatusEvidence.forEach((evidence, index) => {
    if (
      evidence.landStatusType === "unknown" ||
      !parcel.landStatusTypes.includes(evidence.landStatusType)
    ) {
      fail(
        "LAND_STATUS_EVIDENCE_ORPHAN",
        `$/landStatusEvidence/${index}/landStatusType`,
        "evidence names a land-status type absent from landStatusTypes",
      );
    }
  });
}

function checkJurisdictionLayerDuplicate(parcel: LandParcel): void {
  const seen = new Set<string>();
  parcel.jurisdictionLayers.forEach((layer, index) => {
    const key = JSON.stringify([layer.level, layer.authorityName]);
    if (seen.has(key)) {
      fail(
        "JURISDICTION_LAYER_DUPLICATE",
        `$/jurisdictionLayers/${index}`,
        "layer duplicates an earlier level and authority name",
      );
    }
    seen.add(key);
  });
}

function checkSensitivity(parcel: LandParcel): void {
  const tribalPresence =
    parcel.jurisdictionLayers.some((layer) => layer.level === "tribal") ||
    parcel.landStatusTypes.some((status) =>
      (TRIBAL_LAND_STATUS_TYPES as readonly string[]).includes(status),
    );
  if (
    tribalPresence &&
    (parcel.sensitivity === "public" || parcel.sensitivity === "internal")
  ) {
    fail(
      "SENSITIVITY_TOO_LOW",
      "$/sensitivity",
      "tribal jurisdiction or land status requires at least restricted sensitivity",
    );
  }
}

function checkTrustDomain(parcel: LandParcel): void {
  const prefix = "parcel:";
  const slug = parcel.parcelId.startsWith(prefix)
    ? parcel.parcelId.slice(prefix.length)
    : parcel.parcelId;
  const synthetic = parcel.trustDomain === "synthetic_test_only";
  if (synthetic) {
    if (!slug.startsWith("synthetic-")) {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        "$/parcelId",
        "synthetic trust domain requires a synthetic slug prefix",
      );
    }
    if (
      parcel.boundaryRef !== null &&
      !parcel.boundaryRef.boundaryId.startsWith("synthetic-")
    ) {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        "$/boundaryRef/boundaryId",
        "synthetic trust domain requires a synthetic boundary reference",
      );
    }
  } else {
    if (slug.startsWith("synthetic-")) {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        "$/parcelId",
        "authorized trust domain forbids a synthetic slug prefix",
      );
    }
    if (
      parcel.boundaryRef !== null &&
      parcel.boundaryRef.boundaryId.startsWith("synthetic-")
    ) {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        "$/boundaryRef/boundaryId",
        "authorized trust domain forbids a synthetic boundary reference",
      );
    }
  }
}

function checkSyntheticUrls(parcel: LandParcel): void {
  if (parcel.trustDomain !== "synthetic_test_only") return;
  parcel.landStatusEvidence.forEach((evidence, index) => {
    if (!hostIsSyntheticInvalid(evidence.sourceUrl)) {
      fail(
        "SYNTHETIC_URL_REQUIRED",
        `$/landStatusEvidence/${index}/sourceUrl`,
        "synthetic trust domain requires a .invalid source host",
      );
    }
  });
  parcel.jurisdictionLayers.forEach((layer, index) => {
    if (!hostIsSyntheticInvalid(layer.evidenceUrl)) {
      fail(
        "SYNTHETIC_URL_REQUIRED",
        `$/jurisdictionLayers/${index}/evidenceUrl`,
        "synthetic trust domain requires a .invalid evidence host",
      );
    }
  });
}

/** Same contract as parseLandBoundary: snapshot, protected keys, schema, semantics, detached frozen result. */
export function parseLandParcel(input: unknown): LandParcel {
  const captured = snapshot(input);
  scanProtectedKeys(captured, "$");
  if (!validate(captured)) {
    const error = validate.errors?.[0];
    fail(
      "SCHEMA_INVALID",
      error?.instancePath ? `$${error.instancePath}` : "$",
      `closed schema rejected ${error?.keyword ?? "input"}`,
    );
  }
  const parcel = captured as unknown as LandParcel;
  checkLandStatusEvidenceMissing(parcel);
  checkLandStatusEvidenceOrphan(parcel);
  checkJurisdictionLayerDuplicate(parcel);
  checkSensitivity(parcel);
  checkTrustDomain(parcel);
  checkSyntheticUrls(parcel);
  return detached(parcel);
}

/** Canonical JSON as for serializeLandBoundary. */
export function serializeLandParcel(parcel: LandParcel): string {
  return canonical(parcel);
}
