import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  SOAP_11_NAMESPACE,
  WASHINGTON_LWS_KNOWN_BILL_OPERATIONS,
  WASHINGTON_LWS_OPERATION_DESCRIPTORS,
  WASHINGTON_LWS_SERVICE_NAMESPACE,
  WASHINGTON_LWS_XML_POLICY,
  type WashingtonLwsOperation,
} from "../../../src/contracts/washington-lws/constants";
import { WashingtonLwsContractError } from "../../../src/contracts/washington-lws/errors";
import type { WashingtonLwsRequestInput } from "../../../src/contracts/washington-lws/request-contract";
import {
  parseWashingtonLwsSoapExchange,
  type WashingtonLwsSoapResponse,
} from "../../../src/contracts/washington-lws/soap-contract";

const FIXTURE_FILES = {
  GetLegislation: "get-legislation.valid.xml",
  GetLegislationByYear: "get-legislation-by-year.valid.xml",
  GetLegislativeStatusChangesByBillId:
    "get-legislative-status-changes-by-bill-id.valid.xml",
  GetSponsors: "get-sponsors.valid.xml",
  GetCommitteeReferralsByBill: "get-committee-referrals-by-bill.valid.xml",
  GetDocuments: "get-documents.valid.xml",
  GetSessionLawByBillId: "get-session-law-by-bill-id.valid.xml",
} as const satisfies Record<WashingtonLwsOperation, string>;

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function fixture(name: string): Uint8Array {
  return readFileSync(
    path.resolve(projectRoot, "fixtures/sources/washington-lws", name),
  );
}

function fixtureText(name: string): string {
  return new TextDecoder().decode(fixture(name));
}

function bytes(xml: string): Uint8Array {
  return new TextEncoder().encode(xml);
}

function requestFor<O extends WashingtonLwsOperation>(
  operation: O,
): Extract<WashingtonLwsRequestInput, { operation: O }> {
  const biennium = "3785-86";
  const billId = "SYNTHETIC-HB-999991-SUB1-ENG2";
  let request: WashingtonLwsRequestInput;
  switch (operation) {
    case "GetLegislation":
    case "GetCommitteeReferralsByBill":
      request = { operation, biennium, billNumber: 999_991 };
      break;
    case "GetLegislationByYear":
      request = { operation, year: 3_785 };
      break;
    case "GetLegislativeStatusChangesByBillId":
      request = {
        operation,
        biennium,
        billId,
        beginDate: "3785-01-01T00:00:00.000Z",
        endDate: "3785-01-31T00:00:00.000Z",
      };
      break;
    case "GetSponsors":
    case "GetSessionLawByBillId":
      request = { operation, biennium, billId };
      break;
    case "GetDocuments":
      request = { operation, biennium, namedLike: billId };
      break;
  }
  return request as Extract<WashingtonLwsRequestInput, { operation: O }>;
}

function parseWashingtonLwsSoapResponse<O extends WashingtonLwsOperation>(
  operation: O,
  value: unknown,
): WashingtonLwsSoapResponse<O> {
  return parseWashingtonLwsSoapExchange(requestFor(operation), value);
}

function capturedContractError(
  action: () => unknown,
): WashingtonLwsContractError {
  try {
    action();
  } catch (error) {
    if (error instanceof WashingtonLwsContractError) {
      return error;
    }
    throw error;
  }
  throw new Error("Expected WashingtonLwsContractError");
}

function emptyResponse(
  operation: WashingtonLwsOperation,
  includeResult: boolean,
): Uint8Array {
  const descriptor = WASHINGTON_LWS_OPERATION_DESCRIPTORS[operation];
  const result = includeResult
    ? `<${descriptor.resultElement}></${descriptor.resultElement}>`
    : "";
  return bytes(
    '<?xml version="1.0" encoding="UTF-8"?>' +
      `<soap:Envelope xmlns:soap="${SOAP_11_NAMESPACE}"><soap:Body>` +
      `<${descriptor.responseElement} xmlns="${WASHINGTON_LWS_SERVICE_NAMESPACE}">` +
      `${result}</${descriptor.responseElement}></soap:Body></soap:Envelope>`,
  );
}

