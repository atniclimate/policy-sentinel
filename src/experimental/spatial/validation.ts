import {
  assertJsonValue,
  canonicalizeJson,
  immutableCanonicalClone,
  isRfc3339DateTime,
  validateSourceProvenance,
  validateSourceQualifiedIdentity,
  validateTemporalValue,
  type DeepReadonly,
  type JsonValue,
  type SourceProvenance,
  type SourceQualifiedIdentity,
  type TemporalValue,
} from "../../kernel/assertions/index";

import {
  S0_ADAPTER_ID,
  S0_ADAPTER_VERSION,
  S0_AXES,
  S0_CONTRACT_VERSION,
  S0_COORDINATE_SPACE_ID,
  S0_EXPERIMENTAL,
  S0_FIXTURE_CLASS,
  S0_FIXTURE_SLUG_PATTERN,
  S0_LAYER_VERSION_PATTERN,
  S0_MAX_COORDINATE,
  S0_MAX_RESOLUTION,
  S0_MAX_TOLERANCE,
  S0_MIN_COORDINATE,
  S0_MIN_RESOLUTION,
  S0_MIN_TOLERANCE,
  S0_PROTECTED_KEYS,
  S0_REPRESENTATION,
  S0_SHA256_PATTERN,
  S0_SOURCE_ID,
  S0_SYNTHETIC,
  S0_UNIT,
} from "./constants";
import type {
  S0AxisOrder,
  S0Box,
  S0CoordinateSpace,
  S0NormalizedBounds,
} from "./types";

export type JsonObject = Record<string, unknown>;

const protectedKeys = new Set<string>(S0_PROTECTED_KEYS);

export function fail(path: string, detail: string): never {
  throw new TypeError(`${path}: ${detail}`);
}

export function objectValue(value: unknown, path: string): JsonObject {
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

export function exactKeys(
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

function assertNoProtectedKeysInternal(value: JsonValue, path: string): void {
  if (value === null || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoProtectedKeysInternal(entry, `${path}[${index}]`),
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (protectedKeys.has(key)) {
      fail(`${path}.${key}`, "protected semantic field is forbidden in S0");
    }
    assertNoProtectedKeysInternal(child, `${path}.${key}`);
  }
}

export function assertS0JsonValue(value: unknown): asserts value is JsonValue {
  assertJsonValue(value);
  assertNoProtectedKeysInternal(value, "$");
}

export function exactText(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    [...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 32 || codePoint === 127;
    })
  ) {
    fail(
      path,
      "expected exact non-empty trimmed text without control characters",
    );
  }
  return value;
}

export function exactString<const Expected extends string>(
  value: unknown,
  expected: Expected,
  path: string,
): Expected {
  if (value !== expected) {
    fail(path, `expected ${expected}`);
  }
  return expected;
}

export function exactBoolean<const Expected extends boolean>(
  value: unknown,
  expected: Expected,
  path: string,
): Expected {
  if (value !== expected) {
    fail(path, `expected ${String(expected)}`);
  }
  return expected;
}

export function validateS0Markers(value: JsonObject, path = "$"): void {
  exactString(
    value.contractVersion,
    S0_CONTRACT_VERSION,
    `${path}.contractVersion`,
  );
  exactBoolean(value.experimental, S0_EXPERIMENTAL, `${path}.experimental`);
  exactBoolean(value.synthetic, S0_SYNTHETIC, `${path}.synthetic`);
  exactString(value.fixtureClass, S0_FIXTURE_CLASS, `${path}.fixtureClass`);
}

export function validateFixtureSlug(value: unknown, path: string): string {
  const slug = exactText(value, path);
  if (!S0_FIXTURE_SLUG_PATTERN.test(slug)) {
    fail(path, "expected fixture- followed by exactly four decimal digits");
  }
  return slug;
}

export function validateLayerVersion(value: unknown, path: string): string {
  const version = exactText(value, path);
  if (!S0_LAYER_VERSION_PATTERN.test(version)) {
    fail(path, "expected a numeric-only three-component semantic version");
  }
  return version;
}

export function validateSha256(value: unknown, path: string): string {
  if (typeof value !== "string" || !S0_SHA256_PATTERN.test(value)) {
    fail(path, "expected a lowercase SHA-256 hex digest");
  }
  return value;
}

export function validateSafeInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  path: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    Object.is(value, -0) ||
    value < minimum ||
    value > maximum
  ) {
    fail(path, `expected a safe integer from ${minimum} through ${maximum}`);
  }
  return value;
}

