import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { assertSourceRegistrySemantics } from "../../src/pipeline/source-registry.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function json(relativePath) {
  return JSON.parse(
    await readFile(path.resolve(projectRoot, relativePath), "utf8"),
  );
}

const [sourceSchema, sourceRegistry] = await Promise.all([
  json("schemas/source.schema.v1.json"),
  json("config/sources.v1.json"),
]);
const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
});
addFormats(ajv);
const validateSources = ajv.compile(sourceSchema);

test("source registry records researched disabled production sources", () => {
  assert.equal(validateSources(sourceRegistry), true);
  assert.doesNotThrow(() => assertSourceRegistrySemantics(sourceRegistry));
  assert.equal(sourceRegistry.schemaVersion, "1.3.0");
  assert.equal(sourceRegistry.registryVersion, "1.15.0");

  const federalRegister = sourceRegistry.sources.find(
    ({ id }) => id === "federal-register",
  );
  assert.deepEqual(
    {
      enabled: federalRegister.enabled,
      synthetic: federalRegister.synthetic,
      adapter: federalRegister.adapter,
      accessedOn: federalRegister.access.accessedOn,
      method: federalRegister.access.method,
    },
    {
      enabled: false,
      synthetic: false,
      adapter: {
        id: "federal-register-adapter",
        version: "1.0.0",
        module: "src/adapters/federal-register/index.ts",
        identityRule: "federal-register-document-number-v1",
      },
      accessedOn: "2026-07-31",
      method: "api",
    },
  );

  const grantsGov = sourceRegistry.sources.find(
    ({ id }) => id === "grants-gov",
  );
  assert.deepEqual(
    {
      enabled: grantsGov.enabled,
      synthetic: grantsGov.synthetic,
      adapter: grantsGov.adapter,
      accessedOn: grantsGov.access.accessedOn,
      method: grantsGov.access.method,
      authentication: grantsGov.access.authentication,
    },
    {
      enabled: false,
      synthetic: false,
      adapter: null,
      accessedOn: "2026-07-31",
      method: "api",
      authentication: "none",
    },
  );

  const congressGov = sourceRegistry.sources.find(
    ({ id }) => id === "congress-gov",
  );
  assert.deepEqual(
    {
      enabled: congressGov.enabled,
      synthetic: congressGov.synthetic,
      adapter: congressGov.adapter,
      accessedOn: congressGov.access.accessedOn,
      method: congressGov.access.method,
      authentication: congressGov.access.authentication,
    },
    {
      enabled: false,
      synthetic: false,
      adapter: null,
      accessedOn: "2026-07-31",
      method: "api",
      authentication: "build_secret",
    },
  );

  const govInfo = sourceRegistry.sources.find(({ id }) => id === "govinfo");
  assert.deepEqual(
    {
      enabled: govInfo.enabled,
      synthetic: govInfo.synthetic,
      adapter: govInfo.adapter,
      accessedOn: govInfo.access.accessedOn,
      method: govInfo.access.method,
      authentication: govInfo.access.authentication,
      allowedHosts: govInfo.access.allowedHosts,
    },
    {
      enabled: false,
      synthetic: false,
      adapter: null,
      accessedOn: "2026-07-31",
      method: "api",
      authentication: "build_secret",
      allowedHosts: ["www.govinfo.gov"],
    },
  );

  const regulationsGov = sourceRegistry.sources.find(
    ({ id }) => id === "regulations-gov",
  );
  assert.deepEqual(
    {
      enabled: regulationsGov.enabled,
      synthetic: regulationsGov.synthetic,
      adapter: regulationsGov.adapter,
      accessedOn: regulationsGov.access.accessedOn,
      method: regulationsGov.access.method,
      authentication: regulationsGov.access.authentication,
      allowedHosts: regulationsGov.access.allowedHosts,
      termsUrl: regulationsGov.publication.termsUrl,
      reproduction: regulationsGov.publication.reproduction,
    },
    {
      enabled: false,
      synthetic: false,
      adapter: null,
      accessedOn: "2026-07-31",
      method: "api",
      authentication: "build_secret",
      allowedHosts: ["www.regulations.gov"],
      termsUrl: "https://www.regulations.gov/user-notice",
      reproduction: "metadata_and_links",
    },
  );

  const washingtonLws = sourceRegistry.sources.find(
    ({ id }) => id === "washington-lws",
  );
  assert.deepEqual(
    {
      enabled: washingtonLws.enabled,
      synthetic: washingtonLws.synthetic,
      adapter: washingtonLws.adapter,
      accessedOn: washingtonLws.access.accessedOn,
      method: washingtonLws.access.method,
      authentication: washingtonLws.access.authentication,
      allowedHosts: washingtonLws.access.allowedHosts,
      coverageFrom: washingtonLws.coverage.from,
      coverageThrough: washingtonLws.coverage.through,
      termsUrl: washingtonLws.publication.termsUrl,
      reproduction: washingtonLws.publication.reproduction,
      officialSubjectMappings: washingtonLws.officialSubjectMappings,
    },
    {
      enabled: false,
      synthetic: false,
      adapter: null,
      accessedOn: "2026-07-31",
      method: "api",
      authentication: "none",
      allowedHosts: ["wslwebservices.leg.wa.gov"],
      coverageFrom: null,
      coverageThrough: null,
      termsUrl: "https://leg.wa.gov/privacy-notice/",
      reproduction: "metadata_and_links",
      officialSubjectMappings: [],
    },
  );
  assert.match(
    washingtonLws.coverage.limitations,
    /No service-wide historical start/,
  );

  const washingtonStateRegister = sourceRegistry.sources.find(
    ({ id }) => id === "washington-state-register",
  );
  assert.deepEqual(
    {
      enabled: washingtonStateRegister.enabled,
      synthetic: washingtonStateRegister.synthetic,
      adapter: washingtonStateRegister.adapter,
      accessedOn: washingtonStateRegister.access.accessedOn,
      method: washingtonStateRegister.access.method,
      authentication: washingtonStateRegister.access.authentication,
      allowedHosts: washingtonStateRegister.access.allowedHosts,
      coverageFrom: washingtonStateRegister.coverage.from,
      termsUrl: washingtonStateRegister.publication.termsUrl,
      reproduction: washingtonStateRegister.publication.reproduction,
      officialSubjectMappings: washingtonStateRegister.officialSubjectMappings,
    },
    {
      enabled: false,
      synthetic: false,
      adapter: null,
      accessedOn: "2026-07-31",
      method: "official_index",
      authentication: "none",
      allowedHosts: ["app.leg.wa.gov", "lawfilesext.leg.wa.gov", "leg.wa.gov"],
      coverageFrom: null,
      termsUrl: "https://leg.wa.gov/privacy-notice/",
      reproduction: "metadata_and_links",
      officialSubjectMappings: [],
    },
  );
  assert.match(
    washingtonStateRegister.coverage.limitations,
    /Grouped filing pages begin with issue 05-19/,
  );

  const washingtonGovernorExecutiveOrders = sourceRegistry.sources.find(
    ({ id }) => id === "washington-governor-executive-orders",
  );
  assert.deepEqual(
    {
      enabled: washingtonGovernorExecutiveOrders.enabled,
      synthetic: washingtonGovernorExecutiveOrders.synthetic,
      adapter: washingtonGovernorExecutiveOrders.adapter,
      accessedOn: washingtonGovernorExecutiveOrders.access.accessedOn,
      method: washingtonGovernorExecutiveOrders.access.method,
      authentication: washingtonGovernorExecutiveOrders.access.authentication,
      allowedHosts: washingtonGovernorExecutiveOrders.access.allowedHosts,
      coverageFrom: washingtonGovernorExecutiveOrders.coverage.from,
      termsUrl: washingtonGovernorExecutiveOrders.publication.termsUrl,
      reproduction: washingtonGovernorExecutiveOrders.publication.reproduction,
      officialSubjectMappings:
        washingtonGovernorExecutiveOrders.officialSubjectMappings,
    },
    {
      enabled: false,
      synthetic: false,
      adapter: {
        id: "washington-governor-executive-orders-adapter",
        version: "1.0.0",
        module: "src/adapters/washington-governor-executive-orders/index.ts",
        identityRule:
          "washington-governor-executive-order-number-issued-date-v1",
      },
      accessedOn: "2026-07-31",
      method: "official_index",
      authentication: "none",
      allowedHosts: ["governor.wa.gov"],
      coverageFrom: "1918-11-27",
      termsUrl: "https://governor.wa.gov/privacy-notice",
      reproduction: "metadata_and_links",
      officialSubjectMappings: [],
    },
  );
  assert.match(
    washingtonGovernorExecutiveOrders.coverage.limitations,
    /cannot claim historical or all-active-order completeness/,
  );

  const washingtonCentennialAccord = sourceRegistry.sources.find(
    ({ id }) => id === "washington-centennial-accord",
  );
  assert.deepEqual(
    {
      enabled: washingtonCentennialAccord.enabled,
      synthetic: washingtonCentennialAccord.synthetic,
      adapter: washingtonCentennialAccord.adapter,
      accessedOn: washingtonCentennialAccord.access.accessedOn,
      method: washingtonCentennialAccord.access.method,
      authentication: washingtonCentennialAccord.access.authentication,
      allowedHosts: washingtonCentennialAccord.access.allowedHosts,
      coverageFrom: washingtonCentennialAccord.coverage.from,
      coverageThrough: washingtonCentennialAccord.coverage.through,
      termsUrl: washingtonCentennialAccord.publication.termsUrl,
      reproduction: washingtonCentennialAccord.publication.reproduction,
      officialSubjectMappings:
        washingtonCentennialAccord.officialSubjectMappings,
    },
    {
      enabled: false,
      synthetic: false,
      adapter: null,
      accessedOn: "2026-07-31",
      method: "official_page",
      authentication: "none",
      allowedHosts: ["goia.wa.gov"],
      coverageFrom: "1989-08-04",
      coverageThrough: "1989-08-04",
      termsUrl: "https://goia.wa.gov/privacy-notice",
      reproduction: "metadata_and_links",
      officialSubjectMappings: [],
    },
  );
  assert.match(
    washingtonCentennialAccord.coverage.limitations,
    /no individual Nation signatories/,
  );
  assert.match(
    washingtonCentennialAccord.coverage.limitations,
    /record model cannot preserve parties/,
  );

  const blockedStateCourtSources = [
    {
      id: "washington-appellate-slip-opinions",
      allowedHosts: ["www.courts.wa.gov"],
      coverageFrom: null,
      termsUrl: "https://www.courts.wa.gov/?fa=home.notice",
      limitation: /no citation separate from the docket/,
    },
    {
      id: "oregon-appellate-opinions",
      allowedHosts: ["www.courts.oregon.gov"],
      coverageFrom: null,
      termsUrl: "https://www.oregon.gov/pages/terms-and-conditions.aspx",
      limitation: /access-triggered terms/,
    },
    {
      id: "idaho-supreme-court-opinions",
      allowedHosts: ["api.isc.idaho.gov", "isc.idaho.gov"],
      coverageFrom: "2019-09-11",
      termsUrl: "https://isc.idaho.gov/rules-procedure/icar",
      limitation: /no per-record reporter or neutral citation/,
    },
    {
      id: "idaho-court-of-appeals-opinions",
      allowedHosts: ["api.isc.idaho.gov", "isc.idaho.gov"],
      coverageFrom: "2013-07-12",
      termsUrl: "https://isc.idaho.gov/rules-procedure/icar",
      limitation: /no per-record reporter or neutral citation/,
    },
  ];
  for (const expected of blockedStateCourtSources) {
    const source = sourceRegistry.sources.find(({ id }) => id === expected.id);
    assert.deepEqual(
      {
        enabled: source.enabled,
        synthetic: source.synthetic,
        adapter: source.adapter,
        stateCode: source.jurisdiction.stateCode,
        accessedOn: source.access.accessedOn,
        method: source.access.method,
        authentication: source.access.authentication,
        allowedHosts: source.access.allowedHosts,
        coverageFrom: source.coverage.from,
        coverageThrough: source.coverage.through,
        termsUrl: source.publication.termsUrl,
        reproduction: source.publication.reproduction,
        failureMode: source.publication.failureMode,
        officialSubjectMappings: source.officialSubjectMappings,
      },
      {
        enabled: false,
        synthetic: false,
        adapter: null,
        stateCode:
          expected.id === "oregon-appellate-opinions"
            ? "OR"
            : expected.id.startsWith("idaho-")
              ? "ID"
              : "WA",
        accessedOn: "2026-07-31",
        method: "official_index",
        authentication: "none",
        allowedHosts: expected.allowedHosts,
        coverageFrom: expected.coverageFrom,
        coverageThrough: null,
        termsUrl: expected.termsUrl,
        reproduction: "metadata_and_links",
        failureMode: "last_known_good",
        officialSubjectMappings: [],
      },
    );
    assert.match(source.coverage.limitations, expected.limitation);
    assert.ok(
      source.publication.requiredProvenancePointers.includes(
        "/judicialContext/citations/0/value",
      ),
    );
    assert.ok(
      source.publication.requiredProvenancePointers.includes(
        "/judicialContext/revisionReview/state",
      ),
    );
  }

  const blockedOregonNonOdataSources = [
    {
      id: "oregon-administrative-rules-bulletins",
      documentationUrl:
        "https://secure.sos.state.or.us/oard/displayBulletins.action",
      allowedHosts: ["secure.sos.state.or.us"],
      requiredDatePointer: "/dates/filed",
      limitation: /61 proposed-notice rows without AONs/,
    },
    {
      id: "oregon-governor-executive-orders",
      documentationUrl:
        "https://www.oregon.gov/gov/Pages/executive-orders.aspx",
      allowedHosts: ["www.oregon.gov"],
      requiredDatePointer: "/dates/issued",
      limitation: /aggregate Executive Orders and Other Notices document/,
    },
  ];
  for (const expected of blockedOregonNonOdataSources) {
    const source = sourceRegistry.sources.find(({ id }) => id === expected.id);
    assert.deepEqual(
      {
        enabled: source.enabled,
        synthetic: source.synthetic,
        adapter: source.adapter,
        stateCode: source.jurisdiction.stateCode,
        documentationUrl: source.access.officialDocumentationUrl,
        accessedOn: source.access.accessedOn,
        method: source.access.method,
        authentication: source.access.authentication,
        allowedHosts: source.access.allowedHosts,
        coverageFrom: source.coverage.from,
        coverageThrough: source.coverage.through,
        termsUrl: source.publication.termsUrl,
        reproduction: source.publication.reproduction,
        failureMode: source.publication.failureMode,
        officialSubjectMappings: source.officialSubjectMappings,
      },
      {
        enabled: false,
        synthetic: false,
        adapter: null,
        stateCode: "OR",
        documentationUrl: expected.documentationUrl,
        accessedOn: "2026-07-31",
        method: "official_index",
        authentication: "none",
        allowedHosts: expected.allowedHosts,
        coverageFrom: null,
        coverageThrough: null,
        termsUrl: "https://www.oregon.gov/pages/terms-and-conditions.aspx",
        reproduction: "metadata_and_links",
        failureMode: "last_known_good",
        officialSubjectMappings: [],
      },
    );
    assert.match(source.access.rateLimit, /terms/);
    assert.match(source.coverage.limitations, expected.limitation);
    assert.ok(
      source.publication.requiredProvenancePointers.includes(
        expected.requiredDatePointer,
      ),
    );
  }

  const doiIbia = sourceRegistry.sources.find(
    ({ id }) => id === "doi-ibia-decisions",
  );
  assert.deepEqual(
    {
      enabled: doiIbia.enabled,
      synthetic: doiIbia.synthetic,
      adapter: doiIbia.adapter,
      accessedOn: doiIbia.access.accessedOn,
      method: doiIbia.access.method,
      authentication: doiIbia.access.authentication,
      allowedHosts: doiIbia.access.allowedHosts,
      coverageFrom: doiIbia.coverage.from,
      coverageThrough: doiIbia.coverage.through,
      termsUrl: doiIbia.publication.termsUrl,
      reproduction: doiIbia.publication.reproduction,
      officialSubjectMappings: doiIbia.officialSubjectMappings,
    },
    {
      enabled: false,
      synthetic: false,
      adapter: null,
      accessedOn: "2026-07-31",
      method: "official_index",
      authentication: "none",
      allowedHosts: ["www.doi.gov", "www.oha.doi.gov"],
      coverageFrom: "1970-08-13",
      coverageThrough: null,
      termsUrl: "https://www.doi.gov/copyright",
      reproduction: "metadata_and_links",
      officialSubjectMappings: [],
    },
  );
  assert.match(doiIbia.coverage.limitations, /robots-disallowed OHA host/);
  assert.match(doiIbia.coverage.limitations, /Broad adapter implementation/);

  const supremeCourt = sourceRegistry.sources.find(
    ({ id }) => id === "supreme-court-opinions-curated",
  );
  assert.deepEqual(
    {
      enabled: supremeCourt.enabled,
      synthetic: supremeCourt.synthetic,
      adapter: supremeCourt.adapter,
      accessedOn: supremeCourt.access.accessedOn,
      method: supremeCourt.access.method,
      authentication: supremeCourt.access.authentication,
      allowedHosts: supremeCourt.access.allowedHosts,
      coverageFrom: supremeCourt.coverage.from,
      coverageThrough: supremeCourt.coverage.through,
      termsUrl: supremeCourt.publication.termsUrl,
      reproduction: supremeCourt.publication.reproduction,
      officialSubjectMappings: supremeCourt.officialSubjectMappings,
    },
    {
      enabled: false,
      synthetic: false,
      adapter: {
        id: "supreme-court-opinions-curated-adapter",
        version: "1.1.0",
        module: "src/adapters/supreme-court-opinions-curated/index.ts",
        identityRule: "supreme-court-docket-reporter-citation-v1",
      },
      accessedOn: "2026-07-31",
      method: "official_index",
      authentication: "none",
      allowedHosts: ["www.supremecourt.gov"],
      coverageFrom: "2019-03-19",
      coverageThrough: "2019-03-19",
      termsUrl:
        "https://www.supremecourt.gov/policies/web_policies_and_notices.aspx",
      reproduction: "metadata_and_links",
      officialSubjectMappings: [],
    },
  );
  for (const pointer of [
    "/landmark/isLandmark",
    "/landmark/criterionCodes/0",
    "/landmark/reviewState",
    "/landmark/officialEvidence/0/sourceLabel",
    "/landmark/officialEvidence/0/sourceUrl",
    "/landmark/officialEvidence/0/sourceDate",
    "/landmark/officialEvidence/0/reproductionBasis",
  ]) {
    assert.ok(
      supremeCourt.publication.requiredProvenancePointers.includes(pointer),
      pointer,
    );
  }
  assert.match(
    supremeCourt.coverage.limitations,
    /only Washington State Dept\. of Licensing v\. Cougar Den, Inc\./,
  );
  assert.match(
    supremeCourt.coverage.limitations,
    /retains only allowlisted institutional-party metadata/,
  );
});

