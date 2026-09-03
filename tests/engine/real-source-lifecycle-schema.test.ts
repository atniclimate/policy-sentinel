import { createHash } from "node:crypto";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import candidateFixture from "../../fixtures/engine/real-source-lifecycle.candidate.valid.json";
import malformedFixture from "../../fixtures/engine/real-source-lifecycle-malformed.invalid.json";
import schema from "../../schemas/real-source-lifecycle-bundle.schema.v1.json";
import {
  REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_ID,
  REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_VERSION,
} from "../../src/engine/real-source-lifecycle-contracts";
import {
  RealSourceLifecycleValidationError,
  parseRealSourceLifecycleBundle,
} from "../../src/engine/real-source-lifecycle";

type Mutation = {
  operation: "add" | "remove" | "replace";
  path: string;
  value?: unknown;
};

type MalformedCase = {
  id: string;
  expectedLayer: "schema" | "semantic";
  expectedCode: string;
  mutations: Mutation[];
};

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
    .join(",")}}`;
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function pointerParts(pointer: string): string[] {
  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function applyMutations(
  base: unknown,
  mutations: readonly Mutation[],
): unknown {
  const result = structuredClone(base) as Record<string, unknown>;
  for (const mutation of mutations) {
    const parts = pointerParts(mutation.path);
    const final = parts.pop()!;
    let parent: unknown = result;
    for (const part of parts) {
      parent = Array.isArray(parent)
        ? parent[Number(part)]
        : (parent as Record<string, unknown>)[part];
    }
    if (mutation.operation === "remove") {
      if (Array.isArray(parent)) {
        parent.splice(Number(final), 1);
      } else {
        delete (parent as Record<string, unknown>)[final];
      }
    } else {
      (parent as Record<string, unknown>)[final] = structuredClone(
        mutation.value,
      );
    }
  }
  return result;
}

function refreshBundleDigest(candidate: typeof candidateFixture): void {
  const payload = structuredClone(candidate) as Record<string, unknown>;
  delete payload.contentDigest;
  candidate.contentDigest = digest(payload);
}

function refreshScopeDigest(candidate: typeof candidateFixture): void {
  const payload = structuredClone(candidate.scope) as Record<string, unknown>;
  delete payload.contentDigest;
  candidate.scope.contentDigest = digest(payload);
  for (const receipt of [
    ...candidate.authorityReceipts,
    ...candidate.evidenceReceipts,
  ]) {
    receipt.scopeRef.contentDigest = candidate.scope.contentDigest;
  }
}

function prepareSemanticCase(
  fixtureCase: MalformedCase,
  value: unknown,
): unknown {
  const candidate = value as typeof candidateFixture;
  if (fixtureCase.id === "request-byte-ceiling-widening") {
    const requestPayload = structuredClone(
      candidate.scope.requestPlan,
    ) as Record<string, unknown>;
    delete requestPayload.digest;
    candidate.scope.requestPlan.digest = digest(requestPayload);
  }
  if (
    [
      "authority-set-forgery",
      "request-byte-ceiling-widening",
      "source-registry-entry-digest-forgery",
      "synthetic-source-substitution",
    ].includes(fixtureCase.id)
  ) {
    refreshScopeDigest(candidate);
  }
  refreshBundleDigest(candidate);
  return candidate;
}

function capture(run: () => unknown): RealSourceLifecycleValidationError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(RealSourceLifecycleValidationError);
    return error as RealSourceLifecycleValidationError;
  }
  throw new Error("malformed lifecycle fixture was accepted");
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const malformedCases = malformedFixture.cases as MalformedCase[];

describe("real-source lifecycle schema", () => {
  it("compiles strictly and pins the candidate schema identity", () => {
    expect(ajv.validateSchema(schema)).toBe(true);
    expect(schema.$id).toBe(REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_ID);
    expect(schema.properties.schemaVersion.const).toBe(
      REAL_SOURCE_LIFECYCLE_BUNDLE_SCHEMA_VERSION,
    );
    expect(validate(candidateFixture), ajv.errorsText(validate.errors)).toBe(
      true,
    );
    expect(() =>
      parseRealSourceLifecycleBundle(candidateFixture),
    ).not.toThrow();
  });

  it("pins a finite malformed inventory", () => {
    expect(malformedFixture.fixtureFamilyVersion).toBe("1.0.0");
    expect(malformedCases).toHaveLength(23);
    expect(new Set(malformedCases.map(({ id }) => id)).size).toBe(23);
  });

  it("closes unknown-kind and limitation-code combinations in both layers", () => {
    const laundering = structuredClone(candidateFixture);
    laundering.evidenceReceipts[2]!.limitationCode = "fail_closed_on_drift";
    expect(validate(laundering), ajv.errorsText(validate.errors)).toBe(false);
    refreshBundleDigest(laundering);
    expect(capture(() => parseRealSourceLifecycleBundle(laundering)).code).toBe(
      "UNKNOWN_LIMITATION_MISMATCH",
    );
  });

  it("makes every applicable source-review question mandatory and digest-bound", () => {
    const questions = candidateFixture.scope.unknownChecklist.requiredQuestions;
    expect(questions).toHaveLength(23);
    expect(questions).toEqual(
      expect.arrayContaining([
        "api_specific_terms.polling",
        "api_specific_terms.cache_rules",
        "api_specific_terms.bulk_access",
        "api_specific_terms.redistribution",
        "api_specific_terms.attribution",
        "api_specific_terms.clickthrough",
        "numeric_rate_limit.numeric_quota",
        "numeric_rate_limit.concurrency_limit",
        "paging_stability.cursor_stability",
        "snapshot_stability.total_consistency",
        "retry_backoff.backoff_rules",
        "formal_response_error_schema.error_schema",
        "service_level.timeout_promises",
        "service_level.incident_response",
        "service_level.indexing_latency",
        "change_notice.deprecation_notice",
      ]),
    );
    for (let index = 0; index < questions.length; index += 1) {
      const omitted = structuredClone(candidateFixture);
      omitted.scope.unknownChecklist.requiredQuestions.splice(index, 1);
      expect(validate(omitted), `question index ${index}`).toBe(false);
      refreshBundleDigest(omitted);
      expect(capture(() => parseRealSourceLifecycleBundle(omitted)).code).toBe(
        "INVALID_BOUNDS",
      );
    }
  });

  it.each(malformedCases)("fails closed for $id", (fixtureCase) => {
    const mutated = applyMutations(candidateFixture, fixtureCase.mutations);
    const schemaAccepted = validate(mutated);
    if (fixtureCase.expectedLayer === "schema") {
      expect(schemaAccepted, ajv.errorsText(validate.errors)).toBe(false);
      if (
        fixtureCase.id !== "malformed-bundle-digest" &&
        typeof (mutated as typeof candidateFixture).contentDigest === "string"
      ) {
        refreshBundleDigest(mutated as typeof candidateFixture);
      }
      const error = capture(() => parseRealSourceLifecycleBundle(mutated));
      expect(error.code).toBe(fixtureCase.expectedCode);
      return;
    }

    expect(schemaAccepted, ajv.errorsText(validate.errors)).toBe(true);
    const prepared = prepareSemanticCase(fixtureCase, mutated);
    const error = capture(() => parseRealSourceLifecycleBundle(prepared));
    expect(error.code).toBe(fixtureCase.expectedCode);
  });
});
