import { createHash } from "node:crypto";

export const BIA_RECOGNITION_2026 = {
  documentNumber: "2026-01899",
  publicationDate: "2026-01-30",
  expectedRawEntryCount: 577,
  expectedNationCount: 575,
  metadataUrl:
    "https://www.federalregister.gov/api/v1/documents/2026-01899.json",
  structuredBodyUrl:
    "https://www.federalregister.gov/documents/full_text/html/2026/01/30/2026-01899.html",
  officialTextUrl:
    "https://www.govinfo.gov/content/pkg/FR-2026-01-30/html/2026-01899.htm",
  officialPdfUrl:
    "https://www.govinfo.gov/content/pkg/FR-2026-01-30/pdf/2026-01899.pdf",
} as const;

export const BIA_IDENTITY_RULE = {
  id: "bia-recognition-official-name-sha256-v1",
  version: "1.0.0",
  description:
    "SHA-256 of the NFC-normalized, whitespace-collapsed, case-folded exact official list entry; future official name changes require a reviewed carry-forward override.",
} as const;

export const BIA_RESPONSE_POLICY = {
  metadata: {
    mediaTypes: ["application/json"],
    maxBytes: 64 * 1024,
  },
  structuredBody: {
    mediaTypes: ["text/html"],
    maxBytes: 1024 * 1024,
  },
  officialText: {
    mediaTypes: ["text/html"],
    maxBytes: 512 * 1024,
  },
} as const;

export const BIA_PUBLICATION_REVIEW = {
  state: "required_before_publication",
  blocking: true,
  reasonCode: "source-grouping-semantics-require-human-review",
  note: "The notice does not machine-label every grouped-entry relationship. The adapter reconciles only the two exact Venetie alias cross-references and otherwise preserves source entries without reinterpreting them.",
  reviewedAt: null,
} as const;

const CONTIGUOUS_HEADING =
  "Indian Tribal Entities Within the Contiguous 48 States Recognized by and Eligible To Receive Services From the United States Bureau of Indian Affairs";
const ALASKA_HEADING =
  "Native Entities Within the State of Alaska Recognized by and Eligible To Receive Services From the United States Bureau of Indian Affairs";

const VENETIE_CANONICAL =
  "Native Village of Venetie Tribal Government (Arctic Village and Village of Venetie)";
const VENETIE_CROSS_REFERENCES = [
  {
    exactText:
      "Arctic Village (See Native Village of Venetie Tribal Government)",
    alias: "Arctic Village",
  },
  {
    exactText:
      "Village of Venetie (See Native Village of Venetie Tribal Government)",
    alias: "Village of Venetie",
  },
] as const;

export type RecognitionDocumentFormat = "html" | "xml" | "text";
export type RecognitionSection = "contiguous_48" | "alaska";

export interface RawRecognitionEntry {
  exactText: string;
  paragraphId: string;
  page: string | null;
  section: RecognitionSection;
}

export interface RecognitionEvidence {
  exactText: string;
  paragraphId: string;
  page: string | null;
  section: RecognitionSection;
  sourceUrl: string;
  officialTextUrl: string;
  officialPdfUrl: string;
}

interface ReconciledRecognitionEntry {
  officialName: string;
  officialListEntry: string;
  primaryParagraphId: string;
  section: RecognitionSection;
  authorizedAliases: string[];
  evidenceEntries: RawRecognitionEntry[];
  reconciliationRuleId: string | null;
}

export interface BiaNation {
  id: string;
  officialName: string;
  authorizedAliases: string[];
  aliasProvenance: Array<{
    alias: string;
    basis: "official_cross_reference";
    evidenceText: string;
    evidenceUrl: string;
    retrievedAt: string;
    validationState: "validated";
  }>;
  recognitionBaselineVersion: string;
  sourceIdentifier: string;
  officialListEntry: string;
  section: RecognitionSection;
  stateCoverage: {
    states: [];
    federalOnly: true;
    basis: "unresolved_no_reviewed_crosswalk";
  };
  sourceEvidence: RecognitionEvidence[];
  fieldProvenance: Array<{
    field: "/officialName" | "/authorizedAliases";
    sourceUrl: string;
    sourceDate: string;
    retrievedAt: string;
    transformation: "copied" | "reconciled_official_cross_reference";
    transformRuleId: string | null;
    validationState: "validated";
  }>;
}

