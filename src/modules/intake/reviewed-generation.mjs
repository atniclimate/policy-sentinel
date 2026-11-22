import { Buffer } from "node:buffer";
import { digest, writePolicyDerived } from "../../pipeline/policy-custody.mjs";
import { readOwnedFile, reviewedPaths } from "./replay.mjs";

async function writeMember(root, path, bytes) {
  try {
    return await writePolicyDerived(root, path, bytes, { replace: false });
  } catch (error) {
    if (error.message !== "DERIVED_OUTPUT_ALREADY_EXISTS") throw error;
    const existing = await readOwnedFile(root, path, bytes.length);
    if (!existing.equals(bytes))
      throw new Error("REVIEW_GENERATION_CONFLICT", { cause: error });
    return { path, bytes: bytes.length, digest: digest(bytes) };
  }
}

export async function publishReviewedGeneration(
  root,
  name,
  input,
  corpus,
  attachment,
  corpusDigest,
) {
  const generation = digest(
    JSON.stringify([digest(input), digest(corpus), digest(attachment)]),
  ).slice(0, 32);
  const paths = reviewedPaths(name, generation);
  const descriptors = await writeMember(root, paths.input, input);
  const output = await writeMember(root, paths.corpus, corpus);
  const auxiliary = await writeMember(root, paths.attachment, attachment);
  // Each generation has private filenames. Readers switch generations only at this atomic rename.
  const seal = {
    version: "1.0.0",
    generation,
    inputDigest: descriptors.digest,
    outputDigest: output.digest,
    attachmentDigest: auxiliary.digest,
    corpusDigest,
  };
  await writePolicyDerived(
    root,
    paths.seal,
    Buffer.from(`${JSON.stringify(seal, null, 2)}\n`),
  );
  return { descriptors, output, auxiliary };
}
