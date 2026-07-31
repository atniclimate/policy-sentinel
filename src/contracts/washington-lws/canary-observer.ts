import {
  WASHINGTON_LWS_OPERATION_DESCRIPTORS,
  WASHINGTON_LWS_SOURCE_ID,
  WASHINGTON_LWS_XML_POLICY,
} from "./constants";
import { WashingtonLwsContractError } from "./errors";
import type { WashingtonLwsRequestInput } from "./request-contract";
import type { WashingtonLwsLegislation } from "./soap-contract";
import {
  fetchWashingtonLwsSoapExchange,
  WASHINGTON_LWS_TRANSPORT_ERROR_CODES,
  WashingtonLwsTransportError,
  type WashingtonLwsFetchLike,
  type WashingtonLwsTransportErrorCode,
  type WashingtonLwsTransportReceipt,
} from "./transport";

export const WASHINGTON_LWS_CANARY_REPORT_VERSION = "1.0.0" as const;
export const WASHINGTON_LWS_CANARY_SCENARIOS = Object.freeze([
  "known_bill_legislation_v1",
] as const);

export type WashingtonLwsCanaryScenario =
  (typeof WASHINGTON_LWS_CANARY_SCENARIOS)[number];

export const WASHINGTON_LWS_CANARY_POLICY = Object.freeze({
  requestCount: 1,
  maximumRequestAttempts: 1,
  retryCount: 0,
  operation: "GetLegislation",
  outputLines: 1,
} as const);

const KNOWN_BILL_LEGISLATION_REQUEST = {
  operation: "GetLegislation",
  biennium: "2025-26",
  billNumber: 1_001,
} as const satisfies Extract<
  WashingtonLwsRequestInput,
  { operation: "GetLegislation" }
>;

const ELAPSED_BUCKETS = [
  "under_1s",
  "1_to_5s",
  "5_to_15s",
  "15_to_30s",
  "deadline_or_over",
] as const;

type WashingtonLwsCanaryElapsedBucket = (typeof ELAPSED_BUCKETS)[number];

const FAILURE_CATEGORIES = [
  ...WASHINGTON_LWS_TRANSPORT_ERROR_CODES,
  "request_contract",
  "unexpected_internal_failure",
] as const;

export type WashingtonLwsCanaryFailureCategory =
  (typeof FAILURE_CATEGORIES)[number];

interface WashingtonLwsCanaryBaseReport {
  schemaVersion: typeof WASHINGTON_LWS_CANARY_REPORT_VERSION;
  sourceId: typeof WASHINGTON_LWS_SOURCE_ID;
  scenarioId: WashingtonLwsCanaryScenario;
  operation: typeof WASHINGTON_LWS_CANARY_POLICY.operation;
  executionAuthorized: true;
  requestAttemptCount: 0 | 1;
  retryCount: 0;
  elapsedBucket: WashingtonLwsCanaryElapsedBucket;
  expectationMet: boolean;
}

interface WashingtonLwsCanaryAcceptedHttp {
  status: 200;
  declaredBytes: number | null;
  receivedBytes: number;
}

export interface WashingtonLwsCanaryDateShapes {
  observedCount: number;
  utcCount: number;
  offsetCount: number;
  timezoneAbsentCount: number;
  fractionalCount: number;
  maximumFractionDigits: number | null;
}

export type WashingtonLwsCanaryReport =
  | (WashingtonLwsCanaryBaseReport & {
      outcome: "success";
      expectationMet: boolean;
      http: WashingtonLwsCanaryAcceptedHttp;
      soapObservation: {
        kind: "success";
        resultState: "missing" | "empty" | "present";
        itemCount: number;
        identityEchoCheck: "accepted_reviewed_fields" | "none_observed";
        topLevelOptionalNullCount: number;
        topLevelOptionalValueCount: number;
        dates: WashingtonLwsCanaryDateShapes;
      };
      failure: null;
    })
  | (WashingtonLwsCanaryBaseReport & {
      outcome: "soap_fault";
      expectationMet: false;
      http: WashingtonLwsCanaryAcceptedHttp;
      soapObservation: {
        kind: "fault";
        providerCodeDiscarded: true;
        providerTextDiscarded: true;
        actorPresent: boolean;
        detailPresent: boolean;
      };
      failure: null;
    })
  | (WashingtonLwsCanaryBaseReport & {
      outcome: "rejected";
      expectationMet: false;
      http: {
        status: number | null;
        declaredBytes: null;
        receivedBytes: null;
      };
      soapObservation: null;
      failure: {
        category: WashingtonLwsCanaryFailureCategory;
      };
    });

