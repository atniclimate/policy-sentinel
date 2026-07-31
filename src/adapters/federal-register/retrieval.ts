import { FEDERAL_REGISTER_PUBLIC_ARTIFACT_POLICY } from "./artifact-policy";
import {
  FEDERAL_REGISTER_DISCOVERY_FIELDS,
  FEDERAL_REGISTER_ORIGIN,
  FEDERAL_REGISTER_PATHS,
  FEDERAL_REGISTER_QUERY_POLICY,
} from "./constants";
import {
  assertFederalRegisterDateRange,
  buildFederalRegisterSearchUrl,
  shouldSplitFederalRegisterDateRange,
  splitFederalRegisterDateRange,
  validateFederalRegisterNextPageUrl,
  type FederalRegisterDateRange,
} from "./query-contract";
import {
  FederalRegisterContractError,
  parseFederalRegisterCorrectionDocumentNumber,
  parseFederalRegisterDailyFacet,
  parseFederalRegisterDocumentBatch,
  parseFederalRegisterIssueInventory,
  parseFederalRegisterSearchPage,
  reconcileFederalRegisterCorrections,
  type FederalRegisterDailyFacet,
  type FederalRegisterDocument,
  type FederalRegisterIssueInventory,
  type FederalRegisterSearchPage,
} from "./response-contract";
import {
  FederalRegisterTransportError,
  fetchFederalRegisterJson,
  type FederalRegisterFetchLike,
  type FederalRegisterResponseKind,
  type FederalRegisterTransportDependencies,
} from "./transport";

export type FederalRegisterRetrievalErrorCode =
  | "candidate_budget"
  | "page_inconsistent"
  | "relationship_budget"
  | "request_budget"
  | "snapshot_drift"
  | "unsplittable_window";

export class FederalRegisterRetrievalError extends Error {
  readonly code: FederalRegisterRetrievalErrorCode;

  constructor(code: FederalRegisterRetrievalErrorCode, message: string) {
    super(message);
    this.name = "FederalRegisterRetrievalError";
    this.code = code;
  }
}

export interface FederalRegisterIssueEvidence {
  publicationDate: string;
  uniqueDocumentCount: number;
  occurrenceCount: number;
}

export interface FederalRegisterInventory {
  documents: readonly FederalRegisterDocument[];
  issueEvidence: readonly FederalRegisterIssueEvidence[];
  retrievedAt: string;
  requestCount: number;
}

export interface FederalRegisterRetrievalDependencies extends FederalRegisterTransportDependencies {
  now?: () => Date;
}

interface RequestBudget {
  count: number;
  get(url: URL, kind: FederalRegisterResponseKind): Promise<unknown>;
}

interface CollectedPageSet {
  count: number;
  documents: FederalRegisterDocument[];
}

interface SnapshotResult {
  documents: FederalRegisterDocument[];
  issueEvidence: FederalRegisterIssueEvidence[];
}

const MAX_SNAPSHOT_ATTEMPTS = 2;
const MAX_REQUESTS = 20_000;
const MAX_ISSUE_AUDITS = 3;
const MAX_RELATIONSHIP_TARGETS = 1_000;

function requestBudget(
  dependencies: FederalRegisterRetrievalDependencies,
): RequestBudget {
  let count = 0;
  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  const exhausted = new FederalRegisterTransportError(
    "invalid_url",
    "Federal Register retrieval exhausted its fixed request budget.",
  );
  const countedFetch: FederalRegisterFetchLike = async (input, init) => {
    if (count >= MAX_REQUESTS) {
      throw exhausted;
    }
    count += 1;
    return fetchImpl(input, init);
  };
  return {
    get count(): number {
      return count;
    },
    async get(url: URL, kind: FederalRegisterResponseKind): Promise<unknown> {
      try {
        return await fetchFederalRegisterJson(url, kind, {
          ...dependencies,
          fetchImpl: countedFetch,
        });
      } catch (error) {
        if (error === exhausted) {
          throw new FederalRegisterRetrievalError(
            "request_budget",
            "Federal Register retrieval exceeded its fixed request budget.",
          );
        }
        throw error;
      }
    },
  };
}

function compareCodeUnits(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => compareCodeUnits(left, right),
  );
  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${canonicalJson(entryValue)}`,
    )
    .join(",")}}`;
}

