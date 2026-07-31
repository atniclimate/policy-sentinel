import historicalFixture from "../../../fixtures/sources/congress/resource-bundle-historical.valid.json";
import malformedFixture from "../../../fixtures/sources/congress/resource-bundle-malformed.invalid.json";
import completeFixture from "../../../fixtures/sources/congress/resource-bundle.valid.json";
import { describe, expect, it } from "vitest";

import {
  CongressGovContractError,
  parseCongressGovSyntheticBundle,
} from "../../../src/contracts/congress/response-contract";

function clone(value: unknown): Record<string, unknown> {
  return structuredClone(value) as Record<string, unknown>;
}

function billOf(value: Record<string, unknown>): Record<string, unknown> {
  return value.bill as Record<string, unknown>;
}

describe("Congress.gov synthetic resource contract", () => {
  it("covers the reviewed session, bill, and subresource fragments", () => {
    const parsed = parseCongressGovSyntheticBundle(completeFixture);

    expect(parsed).toMatchObject({
      contractVersion: "1.0.0",
      fixtureNotice: "Synthetic contract data; not a Congress.gov response.",
      sourceId: "congress-gov",
      stableId: "congress-gov:999:hr:1001",
      congressNumber: 999,
      bill: {
        congress: 999,
        number: "1001",
        type: "HR",
        originChamber: "House",
        originChamberCode: "H",
        laws: [{ number: "999-999", type: "Public Law" }],
      },
    });
    expect(parsed.congress.sessions).toHaveLength(2);
    expect(parsed.sponsors?.[0]?.bioguideId).toBe("Z999999");
    for (const excluded of [
      "firstName",
      "lastName",
      "middleName",
      "party",
      "state",
      "url",
    ]) {
      expect(parsed.sponsors?.[0]).not.toHaveProperty(excluded);
    }
    expect(parsed.committees?.[0]?.systemCode).toBe("hszz99");
    expect(parsed.actions).toHaveLength(2);
    expect(parsed.summaries?.[0]?.versionCode).toBe("00");
    expect(parsed.summaries?.[0]).not.toHaveProperty("text");
    expect(parsed.titles?.[0]?.billTextVersionCode).toBe("ih");
    expect(parsed.textVersions?.[0]?.formats[0]?.type).toBe("Formatted Text");
  });

  it("preserves exact subject labels without inferring a category or Nation", () => {
    const parsed = parseCongressGovSyntheticBundle(completeFixture);

    expect(parsed.subjects).toEqual({
      policyArea: { name: "Synthetic Public Administration" },
      legislativeSubjects: [
        {
          name: "Synthetic intergovernmental records",
          updateDate: "3785-03-16T08:00:00Z",
        },
      ],
    });
    expect(parsed).not.toHaveProperty("category");
    expect(parsed).not.toHaveProperty("nationAssociations");
  });

  it("accepts a historical-limited resource without inventing absent fields", () => {
    const parsed = parseCongressGovSyntheticBundle(historicalFixture);

    for (const field of [
      "sponsors",
      "committees",
      "actions",
      "summaries",
      "subjects",
      "titles",
      "textVersions",
    ]) {
      expect(parsed).not.toHaveProperty(field);
    }
    expect(parsed.congress.sessions[0]).not.toHaveProperty("endDate");
    expect(parsed.bill.latestAction).not.toHaveProperty("actionCode");
    expect(parsed.bill.latestAction).not.toHaveProperty("sourceSystem");
    expect(parsed.bill.latestAction).not.toHaveProperty("type");
    expect(parsed.bill.updateDate).toBe("3783-04-03");
  });

  it("rejects non-allowlisted contact and response fields", () => {
    expect(() =>
      parseCongressGovSyntheticBundle(malformedFixture),
    ).toThrowError(/unexpected_field.*publisherEmail/);

    const extraEnvelope = clone(completeFixture);
    extraEnvelope.pagination = { count: 1 };
    expect(() => parseCongressGovSyntheticBundle(extraEnvelope)).toThrowError(
      /unexpected_field.*pagination/,
    );
  });

  it("binds path, stable ID, and payload identity", () => {
    const cases: Array<[string, (value: Record<string, unknown>) => void]> = [
      [
        "resourcePath",
        (value) => {
          value.resourcePath = "/v3/bill/999/hr/1002";
        },
      ],
      [
        "stableId",
        (value) => {
          value.stableId = "congress-gov:999:hr:1002";
        },
      ],
      [
        "bill.congress",
        (value) => {
          billOf(value).congress = 998;
        },
      ],
      [
        "bill.url",
        (value) => {
          billOf(value).url = "https://api.congress.gov/v3/bill/999/hr/1002";
        },
      ],
      [
        "bill.legislationUrl",
        (value) => {
          billOf(value).legislationUrl =
            "https://www.congress.gov/bill/999th-congress/house-bill/1002";
        },
      ],
      [
        "bill.originChamber",
        (value) => {
          billOf(value).originChamber = "Senate";
          billOf(value).originChamberCode = "S";
        },
      ],
      [
        "bill.laws",
        (value) => {
          billOf(value).laws = [{ number: "998-999", type: "Public Law" }];
        },
      ],
      [
        "committee.url",
        (value) => {
          const committees = value.committees as Array<Record<string, unknown>>;
          committees[0].url =
            "https://api.congress.gov/v3/committee/house/hszz98";
        },
      ],
      [
        "text format URL",
        (value) => {
          const versions = value.textVersions as Array<Record<string, unknown>>;
          const formats = versions[0].formats as Array<Record<string, unknown>>;
          formats[0].url =
            "https://www.congress.gov/999/bills/hr1002/BILLS-999hr1002ih.htm";
        },
      ],
    ];
    for (const [label, mutate] of cases) {
      const changed = clone(completeFixture);
      mutate(changed);
      expect(
        () => parseCongressGovSyntheticBundle(changed),
        label,
      ).toThrowError(/inconsistent_response/);
    }
  });

  it("rejects credential-bearing, non-HTTPS, and unreviewed-host URLs", () => {
    for (const unsafeUrl of [
      "https://api.congress.gov/v3/bill/999/hr/1001?api_key=synthetic",
      "http://api.congress.gov/v3/bill/999/hr/1001",
      "https://example.invalid/v3/bill/999/hr/1001",
    ]) {
      const changed = clone(completeFixture);
      billOf(changed).url = unsafeUrl;
      expect(() => parseCongressGovSyntheticBundle(changed)).toThrowError(
        /invalid_url/,
      );
    }
  });

  it("rejects duplicate provider identities and subject labels", () => {
    const duplicateSponsor = clone(completeFixture);
    const sponsors = duplicateSponsor.sponsors as unknown[];
    sponsors.push(structuredClone(sponsors[0]));
    expect(() =>
      parseCongressGovSyntheticBundle(duplicateSponsor),
    ).toThrowError(/duplicate_value.*Bioguide/);

    const duplicateSubject = clone(completeFixture);
    const subjects = duplicateSubject.subjects as Record<string, unknown>;
    const labels = subjects.legislativeSubjects as unknown[];
    labels.push(structuredClone(labels[0]));
    expect(() =>
      parseCongressGovSyntheticBundle(duplicateSubject),
    ).toThrowError(/duplicate_value.*subject/);
  });

  it("fails closed on missing identity, malformed dates, and oversized arrays", () => {
    const missingIdentity = clone(completeFixture);
    delete billOf(missingIdentity).number;
    expect(() => parseCongressGovSyntheticBundle(missingIdentity)).toThrowError(
      /missing_field.*number/,
    );

    const malformedDate = clone(completeFixture);
    billOf(malformedDate).introducedDate = "3785-02-30";
    expect(() => parseCongressGovSyntheticBundle(malformedDate)).toThrowError(
      /real ISO calendar date/,
    );

    const malformedDateTime = clone(completeFixture);
    billOf(malformedDateTime).updateDate = "3785-02-30T08:00:00Z";
    expect(() =>
      parseCongressGovSyntheticBundle(malformedDateTime),
    ).toThrowError(/real UTC date-time/);

    const oversized = clone(completeFixture);
    oversized.sponsors = Array.from({ length: 1_025 }, () =>
      structuredClone((completeFixture.sponsors as unknown[])[0]),
    );
    expect(() => parseCongressGovSyntheticBundle(oversized)).toThrowError(
      /limit_exceeded.*sponsors/,
    );
  });

  it("exposes typed contract errors with stable path evidence", () => {
    try {
      parseCongressGovSyntheticBundle(malformedFixture);
      throw new Error("expected parsing to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(CongressGovContractError);
      expect(error).toMatchObject({
        code: "unexpected_field",
        path: "$.bill.publisherEmail",
      });
    }
  });
});
