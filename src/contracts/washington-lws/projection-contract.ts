import { createHash } from "node:crypto";

import {
  WASHINGTON_LWS_CONTRACT_VERSION,
  WASHINGTON_LWS_SOURCE_ID,
  WASHINGTON_LWS_SYNTHETIC_NOTICE,
  type WashingtonLwsOperation,
} from "./constants";
import { failWashingtonLwsContract } from "./errors";
import { type WashingtonLwsRequestInput } from "./request-contract";
import {
  parseWashingtonLwsSoapExchange,
  type WashingtonLwsCommitteeReferral,
  type WashingtonLwsLegislation,
  type WashingtonLwsLegislativeDocument,
  type WashingtonLwsSessionLaw,
  type WashingtonLwsSoapResponse,
  type WashingtonLwsSponsor,
  type WashingtonLwsStatus,
} from "./soap-contract";

const REVIEWED_SYNTHETIC_RESOURCES = [
  {
    role: "operation_response",
    operation: "GetLegislation",
    file: "get-legislation.valid.xml",
    sha256: "43669024ab9dc0093389dc92973121212c7da355bd9021adbfc533ac0fac4a0a",
  },
  {
    role: "operation_response",
    operation: "GetLegislativeStatusChangesByBillId",
    file: "get-legislative-status-changes-by-bill-id.valid.xml",
    sha256: "d078cc38da8b6c44e99ce94ae9ba4c9574a4310c11421c428c50da3f49e4ed5e",
  },
  {
    role: "operation_response",
    operation: "GetSponsors",
    file: "get-sponsors.valid.xml",
    sha256: "7fc29f70ccc889830deaeed2adfbbe67d225cc05cf7a94c184019aaf9cf852d9",
  },
  {
    role: "operation_response",
    operation: "GetCommitteeReferralsByBill",
    file: "get-committee-referrals-by-bill.valid.xml",
    sha256: "65129ed3675e579b134fdc37b7b3552178e76263aacbe69d3bb77dddcf0be822",
  },
  {
    role: "operation_response",
    operation: "GetDocuments",
    file: "get-documents.valid.xml",
    sha256: "aac1c54b698ab69bf5c3850d4a383e8d4faf2899930d2f38020dca4829fda7df",
  },
  {
    role: "operation_response",
    operation: "GetSessionLawByBillId",
    file: "get-session-law-by-bill-id.valid.xml",
    sha256: "e33873d17c107b83156bf6442e1f2a5061b979a74dd4e8ba3e3f916623413aed",
  },
  {
    role: "fault_response",
    operation: "GetDocuments",
    file: "soap-fault.valid.xml",
    sha256: "563a00345d45a9b6eea0bd411b0a37ce1468723eb8002452a6885bff653b04a0",
  },
] as const;

const REVIEWED_SYNTHETIC_MANIFEST = {
  fixtureNotice: WASHINGTON_LWS_SYNTHETIC_NOTICE,
  contractVersion: WASHINGTON_LWS_CONTRACT_VERSION,
  sourceId: WASHINGTON_LWS_SOURCE_ID,
  providerEnvelope: false,
  historicalCompleteness: "not_documented",
  jurisdiction: "general_jurisdiction",
  classification: "Unclassified",
  nationEvidence: [],
  officialSubjects: [],
  taxonomyMemberships: [],
  syntheticIdentity: {
    biennium: "3785-86",
    billNumber: 999_991,
    activeBillId: "SYNTHETIC-HB-999991-SUB1-ENG2",
  },
  prohibitedSyntheticSentinels: [
    {
      file: "get-sponsors.valid.xml",
      fields: ["Phone", "Email", "FirstName", "LastName"],
      values: [
        "PROHIBITED-SPONSOR-PHONE",
        "PROHIBITED-SPONSOR-EMAIL",
        "PROHIBITED-SPONSOR-FIRST-NAME",
        "PROHIBITED-SPONSOR-LAST-NAME",
      ],
      purpose:
        "Known prohibited synthetic sponsor fields that must be discarded before projection.",
    },
    {
      file: "get-committee-referrals-by-bill.valid.xml",
      fields: ["Phone"],
      values: ["PROHIBITED-COMMITTEE-PHONE"],
      purpose:
        "Known prohibited synthetic committee field that must be discarded before projection.",
    },
  ],
  resources: REVIEWED_SYNTHETIC_RESOURCES,
} as const;

