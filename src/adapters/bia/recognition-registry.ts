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
  reasonCode: "current-notice-identity-reconciliation-unresolved",
  note: "Independent review verified 577 ordered list-entry paragraphs and the stated total of 575, but the current notice provides no row-level reconciliation between them. No Nation registry is emitted until exact primary-source evidence resolves that mapping.",
  reviewedAt: null,
} as const;

export const BIA_REVIEWED_TRANSCRIPTION = {
  reviewedOn: "2026-07-31",
  rawEntryCount: 577,
  sectionEntryCounts: {
    contiguous_48: 348,
    alaska: 229,
  },
  orderedEntrySha256:
    "c33e84713c51fe3b58f53ec8a17ee865d2cf82e12716a09b9e9273b3e41306be",
  govInfoBoundedListSha256:
    "f80718946ce77076470427b2bac13a14e1548913eae710270c7975fb88aa9ce1",
  statedNationCount: 575,
  seeClauseCount: 6,
  identityReconciliation: "blocked_unresolved_row_reconciliation",
} as const;

const CONTIGUOUS_HEADING =
  "Indian Tribal Entities Within the Contiguous 48 States Recognized by and Eligible To Receive Services From the United States Bureau of Indian Affairs";
const ALASKA_HEADING =
  "Native Entities Within the State of Alaska Recognized by and Eligible To Receive Services From the United States Bureau of Indian Affairs";

const UNRESOLVED_GROUPING_ROWS = [
  "Native Village of Venetie Tribal Government (Arctic Village and Village of Venetie)",
  "Pribilof Islands Aleut Communities of St. Paul & St. George Islands (St. George Island and Saint Paul Island)",
] as const;

const UNRESOLVED_COMPONENT_ROWS = [
  "Aleut Community of St. Paul Island (See Pribilof Islands Aleut Communities of St. Paul & St. George Islands) (previously listed as Saint Paul Island (See Pribilof Islands Aleut Communities of St. Paul & St. George Islands))",
  "Arctic Village (See Native Village of Venetie Tribal Government)",
  "St. George Island (See Pribilof Islands Aleut Communities of St. Paul & St. George Islands)",
  "Village of Venetie (See Native Village of Venetie Tribal Government)",
] as const;

export type RecognitionDocumentFormat = "html" | "xml" | "text";
export type RecognitionSection = "contiguous_48" | "alaska";

export interface RawRecognitionEntry {
  exactText: string;
  paragraphId: string;
  page: string | null;
  section: RecognitionSection;
}

interface FederalRegisterMetadata {
  document_number: string;
  publication_date: string;
  body_html_url: string;
  pdf_url: string;
  correction_of: null;
  corrections: unknown[];
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

const namedEntities: Readonly<Record<string, string>> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  mdash: "—",
  nbsp: " ",
  quot: '"',
};

function decodeEntity(entity: string): string {
  if (entity.startsWith("#")) {
    const hex = /^#x([a-f\d]+)$/i.exec(entity);
    const decimal = /^#(\d+)$/.exec(entity);
    const codePoint = hex ? Number.parseInt(hex[1], 16) : Number(decimal?.[1]);
    if (
      !Number.isInteger(codePoint) ||
      codePoint <= 0 ||
      codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    )
      throw new Error(
        "Invalid numeric character entity in recognition source.",
      );
    return String.fromCodePoint(codePoint);
  }

  if (!Object.hasOwn(namedEntities, entity)) {
    throw new Error(
      `Unsupported character entity in recognition source: &${entity};`,
    );
  }
  return namedEntities[entity];
}