describe("Washington LWS SOAP response contract", () => {
  it("runtime-freezes security-sensitive operation and XML policy constants", () => {
    expect(Object.isFrozen(WASHINGTON_LWS_OPERATION_DESCRIPTORS)).toBe(true);
    for (const descriptor of Object.values(
      WASHINGTON_LWS_OPERATION_DESCRIPTORS,
    )) {
      expect(Object.isFrozen(descriptor)).toBe(true);
    }
    expect(Object.isFrozen(WASHINGTON_LWS_KNOWN_BILL_OPERATIONS)).toBe(true);
    expect(Object.isFrozen(WASHINGTON_LWS_XML_POLICY)).toBe(true);

    const descriptor =
      WASHINGTON_LWS_OPERATION_DESCRIPTORS.GetLegislation as unknown as {
        servicePath: string;
        maximumItems: number;
      };
    expect(() =>
      Object.assign(descriptor, {
        servicePath: "@example.invalid/legislationservice.asmx",
        maximumItems: Number.MAX_SAFE_INTEGER,
      }),
    ).toThrow(TypeError);
    expect(descriptor).toMatchObject({
      servicePath: "/legislationservice.asmx",
      maximumItems: 64,
    });

    const xmlPolicy = WASHINGTON_LWS_XML_POLICY as unknown as {
      maximumNodes: number;
    };
    expect(() =>
      Object.assign(xmlPolicy, { maximumNodes: Number.MAX_SAFE_INTEGER }),
    ).toThrow(TypeError);
    expect(xmlPolicy.maximumNodes).toBe(30_000);
  });

  it("projects two bill versions without selecting an active winner", () => {
    const response = parseWashingtonLwsSoapResponse(
      "GetLegislation",
      fixture(FIXTURE_FILES.GetLegislation),
    );

    expect(response.kind).toBe("success");
    if (response.kind !== "success") return;
    expect(response.resultState).toBe("present");
    expect(response.result).toHaveLength(2);
    expect(response.result).toMatchObject([
      {
        biennium: "3785-86",
        billId: "SYNTHETIC-HB-999991-BASE",
        billNumber: 999991,
        substituteVersion: 0,
        engrossedVersion: 0,
        legislationType: {
          short: "SYNTHETIC-HB",
          long: "SYNTHETIC-HOUSE-BILL",
        },
        active: false,
        introducedDate: "3785-01-02T09:15:00-08:00",
        primeSponsorId: 900001,
      },
      {
        biennium: "3785-86",
        billId: "SYNTHETIC-HB-999991-SUB1-ENG2",
        billNumber: 999991,
        substituteVersion: 1,
        engrossedVersion: 2,
        active: true,
        introducedDate: "3785-01-04T11:45:00-08:00",
        primeSponsorId: 900001,
      },
    ]);
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("DISCARDED-REQUEST");
    expect(serialized).not.toContain("DISCARDED-LONG-DESCRIPTION");
    expect(response.result.map(({ billId }) => billId)).toEqual([
      "SYNTHETIC-HB-999991-BASE",
      "SYNTHETIC-HB-999991-SUB1-ENG2",
    ]);
  });

  it("projects sparse yearly legislation identities while preserving versions, order, and duplicates", () => {
    const response = parseWashingtonLwsSoapResponse(
      "GetLegislationByYear",
      fixture(FIXTURE_FILES.GetLegislationByYear),
    );

    expect(response.kind).toBe("success");
    if (response.kind !== "success") return;
    expect(response.resultState).toBe("present");
    expect(response.result).toHaveLength(4);
    expect(response.result[0]).toMatchObject({
      biennium: "3785-86",
      billId: "SYNTHETIC-YEAR-HB-999991-BASE",
      billNumber: 999991,
      substituteVersion: 0,
      engrossedVersion: 0,
      active: false,
    });
    expect(response.result[1]).toEqual(response.result[2]);
    expect(response.result[3]).toEqual({
      biennium: null,
      billId: null,
      billNumber: 999992,
      substituteVersion: 0,
      engrossedVersion: 0,
      legislationType: null,
      originalAgency: null,
      active: false,
      displayNumber: null,
    });
  });

  it("does not invent a request-year echo or inferred biennium identity", () => {
    const original = fixtureText(FIXTURE_FILES.GetLegislationByYear);
    const changed = original.replace(
      "<Biennium>3785-86</Biennium>",
      "<Biennium>3787-88</Biennium>",
    );
    expect(changed).not.toBe(original);

    const response = parseWashingtonLwsSoapResponse(
      "GetLegislationByYear",
      bytes(changed),
    );
    expect(response.kind).toBe("success");
    if (response.kind === "success") {
      expect(response.result[0]?.biennium).toBe("3787-88");
    }
  });

  it("fails the whole yearly result on nil, malformed, or unbounded fields", () => {
    const original = fixtureText(FIXTURE_FILES.GetLegislationByYear);
    for (const changed of [
      original.replace(
        /<LegislationInfo>[\s\S]*?<\/LegislationInfo>/,
        '<LegislationInfo xsi:nil="true" />',
      ),
      original.replace("<BillNumber>999991</BillNumber>", ""),
      original.replace(
        "<BillNumber>999991</BillNumber>",
        "<Unexpected>999991</Unexpected><BillNumber>999991</BillNumber>",
      ),
      original.replace(
        "<SubstituteVersion>0</SubstituteVersion>",
        "<EngrossedVersion>0</EngrossedVersion><SubstituteVersion>0</SubstituteVersion>",
      ),
      original.replace(
        "<Biennium>3785-86</Biennium>",
        "<Biennium>bad</Biennium>",
      ),
      original.replace(
        "<Biennium>3785-86</Biennium>",
        "<Biennium>3784-85</Biennium>",
      ),
      original.replace(
        "<BillNumber>999991</BillNumber>",
        "<BillNumber>1000000</BillNumber>",
      ),
    ]) {
      expect(changed).not.toBe(original);
      expect(() =>
        parseWashingtonLwsSoapResponse("GetLegislationByYear", bytes(changed)),
      ).toThrowError(WashingtonLwsContractError);
    }
  });

  it("accepts the maximum reviewed returned bill number independently of request identity", () => {
    const original = fixtureText(FIXTURE_FILES.GetLegislationByYear);
    const changed = original.replace(
      "<BillNumber>999991</BillNumber>",
      "<BillNumber>999999</BillNumber>",
    );
    expect(changed).not.toBe(original);

    const response = parseWashingtonLwsSoapResponse(
      "GetLegislationByYear",
      bytes(changed),
    );
    expect(response.kind).toBe("success");
    if (response.kind === "success") {
      expect(response.result[0]?.billNumber).toBe(999999);
    }
  });

  it("preserves exact status concepts and lexical source date-times", () => {
    const response = parseWashingtonLwsSoapResponse(
      "GetLegislativeStatusChangesByBillId",
      fixture(FIXTURE_FILES.GetLegislativeStatusChangesByBillId),
    );

    expect(response.kind).toBe("success");
    if (response.kind !== "success") return;
    expect(response.result).toEqual([
      {
        billId: "SYNTHETIC-HB-999991-SUB1-ENG2",
        historyLine: "SYNTHETIC-STATUS-HISTORY-ONE",
        actionDate: "3785-01-10T08:20:00-08:00",
        amendedByOppositeBody: false,
        partialVeto: false,
        veto: false,
        amendmentsExist: true,
        sourceStatus: "SYNTHETIC-STATUS-ONE",
      },
      {
        billId: "SYNTHETIC-HB-999991-SUB1-ENG2",
        historyLine: "SYNTHETIC-STATUS-HISTORY-TWO",
        actionDate: "3785-01-20T14:05:00-08:00",
        amendedByOppositeBody: true,
        partialVeto: false,
        veto: false,
        amendmentsExist: true,
        sourceStatus: "SYNTHETIC-ACTIVE-VERSION-STATUS",
      },
    ]);
  });

  it("recognizes and structurally discards sponsor and committee contact fields", () => {
    const sponsors = parseWashingtonLwsSoapResponse(
      "GetSponsors",
      fixture(FIXTURE_FILES.GetSponsors),
    );
    const referrals = parseWashingtonLwsSoapResponse(
      "GetCommitteeReferralsByBill",
      fixture(FIXTURE_FILES.GetCommitteeReferralsByBill),
    );

    expect(sponsors).toMatchObject({
      kind: "success",
      result: [
        {
          id: 900001,
          name: "SYNTHETIC-SPONSOR-DISPLAY-999991",
          sourceType: "SYNTHETIC-PRIME-SPONSOR",
          order: 1,
        },
      ],
    });
    expect(referrals).toMatchObject({
      kind: "success",
      result: [
        {
          legislationInfo: {
            biennium: "3785-86",
            billId: "SYNTHETIC-HB-999991-SUB1-ENG2",
            billNumber: 999991,
          },
          committee: {
            id: 900101,
            name: "SYNTHETIC-COMMITTEE-DISPLAY-999991",
          },
          referredDate: "3785-01-12T13:25:00-08:00",
        },
      ],
    });
    const serialized = JSON.stringify({ sponsors, referrals });
    for (const prohibited of [
      "PROHIBITED-SPONSOR-PHONE",
      "PROHIBITED-SPONSOR-EMAIL",
      "PROHIBITED-SPONSOR-FIRST-NAME",
      "PROHIBITED-SPONSOR-LAST-NAME",
      "PROHIBITED-COMMITTEE-PHONE",
    ]) {
      expect(serialized).not.toContain(prohibited);
    }
    for (const fieldName of ["phone", "email", "firstName", "lastName"]) {
      expect(serialized).not.toContain(`"${fieldName}"`);
    }
  });

  it("projects metadata-only documents and keeps rendition dates distinct", () => {
    const response = parseWashingtonLwsSoapResponse(
      "GetDocuments",
      fixture(FIXTURE_FILES.GetDocuments),
    );

    expect(response.kind).toBe("success");
    if (response.kind !== "success") return;
    expect(response.result).toHaveLength(2);
    expect(response.result[0]).toMatchObject({
      name: "SYNTHETIC-DOCUMENT-999991-A",
      biennium: "3785-86",
      sourceType: "SYNTHETIC-DOCUMENT-TYPE-A",
      sourceClass: "SYNTHETIC-DOCUMENT-CLASS-A",
      htmlUrl:
        "https://wslwebservices.leg.wa.gov/synthetic/3785-86/SYNTHETIC-HB-999991-A.html",
      htmlCreatedAt: "3785-01-05T09:00:00-08:00",
      htmlModifiedAt: "3785-01-05T09:30:00-08:00",
      pdfCreatedAt: "3785-01-06T10:00:00-08:00",
      pdfModifiedAt: "3785-01-07T11:00:00-08:00",
      billId: "SYNTHETIC-HB-999991-SUB1-ENG2",
    });
    expect(JSON.stringify(response)).not.toContain("DOCUMENT-DESCRIPTION");
  });

  it("preserves session-law, effective-date, and veto concepts separately", () => {
    const response = parseWashingtonLwsSoapResponse(
      "GetSessionLawByBillId",
      fixture(FIXTURE_FILES.GetSessionLawByBillId),
    );

    expect(response).toMatchObject({
      kind: "success",
      operation: "GetSessionLawByBillId",
      resultState: "present",
      result: {
        chapterNumber: 999991,
        year: 3786,
        legislativeSession: "SYNTHETIC-LEGISLATIVE-SESSION",
        legislatureNumber: 999,
        effectiveDate: "3786-07-01T00:00:00-07:00",
        multipleEffectiveDates: true,
        billId: "SYNTHETIC-HB-999991-SUB1-ENG2",
        biennium: "3785-86",
        billTitle: "SYNTHETIC-SESSION-LAW-TITLE-999991",
        partialVeto: true,
        veto: false,
        legislationTypeId: 999991,
      },
    });
  });

  it("sanitizes a bounded SOAP Fault instead of returning provider text", () => {
    const response = parseWashingtonLwsSoapResponse(
      "GetLegislation",
      fixture("soap-fault.valid.xml"),
    );

    expect(response).toMatchObject({
      kind: "fault",
      operation: "GetLegislation",
      fault: {
        category: "unclassified_provider_fault",
        codeLexicalDiscarded: true,
        actorPresent: false,
        detailPresent: false,
        providerTextDiscarded: true,
      },
    });
    expect(response).not.toHaveProperty("fault.code");
    expect(JSON.stringify(response)).not.toContain("SYNTHETIC CLIENT FAULT");
    expect(JSON.stringify(response)).not.toContain("soap:Client");
  });

  it("sanitizes a yearly-enumeration SOAP fault without partial results", () => {
    const response = parseWashingtonLwsSoapResponse(
      "GetLegislationByYear",
      fixture("soap-fault.valid.xml"),
    );

    expect(response).toMatchObject({
      kind: "fault",
      operation: "GetLegislationByYear",
      fault: {
        category: "unclassified_provider_fault",
        codeLexicalDiscarded: true,
        providerTextDiscarded: true,
      },
    });
    expect(response).not.toHaveProperty("result");
    expect(JSON.stringify(response)).not.toContain("SYNTHETIC CLIENT FAULT");
  });

  it("distinguishes missing and empty array results without inventing records", () => {
    expect(
      parseWashingtonLwsSoapResponse(
        "GetSponsors",
        emptyResponse("GetSponsors", false),
      ),
    ).toMatchObject({
      kind: "success",
      operation: "GetSponsors",
      resultState: "missing",
      result: [],
    });
    expect(
      parseWashingtonLwsSoapResponse(
        "GetSponsors",
        emptyResponse("GetSponsors", true),
      ),
    ).toMatchObject({
      kind: "success",
      operation: "GetSponsors",
      resultState: "empty",
      result: [],
    });
    expect(
      parseWashingtonLwsSoapResponse(
        "GetLegislationByYear",
        emptyResponse("GetLegislationByYear", false),
      ),
    ).toMatchObject({
      kind: "success",
      operation: "GetLegislationByYear",
      resultState: "missing",
      result: [],
    });
    expect(
      parseWashingtonLwsSoapResponse(
        "GetLegislationByYear",
        emptyResponse("GetLegislationByYear", true),
      ),
    ).toMatchObject({
      kind: "success",
      operation: "GetLegislationByYear",
      resultState: "empty",
      result: [],
    });
    expect(
      parseWashingtonLwsSoapResponse(
        "GetSessionLawByBillId",
        emptyResponse("GetSessionLawByBillId", false),
      ),
    ).toMatchObject({
      kind: "success",
      operation: "GetSessionLawByBillId",
      resultState: "missing",
      result: null,
    });
  });

  it("binds echoed response identities to the canonical originating request", () => {
    const mutations: Array<{
      operation: WashingtonLwsOperation;
      from: string;
      to: string;
    }> = [
      {
        operation: "GetLegislation",
        from: "<BillNumber>999991</BillNumber>",
        to: "<BillNumber>999990</BillNumber>",
      },
      {
        operation: "GetLegislativeStatusChangesByBillId",
        from: "SYNTHETIC-HB-999991-SUB1-ENG2",
        to: "SYNTHETIC-HB-999991-MISMATCH",
      },
      {
        operation: "GetCommitteeReferralsByBill",
        from: "<BillNumber>999991</BillNumber>",
        to: "<BillNumber>999990</BillNumber>",
      },
      {
        operation: "GetDocuments",
        from: "<Biennium>3785-86</Biennium>",
        to: "<Biennium>3787-88</Biennium>",
      },
      {
        operation: "GetSessionLawByBillId",
        from: "SYNTHETIC-HB-999991-SUB1-ENG2",
        to: "SYNTHETIC-HB-999991-MISMATCH",
      },
    ];

    for (const { operation, from, to } of mutations) {
      const original = fixtureText(FIXTURE_FILES[operation]);
      const changed = original.replace(from, to);
      expect(changed).not.toBe(original);
      expect(() =>
        parseWashingtonLwsSoapResponse(operation, bytes(changed)),
      ).toThrowError(/does not match the canonical originating request/);
    }

    const sponsors = parseWashingtonLwsSoapResponse(
      "GetSponsors",
      fixture(FIXTURE_FILES.GetSponsors),
    );
    expect(sponsors.request).toMatchObject({
      operation: "GetSponsors",
      url: "https://wslwebservices.leg.wa.gov/legislationservice.asmx",
    });
  });

  it("preserves repeated operation items until live identity rules are verified", () => {
    const original = fixtureText(FIXTURE_FILES.GetLegislation);
    const item =
      /<Legislation>[\s\S]*?<\/Legislation>/.exec(original)?.[0] ?? "";
    expect(item).not.toBe("");
    const changed = original.replace(
      /<Legislation>[\s\S]*<\/Legislation>/,
      `${item}${item}`,
    );

    const parsed = parseWashingtonLwsSoapResponse(
      "GetLegislation",
      bytes(changed),
    );
    expect(parsed.kind).toBe("success");
    if (parsed.kind === "success") {
      expect(parsed.result).toHaveLength(2);
      expect(parsed.result[0]).toEqual(parsed.result[1]);
    }
  });

  it("rejects wrong wrappers, namespaces, headers, and multiple payloads", () => {
    const original = fixtureText(FIXTURE_FILES.GetLegislation);
    for (const changed of [
      original.replace("GetLegislationResponse", "GetSponsorsResponse"),
      original.replace(
        WASHINGTON_LWS_SERVICE_NAMESPACE,
        "https://example.invalid/wrong",
      ),
      original.replace("<soap:Body>", "<soap:Header /><soap:Body>"),
      original.replace(
        "</soap:Body>",
        "<soap:Fault><faultcode>soap:Client</faultcode><faultstring>SYNTHETIC</faultstring></soap:Fault></soap:Body>",
      ),
    ]) {
      expect(() =>
        parseWashingtonLwsSoapResponse("GetLegislation", bytes(changed)),
      ).toThrowError(WashingtonLwsContractError);
    }
  });

  it("rejects missing, duplicate, out-of-order, unknown, and nil item fields", () => {
    const original = fixtureText(FIXTURE_FILES.GetLegislation);
    const missing = original.replace(
      "<PrimeSponsorID>900001</PrimeSponsorID>",
      "",
    );
    const duplicate = original.replace(
      "<BillNumber>999991</BillNumber>",
      "<BillNumber>999991</BillNumber><BillNumber>999991</BillNumber>",
    );
    const outOfOrder = original.replace(
      /<BillNumber>999991<\/BillNumber>\s*<SubstituteVersion>0<\/SubstituteVersion>/,
      "<SubstituteVersion>0</SubstituteVersion><BillNumber>999991</BillNumber>",
    );
    const unknown = original.replace(
      "<PrimeSponsorID>900001</PrimeSponsorID>",
      "<ProviderExtension>SYNTHETIC</ProviderExtension><PrimeSponsorID>900001</PrimeSponsorID>",
    );
    const nilItem = original
      .replace(
        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
      )
      .replace("<Legislation>", '<Legislation xsi:nil="true">');

    for (const changed of [missing, duplicate, outOfOrder, unknown, nilItem]) {
      expect(changed).not.toBe(original);
      expect(() =>
        parseWashingtonLwsSoapResponse("GetLegislation", bytes(changed)),
      ).toThrowError(WashingtonLwsContractError);
    }
  });

  it("accepts xsi:nil=false but rejects empty nil items and nil collection results", () => {
    const original = fixtureText(FIXTURE_FILES.GetLegislation);
    const withXsi = original.replace(
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    );
    const nilFalse = withXsi.replace(
      "<Legislation>",
      '<Legislation xsi:nil="false">',
    );
    const parsed = parseWashingtonLwsSoapResponse(
      "GetLegislation",
      bytes(nilFalse),
    );
    expect(parsed.kind).toBe("success");
    if (parsed.kind === "success") {
      expect(parsed.result).toHaveLength(2);
    }

    const emptyNilItem = withXsi.replace(
      /<Legislation>[\s\S]*?<\/Legislation>/,
      '<Legislation xsi:nil="true" />',
    );
    expect(() =>
      parseWashingtonLwsSoapResponse("GetLegislation", bytes(emptyNilItem)),
    ).toThrowError(/xsi:nil=true/);

    const nilResult = withXsi.replace(
      "<GetLegislationResult>",
      '<GetLegislationResult xsi:nil="true">',
    );
    expect(() =>
      parseWashingtonLwsSoapResponse("GetLegislation", bytes(nilResult)),
    ).toThrowError(WashingtonLwsContractError);
  });

  it.each([
    {
      operation: "GetLegislation",
      field: "Active",
      pattern: /\s*<Active>false<\/Active>/,
    },
    {
      operation: "GetLegislativeStatusChangesByBillId",
      field: "ActionDate",
      pattern: /\s*<ActionDate>[^<]+<\/ActionDate>/,
    },
    {
      operation: "GetSponsors",
      field: "Order",
      pattern: /\s*<Order>1<\/Order>/,
    },
    {
      operation: "GetCommitteeReferralsByBill",
      field: "ReferredDate",
      pattern: /\s*<ReferredDate>[^<]+<\/ReferredDate>/,
    },
    {
      operation: "GetDocuments",
      field: "HtmCreateDate",
      pattern: /\s*<HtmCreateDate>[^<]+<\/HtmCreateDate>/,
    },
    {
      operation: "GetSessionLawByBillId",
      field: "EffectiveDate",
      pattern: /\s*<EffectiveDate>[^<]+<\/EffectiveDate>/,
    },
  ] as const)(
    "pins the required $field field in the $operation WSDL projection",
    ({ operation, field, pattern }) => {
      const original = fixtureText(FIXTURE_FILES[operation]);
      const changed = original.replace(pattern, "");
      expect(changed).not.toBe(original);
      const error = capturedContractError(() =>
        parseWashingtonLwsSoapResponse(operation, bytes(changed)),
      );
      expect(error).toMatchObject({
        code: "missing_field",
        path: expect.stringContaining(field),
      });
    },
  );

  it.each([
    {
      operation: "GetLegislation",
      pattern: /\s*<OriginalAgency>[^<]*<\/OriginalAgency>/,
    },
    {
      operation: "GetLegislativeStatusChangesByBillId",
      pattern: /\s*<HistoryLine>[^<]*<\/HistoryLine>/,
    },
    {
      operation: "GetSponsors",
      pattern:
        /\s*<Phone>[^<]*<\/Phone>\s*<Email>[^<]*<\/Email>\s*<FirstName>[^<]*<\/FirstName>\s*<LastName>[^<]*<\/LastName>/,
    },
    {
      operation: "GetCommitteeReferralsByBill",
      pattern: /\s*<Phone>[^<]*<\/Phone>/,
    },
    {
      operation: "GetDocuments",
      pattern: /\s*<HtmUrl>[^<]*<\/HtmUrl>/,
    },
    {
      operation: "GetSessionLawByBillId",
      pattern: /\s*<LegislativeSession>[^<]*<\/LegislativeSession>/,
    },
  ] as const)(
    "accepts a reviewed optional-field omission in $operation",
    ({ operation, pattern }) => {
      const original = fixtureText(FIXTURE_FILES[operation]);
      const changed = original.replace(pattern, "");
      expect(changed).not.toBe(original);
      expect(
        parseWashingtonLwsSoapResponse(operation, bytes(changed)),
      ).toMatchObject({ kind: "success", operation });
    },
  );

  it("rejects one-over operation item budgets before projection", () => {
    const original = fixtureText(FIXTURE_FILES.GetLegislation);
    const match = /<Legislation>[\s\S]*?<\/Legislation>/.exec(original);
    expect(match).not.toBeNull();
    const oneItem = match?.[0] ?? "";
    const overBudgetItems = oneItem.repeat(
      WASHINGTON_LWS_OPERATION_DESCRIPTORS.GetLegislation.maximumItems + 1,
    );
    const changed = original.replace(
      /<Legislation>[\s\S]*<\/Legislation>/,
      overBudgetItems,
    );

    expect(() =>
      parseWashingtonLwsSoapResponse("GetLegislation", bytes(changed)),
    ).toThrowError(/operation result exceeds its item budget/);
  });

  it("accepts the exact yearly item budget and rejects one over without truncation", () => {
    const original = fixtureText(FIXTURE_FILES.GetLegislationByYear);
    const fullItem =
      /<LegislationInfo>[\s\S]*?<\/LegislationInfo>/.exec(original)?.[0] ?? "";
    expect(fullItem).not.toBe("");
    const replaceItems = (count: number): Uint8Array =>
      bytes(
        original.replace(
          /<LegislationInfo>[\s\S]*<\/LegislationInfo>/,
          fullItem.repeat(count),
        ),
      );

    const exact = parseWashingtonLwsSoapResponse(
      "GetLegislationByYear",
      replaceItems(
        WASHINGTON_LWS_OPERATION_DESCRIPTORS.GetLegislationByYear.maximumItems,
      ),
    );
    expect(exact.kind).toBe("success");
    if (exact.kind === "success") {
      expect(exact.result).toHaveLength(
        WASHINGTON_LWS_OPERATION_DESCRIPTORS.GetLegislationByYear.maximumItems,
      );
    }

    expect(() =>
      parseWashingtonLwsSoapResponse(
        "GetLegislationByYear",
        replaceItems(
          WASHINGTON_LWS_OPERATION_DESCRIPTORS.GetLegislationByYear
            .maximumItems + 1,
        ),
      ),
    ).toThrowError(/operation result exceeds its item budget/);
  });

  it("preserves timezone-less and early source dates but rejects invalid calendar values", () => {
    const original = fixtureText(
      FIXTURE_FILES.GetLegislativeStatusChangesByBillId,
    );
    const timezoneLess = original.replace(
      "3785-01-10T08:20:00-08:00",
      "3785-01-10T08:20:00",
    );
    const parsed = parseWashingtonLwsSoapResponse(
      "GetLegislativeStatusChangesByBillId",
      bytes(timezoneLess),
    );
    expect(parsed.kind).toBe("success");
    if (parsed.kind === "success") {
      expect(parsed.result[0]?.actionDate).toBe("3785-01-10T08:20:00");
    }

    const early = original.replace(
      "3785-01-10T08:20:00-08:00",
      "0001-02-28T08:20:00Z",
    );
    const earlyParsed = parseWashingtonLwsSoapResponse(
      "GetLegislativeStatusChangesByBillId",
      bytes(early),
    );
    expect(earlyParsed.kind).toBe("success");
    if (earlyParsed.kind === "success") {
      expect(earlyParsed.result[0]?.actionDate).toBe("0001-02-28T08:20:00Z");
    }

    const invalid = original.replace(
      "3785-01-10T08:20:00-08:00",
      "3785-02-30T08:20:00-08:00",
    );
    expect(() =>
      parseWashingtonLwsSoapResponse(
        "GetLegislativeStatusChangesByBillId",
        bytes(invalid),
      ),
    ).toThrowError(/invalid calendar or clock/);

    const zeroYear = original.replace(
      "3785-01-10T08:20:00-08:00",
      "0000-01-10T08:20:00Z",
    );
    expect(() =>
      parseWashingtonLwsSoapResponse(
        "GetLegislativeStatusChangesByBillId",
        bytes(zeroYear),
      ),
    ).toThrowError(/invalid calendar or clock/);
  });

  it.each([
    "http://wslwebservices.leg.wa.gov/synthetic/document.html",
    "https://user:secret@wslwebservices.leg.wa.gov/synthetic/document.html",
    "https://wslwebservices.leg.wa.gov/synthetic/document.html?api_key=secret",
    "https://deceptive-wslwebservices.leg.wa.gov/synthetic/document.html",
  ])("rejects unreviewed or credential-bearing document URL %s", (url) => {
    const original = fixtureText(FIXTURE_FILES.GetDocuments);
    const changed = original.replace(
      "https://wslwebservices.leg.wa.gov/synthetic/3785-86/SYNTHETIC-HB-999991-A.html",
      url,
    );
    expect(() =>
      parseWashingtonLwsSoapResponse("GetDocuments", bytes(changed)),
    ).toThrowError(/outside the reviewed synthetic-only URL shape/);
  });
});