export interface WashingtonLwsSyntheticFixtureResource {
  role: "operation_response" | "fault_response";
  operation: WashingtonLwsOperation;
  file: string;
  sha256: string;
}

export interface WashingtonLwsSyntheticFixtureManifest {
  fixtureNotice: typeof WASHINGTON_LWS_SYNTHETIC_NOTICE;
  contractVersion: typeof WASHINGTON_LWS_CONTRACT_VERSION;
  sourceId: typeof WASHINGTON_LWS_SOURCE_ID;
  providerEnvelope: false;
  historicalCompleteness: "not_documented";
  jurisdiction: "general_jurisdiction";
  classification: "Unclassified";
  nationEvidence: [];
  officialSubjects: [];
  taxonomyMemberships: [];
  syntheticIdentity: {
    biennium: "3785-86";
    billNumber: 999_991;
    activeBillId: "SYNTHETIC-HB-999991-SUB1-ENG2";
  };
  prohibitedSyntheticSentinels: Array<{
    file: string;
    fields: string[];
    values: string[];
    purpose: string;
  }>;
  resources: WashingtonLwsSyntheticFixtureResource[];
}

export type WashingtonLwsSyntheticFixtureBytes = Record<string, unknown>;

export interface WashingtonLwsSyntheticBillBundle {
  fixtureNotice: typeof WASHINGTON_LWS_SYNTHETIC_NOTICE;
  contractVersion: typeof WASHINGTON_LWS_CONTRACT_VERSION;
  sourceId: typeof WASHINGTON_LWS_SOURCE_ID;
  providerEnvelope: false;
  identityBehavior: "synthetic_fixture_only_provider_behavior_unverified";
  historicalCompleteness: "not_documented";
  billKey: {
    biennium: string;
    billNumber: number;
  };
  versions: WashingtonLwsLegislation[];
  statusHistory: WashingtonLwsStatus[];
  sponsors: WashingtonLwsSponsor[];
  committeeReferrals: WashingtonLwsCommitteeReferral[];
  documents: WashingtonLwsLegislativeDocument[];
  sessionLaw: WashingtonLwsSessionLaw;
  governance: {
    jurisdiction: "general_jurisdiction";
    classification: "Unclassified";
    nationEvidence: [];
    officialSubjects: [];
    taxonomyMemberships: [];
  };
  privacy: {
    reviewedInputContactSentinelsPresent: true;
    knownContactFieldsDiscardedBeforeProjection: true;
  };
  reviewedFixtureInventory: Array<{
    role: "operation_response" | "fault_response";
    operation: WashingtonLwsOperation;
    file: string;
    sha256: string;
    outcome: "present" | "fault";
  }>;
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableJson(value: unknown): string {
  const serialized = JSON.stringify(value, (_key, nested) => {
    if (
      nested === null ||
      typeof nested !== "object" ||
      Array.isArray(nested)
    ) {
      return nested;
    }
    return Object.fromEntries(
      Object.entries(nested as Record<string, unknown>).sort(
        ([left], [right]) => compareCodeUnits(left, right),
      ),
    );
  });
  if (serialized === undefined) {
    failWashingtonLwsContract(
      "invalid_type",
      "$fixtureManifest",
      "fixture manifest is not JSON-serializable",
    );
  }
  return serialized;
}

export function parseWashingtonLwsSyntheticFixtureManifest(
  value: unknown,
): WashingtonLwsSyntheticFixtureManifest {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    stableJson(value) !== stableJson(REVIEWED_SYNTHETIC_MANIFEST)
  ) {
    failWashingtonLwsContract(
      "inconsistent_value",
      "$fixtureManifest",
      "manifest differs from the reviewed repository-owned synthetic inventory",
    );
  }
  return structuredClone(
    REVIEWED_SYNTHETIC_MANIFEST,
  ) as unknown as WashingtonLwsSyntheticFixtureManifest;
}

