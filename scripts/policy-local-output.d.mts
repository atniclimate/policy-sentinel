import type { Buffer } from "node:buffer";
import type { AnalyzedCorpusV2 } from "../src/pipeline/analyzed-corpus-v2.mjs";
import type {
  LocalOutputWriteReceipt,
  ReadLocalOutputResult,
} from "../src/modules/output/local-workbench/write.mjs";

export function writeLocalOutput(
  root: string,
  corpus: AnalyzedCorpusV2,
  assets: Iterable<readonly [string, Buffer]>,
  options?: { readonly name?: "gold" | "discovery" },
): Promise<LocalOutputWriteReceipt>;

export function readLocalOutput(root: string): Promise<ReadLocalOutputResult>;
