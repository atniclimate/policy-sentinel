import {
  WASHINGTON_LWS_OPERATION_DESCRIPTORS,
  WASHINGTON_LWS_ORIGIN,
  WASHINGTON_LWS_SERVICE_NAMESPACE,
  WASHINGTON_LWS_XML_POLICY,
  XML_SCHEMA_INSTANCE_NAMESPACE,
  XML_SCHEMA_NAMESPACE,
  SOAP_11_NAMESPACE,
  type WashingtonLwsOperation,
} from "./constants";
import { failWashingtonLwsContract } from "./errors";

export type WashingtonLwsRequestInput =
  | {
      operation: "GetLegislation";
      biennium: string;
      billNumber: number;
    }
  | {
      operation: "GetLegislationByYear";
      year: number;
    }
  | {
      operation: "GetLegislativeStatusChangesByBillId";
      biennium: string;
      billId: string;
      beginDate: string;
      endDate: string;
    }
  | {
      operation: "GetSponsors";
      biennium: string;
      billId: string;
    }
  | {
      operation: "GetCommitteeReferralsByBill";
      biennium: string;
      billNumber: number;
    }
  | {
      operation: "GetDocuments";
      biennium: string;
      namedLike: string;
    }
  | {
      operation: "GetSessionLawByBillId";
      biennium: string;
      billId: string;
    };

export interface WashingtonLwsSoapRequest {
  operation: WashingtonLwsOperation;
  method: "POST";
  url: string;
  headers: {
    accept: "text/xml";
    "content-type": "text/xml; charset=utf-8";
    soapaction: string;
  };
  body: string;
  byteLength: number;
}

type PlainObject = Record<string, unknown>;

const REQUEST_KEYS: Record<WashingtonLwsOperation, readonly string[]> = {
  GetLegislation: ["operation", "biennium", "billNumber"],
  GetLegislationByYear: ["operation", "year"],
  GetLegislativeStatusChangesByBillId: [
    "operation",
    "biennium",
    "billId",
    "beginDate",
    "endDate",
  ],
  GetSponsors: ["operation", "biennium", "billId"],
  GetCommitteeReferralsByBill: ["operation", "biennium", "billNumber"],
  GetDocuments: ["operation", "biennium", "namedLike"],
  GetSessionLawByBillId: ["operation", "biennium", "billId"],
};

function plainObject(value: unknown): PlainObject {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    failWashingtonLwsContract(
      "invalid_type",
      "$request",
      "expected a plain request object",
    );
  }
  return value as PlainObject;
}

function exactKeys(
  source: PlainObject,
  operation: WashingtonLwsOperation,
): void {
  const expected = REQUEST_KEYS[operation];
  const expectedSet = new Set(expected);
  for (const key of Object.keys(source)) {
    if (!expectedSet.has(key)) {
      failWashingtonLwsContract(
        "unexpected_field",
        `$request.${key}`,
        "request field is outside the reviewed operation",
      );
    }
  }
  for (const key of expected) {
    if (!Object.hasOwn(source, key)) {
      failWashingtonLwsContract(
        "missing_field",
        `$request.${key}`,
        "required request field is missing",
      );
    }
  }
}

function operation(value: unknown): WashingtonLwsOperation {
  if (
    typeof value !== "string" ||
    !Object.hasOwn(WASHINGTON_LWS_OPERATION_DESCRIPTORS, value)
  ) {
    failWashingtonLwsContract(
      "unsupported_operation",
      "$request.operation",
      "operation is outside the reviewed SOAP subset",
    );
  }
  return value as WashingtonLwsOperation;
}

function biennium(value: unknown): string {
  if (typeof value !== "string") {
    failWashingtonLwsContract(
      "invalid_type",
      "$request.biennium",
      "expected a biennium string",
    );
  }
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (match === null) {
    failWashingtonLwsContract(
      "invalid_value",
      "$request.biennium",
      "expected canonical YYYY-YY",
    );
  }
  const start = Number(match[1]);
  const endSuffix = Number(match[2]);
  if (
    start < 1799 ||
    start > 3999 ||
    start % 2 !== 1 ||
    (start + 1) % 100 !== endSuffix
  ) {
    failWashingtonLwsContract(
      "invalid_value",
      "$request.biennium",
      "expected an odd-year two-year legislative biennium",
    );
  }
  return value;
}

function billNumber(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 999_999
  ) {
    failWashingtonLwsContract(
      "invalid_value",
      "$request.billNumber",
      "expected a bounded positive bill number",
    );
  }
  return value;
}

