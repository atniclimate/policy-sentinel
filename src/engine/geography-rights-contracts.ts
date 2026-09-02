import type {
  RequiredCommunityRelevanceNonClaims,
  VersionedReference,
} from "./contracts";

export const GEOGRAPHY_RIGHTS_SCHEMA_VERSION = "1.0.0" as const;
export const GEOGRAPHY_RIGHTS_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/geography-rights.schema.v1.json" as const;

export type GeographyRightsVisibility =
  "public" | "internal" | "restricted" | "privileged";
export type GeographyRightsSensitivity = GeographyRightsVisibility;

export type GeographyRightsAuthorityRole =
  | "relation_asserting"
  | "frame_source"
  | "frame_configuration"
  | "evidence_source"
  | "geometry_custody"
  | "geometry_derivation"
  | "community_configuration_review"
  | "source_verification_review"
  | "analyst_review"
  | "counsel_review"
  | "geometry_review";

export type GeographyRightsAuthorityClass =
  | "synthetic_community"
  | "synthetic_source"
  | "synthetic_custodian"
  | "synthetic_deriver"
  | "synthetic_analyst"
  | "synthetic_counsel";

export interface KnownTemporalBound {
  readonly state: "known";
  readonly date: string;
}

export interface OpenTemporalBound {
  readonly state: "open";
}

export interface UnknownTemporalBound {
  readonly state: "unknown";
}

export type GeographyRightsTemporalBound =
  KnownTemporalBound | OpenTemporalBound | UnknownTemporalBound;

export interface GeographyRightsTemporalScope {
  readonly kind: "inclusive_date_range";
  readonly from: GeographyRightsTemporalBound;
  readonly through: GeographyRightsTemporalBound;
}

export interface GeographyRightsAuthorityBinding extends VersionedReference {
  readonly synthetic: true;
  readonly deploymentProfileRef: VersionedReference;
  readonly authorityIdentityRef: VersionedReference;
  readonly profileAuthorityScopeRef: VersionedReference;
  readonly role: GeographyRightsAuthorityRole;
  readonly authorityClass: GeographyRightsAuthorityClass;
}

export type GeographyScopeKind =
  | "administrative_scope"
  | "ecological_scope"
  | "agreement_scope"
  | "project_scope"
  | "other_opaque_scope";

export interface GeographyScopeReference extends VersionedReference {
  readonly synthetic: true;
  readonly deploymentProfileRef: VersionedReference;
  readonly kind: GeographyScopeKind;
  readonly visibility: GeographyRightsVisibility;
  readonly sensitivity: GeographyRightsSensitivity;
}

export interface GeographyRightsEvidenceReference extends VersionedReference {
  readonly synthetic: true;
  readonly deploymentProfileRef: VersionedReference;
  readonly sourceId: string;
  readonly sourceAuthorityBindingRef: VersionedReference;
  readonly citation: {
    readonly url: string;
    readonly locator: string;
  };
  readonly observedTemporalScope: GeographyRightsTemporalScope;
  readonly visibility: GeographyRightsVisibility;
  readonly sensitivity: GeographyRightsSensitivity;
}

export type GeographyRightsReviewKind =
  | "community_configured"
  | "source_verified"
  | "analyst_reviewed"
  | "counsel_reviewed"
  | "geometry_reviewed";
export type GeographyRightsReviewState = "accepted" | "pending" | "rejected";

export interface GeographyRightsReviewAttestation extends VersionedReference {
  readonly synthetic: true;
  readonly deploymentProfileRef: VersionedReference;
  readonly kind: GeographyRightsReviewKind;
  readonly state: GeographyRightsReviewState;
  readonly reviewerAuthorityBindingRef: VersionedReference;
  readonly evidenceRefs: readonly VersionedReference[];
  readonly visibility: GeographyRightsVisibility;
  readonly sensitivity: GeographyRightsSensitivity;
}

