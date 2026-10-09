import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  migratePublicRecordV2,
  migrateSourceRegistryV2,
  publicJurisdictionAssociation,
} from "../../src/core/public-contract-v2.mjs";
import {
  parseJurisdictionAssociation,
  hasStateJurisdictionEvidence,
} from "../../src/core/jurisdiction-reference.mjs";
import {
  createArtifactDocuments,
  generateSyntheticNations,
  writeArtifactDocuments,
} from "../../src/pipeline/artifact.mjs";
import {
  completeSyntheticProvenance,
  validateRecordPolicy,
  validateRecordSetPolicy,
} from "../../src/pipeline/policy-validation.mjs";
import { assertSourceRegistrySemantics } from "../../src/pipeline/source-registry.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = async (name) =>
  JSON.parse(await readFile(path.join(root, name), "utf8"));
const [
  recordFixture,
  sourceFixture,
  legacyRecord,
  legacySources,
  taxonomy,
  invalidMigration,
] = await Promise.all([
  read("fixtures/records/nationwide-successor.valid.json"),
  read("fixtures/sources/nationwide-successor.valid.json"),
  read("fixtures/records/general-jurisdiction.valid.json"),
  read("config/sources.v1.json"),
  read("config/taxonomy.v1.json"),
  read("fixtures/records/nationwide-migration.invalid.json"),
]);
const ajv = new Ajv2020({
  strict: true,
  allErrors: true,
  allowUnionTypes: true,
});
addFormats(ajv);
for (const version of ["v1", "v2"])
  for (const kind of ["record", "artifact", "source"])
    ajv.addSchema(
      await read("schemas/" + kind + ".schema." + version + ".json"),
    );
const validator = (kind, version = "v2") =>
  ajv.getSchema(
    "https://policy-sentinel.invalid/schemas/" +
      kind +
      ".schema." +
      version +
      ".json",
  );
const copy = (value) => globalThis.structuredClone(value);
const valid = (kind, value) => {
  const check = validator(kind);
  assert.equal(check(value), true, JSON.stringify(check.errors));
};
const policy = (record, sources = sourceFixture) =>
  validateRecordSetPolicy([record], { sourceRegistry: sources, taxonomy });

function jurisdictionFixture(level, name, ref, documentType = "notice") {
  const record = copy(recordFixture),
    registry = copy(sourceFixture);
  record.documentType = documentType;
  record.officialTitle = "Synthetic " + name + " official public notice";
  record.jurisdiction = {
    ...record.jurisdiction,
    level,
    name,
    jurisdictionRef: ref,
    evidence: {
      ...record.jurisdiction.evidence,
      exactSubject: {
        recordRef: record.internalId,
        ref,
        text: record.officialTitle,
      },
    },
  };
  const { generalJurisdictionOnly, ...sourceJurisdiction } = copy(
    record.jurisdiction,
  );
  assert.equal(generalJurisdictionOnly, true);
  sourceJurisdiction.evidence.exactSubject.recordRef = registry.sources[0].id;
  registry.sources[0].jurisdiction = sourceJurisdiction;
  record.fieldProvenance = record.fieldProvenance.filter(
    (row) => !row.field.startsWith("/jurisdiction/"),
  );
  return { record: completeSyntheticProvenance(record), registry };
}

test("public 2.0 fixtures compile strictly and retain source-specific provenance", () => {
  valid("record", recordFixture);
  valid("source", sourceFixture);
  assertSourceRegistrySemantics(sourceFixture);
  policy(recordFixture);
  assert.equal(validator("record", "v1")(recordFixture), false);
  assert.equal(validator("source", "v1")(sourceFixture), false);
  assert.equal(validator("record", "v1")(legacyRecord), true);
  assert.equal(validator("source", "v1")(legacySources), true);
  for (const [code, name] of [
    ["WA", "Washington"],
    ["OR", "Oregon"],
    ["ID", "Idaho"],
    ["AK", "Alaska"],
    ["CA", "California"],
    ["MT", "Montana"],
    ["NV", "Nevada"],
    ["NY", "New York"],
  ]) {
    const { record, registry } = jurisdictionFixture(
      "state",
      name,
      "us-state:" + code,
    );
    valid("record", record);
    valid("source", registry);
    policy(record, registry);
    assert.deepEqual(record.nationAssociations, []);
    assert.equal(record.jurisdiction.generalJurisdictionOnly, true);
  }
});

