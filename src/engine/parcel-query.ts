/**
 * Parcel-scoped record query (Makah demo groundwork, 2026-09-15).
 *
 * FROZEN INTERFACE. Maps a parcel's jurisdiction layers onto the existing
 * PolicyRecord 1.4 filter fields, unions results across layers, and returns
 * a per-record `whyAssociated` basis naming the exact layer and evidence URL
 * that caused inclusion. It never intersects layers into one determination
 * and never emits an applicability, jurisdiction, rights or land-status
 * statement. Pure: no I/O, no clock, no mutation of inputs.
 */
import type { PolicyRecord } from "../shared/contracts";
import type { WhyAssociated } from "./citation-export-contracts";
import type { JurisdictionLayer, LandParcel } from "./land-parcel-contracts";

export const PARCEL_QUERY_NONCLAIMS = Object.freeze([
  "not_an_applicability_determination",
  "not_a_jurisdiction_determination",
  "not_a_nation_association",
  "not_a_land_status_determination",
  "union_of_layers_never_a_single_winning_layer",
] as const);

/**
 * Optional narrowing applied identically to every layer's candidate set.
 * Empty arrays mean no narrowing on that axis.
 */
export interface ParcelQueryOptions {
  /** Keep only records with a taxonomyMemberships.categoryId in this set. */
  readonly taxonomyCategoryIds?: readonly string[];
  /** Keep only records with an officialSubjects.label in this set (exact). */
  readonly officialSubjectLabels?: readonly string[];
}

export interface ParcelQueryRecordMatch {
  readonly internalId: string;
  /** Every layer that matched this record, ascending layerIndex; never empty. */
  readonly whyAssociated: readonly WhyAssociated[];
}

export interface ParcelQueryResult {
  readonly parcelId: string;
  readonly layerCount: number;
  /** Layer indexes that matched zero records, ascending. */
  readonly unmatchedLayerIndexes: readonly number[];
  /** Ascending by internalId (plain `<` string comparison). */
  readonly records: readonly ParcelQueryRecordMatch[];
  readonly nonClaims: typeof PARCEL_QUERY_NONCLAIMS;
}

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

function matchesOptions(
  record: PolicyRecord,
  options: ParcelQueryOptions | undefined,
): boolean {
  if (
    options?.taxonomyCategoryIds !== undefined &&
    options.taxonomyCategoryIds.length > 0
  ) {
    const ids = options.taxonomyCategoryIds;
    if (
      !record.taxonomyMemberships.some((membership) =>
        ids.includes(membership.categoryId),
      )
    ) {
      return false;
    }
  }
  if (
    options?.officialSubjectLabels !== undefined &&
    options.officialSubjectLabels.length > 0
  ) {
    const labels = options.officialSubjectLabels;
    if (
      !record.officialSubjects.some((subject) => labels.includes(subject.label))
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Layer-to-record match rule (deterministic, exact-evidence only):
 *
 * - level `federal`: `record.jurisdiction.level === "federal"`.
 * - level `state`: `record.jurisdiction.level === "state"` and
 *   `record.jurisdiction.name === layer.authorityName` (exact).
 * - level `county`: `record.jurisdiction.level === "county"` and
 *   `record.jurisdiction.name === layer.authorityName` (exact).
 * - level `tribal`: at least one `record.nationAssociations` entry with
 *   `officialNationName === layer.authorityName` (exact) and
 *   `validationState === "validated"`. A tribal layer never matches through
 *   `jurisdiction.name`, `issuingBodies`, keywords, or geography, so a
 *   county-only parcel can never produce a Nation-based match.
 *
 * ParcelQueryOptions narrow every layer's candidates with AND semantics.
 * Results are the UNION over layers; a record matched by several layers
 * appears once with every matching layer in `whyAssociated`.
 *
 * The parcel must already be a value returned by parseLandParcel; records
 * must already be validated PolicyRecord 1.4 values. The function reads
 * only the fields named above, never mutates or freezes its inputs, and
 * returns a detached, recursively frozen result.
 */
export function resolveParcelQuery(
  parcel: LandParcel,
  records: readonly PolicyRecord[],
  options?: ParcelQueryOptions,
): ParcelQueryResult {
  const layers = parcel.jurisdictionLayers;
  const whyAssociatedByRecord = new Map<string, WhyAssociated[]>();
  const unmatchedLayerIndexes: number[] = [];
  layers.forEach((layer, layerIndex) => {
    let matchedAny = false;
    for (const record of records) {
      if (!layerMatchesRecord(layer, record)) continue;
      if (!matchesOptions(record, options)) continue;
      matchedAny = true;
      const why: WhyAssociated = {
        basis: "jurisdiction_layer_match",
        layerIndex,
        level: layer.level,
        authorityName: layer.authorityName,
        nationId: layer.nationId,
        evidenceUrl: layer.evidenceUrl,
      };
      const existing = whyAssociatedByRecord.get(record.internalId);
      if (existing) existing.push(why);
      else whyAssociatedByRecord.set(record.internalId, [why]);
    }
    if (!matchedAny) unmatchedLayerIndexes.push(layerIndex);
  });
  const recordMatches: ParcelQueryRecordMatch[] = [
    ...whyAssociatedByRecord.entries(),
  ]
    .map(([internalId, whyAssociated]) => ({ internalId, whyAssociated }))
    .sort((left, right) =>
      left.internalId < right.internalId
        ? -1
        : left.internalId > right.internalId
          ? 1
          : 0,
    );
  const result: ParcelQueryResult = {
    parcelId: parcel.parcelId,
    layerCount: layers.length,
    unmatchedLayerIndexes,
    records: recordMatches,
    nonClaims: PARCEL_QUERY_NONCLAIMS,
  };
  return detached(result);
}

/** Convenience: the same match rule for one layer, exposed for tests. */
export function layerMatchesRecord(
  layer: JurisdictionLayer,
  record: PolicyRecord,
): boolean {
  switch (layer.level) {
    case "federal":
      return record.jurisdiction.level === "federal";
    case "state":
      return (
        record.jurisdiction.level === "state" &&
        record.jurisdiction.name === layer.authorityName
      );
    case "county":
      return (
        record.jurisdiction.level === "county" &&
        record.jurisdiction.name === layer.authorityName
      );
    case "tribal":
      // Identity-bound: the layer's nationId must equal a validated
      // association's nationId. Names, jurisdiction fields, issuing bodies,
      // keywords and geography never match a tribal layer.
      return (
        layer.nationId !== null &&
        record.nationAssociations.some(
          (association) =>
            association.nationId === layer.nationId &&
            association.validationState === "validated",
        )
      );
    default:
      return false;
  }
}

/** Canonical JSON as for serializeLandBoundary. */
export function serializeParcelQueryResult(result: ParcelQueryResult): string {
  return canonical(result);
}
