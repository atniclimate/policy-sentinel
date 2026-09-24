// GD-03: boundary-guard tests (docs/architecture/module-boundaries.md
// section 3, section 9.1 rows GD-03/GD-04; audit section 2.6 row "Divergent
// boundary guards"). This step is the tests. It owns only this file.
//
// Part A (always runs) pins the expected protected-key set: the union of the
// three existing families named in the design --
//   - src/pipeline/policy-validation.mjs:48-72 (`FORBIDDEN_NORMALIZED_KEYS`)
//   - src/engine/land-boundary-contracts.ts:39-93
//     (`PRIVATE_CONTEXT_PROTECTED_KEYS`)
//   - src/engine/citation-export-contracts.ts:49-86
//     (`CITATION_EXPORT_PROTECTED_KEYS`)
// -- plus the four keys the design adds: `landStatus`, `apn`, `parcelNumber`,
// `shapefile`. The union is asserted against an explicit sorted literal so
// this test fails if any of the three source lists drifts.
//
// `PRIVATE_CONTEXT_PROTECTED_KEYS` and `CITATION_EXPORT_PROTECTED_KEYS` are
// exported, so they are imported directly. `FORBIDDEN_NORMALIZED_KEYS` is
// NOT exported (verified: policy-validation.mjs only exports
// `PolicyValidationError`, `sourceDerivedLeafPointers`,
// `completeSyntheticProvenance`, `validateRecordPolicy` and
// `validateRecordSetPolicy`), so it is extracted mechanically below by
// reading the source file text and pulling the quoted string literals out of
// the `const FORBIDDEN_NORMALIZED_KEYS = new Set([...])` block.
//
// Casing note for GD-04: `FORBIDDEN_NORMALIZED_KEYS` is already
// lower-cased/normalized ("legalconclusion", "rightsimpact", ...), while the
// other two lists use exact camelCase field spellings ("legalConclusion",
// "rightsImpact", ...). This test does not invent a normalization rule: it
// treats the three lists as sets of exact strings, so e.g. "legalconclusion"
// and "legalConclusion" are two distinct entries in the union. GD-04 decides
// whether `rejectProtectedKeys` compares keys exactly or case-insensitively;
// this test's Part B checks exact-spelling rejection only, since that is
// what every source list guarantees today.
//
// Part B (skipped until GD-04 exists) resolves src/core/boundary-guard.mjs
// relative to the project root. If it does not exist yet, the behavior
// tests are skipped with a reason naming GD-04. When it exists, this test
// imports it with a non-literal specifier (a file URL built with
// pathToFileURL) so tsc does not try to statically resolve a module that may
// not exist yet, and asserts:
//   - `rejectProtectedKeys` THROWS when a protected key appears at the top
//     level, nested one level in an object, inside an array element, and at
//     least three levels deep (the contract this test assumes; GD-04
//     implements to it). If GD-04 instead returns a rejection report, this
//     step's constraints ask that choice be stated in a comment -- it is
//     stated here as "throws" and GD-04 must match it or this file must be
//     revisited as part of that step.
//   - a benign object containing none of the protected keys is accepted
//     (does not throw).
//   - a value that merely contains a protected key's name as a *string
//     value* (not as an object key) is accepted (does not throw).
//   - the module exports the protected-key set and it equals the Part A
//     union. GD-04's design does not name this export; this test assumes
//     `PROTECTED_KEYS`, following the naming pattern of the three source
//     lists' own exports (`PRIVATE_CONTEXT_PROTECTED_KEYS`,
//     `CITATION_EXPORT_PROTECTED_KEYS`). GD-04 must export under this exact
//     name or this file must be revisited as part of that step.

