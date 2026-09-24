// Module manifest for the general-development refactor (GD-02).
//
// Declares the module membership model from
// docs/architecture/module-boundaries.md sections 2-6 and 9, as amended by
// docs/architecture/general-development-addendum-2026-09-22.md section 2.
// This file classifies repository-relative paths into a module (or leaves
// them unclassified/outside), and carries the report-mode allowlist of
// today's known dependency-rule violations (audit section 2.6). GD-10
// reduces that allowlist as later steps untangle the flagged files; it does
// not change the classification logic.
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
const COMPOSITION_ROOT_PATHS = Object.freeze(["src/main.tsx"]);

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
 * Today's known dependency-rule violations (audit section 2.6), each a
 * repository-relative (from, to) file pair. Report mode compares the
 * mechanically computed violation set against exactly this list: any
 * violation not listed fails the test, and any listed pair that no longer
 * occurs also fails the test, so the list can only shrink (GD-10).
 * @type {ReadonlyArray<{readonly from: string, readonly to: string, readonly note: string}>}
 */
export const ALLOWLISTED_VIOLATIONS = Object.freeze(
  [
    {
      from: "src/pipeline/analyzed-corpus.mjs",
      to: "config/sources.v1.json",
      note: "core imports the intake source registry at module load (audit F-08 import-time data coupling)",
    },
    {
      from: "src/pipeline/analyzed-corpus.mjs",
      to: "config/taxonomy.v1.json",
      note: "core imports the context taxonomy config at module load (audit F-08)",
    },
    {
      from: "src/pipeline/synthetic-corpus-path.mjs",
      to: "config/taxonomy.v1.json",
      note: "intake imports the context taxonomy config at module load (audit F-08)",
    },
    {
      from: "src/engine/source-pack.ts",
      to: "src/engine/geography-rights.ts",
      note: "PNW-05 source-pack bundles the PNW-03 context seam (audit 2.6 seams tested in isolation; no producer wires it)",
    },
    {
      from: "src/engine/source-pack.ts",
      to: "src/engine/geography-rights-contracts.ts",
      note: "same as above, contract types",
    },
    {
      from: "src/engine/source-pack.ts",
      to: "src/engine/taxonomy.ts",
      note: "PNW-05 source-pack bundles the PNW-04 context seam (audit 2.4/2.6; taxonomy is unwired)",
    },
    {
      from: "src/engine/source-pack.ts",
      to: "src/engine/taxonomy-contracts.ts",
      note: "same as above, contract types",
    },
    {
      from: "src/engine/source-pack.ts",
      to: "src/engine/projection.ts",
      note: "PNW-05 source-pack bundles the PNW-01 output seam (audit 2.6 seams tested in isolation)",
    },
    {
      from: "src/engine/geography-rights.ts",
      to: "src/engine/projection.ts",
      note: "PNW-03 context seam imports the PNW-01 output seam (audit 2.6)",
    },
    {
      from: "src/engine/taxonomy.ts",
      to: "src/engine/projection.ts",
      note: "PNW-04 context seam imports the PNW-01 output seam (audit 2.6)",
    },
    {
      from: "src/engine/projection.ts",
      to: "config/sources.v1.json",
      note: "output builds maps from the intake source registry at module load (audit F-08, projection.ts:63-73)",
    },
    {
      from: "src/adapters/federal-register/index.ts",
      to: "config/taxonomy.v1.json",
      note: "v1 adapter imports the context taxonomy config directly, though it emits only empty taxonomyMemberships (audit 2.4/2.6)",
    },
    {
      from: "src/adapters/supreme-court-opinions-curated/index.ts",
      to: "config/taxonomy.v1.json",
      note: "same as above",
    },
    {
      from: "src/adapters/washington-centennial-accord/index.ts",
      to: "config/taxonomy.v1.json",
      note: "same as above",
    },
    {
      from: "src/adapters/washington-governor-executive-orders/index.ts",
      to: "config/taxonomy.v1.json",
      note: "same as above",
    },
    {
      from: "src/pipeline/last-known-good.d.mts",
      to: "src/pipeline/source-adapter.ts",
      note: "output's last-known-good merge types against intake's SourceRefreshResult (audit F-08 layering inversions)",
    },
  ].map(Object.freeze),
);
