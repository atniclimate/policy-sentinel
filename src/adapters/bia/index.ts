export {
  BIA_IDENTITY_RULE,
  BIA_PUBLICATION_REVIEW,
  BIA_RECOGNITION_2026,
  BIA_RESPONSE_POLICY,
  buildBiaRegistryFromDocuments,
  fetchOfficialBiaRegistry,
  normalizeVisibleText,
  parseRecognitionEntries,
  reconcile2026RecognitionEntries,
  stableNationId,
  verifyGovInfoTranscript,
} from "./recognition-registry";

export type {
  BiaNation,
  BiaNationRegistry,
  FetchLike,
  RawRecognitionEntry,
  RecognitionDocumentFormat,
  RecognitionEvidence,
  RecognitionSection,
  RecognitionSourceDocuments,
} from "./recognition-registry";
