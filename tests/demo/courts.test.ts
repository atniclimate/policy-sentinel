// @vitest-environment node
// Pure court helpers (T1.5): the court table, docket forms with a court code,
// the U.S. Reports volume rule, caption withholding and the case row text.
import { describe, expect, it } from "vitest";
import { courts as COURTS } from "../../src/demo/copy/courts";
import {
  COURT_CODES,
  COURT_LABELS,
  LINK_OUTS,
  US_REPORTS_LAST_VOLUME,
  captionShown,
  caseRowText,
  courtDocketReading,
  docketFromPackageId,
  packageIdFor,
  usReportsReading,
  withheldTitle,
} from "../../src/demo/courts";
import type { DemoCitation } from "../../src/demo/types";
import { nationNameProbes } from "../support/nation-name-probes";

const FORBIDDEN =
  /\b(governs|applies|applicable|implements|authorizes|authorized by|under|eligible|eligibility|valid|binding|jurisdiction|good law|overrule|enacted by|supporting legislation|the law behind)\b/i;

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function")
    return strings((value as (...a: string[]) => unknown)("X", "Y"));
  if (value && typeof value === "object")
    return Object.values(value).flatMap(strings);
  return [];
}

const caseRow = (over: Partial<DemoCitation> = {}): DemoCitation => ({
  sourceId: "govinfo-courts",
  identifier: "USCOURTS-ca9-99-12345",
  title: "EXAMPLE COUNTY V. UNITED STATES",
  issuingBody: COURT_LABELS.ca9,
  kind: "USCOURTS",
  date: "2099-03-04",
  officialUrl: "https://www.govinfo.gov/app/details/USCOURTS-ca9-99-12345",
  textUrl: null,
  retrievedAt: "2099-03-05T00:00:00.000Z",
  summary: null,
  textAvailable: false,
  matchKey: null,
  court: "ca9",
  docketNumber: "99-12345",
  packageId: "USCOURTS-ca9-99-12345",
  lastModified: "2099-03-05T01:02:03Z",
  caseCitationProvided: false,
  ...over,
});

