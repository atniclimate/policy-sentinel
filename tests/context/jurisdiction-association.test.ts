// @vitest-environment node

import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import schema from "../../schemas/jurisdiction-ref.schema.v1.json";
import * as associationModule from "../../src/modules/context/jurisdiction/association";
import {
  JURISDICTION_REF_SCHEMA_ID,
  parseJurisdictionRegistry,
} from "../../src/modules/context/jurisdiction/registry";

const { parseJurisdictionAssociation } = associationModule;
const evidence = (): Record<string, unknown> => ({
  url: "https://records.example.invalid/synthetic",
  locator: " Synthetic section 1 ",
});
const quoted = (
  ref: string,
  recordRef = "record:synthetic-instrument",
): Record<string, unknown> => ({
  ...evidence(),
  exactSubject: { recordRef, ref, text: " Exact synthetic source wording. " },
});
const registry = (): Record<string, unknown> => ({
  $schema: JURISDICTION_REF_SCHEMA_ID,
  schemaVersion: "1.0.0",
  synthetic: true,
  reservedNamespaces: ["ca", "ca-province"],
  entries: [
    {
      kind: "federal",
      ref: "us",
      label: "Synthetic federal",
      evidence: evidence(),
    },
    {
      kind: "state",
      ref: "us-state:NV",
      label: "Synthetic state",
      usps: "NV",
      fips: "32",
      evidence: evidence(),
    },
    {
      kind: "nation",
      ref: "nation:synthetic-example",
      label: "Synthetic Nation",
      reviewState: "reviewed",
      evidence: quoted("nation:synthetic-example", "record:synthetic-registry"),
    },
    {
      kind: "body",
      ref: "body:synthetic-council",
      label: "Synthetic council",
      evidence: evidence(),
      members: [{ ref: "nation:synthetic-example", evidence: evidence() }],
    },
  ],
});
const association = (
  jurisdictionRef = "us",
  basis = "issuing_authority",
): Record<string, unknown> => ({
  $schema: JURISDICTION_REF_SCHEMA_ID,
  schemaVersion: "1.0.0",
  synthetic: true,
  recordRef: "record:synthetic-instrument",
  jurisdictionRef,
  basis,
  evidence: evidence(),
  reviewState: "unreviewed",
});
const parse = (value: unknown, registryValue: unknown = registry()) =>
  parseJurisdictionAssociation(
    JSON.stringify(value),
    JSON.stringify(registryValue),
  );
const ajv = new Ajv2020({
  strict: true,
  allErrors: false,
  coerceTypes: false,
  useDefaults: false,
  removeAdditional: false,
});
ajv.addSchema(schema);
const validateShape = ajv.getSchema(
  `${JURISDICTION_REF_SCHEMA_ID}#/$defs/association`,
)!;