function legislativeYear(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1_799 ||
    value > 3_999
  ) {
    failWashingtonLwsContract(
      "invalid_value",
      "$request.year",
      "expected a bounded four-digit legislative year",
    );
  }
  return value;
}

function boundedSourceIdentifier(
  value: unknown,
  path: "$request.billId" | "$request.namedLike",
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > WASHINGTON_LWS_XML_POLICY.maximumIdentifierLength ||
    value.trim() !== value ||
    !/^[\u0020-\u007e]+$/.test(value) ||
    /[*?%]/.test(value)
  ) {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "expected a bounded exact source identifier without wildcard syntax",
    );
  }
  return value;
}

function normalizedUtcDateTime(value: unknown, path: string): string {
  if (typeof value !== "string") {
    failWashingtonLwsContract(
      "invalid_type",
      path,
      "expected a normalized UTC timestamp",
    );
  }
  const parsed = new Date(value);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== value ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value)
  ) {
    failWashingtonLwsContract(
      "invalid_value",
      path,
      "expected an exact ISO 8601 UTC timestamp",
    );
  }
  return value;
}

function escapeXmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function requestParameters(
  source: PlainObject,
  selectedOperation: WashingtonLwsOperation,
): Array<readonly [string, string]> {
  switch (selectedOperation) {
    case "GetLegislation":
    case "GetCommitteeReferralsByBill":
      return [
        ["biennium", biennium(source.biennium)],
        ["billNumber", String(billNumber(source.billNumber))],
      ];
    case "GetLegislationByYear":
      return [["year", String(legislativeYear(source.year))]];
    case "GetLegislativeStatusChangesByBillId": {
      const beginDate = normalizedUtcDateTime(
        source.beginDate,
        "$request.beginDate",
      );
      const endDate = normalizedUtcDateTime(source.endDate, "$request.endDate");
      const duration = Date.parse(endDate) - Date.parse(beginDate);
      if (
        duration < 0 ||
        duration >
          WASHINGTON_LWS_XML_POLICY.maximumStatusWindowDays *
            24 *
            60 *
            60 *
            1_000
      ) {
        failWashingtonLwsContract(
          "invalid_value",
          "$request",
          "status-history window is reversed or exceeds 31 days",
        );
      }
      return [
        ["biennium", biennium(source.biennium)],
        ["billId", boundedSourceIdentifier(source.billId, "$request.billId")],
        ["beginDate", beginDate],
        ["endDate", endDate],
      ];
    }
    case "GetSponsors":
    case "GetSessionLawByBillId":
      return [
        ["biennium", biennium(source.biennium)],
        ["billId", boundedSourceIdentifier(source.billId, "$request.billId")],
      ];
    case "GetDocuments":
      return [
        ["biennium", biennium(source.biennium)],
        [
          "namedLike",
          boundedSourceIdentifier(source.namedLike, "$request.namedLike"),
        ],
      ];
  }
}

export function buildWashingtonLwsSoapRequest(
  value: unknown,
): WashingtonLwsSoapRequest {
  const source = plainObject(value);
  const selectedOperation = operation(source.operation);
  exactKeys(source, selectedOperation);
  const parameters = requestParameters(source, selectedOperation);
  const parameterXml = parameters
    .map(
      ([name, parameterValue]) =>
        `<${name}>${escapeXmlText(parameterValue)}</${name}>`,
    )
    .join("");
  const body =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:xsi="${XML_SCHEMA_INSTANCE_NAMESPACE}" ` +
    `xmlns:xsd="${XML_SCHEMA_NAMESPACE}" xmlns:soap="${SOAP_11_NAMESPACE}">` +
    `<soap:Body><${selectedOperation} xmlns="${WASHINGTON_LWS_SERVICE_NAMESPACE}">` +
    `${parameterXml}</${selectedOperation}></soap:Body></soap:Envelope>`;
  const byteLength = new TextEncoder().encode(body).byteLength;
  if (byteLength > WASHINGTON_LWS_XML_POLICY.maximumRequestBytes) {
    failWashingtonLwsContract(
      "limit_exceeded",
      "$request.body",
      "canonical SOAP request exceeds the byte budget",
    );
  }
  const descriptor = WASHINGTON_LWS_OPERATION_DESCRIPTORS[selectedOperation];
  return {
    operation: selectedOperation,
    method: "POST",
    url: `${WASHINGTON_LWS_ORIGIN}${descriptor.servicePath}`,
    headers: {
      accept: "text/xml",
      "content-type": "text/xml; charset=utf-8",
      soapaction: `"${WASHINGTON_LWS_SERVICE_NAMESPACE}${selectedOperation}"`,
    },
    body,
    byteLength,
  };
}