export interface WashingtonLwsCanaryDependencies {
  fetchImpl?: WashingtonLwsFetchLike;
  now?: () => number;
}

export type WashingtonLwsCanaryCommandDecision =
  | { kind: "help" }
  | {
      kind: "execute";
      scenarioId: WashingtonLwsCanaryScenario;
    };

export interface WashingtonLwsCanaryCommandIo {
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
}

export class WashingtonLwsCanaryInvocationError extends Error {
  constructor() {
    super(
      "Washington LWS canary invocation must use the exact reviewed argument shape.",
    );
    this.name = "WashingtonLwsCanaryInvocationError";
  }
}

export class WashingtonLwsCanaryReportError extends Error {
  constructor() {
    super("Washington LWS canary report failed closed-schema validation.");
    this.name = "WashingtonLwsCanaryReportError";
  }
}

const BASE_REPORT_KEYS = [
  "schemaVersion",
  "sourceId",
  "scenarioId",
  "operation",
  "executionAuthorized",
  "requestAttemptCount",
  "retryCount",
  "elapsedBucket",
  "expectationMet",
  "outcome",
  "http",
  "soapObservation",
  "failure",
] as const;

const SUCCESS_OBSERVATION_KEYS = [
  "kind",
  "resultState",
  "itemCount",
  "identityEchoCheck",
  "topLevelOptionalNullCount",
  "topLevelOptionalValueCount",
  "dates",
] as const;

const DATE_SHAPE_KEYS = [
  "observedCount",
  "utcCount",
  "offsetCount",
  "timezoneAbsentCount",
  "fractionalCount",
  "maximumFractionDigits",
] as const;

const OPTIONAL_LEGISLATION_FIELD_COUNT = 10;
const MAXIMUM_DATE_OBSERVATIONS_PER_ITEM = 2;

function failReport(): never {
  throw new WashingtonLwsCanaryReportError();
}

function exactObject(
  value: unknown,
  expectedKeys: readonly string[],
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    failReport();
  }
  const source = value as Record<string, unknown>;
  const keys = Reflect.ownKeys(source);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(
      (key) => typeof key !== "string" || !expectedKeys.includes(key),
    ) ||
    expectedKeys.some((key) => !Object.hasOwn(source, key))
  ) {
    failReport();
  }
  return source;
}

function isMember<T extends string>(
  value: unknown,
  members: readonly T[],
): value is T {
  return typeof value === "string" && members.includes(value as T);
}

function integer(value: unknown, minimum: number, maximum: number): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    failReport();
  }
  return value;
}

function nullableInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  return value === null ? null : integer(value, minimum, maximum);
}

function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    failReport();
  }
  return value;
}

function validateBase(source: Record<string, unknown>): void {
  if (
    source.schemaVersion !== WASHINGTON_LWS_CANARY_REPORT_VERSION ||
    source.sourceId !== WASHINGTON_LWS_SOURCE_ID ||
    !isMember(source.scenarioId, WASHINGTON_LWS_CANARY_SCENARIOS) ||
    source.operation !== WASHINGTON_LWS_CANARY_POLICY.operation ||
    source.executionAuthorized !== true ||
    source.retryCount !== WASHINGTON_LWS_CANARY_POLICY.retryCount ||
    !isMember(source.elapsedBucket, ELAPSED_BUCKETS)
  ) {
    failReport();
  }
  integer(
    source.requestAttemptCount,
    0,
    WASHINGTON_LWS_CANARY_POLICY.maximumRequestAttempts,
  );
  boolean(source.expectationMet);
}

