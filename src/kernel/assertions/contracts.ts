import {
  CANONICALIZATION_VERSION,
  assertJsonValue,
  assertSortedUniqueStrings,
  canonicalJsonDigest,
  immutableCanonicalClone,
  type DeepReadonly,
  type JsonValue,
} from "./canonical-json";
import {
  createFactId,
  validateSha256Hex,
  validateSourceProvenance,
  validateSourceQualifiedIdentity,
  type SourceProvenance,
  type SourceQualifiedIdentity,
} from "./identity";
import { validateTemporalValue, type TemporalValue } from "./temporal";
import { IntegrityReplayError } from "./integrity";

export interface FactReference {
  factId: string;
  factDigest: string;
}

export interface SupportedEvidence {
  state: "supported";
  factReferences: readonly FactReference[];
}

export interface UnknownEvidence {
  state: "unknown";
  reason: "not_supplied" | "not_observed";
  factReferences: readonly [];
}

export interface InsufficientEvidence {
  state: "insufficient_evidence";
  factReferences: readonly FactReference[];
}

export interface AmbiguousEvidence {
  state: "ambiguous_evidence";
  factReferences: readonly FactReference[];
}

export interface ConflictingEvidence {
  state: "conflicting_evidence";
  factReferences: readonly FactReference[];
}

export type EvidenceState =
  | SupportedEvidence
  | UnknownEvidence
  | InsufficientEvidence
  | AmbiguousEvidence
  | ConflictingEvidence;

export interface SupportedTemporalAssertion {
  evidence: SupportedEvidence;
  value: TemporalValue;
}

export interface UnsupportedTemporalAssertion {
  evidence: Exclude<EvidenceState, SupportedEvidence>;
}

export type TemporalAssertion =
  SupportedTemporalAssertion | UnsupportedTemporalAssertion;

export interface DerivedAssertion {
  contractVersion: "1.0.0";
  assertionId: string;
  assertionClass: string;
  inputFactIds: readonly string[];
  inputFactDigests: readonly string[];
  ruleId: string;
  ruleVersion: string;
  canonicalizationVersion: typeof CANONICALIZATION_VERSION;
  resultDigest: string;
  evidence: EvidenceState;
  validationState: "validated";
}

export const SOURCE_FACT_PREDICATE_KINDS = {
  instrument_identifier: ["identifier"],
  instrument_title: ["text"],
  rendition_identifier: ["identifier"],
  rendition_digest: ["sha256_digest"],
  event_identifier: ["identifier"],
  event_label: ["text"],
  actor_label: ["text"],
  source_status_label: ["text"],
  observed_time: ["date", "date_time", "interval"],
  published_time: ["date", "date_time", "interval"],
  effective_time: ["date", "date_time", "interval"],
  valid_time: ["date", "date_time", "interval"],
  status_as_of: ["date", "date_time"],
  relationship_label: ["text"],
  equivalence_label: ["text"],
} as const;

export type SourceFactPredicate = keyof typeof SOURCE_FACT_PREDICATE_KINDS;

export interface TextFactValue {
  kind: "text";
  value: string;
}

export interface IdentifierFactValue {
  kind: "identifier";
  value: string;
}

export interface Sha256DigestFactValue {
  kind: "sha256_digest";
  value: string;
}

export type SourceFactValue =
  TextFactValue | IdentifierFactValue | Sha256DigestFactValue | TemporalValue;

export interface SourceFact {
  contractVersion: "1.0.0";
  factId: string;
  assertionClass: "source_fact";
  sourceIdentity: SourceQualifiedIdentity;
  predicate: SourceFactPredicate;
  value: SourceFactValue;
  provenance: SourceProvenance;
  factDigest: string;
}

export type SourceFactInput = Omit<
  SourceFact,
  "contractVersion" | "factId" | "assertionClass" | "factDigest"
>;

type JsonObject = Record<string, unknown>;

const FACT_ID_PATTERN =
  /^k0:fact:[a-z0-9]+(?:-[a-z0-9]+)*:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[a-z_]+:[a-f0-9]{64}$/;
const DERIVED_ASSERTION_ID_PATTERN = /^k0:[a-z][a-z0-9_]*:[A-Za-z0-9._~:-]+$/;
const ASSERTION_CLASS_PATTERN = /^[a-z][a-z0-9_]*$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMANTIC_VERSION_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

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

