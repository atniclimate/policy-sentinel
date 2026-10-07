// GD-03 froze 77 origin spellings and their rejection-depth cases. GD-04 keeps
// those literals/cases and normalizes only the exported comparison to 70 keys.
// The historical record list is pinned below instead of extracting a private
// source block that shared-core adoption removes. Private seam drift checks stay.

import { describe, expect, it } from "vitest";

import * as boundaryGuard from "../../src/core/boundary-guard.mjs";

import { CITATION_EXPORT_PROTECTED_KEYS } from "../../src/engine/citation-export-contracts";
import { PRIVATE_CONTEXT_PROTECTED_KEYS } from "../../src/engine/land-boundary-contracts";

const LEGACY_RECORD_PROTECTED_KEYS = Object.freeze([
  "legalconclusion",
  "legaldetermination",
  "rightsimpact",
  "rightsdetermination",
  "inferredrelevance",
  "inferrednation",
  "inferrednationrelationship",
  "keywordrelevance",
  "geographyrelevance",
  "parcel",
  "parcelid",
  "parcelgeometry",
  "geometry",
  "coordinates",
  "latitude",
  "longitude",
  "landownership",
  "trustland",
  "feeland",
  "triballyownedparcel",
  "propertyownership",
  "mapdata",
  "privatelandcontext",
] as const);

// The four keys the design adds beyond the three source lists (design
// section 3; step row acceptance line 1).
const ADDED_PROTECTED_KEYS = Object.freeze([
  "landStatus",
  "apn",
  "parcelNumber",
  "shapefile",
] as const);

// Explicit, sorted literal target: the union of LEGACY_RECORD_PROTECTED_KEYS,
// PRIVATE_CONTEXT_PROTECTED_KEYS, CITATION_EXPORT_PROTECTED_KEYS and
// ADDED_PROTECTED_KEYS, computed and verified once against the live source
// files and frozen here. A drift in either private seam list changes
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
    expect(LEGACY_RECORD_PROTECTED_KEYS).toHaveLength(23);
    expect(PRIVATE_CONTEXT_PROTECTED_KEYS.length).toBeGreaterThan(0);
    expect(CITATION_EXPORT_PROTECTED_KEYS.length).toBeGreaterThan(0);

    const union = new Set<string>([
      ...LEGACY_RECORD_PROTECTED_KEYS,
      ...PRIVATE_CONTEXT_PROTECTED_KEYS,
      ...CITATION_EXPORT_PROTECTED_KEYS,
      ...ADDED_PROTECTED_KEYS,
    ]);

    expect([...union].sort()).toEqual([...EXPECTED_PROTECTED_KEY_UNION]);
    expect(union.size).toBe(EXPECTED_PROTECTED_KEY_UNION.length);
  });
});

interface BoundaryGuardModule {
  readonly PROTECTED_KEYS: readonly string[];
  readonly normalizeProtectedKey: (key: string) => string;
  readonly isProtectedKey: (key: string) => boolean;
  readonly rejectProtectedKeys: (value: unknown) => void;
}

