import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  FEDERAL_REGISTER_TIER1_DOCUMENT_NUMBER,
  FEDERAL_REGISTER_TIER1_FIELDS,
  FederalRegisterTier1ContractError,
  parseFederalRegisterTier1Document,
  parseFederalRegisterTier1DocumentJson,
  serializeFederalRegisterTier1Document,
} from "../../../src/adapters/federal-register/tier1-contract.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

async function fixture(name) {
  return JSON.parse(
    await readFile(
      path.join(projectRoot, "fixtures/sources/federal-register", name),
      "utf8",
    ),
  );
}

const valid = await fixture("tier1-document.synthetic.valid.json");
const malformed = await fixture("tier1-document-malformed.invalid.json");

function copy() {
  return globalThis.structuredClone(valid);
}

function throwsCode(operation, code, pathValue) {
  assert.throws(operation, (error) => {
    assert.ok(error instanceof FederalRegisterTier1ContractError);
    assert.equal(error.code, code);
    if (pathValue !== undefined) {
      assert.equal(error.path, pathValue);
    }
    return true;
  });
}

function assertDeepFrozen(value) {
  if (value === null || typeof value !== "object") {
    return;
  }
  assert.equal(Object.isFrozen(value), true);
  for (const nested of Object.values(value)) {
    assertDeepFrozen(nested);
  }
}

test("freezes the exact 23-selector Tier-1 projection and drops agency envelopes", () => {
  assert.equal(FEDERAL_REGISTER_TIER1_DOCUMENT_NUMBER, "2026-16965");
  assert.equal(FEDERAL_REGISTER_TIER1_FIELDS.length, 23);
  assert.equal(new Set(FEDERAL_REGISTER_TIER1_FIELDS).size, 23);
  assert.equal(Object.isFrozen(FEDERAL_REGISTER_TIER1_FIELDS), true);

  const parsed = parseFederalRegisterTier1Document(valid);
  assert.deepEqual(Object.keys(parsed), [...FEDERAL_REGISTER_TIER1_FIELDS]);
  assert.deepEqual(Object.keys(parsed.agencies[0]), [
    "raw_name",
    "name",
    "id",
    "slug",
    "parent_id",
  ]);
  assert.equal(Object.hasOwn(parsed.agencies[0], "url"), false);
  assert.equal(Object.hasOwn(parsed.agencies[0], "json_url"), false);
  assertDeepFrozen(parsed);
  assert.notStrictEqual(parsed, valid);
  assert.notStrictEqual(parsed.agencies, valid.agencies);
});

test("serializes deterministically without merging topic schemes", () => {
  const reordered = Object.fromEntries(Object.entries(copy()).reverse());
  reordered.agencies = reordered.agencies.map((agency) =>
    Object.fromEntries(Object.entries(agency).reverse()),
  );
  const first = serializeFederalRegisterTier1Document(valid);
  const second = serializeFederalRegisterTier1Document(reordered);
  assert.equal(second, first);

  const parsed = parseFederalRegisterTier1DocumentJson(first);
  assert.deepEqual(parsed.topics, [
    "Synthetic Shared Label",
    "Synthetic Source Topic",
  ]);
  assert.deepEqual(parsed.cfr_topics[0].topics, [
    "Synthetic CFR Topic",
    "Synthetic Shared Label",
  ]);
  assert.notStrictEqual(parsed.topics, parsed.cfr_topics[0].topics);
});

test("rejects the committed malformed fixture atomically", () => {
  throwsCode(
    () => parseFederalRegisterTier1Document(malformed),
    "unexpected_field",
    "$.abstract",
  );
});

test("requires every exact top-level Tier-1 selector", async (context) => {
  for (const field of FEDERAL_REGISTER_TIER1_FIELDS) {
    await context.test(field, () => {
      const candidate = copy();
      delete candidate[field];
      throwsCode(
        () => parseFederalRegisterTier1Document(candidate),
        "missing_field",
        `$.${field}`,
      );
    });
  }
});

