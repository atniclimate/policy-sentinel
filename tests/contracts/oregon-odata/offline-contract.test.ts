import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import metadataFixture from "../../../fixtures/sources/oregon-odata/metadata.valid.json";
import malformedFixture from "../../../fixtures/sources/oregon-odata/resource-bundle-malformed.invalid.json";
import bundleFixture from "../../../fixtures/sources/oregon-odata/resource-bundle.valid.json";
import { describe, expect, it } from "vitest";

import * as oregonODataContract from "../../../src/contracts/oregon-odata";
import {
  OregonODataContractError,
  parseOregonODataOfflineBundle,
  parseOregonODataOfflineContract,
  parseOregonODataOfflineMetadata,
} from "../../../src/contracts/oregon-odata";

type EntityKind = keyof MutablePages;
type MutableItem = Record<string, unknown>;

interface MutablePage {
  pageNumber: number;
  nextPageNumber: number | null;
  items: MutableItem[];
  [key: string]: unknown;
}

interface MutablePages {
  sessions: MutablePage[];
  measures: MutablePage[];
  sponsors: MutablePage[];
  committees: MutablePage[];
  actions: MutablePage[];
  votes: MutablePage[];
  versions: MutablePage[];
  statuses: MutablePage[];
}

interface MutableBundle extends Record<string, unknown> {
  pages: MutablePages;
}

function cloneBundle(): MutableBundle {
  return structuredClone(bundleFixture) as unknown as MutableBundle;
}

function cloneMetadata(): Record<string, unknown> {
  return structuredClone(metadataFixture) as unknown as Record<string, unknown>;
}

function item(
  bundle: MutableBundle,
  entity: EntityKind,
  itemIndex = 0,
  pageIndex = 0,
): MutableItem {
  return bundle.pages[entity][pageIndex].items[itemIndex];
}