test("D087 county and municipal public instruments need no inferred Nation relationship", () => {
  for (const [level, name, ref, type] of [
    ["county", "Synthetic County", "us-county:32031", "county_policy"],
    [
      "municipal",
      "Synthetic Municipality",
      "body:synthetic-municipality",
      "municipal_ordinance",
    ],
    [
      "other",
      "Synthetic Intertribal Organization",
      "body:synthetic-intertribal",
      "intertribal_publication",
    ],
  ]) {
    const { record, registry } = jurisdictionFixture(level, name, ref, type);
    valid("record", record);
    policy(record, registry);
    assert.deepEqual(record.nationAssociations, []);
    assert.equal(record.relevance[0].basis, "general_jurisdiction");
  }
});

test("jurisdiction claims reject unsupported state, real Nation and unbound evidence", () => {
  for (const mutate of [
    (r) => {
      r.jurisdiction.jurisdictionRef = "us-state:ZZ";
      r.jurisdiction.evidence.exactSubject.ref = "us-state:ZZ";
    },
    (r) => {
      r.jurisdiction.evidence.exactSubject.recordRef = "psr:other:record";
    },
    (r) => {
      r.jurisdiction.evidence.exactSubject.text =
        "Unsupported Nevada assertion";
    },
    (r) => {
      r.jurisdiction.evidence.url =
        "https://official.example.invalid/unrelated";
    },
    (r) => {
      r.jurisdiction.name = "California";
      r.jurisdiction.jurisdictionRef = "us-state:WA";
      r.jurisdiction.evidence.exactSubject.ref = "us-state:WA";
      r.jurisdiction.evidence.exactSubject.text = "California";
    },
    (r) => {
      r.jurisdiction.review = null;
    },
    (r) => {
      r.jurisdiction.review.reviewedAt = "2025-01-01T00:00:00Z";
    },
    (r) => {
      r.jurisdiction.reviewState = "unreviewed";
    },
    (r) => {
      r.jurisdiction.evidence.exactSubject.text = r.sourceDocumentIdentifier;
    },
    (r) => {
      r.fieldProvenance = r.fieldProvenance.filter(
        (row) => row.field !== "/jurisdiction/jurisdictionRef",
      );
    },
    (r) => {
      r.fieldProvenance.find(
        (row) => row.field === "/jurisdiction/jurisdictionRef",
      ).retrievedAt = "2025-01-01T00:00:00Z";
    },
    (r) => {
      r.jurisdiction.legalApplicability = "inferred";
    },
  ]) {
    const record = copy(recordFixture);
    mutate(record);
    assert.throws(() => policy(record));
  }
  const nation = jurisdictionFixture(
    "tribal",
    "Synthetic Nation",
    "nation:real-example",
  ).record;
  assert.throws(
    () => publicJurisdictionAssociation(nation.jurisdiction, nation.internalId),
    /real Nation registry/,
  );
  const synthetic = jurisdictionFixture(
    "tribal",
    "Synthetic Nation",
    "nation:synthetic-example",
  );
  assert.throws(
    () => policy(synthetic.record, synthetic.registry),
    /independently documented/,
  );
  const wrongSource = copy(sourceFixture);
  wrongSource.sources[0].jurisdiction.jurisdictionRef = "us-state:CA";
  wrongSource.sources[0].jurisdiction.evidence.exactSubject.ref = "us-state:CA";
  assert.throws(
    () => policy(recordFixture, wrongSource),
    /state evidence|reviewed source authority/,
  );
});

