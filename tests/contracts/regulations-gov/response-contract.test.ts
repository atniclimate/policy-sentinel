import malformedFixture from "../../../fixtures/sources/regulations-gov/resource-malformed.invalid.json";
import mutationFixture from "../../../fixtures/sources/regulations-gov/mutation.valid.json";
import rate429Fixture from "../../../fixtures/sources/regulations-gov/rate-429.valid.json";
import representativeFixture from "../../../fixtures/sources/regulations-gov/resource-bundle.valid.json";
import excludedFixture from "../../../fixtures/sources/regulations-gov/supporting-material-excluded.valid.json";
import { describe, expect, it } from "vitest";

import { RegulationsGovContractError } from "../../../src/contracts/regulations-gov/errors";
import {
  REGULATIONS_GOV_RESOURCE_BUDGET_POLICY,
  parseRegulationsGovSyntheticMutationObservation,
  parseRegulationsGovSyntheticRateLimitProjection,
  parseRegulationsGovSyntheticResourceBundle,
} from "../../../src/contracts/regulations-gov/response-contract";

type JsonObject = Record<string, unknown>;

function clone(value: unknown): JsonObject {
  return structuredClone(value) as JsonObject;
}

function object(value: unknown): JsonObject {
  return value as JsonObject;
}

function array(value: unknown): unknown[] {
  return value as unknown[];
}

function documentsOf(bundle: JsonObject): JsonObject[] {
  return array(bundle.documents).map(object);
}

function docketOf(bundle: JsonObject): JsonObject {
  return object(bundle.docket);
}

function firstDocument(bundle: JsonObject): JsonObject {
  return documentsOf(bundle)[0] ?? {};
}

function attachmentsOf(document: JsonObject): JsonObject[] {
  return array(document.attachments).map(object);
}

function firstAttachment(document: JsonObject): JsonObject {
  return attachmentsOf(document)[0] ?? {};
}

function formatsOf(attachment: JsonObject): JsonObject[] {
  return array(attachment.formats).map(object);
}

function mutationDocument(
  mutation: JsonObject,
  observation: "before" | "after",
): JsonObject {
  return object(object(mutation[observation]).document);
}

function resourceBudgetBundle(
  documentCount: number,
  attachmentsPerDocument: number,
  formatsPerAttachment: number,
): JsonObject {
  const bundle = clone(representativeFixture);
  const template = firstDocument(bundle);
  const documents = Array.from(
    { length: documentCount },
    (_, documentIndex) => {
      const document = structuredClone(template);
      const documentId = `SYNTHETIC-DOCUMENT-BUDGET-${String(
        documentIndex + 1,
      ).padStart(4, "0")}`;
      document.documentId = documentId;
      document.stableId = `regulations-gov:document:${documentId}`;
      document.detailUrl = `https://www.regulations.gov/document/${documentId}`;
      const attachments = Array.from(
        { length: attachmentsPerDocument },
        (_, attachmentIndex) => {
          const order = attachmentIndex + 1;
          const attachmentId = `${documentId}-ATTACHMENT-${order}`;
          return {
            attachmentId,
            parentDocumentId: documentId,
            order,
            restricted: false,
            modifyDate: null,
            publication: null,
            formats: Array.from(
              { length: formatsPerAttachment },
              (_, formatIndex) => {
                const format = `f${formatIndex + 1}`;
                return {
                  format,
                  sizeBytes: 1,
                  fileUrl: `https://downloads.regulations.gov/${documentId}/attachment_${order}.${format}`,
                };
              },
            ),
          };
        },
      );
      document.attachments = attachments;
      document.attachmentIds = attachments.map(
        ({ attachmentId }) => attachmentId,
      );
      return document;
    },
  );
  bundle.documents = documents;
  docketOf(bundle).documentIds = documents.map(({ documentId }) => documentId);
  return bundle;
}

