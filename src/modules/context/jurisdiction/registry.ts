import Ajv2020 from "ajv/dist/2020.js";

import schema from "../../../../schemas/jurisdiction-ref.schema.v1.json";
import { rejectProtectedKeys } from "../../../core/boundary-guard.mjs";

export const JURISDICTION_REF_SCHEMA_ID =
  "https://policy-sentinel.invalid/schemas/jurisdiction-ref.schema.v1.json";

export type JurisdictionRef =
  | "us"
  | `us-state:${string}`
  | `us-county:${string}`
  | `nation:synthetic-${string}`
  | `body:${string}`;

export interface ExactSubject {
  readonly recordRef: string;
  readonly ref: JurisdictionRef;
  readonly text: string;
}

export interface JurisdictionEvidence {
  readonly url: string;
  readonly locator: string;
  readonly exactSubject?: ExactSubject;
}

interface EntryFields {
  readonly label: string;
  readonly evidence: JurisdictionEvidence;
}

export interface FederalJurisdictionEntry extends EntryFields {
  readonly kind: "federal";
  readonly ref: "us";
}

export interface StateJurisdictionEntry extends EntryFields {
  readonly kind: "state";
  readonly ref: `us-state:${string}`;
  readonly usps: string;
  readonly fips: string;
}

export interface CountyJurisdictionEntry extends EntryFields {
  readonly kind: "county";
  readonly ref: `us-county:${string}`;
  readonly fips: string;
  readonly stateRef: `us-state:${string}`;
}

export interface NationJurisdictionEntry extends EntryFields {
  readonly kind: "nation";
  readonly ref: `nation:synthetic-${string}`;
  readonly reviewState: "reviewed";
  readonly evidence: JurisdictionEvidence & {
    readonly exactSubject: ExactSubject;
  };
}

export interface BodyJurisdictionEntry extends EntryFields {
  readonly kind: "body";
  readonly ref: `body:${string}`;
  readonly members: readonly {
    readonly ref: JurisdictionRef;
    readonly evidence: JurisdictionEvidence;
  }[];
}

export type JurisdictionEntry =
  | FederalJurisdictionEntry
  | StateJurisdictionEntry
  | CountyJurisdictionEntry
  | NationJurisdictionEntry
  | BodyJurisdictionEntry;

export interface JurisdictionRegistry {
  readonly $schema: typeof JURISDICTION_REF_SCHEMA_ID;
  readonly schemaVersion: "1.0.0";
  readonly synthetic: true;
  readonly reservedNamespaces: readonly ["ca", "ca-province"];
  readonly entries: readonly JurisdictionEntry[];
}

const ajv = new Ajv2020({
  strict: true,
  allErrors: false,
  removeAdditional: false,
  useDefaults: false,
  coerceTypes: false,
});
const validateRegistry = ajv.compile(schema);
const validateAssociation = ajv.compile({
  $ref: JURISDICTION_REF_SCHEMA_ID + "#/$defs/association",
});

function fail(code: string): never {
  throw new TypeError("GD09_" + code);
}

// Count root depth as zero, every JSON value as a node, and decoded text in
// UTF-16 code units. JSON-only parsing makes property inspection caller-free.
function boundAndFreeze(value: unknown): void {
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  let textUnits = 0;
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (++nodes > 200_000 || current.depth > 32) {
      fail("STRUCTURAL_LIMIT");
    }
    if (typeof current.value === "string") {
      if (current.value.length > 8192) fail("STRING_LIMIT");
      textUnits += current.value.length;
    } else if (typeof current.value === "number") {
      if (!Number.isSafeInteger(current.value)) fail("NUMBER_INVALID");
    } else if (current.value !== null && typeof current.value === "object") {
      const entries = Object.entries(current.value);
      if (entries.length > 4096) fail("CONTAINER_LIMIT");
      const array = Array.isArray(current.value);
      for (const [key, child] of entries) {
        if (!array) {
          if (key.length > 256) fail("KEY_LIMIT");
          textUnits += key.length;
        }
        pending.push({ value: child, depth: current.depth + 1 });
      }
      Object.freeze(current.value);
    }
    if (textUnits > 4_194_304) fail("TEXT_LIMIT");
  }
}

