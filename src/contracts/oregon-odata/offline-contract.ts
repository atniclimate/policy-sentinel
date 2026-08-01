import {
  OREGON_ODATA_BUNDLE_KIND,
  OREGON_ODATA_CONTRACT_VERSION,
  OREGON_ODATA_OFFLINE_POLICY,
  OREGON_ODATA_SOURCE_ID,
  OREGON_ODATA_SYNTHETIC_NOTICE,
} from "./constants";
import { failOregonODataContract } from "./errors";
import {
  parseOregonODataOfflineMetadata,
  type OregonODataOfflineMetadata,
} from "./metadata-contract";
import {
  arrayValue,
  exactKeys,
  integerValue,
  literalValue,
  nullableDateOrDateTimeValue,
  nullableDateValue,
  nullableIntegerValue,
  nullableStringValue,
  objectValue,
  requiredValue,
  stringValue,
  syntheticIdValue,
} from "./validation";

export interface OregonODataOfflineSession {
  sessionId: string;
  sessionYear: number;
  displayName: string;
  startDate: string | null;
  endDate: string | null;
}

export interface OregonODataOfflineMeasure {
  measureId: string;
  sessionId: string;
  measureNumber: string;
  title: string | null;
  relatingToText: string | null;
  statusId: string | null;
}

export interface OregonODataOfflineSponsor {
  sponsorId: string;
  measureId: string;
  displayName: string;
  roleLabel: string | null;
}

export interface OregonODataOfflineCommittee {
  committeeId: string;
  sessionId: string;
  displayName: string;
  chamberLabel: string | null;
}

export interface OregonODataOfflineAction {
  actionId: string;
  measureId: string;
  sequence: number;
  occurredAt: string | null;
  sourceLabel: string;
  committeeId: string | null;
}

export interface OregonODataOfflineVote {
  voteId: string;
  measureId: string;
  actionId: string | null;
  committeeId: string | null;
  occurredAt: string | null;
  resultLabel: string | null;
  yesCount: number | null;
  noCount: number | null;
  excusedCount: number | null;
  absentCount: number | null;
}

export interface OregonODataOfflineVersion {
  versionId: string;
  measureId: string;
  versionLabel: string;
  publishedAt: string | null;
}

export interface OregonODataOfflineStatus {
  statusId: string;
  measureId: string;
  sourceLabel: string;
  asOf: string | null;
}

export interface OregonODataOfflinePage<T> {
  pageNumber: number;
  nextPageNumber: number | null;
  items: T[];
}

export interface OregonODataOfflineBundle {
  contractVersion: typeof OREGON_ODATA_CONTRACT_VERSION;
  fixtureNotice: typeof OREGON_ODATA_SYNTHETIC_NOTICE;
  kind: typeof OREGON_ODATA_BUNDLE_KIND;
  sourceId: typeof OREGON_ODATA_SOURCE_ID;
  pages: {
    sessions: OregonODataOfflinePage<OregonODataOfflineSession>[];
    measures: OregonODataOfflinePage<OregonODataOfflineMeasure>[];
    sponsors: OregonODataOfflinePage<OregonODataOfflineSponsor>[];
    committees: OregonODataOfflinePage<OregonODataOfflineCommittee>[];
    actions: OregonODataOfflinePage<OregonODataOfflineAction>[];
    votes: OregonODataOfflinePage<OregonODataOfflineVote>[];
    versions: OregonODataOfflinePage<OregonODataOfflineVersion>[];
    statuses: OregonODataOfflinePage<OregonODataOfflineStatus>[];
  };
}

export interface OregonODataOfflineContract {
  metadata: OregonODataOfflineMetadata;
  bundle: OregonODataOfflineBundle;
}

type ItemParser<T> = (value: unknown, path: string) => T;
type ItemIdentity<T> = (value: T) => string;

