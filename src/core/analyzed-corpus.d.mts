import type { PolicyRecord } from "../shared/contracts";

export const ANALYZED_CORPUS_SCHEMA_ID: "https://policy-sentinel.invalid/schemas/analyzed-corpus.schema.v1.json";
export const ANALYZED_CORPUS_SCHEMA_VERSION: "1.0.0";

export type AnalyzedCorpusNonClaim =
  | "not_a_nation_relationship"
  | "not_an_organization_membership_determination"
  | "not_a_legal_applicability_determination"
  | "not_a_rights_impact_determination"
  | "not_a_jurisdiction_determination"
  | "not_a_geographic_applicability_or_association_determination"
  | "not_a_consultation_obligation_determination"
  | "not_comprehensive_coverage"
  | "not_a_community_position"
  | "not_legal_advice"
  | "not_an_official_source_substitute";

export const REQUIRED_ANALYZED_CORPUS_NON_CLAIMS: readonly AnalyzedCorpusNonClaim[];

export type AnalyzedCorpusTrustDomain =
  "synthetic_test_only" | "real_source_local_prerelease";

export type AnalyzedCorpusDigestedKind =
  | "region_pack"
  | "deployment_profile"
  | "taxonomy"
  | "configuration_authority"
  | "visibility_policy"
  | "field_policy"
  | "normalized_revision"
  | "why_shown_rule"
  | "limitation"
  | "projection_context"
  | "synthetic_corpus_evidence"
  | "synthetic_field_policy"
  | "synthetic_normalized_revision"
  | "synthetic_lifecycle_evaluation"
  | "synthetic_lifecycle_scope"
  | "synthetic_artifact_eligibility"
  | "synthetic_bounded_coverage"
  | "synthetic_health_evidence"
  | "synthetic_review_evidence"
  | "synthetic_lkg_evidence";

export type AnalyzedCorpusContentKind =
  | "lifecycle_scope"
  | "review_receipt"
  | "artifact_eligibility_receipt"
  | "coverage_receipt"
  | "health_receipt"
  | "lkg_receipt"
  | "source_evidence_binding"
  | "analyzed_corpus_view"
  | "analyzed_corpus"
  | "real_source_lifecycle_bundle";

export interface AnalyzedCorpusDigestedReference<
  Kind extends AnalyzedCorpusDigestedKind = AnalyzedCorpusDigestedKind,
> {
  readonly kind: Kind;
  readonly id: string;
  readonly version: string;
  readonly digest: string;
}

export interface AnalyzedCorpusContentReference<
  Kind extends AnalyzedCorpusContentKind = AnalyzedCorpusContentKind,
> {
  readonly kind: Kind;
  readonly id: string;
  readonly version: string;
  readonly contentDigest: string;
}

export interface AnalyzedCorpusProjectionInputs {
  readonly regionPackRef: AnalyzedCorpusDigestedReference<"region_pack">;
  readonly deploymentProfileRef: AnalyzedCorpusDigestedReference<"deployment_profile">;
  readonly taxonomyRef: AnalyzedCorpusDigestedReference<"taxonomy">;
  readonly configurationAuthorityRef: AnalyzedCorpusDigestedReference<"configuration_authority">;
  readonly visibilityPolicyRef: AnalyzedCorpusDigestedReference<"visibility_policy">;
  readonly limitationRefs: readonly AnalyzedCorpusDigestedReference<"limitation">[];
}

export interface SyntheticSourceEvidenceBinding {
  readonly kind: "source_evidence_binding";
  readonly id: string;
  readonly version: string;
  readonly contentDigest: string;
  readonly synthetic: true;
  readonly trustDomain: "synthetic_test_only";
  readonly sourceId: string;
  readonly visibility: "non_public_ignored_prerelease";
  readonly syntheticEvidenceRef: AnalyzedCorpusDigestedReference<"synthetic_corpus_evidence">;
  readonly fieldPolicyRef: AnalyzedCorpusDigestedReference<"synthetic_field_policy">;
  readonly revisionRef: AnalyzedCorpusDigestedReference<"synthetic_normalized_revision">;
  readonly lifecycleEvaluationRef: AnalyzedCorpusDigestedReference<"synthetic_lifecycle_evaluation">;
  readonly lifecycleScopeRef: AnalyzedCorpusDigestedReference<"synthetic_lifecycle_scope">;
  readonly artifactEligibilityRef: AnalyzedCorpusDigestedReference<"synthetic_artifact_eligibility">;
  readonly coverageRef: AnalyzedCorpusDigestedReference<"synthetic_bounded_coverage">;
  readonly healthRefs: readonly [
    {
      readonly scope: "source_contract";
      readonly evidenceRef: AnalyzedCorpusDigestedReference<"synthetic_health_evidence">;
    },
    {
      readonly scope: "acquisition_operation";
      readonly evidenceRef: AnalyzedCorpusDigestedReference<"synthetic_health_evidence">;
    },
    {
      readonly scope: "selected_range";
      readonly evidenceRef: AnalyzedCorpusDigestedReference<"synthetic_health_evidence">;
    },
  ];
  readonly reviewRef: AnalyzedCorpusDigestedReference<"synthetic_review_evidence">;
  readonly reviewExpiresAt: string;
  readonly lkgRef: AnalyzedCorpusDigestedReference<"synthetic_lkg_evidence"> | null;
}

