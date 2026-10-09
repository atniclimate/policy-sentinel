// Module manifest and exact compatibility-facade contracts (GD-10).
//
// Declares the module membership model from
// docs/architecture/module-boundaries.md sections 2-6 and 9, as amended by
// docs/architecture/general-development-addendum-2026-09-22.md section 2.
// This file preserves module membership while enforcing pure implementation
// dependencies and explicitly reviewed compatibility facades.
//
// The manifest classifies the four new prefixes (`src/modules/intake/`,
// `src/modules/context/`, `src/modules/output/`, `src/modules/private/`) and
// `src/core/` by prefix, so later steps add files under them without editing
// this file. Existing cohesive directories and individual in-place files are
// listed explicitly, exactly as design sections 3-6 and addendum section 2
// name them.

/** @typedef {"core"|"intake"|"context"|"output"|"private"} ModuleName */

export const MODULES = Object.freeze([
  "core",
  "intake",
  "context",
  "output",
  "private",
]);

// Directories that stay outside every module (design section 2, "Outside
// every module"; K0/S0 convergence gates; src/knowledge is repository
// tooling). schemas/experimental belongs to S0 (pinned by the S0 test),
// not to core's generic schemas/** rule.
const OUTSIDE_MODULE_PREFIXES = Object.freeze([
  "src/kernel",
  "src/experimental",
  "src/knowledge",
  "schemas/experimental",
]);

// Composition roots (design section 2 diagram): scripts/*.mjs and
// src/main.tsx. They may import any module's public entry.
export const COMPOSITION_ROOT_PATHS = Object.freeze([
  "src/main.tsx",
  "scripts/configured-engine.ts",
  "scripts/configured-source-refresh.ts",
  "scripts/source-pack.ts",
]);

export const COMPOSITION_DECLARATION_PATHS = Object.freeze([
  "scripts/configured-analyzed-corpus.d.mts",
  "scripts/configured-source-catalog.d.mts",
]);

// The private-context seam (Makah groundwork), kept in place by owner
// ruling and classified as module `private` from the start (addendum
// section 2). New private-module code goes under src/modules/private/.
export const PRIVATE_MODULE_FILES = Object.freeze([
  "src/engine/land-boundary-contracts.ts",
  "src/engine/land-parcel-contracts.ts",
  "src/engine/parcel-query.ts",
  "src/engine/authorized-private-context-adapter.ts",
  "src/engine/citation-export-contracts.ts",
]);
const PRIVATE_MODULE_PREFIXES = Object.freeze(["src/modules/private"]);

// The barrel that re-exports the private seam. It is not itself assigned to
// a module (nothing outside the private files imports it today), but the
// public-entry reachability rule treats it as a forbidden target in its own
// right, exactly as the seam files are.
export const PRIVATE_BARREL_PATH = "src/engine/index.ts";

// Entry points for the public-entry reachability rule (addendum section 2).
export const PUBLIC_ENTRY_PATHS = Object.freeze([
  "src/main.tsx",
  "scripts/build-synthetic-artifact.mjs",
]);

// Core (design section 3): shared, pure, no I/O.
const CORE_FILES = Object.freeze([
  "src/shared/contracts.ts",
  "src/engine/contracts.ts",
  "src/pipeline/identity.mjs",
  "src/pipeline/hashing.mjs",
  "src/pipeline/policy-validation.mjs",
  "src/pipeline/policy-validation.d.mts",
  "src/pipeline/source-registry.mjs",
  "src/pipeline/source-registry.d.mts",
  "src/pipeline/analyzed-corpus.mjs",
  "src/pipeline/analyzed-corpus.d.mts",
  "src/pipeline/analyzed-corpus-v2.mjs",
  "src/pipeline/analyzed-corpus-v2.d.mts",
  "src/pipeline/policy-assurance.mjs",
]);
const CORE_PREFIXES = Object.freeze(["src/core", "schemas"]);

