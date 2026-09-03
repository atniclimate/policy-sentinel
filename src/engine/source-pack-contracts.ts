import type { VersionedReference } from "./contracts";

export const SOURCE_PACK_BUNDLE_SCHEMA_VERSION = "1.0.0" as const;
export const SOURCE_PACK_BUNDLE_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/source-pack-bundle.schema.v1.json" as const;

export type SourcePackCatalogKind =
  | "source_context"
  | "jurisdiction_context"
  | "access_context"
  | "authority_binding"
  | "evidence_receipt"
  | "contract_receipt"
  | "coverage_declaration"
  | "review_attestation"
  | "admission_receipt"
  | "availability_observation"
  | "health_observation"
  | "source_binding"
  | "deployment_binding";

export interface SourcePackReference<
  Kind extends SourcePackCatalogKind = SourcePackCatalogKind,
> extends VersionedReference {
  readonly kind: Kind;
}

export interface SourcePackCatalogMember<
  Kind extends SourcePackCatalogKind,
> extends VersionedReference {
  readonly kind: Kind;
  readonly synthetic: true;
}

export interface SourcePackSourceIdentity {
  readonly sourceId: string;
  readonly sourceRegistryVersion: string;
}

export type SourcePackSourceContextRole =
  | "federal_context"
  | "state_context"
  | "regional_intergovernmental_context"
  | "other_opaque_context";

export interface SourcePackSourceContext extends SourcePackCatalogMember<"source_context"> {
  readonly role: SourcePackSourceContextRole;
}

export interface SourcePackJurisdictionContext extends SourcePackCatalogMember<"jurisdiction_context"> {
  readonly contextKind: "opaque_monitoring_context";
  readonly configuredJurisdictionRef: VersionedReference;
  readonly publisherJurisdictionEquivalence: "not_asserted";
}

export type SourcePackDisclosure = "public" | "internal" | "restricted";

export interface SourcePackAccessContext extends SourcePackCatalogMember<"access_context"> {
  readonly deploymentProfileRef: VersionedReference;
  readonly personaProjectionRef: VersionedReference;
  readonly outputAdapterRef: VersionedReference;
  readonly disclosureCeiling: SourcePackDisclosure;
}

export interface SourcePackValidityInterval {
  readonly validFrom: string;
  readonly validThrough: string | null;
}

export interface SourcePackAuthorityBinding
  extends
    SourcePackCatalogMember<"authority_binding">,
    SourcePackValidityInterval {
  readonly deploymentProfileRef: VersionedReference;
  readonly authorityIdentityRef: VersionedReference;
  readonly configuredJurisdictionRef: VersionedReference;
  readonly role: "synthetic_test_configuration";
  readonly evidenceRefs: readonly SourcePackReference<"evidence_receipt">[];
}

export type SourcePackEvidenceKind =
  | "synthetic_fixture_identity"
  | "synthetic_contract_structure"
  | "synthetic_coverage_declaration"
  | "synthetic_configuration_authority";

export type SourcePackEvidenceSubject =
  | {
      readonly kind: "contract_receipt";
      readonly ref: SourcePackReference<"contract_receipt">;
    }
  | {
      readonly kind: "coverage_declaration";
      readonly ref: SourcePackReference<"coverage_declaration">;
    }
  | {
      readonly kind: "authority_binding";
      readonly ref: SourcePackReference<"authority_binding">;
    };

export interface SourcePackEvidenceReceipt
  extends
    SourcePackCatalogMember<"evidence_receipt">,
    SourcePackValidityInterval {
  readonly source: SourcePackSourceIdentity;
  readonly evidenceClass: "repository_authored_synthetic_test";
  readonly evidenceKind: SourcePackEvidenceKind;
  readonly subject: SourcePackEvidenceSubject;
  readonly fixtureFingerprint: string;
}

export interface SourcePackContractReceipt
  extends
    SourcePackCatalogMember<"contract_receipt">,
    SourcePackValidityInterval {
  readonly source: SourcePackSourceIdentity;
  readonly adapterRef: VersionedReference;
  readonly fixtureFingerprint: string;
  readonly providerLayer: "synthetic_fixture_reference";
  readonly internalLayer: "closed_normalized_reference";
  readonly publicLayer: "reference_only_no_payload";
  readonly qualification: "synthetic_test_qualified";
  readonly evidenceRefs: readonly SourcePackReference<"evidence_receipt">[];
}

export type SourcePackCoverageState =
  | "covered"
  | "partial"
  | "outside_coverage"
  | "unknown_coverage"
  | "not_assessed";

export interface SourcePackCoverageSlotState {
  readonly slotRef: string;
  readonly state: SourcePackCoverageState;
}

export interface SourcePackCoverageDeclaration extends SourcePackCatalogMember<"coverage_declaration"> {
  readonly source: SourcePackSourceIdentity;
  readonly sourceContextRef: SourcePackReference<"source_context">;
  readonly jurisdictionContextRef: SourcePackReference<"jurisdiction_context">;
  readonly evidenceRefs: readonly SourcePackReference<"evidence_receipt">[];
  readonly slotStates: readonly SourcePackCoverageSlotState[];
}

