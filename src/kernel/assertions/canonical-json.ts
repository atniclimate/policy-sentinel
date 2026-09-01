import { createHash } from "node:crypto";

export const CANONICALIZATION_VERSION = "ps-c14n-json-1" as const;

export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export type DeepReadonly<T> = T extends JsonPrimitive
  ? T
  : T extends readonly []
    ? readonly []
    : T extends readonly [unknown, ...unknown[]]
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T extends readonly (infer Item)[]
        ? readonly DeepReadonly<Item>[]
        : T extends object
          ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
          : never;

const ARRAY_INDEX_PATTERN = /^(?:0|[1-9]\d*)$/;
function lifecycleCollectionIdKey(path: string): string | undefined {
  if (path === "$.sourceFacts" || path.endsWith(".factReferences")) {
    return "factId";
  }
  if (path === "$.instruments") {
    return "instrumentId";
  }
  if (path === "$.versions") {
    return "versionId";
  }
  if (path === "$.events") {
    return "eventId";
  }
  if (
    path === "$.equivalenceAssertions" ||
    path === "$.relationshipAssertions"
  ) {
    return "assertionId";
  }
  return path === "$" ? "factId" : undefined;
}

function fail(path: string, detail: string): never {
  throw new TypeError(`${path}: ${detail}`);
}

function compareUnicodeCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0));
  const rightPoints = Array.from(right, (character) =>
    character.codePointAt(0),
  );
  const sharedLength = Math.min(leftPoints.length, rightPoints.length);

  for (let index = 0; index < sharedLength; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return leftPoints.length - rightPoints.length;
}

function assertDataProperty(
  descriptor: PropertyDescriptor | undefined,
  path: string,
): asserts descriptor is PropertyDescriptor & { value: unknown } {
  if (
    descriptor === undefined ||
    !descriptor.enumerable ||
    !("value" in descriptor)
  ) {
    fail(path, "expected an enumerable data property");
  }
}

function assertJsonValueInternal(
  value: unknown,
  path: string,
  ancestors: WeakSet<object>,
): asserts value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail(path, "non-finite numbers are not JSON contract values");
    }
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) {
      fail(path, "unsafe integers are not JSON contract values");
    }
    if (Object.is(value, -0)) {
      fail(path, "negative zero is not a canonical JSON contract value");
    }
    return;
  }

  if (typeof value !== "object") {
    fail(path, "expected a JSON value");
  }
  if (ancestors.has(value)) {
    fail(path, "cyclic values are not JSON contract values");
  }
  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        fail(path, "array prototype is not canonical");
      }

      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          fail(`${path}[${index}]`, "sparse arrays are not canonical");
        }
        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          String(index),
        );
        assertDataProperty(descriptor, `${path}[${index}]`);
        assertJsonValueInternal(
          descriptor.value,
          `${path}[${index}]`,
          ancestors,
        );
      }

      for (const key of Reflect.ownKeys(value)) {
        if (typeof key === "symbol") {
          fail(path, "symbol properties are not JSON contract values");
        }
        if (key === "length") {
          continue;
        }
        if (!ARRAY_INDEX_PATTERN.test(key) || Number(key) >= value.length) {
          fail(`${path}.${key}`, "array has a non-index property");
        }
      }

      const idKey = lifecycleCollectionIdKey(path);
      if (
        idKey !== undefined &&
        value.length > 0 &&
        value.every(
          (entry) =>
            entry !== null &&
            typeof entry === "object" &&
            !Array.isArray(entry) &&
            Object.hasOwn(entry, idKey),
        )
      ) {
        const seenIds = new Set<string>();
        for (let index = 0; index < value.length; index += 1) {
          const entry = value[index];
          if (
            entry === null ||
            typeof entry !== "object" ||
            Array.isArray(entry)
          ) {
            fail(`${path}[${index}]`, "stable-ID collection entry is invalid");
          }
          const stableId = (entry as Record<string, unknown>)[idKey];
          if (typeof stableId !== "string") {
            fail(`${path}[${index}].${idKey}`, "stable ID must be a string");
          }
          if (seenIds.has(stableId)) {
            fail(path, `duplicate ${idKey} ${stableId}`);
          }
          seenIds.add(stableId);
        }
      }
      return;
    }

    if (Object.getPrototypeOf(value) !== Object.prototype) {
      fail(path, "expected a plain object with Object.prototype");
    }

    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") {
        fail(path, "symbol properties are not JSON contract values");
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      assertDataProperty(descriptor, `${path}.${key}`);
      assertJsonValueInternal(descriptor.value, `${path}.${key}`, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
}

export function assertJsonValue(value: unknown): asserts value is JsonValue {
  assertJsonValueInternal(value, "$", new WeakSet<object>());
}

function encodeCanonical(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => encodeCanonical(entry)).join(",")}]`;
  }

  const object = value as { readonly [key: string]: JsonValue };
  const entries = Object.keys(object)
    .sort(compareUnicodeCodePoints)
    .map(
      (key) =>
        `${JSON.stringify(key)}:${encodeCanonical(object[key] as JsonValue)}`,
    );
  return `{${entries.join(",")}}`;
}

export function canonicalizeJson(value: unknown): string {
  assertJsonValue(value);
  return encodeCanonical(value);
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalJsonDigest(value: unknown): string {
  return sha256Hex(canonicalizeJson(value));
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}

export function immutableCanonicalClone<T extends JsonValue>(
  value: T,
): DeepReadonly<T> {
  const clone = JSON.parse(canonicalizeJson(value)) as T;
  return deepFreeze(clone);
}

export function assertSortedUniqueStrings(
  values: readonly string[],
  path: string,
): void {
  let previous: string | undefined;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (typeof value !== "string" || value.length === 0) {
      fail(`${path}[${index}]`, "expected a non-empty string");
    }
    if (
      previous !== undefined &&
      compareUnicodeCodePoints(previous, value) >= 0
    ) {
      fail(path, "expected lexicographically sorted unique strings");
    }
    previous = value;
  }
}
