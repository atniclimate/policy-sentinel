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
  assert.equal(sourceRegistry.schemaVersion, "1.1.0");
  assert.equal(sourceRegistry.registryVersion, "1.5.0");

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