/**
 * Internal structural parser shared with association.ts. Its frozen unknown
 * result does not establish registry semantics, source authority or association.
 */
export function parseJurisdictionSchemaInput(
  jsonText: unknown,
  shape: "registry" | "association",
): unknown {
  if (typeof jsonText !== "string") fail("JSON_STRING_REQUIRED");
  if (shape !== "registry" && shape !== "association") fail("SHAPE_INVALID");
  if (jsonText.length > 4_194_304) fail("RAW_TEXT_LIMIT");
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    fail("JSON_INVALID");
  }
  boundAndFreeze(parsed);
  try {
    rejectProtectedKeys(parsed);
  } catch {
    fail("PROTECTED_KEY_REJECTED");
  }
  const validate =
    shape === "registry" ? validateRegistry : validateAssociation;
  if (!validate(parsed)) fail("SCHEMA_INVALID");
  return parsed;
}

function checkExactSubject(
  evidence: JurisdictionEvidence,
  expectedRef: JurisdictionRef,
): void {
  if (evidence.exactSubject && evidence.exactSubject.ref !== expectedRef) {
    fail("EXACT_SUBJECT_REF_MISMATCH");
  }
}

function rejectBodyCycles(
  bodies: readonly BodyJurisdictionEntry[],
  entries: ReadonlyMap<JurisdictionRef, JurisdictionEntry>,
): void {
  const colors = new Map<JurisdictionRef, 1 | 2>();
  for (const start of bodies) {
    if (colors.has(start.ref)) continue;
    colors.set(start.ref, 1);
    const stack = [{ body: start, index: 0 }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (frame.index === frame.body.members.length) {
        colors.set(frame.body.ref, 2);
        stack.pop();
        continue;
      }
      const member = frame.body.members[frame.index++];
      const target = entries.get(member.ref)!;
      if (target.kind !== "body") continue;
      const color = colors.get(target.ref);
      if (color === 1) fail("BODY_CYCLE");
      if (color === 2) continue;
      colors.set(target.ref, 1);
      stack.push({ body: target, index: 0 });
    }
  }
}

export function parseJurisdictionRegistry(
  jsonText: unknown,
): Readonly<JurisdictionRegistry> {
  const registry = parseJurisdictionSchemaInput(
    jsonText,
    "registry",
  ) as JurisdictionRegistry;
  const entries = new Map<JurisdictionRef, JurisdictionEntry>();
  for (const entry of registry.entries) {
    if (entries.has(entry.ref)) fail("DUPLICATE_REF");
    entries.set(entry.ref, entry);
    checkExactSubject(entry.evidence, entry.ref);
    if (entry.kind === "state" && entry.ref !== "us-state:" + entry.usps) {
      fail("STATE_CODE_MISMATCH");
    }
    if (entry.kind === "county" && entry.ref !== "us-county:" + entry.fips) {
      fail("COUNTY_CODE_MISMATCH");
    }
  }
  const bodies: BodyJurisdictionEntry[] = [];
  for (const entry of registry.entries) {
    if (entry.kind === "county") {
      const parent = entries.get(entry.stateRef);
      if (!parent || parent.kind !== "state") fail("COUNTY_PARENT_MISSING");
      if (!entry.fips.startsWith(parent.fips)) fail("COUNTY_PARENT_MISMATCH");
    }
    if (entry.kind !== "body") continue;
    bodies.push(entry);
    const members = new Set<JurisdictionRef>();
    for (const member of entry.members) {
      if (!entries.has(member.ref)) fail("BODY_MEMBER_MISSING");
      if (member.ref === entry.ref) fail("BODY_SELF_MEMBER");
      if (members.has(member.ref)) fail("BODY_DUPLICATE_MEMBER");
      members.add(member.ref);
      checkExactSubject(member.evidence, member.ref);
    }
  }
  rejectBodyCycles(bodies, entries);
  return registry;
}