test("rejects null and wrong-type laundering across field families", async (context) => {
  const cases = [
    ["document_number", null],
    ["title", null],
    ["type", null],
    ["publication_date", null],
    ["agencies", null],
    ["docket_ids", null],
    ["regulation_id_numbers", null],
    ["topics", null],
    ["html_url", null],
    ["json_url", null],
    ["subtype", 1],
    ["effective_on", 1],
    ["comments_close_on", false],
    ["signing_date", []],
    ["citation", {}],
    ["volume", "999"],
    ["start_page", "1"],
    ["end_page", "2"],
    ["cfr_references", {}],
    ["cfr_topics", {}],
    ["pdf_url", 1],
    ["full_text_xml_url", false],
    ["raw_text_url", []],
  ];
  for (const [field, value] of cases) {
    await context.test(field, () => {
      const candidate = copy();
      candidate[field] = value;
      assert.throws(
        () => parseFederalRegisterTier1Document(candidate),
        FederalRegisterTier1ContractError,
      );
    });
  }
});

test("rejects wrappers, excluded fields, and unknown nested drift", () => {
  assert.throws(
    () => parseFederalRegisterTier1Document([copy()]),
    FederalRegisterTier1ContractError,
  );
  assert.throws(
    () => parseFederalRegisterTier1Document({ result: copy() }),
    FederalRegisterTier1ContractError,
  );
  for (const excluded of [
    "abstract",
    "action",
    "agency_names",
    "dates",
    "corrections",
    "related_documents",
    "public_inspection_pdf_url",
    "people",
    "nationAssociations",
    "geography",
    "legalEffect",
  ]) {
    const candidate = copy();
    candidate[excluded] = null;
    throwsCode(
      () => parseFederalRegisterTier1Document(candidate),
      "unexpected_field",
      `$.${excluded}`,
    );
  }

  const agencyDrift = copy();
  agencyDrift.agencies[0].description = "excluded provider content";
  throwsCode(
    () => parseFederalRegisterTier1Document(agencyDrift),
    "unexpected_field",
    "$.agencies[0].description",
  );

  const referenceDrift = copy();
  referenceDrift.cfr_references[0].label = "unreviewed";
  throwsCode(
    () => parseFederalRegisterTier1Document(referenceDrift),
    "unexpected_field",
    "$.cfr_references[0].label",
  );

  const topicDrift = copy();
  topicDrift.cfr_topics[0].scheme = "merged";
  throwsCode(
    () => parseFederalRegisterTier1Document(topicDrift),
    "unexpected_field",
    "$.cfr_topics[0].scheme",
  );
});

test("rejects duplicate JSON members and duplicate retained values", () => {
  const source = JSON.stringify(valid);
  const duplicateTopLevel = source.replace(
    '"title":',
    '"title":"duplicate", "title":',
  );
  throwsCode(
    () => parseFederalRegisterTier1DocumentJson(duplicateTopLevel),
    "invalid_json",
    "$",
  );
  const duplicateNested = source.replace(
    '"raw_name":',
    '"raw_name":"duplicate", "raw_name":',
  );
  throwsCode(
    () => parseFederalRegisterTier1DocumentJson(duplicateNested),
    "invalid_json",
    "$",
  );

  for (const field of ["regulation_id_numbers", "topics"]) {
    const candidate = copy();
    candidate[field].push(candidate[field][0]);
    throwsCode(
      () => parseFederalRegisterTier1Document(candidate),
      "duplicate_value",
      `$.${field}`,
    );
  }
  const duplicateAgency = copy();
  duplicateAgency.agencies.push(
    globalThis.structuredClone(duplicateAgency.agencies[0]),
  );
  throwsCode(
    () => parseFederalRegisterTier1Document(duplicateAgency),
    "duplicate_value",
    "$.agencies",
  );
  const duplicateReference = copy();
  duplicateReference.cfr_references.push(
    globalThis.structuredClone(duplicateReference.cfr_references[0]),
  );
  throwsCode(
    () => parseFederalRegisterTier1Document(duplicateReference),
    "duplicate_value",
    "$.cfr_references",
  );
});

