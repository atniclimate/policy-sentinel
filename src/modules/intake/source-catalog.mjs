import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../../../schemas/source-catalog.schema.v1.json" with { type: "json" };

import {
  SOURCE_CAPABILITY_MODES,
  projectSourceCoverage,
  selectSourceDescriptors as selectSources,
  sourceReviewStatus,
} from "../../core/source-coverage.mjs";
export {
  SOURCE_CAPABILITY_MODES,
  MANAGED_STORAGE_CEILING_BYTES,
} from "../../core/source-coverage.mjs";
export const SOURCE_CATALOG_SCHEMA_ID = schema.$id;

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const validateTimestamp = ajv.compile({ type: "string", format: "date-time" });
const operationalModes = SOURCE_CAPABILITY_MODES.slice(0, -1);
const fail = (code) => {
  const error = new Error(code);
  error.code = code;
  throw error;
};
const copy = (value) => globalThis.structuredClone(value);
const sameReview = (left, right) =>
  left.reviewer === right.reviewer &&
  left.reviewedAt === right.reviewedAt &&
  left.expiresAt === right.expiresAt &&
  left.evidenceUrls.length === right.evidenceUrls.length &&
  left.evidenceUrls.every((url, index) => url === right.evidenceUrls[index]);
const id = (value) =>
  typeof value === "string" &&
  /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value) &&
  value.length <= 96;
const timestamp = (value) => validateTimestamp(value);

function safeUrl(value) {
  try {
    const url = new globalThis.URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !value.includes("\\") &&
      !/%(?:2e|2f|5c|00)/i.test(value) &&
      ![...url.searchParams.keys()].some((key) =>
        /token|key|secret|password|auth|signature|credential/i.test(key),
      )
    );
  } catch {
    return false;
  }
}
function validateRange(range) {
  if (range?.from && range?.through && range.from > range.through)
    fail("CATALOG_REVERSED_DATE_RANGE");
}
function clock(asOf) {
  if (!timestamp(asOf)) fail("CATALOG_INVALID_AS_OF");
  return Date.parse(asOf);
}

function validateRegionalInterfaces(catalog) {
  const register = catalog.regionalInterfaces;
  if (!register) return;
  // Version 1 freezes these seven candidates; expanding scope requires a successor.
  const scope = new Map([
    ["WA", "wa-legislative-web-services"],
    ["OR", "or-legislative-odata"],
    ["ID", "id-legislation"],
    ["AK", "ak-legislation"],
    ["CA", "ca-legislation"],
    ["MT", "mt-legislation"],
    ["NV", "nv-legislation"],
  ]);
  const sources = new Map(catalog.sources.map((source) => [source.id, source]));
  const states = new Set();
  for (const entry of register.entries) {
    const source = sources.get(entry.sourceId);
    if (
      states.has(entry.state) ||
      scope.get(entry.state) !== entry.sourceId ||
      !source ||
      source.authorityClass !== "state" ||
      !source.discoveryRegions.includes(entry.state) ||
      !source.recordKinds.includes("legislation")
    )
      fail("CATALOG_REGIONAL_SOURCE_BINDING");
    states.add(entry.state);
    const required = entry.state === "WA" || entry.state === "OR";
    if (
      entry.requirement !==
        (required ? "required_api" : "interface_disposition") ||
      (required && entry.disposition !== "api_candidate") ||
      (entry.disposition === "api_candidate") !==
        (source.interfaceKind === "api")
    )
      fail("CATALOG_REGIONAL_INTERFACE_DISPOSITION");
    if (
      !entry.evidence.some(
        (item) =>
          item.record === source.evidenceRecord &&
          source.review.evidenceUrls.includes(item.url),
      ) ||
      entry.evidence.some(
        (item) =>
          item.record.split("/").includes("..") ||
          !safeUrl(item.url) ||
          item.observedOn > register.assessedOn ||
          item.observedOn > source.review.reviewedAt.slice(0, 10),
      ) ||
      (entry.disposition === "documented_non_api" &&
        !entry.evidence.some(
          (item) => item.observation === "direct_documentation",
        ))
    )
      fail("CATALOG_REGIONAL_INTERFACE_EVIDENCE");
  }
}