export interface GeographyRightsGeometryReference extends VersionedReference {
  readonly synthetic: true;
  readonly deploymentProfileRef: VersionedReference;
  readonly representation: "opaque_reference";
  readonly opaqueReference: string;
  readonly custodyAuthorityBindingRef: VersionedReference;
  readonly evidenceRefs: readonly VersionedReference[];
  readonly reviewAttestationRef: VersionedReference;
  readonly derivation:
    | {
        readonly kind: "source_supplied";
        readonly sourceGeometryRef: null;
        readonly deriverAuthorityBindingRef: null;
      }
    | {
        readonly kind: "reviewed_derivative";
        readonly sourceGeometryRef: VersionedReference;
        readonly deriverAuthorityBindingRef: VersionedReference;
      };
  readonly visibility: GeographyRightsVisibility;
  readonly sensitivity: GeographyRightsSensitivity;
}

export type GeographicRelationKind =
  | "reservation_boundary"
  | "trust_land"
  | "reservation_fee_land"
  | "allotted_land"
  | "ceded_territory"
  | "usual_and_accustomed_area"
  | "ancestral_territory"
  | "service_area"
  | "co_management_area"
  | "adjudicated_or_reserved_rights_geography"
  | "watershed"
  | "species_range"
  | "project_footprint"
  | "intergovernmental_service_or_agreement_area";

export type GeographicRelationAllowedInference =
  "asserted_relation_reference" | "configured_monitoring_scope";
export type RightsFrameAllowedInference =
  "configured_frame_reference" | "source_citation_reference";

export type GeographyRightsForbiddenInference =
  | "not_identity_evidence"
  | "not_ownership_or_land_status_evidence"
  | "not_jurisdiction_evidence"
  | "not_legal_applicability_evidence"
  | "not_rights_impact_violation_remedy_or_outcome_evidence"
  | "not_consultation_evidence"
  | "not_affiliation_membership_consent_or_endorsement_evidence"
  | "not_program_or_grant_eligibility_evidence"
  | "not_urgency_priority_or_recommended_action"
  | "not_community_position_evidence";

export type RequiredGeographyRightsForbiddenInferences = readonly [
  "not_identity_evidence",
  "not_ownership_or_land_status_evidence",
  "not_jurisdiction_evidence",
  "not_legal_applicability_evidence",
  "not_rights_impact_violation_remedy_or_outcome_evidence",
  "not_consultation_evidence",
  "not_affiliation_membership_consent_or_endorsement_evidence",
  "not_program_or_grant_eligibility_evidence",
  "not_urgency_priority_or_recommended_action",
  "not_community_position_evidence",
];

export interface GeographicRelation extends VersionedReference {
  readonly synthetic: true;
  readonly deploymentProfileRef: VersionedReference;
  readonly regionPackRef: VersionedReference;
  readonly subjectRef: {
    readonly kind: "deployment_profile";
    readonly ref: VersionedReference;
  };
  readonly objectRef: {
    readonly kind: "governed_scope";
    readonly ref: VersionedReference;
  };
  readonly relationKind: GeographicRelationKind;
  readonly vocabularyVersion: string;
  readonly assertingAuthorityBindingRef: VersionedReference;
  readonly evidenceRefs: readonly VersionedReference[];
  readonly observedTemporalScope: GeographyRightsTemporalScope;
  readonly effectiveTemporalScope: GeographyRightsTemporalScope;
  readonly geometryRef: VersionedReference | null;
  readonly reviewAttestationRefs: readonly VersionedReference[];
  readonly visibility: GeographyRightsVisibility;
  readonly sensitivity: GeographyRightsSensitivity;
  readonly allowedInferences: readonly GeographicRelationAllowedInference[];
  readonly forbiddenInferences: RequiredGeographyRightsForbiddenInferences;
  readonly nonClaims: RequiredCommunityRelevanceNonClaims;
  readonly supersedesRef: VersionedReference | null;
}

export type RightsFrameType =
  | "treaty"
  | "tribal_law"
  | "code"
  | "plan"
  | "resolution"
  | "compact"
  | "statute"
  | "adjudication"
  | "litigation_record"
  | "agreement"
  | "other_approved_authority";
export type RightsFrameApprovedUse =
  "monitoring_context" | "source_reference" | "human_review_context";