function validateAcceptedHttp(value: unknown): void {
  const source = exactObject(value, [
    "status",
    "declaredBytes",
    "receivedBytes",
  ]);
  if (source.status !== 200) {
    failReport();
  }
  nullableInteger(
    source.declaredBytes,
    1,
    WASHINGTON_LWS_XML_POLICY.maximumResponseBytes,
  );
  integer(
    source.receivedBytes,
    1,
    WASHINGTON_LWS_XML_POLICY.maximumResponseBytes,
  );
  if (
    source.declaredBytes !== null &&
    source.declaredBytes !== source.receivedBytes
  ) {
    failReport();
  }
}

function validateDateShapes(
  value: unknown,
  maximumObservedCount: number,
): void {
  const source = exactObject(value, DATE_SHAPE_KEYS);
  const observedCount = integer(source.observedCount, 0, maximumObservedCount);
  const utcCount = integer(source.utcCount, 0, observedCount);
  const offsetCount = integer(source.offsetCount, 0, observedCount);
  const timezoneAbsentCount = integer(
    source.timezoneAbsentCount,
    0,
    observedCount,
  );
  if (utcCount + offsetCount + timezoneAbsentCount !== observedCount) {
    failReport();
  }
  const fractionalCount = integer(source.fractionalCount, 0, observedCount);
  if (fractionalCount === 0) {
    if (source.maximumFractionDigits !== null) {
      failReport();
    }
  } else {
    integer(
      source.maximumFractionDigits,
      1,
      WASHINGTON_LWS_XML_POLICY.maximumScalarTextLength,
    );
  }
}

function validateSuccessReport(source: Record<string, unknown>): void {
  validateAcceptedHttp(source.http);
  if (source.failure !== null) {
    failReport();
  }
  const observation = exactObject(
    source.soapObservation,
    SUCCESS_OBSERVATION_KEYS,
  );
  if (
    observation.kind !== "success" ||
    !isMember(observation.resultState, ["missing", "empty", "present"])
  ) {
    failReport();
  }
  const itemCount = integer(
    observation.itemCount,
    0,
    WASHINGTON_LWS_OPERATION_DESCRIPTORS.GetLegislation.maximumItems,
  );
  if (
    (observation.resultState === "present" && itemCount === 0) ||
    (observation.resultState !== "present" && itemCount !== 0)
  ) {
    failReport();
  }
  const expectedIdentityCheck =
    itemCount === 0 ? "none_observed" : "accepted_reviewed_fields";
  if (observation.identityEchoCheck !== expectedIdentityCheck) {
    failReport();
  }
  const maximumOptionalCount = itemCount * OPTIONAL_LEGISLATION_FIELD_COUNT;
  const topLevelOptionalNullCount = integer(
    observation.topLevelOptionalNullCount,
    0,
    maximumOptionalCount,
  );
  const topLevelOptionalValueCount = integer(
    observation.topLevelOptionalValueCount,
    0,
    maximumOptionalCount,
  );
  if (
    topLevelOptionalNullCount + topLevelOptionalValueCount !==
    maximumOptionalCount
  ) {
    failReport();
  }
  validateDateShapes(
    observation.dates,
    itemCount * MAXIMUM_DATE_OBSERVATIONS_PER_ITEM,
  );
  const expected = observation.resultState === "present" && itemCount > 0;
  if (source.requestAttemptCount !== 1 || source.expectationMet !== expected) {
    failReport();
  }
}

function validateFaultReport(source: Record<string, unknown>): void {
  validateAcceptedHttp(source.http);
  if (
    source.requestAttemptCount !== 1 ||
    source.expectationMet !== false ||
    source.failure !== null
  ) {
    failReport();
  }
  const observation = exactObject(source.soapObservation, [
    "kind",
    "providerCodeDiscarded",
    "providerTextDiscarded",
    "actorPresent",
    "detailPresent",
  ]);
  if (
    observation.kind !== "fault" ||
    observation.providerCodeDiscarded !== true ||
    observation.providerTextDiscarded !== true
  ) {
    failReport();
  }
  boolean(observation.actorPresent);
  boolean(observation.detailPresent);
}