/** Validate data only. A valid catalog neither qualifies nor activates a source. */
export function validateSourceCatalog(catalog) {
  if (!validate(catalog)) fail("INVALID_SOURCE_CATALOG");
  const ids = new Set();
  for (const source of catalog.sources) {
    if (ids.has(source.id)) fail("CATALOG_DUPLICATE_SOURCE");
    ids.add(source.id);
    if (source.evidenceRecord.split("/").includes(".."))
      fail("CATALOG_UNSAFE_EVIDENCE_RECORD");
    const capabilities = new Map(
      source.capabilities.map((value) => [value.mode, value]),
    );
    if (capabilities.size !== operationalModes.length)
      fail("CATALOG_DUPLICATE_CAPABILITY");
    if (
      new Set(source.evidenceFeatures.map((value) => value.name)).size !==
      source.evidenceFeatures.length
    )
      fail("CATALOG_DUPLICATE_FEATURE");
    for (const item of [...source.capabilities, ...source.evidenceFeatures]) {
      if (item.state !== "unknown" && item.evidenceUrls.length === 0)
        fail("CATALOG_CAPABILITY_WITHOUT_EVIDENCE");
    }
    if (
      source.implementedCapabilities.some(
        (mode) => capabilities.get(mode)?.state !== "verified",
      )
    )
      fail("CATALOG_UNVERIFIED_IMPLEMENTATION");
    if (
      source.review.expiresAt !== null &&
      Date.parse(source.review.expiresAt) <=
        Date.parse(source.review.reviewedAt)
    )
      fail("CATALOG_INVALID_REVIEW_WINDOW");
    if (
      source.lifecycle === "discovery" &&
      (source.profile !== null ||
        source.activation !== null ||
        source.implementedCapabilities.length)
    )
      fail("CATALOG_DISCOVERY_CANNOT_ACTIVATE");
    if (
      source.lifecycle !== "discovery" &&
      (source.review.expiresAt === null ||
        source.terms !== "cleared" ||
        source.credentials.kind === "unknown")
    )
      fail("CATALOG_UNQUALIFIED_SOURCE");
    if (
      source.lifecycle === "active" &&
      (!source.activation ||
        source.blockers.length ||
        !source.implementedCapabilities.length)
    )
      fail("CATALOG_ACTIVATION_EVIDENCE_REQUIRED");
    if (source.lifecycle !== "active" && source.activation !== null)
      fail("CATALOG_INACTIVE_ACTIVATION");
    if (
      source.activation &&
      Date.parse(source.activation.activatedAt) <
        Date.parse(source.review.reviewedAt)
    )
      fail("CATALOG_ACTIVATION_PRECEDES_REVIEW");
    if (
      source.authorityClass === "user_supplied" &&
      (source.interfaceKind !== "local" ||
        source.profile !== null ||
        source.credentials.kind !== "none")
    )
      fail("CATALOG_USER_SUPPLIED_NETWORK_FORBIDDEN");
    if (
      source.authorityClass !== "user_supplied" &&
      source.interfaceKind === "local"
    )
      fail("CATALOG_LOCAL_SOURCE_CLASS_REQUIRED");
    const jurisdiction = source.publishingJurisdiction;
    if (
      jurisdiction &&
      ((source.authorityClass === "federal" && jurisdiction.ref !== "us") ||
        (source.authorityClass === "state" &&
          !jurisdiction.ref.startsWith("us-state:")) ||
        (source.authorityClass === "county" &&
          !jurisdiction.ref.startsWith("us-county:")) ||
        (source.authorityClass === "intergovernmental" &&
          !jurisdiction.ref.startsWith("body:")) ||
        (source.authorityClass === "tribal_government" &&
          !jurisdiction.ref.startsWith("nation:")))
    )
      fail("CATALOG_PUBLISHER_JURISDICTION_MISMATCH");
    validateRange(source.coverage.documented);
    validateRange(source.coverage.selected);
    validateRange(source.coverage.emitted);
    if (
      source.lifecycle === "discovery" &&
      (source.coverage.selected !== null || source.coverage.emitted !== null)
    )
      fail("CATALOG_DISCOVERY_COVERAGE_NOT_OBSERVED");
    const evidenceUrls = [
      ...source.review.evidenceUrls,
      ...source.capabilities.flatMap((value) => value.evidenceUrls),
      ...source.evidenceFeatures.flatMap((value) => value.evidenceUrls),
      ...(jurisdiction ? [jurisdiction.evidence.url] : []),
      ...(source.activation?.evidenceUrls ?? []),
    ];
    if (evidenceUrls.some((url) => !safeUrl(url)))
      fail("CATALOG_UNSAFE_EVIDENCE_URL");
    if (source.profile) {
      if (
        source.profile.id !== source.id ||
        !sameReview(source.profile.review, source.review) ||
        source.profile.review.expiresAt === null ||
        source.profile.hosts.some(
          (host) =>
            /^\d+(?:\.\d+){3}$/.test(host) ||
            host === "localhost" ||
            !host.includes("."),
        ) ||
        source.profile.pathPrefixes.some(
          (path) =>
            path === "/" ||
            /%(?:2e|2f|5c|00)/i.test(path) ||
            path.split("/").includes(".."),
        )
      )
        fail("CATALOG_PROFILE_MISMATCH");
      if (source.interfaceKind === "local")
        fail("CATALOG_LOCAL_PROFILE_FORBIDDEN");
    }
  }
  validateRegionalInterfaces(catalog);
  return catalog;
}

