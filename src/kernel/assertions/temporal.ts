import {
  assertJsonValue,
  immutableCanonicalClone,
  type DeepReadonly,
  type JsonValue,
} from "./canonical-json";

export interface DatePoint {
  kind: "date";
  value: string;
}

export interface DateTimePoint {
  kind: "date_time";
  value: string;
}

export type TemporalPoint = DatePoint | DateTimePoint;

export type TemporalEndpoint =
  | (DatePoint & { inclusive: boolean })
  | (DateTimePoint & { inclusive: boolean });

export interface TemporalInterval {
  kind: "interval";
  start: TemporalEndpoint | null;
  end: TemporalEndpoint | null;
}

export type TemporalValue = TemporalPoint | TemporalInterval;
export type TemporalOrder = "before" | "after" | "indeterminate";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;

type JsonObject = Record<string, unknown>;

function fail(path: string, detail: string): never {
  throw new TypeError(`${path}: ${detail}`);
}

function objectValue(value: unknown, path: string): JsonObject {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(path, "expected a plain object");
  }
  return value as JsonObject;
}

function exactKeys(
  value: JsonObject,
  path: string,
  expected: readonly string[],
): void {
  const expectedSet = new Set(expected);
  for (const key of Object.keys(value)) {
    if (!expectedSet.has(key)) {
      fail(`${path}.${key}`, "unexpected field");
    }
  }
  for (const key of expected) {
    if (!Object.hasOwn(value, key)) {
      fail(`${path}.${key}`, "required field is absent");
    }
  }
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function validDateParts(year: number, month: number, day: number): boolean {
  return (
    month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
  );
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  return validDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function isRfc3339DateTime(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const match = DATE_TIME_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (
    !validDateParts(year, month, day) ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return false;
  }

  const offset = match[8];
  if (offset === "-00:00") {
    return false;
  }
  if (offset !== "Z") {
    const offsetHour = Number(offset.slice(1, 3));
    const offsetMinute = Number(offset.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) {
      return false;
    }
  }
  return true;
}

function daysBeforeYear(year: number): bigint {
  const value = BigInt(year);
  return (
    value * 365n +
    (value + 3n) / 4n -
    (value + 99n) / 100n +
    (value + 399n) / 400n
  );
}

function dayOrdinal(year: number, month: number, day: number): bigint {
  let ordinal = daysBeforeYear(year);
  for (let currentMonth = 1; currentMonth < month; currentMonth += 1) {
    ordinal += BigInt(daysInMonth(year, currentMonth));
  }
  return ordinal + BigInt(day - 1);
}

interface ExactInstant {
  wholeSeconds: bigint;
  fractionalDigits: string;
}

function exactInstant(value: string): ExactInstant {
  const match = DATE_TIME_PATTERN.exec(value);
  if (!match) {
    throw new TypeError("date-time was not validated before comparison");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offset = match[8];
  let offsetSeconds = 0;
  if (offset !== "Z") {
    const sign = offset[0] === "+" ? 1 : -1;
    offsetSeconds =
      sign *
      (Number(offset.slice(1, 3)) * 3600 + Number(offset.slice(4, 6)) * 60);
  }

  return {
    wholeSeconds:
      dayOrdinal(year, month, day) * 86_400n +
      BigInt(hour * 3600 + minute * 60 + second - offsetSeconds),
    fractionalDigits: match[7] ?? "",
  };
}

function compareFractions(left: string, right: string): -1 | 0 | 1 {
  const length = Math.max(left.length, right.length);
  const normalizedLeft = left.padEnd(length, "0");
  const normalizedRight = right.padEnd(length, "0");
  if (normalizedLeft === normalizedRight) {
    return 0;
  }
  return normalizedLeft < normalizedRight ? -1 : 1;
}

export function compareTemporalPoints(
  left: TemporalPoint,
  right: TemporalPoint,
): -1 | 0 | 1 | null {
  if (left.kind !== right.kind) {
    return null;
  }
  if (left.kind === "date") {
    if (!isIsoDate(left.value) || !isIsoDate(right.value)) {
      throw new TypeError(
        "temporal points must be validated before comparison",
      );
    }
    if (left.value === right.value) {
      return 0;
    }
    return left.value < right.value ? -1 : 1;
  }

  if (!isRfc3339DateTime(left.value) || !isRfc3339DateTime(right.value)) {
    throw new TypeError("temporal points must be validated before comparison");
  }
  const leftInstant = exactInstant(left.value);
  const rightInstant = exactInstant(right.value);
  if (leftInstant.wholeSeconds !== rightInstant.wholeSeconds) {
    return leftInstant.wholeSeconds < rightInstant.wholeSeconds ? -1 : 1;
  }
  return compareFractions(
    leftInstant.fractionalDigits,
    rightInstant.fractionalDigits,
  );
}

function validatePoint(value: unknown, path: string): TemporalPoint {
  const object = objectValue(value, path);
  exactKeys(object, path, ["kind", "value"]);
  if (object.kind === "date") {
    if (!isIsoDate(object.value)) {
      fail(`${path}.value`, "expected an exact ISO calendar date");
    }
    return { kind: "date", value: object.value };
  }
  if (object.kind === "date_time") {
    if (!isRfc3339DateTime(object.value)) {
      fail(
        `${path}.value`,
        "expected an exact RFC 3339 date-time with mandatory offset",
      );
    }
    return { kind: "date_time", value: object.value };
  }
  fail(`${path}.kind`, "expected date or date_time");
}

function validateEndpoint(value: unknown, path: string): TemporalEndpoint {
  const object = objectValue(value, path);
  exactKeys(object, path, ["kind", "value", "inclusive"]);
  if (typeof object.inclusive !== "boolean") {
    fail(`${path}.inclusive`, "expected a boolean");
  }
  const point = validatePoint({ kind: object.kind, value: object.value }, path);
  return { ...point, inclusive: object.inclusive };
}

function validateTemporalValueMutable(
  value: unknown,
  path: string,
): TemporalValue {
  const object = objectValue(value, path);
  if (object.kind === "date" || object.kind === "date_time") {
    return validatePoint(object, path);
  }
  if (object.kind !== "interval") {
    fail(`${path}.kind`, "expected date, date_time, or interval");
  }
  exactKeys(object, path, ["kind", "start", "end"]);
  const start =
    object.start === null
      ? null
      : validateEndpoint(object.start, `${path}.start`);
  const end =
    object.end === null ? null : validateEndpoint(object.end, `${path}.end`);
  if (start === null && end === null) {
    fail(path, "interval start and end cannot both be null");
  }
  if (start !== null && end !== null) {
    const comparison = compareTemporalPoints(start, end);
    if (comparison === null) {
      fail(path, "interval endpoints must use the same temporal precision");
    }
    if (
      comparison > 0 ||
      (comparison === 0 && !(start.inclusive && end.inclusive))
    ) {
      fail(
        path,
        "interval start must precede end; equal bounds must both be inclusive",
      );
    }
  }
  return { kind: "interval", start, end };
}

export function validateTemporalValue(
  value: unknown,
  path = "$",
): DeepReadonly<TemporalValue> {
  assertJsonValue(value);
  return immutableCanonicalClone(
    validateTemporalValueMutable(value, path) as unknown as JsonValue,
  ) as DeepReadonly<TemporalValue>;
}

function bounds(value: TemporalValue): {
  start: TemporalEndpoint | null;
  end: TemporalEndpoint | null;
} {
  if (value.kind === "interval") {
    return value;
  }
  const endpoint = { ...value, inclusive: true };
  return { start: endpoint, end: endpoint };
}

function isStrictlyBefore(
  leftEnd: TemporalEndpoint | null,
  rightStart: TemporalEndpoint | null,
): boolean | null {
  if (leftEnd === null || rightStart === null) {
    return null;
  }
  const comparison = compareTemporalPoints(leftEnd, rightStart);
  if (comparison === null) {
    return null;
  }
  return (
    comparison < 0 ||
    (comparison === 0 && !(leftEnd.inclusive && rightStart.inclusive))
  );
}

export function compareTemporalOrder(
  left: TemporalValue,
  right: TemporalValue,
): TemporalOrder {
  const leftBounds = bounds(left);
  const rightBounds = bounds(right);
  if (isStrictlyBefore(leftBounds.end, rightBounds.start) === true) {
    return "before";
  }
  if (isStrictlyBefore(rightBounds.end, leftBounds.start) === true) {
    return "after";
  }
  return "indeterminate";
}
