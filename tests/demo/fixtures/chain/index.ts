// Synthetic chain fixtures: title 99, invented parts and sections, no real
// person, Nation, contact data or address. Shapes follow src/demo/index-types.ts.
import { sha256Hex } from "../../../../src/engine/pure-sha256.mjs";
import type {
  CfrAuthorityShard,
  IndexFile,
  IndexManifest,
  UscSourceCreditShard,
} from "../../../../src/demo/index-types";
import type { DemoCitation, TextBlock } from "../../../../src/demo/types";

const PATTERN = { id: "usc-section", version: "1.0.0" } as const;
const RIGHTS = {
  statementText: "none stated",
  url: "https://www.govinfo.gov/",
  readOn: "2099-01-01",
  readByRole: "owner",
} as const;

export const NOW = new Date("2099-03-01T00:00:00Z");

export const cfrShard: CfrAuthorityShard = {
  $schema: "../../schemas/demo-index.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "cfr-authority-shard",
  title: 99,
  editionYear: 2099,
  revisedAsOfText: "Revised as of April 1, 2099",
  volumes: null,
  partsExpected: 3,
  partsReserved: 0,
  subpartAuthorityCount: 0,
  entries: [
    {
      title: 99,
      part: "100",
      // Official wording may hold a design rule 2 word; it is verbatim.
      authorityText:
        "99 U.S.C. 1001 et seq.; Pub. L. 120-5, as authorized under 99 Stat. 10.",
      sourceText:
        "50 FR 1000, Jan. 2, 1985, as amended at 70 FR 2000, Jan. 3, 2005.",
      authorityCitations: [
        {
          kind: "usc",
          text: "99 U.S.C. 1001 et seq.",
          basis: "source_text_parsed",
          pattern: PATTERN,
          title: 99,
          section: "1001",
          etSeq: true,
        },
        {
          kind: "pl",
          text: "Pub. L. 120-5",
          basis: "source_text_parsed",
          pattern: { id: "pl-number", version: "1.0.0" },
          congress: 120,
          number: 5,
          section: null,
        },
      ],
      sourceCitations: [
        {
          kind: "fr",
          text: "50 FR 1000",
          basis: "source_text_parsed",
          pattern: { id: "fr-page", version: "1.0.0" },
          volume: 50,
          page: 1000,
          dateText: "Jan. 2, 1985",
        },
        {
          kind: "fr",
          text: "70 FR 2000",
          basis: "source_text_parsed",
          pattern: { id: "fr-page", version: "1.0.0" },
          volume: 70,
          page: 2000,
          dateText: "Jan. 3, 2005",
        },
      ],
      omitted: [],
    },
    {
      title: 99,
      part: "200",
      authorityText: null,
      sourceText: null,
      authorityCitations: [],
      sourceCitations: [],
      omitted: [],
    },
    {
      title: 99,
      part: "300",
      authorityText: null,
      sourceText: null,
      authorityCitations: [
        {
          kind: "usc",
          text: "99 U.S.C. 2002",
          basis: "source_text_parsed",
          pattern: PATTERN,
          title: 99,
          section: "2002",
          etSeq: false,
        },
      ],
      sourceCitations: [],
      omitted: ["authorityText"],
    },
  ],
};

export const uscShard: UscSourceCreditShard = {
  $schema: "../../schemas/demo-index.schema.v1.json",
  schemaVersion: "1.0.0",
  artifactType: "usc-source-credit-shard",
  title: 99,
  chapters: null,
  releasePoint: "120-1",
  publicationName: "Online@120-1",
  currentThroughText: "Current through 120-1",
  unmappedRefCount: 0,
  entries: [
    {
      identifier: "/us/usc/t99/s1001",
      status: null,
      creditText: "(Pub. L. 120-5, §2, Jan. 4, 2099, 99 Stat. 10.)",
      credits: [
        {
          kind: "pl",
          text: "/us/pl/120/5/s2",
          basis: "source_field",
          pattern: { id: "uslm-pl-href", version: "1.0.0" },
          congress: 120,
          number: 5,
          section: "2",
          date: "2099-01-04",
        },
        {
          kind: "stat",
          text: "/us/stat/99/10",
          basis: "source_field",
          pattern: { id: "uslm-stat-href", version: "1.0.0" },
          volume: 99,
          page: 10,
          pageEnd: null,
        },
      ],
      reclassifiedAs: null,
    },
    {
      identifier: "/us/usc/t99/s450",
      status: "transferred",
      creditText: null,
      credits: [],
      reclassifiedAs: {
        targets: ["/us/usc/t99/s5321"],
        noteText:
          "Section was editorially reclassified as section 5321 of this title.",
        noteTextOmitted: false,
      },
    },
  ],
};

