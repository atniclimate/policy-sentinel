import type { VersionedReference } from "./contracts";

export const REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_VERSION = "1.0.0" as const;
export const REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/real-source-lifecycle-bundle.schema.v1.json" as const;

function freezeLifecycleDescriptor<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach(
      freezeLifecycleDescriptor,
    );
    Object.freeze(value);
  }
  return value;
}

export const REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS =
  freezeLifecycleDescriptor({
    contract: {
      descriptorKind: "real_source_lifecycle_contract",
      id: "federal-register-tier1-contract",
      version: "1.0.0",
      schemaVersion: REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_VERSION,
      trustDomain: "real_source_local_prerelease",
      sourceId: "federal-register",
      allowedOperations: [
        "documentation_review",
        "acquisition",
        "retention",
        "transformation",
        "analysis",
        "local_projection",
      ],
      activationDefault: "closed",
      providerFactSubstitution: "forbidden",
      publication: "closed",
    },
    fieldPolicy: {
      descriptorKind: "real_source_lifecycle_field_policy",
      id: "federal-register-tier1-field-policy",
      version: "1.0.0",
      retainedClasses: ["structured_tier1_metadata", "typed_rendition_links"],
      excludedClasses: [
        "attachments",
        "comments",
        "contacts",
        "docket_body",
        "people",
        "public_inspection",
        "raw_provider_body",
        "sensitive_location",
        "tier2_text",
      ],
      unknownFieldDisposition: "fail_closed",
      recognizedDroppedProviderFields: [
        "agencies[].json_url",
        "agencies[].url",
      ],
      retainedAgencyFields: [
        "agencies[].id",
        "agencies[].name",
        "agencies[].parent_id",
        "agencies[].raw_name",
        "agencies[].slug",
      ],
      rawProviderBodyRetention: "forbidden",
      typedRenditionRetrieval: "forbidden",
    },
    transform: {
      descriptorKind: "real_source_lifecycle_transform",
      id: "federal-register-tier1-transform",
      version: "1.0.0",
      inputMediaType: "application/json",
      inputEncoding: "utf-8",
      selectedMemberCount: 1,
      duplicateIdentityDisposition: "fail_closed",
      unknownTopLevelFieldDisposition: "fail_closed",
      unknownAgencyFieldDisposition: "fail_closed",
      requiredAgencyKeys: ["raw_name"],
      retainedAgencyKeys: ["id", "name", "parent_id", "raw_name", "slug"],
      recognizedDroppedAgencyKeys: ["json_url", "url"],
      deterministicReplay: "required",
      rawProviderBodyOutput: "forbidden",
    },
    deployment: {
      descriptorKind: "real_source_lifecycle_deployment",
      id: "general-federal-local-prerelease",
      version: "1.0.0",
      executionMode: "local_build_time_only",
      publication: "forbidden",
      artifactPersistence: "ignored_content_addressed_only",
      ordinaryBuildAdmission: "forbidden",
      providerBrowserRuntime: "forbidden",
    },
    region: {
      descriptorKind: "real_source_lifecycle_region_context",
      id: "general-federal-pnw-context",
      version: "1.0.0",
      jurisdictionClass: "general_jurisdiction",
      atniRosterClaim: "forbidden",
      nationAssociation: "forbidden",
      geographicApplicabilityClaim: "forbidden",
      membershipClaim: "forbidden",
    },
    persona: {
      descriptorKind: "real_source_lifecycle_persona",
      id: "general-federal-researcher",
      version: "1.0.0",
      audience: "internal_prerelease_researcher",
      nationIdentity: "none",
      nationPositionInference: "forbidden",
      publicUse: "forbidden",
    },
    output: {
      descriptorKind: "real_source_lifecycle_output",
      id: "local-prerelease-reference-output",
      version: "1.0.0",
      deliveryMode: "same_origin_static",
      visibility: "non_public_ignored_prerelease",
      providerRuntimeCalls: "forbidden",
      ordinaryArtifactAdmission: "forbidden",
      publicArtifactAdmission: "forbidden",
      rawProviderContent: "forbidden",
    },
  } as const);