// Module 1: intake (design section 4).
const INTAKE_FILES = Object.freeze([
  "src/pipeline/source-adapter.ts",
  "src/pipeline/policy-custody.mjs",
  "src/pipeline/corpus-store.mjs",
  "src/pipeline/policy-text.mjs",
  "src/pipeline/policy-text.d.mts",
  "src/pipeline/policy-corpus-builder.mjs",
  "src/pipeline/policy-corpus-builder.d.mts",
  "src/pipeline/curated-document-pack.mjs",
  "src/pipeline/synthetic-corpus-path.mjs",
  "src/engine/source-pack.ts",
  "src/engine/source-pack-contracts.ts",
  "src/engine/real-source-lifecycle.ts",
  "src/engine/real-source-lifecycle-contracts.ts",
  "config/sources.v1.json",
  "config/policy-sources.v2.mjs",
  "config/policy-text-selections.mjs",
  "config/local-corpus.v1.mjs",
]);
const INTAKE_PREFIXES = Object.freeze([
  "src/modules/intake",
  "src/adapters",
  "src/contracts",
]);

// Module 2: geographic and context association (design section 5).
const CONTEXT_FILES = Object.freeze([
  "src/engine/geography-rights.ts",
  "src/engine/geography-rights-contracts.ts",
  "src/engine/taxonomy.ts",
  "src/engine/taxonomy-contracts.ts",
  "src/engine/identity-authority-scenarios.ts",
  "src/engine/identity-authority-scenarios-contracts.ts",
  "src/engine/temporal-operations.mjs",
  "src/engine/temporal-operations.d.mts",
  "src/pipeline/nation-collection-policy.mjs",
  "src/pipeline/nation-collection-policy.d.mts",
  "config/taxonomy.v1.json",
  "config/policy-gold.v1.mjs",
]);
const CONTEXT_PREFIXES = Object.freeze(["src/modules/context"]);

// Module 3: output and formatting (design section 6). The addendum splits
// this module into output/local (may import private) and output/public
// (must never reach private; enforced by the reachability rule). Today's
// in-place members are the retained public app and artifact build; no
// existing file is a local-workbench file yet (that split happens in
// GD-06). The local-workbench prefix is declared here so later steps add
// files under it without editing this manifest.
const OUTPUT_FILES = Object.freeze([
  "src/main.tsx",
  "src/pipeline/artifact.mjs",
  "src/pipeline/artifact.d.mts",
  "src/pipeline/artifact-health.mjs",
  "src/pipeline/last-known-good.mjs",
  "src/pipeline/last-known-good.d.mts",
  "src/engine/projection.ts",
  "src/engine/policy-search.mjs",
  "src/engine/policy-search.d.mts",
]);
const OUTPUT_PREFIXES = Object.freeze(["src/modules/output", "src/app"]);
const OUTPUT_LOCAL_PREFIXES = Object.freeze([
  "src/modules/output/local-workbench",
]);

