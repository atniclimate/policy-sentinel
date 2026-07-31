import correctionFixture from "../../../fixtures/sources/federal-register/document-correction.valid.json";
import malformedCfrTopics from "../../../fixtures/sources/federal-register/cfr-topics-malformed.invalid.json";
import optionalChapterCfrTopics from "../../../fixtures/sources/federal-register/cfr-topics-optional-chapter.valid.json";
import historicalFixture from "../../../fixtures/sources/federal-register/document-historical.valid.json";
import originalFixture from "../../../fixtures/sources/federal-register/document-original.valid.json";
import withdrawalFixture from "../../../fixtures/sources/federal-register/document-withdrawal.valid.json";
import facetFixture from "../../../fixtures/sources/federal-register/facet-daily.valid.json";
import issueFixture from "../../../fixtures/sources/federal-register/issue-duplicates.valid.json";
import historicalIssueFixture from "../../../fixtures/sources/federal-register/issue-historical.valid.json";
import openApiFixture from "../../../fixtures/sources/federal-register/openapi-projection.valid.json";
import mixedLabelRelatedDocuments from "../../../fixtures/sources/federal-register/related-documents-mixed-label.valid.json";
import emptySearchFixture from "../../../fixtures/sources/federal-register/search-empty.valid.json";
import { describe, expect, it } from "vitest";

import {
  FederalRegisterContractError,
  assertFederalRegisterOpenApiProjection,
  parseFederalRegisterDailyFacet,
  parseFederalRegisterDocument,
  parseFederalRegisterDocumentBatch,
  parseFederalRegisterIssueInventory,
  parseFederalRegisterSearchPage,
  reconcileFederalRegisterCorrections,
} from "../../../src/adapters/federal-register/response-contract";

function cloneObject(value: unknown): Record<string, unknown> {
  return structuredClone(value) as Record<string, unknown>;
}

