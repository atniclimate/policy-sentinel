import type {
  PolicyRecordV2,
  SourceRegistryV2,
} from "../core/public-contract-v2.mjs";
import type { SourceRegistry } from "../shared/contracts";
import type { PolicyRecord, SourceHealth } from "../shared/contracts";
import type { SourceRefreshResult } from "../core/source-refresh";

export function mergeSourceRefresh(input: {
  sourceId: string;
  refresh: SourceRefreshResult;
  previousRecords?: PolicyRecord[];
  previousHealth?: SourceHealth | null;
}): {
  records: PolicyRecord[];
  health: SourceHealth;
};

export function verifyLastKnownGoodArtifact(
  root: string,
  options?: { sourceRegistry: SourceRegistry | SourceRegistryV2 },
): Promise<{
  manifest: Record<string, unknown>;
  verifiedAssets: Map<string, unknown>;
  records: Array<PolicyRecord | PolicyRecordV2>;
  healthDocument: { sources: SourceHealth[] };
}>;
export function loadLastKnownGoodSource(
  root: string,
  sourceId: string,
  options?: { sourceRegistry: SourceRegistry | SourceRegistryV2 },
): Promise<{
  manifest: Record<string, unknown>;
  records: Array<PolicyRecord | PolicyRecordV2>;
  health: SourceHealth | null;
}>;