/** Validate the intake boundary before delegating to the browser-safe projection. */
export function describeSourceCoverage(catalog, options = {}) {
  validateSourceCatalog(catalog);
  const asOf =
    options.asOf === undefined ? new Date().toISOString() : options.asOf;
  clock(asOf);
  return projectSourceCoverage(catalog, { ...options, asOf });
}

/**
 * Project the existing custody manifest without changing its byte contract.
 * Replay may reproduce a historical expired profile; custody still rejects it
 * for dispatch. Only active, current, credential-free direct routes may produce
 * a dispatch projection. This function performs no I/O or acquisition.
 */
export function manifestFromSourceCatalog(
  catalog,
  {
    sourceIds,
    targets,
    runId,
    trustDomain = catalog?.trustDomain,
    purpose = "dispatch",
    asOf = new Date().toISOString(),
  } = {},
) {
  validateSourceCatalog(catalog);
  const at = clock(asOf);
  if (
    !id(runId) ||
    trustDomain !== catalog.trustDomain ||
    !["real_source_local", "synthetic_test_only"].includes(trustDomain) ||
    !["dispatch", "replay"].includes(purpose) ||
    !Array.isArray(sourceIds) ||
    !sourceIds.length ||
    sourceIds.length > 4 ||
    !Array.isArray(targets) ||
    !targets.length ||
    targets.length > 10_000
  )
    fail("CATALOG_INVALID_MANIFEST_REQUEST");
  const selected = selectSources(catalog, sourceIds);
  for (const source of selected) {
    if (
      source.lifecycle === "discovery" ||
      !source.profile ||
      source.terms !== "cleared" ||
      source.credentials.kind !== "none" ||
      source.authorityClass === "user_supplied"
    )
      fail("CATALOG_SOURCE_NOT_ADMISSIBLE");
    if (purpose === "dispatch") {
      if (sourceReviewStatus(source, at) !== "current")
        fail("CATALOG_REVIEW_NOT_CURRENT");
      if (
        source.lifecycle !== "active" ||
        !source.activation ||
        Date.parse(source.activation.activatedAt) > at ||
        source.blockers.length ||
        !source.implementedCapabilities.includes("identifier_only")
      )
        fail("CATALOG_SOURCE_NOT_ACTIVE");
    }
  }
  if (new Set(selected.flatMap((source) => source.profile.hosts)).size > 10)
    fail("CATALOG_HOST_BUDGET");
  const byId = new Map(selected.map((source) => [source.id, source]));
  const urls = new Set();
  const mediaTypes = [
    "text/html",
    "text/plain",
    "text/xml",
    "application/xml",
    "application/json",
    "application/pdf",
  ];
  for (const target of targets) {
    if (
      !target ||
      typeof target !== "object" ||
      Array.isArray(target) ||
      Object.keys(target).sort().join() !==
        ["profileId", "url", "expectedIdentity", "mediaTypes"].sort().join() ||
      !byId.has(target.profileId) ||
      typeof target.url !== "string" ||
      !safeUrl(target.url) ||
      urls.has(target.url) ||
      typeof target.expectedIdentity !== "string" ||
      !target.expectedIdentity.trim() ||
      target.expectedIdentity.length > 500 ||
      !Array.isArray(target.mediaTypes) ||
      !target.mediaTypes.length ||
      new Set(target.mediaTypes).size !== target.mediaTypes.length ||
      target.mediaTypes.some((type) => !mediaTypes.includes(type))
    )
      fail("CATALOG_INVALID_TARGET");
    const url = new globalThis.URL(target.url);
    const profile = byId.get(target.profileId).profile;
    if (
      url.hash ||
      !profile.hosts.includes(url.hostname) ||
      !profile.pathPrefixes.some((prefix) => url.pathname.startsWith(prefix))
    )
      fail("CATALOG_TARGET_OUTSIDE_PROFILE");
    urls.add(target.url);
  }
  return {
    version: "1.0.0",
    runId,
    trustDomain,
    profiles: selected.map((source) => copy(source.profile)),
    targets: copy(targets),
  };
}