test("requires exact document identity, empty structured dockets, and coherent dates/pages", () => {
  const wrongIdentity = copy();
  wrongIdentity.document_number = "2026-16966";
  throwsCode(
    () => parseFederalRegisterTier1Document(wrongIdentity),
    "identity_mismatch",
    "$.document_number",
  );

  const inventedDocket = copy();
  inventedDocket.docket_ids = ["FS-2025-0001"];
  throwsCode(
    () => parseFederalRegisterTier1Document(inventedDocket),
    "identity_mismatch",
    "$.docket_ids",
  );

  for (const invalidDate of ["2026-02-29", "2026-13-01", "2026-8-20"]) {
    const candidate = copy();
    candidate.comments_close_on = invalidDate;
    throwsCode(
      () => parseFederalRegisterTier1Document(candidate),
      "invalid_value",
      "$.comments_close_on",
    );
  }
  const onePageMissing = copy();
  onePageMissing.end_page = null;
  throwsCode(
    () => parseFederalRegisterTier1Document(onePageMissing),
    "inconsistent_field",
    "$.start_page",
  );
  const invertedPages = copy();
  invertedPages.start_page = 3;
  invertedPages.end_page = 2;
  throwsCode(
    () => parseFederalRegisterTier1Document(invertedPages),
    "inconsistent_field",
    "$.start_page",
  );
});

test("requires a nonblank issuer raw_name and validates dropped envelope URLs", () => {
  const none = copy();
  none.agencies = [];
  throwsCode(
    () => parseFederalRegisterTier1Document(none),
    "invalid_value",
    "$.agencies",
  );
  const missing = copy();
  delete missing.agencies[0].raw_name;
  throwsCode(
    () => parseFederalRegisterTier1Document(missing),
    "missing_field",
    "$.agencies[0].raw_name",
  );
  const blank = copy();
  blank.agencies[0].raw_name = "   ";
  throwsCode(
    () => parseFederalRegisterTier1Document(blank),
    "invalid_value",
    "$.agencies[0].raw_name",
  );
  const hostile = copy();
  hostile.agencies[0].url =
    "https://example.test/agencies/synthetic-test-agency";
  throwsCode(
    () => parseFederalRegisterTier1Document(hostile),
    "invalid_url",
    "$.agencies[0].url",
  );
  const wrongSlug = copy();
  wrongSlug.agencies[0].json_url =
    "https://www.federalregister.gov/api/v1/agencies/other-agency";
  throwsCode(
    () => parseFederalRegisterTier1Document(wrongSlug),
    "invalid_url",
    "$.agencies[0].json_url",
  );
  const duplicateIdentity = copy();
  duplicateIdentity.agencies.push({
    raw_name: "Second synthetic agency label",
    id: duplicateIdentity.agencies[0].id,
    slug: "second-synthetic-agency",
    parent_id: null,
  });
  throwsCode(
    () => parseFederalRegisterTier1Document(duplicateIdentity),
    "duplicate_value",
    "$.agencies",
  );
  const splitEnvelope = copy();
  delete splitEnvelope.agencies[0].slug;
  splitEnvelope.agencies[0].json_url =
    "https://www.federalregister.gov/api/v1/agencies/other-synthetic-agency";
  throwsCode(
    () => parseFederalRegisterTier1Document(splitEnvelope),
    "inconsistent_field",
    "$.agencies[0]",
  );
});

test("enforces every retained agency leaf shape and required nested key", async (context) => {
  const agencyCases = [
    ["name", null],
    ["id", "99001"],
    ["id", 0],
    ["slug", "Synthetic Agency"],
    ["parent_id", "1"],
    ["url", null],
    ["json_url", null],
  ];
  for (const [field, value] of agencyCases) {
    await context.test(`${field}:${String(value)}`, () => {
      const candidate = copy();
      candidate.agencies[0][field] = value;
      assert.throws(
        () => parseFederalRegisterTier1Document(candidate),
        FederalRegisterTier1ContractError,
      );
    });
  }
});