function fixtureByteView(value: unknown, path: string): Uint8Array {
  if (
    !ArrayBuffer.isView(value) ||
    Object.prototype.toString.call(value) !== "[object Uint8Array]"
  ) {
    failWashingtonLwsContract(
      "invalid_type",
      path,
      "reviewed fixture resource must be supplied as bytes",
    );
  }
  return value as Uint8Array;
}

function exactFixtureFiles(
  value: unknown,
  manifest: WashingtonLwsSyntheticFixtureManifest,
): WashingtonLwsSyntheticFixtureBytes {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    failWashingtonLwsContract(
      "invalid_type",
      "$fixtureBytes",
      "expected a plain fixture-file-to-bytes object",
    );
  }
  const source = value as Record<string, unknown>;
  const files = manifest.resources.map(({ file }) => file);
  const keys = Object.keys(source);
  if (
    keys.length !== files.length ||
    keys.some((key) => !files.includes(key)) ||
    files.some((file) => !Object.hasOwn(source, file))
  ) {
    failWashingtonLwsContract(
      "unexpected_field",
      "$fixtureBytes",
      "fixture inventory must contain every digest-bound resource exactly once",
    );
  }
  return source;
}

function verifyFixtureResources(
  manifest: WashingtonLwsSyntheticFixtureManifest,
  fixtureBytes: WashingtonLwsSyntheticFixtureBytes,
): void {
  for (const resource of manifest.resources) {
    const bytes = fixtureByteView(
      fixtureBytes[resource.file],
      `$.fixtureBytes.${resource.file}`,
    );
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== resource.sha256) {
      failWashingtonLwsContract(
        "inconsistent_value",
        `$.fixtureBytes.${resource.file}`,
        "fixture bytes do not match the reviewed SHA-256 inventory",
      );
    }
  }

  for (const sentinelSet of manifest.prohibitedSyntheticSentinels) {
    const bytes = fixtureByteView(
      fixtureBytes[sentinelSet.file],
      `$.fixtureBytes.${sentinelSet.file}`,
    );
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    for (const sentinel of sentinelSet.values) {
      if (!text.includes(sentinel)) {
        failWashingtonLwsContract(
          "missing_field",
          `$.fixtureBytes.${sentinelSet.file}`,
          "reviewed contact sentinel is absent from its digest-bound input",
        );
      }
    }
  }
}

function syntheticRequest(
  operation: WashingtonLwsOperation,
  manifest: WashingtonLwsSyntheticFixtureManifest,
): WashingtonLwsRequestInput {
  const { activeBillId, biennium, billNumber } = manifest.syntheticIdentity;
  switch (operation) {
    case "GetLegislation":
      return { operation, biennium, billNumber };
    case "GetLegislativeStatusChangesByBillId":
      return {
        operation,
        biennium,
        billId: activeBillId,
        beginDate: "3785-01-01T00:00:00.000Z",
        endDate: "3785-01-31T00:00:00.000Z",
      };
    case "GetSponsors":
    case "GetSessionLawByBillId":
      return { operation, biennium, billId: activeBillId };
    case "GetCommitteeReferralsByBill":
      return { operation, biennium, billNumber };
    case "GetDocuments":
      return { operation, biennium, namedLike: activeBillId };
  }
}

function operationResource(
  operation: WashingtonLwsOperation,
  manifest: WashingtonLwsSyntheticFixtureManifest,
): WashingtonLwsSyntheticFixtureResource {
  const resource = manifest.resources.find(
    (candidate) =>
      candidate.role === "operation_response" &&
      candidate.operation === operation,
  );
  if (resource === undefined) {
    failWashingtonLwsContract(
      "missing_field",
      `$.fixtureManifest.resources.${operation}`,
      "reviewed operation fixture is missing",
    );
  }
  return resource;
}

