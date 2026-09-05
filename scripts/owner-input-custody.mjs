import { createHash } from "node:crypto";

export const PRESERVED_OWNER_DIRECTION_INPUT_SHA256 = Object.freeze({
  "docs/Policy-Sentinel-0.9-Implementation-Package-Index-2026-09-05.md":
    "2316e664644d075a0e9c91c53b7aaa7ce7c60f41311b51592fd52184b9483a53",
  "docs/Policy-Sentinel-0.9-Long-Run-Session-Briefs-2026-09-05.md":
    "1ad9c0da7f7289e856d62fa91b154a6e584691c06d9ce18dd939df8e13a3b2ca",
  "docs/Policy-Sentinel-0.9-Program-Plan-2026-09-05.md":
    "b6d12527a0550e35b5b5315c15251f58a701ae69e911bc33b517309f35958a9b",
  "docs/Policy-Sentinel-Adversarial-Review-and-Decision-Log-2026-09-05 (1).md":
    "7bc42b62b4021f7e77fde775857d5e67b242f0139996288138950a17a9c6d813",
  "docs/Policy-Sentinel-Adversarial-Review-and-Decision-Log-2026-09-05.md":
    "c8ced347228ea732ec2986214dd6e15d164a083afc14cb486daac1444b8d1358",
  "docs/Policy-Sentinel-Fresh-Codex-Onboarding-and-Run-1-Kickoff-2026-09-05.md":
    "54f320051ae392a8e52f491d484251aa46824afec7cb51635530f5053386d797",
  "docs/Policy-Sentinel-PNW-Research-and-Test-Case-Catalog-2026-09-05.md":
    "82c45788e51be6e127796fd6f2d0a2d48895b7f234e2ff3faf9ffc244979e152",
  "docs/Policy-Sentinel-Real-Source-Corpus-Identity-and-Citation-Design-2026-09-05.md":
    "da5187f7955de0dcf3ee40053bf732fca02564992117b37cdd5b1051827dbdb5",
  "docs/policy-sentinel-selected-records.csv":
    "0de36d7c76e2b19635a3f64e42ede1061a5c54d33bece1eb9e60c9e6e2c0a6c8",
  "docs/Policy-Sentinel-State-and-Distance-to-Ship-Assessment-2026-09-04.md":
    "f552a002294027798e106c2ed14f974d1b20d825d0cec1ade06da9ba62c5073e",
  "docs/00-READ-FIRST.md":
    "88f6967bf9655c02e2b598011f437e9c0ed7415b3c722fe537ffa7171095f6fa",
  "docs/01-NORTH-STAR-AND-PRODUCT-CONTRACT.md":
    "22738dfd2d2362cffd5071d2553aea907ded5b0f734c917dcf6b4b1a80da9b52",
  "docs/02-PNW-REGIONAL-SCOPE-AND-AUTHORITY.md":
    "b0f9dfd54b126cd94f6236976edd20c66f697a665236a5a17eafc863090f3556",
  "docs/03-ENGINE-ARCHITECTURE-AND-DATA-MODEL.md":
    "67abb72b8f3c816af0c9582a34ced6da0f74cbd986f6339c7e9e01171e0bfe9b",
  "docs/04-DEFINITION-OF-DONE-AND-ACCEPTANCE.md":
    "0ca69a5f78e5e0f6fc21e4786f77228b033afab2f54755d1b30ee63492645a41",
  "docs/05-ROADMAP-REBASE-PROPOSAL.yaml":
    "7a015459d1d7a5c5cbce161b3076645978d7967bafdb824856b2e7aa06cf4add",
  "docs/06-REPRESENTATIVE-USE-CASES.md":
    "ba7bd9911f6a8f5b5a7eaba17de366f03d1f298e7648d463fe5a456781d55965",
  "docs/07-DECISIONS-GATES-AND-NON-GOALS.md":
    "9677dfe181f64db80009bd3bf469b3aef756e9cc3829536bc2461c0d8c9e012a",
  "docs/08-CODEX-LONG-RUN-DIRECTIVE.md":
    "afdefa2dc2bfdea37edd345ceef07dd11b97a910e45e2b5c51d052035533b29f",
  "docs/09-PASTE-INTO-CODEX.txt":
    "e4902fb1ce2ff067c27f5fa272aef6152301d4d5309d132311da0bd78ebeecdc",
  "docs/10-CODEX-PRODUCT-SPACE-REBASE-CONTINUATION.md":
    "0110be885473a7b5287eaa7cc8ff864b10a21409b2f62b5d8bb667a8ae2b68b3",
  "docs/11-CODEX-REPOSITORY-CONGRUENCE-AND-LONG-RUN-HANDOFF.md":
    "9a49eecddbc626190e7d5a9f445c0e14348d2aa63fb4c0edc6f757572c6cadc3",
  "docs/12-CODEX-PNW-03-GEOGRAPHY-RIGHTS-IMPLEMENTATION-LONG-RUN.md":
    "84fcb0bf60021c75c7e87b2b61d1e8b066b3c9b63a7ecf4a7dfd1e49315d9959",
  "docs/13-CODEX-PNW-04-TAXONOMY-IMPLEMENTATION-LONG-RUN.md":
    "e82c88fddd781e2fffccb8871c1dc30502ebf7838d0efb167d4a50a6e6e0555a",
  "docs/14-CODEX-PNW-05-SOURCE-PACK-CORE-LONG-RUN.md":
    "6146b2e478caf484e702e48f4412d2cbeb8f461212f53cf63862e61d573c12f6",
  "docs/14A-CODEX-PNW-05-SOURCE-PACK-CORE-CLOSEOUT.md":
    "b8ddbb2e2f34d7e4221ebda7065105cc1a3563be6618ba7660459ea1c4134bd2",
  "docs/15-CODEX-PNW-05-FEDERAL-REGISTER-DOC-REVIEW-MAX-LONG-RUN.md":
    "508c6b8ec3f69e57eceb81b44a4510ae59e514b48c9dee9ef93e6319c24b08c2",
  "docs/15A-PNW-05-SOURCE-CANDIDATE-QUALIFICATION-AND-AUTHORIZATION.md":
    "eda4148c38480081e29b119ecf4c6df7c051cbb235632af93a3e2d740b807b89",
  "docs/15B-CASE-EXAMPLE-01-LUMMI-POINT-ROBERTS-BROADBAND.md":
    "e6e255ae5956c9f685fd840b26b6f3e827553e02f750edd0da043a9955597743",
  "docs/15C-CASE-EXAMPLE-02-ROADLESS-RULE-RESCISSION.md":
    "45c716302379c30eef79307f843d7d982350e2da6debb5a5becf7fb3ddcd7c9e",
  "docs/15D-PNW-05-CASE-EVIDENCE-CROSSWALK.md":
    "61010682c331836619a01c8afaa172c9e82e0b6860de6c3907406aedfce14eda",
  "docs/15E-PNW-05-TRIBAL-POLICY-CONTEXT-SOURCE-LANDSCAPE.md":
    "bde02ceccf87554964d09b30d134b510d69777a377af9564ea46f27f82df069c",
  "docs/POLICY-SENTINEL-REAL-SOURCE-PRERELEASE-MAX-LONG-RUN.md":
    "7cac531c3346fc85c2eb37701ecfcb64838aa44553417c6b9c7506567978d266",
});

const sha256 = (contents) =>
  createHash("sha256").update(contents).digest("hex");

export const matchesOwnerInputCustody = ({
  expectedSha256,
  fileContents,
  repositoryRelativePath,
  untrackedPaths,
}) =>
  typeof expectedSha256 === "string" &&
  expectedSha256.length === 64 &&
  untrackedPaths instanceof Set &&
  untrackedPaths.has(repositoryRelativePath) &&
  sha256(fileContents) === expectedSha256;