test("validates strict CFR shapes without inferring cross-scheme mappings", () => {
  const invalidTitle = copy();
  invalidTitle.cfr_references[0].title = 51;
  assert.throws(
    () => parseFederalRegisterTier1Document(invalidTitle),
    FederalRegisterTier1ContractError,
  );
  const wrongEcfr = copy();
  wrongEcfr.cfr_references[0].citation_url =
    "https://www.ecfr.gov/current/title-49/chapter-IX/part-999";
  throwsCode(
    () => parseFederalRegisterTier1Document(wrongEcfr),
    "invalid_url",
    "$.cfr_references[0].citation_url",
  );
  const emptyCfrTopics = copy();
  emptyCfrTopics.cfr_topics[0].topics = [];
  throwsCode(
    () => parseFederalRegisterTier1Document(emptyCfrTopics),
    "invalid_value",
    "$.cfr_topics[0].topics",
  );
  const optionalChapter = copy();
  delete optionalChapter.cfr_topics[0].cfr_chapter;
  assert.doesNotThrow(() => parseFederalRegisterTier1Document(optionalChapter));
  const nullable = copy();
  nullable.cfr_references = null;
  nullable.cfr_topics = null;
  assert.doesNotThrow(() => parseFederalRegisterTier1Document(nullable));
});

test("requires every CFR member and rejects scalar/type/path substitution", async (context) => {
  for (const field of ["chapter", "citation_url", "part", "title"]) {
    await context.test(`reference.${field}`, () => {
      const candidate = copy();
      delete candidate.cfr_references[0][field];
      throwsCode(
        () => parseFederalRegisterTier1Document(candidate),
        "missing_field",
        `$.cfr_references[0].${field}`,
      );
    });
  }
  for (const field of ["cfr_part", "topics", "cfr_title"]) {
    await context.test(`topic.${field}`, () => {
      const candidate = copy();
      delete candidate.cfr_topics[0][field];
      throwsCode(
        () => parseFederalRegisterTier1Document(candidate),
        "missing_field",
        `$.cfr_topics[0].${field}`,
      );
    });
  }

  const cases = [
    ["chapter", false],
    ["part", {}],
    ["title", "50"],
    ["citation_url", 1],
  ];
  for (const [field, value] of cases) {
    await context.test(`reference type ${field}`, () => {
      const candidate = copy();
      candidate.cfr_references[0][field] = value;
      assert.throws(
        () => parseFederalRegisterTier1Document(candidate),
        FederalRegisterTier1ContractError,
      );
    });
  }
  const topicCases = [
    ["cfr_part", 999],
    ["topics", "Synthetic CFR Topic"],
    ["cfr_title", "50"],
    ["cfr_chapter", 9],
  ];
  for (const [field, value] of topicCases) {
    await context.test(`topic type ${field}`, () => {
      const candidate = copy();
      candidate.cfr_topics[0][field] = value;
      assert.throws(
        () => parseFederalRegisterTier1Document(candidate),
        FederalRegisterTier1ContractError,
      );
    });
  }

  const prefixAlias = copy();
  prefixAlias.cfr_references[0] = {
    chapter: null,
    citation_url: "https://www.ecfr.gov/current/title-50/part-9990",
    part: "999",
    title: 50,
  };
  throwsCode(
    () => parseFederalRegisterTier1Document(prefixAlias),
    "invalid_url",
    "$.cfr_references[0].citation_url",
  );
});

test("binds every retained link to its exact HTTPS host, identity, date, and custody path", () => {
  const attacks = [
    ["html_url", "https://example.test/documents/2026/08/20/2026-16965/x"],
    [
      "pdf_url",
      "https://www.federalregister.gov/content/pkg/FR-2026-08-20/pdf/2026-16965.pdf",
    ],
    [
      "json_url",
      "https://www.federalregister.gov/api/v1/documents/2026-16965?publication_date=2026-08-21",
    ],
    [
      "full_text_xml_url",
      "https://www.federalregister.gov/documents/full_text/text/2026/08/20/2026-16965.xml",
    ],
    [
      "raw_text_url",
      "https://www.federalregister.gov/documents/full_text/text/2026/08/20/2026-16966.txt",
    ],
  ];
  for (const [field, url] of attacks) {
    const candidate = copy();
    candidate[field] = url;
    throwsCode(
      () => parseFederalRegisterTier1Document(candidate),
      "invalid_url",
      `$.${field}`,
    );
  }
  for (const suffix of ["#fragment", "&extra=1"]) {
    const candidate = copy();
    candidate.json_url += suffix;
    throwsCode(
      () => parseFederalRegisterTier1Document(candidate),
      "invalid_url",
      "$.json_url",
    );
  }

  const nestedSlug = copy();
  nestedSlug.html_url += "/nested";
  throwsCode(
    () => parseFederalRegisterTier1Document(nestedSlug),
    "invalid_url",
    "$.html_url",
  );
  const credentialed = copy();
  credentialed.html_url = credentialed.html_url.replace(
    "https://",
    "https://user:password@",
  );
  throwsCode(
    () => parseFederalRegisterTier1Document(credentialed),
    "invalid_url",
    "$.html_url",
  );
  const nullableLinks = copy();
  nullableLinks.pdf_url = null;
  nullableLinks.full_text_xml_url = null;
  nullableLinks.raw_text_url = null;
  assert.doesNotThrow(() => parseFederalRegisterTier1Document(nullableLinks));
});

