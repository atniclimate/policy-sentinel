import type {
  DeepReadonly,
  DateTimePoint,
  DerivedAssertion,
  FactReference,
  SourceFact,
  SourceQualifiedIdentity,
  SupportedEvidence,
  SupportedTemporalAssertion,
  TemporalValue,
} from "../../kernel/assertions/index";

import type {
  S0_AXES,
  S0_AXIS_ORDERS,
  S0_JURISDICTION_HEADERS,
  S0_RELATION_ORDER,
  S0_SPATIAL_HEADERS,
  S0_UNKNOWN_REASON_ORDER,
} from "./constants";

export type S0Axes = typeof S0_AXES;
export type S0AxisOrder = (typeof S0_AXIS_ORDERS)[number];
export type S0Axis = S0Axes[number];

export interface S0Box {
  minimum: readonly [number, number];
  maximum: readonly [number, number];
}

export interface S0NamedAxisBounds {
  minimum: number;
  maximum: number;
}

export interface S0NormalizedBounds {
  synthetic_x: S0NamedAxisBounds;
  synthetic_y: S0NamedAxisBounds;
}

export interface S0CoordinateSpace {
  id: "urn:policy-sentinel:crs:impossible-grid:1.0.0";
  axes: S0Axes;
  axisOrder: S0AxisOrder;
  unit: "impossible_unit";
  representation: "axis_aligned_integer_box_v1";
}

export type ObservationCoverage =
  | "complete_fixture_extent"
  | "partial_fixture_extent"
  | "missing_fixture_geometry"
  | "unknown";

export type ObservationUncertaintyReason =
  | "fixture_limitation"
  | "coverage_limitation"
  | "coordinate_limitation"
  | "temporal_limitation";

export type ObservationUncertainty =
  | { state: "certain" }
  | {
      state: "uncertain";
      reason: ObservationUncertaintyReason;
    };

export interface SpatialObservationInput {
  fixtureSlug: string;
  layerVersion: string;
  axisOrder: S0AxisOrder;
  geometry: S0Box | null;
  resolution: number;
  observedTimeValue: DateTimePoint;
  validTimeValue: TemporalValue;
  coverage: ObservationCoverage;
  uncertainty: ObservationUncertainty;
  retrievedAt: string;
}

export interface SpatialObservationFactManifest {
  fragmentDigestFact: SourceFact;
  observedTimeFact: SourceFact;
  validTimeFact: SourceFact;
}

export interface SpatialObservation {
  contractVersion: "1.0.0";
  experimental: true;
  synthetic: true;
  fixtureClass: "impossible_synthetic_geometry";
  observationId: string;
  observationDigest: string;
  fixtureSlug: string;
  sourceIdentity: SourceQualifiedIdentity;
  layerId: string;
  layerVersion: string;
  featureId: string;
  coordinateSpace: S0CoordinateSpace;
  geometry: S0Box | null;
  geometryDigest: string | null;
  resolution: number;
  observedTime: SupportedTemporalAssertion;
  validTime: SupportedTemporalAssertion;
  coverage: ObservationCoverage;
  uncertainty: ObservationUncertainty;
  attribution: "Policy Sentinel impossible synthetic fixture";
  usageBasis: "Repository-authored impossible synthetic fixture; no external source or reuse grant.";
  factManifest: SpatialObservationFactManifest;
}

export interface SpatialObservationReference {
  observationId: string;
  observationDigest: string;
  geometryDigest: string | null;
}

export type SharedValidTime =
  | {
      state: "overlap";
      value: TemporalValue;
      factReferences: readonly FactReference[];
    }
  | {
      state: "indeterminate";
      reason: "mixed_precision";
      factReferences: readonly FactReference[];
    }
  | {
      state: "disjoint";
      factReferences: readonly FactReference[];
    };

export type SpatialRelationKind = (typeof S0_RELATION_ORDER)[number];
export type DeterminateSpatialRelationKind = Exclude<
  SpatialRelationKind,
  "unknown"
>;
export type SpatialUnknownReason = (typeof S0_UNKNOWN_REASON_ORDER)[number];

export type SpatialRelationUncertainty =
  { state: "certain" } | { state: "uncertain"; reason: SpatialUnknownReason };

