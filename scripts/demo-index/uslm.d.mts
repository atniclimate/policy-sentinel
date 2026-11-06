import type { UscSourceCreditShard } from "../../src/demo/index-types.ts";
import type { WordingProblem } from "./common.mjs";

export interface UslmBuildReport {
  omitted: { identifier: string; field: "noteText"; reason: WordingProblem }[];
  statusCounts: Record<string, number>;
  unmappedRefCount: number;
}

export function buildUslmShard(
  xml: string,
  options: { title: number; releasePoint: string; names: readonly string[] },
): { shard: UscSourceCreditShard; report: UslmBuildReport };
