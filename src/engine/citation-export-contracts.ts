/**
 * Citation and agency-metadata export contract (CitationExport 1.0.0).
 *
 * FROZEN INTERFACE (Makah demo groundwork, 2026-09-15). Exported names,
 * signatures, constants and error codes below are the lease boundary between
 * the lead and the runtime/test workers.
 *
 * The export carries already-accepted record identity, citation and
 * agency-level public contact metadata with per-field provenance reused by
 * `$ref` from PolicyRecord 1.4. It is not legal advice, not a comprehensive
 * database, not a jurisdiction/rights/eligibility determination and not a
 * substitute for the cited official source. Decision D-068 (adopted
 * 2026-09-15) permits agency-level contact fields; a real value still needs a
 * source review naming the exact official publication page, and none exists
 * yet, so contact fields remain synthetic. No I/O, no provider call, no
 * timer, no logging.
 */
import Ajv2020 from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import recordSchema from "../../schemas/record.schema.v1.json";
import schema from "../../schemas/citation-export.schema.v1.json";
import type { FieldProvenance } from "../shared/contracts";
import type {
  JurisdictionLayer,
  JurisdictionLayerLevel,
} from "./land-parcel-contracts";

export const CITATION_EXPORT_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/citation-export.schema.v1.json";
export const CITATION_EXPORT_SCHEMA_VERSION = "1.0.0";

export const CITATION_EXPORT_NONCLAIMS = Object.freeze([
  "not_legal_advice",
  "not_a_comprehensive_legal_database",
  "not_a_jurisdiction_rights_or_eligibility_determination",
  "not_a_substitute_for_the_cited_official_source",
  "coverage_is_bounded_and_non_comprehensive",
] as const);

/**
 * Keys that may never appear anywhere inside an export at any depth. The
 * export legitimately carries `jurisdiction` (copied from the record), so
 * this list is narrower than the boundary/parcel list: geometry payloads,
 * land/ownership status, personal-contact and secret keys, and derived legal
 * claims only.
 */
export const CITATION_EXPORT_PROTECTED_KEYS = Object.freeze([
  "nationAssociations",
  "relevance",
  "whyShown",
  "rightsImpact",
  "legalConclusion",
  "legalApplicability",
  "legalEffect",
  "inferredRelevance",
  "applicability",
  "coordinates",
  "geometry",
  "geometries",
  "features",
  "latitude",
  "longitude",
  "bbox",
  "bounds",
  "centroid",
  "wkt",
  "geojson",
  "parcelGeometry",
  "landOwnership",
  "ownership",
  "owner",
  "trustLand",
  "feeLand",
  "email",
  "phone",
  "directLine",
  "mobile",
  "contact",
  "contactName",
  "contactPerson",
  "apiKey",
  "token",
  "secret",
] as const);

/**
 * Finite, case-insensitive substring blocklist applied to every non-null
 * administrativeOffice, publicAddress and publicPhone value. A hit means the
 * value is personal-shaped or non-public and the export is rejected with
 * PERSONAL_CONTACT_SHAPE. This is a deterministic guard, not a proof that a
 * value is agency-level; decision D-068 and a per-source
 * review remain required before any real value is populated.
 */
export const PERSONAL_CONTACT_SHAPE_TOKENS = Object.freeze([
  "@",
  "attn",
  "c/o",
  "care of",
  "direct",
  "cell",
  "mobile",
  "personal",
  "private",
  "home",
  "ext.",
  "ext ",
  "extension",
  "x1",
  "x2",
  "x3",
  "x4",
  "x5",
  "x6",
  "x7",
  "x8",
  "x9",
  "mr.",
  "mr ",
  "ms.",
  "ms ",
  "mrs",
  "mx.",
  "dr.",
  "esq",
  "desk",
  "voicemail",
  "director:",
  "officer:",
  "manager:",
] as const);

export type CitationExportTrustDomain =
  "synthetic_test_only" | "private_local_authorized";
export type ExportRecordJurisdictionLevel =
  "federal" | "state" | "county" | "tribal" | "other";

