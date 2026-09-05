import { describe, expect, it } from "vitest";

import fixture from "../../fixtures/engine/identity-authority-scenarios.synthetic.valid.json";
import {
  IDENTITY_AUTHORITY_SCENARIOS_NONCLAIMS,
  type IasReference,
  type IasScenario,
  type IdentityAuthorityScenariosBundle,
  type IdentityAuthorityScenariosRequest,
} from "../../src/engine/identity-authority-scenarios-contracts";
import {
  IdentityAuthorityScenariosValidationError,
  evaluateIdentityAuthorityScenarios,
  parseIdentityAuthorityScenariosBundle,
  serializeIdentityAuthorityScenariosBundle,
  serializeIdentityAuthorityScenariosEvaluation,
} from "../../src/engine/identity-authority-scenarios";

type Mutable<T> = { -readonly [P in keyof T]: Mutable<T[P]> };
const copy = () =>
  structuredClone(
    fixture,
  ) as unknown as Mutable<IdentityAuthorityScenariosBundle>;
const key = (ref: IasReference) =>
  [ref.kind, ref.namespaceId, ref.id, ref.version].join("/");
const ref = <K extends IasReference["kind"]>(
  value: IasReference<K>,
): IasReference<K> => ({
  kind: value.kind,
  namespaceId: value.namespaceId,
  id: value.id,
  version: value.version,
});
const at = "3785-06-30T00:00:00Z";
const specs = [
  ["synthetic-scenario-a", "adopted", "proposed"],
  ["synthetic-scenario-b", "proposed", "final"],
  ["synthetic-scenario-c", "filed", "final"],
  ["synthetic-scenario-d", "final", "proposed"],
  ["synthetic-scenario-e", "acknowledged", "completed"],
  ["synthetic-scenario-f", "filed", "filed"],
  ["synthetic-sentinel-one", "executed", "completed"],
  ["synthetic-sentinel-two", "adopted", "final"],
  ["synthetic-sentinel-three", "final", "proposed"],
] as const;
function request(
  bundle: IdentityAuthorityScenariosBundle,
  scenario: IasScenario,
): IdentityAuthorityScenariosRequest {
  const evidence = bundle.evidence.find(
    (item) =>
      item.id === scenario.id + "-status-evidence" &&
      item.version === "2.0.0" &&
      item.namespaceId === scenario.namespaceId,
  )!;
  if (evidence.citation.state !== "available")
    throw new Error("Missing declared synthetic citation");
  return {
    scenarioRef: ref(scenario),
    asOf: at,
    citations: [
      {
        evidenceRef: ref(evidence),
        documentRef: evidence.documentRef,
        officialUrl: evidence.citation.officialUrl,
        documentDigest: evidence.citation.documentDigest,
        locator: evidence.citation.locator,
        value: evidence.citation.value,
      },
    ],
  };
}
function failure(run: () => unknown) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(IdentityAuthorityScenariosValidationError);
    return error as IdentityAuthorityScenariosValidationError;
  }
  throw new Error("Invalid synthetic reference was accepted");
}

