// @vitest-environment node

import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import fixture from "../../fixtures/context/jurisdiction-registry.synthetic.valid.json";
import schema from "../../schemas/jurisdiction-ref.schema.v1.json";
import * as registryModule from "../../src/modules/context/jurisdiction/registry";

const {
  JURISDICTION_REF_SCHEMA_ID,
  parseJurisdictionRegistry,
  parseJurisdictionSchemaInput,
} = registryModule;
const clone = () => structuredClone(fixture);
const parse = (value: unknown) =>
  parseJurisdictionRegistry(JSON.stringify(value));
const evidence = () => ({
  url: "https://records.example.invalid/synthetic",
  locator: " Synthetic locator ",
});
const body = (ref: string, refs: readonly string[]) => ({
  kind: "body",
  ref,
  label: "Synthetic body",
  evidence: evidence(),
  members: refs.map((ref) => ({ ref, evidence: evidence() })),
});
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

describe("synthetic jurisdiction registry", () => {
  it("exports exactly three runtime bindings and strictly compiles both shapes", () => {
    expect(Object.keys(registryModule).sort()).toEqual([
      "JURISDICTION_REF_SCHEMA_ID",
      "parseJurisdictionRegistry",
      "parseJurisdictionSchemaInput",
    ]);
    expect(schema.$id).toBe(JURISDICTION_REF_SCHEMA_ID);
    expect(ajv.validateSchema(schema)).toBe(true);
    expect(validateRegistry(fixture)).toBe(true);
    expect(
      validateAssociation({
        $schema: JURISDICTION_REF_SCHEMA_ID,
        schemaVersion: "1.0.0",
        synthetic: true,
        recordRef: "record:synthetic-example",
        jurisdictionRef: "us",
        basis: "issuing_authority",
        evidence: evidence(),
        reviewState: "unreviewed",
      }),
    ).toBe(true);
  });

  it("preserves all five kinds, leading zeros and exact source spelling", () => {
    const result = parse(fixture);
    expect(result).toEqual(fixture);
    expect(result.entries.map((entry) => entry.kind)).toEqual([
      "federal",
      "state",
      "county",
      "nation",
      "body",
    ]);
    expect(result.entries[1].ref).toBe("us-state:AL");
    expect(result.entries[2]).toMatchObject({
      fips: "01001",
      stateRef: "us-state:AL",
    });
    expect(result.entries[0].evidence.locator).toBe(
      " Synthetic fixture declaration ",
    );
    expect(result.entries[3].evidence.exactSubject?.text).toBe(
      "“Synthetic Nation example” — fixture text only.",
    );
  });

  it("freezes the complete snapshot without freezing caller data", () => {
    const input = clone();
    const result = parse(input);
    const pending: unknown[] = [result];
    while (pending.length > 0) {
      const value = pending.pop();
      if (value !== null && typeof value === "object") {
        expect(Object.isFrozen(value)).toBe(true);
        pending.push(...Object.values(value));
      }
    }
    expect(Object.isFrozen(input)).toBe(false);
    expect(() =>
      Reflect.set(result.entries[0], "label", "changed"),
    ).not.toThrow();
    expect(Reflect.set(result.entries[0], "label", "changed")).toBe(false);
    expect(result.entries[0].label).toBe(fixture.entries[0].label);
  });

  it("returns only structural acceptance from the shared helper", () => {
    const value = clone();
    value.entries.push(structuredClone(value.entries[0]));
    expect(validateRegistry(value)).toBe(true);
    const snapshot = parseJurisdictionSchemaInput(
      JSON.stringify(value),
      "registry",
    );
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => parse(value)).toThrow("GD09_DUPLICATE_REF");
  });

  it.each([
    "$schema",
    "schemaVersion",
    "synthetic",
    "reservedNamespaces",
    "entries",
  ])("rejects missing root field %s", (field) => {
    const value = clone();
    Reflect.deleteProperty(value, field);
    expect(validateRegistry(value)).toBe(false);
    expect(() => parse(value)).toThrow();
  });

  it("closes root, entry, evidence, exact subject and member objects", () => {
    const values = [
      Object.assign(clone(), { extra: true }),
      (() => {
        const x = clone();
        Object.assign(x.entries[0], { extra: true });
        return x;
      })(),
      (() => {
        const x = clone();
        Object.assign(x.entries[0].evidence, { extra: true });
        return x;
      })(),
      (() => {
        const x = clone();
        Object.assign(x.entries[3].evidence.exactSubject!, { extra: true });
        return x;
      })(),
      (() => {
        const x = clone();
        Object.assign(x.entries[4].members![0], { extra: true });
        return x;
      })(),
    ];
    for (const value of values) {
      expect(validateRegistry(value)).toBe(false);
      expect(() => parse(value)).toThrow();
    }
  });

  it("requires every kind's fields, true-only mode and exact reserved declarations", () => {
    for (const [index, field] of [
      [0, "evidence"],
      [1, "usps"],
      [1, "fips"],
      [2, "stateRef"],
      [2, "fips"],
      [3, "reviewState"],
      [4, "members"],
    ] as const) {
      const value = clone();
      Reflect.deleteProperty(value.entries[index], field);
      expect(() => parse(value)).toThrow();
    }
    for (const synthetic of [false, "true", 1, null]) {
      expect(() => parse({ ...clone(), synthetic })).toThrow();
    }
    for (const reservedNamespaces of [
      [],
      ["ca-province", "ca"],
      ["ca"],
      ["ca", "ca-province", "us"],
    ]) {
      expect(() => parse({ ...clone(), reservedNamespaces })).toThrow();
    }
    const value = clone();
    Reflect.deleteProperty(value.entries[3].evidence, "exactSubject");
    expect(() => parse(value)).toThrow();
    for (const reviewState of ["unreviewed", "rejected"]) {
      const invalid = clone();
      invalid.entries[3].reviewState = reviewState;
      expect(() => parse(invalid)).toThrow();
    }
  });

  it.each([
    "ca",
    "ca-province:BC",
    "nation:real-example",
    "nation:synthetic-a--b",
    "body:Upper",
  ])("forbids inactive or malformed entry and member ref %s", (ref) => {
    const value = clone();
    value.entries[3].ref = ref;
    expect(() => parse(value)).toThrow();
    const memberValue = clone();
    memberValue.entries[4].members![0].ref = ref;
    expect(() => parse(memberValue)).toThrow();
  });

  it("bounds jurisdiction slugs and rejects terminal newline aliases", () => {
    const value = clone();
    value.entries.push(body("body:" + "a".repeat(64), []));
    expect(() => parse(value)).not.toThrow();
    value.entries[value.entries.length - 1].ref += "a";
    expect(() => parse(value)).toThrow();
    for (const [index, ref] of [
      [1, "us-state:AL\n"],
      [2, "us-county:01001\n"],
    ] as const) {
      const bad = clone();
      bad.entries[index].ref = ref;
      expect(validateRegistry(bad)).toBe(false);
      expect(() => parse(bad)).toThrow("GD09_SCHEMA_INVALID");
    }
    const badBody = clone();
    badBody.entries.push(body("body:example\n", []));
    expect(validateRegistry(badBody)).toBe(false);
    expect(() => parse(badBody)).toThrow("GD09_SCHEMA_INVALID");
  });

  it("distinguishes structural validity from code and parent integrity", () => {
    const mutations = [
      (x: ReturnType<typeof clone>) => {
        x.entries[1].usps = "NV";
      },
      (x: ReturnType<typeof clone>) => {
        x.entries[2].fips = "01002";
      },
      (x: ReturnType<typeof clone>) => {
        x.entries[2].stateRef = "us-state:ZZ";
      },
      (x: ReturnType<typeof clone>) => {
        x.entries[1].fips = "02";
      },
      (x: ReturnType<typeof clone>) => {
        x.entries[3].evidence.exactSubject!.ref = "us";
      },
      (x: ReturnType<typeof clone>) => {
        Object.assign(x.entries[4].members![0].evidence, {
          exactSubject: {
            recordRef: "record:synthetic-example",
            ref: "us",
            text: "Exact synthetic text",
          },
        });
      },
    ];
    for (const mutate of mutations) {
      const value = clone();
      mutate(value);
      expect(validateRegistry(value)).toBe(true);
      expect(() => parse(value)).toThrow();
    }
  });

  it("rejects duplicate, dangling and self members", () => {
    for (const refs of [
      ["us", "us"],
      ["body:missing"],
      ["body:synthetic-review"],
    ]) {
      const value = {
        ...clone(),
        entries: [
          ...clone().entries.slice(0, 4),
          body("body:synthetic-review", refs),
        ],
      };
      expect(validateRegistry(value)).toBe(true);
      expect(() => parse(value)).toThrow();
    }
  });

  it("rejects disconnected and multi-hop cycles while accepting shared DAG targets", () => {
    const base = clone().entries.slice(0, 4);
    const dag = {
      ...clone(),
      entries: [
        ...base,
        body("body:a", ["body:c"]),
        body("body:b", ["body:c"]),
        body("body:c", ["us"]),
      ],
    };
    expect(() => parse(dag)).not.toThrow();
    for (const entries of [
      [...base, body("body:a", ["body:b"]), body("body:b", ["body:a"])],
      [
        ...base,
        body("body:independent", ["us"]),
        body("body:a", ["body:b"]),
        body("body:b", ["body:c"]),
        body("body:c", ["body:a"]),
      ],
    ]) {
      expect(() => parse({ ...clone(), entries })).toThrow("GD09_BODY_CYCLE");
    }
  });

  it("keeps unknown state codes syntactic and does not introduce lookup claims", () => {
    const value = {
      ...clone(),
      entries: [
        {
          kind: "state",
          ref: "us-state:ZZ",
          label: "Synthetic state",
          usps: "ZZ",
          fips: "00",
          evidence: evidence(),
        },
        {
          kind: "county",
          ref: "us-county:00001",
          label: "Synthetic county",
          fips: "00001",
          stateRef: "us-state:ZZ",
          evidence: evidence(),
        },
      ],
    };
    expect(() => parse(value)).not.toThrow();
  });

  it.each([
    "http://records.example.invalid/x",
    "https://user@records.example.invalid/x",
    "https://records.example.invalid:443/x",
    "https://records.example.invalid.evil/x",
    "https://-records.example.invalid/x",
    "https://records-.example.invalid/x",
    "https://records..invalid/x",
    "https://records.example.invalid./x",
    "https://records.example.invalid/x\n",
    "https://records.example.invalid/x\\path",
    "https://records.example.invalid/x y",
  ])("rejects non-synthetic or malformed URL %s", (url) => {
    const value = clone();
    value.entries[0].evidence.url = url;
    expect(validateRegistry(value)).toBe(false);
    expect(() => parse(value)).toThrow();
  });

  it("preserves valid HTTPS case and nonblank labels without rewriting", () => {
    const value = clone();
    value.entries[0].evidence.url =
      "HTTPS://Records.Example.INVALID/x?value=1#quote";
    value.entries[0].label = "  Synthetic label  ";
    expect(parse(value).entries[0]).toEqual(value.entries[0]);
    for (const [field, bad] of [
      ["label", " "],
      ["label", "a".repeat(257)],
    ] as const) {
      const invalid = clone();
      invalid.entries[0][field] = bad;
      expect(() => parse(invalid)).toThrow();
    }
    for (const locator of [" ", "a".repeat(1025)]) {
      const invalid = clone();
      invalid.entries[0].evidence.locator = locator;
      expect(() => parse(invalid)).toThrow();
    }
  });

  it("rejects objects, getters and proxies without inspecting caller properties", () => {
    let calls = 0;
    const hostile = Object.defineProperty({}, "toString", {
      get() {
        calls++;
        throw new Error("caller getter");
      },
    });
    const proxy = new Proxy(
      {},
      {
        get() {
          calls++;
          throw new Error("caller get");
        },
        ownKeys() {
          calls++;
          throw new Error("caller keys");
        },
      },
    );
    for (const value of [hostile, proxy, [], null, 1, true, undefined]) {
      expect(() => parseJurisdictionRegistry(value)).toThrow(
        "GD09_JSON_STRING_REQUIRED",
      );
    }
    expect(calls).toBe(0);
    expect(() =>
      parseJurisdictionSchemaInput("{}", "other" as "registry"),
    ).toThrow("GD09_SHAPE_INVALID");
    expect(() => parseJurisdictionRegistry("{")).toThrow("GD09_JSON_INVALID");
  });

  it.each([
    "API-key",
    "LEGAL_effect",
    "Nation.Associations",
    "parcel-geometry",
  ])("rejects normalized protected key %s without echoing values", (key) => {
    const value = clone();
    Object.assign(value.entries[0].evidence, { [key]: "DO_NOT_ECHO_SENTINEL" });
    try {
      parse(value);
      throw new Error("accepted");
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
      expect(String(error)).toContain("GD09_PROTECTED_KEY_REJECTED");
      expect(String(error)).not.toContain("DO_NOT_ECHO_SENTINEL");
    }
  });

  it("enforces raw, decoded-string, key, container and number limits", () => {
    expect(() => parseJurisdictionRegistry(" ".repeat(4_194_305))).toThrow(
      "GD09_RAW_TEXT_LIMIT",
    );
    expect(() => parseJurisdictionRegistry(" ".repeat(4_194_304))).toThrow(
      "GD09_JSON_INVALID",
    );
    expect(() =>
      parseJurisdictionRegistry(JSON.stringify("x".repeat(8193))),
    ).toThrow("GD09_STRING_LIMIT");
    expect(() =>
      parseJurisdictionRegistry(JSON.stringify({ ["x".repeat(257)]: null })),
    ).toThrow("GD09_KEY_LIMIT");
    expect(() =>
      parseJurisdictionRegistry(JSON.stringify(Array(4097).fill(null))),
    ).toThrow("GD09_CONTAINER_LIMIT");
    expect(() =>
      parseJurisdictionRegistry(JSON.stringify(Array(4096).fill(null))),
    ).toThrow("GD09_SCHEMA_INVALID");
    const object = Object.fromEntries(
      Array.from({ length: 4096 }, (_, i) => ["k" + i, null]),
    );
    expect(() => parse(object)).toThrow("GD09_SCHEMA_INVALID");
    Object.assign(object, { extra: null });
    expect(() => parse(object)).toThrow("GD09_CONTAINER_LIMIT");
    for (const text of ["1e309", "9007199254740992", "1.1"]) {
      expect(() => parseJurisdictionRegistry(text)).toThrow(
        "GD09_NUMBER_INVALID",
      );
    }
  });

  it("counts UTF-16 units and iterative root-zero depth/node boundaries", () => {
    const unicode = clone();
    unicode.entries[3].evidence.exactSubject!.text = "😀".repeat(4097);
    expect(validateRegistry(unicode)).toBe(true);
    expect(() => parse(unicode)).toThrow("GD09_STRING_LIMIT");
    expect(() =>
      parseJurisdictionRegistry(JSON.stringify("😀".repeat(4097))),
    ).toThrow("GD09_STRING_LIMIT");
    expect(() =>
      parseJurisdictionRegistry(JSON.stringify("x".repeat(8192))),
    ).toThrow("GD09_SCHEMA_INVALID");
    expect(() =>
      parseJurisdictionRegistry(JSON.stringify({ ["x".repeat(256)]: null })),
    ).toThrow("GD09_SCHEMA_INVALID");
    let depth: unknown = null;
    for (let i = 0; i < 32; i++) depth = [depth];
    expect(() => parse(depth)).toThrow("GD09_SCHEMA_INVALID");
    expect(() => parse([depth])).toThrow("GD09_STRUCTURAL_LIMIT");
    const exact = Array.from({ length: 4000 }, (_, index) =>
      Array(index === 0 ? 48 : 49).fill(null),
    );
    expect(() => parse(exact)).toThrow("GD09_SCHEMA_INVALID");
    exact[0].push(null);
    expect(() => parse(exact)).toThrow("GD09_STRUCTURAL_LIMIT");
  });
});
