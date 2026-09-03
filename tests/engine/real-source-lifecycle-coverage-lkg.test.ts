import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import candidateFixture from "../../fixtures/engine/real-source-lifecycle.candidate.valid.json";
import type {
  RealSourceLifecycleEvaluationRequest,
  RealSourceOperation,
} from "../../src/engine/real-source-lifecycle-contracts";
import {
  RealSourceLifecycleValidationError,
  evaluateRealSourceLifecycle,
  parseRealSourceLifecycleBundle,
} from "../../src/engine/real-source-lifecycle";

type MutableJson =
  | null
  | boolean
  | number
  | string
  | MutableJson[]
  | { [key: string]: MutableJson };
type MutableObject = { [key: string]: MutableJson };

const ZERO = "0".repeat(64);
const ISSUED = "2026-09-03T00:00:00Z";
const EXPIRES = "2026-11-30T00:00:00Z";

function canonical(value: MutableJson): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key]!)}`)
    .join(",")}}`;
}

function digest(value: MutableJson): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function stripDigests(value: MutableJson): MutableJson {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(stripDigests);
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "contentDigest")
      .map(([key, child]) => [key, stripDigests(child)]),
  );
}

function ref(kind: string, id: string): MutableObject {
  return { kind, id, version: "1.0.0", contentDigest: ZERO };
}

function scopeRef(): MutableObject {
  return ref("lifecycle_scope", "federal-register-roadless-local-scope");
}

function catalogMember(kind: string, id: string): MutableObject {
  return {
    kind,
    id,
    version: "1.0.0",
    contentDigest: ZERO,
    synthetic: false,
    scopeRef: scopeRef(),
  };
}

function validity(): MutableObject {
  return { issuedAt: ISSUED, expiresAt: EXPIRES };
}

function list(bundle: MutableObject, key: string): MutableObject[] {
  return bundle[key] as MutableObject[];
}

function digestedRef(value: MutableObject): MutableObject {
  return {
    id: value.id!,
    version: value.version!,
    digest: value.digest!,
  };
}

function exactCatalogRef(value: MutableObject): MutableObject {
  return {
    kind: value.kind!,
    id: value.id!,
    version: value.version!,
    contentDigest: value.contentDigest!,
  };
}

function refreshBundleDigestOnly(bundle: MutableObject): void {
  const payload = structuredClone(bundle);
  delete payload.contentDigest;
  bundle.contentDigest = digest(payload);
}

function controlTarget(bundle: MutableObject, kind: string): MutableObject {
  const scope = bundle.scope as MutableObject;
  switch (kind) {
    case "field_allowlist":
      return structuredClone(scope.fieldPolicyRef as MutableObject);
    case "selected_range":
      return digestedRef(scope.selectedRange as MutableObject);
    case "request_plan":
    case "request_budget":
    case "concurrency_limit":
    case "time_limit":
    case "byte_limit":
    case "no_automatic_retry":
      return digestedRef(scope.requestPlan as MutableObject);
    case "source_registry":
      return structuredClone(
        (scope.source as MutableObject).sourceRegistryRef as MutableObject,
      );
    case "source_registry_entry":
      return structuredClone(
        (scope.source as MutableObject).sourceRegistryEntryRef as MutableObject,
      );
    case "deployment_scope":
      return structuredClone(scope.deploymentRef as MutableObject);
    case "region_scope":
      return structuredClone(scope.regionPackRef as MutableObject);
    case "persona_scope":
      return structuredClone(scope.personaProjectionRef as MutableObject);
    case "output_scope":
      return structuredClone(scope.outputAdapterRef as MutableObject);
    case "artifact_isolation":
      return structuredClone(scope.artifactBoundaryRef as MutableObject);
    case "parser_fail_closed":
      return structuredClone(scope.transformRef as MutableObject);
    case "drift_policy":
    case "lkg_retention":
      return structuredClone(scope.contractRef as MutableObject);
    default:
      throw new Error(`unknown control target: ${kind}`);
  }
}

function updateReferenceDigests(
  value: MutableJson,
  digests: ReadonlyMap<string, string>,
  root = false,
): void {
  if (value === null || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => updateReferenceDigests(entry, digests));
    return;
  }
  if (!root) {
    const kind = value.kind;
    const id = value.id;
    const version = value.version;
    if (
      typeof kind === "string" &&
      kind !== "lifecycle_scope" &&
      typeof id === "string" &&
      typeof version === "string" &&
      Object.hasOwn(value, "contentDigest")
    ) {
      const target = digests.get(`${kind}:${id}@${version}`);
      if (target !== undefined) {
        value.contentDigest = target;
      }
    }
  }
  Object.values(value).forEach((child) =>
    updateReferenceDigests(child, digests),
  );
}

function seal(bundle: MutableObject): MutableObject {
  const groupNames = [
    "authorityReceipts",
    "evidenceReceipts",
    "reviewReceipts",
    "operationGrants",
    "qualificationReceipts",
    "admissionReceipts",
    "activationReceipts",
    "bindingReceipts",
    "artifactEligibilityReceipts",
    "coverageReceipts",
    "healthReceipts",
    "lkgReceipts",
  ];
  const members = groupNames.flatMap((name) => list(bundle, name));
  for (const member of members) {
    member.contentDigest = digest(stripDigests(member));
  }
  const digests = new Map(
    members.map((member) => [
      `${String(member.kind)}:${String(member.id)}@${String(member.version)}`,
      String(member.contentDigest),
    ]),
  );
  members.forEach((member) => updateReferenceDigests(member, digests, true));

  const scope = bundle.scope as MutableObject;
  scope.authoritySetDigest = digest(
    list(bundle, "authorityReceipts")
      .map((receipt) => String(receipt.contentDigest))
      .sort(),
  );
  const scopePayload = structuredClone(scope);
  delete scopePayload.contentDigest;
  scope.contentDigest = digest(scopePayload);
  for (const member of members) {
    const reference = member.scopeRef as MutableObject;
    reference.contentDigest = scope.contentDigest!;
  }
  const bundlePayload = structuredClone(bundle);
  delete bundlePayload.contentDigest;
  bundle.contentDigest = digest(bundlePayload);
  return bundle;
}

function reviewerAuthority(id: string, authorityRole: string): MutableObject {
  return {
    ...catalogMember("authority_receipt", id),
    ...validity(),
    authorityRole,
    authorityIdentityRef: {
      id: `${id}-identity`,
      version: "1.0.0",
      digest: digest(id),
    },
    state: "accepted",
    supersededBy: null,
  };
}

function evidence(
  id: string,
  evidenceClass: "provider_fact" | "project_control",
  detail: string,
): MutableObject {
  if (evidenceClass === "provider_fact") {
    const authorityId =
      detail === "official_status" ||
      detail === "rendition_custody" ||
      detail === "reproduction_right"
        ? "federal-register-originating-publisher-authority"
        : "federal-register-service-operator-authority";
    return {
      ...catalogMember("evidence_receipt", id),
      evidenceClass,
      factKind: detail,
      authorityReceiptRef: ref("authority_receipt", authorityId),
      accessState:
        detail === "access_requirement"
          ? "credentials_not_required"
          : "not_applicable",
      restrictionState: "not_applicable",
      evidenceUrl:
        "https://www.federalregister.gov/developers/documentation/api/v1",
      accessedAt: ISSUED,
      statementDigest: digest(id),
    };
  }
  return {
    ...catalogMember("evidence_receipt", id),
    evidenceClass,
    controlKind: detail,
    controlRef: { id: `${id}-control`, version: "1.0.0", digest: digest(id) },
    enforcementState: "fail_closed",
    documentedAt: ISSUED,
  };
}

function addReview(
  bundle: MutableObject,
  subjectKind: string,
  subjectId: string,
  reviewKind: string,
  suffix: string,
): MutableObject {
  const reviewerByKind: Record<string, string> = {
    source_contract: "source-evidence-reviewer-authority",
    source_evidence: "source-evidence-reviewer-authority",
    sovereignty: "sovereignty-reviewer-authority",
    security: "security-reviewer-authority",
  };
  const reviewId = `review-${subjectId}-${suffix}`.replaceAll("_", "-");
  const review = {
    ...catalogMember("review_receipt", reviewId),
    ...validity(),
    reviewKind,
    subject: { kind: subjectKind, ref: ref(subjectKind, subjectId) },
    reviewerAuthorityRef: ref("authority_receipt", reviewerByKind[reviewKind]!),
    ownerAuthorityRef: ref(
      "authority_receipt",
      "owner-local-prerelease-authority",
    ),
    reviewedAt: ISSUED,
    state: "accepted",
    supersededBy: null,
  };
  list(bundle, "reviewReceipts").push(review);
  return ref("review_receipt", reviewId);
}

function addReviews(
  bundle: MutableObject,
  subjectKind: string,
  subjectId: string,
  kinds: readonly string[],
): MutableJson[] {
  return kinds.map((kind, index) =>
    addReview(bundle, subjectKind, subjectId, kind, `${kind}-${index}`),
  );
}