describe("Regulations.gov synthetic response contract", () => {
  it("binds one synthetic agency, docket, eligible documents, and attachments", () => {
    const parsed = parseRegulationsGovSyntheticResourceBundle(
      representativeFixture,
    );

    expect(parsed).toMatchObject({
      contractVersion: "1.0.0",
      fixtureNotice: "Synthetic contract data; not a Regulations.gov response.",
      kind: "repository_owned_resource_bundle",
      sourceId: "regulations-gov",
      providerEnvelope: false,
      agencyId: "SYNTHETIC-AGENCY-ALPHA",
      docket: {
        docketId: "SYNTHETIC-DOCKET-RULEMAKING-0001",
        docketType: "Rulemaking",
        historicalCompleteness: "not_documented",
      },
    });
    expect(parsed.documents.map(({ documentType }) => documentType)).toEqual([
      "Notice",
      "Rule",
      "Proposed Rule",
    ]);
    expect(
      parsed.documents.every(({ eligibility }) => eligibility === "eligible"),
    ).toBe(true);
    expect(parsed.docket.documentIds).toEqual(
      parsed.documents.map(({ documentId }) => documentId),
    );
    expect(parsed.documents[0]?.attachments[0]).toMatchObject({
      attachmentId: "SYNTHETIC-DOCUMENT-NOTICE-0001-ATTACHMENT-1",
      parentDocumentId: "SYNTHETIC-DOCUMENT-NOTICE-0001",
      order: 1,
      restricted: false,
      modifyDate: "3785-03-19T14:15:16-04:00",
    });
    expect(parsed.documents[0]?.attachments[0]?.formats).toEqual([
      {
        format: "pdf",
        sizeBytes: 12345,
        fileUrl:
          "https://downloads.regulations.gov/SYNTHETIC-DOCUMENT-NOTICE-0001/attachment_1.pdf",
      },
      {
        format: "txt",
        sizeBytes: 6789,
        fileUrl:
          "https://downloads.regulations.gov/SYNTHETIC-DOCUMENT-NOTICE-0001/attachment_1.txt",
      },
    ]);
  });

  it("preserves every date concept and source status without merging semantics", () => {
    const parsed = parseRegulationsGovSyntheticResourceBundle(
      representativeFixture,
    );
    const notice = parsed.documents[0];
    const rule = parsed.documents[1];

    expect(notice).toMatchObject({
      lastModifiedDate: "3785-03-20T12:05:06-04:00",
      postedDate: "3785-03-10T09:00:00-05:00",
      commentStartDate: "3785-03-11T08:00:00-05:00",
      commentEndDate: "3785-04-12T23:59:59-04:00",
      effectiveDate: null,
      implementationDate: null,
      authorDate: "3785-03-08T16:30:00-05:00",
      postmarkDate: null,
      receiveDate: null,
      sourceStatus: {
        openForComment: true,
        allowLateComments: false,
        withdrawn: false,
      },
    });
    expect(rule).toMatchObject({
      effectiveDate: "3785-05-01T00:00:00-04:00",
      implementationDate: "3785-06-01T00:00:00-04:00",
      postmarkDate: "3785-03-29T09:00:00-04:00",
      receiveDate: "3785-03-30T10:00:00-04:00",
    });
    expect(notice).not.toHaveProperty("status");
    expect(notice).not.toHaveProperty("legalEffect");
  });

  it("keeps every resource general-jurisdiction, Unclassified, and without Nation evidence", () => {
    const parsed = parseRegulationsGovSyntheticResourceBundle(
      representativeFixture,
    );
    for (const resource of [parsed.docket, ...parsed.documents]) {
      expect(resource.governance).toEqual({
        jurisdiction: "general_jurisdiction",
        classification: "Unclassified",
        nationEvidence: [],
      });
      expect(resource.historicalCompleteness).toBe("not_documented");
    }
  });

  it("retains Supporting & Related Material and Other only as review-required exclusions", () => {
    const parsed = parseRegulationsGovSyntheticResourceBundle(excludedFixture);

    expect(parsed.docket.docketType).toBe("Nonrulemaking");
    expect(
      parsed.documents.map(({ documentType, eligibility }) => ({
        documentType,
        eligibility,
      })),
    ).toEqual([
      {
        documentType: "Supporting & Related Material",
        eligibility: "review_required_excluded",
      },
      { documentType: "Other", eligibility: "review_required_excluded" },
    ]);
  });

  it("rejects a committed synthetic malformed fixture with stable path evidence", () => {
    expect(() =>
      parseRegulationsGovSyntheticResourceBundle(malformedFixture),
    ).toThrowError(/unexpected_field.*commentText/);

    try {
      parseRegulationsGovSyntheticResourceBundle(malformedFixture);
      throw new Error("expected parsing to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(RegulationsGovContractError);
      expect(error).toMatchObject({
        code: "unexpected_field",
        path: "$.documents[0].commentText",
      });
    }
  });

  it("requires exact repository-owned markers and rejects provider envelopes", () => {
    for (const changed of [
      { field: "contractVersion", value: "changed" },
      { field: "fixtureNotice", value: "provider response" },
      { field: "kind", value: "document_response" },
      { field: "sourceId", value: "changed" },
      { field: "providerEnvelope", value: true },
    ]) {
      const bundle = clone(representativeFixture);
      bundle[changed.field] = changed.value;
      expect(() =>
        parseRegulationsGovSyntheticResourceBundle(bundle),
      ).toThrowError(/expected|provider envelope/);
    }

    for (const providerField of [
      "data",
      "meta",
      "included",
      "attributes",
      "relationships",
      "links",
      "extension",
      "rawBody",
    ]) {
      const bundle = clone(representativeFixture);
      bundle[providerField] = {};
      expect(
        () => parseRegulationsGovSyntheticResourceBundle(bundle),
        providerField,
      ).toThrowError(/unexpected_field/);
    }
  });

  it("binds bundle, docket, document, and agency identity without parsing ID segments", () => {
    const cases: Array<(bundle: JsonObject) => void> = [
      (bundle) => {
        docketOf(bundle).agencyId = "SYNTHETIC-AGENCY-OTHER";
      },
      (bundle) => {
        firstDocument(bundle).agencyId = "SYNTHETIC-AGENCY-OTHER";
      },
      (bundle) => {
        firstDocument(bundle).docketId = "SYNTHETIC-DOCKET-OTHER";
      },
      (bundle) => {
        docketOf(bundle).documentIds = [
          "SYNTHETIC-DOCUMENT-NOTICE-9999",
          ...array(docketOf(bundle).documentIds).slice(1),
        ];
      },
      (bundle) => {
        const documents = documentsOf(bundle);
        array(bundle.documents).push(structuredClone(documents[0]));
      },
    ];
    for (const mutate of cases) {
      const bundle = clone(representativeFixture);
      mutate(bundle);
      expect(() =>
        parseRegulationsGovSyntheticResourceBundle(bundle),
      ).toThrowError(/duplicate|match|different/);
    }
  });

  it("requires clearly synthetic opaque IDs and their derived stable IDs", () => {
    const nonsynthetic = clone(representativeFixture);
    const document = firstDocument(nonsynthetic);
    document.documentId = "REAL-DOCUMENT-0001";
    document.stableId = "regulations-gov:document:REAL-DOCUMENT-0001";
    expect(() =>
      parseRegulationsGovSyntheticResourceBundle(nonsynthetic),
    ).toThrowError(/clearly synthetic/);

    const driftedStableId = clone(representativeFixture);
    firstDocument(driftedStableId).stableId =
      "regulations-gov:document:SYNTHETIC-DOCUMENT-NOTICE-9999";
    expect(() =>
      parseRegulationsGovSyntheticResourceBundle(driftedStableId),
    ).toThrowError(/expected regulations-gov:document/);
  });

  it("rejects comment and submission resource types and eligibility drift", () => {
    for (const documentType of [
      "Comment",
      "Public Submission",
      "Submission",
      "Comment Attachment",
    ]) {
      const bundle = clone(representativeFixture);
      firstDocument(bundle).documentType = documentType;
      expect(
        () => parseRegulationsGovSyntheticResourceBundle(bundle),
        documentType,
      ).toThrowError(/reviewed vocabulary/);
    }

    const eligibilityDrift = clone(excludedFixture);
    firstDocument(eligibilityDrift).eligibility = "eligible";
    expect(() =>
      parseRegulationsGovSyntheticResourceBundle(eligibilityDrift),
    ).toThrowError(/review_required_excluded/);
  });

  it("structurally rejects comment, personal, contact, and provider-extension fields", () => {
    for (const field of [
      "commentText",
      "comments",
      "commentCount",
      "firstName",
      "lastName",
      "name",
      "email",
      "phone",
      "fax",
      "address",
      "city",
      "country",
      "organization",
      "authors",
      "abstract",
      "trackingNumber",
      "rawBody",
      "attributes",
      "agencyConfigurableFields",
    ]) {
      const bundle = clone(representativeFixture);
      firstDocument(bundle)[field] = `Synthetic forbidden ${field}`;
      expect(
        () => parseRegulationsGovSyntheticResourceBundle(bundle),
        field,
      ).toThrowError(new RegExp(`unexpected_field.*${field}`));
    }

    for (const field of [
      "title",
      "authors",
      "abstract",
      "commentAttachment",
      "text",
      "bytes",
      "body",
      "content",
      "name",
      "email",
      "address",
    ]) {
      const bundle = clone(representativeFixture);
      firstAttachment(firstDocument(bundle))[field] =
        `Synthetic forbidden ${field}`;
      expect(
        () => parseRegulationsGovSyntheticResourceBundle(bundle),
        field,
      ).toThrowError(new RegExp(`unexpected_field.*${field}`));
    }
  });

  it("requires real offset-bearing source dates and exact source booleans", () => {
    const dateCases: Array<[string, unknown]> = [
      ["lastModifiedDate", "3785-02-29T00:00:00Z"],
      ["postedDate", "3785-03-01T12:00:00"],
      ["commentStartDate", "3784-02-29T24:00:00Z"],
      ["effectiveDate", "3785-03-01"],
      ["receiveDate", "3785-03-01T12:00:00+24:00"],
    ];
    for (const [field, value] of dateCases) {
      const bundle = clone(representativeFixture);
      firstDocument(bundle)[field] = value;
      expect(
        () => parseRegulationsGovSyntheticResourceBundle(bundle),
        field,
      ).toThrowError(/ISO 8601|offset/);
    }

    const wrongBoolean = clone(representativeFixture);
    object(firstDocument(wrongBoolean).sourceStatus).withdrawn = "false";
    expect(() =>
      parseRegulationsGovSyntheticResourceBundle(wrongBoolean),
    ).toThrowError(/source boolean/);
  });

  it("accepts only exact keyless public docket and document identity URLs", () => {
    for (const unsafeUrl of [
      "http://www.regulations.gov/document/SYNTHETIC-DOCUMENT-NOTICE-0001",
      "https://api.regulations.gov/v4/documents/SYNTHETIC-DOCUMENT-NOTICE-0001",
      "https://user:secret@www.regulations.gov/document/SYNTHETIC-DOCUMENT-NOTICE-0001",
      "https://www.regulations.gov:444/document/SYNTHETIC-DOCUMENT-NOTICE-0001",
      "https://www.regulations.gov/document/SYNTHETIC-DOCUMENT-NOTICE-0001?api_key=SYNTHETIC",
      "https://www.regulations.gov/document/SYNTHETIC-DOCUMENT-NOTICE-0001#fragment",
      "https://www.regulations.gov/document/SYNTHETIC-DOCUMENT-NOTICE-9999",
    ]) {
      const bundle = clone(representativeFixture);
      firstDocument(bundle).detailUrl = unsafeUrl;
      expect(
        () => parseRegulationsGovSyntheticResourceBundle(bundle),
        unsafeUrl,
      ).toThrowError(/invalid_url/);
    }

    const docketUrl = clone(representativeFixture);
    docketOf(docketUrl).detailUrl =
      "https://www.regulations.gov/document/SYNTHETIC-DOCKET-RULEMAKING-0001";
    expect(() =>
      parseRegulationsGovSyntheticResourceBundle(docketUrl),
    ).toThrowError(/invalid_url/);
  });

  it("binds attachment IDs, order, formats, sizes, and download paths to the parent", () => {
    const crossParent = clone(representativeFixture);
    firstAttachment(firstDocument(crossParent)).parentDocumentId =
      "SYNTHETIC-DOCUMENT-OTHER";
    expect(() =>
      parseRegulationsGovSyntheticResourceBundle(crossParent),
    ).toThrowError(/different parent/);

    const badAttachmentId = clone(representativeFixture);
    firstAttachment(firstDocument(badAttachmentId)).attachmentId =
      "SYNTHETIC-ATTACHMENT-OTHER";
    expect(() =>
      parseRegulationsGovSyntheticResourceBundle(badAttachmentId),
    ).toThrowError(/derived from its parent/);

    const duplicateFormat = clone(representativeFixture);
    const format = formatsOf(
      firstAttachment(firstDocument(duplicateFormat)),
    )[0];
    array(firstAttachment(firstDocument(duplicateFormat)).formats).push(
      structuredClone(format),
    );
    expect(() =>
      parseRegulationsGovSyntheticResourceBundle(duplicateFormat),
    ).toThrowError(/duplicate retained identity/);

    for (const size of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const bundle = clone(representativeFixture);
      formatsOf(firstAttachment(firstDocument(bundle)))[0]!.sizeBytes = size;
      expect(
        () => parseRegulationsGovSyntheticResourceBundle(bundle),
        String(size),
      ).toThrowError(/bounded safe integer/);
    }
  });

  it("fails closed on per-resource and aggregate attachment budgets", () => {
    const policy = REGULATIONS_GOV_RESOURCE_BUDGET_POLICY;
    const atAggregateBoundary = resourceBudgetBundle(
      policy.maximumAttachmentsPerBundle / policy.maximumAttachmentsPerDocument,
      policy.maximumAttachmentsPerDocument,
      policy.maximumFormatsPerBundle / policy.maximumAttachmentsPerBundle,
    );
    const parsed =
      parseRegulationsGovSyntheticResourceBundle(atAggregateBoundary);
    expect(
      parsed.documents.flatMap(({ attachments }) => attachments),
    ).toHaveLength(policy.maximumAttachmentsPerBundle);
    expect(
      parsed.documents.flatMap(({ attachments }) =>
        attachments.flatMap(({ formats }) => formats),
      ),
    ).toHaveLength(policy.maximumFormatsPerBundle);

    const tooManyPerDocument = resourceBudgetBundle(
      1,
      policy.maximumAttachmentsPerDocument + 1,
      1,
    );
    expect(() =>
      parseRegulationsGovSyntheticResourceBundle(tooManyPerDocument),
    ).toThrowError(/array length.*contract bound/);

    const tooManyFormatsPerAttachment = resourceBudgetBundle(
      1,
      1,
      policy.maximumFormatsPerAttachment + 1,
    );
    expect(() =>
      parseRegulationsGovSyntheticResourceBundle(tooManyFormatsPerAttachment),
    ).toThrowError(/array length.*contract bound/);

    const tooManyAggregateAttachments = resourceBudgetBundle(
      policy.maximumAttachmentsPerBundle /
        policy.maximumAttachmentsPerDocument +
        1,
      policy.maximumAttachmentsPerDocument,
      1,
    );
    expect(() =>
      parseRegulationsGovSyntheticResourceBundle(tooManyAggregateAttachments),
    ).toThrowError(/aggregate attachments count/);

    const tooManyAggregateFormats = resourceBudgetBundle(
      3,
      43,
      policy.maximumFormatsPerAttachment,
    );
    expect(() =>
      parseRegulationsGovSyntheticResourceBundle(tooManyAggregateFormats),
    ).toThrowError(/aggregate formats count/);
  });

  it("rejects attachment credentials, alternate hosts, and cross-parent paths", () => {
    for (const unsafeUrl of [
      "http://downloads.regulations.gov/SYNTHETIC-DOCUMENT-NOTICE-0001/attachment_1.pdf",
      "https://example.invalid/SYNTHETIC-DOCUMENT-NOTICE-0001/attachment_1.pdf",
      "https://user:secret@downloads.regulations.gov/SYNTHETIC-DOCUMENT-NOTICE-0001/attachment_1.pdf",
      "https://downloads.regulations.gov:444/SYNTHETIC-DOCUMENT-NOTICE-0001/attachment_1.pdf",
      "https://downloads.regulations.gov/SYNTHETIC-DOCUMENT-OTHER/attachment_1.pdf",
      "https://downloads.regulations.gov/SYNTHETIC-DOCUMENT-NOTICE-0001/attachment_2.pdf",
      "https://downloads.regulations.gov/SYNTHETIC-DOCUMENT-NOTICE-0001/attachment_1.pdf?api_key=SYNTHETIC",
      "https://downloads.regulations.gov/SYNTHETIC-DOCUMENT-NOTICE-0001/attachment_1.pdf#fragment",
    ]) {
      const bundle = clone(representativeFixture);
      formatsOf(firstAttachment(firstDocument(bundle)))[0]!.fileUrl = unsafeUrl;
      expect(
        () => parseRegulationsGovSyntheticResourceBundle(bundle),
        unsafeUrl,
      ).toThrowError(/invalid_url/);
    }
  });

  it("rejects inferred governance, Nation evidence, and completeness claims", () => {
    const cases: Array<(bundle: JsonObject) => void> = [
      (bundle) => {
        object(firstDocument(bundle).governance).jurisdiction =
          "nation_specific";
      },
      (bundle) => {
        object(firstDocument(bundle).governance).classification = "Environment";
      },
      (bundle) => {
        object(firstDocument(bundle).governance).nationEvidence = [
          "SYNTHETIC-NATION",
        ];
      },
      (bundle) => {
        firstDocument(bundle).historicalCompleteness = "complete";
      },
    ];
    for (const mutate of cases) {
      const bundle = clone(representativeFixture);
      mutate(bundle);
      expect(() =>
        parseRegulationsGovSyntheticResourceBundle(bundle),
      ).toThrowError(/expected|no Nation evidence/);
    }
  });
});

describe("Regulations.gov synthetic mutation observation", () => {
  it("models docket reassignment within an explicitly unverified same-document scope", () => {
    const parsed =
      parseRegulationsGovSyntheticMutationObservation(mutationFixture);

    expect(parsed.identityPolicy).toEqual({
      observationScope: "same_synthetic_document_id",
      providerBehavior: "unverified",
      identityReplacement: "not_inferred",
    });
    expect(parsed.before.document.documentId).toBe(
      "SYNTHETIC-DOCUMENT-MUTABLE-0006",
    );
    expect(parsed.after.document.documentId).toBe(
      parsed.before.document.documentId,
    );
    expect(parsed.after.document.docketId).not.toBe(
      parsed.before.document.docketId,
    );
    expect(parsed.changedFields).toEqual([
      "docketId",
      "title",
      "lastModifiedDate",
      "commentEndDate",
      "sourceStatus.openForComment",
      "attachments",
    ]);
    expect(parsed.after.document.attachments[0]?.parentDocumentId).toBe(
      parsed.after.document.documentId,
    );
  });

  it("rejects identity replacement inside the same-document observation scope", () => {
    const cases: Array<(mutation: JsonObject) => void> = [
      (mutation) => {
        const document = mutationDocument(mutation, "after");
        document.documentId = "SYNTHETIC-DOCUMENT-MUTABLE-9999";
        document.stableId =
          "regulations-gov:document:SYNTHETIC-DOCUMENT-MUTABLE-9999";
        document.detailUrl =
          "https://www.regulations.gov/document/SYNTHETIC-DOCUMENT-MUTABLE-9999";
        document.attachmentIds = [];
        document.attachments = [];
      },
      (mutation) => {
        mutationDocument(mutation, "after").stableId =
          "regulations-gov:document:SYNTHETIC-DOCUMENT-MUTABLE-9999";
      },
    ];
    for (const mutate of cases) {
      const mutation = clone(mutationFixture);
      mutate(mutation);
      expect(() =>
        parseRegulationsGovSyntheticMutationObservation(mutation),
      ).toThrowError(
        /same-document observation scope|expected regulations-gov:document/,
      );
    }
  });

  it("requires exact unverified identity-policy markers", () => {
    for (const [field, value] of [
      ["observationScope", "all_provider_versions"],
      ["providerBehavior", "verified"],
      ["identityReplacement", "immutable"],
    ]) {
      const mutation = clone(mutationFixture);
      object(mutation.identityPolicy)[field] = value;
      expect(
        () => parseRegulationsGovSyntheticMutationObservation(mutation),
        field,
      ).toThrowError(/expected/);
    }
  });

  it("requires changedFields to exactly equal ordered before/after differences", () => {
    const missing = clone(mutationFixture);
    missing.changedFields = array(missing.changedFields).slice(1);
    expect(() =>
      parseRegulationsGovSyntheticMutationObservation(missing),
    ).toThrowError(/exactly match/);

    const extra = clone(mutationFixture);
    extra.changedFields = [...array(extra.changedFields), "postedDate"];
    expect(() =>
      parseRegulationsGovSyntheticMutationObservation(extra),
    ).toThrowError(/exactly match/);

    const reordered = clone(mutationFixture);
    reordered.changedFields = array(reordered.changedFields).toReversed();
    expect(() =>
      parseRegulationsGovSyntheticMutationObservation(reordered),
    ).toThrowError(/exactly match/);

    const duplicate = clone(mutationFixture);
    duplicate.changedFields = [
      ...array(duplicate.changedFields),
      array(duplicate.changedFields)[0],
    ];
    expect(() =>
      parseRegulationsGovSyntheticMutationObservation(duplicate),
    ).toThrowError(/duplicate|array length/);
  });

  it("requires forward, normalized UTC observation times", () => {
    const reversed = clone(mutationFixture);
    object(reversed.after).observedAt = "3785-05-01T12:00:00.000Z";
    expect(() =>
      parseRegulationsGovSyntheticMutationObservation(reversed),
    ).toThrowError(/progress forward/);

    const offset = clone(mutationFixture);
    object(offset.after).observedAt = "3785-06-08T08:00:00-04:00";
    expect(() =>
      parseRegulationsGovSyntheticMutationObservation(offset),
    ).toThrowError(/normalized UTC/);
  });
});

describe("Regulations.gov synthetic rate-limit projection", () => {
  it("labels a 429 as generic and unverified without inventing reset or retry", () => {
    const parsed =
      parseRegulationsGovSyntheticRateLimitProjection(rate429Fixture);

    expect(parsed).toEqual(rate429Fixture);
    expect(parsed.ratePolicy).toEqual({
      verificationState: "generic_unverified",
      window: "rolling_hour",
      defaultLimit: 1000,
    });
    expect(parsed.statusCode).toBe(429);
    expect(parsed.gatewayCode).toBe("OVER_RATE_LIMIT");
    expect(parsed).not.toHaveProperty("retryAfter");
    expect(parsed.headers).not.toHaveProperty("X-RateLimit-Reset");
  });

  it("accepts a bounded synthetic 200 state with no gateway error code", () => {
    const success = clone(rate429Fixture);
    success.statusCode = 200;
    success.gatewayCode = null;
    object(success.headers)["X-RateLimit-Remaining"] = "875";

    expect(
      parseRegulationsGovSyntheticRateLimitProjection(success),
    ).toMatchObject({
      statusCode: 200,
      gatewayCode: null,
      headers: {
        "X-RateLimit-Limit": "1000",
        "X-RateLimit-Remaining": "875",
      },
    });
  });

  it("rejects credential, reset, retry, and unknown headers", () => {
    for (const header of [
      "X-Api-Key",
      "Authorization",
      "X-RateLimit-Reset",
      "Retry-After",
      "api_key",
    ]) {
      const rate = clone(rate429Fixture);
      object(rate.headers)[header] = "SYNTHETIC-FORBIDDEN";
      expect(
        () => parseRegulationsGovSyntheticRateLimitProjection(rate),
        header,
      ).toThrowError(/unexpected_field/);
    }
  });

  it("rejects malformed or inconsistent rate values and status codes", () => {
    for (const value of ["", "-1", "01", "1.5", "1e3", "not-a-number"]) {
      const rate = clone(rate429Fixture);
      object(rate.headers)["X-RateLimit-Remaining"] = value;
      expect(
        () => parseRegulationsGovSyntheticRateLimitProjection(rate),
        value,
      ).toThrowError(/integer header|safe integer/);
    }

    const remainingTooHigh = clone(rate429Fixture);
    object(remainingTooHigh.headers)["X-RateLimit-Limit"] = "10";
    object(remainingTooHigh.headers)["X-RateLimit-Remaining"] = "11";
    expect(() =>
      parseRegulationsGovSyntheticRateLimitProjection(remainingTooHigh),
    ).toThrowError(/cannot exceed/);

    for (const [statusCode, gatewayCode] of [
      [403, null],
      [429, null],
      [200, "OVER_RATE_LIMIT"],
    ] as const) {
      const rate = clone(rate429Fixture);
      rate.statusCode = statusCode;
      rate.gatewayCode = gatewayCode;
      expect(() =>
        parseRegulationsGovSyntheticRateLimitProjection(rate),
      ).toThrowError(/status 200 or 429|does not match/);
    }
  });

  it("does not permit the generic default to masquerade as a verified service quota", () => {
    const changedState = clone(rate429Fixture);
    object(changedState.ratePolicy).verificationState = "verified";
    expect(() =>
      parseRegulationsGovSyntheticRateLimitProjection(changedState),
    ).toThrowError(/generic_unverified/);

    const changedDefault = clone(rate429Fixture);
    object(changedDefault.ratePolicy).defaultLimit = 500;
    expect(() =>
      parseRegulationsGovSyntheticRateLimitProjection(changedDefault),
    ).toThrowError(/bounded safe integer/);
  });
});
