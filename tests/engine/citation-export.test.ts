import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import fixture from "../../fixtures/engine/citation-export.synthetic.valid.json";
import recordSchema from "../../schemas/record.schema.v1.json";
import schema from "../../schemas/citation-export.schema.v1.json";
import {
  CITATION_EXPORT_SCHEMA_ID,
  CITATION_EXPORT_SCHEMA_VERSION,
  CitationExportValidationError,
  parseCitationExport,
  serializeCitationExport,
} from "../../src/engine/citation-export-contracts";
import type { CitationExport } from "../../src/engine/citation-export-contracts";

function failure(run: () => unknown): CitationExportValidationError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(CitationExportValidationError);
    return error as CitationExportValidationError;
  }
  throw new Error("Malformed synthetic citation export was accepted");
}

const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
ajv.addSchema(recordSchema);
const validate = ajv.compile(schema);

const extraProvenanceBase = {
  sourcePath: "$.extra",
  sourceId: "synthetic-federal",
  sourceRecordId: "SYN-001",
  sourceUrl: "https://federal.example.invalid/records/synthetic-export-alpha",
  retrievedAt: "2026-09-10T00:00:00Z",
  sourceUpdatedAt: null,
  adapterId: "synthetic-adapter",
  transformation: "copied",
  transformRuleId: null,
  validationState: "validated",
} as const;

function clone(): typeof fixture {
  return structuredClone(fixture);
}