function parseSession(value: unknown, path: string): OregonODataOfflineSession {
  const parsed = objectValue(value, path);
  exactKeys(parsed, path, [
    "sessionId",
    "sessionYear",
    "displayName",
    "startDate",
    "endDate",
  ]);
  const sessionYear = integerValue(
    requiredValue(parsed, "sessionYear", path),
    `${path}.sessionYear`,
    OREGON_ODATA_OFFLINE_POLICY.earliestSessionYear,
    OREGON_ODATA_OFFLINE_POLICY.latestSyntheticSessionYear,
  );
  const startDate = nullableDateValue(
    requiredValue(parsed, "startDate", path),
    `${path}.startDate`,
  );
  const endDate = nullableDateValue(
    requiredValue(parsed, "endDate", path),
    `${path}.endDate`,
  );
  if (startDate !== null && Number(startDate.slice(0, 4)) !== sessionYear) {
    failOregonODataContract(
      "inconsistent_value",
      `${path}.startDate`,
      "start year must equal sessionYear",
    );
  }
  if (startDate !== null && endDate !== null && endDate < startDate) {
    failOregonODataContract(
      "inconsistent_value",
      `${path}.endDate`,
      "endDate precedes startDate",
    );
  }
  return {
    sessionId: syntheticIdValue(
      requiredValue(parsed, "sessionId", path),
      `${path}.sessionId`,
    ),
    sessionYear,
    displayName: stringValue(
      requiredValue(parsed, "displayName", path),
      `${path}.displayName`,
    ),
    startDate,
    endDate,
  };
}

function parseMeasure(value: unknown, path: string): OregonODataOfflineMeasure {
  const parsed = objectValue(value, path);
  exactKeys(parsed, path, [
    "measureId",
    "sessionId",
    "measureNumber",
    "title",
    "relatingToText",
    "statusId",
  ]);
  const statusValue = requiredValue(parsed, "statusId", path);
  return {
    measureId: syntheticIdValue(
      requiredValue(parsed, "measureId", path),
      `${path}.measureId`,
    ),
    sessionId: syntheticIdValue(
      requiredValue(parsed, "sessionId", path),
      `${path}.sessionId`,
    ),
    measureNumber: stringValue(
      requiredValue(parsed, "measureNumber", path),
      `${path}.measureNumber`,
      64,
    ),
    title: nullableStringValue(
      requiredValue(parsed, "title", path),
      `${path}.title`,
    ),
    relatingToText: nullableStringValue(
      requiredValue(parsed, "relatingToText", path),
      `${path}.relatingToText`,
    ),
    statusId:
      statusValue === null
        ? null
        : syntheticIdValue(statusValue, `${path}.statusId`),
  };
}

function parseSponsor(value: unknown, path: string): OregonODataOfflineSponsor {
  const parsed = objectValue(value, path);
  exactKeys(parsed, path, [
    "sponsorId",
    "measureId",
    "displayName",
    "roleLabel",
  ]);
  return {
    sponsorId: syntheticIdValue(
      requiredValue(parsed, "sponsorId", path),
      `${path}.sponsorId`,
    ),
    measureId: syntheticIdValue(
      requiredValue(parsed, "measureId", path),
      `${path}.measureId`,
    ),
    displayName: stringValue(
      requiredValue(parsed, "displayName", path),
      `${path}.displayName`,
    ),
    roleLabel: nullableStringValue(
      requiredValue(parsed, "roleLabel", path),
      `${path}.roleLabel`,
    ),
  };
}

function parseCommittee(
  value: unknown,
  path: string,
): OregonODataOfflineCommittee {
  const parsed = objectValue(value, path);
  exactKeys(parsed, path, [
    "committeeId",
    "sessionId",
    "displayName",
    "chamberLabel",
  ]);
  return {
    committeeId: syntheticIdValue(
      requiredValue(parsed, "committeeId", path),
      `${path}.committeeId`,
    ),
    sessionId: syntheticIdValue(
      requiredValue(parsed, "sessionId", path),
      `${path}.sessionId`,
    ),
    displayName: stringValue(
      requiredValue(parsed, "displayName", path),
      `${path}.displayName`,
    ),
    chamberLabel: nullableStringValue(
      requiredValue(parsed, "chamberLabel", path),
      `${path}.chamberLabel`,
    ),
  };
}

