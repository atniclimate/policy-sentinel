// JSON guard helpers shared by the source response contracts. Each contract
// binds them to its own fail function, so it keeps its own error class.

export type JsonGuardErrorCode =
  | "duplicate_value"
  | "invalid_type"
  | "invalid_value"
  | "limit_exceeded"
  | "missing_field"
  | "unexpected_field";

export type JsonGuardFail = (
  code: JsonGuardErrorCode,
  path: string,
  message: string,
) => never;

type JsonObject = Record<string, unknown>;
type ItemParser<T> = (value: unknown, path: string) => T;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function createJsonGuards(fail: JsonGuardFail) {
  function object(value: unknown, path: string): JsonObject {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    ) {
      fail("invalid_type", path, "expected a plain object");
    }
    return value as JsonObject;
  }

  function exactKeys(
    value: JsonObject,
    path: string,
    required: readonly string[],
    optional: readonly string[] = [],
  ): void {
    const allowed = new Set([...required, ...optional]);
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) {
        fail("unexpected_field", `${path}.${key}`, "field is not retained");
      }
    }
    for (const key of required) {
      if (!Object.hasOwn(value, key)) {
        fail("missing_field", `${path}.${key}`, "required field is missing");
      }
    }
  }

  function boundedString(
    value: unknown,
    path: string,
    maximumLength = 16_384,
  ): string {
    if (typeof value !== "string") {
      fail("invalid_type", path, "expected a string");
    }
    if (value.length === 0 || value.trim().length === 0) {
      fail("invalid_value", path, "expected a nonblank string");
    }
    if (value.length > maximumLength) {
      fail("limit_exceeded", path, "string exceeds the contract limit");
    }
    return value;
  }

  function exactString<T extends string>(
    value: unknown,
    path: string,
    expected: T,
  ): T {
    if (value !== expected) {
      fail("invalid_value", path, `expected ${JSON.stringify(expected)}`);
    }
    return expected;
  }

  function boundedInteger(
    value: unknown,
    path: string,
    minimum: number,
    maximum: number,
  ): number {
    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < minimum ||
      value > maximum
    ) {
      fail("invalid_value", path, "expected a bounded safe integer");
    }
    return value;
  }

  // Rejects years 0000-0099, because Date.UTC maps them to 1900-1999.
  function calendarDate(value: unknown, path: string): string {
    const parsed = boundedString(value, path, 10);
    const match = DATE_PATTERN.exec(parsed);
    if (!match) {
      fail("invalid_value", path, "expected an ISO calendar date");
    }
    const [year, month, day] = match.slice(1).map(Number);
    const reconstructed = new Date(Date.UTC(year, month - 1, day));
    if (
      reconstructed.getUTCFullYear() !== year ||
      reconstructed.getUTCMonth() + 1 !== month ||
      reconstructed.getUTCDate() !== day
    ) {
      fail("invalid_value", path, "expected a real ISO calendar date");
    }
    return parsed;
  }

  function list<T>(
    value: unknown,
    path: string,
    maximumLength: number,
    parseItem: ItemParser<T>,
  ): T[] {
    if (!Array.isArray(value)) {
      fail("invalid_type", path, "expected an array");
    }
    if (value.length > maximumLength) {
      fail("limit_exceeded", path, "array exceeds the contract limit");
    }
    return value.map((item, index) => parseItem(item, `${path}[${index}]`));
  }

  function optional<T>(
    value: JsonObject,
    key: string,
    path: string,
    parseValue: ItemParser<T>,
  ): T | undefined {
    return Object.hasOwn(value, key)
      ? parseValue(value[key], `${path}.${key}`)
      : undefined;
  }

  function assertUnique(values: readonly string[], path: string): void {
    if (new Set(values).size !== values.length) {
      fail("duplicate_value", path, "duplicate retained identity");
    }
  }

  return {
    object,
    exactKeys,
    boundedString,
    exactString,
    boundedInteger,
    calendarDate,
    list,
    optional,
    assertUnique,
  };
}
