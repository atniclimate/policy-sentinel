import type {
  RealSourceLifecycleBundle,
  RealSourceReference,
} from "../../engine/real-source-lifecycle-contracts";

import type { FEDERAL_REGISTER_TIER1_REQUEST_POLICY } from "./tier1-transport.mjs";

export const FEDERAL_REGISTER_TIER1_CANDIDATE_BUNDLE_DIGEST: string;
export const FEDERAL_REGISTER_TIER1_FIELD_POLICY_DIGEST: string;
export const FEDERAL_REGISTER_TIER1_REQUEST_PLAN_DIGEST: string;
export const FEDERAL_REGISTER_TIER1_REQUEST_POLICY_DIGEST: string;
export const FEDERAL_REGISTER_TIER1_GATE_EXPIRY: "2026-12-01T00:00:00Z";
export const FEDERAL_REGISTER_TIER1_RESIDUAL_ACCEPTED_AT: "2026-09-03T11:54:01Z";
export const FEDERAL_REGISTER_TIER1_REJECTED_MANIFEST_DIGEST: string;
export function parseFederalRegisterTier1BoundedRegistryJson(
  textValue: string,
): unknown;
export const FEDERAL_REGISTER_TIER1_REFRESH_INPUT_LIMITS: Readonly<{
  maximumJsonFileBytes: 1_048_576;
  maximumCaptureNodes: 50_000;
  maximumTextBytes: 1_048_576;
  maximumKeyBytes: 262_144;
  maximumArrayItems: 25_000;
  maximumDepth: 64;
}>;
export const FEDERAL_REGISTER_TIER1_POST_AUTHORITY_EVIDENCE_RECEIPTS: readonly FederalRegisterTier1SourceEvidence[];

export type FederalRegisterTier1AuthoritySlot =
  | "ofr_nara_service_operator"
  | "ofr_nara_originating_publisher"
  | "gpo_official_edition_custodian"
  | "source_reviewer"
  | "security_reviewer"
  | "sovereignty_reviewer";

export type FederalRegisterTier1SourceEvidenceSlot =
  | "federal_register_documentation"
  | "nara_federal_register_faq"
  | "govinfo_federal_register_help";

export type FederalRegisterTier1ReviewSubject =
  | "qualification"
  | "acquisition_grant"
  | "admission"
  | "activation"
  | "binding";

export type FederalRegisterTier1ReviewKind =
  "source_contract" | "source_evidence" | "security" | "sovereignty";

export interface FederalRegisterTier1DigestedIdentityRef {
  readonly id: string;
  readonly version: string;
  readonly digest: string;
}

export interface FederalRegisterTier1AuthorityEvidence {
  readonly slot: FederalRegisterTier1AuthoritySlot;
  readonly authorityIdentityRef: FederalRegisterTier1DigestedIdentityRef;
  readonly issuedAt: string;
  readonly evidenceDigest: string;
}

export interface FederalRegisterTier1SourceEvidence {
  readonly slot: FederalRegisterTier1SourceEvidenceSlot;
  readonly id: string;
  readonly predecessorEvidenceId: "FR-D1" | "FR-R1" | "FR-R2";
  readonly url: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly method: "GET";
  readonly statusCategory: "2xx";
  readonly mediaCategory:
    "application_json_utf8_identity" | "html_utf8_identity";
  readonly byteCount: number;
  readonly chunkCount: number;
  readonly attemptCount: 1;
  readonly redirectCount: 0;
  readonly retryCount: 0;
  readonly rawBytesRetained: 0;
  readonly responseDigest: string;
}

export interface FederalRegisterTier1LifecycleReviewEvidence {
  readonly subject: FederalRegisterTier1ReviewSubject;
  readonly reviewKind: FederalRegisterTier1ReviewKind;
  readonly reviewerSlot:
    "source_reviewer" | "security_reviewer" | "sovereignty_reviewer";
  readonly reviewedAt: string;
  readonly issuedAt: string;
  readonly evidenceDigest: string;
}

