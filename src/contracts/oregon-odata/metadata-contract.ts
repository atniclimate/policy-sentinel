import {
  OREGON_ODATA_CONTRACT_VERSION,
  OREGON_ODATA_ENTITY_KINDS,
  OREGON_ODATA_HISTORY_BOUNDARY_MEANING,
  OREGON_ODATA_METADATA_KIND,
  OREGON_ODATA_OFFLINE_POLICY,
  OREGON_ODATA_PAGINATION_KIND,
  OREGON_ODATA_SOURCE_ID,
  OREGON_ODATA_SYNTHETIC_NOTICE,
} from "./constants";
import { failOregonODataContract } from "./errors";
import {
  arrayValue,
  exactKeys,
  objectValue,
  requiredValue,
} from "./validation";

export interface OregonODataOfflineForeignKey {
  field: string;
  targetEntity: (typeof OREGON_ODATA_ENTITY_KINDS)[number];
  targetField: string;
  nullable: boolean;
}

export interface OregonODataOfflineEntityDescriptor {
  logicalName: (typeof OREGON_ODATA_ENTITY_KINDS)[number];
  allowlistedFields: readonly string[];
  identityFields: readonly string[];
  nullableFields: readonly string[];
  foreignKeys: readonly OregonODataOfflineForeignKey[];
}

export const OREGON_ODATA_OFFLINE_ENTITY_DESCRIPTORS = [
  {
    logicalName: "sessions",
    allowlistedFields: [
      "sessionId",
      "sessionYear",
      "displayName",
      "startDate",
      "endDate",
    ],
    identityFields: ["sessionId"],
    nullableFields: ["startDate", "endDate"],
    foreignKeys: [],
  },
  {
    logicalName: "measures",
    allowlistedFields: [
      "measureId",
      "sessionId",
      "measureNumber",
      "title",
      "relatingToText",
      "statusId",
    ],
    identityFields: ["measureId"],
    nullableFields: ["title", "relatingToText", "statusId"],
    foreignKeys: [
      {
        field: "sessionId",
        targetEntity: "sessions",
        targetField: "sessionId",
        nullable: false,
      },
      {
        field: "statusId",
        targetEntity: "statuses",
        targetField: "statusId",
        nullable: true,
      },
    ],
  },
  {
    logicalName: "sponsors",
    allowlistedFields: ["sponsorId", "measureId", "displayName", "roleLabel"],
    identityFields: ["sponsorId"],
    nullableFields: ["roleLabel"],
    foreignKeys: [
      {
        field: "measureId",
        targetEntity: "measures",
        targetField: "measureId",
        nullable: false,
      },
    ],
  },
  {
    logicalName: "committees",
    allowlistedFields: [
      "committeeId",
      "sessionId",
      "displayName",
      "chamberLabel",
    ],
    identityFields: ["committeeId"],
    nullableFields: ["chamberLabel"],
    foreignKeys: [
      {
        field: "sessionId",
        targetEntity: "sessions",
        targetField: "sessionId",
        nullable: false,
      },
    ],
  },
  {
    logicalName: "actions",
    allowlistedFields: [
      "actionId",
      "measureId",
      "sequence",
      "occurredAt",
      "sourceLabel",
      "committeeId",
    ],
    identityFields: ["actionId"],
    nullableFields: ["occurredAt", "committeeId"],
    foreignKeys: [
      {
        field: "measureId",
        targetEntity: "measures",
        targetField: "measureId",
        nullable: false,
      },
      {
        field: "committeeId",
        targetEntity: "committees",
        targetField: "committeeId",
        nullable: true,
      },
    ],
  },
  {
    logicalName: "votes",
    allowlistedFields: [
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
    ],
    identityFields: ["voteId"],
    nullableFields: [
      "actionId",
      "committeeId",
      "occurredAt",
      "resultLabel",
      "yesCount",
      "noCount",
      "excusedCount",
      "absentCount",
    ],
    foreignKeys: [
      {
        field: "measureId",
        targetEntity: "measures",
        targetField: "measureId",
        nullable: false,
      },
      {
        field: "actionId",
        targetEntity: "actions",
        targetField: "actionId",
        nullable: true,
      },
      {
        field: "committeeId",
        targetEntity: "committees",
        targetField: "committeeId",
        nullable: true,
      },
    ],
  },
  {
    logicalName: "versions",
    allowlistedFields: [
      "versionId",
      "measureId",
      "versionLabel",
      "publishedAt",
    ],
    identityFields: ["versionId"],
    nullableFields: ["publishedAt"],
    foreignKeys: [
      {
        field: "measureId",
        targetEntity: "measures",
        targetField: "measureId",
        nullable: false,
      },
    ],
  },
  {
    logicalName: "statuses",
    allowlistedFields: ["statusId", "measureId", "sourceLabel", "asOf"],
    identityFields: ["statusId"],
    nullableFields: ["asOf"],
    foreignKeys: [
      {
        field: "measureId",
        targetEntity: "measures",
        targetField: "measureId",
        nullable: false,
      },
    ],
  },
] as const satisfies readonly OregonODataOfflineEntityDescriptor[];