function successfulFixtureResponse<O extends WashingtonLwsOperation>(
  operation: O,
  manifest: WashingtonLwsSyntheticFixtureManifest,
  fixtureBytes: WashingtonLwsSyntheticFixtureBytes,
): Extract<WashingtonLwsSoapResponse<O>, { kind: "success" }> {
  const resource = operationResource(operation, manifest);
  const response = parseWashingtonLwsSoapExchange(
    syntheticRequest(operation, manifest) as Extract<
      WashingtonLwsRequestInput,
      { operation: O }
    >,
    fixtureBytes[resource.file],
  );
  if (response.kind !== "success" || response.resultState !== "present") {
    failWashingtonLwsContract(
      "inconsistent_value",
      `$.fixtureBytes.${resource.file}`,
      "reviewed representative fixture must contain its expected present result",
    );
  }
  return response as Extract<WashingtonLwsSoapResponse<O>, { kind: "success" }>;
}

export function loadWashingtonLwsReviewedSyntheticFixtureBundle(
  manifestValue: unknown,
  fixtureBytesValue: unknown,
): WashingtonLwsSyntheticBillBundle {
  const manifest = parseWashingtonLwsSyntheticFixtureManifest(manifestValue);
  const fixtureBytes = exactFixtureFiles(fixtureBytesValue, manifest);
  verifyFixtureResources(manifest, fixtureBytes);

  const versions = successfulFixtureResponse(
    "GetLegislation",
    manifest,
    fixtureBytes,
  ).result;
  const statusHistory = successfulFixtureResponse(
    "GetLegislativeStatusChangesByBillId",
    manifest,
    fixtureBytes,
  ).result;
  const sponsors = successfulFixtureResponse(
    "GetSponsors",
    manifest,
    fixtureBytes,
  ).result;
  const committeeReferrals = successfulFixtureResponse(
    "GetCommitteeReferralsByBill",
    manifest,
    fixtureBytes,
  ).result;
  const documents = successfulFixtureResponse(
    "GetDocuments",
    manifest,
    fixtureBytes,
  ).result;
  const sessionLaw = successfulFixtureResponse(
    "GetSessionLawByBillId",
    manifest,
    fixtureBytes,
  ).result;
  if (sessionLaw === null) {
    failWashingtonLwsContract(
      "missing_field",
      "$.fixtureBytes.get-session-law-by-bill-id.valid.xml",
      "reviewed representative fixture must contain session-law evidence",
    );
  }

  const faultResource = manifest.resources.find(
    ({ role }) => role === "fault_response",
  );
  if (faultResource === undefined) {
    failWashingtonLwsContract(
      "missing_field",
      "$.fixtureManifest.resources",
      "reviewed fault fixture is missing",
    );
  }
  const fault = parseWashingtonLwsSoapExchange(
    syntheticRequest(faultResource.operation, manifest),
    fixtureBytes[faultResource.file],
  );
  if (fault.kind !== "fault") {
    failWashingtonLwsContract(
      "inconsistent_value",
      `$.fixtureBytes.${faultResource.file}`,
      "reviewed fault resource did not parse as a sanitized SOAP fault",
    );
  }

  return {
    fixtureNotice: manifest.fixtureNotice,
    contractVersion: manifest.contractVersion,
    sourceId: manifest.sourceId,
    providerEnvelope: false,
    identityBehavior: "synthetic_fixture_only_provider_behavior_unverified",
    historicalCompleteness: "not_documented",
    billKey: {
      biennium: manifest.syntheticIdentity.biennium,
      billNumber: manifest.syntheticIdentity.billNumber,
    },
    versions,
    statusHistory,
    sponsors,
    committeeReferrals,
    documents,
    sessionLaw,
    governance: {
      jurisdiction: "general_jurisdiction",
      classification: "Unclassified",
      nationEvidence: [],
      officialSubjects: [],
      taxonomyMemberships: [],
    },
    privacy: {
      reviewedInputContactSentinelsPresent: true,
      knownContactFieldsDiscardedBeforeProjection: true,
    },
    reviewedFixtureInventory: manifest.resources.map((resource) => ({
      ...resource,
      outcome: resource.role === "fault_response" ? "fault" : "present",
    })),
  };
}