function stableDocuments(
  documents: readonly FederalRegisterDocument[],
): string {
  return JSON.stringify(
    documents
      .map((document): readonly [string, string] => [
        document.document_number,
        canonicalJson(document),
      ])
      .sort(([left], [right]) => compareCodeUnits(left, right)),
  );
}

function throwRelationshipBudget(): never {
  throw new FederalRegisterRetrievalError(
    "relationship_budget",
    "Federal Register relationship closure exceeded its fixed target budget.",
  );
}

function assertTargetOutsideDiscoveryRange(
  document: FederalRegisterDocument,
  range: FederalRegisterDateRange,
): void {
  if (
    document.publication_date >= range.start &&
    document.publication_date <= range.end
  ) {
    throw new FederalRegisterRetrievalError(
      "snapshot_drift",
      "Federal Register exact relationship target was missing from its discovery range.",
    );
  }
}

function buildExactDocumentUrl(documentNumbers: readonly string[]): URL {
  if (
    documentNumbers.length === 0 ||
    documentNumbers.length >
      FEDERAL_REGISTER_QUERY_POLICY.maximumDocumentBatchSize
  ) {
    throwRelationshipBudget();
  }
  const url = new URL(
    `${FEDERAL_REGISTER_PATHS.detail}${documentNumbers.join(",")}.json`,
    FEDERAL_REGISTER_ORIGIN,
  );
  for (const field of FEDERAL_REGISTER_DISCOVERY_FIELDS) {
    url.searchParams.append("fields[]", field);
  }
  return url;
}

async function fetchExactDocuments(
  documentNumbers: readonly string[],
  knownDocuments: ReadonlyMap<string, FederalRegisterDocument>,
  requests: RequestBudget,
): Promise<FederalRegisterDocument[]> {
  let lookupDocumentNumbers = [...documentNumbers];
  if (documentNumbers.length === 1) {
    const targetId = documentNumbers[0] as string;
    const anchorId = [...knownDocuments.keys()]
      .filter((documentNumber) => documentNumber !== targetId)
      .sort(compareCodeUnits)[0];
    if (anchorId === undefined) {
      throw new FederalRegisterRetrievalError(
        "snapshot_drift",
        "Federal Register exact relationship lookup lacks a stable batch anchor.",
      );
    }
    lookupDocumentNumbers = [targetId, anchorId].sort(compareCodeUnits);
  }
  const url = buildExactDocumentUrl(lookupDocumentNumbers);
  const raw = await requests.get(url, "documentBatch");
  const results = parseFederalRegisterDocumentBatch(
    raw,
    lookupDocumentNumbers,
  ).results;
  const requested = new Set(documentNumbers);
  for (const document of results) {
    if (requested.has(document.document_number)) {
      continue;
    }
    const known = knownDocuments.get(document.document_number);
    if (
      known === undefined ||
      canonicalJson(known) !== canonicalJson(document)
    ) {
      throw new FederalRegisterRetrievalError(
        "snapshot_drift",
        "Federal Register exact relationship batch anchor changed during lookup.",
      );
    }
  }
  return results.filter((document) => requested.has(document.document_number));
}

function relationshipTargetIds(document: FederalRegisterDocument): Set<string> {
  const targets = new Set<string>();
  if (document.correction_of !== null) {
    targets.add(
      parseFederalRegisterCorrectionDocumentNumber(document.correction_of),
    );
  }
  for (const correction of document.corrections) {
    targets.add(parseFederalRegisterCorrectionDocumentNumber(correction));
  }
  for (const relatedGroup of Object.values(document.related_documents)) {
    for (const related of relatedGroup) {
      if (related.relationship_type !== null) {
        targets.add(related.document_number);
      }
    }
  }
  return targets;
}

function missingRelationshipTargetIds(
  documents: Iterable<FederalRegisterDocument>,
  knownIds: Pick<ReadonlySet<string>, "has">,
): string[] {
  const missing = new Set<string>();
  for (const document of documents) {
    for (const targetId of relationshipTargetIds(document)) {
      if (!knownIds.has(targetId)) {
        missing.add(targetId);
      }
    }
  }
  return [...missing].sort(compareCodeUnits);
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let offset = 0; offset < values.length; offset += size) {
    result.push(values.slice(offset, offset + size));
  }
  return result;
}

