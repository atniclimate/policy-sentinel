import assert from "node:assert/strict";
import test from "node:test";
import axe from "axe-core";
import { JSDOM } from "jsdom";
import {
  createAnalyzedCorpusV2,
  canonicalV2Digest,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import {
  enrichPolicyCorpus,
  resolvePolicyResearchReview,
  buildPolicyResearchOutput,
} from "../../src/pipeline/policy-research-output.mjs";
import { syntheticCorpusV2Input } from "./analyzed-corpus-v2.test.mjs";

const clone = (value) => JSON.parse(JSON.stringify(value));
const selector = (versionId) => ({
  versionId,
  sourceLocator: "/policy/section-1",
});
function fixture() {
  const input = syntheticCorpusV2Input();
  input.relationships = [];
  input.analyses = [];
  input.findings = [];
  input.renditions[0].omittedSourceLocators = ["/policy/omitted-private-brief"];
  const corpus = createAnalyzedCorpusV2(input);
  const review = {
    version: "1.0.0",
    baseCorpusDigest: corpus.contentDigest,
    generatedAt: "2026-09-04T00:00:00Z",
    reviewer: {
      name: "Synthetic analyst",
      kind: "agent",
      reviewedAt: "2026-09-03T12:00:00Z",
    },
    relationships: [
      {
        id: "review-relation",
        fromVersionId: "version-b",
        type: "amends",
        target: {
          state: "resolved",
          workId: "work-a",
          versionId: "version-a-old",
          sourceIdentifier: "Instrument A",
          candidateVersionIds: [],
        },
        sourceLabel: "Amends Instrument A",
        sourceStatedAt: { value: "2021-01-01", precision: "day" },
        evidence: [selector("version-b")],
      },
    ],
    analyses: [
      {
        id: "review-procedure",
        versionId: "version-a-old",
        method: { id: "synthetic-declared-method", version: "1.0.0" },
        uncertainty: "provisional",
        codes: [
          {
            dimension: "procedure",
            value: "Review proposals",
            evidence: [selector("version-a-old")],
          },
        ],
      },
    ],
    findings: [
      {
        id: "review-finding",
        question: "Do retained synthetic procedure words agree?",
        populationVersionIds: ["version-a-old", "version-a-new", "version-b"],
        method: { id: "synthetic-bounded-comparison", version: "1.0.0" },
        disposition: "provisional",
        claim:
          "Synthetic review language differs; <script> is literal analyst text.",
        supportingEvidence: [selector("version-a-old"), selector("version-b")],
        contraryEvidence: [selector("version-a-new")],
        missingEvidence: ["No implementation evidence is represented."],
        rivalExplanations: ["These synthetic examples intentionally differ."],
        nextDisconfirmingTest: "Compare a separately authored provision.",
        analysisIds: ["review-procedure"],
      },
    ],
  };
  return { corpus, review };
}

test("research enrichment pins its base, resolves exact source locators and preserves every source catalog", () => {
  const input = fixture();
  const before = canonicalV2Digest(input);
  const resolved = resolvePolicyResearchReview(input);
  const enriched = enrichPolicyCorpus(input);
  assert.equal(enriched.contentDigest, resolved.corpus.contentDigest);
  assert.notEqual(enriched.contentDigest, input.corpus.contentDigest);
  for (const key of [
    "sourceProfiles",
    "captures",
    "works",
    "versions",
    "renditions",
    "segments",
    "events",
    "coverage",
  ])
    assert.deepEqual(enriched[key], input.corpus[key]);
  assert.equal(canonicalV2Digest(input), before);
  const evidence = input.corpus.segments.find(
    (segment) => segment.renditionId === "rendition-b",
  );
  assert.deepEqual(enriched.relationships[0].segmentIds, [evidence.id]);
  input.review.relationships[0].evidence[0].expectedTextDigest =
    evidence.textDigest;
  assert.equal(enrichPolicyCorpus(input).contentDigest, enriched.contentDigest);
});

test("research rejects stale bases, locators, evidence digests, wrong versions and unattested relationship dates", () => {
  const mutations = [
    [
      (value) => {
        value.review.baseCorpusDigest = "0".repeat(64);
      },
      /PINNED_BASE/,
    ],
    [
      (value) => {
        value.review.relationships[0].evidence[0].sourceLocator = "/absent";
      },
      /EXACT_UNAMBIGUOUS/,
    ],
    [
      (value) => {
        value.review.relationships[0].evidence[0].expectedTextDigest =
          "0".repeat(64);
      },
      /TEXT_DIGEST/,
    ],
    [
      (value) => {
        value.review.relationships[0].evidence[0].versionId = "version-a-old";
      },
      /VERSION_SCOPE/,
    ],
    [
      (value) => {
        value.review.relationships[0].sourceStatedAt.value = "2020-01-01";
      },
      /DATE_NOT_ATTESTED/,
    ],
    [
      (value) => {
        value.review.relationships[0].sourceLabel = "Repeals Instrument A";
      },
      /RELATIONSHIP/,
    ],
    [
      (value) => {
        value.review.reviewer.reviewedAt = "2026-09-01T00:00:00Z";
      },
      /PRECEDES_CAPTURE/,
    ],
    [
      (value) => {
        value.review.generatedAt = "2026-09-03T00:00:00Z";
      },
      /TIME_ORDER/,
    ],
    [
      (value) => {
        value.review.findings[0].contraryEvidence = [];
      },
      /EVIDENCE_REQUIRED/,
    ],
    [
      (value) => {
        value.review.findings[0].rivalExplanations = [];
      },
      /FALSIFIABLE/,
    ],
    [
      (value) => {
        value.review.findings[0].populationVersionIds = ["version-b"];
      },
      /FINDING/,
    ],
  ];
  for (const [mutate, expected] of mutations) {
    const input = fixture();
    mutate(input);
    assert.throws(() => enrichPolicyCorpus(input), expected);
  }
});

test("dossier assets are deterministic, escape text and preserve exact single-segment evidence and omission boundaries", () => {
  const corpus = enrichPolicyCorpus(fixture());
  const assets = buildPolicyResearchOutput(corpus);
  assert.deepEqual(
    [...assets.keys()],
    ["dossier.html", "evidence.html", "research.json", "dossier.css"],
  );
  assert.deepEqual(assets, buildPolicyResearchOutput(clone(corpus)));
  const html = assets.get("dossier.html");
  const evidence = assets.get("evidence.html");
  assert.match(html, /&lt;script&gt; is literal analyst text/);
  assert.doesNotMatch(html + evidence, /<script|<style|style=|onclick=/);
  assert.match(html, /Contrary or qualifying evidence/);
  assert.match(html, /Next disconfirming test/);
  assert.match(evidence, /Reviewed omissions exist/);
  assert.match(evidence, /\/policy\/omitted-private-brief/);
  assert.equal((evidence.match(/<blockquote>/g) ?? []).length, 3);
  for (const segment of corpus.segments) {
    assert.ok(html.includes(`evidence.html#${segment.id}`));
    assert.ok(evidence.includes(`id="${segment.id}"`));
    assert.ok(evidence.includes(segment.textDigest));
  }
  const json = JSON.parse(assets.get("research.json"));
  assert.equal(json.corpusDigest, corpus.contentDigest);
  assert.equal(json.evidence.length, 3);
  assert.ok(
    json.evidence.every(
      (entry) =>
        !Object.hasOwn(entry, "quote") && !Object.hasOwn(entry, "text"),
    ),
  );
  assert.ok(!Object.hasOwn(json, "renditions"));
  assert.match(evidence, /https:\/\/source-b.invalid\/policy\/b/);
});

test("research output denies a source profile whose local excerpt permission is closed", () => {
  const input = syntheticCorpusV2Input();
  input.sourceProfiles[0].uses.excerpts = false;
  for (const capture of input.captures.filter(
    (value) => value.sourceProfileId === "profile-a",
  ))
    capture.sourceProfileDigest = canonicalV2Digest(input.sourceProfiles[0]);
  const corpus = createAnalyzedCorpusV2(input);
  assert.throws(
    () => buildPolicyResearchOutput(corpus),
    /FULL_LOCAL_RESEARCH_OUTPUT_POLICY/,
  );
});

test("static dossier and evidence pages expose accessible landmarks, headings, table headers and native evidence links", async () => {
  const assets = buildPolicyResearchOutput(enrichPolicyCorpus(fixture()));
  for (const name of ["dossier.html", "evidence.html"]) {
    const dom = new JSDOM(assets.get(name), {
      url: `https://local.invalid/${name}`,
    });
    try {
      const result = await axe.run(dom.window.document.documentElement, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        rules: { "color-contrast": { enabled: false } },
      });
      assert.deepEqual(
        result.violations.map((value) => value.id),
        [],
      );
      assert.equal(dom.window.document.querySelectorAll("main").length, 1);
      assert.ok(
        [...dom.window.document.querySelectorAll("a")].every(
          (link) => link.textContent.trim() && link.hasAttribute("href"),
        ),
      );
    } finally {
      dom.window.close();
    }
  }
});
