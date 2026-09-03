import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import candidateFixture from "../../fixtures/engine/real-source-lifecycle.candidate.valid.json";
import {
  REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS,
  type RealSourceLifecycleEvaluationRequest,
} from "../../src/engine/real-source-lifecycle-contracts";
import {
  RealSourceLifecycleValidationError,
  assertRealSourceLifecycleCompatibility,
  evaluateRealSourceLifecycle,
  parseRealSourceLifecycleBundle,
  serializeRealSourceLifecycleBundle,
  serializeRealSourceLifecycleEvaluation,
} from "../../src/engine/real-source-lifecycle";

const projectRoot = resolve(import.meta.dirname, "../..");
const lifecyclePaths = [
  "src/engine/real-source-lifecycle-contracts.ts",
  "src/engine/real-source-lifecycle.ts",
] as const;

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

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

function capture(run: () => unknown): RealSourceLifecycleValidationError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(RealSourceLifecycleValidationError);
    return error as RealSourceLifecycleValidationError;
  }
  throw new Error("hostile non-JSON lifecycle input was accepted");
}

function forbiddenModuleEdges(source: string): string[] {
  const file = ts.createSourceFile(
    "real-source-lifecycle.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const edges: string[] = [];
  const forbidden = [
    "/app/",
    "/adapters/",
    "/pipeline/",
    "/kernel/",
    "/experimental/",
    "k0",
    "s0",
    "o0",
    "preact",
    "node:",
  ];
  const inspect = (specifier: string) => {
    const normalized = specifier.toLowerCase().replaceAll("\\", "/");
    if (forbidden.some((part) => normalized.includes(part))) {
      edges.push(specifier);
    }
  };
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      inspect(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0]!) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      inspect(node.arguments[0]!.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return edges;
}

function candidateRequest(): RealSourceLifecycleEvaluationRequest {
  return {
    expectedScope: structuredClone(
      candidateFixture.scope,
    ) as unknown as RealSourceLifecycleEvaluationRequest["expectedScope"],
    expectedBundleContentDigest: candidateFixture.contentDigest,
    requestedOperation: "acquisition",
    asOf: "2026-09-03T12:00:00Z",
    currentAttempt: "not_attempted",
    currentRevisionRef: null,
    requestedLkgRef: null,
  };
}

describe("real-source lifecycle non-interference", () => {
  it("has no network, clock, timer, adapter, pipeline, or platform edge", () => {
    const prohibitedTokens = [
      "fetch(",
      "XMLHttpRequest",
      "WebSocket",
      "EventSource",
      "sendBeacon",
      "process.env",
      "console.",
      "setTimeout",
      "setInterval",
      "Date.now",
      "new Date()",
      "localeCompare",
    ];
    for (const path of lifecyclePaths) {
      const source = readFileSync(resolve(projectRoot, path), "utf8");
      expect(forbiddenModuleEdges(source), path).toEqual([]);
      expect(
        prohibitedTokens.filter((token) => source.includes(token)),
        path,
      ).toEqual([]);
    }

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    try {
      evaluateRealSourceLifecycle(candidateFixture, candidateRequest());
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects hidden or non-canonical JavaScript state before serialization", () => {
    const hostileValues: unknown[] = [];

    const customArrayProperty = structuredClone(candidateFixture);
    Object.defineProperty(customArrayProperty.authorityReceipts, "hidden", {
      enumerable: true,
      configurable: true,
      value: "unserialized",
    });
    hostileValues.push(customArrayProperty);

    const sparseArray = structuredClone(candidateFixture);
    delete sparseArray.evidenceReceipts[0];
    hostileValues.push(sparseArray);

    const symbolProperty = structuredClone(candidateFixture) as object;
    Object.defineProperty(symbolProperty, Symbol("hidden"), {
      enumerable: true,
      value: "unserialized",
    });
    hostileValues.push(symbolProperty);

    const accessor = structuredClone(candidateFixture) as object;
    Object.defineProperty(accessor, "contentDigest", {
      enumerable: true,
      configurable: true,
      get: () => candidateFixture.contentDigest,
    });
    hostileValues.push(accessor);

    const customPrototype = structuredClone(candidateFixture) as object;
    Object.setPrototypeOf(customPrototype, { injected: true });
    hostileValues.push(customPrototype);

    const cyclic = structuredClone(candidateFixture) as Record<string, unknown>;
    cyclic.cycle = cyclic;
    hostileValues.push(cyclic);

    const nonFinite = structuredClone(candidateFixture) as Record<
      string,
      unknown
    >;
    nonFinite.version = Number.POSITIVE_INFINITY;
    hostileValues.push(nonFinite);

    const negativeZero = structuredClone(candidateFixture);
    negativeZero.scope.selectedRange.memberCount = -0;
    hostileValues.push(negativeZero);

    for (const value of hostileValues) {
      expect(capture(() => parseRealSourceLifecycleBundle(value)).code).toBe(
        "INVALID_JSON",
      );
    }
  });

  it("parses one detached descriptor snapshot before digest and graph validation", () => {
    const changingRootTarget = structuredClone(candidateFixture);
    let lifecycleReads = 0;
    const changingRoot = new Proxy(changingRootTarget, {
      get(target, key, receiver) {
        if (key === "lifecycleState") {
          lifecycleReads += 1;
          return lifecycleReads === 1 ? target.lifecycleState : "candidate";
        }
        return Reflect.get(target, key, receiver);
      },
    });

    const parsed = parseRealSourceLifecycleBundle(changingRoot);
    expect(lifecycleReads).toBe(0);
    expect(parsed.lifecycleState).toBe("evidence_blocked");
    const parsedBytes = serializeRealSourceLifecycleBundle(parsed);
    expect(JSON.parse(parsedBytes)).toEqual(parsed);
    expect(
      JSON.parse(serializeRealSourceLifecycleBundle(changingRoot as never)),
    ).toEqual(parsed);

    const nestedTarget = structuredClone(candidateFixture);
    const originalScope = nestedTarget.scope;
    let nestedReads = 0;
    nestedTarget.scope = new Proxy(originalScope, {
      get(target, key, receiver) {
        if (key === "authoritySetDigest") {
          nestedReads += 1;
          return nestedReads === 1 ? target.authoritySetDigest : "a".repeat(64);
        }
        return Reflect.get(target, key, receiver);
      },
    });
    const nestedParsed = parseRealSourceLifecycleBundle(nestedTarget);
    expect(nestedReads).toBe(0);
    expect(nestedParsed.scope.authoritySetDigest).toBe(
      candidateFixture.scope.authoritySetDigest,
    );
    expect(() =>
      serializeRealSourceLifecycleBundle(nestedParsed),
    ).not.toThrow();
  });

  it("snapshots every public input boundary instead of consulting Proxy getters", () => {
    const expectedScopeTarget = structuredClone(candidateFixture.scope);
    let expectedScopeReads = 0;
    const expectedScope = new Proxy(expectedScopeTarget, {
      get(target, key, receiver) {
        if (key === "authoritySetDigest") {
          expectedScopeReads += 1;
          return expectedScopeReads === 1
            ? target.authoritySetDigest
            : "b".repeat(64);
        }
        return Reflect.get(target, key, receiver);
      },
    });
    const compatible = assertRealSourceLifecycleCompatibility(
      candidateFixture,
      expectedScope,
      candidateFixture.contentDigest,
    );
    expect(expectedScopeReads).toBe(0);
    expect(compatible.scope).toEqual(candidateFixture.scope);

    const requestTarget = candidateRequest();
    let requestReads = 0;
    const requestProxy = new Proxy(requestTarget, {
      get(target, key, receiver) {
        if (key === "currentAttempt") {
          requestReads += 1;
          return "successful";
        }
        return Reflect.get(target, key, receiver);
      },
    });
    const evaluation = evaluateRealSourceLifecycle(
      candidateFixture,
      requestProxy,
    );
    expect(requestReads).toBe(0);
    expect(evaluation.canExecute).toBe(false);

    let evaluationReads = 0;
    const evaluationProxy = new Proxy(evaluation, {
      get(target, key, receiver) {
        if (key === "canPublish") {
          evaluationReads += 1;
          return Symbol("unserializable-second-state");
        }
        return Reflect.get(target, key, receiver);
      },
    });
    const evaluationBytes =
      serializeRealSourceLifecycleEvaluation(evaluationProxy);
    expect(evaluationReads).toBe(0);
    expect(JSON.parse(evaluationBytes).canPublish).toBe(false);
  });

  it("sanitizes throwing, nested, and revoked Proxy snapshots", () => {
    const throwing = new Proxy(structuredClone(candidateFixture), {
      ownKeys() {
        throw new Error("sensitive throwing Proxy detail");
      },
    });
    const attackerValidationError = new Proxy(
      structuredClone(candidateFixture),
      {
        ownKeys() {
          throw new RealSourceLifecycleValidationError(
            "ATTACKER_CODE",
            "/sensitive",
            "sensitive attacker detail",
          );
        },
      },
    );
    const nestedThrowing = structuredClone(candidateFixture);
    nestedThrowing.scope = new Proxy(nestedThrowing.scope, {
      getOwnPropertyDescriptor() {
        throw new Error("sensitive nested Proxy detail");
      },
    });
    const revokedTarget = structuredClone(candidateFixture);
    const revokedScope = Proxy.revocable(revokedTarget.scope, {});
    revokedScope.revoke();
    revokedTarget.scope = revokedScope.proxy;

    for (const value of [
      throwing,
      attackerValidationError,
      nestedThrowing,
      revokedTarget,
    ]) {
      const error = capture(() => parseRealSourceLifecycleBundle(value));
      expect(error.code).toBe("INVALID_JSON");
      expect(error.path).toBe("$realSourceLifecycleBundle");
      expect(error.message).not.toContain("sensitive");
      expect(error.message).not.toContain("ATTACKER_CODE");
    }

    const throwingScope = new Proxy(structuredClone(candidateFixture.scope), {
      ownKeys() {
        throw new Error("sensitive expected-scope detail");
      },
    });
    const throwingRequest = new Proxy(candidateRequest(), {
      ownKeys() {
        throw new Error("sensitive evaluation-request detail");
      },
    });
    const validEvaluation = evaluateRealSourceLifecycle(
      candidateFixture,
      candidateRequest(),
    );
    const throwingEvaluation = new Proxy(validEvaluation, {
      ownKeys() {
        throw new Error("sensitive evaluation-output detail");
      },
    });
    const boundaryCases: readonly [() => unknown, string][] = [
      [
        () => serializeRealSourceLifecycleBundle(throwing as never),
        "$realSourceLifecycleBundle",
      ],
      [
        () =>
          assertRealSourceLifecycleCompatibility(
            candidateFixture,
            throwingScope,
            candidateFixture.contentDigest,
          ),
        "$expectedScope",
      ],
      [
        () => evaluateRealSourceLifecycle(candidateFixture, throwingRequest),
        "$evaluationRequest",
      ],
      [
        () => serializeRealSourceLifecycleEvaluation(throwingEvaluation),
        "$realSourceLifecycleEvaluation",
      ],
    ];
    for (const [run, expectedPath] of boundaryCases) {
      const error = capture(run);
      expect(error.code).toBe("INVALID_JSON");
      expect(error.path).toBe(expectedPath);
      expect(error.message).not.toContain("sensitive");
    }
  });

  it("is deterministic, deeply immutable, and does not mutate candidate bytes", () => {
    const before = JSON.stringify(candidateFixture);
    const first = parseRealSourceLifecycleBundle(candidateFixture);
    const firstBytes = serializeRealSourceLifecycleBundle(first);
    const secondBytes = serializeRealSourceLifecycleBundle(
      parseRealSourceLifecycleBundle(candidateFixture),
    );
    expect(secondBytes).toBe(firstBytes);
    expect(JSON.stringify(candidateFixture)).toBe(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.evidenceReceipts[0])).toBe(true);
    expect(Object.isFrozen(first.scope.accessScope.hosts)).toBe(true);
  });

  it("derives candidate reference digests from immutable repository descriptors", () => {
    const descriptorPins = [
      [
        candidateFixture.scope.contractRef,
        REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.contract,
      ],
      [
        candidateFixture.scope.fieldPolicyRef,
        REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.fieldPolicy,
      ],
      [
        candidateFixture.scope.transformRef,
        REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.transform,
      ],
      [
        candidateFixture.scope.deploymentRef,
        REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.deployment,
      ],
      [
        candidateFixture.scope.regionPackRef,
        REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.region,
      ],
      [
        candidateFixture.scope.personaProjectionRef,
        REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.persona,
      ],
      [
        candidateFixture.scope.outputAdapterRef,
        REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.output,
      ],
    ] as const;
    expect(Object.isFrozen(REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS)).toBe(
      true,
    );
    expect(
      Object.isFrozen(
        REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.contract.allowedOperations,
      ),
    ).toBe(true);
    expect(
      REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.contract.allowedOperations,
    ).toEqual([
      "documentation_review",
      "acquisition",
      "retention",
      "transformation",
      "analysis",
      "local_projection",
    ]);
    expect(
      REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.fieldPolicy.retainedAgencyFields,
    ).toEqual([
      "agencies[].id",
      "agencies[].name",
      "agencies[].parent_id",
      "agencies[].raw_name",
      "agencies[].slug",
    ]);
    expect(
      REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.fieldPolicy
        .recognizedDroppedProviderFields,
    ).toEqual(["agencies[].json_url", "agencies[].url"]);
    expect(
      REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.transform.requiredAgencyKeys,
    ).toEqual(["raw_name"]);
    expect(
      REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.transform.retainedAgencyKeys,
    ).toEqual(["id", "name", "parent_id", "raw_name", "slug"]);
    expect(
      REAL_SOURCE_LIFECYCLE_TARGET_DESCRIPTORS.transform
        .recognizedDroppedAgencyKeys,
    ).toEqual(["json_url", "url"]);
    for (const [reference, descriptor] of descriptorPins) {
      expect(reference.id).toBe(descriptor.id);
      expect(reference.version).toBe(descriptor.version);
      expect(reference.digest).toBe(sha256(canonical(descriptor)));
    }
    expect(
      candidateFixture.authorityReceipts[0]!.authorityIdentityRef.digest,
    ).toBe(
      sha256(
        "policy-sentinel|real-source-lifecycle|1.0.0|authority-identity-ref|pnw05-real-source-prerelease-authorization@1.0.0",
      ),
    );
    expect(candidateFixture.scope.artifactBoundaryRef.digest).toBe(
      sha256(
        canonical([
          "real-source-lifecycle-artifact-boundary-v1",
          candidateFixture.scope.artifactBoundaryRef.id,
          candidateFixture.scope.artifactBoundaryRef.version,
          candidateFixture.scope.artifactBoundary,
        ]),
      ),
    );
    for (const digested of [
      candidateFixture.scope.selectedRange,
      candidateFixture.scope.unknownChecklist,
      candidateFixture.scope.requestPlan,
    ]) {
      const payload = structuredClone(digested) as Record<string, unknown>;
      const actual = String(payload.digest);
      delete payload.digest;
      expect(actual).toBe(sha256(canonical(payload)));
    }
    const registry = JSON.parse(
      readFileSync(resolve(projectRoot, "config/sources.v1.json"), "utf8"),
    ) as { sources: { id: string }[] };
    expect(candidateFixture.scope.source.sourceRegistryRef.digest).toBe(
      sha256(canonical(registry)),
    );
    expect(candidateFixture.scope.source.sourceRegistryEntryRef.digest).toBe(
      sha256(
        canonical(registry.sources.find(({ id }) => id === "federal-register")),
      ),
    );
    expect(candidateFixture.evidenceReceipts[0]!.requestDigest).toBe(
      candidateFixture.scope.requestPlan.digest,
    );
    expect(candidateFixture.evidenceReceipts[1]!.controlRef!.digest).toBe(
      candidateFixture.scope.artifactBoundaryRef.digest,
    );
  });

  it("keeps the accepted SourcePack v1 surface byte-stable", () => {
    const bytePins = {
      "fixtures/engine/source-pack.synthetic.valid.json":
        "ca7b58b8624d78cd09cef5b8aed48be91ae8d1e787b4ab6a7f65d8a0a87c551d",
      "schemas/source-pack-bundle.schema.v1.json":
        "56e81e0e38009e6ceb0d114990098cb048f8e84292ea32466e9c9b449260ccd2",
      "src/engine/source-pack-contracts.ts":
        "4b03034aa74fcec438dd1d4147b81941a6dcd75049cf9a09155760fb97e3c022",
      "src/engine/source-pack.ts":
        "ff631a52d4b898ede496d512870fe46ae095c278fb3ae4f40f03f13e8d94084e",
    } as const;
    for (const [path, expected] of Object.entries(bytePins)) {
      expect(sha256(readFileSync(resolve(projectRoot, path))), path).toBe(
        expected,
      );
    }
  });
});