function validateRejectedReport(source: Record<string, unknown>): void {
  if (source.expectationMet !== false || source.soapObservation !== null) {
    failReport();
  }
  const http = exactObject(source.http, [
    "status",
    "declaredBytes",
    "receivedBytes",
  ]);
  nullableInteger(http.status, 100, 599);
  if (http.declaredBytes !== null || http.receivedBytes !== null) {
    failReport();
  }
  const failure = exactObject(source.failure, ["category"]);
  if (!isMember(failure.category, FAILURE_CATEGORIES)) {
    failReport();
  }
}

export function assertWashingtonLwsCanaryReport(
  value: unknown,
): WashingtonLwsCanaryReport {
  const source = exactObject(value, BASE_REPORT_KEYS);
  validateBase(source);
  if (source.outcome === "success") {
    validateSuccessReport(source);
  } else if (source.outcome === "soap_fault") {
    validateFaultReport(source);
  } else if (source.outcome === "rejected") {
    validateRejectedReport(source);
  } else {
    failReport();
  }
  return value as WashingtonLwsCanaryReport;
}

function safeNow(now: () => number): number | null {
  try {
    const value = now();
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function elapsedBucket(
  startedAt: number | null,
  finishedAt: number | null,
): WashingtonLwsCanaryElapsedBucket {
  if (startedAt === null || finishedAt === null || finishedAt < startedAt) {
    return "deadline_or_over";
  }
  const elapsed = finishedAt - startedAt;
  if (elapsed < 1_000) {
    return "under_1s";
  }
  if (elapsed < 5_000) {
    return "1_to_5s";
  }
  if (elapsed < 15_000) {
    return "5_to_15s";
  }
  if (elapsed < 30_000) {
    return "15_to_30s";
  }
  return "deadline_or_over";
}

function acceptedHttp(
  receipt: WashingtonLwsTransportReceipt<"GetLegislation">,
): WashingtonLwsCanaryAcceptedHttp {
  return {
    status: 200,
    declaredBytes: receipt.declaredBytes,
    receivedBytes: receipt.receivedBytes,
  };
}

function dateShapes(
  results: WashingtonLwsLegislation[],
): WashingtonLwsCanaryDateShapes {
  const dates: string[] = [];
  for (const result of results) {
    dates.push(result.introducedDate);
    if (result.currentStatus !== null) {
      dates.push(result.currentStatus.actionDate);
    }
  }

  let utcCount = 0;
  let offsetCount = 0;
  let timezoneAbsentCount = 0;
  let fractionalCount = 0;
  let maximumFractionDigits: number | null = null;
  for (const value of dates) {
    if (value.endsWith("Z")) {
      utcCount += 1;
    } else if (/[+-]\d{2}:\d{2}$/.test(value)) {
      offsetCount += 1;
    } else {
      timezoneAbsentCount += 1;
    }
    const fractional = /\.(\d+)(?:Z|[+-]\d{2}:\d{2})?$/.exec(value)?.[1];
    if (fractional !== undefined) {
      fractionalCount += 1;
      maximumFractionDigits = Math.max(
        maximumFractionDigits ?? 0,
        fractional.length,
      );
    }
  }

  return {
    observedCount: dates.length,
    utcCount,
    offsetCount,
    timezoneAbsentCount,
    fractionalCount,
    maximumFractionDigits,
  };
}

function topLevelOptionalFieldCounts(results: WashingtonLwsLegislation[]): {
  topLevelOptionalNullCount: number;
  topLevelOptionalValueCount: number;
} {
  let topLevelOptionalNullCount = 0;
  let topLevelOptionalValueCount = 0;
  for (const result of results) {
    const values = [
      result.biennium,
      result.billId,
      result.legislationType,
      result.originalAgency,
      result.displayNumber,
      result.shortDescription,
      result.currentStatus,
      result.sponsor,
      result.legalTitle,
      result.companions,
    ];
    for (const value of values) {
      if (value === null) {
        topLevelOptionalNullCount += 1;
      } else {
        topLevelOptionalValueCount += 1;
      }
    }
  }
  return { topLevelOptionalNullCount, topLevelOptionalValueCount };
}

function baseReport(
  elapsed: WashingtonLwsCanaryElapsedBucket,
  requestAttemptCount: 0 | 1,
): Omit<WashingtonLwsCanaryBaseReport, "expectationMet"> {
  return {
    schemaVersion: WASHINGTON_LWS_CANARY_REPORT_VERSION,
    sourceId: WASHINGTON_LWS_SOURCE_ID,
    scenarioId: "known_bill_legislation_v1",
    operation: WASHINGTON_LWS_CANARY_POLICY.operation,
    executionAuthorized: true,
    requestAttemptCount,
    retryCount: 0,
    elapsedBucket: elapsed,
  };
}

function successReport(
  receipt: WashingtonLwsTransportReceipt<"GetLegislation">,
  elapsed: WashingtonLwsCanaryElapsedBucket,
  requestAttemptCount: 0 | 1,
): WashingtonLwsCanaryReport {
  if (receipt.soap.kind === "fault") {
    return {
      ...baseReport(elapsed, requestAttemptCount),
      outcome: "soap_fault",
      expectationMet: false,
      http: acceptedHttp(receipt),
      soapObservation: {
        kind: "fault",
        providerCodeDiscarded: true,
        providerTextDiscarded: true,
        actorPresent: receipt.soap.fault.actorPresent,
        detailPresent: receipt.soap.fault.detailPresent,
      },
      failure: null,
    };
  }

  const results = receipt.soap.result;
  const optionalCounts = topLevelOptionalFieldCounts(results);
  const expectationMet =
    receipt.soap.resultState === "present" && results.length > 0;
  return {
    ...baseReport(elapsed, requestAttemptCount),
    outcome: "success",
    expectationMet,
    http: acceptedHttp(receipt),
    soapObservation: {
      kind: "success",
      resultState: receipt.soap.resultState,
      itemCount: results.length,
      identityEchoCheck:
        results.length === 0 ? "none_observed" : "accepted_reviewed_fields",
      ...optionalCounts,
      dates: dateShapes(results),
    },
    failure: null,
  };
}

function safeStatus(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 100 &&
    value <= 599
    ? value
    : null;
}

function failureCategory(error: unknown): WashingtonLwsCanaryFailureCategory {
  if (
    error instanceof WashingtonLwsTransportError &&
    isMember(error.code, WASHINGTON_LWS_TRANSPORT_ERROR_CODES)
  ) {
    return error.code as WashingtonLwsTransportErrorCode;
  }
  if (error instanceof WashingtonLwsContractError) {
    return "request_contract";
  }
  return "unexpected_internal_failure";
}

function rejectedReport(
  error: unknown,
  elapsed: WashingtonLwsCanaryElapsedBucket,
  requestAttemptCount: 0 | 1,
): WashingtonLwsCanaryReport {
  return {
    ...baseReport(elapsed, requestAttemptCount),
    outcome: "rejected",
    expectationMet: false,
    http: {
      status:
        error instanceof WashingtonLwsTransportError
          ? safeStatus(error.status)
          : null,
      declaredBytes: null,
      receivedBytes: null,
    },
    soapObservation: null,
    failure: {
      category: failureCategory(error),
    },
  };
}

function validatedOrInternalFailure(
  report: WashingtonLwsCanaryReport,
  elapsed: WashingtonLwsCanaryElapsedBucket,
  requestAttemptCount: 0 | 1,
): WashingtonLwsCanaryReport {
  try {
    return assertWashingtonLwsCanaryReport(report);
  } catch {
    return assertWashingtonLwsCanaryReport(
      rejectedReport(
        new Error("repository-owned canary projection failure"),
        elapsed,
        requestAttemptCount,
      ),
    );
  }
}

async function runWashingtonLwsCanaryScenario(
  scenarioId: WashingtonLwsCanaryScenario,
  dependencies: WashingtonLwsCanaryDependencies = {},
): Promise<WashingtonLwsCanaryReport> {
  if (!isMember(scenarioId, WASHINGTON_LWS_CANARY_SCENARIOS)) {
    throw new WashingtonLwsCanaryInvocationError();
  }

  let requestAttemptCount: 0 | 1 = 0;
  let now = (): number => globalThis.performance.now();
  let startedAt: number | null = null;
  try {
    now = dependencies.now ?? now;
    startedAt = safeNow(now);
    const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
    const countedFetch: WashingtonLwsFetchLike = async (input, init) => {
      if (
        requestAttemptCount >=
        WASHINGTON_LWS_CANARY_POLICY.maximumRequestAttempts
      ) {
        throw new WashingtonLwsTransportError(
          "network",
          "Washington LWS canary refused an additional request attempt.",
        );
      }
      requestAttemptCount = 1;
      return fetchImpl(input, init);
    };
    const receipt = await fetchWashingtonLwsSoapExchange(
      structuredClone(KNOWN_BILL_LEGISLATION_REQUEST),
      { fetchImpl: countedFetch },
    );
    const elapsed = elapsedBucket(startedAt, safeNow(now));
    return validatedOrInternalFailure(
      successReport(receipt, elapsed, requestAttemptCount),
      elapsed,
      requestAttemptCount,
    );
  } catch (error) {
    const elapsed = elapsedBucket(startedAt, safeNow(now));
    return validatedOrInternalFailure(
      rejectedReport(error, elapsed, requestAttemptCount),
      elapsed,
      requestAttemptCount,
    );
  }
}

export function parseWashingtonLwsCanaryArguments(
  arguments_: readonly string[],
): WashingtonLwsCanaryCommandDecision {
  if (
    arguments_.length === 1 &&
    (arguments_[0] === "--help" || arguments_[0] === "-h")
  ) {
    return { kind: "help" };
  }
  if (
    arguments_.length === 3 &&
    arguments_[0] === "--execute" &&
    arguments_[1] === "--scenario" &&
    arguments_[2] === "known_bill_legislation_v1"
  ) {
    return {
      kind: "execute",
      scenarioId: "known_bill_legislation_v1",
    };
  }
  throw new WashingtonLwsCanaryInvocationError();
}

export function washingtonLwsCanaryHelp(): string {
  return [
    "Run one aggregate-only Washington LWS canary.",
    "",
    "Usage:",
    "  npm run --silent source:wa-lws:canary -- --execute --scenario known_bill_legislation_v1",
    "",
    "The reviewed scenario makes exactly one no-auth GetLegislation request.",
    "It writes one aggregate JSON line and never writes a provider response or record.",
    "",
  ].join("\n");
}

export function serializeWashingtonLwsCanaryReport(report: unknown): string {
  let snapshot: unknown;
  try {
    snapshot = structuredClone(report);
  } catch {
    throw new WashingtonLwsCanaryReportError();
  }
  return `${JSON.stringify(assertWashingtonLwsCanaryReport(snapshot))}\n`;
}

export async function runWashingtonLwsCanaryCommand(
  arguments_: readonly string[],
  io: WashingtonLwsCanaryCommandIo,
  dependencies: WashingtonLwsCanaryDependencies = {},
): Promise<number> {
  let decision: WashingtonLwsCanaryCommandDecision;
  try {
    decision = parseWashingtonLwsCanaryArguments(arguments_);
  } catch {
    io.writeStderr(
      "Washington LWS canary refused: use --help for the exact invocation.\n",
    );
    return 64;
  }
  if (decision.kind === "help") {
    io.writeStdout(washingtonLwsCanaryHelp());
    return 0;
  }

  const report = await runWashingtonLwsCanaryScenario(
    decision.scenarioId,
    dependencies,
  );
  io.writeStdout(serializeWashingtonLwsCanaryReport(report));
  return report.expectationMet ? 0 : 2;
}