function parseAction(value: unknown, path: string): OregonODataOfflineAction {
  const parsed = objectValue(value, path);
  exactKeys(parsed, path, [
    "actionId",
    "measureId",
    "sequence",
    "occurredAt",
    "sourceLabel",
    "committeeId",
  ]);
  const committeeValue = requiredValue(parsed, "committeeId", path);
  return {
    actionId: syntheticIdValue(
      requiredValue(parsed, "actionId", path),
      `${path}.actionId`,
    ),
    measureId: syntheticIdValue(
      requiredValue(parsed, "measureId", path),
      `${path}.measureId`,
    ),
    sequence: integerValue(
      requiredValue(parsed, "sequence", path),
      `${path}.sequence`,
      1,
      999_999,
    ),
    occurredAt: nullableDateOrDateTimeValue(
      requiredValue(parsed, "occurredAt", path),
      `${path}.occurredAt`,
    ),
    sourceLabel: stringValue(
      requiredValue(parsed, "sourceLabel", path),
      `${path}.sourceLabel`,
    ),
    committeeId:
      committeeValue === null
        ? null
        : syntheticIdValue(committeeValue, `${path}.committeeId`),
  };
}

function parseVote(value: unknown, path: string): OregonODataOfflineVote {
  const parsed = objectValue(value, path);
  exactKeys(parsed, path, [
    "voteId",
    "measureId",
    "actionId",
    "committeeId",
    "occurredAt",
    "resultLabel",
    "yesCount",
    "noCount",
    "excusedCount",
    "absentCount",
  ]);
  const actionValue = requiredValue(parsed, "actionId", path);
  const committeeValue = requiredValue(parsed, "committeeId", path);
  return {
    voteId: syntheticIdValue(
      requiredValue(parsed, "voteId", path),
      `${path}.voteId`,
    ),
    measureId: syntheticIdValue(
      requiredValue(parsed, "measureId", path),
      `${path}.measureId`,
    ),
    actionId:
      actionValue === null
        ? null
        : syntheticIdValue(actionValue, `${path}.actionId`),
    committeeId:
      committeeValue === null
        ? null
        : syntheticIdValue(committeeValue, `${path}.committeeId`),
    occurredAt: nullableDateOrDateTimeValue(
      requiredValue(parsed, "occurredAt", path),
      `${path}.occurredAt`,
    ),
    resultLabel: nullableStringValue(
      requiredValue(parsed, "resultLabel", path),
      `${path}.resultLabel`,
    ),
    yesCount: nullableIntegerValue(
      requiredValue(parsed, "yesCount", path),
      `${path}.yesCount`,
      0,
      999_999,
    ),
    noCount: nullableIntegerValue(
      requiredValue(parsed, "noCount", path),
      `${path}.noCount`,
      0,
      999_999,
    ),
    excusedCount: nullableIntegerValue(
      requiredValue(parsed, "excusedCount", path),
      `${path}.excusedCount`,
      0,
      999_999,
    ),
    absentCount: nullableIntegerValue(
      requiredValue(parsed, "absentCount", path),
      `${path}.absentCount`,
      0,
      999_999,
    ),
  };
}

function parseVersion(value: unknown, path: string): OregonODataOfflineVersion {
  const parsed = objectValue(value, path);
  exactKeys(parsed, path, [
    "versionId",
    "measureId",
    "versionLabel",
    "publishedAt",
  ]);
  return {
    versionId: syntheticIdValue(
      requiredValue(parsed, "versionId", path),
      `${path}.versionId`,
    ),
    measureId: syntheticIdValue(
      requiredValue(parsed, "measureId", path),
      `${path}.measureId`,
    ),
    versionLabel: stringValue(
      requiredValue(parsed, "versionLabel", path),
      `${path}.versionLabel`,
    ),
    publishedAt: nullableDateOrDateTimeValue(
      requiredValue(parsed, "publishedAt", path),
      `${path}.publishedAt`,
    ),
  };
}

function parseStatus(value: unknown, path: string): OregonODataOfflineStatus {
  const parsed = objectValue(value, path);
  exactKeys(parsed, path, ["statusId", "measureId", "sourceLabel", "asOf"]);
  return {
    statusId: syntheticIdValue(
      requiredValue(parsed, "statusId", path),
      `${path}.statusId`,
    ),
    measureId: syntheticIdValue(
      requiredValue(parsed, "measureId", path),
      `${path}.measureId`,
    ),
    sourceLabel: stringValue(
      requiredValue(parsed, "sourceLabel", path),
      `${path}.sourceLabel`,
    ),
    asOf: nullableDateOrDateTimeValue(
      requiredValue(parsed, "asOf", path),
      `${path}.asOf`,
    ),
  };
}

