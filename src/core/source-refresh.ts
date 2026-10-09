import type { PolicyRecord, SourceHealth } from "../shared/contracts";

export interface SourceRefreshSuccess {
  ok: true;
  records: PolicyRecord[];
  health: SourceHealth;
}

export interface SourceRefreshFailure {
  ok: false;
  sourceId: string;
  checkedAt: string;
  failureStage: NonNullable<SourceHealth["failureStage"]>;
  publicMessage: string;
}

export type SourceRefreshResult = SourceRefreshSuccess | SourceRefreshFailure;
