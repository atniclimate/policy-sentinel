import Ajv2020 from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import schema from "../../schemas/identity-authority-scenarios.schema.v1.json";
import {
  IDENTITY_AUTHORITY_SCENARIOS_NONCLAIMS,
  IDENTITY_AUTHORITY_SCENARIOS_SCHEMA_ID,
  type IasAssertion,
  type IasAssertionObject,
  type IasAuthority,
  type IasAuthorityRole,
  type IasDate,
  type IasDocument,
  type IasEntity,
  type IasEntityKind,
  type IasEvidence,
  type IasKind,
  type IasReference,
  type IasRelation,
  type IasScenario,
  type IdentityAuthorityScenariosBundle,
  type IdentityAuthorityScenariosEvaluation,
  type IdentityAuthorityScenariosRequest,
} from "./identity-authority-scenarios-contracts";

type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export class IdentityAuthorityScenariosValidationError extends Error {
  constructor(
    readonly code: string,
    readonly path: string,
    detail: string,
  ) {
    super(`${code} at ${path}: ${detail}`);
    this.name = "IdentityAuthorityScenariosValidationError";
  }
}

function fail(code: string, path: string, detail: string): never {
  throw new IdentityAuthorityScenariosValidationError(code, path, detail);
}

/** Capture data descriptors once; never read a caller's getter or toJSON. */
function snapshot(value: unknown): JsonValue {
  const ancestors = new WeakSet<object>();
  let nodes = 0;
  let textUnits = 0;
  const visit = (input: unknown, path: string, depth: number): JsonValue => {
    nodes += 1;
    if (nodes > 200_000 || depth > 32) {
      fail("INPUT_LIMIT", path, "JSON node or depth limit exceeded");
    }
    if (input === null || typeof input === "boolean") return input;
    if (typeof input === "number") {
      if (!Number.isSafeInteger(input)) {
        fail("INVALID_JSON", path, "expected a finite safe integer");
      }
      return input;
    }
    if (typeof input === "string") {
      textUnits += input.length;
      if (input.length > 8192 || textUnits > 4_194_304) {
        fail("INPUT_LIMIT", path, "JSON string budget exceeded");
      }
      return input;
    }
    if (typeof input !== "object") {
      fail("INVALID_JSON", path, "expected a plain JSON value");
    }
    if (ancestors.has(input)) fail("INVALID_JSON", path, "cyclic JSON input");
    ancestors.add(input);
    try {
      const array = Array.isArray(input);
      if (
        Object.getPrototypeOf(input) !==
        (array ? Array.prototype : Object.prototype)
      ) {
        fail("INVALID_JSON", path, "nonplain JSON container");
      }
      const keys = Reflect.ownKeys(input);
      if (keys.length > 4097) {
        fail("INPUT_LIMIT", path, "JSON container limit exceeded");
      }
      const descriptors = new Map<string, PropertyDescriptor>();
      for (const key of keys) {
        if (typeof key !== "string") {
          fail("INVALID_JSON", path, "symbol keys are prohibited");
        }
        textUnits += key.length;
        if (key.length > 256 || textUnits > 4_194_304) {
          fail("INPUT_LIMIT", path, "JSON key budget exceeded");
        }
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (
          descriptor === undefined ||
          !("value" in descriptor) ||
          (!(array && key === "length") && !descriptor.enumerable)
        ) {
          fail("INVALID_JSON", path, "only enumerable data properties allowed");
        }
        descriptors.set(key, descriptor);
      }
      if (array) {
        const length = descriptors.get("length")?.value as unknown;
        if (
          typeof length !== "number" ||
          !Number.isSafeInteger(length) ||
          length < 0 ||
          length > 4096
        ) {
          fail("INPUT_LIMIT", path, "JSON array limit exceeded");
        }
        if (keys.length !== length + 1) {
          fail("INVALID_JSON", path, "sparse or extended array");
        }
        const result: JsonValue[] = [];
        for (let index = 0; index < length; index += 1) {
          const descriptor = descriptors.get(String(index));
          if (!descriptor) fail("INVALID_JSON", path, "sparse JSON array");
          result.push(visit(descriptor.value, `${path}/${index}`, depth + 1));
        }
        return result;
      }
      const result: { [key: string]: JsonValue } = {};
      for (const [key, descriptor] of descriptors) {
        Object.defineProperty(result, key, {
          value: visit(descriptor.value, `${path}/field`, depth + 1),
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
      return result;
    } catch (error) {
      if (error instanceof IdentityAuthorityScenariosValidationError)
        throw error;
      fail("INVALID_JSON", path, "JSON reflection failed");
    } finally {
      ancestors.delete(input);
    }
  };
  return visit(value, "$", 0);
}

const ajv = new Ajv2020({ strict: true, allErrors: false });
addFormats(ajv);
ajv.addSchema(schema);
const validateBundle = ajv.getSchema(IDENTITY_AUTHORITY_SCENARIOS_SCHEMA_ID)!;
const validateRequest = ajv.compile({
  $ref: `${IDENTITY_AUTHORITY_SCENARIOS_SCHEMA_ID}#/$defs/request`,
});
const validateEvaluation = ajv.compile({
  $ref: `${IDENTITY_AUTHORITY_SCENARIOS_SCHEMA_ID}#/$defs/evaluation`,
});

function checkedSnapshot<T>(value: unknown, validate: ValidateFunction): T {
  const captured = snapshot(value);
  if (!validate(captured)) {
    const error = validate.errors?.[0];
    fail(
      "SCHEMA_INVALID",
      error?.instancePath || "$",
      `closed synthetic schema rejected ${error?.keyword ?? "input"}`,
    );
  }
  return captured as T;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
    .join(",")}}`;
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function detached<T>(value: T): T {
  return freeze(JSON.parse(canonical(value)) as T);
}

function refKey(ref: IasReference): string {
  return `${ref.kind}/${ref.namespaceId}/${ref.id}/${ref.version}`;
}

function same(left: IasReference, right: IasReference): boolean {
  return refKey(left) === refKey(right);
}

function reference<K extends IasKind>(value: IasReference<K>): IasReference<K> {
  return {
    kind: value.kind,
    namespaceId: value.namespaceId,
    id: value.id,
    version: value.version,
  };
}

function sorted<T extends IasReference>(values: readonly T[]): T[] {
  return [...values].sort((left, right) =>
    refKey(left) < refKey(right) ? -1 : refKey(left) > refKey(right) ? 1 : 0,
  );
}

function unique(refs: readonly IasReference[], path: string): void {
  const seen = new Set<string>();
  for (const ref of refs) {
    const key = refKey(ref);
    if (seen.has(key)) fail("DUPLICATE_IDENTITY", path, "duplicate reference");
    seen.add(key);
  }
}

function sameNamespace(left: IasReference, right: IasReference, path: string) {
  if (left.namespaceId !== right.namespaceId) {
    fail("NAMESPACE_MISMATCH", path, "authority namespace differs");
  }
}

type Member =
  | IdentityAuthorityScenariosBundle["namespaces"][number]
  | IasEntity
  | IasAuthority
  | IasDocument
  | IasEvidence
  | IasAssertion
  | IasScenario;
type MemberOf<K extends IasKind> = Extract<Member, { kind: K }>;

function catalog(bundle: IdentityAuthorityScenariosBundle) {
  const members = new Map<string, Member>();
  const namespaceIds = new Set<string>();
  const namespacePairs = new Set<string>();
  for (const ns of bundle.namespaces) {
    const pair = `${ns.authoritySystem}/${ns.jurisdictionNamespace}`;
    if (ns.namespaceId !== ns.id) {
      fail("NAMESPACE_MISMATCH", "/namespaces", "namespace must name itself");
    }
    if (namespaceIds.has(ns.id) || namespacePairs.has(pair)) {
      fail("DUPLICATE_IDENTITY", "/namespaces", "ambiguous namespace identity");
    }
    namespaceIds.add(ns.id);
    namespacePairs.add(pair);
  }
  for (const collection of [
    bundle.namespaces,
    bundle.entities,
    bundle.authorities,
    bundle.documents,
    bundle.evidence,
    bundle.assertions,
    bundle.scenarios,
  ]) {
    for (const member of collection) {
      if (!namespaceIds.has(member.namespaceId)) {
        fail("UNKNOWN_REFERENCE", refKey(member), "missing namespace");
      }
      const key = refKey(member);
      if (members.has(key)) {
        fail("DUPLICATE_IDENTITY", key, "duplicate catalog identity");
      }
      members.set(key, member);
    }
  }
  const entityKinds = new Map<string, IasEntityKind>();
  for (const entity of bundle.entities) {
    const logicalIdentity = `${entity.namespaceId}/${entity.id}`;
    const previousKind = entityKinds.get(logicalIdentity);
    if (previousKind !== undefined && previousKind !== entity.entityKind) {
      fail(
        "RELATION_MISMATCH",
        refKey(entity),
        "stable entity identity cannot change entity kind between versions",
      );
    }
    entityKinds.set(logicalIdentity, entity.entityKind);
  }
  const assertionIdentities = new Map<string, string>();
  for (const assertion of bundle.assertions) {
    const logicalIdentity = `${assertion.namespaceId}/${assertion.id}`;
    const subject = assertion.subjectRef;
    const signature = `${assertion.relation}/${subject.kind}/${subject.namespaceId}/${subject.id}`;
    const previous = assertionIdentities.get(logicalIdentity);
    if (previous !== undefined && previous !== signature) {
      fail(
        "RELATION_MISMATCH",
        refKey(assertion),
        "stable assertion identity cannot change its relation or logical subject",
      );
    }
    assertionIdentities.set(logicalIdentity, signature);
  }
  return <K extends IasKind>(
    ref: IasReference<K>,
    path: string,
  ): MemberOf<K> => {
    const member = members.get(refKey(ref));
    if (!member)
      fail("UNKNOWN_REFERENCE", path, "missing exact typed reference");
    return member as MemberOf<K>;
  };
}

type Resolve = ReturnType<typeof catalog>;

function timestamp(date: string, path: string): number {
  const time = Date.parse(date);
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().replace(".000Z", "Z") !== date
  ) {
    fail("INVALID_TEMPORAL", path, "invalid canonical UTC date-time");
  }
  return time;
}

function known(date: IasDate, path: string): number | null {
  return date.state === "known" ? timestamp(date.date, path) : null;
}

function orderedDates(first: IasDate, second: IasDate, path: string): void {
  const left = known(first, path);
  const right = known(second, path);
  if (left !== null && right !== null && left > right) {
    fail("INVALID_TEMPORAL", path, "dates are out of order");
  }
}

function temporalState(assertion: IasAssertion, at: number) {
  const from = known(assertion.validFrom, "/validFrom");
  const through = known(assertion.validThrough, "/validThrough");
  if ((from !== null && at < from) || (through !== null && at > through)) {
    return "outside_interval" as const;
  }
  return from === null || through === null
    ? ("indeterminate" as const)
    : ("in_interval" as const);
}

function requiredDatesKnownAt(assertion: IasAssertion, at: number): boolean {
  return (
    [
      assertion.observedAt,
      assertion.retrievedAt,
      assertion.asOf,
      assertion.review.reviewedAt,
    ].every((date) => {
      const time = known(date, "/assertion/date");
      return time !== null && time <= at;
    }) &&
    (assertion.sourceUpdatedAt.state === "unknown" ||
      timestamp(assertion.sourceUpdatedAt.date, "/sourceUpdatedAt") <= at)
  );
}

function structurallyAccepted(assertion: IasAssertion): boolean {
  return (
    assertion.evidenceState === "available" &&
    assertion.review.state === "synthetic_accepted"
  );
}

function acceptedAt(assertion: IasAssertion, at: number): boolean {
  return (
    structurallyAccepted(assertion) &&
    temporalState(assertion, at) === "in_interval" &&
    requiredDatesKnownAt(assertion, at)
  );
}

const roleKinds: Readonly<Record<IasAuthorityRole, readonly IasEntityKind[]>> =
  {
    self_identity: [
      "government",
      "organization",
      "administrative_office",
      "corporation",
      "consortium",
      "project_owner",
      "analyst",
    ],
    recognition_registry: ["government", "administrative_office"],
    organization_membership: ["organization", "consortium"],
    owner_selection: ["project_owner"],
    record_issuer: [
      "government",
      "administrative_office",
      "organization",
      "corporation",
      "consortium",
    ],
    consultation_list: ["government", "administrative_office"],
    instrument_issuer: ["government", "administrative_office"],
    administrative_service: ["government", "administrative_office"],
    geographic_reference: ["government", "administrative_office"],
    deployment_owner: ["government", "project_owner"],
    reviewer: ["analyst", "project_owner"],
  };

const relationRules: Readonly<
  Record<
    IasRelation,
    {
      roles: readonly IasAuthorityRole[];
      objectKind: IasAssertionObject["kind"];
      evidenceKind: IasEvidence["evidenceKind"];
    }
  >
> = {
  source_name: {
    roles: ["self_identity"],
    objectKind: "name",
    evidenceKind: "name_attestation",
  },
  source_alias: {
    roles: ["self_identity"],
    objectKind: "name",
    evidenceKind: "name_attestation",
  },
  recognition: {
    roles: ["recognition_registry"],
    objectKind: "entity",
    evidenceKind: "recognition",
  },
  organization_membership: {
    roles: ["organization_membership"],
    objectKind: "entity",
    evidenceKind: "membership",
  },
  cohort_inclusion: {
    roles: ["owner_selection"],
    objectKind: "entity",
    evidenceKind: "owner_selection",
  },
  cohort_exclusion: {
    roles: ["owner_selection"],
    objectKind: "entity",
    evidenceKind: "owner_selection",
  },
  record_association: {
    roles: ["record_issuer"],
    objectKind: "record",
    evidenceKind: "official_record_mention",
  },
  consultation_list_inclusion: {
    roles: ["consultation_list"],
    objectKind: "entity",
    evidenceKind: "source_statement",
  },
  instrument_party: {
    roles: ["instrument_issuer"],
    objectKind: "entity",
    evidenceKind: "source_statement",
  },
  administrative_service: {
    roles: ["administrative_service"],
    objectKind: "entity",
    evidenceKind: "source_statement",
  },
  geographic_reference: {
    roles: ["geographic_reference"],
    objectKind: "entity",
    evidenceKind: "source_statement",
  },
  deployment_configuration: {
    roles: ["deployment_owner"],
    objectKind: "entity",
    evidenceKind: "owner_selection",
  },
  source_stated_count: {
    roles: [
      "recognition_registry",
      "organization_membership",
      "owner_selection",
    ],
    objectKind: "count",
    evidenceKind: "source_statement",
  },
  enumerated_entries: {
    roles: [
      "recognition_registry",
      "organization_membership",
      "owner_selection",
    ],
    objectKind: "entries",
    evidenceKind: "source_statement",
  },
  document_status: {
    roles: ["record_issuer"],
    objectKind: "statement",
    evidenceKind: "source_statement",
  },
  proceeding_status: {
    roles: ["record_issuer"],
    objectKind: "statement",
    evidenceKind: "source_statement",
  },
  document_relation: {
    roles: ["record_issuer"],
    objectKind: "document_relation",
    evidenceKind: "source_statement",
  },
};

function objectTargets(
  object: IasAssertionObject,
): IasReference<"entity" | "document">[] {
  switch (object.kind) {
    case "name":
      return [];
    case "entity":
      return [object.ref];
    case "record":
      return [object.documentRef];
    case "count":
      return [object.collectionRef];
    case "entries":
      return [object.collectionRef, ...object.entryRefs];
    case "statement":
      return [object.documentRef];
    case "document_relation":
      return [object.documentRef, object.targetDocumentRef];
  }
}

function requireScope(
  authority: IasAuthority,
  assertion: IasAssertion,
  document: IasDocument,
  path: string,
): void {
  if (!authority.subjectRefs.some((ref) => same(ref, assertion.subjectRef))) {
    fail("AUTHORITY_SCOPE", path, "subject outside exact authority scope");
  }
  for (const target of [
    reference(document),
    ...objectTargets(assertion.object),
  ]) {
    if (!authority.objectRefs.some((ref) => same(ref, target))) {
      fail("AUTHORITY_SCOPE", path, "object outside exact authority scope");
    }
  }
}

function requireKinds(
  entity: IasEntity,
  kinds: readonly IasEntityKind[],
  path: string,
) {
  if (!kinds.includes(entity.entityKind)) {
    fail("RELATION_MISMATCH", path, "entity kind cannot fill this relation");
  }
}

function exactCitationValue(assertion: IasAssertion, resolve: Resolve): string {
  const object = assertion.object;
  switch (object.kind) {
    case "name":
      return object.value;
    case "entity":
      return resolve(object.ref, "/object/ref").label;
    case "record": {
      const name = resolve(object.nameAssertionRef, "/object/nameAssertionRef");
      if (name.object.kind !== "name") {
        fail(
          "RELATION_MISMATCH",
          "/object/nameAssertionRef",
          "not a name assertion",
        );
      }
      return name.object.value;
    }
    case "count":
      return `Synthetic count ${object.value}`;
    case "entries":
      return `Synthetic entries ${object.entryRefs.length}`;
    case "statement":
      return `Synthetic ${object.value}`;
    case "document_relation":
      return `Synthetic ${object.value.replaceAll("_", " ")}`;
  }
}

function validateRelation(
  assertion: IasAssertion,
  authority: IasAuthority,
  evidence: IasEvidence,
  document: IasDocument,
  resolve: Resolve,
): void {
  const path = refKey(assertion);
  const rule = relationRules[assertion.relation];
  if (
    !rule.roles.includes(authority.role) ||
    assertion.object.kind !== rule.objectKind ||
    evidence.evidenceKind !== rule.evidenceKind
  ) {
    fail(
      "RELATION_MISMATCH",
      path,
      "relation, role, object or evidence kind differs",
    );
  }
  const subject = resolve(assertion.subjectRef, `${path}/subjectRef`);
  const actor = resolve(authority.entityRef, `${path}/authorityRef`);
  const object = assertion.object;
  if (!same(document.speakerRef, authority.entityRef)) {
    fail(
      "AUTHORITY_SCOPE",
      path,
      "only the document speaker supports its statement",
    );
  }
  if (
    evidence.availability === "available" &&
    document.renditionRole !== "originating_record"
  ) {
    fail(
      "EVIDENCE_MISMATCH",
      path,
      "convenience reference is not originating evidence",
    );
  }
  if (
    document.documentKind !== "party_filing" &&
    !same(document.issuerRef, document.speakerRef)
  ) {
    fail(
      "AUTHORITY_SCOPE",
      path,
      "non-party source has inconsistent issuer and speaker",
    );
  }
  switch (assertion.relation) {
    case "source_name":
    case "source_alias":
      if (
        !same(actor, subject) ||
        document.documentKind !== "name_attestation"
      ) {
        fail(
          "AUTHORITY_SCOPE",
          path,
          "name requires the exact self-attesting source",
        );
      }
      break;
    case "recognition":
      requireKinds(subject, ["government"], path);
      if (
        object.kind !== "entity" ||
        !same(object.ref, authority.entityRef) ||
        document.documentKind !== "recognition_notice"
      ) {
        fail(
          "RELATION_MISMATCH",
          path,
          "recognition must name its originating registry actor",
        );
      }
      break;
    case "organization_membership":
      requireKinds(subject, ["government"], path);
      if (
        object.kind !== "entity" ||
        !same(object.ref, authority.entityRef) ||
        document.documentKind !== "membership_roster"
      ) {
        fail(
          "RELATION_MISMATCH",
          path,
          "membership must name its originating organization",
        );
      }
      break;
    case "cohort_inclusion":
    case "cohort_exclusion":
      if (
        object.kind !== "entity" ||
        document.documentKind !== "owner_decision"
      ) {
        fail(
          "RELATION_MISMATCH",
          path,
          "cohort selection needs owner decision",
        );
      }
      requireKinds(resolve(object.ref, path), ["cohort"], path);
      break;
    case "record_association": {
      requireKinds(subject, ["government"], path);
      if (object.kind !== "record" || !same(object.documentRef, document)) {
        fail(
          "EVIDENCE_MISMATCH",
          path,
          "record mention belongs to another record",
        );
      }
      if (
        [
          "name_attestation",
          "recognition_notice",
          "membership_roster",
          "owner_decision",
          "entity_reference",
        ].includes(document.documentKind)
      ) {
        fail(
          "EVIDENCE_MISMATCH",
          path,
          "identity or configuration evidence cannot replace a record mention",
        );
      }
      const name = resolve(object.nameAssertionRef, path);
      if (
        !["source_name", "source_alias"].includes(name.relation) ||
        name.object.kind !== "name" ||
        !same(name.subjectRef, assertion.subjectRef) ||
        !structurallyAccepted(name)
      ) {
        fail(
          "EVIDENCE_MISMATCH",
          path,
          "association requires the same entity's accepted name or alias",
        );
      }
      if (structurallyAccepted(assertion)) {
        const at = known(assertion.asOf, path);
        const reviewed = known(assertion.review.reviewedAt, path);
        if (
          at === null ||
          reviewed === null ||
          temporalState(name, at) !== "in_interval" ||
          !requiredDatesKnownAt(name, reviewed)
        ) {
          fail(
            "INVALID_TEMPORAL",
            path,
            "accepted name is not valid at association as-of time",
          );
        }
      }
      break;
    }
    case "consultation_list_inclusion":
      if (object.kind !== "entity" || !same(object.ref, authority.entityRef)) {
        fail(
          "RELATION_MISMATCH",
          path,
          "consultation list must name its source actor",
        );
      }
      requireKinds(
        subject,
        [
          "government",
          "organization",
          "consortium",
          "corporation",
          "administrative_office",
        ],
        path,
      );
      break;
    case "instrument_party":
      if (object.kind !== "entity")
        fail("RELATION_MISMATCH", path, "instrument object required");
      requireKinds(resolve(object.ref, path), ["instrument"], path);
      requireKinds(
        subject,
        [
          "government",
          "organization",
          "consortium",
          "corporation",
          "administrative_office",
        ],
        path,
      );
      if (
        !["agreement", "agency_instrument", "court_instrument"].includes(
          document.documentKind,
        )
      ) {
        fail(
          "EVIDENCE_MISMATCH",
          path,
          "instrument-party evidence requires an instrument",
        );
      }
      break;
    case "administrative_service":
      requireKinds(subject, ["government"], path);
      if (object.kind !== "entity")
        fail("RELATION_MISMATCH", path, "office object required");
      requireKinds(resolve(object.ref, path), ["administrative_office"], path);
      break;
    case "geographic_reference":
      requireKinds(subject, ["government", "administrative_office"], path);
      if (object.kind !== "entity")
        fail("RELATION_MISMATCH", path, "geographic concept required");
      requireKinds(resolve(object.ref, path), ["geographic_concept"], path);
      break;
    case "deployment_configuration":
      if (
        object.kind !== "entity" ||
        !same(subject, actor) ||
        document.documentKind !== "owner_decision"
      ) {
        fail(
          "AUTHORITY_SCOPE",
          path,
          "deployment configuration requires its exact owner",
        );
      }
      requireKinds(resolve(object.ref, path), ["deployment"], path);
      break;
    case "source_stated_count":
    case "enumerated_entries": {
      if (object.kind !== "count" && object.kind !== "entries")
        fail("RELATION_MISMATCH", path, "count or entries required");
      const collection = resolve(object.collectionRef, path);
      const expectedKind =
        authority.role === "owner_selection"
          ? "owner_decision"
          : authority.role === "recognition_registry"
            ? "recognition_notice"
            : "membership_roster";
      if (!same(subject, actor) || document.documentKind !== expectedKind) {
        fail(
          "AUTHORITY_SCOPE",
          path,
          "enumeration must retain its originating speaker",
        );
      }
      if (authority.role === "owner_selection")
        requireKinds(collection, ["cohort"], path);
      else if (!same(collection, actor))
        fail(
          "RELATION_MISMATCH",
          path,
          "enumeration belongs to another authority",
        );
      break;
    }
    case "document_status":
    case "proceeding_status": {
      if (
        object.kind !== "statement" ||
        !same(object.documentRef, document) ||
        !same(subject, actor)
      ) {
        fail(
          "EVIDENCE_MISMATCH",
          path,
          "status must bind the exact source statement and target",
        );
      }
      const proceeding = assertion.relation === "proceeding_status";
      const allowed = proceeding
        ? ["scheduled", "pending", "closed", "not_assessed"]
        : [
            "proposed",
            "scheduled",
            "filed",
            "adopted",
            "final",
            "executed",
            "acknowledged",
            "completed",
            "not_assessed",
          ];
      if (
        !allowed.includes(object.value) ||
        (proceeding && document.proceeding.state !== "known")
      ) {
        fail(
          "RELATION_MISMATCH",
          path,
          "document and proceeding statuses cannot substitute",
        );
      }
      if (
        document.documentKind === "county_agenda" &&
        ["final", "executed", "adopted", "completed"].includes(object.value)
      ) {
        fail(
          "EVIDENCE_MISMATCH",
          path,
          "agenda is not final or execution evidence",
        );
      }
      break;
    }
    case "document_relation": {
      if (
        object.kind !== "document_relation" ||
        !same(object.documentRef, document) ||
        !same(subject, actor)
      ) {
        fail(
          "EVIDENCE_MISMATCH",
          path,
          "document relation must bind its exact source statement",
        );
      }
      const target = resolve(object.targetDocumentRef, path);
      if (same(document, target))
        fail("RELATION_MISMATCH", path, "self document relation prohibited");
      if (
        object.value === "version_of" &&
        (document.namespaceId !== target.namespaceId ||
          document.id !== target.id ||
          document.version === target.version)
      ) {
        fail(
          "RELATION_MISMATCH",
          path,
          "version relation requires one logical document with distinct versions",
        );
      }
      if (
        object.value === "filed_in" &&
        (document.proceeding.state !== "known" ||
          target.proceeding.state !== "known" ||
          document.proceeding.id !== target.proceeding.id ||
          document.namespaceId !== target.namespaceId)
      ) {
        fail(
          "RELATION_MISMATCH",
          path,
          "filing relation requires an exact known proceeding",
        );
      }
      break;
    }
  }
}

function validateGraph(bundle: IdentityAuthorityScenariosBundle): Resolve {
  const resolve = catalog(bundle);
  for (const authority of bundle.authorities) {
    const path = refKey(authority);
    const actor = resolve(authority.entityRef, path);
    if (!roleKinds[authority.role].includes(actor.entityKind)) {
      fail(
        "AUTHORITY_SCOPE",
        path,
        "actor kind cannot hold this authority role",
      );
    }
    unique(authority.subjectRefs, path);
    unique(authority.objectRefs, path);
    for (const target of [...authority.subjectRefs, ...authority.objectRefs])
      resolve(target, path);
  }
  for (const document of bundle.documents) {
    const issuer = resolve(document.issuerRef, refKey(document));
    const speaker = resolve(document.speakerRef, refKey(document));
    if (
      [
        "county_record",
        "county_agenda",
        "court_instrument",
        "agency_instrument",
      ].includes(document.documentKind)
    ) {
      requireKinds(
        issuer,
        ["government", "administrative_office"],
        refKey(document),
      );
      requireKinds(
        speaker,
        ["government", "administrative_office"],
        refKey(document),
      );
    }
    if (document.documentKind === "party_filing") {
      requireKinds(
        issuer,
        ["government", "administrative_office"],
        refKey(document),
      );
    }
    known(document.issuedAt, refKey(document));
    if (
      new URL(document.officialUrl).href !== document.officialUrl ||
      document.officialUrl.includes("//", "https://".length)
    ) {
      fail(
        "EVIDENCE_MISMATCH",
        refKey(document),
        "document URL is not canonical",
      );
    }
  }
  const consumedEvidence = new Set<string>();
  for (const assertion of bundle.assertions) {
    const path = refKey(assertion);
    const authority = resolve(assertion.authorityRef, `${path}/authorityRef`);
    const evidence = resolve(assertion.evidenceRef, `${path}/evidenceRef`);
    const document = resolve(evidence.documentRef, `${path}/documentRef`);
    sameNamespace(assertion, authority, path);
    sameNamespace(assertion, evidence, path);
    sameNamespace(authority, document, path);
    resolve(assertion.subjectRef, path);
    for (const target of objectTargets(assertion.object)) resolve(target, path);
    if (assertion.object.kind === "record")
      resolve(assertion.object.nameAssertionRef, path);
    const evidenceKey = refKey(evidence);
    if (consumedEvidence.has(evidenceKey))
      fail("EVIDENCE_MISMATCH", path, "evidence reused by another assertion");
    consumedEvidence.add(evidenceKey);
    if (!same(evidence.assertionRef, assertion))
      fail("EVIDENCE_MISMATCH", path, "evidence targets another assertion");
    for (const field of [
      "subjectRef",
      "relation",
      "object",
      "authorityRef",
      "observedAt",
      "retrievedAt",
      "sourceUpdatedAt",
      "asOf",
    ] as const) {
      if (canonical(assertion[field]) !== canonical(evidence[field])) {
        fail(
          "EVIDENCE_MISMATCH",
          `${path}/${field}`,
          "evidence does not mirror its exact assertion",
        );
      }
    }
    if (evidence.availability !== assertion.evidenceState)
      fail("EVIDENCE_MISMATCH", path, "evidence state differs");
    if (
      (evidence.availability === "available") !==
      (evidence.citation.state === "available")
    ) {
      fail(
        "EVIDENCE_MISMATCH",
        path,
        "citation availability differs from evidence availability",
      );
    }
    for (const date of [
      assertion.observedAt,
      assertion.retrievedAt,
      assertion.sourceUpdatedAt,
      assertion.asOf,
      assertion.validFrom,
      assertion.validThrough,
      assertion.review.reviewedAt,
    ])
      known(date, path);
    orderedDates(assertion.validFrom, assertion.validThrough, path);
    orderedDates(assertion.observedAt, assertion.retrievedAt, path);
    orderedDates(assertion.sourceUpdatedAt, assertion.retrievedAt, path);
    orderedDates(document.issuedAt, assertion.retrievedAt, path);
    orderedDates(assertion.retrievedAt, assertion.review.reviewedAt, path);
    requireScope(authority, assertion, document, path);
    validateRelation(assertion, authority, evidence, document, resolve);
    const reviewer = resolve(assertion.review.authorityRef, `${path}/review`);
    sameNamespace(assertion, reviewer, path);
    if (
      reviewer.role !== "reviewer" ||
      !same(assertion.review.assertionRef, assertion) ||
      !same(assertion.review.evidenceRef, evidence)
    ) {
      fail(
        "REVIEW_MISMATCH",
        path,
        "review is not bound to exact assertion and evidence",
      );
    }
    requireScope(reviewer, assertion, document, `${path}/review`);
    if (
      structurallyAccepted(assertion) &&
      [
        assertion.observedAt,
        assertion.retrievedAt,
        assertion.asOf,
        assertion.review.reviewedAt,
      ].some((date) => date.state !== "known")
    ) {
      fail(
        "INVALID_TEMPORAL",
        path,
        "accepted evidence requires known observation, retrieval, review and as-of dates",
      );
    }
    if (
      evidence.citation.state === "available" &&
      (evidence.citation.officialUrl !== document.officialUrl ||
        evidence.citation.documentDigest !== document.digest ||
        evidence.citation.value !== exactCitationValue(assertion, resolve))
    ) {
      fail(
        "CITATION_MISMATCH",
        path,
        "citation does not match its exact synthetic target",
      );
    }
  }
  if (consumedEvidence.size !== bundle.evidence.length) {
    fail("EVIDENCE_MISMATCH", "/evidence", "orphan evidence in closed graph");
  }
  const planningIds = new Set<string>();
  for (const scenario of bundle.scenarios) {
    const path = refKey(scenario);
    if (planningIds.has(scenario.planningId))
      fail("DUPLICATE_IDENTITY", path, "duplicate synthetic planning key");
    planningIds.add(scenario.planningId);
    unique(scenario.documentRefs, path);
    unique(scenario.assertionRefs, path);
    unique(scenario.citationRefs, path);
    if (
      new Set(scenario.gaps).size !== scenario.gaps.length ||
      scenario.gaps.includes("available")
    ) {
      fail(
        "SCENARIO_MISMATCH",
        path,
        "gaps must be distinct unresolved states",
      );
    }
    for (const ref of scenario.documentRefs) resolve(ref, path);
    const assertionKeys = new Set(scenario.assertionRefs.map(refKey));
    const documentKeys = new Set(scenario.documentRefs.map(refKey));
    const entityKeys = new Set<string>();
    const addDocumentEntities = (document: IasDocument) => {
      entityKeys.add(refKey(document.issuerRef));
      entityKeys.add(refKey(document.speakerRef));
    };
    for (const ref of scenario.documentRefs)
      addDocumentEntities(resolve(ref, path));
    const addAssertionEntities = (assertion: IasAssertion) => {
      entityKeys.add(refKey(assertion.subjectRef));
      for (const target of objectTargets(assertion.object)) {
        if (target.kind === "entity") entityKeys.add(refKey(target));
      }
      entityKeys.add(refKey(resolve(assertion.authorityRef, path).entityRef));
      entityKeys.add(
        refKey(resolve(assertion.review.authorityRef, path).entityRef),
      );
      const evidence = resolve(assertion.evidenceRef, path);
      addDocumentEntities(resolve(evidence.documentRef, path));
    };
    for (const ref of scenario.assertionRefs) {
      const assertion = resolve(ref, path);
      const evidence = resolve(assertion.evidenceRef, path);
      addAssertionEntities(assertion);
      if (assertion.object.kind === "record") {
        addAssertionEntities(resolve(assertion.object.nameAssertionRef, path));
      }
      for (const target of [
        evidence.documentRef,
        ...objectTargets(assertion.object).filter(
          (target) => target.kind === "document",
        ),
      ]) {
        if (!documentKeys.has(refKey(target)))
          fail(
            "SCENARIO_MISMATCH",
            path,
            "scenario omits an assertion document target",
          );
      }
      if (
        assertion.evidenceState !== "available" &&
        !scenario.gaps.includes(assertion.evidenceState)
      )
        fail("SCENARIO_MISMATCH", path, "scenario omits an evidence gap");
    }
    for (const ref of scenario.citationRefs) {
      const evidence = resolve(ref, path);
      if (
        !assertionKeys.has(refKey(evidence.assertionRef)) ||
        !documentKeys.has(refKey(evidence.documentRef))
      ) {
        fail(
          "SCENARIO_MISMATCH",
          path,
          "citation is outside the exact scenario",
        );
      }
    }
    const pairs = new Set<string>();
    for (const pair of scenario.distinctPairs) {
      resolve(pair.left, path);
      resolve(pair.right, path);
      const key = [refKey(pair.left), refKey(pair.right)].sort().join("|");
      if (same(pair.left, pair.right) || pairs.has(key))
        fail(
          "SCENARIO_MISMATCH",
          path,
          "distinct pair aliases itself or repeats",
        );
      pairs.add(key);
      for (const ref of [pair.left, pair.right]) {
        if (ref.kind === "document" && !documentKeys.has(refKey(ref)))
          fail(
            "SCENARIO_MISMATCH",
            path,
            "distinct document pair is outside scenario",
          );
        if (ref.kind === "entity" && !entityKeys.has(refKey(ref)))
          fail(
            "SCENARIO_MISMATCH",
            path,
            "distinct entity pair is outside scenario assertion closure",
          );
      }
    }
  }
  return resolve;
}

function normalizeBundle(
  bundle: IdentityAuthorityScenariosBundle,
): IdentityAuthorityScenariosBundle {
  return {
    ...bundle,
    namespaces: sorted(bundle.namespaces),
    entities: sorted(bundle.entities),
    authorities: sorted(bundle.authorities).map((authority) => ({
      ...authority,
      subjectRefs: sorted(authority.subjectRefs),
      objectRefs: sorted(authority.objectRefs),
    })),
    documents: sorted(bundle.documents),
    evidence: sorted(bundle.evidence),
    assertions: sorted(bundle.assertions),
    scenarios: sorted(bundle.scenarios).map((scenario) => ({
      ...scenario,
      documentRefs: sorted(scenario.documentRefs),
      assertionRefs: sorted(scenario.assertionRefs),
      citationRefs: sorted(scenario.citationRefs),
      distinctPairs: scenario.distinctPairs
        .map((pair) => {
          const ends = sorted([pair.left, pair.right]);
          return { left: ends[0]!, right: ends[1]! };
        })
        .sort((left, right) =>
          canonical(left) < canonical(right)
            ? -1
            : canonical(left) > canonical(right)
              ? 1
              : 0,
        ),
      gaps: [...scenario.gaps].sort(),
    })),
  };
}

export function parseIdentityAuthorityScenariosBundle(
  value: unknown,
): IdentityAuthorityScenariosBundle {
  const bundle = checkedSnapshot<IdentityAuthorityScenariosBundle>(
    value,
    validateBundle,
  );
  validateGraph(bundle);
  return detached(normalizeBundle(bundle));
}

export function serializeIdentityAuthorityScenariosBundle(
  value: IdentityAuthorityScenariosBundle,
): string {
  return canonical(parseIdentityAuthorityScenariosBundle(value));
}

export function evaluateIdentityAuthorityScenarios(
  bundleValue: unknown,
  requestValue: unknown,
): IdentityAuthorityScenariosEvaluation {
  const bundle = parseIdentityAuthorityScenariosBundle(bundleValue);
  const request = checkedSnapshot<IdentityAuthorityScenariosRequest>(
    requestValue,
    validateRequest,
  );
  const at = timestamp(request.asOf, "/asOf");
  const resolve = catalog(bundle);
  const scenario = resolve(request.scenarioRef, "/scenarioRef");
  const citationKeys = new Set(scenario.citationRefs.map(refKey));
  unique(
    request.citations.map((citation) => citation.evidenceRef),
    "/citations",
  );
  const exactCitationRefs = request.citations.map((citation) => {
    const evidence = resolve(citation.evidenceRef, "/citations/evidenceRef");
    const target = evidence.citation;
    const observed = known(evidence.observedAt, "/citations");
    const retrieved = known(evidence.retrievedAt, "/citations");
    if (
      !citationKeys.has(refKey(evidence)) ||
      target.state !== "available" ||
      observed === null ||
      retrieved === null ||
      observed > at ||
      retrieved > at ||
      !same(citation.documentRef, evidence.documentRef) ||
      citation.officialUrl !== target.officialUrl ||
      citation.documentDigest !== target.documentDigest ||
      citation.locator !== target.locator ||
      citation.value !== target.value
    )
      fail(
        "CITATION_MISMATCH",
        "/citations",
        "citation does not exactly replay selected scenario evidence",
      );
    return reference(evidence);
  });
  const evaluation: IdentityAuthorityScenariosEvaluation = {
    bundleRef: { id: bundle.id, version: bundle.version },
    scenarioRef: reference(scenario),
    asOf: request.asOf,
    trustDomain: "synthetic_test_only",
    assertions: sorted(scenario.assertionRefs).map((ref) => {
      const assertion = resolve(ref, "/assertions");
      let accepted = acceptedAt(assertion, at);
      if (assertion.object.kind === "record") {
        const name = resolve(
          assertion.object.nameAssertionRef,
          "/nameAssertionRef",
        );
        // The name attests the historical record mention at association.asOf.
        // Later name expiry does not erase that exact historical citation.
        accepted =
          accepted &&
          structurallyAccepted(name) &&
          requiredDatesKnownAt(name, at);
      }
      return {
        assertionRef: reference(assertion),
        temporalState: temporalState(assertion, at),
        evidenceState: assertion.evidenceState,
        reviewState: assertion.review.state,
        resolution: accepted ? "accepted_synthetic_reference" : "unresolved",
      };
    }),
    exactCitationRefs: sorted(exactCitationRefs),
    nonClaims: IDENTITY_AUTHORITY_SCENARIOS_NONCLAIMS,
  };
  return detached(
    checkedSnapshot<IdentityAuthorityScenariosEvaluation>(
      evaluation,
      validateEvaluation,
    ),
  );
}

export function serializeIdentityAuthorityScenariosEvaluation(
  value: IdentityAuthorityScenariosEvaluation,
): string {
  const evaluation = checkedSnapshot<IdentityAuthorityScenariosEvaluation>(
    value,
    validateEvaluation,
  );
  timestamp(evaluation.asOf, "/asOf");
  unique(
    evaluation.assertions.map((assertion) => assertion.assertionRef),
    "/assertions",
  );
  unique(evaluation.exactCitationRefs, "/exactCitationRefs");
  for (const assertion of evaluation.assertions) {
    if (
      assertion.resolution === "accepted_synthetic_reference" &&
      (assertion.temporalState !== "in_interval" ||
        assertion.evidenceState !== "available" ||
        assertion.reviewState !== "synthetic_accepted")
    )
      fail(
        "EVIDENCE_MISMATCH",
        "/assertions",
        "accepted result contradicts its resolution axes",
      );
  }
  return canonical({
    ...evaluation,
    assertions: [...evaluation.assertions].sort((left, right) =>
      refKey(left.assertionRef) < refKey(right.assertionRef)
        ? -1
        : refKey(left.assertionRef) > refKey(right.assertionRef)
          ? 1
          : 0,
    ),
    exactCitationRefs: sorted(evaluation.exactCitationRefs),
  });
}
