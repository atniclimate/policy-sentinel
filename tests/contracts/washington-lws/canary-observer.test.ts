import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import * as washingtonLwsContract from "../../../src/contracts/washington-lws";
import * as washingtonLwsTransport from "../../../src/contracts/washington-lws/transport";
import {
  assertWashingtonLwsCanaryReport,
  parseWashingtonLwsCanaryArguments,
  runWashingtonLwsCanaryCommand,
  serializeWashingtonLwsCanaryReport,
  WASHINGTON_LWS_CANARY_POLICY,
  WASHINGTON_LWS_CANARY_SCENARIOS,
  type WashingtonLwsCanaryCommandIo,
  type WashingtonLwsCanaryDependencies,
  type WashingtonLwsCanaryReport,
} from "../../../src/contracts/washington-lws/canary-observer";
import {
  WASHINGTON_LWS_TRANSPORT_ERROR_CODES,
  WashingtonLwsTransportError,
  type WashingtonLwsFetchLike,
} from "../../../src/contracts/washington-lws/transport";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function fixtureText(name: string): string {
  return readFileSync(
    path.resolve(projectRoot, "fixtures/sources/washington-lws", name),
    "utf8",
  );
}

function knownBillLegislationBytes(): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    fixtureText("get-legislation.valid.xml")
      .replaceAll("3785-86", "2025-26")
      .replaceAll("999991", "1001"),
  );
}

function knownBillNestedSparseBytes(): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    new TextDecoder()
      .decode(knownBillLegislationBytes())
      .replace(
        /<BillId>SYNTHETIC-HB-1001-BASE<\/BillId>\s*<HistoryLine>SYNTHETIC-BASE-VERSION-HISTORY<\/HistoryLine>/,
        "",
      )
      .replace(
        /<BillId>SYNTHETIC-HB-1001-SUB1-ENG2<\/BillId>\s*<HistoryLine>SYNTHETIC-ACTIVE-VERSION-HISTORY<\/HistoryLine>/,
        "",
      )
      .replace("<Status>SYNTHETIC-BASE-VERSION-STATUS</Status>", "")
      .replace("<Status>SYNTHETIC-ACTIVE-VERSION-STATUS</Status>", ""),
  );
}

function yearlyLegislationBytes(): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    fixtureText("get-legislation-by-year.valid.xml"),
  );
}

function soapResponse(
  body: BodyInit | null,
  {
    status = 200,
    contentType = "text/xml; charset=utf-8",
  }: {
    status?: number;
    contentType?: string;
  } = {},
): Response {
  const response = new Response(body, {
    status,
    headers: { "Content-Type": contentType },
  });
  Object.defineProperty(response, "url", {
    configurable: true,
    value: "https://wslwebservices.leg.wa.gov/legislationservice.asmx",
  });
  return response;
}

function envelope(result: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
      "<soap:Body>",
      '<GetLegislationResponse xmlns="http://WSLWebServices.leg.wa.gov/">',
      result,
      "</GetLegislationResponse>",
      "</soap:Body>",
      "</soap:Envelope>",
    ].join(""),
  );
}

function yearlyEnvelope(result: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
      "<soap:Body>",
      '<GetLegislationByYearResponse xmlns="http://WSLWebServices.leg.wa.gov/">',
      result,
      "</GetLegislationByYearResponse>",
      "</soap:Body>",
      "</soap:Envelope>",
    ].join(""),
  );
}

function capturedIo(): {
  io: WashingtonLwsCanaryCommandIo;
  stdout: string[];
  stderr: string[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    },
    stdout,
    stderr,
  };
}

async function executeKnownBillScenario(
  dependencies: WashingtonLwsCanaryDependencies = {},
): Promise<WashingtonLwsCanaryReport> {
  const capture = capturedIo();
  const exitCode = await runWashingtonLwsCanaryCommand(
    ["--execute", "--scenario", "known_bill_legislation_v1"],
    capture.io,
    dependencies,
  );

  expect([0, 2]).toContain(exitCode);
  expect(capture.stderr).toEqual([]);
  expect(capture.stdout).toHaveLength(1);
  return assertWashingtonLwsCanaryReport(
    JSON.parse(capture.stdout[0] ?? "") as unknown,
  );
}