describe("Oregon OData repository-owned offline contract", () => {
  it("validates canonical logical metadata and every reviewed entity family", () => {
    const parsed = parseOregonODataOfflineContract(
      metadataFixture,
      bundleFixture,
    );

    expect(parsed.metadata).toMatchObject({
      contractVersion: "1.0.0",
      kind: "repository_owned_offline_metadata",
      sourceId: "oregon-legislature-odata",
      historyBoundary: {
        earliestSessionYear: 2007,
        meaning:
          "offline_contract_floor_from_earliest_observed_odata_session_not_a_completeness_claim",
      },
    });
    expect(
      parsed.metadata.entities.map(({ logicalName }) => logicalName),
    ).toEqual([
      "sessions",
      "measures",
      "sponsors",
      "committees",
      "actions",
      "votes",
      "versions",
      "statuses",
    ]);
    expect(parsed.bundle.pages.measures).toHaveLength(2);
    expect(parsed.bundle.pages.measures[0].nextPageNumber).toBe(2);
    expect(parsed.bundle.pages.measures[1].nextPageNumber).toBeNull();
    const entityPages = Object.values(parsed.bundle.pages) as Array<
      Array<{ items: unknown[] }>
    >;
    for (const entity of entityPages) {
      expect(entity.flatMap(({ items }) => items).length).toBeGreaterThan(0);
    }
  });

  it("preserves nullable source concepts without inventing absent values", () => {
    const parsed = parseOregonODataOfflineBundle(bundleFixture);
    const secondMeasure = parsed.pages.measures[1].items[0];
    const secondVote = parsed.pages.votes[0].items[1];

    expect(secondMeasure).toMatchObject({
      title: null,
      relatingToText: null,
    });
    expect(secondVote).toMatchObject({
      committeeId: null,
      occurredAt: null,
      resultLabel: null,
      yesCount: null,
    });
    expect(parsed.pages.versions[0].items[1].publishedAt).toBeNull();
    expect(parsed.pages.statuses[0].items[2].asOf).toBeNull();
  });

  it("keeps Relating To source language out of category and Nation fields", () => {
    const parsed = parseOregonODataOfflineBundle(bundleFixture);
    const firstMeasure = parsed.pages.measures[0].items[0];

    expect(firstMeasure.relatingToText).toBe(
      "Relating to synthetic intergovernmental records.",
    );
    expect(firstMeasure).not.toHaveProperty("category");
    expect(firstMeasure).not.toHaveProperty("officialSubjects");
    expect(firstMeasure).not.toHaveProperty("nationAssociations");
    expect(parsed).not.toHaveProperty("records");
    expect(parsed).not.toHaveProperty("fieldProvenance");
  });

  it("rejects copied-envelope and non-allowlisted personal-data fields", () => {
    expect(() => parseOregonODataOfflineBundle(malformedFixture)).toThrowError(
      /unexpected_field.*email/,
    );

    for (const [entity, field] of [
      ["sponsors", "phone"],
      ["committees", "publicTestimony"],
      ["votes", "voterNames"],
      ["measures", "landDescription"],
    ] as const) {
      const changed = cloneBundle();
      item(changed, entity)[field] = "excluded";
      expect(
        () => parseOregonODataOfflineBundle(changed),
        `${entity}.${field}`,
      ).toThrowError(/unexpected_field/);
    }

    const providerEnvelope = cloneBundle();
    providerEnvelope["@odata.context"] = "excluded";
    expect(() => parseOregonODataOfflineBundle(providerEnvelope)).toThrowError(
      /unexpected_field.*@odata\.context/,
    );
  });

  it("requires explicit nullable fields rather than treating omission as null", () => {
    const missing = cloneBundle();
    delete item(missing, "measures").title;
    expect(() => parseOregonODataOfflineBundle(missing)).toThrowError(
      /missing_field.*title/,
    );

    const wrongNullability = cloneBundle();
    item(wrongNullability, "sessions").displayName = null;
    expect(() => parseOregonODataOfflineBundle(wrongNullability)).toThrowError(
      /invalid_type.*displayName/,
    );
  });

  it("fails closed on incomplete, oversized, duplicate, and unstable pages", () => {
    const earlyTerminal = cloneBundle();
    earlyTerminal.pages.measures[0].nextPageNumber = null;
    expect(() => parseOregonODataOfflineBundle(earlyTerminal)).toThrowError(
      /inconsistent_value.*nextPageNumber/,
    );

    const unterminated = cloneBundle();
    unterminated.pages.measures[1].nextPageNumber = 3;
    expect(() => parseOregonODataOfflineBundle(unterminated)).toThrowError(
      /inconsistent_value.*nextPageNumber/,
    );

    const emptyIntermediate = cloneBundle();
    emptyIntermediate.pages.measures[0].items = [];
    expect(() => parseOregonODataOfflineBundle(emptyIntermediate)).toThrowError(
      /invalid_value.*items/,
    );

    const duplicate = cloneBundle();
    item(duplicate, "measures", 0, 1).measureId = "SYN-MEASURE-0001";
    expect(() => parseOregonODataOfflineBundle(duplicate)).toThrowError(
      /duplicate_value.*SYN-MEASURE-0001/,
    );

    const unstableOrder = cloneBundle();
    item(unstableOrder, "measures", 0, 1).measureId = "SYN-MEASURE-0000";
    expect(() => parseOregonODataOfflineBundle(unstableOrder)).toThrowError(
      /inconsistent_value.*strictly ordered/,
    );

    const oversized = cloneBundle();
    oversized.pages.sessions[0].items = Array.from({ length: 251 }, () =>
      structuredClone(oversized.pages.sessions[0].items[0]),
    );
    expect(() => parseOregonODataOfflineBundle(oversized)).toThrowError(
      /limit_exceeded.*items/,
    );
  });

  it("rejects missing and cross-entity references", () => {
    const cases: Array<[string, (value: MutableBundle) => void]> = [
      [
        "measure session",
        (value) => {
          item(value, "measures").sessionId = "SYN-SESSION-MISSING";
        },
      ],
      [
        "measure current status",
        (value) => {
          item(value, "measures").statusId = "SYN-STATUS-0003";
        },
      ],
      [
        "sponsor measure",
        (value) => {
          item(value, "sponsors").measureId = "SYN-MEASURE-MISSING";
        },
      ],
      [
        "committee session",
        (value) => {
          item(value, "committees").sessionId = "SYN-SESSION-MISSING";
        },
      ],
      [
        "action measure",
        (value) => {
          item(value, "actions").measureId = "SYN-MEASURE-MISSING";
        },
      ],
      [
        "vote action",
        (value) => {
          item(value, "votes").actionId = "SYN-ACTION-0002";
        },
      ],
      [
        "version measure",
        (value) => {
          item(value, "versions").measureId = "SYN-MEASURE-MISSING";
        },
      ],
      [
        "status measure",
        (value) => {
          item(value, "statuses").measureId = "SYN-MEASURE-MISSING";
        },
      ],
    ];

    for (const [label, mutate] of cases) {
      const changed = cloneBundle();
      mutate(changed);
      expect(() => parseOregonODataOfflineBundle(changed), label).toThrowError(
        /inconsistent_value/,
      );
    }
  });

  it("rejects duplicate relationship identities within a measure", () => {
    const duplicateSequence = cloneBundle();
    item(duplicateSequence, "actions", 1).measureId = "SYN-MEASURE-0001";
    expect(() => parseOregonODataOfflineBundle(duplicateSequence)).toThrowError(
      /duplicate_value.*sequence/,
    );

    const duplicateVersionLabel = cloneBundle();
    const firstVersion = item(duplicateVersionLabel, "versions");
    const secondVersion = item(duplicateVersionLabel, "versions", 1);
    secondVersion.measureId = firstVersion.measureId;
    secondVersion.versionLabel = firstVersion.versionLabel;
    expect(() =>
      parseOregonODataOfflineBundle(duplicateVersionLabel),
    ).toThrowError(/duplicate_value.*versionLabel/);
  });

  it("rejects unsupported history and malformed calendar values", () => {
    const unsupportedHistory = cloneBundle();
    item(unsupportedHistory, "sessions").sessionYear = 2006;
    item(unsupportedHistory, "sessions").startDate = "2006-01-01";
    expect(() =>
      parseOregonODataOfflineBundle(unsupportedHistory),
    ).toThrowError(/invalid_value.*sessionYear/);

    const badDate = cloneBundle();
    item(badDate, "versions").publishedAt = "3785-02-30";
    expect(() => parseOregonODataOfflineBundle(badDate)).toThrowError(
      /real ISO date or UTC date-time/,
    );
  });

  it("rejects drift from the repository-owned metadata contract", () => {
    const changedBoundary = cloneMetadata();
    const boundary = changedBoundary.historyBoundary as Record<string, unknown>;
    boundary.earliestSessionYear = 2006;
    expect(() => parseOregonODataOfflineMetadata(changedBoundary)).toThrowError(
      /inconsistent_value.*earliestSessionYear/,
    );

    const extra = cloneMetadata();
    extra.providerEnvelope = {};
    expect(() => parseOregonODataOfflineMetadata(extra)).toThrowError(
      /unexpected_field.*providerEnvelope/,
    );
  });

  it("exposes typed errors with stable field paths", () => {
    try {
      parseOregonODataOfflineBundle(malformedFixture);
      throw new Error("expected parsing to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(OregonODataContractError);
      expect(error).toMatchObject({
        code: "unexpected_field",
        path: "$.pages.sponsors[0].items[0].email",
      });
    }
  });

  it("contains no network, environment, transport, or adapter surface", () => {
    const sourceDirectory = path.resolve(
      process.cwd(),
      "src/contracts/oregon-odata",
    );
    const source = readdirSync(sourceDirectory)
      .filter((name) => name.endsWith(".ts"))
      .map((name) => readFileSync(path.join(sourceDirectory, name), "utf8"))
      .join("\n");

    for (const forbidden of [
      /\bfetch\s*\(/,
      /process\.env/,
      /node:https?/,
      /XMLHttpRequest/,
      /WebSocket/,
    ]) {
      expect(source).not.toMatch(forbidden);
    }
    expect(Object.keys(oregonODataContract).join(" ")).not.toMatch(
      /adapter|transport/i,
    );
  });
});