import { existsSync, readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { CITATION_EXPORT_PROTECTED_KEYS } from "../../src/engine/citation-export-contracts";
import { PRIVATE_CONTEXT_PROTECTED_KEYS } from "../../src/engine/land-boundary-contracts";

const REPO_ROOT = resolvePath(import.meta.dirname, "../..");

const POLICY_VALIDATION_SOURCE_PATH = resolvePath(
  REPO_ROOT,
  "src/pipeline/policy-validation.mjs",
);

function extractForbiddenNormalizedKeys(): string[] {
  const source = readFileSync(POLICY_VALIDATION_SOURCE_PATH, "utf8");
  const blockMatch = source.match(
    /const FORBIDDEN_NORMALIZED_KEYS = new Set\(\[([\s\S]*?)\]\);/u,
  );
  if (blockMatch === null) {
    throw new Error(
      "FORBIDDEN_NORMALIZED_KEYS block not found in policy-validation.mjs; " +
        "GD-03's mechanical text extraction needs updating to match the " +
        "current source shape",
    );
  }
  const body = blockMatch[1] ?? "";
  const stringLiteralPattern = /"([^"]*)"/gu;
  const keys: string[] = [];
  let literalMatch: RegExpExecArray | null;
  while ((literalMatch = stringLiteralPattern.exec(body)) !== null) {
    keys.push(literalMatch[1] ?? "");
  }
  return keys;
}

// The four keys the design adds beyond the three source lists (design
// section 3; step row acceptance line 1).
const ADDED_PROTECTED_KEYS = Object.freeze([
  "landStatus",
  "apn",
  "parcelNumber",
  "shapefile",
] as const);

// Explicit, sorted literal target: the union of FORBIDDEN_NORMALIZED_KEYS,
// PRIVATE_CONTEXT_PROTECTED_KEYS, CITATION_EXPORT_PROTECTED_KEYS and
// ADDED_PROTECTED_KEYS, computed and verified once against the live source
// files and frozen here. A drift in any of the three source lists changes
// this union and fails Part A.
const EXPECTED_PROTECTED_KEY_UNION = Object.freeze([
  "apiKey",
  "apn",
  "applicability",
  "bbox",
  "bounds",
  "centroid",
  "contact",
  "contactName",
  "contactPerson",
  "controllingJurisdiction",
  "coordinate",
  "coordinates",
  "directLine",
  "email",
  "extent",
  "feature",
  "features",
  "feeLand",
  "feeland",
  "geographyrelevance",
  "geojson",
  "geometries",
  "geometry",
  "inferredRelevance",
  "inferrednation",
  "inferrednationrelationship",
  "inferredrelevance",
  "issuingBodies",
  "jurisdiction",
  "keywordrelevance",
  "landOwnership",
  "landStatus",
  "landownership",
  "lat",
  "latitude",
  "legalApplicability",
  "legalConclusion",
  "legalEffect",
  "legalconclusion",
  "legaldetermination",
  "lng",
  "lon",
  "longitude",
  "mapdata",
  "mobile",
  "nationAssociations",
  "nationIds",
  "officialSubjects",
  "owner",
  "ownership",
  "parcel",
  "parcelGeometry",
  "parcelNumber",
  "parcelgeometry",
  "parcelid",
  "phone",
  "primaryJurisdiction",
  "privatelandcontext",
  "propertyownership",
  "relevance",
  "rightsImpact",
  "rightsdetermination",
  "rightsimpact",
  "ring",
  "rings",
  "secret",
  "shapefile",
  "taxonomyMemberships",
  "token",
  "triballyownedparcel",
  "trustLand",
  "trustland",
  "whyAssociated",
  "whyShown",
  "winningJurisdiction",
  "wkb",
  "wkt",
] as const);