export interface RightsFrame extends VersionedReference {
  readonly synthetic: true;
  readonly deploymentProfileRef: VersionedReference;
  readonly regionPackRef: VersionedReference;
  readonly frameType: RightsFrameType;
  readonly vocabularyVersion: string;
  readonly sourceAuthorityBindingRef: VersionedReference;
  readonly configurationAuthorityBindingRef: VersionedReference;
  readonly evidenceRefs: readonly VersionedReference[];
  readonly reviewAttestationRefs: readonly VersionedReference[];
  readonly observedTemporalScope: GeographyRightsTemporalScope;
  readonly effectiveTemporalScope: GeographyRightsTemporalScope;
  readonly visibility: GeographyRightsVisibility;
  readonly sensitivity: GeographyRightsSensitivity;
  readonly approvedUses: readonly RightsFrameApprovedUse[];
  readonly approvedAudiences: readonly GeographyRightsVisibility[];
  readonly allowedInferences: readonly RightsFrameAllowedInference[];
  readonly forbiddenInferences: RequiredGeographyRightsForbiddenInferences;
  readonly nonClaims: RequiredCommunityRelevanceNonClaims;
  readonly supersedesRef: VersionedReference | null;
}

export interface GeographyRightsPersonaGrant extends VersionedReference {
  readonly personaProjectionRef: VersionedReference;
  readonly outputAdapterRefs: readonly VersionedReference[];
  readonly approvedUses: readonly RightsFrameApprovedUse[];
  readonly visibilityClearance: GeographyRightsVisibility;
  readonly sensitivityClearance: GeographyRightsSensitivity;
  readonly geographicRelationRefs: readonly VersionedReference[];
  readonly rightsFrameRefs: readonly VersionedReference[];
}

export interface GeographyRightsDeploymentBinding extends VersionedReference {
  readonly deploymentProfileRef: VersionedReference;
  readonly regionPackRef: VersionedReference;
  readonly geographicRelationRefs: readonly VersionedReference[];
  readonly rightsFrameRefs: readonly VersionedReference[];
  readonly personaGrants: readonly GeographyRightsPersonaGrant[];
}

export interface GeographyRightsBundle extends VersionedReference {
  readonly $schema: typeof GEOGRAPHY_RIGHTS_SCHEMA_ID;
  readonly schemaVersion: typeof GEOGRAPHY_RIGHTS_SCHEMA_VERSION;
  readonly synthetic: true;
  readonly profileBundleRef: VersionedReference;
  readonly authorityBindings: readonly GeographyRightsAuthorityBinding[];
  readonly scopeReferences: readonly GeographyScopeReference[];
  readonly evidenceReferences: readonly GeographyRightsEvidenceReference[];
  readonly reviewAttestations: readonly GeographyRightsReviewAttestation[];
  readonly geometryReferences: readonly GeographyRightsGeometryReference[];
  readonly geographicRelations: readonly GeographicRelation[];
  readonly rightsFrames: readonly RightsFrame[];
  readonly deploymentBindings: readonly GeographyRightsDeploymentBinding[];
}

export interface GeographyRightsProjectionRequest {
  readonly deploymentProfileRef: VersionedReference;
  readonly personaProjectionRef: VersionedReference;
  readonly outputAdapterRef: VersionedReference;
  readonly requestedVisibility: GeographyRightsVisibility;
  readonly requestedUse: RightsFrameApprovedUse;
}

export interface GeographyRightsProjectionContext {
  readonly deploymentProfileRef: VersionedReference;
  readonly personaProjectionRef: VersionedReference;
  readonly outputAdapterRef: VersionedReference;
  readonly requestedVisibility: GeographyRightsVisibility;
  readonly requestedUse: RightsFrameApprovedUse;
  readonly disclosureState: "authorized_subset_not_comprehensive";
  readonly geographicRelationRefs: readonly VersionedReference[];
  readonly rightsFrameRefs: readonly VersionedReference[];
  readonly nonClaims: RequiredCommunityRelevanceNonClaims;
}

export interface GeographyRightsProjection {
  readonly schemaVersion: typeof GEOGRAPHY_RIGHTS_SCHEMA_VERSION;
  readonly profileBundleRef: VersionedReference;
  readonly geographyRightsBundleRef: VersionedReference;
  readonly context: GeographyRightsProjectionContext;
}