export type CitationExportScope =
  | {
      readonly kind: "parcel";
      readonly parcelId: string;
      /** The parcel's own layers, carried so every whyAssociated can be checked inside the export. */
      readonly jurisdictionLayers: readonly JurisdictionLayer[];
      readonly asOf: string;
    }
  | {
      readonly kind: "jurisdiction_layers";
      readonly jurisdictionLayers: readonly JurisdictionLayer[];
      readonly asOf: string;
    };

export interface ExportIssuingAuthority {
  readonly name: string;
  readonly officialWebsite: string | null;
  readonly administrativeOffice: string | null;
  readonly publicAddress: string | null;
  readonly publicPhone: string | null;
  readonly contactScope: "agency_public_only";
}

export interface ExportCitation {
  readonly officialCitation: string | null;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly sourceUpdatedAt: string | null;
}

/**
 * Display basis only. "Associated" means layer-match display; it is not a
 * PolicyRecord nationAssociation, not a jurisdictional relevance finding,
 * and never an applicability statement.
 */
export interface WhyAssociated {
  readonly basis: "jurisdiction_layer_match";
  readonly layerIndex: number;
  readonly level: JurisdictionLayerLevel;
  readonly authorityName: string;
  /** Copied from the matched layer: `nation:<slug>` for tribal, null otherwise. */
  readonly nationId: string | null;
  readonly evidenceUrl: string;
}

export interface CitationExportRecord {
  readonly internalId: string;
  readonly officialTitle: string;
  readonly documentType: string;
  readonly jurisdiction: {
    readonly level: ExportRecordJurisdictionLevel;
    readonly name: string;
  };
  readonly issuingAuthority: ExportIssuingAuthority;
  readonly citation: ExportCitation;
  readonly whyAssociated: WhyAssociated | null;
  readonly fieldProvenance: readonly FieldProvenance[];
}

export interface CitationExport {
  readonly $schema: typeof CITATION_EXPORT_SCHEMA_ID;
  readonly schemaVersion: typeof CITATION_EXPORT_SCHEMA_VERSION;
  readonly exportId: string;
  readonly trustDomain: CitationExportTrustDomain;
  readonly generatedAt: string;
  readonly scope: CitationExportScope;
  readonly records: readonly CitationExportRecord[];
  readonly nonClaims: typeof CITATION_EXPORT_NONCLAIMS;
}

/**
 * Error codes, in check order. `path` starts at `$`.
 *
 * - INVALID_JSON, INPUT_LIMIT: as for LandBoundary.
 * - PROTECTED_KEY: any CITATION_EXPORT_PROTECTED_KEYS key at any depth.
 * - SCHEMA_INVALID: strict schema rejection. The schema resolves the record
 *   schema by `$id` for `fieldProvenance`, so the runtime registers
 *   `schemas/record.schema.v1.json` in the same Ajv instance.
 * - PERSONAL_CONTACT_SHAPE: any issuingAuthority.name, or non-null
 *   administrativeOffice, publicAddress or publicPhone, whose lowercased value
 *   contains a PERSONAL_CONTACT_SHAPE_TOKENS member. Path: the offending
 *   field. This is a finite guard: an unmarked personal name passes it, so
 *   agency-level status rests on provenance and source review, never here.
 * - CONTACT_PROVENANCE_MISSING: a non-null administrativeOffice,
 *   publicAddress or publicPhone on record `<i>` without a fieldProvenance
 *   entry whose `field` equals `/records/<i>/issuingAuthority/<name>`.
 *   Path: the offending field.
 * - PROVENANCE_MISSING: record `<i>` lacks a provenance entry for
 *   `/records/<i>/officialTitle` or `/records/<i>/citation/sourceUrl`.
 * - PROVENANCE_ORPHAN: a provenance `field` pointer does not start with
 *   `/records/<i>/` for its own record index or points at a path that does
 *   not exist in that record (resolved against the snapshot).
 * - PROVENANCE_DUPLICATE: two provenance entries on one record share a
 *   `field` pointer.
 * - WHY_ASSOCIATED_LAYER_MISMATCH: a non-null whyAssociated whose layerIndex
 *   is out of range or whose level, authorityName, nationId or evidenceUrl
 *   differs from scope.jurisdictionLayers at that index. Both scope kinds
 *   carry layers, so this is always checked; a tribal basis that names a
 *   Nation absent from the scope's layers cannot exist in an export.
 * - TRUST_DOMAIN_MISMATCH: trustDomain `synthetic_test_only` requires the
 *   exportId to start with `synthetic-` and, for scope.kind `parcel`, a
 *   parcelId slug prefix `synthetic-`; `private_local_authorized` forbids both.
 * - SYNTHETIC_URL_REQUIRED: trustDomain `synthetic_test_only` with any
 *   citation.sourceUrl, officialWebsite, whyAssociated.evidenceUrl,
 *   scope layer evidenceUrl or provenance sourceUrl whose host does not end
 *   in `.invalid`.
 */