export type RealSourceOperation =
  | "documentation_review"
  | "acquisition"
  | "retention"
  | "transformation"
  | "analysis"
  | "local_projection";

export type RealSourceCatalogKind =
  | "authority_receipt"
  | "evidence_receipt"
  | "review_receipt"
  | "operation_grant"
  | "qualification_receipt"
  | "admission_receipt"
  | "activation_receipt"
  | "binding_receipt"
  | "artifact_eligibility_receipt"
  | "coverage_receipt"
  | "health_receipt"
  | "lkg_receipt";

export interface RealSourceReference<
  Kind extends RealSourceCatalogKind = RealSourceCatalogKind,
> extends VersionedReference {
  readonly kind: Kind;
  readonly contentDigest: string;
}

export interface RealSourceScopeReference extends VersionedReference {
  readonly kind: "lifecycle_scope";
  readonly contentDigest: string;
}

export interface RealSourceDigestedReference extends VersionedReference {
  readonly digest: string;
}

export interface RealSourceIdentity {
  readonly sourceId: string;
  readonly sourceRegistryVersion: string;
  readonly sourceRegistryRef: RealSourceDigestedReference;
  readonly sourceRegistryEntryRef: RealSourceDigestedReference;
}

export interface RealSourceSelectedRange extends RealSourceDigestedReference {
  readonly kind: "explicit_document_identities";
  readonly memberCount: 1;
  readonly coverageClaim: "bounded_non_comprehensive";
}

export type RealSourceHttpMethod = "GET" | "HEAD";

export type RealSourceRequiredUnknownKind =
  | "api_specific_privacy"
  | "api_specific_terms"
  | "change_notice"
  | "formal_response_error_schema"
  | "numeric_rate_limit"
  | "paging_stability"
  | "retry_backoff"
  | "service_level"
  | "snapshot_stability";

export type RealSourceRequiredUnknownQuestion =
  | "api_specific_privacy.collection_use_disclosure_retention"
  | "api_specific_terms.attribution"
  | "api_specific_terms.bulk_access"
  | "api_specific_terms.cache_rules"
  | "api_specific_terms.clickthrough"
  | "api_specific_terms.polling"
  | "api_specific_terms.redistribution"
  | "change_notice.change_notice"
  | "change_notice.deprecation_notice"
  | "formal_response_error_schema.error_schema"
  | "formal_response_error_schema.response_schema"
  | "numeric_rate_limit.concurrency_limit"
  | "numeric_rate_limit.numeric_quota"
  | "numeric_rate_limit.numeric_rate_limit"
  | "paging_stability.cursor_stability"
  | "paging_stability.paging_stability"
  | "retry_backoff.backoff_rules"
  | "retry_backoff.retry_rules"
  | "service_level.incident_response"
  | "service_level.indexing_latency"
  | "service_level.timeout_promises"
  | "snapshot_stability.snapshot_consistency"
  | "snapshot_stability.total_consistency";

export interface RealSourceUnknownChecklist extends RealSourceDigestedReference {
  readonly requiredUnknownKinds: readonly RealSourceRequiredUnknownKind[];
  readonly requiredQuestions: readonly RealSourceRequiredUnknownQuestion[];
}

export interface RealSourceRequestPlan extends RealSourceDigestedReference {
  readonly operation: "acquisition";
  readonly method: RealSourceHttpMethod;
  readonly host: string;
  readonly path: string;
  readonly query: readonly {
    readonly name: string;
    readonly value: string;
  }[];
  readonly selectedRangeRef: RealSourceDigestedReference;
  readonly ceilings: {
    readonly requestCount: 1;
    readonly pageCount: 1;
    readonly itemCount: 1;
    readonly concurrency: 1;
    readonly timeoutMs: number;
    readonly responseBytes: number;
  };
  readonly redirectPolicy: "forbidden";
}

