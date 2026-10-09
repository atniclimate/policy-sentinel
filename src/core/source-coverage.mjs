// Pure projection of a catalog already validated at an intake or build boundary.
// This module performs no schema compilation, I/O, credential lookup or activation.
export const SOURCE_CAPABILITY_MODES = Object.freeze([
  "topical",
  "full_text",
  "metadata",
  "identifier_only",
  "cached",
  "unavailable",
]);
export const MANAGED_STORAGE_CEILING_BYTES = 50_000_000_000;

const fail = (code) => {
  const error = new Error(code);
  error.code = code;
  throw error;
};
const copy = (value) => globalThis.structuredClone(value);
const id = (value) =>
  typeof value === "string" &&
  /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value) &&
  value.length <= 96;
function clock(asOf) {
  const match =
    typeof asOf === "string" &&
    /^(\d{4})-(\d{2})-(\d{2})[tT](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[zZ]|[+-](\d{2}):(\d{2}))$/.exec(
      asOf,
    );
  if (!match) fail("CATALOG_INVALID_AS_OF");
  const [, year, month, day, hour, minute, second, offsetHour, offsetMinute] =
    match.map((part) => (part === undefined ? 0 : Number(part)));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const at = Date.parse(asOf);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > days[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59 ||
    !Number.isFinite(at)
  )
    fail("CATALOG_INVALID_AS_OF");
  return at;
}
export function sourceReviewStatus(source, asOf) {
  if (Date.parse(source.review.reviewedAt) > asOf) return "future";
  if (source.review.expiresAt === null) return "unqualified";
  return Date.parse(source.review.expiresAt) <= asOf ? "expired" : "current";
}

export function selectSourceDescriptors(catalog, sourceIds, regionCodes) {
  if (
    sourceIds !== undefined &&
    (!Array.isArray(sourceIds) ||
      new Set(sourceIds).size !== sourceIds.length ||
      sourceIds.some((value) => !id(value)))
  )
    fail("CATALOG_INVALID_SELECTION");
  if (
    regionCodes !== undefined &&
    (!Array.isArray(regionCodes) ||
      new Set(regionCodes).size !== regionCodes.length ||
      regionCodes.some(
        (value) => typeof value !== "string" || !/^[A-Z]{2}$/.test(value),
      ))
  )
    fail("CATALOG_INVALID_REGION_SELECTION");
  const byId = new Map(catalog.sources.map((source) => [source.id, source]));
  if (sourceIds?.some((value) => !byId.has(value)))
    fail("CATALOG_UNKNOWN_SOURCE");
  const selected = sourceIds
    ? sourceIds.map((value) => byId.get(value))
    : catalog.sources;
  return selected.filter(
    (source) =>
      !regionCodes?.length ||
      source.discoveryRegions.includes("US") ||
      regionCodes.some((region) => source.discoveryRegions.includes(region)),
  );
}

/**
 * Availability describes this integration, not the publisher's reachability or
 * the existence of records. Discovery regions are never jurisdiction assertions.
 */
export function projectSourceCoverage(
  catalog,
  { asOf = new Date().toISOString(), sourceIds, regionCodes } = {},
) {
  const at = clock(asOf);
  const register = catalog.regionalInterfaces;
  const regionalBySource = new Map(
    (register?.entries ?? []).map((entry) => [entry.sourceId, entry]),
  );
  const sources = selectSourceDescriptors(catalog, sourceIds, regionCodes).map(
    (source) => {
      const reviewStatus = sourceReviewStatus(source, at);
      const blockers = copy(source.blockers);
      const add = (code, detail) => {
        if (!blockers.some((blocker) => blocker.code === code))
          blockers.push({ code, detail, gateRef: null });
      };
      if (source.lifecycle !== "active")
        add(
          "not-active",
          "Catalog discovery or qualification does not activate retrieval.",
        );
      if (reviewStatus !== "current")
        add(
          "review-" + reviewStatus,
          "A current source-specific review is required for new retrieval.",
        );
      if (source.terms !== "cleared")
        add(
          "terms-" + source.terms,
          "Source-specific access and intended uses remain unresolved.",
        );
      if (source.credentials.kind !== "none")
        add(
          "credential-operation-unavailable",
          "This catalog does not resolve credentials or authorize credentialed calls.",
        );
      if (source.activation && Date.parse(source.activation.activatedAt) > at)
        add(
          "activation-future",
          "Activation evidence is later than the requested date.",
        );
      const usable =
        blockers.length === 0 ? [...source.implementedCapabilities] : [];
      return {
        id: source.id,
        label: source.label,
        publisher: source.publisher,
        authorityClass: source.authorityClass,
        attributionScope: source.attributionScope,
        publishingJurisdiction: copy(source.publishingJurisdiction),
        discoveryRegions: [...source.discoveryRegions],
        recordKinds: [...source.recordKinds],
        interfaceKind: source.interfaceKind,
        lifecycle: source.lifecycle,
        reviewStatus,
        review: copy(source.review),
        evidenceRecord: source.evidenceRecord,
        declaredCapabilities: copy(source.capabilities),
        availableCapabilities: usable.length ? usable : ["unavailable"],
        evidenceFeatures: copy(source.evidenceFeatures),
        coverage: copy(source.coverage),
        blockers,
        ...(regionalBySource.has(source.id)
          ? {
              regionalInterface: {
                registerId: register.registerId,
                version: register.version,
                assessedOn: register.assessedOn,
                ...copy(regionalBySource.get(source.id)),
                blockers: copy(blockers),
              },
            }
          : {}),
      };
    },
  );
  return {
    catalogId: catalog.catalogId,
    trustDomain: catalog.trustDomain,
    asOf,
    managedStorageCeilingBytes: catalog.managedStorageCeilingBytes,
    geographyBasis: "discovery_relevance_only",
    scope: {
      sourceIds: sourceIds ? [...sourceIds] : null,
      regionCodes: regionCodes ? [...regionCodes] : null,
    },
    sources,
    limitations: [
      "Available collections are not proof that they were searched.",
      "Documented, selected and emitted date ranges are distinct; zero matches do not establish non-occurrence.",
      "Publisher attribution does not establish member Nation participation, position or jurisdiction.",
    ],
  };
}
