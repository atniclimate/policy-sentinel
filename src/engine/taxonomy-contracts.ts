import type { VersionedReference } from "./contracts";

export const TAXONOMY_BUNDLE_SCHEMA_VERSION = "1.0.0" as const;
export const TAXONOMY_BUNDLE_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/taxonomy-bundle.schema.v1.json" as const;

export type TaxonomyVisibility = "public";

export type TaxonomyAuthorityRole =
  | "vocabulary_owner"
  | "crosswalk_authorizer"
  | "source_classifier"
  | "community_configurator"
  | "analyst_assigner"
  | "evidence_provider"
  | "reviewer";

export type TaxonomyAuthorityClass =
  | "synthetic_project"
  | "synthetic_source"
  | "synthetic_regional_organization"
  | "synthetic_national_organization"
  | "synthetic_community"
  | "synthetic_analyst";

export type TaxonomyAuthorityScope =
  | {
      readonly kind: "bundle";
    }
  | {
      readonly kind: "source_region";
      readonly sourceId: string;
      readonly regionPackRef: VersionedReference;
    }
  | {
      readonly kind: "region";
      readonly regionPackRef: VersionedReference;
    }
  | {
      readonly kind: "deployment_region";
      readonly deploymentProfileRef: VersionedReference;
      readonly regionPackRef: VersionedReference;
    };

export interface TaxonomyAuthorityBinding extends VersionedReference {
  readonly synthetic: true;
  readonly authorityIdentityRef: VersionedReference;
  readonly role: TaxonomyAuthorityRole;
  readonly authorityClass: TaxonomyAuthorityClass;
  readonly scope: TaxonomyAuthorityScope;
}

export type TaxonomyNamespaceRole =
  | "project_general"
  | "source_native"
  | "regional_organization"
  | "national_organization"
  | "community_deployment";

export interface TaxonomyNamespace extends VersionedReference {
  readonly synthetic: true;
  readonly role: TaxonomyNamespaceRole;
  readonly officialSubjectScheme: string | null;
  readonly ownerAuthorityBindingRef: VersionedReference;
  readonly scope: TaxonomyAuthorityScope;
  readonly status: "active" | "retired";
  readonly vocabularyVersion: string;
  readonly retainedTaxonomyVersion: "1.0.0" | null;
}

export interface TaxonomyConceptReference {
  readonly namespaceRef: VersionedReference;
  readonly conceptRef: VersionedReference;
}

export interface RetainedTaxonomyReference {
  readonly taxonomyVersion: "1.0.0";
  readonly categoryId: string;
  readonly subcategoryId: string | null;
}

interface TaxonomyConceptBase extends VersionedReference {
  readonly synthetic: true;
  readonly namespaceRef: VersionedReference;
  readonly lifecycleState: "active" | "retired" | "superseded";
  readonly parentRef: TaxonomyConceptReference | null;
  readonly supersedesRef: TaxonomyConceptReference | null;
}

export interface RetainedGeneralTaxonomyConcept extends TaxonomyConceptBase {
  readonly kind: "retained_general_reference";
  readonly retainedTaxonomyRef: RetainedTaxonomyReference;
}

export interface AuthorityNativeTaxonomyConcept extends TaxonomyConceptBase {
  readonly kind: "authority_native";
  readonly code: string;
  readonly preferredLabel: string;
  readonly alternateLabels: readonly string[];
  readonly description: string;
}

export type TaxonomyConcept =
  RetainedGeneralTaxonomyConcept | AuthorityNativeTaxonomyConcept;

export type TaxonomyEvidenceKind =
  "source_documentation" | "authority_configuration" | "analyst_review";

export type TaxonomyEvidenceAvailability =
  "observed" | "not_observed" | "unknown" | "unavailable" | "outside_coverage";

export interface TaxonomyEvidenceReference extends VersionedReference {
  readonly synthetic: true;
  readonly suppliedByAuthorityBindingRef: VersionedReference;
  readonly kind: TaxonomyEvidenceKind;
  readonly citation: {
    readonly url: string;
    readonly locator: string;
  };
  readonly observedAt: string;
  readonly availability: TaxonomyEvidenceAvailability;
  readonly visibility: TaxonomyVisibility;
}