function activeBundle(): MutableObject {
  const bundle = structuredClone(candidateFixture) as unknown as MutableObject;
  bundle.lifecycleState = "local_artifact_eligible";
  list(bundle, "authorityReceipts").push(
    reviewerAuthority(
      "federal-register-service-operator-authority",
      "service_operator",
    ),
    reviewerAuthority(
      "federal-register-originating-publisher-authority",
      "originating_publisher",
    ),
    reviewerAuthority(
      "source-evidence-reviewer-authority",
      "source_evidence_reviewer",
    ),
    reviewerAuthority("sovereignty-reviewer-authority", "sovereignty_reviewer"),
    reviewerAuthority("security-reviewer-authority", "security_reviewer"),
  );

  const providerFacts = [
    ["source-identity-fact", "source_identity"],
    ["official-status-fact", "official_status"],
    ["field-meaning-fact", "field_meaning"],
    ["rendition-custody-fact", "rendition_custody"],
    ["access-requirement-fact", "access_requirement"],
    ["reproduction-right-fact", "reproduction_right"],
  ] as const;
  const controls = [
    ["field-allowlist-control", "field_allowlist"],
    ["selected-range-control", "selected_range"],
    ["request-budget-control", "request_budget"],
    ["concurrency-limit-control", "concurrency_limit"],
    ["time-limit-control", "time_limit"],
    ["byte-limit-control", "byte_limit"],
    ["no-automatic-retry-control", "no_automatic_retry"],
    ["parser-fail-closed-control", "parser_fail_closed"],
    ["drift-policy-control", "drift_policy"],
    ["lkg-retention-control", "lkg_retention"],
    ["request-plan-control", "request_plan"],
    ["source-registry-control", "source_registry"],
    ["source-registry-entry-control", "source_registry_entry"],
    ["deployment-scope-control", "deployment_scope"],
    ["region-scope-control", "region_scope"],
    ["persona-scope-control", "persona_scope"],
    ["output-scope-control", "output_scope"],
  ] as const;
  list(bundle, "evidenceReceipts").push(
    ...providerFacts.map(([id, kind]) => evidence(id, "provider_fact", kind)),
    ...controls.map(([id, kind]) => evidence(id, "project_control", kind)),
  );
  for (const control of list(bundle, "evidenceReceipts").filter(
    ({ evidenceClass }) => evidenceClass === "project_control",
  )) {
    control.controlRef = controlTarget(bundle, String(control.controlKind));
  }

  const risk = {
    ...catalogMember("evidence_receipt", "owner-residual-risk-decision"),
    ...validity(),
    evidenceClass: "residual_risk_decision",
    riskKind: "api_terms_or_privacy_not_located",
    ownerAuthorityRef: ref(
      "authority_receipt",
      "owner-local-prerelease-authority",
    ),
    unknownEvidenceRefs: [
      ref("evidence_receipt", "federal-register-api-privacy-unknown"),
      ref("evidence_receipt", "federal-register-api-terms-unknown"),
    ],
    acceptedAt: ISSUED,
    riskScope: {
      hosts: ["www.federalregister.gov"],
      methods: ["GET"],
      fieldPolicyRef: structuredClone(
        (bundle.scope as MutableObject).fieldPolicyRef,
      ),
      outputBoundary: "ignored_local_prerelease_only",
    },
    conditions: [
      "bounded_unpublished_local_use",
      "build_time_only",
      "impersonal_metadata_links_only",
      "keyless_read_only",
      "no_conflicting_affirmative_restriction",
      "no_private_contact_comment_attachment_or_sensitive_location",
    ],
    state: "accepted",
    supersededBy: null,
  };
  list(bundle, "evidenceReceipts").push(risk);

  const qualification = {
    ...catalogMember("qualification_receipt", "federal-register-qualification"),
    ...validity(),
    providerFactEvidenceRefs: providerFacts.map(([id]) =>
      ref("evidence_receipt", id),
    ),
    projectControlEvidenceRefs: [
      ref("evidence_receipt", "federal-register-artifact-isolation-control"),
      ...controls.map(([id]) => ref("evidence_receipt", id)),
    ],
    unknownEvidenceRefs: list(bundle, "evidenceReceipts")
      .filter(({ evidenceClass }) => evidenceClass === "unknown")
      .map(({ id }) => ref("evidence_receipt", String(id))),
    issuedByAuthorityRef: ref(
      "authority_receipt",
      "owner-local-prerelease-authority",
    ),
    reviewReceiptRefs: [] as MutableJson[],
    state: "qualified",
    supersededBy: null,
  };
  list(bundle, "qualificationReceipts").push(qualification);
  qualification.reviewReceiptRefs = addReviews(
    bundle,
    "qualification_receipt",
    "federal-register-qualification",
    ["source_contract", "source_evidence", "sovereignty"],
  );

  for (const operation of ["acquisition", "local_projection"] as const) {
    const id = `${operation.replace("_", "-")}-grant`;
    const grant = {
      ...catalogMember("operation_grant", id),
      ...validity(),
      operation,
      requestPlanRef: digestedRef(
        (bundle.scope as MutableObject).requestPlan as MutableObject,
      ),
      ownerAuthorityRef: ref(
        "authority_receipt",
        "owner-local-prerelease-authority",
      ),
      reviewReceiptRefs: [] as MutableJson[],
      state: "granted",
      supersededBy: null,
    };
    list(bundle, "operationGrants").push(grant);
    grant.reviewReceiptRefs = addReviews(bundle, "operation_grant", id, [
      "source_contract",
    ]);
  }

  const admission = {
    ...catalogMember("admission_receipt", "federal-register-admission"),
    ...validity(),
    qualificationReceiptRef: ref(
      "qualification_receipt",
      "federal-register-qualification",
    ),
    ownerAuthorityRef: ref(
      "authority_receipt",
      "owner-local-prerelease-authority",
    ),
    reviewReceiptRefs: [] as MutableJson[],
    residualRiskEvidenceRefs: [
      ref("evidence_receipt", "owner-residual-risk-decision"),
    ],
    state: "admitted",
    supersededBy: null,
  };
  list(bundle, "admissionReceipts").push(admission);
  admission.reviewReceiptRefs = addReviews(
    bundle,
    "admission_receipt",
    "federal-register-admission",
    ["source_evidence", "sovereignty", "security"],
  );

  const activation = {
    ...catalogMember("activation_receipt", "federal-register-activation"),
    ...validity(),
    admissionReceiptRef: ref("admission_receipt", "federal-register-admission"),
    ownerAuthorityRef: ref(
      "authority_receipt",
      "owner-local-prerelease-authority",
    ),
    operationGrantRefs: [
      ref("operation_grant", "acquisition-grant"),
      ref("operation_grant", "local-projection-grant"),
    ],
    reviewReceiptRefs: [] as MutableJson[],
    state: "active",
    supersededBy: null,
  };
  list(bundle, "activationReceipts").push(activation);
  activation.reviewReceiptRefs = addReviews(
    bundle,
    "activation_receipt",
    "federal-register-activation",
    ["source_evidence", "sovereignty", "security"],
  );

  const binding = {
    ...catalogMember("binding_receipt", "federal-register-binding"),
    ...validity(),
    activationReceiptRef: ref(
      "activation_receipt",
      "federal-register-activation",
    ),
    ownerAuthorityRef: ref(
      "authority_receipt",
      "owner-local-prerelease-authority",
    ),
    reviewReceiptRefs: [] as MutableJson[],
    state: "bound",
    supersededBy: null,
  };
  list(bundle, "bindingReceipts").push(binding);
  binding.reviewReceiptRefs = addReviews(
    bundle,
    "binding_receipt",
    "federal-register-binding",
    ["sovereignty", "security"],
  );

  const artifact = {
    ...catalogMember(
      "artifact_eligibility_receipt",
      "federal-register-local-artifact-eligibility",
    ),
    ...validity(),
    bindingReceiptRef: ref("binding_receipt", "federal-register-binding"),
    localProjectionGrantRef: ref("operation_grant", "local-projection-grant"),
    ownerAuthorityRef: ref(
      "authority_receipt",
      "owner-local-prerelease-authority",
    ),
    reviewReceiptRefs: [] as MutableJson[],
    artifactClass: "ignored_local_prerelease",
    outputBoundary: "isolated_from_default_and_public",
    state: "eligible",
    supersededBy: null,
  };
  list(bundle, "artifactEligibilityReceipts").push(artifact);
  artifact.reviewReceiptRefs = addReviews(
    bundle,
    "artifact_eligibility_receipt",
    "federal-register-local-artifact-eligibility",
    ["sovereignty", "security"],
  );

  const coverage = {
    ...catalogMember("coverage_receipt", "successful-selected-coverage"),
    issuedByAuthorityRef: ref(
      "authority_receipt",
      "owner-local-prerelease-authority",
    ),
    operation: "acquisition",
    operationGrantRef: ref("operation_grant", "acquisition-grant"),
    admissionReceiptRef: ref("admission_receipt", "federal-register-admission"),
    activationReceiptRef: ref(
      "activation_receipt",
      "federal-register-activation",
    ),
    bindingReceiptRef: ref("binding_receipt", "federal-register-binding"),
    requestPlanRef: digestedRef(
      (bundle.scope as MutableObject).requestPlan as MutableObject,
    ),
    requestDigest: String(
      ((bundle.scope as MutableObject).requestPlan as MutableObject).digest,
    ),
    evidenceDigest: digest("successful-evidence"),
    observedAt: "2026-09-05T00:00:00Z",
    resultState: "successful",
    revisionRef: {
      id: "federal-register-roadless-revision",
      version: "1.0.0",
      digest: digest("roadless-revision"),
    },
    stages: {
      documented: 1,
      selected: 1,
      attempted: 1,
      received: 1,
      validated: 1,
      emitted: 1,
      omitted: 0,
      claimed: 1,
    },
    completeness: "bounded_non_comprehensive",
    absenceInference: "forbidden",
  };
  list(bundle, "coverageReceipts").push(coverage);

  for (const healthScope of [
    "source_contract",
    "acquisition_operation",
    "selected_range",
  ]) {
    list(bundle, "healthReceipts").push({
      ...catalogMember(
        "health_receipt",
        `healthy-${healthScope.replaceAll("_", "-")}`,
      ),
      issuedAt: ISSUED,
      expiresAt: "2026-09-10T00:00:00Z",
      healthScope,
      issuedByAuthorityRef: ref(
        "authority_receipt",
        "owner-local-prerelease-authority",
      ),
      evidenceDigest: digest(`healthy-${healthScope}`),
      observedAt: "2026-09-05T00:00:00Z",
      state: "healthy",
      coverageReceiptRef:
        healthScope === "source_contract"
          ? null
          : ref("coverage_receipt", "successful-selected-coverage"),
    });
  }

  const lkg = {
    ...catalogMember("lkg_receipt", "federal-register-roadless-lkg"),
    ...validity(),
    revisionRef: {
      id: "federal-register-roadless-revision",
      version: "1.0.0",
      digest: digest("roadless-revision"),
    },
    manifestDigest: digest("roadless-manifest"),
    issuedByAuthorityRef: ref(
      "authority_receipt",
      "owner-local-prerelease-authority",
    ),
    reviewReceiptRefs: [] as MutableJson[],
    createdAt: "2026-09-05T00:00:00Z",
    validatedAt: "2026-09-05T00:00:00Z",
    validationState: "fully_validated",
    coverageReceiptRef: ref("coverage_receipt", "successful-selected-coverage"),
    healthReceiptRef: ref("health_receipt", "healthy-selected-range"),
    lineage: { kind: "genesis", predecessorRef: null },
    state: "eligible",
    supersededBy: null,
  };
  list(bundle, "lkgReceipts").push(lkg);
  lkg.reviewReceiptRefs = addReviews(
    bundle,
    "lkg_receipt",
    "federal-register-roadless-lkg",
    ["security"],
  );
  for (const review of list(bundle, "reviewReceipts").filter(
    ({ subject }) => String((subject as MutableObject).kind) === "lkg_receipt",
  )) {
    review.reviewedAt = "2026-09-05T00:00:00Z";
  }
  return seal(bundle);
}

