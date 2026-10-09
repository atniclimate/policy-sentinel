import { createCuratedDocumentPackRuntime } from "../src/modules/intake/curated-document-pack.mjs";
import { parseAnalyzedCorpus } from "./configured-analyzed-corpus.mjs";

export const { createCuratedDocumentPack, replayCuratedDocumentPack } =
  createCuratedDocumentPackRuntime({ parseAnalyzedCorpus });
