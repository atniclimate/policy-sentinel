// Frozen origin spellings from GD-03's three boundary families plus its four
// additions. Keep the spellings visible here; normalization merges seven pairs.
const ORIGIN_KEYS = Object.freeze([
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
]);

export function normalizeProtectedKey(key) {
  if (typeof key !== "string") {
    throw new TypeError("PROTECTED_KEY_STRING_REQUIRED");
  }
  return key.toLowerCase().replace(/[^a-z0-9]/gu, "");
}

export const PROTECTED_KEYS = Object.freeze(
  [...new Set(ORIGIN_KEYS.map(normalizeProtectedKey))].sort(),
);
const protectedKeys = new Set(PROTECTED_KEYS);

export function isProtectedKey(key) {
  return protectedKeys.has(normalizeProtectedKey(key));
}

// Scan ordinary data by descriptors, including nonenumerable and symbol-held
// descendants. Accessors cannot establish that a subtree is safe without running
// caller code, so they fail closed. No input values enter any error message.
export function rejectProtectedKeys(value) {
  const pending = [value];
  const seen = new WeakSet();
  while (pending.length > 0) {
    const current = pending.pop();
    if (
      current === null ||
      (typeof current !== "object" && typeof current !== "function") ||
      seen.has(current)
    ) {
      continue;
    }
    seen.add(current);
    let descriptors;
    try {
      descriptors = Object.getOwnPropertyDescriptors(current);
    } catch {
      throw new Error("UNINSPECTABLE_BOUNDARY_VALUE");
    }
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key === "string" && isProtectedKey(key)) {
        throw new Error("PROTECTED_KEY_REJECTED");
      }
      const descriptor = descriptors[key];
      if (!Object.hasOwn(descriptor, "value")) {
        throw new Error("BOUNDARY_ACCESSOR_REJECTED");
      }
      pending.push(descriptor.value);
    }
  }
}
