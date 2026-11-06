/**
 * Static index file types for Full 0.9 (index conditions section 2.1, with the
 * owner adjustments of D-125: the CFR chain comes from the official CFR annual
 * edition on GovInfo; eCFR is current reference only).
 *
 * Keys are camelCase; enum values keep the design's snake_case. Type-only
 * apart from VERBATIM_FIELDS, INDEX_FILE_STATUSES and FAILURE_STAGES.
 * Erasable TypeScript, so Node scripts can load it without a build.
 */
import type { PatternRef } from "./cite-patterns.ts";

export type { PatternRef };

// Closed vocabularies (design rules 1 and 3).
export type Basis =
  | "source_field" // a structured official field (href, attribute)
  | "source_text_parsed" // free text under an official heading, parsed by a versioned pattern
  | "identifier_match"
  | "citation_in_text"
  | "curated";

/**
 * Only the kinds these sources yield. cfr, us_reports, rcw, ors and
 * idaho_code are handled by the run-time citation_in_text module, not here.
 */
export type CitationKind = "usc" | "pl" | "stat" | "fr" | "act";

/** Field shapes match src/demo/cite-patterns.ts output, without offsets. */
interface CitationBase {
  kind: CitationKind;
  /** Verbatim span as printed by the source (for an href, the href). */
  text: string;
  basis: "source_field" | "source_text_parsed" | "curated";
  /** On every citation, including href-derived ones. */
  pattern: PatternRef;
}
export interface UscCitation extends CitationBase {
  kind: "usc";
  title: number;
  /** "25 U.S.C. 450f et seq." gives section "450f" and etSeq true; never expanded. */
  section: string;
  etSeq: boolean;
}
export interface PublicLawCitation extends CitationBase {
  kind: "pl";
  congress: number;
  number: number;
  section: string | null;
  /** ISO date from USLM date@date, basis source_field; absent when not stated. */
  date?: string;
}
export interface StatuteCitation extends CitationBase {
  kind: "stat";
  volume: number;
  page: number;
  pageEnd: number | null;
}
export interface FederalRegisterCitation extends CitationBase {
  kind: "fr";
  volume: number;
  page: number;
  /** "June 24, 1996" verbatim; not parsed. */
  dateText?: string;
}
export interface ActCitation extends CitationBase {
  kind: "act";
  /** "/us/act/1926-05-17/ch309/s1" verbatim USLM href; basis source_field only. */
  href: string;
}
export type ShardCitation =
  | UscCitation
  | PublicLawCitation
  | StatuteCitation
  | FederalRegisterCitation
  | ActCitation;

// CFR part authority shard, one per title, from the GovInfo annual edition.
export interface CfrPartAuthority {
  title: number;
  /** "900", "1a" */
  part: string;
  /** Verbatim AUTH/PSPACE; null when the part has no AUTH. */
  authorityText: string | null;
  /** Verbatim SOURCE/PSPACE. */
  sourceText: string | null;
  /** Source order; basis source_text_parsed. */
  authorityCitations: ShardCitation[];
  sourceCitations: FederalRegisterCitation[];
  /** Condition G3 omissions; [] normally. */
  omitted: ("authorityText" | "sourceText")[];
}
export interface CfrAuthorityShard {
  $schema: string;
  schemaVersion: "1.0.0";
  artifactType: "cfr-authority-shard";
  title: number;
  /** The three edition fields repeat the manifest source; the validator asserts equality. */
  editionYear: number;
  /** The edition's own wording verbatim, such as "Revised as of April 1, 2025". */
  revisedAsOfText: string;
  /** Named volumes when only some volumes of the title are included; null for the whole title. */
  volumes: number[] | null;
  partsExpected: number;
  partsReserved: number;
  subpartAuthorityCount: number;
  /** Sorted by part, numeric-aware. */
  entries: CfrPartAuthority[];
}