export const CITATION_EXPORT_ERROR_CODES = Object.freeze([
  "INVALID_JSON",
  "INPUT_LIMIT",
  "PROTECTED_KEY",
  "SCHEMA_INVALID",
  "PERSONAL_CONTACT_SHAPE",
  "CONTACT_PROVENANCE_MISSING",
  "PROVENANCE_MISSING",
  "PROVENANCE_ORPHAN",
  "PROVENANCE_DUPLICATE",
  "WHY_ASSOCIATED_LAYER_MISMATCH",
  "TRUST_DOMAIN_MISMATCH",
  "SYNTHETIC_URL_REQUIRED",
] as const);
export type CitationExportErrorCode =
  (typeof CITATION_EXPORT_ERROR_CODES)[number];

export class CitationExportValidationError extends Error {
  constructor(
    readonly code: CitationExportErrorCode,
    readonly path: string,
    detail: string,
  ) {
    super(`${code} at ${path}: ${detail}`);
    this.name = "CitationExportValidationError";
  }
}

type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function fail(
  code: CitationExportErrorCode,
  path: string,
  detail: string,
): never {
  throw new CitationExportValidationError(code, path, detail);
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
      if (error instanceof CitationExportValidationError) throw error;
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
    if ((CITATION_EXPORT_PROTECTED_KEYS as readonly string[]).includes(key)) {
      fail("PROTECTED_KEY", `${path}/${key}`, "protected key present");
    }
    scanProtectedKeys(value[key] as JsonValue, `${path}/field`);
  }
}

const ajv = new Ajv2020({ strict: true, allErrors: false });
addFormats(ajv);
ajv.addSchema(recordSchema);
ajv.addSchema(schema);
const validate: ValidateFunction = ajv.getSchema(CITATION_EXPORT_SCHEMA_ID)!;

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

/** Resolve a JSON Pointer remainder (no leading slash needed) against one record's snapshot. */
function resolvesInRecord(
  recordSnapshot: JsonValue,
  remainder: string,
): boolean {
  if (remainder === "") return true;
  const segments = remainder
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
  let node: JsonValue = recordSnapshot;
  for (const segment of segments) {
    if (node === null || typeof node !== "object") return false;
    if (Array.isArray(node)) {
      if (!/^(?:0|[1-9][0-9]*)$/.test(segment)) return false;
      const index = Number(segment);
      if (index >= node.length) return false;
      node = node[index];
    } else {
      if (!Object.prototype.hasOwnProperty.call(node, segment)) return false;
      node = (node as { [key: string]: JsonValue })[segment];
    }
  }
  return true;
}

type ContactFieldName =
  "administrativeOffice" | "publicAddress" | "publicPhone";

function contactFields(
  record: CitationExportRecord,
): readonly (readonly [ContactFieldName, string | null])[] {
  return [
    ["administrativeOffice", record.issuingAuthority.administrativeOffice],
    ["publicAddress", record.issuingAuthority.publicAddress],
    ["publicPhone", record.issuingAuthority.publicPhone],
  ];
}