function parsePages<T>(
  value: unknown,
  path: string,
  parseItem: ItemParser<T>,
  identity: ItemIdentity<T>,
): OregonODataOfflinePage<T>[] {
  const inputPages = arrayValue(
    value,
    path,
    1,
    OREGON_ODATA_OFFLINE_POLICY.maximumPagesPerEntity,
  );
  const pages: OregonODataOfflinePage<T>[] = [];
  let previousIdentity: string | null = null;
  let totalItems = 0;

  for (const [pageIndex, pageValue] of inputPages.entries()) {
    const pagePath = `${path}[${pageIndex}]`;
    const page = objectValue(pageValue, pagePath);
    exactKeys(page, pagePath, ["pageNumber", "nextPageNumber", "items"]);
    const expectedPageNumber = pageIndex + 1;
    const pageNumber = integerValue(
      requiredValue(page, "pageNumber", pagePath),
      `${pagePath}.pageNumber`,
      1,
      OREGON_ODATA_OFFLINE_POLICY.maximumPagesPerEntity,
    );
    if (pageNumber !== expectedPageNumber) {
      failOregonODataContract(
        "inconsistent_value",
        `${pagePath}.pageNumber`,
        `expected sequential page ${expectedPageNumber}`,
      );
    }
    const expectedNext =
      pageIndex === inputPages.length - 1 ? null : pageNumber + 1;
    const nextPageNumber = nullableIntegerValue(
      requiredValue(page, "nextPageNumber", pagePath),
      `${pagePath}.nextPageNumber`,
      2,
      OREGON_ODATA_OFFLINE_POLICY.maximumPagesPerEntity,
    );
    if (nextPageNumber !== expectedNext) {
      failOregonODataContract(
        "inconsistent_value",
        `${pagePath}.nextPageNumber`,
        `expected ${expectedNext === null ? "a terminal null" : expectedNext}`,
      );
    }

    const inputItems = arrayValue(
      requiredValue(page, "items", pagePath),
      `${pagePath}.items`,
      pageIndex === inputPages.length - 1 ? 0 : 1,
      OREGON_ODATA_OFFLINE_POLICY.maximumItemsPerPage,
    );
    totalItems += inputItems.length;
    if (totalItems > OREGON_ODATA_OFFLINE_POLICY.maximumItemsPerEntity) {
      failOregonODataContract(
        "limit_exceeded",
        path,
        `entity traversal exceeds ${OREGON_ODATA_OFFLINE_POLICY.maximumItemsPerEntity} items`,
      );
    }

    const items = inputItems.map((item, itemIndex) =>
      parseItem(item, `${pagePath}.items[${itemIndex}]`),
    );
    for (const [itemIndex, item] of items.entries()) {
      const itemIdentity = identity(item);
      if (previousIdentity !== null && itemIdentity === previousIdentity) {
        failOregonODataContract(
          "duplicate_value",
          `${pagePath}.items[${itemIndex}]`,
          `duplicate identity ${itemIdentity}`,
        );
      }
      if (previousIdentity !== null && itemIdentity < previousIdentity) {
        failOregonODataContract(
          "inconsistent_value",
          `${pagePath}.items[${itemIndex}]`,
          "identities must be strictly ordered across the traversal",
        );
      }
      previousIdentity = itemIdentity;
    }
    pages.push({ pageNumber, nextPageNumber, items });
  }

  return pages;
}

function flatten<T>(pages: OregonODataOfflinePage<T>[]): T[] {
  return pages.flatMap(({ items }) => items);
}

function mapById<T>(
  values: T[],
  identity: (value: T) => string,
): Map<string, T> {
  return new Map(values.map((value) => [identity(value), value]));
}

