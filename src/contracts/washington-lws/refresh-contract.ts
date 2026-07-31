import { createHash } from "node:crypto";

import {
  WASHINGTON_LWS_CONTRACT_VERSION,
  WASHINGTON_LWS_KNOWN_BILL_OPERATIONS,
  WASHINGTON_LWS_OPERATION_DESCRIPTORS,
  WASHINGTON_LWS_SOURCE_ID,
  WASHINGTON_LWS_SYNTHETIC_NOTICE,
  type WashingtonLwsKnownBillOperation,
} from "./constants";
import { failWashingtonLwsContract } from "./errors";
import {
  parseWashingtonLwsSoapExchange,
  type WashingtonLwsLegislationInfo,
} from "./soap-contract";

export const WASHINGTON_LWS_REFRESH_CAPABILITY_VERSION = "1.0.0" as const;

type PointOperationCapability = {
  requiredSeed: readonly string[];
  populationDiscovery: "none";
  mutationCoverage:
    | "known_bill_snapshot_only"
    | "known_bill_status_window_only"
    | "known_bill_sponsors_only"
    | "known_bill_committee_referrals_only"
    | "known_document_name_only"
    | "known_bill_session_law_only";
};

const POINT_OPERATION_CAPABILITIES = Object.freeze({
  GetLegislation: Object.freeze({
    requiredSeed: Object.freeze(["biennium", "billNumber"]),
    populationDiscovery: "none",
    mutationCoverage: "known_bill_snapshot_only",
  }),
  GetLegislativeStatusChangesByBillId: Object.freeze({
    requiredSeed: Object.freeze(["biennium", "billId", "beginDate", "endDate"]),
    populationDiscovery: "none",
    mutationCoverage: "known_bill_status_window_only",
  }),
  GetSponsors: Object.freeze({
    requiredSeed: Object.freeze(["biennium", "billId"]),
    populationDiscovery: "none",
    mutationCoverage: "known_bill_sponsors_only",
  }),
  GetCommitteeReferralsByBill: Object.freeze({
    requiredSeed: Object.freeze(["biennium", "billNumber"]),
    populationDiscovery: "none",
    mutationCoverage: "known_bill_committee_referrals_only",
  }),
  GetDocuments: Object.freeze({
    requiredSeed: Object.freeze(["biennium", "namedLike"]),
    populationDiscovery: "none",
    mutationCoverage: "known_document_name_only",
  }),
  GetSessionLawByBillId: Object.freeze({
    requiredSeed: Object.freeze(["biennium", "billId"]),
    populationDiscovery: "none",
    mutationCoverage: "known_bill_session_law_only",
  }),
} as const satisfies Record<
  WashingtonLwsKnownBillOperation,
  PointOperationCapability
>);

export const WASHINGTON_LWS_REFRESH_CAPABILITY = Object.freeze({
  version: WASHINGTON_LWS_REFRESH_CAPABILITY_VERSION,
  knownBillOperations: WASHINGTON_LWS_KNOWN_BILL_OPERATIONS,
  pointOperations: POINT_OPERATION_CAPABILITIES,
  pointOperationPopulationDiscovery: "none",
  unifiedMutationFeed: "none",
  numericBillRangeScanning: "forbidden",
  selectedEnumerationCandidate: Object.freeze({
    operation: "GetLegislationByYear",
    formalRequestSequence: Object.freeze([
      Object.freeze({ name: "year", type: "xsd:int" }),
    ]),
    responseItem: "LegislationInfo",
    providerDescription: "all_bills_active_during_year",
    helpSignatureConflict: "biennium_prose_conflicts_with_xsd_int",
    requestYearEcho: "not_observable",
    pagination: "not_documented",
    providerRowLimit: "not_documented",
    ordering: "not_documented",
    populationCompleteness: "unverified",
    historicalRange: "unverified",
    reviewedInitialCanaryYears: Object.freeze([2_025, 2_026]),
    firstReviewedCanaryYear: 2_025,
    repositoryMaximumItems:
      WASHINGTON_LWS_OPERATION_DESCRIPTORS.GetLegislationByYear.maximumItems,
    productionEnabled: false,
  }),
} as const);

const REVIEWED_ENUMERATION_MANIFEST = {
  fixtureNotice: WASHINGTON_LWS_SYNTHETIC_NOTICE,
  contractVersion: WASHINGTON_LWS_CONTRACT_VERSION,
  refreshCapabilityVersion: WASHINGTON_LWS_REFRESH_CAPABILITY_VERSION,
  sourceId: WASHINGTON_LWS_SOURCE_ID,
  providerEnvelope: false,
  operation: "GetLegislationByYear",
  syntheticYear: 3_785,
  populationCompleteness: "not_established",
  historicalCompleteness: "not_documented",
  unifiedMutationFeed: false,
  numericBillRangeScanning: "forbidden",
  jurisdiction: "general_jurisdiction",
  classification: "Unclassified",
  nationEvidence: [],
  officialSubjects: [],
  taxonomyMemberships: [],
  resource: {
    file: "get-legislation-by-year.valid.xml",
    sha256: "7078cd03a45cd5dfaf19e8da9531f110b4e5bc1f1b687dfa8ab798afdb1e79fe",
  },
} as const;

