import { describe, expect, it } from "vitest";

import { PATTERN_SET_VERSION } from "../../src/demo/cite-patterns";
import {
  FAILURE_STAGES,
  INDEX_FILE_STATUSES,
  VERBATIM_FIELDS,
  type CfrAuthorityShard,
  type IndexManifest,
  type LawAlias,
  type LawAliasFile,
  type UscSourceCreditShard,
  type VocabularyFile,
} from "../../src/demo/index-types";

const pattern = (
  id: "pl-number" | "stat-page" | "fr-page" | "usc-section",
) => ({
  id,
  version: PATTERN_SET_VERSION,
});

// Synthetic samples; `satisfies` makes this file the compile-time check.
const cfrShard = {
  $schema: "../../schemas/demo-index.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "cfr-authority-shard",
  title: 99,
  editionYear: 2025,
  revisedAsOfText: "Revised as of April 1, 2025",
  volumes: null,
  partsExpected: 2,
  partsReserved: 0,
  subpartAuthorityCount: 1,
  entries: [
    {
      title: 99,
      part: "1a",
      authorityText: "5 U.S.C. 301; Pub. L. 93-638, 88 Stat. 2203.",
      sourceText: "61 FR 32501, June 24, 1996, unless otherwise noted.",
      authorityCitations: [
        {
          kind: "usc",
          text: "5 U.S.C. 301",
          basis: "source_text_parsed",
          pattern: pattern("usc-section"),
          title: 5,
          section: "301",
          etSeq: false,
        },
        {
          kind: "pl",
          text: "Pub. L. 93-638",
          basis: "source_text_parsed",
          pattern: pattern("pl-number"),
          congress: 93,
          number: 638,
          section: null,
        },
        {
          kind: "stat",
          text: "88 Stat. 2203",
          basis: "source_text_parsed",
          pattern: pattern("stat-page"),
          volume: 88,
          page: 2203,
          pageEnd: null,
        },
      ],
      sourceCitations: [
        {
          kind: "fr",
          text: "61 FR 32501",
          basis: "source_text_parsed",
          pattern: pattern("fr-page"),
          volume: 61,
          page: 32501,
          dateText: "June 24, 1996",
        },
      ],
      omitted: [],
    },
  ],
} satisfies CfrAuthorityShard;

const uscShard = {
  $schema: "../../schemas/demo-index.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "usc-source-credit-shard",
  title: 99,
  chapters: null,
  releasePoint: "119-136",
  publicationName: "Online@119-136",
  currentThroughText: "Current through 119-136",
  unmappedRefCount: 0,
  entries: [
    {
      identifier: "/us/usc/t99/s1",
      status: "transferred",
      creditText:
        "(Pub. L. 93-638, title I, Sec. 1, Jan. 4, 1975, 88 Stat. 2203.)",
      credits: [
        {
          kind: "pl",
          text: "/us/pl/93/638",
          basis: "source_field",
          pattern: { id: "uslm-pl-href", version: PATTERN_SET_VERSION },
          congress: 93,
          number: 638,
          section: null,
          date: "1975-01-04",
        },
      ],
      reclassifiedAs: {
        targets: ["/us/usc/t99/s2"],
        noteText:
          "Section was editorially reclassified as section 2 of this title.",
        noteTextOmitted: false,
      },
    },
  ],
} satisfies UscSourceCreditShard;

const vocabulary = {
  $schema: "../../schemas/demo-index.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "vocabulary",
  kind: "fr_agency",
  entries: [
    {
      id: "example-agency",
      label: "Example Agency",
      shortLabel: "EA",
      parentId: null,
    },
  ],
} satisfies VocabularyFile;

const aliases = {
  $schema: "../../schemas/law-aliases.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "law-aliases",
  basis: "curated",
  sourceUrl: "https://uscode.house.gov/popularnames/popularnames.htm",
  entries: [
    {
      popularName: "Example Records Act",
      citations: [
        {
          kind: "usc",
          text: "99 U.S.C. 1 et seq.",
          basis: "curated",
          pattern: pattern("usc-section"),
          title: 99,
          section: "1",
          etSeq: true,
        },
      ],
      olrcUrl:
        "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title99-section1",
      reviewedOn: "2026-11-05",
      reviewerRole: "owner",
    },
  ],
} satisfies LawAliasFile;

// The optional alias fields: a note locator, an enacted title and an acronym.
const aliasWithOptions = {
  popularName: "Example Records Act of 2099",
  titleAsEnacted: true,
  citations: [
    {
      kind: "usc",
      text: "99 U.S.C. 2 note",
      basis: "curated",
      pattern: pattern("usc-section"),
      title: 99,
      section: "2",
      etSeq: false,
      note: true,
    },
  ],
  acronyms: [
    {
      acronym: "ERA",
      sourceUrl: "https://www.govinfo.gov/example",
      text: "the Example Records Act of 2099 (ERA)",
    },
  ],
  olrcUrl: "https://uscode.house.gov/view.xhtml?req=99",
  reviewedOn: "2026-11-05",
  reviewerRole: "staff",
} satisfies LawAlias;