describe("Part A: frozen expected protected-key union (GD-03)", () => {
  it("equals the union of the three source lists plus the four added keys", () => {
    const forbiddenNormalizedKeys = extractForbiddenNormalizedKeys();
    expect(forbiddenNormalizedKeys.length).toBeGreaterThan(0);
    expect(PRIVATE_CONTEXT_PROTECTED_KEYS.length).toBeGreaterThan(0);
    expect(CITATION_EXPORT_PROTECTED_KEYS.length).toBeGreaterThan(0);

    const union = new Set<string>([
      ...forbiddenNormalizedKeys,
      ...PRIVATE_CONTEXT_PROTECTED_KEYS,
      ...CITATION_EXPORT_PROTECTED_KEYS,
      ...ADDED_PROTECTED_KEYS,
    ]);

    expect([...union].sort()).toEqual([...EXPECTED_PROTECTED_KEY_UNION]);
    expect(union.size).toBe(EXPECTED_PROTECTED_KEY_UNION.length);
  });
});

const BOUNDARY_GUARD_PATH = resolvePath(
  REPO_ROOT,
  "src/core/boundary-guard.mjs",
);
const boundaryGuardExists = existsSync(BOUNDARY_GUARD_PATH);
const boundaryGuardModuleUrl = pathToFileURL(BOUNDARY_GUARD_PATH).href;

interface BoundaryGuardModule {
  readonly PROTECTED_KEYS: Iterable<string>;
  readonly rejectProtectedKeys: (value: unknown) => unknown;
}

async function loadBoundaryGuardModule(): Promise<BoundaryGuardModule> {
  // Non-literal specifier: src/core/boundary-guard.mjs does not exist until
  // GD-04, so a literal import specifier would fail tsc. This dynamic import
  // is only ever reached when boundaryGuardExists is true (Part B is
  // skipped otherwise).
  const specifier = boundaryGuardModuleUrl;
  return (await import(/* @vite-ignore */ specifier)) as BoundaryGuardModule;
}

function atTopLevel(key: string): Record<string, unknown> {
  return { [key]: "protected-value" };
}

function nestedOneLevel(key: string): Record<string, unknown> {
  return { safe: { [key]: "protected-value" } };
}

function insideArrayElement(key: string): Record<string, unknown> {
  return { list: [{ safe: true }, { [key]: "protected-value" }] };
}

function threeLevelsDeep(key: string): Record<string, unknown> {
  return { a: { b: { c: { [key]: "protected-value" } } } };
}

describe.skipIf(!boundaryGuardExists)(
  "Part B: boundary-guard behavior (skipped until GD-04 builds src/core/boundary-guard.mjs)",
  () => {
    it.each(EXPECTED_PROTECTED_KEY_UNION.map((key) => [key] as const))(
      "rejects %s at the top level, nested, inside an array element, and three levels deep",
      async (key) => {
        const { rejectProtectedKeys } = await loadBoundaryGuardModule();

        expect(() => rejectProtectedKeys(atTopLevel(key))).toThrow();
        expect(() => rejectProtectedKeys(nestedOneLevel(key))).toThrow();
        expect(() => rejectProtectedKeys(insideArrayElement(key))).toThrow();
        expect(() => rejectProtectedKeys(threeLevelsDeep(key))).toThrow();
      },
    );

    it("accepts a benign object containing none of the protected keys", async () => {
      const { rejectProtectedKeys } = await loadBoundaryGuardModule();

      expect(() =>
        rejectProtectedKeys({
          officialTitle: "An ordinance",
          status: { normalized: "enacted" },
          notes: ["a", "b", { detail: "c" }],
        }),
      ).not.toThrow();
    });

    it("accepts values that merely contain a protected key name as a string value, not as a key", async () => {
      const { rejectProtectedKeys } = await loadBoundaryGuardModule();

      expect(() =>
        rejectProtectedKeys({
          summary: "This record does not include geometry or shapefile data.",
          tags: ["parcelNumber", "apn"],
        }),
      ).not.toThrow();
    });

    it("exports PROTECTED_KEYS equal to the Part A union", async () => {
      const guardModule = await loadBoundaryGuardModule();

      expect(new Set(guardModule.PROTECTED_KEYS)).toEqual(
        new Set(EXPECTED_PROTECTED_KEY_UNION),
      );
    });
  },
);
