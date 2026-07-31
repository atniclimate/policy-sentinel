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
  assert.equal(sourceRegistry.registryVersion, "1.11.0");

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
      adapter: null,
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
  assert.match(
    supremeCourt.coverage.limitations,
    /only Washington State Dept\. of Licensing v\. Cougar Den, Inc\./,
  );
  assert.match(
    supremeCourt.coverage.limitations,
    /cannot yet preserve court, docket, reporter citation/,
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