function loadBoundaryGuardModule(): Promise<BoundaryGuardModule> {
  return Promise.resolve(boundaryGuard);
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

describe("Part B: boundary-guard behavior (GD-04)", () => {
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

  it("exports immutable PROTECTED_KEYS equal to the normalized Part A union", async () => {
    const guardModule = await loadBoundaryGuardModule();

    expect(new Set(guardModule.PROTECTED_KEYS)).toEqual(
      new Set(
        EXPECTED_PROTECTED_KEY_UNION.map((key) =>
          key.toLowerCase().replace(/[^a-z0-9]/gu, ""),
        ),
      ),
    );
    expect(guardModule.PROTECTED_KEYS).toHaveLength(70);
    expect(Object.isFrozen(guardModule.PROTECTED_KEYS)).toBe(true);
    expect(() =>
      (guardModule.PROTECTED_KEYS as string[]).push("safe"),
    ).toThrow();
    expect(Object.keys(guardModule).sort()).toEqual([
      "PROTECTED_KEYS",
      "isProtectedKey",
      "normalizeProtectedKey",
      "rejectProtectedKeys",
    ]);
  });

  it.each(EXPECTED_PROTECTED_KEY_UNION.map((key) => [key] as const))(
    "rejects case and punctuation variants of %s",
    async (key) => {
      const { normalizeProtectedKey, isProtectedKey, rejectProtectedKeys } =
        await loadBoundaryGuardModule();
      const variants = [
        key.toUpperCase(),
        key.toUpperCase().split("").join("._-"),
        `é${key}é`,
      ];
      for (const variant of variants) {
        expect(normalizeProtectedKey(variant)).toBe(
          key.toLowerCase().replace(/[^a-z0-9]/gu, ""),
        );
        expect(isProtectedKey(variant)).toBe(true);
        expect(() => rejectProtectedKeys(threeLevelsDeep(variant))).toThrow();
      }
    },
  );

  it("does not treat a protected word inside a larger benign key as a match", async () => {
    const { isProtectedKey, rejectProtectedKeys } =
      await loadBoundaryGuardModule();
    expect(isProtectedKey("geometryDescription")).toBe(false);
    expect(isProtectedKey("officialTitle")).toBe(false);
    expect(() =>
      rejectProtectedKeys({ geometryDescription: "metadata only" }),
    ).not.toThrow();
    expect(() =>
      Reflect.apply(rejectProtectedKeys, undefined, [
        { geometry: "synthetic protected sentinel" },
        { allow: ["geometry"] },
      ]),
    ).toThrow("PROTECTED_KEY_REJECTED");
  });

  it("accepts benign primitives and cycles while finding protected cyclic descendants", async () => {
    const { rejectProtectedKeys } = await loadBoundaryGuardModule();
    for (const value of [null, undefined, "geometry", 42, false]) {
      expect(() => rejectProtectedKeys(value)).not.toThrow();
    }
    const root: Record<string, unknown> = {};
    const child: Record<string, unknown> = { back: root };
    root.child = child;
    root.self = root;
    expect(() => rejectProtectedKeys(root)).not.toThrow();
    child.deep = { geometry: "synthetic protected sentinel" };
    expect(() => rejectProtectedKeys(root)).toThrow("PROTECTED_KEY_REJECTED");
  });

  it("scans nonenumerable keys and symbol-held descendants", async () => {
    const { rejectProtectedKeys } = await loadBoundaryGuardModule();
    const hidden = Object.defineProperty({}, "geometry", {
      value: "synthetic protected sentinel",
      enumerable: false,
    });
    expect(() => rejectProtectedKeys(hidden)).toThrow("PROTECTED_KEY_REJECTED");
    expect(() =>
      rejectProtectedKeys({
        [Symbol("synthetic holder")]: { phone: "synthetic protected sentinel" },
      }),
    ).toThrow("PROTECTED_KEY_REJECTED");
  });

  it("rejects accessors without invoking caller getters", async () => {
    const { rejectProtectedKeys } = await loadBoundaryGuardModule();
    let calls = 0;
    const value = {
      get safe() {
        calls += 1;
        return { geometry: "synthetic protected sentinel" };
      },
    };
    expect(() => rejectProtectedKeys(value)).toThrow(
      "BOUNDARY_ACCESSOR_REJECTED",
    );
    expect(calls).toBe(0);
  });

  it("does not expose values from a rejected property or inspection failure", async () => {
    const { rejectProtectedKeys } = await loadBoundaryGuardModule();
    const sentinel = "synthetic-value-must-never-enter-error";
    try {
      rejectProtectedKeys({ geometry: sentinel });
      throw new Error("Expected rejection");
    } catch (error) {
      expect((error as Error).message).toBe("PROTECTED_KEY_REJECTED");
      expect((error as Error).message).not.toContain(sentinel);
    }
    const uninspectable = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error(sentinel);
        },
      },
    );
    expect(() => rejectProtectedKeys(uninspectable)).toThrow(
      "UNINSPECTABLE_BOUNDARY_VALUE",
    );
  });

  it("traverses deeply nested data without recursive stack exhaustion", async () => {
    const { rejectProtectedKeys } = await loadBoundaryGuardModule();
    const root: Record<string, unknown> = {};
    let current = root;
    for (let depth = 0; depth < 10000; depth += 1) {
      const child: Record<string, unknown> = {};
      current.child = child;
      current = child;
    }
    current.geometry = "synthetic protected sentinel";
    expect(() => rejectProtectedKeys(root)).toThrow("PROTECTED_KEY_REJECTED");
  });
});