test("source and adapter identifiers are unique", () => {
  const duplicateSource = globalThis.structuredClone(sourceRegistry);
  duplicateSource.sources[1].id = duplicateSource.sources[0].id;
  assert.throws(
    () => assertSourceRegistrySemantics(duplicateSource),
    /duplicate source registry ID/,
  );

  const duplicateAdapter = globalThis.structuredClone(sourceRegistry);
  duplicateAdapter.sources[1].adapter.id =
    duplicateAdapter.sources[0].adapter.id;
  assert.throws(
    () => assertSourceRegistrySemantics(duplicateAdapter),
    /duplicate adapter ID/,
  );
});

test("enabled sources require an adapter", () => {
  const invalid = globalThis.structuredClone(sourceRegistry);
  const federalRegister = invalid.sources.find(
    ({ id }) => id === "federal-register",
  );
  federalRegister.enabled = true;
  federalRegister.adapter = null;
  assert.equal(validateSources(invalid), false);
});

test("blocked researched gaps cannot be activated without adapters", () => {
  for (const sourceId of [
    "washington-appellate-slip-opinions",
    "oregon-administrative-rules-bulletins",
    "oregon-governor-executive-orders",
    "oregon-appellate-opinions",
    "idaho-supreme-court-opinions",
    "idaho-court-of-appeals-opinions",
  ]) {
    const invalid = globalThis.structuredClone(sourceRegistry);
    const source = invalid.sources.find(({ id }) => id === sourceId);
    source.enabled = true;
    assert.equal(validateSources(invalid), false, sourceId);
  }
});