export function validateResolution(value: unknown, path: string): number {
  return validateSafeInteger(value, S0_MIN_RESOLUTION, S0_MAX_RESOLUTION, path);
}

export function validateTolerance(value: unknown, path: string): number {
  return validateSafeInteger(value, S0_MIN_TOLERANCE, S0_MAX_TOLERANCE, path);
}

function validateCoordinateTuple(
  value: unknown,
  path: string,
): [number, number] {
  if (!Array.isArray(value) || value.length !== 2) {
    fail(path, "expected exactly two stored coordinates");
  }
  return [
    validateSafeInteger(
      value[0],
      S0_MIN_COORDINATE,
      S0_MAX_COORDINATE,
      `${path}[0]`,
    ),
    validateSafeInteger(
      value[1],
      S0_MIN_COORDINATE,
      S0_MAX_COORDINATE,
      `${path}[1]`,
    ),
  ];
}

export function validateAxisOrder(value: unknown, path: string): S0AxisOrder {
  if (!Array.isArray(value) || value.length !== 2) {
    fail(path, "expected one of the two exact S0 axis orders");
  }
  if (value[0] === "synthetic_x" && value[1] === "synthetic_y") {
    return ["synthetic_x", "synthetic_y"];
  }
  if (value[0] === "synthetic_y" && value[1] === "synthetic_x") {
    return ["synthetic_y", "synthetic_x"];
  }
  fail(path, "expected one of the two exact S0 axis orders");
}

export function validateCoordinateSpace(
  value: unknown,
  path: string,
): S0CoordinateSpace {
  const object = objectValue(value, path);
  exactKeys(object, path, [
    "id",
    "axes",
    "axisOrder",
    "unit",
    "representation",
  ]);
  if (
    !Array.isArray(object.axes) ||
    object.axes.length !== 2 ||
    object.axes[0] !== S0_AXES[0] ||
    object.axes[1] !== S0_AXES[1]
  ) {
    fail(`${path}.axes`, "expected canonical named-axis order");
  }
  return {
    id: exactString(object.id, S0_COORDINATE_SPACE_ID, `${path}.id`),
    axes: [...S0_AXES],
    axisOrder: validateAxisOrder(object.axisOrder, `${path}.axisOrder`),
    unit: exactString(object.unit, S0_UNIT, `${path}.unit`),
    representation: exactString(
      object.representation,
      S0_REPRESENTATION,
      `${path}.representation`,
    ),
  };
}

export function validateStoredBox(value: unknown, path: string): S0Box {
  const object = objectValue(value, path);
  exactKeys(object, path, ["minimum", "maximum"]);
  return {
    minimum: validateCoordinateTuple(object.minimum, `${path}.minimum`),
    maximum: validateCoordinateTuple(object.maximum, `${path}.maximum`),
  };
}

export function normalizeBounds(
  axisOrder: S0AxisOrder,
  geometry: S0Box,
): S0NormalizedBounds {
  const xIndex = axisOrder[0] === "synthetic_x" ? 0 : 1;
  const yIndex = xIndex === 0 ? 1 : 0;
  return {
    synthetic_x: {
      minimum: geometry.minimum[xIndex],
      maximum: geometry.maximum[xIndex],
    },
    synthetic_y: {
      minimum: geometry.minimum[yIndex],
      maximum: geometry.maximum[yIndex],
    },
  };
}

export function validateNormalizedBounds(
  bounds: S0NormalizedBounds,
  resolution: number,
  path: string,
): void {
  for (const axis of S0_AXES) {
    const axisBounds = bounds[axis];
    if (axisBounds.minimum >= axisBounds.maximum) {
      fail(`${path}.${axis}`, "minimum must be strictly less than maximum");
    }
    if (
      axisBounds.minimum % resolution !== 0 ||
      axisBounds.maximum % resolution !== 0
    ) {
      fail(
        `${path}.${axis}`,
        "boundaries must be divisible by the declared resolution",
      );
    }
  }
}

export function validateYear3785DateTime(value: unknown, path: string): string {
  if (!isRfc3339DateTime(value) || !value.startsWith("3785-")) {
    fail(path, "expected an RFC 3339 date-time whose lexical year is 3785");
  }
  return value;
}

function assertTemporalLexemeYear3785(
  value: TemporalValue,
  path: string,
): void {
  if (value.kind === "date" || value.kind === "date_time") {
    if (!value.value.startsWith("3785-")) {
      fail(`${path}.value`, "temporal lexical year must be 3785");
    }
    return;
  }
  if (value.start !== null && !value.start.value.startsWith("3785-")) {
    fail(`${path}.start.value`, "temporal lexical year must be 3785");
  }
  if (value.end !== null && !value.end.value.startsWith("3785-")) {
    fail(`${path}.end.value`, "temporal lexical year must be 3785");
  }
}

