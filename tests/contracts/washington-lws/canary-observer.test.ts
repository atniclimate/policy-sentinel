import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import * as washingtonLwsContract from "../../../src/contracts/washington-lws";
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

    const canaryPolicy = WASHINGTON_LWS_CANARY_POLICY as unknown as {
      operation: string;
      maximumRequestAttempts: number;
    };
    expect(() =>
      Object.assign(canaryPolicy, {
        operation: "GetLegislationByYear",
        maximumRequestAttempts: Number.MAX_SAFE_INTEGER,
      }),
    ).toThrow(TypeError);
    expect(canaryPolicy).toMatchObject({
      operation: "GetLegislation",
      maximumRequestAttempts: 1,
    });
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
      schemaVersion: "1.0.0",
      sourceId: "washington-lws",
      scenarioId: "known_bill_legislation_v1",
      operation: "GetLegislation",
      executionAuthorized: true,
      requestAttemptCount: 1,
      retryCount: 0,
      elapsedBucket: "under_1s",
      expectationMet: true,
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
    expect(() =>
      parseWashingtonLwsCanaryArguments([
        "--scenario",
        "known_bill_legislation_v1",
        "--execute",
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