describe("Federal Register response contract", () => {
  it("parses only the selected discovery fields and historical agency shape", () => {
    const current = parseFederalRegisterDocument(originalFixture);
    const historical = parseFederalRegisterDocument(historicalFixture);

    expect(current).toMatchObject({
      document_number: "TST-2026-00001",
      type: "Notice",
      comments_close_on: "2026-08-15",
      cfr_topics: [
        {
          cfr_part: "999",
          cfr_chapter: "IX",
          topics: ["Synthetic CFR Topic"],
          cfr_title: 50,
        },
      ],
    });
    expect(historical.agencies).toEqual([
      { raw_name: "Synthetic Historical Agency" },
    ]);
    expect(historical.pdf_url).toBeNull();
    expect(historical.mods_url).toBeNull();
    expect(historical.cfr_topics).toBeNull();
    expect(historical.citation).toBe("59 FR 1");
    expect([historical.start_page, historical.end_page]).toEqual([0, 0]);
    expect(historical.cfr_references).toEqual([
      {
        chapter: 0,
        citation_url: null,
        part: null,
        title: 10,
      },
    ]);
  });

  it("accepts the observed historical null CFR part without inventing one", () => {
    const historicalCfr = cloneObject(originalFixture);
    historicalCfr.cfr_references = [
      {
        chapter: 0,
        citation_url: null,
        part: null,
        title: 10,
      },
    ];

    expect(parseFederalRegisterDocument(historicalCfr).cfr_references).toEqual([
      {
        chapter: 0,
        citation_url: null,
        part: null,
        title: 10,
      },
    ]);
  });

  it("accepts an omitted CFR chapter without inventing one", () => {
    const optionalChapter = cloneObject(originalFixture);
    optionalChapter.cfr_topics = optionalChapterCfrTopics;

    const parsed = parseFederalRegisterDocument(optionalChapter).cfr_topics;
    expect(parsed).toEqual(optionalChapterCfrTopics);
    expect(parsed?.[0]).not.toHaveProperty("cfr_chapter");
    expect(parsed?.[1]?.cfr_chapter).toBeNull();
  });

  it("keeps the optional CFR chapter whitelist fail-closed", () => {
    for (const [topic, expectedError] of [
      [malformedCfrTopics.nonStringChapter, /invalid_type.*cfr_chapter/],
      [malformedCfrTopics.missingPart, /missing_field.*cfr_part/],
      [malformedCfrTopics.unexpectedField, /unexpected_field.*chapter_label/],
    ] as const) {
      const malformed = cloneObject(originalFixture);
      malformed.cfr_topics = [topic];
      expect(() => parseFederalRegisterDocument(malformed)).toThrowError(
        expectedError,
      );
    }
  });

  it("accepts an observed historical null citation without inventing one", () => {
    const historicalCitation = cloneObject(originalFixture);
    historicalCitation.citation = null;

    expect(
      parseFederalRegisterDocument(historicalCitation).citation,
    ).toBeNull();
  });

  it("rejects a partial or reversed historical page sentinel", () => {
    for (const [startPage, endPage] of [
      [0, 1],
      [1, 0],
      [2, 1],
    ]) {
      const malformedPages = cloneObject(historicalFixture);
      malformedPages.start_page = startPage;
      malformedPages.end_page = endPage;
      expect(() => parseFederalRegisterDocument(malformedPages)).toThrowError(
        /page bounds/,
      );
    }
  });

  it("preserves observed duplicate agency names for deterministic replay", () => {
    const duplicateAgencyNames = cloneObject(originalFixture);
    duplicateAgencyNames.agency_names = [
      "Synthetic Test Agency",
      "Synthetic Test Agency",
    ];

    expect(
      parseFederalRegisterDocument(duplicateAgencyNames).agency_names,
    ).toEqual(["Synthetic Test Agency", "Synthetic Test Agency"]);
  });

  it("preserves source withdrawal language and keyed relationships without inference", () => {
    const document = parseFederalRegisterDocument(withdrawalFixture);

    expect(document.action).toBe("Withdrawal of synthetic notice.");
    expect(document.related_documents["TST-DOCKET-0003"]?.[0]).toMatchObject({
      document_number: "TST-2026-00002",
      relationship_type: "refers_to_antecedent_by_citation",
      html_url: "/d/TST-2026-00002",
    });
    expect(document).not.toHaveProperty("withdrawn");
  });

  it("accepts a null docket relationship label without inventing semantics", () => {
    const docketMatch = cloneObject(withdrawalFixture);
    const relatedDocuments = docketMatch.related_documents as Record<
      string,
      Array<Record<string, unknown>>
    >;
    const related = relatedDocuments["TST-DOCKET-0003"]?.[0];
    if (related === undefined) {
      throw new Error("Synthetic related-document fixture is missing");
    }
    related.relationship_type = null;

    expect(
      parseFederalRegisterDocument(docketMatch).related_documents[
        "TST-DOCKET-0003"
      ]?.[0]?.relationship_type,
    ).toBeNull();
  });

  it("reconciles exact repeated targets across docket groups and rejects drift", () => {
    const repeatedTarget = cloneObject(withdrawalFixture);
    const relatedDocuments = repeatedTarget.related_documents as Record<
      string,
      Array<Record<string, unknown>>
    >;
    const original = relatedDocuments["TST-DOCKET-0003"]?.[0];
    if (original === undefined) {
      throw new Error("Synthetic related-document fixture is missing");
    }
    relatedDocuments["TST-ALTERNATE-DOCKET"] = [
      {
        ...structuredClone(original),
        docket_number: "TST-ALTERNATE-DOCKET",
      },
    ];

    expect(
      parseFederalRegisterDocument(repeatedTarget).related_documents[
        "TST-ALTERNATE-DOCKET"
      ]?.[0]?.document_number,
    ).toBe("TST-2026-00002");

    const duplicateInLaterGroup = structuredClone(repeatedTarget);
    const duplicateGroups = duplicateInLaterGroup.related_documents as Record<
      string,
      Array<Record<string, unknown>>
    >;
    const laterGroup = duplicateGroups["TST-ALTERNATE-DOCKET"];
    if (laterGroup?.[0] === undefined) {
      throw new Error("Synthetic repeated target is missing");
    }
    laterGroup.push(structuredClone(laterGroup[0]));
    expect(() =>
      parseFederalRegisterDocument(duplicateInLaterGroup),
    ).toThrowError(/metadata differs across docket groups/);

    const conflictingTarget = structuredClone(repeatedTarget);
    const conflictingRelatedDocuments =
      conflictingTarget.related_documents as Record<
        string,
        Array<Record<string, unknown>>
      >;
    const conflicting =
      conflictingRelatedDocuments["TST-ALTERNATE-DOCKET"]?.[0];
    if (conflicting === undefined) {
      throw new Error("Synthetic repeated target is missing");
    }
    conflicting.title = "Conflicting target title";
    expect(() => parseFederalRegisterDocument(conflictingTarget)).toThrowError(
      /metadata differs across docket groups/,
    );

    const conflictingLabel = structuredClone(repeatedTarget);
    const conflictingLabelGroups = conflictingLabel.related_documents as Record<
      string,
      Array<Record<string, unknown>>
    >;
    const conflictingLabelTarget =
      conflictingLabelGroups["TST-ALTERNATE-DOCKET"]?.[0];
    if (conflictingLabelTarget === undefined) {
      throw new Error("Synthetic repeated target is missing");
    }
    conflictingLabelTarget.relationship_type = "rule_progression";
    expect(() => parseFederalRegisterDocument(conflictingLabel)).toThrowError(
      /metadata differs across docket groups/,
    );
  });

  it("preserves an unlabeled docket match alongside its explicit relationship", () => {
    const mixedLabel = cloneObject(withdrawalFixture);
    mixedLabel.related_documents = mixedLabelRelatedDocuments;

    expect(parseFederalRegisterDocument(mixedLabel).related_documents).toEqual(
      mixedLabelRelatedDocuments,
    );
  });

  it("rejects missing, extra, malformed nested, and mismatched URL fields", () => {
    const missing = cloneObject(originalFixture);
    delete missing.title;
    expect(() => parseFederalRegisterDocument(missing)).toThrowError(
      /missing_field.*title/,
    );

    const extra = cloneObject(originalFixture);
    extra.images = [];
    expect(() => parseFederalRegisterDocument(extra)).toThrowError(
      /unexpected_field.*images/,
    );

    const malformedCfr = cloneObject(originalFixture);
    malformedCfr.cfr_topics = [
      {
        cfr_part: "999",
        cfr_chapter: null,
        topics: ["Synthetic"],
        cfr_title: 51,
      },
    ];
    expect(() => parseFederalRegisterDocument(malformedCfr)).toThrowError(
      /invalid_value.*cfr_title/,
    );

    const wrongJsonUrl = cloneObject(originalFixture);
    wrongJsonUrl.json_url =
      "https://www.federalregister.gov/api/v1/documents/TST-2026-00001.json";
    expect(() => parseFederalRegisterDocument(wrongJsonUrl)).toThrowError(
      /invalid_url.*json_url/,
    );

    const wrongCorrectionUrl = cloneObject(originalFixture);
    wrongCorrectionUrl.corrections = [
      "https://www.federalregister.gov/api/v1/documents/C1-TST-2026-00001.json",
    ];
    expect(() => parseFederalRegisterDocument(wrongCorrectionUrl)).toThrowError(
      /invalid_value.*corrections/,
    );
  });

  it("requires unique same-origin reciprocal correction relationships", () => {
    const original = parseFederalRegisterDocument(originalFixture);
    const correction = parseFederalRegisterDocument(correctionFixture);

    expect(() =>
      reconcileFederalRegisterCorrections([correction, original]),
    ).not.toThrow();
    expect(() => reconcileFederalRegisterCorrections([original])).toThrowError(
      /relationship_mismatch/,
    );

    const nonreciprocal = structuredClone(correction);
    nonreciprocal.correction_of = null;
    expect(() =>
      reconcileFederalRegisterCorrections([original, nonreciprocal]),
    ).toThrowError(/nonreciprocal/);

    const crossOrigin = cloneObject(originalFixture);
    crossOrigin.corrections = [
      "https://example.invalid/api/v1/documents/C1-TST-2026-00001",
    ];
    expect(() => parseFederalRegisterDocument(crossOrigin)).toThrowError(
      /invalid_url/,
    );
  });

  it("rejects correction chronology inversions and correction_of cycles", () => {
    const original = parseFederalRegisterDocument(originalFixture);
    const correction = parseFederalRegisterDocument(correctionFixture);
    const earlyCorrection = structuredClone(correction);
    earlyCorrection.publication_date = "2026-07-29";
    expect(() =>
      reconcileFederalRegisterCorrections([original, earlyCorrection]),
    ).toThrowError(/precedes its antecedent/);

    const cyclicOriginal = structuredClone(original);
    const cyclicCorrection = structuredClone(correction);
    cyclicOriginal.publication_date = cyclicCorrection.publication_date;
    cyclicOriginal.correction_of =
      "https://www.federalregister.gov/api/v1/documents/C1-TST-2026-00001";
    cyclicCorrection.corrections = [
      "https://www.federalregister.gov/api/v1/documents/TST-2026-00001",
    ];
    expect(() =>
      reconcileFederalRegisterCorrections([cyclicOriginal, cyclicCorrection]),
    ).toThrowError(/correction_of graph contains a cycle/);
  });

  it("accepts the provider's minimal zero-result envelope", () => {
    expect(
      parseFederalRegisterSearchPage(emptySearchFixture, {
        range: { start: "2026-07-30", end: "2026-07-31" },
      }),
    ).toEqual(emptySearchFixture);
  });

  it("validates nonempty search counts, bounds, and identifiers", () => {
    const page = {
      description: "Synthetic one-result search fixture.",
      count: 1,
      total_pages: 1,
      next_page_url: null,
      previous_page_url: null,
      results: [originalFixture],
    };
    expect(
      parseFederalRegisterSearchPage(page, {
        range: { start: "2026-07-30", end: "2026-07-30" },
        expectedCount: 1,
      }).results?.[0]?.document_number,
    ).toBe("TST-2026-00001");

    expect(() =>
      parseFederalRegisterSearchPage(page, {
        range: { start: "2026-07-31", end: "2026-07-31" },
      }),
    ).toThrowError(/outside the requested slice/);

    expect(() =>
      parseFederalRegisterSearchPage(
        {
          ...page,
          count: 2,
          results: [originalFixture, originalFixture],
        },
        { range: { start: "2026-07-30", end: "2026-07-30" } },
      ),
    ).toThrowError(/duplicate_value/);

    expect(() =>
      parseFederalRegisterSearchPage(page, {
        range: { start: "2026-07-30", end: "2026-07-30" },
        expectedCount: 2,
      }),
    ).toThrowError(/count changed/);
  });

  it("requires a batch to equal the requested identifier set and restores request order", () => {
    const batch = parseFederalRegisterDocumentBatch(
      {
        count: 2,
        results: [originalFixture, correctionFixture],
      },
      ["C1-TST-2026-00001", "TST-2026-00001"],
    );
    expect(batch.results.map(({ document_number }) => document_number)).toEqual(
      ["C1-TST-2026-00001", "TST-2026-00001"],
    );

    expect(() =>
      parseFederalRegisterDocumentBatch(
        {
          count: 1,
          results: [originalFixture],
          errors: { not_found: ["C1-TST-2026-00001"] },
        },
        ["TST-2026-00001", "C1-TST-2026-00001"],
      ),
    ).toThrowError(/partial document batch/);
  });

  it("projects daily facets and rejects dates outside the bounded query", () => {
    expect(
      parseFederalRegisterDailyFacet(facetFixture, {
        start: "2026-07-30",
        end: "2026-07-31",
      }),
    ).toEqual(facetFixture);
    expect(() =>
      parseFederalRegisterDailyFacet(facetFixture, {
        start: "2026-07-31",
        end: "2026-07-31",
      }),
    ).toThrowError(/facet date falls outside/);
  });

  it("projects and globally deduplicates grouped issue document numbers", () => {
    const inventory = parseFederalRegisterIssueInventory(
      issueFixture,
      "2026-07-31",
    );

    expect(inventory).toEqual({
      publicationDate: "2026-07-31",
      documentNumbers: [
        "C1-TST-2026-00001",
        "TST-2026-00003",
        "E9-TST-2026-00004",
      ],
      occurrenceCount: 4,
    });

    const changedShape = cloneObject(issueFixture);
    changedShape.unreviewed = true;
    expect(() =>
      parseFederalRegisterIssueInventory(changedShape, "2026-07-31"),
    ).toThrowError(FederalRegisterContractError);
    expect(() =>
      parseFederalRegisterIssueInventory(issueFixture, "2026-07-30"),
    ).toThrowError(/issue date differs/);
  });

  it("accepts observed omitted or empty historical issue metadata", () => {
    expect(
      parseFederalRegisterIssueInventory(historicalIssueFixture, "1994-01-03"),
    ).toEqual({
      publicationDate: "1994-01-03",
      documentNumbers: ["TST-1994-00001"],
      occurrenceCount: 1,
    });
    expect(() =>
      parseFederalRegisterIssueInventory(
        { ...historicalIssueFixture, meta: {} },
        "1994-01-03",
      ),
    ).not.toThrow();

    const malformedSeeAlso = cloneObject(historicalIssueFixture);
    const agencies = malformedSeeAlso.agencies as Array<
      Record<string, unknown>
    >;
    const seeAlso = agencies[0]?.see_also as
      Array<Record<string, unknown>> | undefined;
    if (seeAlso?.[0] === undefined) {
      throw new Error("Synthetic historical see-also fixture is missing");
    }
    seeAlso[0].unreviewed = true;
    expect(() =>
      parseFederalRegisterIssueInventory(malformedSeeAlso, "1994-01-03"),
    ).toThrowError(/unexpected_field/);

    const whitespaceCategory = cloneObject(historicalIssueFixture);
    const whitespaceAgencies = whitespaceCategory.agencies as Array<
      Record<string, unknown>
    >;
    const categories = whitespaceAgencies[0]?.document_categories as
      Array<Record<string, unknown>> | undefined;
    if (categories?.[0] === undefined) {
      throw new Error("Synthetic historical category fixture is missing");
    }
    categories[0].type = " ";
    expect(() =>
      parseFederalRegisterIssueInventory(whitespaceCategory, "1994-01-03"),
    ).toThrowError(/nonblank string/);
  });

  it("accepts additive OpenAPI growth while pinning the adapter projection", () => {
    expect(() =>
      assertFederalRegisterOpenApiProjection(openApiFixture),
    ).not.toThrow();

    const missingField = structuredClone(openApiFixture);
    missingField.components.schemas.DocumentField.items.enum =
      missingField.components.schemas.DocumentField.items.enum.filter(
        (field) => field !== "corrections",
      );
    expect(() =>
      assertFederalRegisterOpenApiProjection(missingField),
    ).toThrowError(/selected discovery field is missing/);

    const changedLimit = structuredClone(openApiFixture);
    const perPage = changedLimit.paths[
      "/documents.{format}"
    ].get.parameters.find(({ name }) => name === "per_page");
    if (perPage?.schema.maximum !== undefined) {
      perPage.schema.maximum = 999;
    }
    expect(() =>
      assertFederalRegisterOpenApiProjection(changedLimit),
    ).toThrowError(/page-size contract changed/);

    const changedFieldsBinding = structuredClone(openApiFixture);
    const fields = changedFieldsBinding.paths[
      "/documents.{format}"
    ].get.parameters.find(({ name }) => name === "fields[]");
    if (fields?.name === "fields[]") {
      fields.explode = false;
    }
    expect(() =>
      assertFederalRegisterOpenApiProjection(changedFieldsBinding),
    ).toThrowError(/fields parameter binding changed/);

    const changedBatchFieldsBinding = structuredClone(openApiFixture);
    const batchFields = changedBatchFieldsBinding.paths[
      "/documents/{document_numbers}.{format}"
    ].get.parameters.find(({ name }) => name === "fields[]");
    if (batchFields?.name === "fields[]") {
      batchFields.explode = false;
    }
    expect(() =>
      assertFederalRegisterOpenApiProjection(changedBatchFieldsBinding),
    ).toThrowError(/batch fields parameter binding changed/);

    const changedBatchDocumentNumbers = structuredClone(openApiFixture);
    const documentNumbers = changedBatchDocumentNumbers.paths[
      "/documents/{document_numbers}.{format}"
    ].get.parameters.find(({ name }) => name === "document_numbers");
    if (documentNumbers?.name === "document_numbers") {
      documentNumbers.explode = true;
    }
    expect(() =>
      assertFederalRegisterOpenApiProjection(changedBatchDocumentNumbers),
    ).toThrowError(/batch document-number parameter binding changed/);

    const changedFacetBinding = structuredClone(openApiFixture);
    const facet = changedFacetBinding.paths[
      "/documents/facets/{facet}"
    ].get.parameters.find(({ name }) => name === "facet");
    if (facet?.name === "facet") {
      facet.required = false;
    }
    expect(() =>
      assertFederalRegisterOpenApiProjection(changedFacetBinding),
    ).toThrowError(/facet selector parameter binding changed/);

    const changedFacetDateBinding = structuredClone(openApiFixture);
    const facetStartDate = changedFacetDateBinding.paths[
      "/documents/facets/{facet}"
    ].get.parameters.find(
      ({ name }) => name === "conditions[publication_date][gte]",
    );
    if (facetStartDate?.name === "conditions[publication_date][gte]") {
      facetStartDate.in = "path";
    }
    expect(() =>
      assertFederalRegisterOpenApiProjection(changedFacetDateBinding),
    ).toThrowError(/facet date parameter is no longer query-bound/);

    const changedDate = structuredClone(openApiFixture);
    changedDate.components.schemas.FrDate.format = "date-time";
    expect(() =>
      assertFederalRegisterOpenApiProjection(changedDate),
    ).toThrowError(/date schema changed/);

    const missingDailyFacet = structuredClone(openApiFixture);
    missingDailyFacet.components.schemas.Facet.enum =
      missingDailyFacet.components.schemas.Facet.enum.filter(
        (value) => value !== "daily",
      );
    expect(() =>
      assertFederalRegisterOpenApiProjection(missingDailyFacet),
    ).toThrowError(/daily facet selector is missing/);

    const secured = cloneObject(openApiFixture);
    secured.security = [];
    expect(() => assertFederalRegisterOpenApiProjection(secured)).toThrowError(
      /security declaration/,
    );
  });
});
