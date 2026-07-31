export {
  BIA_IDENTITY_RULE,
  BIA_PUBLICATION_REVIEW,
  BIA_RECOGNITION_2026,
  BIA_REVIEWED_TRANSCRIPTION,
  BIA_RESPONSE_POLICY,
  buildBiaRegistryFromDocuments,
  fetchOfficialBiaRegistry,
  govInfoBoundedListSha256,
  normalizeVisibleText,
  parseRecognitionEntries,
  reconcile2026RecognitionEntries,
  stableNationId,
  verifyGovInfoTranscript,
  verifyReviewedRecognitionInventory,
} from "./recognition-registry";

export type {
  FetchLike,
  RawRecognitionEntry,
  RecognitionDocumentFormat,
  RecognitionSection,
  RecognitionSourceDocuments,
} from "./recognition-registry";

export {
  prepareBiaStagingOutput,
  resolveBiaStagingOutput,
  writeBiaStagingJson,
} from "./output-staging";