export interface BiaNationRegistry {
  artifactType: "nation-collection";
  schemaVersion: "1.0.0";
  registryVersion: "2026-01-30";
  generatedAt: string;
  baseline: {
    count: 575;
    version: "2026-01-30";
    authorityName: "Bureau of Indian Affairs annual recognition notice";
    authorityUrl: string;
    documentNumber: "2026-01899";
    publicationDate: "2026-01-30";
    officialTextUrl: string;
    officialPdfUrl: string;
    structuredTranscriptionUrl: string;
    synthetic: false;
  };
  identityRule: typeof BIA_IDENTITY_RULE;
  publicationReview: typeof BIA_PUBLICATION_REVIEW;
  validation: {
    state: "validated";
    rawEntryCount: 577;
    reconciledNationCount: 575;
    uniqueIdCount: 575;
    uniqueOfficialNameCount: 575;
    transcriptCompared: true;
    reconciliationRuleIds: ["bia-2026-venetie-cross-references-v1"];
  };
  sourceHealth: {
    status: "healthy";
    checkedAt: string;
    dataAsOf: "2026-01-30";
    lastSuccessfulRetrievalAt: string;
    usingLastKnownGood: false;
    message: null;
  };
  nations: BiaNation[];
}

interface FederalRegisterMetadata {
  document_number: string;
  publication_date: string;
  body_html_url: string;
  pdf_url: string;
}

export interface RecognitionSourceDocuments {
  metadata: FederalRegisterMetadata;
  structuredBody: string;
  structuredFormat?: RecognitionDocumentFormat;
  officialText: string;
  retrievedAt: string;
}

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function decodeEntity(entity: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    mdash: "—",
    nbsp: " ",
    quot: '"',
  };

  if (entity.startsWith("#x") || entity.startsWith("#X")) {
    const codePoint = Number.parseInt(entity.slice(2), 16);
    if (!Number.isFinite(codePoint)) {
      throw new Error(`Invalid hexadecimal character entity: &${entity};`);
    }
    return String.fromCodePoint(codePoint);
  }

  if (entity.startsWith("#")) {
    const codePoint = Number.parseInt(entity.slice(1), 10);
    if (!Number.isFinite(codePoint)) {
      throw new Error(`Invalid decimal character entity: &${entity};`);
    }
    return String.fromCodePoint(codePoint);
  }

  const decoded = named[entity];
  if (decoded === undefined) {
    throw new Error(
      `Unsupported character entity in recognition source: &${entity};`,
    );
  }
  return decoded;
}

