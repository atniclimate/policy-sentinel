import { describe, expect, it } from "vitest";

import type { WashingtonLwsOperation } from "../../../src/contracts/washington-lws/constants";
import { WashingtonLwsContractError } from "../../../src/contracts/washington-lws/errors";
import { buildWashingtonLwsSoapRequest } from "../../../src/contracts/washington-lws/request-contract";

const EXPECTED_TRANSPORT = {
  GetLegislation: {
    url: "https://wslwebservices.leg.wa.gov/legislationservice.asmx",
    soapaction: '"http://WSLWebServices.leg.wa.gov/GetLegislation"',
  },
  GetLegislativeStatusChangesByBillId: {
    url: "https://wslwebservices.leg.wa.gov/legislationservice.asmx",
    soapaction:
      '"http://WSLWebServices.leg.wa.gov/GetLegislativeStatusChangesByBillId"',
  },
  GetSponsors: {
    url: "https://wslwebservices.leg.wa.gov/legislationservice.asmx",
    soapaction: '"http://WSLWebServices.leg.wa.gov/GetSponsors"',
  },
  GetCommitteeReferralsByBill: {
    url: "https://wslwebservices.leg.wa.gov/committeeactionservice.asmx",
    soapaction:
      '"http://WSLWebServices.leg.wa.gov/GetCommitteeReferralsByBill"',
  },
  GetDocuments: {
    url: "https://wslwebservices.leg.wa.gov/legislativedocumentservice.asmx",
    soapaction: '"http://WSLWebServices.leg.wa.gov/GetDocuments"',
  },
  GetSessionLawByBillId: {
    url: "https://wslwebservices.leg.wa.gov/sessionlawservice.asmx",
    soapaction: '"http://WSLWebServices.leg.wa.gov/GetSessionLawByBillId"',
  },
} as const satisfies Record<
  WashingtonLwsOperation,
  { url: string; soapaction: string }
>;