function removeUnprintedPageMarkup(value: string): string {
  return value.replace(
    /<span\b[^>]*class=["'][^"']*\bunprinted-element\b[^"']*["'][^>]*>[\s\S]*?<\/span\s*>/gi,
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

function getAttribute(
  attributes: string,
  name: string,
  format: "html" | "xml",
): string | null {
  for (const match of attributes.matchAll(
    /(?:^|\s+)([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g,
  )) {
    if (match[1].toLowerCase() === name.toLowerCase())
      return match[2] ?? match[3] ?? (format === "html" ? match[4] : null);
  }
  return null;
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
  const endIndex =
    format === "xml"
      ? Math.min(
          source.length,
          ...["<FRDOC", "<BILCOD", "</SUPLINF"]
            .map((marker) => source.indexOf(marker, alaskaIndex))
            .filter((index) => index >= 0),
        )
      : source.length;

  for (const match of source.matchAll(paragraphExpression)) {
    const index = match.index;
    if (index >= endIndex) break;
    if (index <= contiguousIndex) {
      continue;
    }

    const attributes = match[1];
    if (format === "html") {
      const className = getAttribute(attributes, "class", format) ?? "";
      if (!className.split(/\s+/).includes("flush-paragraph-1")) {
        continue;
      }
    }

    fallbackId += 1;
    const paragraphId =
      getAttribute(attributes, "id", format) ??
      `${format}-paragraph-${fallbackId}`;
    const page =
      getAttribute(attributes, "data-page", format) ??
      getAttribute(attributes, "PGS", format) ??
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
): never {
  if (entries.length !== expectedRawCount) {
    throw new Error(
      `2026 recognition transcription has ${entries.length} entries; expected exactly ${expectedRawCount}.`,
    );
  }

  for (const exactText of [
    ...UNRESOLVED_GROUPING_ROWS,
    ...UNRESOLVED_COMPONENT_ROWS,
  ]) {
    const entry = findExactlyOne(entries, exactText);
    if (entry.section !== "alaska") {
      throw new Error(
        `Expected unresolved 2026 grouping row in the Alaska section: ${JSON.stringify(exactText)}.`,
      );
    }
  }

  if (entries.length - expectedNationCount !== 2) {
    throw new Error(
      `2026 recognition identity difference is ${entries.length - expectedNationCount}; expected exactly 2.`,
    );
  }

  throw new Error(
    `BIA identity reconciliation is blocked: the current notice displays ${entries.length} ordered list-entry paragraphs but states ${expectedNationCount} Tribal entities without providing a row-level reconciliation between them. The superseded 2022 and January 2023 clarification cannot be applied after its August 2023 withdrawal.`,
  );
}

function comparisonText(value: string): string {
  return normalizeVisibleText(value).replaceAll("—", "--");
}

function locateGovInfoListMarkers(normalizedOfficialText: string): {
  contiguousHeadingIndex: number;
  alaskaHeadingIndex: number;
  listEndIndex: number;
} {
  const contiguousHeadingIndex = normalizedOfficialText.indexOf(
    comparisonText(CONTIGUOUS_HEADING),
  );
  const alaskaHeadingIndex = normalizedOfficialText.indexOf(
    comparisonText(ALASKA_HEADING),
  );
  const listEndIndex = normalizedOfficialText.indexOf(
    `[FR Doc. ${BIA_RECOGNITION_2026.documentNumber}`,
    alaskaHeadingIndex,
  );
  if (
    contiguousHeadingIndex < 0 ||
    alaskaHeadingIndex <= contiguousHeadingIndex ||
    listEndIndex <= alaskaHeadingIndex
  ) {
    throw new Error(
      "GovInfo recognition notice is missing the bounded, ordered recognition-list markers.",
    );
  }
  return {
    contiguousHeadingIndex,
    alaskaHeadingIndex,
    listEndIndex,
  };
}

export function govInfoBoundedListSha256(officialText: string): string {
  const normalizedOfficialText = comparisonText(officialText);
  const { contiguousHeadingIndex, listEndIndex } = locateGovInfoListMarkers(
    normalizedOfficialText,
  );
  return createHash("sha256")
    .update(
      normalizedOfficialText.slice(contiguousHeadingIndex, listEndIndex).trim(),
      "utf8",
    )
    .digest("hex");
}

function orderedEntrySha256(entries: RawRecognitionEntry[]): string {
  return createHash("sha256")
    .update(entries.map((entry) => entry.exactText).join("\n"), "utf8")
    .digest("hex");
}

export function verifyReviewedRecognitionInventory(
  entries: RawRecognitionEntry[],
): void {
  if (entries.length !== BIA_REVIEWED_TRANSCRIPTION.rawEntryCount) {
    throw new Error(
      `Reviewed BIA transcription has ${entries.length} rows; expected ${BIA_REVIEWED_TRANSCRIPTION.rawEntryCount}.`,
    );
  }

  const sectionCounts = {
    contiguous_48: entries.filter((entry) => entry.section === "contiguous_48")
      .length,
    alaska: entries.filter((entry) => entry.section === "alaska").length,
  };
  for (const section of ["contiguous_48", "alaska"] as const) {
    const expected = BIA_REVIEWED_TRANSCRIPTION.sectionEntryCounts[section];
    if (sectionCounts[section] !== expected) {
      throw new Error(
        `Reviewed BIA ${section} transcription has ${sectionCounts[section]} rows; expected ${expected}.`,
      );
    }
  }

  const digest = orderedEntrySha256(entries);
  if (digest !== BIA_REVIEWED_TRANSCRIPTION.orderedEntrySha256) {
    throw new Error(
      `Reviewed BIA ordered inventory hash was ${digest}; expected ${BIA_REVIEWED_TRANSCRIPTION.orderedEntrySha256}.`,
    );
  }

  const seeClauseCount = entries.reduce(
    (total, entry) => total + (entry.exactText.match(/\(See\b/g)?.length ?? 0),
    0,
  );
  if (seeClauseCount !== BIA_REVIEWED_TRANSCRIPTION.seeClauseCount) {
    throw new Error(
      `Reviewed BIA transcription has ${seeClauseCount} (See) clauses; expected ${BIA_REVIEWED_TRANSCRIPTION.seeClauseCount}.`,
    );
  }
}

export function verifyGovInfoTranscript(
  officialText: string,
  entries: RawRecognitionEntry[],
  expectedNationCount: number = BIA_RECOGNITION_2026.expectedNationCount,
  expectedBoundedListSha256: string = BIA_REVIEWED_TRANSCRIPTION.govInfoBoundedListSha256,
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

  const { contiguousHeadingIndex, alaskaHeadingIndex, listEndIndex } =
    locateGovInfoListMarkers(normalizedOfficialText);
  const boundedListDigest = createHash("sha256")
    .update(
      normalizedOfficialText.slice(contiguousHeadingIndex, listEndIndex).trim(),
      "utf8",
    )
    .digest("hex");
  if (boundedListDigest !== expectedBoundedListSha256) {
    throw new Error(
      `GovInfo bounded recognition-list hash was ${boundedListDigest}; expected ${expectedBoundedListSha256}.`,
    );
  }

  let cursor = contiguousHeadingIndex;
  let currentSection: RecognitionSection = "contiguous_48";
  for (const entry of entries) {
    if (entry.section !== currentSection) {
      if (currentSection !== "contiguous_48" || entry.section !== "alaska") {
        throw new Error(
          "Structured recognition transcription sections are out of order.",
        );
      }
      currentSection = "alaska";
      cursor = alaskaHeadingIndex;
    }

    const comparedEntry = comparisonText(entry.exactText);
    const entryIndex = normalizedOfficialText.indexOf(comparedEntry, cursor);
    if (entryIndex < 0) {
      throw new Error(
        `Structured recognition transcription differs from ordered GovInfo text at ${JSON.stringify(entry.exactText)}.`,
      );
    }
    if (
      (entry.section === "contiguous_48" && entryIndex >= alaskaHeadingIndex) ||
      entryIndex >= listEndIndex
    ) {
      throw new Error(
        `Structured recognition transcription differs from ordered GovInfo text at ${JSON.stringify(entry.exactText)}.`,
      );
    }
    cursor = entryIndex + comparedEntry.length;
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
  if (
    metadata.correction_of !== null ||
    !Array.isArray(metadata.corrections) ||
    metadata.corrections.length !== 0
  ) {
    throw new Error(
      "Federal Register metadata links a correction or has an invalid correction inventory; a new BIA review is required.",
    );
  }
}

function validateRetrievedAt(value: string): void {
  const timestamp = Date.parse(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) ||
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 19) !== value.slice(0, 19)
  ) {
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
): never {
  assertOfficialMetadata(documents.metadata);
  validateRetrievedAt(documents.retrievedAt);

  const rawEntries = parseRecognitionEntries(
    documents.structuredBody,
    documents.structuredFormat ?? "html",
  );
  verifyGovInfoTranscript(documents.officialText, rawEntries);
  verifyReviewedRecognitionInventory(rawEntries);
  return reconcile2026RecognitionEntries(rawEntries);
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
): Promise<string> {
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
  try {
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
    return await readBoundedUtf8(response, policy.maxBytes, label);
  } catch (error) {
    void response.body?.cancel().catch(() => undefined);
    throw error;
  }
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
): Promise<never> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const retrievedAt = options.retrievedAt ?? new Date().toISOString();
  validateRetrievedAt(retrievedAt);

  const metadataText = await fetchChecked(
    fetchImpl,
    BIA_RECOGNITION_2026.metadataUrl,
    "application/json",
    BIA_RESPONSE_POLICY.metadata,
    "Federal Register metadata",
  );
  let metadata: FederalRegisterMetadata;
  try {
    metadata = JSON.parse(metadataText) as FederalRegisterMetadata;
  } catch {
    throw new Error("Federal Register metadata response is not valid JSON.");
  }
  assertOfficialMetadata(metadata);

  const [structuredBody, officialText] = await Promise.all([
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

  return buildBiaRegistryFromDocuments({
    metadata,
    structuredBody,
    structuredFormat: "html",
    officialText,
    retrievedAt,
  });
}
