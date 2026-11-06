import type {
  CfrAuthorityShard,
  ShardCitation,
} from "../../src/demo/index-types.ts";
import type { WordingProblem } from "./common.mjs";

export interface CfrBuildReport {
  omitted: {
    part: string;
    field: "authorityText" | "sourceText";
    reason: WordingProblem;
  }[];
  droppedCitations: number;
  continuedParts: string[];
}

export function shardCitations(
  text: string,
  kinds: readonly ("usc" | "pl" | "stat" | "fr")[],
): { kept: ShardCitation[]; dropped: number };

export function buildCfrShard(
  volumeXml: readonly { volume: number; xml: string }[],
  options: {
    title: number;
    editionYear: number;
    volumes: number[] | null;
    names: readonly string[];
  },
): { shard: CfrAuthorityShard; report: CfrBuildReport };