export interface RealSourceEvidenceBinding {
  readonly kind: "source_evidence_binding";
  readonly id: string;
  readonly version: string;
  readonly contentDigest: string;
  readonly synthetic: false;
  readonly trustDomain: "real_source_local_prerelease";
  readonly sourceId: string;
  readonly visibility: "non_public_ignored_prerelease";
  readonly lifecycleAsOf: string;
  readonly lifecycleEvaluationDigest: string;
  readonly lifecycleBundleRef: AnalyzedCorpusContentReference<"real_source_lifecycle_bundle">;
  readonly lifecycleScopeRef: AnalyzedCorpusContentReference<"lifecycle_scope">;
  readonly fieldPolicyRef: AnalyzedCorpusDigestedReference<"field_policy">;
  readonly revisionRef: AnalyzedCorpusDigestedReference<"normalized_revision">;
  readonly artifactEligibilityRef: AnalyzedCorpusContentReference<"artifact_eligibility_receipt">;
  readonly coverageRef: AnalyzedCorpusContentReference<"coverage_receipt">;
  readonly healthRefs: readonly [
    {
      readonly scope: "source_contract";
      readonly receiptRef: AnalyzedCorpusContentReference<"health_receipt">;
    },
    {
      readonly scope: "acquisition_operation";
      readonly receiptRef: AnalyzedCorpusContentReference<"health_receipt">;
    },
    {
      readonly scope: "selected_range";
      readonly receiptRef: AnalyzedCorpusContentReference<"health_receipt">;
    },
  ];
  readonly reviewRef: AnalyzedCorpusContentReference<"review_receipt">;
  readonly reviewExpiresAt: string;
  readonly lkgRef: AnalyzedCorpusContentReference<"lkg_receipt"> | null;
}

export type SourceEvidenceBinding =
  SyntheticSourceEvidenceBinding | RealSourceEvidenceBinding;

export interface AnalyzedCorpusWhyShown {
  readonly basis: "general_jurisdiction" | "synthetic_compatibility";
  readonly evidenceField:
    "/jurisdiction/generalJurisdictionOnly" | "/source/id";
  readonly configurationAuthorityRef: AnalyzedCorpusDigestedReference<"configuration_authority">;
  readonly ruleRef: AnalyzedCorpusDigestedReference<"why_shown_rule">;
  readonly validFrom: string;
  readonly validThrough: string;
  readonly reviewEvidenceRef:
    | AnalyzedCorpusDigestedReference<"synthetic_review_evidence">
    | AnalyzedCorpusContentReference<"review_receipt">;
  readonly nonClaims: readonly AnalyzedCorpusNonClaim[];
}

export interface AnalyzedCorpusRecordReference {
  readonly recordId: string;
  readonly recordDigest: string;
  readonly sourceEvidenceBindingRef: AnalyzedCorpusContentReference<"source_evidence_binding">;
}

export interface AnalyzedCorpusRecordEntry extends AnalyzedCorpusRecordReference {
  readonly provenanceDigest: string;
  readonly whyShown: AnalyzedCorpusWhyShown;
  readonly visibility: "non_public_ignored_prerelease";
  readonly record: PolicyRecord;
}

export interface AnalyzedCorpusView {
  readonly kind: "analyzed_corpus_view";
  readonly id: string;
  readonly version: string;
  readonly contentDigest: string;
  readonly visibility: "non_public_ignored_prerelease";
  readonly recordRefs: readonly AnalyzedCorpusRecordReference[];
  readonly limitationRefs: readonly AnalyzedCorpusDigestedReference<"limitation">[];
}

export interface AnalyzedCorpus {
  readonly $schema: typeof ANALYZED_CORPUS_SCHEMA_ID;
  readonly schemaVersion: typeof ANALYZED_CORPUS_SCHEMA_VERSION | "1.1.0";
  readonly recordProfile?: "synthetic_application_compatibility";
  readonly kind: "analyzed_corpus";
  readonly id: string;
  readonly version: string;
  readonly contentDigest: string;
  readonly synthetic: boolean;
  readonly trustDomain: AnalyzedCorpusTrustDomain;
  readonly generatedAt: string;
  readonly dataAsOf: string;
  readonly recordSchemaRef: {
    readonly schemaId: "https://policy-sentinel.invalid/schemas/record.schema.v1.json";
    readonly version: "1.4.0";
  };
  readonly projectionInputs: AnalyzedCorpusProjectionInputs;
  readonly sourceEvidenceBindings: readonly SourceEvidenceBinding[];
  readonly recordEntries: readonly AnalyzedCorpusRecordEntry[];
  readonly views: readonly AnalyzedCorpusView[];
  readonly nonClaims: readonly AnalyzedCorpusNonClaim[];
  readonly publication: {
    readonly state: "closed";
    readonly boundary: "non_public_ignored_prerelease";
    readonly authorityReceiptRefs: readonly [];
  };
}

