import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import process from "node:process";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../../schemas/source-catalog.schema.v1.json" with { type: "json" };
import fixture from "../../fixtures/intake/source-catalog.synthetic.valid.json" with { type: "json" };
import {
  describeSourceCoverage,
  manifestFromSourceCatalog,
  validateSourceCatalog,
  MANAGED_STORAGE_CEILING_BYTES,
  SOURCE_CAPABILITY_MODES,
} from "../../src/modules/intake/source-catalog.mjs";
import {
  sourceCatalog,
  describeConfiguredSourceCoverage,
  initialDirectManifestFromCatalog,
} from "../../scripts/configured-source-catalog.mjs";
import {
  directSourceProfiles,
  initialDirectManifest,
} from "../../config/policy-sources.v2.mjs";
import {
  initializePolicyRun,
  openPolicyRun,
  POLICY_LIMITS,
} from "../../src/pipeline/policy-custody.mjs";
import { STORAGE_LIMITS } from "../../src/pipeline/storage-report.mjs";
import { projectSourceCoverage } from "../../src/core/source-coverage.mjs";
import { mockPolicyFilesystem } from "../helpers/policy-filesystem-observations.mjs";

const asOf = "2026-10-08T00:00:00Z";
const clone = (value = fixture) => globalThis.structuredClone(value);
const target = () => ({
  profileId: "synthetic-official",
  url: "https://official.invalid/instruments/one",
  expectedIdentity: "SYNTHETIC-ONE",
  mediaTypes: ["text/plain"],
});
const request = (extra = {}) => ({
  sourceIds: ["synthetic-official"],
  targets: [target()],
  runId: "synthetic-catalog-run",
  asOf,
  ...extra,
});
const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

test("catalog schema compiles strictly and validates synthetic and reviewed catalog data", () => {
  assert.equal(validateSchema(fixture), true);
  assert.equal(validateSchema(sourceCatalog), true);
  assert.equal(validateSourceCatalog(fixture), fixture);
  assert.equal(validateSourceCatalog(sourceCatalog), sourceCatalog);
  assert.deepEqual(SOURCE_CAPABILITY_MODES, [
    "topical",
    "full_text",
    "metadata",
    "identifier_only",
    "cached",
    "unavailable",
  ]);
});

