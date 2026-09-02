import type { PolicyRecord } from "../shared/contracts";

export const PROJECTION_PROFILE_SCHEMA_VERSION = "1.0.0" as const;

export type ProjectionAuthorityState = "synthetic_demo" | "candidate";
export type ProjectionVisibility = "public";
export type CommunityRelevanceBasis =
  | "configured_source_scope"
  | "configured_taxonomy_scope"
  | "configured_general_jurisdiction_scope";
export type CommunityRelevanceReviewState =
  "synthetic_reviewed" | "candidate_pending";
export type CommunityRelevanceNonClaim =
  | "not_a_nation_relationship"
  | "not_a_legal_applicability_determination"
  | "not_a_rights_impact_determination"
  | "not_a_jurisdiction_determination"
  | "not_comprehensive_coverage"
  | "not_a_community_position";

export type RequiredCommunityRelevanceNonClaims = readonly [
  "not_a_nation_relationship",
  "not_a_legal_applicability_determination",
  "not_a_rights_impact_determination",
  "not_a_jurisdiction_determination",
  "not_comprehensive_coverage",
  "not_a_community_position",
];

export interface VersionedReference {
  readonly id: string;
  readonly version: string;
}

export interface ProjectionTemporalScope {
  readonly kind: "inclusive_date_range";
  readonly from: string;
  readonly through: string | null;
}

export interface AuthorityQualifiedJurisdictionReference {
  readonly id: string;
  readonly version: string;
  readonly synthetic: true;
  readonly authorityState: ProjectionAuthorityState;
  readonly assertingAuthorityRef: VersionedReference;
  readonly evidenceUrl: string;
}

export interface ProjectionWatchRule extends VersionedReference {
  readonly regionPackRef: VersionedReference;
  readonly recordIds: readonly string[];
  readonly basis: CommunityRelevanceBasis;
  readonly evidenceField:
    | "/source/id"
    | "/taxonomyMemberships"
    | "/jurisdiction/generalJurisdictionOnly";
  readonly evidenceUrl: string;
  readonly reviewState: CommunityRelevanceReviewState;
  readonly temporalScope: ProjectionTemporalScope;
  readonly nonClaims: RequiredCommunityRelevanceNonClaims;
}

export interface RegionPack extends VersionedReference {
  readonly sourceIds: readonly string[];
  readonly taxonomy: {
    readonly version: string;
    readonly taxonomyIds: readonly string[];
  };
  readonly jurisdictionReferences: readonly AuthorityQualifiedJurisdictionReference[];
}

export interface CommunityDeploymentProfile extends VersionedReference {
  readonly authorityState: ProjectionAuthorityState;
  readonly regionPackRef: VersionedReference;
  readonly watchRuleRefs: readonly VersionedReference[];
}

export interface PersonaProjection extends VersionedReference {
  readonly deploymentProfileRef: VersionedReference;
  readonly visibility: ProjectionVisibility;
  readonly outputAdapterRefs: readonly VersionedReference[];
}

export interface ProjectionProfileBundle extends VersionedReference {
  readonly $schema: string;
  readonly schemaVersion: typeof PROJECTION_PROFILE_SCHEMA_VERSION;
  readonly synthetic: true;
  readonly authorityReferences: readonly VersionedReference[];
  readonly outputAdapters: readonly VersionedReference[];
  readonly regionPacks: readonly RegionPack[];
  readonly watchRules: readonly ProjectionWatchRule[];
  readonly deploymentProfiles: readonly CommunityDeploymentProfile[];
  readonly personaProjections: readonly PersonaProjection[];
}

export interface CommunityRelevanceAssertion {
  readonly basis: CommunityRelevanceBasis;
  readonly ruleRef: VersionedReference;
  readonly configurationRef: VersionedReference;
  readonly evidenceReference: {
    readonly kind: "policy_record_field";
    readonly recordId: string;
    readonly field:
      | "/source/id"
      | "/taxonomyMemberships"
      | "/jurisdiction/generalJurisdictionOnly";
    readonly configurationEvidenceUrl: string;
  };
  readonly reviewState: CommunityRelevanceReviewState;
  readonly temporalScope: ProjectionTemporalScope;
  readonly nonClaims: RequiredCommunityRelevanceNonClaims;
}

export interface ProjectedRecordReference {
  readonly recordId: string;
  readonly reasons: readonly CommunityRelevanceAssertion[];
}

export interface DeploymentView extends VersionedReference {
  readonly deploymentProfileRef: VersionedReference;
  readonly personaProjectionRef: VersionedReference;
  readonly outputAdapterRefs: readonly VersionedReference[];
  readonly recordReferences: readonly ProjectedRecordReference[];
}

export interface EngineProjection {
  readonly schemaVersion: typeof PROJECTION_PROFILE_SCHEMA_VERSION;
  readonly profileBundleRef: VersionedReference;
  readonly records: readonly DeepReadonly<PolicyRecord>[];
  readonly views: readonly DeploymentView[];
}

/**
 * Output adapters are pure projections over an already analyzed corpus. They
 * receive no source access and cannot replace or mutate facts in the corpus.
 */
export interface OutputAdapter<TOutput> extends VersionedReference {
  readonly produce: (
    projection: Readonly<EngineProjection>,
    viewId: DeploymentView["id"],
  ) => TOutput;
}

type JsonPrimitive = null | boolean | number | string;

export type DeepReadonly<T> = T extends JsonPrimitive
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;