export interface RealSourceLifecycleScope extends VersionedReference {
  readonly kind: "lifecycle_scope";
  readonly contentDigest: string;
  readonly synthetic: false;
  readonly source: RealSourceIdentity;
  readonly contractRef: RealSourceDigestedReference;
  readonly fieldPolicyRef: RealSourceDigestedReference;
  readonly transformRef: RealSourceDigestedReference;
  readonly deploymentRef: RealSourceDigestedReference;
  readonly regionPackRef: RealSourceDigestedReference;
  readonly personaProjectionRef: RealSourceDigestedReference;
  readonly outputAdapterRef: RealSourceDigestedReference;
  readonly selectedRange: RealSourceSelectedRange;
  readonly unknownChecklist: RealSourceUnknownChecklist;
  readonly requestPlan: RealSourceRequestPlan;
  readonly artifactBoundaryRef: RealSourceDigestedReference;
  readonly authoritySetDigest: string;
  readonly accessScope: {
    readonly hosts: readonly string[];
    readonly methods: readonly RealSourceHttpMethod[];
  };
  readonly relationshipPolicy: {
    readonly jurisdictionClass: "general_jurisdiction";
    readonly nationAssociation: "forbidden";
    readonly organizationMembershipInference: "forbidden";
    readonly geographyInference: "forbidden";
    readonly rightsInference: "forbidden";
    readonly positionInference: "forbidden";
  };
  readonly authorityPolicy: {
    readonly missingIssuerDisposition: "unresolved";
    readonly authorityFallback: "forbidden";
  };
  readonly taxonomyPolicy: {
    readonly topicSchemes: readonly ["federal_register_topics", "cfr_topics"];
    readonly crossSchemeMerge: "forbidden";
    readonly unmappedDisposition: "Unclassified";
  };
  readonly artifactBoundary: {
    readonly artifactClass: "ignored_local_prerelease";
    readonly ordinaryBuildAdmission: "forbidden";
    readonly publicOutputAdmission: "forbidden";
  };
}

