/**
 * Private-only land boundary reference contract (LandBoundary 1.0.0).
 *
 * FROZEN INTERFACE (Makah demo groundwork, 2026-09-15). Exported names,
 * signatures, constants and error codes below are the lease boundary between
 * the lead and the runtime/test workers. A worker may add non-exported
 * helpers; it may not rename, remove or widen an export.
 *
 * Authority: none. This module establishes no land status, jurisdiction,
 * rights, applicability or Nation association and never touches a public
 * artifact. Real boundary data lives only in an owner-owned private root
 * (decision D-010); this module handles references and synthetic fixtures.
 * No I/O, no provider call, no timer, no logging.
 */
import Ajv2020 from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import schema from "../../schemas/land-boundary.schema.v1.json";

export const LAND_BOUNDARY_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/land-boundary.schema.v1.json";
export const LAND_BOUNDARY_SCHEMA_VERSION = "1.0.0";

export const LAND_BOUNDARY_NONCLAIMS = Object.freeze([
  "not_a_land_status_determination",
  "not_a_jurisdiction_determination",
  "not_a_rights_or_applicability_determination",
  "not_a_nation_association",
  "not_public_data_and_never_in_a_public_artifact",
] as const);

/**
 * Keys that may never appear anywhere inside a boundary or parcel object,
 * at any depth. They cover PolicyRecord protected fact families, inline
 * geometry payloads, land/ownership status, personal contact and secrets.
 * Matching is exact, case-sensitive, on object keys only.
 */
export const PRIVATE_CONTEXT_PROTECTED_KEYS = Object.freeze([
  // `nationId` is deliberately absent: a tribal jurisdiction layer carries it
  // by design as the identity-bound match key; the closed boundary schema
  // cannot carry it anywhere, and `nationAssociations` stays protected.
  "nationIds",
  "nationAssociations",
  "jurisdiction",
  "issuingBodies",
  "officialSubjects",
  "taxonomyMemberships",
  "relevance",
  "whyShown",
  "whyAssociated",
  "rightsImpact",
  "legalConclusion",
  "legalApplicability",
  "legalEffect",
  "inferredRelevance",
  "primaryJurisdiction",
  "winningJurisdiction",
  "controllingJurisdiction",
  "coordinates",
  "coordinate",
  "geometry",
  "geometries",
  "features",
  "feature",
  "rings",
  "ring",
  "latitude",
  "longitude",
  "lat",
  "lon",
  "lng",
  "bbox",
  "bounds",
  "extent",
  "centroid",
  "wkt",
  "wkb",
  "geojson",
  "shapefile",
  "parcelGeometry",
  "landOwnership",
  "ownership",
  "owner",
  "trustLand",
  "feeLand",
  "email",
  "phone",
  "contact",
  "apiKey",
  "token",
  "secret",
] as const);

export type LandBoundaryTrustDomain =
  "synthetic_test_only" | "private_local_authorized";
/** No `public` class: a boundary reference is never public data. */
export type LandBoundarySensitivity = "internal" | "restricted" | "privileged";
export type LandBoundarySupplierClass =
  | "tribal_government"
  | "county"
  | "state"
  | "federal"
  | "project_synthetic"
  | "unknown";
export type LandBoundaryEvidenceBasis =
  | "official_public_gis_publication"
  | "government_supplied_private_file"
  | "tribal_government_supplied_private_file"
  | "synthetic_fixture";
export type LandBoundaryGeometryFormat =
  | "geojson_polygon_or_multipolygon"
  | "esri_shapefile_bundle"
  | "synthetic_fixture_placeholder";
export type LandBoundaryValidationState = "pending" | "validated" | "rejected";

export interface LandBoundaryGeometryReference {
  readonly kind: "external_private_object";
  /** `urn:policy-sentinel:private-boundary:<slug>`; synthetic slugs start with `synthetic-`. */
  readonly opaqueReference: string;
  /** SHA-256 hex of the external object bytes; never the bytes. */
  readonly objectDigest: string;
  readonly format: LandBoundaryGeometryFormat;
}

