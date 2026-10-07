import { canonicalV2Digest } from "../pipeline/analyzed-corpus-v2.mjs";

const fail = (code) => {
  throw new Error(code);
};
const safeFile = (value) =>
  typeof value === "string" &&
  /^[a-zA-Z0-9_./-]+$/.test(value) &&
  value
    .split("/")
    .every(
      (part) =>
        part &&
        part !== "." &&
        part !== ".." &&
        !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
    );
function assertProfileBindings(corpusOrInput, run) {
  for (const profile of corpusOrInput.sourceProfiles) {
    const admitted = run.manifest.profiles.find(
      (source) => source.id === profile.id,
    );
    const selected = Object.fromEntries(
      ["id", "hosts", "pathPrefixes", "review", "uses"].map((key) => [
        key,
        profile[key],
      ]),
    );
    if (
      !admitted ||
      canonicalV2Digest(selected) !== canonicalV2Digest(admitted)
    )
      fail("SOURCE_POLICY_ADMISSION_MISMATCH");
  }
}
function assertCaptureBindings(corpus, run) {
  for (const capture of corpus.captures) {
    const receipt = run.ledger.operations[capture.operationId];
    if (
      !receipt ||
      receipt.state !== "complete" ||
      receipt.profileId !== capture.sourceProfileId ||
      receipt.objectDigest !== capture.objectDigest ||
      receipt.url !== capture.requestedUrl ||
      receipt.finalUrl !== capture.finalUrl ||
      receipt.completedAt !== capture.retrievedAt ||
      receipt.mediaType !== capture.mediaType ||
      receipt.decodedBytes !== capture.decodedBytes ||
      receipt.encodedBytes !== capture.encodedBytes
    )
      fail("OUTPUT_CAPTURE_ADMISSION_MISMATCH");
  }
}

export { safeFile, assertProfileBindings, assertCaptureBindings };