export type SourcePackReviewState =
  | "synthetic_test_accepted"
  | "synthetic_test_pending"
  | "synthetic_test_rejected";

export interface SourcePackReviewAttestation
  extends
    SourcePackCatalogMember<"review_attestation">,
    SourcePackValidityInterval {
  readonly subject:
    | {
        readonly kind: "contract_receipt";
        readonly ref: SourcePackReference<"contract_receipt">;
      }
    | {
        readonly kind: "coverage_declaration";
        readonly ref: SourcePackReference<"coverage_declaration">;
      };
  readonly authorityBindingRef: SourcePackReference<"authority_binding">;
  readonly evidenceRefs: readonly SourcePackReference<"evidence_receipt">[];
  readonly state: SourcePackReviewState;
  readonly reviewedAt: string;
}

export type SourcePackOperation =
  | "acquisition"
  | "retention"
  | "transformation"
  | "internal_analysis"
  | "redistribution"
  | "public_projection";

export type SourcePackAdmissionState =
  | "synthetic_test_admitted"
  | "pack_binding_disabled"
  | "not_admitted"
  | "expired"
  | "revoked";

export interface SourcePackAdmissionReceipt
  extends
    SourcePackCatalogMember<"admission_receipt">,
    SourcePackValidityInterval {
  readonly source: SourcePackSourceIdentity;
  readonly contractReceiptRef: SourcePackReference<"contract_receipt">;
  readonly coverageDeclarationRef: SourcePackReference<"coverage_declaration">;
  readonly authorityBindingRef: SourcePackReference<"authority_binding">;
  readonly reviewAttestationRefs: readonly SourcePackReference<"review_attestation">[];
  readonly sourceContextRef: SourcePackReference<"source_context">;
  readonly jurisdictionContextRef: SourcePackReference<"jurisdiction_context">;
  readonly deploymentProfileRef: VersionedReference;
  readonly regionPackRef: VersionedReference;
  readonly personaProjectionRef: VersionedReference;
  readonly outputAdapterRef: VersionedReference;
  readonly operationGrants: readonly SourcePackOperation[];
  readonly state: SourcePackAdmissionState;
}

export type SourcePackObservationScope =
  "source" | "jurisdiction" | "source_within_jurisdiction";
export type SourcePackAvailabilityState =
  "available" | "unavailable" | "not_observed" | "unknown";
export type SourcePackHealthState =
  "healthy" | "degraded" | "failed" | "not_observed" | "unknown";

interface SourcePackObservationBase<
  Kind extends SourcePackCatalogKind,
> extends SourcePackCatalogMember<Kind> {
  readonly source: SourcePackSourceIdentity;
  readonly sourceContextRef: SourcePackReference<"source_context">;
  readonly jurisdictionContextRef: SourcePackReference<"jurisdiction_context">;
  readonly deploymentProfileRef: VersionedReference;
  readonly scope: SourcePackObservationScope;
  readonly observedAt: string;
}

export interface SourcePackAvailabilityObservation extends SourcePackObservationBase<"availability_observation"> {
  readonly state: SourcePackAvailabilityState;
}

export interface SourcePackHealthObservation extends SourcePackObservationBase<"health_observation"> {
  readonly state: SourcePackHealthState;
}

export type SourcePackPredecessorKind =
  "geographic_relation" | "rights_frame" | "taxonomy_namespace";

export interface SourcePackPredecessorReference {
  readonly kind: SourcePackPredecessorKind;
  readonly bundleRef: VersionedReference;
  readonly objectRef: VersionedReference;
}

export interface SourcePackSourceBinding extends SourcePackCatalogMember<"source_binding"> {
  readonly source: SourcePackSourceIdentity;
  readonly sourceContextRef: SourcePackReference<"source_context">;
  readonly jurisdictionContextRef: SourcePackReference<"jurisdiction_context">;
  readonly contractReceiptRef: SourcePackReference<"contract_receipt">;
  readonly coverageDeclarationRef: SourcePackReference<"coverage_declaration">;
  readonly authorityBindingRef: SourcePackReference<"authority_binding">;
  readonly admissionReceiptRef: SourcePackReference<"admission_receipt">;
  readonly visibility: SourcePackDisclosure;
  readonly predecessorRefs: readonly SourcePackPredecessorReference[];
}

export interface SourcePackDeploymentBinding extends SourcePackCatalogMember<"deployment_binding"> {
  readonly deploymentProfileRef: VersionedReference;
  readonly regionPackRef: VersionedReference;
  readonly sourceBindingRefs: readonly SourcePackReference<"source_binding">[];
  readonly accessContextRefs: readonly SourcePackReference<"access_context">[];
}