function exactText(value: unknown, path: string): string {
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

function exactFactId(value: unknown, path: string): string {
  const factId = exactText(value, path);
  if (!FACT_ID_PATTERN.test(factId)) {
    fail(path, "expected an exact K0 fact ID");
  }
  return factId;
}

function validateFactReferenceMutable(
  value: unknown,
  path: string,
): FactReference {
  const object = objectValue(value, path);
  exactKeys(object, path, ["factId", "factDigest"]);
  const factId = exactFactId(object.factId, `${path}.factId`);
  return {
    factId,
    factDigest: validateSha256Hex(object.factDigest, `${path}.factDigest`),
  };
}

export function validateFactReference(
  value: unknown,
  path = "$",
): DeepReadonly<FactReference> {
  assertJsonValue(value);
  return immutableCanonicalClone(
    validateFactReferenceMutable(value, path) as unknown as JsonValue,
  ) as DeepReadonly<FactReference>;
}

function validateFactReferencesMutable(
  value: unknown,
  path: string,
  minimum: number,
): FactReference[] {
  if (!Array.isArray(value)) {
    fail(path, "expected a fact-reference array");
  }
  if (value.length < minimum) {
    fail(path, `expected at least ${minimum} fact reference(s)`);
  }
  const references = value.map((entry, index) =>
    validateFactReferenceMutable(entry, `${path}[${index}]`),
  );
  assertSortedUniqueStrings(
    references.map((reference) => reference.factId),
    path,
  );
  return references;
}

export function validateFactReferences(
  value: unknown,
  minimum = 0,
  path = "$",
): readonly DeepReadonly<FactReference>[] {
  assertJsonValue(value);
  return immutableCanonicalClone(
    validateFactReferencesMutable(value, path, minimum) as unknown as JsonValue,
  ) as readonly DeepReadonly<FactReference>[];
}

function validateEvidenceStateMutable(
  value: unknown,
  path: string,
): EvidenceState {
  const object = objectValue(value, path);
  if (object.state === "unknown") {
    exactKeys(object, path, ["state", "reason", "factReferences"]);
    if (object.reason !== "not_supplied" && object.reason !== "not_observed") {
      fail(`${path}.reason`, "expected not_supplied or not_observed");
    }
    const factReferences = validateFactReferencesMutable(
      object.factReferences,
      `${path}.factReferences`,
      0,
    );
    if (factReferences.length !== 0) {
      fail(`${path}.factReferences`, "unknown evidence cannot cite facts");
    }
    return { state: "unknown", reason: object.reason, factReferences: [] };
  }

  exactKeys(object, path, ["state", "factReferences"]);
  if (
    object.state !== "supported" &&
    object.state !== "insufficient_evidence" &&
    object.state !== "ambiguous_evidence" &&
    object.state !== "conflicting_evidence"
  ) {
    fail(`${path}.state`, "expected a frozen evidence state");
  }
  const minimum = object.state === "conflicting_evidence" ? 2 : 1;
  const factReferences = validateFactReferencesMutable(
    object.factReferences,
    `${path}.factReferences`,
    minimum,
  );
  return { state: object.state, factReferences };
}

export function validateEvidenceState(
  value: unknown,
  path = "$",
): DeepReadonly<EvidenceState> {
  assertJsonValue(value);
  return immutableCanonicalClone(
    validateEvidenceStateMutable(value, path) as unknown as JsonValue,
  ) as DeepReadonly<EvidenceState>;
}

export function validateEvidenceReferences(
  evidence: unknown,
  facts: readonly unknown[],
): void {
  const validatedEvidence = validateEvidenceState(evidence);
  const factIndex = new Map<string, SourceFact>();
  for (const fact of facts) {
    const validatedFact = validateSourceFact(fact);
    if (factIndex.has(validatedFact.factId)) {
      fail("$facts", `duplicate fact ID ${validatedFact.factId}`);
    }
    factIndex.set(validatedFact.factId, validatedFact as SourceFact);
  }
  for (const reference of validatedEvidence.factReferences) {
    const fact = factIndex.get(reference.factId);
    if (fact === undefined) {
      fail("$evidence.factReferences", `unknown fact ID ${reference.factId}`);
    }
    if (fact.factDigest !== reference.factDigest) {
      fail(
        "$evidence.factReferences",
        `fact digest does not match ${reference.factId}`,
      );
    }
  }
}

export function validateTemporalAssertion(
  value: unknown,
  path = "$",
): DeepReadonly<TemporalAssertion> {
  assertJsonValue(value);
  const object = objectValue(value, path);
  const evidence = validateEvidenceStateMutable(
    object.evidence,
    `${path}.evidence`,
  );
  if (evidence.state === "supported") {
    exactKeys(object, path, ["evidence", "value"]);
    if (object.value === null || object.value === undefined) {
      fail(`${path}.value`, "supported temporal evidence requires a value");
    }
    return immutableCanonicalClone({
      evidence,
      value: validateTemporalValue(object.value, `${path}.value`),
    } as unknown as JsonValue) as DeepReadonly<TemporalAssertion>;
  }
  exactKeys(object, path, ["evidence"]);
  return immutableCanonicalClone({
    evidence,
  } as unknown as JsonValue) as DeepReadonly<TemporalAssertion>;
}

export function validateDerivedAssertion(
  value: unknown,
  path = "$",
): DeepReadonly<DerivedAssertion> {
  assertJsonValue(value);
  const object = objectValue(value, path);
  exactKeys(object, path, [
    "contractVersion",
    "assertionId",
    "assertionClass",
    "inputFactIds",
    "inputFactDigests",
    "ruleId",
    "ruleVersion",
    "canonicalizationVersion",
    "resultDigest",
    "evidence",
    "validationState",
  ]);
  if (object.contractVersion !== "1.0.0") {
    fail(`${path}.contractVersion`, "expected 1.0.0");
  }
  if (!Array.isArray(object.inputFactIds)) {
    fail(`${path}.inputFactIds`, "expected an array");
  }
  if (!Array.isArray(object.inputFactDigests)) {
    fail(`${path}.inputFactDigests`, "expected an array");
  }
  const inputFactIds = object.inputFactIds.map((entry, index) =>
    exactFactId(entry, `${path}.inputFactIds[${index}]`),
  );
  assertSortedUniqueStrings(inputFactIds, `${path}.inputFactIds`);
  const inputFactDigests = object.inputFactDigests.map((entry, index) =>
    validateSha256Hex(entry, `${path}.inputFactDigests[${index}]`),
  );
  if (inputFactIds.length !== inputFactDigests.length) {
    fail(path, "input fact ID and digest arrays must have equal length");
  }
  if (new Set(inputFactDigests).size !== inputFactDigests.length) {
    fail(`${path}.inputFactDigests`, "input fact digests must be unique");
  }
  if (object.canonicalizationVersion !== CANONICALIZATION_VERSION) {
    fail(
      `${path}.canonicalizationVersion`,
      `expected ${CANONICALIZATION_VERSION}`,
    );
  }
  if (object.validationState !== "validated") {
    fail(`${path}.validationState`, "expected validated");
  }
  const assertionId = exactText(object.assertionId, `${path}.assertionId`);
  if (!DERIVED_ASSERTION_ID_PATTERN.test(assertionId)) {
    fail(`${path}.assertionId`, "expected an exact K0 derived-assertion ID");
  }
  const assertionClass = exactText(
    object.assertionClass,
    `${path}.assertionClass`,
  );
  if (
    !ASSERTION_CLASS_PATTERN.test(assertionClass) ||
    assertionClass === "source_fact"
  ) {
    fail(
      `${path}.assertionClass`,
      "expected a non-source-fact assertion class",
    );
  }
  const ruleId = exactText(object.ruleId, `${path}.ruleId`);
  if (!SLUG_PATTERN.test(ruleId)) {
    fail(`${path}.ruleId`, "expected a lowercase slug");
  }
  const ruleVersion = exactText(object.ruleVersion, `${path}.ruleVersion`);
  if (!SEMANTIC_VERSION_PATTERN.test(ruleVersion)) {
    fail(`${path}.ruleVersion`, "expected a semantic version");
  }
  const evidence = validateEvidenceStateMutable(
    object.evidence,
    `${path}.evidence`,
  );
  const inputFacts = new Map(
    inputFactIds.map((factId, index) => [factId, inputFactDigests[index]!]),
  );
  for (const reference of evidence.factReferences) {
    if (inputFacts.get(reference.factId) !== reference.factDigest) {
      fail(
        path,
        "input facts must include every exact evidence fact reference",
      );
    }
  }
  return immutableCanonicalClone({
    contractVersion: "1.0.0",
    assertionId,
    assertionClass,
    inputFactIds,
    inputFactDigests,
    ruleId,
    ruleVersion,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    resultDigest: validateSha256Hex(
      object.resultDigest,
      `${path}.resultDigest`,
    ),
    evidence,
    validationState: "validated",
  } as unknown as JsonValue) as DeepReadonly<DerivedAssertion>;
}

function validateSourceFactValue(
  predicate: SourceFactPredicate,
  value: unknown,
  path: string,
): SourceFactValue {
  const object = objectValue(value, path);
  if (
    object.kind === "date" ||
    object.kind === "date_time" ||
    object.kind === "interval"
  ) {
    const temporal = validateTemporalValue(object, path) as TemporalValue;
    if (
      !(SOURCE_FACT_PREDICATE_KINDS[predicate] as readonly string[]).includes(
        temporal.kind,
      )
    ) {
      fail(`${path}.kind`, `value kind does not match predicate ${predicate}`);
    }
    return temporal;
  }
  exactKeys(object, path, ["kind", "value"]);
  if (
    object.kind !== "text" &&
    object.kind !== "identifier" &&
    object.kind !== "sha256_digest"
  ) {
    fail(`${path}.kind`, "expected a frozen source-fact value kind");
  }
  if (
    !(SOURCE_FACT_PREDICATE_KINDS[predicate] as readonly string[]).includes(
      object.kind,
    )
  ) {
    fail(`${path}.kind`, `value kind does not match predicate ${predicate}`);
  }
  if (object.kind === "sha256_digest") {
    return {
      kind: "sha256_digest",
      value: validateSha256Hex(object.value, `${path}.value`),
    };
  }
  return { kind: object.kind, value: exactText(object.value, `${path}.value`) };
}

function validatePredicate(value: unknown, path: string): SourceFactPredicate {
  if (
    typeof value !== "string" ||
    !Object.hasOwn(SOURCE_FACT_PREDICATE_KINDS, value)
  ) {
    fail(path, "expected an allowlisted source-fact predicate");
  }
  return value as SourceFactPredicate;
}

function sourceFactWithoutDigest(
  fact: Omit<SourceFact, "factDigest">,
): JsonValue {
  return fact as unknown as JsonValue;
}

export function createSourceFact(
  input: SourceFactInput,
): DeepReadonly<SourceFact> {
  assertJsonValue(input);
  const object = objectValue(input, "$createSourceFact");
  exactKeys(object, "$createSourceFact", [
    "sourceIdentity",
    "predicate",
    "value",
    "provenance",
  ]);
  const sourceIdentity = validateSourceQualifiedIdentity(
    object.sourceIdentity,
    "$.sourceIdentity",
  );
  const provenance = validateSourceProvenance(
    object.provenance,
    "$.provenance",
  );
  if (
    provenance.sourceIdentity.sourceId !== sourceIdentity.sourceId ||
    provenance.sourceIdentity.sourceRecordId !== sourceIdentity.sourceRecordId
  ) {
    fail(
      "$.provenance.sourceIdentity",
      "must match the fact source-qualified identity",
    );
  }
  const predicate = validatePredicate(object.predicate, "$.predicate");
  const value = validateSourceFactValue(predicate, object.value, "$.value");
  const factId = createFactId(
    sourceIdentity,
    provenance.sourcePath,
    predicate,
    provenance.sourceContentDigest,
  );
  const factWithoutDigest: Omit<SourceFact, "factDigest"> = {
    contractVersion: "1.0.0",
    factId,
    assertionClass: "source_fact",
    sourceIdentity: sourceIdentity as SourceQualifiedIdentity,
    predicate,
    value,
    provenance: provenance as SourceProvenance,
  };
  return immutableCanonicalClone({
    ...factWithoutDigest,
    factDigest: canonicalJsonDigest(sourceFactWithoutDigest(factWithoutDigest)),
  } as unknown as JsonValue) as DeepReadonly<SourceFact>;
}

export function validateSourceFact(
  value: unknown,
  path = "$",
): DeepReadonly<SourceFact> {
  assertJsonValue(value);
  const object = objectValue(value, path);
  exactKeys(object, path, [
    "contractVersion",
    "factId",
    "assertionClass",
    "sourceIdentity",
    "predicate",
    "value",
    "provenance",
    "factDigest",
  ]);
  if (object.contractVersion !== "1.0.0") {
    fail(`${path}.contractVersion`, "expected 1.0.0");
  }
  if (object.assertionClass !== "source_fact") {
    fail(`${path}.assertionClass`, "expected source_fact");
  }
  const expected = createSourceFact({
    sourceIdentity: validateSourceQualifiedIdentity(
      object.sourceIdentity,
      `${path}.sourceIdentity`,
    ) as SourceQualifiedIdentity,
    predicate: validatePredicate(object.predicate, `${path}.predicate`),
    value: object.value as SourceFactValue,
    provenance: validateSourceProvenance(
      object.provenance,
      `${path}.provenance`,
    ) as SourceProvenance,
  });
  if (object.factId !== expected.factId) {
    fail(
      `${path}.factId`,
      "does not match the stable source-qualified fact ID",
    );
  }
  if (object.factDigest !== expected.factDigest) {
    throw new IntegrityReplayError(
      "fact_digest_mismatch",
      `${path}.factDigest`,
      "does not match the canonical fact digest",
    );
  }
  return expected;
}