export type CreateSyntheticSourceEvidenceBinding = Omit<
  SyntheticSourceEvidenceBinding,
  "contentDigest"
>;
export type CreateRealSourceEvidenceBinding = Omit<
  RealSourceEvidenceBinding,
  "contentDigest"
>;

export interface CreateAnalyzedCorpusInput {
  readonly recordProfile?: "synthetic_application_compatibility";
  readonly id: string;
  readonly version: string;
  readonly synthetic: boolean;
  readonly trustDomain: AnalyzedCorpusTrustDomain;
  readonly generatedAt: string;
  readonly dataAsOf: string;
  readonly projectionInputs: AnalyzedCorpusProjectionInputs;
  readonly sourceEvidenceBindings: readonly (
    CreateSyntheticSourceEvidenceBinding | CreateRealSourceEvidenceBinding
  )[];
  readonly recordEntries: readonly {
    readonly record: PolicyRecord;
    readonly sourceEvidenceBindingRef: {
      readonly id: string;
      readonly version: string;
    };
    readonly whyShown: AnalyzedCorpusWhyShown;
    readonly visibility: "non_public_ignored_prerelease";
  }[];
  readonly views: readonly {
    readonly id: string;
    readonly version: string;
    readonly visibility: "non_public_ignored_prerelease";
    readonly recordIds: readonly string[];
    readonly limitationRefs: readonly AnalyzedCorpusDigestedReference<"limitation">[];
  }[];
}

/**
 * Reserved authority boundary. Synthetic parsing permits only the exact empty
 * array. Real-source parsing and creation fail closed in contract 1.0.0 until
 * the accepted lifecycle parser/evaluator has a source-neutral integration.
 */
export interface AnalyzedCorpusLifecycleAuthority {
  readonly realSourceLifecyclePins: readonly [];
}

export interface AnalyzedCorpusCompatibilityExpectation {
  readonly corpusRef: AnalyzedCorpusContentReference<"analyzed_corpus">;
  readonly synthetic: boolean;
  readonly trustDomain: AnalyzedCorpusTrustDomain;
  readonly recordSchemaRef: AnalyzedCorpus["recordSchemaRef"];
}

export interface AnalyzedCorpusProjectionRequest {
  readonly expectedCorpusRef: AnalyzedCorpusContentReference<"analyzed_corpus">;
  readonly contextRef: AnalyzedCorpusDigestedReference<"projection_context">;
  readonly expectedViewRef: AnalyzedCorpusContentReference<"analyzed_corpus_view">;
  readonly expectedRecordRefs: readonly AnalyzedCorpusRecordReference[];
}

export interface AnalyzedCorpusProjection {
  readonly schemaVersion: typeof ANALYZED_CORPUS_SCHEMA_VERSION;
  readonly kind: "analyzed_corpus_projection";
  readonly corpusRef: AnalyzedCorpusContentReference<"analyzed_corpus">;
  readonly contextRef: AnalyzedCorpusDigestedReference<"projection_context">;
  readonly viewRef: AnalyzedCorpusContentReference<"analyzed_corpus_view">;
  readonly recordRefs: readonly AnalyzedCorpusRecordReference[];
  readonly fingerprint: string;
}

export class AnalyzedCorpusValidationError extends TypeError {
  readonly code: string;
  readonly path: string;
}

export const SYNTHETIC_APPLICATION_PROFILE: "synthetic_application_compatibility";
export function canonicalCorpusDigest(value: unknown): string;

export interface AnalyzedCorpusRuntime {
  syntheticApplicationPins(): {
    readonly sourceRegistryDigest: string;
    readonly taxonomyDigest: string;
    readonly fixtureDigests: readonly {
      readonly recordId: string;
      readonly digest: string;
    }[];
  };
  createAnalyzedCorpus(
    input: CreateAnalyzedCorpusInput,
    lifecycleAuthority?: AnalyzedCorpusLifecycleAuthority,
  ): AnalyzedCorpus;
  parseAnalyzedCorpus(
    value: unknown,
    lifecycleAuthority?: AnalyzedCorpusLifecycleAuthority,
  ): AnalyzedCorpus;
  serializeAnalyzedCorpus(
    corpus: unknown,
    lifecycleAuthority?: AnalyzedCorpusLifecycleAuthority,
  ): string;
  assertAnalyzedCorpusCompatibility(
    corpus: unknown,
    expectation: AnalyzedCorpusCompatibilityExpectation,
    lifecycleAuthority?: AnalyzedCorpusLifecycleAuthority,
  ): AnalyzedCorpus;
  projectAnalyzedCorpus(
    corpus: unknown,
    request: AnalyzedCorpusProjectionRequest,
    lifecycleAuthority?: AnalyzedCorpusLifecycleAuthority,
  ): AnalyzedCorpusProjection;
}

export function createAnalyzedCorpusRuntime(configuration: {
  readonly canonicalSources: unknown;
  readonly canonicalTaxonomy: unknown;
  readonly federalFixture: unknown;
  readonly countyFixture: unknown;
  readonly accordFixture: unknown;
}): AnalyzedCorpusRuntime;
