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

export function sourceDerivedLeafPointers(record: PolicyRecord): string[];

export function validateRecordPolicy(
  record: PolicyRecord,
  options: {
    sourceConfig: SourceConfig;
    taxonomy: TaxonomyConfig;
    knownNations?: ReadonlyMap<string, Nation> | null;
    knownNationIds?: ReadonlySet<string> | null;
  },
): PolicyRecord;

export function validateRecordSetPolicy(
  records: PolicyRecord[],
  options: {
    sourceRegistry: SourceRegistry;
    taxonomy: TaxonomyConfig;
    nations?: Nation[];
  },
): PolicyRecord[];