describe("synthetic jurisdiction associations", () => {
  it("exports only the public parser at runtime", () => {
    expect(Object.keys(associationModule)).toEqual([
      "parseJurisdictionAssociation",
    ]);
  });

  it.each(["issuing_authority", "source_stated_scope"])(
    "preserves exact federal/state metadata for %s",
    (basis) => {
      for (const ref of ["us", "us-state:NV"]) {
        const value = association(ref, basis);
        expect(validateShape(value)).toBe(true);
        expect(parse(value)).toEqual(value);
      }
    },
  );

  it.each(["unreviewed", "reviewed", "rejected"])(
    "retains declared non-Nation review state %s",
    (reviewState) => {
      const value = { ...association(), reviewState };
      expect(parse(value).reviewState).toBe(reviewState);
    },
  );

  it.each(["issuing_authority", "source_stated_scope"])(
    "requires reviewed matching Nation quote for %s",
    (basis) => {
      const value = {
        ...association("nation:synthetic-example", basis),
        reviewState: "reviewed",
        evidence: quoted("nation:synthetic-example"),
      };
      expect(parse(value)).toEqual(value);
      expect(parse(value).evidence.exactSubject?.text).toBe(
        " Exact synthetic source wording. ",
      );
      for (const reviewState of ["unreviewed", "rejected"]) {
        expect(() => parse({ ...value, reviewState })).toThrow(
          "GD09_ASSOCIATION_NATION_REQUIRES_REVIEWED_EXACT_SUBJECT",
        );
      }
      expect(() => parse({ ...value, evidence: evidence() })).toThrow(
        "GD09_ASSOCIATION_NATION_REQUIRES_REVIEWED_EXACT_SUBJECT",
      );
    },
  );

  it.each([
    "us",
    "us-state:NV",
    "nation:synthetic-example",
    "body:synthetic-council",
  ])(
    "requires every supplied quote to match its record and target: %s",
    (ref) => {
      const value = {
        ...association(ref),
        reviewState: "reviewed",
        evidence: quoted(ref),
      };
      expect(parse(value).jurisdictionRef).toBe(ref);
      expect(() =>
        parse({ ...value, evidence: quoted(ref, "record:synthetic-other") }),
      ).toThrow("GD09_ASSOCIATION_EXACT_SUBJECT_MISMATCH");
      expect(() =>
        parse({
          ...value,
          evidence: quoted(ref === "us" ? "us-state:NV" : "us"),
        }),
      ).toThrow("GD09_ASSOCIATION_EXACT_SUBJECT_MISMATCH");
    },
  );

  it("does not propagate a body association to its Nation member", () => {
    const value = association("body:synthetic-council");
    expect(parse(value)).toEqual(value);
    expect(() => parse(association("nation:synthetic-example"))).toThrow(
      "GD09_ASSOCIATION_NATION_REQUIRES_REVIEWED_EXACT_SUBJECT",
    );
    expect(Object.keys(parse(value))).toEqual(Object.keys(value));
  });

  it.each([
    "us-state:ZZ",
    "us-county:01001",
    "nation:synthetic-missing",
    "body:missing",
  ])("rejects a syntactically valid unresolved target %s", (ref) => {
    expect(validateShape(association(ref))).toBe(true);
    expect(() => parse(association(ref))).toThrow(
      "GD09_ASSOCIATION_UNKNOWN_TARGET",
    );
  });

  it.each([
    "ca",
    "ca-province:BC",
    "nation:real-example",
    "US",
    "us-state:nv",
    "body:bad--slug",
  ])("rejects reserved, real or malformed target %s", (ref) => {
    expect(validateShape(association(ref))).toBe(false);
    expect(() => parse(association(ref))).toThrow();
  });

  it.each(Object.keys(association()))("requires field %s", (field) => {
    const value = association();
    delete value[field];
    expect(validateShape(value)).toBe(false);
    expect(() => parse(value)).toThrow();
  });

  it.each([
    { synthetic: false },
    { synthetic: "true" },
    { schemaVersion: "2.0.0" },
    { $schema: "https://other.invalid/schema" },
    { recordRef: "record:real-instrument" },
    { basis: "geographic_inference" },
    { reviewState: "approved" },
    { evidence: { ...evidence(), locator: " \t " } },
    {
      evidence: {
        ...quoted("us"),
        exactSubject: {
          recordRef: "record:synthetic-instrument",
          ref: "us",
          text: " ",
        },
      },
    },
    { extra: "undeclared" },
    { evidence: { ...evidence(), extra: "undeclared" } },
    {
      evidence: {
        ...quoted("us"),
        exactSubject: {
          recordRef: "record:synthetic-instrument",
          ref: "us",
          text: "quote",
          extra: "undeclared",
        },
      },
    },
  ])("rejects closed-schema violation %#", (changes) => {
    const value = { ...association(), ...changes };
    expect(validateShape(value)).toBe(false);
    expect(() => parse(value)).toThrow();
  });

  it.each([
    "http://records.invalid/x",
    "https://records.example.com/x",
    "https://records.invalid.example/x",
    "https://user@records.invalid/x",
    "https://records.invalid:443/x",
    "https://records.invalid:8443/x",
    "https://-bad.invalid/x",
    "https://bad-.invalid/x",
    "https://a..invalid/x",
    "https://records.invalid\\x",
    " https://records.invalid/x",
    "https://records.invalid/x y",
    "https://records.invalid/x\n",
  ])("refuses non-synthetic or ambiguous evidence URL %s", (url) => {
    expect(() =>
      parse({ ...association(), evidence: { ...evidence(), url } }),
    ).toThrow();
  });

  it("preserves accepted URL spelling without normalization", () => {
    const value = {
      ...association(),
      evidence: {
        ...evidence(),
        url: "HTTPS://Records.Example.INVALID/x?value=1#quote",
      },
    };
    expect(parse(value)).toEqual(value);
  });

  it("validates the supplied registry semantically rather than accepting its shape", () => {
    const value = registry();
    const entries = value.entries as Record<string, unknown>[];
    entries.push({ ...entries[0] });
    expect(() => parse(association(), value)).toThrow();
    const invalidState = registry();
    (invalidState.entries as Record<string, unknown>[])[1].usps = "OR";
    expect(() => parse(association(), invalidState)).toThrow();
  });

  it("does not use a body member or registry entry quote as association evidence", () => {
    const value = {
      ...association("nation:synthetic-example"),
      reviewState: "reviewed",
    };
    expect(() => parse(value)).toThrow(
      "GD09_ASSOCIATION_NATION_REQUIRES_REVIEWED_EXACT_SUBJECT",
    );
    const withoutNation = registry();
    withoutNation.entries = (
      withoutNation.entries as Record<string, unknown>[]
    ).filter((entry) => entry.kind !== "nation" && entry.kind !== "body");
    expect(() =>
      parse(
        { ...value, evidence: quoted("nation:synthetic-example") },
        withoutNation,
      ),
    ).toThrow("GD09_ASSOCIATION_UNKNOWN_TARGET");
  });

  it("returns an independent deeply frozen association snapshot", () => {
    const value = { ...association(), evidence: quoted("us") };
    const result = parse(value);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.evidence)).toBe(true);
    expect(Object.isFrozen(result.evidence.exactSubject)).toBe(true);
    expect(Reflect.set(result, "jurisdictionRef", "us-state:NV")).toBe(false);
    expect(Reflect.set(result.evidence, "locator", "changed")).toBe(false);
    expect(Reflect.set(result.evidence.exactSubject!, "text", "changed")).toBe(
      false,
    );
    value.evidence.exactSubject = {
      recordRef: "record:synthetic-other",
      ref: "us",
      text: "changed",
    };
    expect(result.evidence.exactSubject?.text).toBe(
      " Exact synthetic source wording. ",
    );
  });

  it.each([
    "Parcel-Geometry",
    "NATION_IDS",
    "private.land.context",
    "api_key",
    "__proto__",
  ])(
    "refuses protected or undeclared key %s without echoing payloads",
    (key) => {
      const value = association();
      Object.defineProperty(value.evidence as Record<string, unknown>, key, {
        value: "PRIVATE_SENTINEL",
        enumerable: true,
      });
      try {
        parse(value);
        expect.unreachable("protected input was accepted");
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect(String(error)).not.toContain("PRIVATE_SENTINEL");
      }
    },
  );

  it("rejects both caller-owned inputs before invoking getters or proxy traps", () => {
    let traps = 0;
    const getter = Object.defineProperty({}, "entries", {
      get() {
        traps++;
        throw new Error("CALLER_GETTER");
      },
    });
    const proxy = new Proxy(
      {},
      {
        get() {
          traps++;
          throw new Error("CALLER_GET");
        },
        ownKeys() {
          traps++;
          throw new Error("CALLER_KEYS");
        },
        getOwnPropertyDescriptor() {
          traps++;
          throw new Error("CALLER_DESCRIPTOR");
        },
        getPrototypeOf() {
          traps++;
          throw new Error("CALLER_PROTOTYPE");
        },
      },
    );
    for (const input of [
      getter,
      proxy,
      Object("{}"),
      null,
      undefined,
      1,
      true,
      [],
    ]) {
      expect(() =>
        parseJurisdictionAssociation(input, JSON.stringify(registry())),
      ).toThrow();
      expect(() =>
        parseJurisdictionAssociation(JSON.stringify(association()), input),
      ).toThrow();
    }
    expect(traps).toBe(0);
  });

  it.each(["", "{", "null", "[]", "true", "1", '"string"'])(
    "rejects malformed or non-object association JSON %#",
    (input) => {
      expect(() =>
        parseJurisdictionAssociation(input, JSON.stringify(registry())),
      ).toThrow();
    },
  );

  it("enforces raw-text and decoded string bounds", () => {
    expect(() =>
      parseJurisdictionAssociation(
        " ".repeat(4_194_305),
        JSON.stringify(registry()),
      ),
    ).toThrow();
    const tooLongQuote = {
      ...association(),
      evidence: {
        ...quoted("us"),
        exactSubject: {
          recordRef: "record:synthetic-instrument",
          ref: "us",
          text: "x".repeat(8193),
        },
      },
    };
    expect(() => parse(tooLongQuote)).toThrow();
    const recordRef = `record:synthetic-${"a".repeat(111)}`;
    expect(recordRef).toHaveLength(128);
    const longest = { ...association(), recordRef };
    expect(parse(longest).recordRef).toBe(recordRef);
    expect(() => parse({ ...longest, recordRef: `${recordRef}a` })).toThrow();
  });

  it("can reuse a valid registry JSON string without mutating either input", () => {
    const registryText = JSON.stringify(registry());
    const associationText = JSON.stringify(association());
    expect(parseJurisdictionRegistry(registryText).entries).toHaveLength(4);
    expect(parseJurisdictionAssociation(associationText, registryText)).toEqual(
      association(),
    );
    expect(JSON.parse(registryText)).toEqual(registry());
    expect(JSON.parse(associationText)).toEqual(association());
  });
});
