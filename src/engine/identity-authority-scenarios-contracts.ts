/** Local synthetic reference contract. No real-source or publication authority. */
export const IDENTITY_AUTHORITY_SCENARIOS_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/identity-authority-scenarios.schema.v1.json";
export const IDENTITY_AUTHORITY_SCENARIOS_SCHEMA_VERSION = "1.0.0";

export const IDENTITY_AUTHORITY_SCENARIOS_NONCLAIMS = Object.freeze([
  "synthetic_reference_only",
  "no_real_identity_or_membership",
  "no_inferred_association_or_member_position",
  "no_legal_rights_jurisdiction_or_eligibility_determination",
  "no_source_activation_or_publication_authority",
] as const);

export type IasKind =
  | "namespace"
  | "entity"
  | "authority"
  | "document"
  | "evidence"
  | "assertion"
  | "scenario";

/** Namespace is part of identity, including for versioned assertion lookups. */
export interface IasReference<K extends IasKind = IasKind> {
  readonly kind: K;
  readonly namespaceId: string;
  readonly id: string;
  readonly version: string;
}

export interface IasMember<K extends IasKind> extends IasReference<K> {
  readonly synthetic: true;
}

export type IasDate =
  | { readonly state: "known"; readonly date: string }
  | { readonly state: "unknown" };

export type IasEvidenceState =
  | "available"
  | "unknown"
  | "unavailable"
  | "outside_coverage"
  | "not_observed"
  | "not_assessed";
export type IasReviewState =
  "synthetic_accepted" | "pending" | "disputed" | "rejected";

export interface IasNamespace extends IasMember<"namespace"> {
  readonly authoritySystem: string;
  /** Opaque reference namespace, never a jurisdiction determination. */
  readonly jurisdictionNamespace: string;
}

export type IasEntityKind =
  | "government"
  | "organization"
  | "administrative_office"
  | "geographic_concept"
  | "corporation"
  | "consortium"
  | "demographic_concept"
  | "cohort"
  | "instrument"
  | "deployment"
  | "project_owner"
  | "analyst";

export interface IasEntity extends IasMember<"entity"> {
  readonly entityKind: IasEntityKind;
  /** This fixture label is not an accepted source-attested name. */
  readonly label: string;
}

export type IasAuthorityRole =
  | "self_identity"
  | "recognition_registry"
  | "organization_membership"
  | "owner_selection"
  | "record_issuer"
  | "consultation_list"
  | "instrument_issuer"
  | "administrative_service"
  | "geographic_reference"
  | "deployment_owner"
  | "reviewer";

export interface IasAuthority extends IasMember<"authority"> {
  readonly entityRef: IasReference<"entity">;
  readonly role: IasAuthorityRole;
  readonly subjectRefs: readonly IasReference<"entity">[];
  readonly objectRefs: readonly IasReference<"entity" | "document">[];
}

export interface IasDocument extends IasMember<"document"> {
  readonly issuerRef: IasReference<"entity">;
  readonly speakerRef: IasReference<"entity">;
  readonly officialUrl: string;
  readonly digest: string;
  readonly title: string;
  readonly renditionRole: "originating_record" | "convenience_reference";
  readonly documentKind:
    | "name_attestation"
    | "recognition_notice"
    | "membership_roster"
    | "owner_decision"
    | "county_agenda"
    | "county_record"
    | "agency_instrument"
    | "party_filing"
    | "court_instrument"
    | "technical_report"
    | "agreement"
    | "entity_reference";
  readonly proceeding:
    | { readonly state: "known"; readonly id: string }
    | { readonly state: "unknown" };
  readonly issuedAt: IasDate;
}

export type IasRelation =
  | "source_name"
  | "source_alias"
  | "recognition"
  | "organization_membership"
  | "cohort_inclusion"
  | "cohort_exclusion"
  | "record_association"
  | "consultation_list_inclusion"
  | "instrument_party"
  | "administrative_service"
  | "geographic_reference"
  | "deployment_configuration"
  | "source_stated_count"
  | "enumerated_entries"
  | "document_status"
  | "proceeding_status"
  | "document_relation";

export type IasStatement =
  | "proposed"
  | "scheduled"
  | "filed"
  | "adopted"
  | "final"
  | "executed"
  | "acknowledged"
  | "completed"
  | "pending"
  | "closed"
  | "not_assessed";

export type IasAssertionObject =
  | { readonly kind: "name"; readonly value: string }
  | { readonly kind: "entity"; readonly ref: IasReference<"entity"> }
  | {
      readonly kind: "record";
      readonly documentRef: IasReference<"document">;
      readonly nameAssertionRef: IasReference<"assertion">;
    }
  | {
      readonly kind: "count";
      readonly value: number;
      readonly collectionRef: IasReference<"entity">;
    }
  | {
      readonly kind: "entries";
      readonly entryRefs: readonly IasReference<"entity">[];
      readonly collectionRef: IasReference<"entity">;
    }
  | {
      readonly kind: "statement";
      readonly documentRef: IasReference<"document">;
      readonly value: IasStatement;
    }
  | {
      readonly kind: "document_relation";
      readonly documentRef: IasReference<"document">;
      readonly targetDocumentRef: IasReference<"document">;
      readonly value:
        | "version_of"
        | "filed_in"
        | "responds_to"
        | "explicit_same_project"
        | "context_for";
    };

