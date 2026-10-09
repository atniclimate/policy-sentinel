import type { PolicyRecord, SourceConfig } from "../shared/contracts";
export type {
  SourceRefreshSuccess,
  SourceRefreshFailure,
  SourceRefreshResult,
} from "../core/source-refresh";

export interface BuildContext {
  buildId: string;
  generatedAt: string;
  source: SourceConfig;
  previousCursor: string | null;
}

export interface SourceReference {
  sourceRecordId: string;
  officialUrl: string;
  sourceUpdatedAt: string | null;
  cursor: string | null;
}

export interface AdapterContractHealth {
  ok: boolean;
  checkedAt: string;
  message: string | null;
}

export interface FetchResult {
  reference: SourceReference;
  body: unknown;
  retrievedAt: string;
}

/**
 * Adapters discover and normalize candidates. They cannot publish records or
 * bypass registry, schema, policy, provenance, or artifact validation.
 */
export interface PublicSourceAdapter {
  readonly sourceId: string;
  readonly adapterId: string;
  readonly adapterVersion: string;

  checkContract(context: BuildContext): Promise<AdapterContractHealth>;
  discover(context: BuildContext): AsyncIterable<SourceReference>;
  fetch(
    reference: SourceReference,
    context: BuildContext,
  ): Promise<FetchResult>;
  normalize(
    fetched: FetchResult,
    context: BuildContext,
  ): Promise<PolicyRecord[]>;
}