const rights = {
  statementText: "none stated",
  url: "https://www.govinfo.gov/example-terms",
  readOn: "2026-11-05",
  readByRole: "owner",
} as const;

const manifest = {
  $schema: "../../schemas/demo-index.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "demo-index-manifest",
  generatedAt: "2026-11-05T12:00:00-08:00",
  generatedBy: { script: "scripts/acquire-demo-index.mjs", version: "1.0.0" },
  approvalRef: "D-125",
  verbatimFields: [...VERBATIM_FIELDS],
  files: [
    {
      path: "cfr/title-99.json",
      kind: "cfr-authority-shard",
      status: "current",
      sha256: "0".repeat(64),
      sizeBytes: 1024,
      entryCount: 1,
      source: {
        id: "govinfo-cfr-annual",
        name: "Code of Federal Regulations (annual edition), GovInfo",
        urlTemplate:
          "https://www.govinfo.gov/bulkdata/CFR/{year}/title-{title}",
        linkTemplate: "https://www.ecfr.gov/current/title-{title}/part-{part}",
        requestCount: 1,
        editionYear: 2025,
        revisedAsOfText: "Revised as of April 1, 2025",
        volumes: [1],
        retrievedAt: "2026-11-05T12:00:00-08:00",
        rights,
      },
      patternSetVersion: PATTERN_SET_VERSION,
      lastRefreshAttemptAt: null,
      failureStage: null,
      message: null,
      withdrawnOn: null,
      staleAcknowledgedOn: null,
      currentReference: {
        sourceId: "ecfr",
        upToDateAsOfText: "up to date as of 11/03/2026",
        retrievedAt: "2026-11-05T12:00:00-08:00",
      },
    },
    {
      path: "usc/title-99.json",
      kind: "usc-source-credit-shard",
      status: "retained_after_failed_refresh",
      sha256: "1".repeat(64),
      sizeBytes: 2048,
      entryCount: 1,
      source: {
        id: "olrc-uslm",
        name: "United States Code, OLRC USLM",
        urlTemplate:
          "https://uscode.house.gov/download/releasepoints/us/pl/119/136/xml_usc{title}@119-136.zip",
        linkTemplate:
          "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title{title}-section{section}",
        requestCount: 1,
        releasePoint: "119-136",
        publicationName: "Online@119-136",
        currentThroughText: "Current through 119-136",
        upstreamSha256: "2".repeat(64),
        upstreamBytes: 4096,
        retrievedAt: "2026-11-05T12:00:00-08:00",
        rights,
      },
      patternSetVersion: PATTERN_SET_VERSION,
      lastRefreshAttemptAt: "2026-11-05T12:00:00-08:00",
      failureStage: "fetch",
      message: "Refresh failed at fetch; the prior file is shown as stale.",
      withdrawnOn: null,
      staleAcknowledgedOn: null,
      currentReference: null,
    },
  ],
} satisfies IndexManifest;

// D-125: the annual-edition shard has no point-in-time date.
const staleShape: CfrAuthorityShard = {
  ...cfrShard,
  // @ts-expect-error pointInTimeDate is not a CfrAuthorityShard field
  pointInTimeDate: "2025-04-01",
};

describe("static index types", () => {
  it("accepts synthetic samples of every file kind", () => {
    expect(cfrShard.entries[0]?.authorityCitations).toHaveLength(3);
    expect(uscShard.entries[0]?.status).toBe("transferred");
    expect(vocabulary.entries).toHaveLength(1);
    expect(aliases.entries[0]?.citations[0]?.etSeq).toBe(true);
    expect(aliasWithOptions.citations[0]?.note).toBe(true);
    // An acronym's official wording is a verbatim field, like a citation's text.
    expect(Object.keys(aliasWithOptions.acronyms[0] ?? {})).toContain("text");
    expect(VERBATIM_FIELDS).toContain("text");
    expect("pointInTimeDate" in staleShape).toBe(true);
    expect(manifest.files.map((f) => f.kind)).toEqual([
      "cfr-authority-shard",
      "usc-source-credit-shard",
    ]);
  });

  it("lists exactly the verbatim fields (F6 plus the two as-of wordings)", () => {
    expect([...VERBATIM_FIELDS].sort()).toEqual(
      [
        "authorityText",
        "sourceText",
        "creditText",
        "noteText",
        "label",
        "shortLabel",
        "popularName",
        "text",
        "publicationName",
        "currentThroughText",
        "statementText",
        "revisedAsOfText",
        "upToDateAsOfText",
      ].sort(),
    );
    expect(Object.isFrozen(VERBATIM_FIELDS)).toBe(true);
  });

  it("closes the status and failure stage lists", () => {
    expect([...INDEX_FILE_STATUSES]).toEqual([
      "current",
      "retained_after_failed_refresh",
      "unavailable",
      "withdrawn",
    ]);
    expect([...FAILURE_STAGES]).toEqual([
      "fetch",
      "normalize",
      "validation",
      "packaging",
    ]);
    expect(Object.isFrozen(INDEX_FILE_STATUSES)).toBe(true);
    expect(Object.isFrozen(FAILURE_STAGES)).toBe(true);
  });
});