export interface SourcePackBundle extends VersionedReference {
  readonly $schema: typeof SOURCE_PACK_BUNDLE_SCHEMA_ID;
  readonly schemaVersion: typeof SOURCE_PACK_BUNDLE_SCHEMA_VERSION;
  readonly synthetic: true;
  readonly trustDomain: "synthetic_test_only";
  readonly lifecycleState: "synthetic_test_configuration";
  readonly profileBundleRef: VersionedReference;
  readonly configurationAuthorityBindingRefs: readonly SourcePackReference<"authority_binding">[];
  readonly sourceContexts: readonly SourcePackSourceContext[];
  readonly jurisdictionContexts: readonly SourcePackJurisdictionContext[];
  readonly accessContexts: readonly SourcePackAccessContext[];
  readonly authorityBindings: readonly SourcePackAuthorityBinding[];
  readonly evidenceReceipts: readonly SourcePackEvidenceReceipt[];
  readonly contractReceipts: readonly SourcePackContractReceipt[];
  readonly coverageDeclarations: readonly SourcePackCoverageDeclaration[];
  readonly reviewAttestations: readonly SourcePackReviewAttestation[];
  readonly admissionReceipts: readonly SourcePackAdmissionReceipt[];
  readonly availabilityObservations: readonly SourcePackAvailabilityObservation[];
  readonly healthObservations: readonly SourcePackHealthObservation[];
  readonly sourceBindings: readonly SourcePackSourceBinding[];
  readonly deploymentBindings: readonly SourcePackDeploymentBinding[];
}

export interface SourcePackAdmissionRequest {
  readonly profileBundleRef: VersionedReference;
  readonly regionPackRef: VersionedReference;
  readonly deploymentProfileRef: VersionedReference;
  readonly personaProjectionRef: VersionedReference;
  readonly outputAdapterRef: VersionedReference;
  readonly accessContextRef: SourcePackReference<"access_context">;
  readonly disclosureCeiling: SourcePackDisclosure;
  readonly requestedOperation: SourcePackOperation;
  readonly asOf: string;
  readonly requestedCoverageSlotRefs: readonly string[];
}

export interface SourcePackAdmissionPlanContext extends SourcePackAdmissionRequest {
  readonly disclosureState: "authorized_subset_not_comprehensive";
}

export interface SourcePackProofReferences {
  readonly contractReceiptRef: SourcePackReference<"contract_receipt">;
  readonly coverageDeclarationRef: SourcePackReference<"coverage_declaration">;
  readonly authorityBindingRef: SourcePackReference<"authority_binding">;
  readonly reviewAttestationRefs: readonly SourcePackReference<"review_attestation">[];
  readonly admissionReceiptRef: SourcePackReference<"admission_receipt">;
}

export interface SourcePackEligibleBinding {
  readonly sourceBindingRef: SourcePackReference<"source_binding">;
  readonly source: SourcePackSourceIdentity;
  readonly proofRefs: SourcePackProofReferences;
  readonly slotStates: readonly SourcePackCoverageSlotState[];
  readonly predecessorRefs: readonly SourcePackPredecessorReference[];
}

export type SourcePackExclusionReason =
  | "PACK_BINDING_DISABLED"
  | "NOT_ADMITTED"
  | "ADMISSION_NOT_CURRENT"
  | "PERSONA_NOT_GRANTED"
  | "OUTPUT_NOT_GRANTED"
  | "OPERATION_NOT_GRANTED"
  | "OUTSIDE_DECLARED_COVERAGE"
  | "COVERAGE_UNKNOWN"
  | "COVERAGE_NOT_ASSESSED"
  | "SOURCE_UNAVAILABLE"
  | "AVAILABILITY_NOT_OBSERVED"
  | "AVAILABILITY_UNKNOWN"
  | "HEALTH_NOT_OBSERVED"
  | "HEALTH_UNKNOWN"
  | "HEALTH_DEGRADED"
  | "HEALTH_FAILED";

export interface SourcePackExclusion {
  readonly sourceBindingRef: SourcePackReference<"source_binding">;
  readonly source: SourcePackSourceIdentity;
  readonly slotRef: string;
  readonly declaredCoverageState: SourcePackCoverageState | null;
  readonly reasonCodes: readonly SourcePackExclusionReason[];
}

export type SourcePackGapState =
  | "partial"
  | "unavailable"
  | "disabled"
  | "not_admitted"
  | "outside_coverage"
  | "unknown_coverage"
  | "not_assessed"
  | "availability_unknown"
  | "health_unknown"
  | "not_observed"
  | "unhealthy"
  | "opaque_coverage_gap";

export interface SourcePackGap {
  readonly slotRef: string;
  readonly state: SourcePackGapState;
  readonly notEvidenceOfAbsence: true;
}

export interface SourcePackAdmissionPlan {
  readonly schemaVersion: typeof SOURCE_PACK_BUNDLE_SCHEMA_VERSION;
  readonly profileBundleRef: VersionedReference;
  readonly context: SourcePackAdmissionPlanContext;
  readonly eligibleBindings: readonly SourcePackEligibleBinding[];
  readonly exclusions: readonly SourcePackExclusion[];
  readonly gaps: readonly SourcePackGap[];
  readonly fingerprint: string;
}

export interface SourcePackPredecessorBundles {
  readonly geographyRightsBundle?: unknown;
  readonly taxonomyBundle?: unknown;
}