export interface LandBoundarySourceEvidence {
  readonly sourceLabel: string;
  readonly sourceUrl: string | null;
  readonly retrievedAt: string;
  readonly sourceUpdatedAt: string | null;
  readonly evidenceBasis: LandBoundaryEvidenceBasis;
  readonly validationState: LandBoundaryValidationState;
}

export interface LandBoundary {
  readonly $schema: typeof LAND_BOUNDARY_SCHEMA_ID;
  readonly schemaVersion: typeof LAND_BOUNDARY_SCHEMA_VERSION;
  readonly boundaryId: string;
  readonly trustDomain: LandBoundaryTrustDomain;
  readonly deploymentProfile: "private";
  readonly crs: string;
  readonly geometryRef: LandBoundaryGeometryReference;
  readonly supplierClass: LandBoundarySupplierClass;
  readonly sensitivity: LandBoundarySensitivity;
  readonly sourceEvidence: readonly LandBoundarySourceEvidence[];
  readonly nonClaims: typeof LAND_BOUNDARY_NONCLAIMS;
}

/**
 * Error codes, in the order the parser checks them. `path` is a JSON
 * Pointer-like string starting at `$`.
 *
 * - INVALID_JSON: non-plain input (getter, toJSON, symbol key, cycle, sparse
 *   array, non-finite number, prototype other than Object/Array).
 * - INPUT_LIMIT: node/depth/string/key/array budgets exceeded.
 * - PROTECTED_KEY: any PRIVATE_CONTEXT_PROTECTED_KEYS key at any depth.
 *   Checked on the snapshot before schema validation so a closed schema
 *   cannot mask the reason.
 * - SCHEMA_INVALID: closed JSON Schema rejection.
 * - SENSITIVITY_TOO_LOW: supplierClass `tribal_government` or evidenceBasis
 *   `tribal_government_supplied_private_file` with sensitivity `internal`
 *   (Tribal-supplied material is at least `restricted`; `public` is not a
 *   boundary class at all and is a SCHEMA_INVALID value).
 * - TRUST_DOMAIN_MISMATCH: trustDomain `synthetic_test_only` requires every
 *   evidenceBasis to be `synthetic_fixture`, supplierClass
 *   `project_synthetic`, geometryRef.format `synthetic_fixture_placeholder`
 *   and opaqueReference slug prefix `synthetic-`; trustDomain
 *   `private_local_authorized` forbids all four synthetic markers.
 * - SYNTHETIC_URL_REQUIRED: trustDomain `synthetic_test_only` with a non-null
 *   sourceUrl whose host does not end in `.invalid`.
 */
export const LAND_BOUNDARY_ERROR_CODES = Object.freeze([
  "INVALID_JSON",
  "INPUT_LIMIT",
  "PROTECTED_KEY",
  "SCHEMA_INVALID",
  "SENSITIVITY_TOO_LOW",
  "TRUST_DOMAIN_MISMATCH",
  "SYNTHETIC_URL_REQUIRED",
] as const);
export type LandBoundaryErrorCode = (typeof LAND_BOUNDARY_ERROR_CODES)[number];

export class LandBoundaryValidationError extends Error {
  constructor(
    readonly code: LandBoundaryErrorCode,
    readonly path: string,
    detail: string,
  ) {
    super(`${code} at ${path}: ${detail}`);
    this.name = "LandBoundaryValidationError";
  }
}

type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function fail(
  code: LandBoundaryErrorCode,
  path: string,
  detail: string,
): never {
  throw new LandBoundaryValidationError(code, path, detail);
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
      if (error instanceof LandBoundaryValidationError) throw error;
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
    if ((PRIVATE_CONTEXT_PROTECTED_KEYS as readonly string[]).includes(key)) {
      fail("PROTECTED_KEY", `${path}/${key}`, "protected key present");
    }
    scanProtectedKeys(value[key] as JsonValue, `${path}/field`);
  }
}

const ajv = new Ajv2020({ strict: true, allErrors: false });
addFormats(ajv);
ajv.addSchema(schema);
const validate: ValidateFunction = ajv.getSchema(LAND_BOUNDARY_SCHEMA_ID)!;

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

