import {
  compareTemporalPoints,
  validateFactReference,
  validateFactReferences,
  type DeepReadonly,
  type FactReference,
  type TemporalEndpoint,
  type TemporalPoint,
  type TemporalValue,
} from "../../kernel/assertions/index";

import type { ImmutableSpatialObservation, SharedValidTime } from "./types";
import {
  assertS0JsonValue,
  compareUnicodeCodePoints,
  exactKeys,
  exactString,
  exactText,
  fail,
  immutableClone,
  jsonEqual,
  objectValue,
  sortByStableId,
  validateTemporalValue3785,
} from "./validation";
import { validateSpatialObservation } from "./observation";

type TemporalPrecision = "date" | "date_time";

interface TemporalBounds {
  start: TemporalEndpoint | null;
  end: TemporalEndpoint | null;
}

function temporalPrecision(value: TemporalValue): TemporalPrecision {
  if (value.kind === "date" || value.kind === "date_time") {
    return value.kind;
  }
  const endpoint = value.start ?? value.end;
  if (endpoint === null) {
    fail("$sharedValidTime", "validated interval has no temporal precision");
  }
  return endpoint.kind;
}

function temporalBounds(value: TemporalValue): TemporalBounds {
  if (value.kind === "interval") {
    return {
      start: value.start === null ? null : { ...value.start },
      end: value.end === null ? null : { ...value.end },
    };
  }
  const endpoint: TemporalEndpoint = { ...value, inclusive: true };
  return { start: endpoint, end: endpoint };
}

function lexicallySmaller(left: string, right: string): string {
  return compareUnicodeCodePoints(left, right) <= 0 ? left : right;
}

function equalEndpoint(
  left: TemporalEndpoint,
  right: TemporalEndpoint,
): TemporalEndpoint {
  if (left.kind !== right.kind) {
    fail("$sharedValidTime", "equal endpoints must use one temporal precision");
  }
  return {
    kind: left.kind,
    value: lexicallySmaller(left.value, right.value),
    inclusive: left.inclusive && right.inclusive,
  } as TemporalEndpoint;
}

function laterStart(
  left: TemporalEndpoint | null,
  right: TemporalEndpoint | null,
): TemporalEndpoint | null {
  if (left === null) {
    return right === null ? null : { ...right };
  }
  if (right === null) {
    return { ...left };
  }
  const comparison = compareTemporalPoints(left, right);
  if (comparison === null) {
    fail("$sharedValidTime", "start endpoints have mixed precision");
  }
  if (comparison === 0) {
    return equalEndpoint(left, right);
  }
  return comparison > 0 ? { ...left } : { ...right };
}

function earlierEnd(
  left: TemporalEndpoint | null,
  right: TemporalEndpoint | null,
): TemporalEndpoint | null {
  if (left === null) {
    return right === null ? null : { ...right };
  }
  if (right === null) {
    return { ...left };
  }
  const comparison = compareTemporalPoints(left, right);
  if (comparison === null) {
    fail("$sharedValidTime", "end endpoints have mixed precision");
  }
  if (comparison === 0) {
    return equalEndpoint(left, right);
  }
  return comparison < 0 ? { ...left } : { ...right };
}

function factReference(
  observation: ImmutableSpatialObservation,
): FactReference {
  const fact = observation.factManifest.validTimeFact;
  return { factId: fact.factId, factDigest: fact.factDigest };
}

function sharedFactReferences(
  subject: ImmutableSpatialObservation,
  object: ImmutableSpatialObservation,
): readonly FactReference[] {
  const references = sortByStableId(
    [factReference(subject), factReference(object)],
    (reference) => reference.factId,
  );
  if (references[0]?.factId === references[1]?.factId) {
    fail(
      "$sharedValidTime.factReferences",
      "subject and object valid-time facts must be unique",
    );
  }
  return immutableClone(references);
}

function overlapValue(
  left: TemporalValue,
  right: TemporalValue,
): TemporalValue | null {
  const leftBounds = temporalBounds(left);
  const rightBounds = temporalBounds(right);
  const start = laterStart(leftBounds.start, rightBounds.start);
  const end = earlierEnd(leftBounds.end, rightBounds.end);

  if (start !== null && end !== null) {
    const comparison = compareTemporalPoints(start, end);
    if (comparison === null) {
      fail("$sharedValidTime", "intersection endpoints have mixed precision");
    }
    if (
      comparison > 0 ||
      (comparison === 0 && !(start.inclusive && end.inclusive))
    ) {
      return null;
    }
    if (comparison === 0) {
      const point: TemporalPoint = {
        kind: start.kind,
        value: lexicallySmaller(start.value, end.value),
      } as TemporalPoint;
      return point;
    }
  }

  return { kind: "interval", start, end };
}