function request(
  bundle: MutableObject,
  operation: RealSourceOperation,
  currentAttempt: RealSourceLifecycleEvaluationRequest["currentAttempt"],
  options: {
    asOf?: string;
    lkg?: boolean;
  } = {},
): RealSourceLifecycleEvaluationRequest {
  const requestedLkg = options.lkg
    ? list(bundle, "lkgReceipts").find(
        ({ id }) => id === "federal-register-roadless-lkg",
      )
    : undefined;
  return {
    expectedScope: structuredClone(
      bundle.scope,
    ) as unknown as RealSourceLifecycleEvaluationRequest["expectedScope"],
    expectedBundleContentDigest: String(bundle.contentDigest),
    requestedOperation: operation,
    asOf: options.asOf ?? "2026-09-06T00:00:00Z",
    currentAttempt,
    currentRevisionRef:
      currentAttempt === "successful"
        ? {
            id: "federal-register-roadless-revision",
            version: "1.0.0",
            digest: digest("roadless-revision"),
          }
        : null,
    requestedLkgRef: requestedLkg
      ? ({
          kind: "lkg_receipt",
          id: String(requestedLkg.id),
          version: String(requestedLkg.version),
          contentDigest: String(requestedLkg.contentDigest),
        } as const)
      : null,
  };
}

function addFailedAttempt(bundle: MutableObject, resultState = "failed"): void {
  const failedCoverage = {
    ...catalogMember("coverage_receipt", `${resultState}-selected-coverage`),
    issuedByAuthorityRef: ref(
      "authority_receipt",
      "owner-local-prerelease-authority",
    ),
    operation: "acquisition",
    operationGrantRef: ref("operation_grant", "acquisition-grant"),
    admissionReceiptRef: ref("admission_receipt", "federal-register-admission"),
    activationReceiptRef: ref(
      "activation_receipt",
      "federal-register-activation",
    ),
    bindingReceiptRef: ref("binding_receipt", "federal-register-binding"),
    requestPlanRef: digestedRef(
      (bundle.scope as MutableObject).requestPlan as MutableObject,
    ),
    requestDigest: String(
      ((bundle.scope as MutableObject).requestPlan as MutableObject).digest,
    ),
    evidenceDigest: digest(`${resultState}-evidence`),
    observedAt: "2026-09-10T00:00:00Z",
    resultState,
    revisionRef: null,
    stages: {
      documented: 1,
      selected: 1,
      attempted: 1,
      received: resultState === "partial" ? 1 : 0,
      validated: 0,
      emitted: 0,
      omitted: 1,
      claimed: 0,
    },
    completeness: "bounded_non_comprehensive",
    absenceInference: "forbidden",
  };
  list(bundle, "coverageReceipts").push(failedCoverage);
  for (const [healthScope, state] of [
    ["source_contract", "degraded"],
    ["acquisition_operation", "failed"],
    ["selected_range", "unavailable"],
  ]) {
    list(bundle, "healthReceipts").push({
      ...catalogMember(
        "health_receipt",
        `${resultState}-${healthScope}`.replaceAll("_", "-"),
      ),
      issuedAt: "2026-09-10T00:00:00Z",
      expiresAt: EXPIRES,
      healthScope,
      issuedByAuthorityRef: ref(
        "authority_receipt",
        "owner-local-prerelease-authority",
      ),
      evidenceDigest: digest(`${resultState}-${healthScope}`),
      observedAt: "2026-09-10T00:00:00Z",
      state,
      coverageReceiptRef: ref(
        "coverage_receipt",
        `${resultState}-selected-coverage`,
      ),
    });
  }
}

function addLkgSuccessor(bundle: MutableObject): MutableObject {
  const revisionRef = {
    id: "federal-register-roadless-revision",
    version: "1.1.0",
    digest: digest("roadless-revision-2"),
  };
  const coverage = {
    ...catalogMember("coverage_receipt", "successful-selected-coverage-2"),
    issuedByAuthorityRef: ref(
      "authority_receipt",
      "owner-local-prerelease-authority",
    ),
    operation: "acquisition",
    operationGrantRef: ref("operation_grant", "acquisition-grant"),
    admissionReceiptRef: ref("admission_receipt", "federal-register-admission"),
    activationReceiptRef: ref(
      "activation_receipt",
      "federal-register-activation",
    ),
    bindingReceiptRef: ref("binding_receipt", "federal-register-binding"),
    requestPlanRef: digestedRef(
      (bundle.scope as MutableObject).requestPlan as MutableObject,
    ),
    requestDigest: String(
      ((bundle.scope as MutableObject).requestPlan as MutableObject).digest,
    ),
    evidenceDigest: digest("successful-evidence-2"),
    observedAt: "2026-09-06T00:00:00Z",
    resultState: "successful",
    revisionRef,
    stages: {
      documented: 1,
      selected: 1,
      attempted: 1,
      received: 1,
      validated: 1,
      emitted: 1,
      omitted: 0,
      claimed: 1,
    },
    completeness: "bounded_non_comprehensive",
    absenceInference: "forbidden",
  };
  list(bundle, "coverageReceipts").push(coverage);
  const oldSelectedHealth = list(bundle, "healthReceipts").find(
    ({ id }) => id === "healthy-selected-range",
  )!;
  oldSelectedHealth.expiresAt = "2026-09-06T00:00:00Z";
  const health = {
    ...catalogMember("health_receipt", "healthy-selected-range-2"),
    issuedAt: "2026-09-06T00:00:00Z",
    expiresAt: "2026-09-10T00:00:00Z",
    healthScope: "selected_range",
    issuedByAuthorityRef: ref(
      "authority_receipt",
      "owner-local-prerelease-authority",
    ),
    evidenceDigest: digest("healthy-selected-range-2"),
    observedAt: "2026-09-06T00:00:00Z",
    state: "healthy",
    coverageReceiptRef: ref(
      "coverage_receipt",
      "successful-selected-coverage-2",
    ),
  };
  list(bundle, "healthReceipts").push(health);
  const predecessor = list(bundle, "lkgReceipts")[0]!;
  predecessor.state = "superseded";
  predecessor.supersededBy = ref(
    "lkg_receipt",
    "federal-register-roadless-lkg-2",
  );
  const successor = {
    ...catalogMember("lkg_receipt", "federal-register-roadless-lkg-2"),
    issuedAt: "2026-09-06T00:00:00Z",
    expiresAt: EXPIRES,
    revisionRef,
    manifestDigest: digest("roadless-manifest-2"),
    issuedByAuthorityRef: ref(
      "authority_receipt",
      "owner-local-prerelease-authority",
    ),
    reviewReceiptRefs: [] as MutableJson[],
    createdAt: "2026-09-06T00:00:00Z",
    validatedAt: "2026-09-06T00:00:00Z",
    validationState: "fully_validated",
    coverageReceiptRef: ref(
      "coverage_receipt",
      "successful-selected-coverage-2",
    ),
    healthReceiptRef: ref("health_receipt", "healthy-selected-range-2"),
    lineage: {
      kind: "successor",
      predecessorRef: ref("lkg_receipt", "federal-register-roadless-lkg"),
    },
    state: "eligible",
    supersededBy: null,
  };
  list(bundle, "lkgReceipts").push(successor);
  successor.reviewReceiptRefs = addReviews(
    bundle,
    "lkg_receipt",
    "federal-register-roadless-lkg-2",
    ["security"],
  );
  for (const review of list(bundle, "reviewReceipts").filter(
    ({ subject }) =>
      String(((subject as MutableObject).ref as MutableObject).id) ===
      "federal-register-roadless-lkg-2",
  )) {
    review.reviewedAt = "2026-09-06T00:00:00Z";
  }
  return successor;
}

function removeReceiptsForKinds(
  bundle: MutableObject,
  kinds: ReadonlySet<string>,
): void {
  const reviews = list(bundle, "reviewReceipts");
  for (let index = reviews.length - 1; index >= 0; index -= 1) {
    const subject = reviews[index]!.subject as MutableObject;
    if (kinds.has(String(subject.kind))) {
      reviews.splice(index, 1);
    }
  }
}

