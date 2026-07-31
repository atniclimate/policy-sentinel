import type { PolicyRecord, SourceHealth } from "../shared/contracts";
import type { SourceRefreshResult } from "./source-adapter";

export function mergeSourceRefresh(input: {
  sourceId: string;
  refresh: SourceRefreshResult;
  previousRecords?: PolicyRecord[];
  previousHealth?: SourceHealth | null;
}): {
  records: PolicyRecord[];
  health: SourceHealth;
};