// U.S.C. source-credit shard, one per title or per named chapter group.
export type UslmStatus = "transferred" | "repealed" | "omitted" | "reserved";
export interface UscSectionCredit {
  /** "/us/usc/t25/s5304" verbatim; may contain U+2013. */
  identifier: string;
  /** section@status verbatim; null when there is no attribute. */
  status: UslmStatus | null;
  /** Verbatim sourceCredit, tags stripped. */
  creditText: string | null;
  /** From ref@href, basis source_field, document order. */
  credits: (PublicLawCitation | StatuteCitation | ActCitation)[];
  /**
   * Present only when status is "transferred". targets: every /us/usc href in
   * the codification note, document order. The page quotes noteText and links
   * each target; it names no relation itself.
   */
  reclassifiedAs: {
    targets: string[];
    noteText: string | null;
    noteTextOmitted: boolean;
  } | null;
}
export interface UscSourceCreditShard {
  $schema: string;
  schemaVersion: "1.0.0";
  artifactType: "usc-source-credit-shard";
  title: number;
  /** null = whole title; ["55", "85"] when chapter-sharded. */
  chapters: string[] | null;
  releasePoint: string;
  /** Verbatim source as-of wording. */
  publicationName: string;
  currentThroughText: string;
  unmappedRefCount: number;
  /** Sorted by identifier, code-unit order. */
  entries: UscSectionCredit[];
}

// Vocabulary (suggestions).
export type VocabularyKind = "fr_agency" | "fr_topic" | "cfr_title";
export interface VocabularyEntry {
  id: string;
  label: string;
  shortLabel: string | null;
  parentId: string | null;
}
export interface VocabularyFile {
  $schema: string;
  schemaVersion: "1.0.0";
  artifactType: "vocabulary";
  kind: VocabularyKind;
  /** Sorted by id. */
  entries: VocabularyEntry[];
}

// Law aliases (curated config; the schema lives in schemas/law-aliases.schema.v1.json).
/** note is present only for a "note" locator ("25 U.S.C. 2801 note"). */
export type LawAliasCitation = UscCitation & { note?: true };
/** An acronym as an official page states it; matched exactly, case-sensitive. */
export interface LawAliasAcronym {
  /** 2 to 10 capitals or digits, starting with a capital. */
  acronym: string;
  /** The official page (eCFR, OLRC, Federal Register or GovInfo) that states it. */
  sourceUrl: string;
  /** The official wording where the acronym is stated, verbatim. */
  text: string;
}
export interface LawAlias {
  /** Verbatim as printed on the OLRC Popular Names page. */
  popularName: string;
  /** True when popularName is the title as enacted; the label says so. */
  titleAsEnacted?: boolean;
  /** basis "curated"; pattern still carried. */
  citations: LawAliasCitation[];
  acronyms?: LawAliasAcronym[];
  /** https://uscode.house.gov/... */
  olrcUrl: string;
  /** YYYY-MM-DD */
  reviewedOn: string;
  reviewerRole: "owner" | "staff";
}
export interface LawAliasFile {
  $schema: string;
  schemaVersion: "1.0.0";
  artifactType: "law-aliases";
  basis: "curated";
  sourceUrl: string;
  /** Sorted by popularName. */
  entries: LawAlias[];
}

// Manifest.
export const INDEX_FILE_STATUSES = Object.freeze([
  "current",
  "retained_after_failed_refresh",
  "unavailable",
  "withdrawn",
] as const);
export const FAILURE_STAGES = Object.freeze([
  "fetch",
  "normalize",
  "validation",
  "packaging",
] as const);
export type IndexFileStatus = (typeof INDEX_FILE_STATUSES)[number];
export type FailureStage = (typeof FAILURE_STAGES)[number];
export type IndexFileKind =
  "vocabulary" | "cfr-authority-shard" | "usc-source-credit-shard";