describe("synthetic identity authority scenario evaluation", () => {
  it("has all nine opaque test families and every contracted relation", () => {
    const parsed = parseIdentityAuthorityScenariosBundle(fixture);
    expect(
      parsed.scenarios.map((scenario) => scenario.planningId).sort(),
    ).toEqual(specs.map(([id]) => id).sort());
    expect(
      new Set(parsed.assertions.map((assertion) => assertion.relation)),
    ).toEqual(
      new Set([
        "source_name",
        "source_alias",
        "recognition",
        "organization_membership",
        "cohort_inclusion",
        "cohort_exclusion",
        "record_association",
        "consultation_list_inclusion",
        "instrument_party",
        "administrative_service",
        "geographic_reference",
        "deployment_configuration",
        "source_stated_count",
        "enumerated_entries",
        "document_status",
        "proceeding_status",
        "document_relation",
      ]),
    );
  });

  it.each(specs)(
    "%s preserves hits, non-merges, history, unknowns, changes and exact citations",
    (id, previous, current) => {
      const parsed = parseIdentityAuthorityScenariosBundle(fixture);
      const scenario = parsed.scenarios.find((item) => item.planningId === id)!;
      const input = request(parsed, scenario);
      const output = evaluateIdentityAuthorityScenarios(parsed, input);
      const old = output.assertions.find(
        (entry) =>
          entry.assertionRef.id === id + "-status" &&
          entry.assertionRef.version === "1.0.0",
      )!;
      const fresh = output.assertions.find(
        (entry) =>
          entry.assertionRef.id === id + "-status" &&
          entry.assertionRef.version === "2.0.0",
      )!;
      const missing = output.assertions.find(
        (entry) => entry.assertionRef.id === id + "-unavailable",
      )!;
      const changed = output.assertions.find(
        (entry) => entry.assertionRef.id === id + "-changed-version",
      )!;
      expect(old).toMatchObject({
        temporalState: "outside_interval",
        evidenceState: "available",
        resolution: "unresolved",
      });
      expect(fresh).toMatchObject({
        temporalState: "in_interval",
        evidenceState: "available",
        resolution: "accepted_synthetic_reference",
      });
      expect(missing).toMatchObject({
        temporalState: "indeterminate",
        evidenceState: "unavailable",
        reviewState: "pending",
        resolution: "unresolved",
      });
      expect(changed.resolution).toBe("accepted_synthetic_reference");
      expect(output.exactCitationRefs).toEqual([
        input.citations[0]!.evidenceRef,
      ]);
      expect(
        output.assertions.map((entry) => key(entry.assertionRef)).sort(),
      ).toEqual(scenario.assertionRefs.map(key).sort());
      expect(output.nonClaims).toEqual(IDENTITY_AUTHORITY_SCENARIOS_NONCLAIMS);
      const statements = parsed.assertions.filter(
        (assertion) => assertion.id === id + "-status",
      );
      expect(
        statements.find((assertion) => assertion.version === "1.0.0")!.object,
      ).toMatchObject({ value: previous });
      expect(
        statements.find((assertion) => assertion.version === "2.0.0")!.object,
      ).toMatchObject({ value: current });
      const pair = scenario.distinctPairs.find(
        (pair) => pair.left.kind === "document",
      )!;
      expect(key(pair.left)).not.toBe(key(pair.right));
      const left = parsed.documents.find(
        (document) => key(document) === key(pair.left),
      )!;
      const right = parsed.documents.find(
        (document) => key(document) === key(pair.right),
      )!;
      expect(left.title).toBe(right.title);
      expect(left.digest).not.toBe(right.digest);
      const invalid = structuredClone(
        input,
      ) as Mutable<IdentityAuthorityScenariosRequest>;
      invalid.citations[0]!.documentDigest = "f".repeat(64);
      expect(
        failure(() => evaluateIdentityAuthorityScenarios(parsed, invalid)).code,
      ).toBe("CITATION_MISMATCH");
    },
  );

  it("keeps jurisdictions, independent memberships and count conventions separate", () => {
    const parsed = parseIdentityAuthorityScenariosBundle(fixture);
    expect(parsed.namespaces[0]!.authoritySystem).toBe(
      parsed.namespaces[1]!.authoritySystem,
    );
    expect(parsed.namespaces[0]!.jurisdictionNamespace).not.toBe(
      parsed.namespaces[1]!.jurisdictionNamespace,
    );
    const recognitions = parsed.assertions.filter(
      (assertion) => assertion.id === "synthetic-recognition",
    );
    expect(recognitions).toHaveLength(2);
    expect(recognitions[0]!.version).toBe(recognitions[1]!.version);
    expect(key(recognitions[0]!)).not.toBe(key(recognitions[1]!));
    for (const scenarioId of ["synthetic-scenario-a", "synthetic-scenario-e"]) {
      const scenario = parsed.scenarios.find((item) => item.id === scenarioId)!;
      const evaluation = evaluateIdentityAuthorityScenarios(
        parsed,
        request(parsed, scenario),
      );
      const byId = (id: string) =>
        evaluation.assertions.find((entry) => entry.assertionRef.id === id)!;
      expect(byId("synthetic-recognition").resolution).toBe(
        "accepted_synthetic_reference",
      );
      expect(byId("synthetic-membership").resolution).toBe("unresolved");
      expect(byId("synthetic-second-membership").resolution).toBe(
        "accepted_synthetic_reference",
      );
    }
    const count = parsed.assertions.find(
      (item) => item.id === "synthetic-stated-count",
    )!.object;
    const entries = parsed.assertions.find(
      (item) => item.id === "synthetic-enumerated-entries",
    )!.object;
    expect(count).toMatchObject({ kind: "count", value: 2 });
    if (entries.kind !== "entries") throw new Error("Missing enumeration");
    expect(entries.entryRefs.map((item) => item.id)).toEqual([
      "synthetic-government-two",
      "synthetic-government-one",
      "synthetic-government-two",
    ]);
    expect(parsed.entities).toHaveLength(fixture.entities.length);
    const aliases = parsed.assertions.filter(
      (item) =>
        item.namespaceId === "synthetic-namespace-one" &&
        item.relation === "source_alias",
    );
    expect(aliases[0]!.object).toEqual(aliases[1]!.object);
    expect(key(aliases[0]!.subjectRef)).not.toBe(key(aliases[1]!.subjectRef));
  });

  it("preserves government, office, concept, corporation, consortium and demographic identities", () => {
    const parsed = parseIdentityAuthorityScenariosBundle(fixture);
    const kinds = parsed.entities
      .filter((item) => item.namespaceId === "synthetic-namespace-one")
      .map((item) => item.entityKind);
    expect(kinds).toEqual(
      expect.arrayContaining([
        "government",
        "administrative_office",
        "geographic_concept",
        "corporation",
        "consortium",
        "demographic_concept",
      ]),
    );
    const party = parsed.documents.find(
      (item) => item.id === "synthetic-scenario-b-party-filing",
    )!;
    expect(key(party.issuerRef)).not.toBe(key(party.speakerRef));
    const status = parsed.assertions.find(
      (item) => item.id === "synthetic-scenario-b-party-status",
    )!;
    expect(status.subjectRef).toEqual(party.speakerRef);
    const plan = parsed.assertions.find(
      (item) =>
        item.id === "synthetic-scenario-e-status" && item.version === "2.0.0",
    )!;
    const proceeding = parsed.assertions.find(
      (item) => item.id === "synthetic-scenario-e-proceeding-status",
    )!;
    expect(plan.object).toMatchObject({ value: "completed" });
    expect(proceeding.object).toMatchObject({ value: "pending" });
  });

  it("allows a tenth opaque key without extending a hard-coded scenario whitelist", () => {
    const candidate = copy();
    candidate.scenarios.push({
      ...structuredClone(candidate.scenarios[0]!),
      id: "synthetic-scenario-extra",
      planningId: "synthetic-scenario-extra",
    });
    const parsed = parseIdentityAuthorityScenariosBundle(candidate);
    const extra = parsed.scenarios.find(
      (item) => item.planningId === "synthetic-scenario-extra",
    )!;
    expect(
      evaluateIdentityAuthorityScenarios(parsed, {
        scenarioRef: ref(extra),
        asOf: at,
        citations: [],
      }).scenarioRef,
    ).toEqual(ref(extra));
  });

  it.each([
    "unknown",
    "unavailable",
    "outside_coverage",
    "not_observed",
    "not_assessed",
  ] as const)(
    "preserves the unresolved evidence axis %s without turning it false",
    (state) => {
      const candidate = copy();
      const assertion = candidate.assertions.find(
        (item) => item.id === "synthetic-scenario-a-unavailable",
      )!;
      const evidence = candidate.evidence.find(
        (item) => key(item) === key(assertion.evidenceRef),
      )!;
      assertion.evidenceState = state;
      evidence.availability = state;
      const scenario = candidate.scenarios[0]!;
      const result = evaluateIdentityAuthorityScenarios(candidate, {
        scenarioRef: ref(scenario),
        asOf: at,
        citations: [],
      });
      expect(
        result.assertions.find(
          (item) => key(item.assertionRef) === key(assertion),
        ),
      ).toMatchObject({
        evidenceState: state,
        resolution: "unresolved",
        temporalState: "indeterminate",
      });
    },
  );

  it.each(["pending", "disputed", "rejected"] as const)(
    "preserves review state %s independently of availability",
    (state) => {
      const candidate = copy();
      const assertion = candidate.assertions.find(
        (item) =>
          item.id === "synthetic-scenario-b-status" && item.version === "2.0.0",
      )!;
      assertion.review.state = state;
      const scenario = candidate.scenarios.find(
        (item) => item.id === "synthetic-scenario-b",
      )!;
      const result = evaluateIdentityAuthorityScenarios(candidate, {
        scenarioRef: ref(scenario),
        asOf: at,
        citations: [],
      });
      expect(
        result.assertions.find(
          (item) => key(item.assertionRef) === key(assertion),
        ),
      ).toMatchObject({
        evidenceState: "available",
        reviewState: state,
        resolution: "unresolved",
      });
    },
  );

  it("keeps source data-as-of earlier than retrieval and blocks knowledge from the future", () => {
    const candidate = copy();
    const assertion = candidate.assertions.find(
      (item) =>
        item.id === "synthetic-scenario-b-status" && item.version === "2.0.0",
    )!;
    const evidence = candidate.evidence.find(
      (item) => key(item) === key(assertion.evidenceRef),
    )!;
    assertion.asOf = { state: "known", date: "3785-02-01T00:00:00Z" };
    evidence.asOf = structuredClone(assertion.asOf);
    const scenario = candidate.scenarios.find(
      (item) => item.id === "synthetic-scenario-b",
    )!;
    expect(() =>
      parseIdentityAuthorityScenariosBundle(candidate),
    ).not.toThrow();
    const early = evaluateIdentityAuthorityScenarios(candidate, {
      scenarioRef: ref(scenario),
      asOf: "3785-02-01T00:00:00Z",
      citations: [],
    });
    const later = evaluateIdentityAuthorityScenarios(candidate, {
      scenarioRef: ref(scenario),
      asOf: at,
      citations: [],
    });
    expect(
      early.assertions.find(
        (entry) => key(entry.assertionRef) === key(assertion),
      )!.resolution,
    ).toBe("unresolved");
    expect(
      later.assertions.find(
        (entry) => key(entry.assertionRef) === key(assertion),
      )!.resolution,
    ).toBe("accepted_synthetic_reference");
    const citationRequest = request(candidate, scenario);
    const beforeCapture = { ...citationRequest, asOf: "3785-01-01T00:00:00Z" };
    const error = failure(() =>
      evaluateIdentityAuthorityScenarios(candidate, beforeCapture),
    );
    expect(error.code).toBe("CITATION_MISMATCH");
    expect(error.path).toBe("/citations");
  });

  it("uses the name valid at a historical association rather than current name validity", () => {
    const candidate = copy();
    const name = candidate.assertions.find(
      (item) =>
        item.namespaceId === "synthetic-namespace-one" &&
        item.id === "synthetic-official-name",
    )!;
    name.validThrough = { state: "known", date: "3785-04-01T00:00:00Z" };
    const scenario = candidate.scenarios[0]!;
    const output = evaluateIdentityAuthorityScenarios(candidate, {
      scenarioRef: ref(scenario),
      asOf: at,
      citations: [],
    });
    expect(
      output.assertions.find(
        (entry) => entry.assertionRef.id === "synthetic-official-name",
      )!.resolution,
    ).toBe("unresolved");
    expect(
      output.assertions.find(
        (entry) =>
          entry.assertionRef.id === "synthetic-scenario-a-record-association",
      )!.resolution,
    ).toBe("accepted_synthetic_reference");
  });

  it("rejects every changed citation component and out-of-scenario evidence", () => {
    const parsed = parseIdentityAuthorityScenariosBundle(fixture);
    const scenario = parsed.scenarios.find(
      (item) => item.id === "synthetic-scenario-b",
    )!;
    const baseline = request(parsed, scenario);
    const changes = [
      { officialUrl: "https://synthetic-records.invalid/wrong" },
      { documentDigest: "a".repeat(64) },
      { locator: "synthetic:wrong:paragraph:1" },
      { value: "Synthetic Different value" },
      {
        documentRef: parsed.documents.find(
          (item) => item.id === "synthetic-scenario-a-record",
        )!,
      },
      {
        evidenceRef: parsed.evidence.find(
          (item) => item.id === "synthetic-scenario-a-status-evidence",
        )!,
      },
    ];
    for (const changeset of changes) {
      const requestCopy = structuredClone(
        baseline,
      ) as Mutable<IdentityAuthorityScenariosRequest>;
      const clean: Partial<
        Mutable<IdentityAuthorityScenariosRequest>["citations"][number]
      > = { ...changeset };
      if ("documentRef" in clean) clean.documentRef = ref(clean.documentRef!);
      if ("evidenceRef" in clean) clean.evidenceRef = ref(clean.evidenceRef!);
      requestCopy.citations = [{ ...requestCopy.citations[0]!, ...clean }];
      expect(
        failure(() => evaluateIdentityAuthorityScenarios(parsed, requestCopy))
          .code,
      ).toBe("CITATION_MISMATCH");
    }
  });

  it("serializes deterministically, retains enumeration order and returns detached frozen values", () => {
    const candidate = copy();
    const before = JSON.stringify(candidate);
    const parsed = parseIdentityAuthorityScenariosBundle(candidate);
    const bytes = serializeIdentityAuthorityScenariosBundle(parsed);
    candidate.entities[0]!.label = "Synthetic Caller mutation";
    expect(serializeIdentityAuthorityScenariosBundle(parsed)).toBe(bytes);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.assertions[0]!.object)).toBe(true);
    const reversed = copy();
    for (const collection of [
      reversed.namespaces,
      reversed.entities,
      reversed.authorities,
      reversed.documents,
      reversed.evidence,
      reversed.assertions,
      reversed.scenarios,
    ])
      collection.reverse();
    for (const item of reversed.authorities) {
      item.subjectRefs.reverse();
      item.objectRefs.reverse();
    }
    for (const item of reversed.scenarios) {
      item.assertionRefs.reverse();
      item.documentRefs.reverse();
      item.citationRefs.reverse();
      item.gaps.reverse();
      item.distinctPairs.reverse();
    }
    expect(
      serializeIdentityAuthorityScenariosBundle(
        parseIdentityAuthorityScenariosBundle(reversed),
      ),
    ).toBe(bytes);
    const scenario = parsed.scenarios[0]!;
    const input = request(parsed, scenario);
    const output = evaluateIdentityAuthorityScenarios(parsed, input);
    expect(Object.isFrozen(output.assertions[0])).toBe(true);
    expect(serializeIdentityAuthorityScenariosEvaluation(output)).toBe(
      serializeIdentityAuthorityScenariosEvaluation(
        evaluateIdentityAuthorityScenarios(parsed, input),
      ),
    );
    expect(JSON.stringify(fixture)).toBe(before);
    expect(
      failure(() =>
        serializeIdentityAuthorityScenariosEvaluation({
          ...output,
          privateData: "Synthetic prohibited value",
        } as unknown as typeof output),
      ).code,
    ).toBe("SCHEMA_INVALID");
  });
});