function requireReference<T>(
  values: Map<string, T>,
  id: string,
  path: string,
  entity: string,
): T {
  const result = values.get(id);
  if (result === undefined) {
    failOregonODataContract(
      "inconsistent_value",
      path,
      `referenced ${entity} ${id} is absent`,
    );
  }
  return result;
}

function validateRelationships(bundle: OregonODataOfflineBundle): void {
  const sessions = flatten(bundle.pages.sessions);
  const measures = flatten(bundle.pages.measures);
  const sponsors = flatten(bundle.pages.sponsors);
  const committees = flatten(bundle.pages.committees);
  const actions = flatten(bundle.pages.actions);
  const votes = flatten(bundle.pages.votes);
  const versions = flatten(bundle.pages.versions);
  const statuses = flatten(bundle.pages.statuses);

  const sessionById = mapById(sessions, ({ sessionId }) => sessionId);
  const measureById = mapById(measures, ({ measureId }) => measureId);
  const committeeById = mapById(committees, ({ committeeId }) => committeeId);
  const actionById = mapById(actions, ({ actionId }) => actionId);
  const statusById = mapById(statuses, ({ statusId }) => statusId);

  for (const [index, measure] of measures.entries()) {
    requireReference(
      sessionById,
      measure.sessionId,
      `$.pages.measures[*].items[${index}].sessionId`,
      "session",
    );
    if (measure.statusId !== null) {
      const status = requireReference(
        statusById,
        measure.statusId,
        `$.pages.measures[*].items[${index}].statusId`,
        "status",
      );
      if (status.measureId !== measure.measureId) {
        failOregonODataContract(
          "inconsistent_value",
          `$.pages.measures[*].items[${index}].statusId`,
          "current status belongs to a different measure",
        );
      }
    }
  }

  for (const [index, sponsor] of sponsors.entries()) {
    requireReference(
      measureById,
      sponsor.measureId,
      `$.pages.sponsors[*].items[${index}].measureId`,
      "measure",
    );
  }

  for (const [index, committee] of committees.entries()) {
    requireReference(
      sessionById,
      committee.sessionId,
      `$.pages.committees[*].items[${index}].sessionId`,
      "session",
    );
  }

  const actionSequences = new Set<string>();
  for (const [index, action] of actions.entries()) {
    const measure = requireReference(
      measureById,
      action.measureId,
      `$.pages.actions[*].items[${index}].measureId`,
      "measure",
    );
    const sequenceIdentity = `${action.measureId}:${action.sequence}`;
    if (actionSequences.has(sequenceIdentity)) {
      failOregonODataContract(
        "duplicate_value",
        `$.pages.actions[*].items[${index}].sequence`,
        "action sequence is duplicated within the measure",
      );
    }
    actionSequences.add(sequenceIdentity);
    if (action.committeeId !== null) {
      const committee = requireReference(
        committeeById,
        action.committeeId,
        `$.pages.actions[*].items[${index}].committeeId`,
        "committee",
      );
      if (committee.sessionId !== measure.sessionId) {
        failOregonODataContract(
          "inconsistent_value",
          `$.pages.actions[*].items[${index}].committeeId`,
          "committee and measure belong to different sessions",
        );
      }
    }
  }

  for (const [index, vote] of votes.entries()) {
    const measure = requireReference(
      measureById,
      vote.measureId,
      `$.pages.votes[*].items[${index}].measureId`,
      "measure",
    );
    if (vote.actionId !== null) {
      const action = requireReference(
        actionById,
        vote.actionId,
        `$.pages.votes[*].items[${index}].actionId`,
        "action",
      );
      if (action.measureId !== vote.measureId) {
        failOregonODataContract(
          "inconsistent_value",
          `$.pages.votes[*].items[${index}].actionId`,
          "vote and action belong to different measures",
        );
      }
    }
    if (vote.committeeId !== null) {
      const committee = requireReference(
        committeeById,
        vote.committeeId,
        `$.pages.votes[*].items[${index}].committeeId`,
        "committee",
      );
      if (committee.sessionId !== measure.sessionId) {
        failOregonODataContract(
          "inconsistent_value",
          `$.pages.votes[*].items[${index}].committeeId`,
          "committee and measure belong to different sessions",
        );
      }
    }
  }

  const versionLabels = new Set<string>();
  for (const [index, version] of versions.entries()) {
    requireReference(
      measureById,
      version.measureId,
      `$.pages.versions[*].items[${index}].measureId`,
      "measure",
    );
    const labelIdentity = `${version.measureId}:${version.versionLabel}`;
    if (versionLabels.has(labelIdentity)) {
      failOregonODataContract(
        "duplicate_value",
        `$.pages.versions[*].items[${index}].versionLabel`,
        "version label is duplicated within the measure",
      );
    }
    versionLabels.add(labelIdentity);
  }

  for (const [index, status] of statuses.entries()) {
    requireReference(
      measureById,
      status.measureId,
      `$.pages.statuses[*].items[${index}].measureId`,
      "measure",
    );
  }
}