test("browser coverage projection loads under a no-code-generation policy and matches strict intake output", () => {
  const projector = new globalThis.URL(
    "../../src/core/source-coverage.mjs",
    import.meta.url,
  ).href;
  const catalog = new globalThis.URL(
    "../../config/source-catalog.v1.mjs",
    import.meta.url,
  ).href;
  const child = spawnSync(
    process.execPath,
    [
      "--disallow-code-generation-from-strings",
      "--input-type=module",
      "--eval",
      `import { projectSourceCoverage } from ${JSON.stringify(projector)};
     import { sourceCatalog } from ${JSON.stringify(catalog)};
     process.stdout.write(JSON.stringify(projectSourceCoverage(sourceCatalog, { asOf: ${JSON.stringify(asOf)} })));`,
    ],
    {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(
    JSON.parse(child.stdout),
    describeConfiguredSourceCoverage({ asOf }),
  );
  for (const options of [
    { asOf },
    { asOf, sourceIds: [] },
    { asOf, regionCodes: ["OR"] },
    { asOf: "2026-10-06T00:00:00Z" },
    { asOf: "2026-10-10T00:00:00Z" },
  ])
    assert.deepEqual(
      projectSourceCoverage(fixture, options),
      describeSourceCoverage(fixture, options),
    );
  const credentialed = clone();
  credentialed.sources[0].credentials = {
    kind: "environment_variable",
    environmentVariable: "SYNTHETIC_SOURCE_KEY",
  };
  assert.deepEqual(
    projectSourceCoverage(credentialed, { asOf }),
    describeSourceCoverage(credentialed, { asOf }),
  );
  assert.deepEqual(
    projectSourceCoverage(credentialed, { asOf }).sources[0]
      .availableCapabilities,
    ["unavailable"],
  );
  assert.throws(
    () => projectSourceCoverage(fixture, { asOf: "2026-02-31T00:00:00Z" }),
    /INVALID_AS_OF/,
  );
  assert.throws(
    () => describeSourceCoverage(fixture, { asOf: null }),
    /INVALID_AS_OF/,
  );
});

test("closed catalog schema rejects credentials, private content and malformed fields", () => {
  const mutations = [
    (value) => {
      value.sources[0].credentials = {
        kind: "environment_variable",
        environmentVariable: "api-key-value",
      };
    },
    (value) => {
      value.sources[0].credentials = {
        kind: "environment_variable",
        environmentVariable: "SOURCE_API_KEY",
        value: "secret",
      };
    },
    (value) => {
      value.sources[0].privateNotes = "Private analyst content";
    },
    (value) => {
      value.sources[0].rawResponse = {};
    },
    (value) => {
      value.sources[0].review.reviewedAt = "2026-02-31T00:00:00Z";
    },
    (value) => {
      value.sources[0].capabilities[0].mode = "invented_full_search";
    },
    (value) => {
      value.sources[0].publishingJurisdiction.evidence = {};
    },
    (value) => {
      value.sources[0].publishingJurisdiction.ref =
        "nation:unverified-real-nation";
    },
    (value) => {
      value.managedStorageCeilingBytes = 50_000_000_001;
    },
    (value) => {
      delete value.sources[0].publisher;
    },
  ];
  for (const mutate of mutations) {
    const value = clone();
    mutate(value);
    assert.equal(validateSchema(value), false);
    assert.throws(() => validateSourceCatalog(value), /INVALID_SOURCE_CATALOG/);
  }
});

test("catalog enforces unique identities, capability evidence and reviewed qualification", () => {
  const cases = [
    [
      (value) => {
        value.sources.push(clone().sources[0]);
      },
      /DUPLICATE_SOURCE/,
    ],
    [
      (value) => {
        value.sources[0].capabilities[0] = value.sources[0].capabilities[1];
      },
      /DUPLICATE_CAPABILITY/,
    ],
    [
      (value) => {
        value.sources[0].capabilities[0].state = "documented";
      },
      /CAPABILITY_WITHOUT_EVIDENCE/,
    ],
    [
      (value) => {
        value.sources[0].implementedCapabilities.push("full_text");
      },
      /UNVERIFIED_IMPLEMENTATION/,
    ],
    [
      (value) => {
        value.sources[0].activation = null;
      },
      /ACTIVATION_EVIDENCE_REQUIRED/,
    ],
    [
      (value) => {
        value.sources[1].profile = value.sources[0].profile;
      },
      /DISCOVERY_CANNOT_ACTIVATE/,
    ],
    [
      (value) => {
        value.sources[0].review.expiresAt = null;
      },
      /UNQUALIFIED_SOURCE/,
    ],
    [
      (value) => {
        value.sources[0].profile.review.reviewer = "Different reviewer";
      },
      /PROFILE_MISMATCH/,
    ],
    [
      (value) => {
        value.sources[0].coverage.selected.from = "2027-01-01";
      },
      /REVERSED_DATE_RANGE/,
    ],
    [
      (value) => {
        value.sources[0].review.evidenceUrls[0] =
          "https://official.invalid/policy?api_key=not-allowed";
      },
      /UNSAFE_EVIDENCE_URL/,
    ],
  ];
  for (const [mutate, expected] of cases) {
    const value = clone();
    mutate(value);
    assert.throws(() => validateSourceCatalog(value), expected);
  }
});

test("capability reporting separates discovery, qualified, active, expired and future reviews", () => {
  const active = describeSourceCoverage(fixture, { asOf }).sources[0];
  assert.deepEqual(active.availableCapabilities, ["identifier_only", "cached"]);
  assert.equal(active.reviewStatus, "current");
  assert.equal(
    active.declaredCapabilities.find((entry) => entry.mode === "full_text")
      .state,
    "unknown",
  );
  const qualified = clone();
  qualified.sources[0].lifecycle = "qualified";
  qualified.sources[0].activation = null;
  assert.deepEqual(
    describeSourceCoverage(qualified, { asOf }).sources[0]
      .availableCapabilities,
    ["unavailable"],
  );
  const expired = clone();
  expired.sources[0].review.expiresAt = "2026-10-08T00:00:00Z";
  expired.sources[0].profile.review.expiresAt = "2026-10-08T00:00:00Z";
  assert.equal(
    describeSourceCoverage(expired, { asOf }).sources[0].reviewStatus,
    "expired",
  );
  assert.deepEqual(
    describeSourceCoverage(expired, { asOf }).sources[0].availableCapabilities,
    ["unavailable"],
  );
  assert.throws(
    () => manifestFromSourceCatalog(expired, request()),
    /REVIEW_NOT_CURRENT/,
  );
  assert.equal(
    describeSourceCoverage(fixture, { asOf: "2026-10-06T00:00:00Z" }).sources[0]
      .reviewStatus,
    "future",
  );
  assert.throws(
    () => describeSourceCoverage(fixture, { asOf: "yesterday" }),
    /INVALID_AS_OF/,
  );
  assert.throws(
    () => describeSourceCoverage(fixture, { asOf: "2026-02-31T00:00:00Z" }),
    /INVALID_AS_OF/,
  );
});

test("all seven states and intertribal publishers expose explicit gaps without activating services", () => {
  const report = describeConfiguredSourceCoverage({ asOf });
  assert.equal(report.sources.length, 46);
  for (const state of ["WA", "OR", "ID", "AK", "CA", "MT", "NV"]) {
    const entries = report.sources.filter((source) =>
      source.discoveryRegions.includes(state),
    );
    assert.ok(entries.length >= 4);
    assert.ok(
      entries.every((source) =>
        source.availableCapabilities.includes("unavailable"),
      ),
    );
  }
  for (const id of [
    "atni-resolutions",
    "ncai-resolutions",
    "uset-resolutions",
    "uset-spf-resolutions",
  ]) {
    const source = report.sources.find((entry) => entry.id === id);
    assert.equal(source.authorityClass, "intergovernmental");
    assert.equal(source.attributionScope, "publisher_only");
    assert.equal(source.publishingJurisdiction, null);
    assert.equal(source.lifecycle, "discovery");
    assert.equal(source.review.expiresAt, null);
    assert.deepEqual(source.availableCapabilities, ["unavailable"]);
    assert.equal(source.coverage.selected, null);
    assert.equal(source.coverage.emitted, null);
  }
  assert.notEqual(
    report.sources.find((entry) => entry.id === "uset-resolutions").publisher,
    report.sources.find((entry) => entry.id === "uset-spf-resolutions")
      .publisher,
  );
  for (const id of [
    "ncai-resolutions",
    "uset-resolutions",
    "ecfr-api",
    "or-administrative-rules",
  ]) {
    assert.ok(
      report.sources
        .find((entry) => entry.id === id)
        .blockers.some((entry) => entry.code === "terms-blocked"),
    );
  }
  assert.ok(report.sources.every((source) => source.lifecycle !== "active"));
});

test("geographic discovery is independent of evidence-backed publisher identity and date coverage", () => {
  const report = describeConfiguredSourceCoverage({
    asOf,
    regionCodes: ["OR"],
  });
  assert.equal(report.geographyBasis, "discovery_relevance_only");
  assert.ok(
    report.sources.some((source) => source.id === "federal-register-api"),
  );
  assert.ok(
    report.sources.some((source) => source.id === "or-legislative-odata"),
  );
  assert.ok(!report.sources.some((source) => source.id === "wa-statutes"));
  const source = report.sources.find(
    (entry) => entry.id === "or-legislative-odata",
  );
  assert.equal(source.publishingJurisdiction, null);
  assert.equal(source.coverage.documented.from, "2007-01-01");
  assert.equal(source.coverage.selected, null);
  assert.equal(source.coverage.emitted, null);
  assert.ok(report.limitations.some((note) => note.includes("zero matches")));
  const empty = describeConfiguredSourceCoverage({ asOf, sourceIds: [] });
  assert.deepEqual(empty.sources, []);
  assert.deepEqual(empty.scope.sourceIds, []);
  assert.throws(
    () =>
      describeConfiguredSourceCoverage({ asOf, sourceIds: ["missing-source"] }),
    /UNKNOWN_SOURCE/,
  );
  const forged = clone();
  forged.sources[0].authorityClass = "intergovernmental";
  assert.throws(
    () => validateSourceCatalog(forged),
    /PUBLISHER_JURISDICTION_MISMATCH/,
  );
  forged.sources[0].attributionScope = "member_nations";
  assert.throws(() => validateSourceCatalog(forged), /INVALID_SOURCE_CATALOG/);
});

test("credential environment references are inert and user-supplied records cannot enter network manifests", () => {
  const keyed = clone();
  keyed.sources[0].credentials = {
    kind: "environment_variable",
    environmentVariable: "SYNTHETIC_SOURCE_API_KEY",
  };
  assert.doesNotThrow(() => validateSourceCatalog(keyed));
  assert.deepEqual(
    describeSourceCoverage(keyed, { asOf }).sources[0].availableCapabilities,
    ["unavailable"],
  );
  assert.throws(
    () => manifestFromSourceCatalog(keyed, request()),
    /SOURCE_NOT_ADMISSIBLE/,
  );
  assert.throws(
    () =>
      manifestFromSourceCatalog(
        fixture,
        request({
          sourceIds: ["synthetic-user-supplied"],
          targets: [{ ...target(), profileId: "synthetic-user-supplied" }],
        }),
      ),
    /SOURCE_NOT_ADMISSIBLE/,
  );
  assert.throws(
    () =>
      manifestFromSourceCatalog(
        fixture,
        request({ trustDomain: "real_source_local" }),
      ),
    /INVALID_MANIFEST_REQUEST/,
  );
});

test("historical manifest projection is byte-equivalent and never renews or activates profiles", () => {
  const before = JSON.stringify(directSourceProfiles);
  const original = initialDirectManifest("historical-catalog-replay");
  const projected = initialDirectManifestFromCatalog(
    "historical-catalog-replay",
    { purpose: "replay", asOf },
  );
  assert.deepEqual(projected, original);
  assert.equal(JSON.stringify(projected), JSON.stringify(original));
  assert.throws(
    () => initialDirectManifestFromCatalog("expired-dispatch", { asOf }),
    /REVIEW_NOT_CURRENT/,
  );
  const report = describeConfiguredSourceCoverage({ asOf });
  assert.equal(
    report.sources.find((source) => source.id === "govinfo-direct")
      .reviewStatus,
    "expired",
  );
  assert.equal(
    report.sources.find((source) => source.id === "washington-legislative-text")
      .reviewStatus,
    "expired",
  );
  projected.profiles[0].review.expiresAt = "2099-01-01T00:00:00Z";
  report.sources[0].review.expiresAt = "2099-01-01T00:00:00Z";
  assert.equal(JSON.stringify(directSourceProfiles), before);
  assert.equal(
    sourceCatalog.sources[0].review.expiresAt,
    "2026-10-05T00:00:00Z",
  );
});

test("manifest selection is finite and rejects target escape, duplicate URLs and sensitive query fields", () => {
  const badTargets = [
    { ...target(), url: "https://other.invalid/instruments/one" },
    { ...target(), url: "https://official.invalid/outside/one" },
    {
      ...target(),
      url: "https://official.invalid/instruments/one?token=secret",
    },
    { ...target(), url: "https://user:pass@official.invalid/instruments/one" },
    { ...target(), mediaTypes: ["application/octet-stream"] },
    { ...target(), expectedIdentity: "" },
    { ...target(), privateNotes: "no" },
  ];
  for (const value of badTargets)
    assert.throws(
      () => manifestFromSourceCatalog(fixture, request({ targets: [value] })),
      /CATALOG_(?:INVALID_TARGET|TARGET_OUTSIDE_PROFILE)/,
    );
  assert.throws(
    () =>
      manifestFromSourceCatalog(
        fixture,
        request({ targets: [target(), target()] }),
      ),
    /INVALID_TARGET/,
  );
  assert.throws(
    () =>
      manifestFromSourceCatalog(
        fixture,
        request({ sourceIds: ["synthetic-official", "synthetic-official"] }),
      ),
    /INVALID_SELECTION/,
  );
  assert.throws(
    () =>
      manifestFromSourceCatalog(fixture, request({ sourceIds: ["absent"] })),
    /UNKNOWN_SOURCE/,
  );
  const projected = manifestFromSourceCatalog(fixture, request());
  projected.profiles[0].hosts[0] = "changed.invalid";
  assert.equal(fixture.sources[0].profile.hosts[0], "official.invalid");
});

test("catalog manifest enters existing synthetic custody while storage limits remain unchanged", async (t) => {
  assert.equal(MANAGED_STORAGE_CEILING_BYTES, STORAGE_LIMITS.managedBytes);
  assert.equal(
    sourceCatalog.managedStorageCeilingBytes,
    STORAGE_LIMITS.managedBytes,
  );
  assert.equal(POLICY_LIMITS.runBytes, 10 * 1024 ** 3);
  assert.equal(POLICY_LIMITS.freeBytes, 20 * 1024 ** 3);
  mockPolicyFilesystem(t, {
    availableBytes: POLICY_LIMITS.freeBytes + POLICY_LIMITS.runBytes,
  });
  const parent = dirname(resolve(import.meta.dirname, "../.."));
  const base = await mkdtemp(join(parent, "policy-source-catalog-test-"));
  t.after(async () => {
    assert.ok(
      resolve(base).startsWith(join(parent, "policy-source-catalog-test-")),
    );
    await rm(base, { recursive: true, force: true });
  });
  const manifest = manifestFromSourceCatalog(fixture, request());
  await initializePolicyRun(join(base, "run"), manifest);
  assert.deepEqual((await openPolicyRun(join(base, "run"))).manifest, manifest);
});
