import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { URL } from "node:url";
import { createHash } from "node:crypto";
import schema from "../../schemas/development-authority.schema.v1.json" with { type: "json" };

export const DEVELOPMENT_AUTHORITY_SCHEMA_ID = schema.$id;
export const COMMON_PROFILE = "policy.search-context/1";
export const ATNI_PROFILE = "policy.search-context.atni/1";
const ajv = new Ajv2020({ strict: true, allErrors: false });
addFormats(ajv);
ajv.addSchema(schema);
const validators = new Map();

export class DevelopmentAuthorityError extends TypeError {
  constructor(code) {
    super(`Development preparation rejected: ${code}`);
    this.name = "DevelopmentAuthorityError";
    this.code = code;
  }
}
const fail = (code) => {
  throw new DevelopmentAuthorityError(code);
};
const requireValue = (condition, code) => {
  if (!condition) fail(code);
};
function parse(json, definition) {
  requireValue(
    typeof json === "string" && json.length <= 1048576 && json.isWellFormed(),
    "INVALID_JSON_INPUT",
  );
  let value;
  try {
    value = JSON.parse(json);
  } catch {
    fail("INVALID_JSON_INPUT");
  }
  const key = definition ? `${schema.$id}#/$defs/${definition}` : schema.$id;
  if (!validators.has(key)) validators.set(key, ajv.getSchema(key));
  requireValue(validators.get(key)(value), "INVALID_PAYLOAD");
  return value;
}
function currentTime(now) {
  requireValue(
    typeof now === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(now) &&
      Number.isFinite(Date.parse(now)) &&
      new Date(now).toISOString().slice(0, 19) === now.slice(0, 19),
    "INVALID_NOW",
  );
  return Date.parse(now);
}
function dates(window) {
  requireValue(window.from <= window.through, "REVERSED_DATE_WINDOW");
}
function sourceSemantics(packet, now) {
  const ids = new Set();
  let total = 0;
  let reviewed = false;
  for (const source of packet.sources) {
    requireValue(!ids.has(source.sourceId), "DUPLICATE_SOURCE");
    ids.add(source.sourceId);
    dates(source.dateWindow);
    for (const url of source.officialUrls) {
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        fail("UNSAFE_SOURCE_URL");
      }
      requireValue(
        parsed.protocol === "https:" &&
          !parsed.username &&
          !parsed.password &&
          !parsed.search &&
          !parsed.hash,
        "UNSAFE_SOURCE_URL",
      );
    }
    const bounds = source.bounds;
    requireValue(
      bounds.maxBytesPerRequest <= bounds.maxBytes,
      "INCONSISTENT_BOUNDS",
    );
    requireValue(
      bounds.maxBytes <= bounds.requests * bounds.maxBytesPerRequest,
      "INCONSISTENT_BOUNDS",
    );
    total += bounds.maxBytes;
    requireValue(
      source.review.state !== "blocked" ||
        source.review.blockReasons.length > 0,
      "MISSING_BLOCK_REASON",
    );
    requireValue(
      source.review.state === "blocked" ||
        source.review.blockReasons.length === 0,
      "UNRESOLVED_BLOCK",
    );
    if (source.reuseReview === "metadata_only")
      requireValue(
        !source.outputFields.includes("quotation"),
        "REUSE_EXCEEDS_REVIEW",
      );
    if (source.review.state === "reviewed_preparation") {
      reviewed = true;
      requireValue(
        source.authorityClass === "intertribal_organization" ||
          source.jurisdictionIds.length > 0,
        "UNRESOLVED_JURISDICTION_SCOPE",
      );
      requireValue(source.access === "public", "RESTRICTED_SOURCE_NOT_PUBLIC");
      requireValue(
        source.review.evidenceRefs.length > 0 &&
          source.review.expiresAt !== null &&
          Date.parse(source.review.expiresAt) > now,
        "MISSING_OR_EXPIRED_REVIEW",
      );
      requireValue(
        source.reuseReview !== "pending" && source.outputFields.length > 0,
        "MISSING_REUSE_REVIEW",
      );
      requireValue(
        bounds.requests > 0 &&
          bounds.maxBytes > 0 &&
          bounds.maxBytesPerRequest > 0 &&
          bounds.requestsPerMinute > 0,
        "UNBOUNDED_PREPARATION",
      );
    }
  }
  requireValue(total <= packet.storage.maxRunBytes, "RUN_BYTE_LIMIT");
  if (reviewed) {
    const storage = packet.storage;
    requireValue(
      storage.allManagedRootsInventoried && storage.measurementRefs.length > 0,
      "MISSING_STORAGE_INVENTORY",
    );
    requireValue(
      storage.peakAdditionalBytes >= total,
      "PEAK_UNDERCOUNTS_ADMISSION",
    );
    requireValue(
      storage.managedBytes + storage.peakAdditionalBytes <=
        storage.managedLimitBytes,
      "MANAGED_BYTE_LIMIT",
    );
    requireValue(
      storage.freeBytes - storage.peakAdditionalBytes >= storage.minFreeBytes,
      "FREE_SPACE_FLOOR",
    );
  }
}
function exchangeSemantics(packet) {
  dates(packet.criteria.dateWindow);
  requireValue(
    packet.sensitivity.tier === "T0" || packet.sensitivity.tier === "T1",
    "TIER_NOT_ALLOWED",
  );
  requireValue(
    !packet.sensitivity.derivedFromPrivate,
    "PRIVATE_DERIVATION_NOT_EXCHANGEABLE",
  );
  requireValue(
    packet.criteria.jurisdictionIds.every((id) => !id.startsWith("nation:")),
    "NATION_OUTSIDE_SELECTED_FIELD",
  );
  // This heuristic is a narrow preparatory guard, not proof that arbitrary prose is public.
  requireValue(
    !/(?:\b(?:apn|parcel|bbox|latitude|longitude)\b|\b\d{1,3}\.\d+\s*[,;]\s*-?\d{1,3}\.\d+|\b\d+\s+[\p{L} .]+\s(?:street|st|road|rd|avenue|ave)\b)/iu.test(
      packet.criteria.query,
    ),
    "PROHIBITED_QUERY",
  );
}
function restrictionSemantics(packet) {
  for (const group of [packet.source, packet.authored]) {
    requireValue(
      new Set(group.map((r) => r.id)).size === group.length,
      "DUPLICATE_RESTRICTION",
    );
    for (const restriction of group) {
      requireValue(
        Date.parse(restriction.validFrom) < Date.parse(restriction.expiresAt),
        "INVALID_PERMISSION_WINDOW",
      );
      requireValue(
        restriction.classification === "public" ||
          restriction.agreementRef !== null,
        "MISSING_AGREEMENT_REFERENCE",
      );
    }
  }
}