export interface FederalRegisterTier1ReceiptEvents {
  readonly qualificationIssuedAt: string;
  readonly acquisitionGrantIssuedAt: string;
  readonly admissionIssuedAt: string;
  readonly activationIssuedAt: string;
  readonly bindingIssuedAt: string;
  readonly lifecycleAsOf: string;
}

export interface FederalRegisterTier1ProspectiveAuthorityInput {
  readonly candidateBundle: unknown;
  readonly authorityEvidence: readonly FederalRegisterTier1AuthorityEvidence[];
  readonly lifecycleAsOf: string;
}

export interface FederalRegisterTier1PreAcquisitionBuildInput {
  readonly candidateBundle: unknown;
  readonly authorityEvidence: readonly FederalRegisterTier1AuthorityEvidence[];
  readonly sourceEvidence: readonly FederalRegisterTier1SourceEvidence[];
  readonly controlDocumentedAt: string;
  readonly receiptEvents: FederalRegisterTier1ReceiptEvents;
  readonly reviewEvidence: readonly FederalRegisterTier1LifecycleReviewEvidence[];
}

export interface FederalRegisterTier1AuthorityEvidenceBinding {
  readonly slot: FederalRegisterTier1AuthoritySlot;
  readonly authorityReceiptRef: RealSourceReference<"authority_receipt">;
  readonly evidenceDigest: string;
}

export interface FederalRegisterTier1ReviewEvidenceBinding {
  readonly reviewReceiptRef: RealSourceReference<"review_receipt">;
  readonly evidenceDigest: string;
}

export interface FederalRegisterTier1ProspectiveAuthorityGraph {
  readonly state: "prospective_authority_evidence_blocked";
  readonly acquisitionAuthorized: false;
  readonly lifecycleBundle: RealSourceLifecycleBundle;
  readonly authorityEvidenceBindings: readonly FederalRegisterTier1AuthorityEvidenceBinding[];
}

export interface FederalRegisterTier1PreAcquisitionGraph {
  readonly lifecycleBundle: RealSourceLifecycleBundle;
  readonly sourceEvidence: readonly FederalRegisterTier1SourceEvidence[];
  readonly authorityEvidenceBindings: readonly FederalRegisterTier1AuthorityEvidenceBinding[];
  readonly reviewEvidenceBindings: readonly FederalRegisterTier1ReviewEvidenceBinding[];
}

export interface FederalRegisterTier1CompanionManifest {
  readonly id: "federal-register-tier1-companion-manifest";
  readonly version: "1.0.0";
  readonly byteLength: number;
  readonly sha256: string;
}

export type FederalRegisterTier1CompanionApprovalRole =
  "source" | "security" | "sovereignty";

export interface FederalRegisterTier1CompanionApproval {
  readonly role: FederalRegisterTier1CompanionApprovalRole;
  readonly reviewerSlot:
    "source_reviewer" | "security_reviewer" | "sovereignty_reviewer";
  readonly reviewerAuthorityRef: RealSourceReference<"authority_receipt">;
  readonly reviewedAt: string;
  readonly issuedAt: string;
  readonly expiresAt: "2026-12-01T00:00:00Z";
  readonly evidenceDigest: string;
  readonly decision: "approved";
  readonly manifestDigest: string;
  readonly lifecycleBundleContentDigest: string;
  readonly lifecycleScopeContentDigest: string;
  readonly requestPlanDigest: string;
  readonly fieldPolicyDigest: string;
  readonly requestPolicyDigest: string;
}

export interface FederalRegisterTier1CompanionInput {
  readonly manifest: FederalRegisterTier1CompanionManifest;
  readonly approvals: readonly FederalRegisterTier1CompanionApproval[];
}