test("keeps the formal citation bound to volume and starting page", () => {
  for (const mutation of [
    { citation: "998 FR 1" },
    { citation: "999 FR 2" },
    { citation: "999 Federal Register 1" },
    { citation: "999 FR 1", volume: null },
    { citation: "999 FR 1", start_page: null, end_page: null },
  ]) {
    const candidate = Object.assign(copy(), mutation);
    throwsCode(
      () => parseFederalRegisterTier1Document(candidate),
      "inconsistent_field",
      "$.citation",
    );
  }
  const absent = copy();
  absent.citation = null;
  assert.doesNotThrow(() => parseFederalRegisterTier1Document(absent));
});

test("rejects noncanonical RINs and out-of-domain calendar years", () => {
  for (const identifier of ["0596-ad66", "596-AD66", "0596-AD6", "0596 AD66"]) {
    const candidate = copy();
    candidate.regulation_id_numbers = [identifier];
    throwsCode(
      () => parseFederalRegisterTier1Document(candidate),
      "invalid_value",
      "$.regulation_id_numbers",
    );
  }
  const ancient = copy();
  ancient.comments_close_on = "0000-01-01";
  throwsCode(
    () => parseFederalRegisterTier1Document(ancient),
    "invalid_value",
    "$.comments_close_on",
  );
});

test("rejects accessors, symbols, sparse arrays, cycles, excessive depth, and Proxy trap failures", () => {
  const accessor = copy();
  Object.defineProperty(accessor, "title", {
    enumerable: true,
    get() {
      throw new Error("sensitive getter content");
    },
  });
  throwsCode(
    () => parseFederalRegisterTier1Document(accessor),
    "invalid_json",
    "$",
  );

  const symbol = copy();
  symbol[Symbol("hidden")] = "hidden";
  throwsCode(
    () => parseFederalRegisterTier1Document(symbol),
    "invalid_json",
    "$",
  );
  const sparse = copy();
  sparse.topics = new Array(2);
  sparse.topics[1] = "Synthetic Topic";
  throwsCode(
    () => parseFederalRegisterTier1Document(sparse),
    "invalid_json",
    "$",
  );
  const cyclic = copy();
  cyclic.agencies[0].cycle = cyclic;
  throwsCode(
    () => parseFederalRegisterTier1Document(cyclic),
    "invalid_json",
    "$",
  );
  const deeplyNested = copy();
  let nested = deeplyNested;
  for (let depth = 0; depth < 40; depth += 1) {
    nested.unreviewed = {};
    nested = nested.unreviewed;
  }
  throwsCode(
    () => parseFederalRegisterTier1Document(deeplyNested),
    "invalid_json",
    "$",
  );
  const proxied = new Proxy(copy(), {
    ownKeys() {
      throw new Error("provider bytes must not escape");
    },
  });
  assert.throws(
    () => parseFederalRegisterTier1Document(proxied),
    (error) =>
      error instanceof FederalRegisterTier1ContractError &&
      error.code === "invalid_json" &&
      !error.message.includes("provider bytes"),
  );
});

test("raw JSON rejects malformed, duplicate, wrapper, and oversized inputs", () => {
  for (const source of [
    "",
    "{} trailing",
    '{"title":}',
    `[${JSON.stringify(valid)}]`,
    `{"result":${JSON.stringify(valid)}}`,
    " ".repeat(65_537),
    `"${"é".repeat(40_000)}"`,
  ]) {
    assert.throws(
      () => parseFederalRegisterTier1DocumentJson(source),
      FederalRegisterTier1ContractError,
    );
  }
});