function removeUnprintedPageMarkup(value: string): string {
  return value.replace(
    /<span\b[^>]*class=["'][^"']*\bunprinted-element\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
    "",
  );
}

export function normalizeVisibleText(value: string): string {
  const withoutMarkup = removeUnprintedPageMarkup(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "");

  return withoutMarkup
    .replace(/&([#\w]+);/g, (_match, entity: string) => decodeEntity(entity))
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function getAttribute(attributes: string, name: string): string | null {
  const match = attributes.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"),
  );
  return match ? (match[1] ?? match[2] ?? null) : null;
}

function locateHeading(
  source: string,
  tagName: "h2" | "HD",
  heading: string,
): number {
  const expression = new RegExp(
    `<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "gi",
  );

  for (const match of source.matchAll(expression)) {
    if (normalizeVisibleText(match[1]) === heading) {
      return match.index;
    }
  }

  throw new Error(`Recognition source is missing required heading: ${heading}`);
}

function assertUniqueRawEntries(entries: RawRecognitionEntry[]): void {
  const paragraphIds = new Set<string>();
  for (const entry of entries) {
    if (!entry.exactText) {
      throw new Error("Recognition source contains a blank entry.");
    }
    if (paragraphIds.has(entry.paragraphId)) {
      throw new Error(
        `Recognition source repeats paragraph identifier ${entry.paragraphId}.`,
      );
    }
    paragraphIds.add(entry.paragraphId);
  }
}

function parseMarkupEntries(
  source: string,
  format: "html" | "xml",
): RawRecognitionEntry[] {
  const headingTag = format === "html" ? "h2" : "HD";
  const contiguousIndex = locateHeading(source, headingTag, CONTIGUOUS_HEADING);
  const alaskaIndex = locateHeading(source, headingTag, ALASKA_HEADING);
  if (alaskaIndex <= contiguousIndex) {
    throw new Error("Recognition source section headings are out of order.");
  }

  const paragraphExpression = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  const entries: RawRecognitionEntry[] = [];
  let fallbackId = 0;

  for (const match of source.matchAll(paragraphExpression)) {
    const index = match.index;
    if (index <= contiguousIndex) {
      continue;
    }

    const attributes = match[1];
    if (format === "html") {
      const className = getAttribute(attributes, "class") ?? "";
      if (!className.split(/\s+/).includes("flush-paragraph-1")) {
        continue;
      }
    } else {
      const endIndexCandidates = [
        source.indexOf("<FRDOC", alaskaIndex),
        source.indexOf("<BILCOD", alaskaIndex),
        source.indexOf("</SUPLINF", alaskaIndex),
      ].filter((candidate) => candidate >= 0);
      if (
        endIndexCandidates.length > 0 &&
        index >= Math.min(...endIndexCandidates)
      ) {
        continue;
      }
    }

    fallbackId += 1;
    const paragraphId =
      getAttribute(attributes, "id") ??
      getAttribute(attributes, "ID") ??
      `${format}-paragraph-${fallbackId}`;
    const page =
      getAttribute(attributes, "data-page") ??
      getAttribute(attributes, "PGS") ??
      null;

    entries.push({
      exactText: normalizeVisibleText(match[2]),
      paragraphId,
      page,
      section: index < alaskaIndex ? "contiguous_48" : "alaska",
    });
  }

  if (
    !entries.some((entry) => entry.section === "contiguous_48") ||
    !entries.some((entry) => entry.section === "alaska")
  ) {
    throw new Error(
      "Recognition source did not yield entries in both sections.",
    );
  }

  assertUniqueRawEntries(entries);
  return entries;
}

function parseLineStructuredText(source: string): RawRecognitionEntry[] {
  const lines = source
    .split(/\r?\n/)
    .map((line) => normalizeVisibleText(line))
    .filter(Boolean);
  const contiguousIndex = lines.indexOf(CONTIGUOUS_HEADING);
  const alaskaIndex = lines.indexOf(ALASKA_HEADING);
  if (contiguousIndex < 0 || alaskaIndex <= contiguousIndex) {
    throw new Error(
      "Line-structured recognition text is missing ordered section headings.",
    );
  }

  const entries: RawRecognitionEntry[] = [];
  for (let index = contiguousIndex + 1; index < lines.length; index += 1) {
    if (index === alaskaIndex) {
      continue;
    }
    if (lines[index] === "[END OF RECOGNITION LIST]") {
      break;
    }
    entries.push({
      exactText: lines[index],
      paragraphId: `text-line-${index + 1}`,
      page: null,
      section: index < alaskaIndex ? "contiguous_48" : "alaska",
    });
  }

  assertUniqueRawEntries(entries);
  return entries;
}

/**
 * HTML is the live FederalRegister.gov structured transcription. XML and
 * line-structured text support injected source fixtures and future official
 * representations; live wrapped GovInfo text is verification input, not parsed
 * as one-entry-per-line data.
 */
export function parseRecognitionEntries(
  source: string,
  format: RecognitionDocumentFormat,
): RawRecognitionEntry[] {
  if (format === "text") {
    return parseLineStructuredText(source);
  }
  return parseMarkupEntries(source, format);
}

function findExactlyOne(
  entries: RawRecognitionEntry[],
  exactText: string,
): RawRecognitionEntry {
  const matches = entries.filter((entry) => entry.exactText === exactText);
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one 2026 recognition entry matching ${JSON.stringify(exactText)}; found ${matches.length}.`,
    );
  }
  return matches[0];
}

export function reconcile2026RecognitionEntries(
  entries: RawRecognitionEntry[],
  expectedRawCount: number = BIA_RECOGNITION_2026.expectedRawEntryCount,
  expectedNationCount: number = BIA_RECOGNITION_2026.expectedNationCount,
): ReconciledRecognitionEntry[] {
  if (entries.length !== expectedRawCount) {
    throw new Error(
      `2026 recognition transcription has ${entries.length} entries; expected exactly ${expectedRawCount}.`,
    );
  }

  const canonical = findExactlyOne(entries, VENETIE_CANONICAL);
  const crossReferences = VENETIE_CROSS_REFERENCES.map((reference) => ({
    ...reference,
    entry: findExactlyOne(entries, reference.exactText),
  }));
  const excludedParagraphIds = new Set(
    crossReferences.map((reference) => reference.entry.paragraphId),
  );

  const reconciled = entries
    .filter((entry) => !excludedParagraphIds.has(entry.paragraphId))
    .map((entry): ReconciledRecognitionEntry => {
      if (entry.paragraphId !== canonical.paragraphId) {
        return {
          officialName: entry.exactText,
          officialListEntry: entry.exactText,
          primaryParagraphId: entry.paragraphId,
          section: entry.section,
          authorizedAliases: [],
          evidenceEntries: [entry],
          reconciliationRuleId: null,
        };
      }

      return {
        officialName: entry.exactText,
        officialListEntry: entry.exactText,
        primaryParagraphId: entry.paragraphId,
        section: entry.section,
        authorizedAliases: crossReferences.map((reference) => reference.alias),
        evidenceEntries: [
          entry,
          ...crossReferences.map((reference) => reference.entry),
        ],
        reconciliationRuleId: "bia-2026-venetie-cross-references-v1",
      };
    });

  if (reconciled.length !== expectedNationCount) {
    throw new Error(
      `2026 recognition reconciliation produced ${reconciled.length} entries; expected exactly ${expectedNationCount}.`,
    );
  }

  const names = new Set(reconciled.map((entry) => entry.officialName));
  if (names.size !== reconciled.length) {
    throw new Error(
      "2026 recognition reconciliation produced duplicate names.",
    );
  }
  return reconciled;
}

function comparisonText(value: string): string {
  return normalizeVisibleText(value).replaceAll("—", "--");
}

export function verifyGovInfoTranscript(
  officialText: string,
  entries: RawRecognitionEntry[],
  expectedNationCount: number = BIA_RECOGNITION_2026.expectedNationCount,
): void {
  const normalizedOfficialText = comparisonText(officialText);
  const statedTotal = normalizedOfficialText.match(
    /current list of ([\d,]+) Tribal entities/i,
  );
  if (
    !statedTotal ||
    Number(statedTotal[1].replaceAll(",", "")) !== expectedNationCount
  ) {
    throw new Error(
      `GovInfo recognition notice does not state the expected total of ${expectedNationCount}.`,
    );
  }

  const missing = entries.filter(
    (entry) =>
      !normalizedOfficialText.includes(comparisonText(entry.exactText)),
  );
  if (missing.length > 0) {
    throw new Error(
      `Structured recognition transcription differs from GovInfo for ${missing.length} entries; first mismatch is ${JSON.stringify(missing[0].exactText)}.`,
    );
  }
}

function assertOfficialMetadata(metadata: FederalRegisterMetadata): void {
  const expected = BIA_RECOGNITION_2026;
  const comparisons: Array<[string, string, string]> = [
    ["document_number", metadata.document_number, expected.documentNumber],
    ["publication_date", metadata.publication_date, expected.publicationDate],
    ["body_html_url", metadata.body_html_url, expected.structuredBodyUrl],
    ["pdf_url", metadata.pdf_url, expected.officialPdfUrl],
  ];

  for (const [field, actual, wanted] of comparisons) {
    if (actual !== wanted) {
      throw new Error(
        `Federal Register metadata ${field} was ${JSON.stringify(actual)}; expected ${JSON.stringify(wanted)}.`,
      );
    }
  }
}

function validateRetrievedAt(value: string): void {
  if (!value.endsWith("Z") || Number.isNaN(Date.parse(value))) {
    throw new Error(
      `retrievedAt must be a UTC ISO date-time; received ${value}.`,
    );
  }
}

export function stableNationId(officialName: string): string {
  const seed = officialName
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-US");
  const digest = createHash("sha256").update(seed, "utf8").digest("hex");
  return `nation:bia-v1-${digest.slice(0, 24)}`;
}

export function buildBiaRegistryFromDocuments(
  documents: RecognitionSourceDocuments,
): BiaNationRegistry {
  assertOfficialMetadata(documents.metadata);
  validateRetrievedAt(documents.retrievedAt);

  const rawEntries = parseRecognitionEntries(
    documents.structuredBody,
    documents.structuredFormat ?? "html",
  );
  verifyGovInfoTranscript(documents.officialText, rawEntries);
  const reconciled = reconcile2026RecognitionEntries(rawEntries);

  const nations: BiaNation[] = reconciled.map((entry) => {
    const primaryUrl = `${BIA_RECOGNITION_2026.structuredBodyUrl}#${entry.primaryParagraphId}`;
    const sourceEvidence = entry.evidenceEntries.map(
      (evidence): RecognitionEvidence => ({
        exactText: evidence.exactText,
        paragraphId: evidence.paragraphId,
        page: evidence.page,
        section: evidence.section,
        sourceUrl: `${BIA_RECOGNITION_2026.structuredBodyUrl}#${evidence.paragraphId}`,
        officialTextUrl: BIA_RECOGNITION_2026.officialTextUrl,
        officialPdfUrl: BIA_RECOGNITION_2026.officialPdfUrl,
      }),
    );

    return {
      id: stableNationId(entry.officialName),
      officialName: entry.officialName,
      authorizedAliases: entry.authorizedAliases,
      aliasProvenance: entry.authorizedAliases.map((alias, index) => ({
        alias,
        basis: "official_cross_reference",
        evidenceText: entry.evidenceEntries[index + 1].exactText,
        evidenceUrl: sourceEvidence[index + 1].sourceUrl,
        retrievedAt: documents.retrievedAt,
        validationState: "validated",
      })),
      recognitionBaselineVersion: BIA_RECOGNITION_2026.publicationDate,
      sourceIdentifier: `${BIA_RECOGNITION_2026.documentNumber}:${entry.primaryParagraphId}`,
      officialListEntry: entry.officialListEntry,
      section: entry.section,
      stateCoverage: {
        states: [],
        federalOnly: true,
        basis: "unresolved_no_reviewed_crosswalk",
      },
      sourceEvidence,
      fieldProvenance: [
        {
          field: "/officialName",
          sourceUrl: primaryUrl,
          sourceDate: BIA_RECOGNITION_2026.publicationDate,
          retrievedAt: documents.retrievedAt,
          transformation: "copied",
          transformRuleId: null,
          validationState: "validated",
        },
        ...(entry.authorizedAliases.length > 0
          ? [
              {
                field: "/authorizedAliases" as const,
                sourceUrl: primaryUrl,
                sourceDate: BIA_RECOGNITION_2026.publicationDate,
                retrievedAt: documents.retrievedAt,
                transformation: "reconciled_official_cross_reference" as const,
                transformRuleId: entry.reconciliationRuleId,
                validationState: "validated" as const,
              },
            ]
          : []),
      ],
    };
  });

  const ids = new Set(nations.map((nation) => nation.id));
  const names = new Set(nations.map((nation) => nation.officialName));
  if (
    ids.size !== BIA_RECOGNITION_2026.expectedNationCount ||
    names.size !== BIA_RECOGNITION_2026.expectedNationCount
  ) {
    throw new Error(
      `BIA registry uniqueness validation failed: ${ids.size} IDs and ${names.size} names.`,
    );
  }

  return {
    artifactType: "nation-collection",
    schemaVersion: "1.0.0",
    registryVersion: BIA_RECOGNITION_2026.publicationDate,
    generatedAt: documents.retrievedAt,
    baseline: {
      count: 575,
      version: BIA_RECOGNITION_2026.publicationDate,
      authorityName: "Bureau of Indian Affairs annual recognition notice",
      authorityUrl: BIA_RECOGNITION_2026.officialTextUrl,
      documentNumber: BIA_RECOGNITION_2026.documentNumber,
      publicationDate: BIA_RECOGNITION_2026.publicationDate,
      officialTextUrl: BIA_RECOGNITION_2026.officialTextUrl,
      officialPdfUrl: BIA_RECOGNITION_2026.officialPdfUrl,
      structuredTranscriptionUrl: BIA_RECOGNITION_2026.structuredBodyUrl,
      synthetic: false,
    },
    identityRule: BIA_IDENTITY_RULE,
    publicationReview: BIA_PUBLICATION_REVIEW,
    validation: {
      state: "validated",
      rawEntryCount: 577,
      reconciledNationCount: 575,
      uniqueIdCount: 575,
      uniqueOfficialNameCount: 575,
      transcriptCompared: true,
      reconciliationRuleIds: ["bia-2026-venetie-cross-references-v1"],
    },
    sourceHealth: {
      status: "healthy",
      checkedAt: documents.retrievedAt,
      dataAsOf: BIA_RECOGNITION_2026.publicationDate,
      lastSuccessfulRetrievalAt: documents.retrievedAt,
      usingLastKnownGood: false,
      message: null,
    },
    nations,
  };
}

async function fetchChecked(
  fetchImpl: FetchLike,
  url: string,
  accept: string,
  policy: {
    readonly mediaTypes: readonly string[];
    readonly maxBytes: number;
  },
  label: string,
): Promise<Response> {
  const parsedUrl = new URL(url);
  const allowedHosts = new Set(["www.federalregister.gov", "www.govinfo.gov"]);
  if (
    parsedUrl.protocol !== "https:" ||
    !allowedHosts.has(parsedUrl.hostname)
  ) {
    throw new Error(`Refusing unapproved BIA recognition source URL: ${url}`);
  }

  const response = await fetchImpl(url, {
    headers: {
      Accept: accept,
      "User-Agent": "PolicySentinel/0.2 build-time-source-adapter",
    },
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(
      `BIA recognition source returned HTTP ${response.status} for ${url}.`,
    );
  }

  const contentTypeHeader = response.headers.get("content-type");
  if (!contentTypeHeader) {
    throw new Error(`${label} response is missing a Content-Type header.`);
  }
  const mediaType = contentTypeHeader.split(";", 1)[0].trim().toLowerCase();
  if (!policy.mediaTypes.includes(mediaType)) {
    throw new Error(
      `${label} response Content-Type was ${JSON.stringify(contentTypeHeader)}; expected ${policy.mediaTypes.join(" or ")}.`,
    );
  }

  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader !== null) {
    if (!/^\d+$/.test(contentLengthHeader.trim())) {
      throw new Error(
        `${label} response has an invalid Content-Length header.`,
      );
    }
    const declaredBytes = Number(contentLengthHeader);
    if (
      !Number.isSafeInteger(declaredBytes) ||
      declaredBytes > policy.maxBytes
    ) {
      throw new Error(
        `${label} response declares ${contentLengthHeader} bytes; limit is ${policy.maxBytes}.`,
      );
    }
  }
  return response;
}

async function readBoundedUtf8(
  response: Response,
  maxBytes: number,
  label: string,
): Promise<string> {
  if (!response.body) {
    throw new Error(`${label} response has no readable body.`);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error(
          `${label} response exceeded the ${maxBytes}-byte limit.`,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} response is not valid UTF-8.`);
  }
}

export async function fetchOfficialBiaRegistry(
  options: {
    fetchImpl?: FetchLike;
    retrievedAt?: string;
  } = {},
): Promise<BiaNationRegistry> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const retrievedAt = options.retrievedAt ?? new Date().toISOString();

  const metadataResponse = await fetchChecked(
    fetchImpl,
    BIA_RECOGNITION_2026.metadataUrl,
    "application/json",
    BIA_RESPONSE_POLICY.metadata,
    "Federal Register metadata",
  );
  const metadataText = await readBoundedUtf8(
    metadataResponse,
    BIA_RESPONSE_POLICY.metadata.maxBytes,
    "Federal Register metadata",
  );
  let metadata: FederalRegisterMetadata;
  try {
    metadata = JSON.parse(metadataText) as FederalRegisterMetadata;
  } catch {
    throw new Error("Federal Register metadata response is not valid JSON.");
  }
  assertOfficialMetadata(metadata);

  const [structuredResponse, officialTextResponse] = await Promise.all([
    fetchChecked(
      fetchImpl,
      metadata.body_html_url,
      "text/html",
      BIA_RESPONSE_POLICY.structuredBody,
      "Federal Register structured body",
    ),
    fetchChecked(
      fetchImpl,
      BIA_RECOGNITION_2026.officialTextUrl,
      "text/html",
      BIA_RESPONSE_POLICY.officialText,
      "GovInfo official text",
    ),
  ]);

  const [structuredBody, officialText] = await Promise.all([
    readBoundedUtf8(
      structuredResponse,
      BIA_RESPONSE_POLICY.structuredBody.maxBytes,
      "Federal Register structured body",
    ),
    readBoundedUtf8(
      officialTextResponse,
      BIA_RESPONSE_POLICY.officialText.maxBytes,
      "GovInfo official text",
    ),
  ]);

  return buildBiaRegistryFromDocuments({
    metadata,
    structuredBody,
    structuredFormat: "html",
    officialText,
    retrievedAt,
  });
}