async function executeYearlyScenario(
  dependencies: WashingtonLwsCanaryDependencies = {},
): Promise<WashingtonLwsCanaryReport> {
  const capture = capturedIo();
  const exitCode = await runWashingtonLwsCanaryCommand(
    ["--execute", "--scenario", "legislation_by_year_v1"],
    capture.io,
    dependencies,
  );

  expect([0, 2]).toContain(exitCode);
  expect(capture.stderr).toEqual([]);
  expect(capture.stdout).toHaveLength(1);
  return assertWashingtonLwsCanaryReport(
    JSON.parse(capture.stdout[0] ?? "") as unknown,
  );
}

function recursivelyCollectedKeys(value: unknown): string[] {
  if (value === null || typeof value !== "object") {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => recursivelyCollectedKeys(entry));
  }
  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...recursivelyCollectedKeys(nested),
  ]);
}

describe("Washington LWS aggregate-only canary observer", () => {
  it("runtime-freezes the scenario and evidence policy allowlists", () => {
    expect(Object.isFrozen(WASHINGTON_LWS_CANARY_SCENARIOS)).toBe(true);
    expect(Object.isFrozen(WASHINGTON_LWS_CANARY_POLICY)).toBe(true);
    expect(Object.isFrozen(WASHINGTON_LWS_CANARY_POLICY.scenarios)).toBe(true);
    for (const policy of Object.values(
      WASHINGTON_LWS_CANARY_POLICY.scenarios,
    )) {
      expect(Object.isFrozen(policy)).toBe(true);
    }

    const canaryPolicy = WASHINGTON_LWS_CANARY_POLICY as unknown as {
      maximumRequestAttempts: number;
    };
    expect(() =>
      Object.assign(canaryPolicy, {
        maximumRequestAttempts: Number.MAX_SAFE_INTEGER,
      }),
    ).toThrow(TypeError);
    expect(canaryPolicy).toMatchObject({
      maximumRequestAttempts: 1,
    });
    const knownBillPolicy = WASHINGTON_LWS_CANARY_POLICY.scenarios
      .known_bill_legislation_v1 as unknown as { operation: string };
    expect(() =>
      Object.assign(knownBillPolicy, { operation: "GetLegislationByYear" }),
    ).toThrow(TypeError);
    expect(knownBillPolicy.operation).toBe("GetLegislation");
  });

  it("runs the one fixed known-bill scenario through transport and returns only aggregates", async () => {
    let capturedInput: RequestInfo | URL | undefined;
    let capturedInit: RequestInit | undefined;
    const fetchImpl = vi.fn<WashingtonLwsFetchLike>(async (input, init) => {
      capturedInput = input;
      capturedInit = init;
      return soapResponse(knownBillLegislationBytes());
    });
    const times = [1_000, 1_500];

    const report = await executeKnownBillScenario({
      fetchImpl,
      now: () => times.shift() ?? Number.NaN,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(
      WASHINGTON_LWS_CANARY_POLICY.maximumRequestAttempts,
    );
    expect(capturedInput).toBe(
      "https://wslwebservices.leg.wa.gov/legislationservice.asmx",
    );
    expect(capturedInit?.body).toContain("<biennium>2025-26</biennium>");
    expect(capturedInit?.body).toContain("<billNumber>1001</billNumber>");
    expect(report).toEqual({
      schemaVersion: "1.1.0",
      sourceId: "washington-lws",
      scenarioId: "known_bill_legislation_v1",
      operation: "GetLegislation",
      executionAuthorized: true,
      requestAttemptCount: 1,
      retryCount: 0,
      elapsedBucket: "under_1s",
      expectationMet: true,
      interpretation: null,
      outcome: "success",
      http: {
        status: 200,
        declaredBytes: null,
        receivedBytes: knownBillLegislationBytes().byteLength,
      },
      soapObservation: {
        kind: "success",
        resultState: "present",
        itemCount: 2,
        identityEchoCheck: "accepted_reviewed_fields",
        topLevelOptionalNullCount: 2,
        topLevelOptionalValueCount: 18,
        dates: {
          observedCount: 4,
          utcCount: 0,
          offsetCount: 4,
          timezoneAbsentCount: 0,
          fractionalCount: 0,
          maximumFractionDigits: null,
        },
      },
      failure: null,
    });

    const serialized = serializeWashingtonLwsCanaryReport(report);
    for (const prohibited of [
      "2025-26",
      "1001",
      "<soap",
      "SYNTHETIC-HB",
      "SYNTHETIC-SPONSOR",
      "SYNTHETIC BASE VERSION TITLE",
      "SYNTHETIC-ACTIVE-VERSION-STATUS",
    ]) {
      expect(serialized).not.toContain(prohibited);
    }
    const reportKeys = recursivelyCollectedKeys(report);
    for (const prohibitedKey of [
      "request",
      "body",
      "headers",
      "url",
      "host",
      "result",
      "message",
      "stack",
      "cause",
      "soap",
    ]) {
      expect(reportKeys).not.toContain(prohibitedKey);
    }
  });

  it("runs the fixed yearly scenario once and emits only bounded structural aggregates", async () => {
    let capturedInput: RequestInfo | URL | undefined;
    let capturedInit: RequestInit | undefined;
    const fetchImpl = vi.fn<WashingtonLwsFetchLike>(async (input, init) => {
      capturedInput = input;
      capturedInit = init;
      return soapResponse(yearlyLegislationBytes());
    });
    const times = [2_000, 2_750];

    const report = await executeYearlyScenario({
      fetchImpl,
      now: () => times.shift() ?? Number.NaN,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(capturedInput).toBe(
      "https://wslwebservices.leg.wa.gov/legislationservice.asmx",
    );
    expect(capturedInit?.body).toContain("<year>2025</year>");
    expect(capturedInit?.body).not.toContain("<biennium>");
    expect(capturedInit?.body).not.toContain("<billNumber>");
    expect(new Headers(capturedInit?.headers).get("SOAPAction")).toBe(
      '"http://WSLWebServices.leg.wa.gov/GetLegislationByYear"',
    );
    expect(report).toEqual({
      schemaVersion: "1.1.0",
      sourceId: "washington-lws",
      scenarioId: "legislation_by_year_v1",
      operation: "GetLegislationByYear",
      executionAuthorized: true,
      requestAttemptCount: 1,
      retryCount: 0,
      elapsedBucket: "under_1s",
      expectationMet: true,
      interpretation: {
        responseScope: "single_bounded_response",
        requestYearEcho: "not_observable",
        uniqueness: "not_assessed",
        ordering: "not_assessed",
        completeness: "not_assessed",
        activeWinner: "not_assessed",
        historicalRange: "not_assessed",
        productionViability: "not_assessed",
      },
      outcome: "success",
      http: {
        status: 200,
        declaredBytes: null,
        receivedBytes: yearlyLegislationBytes().byteLength,
      },
      soapObservation: {
        kind: "success",
        resultState: "present",
        returnedItemCount: 4,
        itemBudgetState: "below_repository_limit",
        topLevelOptionalNullCount: 9,
        topLevelOptionalValueCount: 11,
      },
      failure: null,
    });

    const serialized = serializeWashingtonLwsCanaryReport(report);
    for (const prohibited of [
      "2025",
      "3785-86",
      "999991",
      "999992",
      "SYNTHETIC-YEAR",
    ]) {
      expect(serialized).not.toContain(prohibited);
    }
    const reportKeys = recursivelyCollectedKeys(report);
    for (const prohibitedKey of [
      "request",
      "year",
      "biennium",
      "billId",
      "billNumber",
      "displayNumber",
      "originalAgency",
      "legislationType",
      "result",
      "body",
      "headers",
      "url",
      "host",
      "message",
      "stack",
      "cause",
      "soap",
    ]) {
      expect(reportKeys).not.toContain(prohibitedKey);
    }
  });

  it.each([
    ["missing", ""],
    ["empty", "<GetLegislationResult />"],
  ] as const)(
    "reports a successful %s result without treating it as the expected known-bill observation",
    async (resultState, result) => {
      const fetchImpl = vi.fn<WashingtonLwsFetchLike>(async () =>
        soapResponse(envelope(result)),
      );

      const report = await executeKnownBillScenario({ fetchImpl });

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(report).toMatchObject({
        outcome: "success",
        expectationMet: false,
        soapObservation: {
          kind: "success",
          resultState,
          itemCount: 0,
          identityEchoCheck: "none_observed",
          topLevelOptionalNullCount: 0,
          topLevelOptionalValueCount: 0,
          dates: { observedCount: 0 },
        },
        failure: null,
      });
    },
  );

  it("labels an exact yearly repository-limit response without claiming truncation or completeness", async () => {
    const minimalItem = [
      "<LegislationInfo>",
      "<BillNumber>1</BillNumber>",
      "<SubstituteVersion>0</SubstituteVersion>",
      "<EngrossedVersion>0</EngrossedVersion>",
      "<Active>false</Active>",
      "</LegislationInfo>",
    ].join("");
    const body = yearlyEnvelope(
      `<GetLegislationByYearResult>${minimalItem.repeat(2_048)}</GetLegislationByYearResult>`,
    );

    const report = await executeYearlyScenario({
      fetchImpl: vi.fn<WashingtonLwsFetchLike>(async () => soapResponse(body)),
    });

    expect(report).toMatchObject({
      outcome: "success",
      expectationMet: true,
      interpretation: {
        completeness: "not_assessed",
        productionViability: "not_assessed",
      },
      soapObservation: {
        kind: "success",
        resultState: "present",
        returnedItemCount: 2_048,
        itemBudgetState: "at_repository_limit",
        topLevelOptionalNullCount: 10_240,
        topLevelOptionalValueCount: 0,
      },
    });
    expect(serializeWashingtonLwsCanaryReport(report)).not.toContain(
      "truncated",
    );
  });

  it.each([
    ["missing", ""],
    ["empty", "<GetLegislationByYearResult />"],
  ] as const)(
    "reports a successful yearly %s result without claiming query coverage",
    async (resultState, result) => {
      const fetchImpl = vi.fn<WashingtonLwsFetchLike>(async () =>
        soapResponse(yearlyEnvelope(result)),
      );

      const report = await executeYearlyScenario({ fetchImpl });

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(report).toMatchObject({
        scenarioId: "legislation_by_year_v1",
        operation: "GetLegislationByYear",
        outcome: "success",
        expectationMet: false,
        interpretation: {
          requestYearEcho: "not_observable",
          completeness: "not_assessed",
        },
        soapObservation: {
          kind: "success",
          resultState,
          returnedItemCount: 0,
          itemBudgetState: "below_repository_limit",
          topLevelOptionalNullCount: 0,
          topLevelOptionalValueCount: 0,
        },
        failure: null,
      });
    },
  );

  it("labels optional counts as top-level when nested reviewed fields are absent", async () => {
    const report = await executeKnownBillScenario({
      fetchImpl: vi.fn<WashingtonLwsFetchLike>(async () =>
        soapResponse(knownBillNestedSparseBytes()),
      ),
    });

    expect(report).toMatchObject({
      outcome: "success",
      soapObservation: {
        kind: "success",
        topLevelOptionalNullCount: 2,
        topLevelOptionalValueCount: 18,
      },
    });
  });

  it("reports a sanitized HTTP-200 SOAP fault without provider code or text", async () => {
    const report = await executeKnownBillScenario({
      fetchImpl: vi.fn<WashingtonLwsFetchLike>(async () =>
        soapResponse(fixtureText("soap-fault.valid.xml")),
      ),
    });

    expect(report).toMatchObject({
      outcome: "soap_fault",
      expectationMet: false,
      http: { status: 200 },
      soapObservation: {
        kind: "fault",
        providerCodeDiscarded: true,
        providerTextDiscarded: true,
      },
      failure: null,
    });
    const serialized = serializeWashingtonLwsCanaryReport(report);
    expect(serialized).not.toContain("soap:Client");
    expect(serialized).not.toContain("SYNTHETIC CLIENT FAULT");
  });

  it("keeps the yearly SOAP-fault report sanitized and explicitly non-assessive", async () => {
    const report = await executeYearlyScenario({
      fetchImpl: vi.fn<WashingtonLwsFetchLike>(async () =>
        soapResponse(fixtureText("soap-fault.valid.xml")),
      ),
    });

    expect(report).toMatchObject({
      scenarioId: "legislation_by_year_v1",
      operation: "GetLegislationByYear",
      outcome: "soap_fault",
      expectationMet: false,
      interpretation: {
        responseScope: "single_bounded_response",
        completeness: "not_assessed",
        productionViability: "not_assessed",
      },
      http: { status: 200 },
      soapObservation: {
        kind: "fault",
        providerCodeDiscarded: true,
        providerTextDiscarded: true,
      },
      failure: null,
    });
    const serialized = serializeWashingtonLwsCanaryReport(report);
    expect(serialized).not.toContain("soap:Client");
    expect(serialized).not.toContain("SYNTHETIC CLIENT FAULT");
  });

  it("rejects malformed yearly items without exposing partial aggregates", async () => {
    const malformed = new TextEncoder().encode(
      fixtureText("get-legislation-by-year.valid.xml").replace(
        "<BillNumber>999991</BillNumber>",
        "<BillNumber>1000000</BillNumber>",
      ),
    );
    const report = await executeYearlyScenario({
      fetchImpl: vi.fn<WashingtonLwsFetchLike>(async () =>
        soapResponse(malformed),
      ),
    });

    expect(report).toMatchObject({
      scenarioId: "legislation_by_year_v1",
      outcome: "rejected",
      expectationMet: false,
      requestAttemptCount: 1,
      http: {
        status: 200,
        declaredBytes: null,
        receivedBytes: null,
      },
      soapObservation: null,
      failure: { category: "invalid_soap" },
    });
    const serialized = serializeWashingtonLwsCanaryReport(report);
    expect(serialized).not.toContain("1000000");
    expect(serialized).not.toContain("999991");
    expect(serialized).not.toContain("returnedItemCount");
  });

  it.each(WASHINGTON_LWS_TRANSPORT_ERROR_CODES)(
    "maps transport category %s without retrying or serializing error details",
    async (code) => {
      const fetchImpl = vi.fn<WashingtonLwsFetchLike>(async () => {
        const error = new WashingtonLwsTransportError(
          code,
          "PROVIDER-NETWORK-ERROR-SENTINEL",
          code === "http_status" ? 503 : null,
        );
        error.stack = "PROVIDER-STACK-SENTINEL";
        throw error;
      });

      const report = await executeKnownBillScenario({ fetchImpl });

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(report).toMatchObject({
        outcome: "rejected",
        expectationMet: false,
        requestAttemptCount: 1,
        http: { status: code === "http_status" ? 503 : null },
        soapObservation: null,
        failure: { category: code },
      });
      const serialized = serializeWashingtonLwsCanaryReport(report);
      expect(serialized).not.toContain("PROVIDER-NETWORK-ERROR-SENTINEL");
      expect(serialized).not.toContain("PROVIDER-STACK-SENTINEL");
    },
  );

  it("maps a yearly transport rejection without retry, request values, or provider detail", async () => {
    const fetchImpl = vi.fn<WashingtonLwsFetchLike>(async () => {
      throw new WashingtonLwsTransportError(
        "http_status",
        "PROVIDER-YEARLY-ERROR-SENTINEL",
        503,
      );
    });

    const report = await executeYearlyScenario({ fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(report).toMatchObject({
      scenarioId: "legislation_by_year_v1",
      operation: "GetLegislationByYear",
      outcome: "rejected",
      expectationMet: false,
      requestAttemptCount: 1,
      retryCount: 0,
      interpretation: {
        requestYearEcho: "not_observable",
        completeness: "not_assessed",
      },
      http: { status: 503, declaredBytes: null, receivedBytes: null },
      soapObservation: null,
      failure: { category: "http_status" },
    });
    expect(serializeWashingtonLwsCanaryReport(report)).not.toMatch(
      /2025|PROVIDER-YEARLY-ERROR-SENTINEL/,
    );

    const transportWithoutAttempt = {
      ...structuredClone(report),
      requestAttemptCount: 0,
    };
    expect(() =>
      assertWashingtonLwsCanaryReport(transportWithoutAttempt),
    ).toThrowError("closed-schema validation");

    const requestContract = {
      ...structuredClone(report),
      requestAttemptCount: 0,
      http: { status: null, declaredBytes: null, receivedBytes: null },
      failure: { category: "request_contract" },
    };
    expect(assertWashingtonLwsCanaryReport(requestContract)).toEqual(
      requestContract,
    );
    expect(() =>
      assertWashingtonLwsCanaryReport({
        ...requestContract,
        requestAttemptCount: 1,
      }),
    ).toThrowError("closed-schema validation");
    expect(() =>
      assertWashingtonLwsCanaryReport({
        ...requestContract,
        http: { status: 400, declaredBytes: null, receivedBytes: null },
      }),
    ).toThrowError("closed-schema validation");
    expect(() =>
      assertWashingtonLwsCanaryReport({
        ...requestContract,
        requestAttemptCount: 1,
        http: { status: 500, declaredBytes: null, receivedBytes: null },
        failure: { category: "unexpected_internal_failure" },
      }),
    ).toThrowError("closed-schema validation");
  });

  it("maps an unexpected error, cause, and stack to one fixed category", async () => {
    const error = new Error("PROVIDER-UNKNOWN-MESSAGE-SENTINEL", {
      cause: "PROVIDER-UNKNOWN-CAUSE-SENTINEL",
    });
    error.stack = "PROVIDER-UNKNOWN-STACK-SENTINEL";
    const dependencies = {} as {
      fetchImpl?: WashingtonLwsFetchLike;
    };
    Object.defineProperty(dependencies, "fetchImpl", {
      get() {
        throw error;
      },
    });

    const report = await executeKnownBillScenario(dependencies);

    expect(report.failure).toEqual({
      category: "unexpected_internal_failure",
    });
    expect(report.requestAttemptCount).toBe(0);
    expect(serializeWashingtonLwsCanaryReport(report)).not.toMatch(
      /PROVIDER-UNKNOWN/,
    );
  });

  it("fails runtime validation on extra nested keys and unknown enums", async () => {
    const valid = await executeKnownBillScenario({
      fetchImpl: vi.fn<WashingtonLwsFetchLike>(async () =>
        soapResponse(knownBillLegislationBytes()),
      ),
    });
    expect(assertWashingtonLwsCanaryReport(valid)).toEqual(valid);

    const extraTop = structuredClone(valid) as WashingtonLwsCanaryReport & {
      request?: string;
    };
    extraTop.request = "PROHIBITED";
    expect(() => assertWashingtonLwsCanaryReport(extraTop)).toThrowError(
      "closed-schema validation",
    );

    const extraNested = structuredClone(valid) as WashingtonLwsCanaryReport & {
      http: WashingtonLwsCanaryReport["http"] & { url?: string };
    };
    extraNested.http.url = "https://PROHIBITED.invalid";
    expect(() => assertWashingtonLwsCanaryReport(extraNested)).toThrowError(
      "closed-schema validation",
    );

    const unknownOutcome = {
      ...structuredClone(valid),
      outcome: "provider_specific_outcome",
    };
    expect(() => assertWashingtonLwsCanaryReport(unknownOutcome)).toThrowError(
      "closed-schema validation",
    );
  });

  it("rejects yearly scenario mismatches, false interpretation claims, and inconsistent aggregates", async () => {
    const valid = await executeYearlyScenario({
      fetchImpl: vi.fn<WashingtonLwsFetchLike>(async () =>
        soapResponse(yearlyLegislationBytes()),
      ),
    });
    expect(assertWashingtonLwsCanaryReport(valid)).toEqual(valid);
    if (
      valid.outcome !== "success" ||
      valid.interpretation === null ||
      !("returnedItemCount" in valid.soapObservation)
    ) {
      throw new Error("expected yearly success fixture");
    }

    const wrongOperation = {
      ...structuredClone(valid),
      operation: "GetLegislation",
    };
    expect(() => assertWashingtonLwsCanaryReport(wrongOperation)).toThrowError(
      "closed-schema validation",
    );

    const falseInterpretation = {
      ...structuredClone(valid),
      interpretation: {
        ...valid.interpretation,
        completeness: "complete",
      },
    };
    expect(() =>
      assertWashingtonLwsCanaryReport(falseInterpretation),
    ).toThrowError("closed-schema validation");

    const wrongOptionalTotal = {
      ...structuredClone(valid),
      soapObservation: {
        ...valid.soapObservation,
        topLevelOptionalValueCount: 10,
      },
    };
    expect(() =>
      assertWashingtonLwsCanaryReport(wrongOptionalTotal),
    ).toThrowError("closed-schema validation");

    const falseLimitState = {
      ...structuredClone(valid),
      soapObservation: {
        ...valid.soapObservation,
        itemBudgetState: "at_repository_limit",
      },
    };
    expect(() => assertWashingtonLwsCanaryReport(falseLimitState)).toThrowError(
      "closed-schema validation",
    );

    const inventedDateShape = {
      ...structuredClone(valid),
      soapObservation: {
        ...valid.soapObservation,
        dates: { observedCount: 0 },
      },
    };
    expect(() =>
      assertWashingtonLwsCanaryReport(inventedDateShape),
    ).toThrowError("closed-schema validation");
  });

  it("snapshots accessor-backed reports before validation and serialization", async () => {
    const report = await executeKnownBillScenario({
      fetchImpl: vi.fn<WashingtonLwsFetchLike>(async () =>
        soapResponse(knownBillLegislationBytes()),
      ),
    });
    let reads = 0;
    Object.defineProperty(report, "sourceId", {
      configurable: true,
      enumerable: true,
      get() {
        reads += 1;
        return reads === 1 ? "washington-lws" : "PROVIDER-ACCESSOR-SENTINEL";
      },
    });

    const serialized = serializeWashingtonLwsCanaryReport(report);

    expect(reads).toBe(1);
    expect(serialized).toContain('"sourceId":"washington-lws"');
    expect(serialized).not.toContain("PROVIDER-ACCESSOR-SENTINEL");
    expect(() =>
      serializeWashingtonLwsCanaryReport(
        new Proxy(report, {
          get(target, property, receiver) {
            return Reflect.get(target, property, receiver);
          },
        }),
      ),
    ).toThrowError("closed-schema validation");
  });

  it.each([
    { arguments_: [] },
    { arguments_: ["--execute"] },
    { arguments_: ["--scenario", "known_bill_legislation_v1"] },
    { arguments_: ["--execute", "--scenario", "unknown"] },
    {
      arguments_: [
        "--execute",
        "--scenario",
        "HOSTILE-ARGUMENT-https://provider.invalid/?token=PROHIBITED",
      ],
    },
    {
      arguments_: [
        "--execute",
        "--scenario",
        "known_bill_legislation_v1",
        "--out",
        "PROHIBITED.xml",
      ],
    },
    {
      arguments_: [
        "--execute",
        "--scenario",
        "legislation_by_year_v1",
        "--year",
        "2026",
      ],
    },
    {
      arguments_: [
        "--execute",
        "--scenario",
        "legislation_by_year_v1",
        "known_bill_legislation_v1",
      ],
    },
    {
      arguments_: ["--execute", "--scenario", "Legislation_By_Year_V1"],
    },
  ] as Array<{ arguments_: string[] }>)(
    "refuses invalid command arguments without a request or argument echo",
    async ({ arguments_ }) => {
      const fetchImpl = vi.fn<WashingtonLwsFetchLike>(async () =>
        soapResponse(knownBillLegislationBytes()),
      );
      const capture = capturedIo();

      const exitCode = await runWashingtonLwsCanaryCommand(
        arguments_,
        capture.io,
        { fetchImpl },
      );

      expect(exitCode).toBe(64);
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(capture.stdout).toEqual([]);
      expect(capture.stderr).toEqual([
        "Washington LWS canary refused: use --help for the exact invocation.\n",
      ]);
      expect(capture.stderr.join("")).not.toMatch(
        /HOSTILE|provider\.invalid|token|PROHIBITED/,
      );
    },
  );

  it.each([
    { label: "--help", arguments_: ["--help"] },
    { label: "-h", arguments_: ["-h"] },
  ])(
    "prints static help for $label without a request",
    async ({ arguments_ }) => {
      const fetchImpl = vi.fn<WashingtonLwsFetchLike>(async () =>
        soapResponse(knownBillLegislationBytes()),
      );
      const capture = capturedIo();

      const exitCode = await runWashingtonLwsCanaryCommand(
        arguments_,
        capture.io,
        { fetchImpl },
      );

      expect(exitCode).toBe(0);
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(capture.stderr).toEqual([]);
      expect(capture.stdout.join("")).toContain(
        "--execute --scenario known_bill_legislation_v1",
      );
      expect(capture.stdout.join("")).toContain(
        "--execute --scenario legislation_by_year_v1",
      );
      expect(capture.stdout.join("")).not.toContain("2025");
    },
  );

  it("executes exactly once, emits one JSON line, and uses expectation-based exit status", async () => {
    const fetchImpl = vi.fn<WashingtonLwsFetchLike>(async () =>
      soapResponse(knownBillLegislationBytes()),
    );
    const capture = capturedIo();

    const exitCode = await runWashingtonLwsCanaryCommand(
      ["--execute", "--scenario", "known_bill_legislation_v1"],
      capture.io,
      { fetchImpl },
    );

    expect(exitCode).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(capture.stderr).toEqual([]);
    expect(capture.stdout).toHaveLength(1);
    expect(capture.stdout[0]?.endsWith("\n")).toBe(true);
    expect(capture.stdout[0]?.trim().split("\n")).toHaveLength(1);
    expect(() => JSON.parse(capture.stdout[0] ?? "")).not.toThrow();
  });

  it("executes the yearly scenario once and emits one non-identifying JSON line", async () => {
    const fetchImpl = vi.fn<WashingtonLwsFetchLike>(async () =>
      soapResponse(yearlyLegislationBytes()),
    );
    const capture = capturedIo();

    const exitCode = await runWashingtonLwsCanaryCommand(
      ["--execute", "--scenario", "legislation_by_year_v1"],
      capture.io,
      { fetchImpl },
    );

    expect(exitCode).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(capture.stderr).toEqual([]);
    expect(capture.stdout).toHaveLength(1);
    expect(capture.stdout[0]?.trim().split("\n")).toHaveLength(1);
    expect(capture.stdout.join("")).not.toMatch(
      /2025|3785-86|999991|SYNTHETIC/,
    );
  });

  it("keeps the manual canary command outside check, build, and lifecycle scripts", () => {
    const packageJson = JSON.parse(
      readFileSync(path.resolve(projectRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts["source:wa-lws:canary"]).toBe(
      "node scripts/observe-washington-lws-canary.mjs",
    );
    for (const name of ["check", "build", "prepare", "prepublishOnly"]) {
      expect(packageJson.scripts[name] ?? "").not.toContain(
        "source:wa-lws:canary",
      );
    }
    const launcher = readFileSync(
      path.resolve(projectRoot, "scripts/observe-washington-lws-canary.mjs"),
      "utf8",
    );
    expect(launcher).toContain("envDir: false");
    expect(launcher).not.toContain("loadEnv");
  });

  it("accepts only the exact repository-owned scenario argument sequence", () => {
    expect(
      parseWashingtonLwsCanaryArguments([
        "--execute",
        "--scenario",
        "known_bill_legislation_v1",
      ]),
    ).toEqual({
      kind: "execute",
      scenarioId: "known_bill_legislation_v1",
    });
    expect(
      parseWashingtonLwsCanaryArguments([
        "--execute",
        "--scenario",
        "legislation_by_year_v1",
      ]),
    ).toEqual({
      kind: "execute",
      scenarioId: "legislation_by_year_v1",
    });
    expect(() =>
      parseWashingtonLwsCanaryArguments([
        "--scenario",
        "known_bill_legislation_v1",
        "--execute",
      ]),
    ).toThrowError("exact reviewed argument shape");
    expect(() =>
      parseWashingtonLwsCanaryArguments([
        "--execute",
        "--scenario",
        "legislation_by_year_v1",
        "--year",
        "2025",
      ]),
    ).toThrowError("exact reviewed argument shape");
  });

  it("keeps scenario execution private and the observer outside the public contract barrel", () => {
    expect(washingtonLwsContract).not.toHaveProperty(
      "runWashingtonLwsCanaryScenario",
    );
    expect(washingtonLwsContract).not.toHaveProperty(
      "runWashingtonLwsCanaryCommand",
    );
    expect(washingtonLwsContract).not.toHaveProperty(
      "observeWashingtonLwsReviewedYearlyCanaryExchange",
    );
    expect(washingtonLwsTransport).not.toHaveProperty(
      "fetchWashingtonLwsReviewedYearlyCanaryExchange",
    );
    expect(washingtonLwsTransport).toHaveProperty(
      "observeWashingtonLwsReviewedYearlyCanaryExchange",
    );
  });

  it("loads the repository launcher for help without extra stderr output", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/observe-washington-lws-canary.mjs", "--help"],
      {
        cwd: projectRoot,
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain(
      "npm run --silent source:wa-lws:canary -- --execute",
    );
  });

  it("keeps launcher refusal output static for hostile arguments", () => {
    const result = spawnSync(
      process.execPath,
      [
        "scripts/observe-washington-lws-canary.mjs",
        "--execute",
        "--scenario",
        "PROVIDER-URL-https://provider.invalid/?secret=PROHIBITED",
      ],
      {
        cwd: projectRoot,
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(64);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "Washington LWS canary refused: use --help for the exact invocation.\n",
    );
    expect(result.stderr).not.toMatch(/provider\.invalid|secret|PROHIBITED/);
  });
});