test("official pages are production-only source methods", () => {
  const valid = globalThis.structuredClone(sourceRegistry);
  const accord = valid.sources.find(
    ({ id }) => id === "washington-centennial-accord",
  );
  assert.equal(validateSources(valid), true);
  assert.equal(accord.access.method, "official_page");

  const invalid = globalThis.structuredClone(sourceRegistry);
  const syntheticAccord = invalid.sources.find(
    ({ id }) => id === "washington-centennial-accord",
  );
  syntheticAccord.synthetic = true;
  assert.equal(validateSources(invalid), false);
});

test("source entries require a dated contract review", () => {
  const invalid = globalThis.structuredClone(sourceRegistry);
  delete invalid.sources.find(({ id }) => id === "federal-register").access
    .accessedOn;
  assert.equal(validateSources(invalid), false);

  const malformed = globalThis.structuredClone(sourceRegistry);
  malformed.sources.find(
    ({ id }) => id === "federal-register",
  ).access.accessedOn = "2026-02-30";
  assert.equal(validateSources(malformed), false);
});

test("adapter modules stay inside the correct fixture or production tree", () => {
  const disabledProduction = globalThis.structuredClone(sourceRegistry);
  disabledProduction.sources.find(
    ({ id }) => id === "federal-register",
  ).adapter = {
    id: "federal-register-adapter",
    version: "1.0.0",
    module: "src/adapters/federal-register/index.ts",
    identityRule: "federal-register-document-number-v1",
  };
  assert.equal(validateSources(disabledProduction), true);

  const productionFixture = globalThis.structuredClone(sourceRegistry);
  productionFixture.sources.find(
    ({ id }) => id === "federal-register",
  ).adapter = {
    id: "federal-register-adapter",
    version: "1.0.0",
    module: "fixtures/records/general-jurisdiction.valid.json",
    identityRule: "federal-register-document-number-v1",
  };
  assert.equal(validateSources(productionFixture), false);

  const syntheticProduction = globalThis.structuredClone(sourceRegistry);
  syntheticProduction.sources[0].adapter.module =
    "src/adapters/federal-register/index.ts";
  assert.equal(validateSources(syntheticProduction), false);
});