export type TaxonomyReviewKind =
  "source_verified" | "authority_configured" | "analyst_reviewed";

export type TaxonomyReviewState =
  "accepted" | "pending" | "disputed" | "rejected" | "withdrawn";

export interface TaxonomyReviewSubjectReference {
  readonly kind: "crosswalk" | "assignment";
  readonly ref: VersionedReference;
}

export interface TaxonomyReviewAttestation extends VersionedReference {
  readonly synthetic: true;
  readonly reviewerAuthorityBindingRef: VersionedReference;
  readonly subject: TaxonomyReviewSubjectReference;
  readonly evidenceRefs: readonly VersionedReference[];
  readonly reviewedAt: string;
  readonly kind: TaxonomyReviewKind;
  readonly state: TaxonomyReviewState;
  readonly visibility: TaxonomyVisibility;
}

export type TaxonomyNonClaim =
  | "not_identity_evidence"
  | "not_recognition_evidence"
  | "not_organization_membership_evidence"
  | "not_source_record_association_evidence"
  | "not_a_why_shown_basis"
  | "not_semantic_equivalence"
  | "not_endpoint_authority_endorsement"
  | "not_legal_effect_evidence"
  | "not_consultation_evidence"
  | "not_affiliation_consent_or_endorsement_evidence"
  | "not_program_or_grant_eligibility_evidence"
  | "not_urgency_priority_or_recommended_action"
  | "not_a_nation_position";

export type RequiredTaxonomyNonClaims = readonly [
  "not_identity_evidence",
  "not_recognition_evidence",
  "not_organization_membership_evidence",
  "not_source_record_association_evidence",
  "not_a_why_shown_basis",
  "not_semantic_equivalence",
  "not_endpoint_authority_endorsement",
  "not_legal_effect_evidence",
  "not_consultation_evidence",
  "not_affiliation_consent_or_endorsement_evidence",
  "not_program_or_grant_eligibility_evidence",
  "not_urgency_priority_or_recommended_action",
  "not_a_nation_position",
];

export type TaxonomyCrosswalkLifecycleState =
  | "active"
  | "pending"
  | "disputed"
  | "rejected"
  | "withdrawn"
  | "superseded"
  | "expired";

export interface TaxonomyCrosswalk extends VersionedReference {
  readonly synthetic: true;
  readonly kind: "monitoring_crosswalk";
  readonly sourceConceptRef: TaxonomyConceptReference;
  readonly targetConceptRefs: readonly TaxonomyConceptReference[];
  readonly authorizerAuthorityBindingRef: VersionedReference;
  readonly evidenceRefs: readonly VersionedReference[];
  readonly reviewAttestationRefs: readonly VersionedReference[];
  readonly scope: TaxonomyAuthorityScope;
  readonly observedAt: string;
  readonly effectivePeriod: {
    readonly from: string;
    readonly through: string | null;
  };
  readonly lifecycleState: TaxonomyCrosswalkLifecycleState;
  readonly supersedesRef: VersionedReference | null;
  readonly visibility: TaxonomyVisibility;
  readonly nonClaims: RequiredTaxonomyNonClaims;
}

export type TaxonomyAssignmentKind =
  | "source_provided"
  | "authority_configured"
  | "analyst_reviewed"
  | "unmapped"
  | "unclassified"
  | "not_assessed";

export type TaxonomyAssignmentState =
  | "accepted"
  | "pending"
  | "disputed"
  | "rejected"
  | "withdrawn"
  | "superseded"
  | "expired";

export interface SourceProvidedTaxonomyLabel {
  readonly sourceId: string;
  readonly scheme: string;
  readonly label: string;
}