/** Parse a bounded JSON preparation object. No caller-controlled object is executed. */
export function parseDevelopmentAuthority(json, { now } = {}) {
  const timestamp = currentTime(now);
  const value = parse(json);
  if (value.kind === "source_preparation") sourceSemantics(value, timestamp);
  if (value.kind === "exchange_preparation") exchangeSemantics(value);
  if (value.kind === "restriction_set") restrictionSemantics(value);
  return value;
}

/** Eligibility is a discovery classification, never source qualification or final status. */
export function sourceDiscoveryEligibility(json, sourceId, { now } = {}) {
  const packet = parseDevelopmentAuthority(json, { now });
  requireValue(packet.kind === "source_preparation", "WRONG_PACKET_KIND");
  const source = packet.sources.find((row) => row.sourceId === sourceId);
  requireValue(source, "UNKNOWN_SOURCE");
  return {
    eligibleForPublicDiscovery: source.access === "public",
    sourceQualified: false,
    dispatchAllowed: false,
    nationRelationship: "not_established",
    instrumentStatus: "not_established",
    preparationState: source.review.state,
  };
}

/** Check synthetic local assessment inputs; this is not a wire adapter or authorization service. */
export function validateExchangePreparation(
  json,
  { now, authorizationJson, registryJson } = {},
) {
  const packet = parseDevelopmentAuthority(json, { now });
  requireValue(packet.kind === "exchange_preparation", "WRONG_PACKET_KIND");
  requireValue(packet.synthetic, "REAL_EXCHANGE_NOT_IMPLEMENTED");
  let authorization;
  if (
    packet.profile === ATNI_PROFILE ||
    packet.sensitivity.tier === "T1" ||
    authorizationJson !== undefined
  ) {
    requireValue(
      authorizationJson !== undefined,
      "MISSING_AUTHORIZATION_EVIDENCE",
    );
    authorization = parse(authorizationJson, "authorization");
    requireValue(
      !authorization.revoked &&
        Date.parse(authorization.validFrom) <= currentTime(now) &&
        currentTime(now) < Date.parse(authorization.expiresAt),
      "AUTHORIZATION_INACTIVE",
    );
    requireValue(
      authorization.profile === packet.profile &&
        authorization.recipientId === packet.recipientId &&
        authorization.purpose === packet.purpose,
      "AUTHORIZATION_SCOPE_MISMATCH",
    );
  }
  if (packet.selectedNation) {
    requireValue(registryJson !== undefined, "MISSING_REGISTRY_EVIDENCE");
    const registry = parse(registryJson, "registry");
    const digest = createHash("sha256")
      .update(
        JSON.stringify({
          kind: "gd31_synthetic_nation_registry",
          schemaVersion: "1.0.0",
          synthetic: registry.synthetic,
          nationIds: [...registry.nationIds].sort(),
        }),
        "utf8",
      )
      .digest("hex");
    requireValue(
      registry.synthetic &&
        registry.digest === digest &&
        registry.digest === authorization.registryDigest &&
        registry.nationIds.includes(packet.selectedNation.id),
      "UNVERIFIED_NATION_SELECTION",
    );
  }
  return { packet, assessmentConformant: true, dispatchAllowed: false };
}