async function collectRelationshipClosure(
  range: FederalRegisterDateRange,
  discovered: readonly FederalRegisterDocument[],
  requests: RequestBudget,
): Promise<FederalRegisterDocument[]> {
  const byId = new Map(
    discovered.map((document) => [document.document_number, document]),
  );
  const supplementalIds = new Set<string>();
  let frontier = discovered;

  while (true) {
    const missing = missingRelationshipTargetIds(frontier, byId);
    if (missing.length === 0) {
      break;
    }
    if (supplementalIds.size + missing.length > MAX_RELATIONSHIP_TARGETS) {
      throwRelationshipBudget();
    }
    for (const targetId of missing) {
      supplementalIds.add(targetId);
    }

    const fetched: FederalRegisterDocument[] = [];
    for (const batch of chunks(
      missing,
      FEDERAL_REGISTER_QUERY_POLICY.maximumDocumentBatchSize,
    )) {
      fetched.push(...(await fetchExactDocuments(batch, byId, requests)));
    }
    for (const document of fetched) {
      if (byId.has(document.document_number)) {
        throw new FederalRegisterRetrievalError(
          "snapshot_drift",
          "Federal Register exact relationship lookup repeated a known identifier.",
        );
      }
      assertTargetOutsideDiscoveryRange(document, range);
      byId.set(document.document_number, document);
    }
    frontier = fetched;
  }

  const supplemental = [...supplementalIds]
    .sort(compareCodeUnits)
    .map(
      (documentNumber) => byId.get(documentNumber) as FederalRegisterDocument,
    );
  if (supplemental.length > 0) {
    const replayed: FederalRegisterDocument[] = [];
    for (const batch of chunks(
      supplemental.map(({ document_number: documentNumber }) => documentNumber),
      FEDERAL_REGISTER_QUERY_POLICY.maximumDocumentBatchSize,
    )) {
      replayed.push(...(await fetchExactDocuments(batch, byId, requests)));
    }
    if (stableDocuments(supplemental) !== stableDocuments(replayed)) {
      throw new FederalRegisterRetrievalError(
        "snapshot_drift",
        "Federal Register relationship targets changed during exact replay.",
      );
    }
  }
  return [...discovered, ...supplemental];
}

function buildDailyFacetUrl(range: FederalRegisterDateRange): URL {
  const validated = assertFederalRegisterDateRange(range);
  const url = new URL(
    `${FEDERAL_REGISTER_PATHS.facet}daily.json`,
    FEDERAL_REGISTER_ORIGIN,
  );
  url.searchParams.set("conditions[publication_date][gte]", validated.start);
  url.searchParams.set("conditions[publication_date][lte]", validated.end);
  return url;
}

function buildIssueUrl(publicationDate: string): URL {
  const range = assertFederalRegisterDateRange({
    start: publicationDate,
    end: publicationDate,
  });
  return new URL(
    `${FEDERAL_REGISTER_PATHS.issue}${range.start}.json`,
    FEDERAL_REGISTER_ORIGIN,
  );
}

function calendarYearRanges(
  range: FederalRegisterDateRange,
): FederalRegisterDateRange[] {
  const validated = assertFederalRegisterDateRange(range);
  const startYear = Number(validated.start.slice(0, 4));
  const endYear = Number(validated.end.slice(0, 4));
  const ranges: FederalRegisterDateRange[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const prefix = String(year).padStart(4, "0");
    ranges.push({
      start: year === startYear ? validated.start : `${prefix}-01-01`,
      end: year === endYear ? validated.end : `${prefix}-12-31`,
    });
  }
  return ranges;
}

async function retrieveDailyFacet(
  range: FederalRegisterDateRange,
  requests: RequestBudget,
): Promise<FederalRegisterDailyFacet> {
  const result: FederalRegisterDailyFacet = {};
  for (const yearlyRange of calendarYearRanges(range)) {
    const raw = await requests.get(buildDailyFacetUrl(yearlyRange), "facet");
    const facet = parseFederalRegisterDailyFacet(raw, yearlyRange);
    for (const [date, entry] of Object.entries(facet)) {
      if (Object.hasOwn(result, date)) {
        throw new FederalRegisterRetrievalError(
          "snapshot_drift",
          "Federal Register daily facet repeated a date across fixed year chunks.",
        );
      }
      result[date] = entry;
    }
  }
  return result;
}

