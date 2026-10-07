import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import { URL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  ATNI_PROFILE,
  COMMON_PROFILE,
  parseDevelopmentAuthority,
  sourceDiscoveryEligibility,
  validateExchangePreparation,
  migrateExchangePreparation,
  evaluateRestrictionPreparation,
} from "../../src/core/development-authority.mjs";

const schema = JSON.parse(
  await readFile(
    new URL(
      "../../schemas/development-authority.schema.v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const fixture = JSON.parse(
  await readFile(
    new URL(
      "../../fixtures/development/authority.synthetic.valid.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const now = "2026-10-07T12:00:00Z";
const options = { now };
const clone = (value) => JSON.parse(JSON.stringify(value));
const json = JSON.stringify;
const rejects = (fn, code) => assert.throws(fn, (error) => error.code === code);
const base = {
  $schema: schema.$id,
  schemaVersion: "1.0.0",
  synthetic: true,
  dispatchAllowed: false,
};
function exchange(profile = COMMON_PROFILE) {
  return {
    ...base,
    kind: "exchange_preparation",
    profile,
    recipientId: "synthetic-peer",
    purpose: "policy_search",
    storage: "memory_only",
    corpus: {
      kind: "public_synthetic",
      id: "synthetic-corpus",
      digest: "a".repeat(64),
    },
    sensitivity: { tier: "T0", derivedFromPrivate: false },
    criteria: {
      jurisdictionIds: ["us-state:WA"],
      topicIds: [],
      sourceIds: [],
      dateWindow: { from: "2025-01-01", through: "2026-10-07" },
      query: "water policy",
    },
  };
}
function authorization(profile = ATNI_PROFILE) {
  return {
    id: "synthetic-assessment",
    profile,
    recipientId: "synthetic-peer",
    purpose: "policy_search",
    scope: "local_synthetic_assessment",
    validFrom: "2026-10-01T00:00:00Z",
    expiresAt: "2026-11-01T00:00:00Z",
    revoked: false,
    registryDigest: registry.digest,
  };
}
const registry = {
  digest: createHash("sha256")
    .update(
      '{"kind":"gd31_synthetic_nation_registry","schemaVersion":"1.0.0","synthetic":true,"nationIds":["nation:synthetic-example","nation:synthetic-other"]}',
      "utf8",
    )
    .digest("hex"),
  synthetic: true,
  nationIds: ["nation:synthetic-example", "nation:synthetic-other"],
};
const withNation = () => ({
  ...exchange(ATNI_PROFILE),
  selectedNation: {
    id: "nation:synthetic-example",
    provenance: "user_declared",
    deliberate: true,
  },
});
const authOptions = (grant = authorization()) => ({
  now,
  authorizationJson: json(grant),
  registryJson: json(registry),
});
function permissions() {
  const permission = {
    id: "synthetic-source-use",
    classification: "public",
    agreementRef: null,
    recipients: ["synthetic-peer"],
    purposes: ["citation_export"],
    allowedFields: ["title", "quotation", "analystNote"],
    onwardSharing: false,
    retentionDays: 30,
    validFrom: "2026-10-01T00:00:00Z",
    expiresAt: "2026-11-01T00:00:00Z",
    withdrawn: false,
  };
  return {
    ...base,
    kind: "restriction_set",
    source: [permission],
    authored: [
      {
        ...permission,
        id: "synthetic-private-note",
        classification: "private",
        agreementRef: "synthetic-note-agreement",
        recipients: ["local-analyst"],
      },
    ],
  };
}
const request = {
  recipientId: "synthetic-peer",
  purpose: "citation_export",
  fields: ["title"],
  onwardSharing: false,
  retentionDays: 7,
};

test("closed schema compiles strictly and accepts each preparation kind", () => {
  const ajv = new Ajv2020({ strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  for (const value of [fixture, exchange(), withNation(), permissions()])
    assert.equal(validate(value), true, json(validate.errors));
  const commonNation = { ...withNation(), profile: COMMON_PROFILE };
  assert.equal(validate(commonNation), false);
});

test("source preparation never supplies activation, Nation or instrument status", () => {
  for (const authorityClass of [
    "county",
    "municipal",
    "tribal_government",
    "intertribal_organization",
  ]) {
    const packet = clone(fixture);
    packet.sources[0].authorityClass = authorityClass;
    assert.deepEqual(
      sourceDiscoveryEligibility(json(packet), "synthetic-county", options),
      {
        eligibleForPublicDiscovery: true,
        sourceQualified: false,
        dispatchAllowed: false,
        nationRelationship: "not_established",
        instrumentStatus: "not_established",
        preparationState: "reviewed_preparation",
      },
    );
  }
});

test("unresolved preparation scope and an intertribal publisher are not invented jurisdictions", () => {
  const packet = clone(fixture);
  packet.sources[0].jurisdictionIds = [];
  packet.sources[0].review.state = "pending";
  assert.equal(
    parseDevelopmentAuthority(json(packet), options).sources[0].jurisdictionIds
      .length,
    0,
  );
  packet.sources[0].review.state = "reviewed_preparation";
  rejects(
    () => parseDevelopmentAuthority(json(packet), options),
    "UNRESOLVED_JURISDICTION_SCOPE",
  );
  packet.sources[0].authorityClass = "intertribal_organization";
  assert.equal(
    parseDevelopmentAuthority(json(packet), options).sources[0].jurisdictionIds
      .length,
    0,
  );
  assert.equal(
    sourceDiscoveryEligibility(json(packet), "synthetic-county", options)
      .nationRelationship,
    "not_established",
  );
});

test("actual GD31 planning packet remains blocked with honest scope and capacity deficit", async () => {
  const packet = JSON.parse(
    await readFile(
      new URL(
        "../../docs/development/gd31-operation-packets.v1.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(
    parseDevelopmentAuthority(json(packet), options).dispatchAllowed,
    false,
  );
  assert.equal(packet.sources.length, 10);
  assert.equal(
    packet.sources.every((source) => source.review.state === "blocked"),
    true,
  );
  for (const source of packet.sources) {
    const expected =
      source.authorityClass === "federal"
        ? ["us"]
        : source.authorityClass === "intertribal_organization"
          ? []
          : source.sourceId === "api-or-odata"
            ? ["us-state:OR"]
            : ["us-state:WA"];
    assert.deepEqual(source.jurisdictionIds, expected);
  }
  const source = packet.sources[0];
  source.review = {
    ...source.review,
    state: "reviewed_preparation",
    expiresAt: "2026-11-01T00:00:00Z",
    blockReasons: [],
  };
  source.reuseReview = "metadata_only";
  source.outputFields = ["sourceId"];
  rejects(
    () => parseDevelopmentAuthority(json(packet), options),
    "FREE_SPACE_FLOOR",
  );
});

test("restricted inputs are not public discovery and cannot become reviewed public preparation", () => {
  const packet = clone(fixture);
  packet.sources[0].access = "restricted";
  packet.sources[0].review.state = "pending";
  assert.equal(
    sourceDiscoveryEligibility(json(packet), "synthetic-county", options)
      .eligibleForPublicDiscovery,
    false,
  );
  packet.sources[0].review.state = "reviewed_preparation";
  rejects(
    () => parseDevelopmentAuthority(json(packet), options),
    "RESTRICTED_SOURCE_NOT_PUBLIC",
  );
});

test("a blocked source remains representable without pretending qualification", () => {
  const packet = clone(fixture);
  packet.sources[0].review = {
    state: "blocked",
    evidenceRefs: [],
    expiresAt: null,
    blockReasons: ["reuse"],
  };
  assert.equal(
    parseDevelopmentAuthority(json(packet), options).sources[0].review.state,
    "blocked",
  );
  packet.sources[0].review.blockReasons = [];
  rejects(
    () => parseDevelopmentAuthority(json(packet), options),
    "MISSING_BLOCK_REASON",
  );
});

for (const [name, mutate, code] of [
  [
    "unknown property",
    (p) => {
      p.grant = true;
    },
    "INVALID_PAYLOAD",
  ],
  [
    "dispatch grant",
    (p) => {
      p.dispatchAllowed = true;
    },
    "INVALID_PAYLOAD",
  ],
  [
    "malformed calendar date",
    (p) => {
      p.sources[0].dateWindow.from = "2026-02-30";
    },
    "INVALID_PAYLOAD",
  ],
  [
    "reversed dates",
    (p) => {
      p.sources[0].dateWindow.from = "2027-01-01";
    },
    "REVERSED_DATE_WINDOW",
  ],
  [
    "expired review",
    (p) => {
      p.sources[0].review.expiresAt = now;
    },
    "MISSING_OR_EXPIRED_REVIEW",
  ],
  [
    "missing evidence",
    (p) => {
      p.sources[0].review.evidenceRefs = [];
    },
    "MISSING_OR_EXPIRED_REVIEW",
  ],
  [
    "missing inventory",
    (p) => {
      p.storage.allManagedRootsInventoried = false;
    },
    "MISSING_STORAGE_INVENTORY",
  ],
  [
    "undercounted peak",
    (p) => {
      p.storage.peakAdditionalBytes = 1;
    },
    "PEAK_UNDERCOUNTS_ADMISSION",
  ],
  [
    "total managed ceiling",
    (p) => {
      p.storage.managedBytes = 50000000000;
    },
    "MANAGED_BYTE_LIMIT",
  ],
  [
    "disk floor",
    (p) => {
      p.storage.freeBytes = 21474836480;
    },
    "FREE_SPACE_FLOOR",
  ],
  [
    "raised run ceiling",
    (p) => {
      p.storage.maxRunBytes++;
    },
    "INVALID_PAYLOAD",
  ],
  [
    "metadata-only quotation",
    (p) => {
      p.sources[0].outputFields.push("quotation");
    },
    "REUSE_EXCEEDS_REVIEW",
  ],
  [
    "URL credentials",
    (p) => {
      p.sources[0].officialUrls = ["https://user:secret@example.invalid/data"];
    },
    "UNSAFE_SOURCE_URL",
  ],
  [
    "nested geometry",
    (p) => {
      p.sources[0].bbox = [1, 2, 3, 4];
    },
    "INVALID_PAYLOAD",
  ],
  [
    "duplicate source identity",
    (p) => {
      const row = clone(p.sources[0]);
      row.family = "resolution";
      p.sources.push(row);
    },
    "DUPLICATE_SOURCE",
  ],
])
  test(`source refusal: ${name}`, () => {
    const packet = clone(fixture);
    mutate(packet);
    rejects(() => parseDevelopmentAuthority(json(packet), options), code);
  });

test("JSON-only input and explicit clock prevent implicit object execution or time", () => {
  rejects(
    () => parseDevelopmentAuthority(fixture, options),
    "INVALID_JSON_INPUT",
  );
  rejects(() => parseDevelopmentAuthority("{", options), "INVALID_JSON_INPUT");
  rejects(() => parseDevelopmentAuthority(json(fixture)), "INVALID_NOW");
  rejects(
    () =>
      parseDevelopmentAuthority(json(fixture), { now: "2026-02-30T00:00:00Z" }),
    "INVALID_NOW",
  );
});

test("common profile remains Nation-free in schema and semantics", () => {
  assert.equal(
    validateExchangePreparation(json(exchange()), options).dispatchAllowed,
    false,
  );
  rejects(
    () =>
      validateExchangePreparation(
        json({ ...withNation(), profile: COMMON_PROFILE }),
        options,
      ),
    "INVALID_PAYLOAD",
  );
  const packet = exchange();
  packet.criteria.jurisdictionIds = ["nation:synthetic-example"];
  rejects(
    () => validateExchangePreparation(json(packet), options),
    "NATION_OUTSIDE_SELECTED_FIELD",
  );
});

test("ATNI profile requires separate recipient/profile/purpose scoped evidence", () => {
  rejects(
    () => validateExchangePreparation(json(exchange(ATNI_PROFILE)), options),
    "MISSING_AUTHORIZATION_EVIDENCE",
  );
  assert.equal(
    validateExchangePreparation(json(exchange(ATNI_PROFILE)), authOptions())
      .assessmentConformant,
    true,
  );
  for (const change of [
    { recipientId: "other-peer" },
    { profile: COMMON_PROFILE },
    { revoked: true },
    { expiresAt: now },
  ]) {
    const grant = { ...authorization(), ...change };
    rejects(
      () =>
        validateExchangePreparation(
          json(exchange(ATNI_PROFILE)),
          authOptions(grant),
        ),
      change.revoked || change.expiresAt
        ? "AUTHORIZATION_INACTIVE"
        : "AUTHORIZATION_SCOPE_MISMATCH",
    );
  }
});

test("optional Nation must be deliberate and match the separately pinned registry", () => {
  assert.equal(
    validateExchangePreparation(json(withNation()), authOptions())
      .assessmentConformant,
    true,
  );
  rejects(
    () =>
      validateExchangePreparation(json(withNation()), {
        ...authOptions(),
        registryJson: undefined,
      }),
    "MISSING_REGISTRY_EVIDENCE",
  );
  rejects(
    () =>
      validateExchangePreparation(json(withNation()), {
        ...authOptions(),
        registryJson: json({ ...registry, digest: "c".repeat(64) }),
      }),
    "UNVERIFIED_NATION_SELECTION",
  );
  const packet = withNation();
  packet.selectedNation.id = "nation:unknown";
  rejects(
    () => validateExchangePreparation(json(packet), authOptions()),
    "UNVERIFIED_NATION_SELECTION",
  );
  packet.selectedNation.deliberate = false;
  rejects(
    () => validateExchangePreparation(json(packet), authOptions()),
    "INVALID_PAYLOAD",
  );
});

test("registry membership is hashed against its independently authorized pin", () => {
  const packet = withNation();
  const reversed = {
    ...registry,
    nationIds: [...registry.nationIds].reverse(),
  };
  assert.equal(
    validateExchangePreparation(json(packet), {
      ...authOptions(),
      registryJson: json(reversed),
    }).assessmentConformant,
    true,
  );
  const injected = {
    ...registry,
    nationIds: [...registry.nationIds, "nation:injected"],
  };
  packet.selectedNation.id = "nation:injected";
  rejects(
    () =>
      validateExchangePreparation(json(packet), {
        ...authOptions(),
        registryJson: json(injected),
      }),
    "UNVERIFIED_NATION_SELECTION",
  );
  injected.digest = createHash("sha256")
    .update(
      JSON.stringify({
        kind: "gd31_synthetic_nation_registry",
        schemaVersion: "1.0.0",
        synthetic: true,
        nationIds: [...injected.nationIds].sort(),
      }),
      "utf8",
    )
    .digest("hex");
  rejects(
    () =>
      validateExchangePreparation(json(packet), {
        ...authOptions(),
        registryJson: json(injected),
      }),
    "UNVERIFIED_NATION_SELECTION",
  );
});

test("migration never silently drops Nation selection and does not weaken sensitivity", () => {
  rejects(
    () =>
      migrateExchangePreparation(json(withNation()), COMMON_PROFILE, options),
    "EXPLICIT_NATION_REMOVAL_REQUIRED",
  );
  const result = migrateExchangePreparation(
    json(withNation()),
    COMMON_PROFILE,
    { ...options, removeNation: true },
  );
  assert.equal(result.migration.nationRemoved, true);
  assert.equal(Object.hasOwn(result.packet, "selectedNation"), false);
  assert.equal(result.dispatchAllowed, false);
  assert.deepEqual(result.packet.sensitivity, withNation().sensitivity);
  rejects(
    () => migrateExchangePreparation(json(exchange()), ATNI_PROFILE, options),
    "MISSING_AUTHORIZATION_EVIDENCE",
  );
  assert.equal(
    migrateExchangePreparation(json(exchange()), ATNI_PROFILE, authOptions())
      .packet.profile,
    ATNI_PROFILE,
  );
});

for (const [name, mutate, code] of [
  [
    "private derivation",
    (p) => {
      p.sensitivity.derivedFromPrivate = true;
    },
    "PRIVATE_DERIVATION_NOT_EXCHANGEABLE",
  ],
  [
    "T2 input",
    (p) => {
      p.sensitivity.tier = "T2";
    },
    "TIER_NOT_ALLOWED",
  ],
  [
    "land status",
    (p) => {
      p.landStatusClasses = ["fee"];
    },
    "INVALID_PAYLOAD",
  ],
  [
    "attachment",
    (p) => {
      p.attachment = "private";
    },
    "INVALID_PAYLOAD",
  ],
  [
    "coordinate query",
    (p) => {
      p.criteria.query = "47.123, -122.456";
    },
    "PROHIBITED_QUERY",
  ],
  [
    "parcel query",
    (p) => {
      p.criteria.query = "APN 123-456";
    },
    "PROHIBITED_QUERY",
  ],
  [
    "real exchange",
    (p) => {
      p.synthetic = false;
    },
    "REAL_EXCHANGE_NOT_IMPLEMENTED",
  ],
])
  test(`exchange refusal: ${name}`, () => {
    const packet = exchange();
    mutate(packet);
    rejects(() => validateExchangePreparation(json(packet), options), code);
  });

test("public sources cannot publicize an independently private analyst note", () => {
  const result = evaluateRestrictionPreparation(
    json(permissions()),
    json(request),
    options,
  );
  assert.deepEqual(result, {
    assessmentWouldPermit: false,
    denied: [{ origin: "authored", restrictionId: "synthetic-private-note" }],
    dispatchAllowed: false,
  });
});

test("source and authored restrictions intersect recipients, fields, purpose, retention and onward sharing", () => {
  const packet = permissions();
  packet.authored[0].recipients = ["synthetic-peer"];
  assert.equal(
    evaluateRestrictionPreparation(json(packet), json(request), options)
      .assessmentWouldPermit,
    true,
  );
  for (const change of [
    { purpose: "case_export" },
    { fields: ["finding"] },
    { retentionDays: 31 },
    { onwardSharing: true },
    { recipientId: "denied-peer" },
  ])
    assert.equal(
      evaluateRestrictionPreparation(
        json(packet),
        json({ ...request, ...change }),
        options,
      ).assessmentWouldPermit,
      false,
    );
  packet.source[0].withdrawn = true;
  assert.equal(
    evaluateRestrictionPreparation(json(packet), json(request), options)
      .denied[0].origin,
    "source",
  );
  packet.source[0].withdrawn = false;
  packet.authored[0].expiresAt = now;
  assert.equal(
    evaluateRestrictionPreparation(json(packet), json(request), options)
      .denied[0].origin,
    "authored",
  );
});

test("empty or unbacked restriction claims fail closed", () => {
  const packet = permissions();
  packet.authored = [];
  rejects(
    () => evaluateRestrictionPreparation(json(packet), json(request), options),
    "INVALID_PAYLOAD",
  );
  packet.authored = permissions().authored;
  packet.authored[0].agreementRef = null;
  rejects(
    () => evaluateRestrictionPreparation(json(packet), json(request), options),
    "MISSING_AGREEMENT_REFERENCE",
  );
});