test("shared jurisdiction association is bounded, closed and exact-subject bound", () => {
  assert.equal(
    hasStateJurisdictionEvidence("us-state:WA", "California"),
    false,
  );
  assert.equal(
    hasStateJurisdictionEvidence("us-state:VA", "West Virginia"),
    false,
  );
  assert.equal(
    hasStateJurisdictionEvidence("us-state:WA", "Washington, D.C."),
    false,
  );
  assert.equal(hasStateJurisdictionEvidence("us-state:OR", "A OR B"), false);
  assert.equal(hasStateJurisdictionEvidence("us-state:NV", "Nevada"), true);
  assert.equal(
    hasStateJurisdictionEvidence(
      "us-state:NV",
      "source-stated us-state:NV scope",
    ),
    true,
  );
  const { jurisdictionRef, basis, evidence, reviewState } =
    recordFixture.jurisdiction;
  const association = { jurisdictionRef, basis, evidence, reviewState };
  assert.equal(
    parseJurisdictionAssociation(
      JSON.stringify(association),
      recordFixture.internalId,
    ).jurisdictionRef,
    "us-state:NV",
  );
  assert.throws(() =>
    parseJurisdictionAssociation(
      JSON.stringify({ ...association, secret: "hidden" }),
      recordFixture.internalId,
    ),
  );
  assert.throws(() =>
    parseJurisdictionAssociation(
      JSON.stringify({
        ...association,
        evidence: {
          ...evidence,
          url: "https://official.example.invalid/?token=hidden",
        },
      }),
      recordFixture.internalId,
    ),
  );
  assert.throws(() =>
    parseJurisdictionAssociation(" ".repeat(32769), recordFixture.internalId),
  );
});

test("explicit migration preserves legacy bytes and source identity, refusing invented bindings", () => {
  const input = JSON.stringify(legacyRecord),
    before = JSON.stringify(legacyRecord);
  const binding = {
    ...copy(recordFixture.jurisdiction),
    level: "other",
    name: "Synthetic Public Agency",
    jurisdictionRef: "body:synthetic-public-agency",
  };
  binding.evidence.exactSubject = {
    recordRef: legacyRecord.internalId,
    ref: binding.jurisdictionRef,
    text: "Synthetic Public Agency",
  };
  const migrated = migratePublicRecordV2(input, JSON.stringify(binding));
  assert.equal(JSON.stringify(legacyRecord), before);
  valid("record", migrated.record);
  assert.deepEqual(migrated.record.source, legacyRecord.source);
  assert.deepEqual(
    migrated.record.nationAssociations,
    legacyRecord.nationAssociations,
  );
  assert.deepEqual(
    migrated.receipt.previousJurisdiction,
    legacyRecord.jurisdiction,
  );
  assert.deepEqual(
    migrated.receipt.previousJurisdictionProvenance,
    legacyRecord.fieldProvenance.filter((row) =>
      row.field.startsWith("/jurisdiction/"),
    ),
  );
  assert.equal(
    migrated.receipt.validationState,
    "requires_schema_and_policy_validation",
  );
  assert.ok(
    migrated.record.fieldProvenance.some(
      (p) =>
        p.field === "/jurisdiction/jurisdictionRef" &&
        p.transformRuleId === "explicit-jurisdiction-binding-v2",
    ),
  );
  assert.throws(() =>
    migratePublicRecordV2(
      JSON.stringify(invalidMigration.legacyRecord),
      JSON.stringify(invalidMigration.jurisdiction),
    ),
  );
  assert.throws(
    () =>
      migratePublicRecordV2(input, JSON.stringify(recordFixture.jurisdiction)),
    /not present in original/,
  );
  const oneSource = {
    ...copy(legacySources),
    sources: [copy(legacySources.sources[0])],
  };
  const sourceBinding = copy(sourceFixture.sources[0].jurisdiction);
  const migratedSources = migrateSourceRegistryV2(
    JSON.stringify(oneSource),
    JSON.stringify({ [oneSource.sources[0].id]: sourceBinding }),
  );
  valid("source", migratedSources);
  assertSourceRegistrySemantics(migratedSources);
  assert.throws(
    () => migrateSourceRegistryV2(JSON.stringify(oneSource), "{}"),
    /exact source bindings/,
  );
});