export interface IasReview {
  readonly assertionRef: IasReference<"assertion">;
  readonly authorityRef: IasReference<"authority">;
  readonly evidenceRef: IasReference<"evidence">;
  readonly state: IasReviewState;
  readonly reviewedAt: IasDate;
}

export interface IasAssertion extends IasMember<"assertion"> {
  readonly subjectRef: IasReference<"entity">;
  readonly relation: IasRelation;
  readonly object: IasAssertionObject;
  readonly authorityRef: IasReference<"authority">;
  readonly evidenceRef: IasReference<"evidence">;
  readonly observedAt: IasDate;
  readonly retrievedAt: IasDate;
  readonly sourceUpdatedAt: IasDate;
  readonly asOf: IasDate;
  readonly validFrom: IasDate;
  readonly validThrough: IasDate;
  readonly evidenceState: IasEvidenceState;
  readonly review: IasReview;
  readonly visibility: "public";
  readonly allowedUse: "local_synthetic_test_reference";
}

/** One atom per assertion in this bounded profile, not a universal source model. */
export interface IasEvidence extends IasMember<"evidence"> {
  readonly assertionRef: IasReference<"assertion">;
  readonly subjectRef: IasReference<"entity">;
  readonly relation: IasRelation;
  readonly object: IasAssertionObject;
  readonly authorityRef: IasReference<"authority">;
  readonly documentRef: IasReference<"document">;
  readonly evidenceKind:
    | "name_attestation"
    | "recognition"
    | "membership"
    | "owner_selection"
    | "official_record_mention"
    | "source_statement";
  readonly availability: IasEvidenceState;
  readonly citation:
    | {
        readonly state: "available";
        readonly officialUrl: string;
        readonly documentDigest: string;
        readonly locator: string;
        readonly value: string;
      }
    | { readonly state: "unknown" };
  readonly observedAt: IasDate;
  readonly retrievedAt: IasDate;
  readonly sourceUpdatedAt: IasDate;
  readonly asOf: IasDate;
}

export interface IasScenario extends IasMember<"scenario"> {
  /** Opaque synthetic key; named owner candidates are mapped only in Markdown. */
  readonly planningId: string;
  readonly status: "synthetic_candidate";
  readonly documentRefs: readonly IasReference<"document">[];
  readonly assertionRefs: readonly IasReference<"assertion">[];
  readonly citationRefs: readonly IasReference<"evidence">[];
  readonly distinctPairs: readonly {
    readonly left: IasReference<"entity" | "document">;
    readonly right: IasReference<"entity" | "document">;
  }[];
  readonly gaps: readonly IasEvidenceState[];
}

export interface IdentityAuthorityScenariosBundle {
  readonly $schema: typeof IDENTITY_AUTHORITY_SCENARIOS_SCHEMA_ID;
  readonly schemaVersion: typeof IDENTITY_AUTHORITY_SCENARIOS_SCHEMA_VERSION;
  readonly id: string;
  readonly version: string;
  readonly synthetic: true;
  readonly trustDomain: "synthetic_test_only";
  readonly namespaces: readonly IasNamespace[];
  readonly entities: readonly IasEntity[];
  readonly authorities: readonly IasAuthority[];
  readonly documents: readonly IasDocument[];
  readonly evidence: readonly IasEvidence[];
  readonly assertions: readonly IasAssertion[];
  readonly scenarios: readonly IasScenario[];
}

export interface IasCitationRequest {
  readonly evidenceRef: IasReference<"evidence">;
  readonly documentRef: IasReference<"document">;
  readonly officialUrl: string;
  readonly documentDigest: string;
  readonly locator: string;
  readonly value: string;
}

export interface IdentityAuthorityScenariosRequest {
  readonly scenarioRef: IasReference<"scenario">;
  readonly asOf: string;
  readonly citations: readonly IasCitationRequest[];
}

export interface IdentityAuthorityScenariosEvaluation {
  readonly bundleRef: { readonly id: string; readonly version: string };
  readonly scenarioRef: IasReference<"scenario">;
  readonly asOf: string;
  readonly trustDomain: "synthetic_test_only";
  readonly assertions: readonly {
    readonly assertionRef: IasReference<"assertion">;
    readonly temporalState:
      "in_interval" | "outside_interval" | "indeterminate";
    readonly evidenceState: IasEvidenceState;
    readonly reviewState: IasReviewState;
    readonly resolution: "accepted_synthetic_reference" | "unresolved";
  }[];
  readonly exactCitationRefs: readonly IasReference<"evidence">[];
  readonly nonClaims: typeof IDENTITY_AUTHORITY_SCENARIOS_NONCLAIMS;
}
