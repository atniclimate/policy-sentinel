import billsFixture from "../../../fixtures/sources/govinfo/bills-package-no-granules.valid.json";
import federalRegisterFixture from "../../../fixtures/sources/govinfo/federal-register-granule.valid.json";
import malformedFixture from "../../../fixtures/sources/govinfo/resource-malformed.invalid.json";
import retryFixture from "../../../fixtures/sources/govinfo/retry-after-503.valid.json";
import courtsFixture from "../../../fixtures/sources/govinfo/us-courts-selected-incomplete.valid.json";
import { describe, expect, it } from "vitest";

import {
  GovInfoContractError,
  getGovInfoProviderFixityBindingState,
  parseGovInfoSyntheticResource,
  parseGovInfoSyntheticRetryDirective,
} from "../../../src/contracts/govinfo/response-contract";

function clone(value: unknown): Record<string, unknown> {
  return structuredClone(value) as Record<string, unknown>;
}

function packageOf(value: Record<string, unknown>): Record<string, unknown> {
  return value.package as Record<string, unknown>;
}

function modsOf(value: Record<string, unknown>): Record<string, unknown> {
  return value.mods as Record<string, unknown>;
}

function linksOf(value: Record<string, unknown>): Record<string, unknown> {
  return value.links as Record<string, unknown>;
}

function integrityOf(value: Record<string, unknown>): Record<string, unknown> {
  return value.integrity as Record<string, unknown>;
}