export interface SpatialAlgorithm {
  id: "s0-axis-aligned-box-topology";
  version: "1.0.0";
  canonicalizationVersion: "ps-c14n-json-1";
  tolerance: number;
  unit: "impossible_unit";
}

export interface SpatialRelation {
  contractVersion: "1.0.0";
  experimental: true;
  synthetic: true;
  fixtureClass: "impossible_synthetic_geometry";
  relationId: string;
  subject: SpatialObservationReference;
  object: SpatialObservationReference;
  relation: SpatialRelationKind;
  sharedValidTime: SharedValidTime;
  algorithm: SpatialAlgorithm;
  derivedAssertion: DerivedAssertion;
  uncertainty: SpatialRelationUncertainty;
  unknownReason: SpatialUnknownReason | null;
  interpretation: "geometric_relation_only";
}

export interface SpatialRelationOptions {
  tolerance: number;
}

export interface JurisdictionEvidenceInput {
  fixtureSlug: string;
  retrievedAt: string;
}

export interface JurisdictionEvidenceFactManifest {
  titleFact: SourceFact;
  fragmentDigestFact: SourceFact;
}

export interface JurisdictionEvidence {
  contractVersion: "1.0.0";
  experimental: true;
  synthetic: true;
  fixtureClass: "impossible_synthetic_geometry";
  jurisdictionEvidenceId: string;
  fixtureSlug: string;
  sourceIdentity: SourceQualifiedIdentity;
  featureId: string;
  administrativeUnitId: string;
  sourceLabel: "Policy Sentinel impossible synthetic administrative statement";
  statement: string;
  statementDigest: string;
  syntheticLevel: "impossible_administrative_unit";
  evidenceBasis: "explicit_synthetic_source_statement";
  derivation: "source_citation_only_not_spatial";
  reviewState: "validated_synthetic_fixture";
  attribution: "Policy Sentinel impossible synthetic fixture";
  usageBasis: "Repository-authored impossible synthetic fixture; no external source or reuse grant.";
  factManifest: JurisdictionEvidenceFactManifest;
  evidence: SupportedEvidence;
}

export interface SpatialEvidenceInput {
  observations: readonly SpatialObservation[];
  relations: readonly SpatialRelation[];
  jurisdictionEvidence: readonly JurisdictionEvidence[];
}

export type SpatialEvidenceHeaders = typeof S0_SPATIAL_HEADERS;
export type JurisdictionEvidenceHeaders = typeof S0_JURISDICTION_HEADERS;

export interface EvidenceTableRow<
  Cells extends readonly string[] = readonly string[],
> {
  id: string;
  cells: Cells;
}

export interface SpatialEvidenceTableView {
  caption: "Impossible synthetic spatial evidence";
  ariaDescribedBy: "s0-spatial-explanation";
  headers: SpatialEvidenceHeaders;
  rows: readonly EvidenceTableRow<
    readonly [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ]
  >[];
}

export interface JurisdictionEvidenceTableView {
  heading: "Separate administrative/source evidence - not derived from geometry";
  caption: "Separate administrative/source evidence - not derived from geometry";
  ariaDescribedBy: "s0-spatial-explanation";
  headers: JurisdictionEvidenceHeaders;
  rows: readonly EvidenceTableRow<
    readonly [string, string, string, string, string, string, string]
  >[];
}

export interface SpatialEvidenceViewModel {
  heading: "Impossible synthetic spatial evidence";
  explanationId: "s0-spatial-explanation";
  explanation: "Impossible synthetic geometric relation only. It does not establish jurisdiction, Nation association, policy relevance, legal applicability, rights, consent, affiliation, interest, eligibility, or impact.";
  spatialTable: SpatialEvidenceTableView;
  jurisdictionSection: JurisdictionEvidenceTableView | null;
}

export type ImmutableSpatialObservation = DeepReadonly<SpatialObservation>;
export type ImmutableSpatialRelation = DeepReadonly<SpatialRelation>;
export type ImmutableJurisdictionEvidence = DeepReadonly<JurisdictionEvidence>;
export type ImmutableSpatialEvidenceInput = DeepReadonly<SpatialEvidenceInput>;
export type ImmutableSpatialEvidenceViewModel =
  DeepReadonly<SpatialEvidenceViewModel>;