export type IndexSourceId =
  "govinfo-cfr-annual" | "ecfr" | "olrc-uslm" | "federal-register-api";
/** The only hosts a manifest URL may name (condition G2 as adjusted by D-125). */
export type OfficialIndexHost =
  | "www.ecfr.gov"
  | "uscode.house.gov"
  | "www.federalregister.gov"
  | "www.govinfo.gov";

/** Condition B5. readByRole is a role, never a person's name (design rule 7). */
export interface SourceRights {
  /** Verbatim from the page the owner read, or exactly "none stated". */
  statementText: string;
  url: string;
  readOn: string;
  readByRole: "owner";
}
interface IndexSourceBase {
  id: IndexSourceId;
  name: string;
  /** Exact URL or template ({date}, {year}, {title}, {part}) of the scripted request. */
  urlTemplate: string;
  /**
   * The reader's link to the live source, with {title}, {part} or {section}
   * placeholders. CFR parts: https://www.ecfr.gov/current/title-{title}/part-{part}
   * (a reader's link, not scripted access); U.S.C. sections: the OLRC section page.
   */
  linkTemplate: string;
  requestCount: number;
  /** ISO 8601 with offset; completion of the file's last request (B3). */
  retrievedAt: string;
  rights: SourceRights;
}
export interface GovinfoCfrAnnualSource extends IndexSourceBase {
  id: "govinfo-cfr-annual";
  editionYear: number;
  /** The edition's own wording verbatim. */
  revisedAsOfText: string;
  volumes: number[] | null;
}
export interface EcfrSource extends IndexSourceBase {
  id: "ecfr";
  /** The requested date. */
  pointInTimeDate: string;
}
export interface OlrcUslmSource extends IndexSourceBase {
  id: "olrc-uslm";
  /** "119-136" */
  releasePoint: string;
  /** "Online@119-136" verbatim. */
  publicationName: string;
  /** "Current through 119-136" verbatim. */
  currentThroughText: string;
  /** Of the raw single-file download (B4). */
  upstreamSha256: string;
  upstreamBytes: number;
}
/** Vocabulary sources publish no as-of; retrievedAt only. */
export interface FederalRegisterApiSource extends IndexSourceBase {
  id: "federal-register-api";
}
export type IndexSource =
  | GovinfoCfrAnnualSource
  | EcfrSource
  | OlrcUslmSource
  | FederalRegisterApiSource;

export interface IndexFile {
  path: string;
  kind: IndexFileKind;
  status: IndexFileStatus;
  sha256: string | null;
  sizeBytes: number | null;
  entryCount: number | null;
  source: IndexSource | null;
  patternSetVersion: string;
  lastRefreshAttemptAt: string | null;
  failureStage: FailureStage | null;
  message: string | null;
  withdrawnOn: string | null;
  staleAcknowledgedOn: string | null;
  /** null until the eCFR terms are read (N17), and for files with no CFR part. */
  currentReference: CurrentReference | null;
}

/** The eCFR "up to date as of" wording shown beside the annual edition. */
export interface CurrentReference {
  sourceId: "ecfr";
  upToDateAsOfText: string;
  retrievedAt: string;
}

export interface IndexManifest {
  $schema: string;
  schemaVersion: "1.0.0";
  artifactType: "demo-index-manifest";
  generatedAt: string;
  generatedBy: { script: "scripts/acquire-demo-index.mjs"; version: string };
  /** The register row that opened this output boundary. */
  approvalRef: string;
  /** Condition F6; equals VERBATIM_FIELDS. */
  verbatimFields: string[];
  /** Sorted by path. */
  files: IndexFile[];
}

/**
 * Condition F6 plus the two as-of wordings of D-125. The design rule 2
 * forbidden-word test skips exactly these fields and nothing else.
 */
export const VERBATIM_FIELDS = Object.freeze([
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
] as const);
export type VerbatimField = (typeof VERBATIM_FIELDS)[number];