export function deriveSharedValidTime(
  subjectInput: ImmutableSpatialObservation,
  objectInput: ImmutableSpatialObservation,
): DeepReadonly<SharedValidTime> {
  const subject = validateSpatialObservation(subjectInput, "$subject");
  const object = validateSpatialObservation(objectInput, "$object");
  const factReferences = sharedFactReferences(subject, object);
  const subjectValue = subject.validTime.value as TemporalValue;
  const objectValue = object.validTime.value as TemporalValue;

  if (temporalPrecision(subjectValue) !== temporalPrecision(objectValue)) {
    return immutableClone<SharedValidTime>({
      state: "indeterminate",
      reason: "mixed_precision",
      factReferences,
    });
  }

  const value = overlapValue(subjectValue, objectValue);
  if (value === null) {
    return immutableClone<SharedValidTime>({
      state: "disjoint",
      factReferences,
    });
  }

  return immutableClone<SharedValidTime>({
    state: "overlap",
    value: validateTemporalValue3785(value, "$sharedValidTime.value"),
    factReferences,
  });
}

export function inspectSharedValidTime(
  value: unknown,
  path = "$",
): DeepReadonly<SharedValidTime> {
  const structured = inspectSharedValidTimeStructure(value, path);
  const factReferences = validateFactReferences(
    structured.factReferences,
    2,
    `${path}.factReferences`,
  );
  if (structured.state === "overlap") {
    return immutableClone<SharedValidTime>({
      ...structured,
      factReferences,
    });
  }
  if (structured.state === "indeterminate") {
    return immutableClone<SharedValidTime>({
      ...structured,
      factReferences,
    });
  }
  return immutableClone<SharedValidTime>({
    ...structured,
    factReferences,
  });
}

function inspectFactReferenceStructure(
  value: unknown,
  path: string,
): FactReference {
  const reference = validateFactReference(value, path);
  return {
    factId: reference.factId,
    factDigest: reference.factDigest,
  };
}

function temporalLexicalYear(value: unknown, path: string): string {
  const text = exactText(value, path);
  if (!text.startsWith("3785-")) {
    fail(path, "temporal lexical year must be 3785");
  }
  return text;
}

function inspectTemporalEndpointStructure(
  value: unknown,
  path: string,
): TemporalEndpoint {
  const object = objectValue(value, path);
  exactKeys(object, path, ["kind", "value", "inclusive"]);
  if (object.kind !== "date" && object.kind !== "date_time") {
    fail(`${path}.kind`, "expected date or date_time");
  }
  const temporalValue = temporalLexicalYear(object.value, `${path}.value`);
  if (typeof object.inclusive !== "boolean") {
    fail(`${path}.inclusive`, "expected a boolean");
  }
  return {
    kind: object.kind,
    value: temporalValue,
    inclusive: object.inclusive,
  } as TemporalEndpoint;
}

function inspectTemporalValueStructure(
  value: unknown,
  path: string,
): TemporalValue {
  const object = objectValue(value, path);
  if (object.kind === "date" || object.kind === "date_time") {
    exactKeys(object, path, ["kind", "value"]);
    return {
      kind: object.kind,
      value: temporalLexicalYear(object.value, `${path}.value`),
    } as TemporalPoint;
  }
  exactString(object.kind, "interval", `${path}.kind`);
  exactKeys(object, path, ["kind", "start", "end"]);
  return {
    kind: "interval",
    start:
      object.start === null
        ? null
        : inspectTemporalEndpointStructure(object.start, `${path}.start`),
    end:
      object.end === null
        ? null
        : inspectTemporalEndpointStructure(object.end, `${path}.end`),
  };
}

export function inspectSharedValidTimeStructure(
  value: unknown,
  path = "$",
): DeepReadonly<SharedValidTime> {
  assertS0JsonValue(value);
  const object = objectValue(value, path);
  if (!Array.isArray(object.factReferences)) {
    fail(`${path}.factReferences`, "expected exactly two fact references");
  }
  if (object.factReferences.length !== 2) {
    fail(`${path}.factReferences`, "expected exactly two fact references");
  }
  const factReferences = object.factReferences.map((reference, index) =>
    inspectFactReferenceStructure(
      reference,
      `${path}.factReferences[${index}]`,
    ),
  );

  if (object.state === "overlap") {
    exactKeys(object, path, ["state", "value", "factReferences"]);
    return immutableClone<SharedValidTime>({
      state: "overlap",
      value: inspectTemporalValueStructure(object.value, `${path}.value`),
      factReferences,
    });
  }
  if (object.state === "indeterminate") {
    exactKeys(object, path, ["state", "reason", "factReferences"]);
    exactString(object.reason, "mixed_precision", `${path}.reason`);
    return immutableClone<SharedValidTime>({
      state: "indeterminate",
      reason: "mixed_precision",
      factReferences,
    });
  }
  exactKeys(object, path, ["state", "factReferences"]);
  exactString(object.state, "disjoint", `${path}.state`);
  return immutableClone<SharedValidTime>({
    state: "disjoint",
    factReferences,
  });
}

export function validateSharedValidTime(
  value: unknown,
  subject: ImmutableSpatialObservation,
  object: ImmutableSpatialObservation,
  path = "$",
): DeepReadonly<SharedValidTime> {
  const supplied = inspectSharedValidTime(value, path);
  const expected = deriveSharedValidTime(subject, object);
  if (!jsonEqual(supplied, expected)) {
    fail(path, "does not match the exact shared valid-time derivation");
  }
  return expected;
}