export const OREGON_ODATA_OFFLINE_METADATA = {
  contractVersion: OREGON_ODATA_CONTRACT_VERSION,
  fixtureNotice: OREGON_ODATA_SYNTHETIC_NOTICE,
  kind: OREGON_ODATA_METADATA_KIND,
  sourceId: OREGON_ODATA_SOURCE_ID,
  historyBoundary: {
    earliestSessionYear: OREGON_ODATA_OFFLINE_POLICY.earliestSessionYear,
    meaning: OREGON_ODATA_HISTORY_BOUNDARY_MEANING,
  },
  pagination: {
    kind: OREGON_ODATA_PAGINATION_KIND,
    firstPageNumber: 1,
    maximumPagesPerEntity: OREGON_ODATA_OFFLINE_POLICY.maximumPagesPerEntity,
    maximumItemsPerPage: OREGON_ODATA_OFFLINE_POLICY.maximumItemsPerPage,
    maximumItemsPerEntity: OREGON_ODATA_OFFLINE_POLICY.maximumItemsPerEntity,
  },
  entities: OREGON_ODATA_OFFLINE_ENTITY_DESCRIPTORS,
} as const;

export type OregonODataOfflineMetadata = typeof OREGON_ODATA_OFFLINE_METADATA;

function assertCanonical(
  value: unknown,
  expected: unknown,
  path: string,
): void {
  if (Array.isArray(expected)) {
    const parsed = arrayValue(value, path, expected.length, expected.length);
    for (const [index, item] of expected.entries()) {
      assertCanonical(parsed[index], item, `${path}[${index}]`);
    }
    return;
  }

  if (expected !== null && typeof expected === "object") {
    const expectedObject = expected as Record<string, unknown>;
    const parsed = objectValue(value, path);
    const keys = Object.keys(expectedObject);
    exactKeys(parsed, path, keys);
    for (const key of keys) {
      assertCanonical(
        requiredValue(parsed, key, path),
        expectedObject[key],
        `${path}.${key}`,
      );
    }
    return;
  }

  if (typeof value !== typeof expected) {
    failOregonODataContract(
      "invalid_type",
      path,
      `expected ${typeof expected}`,
    );
  }
  if (value !== expected) {
    failOregonODataContract(
      "inconsistent_value",
      path,
      `expected ${JSON.stringify(expected)}`,
    );
  }
}

export function parseOregonODataOfflineMetadata(
  input: unknown,
): OregonODataOfflineMetadata {
  assertCanonical(input, OREGON_ODATA_OFFLINE_METADATA, "$metadata");
  return structuredClone(OREGON_ODATA_OFFLINE_METADATA);
}