/** Migration is explicit; it never removes a selected Nation or weakens restrictions silently. */
export function migrateExchangePreparation(json, targetProfile, options = {}) {
  const original = parseDevelopmentAuthority(json, { now: options.now });
  requireValue(original.kind === "exchange_preparation", "WRONG_PACKET_KIND");
  requireValue(
    [COMMON_PROFILE, ATNI_PROFILE].includes(targetProfile),
    "UNSUPPORTED_PROFILE",
  );
  const packet = JSON.parse(JSON.stringify(original));
  let nationRemoved = false;
  if (targetProfile === COMMON_PROFILE && packet.selectedNation) {
    requireValue(
      options.removeNation === true,
      "EXPLICIT_NATION_REMOVAL_REQUIRED",
    );
    delete packet.selectedNation;
    nationRemoved = true;
  }
  packet.profile = targetProfile;
  const result = validateExchangePreparation(JSON.stringify(packet), options);
  return {
    ...result,
    migration: { from: original.profile, to: targetProfile, nationRemoved },
  };
}

/** Intersect independent source and authored permission specimens; never perform a transfer. */
export function evaluateRestrictionPreparation(
  json,
  requestJson,
  { now } = {},
) {
  const packet = parseDevelopmentAuthority(json, { now });
  requireValue(packet.kind === "restriction_set", "WRONG_PACKET_KIND");
  requireValue(packet.synthetic, "REAL_TRANSFER_NOT_IMPLEMENTED");
  const request = parse(requestJson, "transfer");
  const timestamp = currentTime(now);
  const denied = [];
  for (const [origin, restrictions] of [
    ["source", packet.source],
    ["authored", packet.authored],
  ]) {
    for (const permission of restrictions) {
      if (
        permission.withdrawn ||
        timestamp < Date.parse(permission.validFrom) ||
        timestamp >= Date.parse(permission.expiresAt) ||
        !permission.recipients.includes(request.recipientId) ||
        !permission.purposes.includes(request.purpose) ||
        request.fields.some(
          (field) => !permission.allowedFields.includes(field),
        ) ||
        (request.onwardSharing && !permission.onwardSharing) ||
        request.retentionDays > permission.retentionDays
      )
        denied.push({ origin, restrictionId: permission.id });
    }
  }
  return {
    assessmentWouldPermit: denied.length === 0,
    denied,
    dispatchAllowed: false,
  };
}