describe("GovInfo repository-owned synthetic response contract", () => {
  it("retains the BILLS package contract without inventing granules", () => {
    const parsed = parseGovInfoSyntheticResource(billsFixture);

    expect(parsed).toMatchObject({
      contractVersion: "1.0.0",
      fixtureNotice: "Synthetic contract data; not a GovInfo response.",
      kind: "repository_resource_projection",
      sourceId: "govinfo",
      stableId: "govinfo:BILLS-SYNTHETIC-999hr9001ih",
      coverage: {
        collectionCode: "BILLS",
        range: "published versions from 103rd Congress onward",
        completeness: "collection_specific",
        granuleAvailability: "not_modeled",
      },
      package: {
        collectionCode: "BILLS",
        packageId: "BILLS-SYNTHETIC-999hr9001ih",
      },
    });
    expect(parsed).not.toHaveProperty("granule");
    expect(parsed.package.lastModified).toBe("3785-04-03T08:15:30Z");
    expect(parsed.package.dateIssued).toBe("3785-04-01");
    expect(parsed.package.dateIngested).toBe("3785-04-02");
    expect(
      parsed.links?.formats.map(({ scope, format }) => [scope, format]),
    ).toEqual([
      ["package", "pdf"],
      ["package", "text"],
    ]);
    expect(getGovInfoProviderFixityBindingState(parsed.integrity)).toBe(
      "unverified_binding",
    );
  });

  it("binds an FR granule to its package and keeps only allowlisted MODS", () => {
    const parsed = parseGovInfoSyntheticResource(federalRegisterFixture);

    expect(parsed.granule).toMatchObject({
      granuleId: "FR-SYNTHETIC-3785-900001",
      parentPackageId: "FR-SYNTHETIC-3785-04-01",
      granuleClass: "NOTICE",
    });
    expect(parsed.mods.recordIdentifier).toBe("FR-SYNTHETIC-3785-900001");
    expect(parsed.mods.identifiers).toEqual(
      expect.arrayContaining([
        {
          type: "package-id",
          value: "FR-SYNTHETIC-3785-04-01",
        },
        {
          type: "granule-id",
          value: "FR-SYNTHETIC-3785-900001",
        },
      ]),
    );
    expect(parsed.mods).not.toHaveProperty("rawXml");
    expect(parsed.mods).not.toHaveProperty("contactEmail");
    expect(parsed.links?.formats).toHaveLength(2);
    expect(
      parsed.links?.formats.every(({ scope }) => scope === "granule"),
    ).toBe(true);
    expect(getGovInfoProviderFixityBindingState(parsed.integrity)).toBe(
      "unverified_binding",
    );
  });

  it("keeps USCOURTS selected/incomplete coverage and accepts format absence", () => {
    const parsed = parseGovInfoSyntheticResource(courtsFixture);

    expect(parsed.coverage).toMatchObject({
      collectionCode: "USCOURTS",
      range: "selected opinions generally 2004 to present; earlier gaps",
      completeness: "selected_incomplete",
    });
    expect(parsed.package).not.toHaveProperty("title");
    expect(parsed.granule).not.toHaveProperty("title");
    expect(parsed.granule).not.toHaveProperty("granuleClass");
    expect(parsed.mods).toEqual({
      recordIdentifier: "USCOURTS-SYNTHETIC-zzd-9_99-cv-99999-0",
      dateIssued: "3785-06-10",
      identifiers: [
        {
          type: "package-id",
          value: "USCOURTS-SYNTHETIC-zzd-9_99-cv-99999",
        },
        {
          type: "granule-id",
          value: "USCOURTS-SYNTHETIC-zzd-9_99-cv-99999-0",
        },
      ],
      court: {
        courtCode: "SYNTHETIC-ZZD",
        courtType: "district",
        bodyType: "opinion",
      },
    });
    expect(parsed.links?.formats).toEqual([]);
    expect(parsed.integrity).toEqual({});
    expect(parsed.integrity).not.toHaveProperty("providerPremisFixity");
    expect(getGovInfoProviderFixityBindingState(parsed.integrity)).toBe(
      "provider_fixity_absent",
    );
  });

  it("rejects titles, captions, personal fields, and generic names throughout USCOURTS", () => {
    const cases: Array<[string, (value: Record<string, unknown>) => void]> = [
      [
        "package title",
        (value) => (packageOf(value).title = "Synthetic title"),
      ],
      [
        "package caption",
        (value) => (packageOf(value).caption = "Synthetic caption"),
      ],
      [
        "granule title",
        (value) =>
          ((value.granule as Record<string, unknown>).title =
            "Synthetic title"),
      ],
      [
        "granule caption",
        (value) =>
          ((value.granule as Record<string, unknown>).caption =
            "Synthetic caption"),
      ],
      ["MODS title", (value) => (modsOf(value).title = "Synthetic title")],
      [
        "MODS party",
        (value) => (modsOf(value).party = "Synthetic party placeholder"),
      ],
      [
        "MODS party name",
        (value) => (modsOf(value).partyName = "Synthetic party placeholder"),
      ],
      ["MODS name", (value) => (modsOf(value).name = "Synthetic name")],
      ["MODS author", (value) => (modsOf(value).author = "Synthetic author")],
      [
        "MODS government authors",
        (value) => (modsOf(value).governmentAuthors = ["Synthetic body"]),
      ],
      [
        "MODS email",
        (value) => (modsOf(value).email = "synthetic@example.invalid"),
      ],
      [
        "MODS contact",
        (value) => (modsOf(value).contact = "Synthetic contact"),
      ],
      [
        "MODS address",
        (value) => (modsOf(value).address = "Synthetic address"),
      ],
      [
        "court name",
        (value) => {
          const court = modsOf(value).court as Record<string, unknown>;
          court.name = "Synthetic court name";
        },
      ],
      [
        "court email",
        (value) => {
          const court = modsOf(value).court as Record<string, unknown>;
          court.email = "synthetic-court@example.invalid";
        },
      ],
      [
        "court contact",
        (value) => {
          const court = modsOf(value).court as Record<string, unknown>;
          court.contact = "Synthetic court contact";
        },
      ],
      [
        "court address",
        (value) => {
          const court = modsOf(value).court as Record<string, unknown>;
          court.address = "Synthetic court address";
        },
      ],
    ];

    for (const [label, mutate] of cases) {
      const changed = clone(courtsFixture);
      mutate(changed);
      expect(() => parseGovInfoSyntheticResource(changed), label).toThrowError(
        /unexpected_field/,
      );
    }
  });

  it("keeps USCOURTS court/body metadata and identifiers tightly bounded", () => {
    const cases: Array<[string, (value: Record<string, unknown>) => void]> = [
      [
        "non-synthetic court code",
        (value) => {
          const court = modsOf(value).court as Record<string, unknown>;
          court.courtCode = "ZZD";
        },
      ],
      [
        "unknown court type",
        (value) => {
          const court = modsOf(value).court as Record<string, unknown>;
          court.courtType = "synthetic-unknown";
        },
      ],
      [
        "unknown body type",
        (value) => {
          const court = modsOf(value).court as Record<string, unknown>;
          court.bodyType = "synthetic-order";
        },
      ],
      [
        "document number",
        (value) => {
          const identifiers = modsOf(value).identifiers as Array<
            Record<string, unknown>
          >;
          identifiers.push({
            type: "document-number",
            value: "SYNTHETIC-DOCUMENT-IDENTIFIER",
          });
        },
      ],
    ];

    for (const [label, mutate] of cases) {
      const changed = clone(courtsFixture);
      mutate(changed);
      expect(() => parseGovInfoSyntheticResource(changed), label).toThrowError(
        /invalid_value|inconsistent_response/,
      );
    }
  });

  it("rejects non-allowlisted metadata and provider-envelope fields", () => {
    expect(() => parseGovInfoSyntheticResource(malformedFixture)).toThrowError(
      /unexpected_field.*contactEmail/,
    );

    const extra = clone(billsFixture);
    extra.count = 1;
    expect(() => parseGovInfoSyntheticResource(extra)).toThrowError(
      /unexpected_field.*count/,
    );

    const providerMd5 = clone(billsFixture);
    packageOf(providerMd5).md5 = "0".repeat(32);
    expect(() => parseGovInfoSyntheticResource(providerMd5)).toThrowError(
      /unexpected_field.*md5/,
    );
  });

  it("enforces package, granule, stable-ID, and MODS identity binding", () => {
    const cases: Array<[string, (value: Record<string, unknown>) => void]> = [
      [
        "package prefix",
        (value) => {
          packageOf(value).collectionCode = "BILLS";
        },
      ],
      [
        "granule parent",
        (value) => {
          const granule = value.granule as Record<string, unknown>;
          granule.parentPackageId = "FR-SYNTHETIC-OTHER";
        },
      ],
      [
        "stable ID",
        (value) => {
          value.stableId = "govinfo:FR-SYNTHETIC-OTHER";
        },
      ],
      [
        "MODS record",
        (value) => {
          modsOf(value).recordIdentifier = "FR-SYNTHETIC-OTHER";
        },
      ],
      [
        "MODS package identifier",
        (value) => {
          const identifiers = modsOf(value).identifiers as Array<
            Record<string, unknown>
          >;
          identifiers[0].value = "FR-SYNTHETIC-OTHER";
        },
      ],
    ];

    for (const [label, mutate] of cases) {
      const changed = clone(federalRegisterFixture);
      mutate(changed);
      expect(() => parseGovInfoSyntheticResource(changed), label).toThrowError(
        /inconsistent_response|invalid_value/,
      );
    }
  });

  it("keeps BILLS granules outside this repository contract without a global claim", () => {
    const changed = clone(billsFixture);
    changed.granule = {
      granuleId: "BILLS-SYNTHETIC-GRANULE",
      parentPackageId: "BILLS-SYNTHETIC-999hr9001ih",
      title: "Synthetic disallowed bill granule",
      lastModified: "3785-04-03T08:15:30Z",
      dateIssued: "3785-04-01",
      dateIngested: "3785-04-02",
    };

    expect(() => parseGovInfoSyntheticResource(changed)).toThrowError(
      /inconsistent_response.*BILLS granules/,
    );
  });

  it("rejects credentials, non-HTTPS schemes, unreviewed hosts, and drifted paths", () => {
    const unsafeUrls = [
      "http://www.govinfo.gov/app/details/BILLS-SYNTHETIC-999hr9001ih",
      "https://api.govinfo.gov/packages/BILLS-SYNTHETIC-999hr9001ih/summary",
      "https://www.govinfo.gov.evil.invalid/app/details/BILLS-SYNTHETIC-999hr9001ih",
      "https://user:password@www.govinfo.gov/app/details/BILLS-SYNTHETIC-999hr9001ih",
      "https://www.govinfo.gov/app/details/BILLS-SYNTHETIC-999hr9001ih?api_key=synthetic",
    ];

    for (const unsafeUrl of unsafeUrls) {
      const changed = clone(billsFixture);
      linksOf(changed).detailsUrl = unsafeUrl;
      expect(() => parseGovInfoSyntheticResource(changed)).toThrowError(
        /invalid_url/,
      );
    }

    const driftedPath = clone(billsFixture);
    linksOf(driftedPath).detailsUrl =
      "https://www.govinfo.gov/app/details/BILLS-SYNTHETIC-OTHER";
    expect(() => parseGovInfoSyntheticResource(driftedPath)).toThrowError(
      /inconsistent_response.*details URL/,
    );
  });

  it("retains provider PREMIS fixity only with an explicitly unverified binding", () => {
    const changed = clone(billsFixture);
    const provider = integrityOf(changed).providerPremisFixity as Record<
      string,
      unknown
    >;
    provider.digest = "b".repeat(64);
    provider.objectIdentifier = "SYNTHETIC-OPAQUE-PREMIS-OTHER";
    const parsed = parseGovInfoSyntheticResource(changed);

    expect(parsed.integrity.providerPremisFixity).toEqual({
      algorithm: "SHA-256",
      digest: "b".repeat(64),
      objectIdentifier: "SYNTHETIC-OPAQUE-PREMIS-OTHER",
      bindingStatus: "unverified_binding",
    });
    expect(getGovInfoProviderFixityBindingState(parsed.integrity)).toBe(
      "unverified_binding",
    );

    const invalidBinding = clone(billsFixture);
    const invalidProvider = integrityOf(invalidBinding)
      .providerPremisFixity as Record<string, unknown>;
    invalidProvider.bindingStatus = "verified_binding";
    expect(() => parseGovInfoSyntheticResource(invalidBinding)).toThrowError(
      /invalid_value.*bindingStatus/,
    );

    const missingOpaqueIdentifier = clone(billsFixture);
    const noIdentifier = integrityOf(missingOpaqueIdentifier)
      .providerPremisFixity as Record<string, unknown>;
    noIdentifier.objectIdentifier = "";
    expect(() =>
      parseGovInfoSyntheticResource(missingOpaqueIdentifier),
    ).toThrowError(/invalid_value.*objectIdentifier/);
  });

  it("binds each local SHA-256 to one exact advertised rendition", () => {
    const cases: Array<[string, (value: Record<string, unknown>) => void]> = [
      [
        "cross format",
        (value) => {
          const local = integrityOf(value).localTransportSha256 as Record<
            string,
            unknown
          >;
          local.format = "xml";
        },
      ],
      [
        "cross scope",
        (value) => {
          const local = integrityOf(value).localTransportSha256 as Record<
            string,
            unknown
          >;
          local.scope = "granule";
        },
      ],
      [
        "cross URL",
        (value) => {
          const local = integrityOf(value).localTransportSha256 as Record<
            string,
            unknown
          >;
          local.renditionUrl =
            "https://www.govinfo.gov/content/pkg/BILLS-SYNTHETIC-999hr9001ih/html/BILLS-SYNTHETIC-999hr9001ih.htm";
        },
      ],
      [
        "links absent",
        (value) => {
          delete value.links;
        },
      ],
      [
        "formats absent",
        (value) => {
          linksOf(value).formats = [];
        },
      ],
    ];

    for (const [label, mutate] of cases) {
      const changed = clone(billsFixture);
      mutate(changed);
      expect(() => parseGovInfoSyntheticResource(changed), label).toThrowError(
        /inconsistent_response.*local digest/,
      );
    }
  });

  it("rejects package rendition links on a granule projection", () => {
    const changed = clone(federalRegisterFixture);
    const formats = linksOf(changed).formats as Array<Record<string, unknown>>;
    formats[0] = {
      scope: "package",
      format: "pdf",
      objectIdentifier: "FR-SYNTHETIC-3785-04-01",
      url: "https://www.govinfo.gov/content/pkg/FR-SYNTHETIC-3785-04-01/pdf/FR-SYNTHETIC-3785-04-01.pdf",
    };

    expect(() => parseGovInfoSyntheticResource(changed)).toThrowError(
      /inconsistent_response.*expected a granule rendition/,
    );
  });

  it("fails closed on malformed dates, digests, and duplicate format identities", () => {
    const malformedDate = clone(billsFixture);
    packageOf(malformedDate).dateIssued = "3785-02-30";
    expect(() => parseGovInfoSyntheticResource(malformedDate)).toThrowError(
      /real ISO calendar date/,
    );

    const malformedDigest = clone(billsFixture);
    const local = integrityOf(malformedDigest).localTransportSha256 as Record<
      string,
      unknown
    >;
    local.digest = "A".repeat(64);
    expect(() => parseGovInfoSyntheticResource(malformedDigest)).toThrowError(
      /SHA-256 digest/,
    );

    const duplicateFormat = clone(billsFixture);
    const formats = linksOf(duplicateFormat).formats as unknown[];
    formats.push(structuredClone(formats[0]));
    expect(() => parseGovInfoSyntheticResource(duplicateFormat)).toThrowError(
      /duplicate_value.*formats/,
    );
  });

  it("models 503 Retry-After as bounded repository policy, not provider JSON", () => {
    const parsed = parseGovInfoSyntheticRetryDirective(retryFixture);

    expect(parsed).toEqual({
      contractVersion: "1.0.0",
      fixtureNotice: "Synthetic contract data; not a GovInfo response.",
      kind: "repository_retry_directive",
      sourceId: "govinfo",
      directiveOrigin: "repository_policy",
      providerEnvelope: false,
      statusCode: 503,
      operation: "package-mods",
      retryAfterSeconds: 30,
      localAttemptPolicy: {
        maximumAttempts: 3,
        maximumElapsedSeconds: 120,
      },
    });
    expect(parsed).not.toHaveProperty("message");
  });

  it("rejects unsafe or unbounded synthetic retry directives", () => {
    const cases: Array<[string, unknown]> = [
      ["provider envelope", true],
      ["zero Retry-After", 0],
      ["excess Retry-After", 61],
      ["fractional Retry-After", 30.5],
    ];

    for (const [label, value] of cases) {
      const changed = clone(retryFixture);
      if (label === "provider envelope") {
        changed.providerEnvelope = value;
      } else {
        changed.retryAfterSeconds = value;
      }
      expect(
        () => parseGovInfoSyntheticRetryDirective(changed),
        label,
      ).toThrowError(/invalid_value/);
    }

    const tooManyAttempts = clone(retryFixture);
    const attemptPolicy = tooManyAttempts.localAttemptPolicy as Record<
      string,
      unknown
    >;
    attemptPolicy.maximumAttempts = 4;
    expect(() =>
      parseGovInfoSyntheticRetryDirective(tooManyAttempts),
    ).toThrowError(/invalid_value.*maximumAttempts/);

    const providerMessage = clone(retryFixture);
    providerMessage.message = "synthetic provider-shaped body";
    expect(() =>
      parseGovInfoSyntheticRetryDirective(providerMessage),
    ).toThrowError(/unexpected_field.*message/);

    const unsupportedOperation = clone(retryFixture);
    unsupportedOperation.operation = "package-pdf";
    expect(() =>
      parseGovInfoSyntheticRetryDirective(unsupportedOperation),
    ).toThrowError(/invalid_value.*operation/);
  });

  it("exposes typed failures with stable field paths", () => {
    try {
      parseGovInfoSyntheticResource(malformedFixture);
      throw new Error("expected parsing to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(GovInfoContractError);
      expect(error).toMatchObject({
        code: "unexpected_field",
        path: "$.mods.contactEmail",
      });
    }
  });
});