function trimToLifecycleStage(
  bundle: MutableObject,
  stage: "qualified" | "admitted",
): void {
  const removedKinds = new Set<string>([
    "coverage_receipt",
    "health_receipt",
    "lkg_receipt",
    "activation_receipt",
    "binding_receipt",
    "artifact_eligibility_receipt",
  ]);
  list(bundle, "coverageReceipts").length = 0;
  list(bundle, "healthReceipts").length = 0;
  list(bundle, "lkgReceipts").length = 0;
  list(bundle, "activationReceipts").length = 0;
  list(bundle, "bindingReceipts").length = 0;
  list(bundle, "artifactEligibilityReceipts").length = 0;
  if (stage === "qualified") {
    removedKinds.add("admission_receipt");
    list(bundle, "admissionReceipts").length = 0;
  }
  removeReceiptsForKinds(bundle, removedKinds);
  bundle.lifecycleState = stage;
}

function addUnknown(
  bundle: MutableObject,
  id: string,
  unknownKind: string,
  limitationCode = "owner_risk_acceptance_required",
): MutableObject {
  const unknown = {
    ...catalogMember("evidence_receipt", id),
    evidenceClass: "unknown",
    unknownKind,
    resolution: "not_documented_by_provider",
    recordedAt: ISSUED,
    limitationCode,
  };
  list(bundle, "evidenceReceipts").push(unknown);
  return unknown;
}

function capture(run: () => unknown): RealSourceLifecycleValidationError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(RealSourceLifecycleValidationError);
    return error as RealSourceLifecycleValidationError;
  }
  throw new Error("invalid lifecycle graph was accepted");
}