export function parseOregonODataOfflineBundle(
  input: unknown,
): OregonODataOfflineBundle {
  const root = objectValue(input, "$bundledEntities");
  exactKeys(root, "$bundledEntities", [
    "contractVersion",
    "fixtureNotice",
    "kind",
    "sourceId",
    "pages",
  ]);
  const pagesInput = objectValue(
    requiredValue(root, "pages", "$bundledEntities"),
    "$.pages",
  );
  exactKeys(pagesInput, "$.pages", [
    "sessions",
    "measures",
    "sponsors",
    "committees",
    "actions",
    "votes",
    "versions",
    "statuses",
  ]);

  const bundle: OregonODataOfflineBundle = {
    contractVersion: literalValue(
      requiredValue(root, "contractVersion", "$bundledEntities"),
      OREGON_ODATA_CONTRACT_VERSION,
      "$.contractVersion",
    ),
    fixtureNotice: literalValue(
      requiredValue(root, "fixtureNotice", "$bundledEntities"),
      OREGON_ODATA_SYNTHETIC_NOTICE,
      "$.fixtureNotice",
    ),
    kind: literalValue(
      requiredValue(root, "kind", "$bundledEntities"),
      OREGON_ODATA_BUNDLE_KIND,
      "$.kind",
    ),
    sourceId: literalValue(
      requiredValue(root, "sourceId", "$bundledEntities"),
      OREGON_ODATA_SOURCE_ID,
      "$.sourceId",
    ),
    pages: {
      sessions: parsePages(
        requiredValue(pagesInput, "sessions", "$.pages"),
        "$.pages.sessions",
        parseSession,
        ({ sessionId }) => sessionId,
      ),
      measures: parsePages(
        requiredValue(pagesInput, "measures", "$.pages"),
        "$.pages.measures",
        parseMeasure,
        ({ measureId }) => measureId,
      ),
      sponsors: parsePages(
        requiredValue(pagesInput, "sponsors", "$.pages"),
        "$.pages.sponsors",
        parseSponsor,
        ({ sponsorId }) => sponsorId,
      ),
      committees: parsePages(
        requiredValue(pagesInput, "committees", "$.pages"),
        "$.pages.committees",
        parseCommittee,
        ({ committeeId }) => committeeId,
      ),
      actions: parsePages(
        requiredValue(pagesInput, "actions", "$.pages"),
        "$.pages.actions",
        parseAction,
        ({ actionId }) => actionId,
      ),
      votes: parsePages(
        requiredValue(pagesInput, "votes", "$.pages"),
        "$.pages.votes",
        parseVote,
        ({ voteId }) => voteId,
      ),
      versions: parsePages(
        requiredValue(pagesInput, "versions", "$.pages"),
        "$.pages.versions",
        parseVersion,
        ({ versionId }) => versionId,
      ),
      statuses: parsePages(
        requiredValue(pagesInput, "statuses", "$.pages"),
        "$.pages.statuses",
        parseStatus,
        ({ statusId }) => statusId,
      ),
    },
  };
  validateRelationships(bundle);
  return bundle;
}

export function parseOregonODataOfflineContract(
  metadataInput: unknown,
  bundleInput: unknown,
): OregonODataOfflineContract {
  return {
    metadata: parseOregonODataOfflineMetadata(metadataInput),
    bundle: parseOregonODataOfflineBundle(bundleInput),
  };
}