async function searchPage(
  url: URL,
  range: FederalRegisterDateRange,
  requests: RequestBudget,
  expectedCount?: number,
): Promise<FederalRegisterSearchPage> {
  const raw = await requests.get(url, "search");
  try {
    return parseFederalRegisterSearchPage(raw, {
      range,
      expectedCount,
    });
  } catch (error) {
    if (
      expectedCount !== undefined &&
      error instanceof FederalRegisterContractError &&
      error.code === "inconsistent_response" &&
      error.path === "$.count"
    ) {
      throw new FederalRegisterRetrievalError(
        "snapshot_drift",
        "Federal Register page count changed during traversal.",
      );
    }
    throw error;
  }
}

function expectedPageLength(count: number, pageNumber: number): number {
  const offset = (pageNumber - 1) * FEDERAL_REGISTER_QUERY_POLICY.pageSize;
  return Math.min(
    FEDERAL_REGISTER_QUERY_POLICY.pageSize,
    Math.max(0, count - offset),
  );
}

function assertFirstPageProbe(
  range: FederalRegisterDateRange,
  page: FederalRegisterSearchPage,
): void {
  if ((page.results ?? []).length !== expectedPageLength(page.count, 1)) {
    throw new FederalRegisterRetrievalError(
      "page_inconsistent",
      "Federal Register probe length differs from the fixed first-page contract.",
    );
  }
  const expectsNext = page.count > FEDERAL_REGISTER_QUERY_POLICY.pageSize;
  const nextPageUrl = page.next_page_url ?? null;
  if (expectsNext !== (nextPageUrl !== null)) {
    throw new FederalRegisterRetrievalError(
      "page_inconsistent",
      "Federal Register probe next-page presence differs from its count.",
    );
  }
  if (nextPageUrl !== null) {
    validateFederalRegisterNextPageUrl(nextPageUrl, { range });
  }
}

async function collectAcceptedLeaf(
  range: FederalRegisterDateRange,
  firstPage: FederalRegisterSearchPage,
  requests: RequestBudget,
): Promise<CollectedPageSet> {
  const count = firstPage.count;
  const totalPages =
    count === 0 ? 0 : Math.ceil(count / FEDERAL_REGISTER_QUERY_POLICY.pageSize);
  const documents: FederalRegisterDocument[] = [];
  const documentNumbers = new Set<string>();
  const seenUrls = new Set<string>();
  const seenCursors = new Set<string>();
  let page = firstPage;

  for (
    let pageNumber = 1;
    pageNumber <= Math.max(totalPages, 1);
    pageNumber += 1
  ) {
    const pageDocuments = page.results ?? [];
    if (pageDocuments.length !== expectedPageLength(count, pageNumber)) {
      throw new FederalRegisterRetrievalError(
        "page_inconsistent",
        "Federal Register page length differs from the fixed pagination contract.",
      );
    }
    for (const document of pageDocuments) {
      if (documentNumbers.has(document.document_number)) {
        throw new FederalRegisterRetrievalError(
          "snapshot_drift",
          "Federal Register slice repeated a document number across pages.",
        );
      }
      documentNumbers.add(document.document_number);
      documents.push(document);
    }

    const expectsNext = pageNumber < totalPages;
    const nextPageUrl = page.next_page_url ?? null;
    if (expectsNext !== (nextPageUrl !== null)) {
      throw new FederalRegisterRetrievalError(
        "page_inconsistent",
        "Federal Register next-page presence differs from the expected page count.",
      );
    }
    if (!expectsNext) {
      break;
    }

    const next = validateFederalRegisterNextPageUrl(nextPageUrl, {
      range,
      seenUrls,
      seenCursors,
    });
    seenUrls.add(next.url.href);
    seenUrls.add(next.canonicalUrl);
    seenCursors.add(next.cursor);
    page = await searchPage(next.url, range, requests, count);
  }

  if (documents.length !== count) {
    throw new FederalRegisterRetrievalError(
      "snapshot_drift",
      "Federal Register collected identifier count differs from the slice count.",
    );
  }
  return { count, documents };
}

async function collectLeafWithReplay(
  range: FederalRegisterDateRange,
  firstPage: FederalRegisterSearchPage,
  requests: RequestBudget,
): Promise<FederalRegisterDocument[]> {
  const collected = await collectAcceptedLeaf(range, firstPage, requests);
  const replayFirstPage = await searchPage(
    buildFederalRegisterSearchUrl(range),
    range,
    requests,
  );
  assertFirstPageProbe(range, replayFirstPage);
  if (shouldSplitFederalRegisterDateRange(replayFirstPage.count)) {
    throw new FederalRegisterRetrievalError(
      "snapshot_drift",
      "Federal Register accepted slice crossed the fixed split threshold during replay.",
    );
  }
  const replayed = await collectAcceptedLeaf(range, replayFirstPage, requests);
  if (
    replayed.count !== collected.count ||
    stableDocuments(replayed.documents) !== stableDocuments(collected.documents)
  ) {
    throw new FederalRegisterRetrievalError(
      "snapshot_drift",
      "Federal Register slice changed during complete metadata replay.",
    );
  }
  return collected.documents;
}