function normalizeRepoPath(repoPath) {
  return repoPath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function withinPrefix(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function withinAnyPrefix(path, prefixes) {
  return prefixes.some((prefix) => withinPrefix(path, prefix));
}

/**
 * True for src/kernel/**, src/experimental/**, src/knowledge/** and
 * schemas/experimental/**: outside every module, by design.
 * @param {string} repoPath
 * @returns {boolean}
 */
export function isOutsideEveryModule(repoPath) {
  return withinAnyPrefix(normalizeRepoPath(repoPath), OUTSIDE_MODULE_PREFIXES);
}

/**
 * True for scripts/*.mjs (any depth) and src/main.tsx: composition roots
 * may import any module's public entry (design section 2).
 * @param {string} repoPath
 * @returns {boolean}
 */
export function isCompositionRoot(repoPath) {
  const normalized = normalizeRepoPath(repoPath);
  return (
    COMPOSITION_ROOT_PATHS.includes(normalized) ||
    (withinPrefix(normalized, "scripts") && normalized.endsWith(".mjs"))
  );
}

/** @param {string} repoPath @returns {boolean} */
export function isCompositionDeclaration(repoPath) {
  return COMPOSITION_DECLARATION_PATHS.includes(normalizeRepoPath(repoPath));
}

/**
 * True for the five named private-context seam files and anything under
 * src/modules/private/.
 * @param {string} repoPath
 * @returns {boolean}
 */
export function isPrivateModuleFile(repoPath) {
  const normalized = normalizeRepoPath(repoPath);
  return (
    PRIVATE_MODULE_FILES.includes(normalized) ||
    withinAnyPrefix(normalized, PRIVATE_MODULE_PREFIXES)
  );
}

/**
 * True only for src/engine/index.ts, the barrel that re-exports the
 * private seam. Never allowlisted as a reachability-rule target.
 * @param {string} repoPath
 * @returns {boolean}
 */
export function isPrivateBarrel(repoPath) {
  return normalizeRepoPath(repoPath) === PRIVATE_BARREL_PATH;
}

/**
 * True for anything the public-entry reachability rule forbids: a private
 * module file, the private barrel, or any src/modules/private/ file.
 * @param {string} repoPath
 * @returns {boolean}
 */
export function isForbiddenFromPublicEntry(repoPath) {
  return isPrivateModuleFile(repoPath) || isPrivateBarrel(repoPath);
}

/**
 * Classifies a repository-relative path into a module, or returns null when
 * the path is outside every module or is not (yet) a declared module
 * member. Only classified-to-classified edges are subject to the
 * dependency rule.
 * @param {string} repoPath
 * @returns {ModuleName | null}
 */
export function moduleOf(repoPath) {
  const path = normalizeRepoPath(repoPath);

  if (isOutsideEveryModule(path)) {
    return null;
  }
  if (isPrivateModuleFile(path)) {
    return "private";
  }
  if (isPrivateBarrel(path)) {
    return null;
  }
  if (CORE_FILES.includes(path) || withinAnyPrefix(path, CORE_PREFIXES)) {
    return "core";
  }
  if (INTAKE_FILES.includes(path) || withinAnyPrefix(path, INTAKE_PREFIXES)) {
    return "intake";
  }
  if (CONTEXT_FILES.includes(path) || withinAnyPrefix(path, CONTEXT_PREFIXES)) {
    return "context";
  }
  if (OUTPUT_FILES.includes(path) || withinAnyPrefix(path, OUTPUT_PREFIXES)) {
    return "output";
  }
  return null;
}

/**
 * True when a classified `output` file sits under the reserved
 * local-workbench prefix, which addendum section 2 permits to import
 * `private`. No existing file matches this prefix yet (GD-06 moves the
 * local-workbench code there); it is declared for later steps.
 * @param {string} repoPath
 * @returns {boolean}
 */
export function isOutputLocalWorkbenchPath(repoPath) {
  return withinAnyPrefix(normalizeRepoPath(repoPath), OUTPUT_LOCAL_PREFIXES);
}

const ALLOWED_TARGET_MODULES = Object.freeze({
  core: Object.freeze(["core"]),
  intake: Object.freeze(["core", "intake"]),
  context: Object.freeze(["core", "context"]),
  output: Object.freeze(["core", "context", "output"]),
  private: Object.freeze(["core", "context", "private"]),
});

/**
 * The dependency rule (design section 2 rules 1-4; addendum section 2
 * rules 1-4 for `private`). An edge whose source or target is unclassified
 * is not evaluated: the general boundary rule only governs declared module
 * members. An `output` file under the reserved local-workbench prefix may
 * additionally import `private` (addendum section 2, rule 2).
 * @param {{fromModule: ModuleName | null, fromPath: string, toModule: ModuleName | null}} edge
 * @returns {boolean}
 */
export function isAllowedModuleEdge({ fromModule, fromPath, toModule }) {
  if (fromModule === null || toModule === null) {
    return true;
  }
  if (
    fromModule === "output" &&
    toModule === "private" &&
    isOutputLocalWorkbenchPath(fromPath)
  ) {
    return true;
  }
  return ALLOWED_TARGET_MODULES[fromModule].includes(toModule);
}

/**
 * @param {string} target
 * @param {readonly string[]} names
 * @param {boolean} typeOnly
 * @returns {ReadonlyArray<{readonly target: string, readonly resolvedTargets: readonly string[], readonly importedName: string, readonly exportedName: string, readonly typeOnly: boolean}>}
 */
function bindings(target, names, typeOnly) {
  const declarationTargets = {
    "src/core/analyzed-corpus.mjs": "src/core/analyzed-corpus.d.mts",
    "scripts/configured-analyzed-corpus.mjs":
      "scripts/configured-analyzed-corpus.d.mts",
    "src/adapters/federal-register/tier1-contract.mjs":
      "src/adapters/federal-register/tier1-contract.d.mts",
  };
  const declaration = declarationTargets[target];
  const resolvedTargets = Object.freeze(
    declaration ? [target, declaration].sort() : [target],
  );
  return names.map((name) =>
    Object.freeze({
      target,
      resolvedTargets,
      importedName: name,
      exportedName: name,
      typeOnly,
    }),
  );
}

/** Frozen named exports from 84cf62c; changing a facade cannot widen its lease. */
export const LEGACY_FACADE_BINDINGS = Object.freeze({
  "src/pipeline/analyzed-corpus.mjs": Object.freeze([
    ...bindings(
      "src/core/analyzed-corpus.mjs",
      [
        "SYNTHETIC_APPLICATION_PROFILE",
        "canonicalCorpusDigest",
        "ANALYZED_CORPUS_SCHEMA_ID",
        "ANALYZED_CORPUS_SCHEMA_VERSION",
        "REQUIRED_ANALYZED_CORPUS_NON_CLAIMS",
        "AnalyzedCorpusValidationError",
      ],
      false,
    ),
    ...bindings(
      "scripts/configured-analyzed-corpus.mjs",
      [
        "syntheticApplicationPins",
        "createAnalyzedCorpus",
        "parseAnalyzedCorpus",
        "serializeAnalyzedCorpus",
        "assertAnalyzedCorpusCompatibility",
        "projectAnalyzedCorpus",
      ],
      false,
    ),
  ]),
  "src/pipeline/analyzed-corpus.d.mts": Object.freeze([
    ...bindings(
      "src/core/analyzed-corpus.mjs",
      [
        "ANALYZED_CORPUS_SCHEMA_ID",
        "ANALYZED_CORPUS_SCHEMA_VERSION",
        "REQUIRED_ANALYZED_CORPUS_NON_CLAIMS",
        "AnalyzedCorpusValidationError",
        "SYNTHETIC_APPLICATION_PROFILE",
        "canonicalCorpusDigest",
      ],
      false,
    ),
    ...bindings(
      "src/core/analyzed-corpus.mjs",
      [
        "AnalyzedCorpusNonClaim",
        "AnalyzedCorpusTrustDomain",
        "AnalyzedCorpusDigestedKind",
        "AnalyzedCorpusContentKind",
        "AnalyzedCorpusDigestedReference",
        "AnalyzedCorpusContentReference",
        "AnalyzedCorpusProjectionInputs",
        "SyntheticSourceEvidenceBinding",
        "RealSourceEvidenceBinding",
        "SourceEvidenceBinding",
        "AnalyzedCorpusWhyShown",
        "AnalyzedCorpusRecordReference",
        "AnalyzedCorpusRecordEntry",
        "AnalyzedCorpusView",
        "AnalyzedCorpus",
        "CreateSyntheticSourceEvidenceBinding",
        "CreateRealSourceEvidenceBinding",
        "CreateAnalyzedCorpusInput",
        "AnalyzedCorpusLifecycleAuthority",
        "AnalyzedCorpusCompatibilityExpectation",
        "AnalyzedCorpusProjectionRequest",
        "AnalyzedCorpusProjection",
      ],
      true,
    ),
    ...bindings(
      "scripts/configured-analyzed-corpus.mjs",
      [
        "createAnalyzedCorpus",
        "syntheticApplicationPins",
        "parseAnalyzedCorpus",
        "serializeAnalyzedCorpus",
        "assertAnalyzedCorpusCompatibility",
        "projectAnalyzedCorpus",
      ],
      false,
    ),
  ]),
  "src/pipeline/synthetic-corpus-path.mjs": Object.freeze([
    ...bindings(
      "scripts/synthetic-corpus-path.mjs",
      [
        "syntheticCorpusFixtures",
        "createSyntheticApplicationCorpus",
        "applicationCorpusForVerification",
        "syntheticApplicationRecords",
        "fixtureTextForCitation",
      ],
      false,
    ),
  ]),
  "src/pipeline/curated-document-pack.mjs": Object.freeze([
    ...bindings(
      "src/modules/intake/curated-document-pack.mjs",
      [
        "CURATED_DOCUMENT_PACK_SCHEMA_ID",
        "CURATED_DOCUMENT_PACK_SCHEMA_VERSION",
        "CuratedDocumentPackError",
        "serializeCuratedDocumentPack",
        "denyCuratedNetworkOperation",
      ],
      false,
    ),
    ...bindings(
      "scripts/configured-curated-document-pack.mjs",
      ["createCuratedDocumentPack", "replayCuratedDocumentPack"],
      false,
    ),
  ]),
  "src/engine/projection.ts": Object.freeze([
    ...bindings(
      "src/core/projection.ts",
      [
        "REQUIRED_COMMUNITY_RELEVANCE_NONCLAIMS",
        "ProjectionValidationError",
        "serializeEngineProjection",
      ],
      false,
    ),
    ...bindings(
      "scripts/configured-engine.ts",
      ["parseProjectionProfileBundle", "createEngineProjection"],
      false,
    ),
  ]),
  "src/engine/geography-rights.ts": Object.freeze([
    ...bindings(
      "src/modules/context/geography-rights.ts",
      [
        "REQUIRED_GEOGRAPHY_RIGHTS_FORBIDDEN_INFERENCES",
        "GeographyRightsValidationError",
        "parseGeographyRightsBundle",
        "serializeGeographyRightsProjection",
      ],
      false,
    ),
    ...bindings(
      "scripts/configured-engine.ts",
      ["createGeographyRightsProjection"],
      false,
    ),
  ]),
  "src/engine/taxonomy.ts": Object.freeze([
    ...bindings(
      "src/modules/context/taxonomy.ts",
      [
        "REQUIRED_TAXONOMY_NONCLAIMS",
        "TaxonomyValidationError",
        "serializeTaxonomyProjection",
      ],
      false,
    ),
    ...bindings(
      "scripts/configured-engine.ts",
      ["parseTaxonomyBundle", "createTaxonomyProjection"],
      false,
    ),
  ]),
  "src/engine/source-pack.ts": Object.freeze([
    ...bindings(
      "scripts/source-pack.ts",
      [
        "SourcePackValidationError",
        "parseSourcePackBundle",
        "serializeSourcePackBundle",
        "createSourcePackAdmissionPlan",
        "serializeSourcePackAdmissionPlan",
        "assertSourcePackPlanCompatibility",
      ],
      false,
    ),
  ]),
  "src/adapters/federal-register/index.ts": Object.freeze([
    ...bindings(
      "src/adapters/federal-register/artifact-policy.ts",
      [
        "FEDERAL_REGISTER_PUBLIC_ARTIFACT_POLICY",
        "assertFederalRegisterPublicArtifactRange",
        "federalRegisterArtifactCoverageNotes",
        "federalRegisterPublicArtifactRange",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/federal-register/constants.ts",
      [
        "FEDERAL_REGISTER_DISCOVERY_FIELDS",
        "FEDERAL_REGISTER_ORIGIN",
        "FEDERAL_REGISTER_PATHS",
        "FEDERAL_REGISTER_QUERY_POLICY",
        "FEDERAL_REGISTER_RESPONSE_POLICY",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/federal-register/normalize.ts",
      [
        "FEDERAL_REGISTER_ADAPTER_ID",
        "FEDERAL_REGISTER_ADAPTER_VERSION",
        "FEDERAL_REGISTER_IDENTITY_RULE",
        "FEDERAL_REGISTER_SOURCE_ID",
        "federalRegisterStableRecordId",
        "normalizeFederalRegisterDocument",
        "normalizeFederalRegisterInventory",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/federal-register/query-contract.ts",
      [
        "assertFederalRegisterDateRange",
        "buildFederalRegisterSearchUrl",
        "shouldSplitFederalRegisterDateRange",
        "splitFederalRegisterDateRange",
        "validateFederalRegisterNextPageUrl",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/federal-register/retrieval.ts",
      [
        "FederalRegisterRetrievalError",
        "retrieveFederalRegisterInventory",
        "selectFederalRegisterIssueAuditDates",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/federal-register/response-contract.ts",
      [
        "FederalRegisterContractError",
        "assertFederalRegisterOpenApiProjection",
        "parseFederalRegisterCorrectionDocumentNumber",
        "parseFederalRegisterDailyFacet",
        "parseFederalRegisterDocument",
        "parseFederalRegisterDocumentBatch",
        "parseFederalRegisterFacet",
        "parseFederalRegisterIssueInventory",
        "parseFederalRegisterSearchPage",
        "reconcileFederalRegisterCorrections",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/federal-register/transport.ts",
      ["FederalRegisterTransportError", "fetchFederalRegisterJson"],
      false,
    ),
    ...bindings(
      "src/adapters/federal-register/tier1-contract.mjs",
      [
        "FEDERAL_REGISTER_TIER1_DOCUMENT_NUMBER",
        "FEDERAL_REGISTER_TIER1_FIELDS",
        "FederalRegisterTier1ContractError",
        "parseFederalRegisterTier1Document",
        "parseFederalRegisterTier1DocumentJson",
        "serializeFederalRegisterTier1Document",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/federal-register/normalize.ts",
      ["FederalRegisterNormalizationInput"],
      true,
    ),
    ...bindings(
      "src/adapters/federal-register/query-contract.ts",
      [
        "FederalRegisterDateRange",
        "FederalRegisterNextPage",
        "FederalRegisterNextPageContext",
      ],
      true,
    ),
    ...bindings(
      "src/adapters/federal-register/retrieval.ts",
      [
        "FederalRegisterInventory",
        "FederalRegisterIssueEvidence",
        "FederalRegisterRetrievalDependencies",
        "FederalRegisterRetrievalErrorCode",
      ],
      true,
    ),
    ...bindings(
      "src/adapters/federal-register/response-contract.ts",
      [
        "FederalRegisterAgency",
        "FederalRegisterCfrReference",
        "FederalRegisterCfrTopic",
        "FederalRegisterContractErrorCode",
        "FederalRegisterDailyFacet",
        "FederalRegisterDailyFacetEntry",
        "FederalRegisterDateBounds",
        "FederalRegisterDocument",
        "FederalRegisterDocumentBatch",
        "FederalRegisterDocumentType",
        "FederalRegisterIssueInventory",
        "FederalRegisterRelatedDocument",
        "FederalRegisterRelatedDocuments",
        "FederalRegisterSearchPage",
        "FederalRegisterSearchPageContext",
      ],
      true,
    ),
    ...bindings(
      "src/adapters/federal-register/transport.ts",
      [
        "FederalRegisterFetchLike",
        "FederalRegisterResponseKind",
        "FederalRegisterTransportDependencies",
        "FederalRegisterTransportErrorCode",
      ],
      true,
    ),
    ...bindings(
      "src/adapters/federal-register/tier1-contract.mjs",
      [
        "FederalRegisterTier1Agency",
        "FederalRegisterTier1CfrReference",
        "FederalRegisterTier1CfrTopic",
        "FederalRegisterTier1ContractErrorCode",
        "FederalRegisterTier1Document",
        "FederalRegisterTier1DocumentType",
      ],
      true,
    ),
    ...bindings(
      "src/adapters/federal-register/adapter.ts",
      ["FederalRegisterAdapter", "createFederalRegisterAdapter"],
      false,
    ),
    ...bindings(
      "src/adapters/federal-register/adapter.ts",
      ["FederalRegisterRefreshValidator"],
      true,
    ),
    ...bindings(
      "scripts/configured-source-refresh.ts",
      ["refreshFederalRegisterSource"],
      false,
    ),
  ]),
  "src/adapters/supreme-court-opinions-curated/index.ts": Object.freeze([
    ...bindings(
      "src/adapters/supreme-court-opinions-curated/constants.ts",
      [
        "SUPREME_COURT_DOCUMENT_FORM_LABEL",
        "SUPREME_COURT_HEADER_DOM_ORDER",
        "SUPREME_COURT_HTML_POLICY",
        "SUPREME_COURT_OPINIONS_ADAPTER_ID",
        "SUPREME_COURT_OPINIONS_ADAPTER_VERSION",
        "SUPREME_COURT_OPINIONS_CONTRACT_VERSION",
        "SUPREME_COURT_OPINIONS_IDENTITY_RULE",
        "SUPREME_COURT_OPINIONS_SOURCE_ID",
        "SUPREME_COURT_OPINION_TABLE_CLASS",
        "SUPREME_COURT_OPINION_TABLE_DATA_ROW_COUNTS",
        "SUPREME_COURT_ORIGIN",
        "SUPREME_COURT_PUBLICATION_LABEL",
        "SUPREME_COURT_REQUIRED_PROVENANCE_POINTERS",
        "SUPREME_COURT_SELECTED_OPINION",
        "SUPREME_COURT_TERM_HEADING",
        "SUPREME_COURT_TERM_PATH",
        "SUPREME_COURT_TERM_URL",
        "SUPREME_COURT_USER_AGENT",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/supreme-court-opinions-curated/normalize.ts",
      [
        "SUPREME_COURT_NORMALIZATION_RULES",
        "assertSupremeCourtSourceConfig",
        "normalizeSupremeCourtOpinion",
        "supremeCourtOpinionStableRecordId",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/supreme-court-opinions-curated/query-contract.ts",
      ["assertSupremeCourtTermIndexUrl", "buildSupremeCourtTermIndexUrl"],
      false,
    ),
    ...bindings(
      "src/adapters/supreme-court-opinions-curated/response-contract.ts",
      [
        "assertSupremeCourtOpinionProjection",
        "parseSupremeCourtTermIndex",
        "supremeCourtSourceRecordId",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/supreme-court-opinions-curated/transport.ts",
      ["fetchSupremeCourtTermIndex"],
      false,
    ),
    ...bindings(
      "src/adapters/supreme-court-opinions-curated/transport.ts",
      ["SupremeCourtFetchLike", "SupremeCourtTransportDependencies"],
      true,
    ),
    ...bindings(
      "src/adapters/supreme-court-opinions-curated/errors.ts",
      ["SupremeCourtContractError", "SupremeCourtTransportError"],
      false,
    ),
    ...bindings(
      "src/adapters/supreme-court-opinions-curated/errors.ts",
      ["SupremeCourtContractErrorCode", "SupremeCourtTransportErrorCode"],
      true,
    ),
    ...bindings(
      "src/adapters/supreme-court-opinions-curated/response-contract.ts",
      ["SupremeCourtOpinionProjection", "SupremeCourtTermIndex"],
      true,
    ),
    ...bindings(
      "src/adapters/supreme-court-opinions-curated/adapter.ts",
      [
        "SupremeCourtCuratedOpinionsAdapter",
        "createSupremeCourtCuratedOpinionsAdapter",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/supreme-court-opinions-curated/adapter.ts",
      ["SupremeCourtRefreshValidator"],
      true,
    ),
    ...bindings(
      "scripts/configured-source-refresh.ts",
      ["refreshSupremeCourtCuratedOpinionsSource"],
      false,
    ),
  ]),
  "src/adapters/washington-centennial-accord/index.ts": Object.freeze([
    ...bindings(
      "src/adapters/washington-centennial-accord/constants.ts",
      [
        "GOIA_ACCORD_HTML_POLICY",
        "GOIA_ACCORD_METADATA",
        "GOIA_ACCORD_PATH",
        "GOIA_ACCORD_REQUIRED_PROVENANCE_POINTERS",
        "GOIA_ACCORD_URL",
        "GOIA_ACCORD_USER_AGENT",
        "WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_ID",
        "WASHINGTON_CENTENNIAL_ACCORD_ADAPTER_VERSION",
        "WASHINGTON_CENTENNIAL_ACCORD_CONTRACT_VERSION",
        "WASHINGTON_CENTENNIAL_ACCORD_IDENTITY_RULE",
        "WASHINGTON_CENTENNIAL_ACCORD_SOURCE_ID",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/washington-centennial-accord/normalize.ts",
      [
        "GOIA_ACCORD_NORMALIZATION_RULES",
        "assertGoiaAccordSourceConfig",
        "goiaAccordStableRecordId",
        "normalizeGoiaAccord",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/washington-centennial-accord/query-contract.ts",
      ["assertGoiaAccordUrl", "buildGoiaAccordUrl"],
      false,
    ),
    ...bindings(
      "src/adapters/washington-centennial-accord/response-contract.ts",
      [
        "assertGoiaAccordProjection",
        "goiaAccordSourceRecordId",
        "parseGoiaAccordPage",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/washington-centennial-accord/response-contract.ts",
      ["GoiaAccordPage", "GoiaAccordProjection"],
      true,
    ),
    ...bindings(
      "src/adapters/washington-centennial-accord/transport.ts",
      ["fetchGoiaAccordPage"],
      false,
    ),
    ...bindings(
      "src/adapters/washington-centennial-accord/transport.ts",
      ["GoiaAccordFetchLike", "GoiaAccordTransportDependencies"],
      true,
    ),
    ...bindings(
      "src/adapters/washington-centennial-accord/errors.ts",
      ["GoiaAccordContractError", "GoiaAccordTransportError"],
      false,
    ),
    ...bindings(
      "src/adapters/washington-centennial-accord/errors.ts",
      ["GoiaAccordContractErrorCode", "GoiaAccordTransportErrorCode"],
      true,
    ),
    ...bindings(
      "src/adapters/washington-centennial-accord/adapter.ts",
      [
        "WashingtonCentennialAccordAdapter",
        "createWashingtonCentennialAccordAdapter",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/washington-centennial-accord/adapter.ts",
      ["GoiaAccordRefreshValidator"],
      true,
    ),
    ...bindings(
      "scripts/configured-source-refresh.ts",
      ["refreshWashingtonCentennialAccordSource"],
      false,
    ),
  ]),
  "src/adapters/washington-governor-executive-orders/index.ts": Object.freeze([
    ...bindings(
      "src/adapters/washington-governor-executive-orders/constants.ts",
      [
        "WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_ID",
        "WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_ADAPTER_VERSION",
        "WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_CONTRACT_VERSION",
        "WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_IDENTITY_RULE",
        "WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_INDEX_URL",
        "WASHINGTON_GOVERNOR_EXECUTIVE_ORDERS_SOURCE_ID",
        "WASHINGTON_GOVERNOR_FILTER_LABEL",
        "WASHINGTON_GOVERNOR_FILTER_VALUE",
        "WASHINGTON_GOVERNOR_HTML_POLICY",
        "WASHINGTON_GOVERNOR_REQUIRED_ANCHOR",
        "WASHINGTON_GOVERNOR_SELECTED_FROM",
        "WASHINGTON_GOVERNOR_SELECTED_STATUS",
        "WASHINGTON_GOVERNOR_USER_AGENT",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/washington-governor-executive-orders/normalize.ts",
      [
        "WASHINGTON_GOVERNOR_NORMALIZATION_RULES",
        "assertWashingtonGovernorExecutiveOrdersSourceConfig",
        "normalizeWashingtonGovernorExecutiveOrder",
        "washingtonGovernorExecutiveOrderStableRecordId",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/washington-governor-executive-orders/query-contract.ts",
      [
        "assertWashingtonGovernorExecutiveOrdersIndexUrl",
        "buildWashingtonGovernorExecutiveOrdersIndexUrl",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/washington-governor-executive-orders/response-contract.ts",
      [
        "assertWashingtonGovernorExecutiveOrderProjection",
        "parseWashingtonGovernorExecutiveOrdersIndex",
        "washingtonGovernorSourceRecordId",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/washington-governor-executive-orders/transport.ts",
      ["fetchWashingtonGovernorExecutiveOrdersIndex"],
      false,
    ),
    ...bindings(
      "src/adapters/washington-governor-executive-orders/transport.ts",
      [
        "WashingtonGovernorFetchLike",
        "WashingtonGovernorTransportDependencies",
      ],
      true,
    ),
    ...bindings(
      "src/adapters/washington-governor-executive-orders/errors.ts",
      ["WashingtonGovernorContractError", "WashingtonGovernorTransportError"],
      false,
    ),
    ...bindings(
      "src/adapters/washington-governor-executive-orders/errors.ts",
      [
        "WashingtonGovernorContractErrorCode",
        "WashingtonGovernorTransportErrorCode",
      ],
      true,
    ),
    ...bindings(
      "src/adapters/washington-governor-executive-orders/response-contract.ts",
      [
        "WashingtonGovernorExecutiveOrder",
        "WashingtonGovernorExecutiveOrderIndex",
        "WashingtonGovernorIndexContractContext",
      ],
      true,
    ),
    ...bindings(
      "src/adapters/washington-governor-executive-orders/adapter.ts",
      [
        "WashingtonGovernorExecutiveOrdersAdapter",
        "createWashingtonGovernorExecutiveOrdersAdapter",
      ],
      false,
    ),
    ...bindings(
      "src/adapters/washington-governor-executive-orders/adapter.ts",
      ["WashingtonGovernorRefreshValidator"],
      true,
    ),
    ...bindings(
      "scripts/configured-source-refresh.ts",
      ["refreshWashingtonGovernorExecutiveOrdersSource"],
      false,
    ),
  ]),
});

/** No substantive implementation exception survives GD-10. */
export const ALLOWLISTED_VIOLATIONS = Object.freeze([]);
