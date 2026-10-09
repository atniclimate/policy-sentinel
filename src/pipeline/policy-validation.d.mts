import type {
  PolicyRecordV2,
  SourceConfigV2,
  SourceRegistryV2,
  NationV2,
} from "../core/public-contract-v2.mjs";
import type {
  Nation,
  PolicyRecord,
  SourceConfig,
  SourceRegistry,
  TaxonomyConfig,
} from "../shared/contracts";

export class PolicyValidationError extends Error {
  readonly issues: string[];
}

export function sourceDerivedLeafPointers(
  record: PolicyRecord | PolicyRecordV2,
): string[];

export function validateRecordPolicy<T extends PolicyRecord | PolicyRecordV2>(
  record: T,
  options: {
    sourceConfig: SourceConfig | SourceConfigV2;
    taxonomy: TaxonomyConfig;
    knownNations?: ReadonlyMap<string, Nation | NationV2> | null;
    knownNationIds?: ReadonlySet<string> | null;
  },
): T;

export function validateRecordSetPolicy<
  T extends PolicyRecord | PolicyRecordV2,
>(
  records: T[],
  options: {
    sourceRegistry: SourceRegistry | SourceRegistryV2;
    taxonomy: TaxonomyConfig;
    nations?: Array<Nation | NationV2>;
  },
): T[];