test("2.0 artifact dispatch preserves bindings, source health, compact/detail agreement and byte budgets", () => {
  const documents = createArtifactDocuments({
    records: [recordFixture],
    nations: generateSyntheticNations(),
    taxonomy,
    sourceRegistry: sourceFixture,
    generatedAt: "2026-07-31T18:00:00.000Z",
  });
  for (const [name, document] of documents)
    if (name !== "taxonomy.json") valid("artifact", document);
  const manifest = documents.get("manifest.json"),
    index = documents.get("index/records.json");
  assert.equal(manifest.artifactVersion, "2.0.0");
  assert.equal(manifest.recordSchemaVersion, "2.0.0");
  assert.deepEqual(index.records[0].jurisdiction, recordFixture.jurisdiction);
  assert.deepEqual(
    documents.get("nations.json").nations[0].stateCoverage.jurisdictionRefs,
    ["us-state:WA"],
  );
  assert.equal(
    documents.get("source-health.json").sources[0].dataAsOf,
    recordFixture.sourceHealth.dataAsOf,
  );
  assert.throws(
    () =>
      createArtifactDocuments({
        records: [legacyRecord],
        nations: generateSyntheticNations(),
        taxonomy,
        sourceRegistry: sourceFixture,
        generatedAt: manifest.generatedAt,
      }),
    /schema version mismatch/,
  );
  assert.throws(() =>
    validateRecordPolicy(recordFixture, {
      sourceConfig: legacySources.sources[0],
      taxonomy,
    }),
  );
});

test("artifact CLI accepts the explicit successor registry and rejects parent-junction escapes", async () => {
  const parent = path.join(root, "dist", "gd13-public-contract-tests");
  await mkdir(parent, { recursive: true });
  const work = await mkdtemp(path.join(parent, "case-"));
  const outside = await mkdtemp(
    path.join(os.tmpdir(), "policy-sentinel-gd13-"),
  );
  const run = promisify(execFile);
  try {
    const documents = createArtifactDocuments({
      records: [recordFixture],
      nations: generateSyntheticNations(),
      taxonomy,
      sourceRegistry: sourceFixture,
      generatedAt: "2026-07-31T18:00:00.000Z",
    });
    const output = path.join(work, "data");
    await writeArtifactDocuments({
      documents,
      outputDirectory: output,
      projectRoot: root,
    });
    const result = await run(
      process.execPath,
      [
        "scripts/validate-artifact.mjs",
        "--dir",
        output,
        "--sources",
        "fixtures/sources/nationwide-successor.valid.json",
      ],
      { cwd: root, windowsHide: true },
    );
    assert.match(result.stdout, /Artifact validation passed/);
    await writeFile(
      path.join(outside, "registry.json"),
      JSON.stringify(sourceFixture),
    );
    await symlink(
      outside,
      path.join(work, "linked"),
      process.platform === "win32" ? "junction" : "dir",
    );
    await assert.rejects(
      run(
        process.execPath,
        [
          "scripts/validate-artifact.mjs",
          "--dir",
          output,
          "--sources",
          path.join(work, "linked", "registry.json"),
        ],
        { cwd: root, windowsHide: true },
      ),
      /source registry must be a regular file inside the project/,
    );
  } finally {
    assert.ok(path.resolve(work).startsWith(path.resolve(parent) + path.sep));
    assert.ok(
      path.resolve(outside).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    await rm(work, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