async function collectRange(
  range: FederalRegisterDateRange,
  requests: RequestBudget,
): Promise<FederalRegisterDocument[]> {
  const firstPage = await searchPage(
    buildFederalRegisterSearchUrl(range),
    range,
    requests,
  );
  assertFirstPageProbe(range, firstPage);
  if (!shouldSplitFederalRegisterDateRange(firstPage.count)) {
    return collectLeafWithReplay(range, firstPage, requests);
  }
  if (range.start === range.end) {
    throw new FederalRegisterRetrievalError(
      "unsplittable_window",
      "Federal Register single-day count reaches the fixed split threshold.",
    );
  }
  const [left, right] = splitFederalRegisterDateRange(range);
  const leftDocuments = await collectRange(left, requests);
  const rightDocuments = await collectRange(right, requests);
  return [...leftDocuments, ...rightDocuments];
}

function sortedStrings(values: Iterable<string>): string[] {
  return [...values].sort(compareCodeUnits);
}

function sameStrings(left: Iterable<string>, right: Iterable<string>): boolean {
  return (
    JSON.stringify(sortedStrings(left)) === JSON.stringify(sortedStrings(right))
  );
}

function documentGroups(
  documents: readonly FederalRegisterDocument[],
): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();
  const global = new Set<string>();
  for (const document of documents) {
    if (global.has(document.document_number)) {
      throw new FederalRegisterRetrievalError(
        "snapshot_drift",
        "Federal Register nonoverlapping slices repeated a document number.",
      );
    }
    global.add(document.document_number);
    const group = groups.get(document.publication_date) ?? new Set<string>();
    group.add(document.document_number);
    groups.set(document.publication_date, group);
  }
  return groups;
}

function facetCounts(facet: FederalRegisterDailyFacet): Map<string, number> {
  return new Map(
    Object.entries(facet)
      .filter(([, entry]) => entry.count > 0)
      .map(([date, entry]) => [date, entry.count]),
  );
}

function assertCandidateBudget(facet: FederalRegisterDailyFacet): void {
  const candidateCount = [...facetCounts(facet).values()].reduce(
    (total, count) => total + count,
    0,
  );
  if (
    candidateCount >
    FEDERAL_REGISTER_PUBLIC_ARTIFACT_POLICY.maximumCandidateDocuments
  ) {
    throw new FederalRegisterRetrievalError(
      "candidate_budget",
      "Federal Register selected window exceeds its versioned candidate-document budget.",
    );
  }
}

function assertFacetMatchesDocuments(
  facet: FederalRegisterDailyFacet,
  groups: Map<string, Set<string>>,
): void {
  const counts = facetCounts(facet);
  if (!sameStrings(counts.keys(), groups.keys())) {
    throw new FederalRegisterRetrievalError(
      "snapshot_drift",
      "Federal Register daily facet dates differ from collected search dates.",
    );
  }
  for (const [date, count] of counts) {
    if (groups.get(date)?.size !== count) {
      throw new FederalRegisterRetrievalError(
        "snapshot_drift",
        "Federal Register daily facet count differs from collected identifiers.",
      );
    }
  }
}

function assertFacetsStable(
  before: FederalRegisterDailyFacet,
  after: FederalRegisterDailyFacet,
): void {
  const beforeCounts = facetCounts(before);
  const afterCounts = facetCounts(after);
  if (
    !sameStrings(beforeCounts.keys(), afterCounts.keys()) ||
    [...beforeCounts].some(([date, count]) => afterCounts.get(date) !== count)
  ) {
    throw new FederalRegisterRetrievalError(
      "snapshot_drift",
      "Federal Register daily facet changed during the snapshot barrier.",
    );
  }
}

export function selectFederalRegisterIssueAuditDates(
  facet: FederalRegisterDailyFacet,
): string[] {
  const dates = sortedStrings(facetCounts(facet).keys());
  if (dates.length <= MAX_ISSUE_AUDITS) {
    return dates;
  }
  return [
    dates[0],
    dates[Math.floor((dates.length - 1) / 2)],
    dates.at(-1) as string,
  ].filter((date, index, selected) => selected.indexOf(date) === index);
}

