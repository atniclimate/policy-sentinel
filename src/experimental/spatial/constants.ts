export const S0_CONTRACT_VERSION = "1.0.0" as const;
export const S0_EXPERIMENTAL = true as const;
export const S0_SYNTHETIC = true as const;
export const S0_FIXTURE_CLASS = "impossible_synthetic_geometry" as const;

export const S0_SOURCE_ID = "s0-impossible" as const;
export const S0_ADAPTER_ID = "s0-impossible-fixture" as const;
export const S0_ADAPTER_VERSION = "1.0.0" as const;
export const S0_ATTRIBUTION =
  "Policy Sentinel impossible synthetic fixture" as const;
export const S0_USAGE_BASIS =
  "Repository-authored impossible synthetic fixture; no external source or reuse grant." as const;

export const S0_COORDINATE_SPACE_ID =
  "urn:policy-sentinel:crs:impossible-grid:1.0.0" as const;
export const S0_AXES = ["synthetic_x", "synthetic_y"] as const;
export const S0_AXIS_ORDERS = [
  ["synthetic_x", "synthetic_y"],
  ["synthetic_y", "synthetic_x"],
] as const;
export const S0_UNIT = "impossible_unit" as const;
export const S0_REPRESENTATION = "axis_aligned_integer_box_v1" as const;
export const S0_TOPOLOGY_RULE_ID = "s0-axis-aligned-box-topology" as const;
export const S0_TOPOLOGY_RULE_VERSION = "1.0.0" as const;
export const S0_INTERPRETATION = "geometric_relation_only" as const;

export const S0_SOURCE_LABEL =
  "Policy Sentinel impossible synthetic administrative statement" as const;
export const S0_SYNTHETIC_LEVEL = "impossible_administrative_unit" as const;
export const S0_EVIDENCE_BASIS = "explicit_synthetic_source_statement" as const;
export const S0_JURISDICTION_DERIVATION =
  "source_citation_only_not_spatial" as const;
export const S0_REVIEW_STATE = "validated_synthetic_fixture" as const;

export const S0_EXPLANATION_ID = "s0-spatial-explanation" as const;
export const S0_SPATIAL_HEADING =
  "Impossible synthetic spatial evidence" as const;
export const S0_EXPLANATION =
  "Impossible synthetic geometric relation only. It does not establish jurisdiction, Nation association, policy relevance, legal applicability, rights, consent, affiliation, interest, eligibility, or impact." as const;
export const S0_JURISDICTION_HEADING =
  "Separate administrative/source evidence - not derived from geometry" as const;

export const S0_SPATIAL_HEADERS = [
  "Subject feature",
  "Object feature",
  "Geometric result",
  "Shared valid time",
  "Coordinate space",
  "Axis order",
  "Resolution",
  "Tolerance",
  "Coverage",
  "Uncertainty",
  "Algorithm",
  "Attribution",
] as const;

export const S0_JURISDICTION_HEADERS = [
  "Feature",
  "Administrative unit",
  "Source label",
  "Exact synthetic statement",
  "Evidence basis",
  "Review state",
  "Attribution",
] as const;

export const S0_RELATION_ORDER = [
  "intersects",
  "contains",
  "within",
  "touches",
  "disjoint",
  "unknown",
] as const;

export const S0_UNKNOWN_REASON_ORDER = [
  "missing_geometry",
  "partial_coverage",
  "unknown_coverage",
  "observation_uncertain",
  "resolution_mismatch",
  "valid_time_mixed_precision",
  "valid_time_disjoint",
  "tolerance_ambiguity",
] as const;

export const S0_UNKNOWN_REASON_TEXT = {
  missing_geometry: "Unknown - missing fixture geometry.",
  partial_coverage: "Unknown - partial fixture coverage.",
  unknown_coverage: "Unknown - fixture coverage is unknown.",
  observation_uncertain: "Unknown - an observation is uncertain.",
  resolution_mismatch: "Unknown - observation resolutions differ.",
  valid_time_mixed_precision: "Unknown - valid-time precision differs.",
  valid_time_disjoint: "Unknown - observations have no shared valid time.",
  tolerance_ambiguity:
    "Unknown - permitted whole-box perturbations yield more than one relation.",
} as const;

export const S0_PROTECTED_KEYS = [
  "nationId",
  "nationIds",
  "officialName",
  "authorizedAliases",
  "recognitionBaselineVersion",
  "stateCoverage",
  "nationAssociations",
  "jurisdiction",
  "issuingBodies",
  "officialSubjects",
  "taxonomyMemberships",
  "relevance",
  "landmark",
  "legalEffect",
  "legalApplicability",
  "rights",
  "consent",
  "affiliation",
  "interest",
  "eligibility",
  "impact",
] as const;

export const S0_FIXTURE_SLUG_PATTERN = /^fixture-[0-9]{4}$/;
export const S0_LAYER_VERSION_PATTERN =
  /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
export const S0_SHA256_PATTERN = /^[a-f0-9]{64}$/;
export const S0_OBSERVATION_ID_PATTERN =
  /^s0-impossible:observation:[a-f0-9]{64}$/;
export const S0_RELATION_ID_PATTERN = /^s0-impossible:relation:[a-f0-9]{64}$/;
export const S0_JURISDICTION_EVIDENCE_ID_PATTERN =
  /^s0-impossible:jurisdiction-evidence:[a-f0-9]{64}$/;

export const S0_MIN_COORDINATE = -32;
export const S0_MAX_COORDINATE = 32;
export const S0_MIN_RESOLUTION = 1;
export const S0_MAX_RESOLUTION = 8;
export const S0_MIN_TOLERANCE = 0;
export const S0_MAX_TOLERANCE = 2;

export const S0_MAX_OBSERVATIONS = 64;
export const S0_MAX_RELATIONS = 64;
export const S0_MAX_JURISDICTION_EVIDENCE = 16;

export const S0_MARKERS = {
  contractVersion: S0_CONTRACT_VERSION,
  experimental: S0_EXPERIMENTAL,
  synthetic: S0_SYNTHETIC,
  fixtureClass: S0_FIXTURE_CLASS,
} as const;