export function validateTemporalValue3785(
  value: unknown,
  path: string,
): DeepReadonly<TemporalValue> {
  const validated = validateTemporalValue(value, path);
  assertTemporalLexemeYear3785(validated as TemporalValue, path);
  return validated;
}

export function makeSourceIdentity(
  fixtureSlug: string,
): SourceQualifiedIdentity {
  return {
    sourceId: S0_SOURCE_ID,
    sourceRecordId: `${S0_SOURCE_ID}:fixture:${fixtureSlug}`,
  };
}

export function makeLayerId(fixtureSlug: string): string {
  return `${S0_SOURCE_ID}:layer:${fixtureSlug}`;
}

export function makeFeatureId(fixtureSlug: string): string {
  return `${S0_SOURCE_ID}:feature:${fixtureSlug}`;
}

export function makeAdministrativeUnitId(fixtureSlug: string): string {
  return `${S0_SOURCE_ID}:administrative-unit:${fixtureSlug}`;
}

export function makeSentinelSourceUrl(fixtureSlug: string): string {
  return `https://policy-sentinel.invalid/fixtures/s0/1.0.0/${fixtureSlug}.json`;
}

export function makeJurisdictionStatement(
  featureId: string,
  administrativeUnitId: string,
): string {
  return `Impossible synthetic source statement: ${featureId} is assigned to ${administrativeUnitId} in this fixture only.`;
}

export function makeProvenance(
  fixtureSlug: string,
  sourcePath: string,
  retrievedAt: string,
  sourceContentDigest: string,
): SourceProvenance {
  return {
    sourceIdentity: makeSourceIdentity(fixtureSlug),
    sourceUrl: makeSentinelSourceUrl(fixtureSlug),
    sourcePath,
    retrievedAt,
    sourceUpdatedAt: null,
    adapterId: S0_ADAPTER_ID,
    adapterVersion: S0_ADAPTER_VERSION,
    sourceContentDigest,
    validationState: "validated",
  };
}

export function validateS0SourceIdentity(
  value: unknown,
  fixtureSlug: string,
  path: string,
): DeepReadonly<SourceQualifiedIdentity> {
  const validated = validateSourceQualifiedIdentity(value, path);
  const expected = makeSourceIdentity(fixtureSlug);
  if (
    validated.sourceId !== expected.sourceId ||
    validated.sourceRecordId !== expected.sourceRecordId
  ) {
    fail(path, "source-qualified identity does not match the fixture slug");
  }
  return validated;
}

export function validateS0Provenance(
  value: unknown,
  fixtureSlug: string,
  sourcePath: string,
  sourceContentDigest: string,
  retrievedAt: string,
  path: string,
): DeepReadonly<SourceProvenance> {
  const validated = validateSourceProvenance(value, path);
  const expected = makeProvenance(
    fixtureSlug,
    sourcePath,
    retrievedAt,
    sourceContentDigest,
  );
  if (canonicalizeJson(validated) !== canonicalizeJson(expected)) {
    fail(path, "provenance does not match exact S0 fragment custody");
  }
  return validated;
}

export function compareUnicodeCodePoints(left: string, right: string): number {
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

export function assertSortedUniqueIds<T>(
  values: readonly T[],
  id: (value: T) => string,
  path: string,
): void {
  let previous: string | undefined;
  for (let index = 0; index < values.length; index += 1) {
    const current = id(values[index]!);
    if (current.length === 0) {
      fail(`${path}[${index}]`, "stable ID must be non-empty");
    }
    if (
      previous !== undefined &&
      compareUnicodeCodePoints(previous, current) >= 0
    ) {
      fail(path, "expected stable-ID-sorted unique entries");
    }
    previous = current;
  }
}

export function sortByStableId<T>(
  values: readonly T[],
  id: (value: T) => string,
): T[] {
  return [...values].sort((left, right) =>
    compareUnicodeCodePoints(id(left), id(right)),
  );
}

export function jsonEqual(left: unknown, right: unknown): boolean {
  return canonicalizeJson(left) === canonicalizeJson(right);
}

export function immutableClone<T>(value: T): DeepReadonly<T> {
  return immutableCanonicalClone(
    value as unknown as JsonValue,
  ) as DeepReadonly<T>;
}