describe("real-source lifecycle coverage and LKG", () => {
  it("admits only the exact operation and keeps publication closed", () => {
    const bundle = activeBundle();
    const acquisition = evaluateRealSourceLifecycle(
      bundle,
      request(bundle, "acquisition", "successful"),
    );
    expect(acquisition).toMatchObject({
      qualificationState: "qualified",
      admissionState: "admitted",
      activationState: "active",
      bindingState: "bound",
      artifactEligibilityState: "eligible",
      operationGranted: true,
      canExecute: true,
      canEmitLocalArtifact: true,
      canPublish: false,
      publicationState: "closed",
    });
    expect(acquisition.currentCoverageRef).not.toBeNull();

    const retention = evaluateRealSourceLifecycle(
      bundle,
      request(bundle, "retention", "not_attempted"),
    );
    expect(retention.operationGranted).toBe(false);
    expect(retention.canExecute).toBe(false);
    expect(retention.reasonCodes).toContain("OPERATION_NOT_GRANTED");
  });

  it("reports failed genesis as unavailable and emits no substitute", () => {
    const bundle = activeBundle();
    list(bundle, "coverageReceipts").length = 0;
    list(bundle, "healthReceipts").length = 0;
    list(bundle, "lkgReceipts").length = 0;
    list(bundle, "reviewReceipts").splice(
      list(bundle, "reviewReceipts").findIndex(
        ({ id }) => id === "review-federal-register-roadless-lkg-security-0",
      ),
      1,
    );
    addFailedAttempt(bundle);
    seal(bundle);

    const result = evaluateRealSourceLifecycle(
      bundle,
      request(bundle, "acquisition", "failed", {
        asOf: "2026-09-11T00:00:00Z",
      }),
    );
    expect(result.lkgState).toBe("unavailable_no_prior");
    expect(result.canEmitLocalArtifact).toBe(false);
    expect(result.reasonCodes).toContain("NO_PRIOR_LKG");

    const orphanedSuccess = activeBundle();
    list(orphanedSuccess, "lkgReceipts").length = 0;
    removeReceiptsForKinds(orphanedSuccess, new Set(["lkg_receipt"]));
    seal(orphanedSuccess);
    expect(
      capture(() => parseRealSourceLifecycleBundle(orphanedSuccess)).code,
    ).toBe("MISSING_LKG_GENESIS");
  });

  it("uses only a current compatible LKG after a failed attempt", () => {
    const bundle = activeBundle();
    addFailedAttempt(bundle);
    seal(bundle);
    const resultRequest = request(bundle, "acquisition", "failed", {
      asOf: "2026-09-11T00:00:00Z",
      lkg: true,
    });

    const result = evaluateRealSourceLifecycle(bundle, resultRequest);
    expect(result.lkgState).toBe("eligible_stale_degraded");
    expect(result.canEmitLocalArtifact).toBe(true);
    expect(result.canPublish).toBe(false);
  });

  it("uses only the unique reciprocal digest-bound LKG lineage tip", () => {
    const bundle = activeBundle();
    const successor = addLkgSuccessor(bundle);
    seal(bundle);
    expect(() => parseRealSourceLifecycleBundle(bundle)).not.toThrow();

    addFailedAttempt(bundle);
    seal(bundle);
    const tipRequest = request(bundle, "acquisition", "failed", {
      asOf: "2026-09-11T00:00:00Z",
    }) as unknown as MutableObject;
    tipRequest.requestedLkgRef = exactCatalogRef(successor);
    const tipResult = evaluateRealSourceLifecycle(bundle, tipRequest as never);
    expect(tipResult.lkgState).toBe("eligible_stale_degraded");
    expect(tipResult.selectedRevisionRef).toEqual(successor.revisionRef);

    const predecessorResult = evaluateRealSourceLifecycle(
      bundle,
      request(bundle, "acquisition", "failed", {
        asOf: "2026-09-11T00:00:00Z",
        lkg: true,
      }),
    );
    expect(predecessorResult.lkgState).toBe("rejected");
    expect(predecessorResult.reasonCodes).toContain("LKG_NOT_CURRENT");

    const secondGenesis = activeBundle();
    const falseGenesis = addLkgSuccessor(secondGenesis);
    falseGenesis.lineage = { kind: "genesis", predecessorRef: null };
    seal(secondGenesis);
    expect(
      capture(() => parseRealSourceLifecycleBundle(secondGenesis)).code,
    ).toBe("INVALID_LKG_LINEAGE");

    const reversedRefresh = activeBundle();
    addLkgSuccessor(reversedRefresh);
    list(reversedRefresh, "coverageReceipts").find(
      ({ id }) => id === "successful-selected-coverage-2",
    )!.observedAt = "2026-09-04T00:00:00Z";
    seal(reversedRefresh);
    expect(
      capture(() => parseRealSourceLifecycleBundle(reversedRefresh)).code,
    ).toBe("INVALID_LKG_LINEAGE");
  });

  it("rejects one normalized revision id and version resolving to different bytes", () => {
    const bundle = activeBundle();
    const successor = addLkgSuccessor(bundle);
    (successor.revisionRef as MutableObject).version = "1.0.0";
    seal(bundle);

    expect(capture(() => parseRealSourceLifecycleBundle(bundle)).code).toBe(
      "INCONSISTENT_DIGESTED_REFERENCE",
    );
  });

  it("rejects reciprocal lineage-link substitution at both trust layers", () => {
    const trusted = activeBundle();
    addLkgSuccessor(trusted);
    seal(trusted);
    const predecessor = list(trusted, "lkgReceipts")[0]!;
    const trustedBundleDigest = String(trusted.contentDigest);
    (predecessor.supersededBy as MutableObject).contentDigest = digest(
      "substituted-lineage-edge",
    );

    expect(String(trusted.contentDigest)).toBe(trustedBundleDigest);
    expect(capture(() => parseRealSourceLifecycleBundle(trusted)).code).toBe(
      "CONTENT_DIGEST_MISMATCH",
    );

    refreshBundleDigestOnly(trusted);
    expect(capture(() => parseRealSourceLifecycleBundle(trusted)).code).toBe(
      "INVALID_SUPERSESSION",
    );
  });

  it("rejects cross-subject review supersession laundering", () => {
    const bundle = activeBundle();
    const predecessor = list(bundle, "reviewReceipts").find(
      ({ id }) =>
        id === "review-federal-register-qualification-source-contract-0",
    )!;
    predecessor.state = "superseded";
    predecessor.supersededBy = ref(
      "review_receipt",
      "cross-subject-review-successor",
    );
    const successor = structuredClone(predecessor);
    successor.id = "cross-subject-review-successor";
    successor.issuedAt = "2026-09-04T00:00:00Z";
    successor.reviewedAt = "2026-09-04T00:00:00Z";
    successor.subject = {
      kind: "operation_grant",
      ref: ref("operation_grant", "acquisition-grant"),
    };
    successor.state = "accepted";
    successor.supersededBy = null;
    list(bundle, "reviewReceipts").push(successor);
    seal(bundle);
    expect(capture(() => parseRealSourceLifecycleBundle(bundle)).code).toBe(
      "INVALID_SUPERSESSION",
    );
  });

  it("does not let an LKG rescue an expired review or revoked owner authority", () => {
    const expiredReview = activeBundle();
    addFailedAttempt(expiredReview);
    const review = list(expiredReview, "reviewReceipts").find(
      ({ id }) =>
        id === "review-federal-register-qualification-source-contract-0",
    )!;
    review.expiresAt = "2026-09-11T00:00:00Z";
    seal(expiredReview);
    const result = evaluateRealSourceLifecycle(
      expiredReview,
      request(expiredReview, "acquisition", "failed", {
        asOf: "2026-09-11T00:00:00Z",
        lkg: true,
      }),
    );
    expect(result.lkgState).toBe("rejected");
    expect(result.canEmitLocalArtifact).toBe(false);

    const revokedOwner = activeBundle();
    const owner = list(revokedOwner, "authorityReceipts").find(
      ({ id }) => id === "owner-local-prerelease-authority",
    )!;
    owner.state = "revoked";
    seal(revokedOwner);
    expect(
      capture(() => parseRealSourceLifecycleBundle(revokedOwner)).code,
    ).toBe("AUTHORITY_NOT_CURRENT_AT_EVENT");
  });

  it("does not make reviews or residual decisions effective before their event times", () => {
    const pendingReview = activeBundle();
    trimToLifecycleStage(pendingReview, "qualified");
    for (const review of list(pendingReview, "reviewReceipts").filter(
      ({ subject }) =>
        String(((subject as MutableObject).ref as MutableObject).id) ===
        "federal-register-qualification",
    )) {
      review.reviewedAt = "2026-09-04T00:00:00Z";
    }
    pendingReview.lifecycleAsOf = "2026-09-04T00:00:00Z";
    seal(pendingReview);
    expect(() => parseRealSourceLifecycleBundle(pendingReview)).not.toThrow();
    const beforeReview = evaluateRealSourceLifecycle(
      pendingReview,
      request(pendingReview, "acquisition", "not_attempted", {
        asOf: "2026-09-03T12:00:00Z",
      }),
    );
    expect(beforeReview.qualificationState).toBe("not_qualified");
    expect(beforeReview.reasonCodes).toContain("REQUIRED_REVIEW_NOT_CURRENT");

    const pendingRisk = activeBundle();
    trimToLifecycleStage(pendingRisk, "admitted");
    const risk = list(pendingRisk, "evidenceReceipts").find(
      ({ id }) => id === "owner-residual-risk-decision",
    )!;
    risk.acceptedAt = "2026-09-04T00:00:00Z";
    const admission = list(pendingRisk, "admissionReceipts")[0]!;
    admission.issuedAt = "2026-09-04T00:00:00Z";
    for (const review of list(pendingRisk, "reviewReceipts").filter(
      ({ subject }) =>
        String(((subject as MutableObject).ref as MutableObject).id) ===
        "federal-register-admission",
    )) {
      review.reviewedAt = "2026-09-04T00:00:00Z";
    }
    pendingRisk.lifecycleAsOf = "2026-09-04T00:00:00Z";
    seal(pendingRisk);
    expect(() => parseRealSourceLifecycleBundle(pendingRisk)).not.toThrow();
    const beforeAcceptance = evaluateRealSourceLifecycle(
      pendingRisk,
      request(pendingRisk, "acquisition", "not_attempted", {
        asOf: "2026-09-03T12:00:00Z",
      }),
    );
    expect(beforeAcceptance.qualificationState).toBe("qualified");
    expect(beforeAcceptance.admissionState).toBe("not_admitted");
  });

  it("rejects partial emission, forged owner review, and expired LKG", () => {
    const partial = activeBundle();
    addFailedAttempt(partial, "partial");
    const partialCoverage = list(partial, "coverageReceipts").at(-1)!;
    (partialCoverage.stages as MutableObject).emitted = 1;
    (partialCoverage.stages as MutableObject).validated = 1;
    (partialCoverage.stages as MutableObject).omitted = 0;
    seal(partial);
    expect(capture(() => parseRealSourceLifecycleBundle(partial)).code).toBe(
      "PARTIAL_EMISSION",
    );

    const forgedReview = activeBundle();
    const review = list(forgedReview, "reviewReceipts")[0]!;
    review.ownerAuthorityRef = ref(
      "authority_receipt",
      "federal-register-service-operator-authority",
    );
    seal(forgedReview);
    expect(
      capture(() => parseRealSourceLifecycleBundle(forgedReview)).code,
    ).toBe("INVALID_AUTHORITY_ROLE");

    const wrongExactOwner = activeBundle();
    list(wrongExactOwner, "authorityReceipts").push(
      reviewerAuthority(
        "alternate-owner-authority",
        "owner_configuration_authority",
      ),
    );
    const activationReview = list(wrongExactOwner, "reviewReceipts").find(
      ({ subject }) =>
        String((subject as MutableObject).kind) === "activation_receipt",
    )!;
    activationReview.ownerAuthorityRef = ref(
      "authority_receipt",
      "alternate-owner-authority",
    );
    seal(wrongExactOwner);
    expect(
      capture(() => parseRealSourceLifecycleBundle(wrongExactOwner)).code,
    ).toBe("OWNER_AUTHORITY_MISMATCH");

    const collapsedReviewerIdentity = activeBundle();
    const ownerIdentity = list(
      collapsedReviewerIdentity,
      "authorityReceipts",
    ).find(({ id }) => id === "owner-local-prerelease-authority")!
      .authorityIdentityRef as MutableObject;
    const reviewerIdentity = list(
      collapsedReviewerIdentity,
      "authorityReceipts",
    ).find(({ id }) => id === "source-evidence-reviewer-authority")!
      .authorityIdentityRef as MutableObject;
    reviewerIdentity.digest = ownerIdentity.digest!;
    seal(collapsedReviewerIdentity);
    expect(
      capture(() => parseRealSourceLifecycleBundle(collapsedReviewerIdentity))
        .code,
    ).toBe("REVIEWER_OWNER_IDENTITY_COLLISION");

    const collapsedSecurityIdentity = activeBundle();
    const sovereigntyIdentity = list(
      collapsedSecurityIdentity,
      "authorityReceipts",
    ).find(({ id }) => id === "sovereignty-reviewer-authority")!
      .authorityIdentityRef as MutableObject;
    const securityIdentity = list(
      collapsedSecurityIdentity,
      "authorityReceipts",
    ).find(({ id }) => id === "security-reviewer-authority")!
      .authorityIdentityRef as MutableObject;
    securityIdentity.digest = sovereigntyIdentity.digest!;
    seal(collapsedSecurityIdentity);
    expect(
      capture(() => parseRealSourceLifecycleBundle(collapsedSecurityIdentity))
        .code,
    ).toBe("AUTHORITY_IDENTITY_COLLISION");

    const expired = activeBundle();
    addFailedAttempt(expired);
    list(expired, "lkgReceipts")[0]!.expiresAt = "2026-09-10T00:00:00Z";
    seal(expired);
    const expiredRequest = request(expired, "acquisition", "failed", {
      asOf: "2026-09-11T00:00:00Z",
      lkg: true,
    });
    const result = evaluateRealSourceLifecycle(expired, expiredRequest);
    expect(result.lkgState).toBe("rejected");
    expect(result.reasonCodes).toContain("LKG_NOT_CURRENT");
  });

  it("keeps all eight coverage stages bounded and non-comprehensive", () => {
    const parsed = parseRealSourceLifecycleBundle(activeBundle());
    const coverage = parsed.coverageReceipts[0]!;
    expect(Object.keys(coverage.stages).sort()).toEqual(
      [
        "attempted",
        "claimed",
        "documented",
        "emitted",
        "omitted",
        "received",
        "selected",
        "validated",
      ].sort(),
    );
    expect(coverage.completeness).toBe("bounded_non_comprehensive");
    expect(coverage.absenceInference).toBe("forbidden");
    expect(coverage.stages.claimed).toBeLessThanOrEqual(
      coverage.stages.emitted,
    );
  });

  it("reconciles every successful, failed, and partial one-document count", () => {
    const attacks: readonly ((bundle: MutableObject) => void)[] = [
      (bundle) => {
        (
          list(bundle, "coverageReceipts")[0]!.stages as MutableObject
        ).received = 0;
      },
      (bundle) => {
        (list(bundle, "coverageReceipts")[0]!.stages as MutableObject).omitted =
          1;
      },
      (bundle) => {
        addFailedAttempt(bundle);
        (
          list(bundle, "coverageReceipts").at(-1)!.stages as MutableObject
        ).selected = 0;
      },
      (bundle) => {
        addFailedAttempt(bundle, "partial");
        (
          list(bundle, "coverageReceipts").at(-1)!.stages as MutableObject
        ).emitted = 1;
      },
    ];
    for (const mutate of attacks) {
      const bundle = activeBundle();
      mutate(bundle);
      seal(bundle);
      expect(capture(() => parseRealSourceLifecycleBundle(bundle)).code).toBe(
        "INVALID_COVERAGE_ALGEBRA",
      );
    }
  });

  it("enforces exact progressive stages and terminal fail-closed states", () => {
    const qualifiedBundle = activeBundle();
    trimToLifecycleStage(qualifiedBundle, "qualified");
    seal(qualifiedBundle);
    const qualified = evaluateRealSourceLifecycle(
      qualifiedBundle,
      request(qualifiedBundle, "acquisition", "not_attempted"),
    );
    expect(qualified.qualificationState).toBe("qualified");
    expect(qualified.admissionState).toBe("not_admitted");

    const admittedBundle = activeBundle();
    trimToLifecycleStage(admittedBundle, "admitted");
    seal(admittedBundle);
    const admitted = evaluateRealSourceLifecycle(
      admittedBundle,
      request(admittedBundle, "acquisition", "not_attempted"),
    );
    expect(admitted.qualificationState).toBe("qualified");
    expect(admitted.admissionState).toBe("admitted");
    expect(admitted.activationState).toBe("inactive");

    const understated = activeBundle();
    understated.lifecycleState = "qualified";
    seal(understated);
    expect(
      capture(() => parseRealSourceLifecycleBundle(understated)).code,
    ).toBe("LIFECYCLE_STAGE_OVERSTATEMENT");

    for (const state of [
      "evidence_blocked",
      "suspended",
      "expired",
      "revoked",
      "retired",
    ]) {
      const terminal = activeBundle();
      terminal.lifecycleState = state;
      seal(terminal);
      const result = evaluateRealSourceLifecycle(
        terminal,
        request(terminal, "acquisition", "successful"),
      );
      expect(result.qualificationState).toBe("not_qualified");
      expect(result.canExecute).toBe(false);
      expect(result.canEmitLocalArtifact).toBe(false);
    }

    const rejected = activeBundle();
    trimToLifecycleStage(rejected, "qualified");
    rejected.lifecycleState = "rejected";
    seal(rejected);
    const rejectedResult = evaluateRealSourceLifecycle(
      rejected,
      request(rejected, "acquisition", "not_attempted"),
    );
    expect(rejectedResult.qualificationState).toBe("not_qualified");
    expect(rejectedResult.canExecute).toBe(false);

    const rejectedAfterAdmission = activeBundle();
    rejectedAfterAdmission.lifecycleState = "rejected";
    seal(rejectedAfterAdmission);
    expect(
      capture(() => parseRealSourceLifecycleBundle(rejectedAfterAdmission))
        .code,
    ).toBe("REJECTED_AFTER_ADMISSION");
  });

  it("requires the complete provider-fact and owner-control closure", () => {
    const attacks: readonly [(bundle: MutableObject) => void, string][] = [
      [
        (bundle) => {
          const qualification = list(bundle, "qualificationReceipts")[0]!;
          qualification.providerFactEvidenceRefs = (
            qualification.providerFactEvidenceRefs as MutableObject[]
          ).filter(({ id }) => id !== "field-meaning-fact");
        },
        "MISSING_PROVIDER_FACT",
      ],
      [
        (bundle) => {
          const qualification = list(bundle, "qualificationReceipts")[0]!;
          qualification.providerFactEvidenceRefs = (
            qualification.providerFactEvidenceRefs as MutableObject[]
          ).filter(({ id }) => id !== "rendition-custody-fact");
        },
        "MISSING_PROVIDER_FACT",
      ],
      [
        (bundle) => {
          const qualification = list(bundle, "qualificationReceipts")[0]!;
          qualification.projectControlEvidenceRefs = (
            qualification.projectControlEvidenceRefs as MutableObject[]
          ).filter(({ id }) => id !== "request-budget-control");
        },
        "MISSING_PROJECT_CONTROL",
      ],
      [
        (bundle) => {
          const control = list(bundle, "evidenceReceipts").find(
            ({ id }) => id === "deployment-scope-control",
          )!;
          control.controlRef = structuredClone(
            (bundle.scope as MutableObject).regionPackRef,
          );
        },
        "PROJECT_CONTROL_SCOPE_MISMATCH",
      ],
      [
        (bundle) => {
          const qualification = list(bundle, "qualificationReceipts")[0]!;
          qualification.unknownEvidenceRefs = (
            qualification.unknownEvidenceRefs as MutableObject[]
          ).filter(({ id }) => id !== "federal-register-api-terms-unknown");
        },
        "UNKNOWN_EVIDENCE_OMITTED",
      ],
      [
        (bundle) => {
          addUnknown(
            bundle,
            "authentication-unknown",
            "authentication_requirement",
          );
          const qualification = list(bundle, "qualificationReceipts")[0]!;
          (qualification.unknownEvidenceRefs as MutableObject[]).push(
            ref("evidence_receipt", "authentication-unknown"),
          );
        },
        "AUTHENTICATION_NOT_CLOSED",
      ],
      [
        (bundle) => {
          const restricted = evidence(
            "credential-required-fact",
            "provider_fact",
            "access_requirement",
          );
          restricted.accessState = "credentials_required";
          list(bundle, "evidenceReceipts").push(restricted);
        },
        "AUTHENTICATION_NOT_CLOSED",
      ],
      [
        (bundle) => {
          const restricted = evidence(
            "incompatible-provider-restriction",
            "provider_fact",
            "affirmative_restriction",
          );
          restricted.accessState = "not_applicable";
          restricted.restrictionState = "incompatible";
          list(bundle, "evidenceReceipts").push(restricted);
        },
        "INCOMPATIBLE_PROVIDER_RESTRICTION",
      ],
      [
        (bundle) => {
          const fact = list(bundle, "evidenceReceipts").find(
            ({ id }) => id === "field-meaning-fact",
          )!;
          fact.accessedAt = "2026-09-04T00:00:00Z";
        },
        "FUTURE_EVIDENCE",
      ],
    ];
    for (const [mutate, expectedCode] of attacks) {
      const bundle = activeBundle();
      mutate(bundle);
      seal(bundle);
      expect(capture(() => parseRealSourceLifecycleBundle(bundle)).code).toBe(
        expectedCode,
      );
    }
  });

  it("requires every digest-bound applicable unknown even if all references are deleted", () => {
    const requiredKinds = (
      (
        (activeBundle().scope as MutableObject)
          .unknownChecklist as MutableObject
      ).requiredUnknownKinds as string[]
    ).slice();
    expect(requiredKinds).toHaveLength(9);
    for (const unknownKind of requiredKinds) {
      const bundle = activeBundle();
      const unknown = list(bundle, "evidenceReceipts").find(
        (receipt) => receipt.unknownKind === unknownKind,
      )!;
      const unknownId = String(unknown.id);
      bundle.evidenceReceipts = list(bundle, "evidenceReceipts").filter(
        ({ id }) => id !== unknownId,
      );
      const qualification = list(bundle, "qualificationReceipts")[0]!;
      qualification.unknownEvidenceRefs = (
        qualification.unknownEvidenceRefs as MutableObject[]
      ).filter(({ id }) => id !== unknownId);
      const risk = list(bundle, "evidenceReceipts").find(
        ({ id }) => id === "owner-residual-risk-decision",
      )!;
      risk.unknownEvidenceRefs = (
        risk.unknownEvidenceRefs as MutableObject[]
      ).filter(({ id }) => id !== unknownId);
      seal(bundle);
      expect(capture(() => parseRealSourceLifecycleBundle(bundle)).code).toBe(
        "INCOMPLETE_UNKNOWN_CHECKLIST",
      );
    }
  });

  it("binds residual risk to every exact owner-risk unknown and exact scope", () => {
    const laundering = activeBundle();
    const launderingRisk = list(laundering, "evidenceReceipts").find(
      ({ id }) => id === "owner-residual-risk-decision",
    )!;
    launderingRisk.unknownEvidenceRefs = (
      launderingRisk.unknownEvidenceRefs as MutableObject[]
    ).filter(({ id }) => id !== "federal-register-api-terms-unknown");
    seal(laundering);
    expect(capture(() => parseRealSourceLifecycleBundle(laundering)).code).toBe(
      "MISSING_RESIDUAL_RISK_ACCEPTANCE",
    );

    const wrongEvidence = activeBundle();
    const risk = list(wrongEvidence, "evidenceReceipts").find(
      ({ id }) => id === "owner-residual-risk-decision",
    )!;
    risk.unknownEvidenceRefs = [
      ref("evidence_receipt", "field-allowlist-control"),
    ];
    seal(wrongEvidence);
    expect(
      capture(() => parseRealSourceLifecycleBundle(wrongEvidence)).code,
    ).toBe("RISK_EVIDENCE_MISMATCH");

    const widenedScope = activeBundle();
    const widenedRisk = list(widenedScope, "evidenceReceipts").find(
      ({ id }) => id === "owner-residual-risk-decision",
    )!;
    (widenedRisk.riskScope as MutableObject).hosts = ["other.example"];
    seal(widenedScope);
    expect(
      capture(() => parseRealSourceLifecycleBundle(widenedScope)).code,
    ).toBe("CROSS_SCOPE_REFERENCE");

    const widenedMethod = activeBundle();
    const methodRisk = list(widenedMethod, "evidenceReceipts").find(
      ({ id }) => id === "owner-residual-risk-decision",
    )!;
    (methodRisk.riskScope as MutableObject).methods = ["GET", "HEAD"];
    seal(widenedMethod);
    expect(
      capture(() => parseRealSourceLifecycleBundle(widenedMethod)).code,
    ).toBe("CROSS_SCOPE_REFERENCE");

    const launderedLimitation = activeBundle();
    const privacyUnknown = list(launderedLimitation, "evidenceReceipts").find(
      ({ id }) => id === "federal-register-api-privacy-unknown",
    )!;
    privacyUnknown.limitationCode = "fail_closed_on_drift";
    seal(launderedLimitation);
    expect(
      capture(() => parseRealSourceLifecycleBundle(launderedLimitation)).code,
    ).toBe("UNKNOWN_LIMITATION_MISMATCH");

    const weakReview = activeBundle();
    const weakPrivacyUnknown = list(weakReview, "evidenceReceipts").find(
      ({ id }) => id === "federal-register-api-privacy-unknown",
    )!;
    weakPrivacyUnknown.resolution = "not_observed";
    seal(weakReview);
    expect(capture(() => parseRealSourceLifecycleBundle(weakReview)).code).toBe(
      "RISK_EVIDENCE_MISMATCH",
    );

    const wrongUnknownKind = activeBundle();
    const wrongKindRisk = list(wrongUnknownKind, "evidenceReceipts").find(
      ({ id }) => id === "owner-residual-risk-decision",
    )!;
    (wrongKindRisk.unknownEvidenceRefs as MutableObject[]).push(
      ref("evidence_receipt", "federal-register-numeric-rate-limit-unknown"),
    );
    seal(wrongUnknownKind);
    expect(
      capture(() => parseRealSourceLifecycleBundle(wrongUnknownKind)).code,
    ).toBe("RISK_EVIDENCE_MISMATCH");
  });

  it("accepts only the exact fail-closed limitation for each non-risk unknown", () => {
    expect(() => parseRealSourceLifecycleBundle(activeBundle())).not.toThrow();
    for (const [unknownKind, limitationCode] of [
      ["numeric_rate_limit", "serial_bounded_requests_only"],
      ["paging_stability", "closed_selection_no_completeness"],
      ["snapshot_stability", "closed_selection_no_completeness"],
      ["retry_backoff", "no_automatic_retry"],
      ["formal_response_error_schema", "parser_fail_closed"],
      ["service_level", "no_availability_promise"],
      ["change_notice", "fail_closed_on_drift"],
    ] as const) {
      const bundle = activeBundle();
      const unknown = list(bundle, "evidenceReceipts").find(
        (receipt) => receipt.unknownKind === unknownKind,
      )!;
      expect(unknown.limitationCode).toBe(limitationCode);
      unknown.limitationCode = "owner_risk_acceptance_required";
      seal(bundle);
      expect(capture(() => parseRealSourceLifecycleBundle(bundle)).code).toBe(
        "UNKNOWN_LIMITATION_MISMATCH",
      );
    }
  });

  it("rejects every future decisive dependency in the lifecycle chain", () => {
    const chronologyAttacks: readonly ((bundle: MutableObject) => void)[] = [
      (bundle) => {
        list(bundle, "admissionReceipts")[0]!.issuedAt = "2026-09-02T00:00:00Z";
      },
      (bundle) => {
        const risk = list(bundle, "evidenceReceipts").find(
          ({ id }) => id === "owner-residual-risk-decision",
        )!;
        risk.acceptedAt = "2026-09-04T00:00:00Z";
      },
      (bundle) => {
        list(bundle, "activationReceipts")[0]!.issuedAt =
          "2026-09-02T00:00:00Z";
      },
      (bundle) => {
        list(bundle, "bindingReceipts")[0]!.issuedAt = "2026-09-02T00:00:00Z";
      },
      (bundle) => {
        list(bundle, "artifactEligibilityReceipts")[0]!.issuedAt =
          "2026-09-02T00:00:00Z";
      },
      (bundle) => {
        const grant = list(bundle, "operationGrants").find(
          ({ id }) => id === "acquisition-grant",
        )!;
        grant.issuedAt = "2026-09-04T00:00:00Z";
        for (const review of list(bundle, "reviewReceipts").filter(
          ({ subject }) =>
            String(((subject as MutableObject).ref as MutableObject).id) ===
            "acquisition-grant",
        )) {
          review.reviewedAt = "2026-09-04T00:00:00Z";
        }
      },
    ];
    for (const mutate of chronologyAttacks) {
      const bundle = activeBundle();
      mutate(bundle);
      seal(bundle);
      expect(capture(() => parseRealSourceLifecycleBundle(bundle)).code).toBe(
        "FUTURE_DECISIVE_REFERENCE",
      );
    }

    const earlyHealth = activeBundle();
    const acquisitionHealth = list(earlyHealth, "healthReceipts").find(
      ({ healthScope }) => healthScope === "acquisition_operation",
    )!;
    acquisitionHealth.observedAt = "2026-09-04T00:00:00Z";
    seal(earlyHealth);
    expect(
      capture(() => parseRealSourceLifecycleBundle(earlyHealth)).code,
    ).toBe("HEALTH_PRECEDES_COVERAGE");

    const earlyLkg = activeBundle();
    list(earlyLkg, "lkgReceipts")[0]!.createdAt = "2026-09-04T00:00:00Z";
    seal(earlyLkg);
    expect(capture(() => parseRealSourceLifecycleBundle(earlyLkg)).code).toBe(
      "LKG_PRECEDES_BOUND_EVIDENCE",
    );

    const earlyCoverage = activeBundle();
    for (const review of list(earlyCoverage, "reviewReceipts").filter(
      ({ subject }) =>
        String(((subject as MutableObject).ref as MutableObject).id) ===
        "federal-register-binding",
    )) {
      review.reviewedAt = "2026-09-06T00:00:00Z";
    }
    const artifact = list(earlyCoverage, "artifactEligibilityReceipts")[0]!;
    artifact.issuedAt = "2026-09-06T00:00:00Z";
    for (const review of list(earlyCoverage, "reviewReceipts").filter(
      ({ subject }) =>
        String(((subject as MutableObject).ref as MutableObject).id) ===
        "federal-register-local-artifact-eligibility",
    )) {
      review.reviewedAt = "2026-09-06T00:00:00Z";
    }
    seal(earlyCoverage);
    expect(
      capture(() => parseRealSourceLifecycleBundle(earlyCoverage)).code,
    ).toBe("COVERAGE_PRECEDES_ACTIVE_CHAIN");

    const staleChainAtCoverage = activeBundle();
    const qualificationReview = list(
      staleChainAtCoverage,
      "reviewReceipts",
    ).find(
      ({ id }) =>
        id === "review-federal-register-qualification-source-contract-0",
    )!;
    qualificationReview.expiresAt = "2026-09-05T00:00:00Z";
    seal(staleChainAtCoverage);
    expect(
      capture(() => parseRealSourceLifecycleBundle(staleChainAtCoverage)).code,
    ).toBe("COVERAGE_PRECEDES_ACTIVE_CHAIN");
  });

  it("requires health and LKG owner authority across both temporal endpoints", () => {
    const healthBundle = activeBundle();
    const healthOwner = reviewerAuthority(
      "health-late-owner-authority",
      "owner_configuration_authority",
    );
    healthOwner.issuedAt = "2026-09-04T00:00:00Z";
    list(healthBundle, "authorityReceipts").push(healthOwner);
    list(healthBundle, "healthReceipts")[0]!.issuedByAuthorityRef = ref(
      "authority_receipt",
      "health-late-owner-authority",
    );
    seal(healthBundle);
    expect(
      capture(() => parseRealSourceLifecycleBundle(healthBundle)).code,
    ).toBe("AUTHORITY_NOT_CURRENT_AT_EVENT");

    const observedHealthBundle = activeBundle();
    const observedHealthOwner = reviewerAuthority(
      "health-expired-owner-authority",
      "owner_configuration_authority",
    );
    observedHealthOwner.expiresAt = "2026-09-05T00:00:00Z";
    list(observedHealthBundle, "authorityReceipts").push(observedHealthOwner);
    list(observedHealthBundle, "healthReceipts")[0]!.issuedByAuthorityRef = ref(
      "authority_receipt",
      "health-expired-owner-authority",
    );
    seal(observedHealthBundle);
    expect(
      capture(() => parseRealSourceLifecycleBundle(observedHealthBundle)).code,
    ).toBe("AUTHORITY_NOT_CURRENT_AT_EVENT");

    const lkgBundle = activeBundle();
    const lkgOwner = reviewerAuthority(
      "lkg-late-owner-authority",
      "owner_configuration_authority",
    );
    lkgOwner.issuedAt = "2026-09-04T00:00:00Z";
    list(lkgBundle, "authorityReceipts").push(lkgOwner);
    const lkg = list(lkgBundle, "lkgReceipts")[0]!;
    lkg.issuedByAuthorityRef = ref(
      "authority_receipt",
      "lkg-late-owner-authority",
    );
    for (const review of list(lkgBundle, "reviewReceipts").filter(
      ({ subject }) =>
        String((subject as MutableObject).kind) === "lkg_receipt",
    )) {
      review.ownerAuthorityRef = ref(
        "authority_receipt",
        "lkg-late-owner-authority",
      );
    }
    seal(lkgBundle);
    expect(capture(() => parseRealSourceLifecycleBundle(lkgBundle)).code).toBe(
      "AUTHORITY_NOT_CURRENT_AT_EVENT",
    );

    const validatedLkgBundle = activeBundle();
    const validatedLkgOwner = reviewerAuthority(
      "lkg-expired-owner-authority",
      "owner_configuration_authority",
    );
    validatedLkgOwner.expiresAt = "2026-09-05T00:00:00Z";
    list(validatedLkgBundle, "authorityReceipts").push(validatedLkgOwner);
    const validatedLkg = list(validatedLkgBundle, "lkgReceipts")[0]!;
    validatedLkg.issuedByAuthorityRef = ref(
      "authority_receipt",
      "lkg-expired-owner-authority",
    );
    for (const review of list(validatedLkgBundle, "reviewReceipts").filter(
      ({ subject }) =>
        String((subject as MutableObject).kind) === "lkg_receipt",
    )) {
      review.ownerAuthorityRef = ref(
        "authority_receipt",
        "lkg-expired-owner-authority",
      );
    }
    seal(validatedLkgBundle);
    expect(
      capture(() => parseRealSourceLifecycleBundle(validatedLkgBundle)).code,
    ).toBe("AUTHORITY_NOT_CURRENT_AT_EVENT");
  });

  it("binds each provider fact to a compatible authority at access and evaluation", () => {
    const bundle = activeBundle();
    const provider = list(bundle, "authorityReceipts").find(
      ({ id }) => id === "federal-register-service-operator-authority",
    )!;
    provider.expiresAt = "2026-09-06T00:00:00Z";
    seal(bundle);
    const result = evaluateRealSourceLifecycle(
      bundle,
      request(bundle, "acquisition", "successful"),
    );
    expect(result.qualificationState).toBe("not_qualified");
    expect(result.reasonCodes).toContain("PROVIDER_AUTHORITY_NOT_CURRENT");
    expect(result.canExecute).toBe(false);

    const beforeAuthority = activeBundle();
    const notYetAuthoritative = list(beforeAuthority, "authorityReceipts").find(
      ({ id }) => id === "federal-register-service-operator-authority",
    )!;
    notYetAuthoritative.issuedAt = "2026-09-04T00:00:00Z";
    seal(beforeAuthority);
    expect(
      capture(() => parseRealSourceLifecycleBundle(beforeAuthority)).code,
    ).toBe("AUTHORITY_NOT_CURRENT_AT_EVENT");

    const serviceRights = activeBundle();
    const reproductionFact = list(serviceRights, "evidenceReceipts").find(
      ({ id }) => id === "reproduction-right-fact",
    )!;
    reproductionFact.authorityReceiptRef = ref(
      "authority_receipt",
      "federal-register-service-operator-authority",
    );
    seal(serviceRights);
    expect(
      capture(() => parseRealSourceLifecycleBundle(serviceRights)).code,
    ).toBe("INVALID_AUTHORITY_ROLE");

    const issuingAccess = activeBundle();
    list(issuingAccess, "authorityReceipts").push(
      reviewerAuthority(
        "federal-register-issuing-agency-authority",
        "issuing_agency",
      ),
    );
    const accessFact = list(issuingAccess, "evidenceReceipts").find(
      ({ id }) => id === "access-requirement-fact",
    )!;
    accessFact.authorityReceiptRef = ref(
      "authority_receipt",
      "federal-register-issuing-agency-authority",
    );
    seal(issuingAccess);
    expect(
      capture(() => parseRealSourceLifecycleBundle(issuingAccess)).code,
    ).toBe("INVALID_AUTHORITY_ROLE");
  });

  it("allows shared provider identity without inventing a document-specific issuer claim", () => {
    const bundle = activeBundle();
    const authorities = list(bundle, "authorityReceipts");
    const publisher = authorities.find(
      ({ id }) => id === "federal-register-originating-publisher-authority",
    )!;
    const providerIdentity = structuredClone(publisher.authorityIdentityRef);
    for (const authorityId of ["federal-register-service-operator-authority"]) {
      authorities.find(({ id }) => id === authorityId)!.authorityIdentityRef =
        structuredClone(providerIdentity);
    }
    const custodian = reviewerAuthority(
      "federal-register-official-edition-custodian-authority",
      "official_edition_custodian",
    );
    custodian.authorityIdentityRef = structuredClone(providerIdentity);
    authorities.push(custodian);
    list(bundle, "evidenceReceipts").find(
      ({ id }) => id === "rendition-custody-fact",
    )!.authorityReceiptRef = ref(
      "authority_receipt",
      "federal-register-official-edition-custodian-authority",
    );
    seal(bundle);

    const parsed = parseRealSourceLifecycleBundle(bundle);
    expect(
      parsed.evidenceReceipts.flatMap((evidence) =>
        evidence.evidenceClass === "provider_fact" ? [evidence.factKind] : [],
      ),
    ).not.toContain("issuing_agency_identity");
    expect(
      evaluateRealSourceLifecycle(
        parsed,
        request(bundle, "acquisition", "successful"),
      ).qualificationState,
    ).toBe("qualified");

    const inventedIssuer = activeBundle();
    list(inventedIssuer, "evidenceReceipts").push(
      evidence(
        "invented-document-issuer",
        "provider_fact",
        "issuing_agency_identity",
      ),
    );
    seal(inventedIssuer);
    expect(
      capture(() => parseRealSourceLifecycleBundle(inventedIssuer)).code,
    ).toBe("INVALID_ENUM");
  });

  it("rejects one authority identity id and version resolving to different bytes", () => {
    const bundle = activeBundle();
    const authorities = list(bundle, "authorityReceipts");
    const ownerIdentity = authorities.find(
      ({ id }) => id === "owner-local-prerelease-authority",
    )!.authorityIdentityRef as MutableObject;
    const sovereigntyIdentity = authorities.find(
      ({ id }) => id === "sovereignty-reviewer-authority",
    )!.authorityIdentityRef as MutableObject;
    sovereigntyIdentity.id = ownerIdentity.id!;
    sovereigntyIdentity.version = ownerIdentity.version!;
    sovereigntyIdentity.digest = digest("different-sovereignty-identity-bytes");
    seal(bundle);

    expect(capture(() => parseRealSourceLifecycleBundle(bundle)).code).toBe(
      "INCONSISTENT_DIGESTED_REFERENCE",
    );
  });

  it("preserves historical authority validity but not post-supersession usability", () => {
    const bundle = activeBundle();
    const predecessor = list(bundle, "authorityReceipts").find(
      ({ id }) => id === "federal-register-service-operator-authority",
    )!;
    predecessor.state = "superseded";
    predecessor.supersededBy = ref(
      "authority_receipt",
      "federal-register-service-operator-authority-v2",
    );
    const successor = reviewerAuthority(
      "federal-register-service-operator-authority-v2",
      "service_operator",
    );
    successor.issuedAt = "2026-09-06T00:00:00Z";
    list(bundle, "authorityReceipts").push(successor);
    seal(bundle);

    const historical = evaluateRealSourceLifecycle(
      bundle,
      request(bundle, "acquisition", "successful", {
        asOf: "2026-09-05T12:00:00Z",
      }),
    );
    expect(historical.qualificationState).toBe("qualified");
    expect(historical.canExecute).toBe(true);

    const afterSupersession = evaluateRealSourceLifecycle(
      bundle,
      request(bundle, "acquisition", "successful", {
        asOf: "2026-09-06T00:00:00Z",
      }),
    );
    expect(afterSupersession.qualificationState).toBe("not_qualified");
    expect(afterSupersession.reasonCodes).toContain(
      "PROVIDER_AUTHORITY_NOT_CURRENT",
    );
    expect(afterSupersession.canExecute).toBe(false);
  });

  it("requires exact attempted coverage, operation, and normalized revision", () => {
    const arbitraryRevision = activeBundle();
    const arbitraryRequest = request(
      arbitraryRevision,
      "acquisition",
      "successful",
    ) as unknown as MutableObject;
    (arbitraryRequest.currentRevisionRef as MutableObject).digest =
      digest("unbound-revision");
    expect(
      capture(() =>
        evaluateRealSourceLifecycle(
          arbitraryRevision,
          arbitraryRequest as never,
        ),
      ).code,
    ).toBe("CURRENT_REVISION_MISMATCH");

    const noCoverage = activeBundle();
    list(noCoverage, "coverageReceipts").length = 0;
    list(noCoverage, "healthReceipts").length = 0;
    list(noCoverage, "lkgReceipts").length = 0;
    removeReceiptsForKinds(
      noCoverage,
      new Set(["coverage_receipt", "health_receipt", "lkg_receipt"]),
    );
    seal(noCoverage);
    expect(
      capture(() =>
        evaluateRealSourceLifecycle(
          noCoverage,
          request(noCoverage, "acquisition", "failed"),
        ),
      ).code,
    ).toBe("MISSING_CURRENT_COVERAGE");

    const crossOperation = activeBundle();
    list(crossOperation, "coverageReceipts")[0]!.operation =
      "documentation_review";
    list(crossOperation, "lkgReceipts").length = 0;
    removeReceiptsForKinds(crossOperation, new Set(["lkg_receipt"]));
    seal(crossOperation);
    expect(
      capture(() =>
        evaluateRealSourceLifecycle(
          crossOperation,
          request(crossOperation, "acquisition", "successful"),
        ),
      ).code,
    ).toBe("COVERAGE_CHAIN_MISMATCH");

    const poisonedLkg = activeBundle();
    list(poisonedLkg, "coverageReceipts")[0]!.operation =
      "documentation_review";
    seal(poisonedLkg);
    expect(
      capture(() => parseRealSourceLifecycleBundle(poisonedLkg)).code,
    ).toBe("COVERAGE_CHAIN_MISMATCH");

    const wrongPlan = activeBundle();
    list(wrongPlan, "coverageReceipts")[0]!.requestDigest = digest(
      "different-request-plan",
    );
    seal(wrongPlan);
    expect(capture(() => parseRealSourceLifecycleBundle(wrongPlan)).code).toBe(
      "COVERAGE_CHAIN_MISMATCH",
    );

    const wrongGrantPlan = activeBundle();
    list(wrongGrantPlan, "operationGrants").find(
      ({ id }) => id === "acquisition-grant",
    )!.requestPlanRef = {
      id: "federal-register-document-request-plan",
      version: "1.0.0",
      digest: digest("substituted-request-plan"),
    };
    seal(wrongGrantPlan);
    expect(
      capture(() => parseRealSourceLifecycleBundle(wrongGrantPlan)).code,
    ).toBe("REQUEST_PLAN_MISMATCH");
  });

  it("requires current failure health before any LKG fallback", () => {
    for (const removedHealthId of [
      "failed-source-contract",
      "failed-selected-range",
    ]) {
      const bundle = activeBundle();
      addFailedAttempt(bundle);
      bundle.healthReceipts = list(bundle, "healthReceipts").filter(
        ({ id }) => id !== removedHealthId,
      );
      seal(bundle);
      const result = evaluateRealSourceLifecycle(
        bundle,
        request(bundle, "acquisition", "failed", {
          asOf: "2026-09-11T00:00:00Z",
          lkg: true,
        }),
      );
      expect(result.lkgState, removedHealthId).toBe("rejected");
      expect(result.canEmitLocalArtifact, removedHealthId).toBe(false);
      expect(result.reasonCodes, removedHealthId).toContain(
        "HEALTH_NOT_CURRENT",
      );
    }

    const unhealthyCreation = activeBundle();
    const selectedHealth = list(unhealthyCreation, "healthReceipts").find(
      ({ healthScope }) => healthScope === "selected_range",
    )!;
    selectedHealth.state = "degraded";
    seal(unhealthyCreation);
    expect(
      capture(() => parseRealSourceLifecycleBundle(unhealthyCreation)).code,
    ).toBe("LKG_HEALTH_NOT_CURRENT");
  });

  it("rechecks an honestly dated aggregate lifecycle state at later evaluation", () => {
    const bundle = activeBundle();
    expect(bundle.lifecycleAsOf).toBe(ISSUED);
    const later = evaluateRealSourceLifecycle(
      bundle,
      request(bundle, "acquisition", "successful", {
        asOf: "2026-12-01T00:00:00Z",
      }),
    );
    expect(later.qualificationState).toBe("not_qualified");
    expect(later.admissionState).toBe("not_admitted");
    expect(later.activationState).toBe("inactive");
    expect(later.bindingState).toBe("unbound");
    expect(later.canExecute).toBe(false);
    expect(later.canEmitLocalArtifact).toBe(false);

    const overclaim = activeBundle();
    trimToLifecycleStage(overclaim, "qualified");
    list(overclaim, "qualificationReceipts")[0]!.expiresAt =
      "2026-09-04T00:00:00Z";
    overclaim.lifecycleAsOf = "2026-09-05T00:00:00Z";
    seal(overclaim);
    expect(capture(() => parseRealSourceLifecycleBundle(overclaim)).code).toBe(
      "UNSUPPORTED_LIFECYCLE_CLAIM",
    );
  });
});
