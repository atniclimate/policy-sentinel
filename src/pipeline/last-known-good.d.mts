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