describe("Washington LWS SOAP request contract", () => {
  it.each([
    {
      input: {
        operation: "GetLegislation",
        biennium: "3785-86",
        billNumber: 999_991,
      },
      parameters: [
        "<biennium>3785-86</biennium>",
        "<billNumber>999991</billNumber>",
      ],
    },
    {
      input: {
        operation: "GetLegislativeStatusChangesByBillId",
        biennium: "3785-86",
        billId: "SYNTHETIC-HB-999991",
        beginDate: "3785-01-01T00:00:00.000Z",
        endDate: "3785-01-31T00:00:00.000Z",
      },
      parameters: [
        "<biennium>3785-86</biennium>",
        "<billId>SYNTHETIC-HB-999991</billId>",
        "<beginDate>3785-01-01T00:00:00.000Z</beginDate>",
        "<endDate>3785-01-31T00:00:00.000Z</endDate>",
      ],
    },
    {
      input: {
        operation: "GetSponsors",
        biennium: "3785-86",
        billId: "SYNTHETIC-HB-999991",
      },
      parameters: [
        "<biennium>3785-86</biennium>",
        "<billId>SYNTHETIC-HB-999991</billId>",
      ],
    },
    {
      input: {
        operation: "GetCommitteeReferralsByBill",
        biennium: "3785-86",
        billNumber: 999_991,
      },
      parameters: [
        "<biennium>3785-86</biennium>",
        "<billNumber>999991</billNumber>",
      ],
    },
    {
      input: {
        operation: "GetDocuments",
        biennium: "3785-86",
        namedLike: "SYNTHETIC-HB-999991",
      },
      parameters: [
        "<biennium>3785-86</biennium>",
        "<namedLike>SYNTHETIC-HB-999991</namedLike>",
      ],
    },
    {
      input: {
        operation: "GetSessionLawByBillId",
        biennium: "3785-86",
        billId: "SYNTHETIC-HB-999991",
      },
      parameters: [
        "<biennium>3785-86</biennium>",
        "<billId>SYNTHETIC-HB-999991</billId>",
      ],
    },
  ] as const)(
    "builds the exact reviewed SOAP 1.1 descriptor for $input.operation",
    ({ input, parameters }) => {
      const request = buildWashingtonLwsSoapRequest(input);
      const expected = EXPECTED_TRANSPORT[input.operation];

      expect(request).toMatchObject({
        operation: input.operation,
        method: "POST",
        url: expected.url,
        headers: {
          accept: "text/xml",
          "content-type": "text/xml; charset=utf-8",
          soapaction: expected.soapaction,
        },
      });
      expect(
        request.body.startsWith(
          '<?xml version="1.0" encoding="utf-8"?><soap:Envelope',
        ),
      ).toBe(true);
      expect(request.body).toContain(
        `<${input.operation} xmlns="http://WSLWebServices.leg.wa.gov/">`,
      );
      let priorIndex = -1;
      for (const parameter of parameters) {
        const parameterIndex = request.body.indexOf(parameter);
        expect(parameterIndex).toBeGreaterThan(priorIndex);
        priorIndex = parameterIndex;
      }
      expect(
        request.body.endsWith(
          `</${input.operation}></soap:Body></soap:Envelope>`,
        ),
      ).toBe(true);
      expect(request.byteLength).toBe(
        new TextEncoder().encode(request.body).byteLength,
      );
      expect(Object.keys(request.headers)).not.toContain("authorization");
    },
  );

  it("escapes source identifiers without changing their value semantics", () => {
    const request = buildWashingtonLwsSoapRequest({
      operation: "GetSponsors",
      biennium: "3785-86",
      billId: "SYNTHETIC & <UNPUBLISHED>",
    });

    expect(request.body).toContain(
      "<billId>SYNTHETIC &amp; &lt;UNPUBLISHED&gt;</billId>",
    );
    expect(request.body).not.toContain("SYNTHETIC & <UNPUBLISHED>");
  });

  it.each([
    {
      operation: "GetLegislation",
      biennium: "3784-85",
      billNumber: 1,
    },
    {
      operation: "GetLegislation",
      biennium: "3785-87",
      billNumber: 1,
    },
    {
      operation: "GetLegislation",
      biennium: "1789-90",
      billNumber: 1,
    },
    {
      operation: "GetLegislation",
      biennium: "3785-86",
      billNumber: 0,
    },
    {
      operation: "GetSponsors",
      biennium: "3785-86",
      billId: " SYNTHETIC",
    },
    {
      operation: "GetDocuments",
      biennium: "3785-86",
      namedLike: "SYNTHETIC%",
    },
  ])("rejects malformed or unbounded request input %#", (input) => {
    expect(() => buildWashingtonLwsSoapRequest(input)).toThrowError(
      WashingtonLwsContractError,
    );
  });

  it("rejects reversed and over-budget status windows", () => {
    const base = {
      operation: "GetLegislativeStatusChangesByBillId",
      biennium: "3785-86",
      billId: "SYNTHETIC-HB-999991",
    };
    expect(() =>
      buildWashingtonLwsSoapRequest({
        ...base,
        beginDate: "3785-02-01T00:00:00.000Z",
        endDate: "3785-01-01T00:00:00.000Z",
      }),
    ).toThrowError(/reversed or exceeds 31 days/);
    expect(() =>
      buildWashingtonLwsSoapRequest({
        ...base,
        beginDate: "3785-01-01T00:00:00.000Z",
        endDate: "3785-02-02T00:00:00.000Z",
      }),
    ).toThrowError(/reversed or exceeds 31 days/);
  });

  it("pins exact identifier, bill-number, and 31-day window boundaries", () => {
    expect(
      buildWashingtonLwsSoapRequest({
        operation: "GetSponsors",
        biennium: "3785-86",
        billId: "S".repeat(128),
      }),
    ).toMatchObject({ operation: "GetSponsors" });
    expect(() =>
      buildWashingtonLwsSoapRequest({
        operation: "GetSponsors",
        biennium: "3785-86",
        billId: "S".repeat(129),
      }),
    ).toThrowError(/bounded exact source identifier/);

    expect(
      buildWashingtonLwsSoapRequest({
        operation: "GetLegislation",
        biennium: "3785-86",
        billNumber: 999_999,
      }),
    ).toMatchObject({ operation: "GetLegislation" });
    expect(() =>
      buildWashingtonLwsSoapRequest({
        operation: "GetLegislation",
        biennium: "3785-86",
        billNumber: 1_000_000,
      }),
    ).toThrowError(/bounded positive bill number/);

    const base = {
      operation: "GetLegislativeStatusChangesByBillId",
      biennium: "3785-86",
      billId: "SYNTHETIC-HB-999991",
      beginDate: "3785-01-01T00:00:00.000Z",
    } as const;
    expect(
      buildWashingtonLwsSoapRequest({
        ...base,
        endDate: "3785-02-01T00:00:00.000Z",
      }),
    ).toMatchObject({
      operation: "GetLegislativeStatusChangesByBillId",
    });
    expect(() =>
      buildWashingtonLwsSoapRequest({
        ...base,
        endDate: "3785-02-01T00:00:00.001Z",
      }),
    ).toThrowError(/reversed or exceeds 31 days/);
  });

  it("rejects unreviewed operations, extra fields, and non-plain inputs", () => {
    expect(() =>
      buildWashingtonLwsSoapRequest({
        operation: "GetLegislativeStatusChanges",
        biennium: "3785-86",
        billId: "SYNTHETIC-HB-999991",
      }),
    ).toThrowError(/outside the reviewed SOAP subset/);
    expect(() =>
      buildWashingtonLwsSoapRequest({
        operation: "GetLegislation",
        biennium: "3785-86",
        billNumber: 999_991,
        apiKey: "must-not-exist",
      }),
    ).toThrowError(/outside the reviewed operation/);
    expect(() =>
      buildWashingtonLwsSoapRequest(
        Object.assign(Object.create({ inherited: true }), {
          operation: "GetLegislation",
          biennium: "3785-86",
          billNumber: 999_991,
        }),
      ),
    ).toThrowError(/plain request object/);
  });
});
