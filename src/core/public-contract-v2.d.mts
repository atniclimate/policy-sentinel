import type { PolicyRecord, SourceRegistry, Nation } from "../shared/contracts";
import type { JurisdictionAssociation } from "./jurisdiction-reference.mjs";
export const PUBLIC_CONTRACT_VERSION: "2.0.0";
export interface PublicJurisdictionV2 extends JurisdictionAssociation {
  readonly level:
    "federal" | "state" | "county" | "municipal" | "tribal" | "other";
  readonly name: string;
  readonly generalJurisdictionOnly?: boolean;
  readonly review: {
    readonly reviewer: string;
    readonly reviewedAt: string;
  } | null;
}
export type PolicyRecordV2 = Omit<
  PolicyRecord,
  "schemaVersion" | "jurisdiction" | "documentType"
> & {
  schemaVersion: "2.0.0";
  documentType:
    | PolicyRecord["documentType"]
    | "municipal_policy"
    | "municipal_ordinance"
    | "intertribal_publication";
  jurisdiction: PublicJurisdictionV2 & { generalJurisdictionOnly: boolean };
};
export type SourceRegistryV2 = Omit<
  SourceRegistry,
  "schemaVersion" | "registryVersion" | "sources"
> & {
  schemaVersion: "2.0.0";
  registryVersion: string;
  sources: Array<
    Omit<SourceRegistry["sources"][number], "jurisdiction"> & {
      jurisdiction: PublicJurisdictionV2;
    }
  >;
};
export type NationV2 = Omit<Nation, "stateCoverage"> & {
  stateCoverage: Omit<Nation["stateCoverage"], "states" | "evidence"> & {
    jurisdictionRefs: string[];
    evidence?: Array<Record<string, unknown>>;
  };
};
export function publicJurisdictionAssociation(
  jurisdiction: unknown,
  recordRef: string,
): Readonly<JurisdictionAssociation>;
/** Migration candidate only. Legacy and successor schema + policy validation are mandatory before admission. */
export function migratePublicRecordV2(
  jsonText: unknown,
  jurisdictionJsonText: unknown,
): {
  record: PolicyRecordV2;
  receipt: {
    from: "1.4.0";
    to: "2.0.0";
    recordId: string;
    previousJurisdiction: PolicyRecord["jurisdiction"];
    previousJurisdictionProvenance: PolicyRecord["fieldProvenance"];
    validationState: "requires_schema_and_policy_validation";
    jurisdictionEvidence: JurisdictionAssociation["evidence"];
  };
};
/** Migration candidate only; validate legacy and successor schema + registry semantics before admission. */
export function migrateSourceRegistryV2(
  jsonText: unknown,
  jurisdictionBindingsJsonText: unknown,
): SourceRegistryV2;
export function migrateNationCoverageV2(nation: Nation | NationV2): NationV2;

export type SourceConfigV2 = SourceRegistryV2["sources"][number];