describe("citation export schema and semantic closure", () => {
  it("compiles strictly with the record schema registered and pins contract constants", () => {
    expect(ajv.validateSchema(schema)).toBe(true);
    expect(schema.$id).toBe(CITATION_EXPORT_SCHEMA_ID);
    expect(schema.properties.schemaVersion.const).toBe(
      CITATION_EXPORT_SCHEMA_VERSION,
    );
    expect(schema.additionalProperties).toBe(false);
    expect(
      schema.$defs.exportRecord.properties.fieldProvenance.items.$ref,
    ).toBe(
      "https://policy-sentinel.invalid/schemas/record.schema.v1.json#/$defs/fieldProvenance",
    );
    expect(validate(fixture), ajv.errorsText(validate.errors)).toBe(true);
    expect(() => parseCitationExport(fixture)).not.toThrow();
  });

  it("rejects a name-shaped, direct-line-shaped, or email-shaped contact field", () => {
    const nameShaped = clone();
    nameShaped.records[0]!.issuingAuthority.administrativeOffice =
      "Ms. Synthetic Person";
    let error = failure(() => parseCitationExport(nameShaped));
    expect(error.code).toBe("PERSONAL_CONTACT_SHAPE");
    expect(error.path).toBe(
      "$/records/0/issuingAuthority/administrativeOffice",
    );

    const directLine = clone();
    directLine.records[0]!.issuingAuthority.administrativeOffice =
      "Direct line 555 0100";
    error = failure(() => parseCitationExport(directLine));
    expect(error.code).toBe("PERSONAL_CONTACT_SHAPE");
    expect(error.path).toBe(
      "$/records/0/issuingAuthority/administrativeOffice",
    );

    const emailShaped = clone();
    emailShaped.records[0]!.issuingAuthority.administrativeOffice =
      "contact@synthetic-office.example.invalid";
    error = failure(() => parseCitationExport(emailShaped));
    expect(error.code).toBe("PERSONAL_CONTACT_SHAPE");
    expect(error.path).toBe(
      "$/records/0/issuingAuthority/administrativeOffice",
    );
  });

  it("requires provenance for every populated contact field", () => {
    const candidate = clone();
    candidate.records[0]!.fieldProvenance =
      candidate.records[0]!.fieldProvenance.filter(
        (entry) => entry.field !== "/records/0/issuingAuthority/publicPhone",
      );
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("CONTACT_PROVENANCE_MISSING");
    expect(error.path).toBe("$/records/0/issuingAuthority/publicPhone");
  });

  it("requires provenance for officialTitle and citation.sourceUrl", () => {
    const candidate = clone();
    candidate.records[0]!.fieldProvenance =
      candidate.records[0]!.fieldProvenance.filter(
        (entry) => entry.field !== "/records/0/officialTitle",
      );
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("PROVENANCE_MISSING");
    expect(error.path).toBe("$/records/0/officialTitle");
  });

  it("rejects an orphan provenance pointer at a nonexistent field", () => {
    const candidate = clone();
    candidate.records[0]!.fieldProvenance.push({
      ...extraProvenanceBase,
      field: "/records/0/nonExistentField",
    });
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("PROVENANCE_ORPHAN");
    expect(error.path).toBe("$/records/0/fieldProvenance/5/field");
  });

  it("rejects an orphan provenance pointer naming the wrong record index", () => {
    const candidate = clone();
    candidate.records[0]!.fieldProvenance.push({
      ...extraProvenanceBase,
      field: "/records/1/officialTitle",
    });
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("PROVENANCE_ORPHAN");
    expect(error.path).toBe("$/records/0/fieldProvenance/5/field");
  });

  it("rejects a duplicate provenance field pointer on the same record", () => {
    const candidate = clone();
    candidate.records[0]!.fieldProvenance.push({
      ...extraProvenanceBase,
      field: "/records/0/officialTitle",
    });
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("PROVENANCE_DUPLICATE");
    expect(error.path).toBe("$/records/0/fieldProvenance/5/field");
  });

  it("rejects whyAssociated pointing outside the scope layer range", () => {
    const candidate = clone();
    candidate.records[0]!.whyAssociated!.layerIndex = 5;
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("WHY_ASSOCIATED_LAYER_MISMATCH");
    expect(error.path).toBe("$/records/0/whyAssociated");
  });

  it("rejects whyAssociated whose authorityName differs from the scope layer", () => {
    const candidate = clone();
    candidate.records[0]!.whyAssociated!.authorityName =
      "Different Synthetic Authority";
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("WHY_ASSOCIATED_LAYER_MISMATCH");
    expect(error.path).toBe("$/records/0/whyAssociated");
  });

  it("rejects a tribal whyAssociated absent from a parcel scope's own layers", () => {
    const candidate = clone();
    const layers = candidate.scope.jurisdictionLayers;
    (candidate as { scope: unknown }).scope = {
      kind: "parcel",
      parcelId: "parcel:synthetic-parcel-alpha",
      jurisdictionLayers: layers,
      asOf: "2026-09-10",
    };
    (candidate.records[0]! as { whyAssociated: unknown }).whyAssociated = {
      basis: "jurisdiction_layer_match",
      layerIndex: 0,
      level: "tribal",
      authorityName: "Any Synthetic Nation Name",
      nationId: "nation:synthetic-unlisted",
      evidenceUrl:
        "https://federal.example.invalid/jurisdiction/synthetic-export-alpha",
    };
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("WHY_ASSOCIATED_LAYER_MISMATCH");
    expect(error.path).toBe("$/records/0/whyAssociated");
  });

  it("rejects whyAssociated whose nationId differs from the scope layer", () => {
    const candidate = clone();
    const layer = candidate.scope.jurisdictionLayers[0]! as {
      level: string;
      nationId: unknown;
    };
    layer.level = "tribal";
    layer.nationId = "nation:synthetic-a";
    const why = candidate.records[0]!.whyAssociated! as {
      level: string;
      nationId: unknown;
    };
    why.level = "tribal";
    why.nationId = null;
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("SCHEMA_INVALID");
    expect(error.path).toBe("$/records/0/whyAssociated/nationId");
  });

  it("scans issuingAuthority.name with the same finite guard and documents what passes", () => {
    const marked = clone();
    marked.records[0]!.issuingAuthority.name = "Attn: Ms. Synthetic Person";
    const error = failure(() => parseCitationExport(marked));
    expect(error.code).toBe("PERSONAL_CONTACT_SHAPE");
    expect(error.path).toBe("$/records/0/issuingAuthority/name");

    // An unmarked personal name carries no token and passes the guard. This
    // is the documented limit: agency-level status rests on provenance and
    // source review, never on this validator.
    const unmarked = clone();
    unmarked.records[0]!.issuingAuthority.name = "Synthetic Person, Clerk";
    expect(() => parseCitationExport(unmarked)).not.toThrow();
  });

  it("rejects an exportId lacking the synthetic prefix under a synthetic trust domain", () => {
    const candidate = clone();
    candidate.exportId = "real-export-alpha";
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("TRUST_DOMAIN_MISMATCH");
    expect(error.path).toBe("$/exportId");
  });

  it("rejects a non-.invalid sourceUrl under a synthetic trust domain", () => {
    const candidate = clone();
    candidate.records[0]!.citation.sourceUrl =
      "https://example.com/records/synthetic-export-alpha";
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("SYNTHETIC_URL_REQUIRED");
    expect(error.path).toBe("$/records/0/citation/sourceUrl");
  });

  it("rejects an injected email key at any depth", () => {
    const candidate = clone() as unknown as Record<string, unknown>;
    (candidate.records as unknown[])[0] = {
      ...(candidate.records as Record<string, unknown>[])[0],
      email: "leak@synthetic.invalid",
    };
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("PROTECTED_KEY");
    expect(error.path).toBe("$/field/0/email");
  });

  it("rejects an injected coordinates key at any depth", () => {
    const candidate = clone() as unknown as Record<string, unknown>;
    (candidate.records as unknown[])[0] = {
      ...(candidate.records as Record<string, unknown>[])[0],
      coordinates: [1, 2],
    };
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("PROTECTED_KEY");
    expect(error.path).toBe("$/field/0/coordinates");
  });

  it("rejects a wrong contactScope value", () => {
    const candidate = clone();
    (
      candidate.records[0]!.issuingAuthority as { contactScope: string }
    ).contactScope = "internal_only";
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("SCHEMA_INVALID");
    expect(error.path).toBe("$/records/0/issuingAuthority/contactScope");
  });

  it("rejects a publicPhone containing letters", () => {
    const candidate = clone();
    candidate.records[0]!.issuingAuthority.publicPhone = "PHONE12345";
    const error = failure(() => parseCitationExport(candidate));
    expect(error.code).toBe("SCHEMA_INVALID");
    expect(error.path).toBe("$/records/0/issuingAuthority/publicPhone");
  });

  it("rejects non-JSON inputs before invoking getters or serializing caller code", () => {
    let calls = 0;
    const accessor = clone();
    Object.defineProperty(accessor, "exportId", {
      enumerable: true,
      get() {
        calls++;
        return fixture.exportId;
      },
    });
    const withToJson = clone() as Record<string, unknown>;
    withToJson.toJSON = () => {
      calls++;
      return fixture;
    };
    const symbol = clone() as Record<PropertyKey, unknown>;
    symbol[Symbol("synthetic-hidden")] = "Synthetic hidden";
    const cyclic = clone() as Record<string, unknown>;
    cyclic.cycle = cyclic;
    const sparse = clone() as unknown as Record<string, unknown>;
    delete (sparse.records as unknown[])[0];
    const inherited = Object.assign(
      Object.create({ inherited: true }) as object,
      fixture,
    );
    const nonfinite = { ...fixture, extraCount: Number.POSITIVE_INFINITY };
    for (const candidate of [
      accessor,
      withToJson,
      symbol,
      cyclic,
      sparse,
      inherited,
      nonfinite,
    ]) {
      expect(failure(() => parseCitationExport(candidate)).code).toBe(
        "INVALID_JSON",
      );
    }
    expect(calls).toBe(0);
  });

  it("bounds oversized strings and recursive JSON before schema validation", () => {
    expect(
      failure(() =>
        parseCitationExport({
          ...fixture,
          exportId: "synthetic-" + "x".repeat(8193),
        }),
      ).code,
    ).toBe("INPUT_LIMIT");
    let deep: unknown = null;
    for (let index = 0; index < 40; index++) deep = { child: deep };
    expect(failure(() => parseCitationExport(deep)).code).toBe("INPUT_LIMIT");
  });

  it("does not reflect an unvalidated private property name in diagnostics", () => {
    const marker = "synthetic-private-marker-that-must-not-be-logged";
    const candidate = { ...fixture, [marker]: () => null };
    const error = failure(() => parseCitationExport(candidate));
    expect(error.message).not.toContain(marker);
    expect(error.path).not.toContain(marker);
  });

  it("returns a byte-stable, round-trippable, detached and frozen value", () => {
    const input = clone();
    const before = JSON.stringify(input);
    const parsedOnce = parseCitationExport(input as unknown as CitationExport);
    const parsedTwice = parseCitationExport(
      clone() as unknown as CitationExport,
    );

    expect(JSON.stringify(input)).toBe(before);

    const bytesOnce = serializeCitationExport(parsedOnce);
    const bytesTwice = serializeCitationExport(parsedTwice);
    expect(bytesOnce).toBe(bytesTwice);
    expect(JSON.parse(bytesOnce)).toEqual(
      JSON.parse(JSON.stringify(parsedOnce)),
    );

    expect(Object.isFrozen(parsedOnce)).toBe(true);
    expect(Object.isFrozen(parsedOnce.records)).toBe(true);
    expect(Object.isFrozen(parsedOnce.records[0])).toBe(true);
    expect(Object.isFrozen(parsedOnce.records[0]!.fieldProvenance)).toBe(true);
    expect(Object.isFrozen(parsedOnce.nonClaims)).toBe(true);

    (input as Record<string, unknown>).exportId = "synthetic-mutated-after";
    expect(parsedOnce.exportId).not.toBe("synthetic-mutated-after");
  });
});