async function auditIssues(
  facet: FederalRegisterDailyFacet,
  groups: Map<string, Set<string>>,
  requests: RequestBudget,
): Promise<FederalRegisterIssueEvidence[]> {
  const evidence: FederalRegisterIssueEvidence[] = [];
  for (const publicationDate of selectFederalRegisterIssueAuditDates(facet)) {
    const raw = await requests.get(buildIssueUrl(publicationDate), "issue");
    const issue: FederalRegisterIssueInventory =
      parseFederalRegisterIssueInventory(raw, publicationDate);
    if (
      !sameStrings(issue.documentNumbers, groups.get(publicationDate) ?? [])
    ) {
      throw new FederalRegisterRetrievalError(
        "snapshot_drift",
        "Federal Register issue inventory differs from exact-day search identifiers.",
      );
    }
    evidence.push({
      publicationDate,
      uniqueDocumentCount: issue.documentNumbers.length,
      occurrenceCount: issue.occurrenceCount,
    });
  }
  return evidence;
}

function assertRelatedTargets(
  documents: readonly FederalRegisterDocument[],
): void {
  const byId = new Map(
    documents.map((document) => [document.document_number, document]),
  );
  for (const document of documents) {
    for (const relatedDocuments of Object.values(document.related_documents)) {
      for (const related of relatedDocuments) {
        if (related.relationship_type === null) {
          continue;
        }
        const target = byId.get(related.document_number);
        if (
          target === undefined ||
          target.publication_date !== related.publication_date ||
          target.title !== related.title ||
          (related.action !== null && target.action !== related.action)
        ) {
          throw new FederalRegisterRetrievalError(
            "snapshot_drift",
            "Federal Register related-document target metadata is missing or inconsistent.",
          );
        }
      }
    }
  }
}

async function retrieveSnapshot(
  range: FederalRegisterDateRange,
  requests: RequestBudget,
): Promise<SnapshotResult> {
  const facetBefore = await retrieveDailyFacet(range, requests);
  assertCandidateBudget(facetBefore);
  const discovered = await collectRange(range, requests);
  const groups = documentGroups(discovered);
  assertFacetMatchesDocuments(facetBefore, groups);
  const issueEvidence = await auditIssues(facetBefore, groups, requests);
  const documents = await collectRelationshipClosure(
    range,
    discovered,
    requests,
  );
  const facetAfter = await retrieveDailyFacet(range, requests);
  assertFacetsStable(facetBefore, facetAfter);
  assertFacetMatchesDocuments(facetAfter, groups);

  try {
    reconcileFederalRegisterCorrections(documents);
  } catch (error) {
    if (
      error instanceof FederalRegisterContractError &&
      error.code === "relationship_mismatch"
    ) {
      throw new FederalRegisterRetrievalError(
        "snapshot_drift",
        "Federal Register correction graph is incomplete or nonreciprocal.",
      );
    }
    throw error;
  }
  assertRelatedTargets(documents);
  documents.sort(
    (left, right) =>
      compareCodeUnits(left.publication_date, right.publication_date) ||
      compareCodeUnits(left.document_number, right.document_number),
  );
  return { documents, issueEvidence };
}

export async function retrieveFederalRegisterInventory(
  range: FederalRegisterDateRange,
  dependencies: FederalRegisterRetrievalDependencies = {},
): Promise<FederalRegisterInventory> {
  const validatedRange = assertFederalRegisterDateRange(range);
  const requests = requestBudget(dependencies);
  let lastDrift: FederalRegisterRetrievalError | null = null;
  for (let attempt = 1; attempt <= MAX_SNAPSHOT_ATTEMPTS; attempt += 1) {
    try {
      const snapshot = await retrieveSnapshot(validatedRange, requests);
      const retrievedAt = (
        dependencies.now ?? (() => new Date())
      )().toISOString();
      return {
        ...snapshot,
        retrievedAt,
        requestCount: requests.count,
      };
    } catch (error) {
      if (
        error instanceof FederalRegisterRetrievalError &&
        error.code === "snapshot_drift"
      ) {
        lastDrift = error;
        continue;
      }
      throw error;
    }
  }
  throw (
    lastDrift ??
    new FederalRegisterRetrievalError(
      "snapshot_drift",
      "Federal Register snapshot could not be reconciled.",
    )
  );
}