export interface TaxonomyAssignment extends VersionedReference {
  readonly synthetic: true;
  readonly recordId: string;
  readonly deploymentProfileRef: VersionedReference;
  readonly kind: TaxonomyAssignmentKind;
  readonly conceptRef: TaxonomyConceptReference | null;
  readonly targetNamespaceRef: VersionedReference;
  readonly sourceProvidedLabel: SourceProvidedTaxonomyLabel | null;
  readonly authorityBindingRef: VersionedReference;
  readonly evidenceRefs: readonly VersionedReference[];
  readonly reviewAttestationRefs: readonly VersionedReference[];
  readonly observedAt: string;
  readonly state: TaxonomyAssignmentState;
  readonly visibility: TaxonomyVisibility;
  readonly nonClaims: RequiredTaxonomyNonClaims;
}

export interface TaxonomyPersonaGrant extends VersionedReference {
  readonly personaProjectionRef: VersionedReference;
  readonly outputAdapterRefs: readonly VersionedReference[];
  readonly namespaceRefs: readonly VersionedReference[];
  readonly crosswalkRefs: readonly VersionedReference[];
  readonly assignmentRefs: readonly VersionedReference[];
}

export interface TaxonomyDeploymentBinding extends VersionedReference {
  readonly deploymentProfileRef: VersionedReference;
  readonly regionPackRef: VersionedReference;
  readonly namespaceRefs: readonly VersionedReference[];
  readonly crosswalkRefs: readonly VersionedReference[];
  readonly assignmentRefs: readonly VersionedReference[];
  readonly personaGrants: readonly TaxonomyPersonaGrant[];
}

export interface TaxonomyBundle extends VersionedReference {
  readonly $schema: typeof TAXONOMY_BUNDLE_SCHEMA_ID;
  readonly schemaVersion: typeof TAXONOMY_BUNDLE_SCHEMA_VERSION;
  readonly synthetic: true;
  readonly profileBundleRef: VersionedReference;
  readonly authorityBindings: readonly TaxonomyAuthorityBinding[];
  readonly namespaces: readonly TaxonomyNamespace[];
  readonly concepts: readonly TaxonomyConcept[];
  readonly evidenceReferences: readonly TaxonomyEvidenceReference[];
  readonly reviewAttestations: readonly TaxonomyReviewAttestation[];
  readonly crosswalks: readonly TaxonomyCrosswalk[];
  readonly assignments: readonly TaxonomyAssignment[];
  readonly deploymentBindings: readonly TaxonomyDeploymentBinding[];
}

export interface TaxonomyProjectionRequest {
  readonly deploymentProfileRef: VersionedReference;
  readonly personaProjectionRef: VersionedReference;
  readonly outputAdapterRef: VersionedReference;
  readonly requestedVisibility: TaxonomyVisibility;
  readonly asOf: string;
}

export type TaxonomyResolutionState =
  "mapped" | "unmapped" | "not_assessed" | "unclassified";

export interface TaxonomyClassificationReference {
  readonly recordId: string;
  readonly assignmentRef: VersionedReference;
  readonly assignmentKind: TaxonomyAssignmentKind;
  readonly resolutionState: TaxonomyResolutionState;
  readonly sourceConceptRef: TaxonomyConceptReference | null;
  readonly targetNamespaceRef: VersionedReference;
  readonly targetConceptRef: TaxonomyConceptReference | null;
  readonly crosswalkRef: VersionedReference | null;
  readonly authorityBindingRefs: readonly VersionedReference[];
  readonly evidenceRefs: readonly VersionedReference[];
  readonly reviewAttestationRefs: readonly VersionedReference[];
  readonly nonClaims: RequiredTaxonomyNonClaims;
}

export interface TaxonomyProjectionContext {
  readonly deploymentProfileRef: VersionedReference;
  readonly personaProjectionRef: VersionedReference;
  readonly outputAdapterRef: VersionedReference;
  readonly requestedVisibility: TaxonomyVisibility;
  readonly asOf: string;
  readonly disclosureState: "authorized_subset_not_comprehensive";
}

export interface TaxonomyProjection {
  readonly schemaVersion: typeof TAXONOMY_BUNDLE_SCHEMA_VERSION;
  readonly profileBundleRef: VersionedReference;
  readonly taxonomyBundleRef: VersionedReference;
  readonly context: TaxonomyProjectionContext;
  readonly classifications: readonly TaxonomyClassificationReference[];
}