export interface FederalRegisterTier1PreAcquisitionGate {
  readonly schemaVersion: "1.0.0";
  readonly id: "federal-register-tier1-pre-acquisition-gate";
  readonly version: "1.0.0";
  readonly contentDigest: string;
  readonly state: "bound_pre_acquisition";
  readonly expectedLifecycleBundleContentDigest: string;
  readonly expectedLifecycleScopeContentDigest: string;
  readonly lifecycleBundle: RealSourceLifecycleBundle;
  readonly sourceEvidence: readonly FederalRegisterTier1SourceEvidence[];
  readonly authorityEvidenceBindings: readonly FederalRegisterTier1AuthorityEvidenceBinding[];
  readonly reviewEvidenceBindings: readonly FederalRegisterTier1ReviewEvidenceBinding[];
  readonly companionManifest: FederalRegisterTier1CompanionManifest;
  readonly request: {
    readonly url: string;
    readonly policy: typeof FEDERAL_REGISTER_TIER1_REQUEST_POLICY;
    readonly policyDigest: string;
  };
  readonly approvals: readonly FederalRegisterTier1CompanionApproval[];
  readonly publication: "closed";
}

export interface FederalRegisterTier1GateExpectation {
  readonly gateContentDigest: string;
  readonly lifecycleBundleContentDigest: string;
  readonly lifecycleScopeContentDigest: string;
  readonly companionManifestDigest: string;
  readonly companionManifestByteLength: number;
  readonly sourceEvidenceIds: readonly [string, string, string];
  readonly approvalEvidenceDigests: readonly [string, string, string];
  readonly asOf: string;
}

export interface FederalRegisterTier1GateProposal {
  readonly schemaVersion: "1.0.0";
  readonly mode: "qualification_proposal_only";
  readonly acquisitionAuthorized: false;
  readonly candidateBundleDigest: string;
  readonly requestPlanDigest: string;
  readonly fieldPolicyDigest: string;
  readonly companionManifestDigest: null;
  readonly companionManifestState: "replacement_freeze_required";
  readonly replacementSourceEvidenceIds: readonly ["FR-D2", "FR-R4", "FR-R5"];
  readonly replacementSourceEvidenceState: "three_post_authority_serial_receipts_recorded_and_approved";
  readonly requiredAuthorityCount: 7;
  readonly requiredProviderFactCount: 6;
  readonly requiredProjectControlCount: 18;
  readonly requiredUnknownCount: 9;
  readonly requiredResidualRiskCount: 2;
  readonly requiredLifecycleReviewCount: 14;
  readonly residualAcceptedAt: string;
  readonly expiresAt: string;
  readonly provenanceBlocker: string;
  readonly publication: "closed";
}

export const FEDERAL_REGISTER_TIER1_LIFECYCLE_BLUEPRINT: Readonly<{
  authorityReceiptCount: 7;
  providerFactCount: 6;
  projectControlCount: 18;
  unknownCount: 9;
  residualRiskCount: 2;
  reviewCount: 14;
  operationGrantCount: 1;
  expiry: string;
  residualAcceptedAt: string;
  authoritySlots: readonly Readonly<{ slot: string; role: string }>[];
  reviewGates: readonly Readonly<{
    subject: string;
    reviewKind: string;
    reviewerSlot: string;
  }>[];
  requestPlanDigest: string;
  fieldPolicyDigest: string;
  manifestState: "replacement_freeze_required";
}>;

export class FederalRegisterTier1RefreshGateError extends Error {
  readonly code: string;
  readonly path: string;
  constructor(code: string, path: string, detail: string);
}

export function buildFederalRegisterTier1ProspectiveAuthorityGraph(
  value: FederalRegisterTier1ProspectiveAuthorityInput,
): FederalRegisterTier1ProspectiveAuthorityGraph;

export function buildFederalRegisterTier1PreAcquisitionGraph(
  value: FederalRegisterTier1PreAcquisitionBuildInput,
): FederalRegisterTier1PreAcquisitionGraph;

export function assembleFederalRegisterTier1PreAcquisitionGate(
  graph: FederalRegisterTier1PreAcquisitionGraph,
  companion: FederalRegisterTier1CompanionInput,
): FederalRegisterTier1PreAcquisitionGate;

export function assertFederalRegisterTier1AcquisitionGate(
  gate: unknown,
  expectation: FederalRegisterTier1GateExpectation,
): FederalRegisterTier1PreAcquisitionGate;

export function serializeFederalRegisterTier1PreAcquisitionGate(
  gate: unknown,
): string;

export function createFederalRegisterTier1GateProposal(): FederalRegisterTier1GateProposal;