export interface WashingtonLwsSyntheticEnumerationManifest {
  fixtureNotice: typeof WASHINGTON_LWS_SYNTHETIC_NOTICE;
  contractVersion: typeof WASHINGTON_LWS_CONTRACT_VERSION;
  refreshCapabilityVersion: typeof WASHINGTON_LWS_REFRESH_CAPABILITY_VERSION;
  sourceId: typeof WASHINGTON_LWS_SOURCE_ID;
  providerEnvelope: false;
  operation: "GetLegislationByYear";
  syntheticYear: 3_785;
  populationCompleteness: "not_established";
  historicalCompleteness: "not_documented";
  unifiedMutationFeed: false;
  numericBillRangeScanning: "forbidden";
  jurisdiction: "general_jurisdiction";
  classification: "Unclassified";
  nationEvidence: [];
  officialSubjects: [];
  taxonomyMemberships: [];
  resource: {
    file: "get-legislation-by-year.valid.xml";
    sha256: string;
  };
}

export interface WashingtonLwsSyntheticEnumerationEvidence {
  fixtureNotice: typeof WASHINGTON_LWS_SYNTHETIC_NOTICE;
  contractVersion: typeof WASHINGTON_LWS_CONTRACT_VERSION;
  refreshCapabilityVersion: typeof WASHINGTON_LWS_REFRESH_CAPABILITY_VERSION;
  sourceId: typeof WASHINGTON_LWS_SOURCE_ID;
  providerEnvelope: false;
  operation: "GetLegislationByYear";
  syntheticYear: number;
  requestYearEcho: "not_observable";
  populationCompleteness: "not_established";
  historicalCompleteness: "not_documented";
  unifiedMutationFeed: false;
  numericBillRangeScanning: "forbidden";
  orderingBehavior: "synthetic_order_preserved_provider_behavior_unverified";
  duplicateBehavior: "synthetic_duplicates_preserved_provider_behavior_unverified";
  result: WashingtonLwsLegislationInfo[];
  governance: {
    jurisdiction: "general_jurisdiction";
    classification: "Unclassified";
    nationEvidence: [];
    officialSubjects: [];
    taxonomyMemberships: [];
  };
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
      "$enumerationFixtureManifest",
      "enumeration manifest is not JSON-serializable",
    );
  }
  return serialized;
}

export function parseWashingtonLwsSyntheticEnumerationManifest(
  value: unknown,
): WashingtonLwsSyntheticEnumerationManifest {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    stableJson(value) !== stableJson(REVIEWED_ENUMERATION_MANIFEST)
  ) {
    failWashingtonLwsContract(
      "inconsistent_value",
      "$enumerationFixtureManifest",
      "manifest differs from the reviewed synthetic enumeration inventory",
    );
  }
  return structuredClone(
    REVIEWED_ENUMERATION_MANIFEST,
  ) as unknown as WashingtonLwsSyntheticEnumerationManifest;
}

export function loadWashingtonLwsSyntheticEnumerationEvidence(
  manifestValue: unknown,
  fixtureBytesValue: unknown,
): WashingtonLwsSyntheticEnumerationEvidence {
  const manifest =
    parseWashingtonLwsSyntheticEnumerationManifest(manifestValue);
  if (
    !ArrayBuffer.isView(fixtureBytesValue) ||
    Object.prototype.toString.call(fixtureBytesValue) !== "[object Uint8Array]"
  ) {
    failWashingtonLwsContract(
      "invalid_type",
      "$enumerationFixtureBytes",
      "reviewed enumeration fixture must be supplied as bytes",
    );
  }
  const fixtureBytes = fixtureBytesValue as Uint8Array;
  const digest = createHash("sha256").update(fixtureBytes).digest("hex");
  if (digest !== manifest.resource.sha256) {
    failWashingtonLwsContract(
      "inconsistent_value",
      "$enumerationFixtureBytes",
      "fixture bytes do not match the reviewed enumeration SHA-256",
    );
  }

  const response = parseWashingtonLwsSoapExchange(
    {
      operation: manifest.operation,
      year: manifest.syntheticYear,
    },
    fixtureBytes,
  );
  if (response.kind !== "success" || response.resultState !== "present") {
    failWashingtonLwsContract(
      "inconsistent_value",
      "$enumerationFixtureBytes",
      "reviewed enumeration fixture must contain a present result",
    );
  }

  return {
    fixtureNotice: manifest.fixtureNotice,
    contractVersion: manifest.contractVersion,
    refreshCapabilityVersion: manifest.refreshCapabilityVersion,
    sourceId: manifest.sourceId,
    providerEnvelope: false,
    operation: manifest.operation,
    syntheticYear: manifest.syntheticYear,
    requestYearEcho: "not_observable",
    populationCompleteness: manifest.populationCompleteness,
    historicalCompleteness: manifest.historicalCompleteness,
    unifiedMutationFeed: false,
    numericBillRangeScanning: "forbidden",
    orderingBehavior: "synthetic_order_preserved_provider_behavior_unverified",
    duplicateBehavior:
      "synthetic_duplicates_preserved_provider_behavior_unverified",
    result: response.result,
    governance: {
      jurisdiction: manifest.jurisdiction,
      classification: manifest.classification,
      nationEvidence: [],
      officialSubjects: [],
      taxonomyMemberships: [],
    },
  };
}