export interface RealSourceValidityInterval {
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export interface RealSourceCatalogMember<
  Kind extends RealSourceCatalogKind,
> extends VersionedReference {
  readonly kind: Kind;
  readonly contentDigest: string;
  readonly synthetic: false;
  readonly scopeRef: RealSourceScopeReference;
}

export type RealSourceAuthorityRole =
  | "originating_publisher"
  | "issuing_agency"
  | "official_edition_custodian"
  | "service_operator"
  | "owner_configuration_authority"
  | "source_evidence_reviewer"
  | "sovereignty_reviewer"
  | "security_reviewer";

export type RealSourceReceiptState = "accepted" | "revoked" | "superseded";

export interface RealSourceAuthorityReceipt
  extends
    RealSourceCatalogMember<"authority_receipt">,
    RealSourceValidityInterval {
  readonly authorityRole: RealSourceAuthorityRole;
  readonly authorityIdentityRef: RealSourceDigestedReference;
  readonly state: RealSourceReceiptState;
  readonly supersededBy: RealSourceReference<"authority_receipt"> | null;
}

interface RealSourceEvidenceBase extends RealSourceCatalogMember<"evidence_receipt"> {
  readonly evidenceClass:
    | "provider_fact"
    | "dated_observation"
    | "project_control"
    | "unknown"
    | "residual_risk_decision";
}

export interface RealSourceProviderFactEvidence extends RealSourceEvidenceBase {
  readonly evidenceClass: "provider_fact";
  readonly factKind:
    | "source_identity"
    | "official_status"
    | "field_meaning"
    | "rendition_custody"
    | "access_requirement"
    | "affirmative_restriction"
    | "reproduction_right";
  readonly authorityReceiptRef: RealSourceReference<"authority_receipt">;
  readonly accessState:
    "not_applicable" | "credentials_not_required" | "credentials_required";
  readonly restrictionState: "not_applicable" | "compatible" | "incompatible";
  readonly evidenceUrl: string;
  readonly accessedAt: string;
  readonly statementDigest: string;
}

export interface RealSourceDatedObservationEvidence extends RealSourceEvidenceBase {
  readonly evidenceClass: "dated_observation";
  readonly observationKind:
    | "response_shape"
    | "error_shape"
    | "response_headers"
    | "paging_behavior"
    | "availability";
  readonly operation: RealSourceOperation;
  readonly requestDigest: string;
  readonly resultState: "observed" | "not_observed" | "failed";
  readonly observedAt: string;
  readonly responseDigest: string | null;
}

export interface RealSourceProjectControlEvidence extends RealSourceEvidenceBase {
  readonly evidenceClass: "project_control";
  readonly controlKind:
    | "field_allowlist"
    | "selected_range"
    | "request_budget"
    | "concurrency_limit"
    | "time_limit"
    | "byte_limit"
    | "no_automatic_retry"
    | "parser_fail_closed"
    | "drift_policy"
    | "lkg_retention"
    | "artifact_isolation"
    | "request_plan"
    | "source_registry"
    | "source_registry_entry"
    | "deployment_scope"
    | "region_scope"
    | "persona_scope"
    | "output_scope";
  readonly controlRef: RealSourceDigestedReference;
  readonly enforcementState: "fail_closed";
  readonly documentedAt: string;
}

export interface RealSourceUnknownEvidence extends RealSourceEvidenceBase {
  readonly evidenceClass: "unknown";
  readonly unknownKind:
    | "numeric_rate_limit"
    | "paging_stability"
    | "snapshot_stability"
    | "retry_backoff"
    | "formal_response_error_schema"
    | "service_level"
    | "change_notice"
    | "api_specific_terms"
    | "api_specific_privacy"
    | "authentication_requirement";
  readonly resolution:
    | "not_located_after_diligent_official_source_review"
    | "not_documented_by_provider"
    | "not_observed";
  readonly recordedAt: string;
  readonly limitationCode:
    | "serial_bounded_requests_only"
    | "closed_selection_no_completeness"
    | "no_availability_promise"
    | "fail_closed_on_drift"
    | "no_automatic_retry"
    | "parser_fail_closed"
    | "owner_risk_acceptance_required";
}

export type RealSourceResidualCondition =
  | "keyless_read_only"
  | "impersonal_metadata_links_only"
  | "build_time_only"
  | "bounded_unpublished_local_use"
  | "no_private_contact_comment_attachment_or_sensitive_location"
  | "no_conflicting_affirmative_restriction";

export interface RealSourceResidualRiskEvidence
  extends RealSourceEvidenceBase, RealSourceValidityInterval {
  readonly evidenceClass: "residual_risk_decision";
  readonly riskKind: "api_terms_or_privacy_not_located";
  readonly ownerAuthorityRef: RealSourceReference<"authority_receipt">;
  readonly unknownEvidenceRefs: readonly RealSourceReference<"evidence_receipt">[];
  readonly acceptedAt: string;
  readonly riskScope: {
    readonly hosts: readonly string[];
    readonly methods: readonly RealSourceHttpMethod[];
    readonly fieldPolicyRef: RealSourceDigestedReference;
    readonly outputBoundary: "ignored_local_prerelease_only";
  };
  readonly conditions: readonly RealSourceResidualCondition[];
  readonly state: RealSourceReceiptState;
  readonly supersededBy: RealSourceReference<"evidence_receipt"> | null;
}

export type RealSourceEvidenceReceipt =
  | RealSourceProviderFactEvidence
  | RealSourceDatedObservationEvidence
  | RealSourceProjectControlEvidence
  | RealSourceUnknownEvidence
  | RealSourceResidualRiskEvidence;

export type RealSourceReviewKind =
  "source_contract" | "source_evidence" | "sovereignty" | "security";

export type RealSourceReviewSubjectKind =
  | "operation_grant"
  | "qualification_receipt"
  | "admission_receipt"
  | "activation_receipt"
  | "binding_receipt"
  | "artifact_eligibility_receipt"
  | "coverage_receipt"
  | "health_receipt"
  | "lkg_receipt";

export interface RealSourceReviewReceipt
  extends
    RealSourceCatalogMember<"review_receipt">,
    RealSourceValidityInterval {
  readonly reviewKind: RealSourceReviewKind;
  readonly subject: {
    readonly kind: RealSourceReviewSubjectKind;
    readonly ref: RealSourceReference;
  };
  readonly reviewerAuthorityRef: RealSourceReference<"authority_receipt">;
  readonly ownerAuthorityRef: RealSourceReference<"authority_receipt">;
  readonly reviewedAt: string;
  readonly state: RealSourceReceiptState;
  readonly supersededBy: RealSourceReference<"review_receipt"> | null;
}

export interface RealSourceOperationGrant
  extends
    RealSourceCatalogMember<"operation_grant">,
    RealSourceValidityInterval {
  readonly operation: RealSourceOperation;
  /** Governing acquisition plan provenance for every independently granted operation. */
  readonly requestPlanRef: RealSourceDigestedReference;
  readonly ownerAuthorityRef: RealSourceReference<"authority_receipt">;
  readonly reviewReceiptRefs: readonly RealSourceReference<"review_receipt">[];
  readonly state: "granted" | "revoked" | "superseded";
  readonly supersededBy: RealSourceReference<"operation_grant"> | null;
}

export interface RealSourceQualificationReceipt
  extends
    RealSourceCatalogMember<"qualification_receipt">,
    RealSourceValidityInterval {
  readonly providerFactEvidenceRefs: readonly RealSourceReference<"evidence_receipt">[];
  readonly projectControlEvidenceRefs: readonly RealSourceReference<"evidence_receipt">[];
  readonly unknownEvidenceRefs: readonly RealSourceReference<"evidence_receipt">[];
  readonly issuedByAuthorityRef: RealSourceReference<"authority_receipt">;
  readonly reviewReceiptRefs: readonly RealSourceReference<"review_receipt">[];
  readonly state: "qualified" | "revoked" | "superseded";
  readonly supersededBy: RealSourceReference<"qualification_receipt"> | null;
}

export interface RealSourceAdmissionReceipt
  extends
    RealSourceCatalogMember<"admission_receipt">,
    RealSourceValidityInterval {
  readonly qualificationReceiptRef: RealSourceReference<"qualification_receipt">;
  readonly ownerAuthorityRef: RealSourceReference<"authority_receipt">;
  readonly reviewReceiptRefs: readonly RealSourceReference<"review_receipt">[];
  readonly residualRiskEvidenceRefs: readonly RealSourceReference<"evidence_receipt">[];
  readonly state: "admitted" | "revoked" | "superseded";
  readonly supersededBy: RealSourceReference<"admission_receipt"> | null;
}

export interface RealSourceActivationReceipt
  extends
    RealSourceCatalogMember<"activation_receipt">,
    RealSourceValidityInterval {
  readonly admissionReceiptRef: RealSourceReference<"admission_receipt">;
  readonly ownerAuthorityRef: RealSourceReference<"authority_receipt">;
  readonly operationGrantRefs: readonly RealSourceReference<"operation_grant">[];
  readonly reviewReceiptRefs: readonly RealSourceReference<"review_receipt">[];
  readonly state: "active" | "revoked" | "superseded";
  readonly supersededBy: RealSourceReference<"activation_receipt"> | null;
}

export interface RealSourceBindingReceipt
  extends
    RealSourceCatalogMember<"binding_receipt">,
    RealSourceValidityInterval {
  readonly activationReceiptRef: RealSourceReference<"activation_receipt">;
  readonly ownerAuthorityRef: RealSourceReference<"authority_receipt">;
  readonly reviewReceiptRefs: readonly RealSourceReference<"review_receipt">[];
  readonly state: "bound" | "revoked" | "superseded";
  readonly supersededBy: RealSourceReference<"binding_receipt"> | null;
}

export interface RealSourceArtifactEligibilityReceipt
  extends
    RealSourceCatalogMember<"artifact_eligibility_receipt">,
    RealSourceValidityInterval {
  readonly bindingReceiptRef: RealSourceReference<"binding_receipt">;
  readonly localProjectionGrantRef: RealSourceReference<"operation_grant">;
  readonly ownerAuthorityRef: RealSourceReference<"authority_receipt">;
  readonly reviewReceiptRefs: readonly RealSourceReference<"review_receipt">[];
  readonly artifactClass: "ignored_local_prerelease";
  readonly outputBoundary: "isolated_from_default_and_public";
  readonly state: "eligible" | "revoked" | "superseded";
  readonly supersededBy: RealSourceReference<"artifact_eligibility_receipt"> | null;
}

export interface RealSourceCoverageStages {
  readonly documented: number;
  readonly selected: number;
  readonly attempted: number;
  readonly received: number;
  readonly validated: number;
  readonly emitted: number;
  readonly omitted: number;
  readonly claimed: number;
}

export interface RealSourceCoverageReceipt extends RealSourceCatalogMember<"coverage_receipt"> {
  readonly issuedByAuthorityRef: RealSourceReference<"authority_receipt">;
  readonly operation: RealSourceOperation;
  readonly operationGrantRef: RealSourceReference<"operation_grant">;
  readonly admissionReceiptRef: RealSourceReference<"admission_receipt">;
  readonly activationReceiptRef: RealSourceReference<"activation_receipt">;
  readonly bindingReceiptRef: RealSourceReference<"binding_receipt">;
  readonly requestPlanRef: RealSourceDigestedReference;
  readonly requestDigest: string;
  readonly evidenceDigest: string;
  readonly observedAt: string;
  readonly resultState: "not_attempted" | "successful" | "failed" | "partial";
  readonly revisionRef: RealSourceDigestedReference | null;
  readonly stages: RealSourceCoverageStages;
  readonly completeness: "bounded_non_comprehensive";
  readonly absenceInference: "forbidden";
}

export type RealSourceHealthScope =
  "source_contract" | "acquisition_operation" | "selected_range";

export interface RealSourceHealthReceipt
  extends
    RealSourceCatalogMember<"health_receipt">,
    RealSourceValidityInterval {
  readonly healthScope: RealSourceHealthScope;
  readonly issuedByAuthorityRef: RealSourceReference<"authority_receipt">;
  readonly evidenceDigest: string;
  readonly observedAt: string;
  readonly state: "healthy" | "degraded" | "failed" | "unavailable" | "unknown";
  readonly coverageReceiptRef: RealSourceReference<"coverage_receipt"> | null;
}

export interface RealSourceLkgReceipt
  extends RealSourceCatalogMember<"lkg_receipt">, RealSourceValidityInterval {
  readonly revisionRef: RealSourceDigestedReference;
  readonly manifestDigest: string;
  readonly issuedByAuthorityRef: RealSourceReference<"authority_receipt">;
  readonly reviewReceiptRefs: readonly RealSourceReference<"review_receipt">[];
  readonly createdAt: string;
  readonly validatedAt: string;
  readonly validationState: "fully_validated";
  readonly coverageReceiptRef: RealSourceReference<"coverage_receipt">;
  readonly healthReceiptRef: RealSourceReference<"health_receipt">;
  readonly lineage:
    | {
        readonly kind: "genesis";
        readonly predecessorRef: null;
      }
    | {
        readonly kind: "successor";
        readonly predecessorRef: RealSourceReference<"lkg_receipt">;
      };
  readonly state: "eligible" | "revoked" | "superseded";
  readonly supersededBy: RealSourceReference<"lkg_receipt"> | null;
}

export type RealSourceLifecycleState =
  | "candidate"
  | "evidence_blocked"
  | "rejected"
  | "qualified"
  | "admitted"
  | "active"
  | "bound"
  | "local_artifact_eligible"
  | "suspended"
  | "expired"
  | "revoked"
  | "retired";

export interface RealSourceLifecycleBundle extends VersionedReference {
  readonly $schema: typeof REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_ID;
  readonly schemaVersion: typeof REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_VERSION;
  readonly contentDigest: string;
  readonly synthetic: false;
  readonly trustDomain: "real_source_local_prerelease";
  readonly lifecycleState: RealSourceLifecycleState;
  readonly lifecycleAsOf: string;
  readonly scope: RealSourceLifecycleScope;
  readonly authorityReceipts: readonly RealSourceAuthorityReceipt[];
  readonly evidenceReceipts: readonly RealSourceEvidenceReceipt[];
  readonly reviewReceipts: readonly RealSourceReviewReceipt[];
  readonly operationGrants: readonly RealSourceOperationGrant[];
  readonly qualificationReceipts: readonly RealSourceQualificationReceipt[];
  readonly admissionReceipts: readonly RealSourceAdmissionReceipt[];
  readonly activationReceipts: readonly RealSourceActivationReceipt[];
  readonly bindingReceipts: readonly RealSourceBindingReceipt[];
  readonly artifactEligibilityReceipts: readonly RealSourceArtifactEligibilityReceipt[];
  readonly coverageReceipts: readonly RealSourceCoverageReceipt[];
  readonly healthReceipts: readonly RealSourceHealthReceipt[];
  readonly lkgReceipts: readonly RealSourceLkgReceipt[];
  readonly publication: {
    readonly state: "closed";
    readonly authorityReceiptRefs: readonly [];
  };
}

export interface RealSourceLifecycleEvaluationRequest {
  readonly expectedScope: RealSourceLifecycleScope;
  readonly expectedBundleContentDigest: string;
  readonly requestedOperation: RealSourceOperation;
  readonly asOf: string;
  readonly currentAttempt:
    "not_attempted" | "successful" | "failed" | "partial";
  readonly currentRevisionRef: RealSourceDigestedReference | null;
  readonly requestedLkgRef: RealSourceReference<"lkg_receipt"> | null;
}

export type RealSourceLifecycleReasonCode =
  | "SCOPE_MISMATCH"
  | "NOT_QUALIFIED"
  | "NOT_ADMITTED"
  | "OPERATION_NOT_GRANTED"
  | "NOT_ACTIVATED"
  | "NOT_BOUND"
  | "LOCAL_ARTIFACT_NOT_ELIGIBLE"
  | "REQUIRED_REVIEW_NOT_CURRENT"
  | "OWNER_AUTHORITY_NOT_CURRENT"
  | "PROVIDER_AUTHORITY_NOT_CURRENT"
  | "HEALTH_NOT_CURRENT"
  | "CURRENT_ATTEMPT_FAILED"
  | "CURRENT_ATTEMPT_PARTIAL"
  | "NO_PRIOR_LKG"
  | "LKG_UNKNOWN"
  | "LKG_NOT_CURRENT"
  | "LKG_NOT_FULLY_VALIDATED"
  | "LKG_NOT_COMPATIBLE"
  | "LKG_FUTURE_DATED"
  | "PUBLICATION_CLOSED";

export interface RealSourceLifecycleEvaluation {
  readonly schemaVersion: typeof REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_VERSION;
  readonly bundleRef: VersionedReference;
  readonly scopeRef: RealSourceScopeReference;
  readonly requestedOperation: RealSourceOperation;
  readonly asOf: string;
  readonly qualificationState: "qualified" | "not_qualified";
  readonly admissionState: "admitted" | "not_admitted";
  readonly activationState: "active" | "inactive";
  readonly bindingState: "bound" | "unbound";
  readonly artifactEligibilityState: "eligible" | "ineligible";
  readonly publicationState: "closed";
  readonly operationGranted: boolean;
  readonly currentAttempt: RealSourceLifecycleEvaluationRequest["currentAttempt"];
  readonly currentCoverageRef: RealSourceReference<"coverage_receipt"> | null;
  readonly healthStates: readonly {
    readonly scope: RealSourceHealthScope;
    readonly state: RealSourceHealthReceipt["state"] | "not_observed";
    readonly receiptRef: RealSourceReference<"health_receipt"> | null;
  }[];
  readonly lkgState:
    | "not_requested"
    | "current_not_needed"
    | "eligible_stale_degraded"
    | "unavailable_no_prior"
    | "rejected";
  readonly selectedRevisionRef: RealSourceDigestedReference | null;
  readonly canExecute: boolean;
  readonly canEmitLocalArtifact: boolean;
  readonly canPublish: false;
  readonly reasonCodes: readonly RealSourceLifecycleReasonCode[];
}