describe("court table", () => {
  it("lists exactly the seven courts searched, each with a label", () => {
    expect([...COURT_CODES]).toEqual([
      "ca9",
      "cafc",
      "cofc",
      "wawd",
      "waed",
      "ord",
      "idd",
    ]);
    for (const code of COURT_CODES) expect(COURT_LABELS[code]).toBeTruthy();
  });

  it("links out to IBIA and the NILL directory only, with no per-Nation URL", () => {
    expect(LINK_OUTS.map((l) => l.id)).toEqual(["ibia", "nill"]);
    for (const link of LINK_OUTS) expect(link.url).toMatch(/^https:\/\//);
    const probes = nationNameProbes().map((p) => p.toLowerCase());
    const text = JSON.stringify(LINK_OUTS).toLowerCase();
    expect(probes.some((p) => p.length > 3 && text.includes(p))).toBe(false);
  });

  it("keeps the design rule 2 words out of every court string", () => {
    for (const text of strings(COURTS)) expect(text).not.toMatch(FORBIDDEN);
    for (const text of strings(LINK_OUTS)) expect(text).not.toMatch(FORBIDDEN);
    for (const text of strings(COURT_LABELS))
      expect(text).not.toMatch(FORBIDDEN);
  });
});

describe("docket forms with a court code", () => {
  it.each([
    ["ca9 99-12345", "ca9", "99-12345", "USCOURTS-ca9-99-12345"],
    ["CAFC 2099-1001", "cafc", "2099-1001", "USCOURTS-cafc-2099-1001"],
    [
      "wawd 2:99-cv-00123",
      "wawd",
      "2:99-cv-00123",
      "USCOURTS-wawd-2_99-cv-00123",
    ],
    [
      "cofc 1:99-cv-00042",
      "cofc",
      "1:99-cv-00042",
      "USCOURTS-cofc-1_99-cv-00042",
    ],
    ["idd 1:99-cr-00007", "idd", "1:99-cr-00007", "USCOURTS-idd-1_99-cr-00007"],
  ])("reads %s", (text, court, docketNumber, packageId) => {
    expect(courtDocketReading(text)).toEqual({
      court,
      docketNumber,
      packageId,
    });
    expect(docketFromPackageId(packageId)).toEqual({ court, docketNumber });
  });

  it.each([
    "99-12345", // no court code: never guessed
    "ca1 99-12345", // a court this demo does not search
    "ca9 2:99-cv-00123", // a district form on an appellate court
    "wawd 99-12345", // an appellate form on a district court
    "ca9 99-12345 extra",
    "ord",
  ])("does not read %s", (text) => {
    expect(courtDocketReading(text)).toBeNull();
  });

  it("refuses package ids outside the seven courts", () => {
    expect(docketFromPackageId("USCOURTS-ca1-99-12345")).toBeNull();
    expect(docketFromPackageId("USREPORTS-443-658")).toBeNull();
    expect(packageIdFor("ca9", "../x")).toBeNull();
  });
});

describe("U.S. Reports volume rule", () => {
  it("looks up a citation through the last GovInfo volume", () => {
    expect(US_REPORTS_LAST_VOLUME).toBe(586);
    expect(usReportsReading("586 U.S. 1")).toEqual({
      kind: "lookup",
      volume: 586,
      page: 1,
      citation: "586 U.S. 1",
    });
    expect(usReportsReading("199 U. S. 42")).toMatchObject({
      kind: "lookup",
      volume: 199,
      page: 42,
    });
  });

  it("answers above volume 586 without a lookup", () => {
    expect(usReportsReading("587 U.S. 1")).toEqual({
      kind: "not_resolvable",
      citation: "587 U.S. 1",
      message: COURTS.notResolvable,
    });
    expect(COURTS.notResolvable).toBe(
      "Not resolvable from an official source; search the case name.",
    );
  });

  it("is not a U.S. Reports reading for other text", () => {
    expect(usReportsReading("25 U.S.C. 5321")).toBeNull();
    expect(usReportsReading("example words")).toBeNull();
  });
});

describe("caption withholding", () => {
  it.each([
    "EXAMPLE COUNTY V. UNITED STATES",
    "Example Tribe v. Department of Example Affairs",
    "Oregon v. Example Corp.",
    "EXAMPLE ASSOCIATION, ET AL. V. EXAMPLE AGENCY",
    "Port of Example v. United States",
    "State of Washington v. Example Tribe",
    "Secretary of the Interior v. Example Corp.",
    "City of Example v U.S.",
  ])("shows an institutional caption: %s", (title) => {
    expect(captionShown(title)).toBe(true);
  });

  it.each([
    "SAMPLEPERSON V. EXAMPLE FINANCIAL, LLC", // one side is a person
    "Example v. Sampleperson, Director, Bureau of Examples", // a name before a title
    "In re Example", // no two sides
    "Example Corp. v. Mr. Sampleperson", // the personal-pattern guard
    // R2-1: a family trust, and parties joined by "and" or "&", carry no comma.
    "SAMPLEPERSON FAMILY TRUST V. UNITED STATES",
    "JANE SAMPLEPERSON AND EXAMPLE COUNTY V. UNITED STATES",
    "Sampleperson & Example Corp. v. United States",
    "Jane Sampleperson Revocable Living Trust v. United States",
    "Jane Sampleperson, Trustee v. United States",
    "Example County v. Jane Sampleperson Individually",
    "United States ex rel. Sampleperson v. Example Corp.",
    // R1-4: an institution word inside a side does not make it an institution.
    "Example Sampleperson Trust v. United States",
    "Jane Sampleperson Port v. United States",
    "Jane Sampleperson Secretary of the Department of the Interior v. Example Tribe",
    "Jane Sampleperson State Trooper v. County of Example",
    "Jane Sampleperson Center v. Department of Labor",
    "Jane Sampleperson Nation v. United States",
  ])("withholds a caption that may name a person: %s", (title) => {
    expect(captionShown(title)).toBe(false);
  });
});

describe("case row text", () => {
  it("states the court, docket with court code and no citation", () => {
    const text = caseRowText(caseRow());
    expect(text).toEqual({
      caseName: "EXAMPLE COUNTY V. UNITED STATES",
      captionWithheld: false,
      court: COURT_LABELS.ca9,
      docket: "99-12345 (ca9)",
      dateIssued: "2099-03-04",
      citation: COURTS.citationNotProvided,
      officialUrl: "https://www.govinfo.gov/app/details/USCOURTS-ca9-99-12345",
    });
    expect(COURTS.citationNotProvided.toLowerCase()).toContain(
      "citation not provided by this source",
    );
  });

  it("states a U.S. Reports citation read from the GovInfo volume and page", () => {
    const text = caseRowText(
      caseRow({
        identifier: "USREPORTS-199-42",
        kind: "USREPORTS",
        court: undefined,
        docketNumber: undefined,
        caseCitationProvided: true,
      }),
    );
    expect(text.citation).toBe(COURTS.citationStated("199 U.S. 42"));
    expect(text.docket).toBeNull();
  });

  it("marks a withheld caption and an unstated date", () => {
    const text = caseRow({
      title: withheldTitle("ca9 99-12345"),
      date: null,
    });
    expect(caseRowText(text)).toMatchObject({
      captionWithheld: true,
      dateIssued: COURTS.dateNotStated,
    });
  });

  it("reads an older GovInfo row with no version 3 fields", () => {
    const text = caseRowText(
      caseRow({
        sourceId: "govinfo",
        court: undefined,
        docketNumber: undefined,
        caseCitationProvided: undefined,
        issuingBody: "Example Court",
      }),
    );
    expect(text.court).toBe("Example Court");
    expect(text.docket).toBeNull();
    expect(text.citation).toBe(COURTS.citationNotProvided);
  });
});