function checkPersonalContactShape(exportValue: CitationExport): void {
  exportValue.records.forEach((record, i) => {
    const scanned: readonly (readonly [string, string | null])[] = [
      ["name", record.issuingAuthority.name],
      ...contactFields(record),
    ];
    for (const [name, value] of scanned) {
      if (value === null) continue;
      const lowered = value.toLowerCase();
      if (
        PERSONAL_CONTACT_SHAPE_TOKENS.some((token) => lowered.includes(token))
      ) {
        fail(
          "PERSONAL_CONTACT_SHAPE",
          `$/records/${i}/issuingAuthority/${name}`,
          "contact value is personal-shaped or non-public",
        );
      }
    }
  });
}

function checkContactProvenanceMissing(exportValue: CitationExport): void {
  exportValue.records.forEach((record, i) => {
    for (const [name, value] of contactFields(record)) {
      if (value === null) continue;
      const expected = `/records/${i}/issuingAuthority/${name}`;
      const hasProvenance = record.fieldProvenance.some(
        (entry) => entry.field === expected,
      );
      if (!hasProvenance) {
        fail(
          "CONTACT_PROVENANCE_MISSING",
          `$/records/${i}/issuingAuthority/${name}`,
          "populated contact field lacks its own provenance entry",
        );
      }
    }
  });
}

function checkProvenanceMissing(exportValue: CitationExport): void {
  exportValue.records.forEach((record, i) => {
    const required: readonly string[] = [
      `/records/${i}/officialTitle`,
      `/records/${i}/citation/sourceUrl`,
    ];
    for (const field of required) {
      if (!record.fieldProvenance.some((entry) => entry.field === field)) {
        fail(
          "PROVENANCE_MISSING",
          `$${field}`,
          "record lacks a required provenance entry",
        );
      }
    }
  });
}

function checkProvenanceOrphan(
  exportValue: CitationExport,
  records: readonly JsonValue[],
): void {
  exportValue.records.forEach((record, i) => {
    const prefix = `/records/${i}/`;
    const recordSnapshot = records[i]!;
    record.fieldProvenance.forEach((entry, j) => {
      if (!entry.field.startsWith(prefix)) {
        fail(
          "PROVENANCE_ORPHAN",
          `$/records/${i}/fieldProvenance/${j}/field`,
          "provenance field pointer does not name its own record",
        );
      }
      const remainder = entry.field.slice(prefix.length);
      if (!resolvesInRecord(recordSnapshot, remainder)) {
        fail(
          "PROVENANCE_ORPHAN",
          `$/records/${i}/fieldProvenance/${j}/field`,
          "provenance field pointer does not resolve in its record",
        );
      }
    });
  });
}

function checkProvenanceDuplicate(exportValue: CitationExport): void {
  exportValue.records.forEach((record, i) => {
    const seen = new Set<string>();
    record.fieldProvenance.forEach((entry, j) => {
      if (seen.has(entry.field)) {
        fail(
          "PROVENANCE_DUPLICATE",
          `$/records/${i}/fieldProvenance/${j}/field`,
          "duplicate provenance field pointer on one record",
        );
      }
      seen.add(entry.field);
    });
  });
}

function checkWhyAssociatedLayerMismatch(exportValue: CitationExport): void {
  const layers = exportValue.scope.jurisdictionLayers;
  exportValue.records.forEach((record, i) => {
    const why = record.whyAssociated;
    if (why === null) return;
    const layer = layers[why.layerIndex];
    if (
      layer === undefined ||
      layer.level !== why.level ||
      layer.authorityName !== why.authorityName ||
      layer.nationId !== why.nationId ||
      layer.evidenceUrl !== why.evidenceUrl
    ) {
      fail(
        "WHY_ASSOCIATED_LAYER_MISMATCH",
        `$/records/${i}/whyAssociated`,
        "whyAssociated does not match the referenced jurisdiction layer",
      );
    }
  });
}

function slugAfterParcelPrefix(parcelId: string): string {
  const prefix = "parcel:";
  return parcelId.startsWith(prefix) ? parcelId.slice(prefix.length) : parcelId;
}