function checkSensitivity(boundary: LandBoundary): void {
  const tribalSupplied =
    boundary.supplierClass === "tribal_government" ||
    boundary.sourceEvidence.some(
      (evidence) =>
        evidence.evidenceBasis === "tribal_government_supplied_private_file",
    );
  if (tribalSupplied && boundary.sensitivity === "internal") {
    fail(
      "SENSITIVITY_TOO_LOW",
      "$/sensitivity",
      "tribal-supplied evidence requires at least restricted sensitivity",
    );
  }
}

function checkTrustDomain(boundary: LandBoundary): void {
  const prefix = "urn:policy-sentinel:private-boundary:";
  const slug = boundary.geometryRef.opaqueReference.startsWith(prefix)
    ? boundary.geometryRef.opaqueReference.slice(prefix.length)
    : boundary.geometryRef.opaqueReference;
  const synthetic = boundary.trustDomain === "synthetic_test_only";
  if (synthetic) {
    if (boundary.supplierClass !== "project_synthetic") {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        "$/supplierClass",
        "synthetic trust domain requires project_synthetic supplier",
      );
    }
    if (boundary.geometryRef.format !== "synthetic_fixture_placeholder") {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        "$/geometryRef/format",
        "synthetic trust domain requires placeholder geometry format",
      );
    }
    if (!slug.startsWith("synthetic-")) {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        "$/geometryRef/opaqueReference",
        "synthetic trust domain requires a synthetic slug prefix",
      );
    }
    boundary.sourceEvidence.forEach((evidence, index) => {
      if (evidence.evidenceBasis !== "synthetic_fixture") {
        fail(
          "TRUST_DOMAIN_MISMATCH",
          `$/sourceEvidence/${index}/evidenceBasis`,
          "synthetic trust domain requires synthetic fixture evidence",
        );
      }
    });
  } else {
    if (boundary.supplierClass === "project_synthetic") {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        "$/supplierClass",
        "authorized trust domain forbids the synthetic supplier",
      );
    }
    if (boundary.geometryRef.format === "synthetic_fixture_placeholder") {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        "$/geometryRef/format",
        "authorized trust domain forbids the placeholder geometry format",
      );
    }
    if (slug.startsWith("synthetic-")) {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        "$/geometryRef/opaqueReference",
        "authorized trust domain forbids a synthetic slug prefix",
      );
    }
    boundary.sourceEvidence.forEach((evidence, index) => {
      if (evidence.evidenceBasis === "synthetic_fixture") {
        fail(
          "TRUST_DOMAIN_MISMATCH",
          `$/sourceEvidence/${index}/evidenceBasis`,
          "authorized trust domain forbids synthetic fixture evidence",
        );
      }
    });
  }
}

function checkSyntheticUrls(boundary: LandBoundary): void {
  if (boundary.trustDomain !== "synthetic_test_only") return;
  boundary.sourceEvidence.forEach((evidence, index) => {
    if (
      evidence.sourceUrl !== null &&
      !hostIsSyntheticInvalid(evidence.sourceUrl)
    ) {
      fail(
        "SYNTHETIC_URL_REQUIRED",
        `$/sourceEvidence/${index}/sourceUrl`,
        "synthetic trust domain requires a .invalid source host",
      );
    }
  });
}

/**
 * Snapshot, scan for protected keys, validate against the strict schema,
 * enforce the semantic rules above, and return a detached, recursively
 * frozen value. The caller's input is never mutated, frozen, or retained.
 * Diagnostics never echo an unvalidated property name or value.
 */
export function parseLandBoundary(input: unknown): LandBoundary {
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
  const boundary = captured as unknown as LandBoundary;
  checkSensitivity(boundary);
  checkTrustDomain(boundary);
  checkSyntheticUrls(boundary);
  return detached(boundary);
}

/**
 * Canonical JSON: object keys sorted with plain `<` ordering, arrays in
 * order, no whitespace. Byte-stable for equal values.
 */
export function serializeLandBoundary(boundary: LandBoundary): string {
  return canonical(boundary);
}