const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
export const cfrBytes = bytes(cfrShard);
export const uscBytes = bytes(uscShard);

const fileBase = {
  entryCount: null,
  patternSetVersion: "1.0.0",
  lastRefreshAttemptAt: null,
  failureStage: null,
  message: null,
  withdrawnOn: null,
  staleAcknowledgedOn: null,
  currentReference: null,
} as const;

export const cfrFile: IndexFile = {
  ...fileBase,
  path: "cfr/title-99.json",
  kind: "cfr-authority-shard",
  status: "current",
  sha256: sha256Hex(cfrBytes),
  sizeBytes: cfrBytes.length,
  source: {
    id: "govinfo-cfr-annual",
    name: "CFR annual edition (GovInfo)",
    urlTemplate: "https://www.govinfo.gov/{year}/title-{title}",
    linkTemplate: "https://www.ecfr.gov/current/title-{title}/part-{part}",
    requestCount: 1,
    retrievedAt: "2099-02-01T10:00:00-08:00",
    rights: RIGHTS,
    editionYear: 2099,
    revisedAsOfText: "Revised as of April 1, 2099",
    volumes: null,
  },
};

export const uscFile: IndexFile = {
  ...fileBase,
  path: "usc/title-99.json",
  kind: "usc-source-credit-shard",
  status: "current",
  sha256: sha256Hex(uscBytes),
  sizeBytes: uscBytes.length,
  source: {
    id: "olrc-uslm",
    name: "U.S. Code (OLRC)",
    urlTemplate: "https://uscode.house.gov/download/{title}.zip",
    linkTemplate: "https://uscode.house.gov/{section}",
    requestCount: 1,
    retrievedAt: "2099-02-02T10:00:00-08:00",
    rights: RIGHTS,
    releasePoint: "120-1",
    publicationName: "Online@120-1",
    currentThroughText: "Current through 120-1",
    upstreamSha256: "0".repeat(64),
    upstreamBytes: 1,
  },
};

/** The CFR file retrieved 200 days before NOW (condition C3). */
export const staleCfrFile: IndexFile = {
  ...cfrFile,
  source: { ...cfrFile.source!, retrievedAt: "2098-08-13T10:00:00-08:00" },
} as IndexFile;

export function manifestOf(files: readonly IndexFile[]): IndexManifest {
  return {
    $schema: "../../schemas/demo-index.schema.v1.json",
    schemaVersion: "1.0.0",
    artifactType: "demo-index-manifest",
    generatedAt: "2099-02-02T10:00:00-08:00",
    generatedBy: { script: "scripts/acquire-demo-index.mjs", version: "1.0.0" },
    approvalRef: "D-000",
    verbatimFields: [],
    files: [...files],
  };
}

export const manifest = manifestOf([
  cfrFile,
  uscFile,
  {
    ...fileBase,
    path: "usc/title-98.json",
    kind: "usc-source-credit-shard",
    status: "unavailable",
    sha256: null,
    sizeBytes: null,
    source: null,
  },
  {
    ...cfrFile,
    path: "cfr/title-97.json",
    status: "withdrawn",
    withdrawnOn: "2099-02-15",
  },
  {
    ...cfrFile,
    path: "cfr/title-96.json",
    status: "retained_after_failed_refresh",
    lastRefreshAttemptAt: "2099-02-20T10:00:00-08:00",
    failureStage: "fetch",
    message: "The source did not answer.",
  },
]);

/** A Federal Register record with every chain field its source states. */
export const frRecord: DemoCitation = {
  sourceId: "federal-register",
  identifier: "99 FR 100 (FR Doc. 2099-00001)",
  title: "Example Program Rule",
  issuingBody: "Example Department",
  kind: "Rule",
  date: "2099-01-05",
  officialUrl: "https://www.federalregister.gov/d/2099-00001",
  textUrl: null,
  retrievedAt: "2099-01-07T11:59:00.000Z",
  summary: null,
  textAvailable: true,
  matchKey: "fr:2099-00001",
  docketIds: ["EX-2099-0001"],
  rins: ["9999-AA00"],
  cfrRefs: [{ title: 99, part: "100" }],
  correctionOf: "2098-11111",
  corrections: ["2099-22222"],
  authorityLine: "99 U.S.C. 1001; section 4 of the Act.",
  authorityLinePresent: true,
};

export const frRecordNoAuth: DemoCitation = {
  ...frRecord,
  authorityLine: undefined,
  authorityLinePresent: false,
};

export const blocks: readonly TextBlock[] = [
  {
    text: "As stated in 99 CFR 100.5 and Pub. L. 120-5, see id. at 3.",
    locator: "page 12",
  },
  { text: "Amended by RCW 99.10.020.", locator: "section 2" },
];

export const SOURCES = {
  federal: ["federal-register"],
  live: ["federal-register"],
};