function checkTrustDomain(exportValue: CitationExport): void {
  const synthetic = exportValue.trustDomain === "synthetic_test_only";
  if (synthetic) {
    if (!exportValue.exportId.startsWith("synthetic-")) {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        "$/exportId",
        "synthetic trust domain requires a synthetic exportId prefix",
      );
    }
    if (exportValue.scope.kind === "parcel") {
      const slug = slugAfterParcelPrefix(exportValue.scope.parcelId);
      if (!slug.startsWith("synthetic-")) {
        fail(
          "TRUST_DOMAIN_MISMATCH",
          "$/scope/parcelId",
          "synthetic trust domain requires a synthetic parcel slug prefix",
        );
      }
    }
  } else {
    if (exportValue.exportId.startsWith("synthetic-")) {
      fail(
        "TRUST_DOMAIN_MISMATCH",
        "$/exportId",
        "authorized trust domain forbids a synthetic exportId prefix",
      );
    }
    if (exportValue.scope.kind === "parcel") {
      const slug = slugAfterParcelPrefix(exportValue.scope.parcelId);
      if (slug.startsWith("synthetic-")) {
        fail(
          "TRUST_DOMAIN_MISMATCH",
          "$/scope/parcelId",
          "authorized trust domain forbids a synthetic parcel slug prefix",
        );
      }
    }
  }
}

function checkSyntheticUrls(exportValue: CitationExport): void {
  if (exportValue.trustDomain !== "synthetic_test_only") return;
  exportValue.scope.jurisdictionLayers.forEach((layer, j) => {
    if (!hostIsSyntheticInvalid(layer.evidenceUrl)) {
      fail(
        "SYNTHETIC_URL_REQUIRED",
        `$/scope/jurisdictionLayers/${j}/evidenceUrl`,
        "synthetic trust domain requires a .invalid evidence host",
      );
    }
  });
  exportValue.records.forEach((record, i) => {
    if (!hostIsSyntheticInvalid(record.citation.sourceUrl)) {
      fail(
        "SYNTHETIC_URL_REQUIRED",
        `$/records/${i}/citation/sourceUrl`,
        "synthetic trust domain requires a .invalid citation host",
      );
    }
    if (
      record.issuingAuthority.officialWebsite !== null &&
      !hostIsSyntheticInvalid(record.issuingAuthority.officialWebsite)
    ) {
      fail(
        "SYNTHETIC_URL_REQUIRED",
        `$/records/${i}/issuingAuthority/officialWebsite`,
        "synthetic trust domain requires a .invalid official website host",
      );
    }
    if (
      record.whyAssociated !== null &&
      !hostIsSyntheticInvalid(record.whyAssociated.evidenceUrl)
    ) {
      fail(
        "SYNTHETIC_URL_REQUIRED",
        `$/records/${i}/whyAssociated/evidenceUrl`,
        "synthetic trust domain requires a .invalid why-associated host",
      );
    }
    record.fieldProvenance.forEach((entry, j) => {
      if (!hostIsSyntheticInvalid(entry.sourceUrl)) {
        fail(
          "SYNTHETIC_URL_REQUIRED",
          `$/records/${i}/fieldProvenance/${j}/sourceUrl`,
          "synthetic trust domain requires a .invalid provenance host",
        );
      }
    });
  });
}

/** Same contract as parseLandBoundary: snapshot, protected keys, schema, semantics, detached frozen result. */
export function parseCitationExport(input: unknown): CitationExport {
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
  const exportValue = captured as unknown as CitationExport;
  const rawRecords = (captured as { records: JsonValue[] }).records;
  checkPersonalContactShape(exportValue);
  checkContactProvenanceMissing(exportValue);
  checkProvenanceMissing(exportValue);
  checkProvenanceOrphan(exportValue, rawRecords);
  checkProvenanceDuplicate(exportValue);
  checkWhyAssociatedLayerMismatch(exportValue);
  checkTrustDomain(exportValue);
  checkSyntheticUrls(exportValue);
  return detached(exportValue);
}

/** Canonical JSON as for serializeLandBoundary. */
export function serializeCitationExport(
  citationExport: CitationExport,
): string {
  return canonical(citationExport);
}
