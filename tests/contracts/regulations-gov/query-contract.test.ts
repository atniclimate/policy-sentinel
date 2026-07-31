import { describe, expect, it } from "vitest";

import {
  assertRegulationsGovRelativeRequest,
  buildRegulationsGovRelativeRequest,
  parseRegulationsGovResourcePath,
} from "../../../src/contracts/regulations-gov/query-contract";

const listWindow = {
  lastModifiedDateGe: "3785-01-01 00:00:00",
  lastModifiedDateLe: "3785-01-31 23:59:59",
  pageNumber: 1,
  pageSize: 250,
} as const;

describe("Regulations.gov keyless GET query contract", () => {
  it("builds a canonical bounded document-list request with exact filters", () => {
    const request = buildRegulationsGovRelativeRequest("/v4/documents", {
      ...listWindow,
      agencyId: "EPA",
      documentType: "Proposed Rule",
      docketId: "EPA-HQ-SYNTHETIC-3785-0001",
      subtype: "Synthetic Subtype",
    });

    expect(request.canonicalPathAndQuery).toBe(
      "/v4/documents?filter%5BlastModifiedDate%5D%5Bge%5D=3785-01-01+00%3A00%3A00&filter%5BlastModifiedDate%5D%5Ble%5D=3785-01-31+23%3A59%3A59&filter%5BagencyId%5D=EPA&filter%5BdocumentType%5D=Proposed+Rule&filter%5BdocketId%5D=EPA-HQ-SYNTHETIC-3785-0001&filter%5Bsubtype%5D=Synthetic+Subtype&sort=lastModifiedDate%2CdocumentId&page%5Bnumber%5D=1&page%5Bsize%5D=250",
    );
    expect(
      assertRegulationsGovRelativeRequest(request.canonicalPathAndQuery),
    ).toEqual(request);
  });

  it("builds a canonical bounded docket-list request", () => {
    const request = buildRegulationsGovRelativeRequest("/v4/dockets", {
      ...listWindow,
      pageNumber: 20,
      pageSize: 5,
      agencyId: "GSA",
      docketType: "Nonrulemaking",
    });

    expect(request.resource).toMatchObject({
      kind: "docket-list",
      paginated: true,
    });
    expect(request.canonicalPathAndQuery).toBe(
      "/v4/dockets?filter%5BlastModifiedDate%5D%5Bge%5D=3785-01-01+00%3A00%3A00&filter%5BlastModifiedDate%5D%5Ble%5D=3785-01-31+23%3A59%3A59&filter%5BagencyId%5D=GSA&filter%5BdocketType%5D=Nonrulemaking&sort=lastModifiedDate%2CdocketId&page%5Bnumber%5D=20&page%5Bsize%5D=5",
    );
    expect(
      assertRegulationsGovRelativeRequest(request.canonicalPathAndQuery),
    ).toEqual(request);
  });

  it("allows document attachments only as an exact optional detail include", () => {
    const plain = buildRegulationsGovRelativeRequest(
      "/v4/documents/EPA-SYNTHETIC-3785-0001",
    );
    const included = buildRegulationsGovRelativeRequest(
      "/v4/documents/EPA-SYNTHETIC-3785-0001",
      { include: "attachments" },
    );
    const docket = buildRegulationsGovRelativeRequest(
      "/v4/dockets/EPA-HQ-SYNTHETIC-3785-0001",
    );

    expect(plain.canonicalPathAndQuery).toBe(
      "/v4/documents/EPA-SYNTHETIC-3785-0001",
    );
    expect(included.canonicalPathAndQuery).toBe(
      "/v4/documents/EPA-SYNTHETIC-3785-0001?include=attachments",
    );
    expect(docket.canonicalPathAndQuery).toBe(
      "/v4/dockets/EPA-HQ-SYNTHETIC-3785-0001",
    );
    expect(
      assertRegulationsGovRelativeRequest(included.canonicalPathAndQuery),
    ).toEqual(included);
  });

  it("rejects hosts, comments, attachment routes, and unreviewed path shapes", () => {
    for (const path of [
      "https://api.regulations.gov/v4/documents",
      "//api.regulations.gov/v4/documents",
      "/v4/comments",
      "/v4/comments/SYNTHETIC-COMMENT",
      "/v4/attachments/SYNTHETIC-ATTACHMENT",
      "/v4/agency-categories",
      "/v4/documents/",
      "/v4/documents/SYNTHETIC/extra",
      "/v4/documents/../dockets",
      "/v4/documents/SYNTHETIC%2FESCAPE",
    ]) {
      expect(() => parseRegulationsGovResourcePath(path), path).toThrowError(
        /relative|reviewed|identifier|outside|path/,
      );
    }
  });

  it("rejects every credential, relevance, unknown, and duplicate query parameter", () => {
    const canonical = buildRegulationsGovRelativeRequest(
      "/v4/documents",
      listWindow,
    ).canonicalPathAndQuery;
    for (const suffix of [
      "&api_key=synthetic",
      "&X-Api-Key=synthetic",
      "&access_token=synthetic",
      "&auth=synthetic",
      "&credential=synthetic",
      "&secret=synthetic",
      "&signature=synthetic",
      "&filter%5BsearchTerm%5D=Nation",
      "&keyword=Nation",
      "&relevance=Nation",
      "&filter%5BpostedDate%5D=3785-01-01",
      "&unknown=value",
      "&page%5Bnumber%5D=1",
    ]) {
      expect(
        () => assertRegulationsGovRelativeRequest(`${canonical}${suffix}`),
        suffix,
      ).toThrowError(/credential|search|relevance|outside|duplicate/);
    }
  });

  it("requires the exact stable ascending sort", () => {
    const canonical = buildRegulationsGovRelativeRequest(
      "/v4/documents",
      listWindow,
    ).canonicalPathAndQuery;
    for (const changed of [
      canonical.replace("&sort=lastModifiedDate%2CdocumentId", ""),
      canonical.replace(
        "sort=lastModifiedDate%2CdocumentId",
        "sort=-lastModifiedDate%2CdocumentId",
      ),
      canonical.replace(
        "sort=lastModifiedDate%2CdocumentId",
        "sort=lastModifiedDate",
      ),
      canonical.replace(
        "sort=lastModifiedDate%2CdocumentId",
        "sort=lastModifiedDate%2Ctitle",
      ),
    ]) {
      expect(() => assertRegulationsGovRelativeRequest(changed)).toThrowError(
        /stable ascending sort/,
      );
    }
  });

  it("requires complete bounded list windows and provider page limits", () => {
    for (const options of [
      { ...listWindow, lastModifiedDateGe: undefined },
      { ...listWindow, lastModifiedDateLe: undefined },
      { ...listWindow, pageNumber: undefined },
      { ...listWindow, pageSize: undefined },
      { ...listWindow, pageNumber: 0 },
      { ...listWindow, pageNumber: 21 },
      { ...listWindow, pageSize: 4 },
      { ...listWindow, pageSize: 251 },
    ]) {
      expect(() =>
        buildRegulationsGovRelativeRequest("/v4/documents", options),
      ).toThrowError(/require both|integer from/);
    }
  });

  it("rejects malformed, impossible, and reversed literal date-time windows", () => {
    for (const [ge, le] of [
      ["3785-02-29 00:00:00", "3785-03-01 00:00:00"],
      ["3784-02-29 24:00:00", "3784-03-01 00:00:00"],
      ["3784-01-01T00:00:00Z", "3784-01-02 00:00:00"],
      ["3785-01-02 00:00:00", "3785-01-01 23:59:59"],
    ]) {
      expect(() =>
        buildRegulationsGovRelativeRequest("/v4/dockets", {
          ...listWindow,
          lastModifiedDateGe: ge,
          lastModifiedDateLe: le,
        }),
      ).toThrowError(/literal|real calendar|reversed/);
    }

    expect(
      buildRegulationsGovRelativeRequest("/v4/dockets", {
        ...listWindow,
        lastModifiedDateGe: "3784-02-29 00:00:00",
      }).options.lastModifiedDateGe,
    ).toBe("3784-02-29 00:00:00");
  });

  it("rejects malformed identifiers and unreviewed filter vocabularies", () => {
    expect(() =>
      buildRegulationsGovRelativeRequest("/v4/documents/not valid"),
    ).toThrowError(/safe identifier/);
    expect(() =>
      buildRegulationsGovRelativeRequest("/v4/documents", {
        ...listWindow,
        agencyId: "EPA,GSA",
      }),
    ).toThrowError(/safe identifier/);
    expect(() =>
      buildRegulationsGovRelativeRequest("/v4/documents", {
        ...listWindow,
        docketId: "../escape",
      }),
    ).toThrowError(/safe identifier/);
    expect(() =>
      buildRegulationsGovRelativeRequest("/v4/documents", {
        ...listWindow,
        documentType: "Final Rule",
      } as never),
    ).toThrowError(/official vocabulary/);
    expect(() =>
      buildRegulationsGovRelativeRequest("/v4/dockets", {
        ...listWindow,
        docketType: "Other",
      } as never),
    ).toThrowError(/official vocabulary/);
  });

  it("rejects route-specific option drift and changed option shapes", () => {
    for (const [path, options] of [
      ["/v4/dockets", { ...listWindow, documentType: "Rule" }],
      ["/v4/dockets", { ...listWindow, docketId: "SYNTHETIC-DOCKET" }],
      ["/v4/dockets", { ...listWindow, subtype: "Synthetic" }],
      ["/v4/documents", { ...listWindow, docketType: "Rulemaking" }],
      [
        "/v4/documents/SYNTHETIC-DOCUMENT",
        { ...listWindow, include: "attachments" },
      ],
      ["/v4/dockets/SYNTHETIC-DOCKET", { include: "attachments" }],
    ] as const) {
      expect(() =>
        buildRegulationsGovRelativeRequest(path, options),
      ).toThrowError(/only|not valid|do not accept/);
    }
    expect(() =>
      buildRegulationsGovRelativeRequest("/v4/documents", {
        ...listWindow,
        searchTerm: "Nation",
      } as never),
    ).toThrowError(/not allowed/);
    expect(() =>
      buildRegulationsGovRelativeRequest("/v4/documents/SYNTHETIC-DOCUMENT", {
        include: "documents",
      } as never),
    ).toThrowError(/exactly attachments/);
    expect(() =>
      buildRegulationsGovRelativeRequest("/v4/documents", null as never),
    ).toThrowError(/plain query-options object/);
  });

  it("rejects noncanonical encoding, ordering, and oversized exact text", () => {
    const canonical = buildRegulationsGovRelativeRequest(
      "/v4/documents",
      listWindow,
    ).canonicalPathAndQuery;
    const reordered = canonical.replace(
      /^(\/v4\/documents\?)([^&]+)&([^&]+)/,
      "$1$3&$2",
    );
    const percentSpace = canonical.replace("+", "%20");
    expect(() => assertRegulationsGovRelativeRequest(reordered)).toThrowError(
      /canonical keyless form/,
    );
    expect(() =>
      assertRegulationsGovRelativeRequest(percentSpace),
    ).toThrowError(/canonical keyless form/);
    expect(() =>
      buildRegulationsGovRelativeRequest("/v4/documents", {
        ...listWindow,
        subtype: "x".repeat(257),
      }),
    ).toThrowError(/bounded exact text/);
    expect(() =>
      buildRegulationsGovRelativeRequest("/v4/documents", {
        ...listWindow,
        subtype: " Synthetic",
      }),
    ).toThrowError(/surrounding whitespace/);
  });
});
