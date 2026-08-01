import { OREGON_ODATA_OFFLINE_POLICY } from "./constants";
import { failOregonODataContract } from "./errors";

export type JsonObject = Record<string, unknown>;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const UTC_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/;
const SYNTHETIC_ID_PATTERN = /^SYN-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127;
  });
}

export function objectValue(value: unknown, path: string): JsonObject {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    failOregonODataContract("invalid_type", path, "expected a plain object");
  }
  return value as JsonObject;
}

export function exactKeys(
  value: JsonObject,
  path: string,
  required: readonly string[],
): void {
  const allowed = new Set(required);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      failOregonODataContract(
        "unexpected_field",
        `${path}.${key}`,
        "field is not retained by the offline projection",
      );
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      failOregonODataContract(
        "missing_field",
        `${path}.${key}`,
        "required field is absent",
      );
    }
  }
}

export function requiredValue(
  value: JsonObject,
  key: string,
  path: string,
): unknown {
  if (!Object.hasOwn(value, key)) {
    failOregonODataContract(
      "missing_field",
      `${path}.${key}`,
      "required field is absent",
    );
  }
  return value[key];
}

export function arrayValue(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): unknown[] {
  if (!Array.isArray(value)) {
    failOregonODataContract("invalid_type", path, "expected an array");
  }
  if (value.length < minimum) {
    failOregonODataContract(
      "invalid_value",
      path,
      `expected at least ${minimum} item(s)`,
    );
  }
  if (value.length > maximum) {
    failOregonODataContract(
      "limit_exceeded",
      path,
      `expected at most ${maximum} item(s)`,
    );
  }
  return value;
}

export function stringValue(
  value: unknown,
  path: string,
  maximum: number = OREGON_ODATA_OFFLINE_POLICY.maximumLabelLength,
): string {
  if (typeof value !== "string") {
    failOregonODataContract("invalid_type", path, "expected a string");
  }
  if (
    value.length === 0 ||
    value.length > maximum ||
    value !== value.trim() ||
    hasControlCharacter(value)
  ) {
    failOregonODataContract(
      "invalid_value",
      path,
      `expected trimmed non-control text of 1 through ${maximum} characters`,
    );
  }
  return value;
}

export function nullableStringValue(
  value: unknown,
  path: string,
  maximum: number = OREGON_ODATA_OFFLINE_POLICY.maximumLabelLength,
): string | null {
  return value === null ? null : stringValue(value, path, maximum);
}

export function integerValue(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isInteger(value)) {
    failOregonODataContract("invalid_type", path, "expected an integer");
  }
  const parsed = value as number;
  if (parsed < minimum || parsed > maximum) {
    failOregonODataContract(
      "invalid_value",
      path,
      `expected an integer from ${minimum} through ${maximum}`,
    );
  }
  return parsed;
}

export function nullableIntegerValue(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number | null {
  return value === null ? null : integerValue(value, path, minimum, maximum);
}

export function syntheticIdValue(value: unknown, path: string): string {
  const parsed = stringValue(
    value,
    path,
    OREGON_ODATA_OFFLINE_POLICY.maximumIdentifierLength,
  );
  if (!SYNTHETIC_ID_PATTERN.test(parsed)) {
    failOregonODataContract(
      "invalid_value",
      path,
      "expected an explicitly synthetic SYN- identifier",
    );
  }
  return parsed;
}

function validCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const [, year, month, day] = match;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function dateValue(value: unknown, path: string): string {
  if (typeof value !== "string" || !validCalendarDate(value)) {
    failOregonODataContract(
      "invalid_value",
      path,
      "expected a real ISO calendar date",
    );
  }
  return value;
}

export function nullableDateValue(value: unknown, path: string): string | null {
  return value === null ? null : dateValue(value, path);
}

function validUtcDateTime(value: string): boolean {
  const match = UTC_DATE_TIME_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const [, year, month, day, hour, minute, second, milliseconds] = match;
  const canonical = `${year}-${month}-${day}T${hour}:${minute}:${second}.${milliseconds ?? "000"}Z`;
  const parsed = new Date(canonical);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== canonical) {
    return false;
  }
  return milliseconds === undefined
    ? parsed.toISOString().replace(".000Z", "Z") === value
    : parsed.toISOString() === value;
}

export function dateOrDateTimeValue(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    (!validCalendarDate(value) && !validUtcDateTime(value))
  ) {
    failOregonODataContract(
      "invalid_value",
      path,
      "expected a real ISO date or UTC date-time",
    );
  }
  return value;
}

export function nullableDateOrDateTimeValue(
  value: unknown,
  path: string,
): string | null {
  return value === null ? null : dateOrDateTimeValue(value, path);
}

export function literalValue<T extends string | number | boolean>(
  value: unknown,
  expected: T,
  path: string,
): T {
  if (value !== expected) {
    failOregonODataContract(
      "inconsistent_value",
      path,
      `expected ${JSON.stringify(expected)}`,
    );
  }
  return expected;
}
