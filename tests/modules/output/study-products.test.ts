import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import graphSchema from "../../../schemas/attributed-study-graph.schema.v1.json";
import studySchema from "../../../schemas/research-study.schema.v1.json";
import {
  buildStudyProducts,
  studySearchContext,
} from "../../../src/modules/output/study-products.mjs";
import {
  createPolicySearchIndex,
  searchPolicyCorpus,
} from "../../../src/engine/policy-search.mjs";
import {
  reviseResearchStudy,
  serializeResearchStudy,
  parseResearchStudy,
  rebindResearchStudy,
} from "../../../src/core/research-study.mjs";
import type {
  ResearchStudy,
  StudyPassage,
} from "../../../src/core/research-study.mjs";
import type { AnalyzedCorpusV2 } from "../../../src/pipeline/analyzed-corpus-v2.mjs";
import {
  canonicalV2Digest,
  createAnalyzedCorpusV2,
} from "../../../src/pipeline/analyzed-corpus-v2.mjs";
import type {
  PolicyDate,
  PolicyRelationship,
} from "../../../src/pipeline/analyzed-corpus-v2.mjs";
// @ts-expect-error Authored synthetic fixture is shared with Node contract tests.
import { createSyntheticResearchStudyFixture } from "../../../fixtures/study/research-study.mjs";

const fixture = async (options = {}) =>
  (await createSyntheticResearchStudyFixture(options)) as {
    corpus: AnalyzedCorpusV2;
    study: ResearchStudy;
    passages: Record<
      "parent" | "regional" | "extension" | "copy",
      StudyPassage
    >;
    ids: Record<string, string>;
  };

const relationshipText = [
  "SYN-REGIONAL-2026 amends SYN-EXTENSION-2026.",
  "SYN-EXTENSION-2026 supersedes SYN-ROADLESS-2026.",
  "SYN-REGIONAL-2026 corrects SYN-ROADLESS-2026.",
  "SYN-COPY-2026 repeals SYN-ROADLESS-2026.",
  "SYN-REGIONAL-2026 cites SYN-ROADLESS-2026.",
  "SYN-ROADLESS-2026 amends SYN-REGIONAL-2026.",
].join("\n");
function corpusInput(corpus: AnalyzedCorpusV2) {
  const { $schema, schemaVersion, kind, contentDigest, ...input } = corpus;
  void [$schema, schemaVersion, kind, contentDigest];
  return input;
}
function relatedCorpus(
  corpus: AnalyzedCorpusV2,
  specifications: readonly {
    id: string;
    from: string;
    to: string;
    type: PolicyRelationship["type"];
    state?: PolicyRelationship["target"]["state"];
    sourceStatedAt?: PolicyDate;
  }[],
) {
  const body = corpusInput(corpus);
  const relationships = specifications.map(
    ({
      id,
      from,
      to,
      type,
      state = "resolved",
      sourceStatedAt = { value: null, precision: "unknown" },
    }) => {
      const sourceWork = corpus.works.find(
        (work) => work.id === "work-" + from,
      )!;
      const targetWork = corpus.works.find((work) => work.id === "work-" + to)!;
      const sourceVersion = corpus.versions.find(
        (version) => version.workId === sourceWork.id,
      )!;
      const targetVersion = corpus.versions.find(
        (version) => version.workId === targetWork.id,
      )!;
      return {
        id,
        fromVersionId: sourceVersion.id,
        type,
        target: {
          state,
          workId: state === "resolved" ? targetWork.id : null,
          versionId: state === "resolved" ? targetVersion.id : null,
          sourceIdentifier: targetWork.sourceIdentifier,
          candidateVersionIds:
            state === "ambiguous"
              ? ["version-parent", "version-extension"]
              : [],
        },
        sourceLabel:
          sourceWork.sourceIdentifier +
          " " +
          type +
          " " +
          targetWork.sourceIdentifier +
          ".",
        sourceStatedAt,
        segmentIds: corpus.segments
          .filter((segment) =>
            sourceVersion.renditionIds.includes(segment.renditionId),
          )
          .map((segment) => segment.id),
      };
    },
  );
  return createAnalyzedCorpusV2({ ...body, relationships });
}

describe("integrated study knowledge products", () => {
  it("uses existing temporal relationship eligibility for future, unknown, and observed context", async () => {
    const { corpus } = await fixture({ extraText: relationshipText });
    const related = relatedCorpus(corpus, [
      {
        id: "relation-regional-extension",
        from: "regional",
        to: "extension",
        type: "amends",
        sourceStatedAt: { value: "2026-10-02", precision: "day" },
      },
      {
        id: "relation-extension-parent",
        from: "extension",
        to: "parent",
        type: "supersedes",
        sourceStatedAt: { value: "2026-10-06", precision: "day" },
      },
      {
        id: "relation-unknown-parent",
        from: "regional",
        to: "parent",
        type: "corrects",
      },
    ]);
    const index = createPolicySearchIndex(related);
    const contextAt = (
      asOf: string,
      basis: "source_available" | "corpus_observed",
    ) =>
      studySearchContext(
        null,
        related,
        searchPolicyCorpus(index, { query: "Cascades", asOf, basis }),
      );
    const early = contextAt("2026-10-03", "source_available");
    expect(early.contextRecords.map((record) => record.versionId)).toEqual([
      "version-extension",
    ]);
    expect(
      early.contextRecords[0].sourceRelationships?.map(
        (record) => record.relationshipId,
      ),
    ).toEqual(["relation-regional-extension"]);
    const later = contextAt("2026-10-06", "source_available");
    expect(
      later.contextRecords
        .find((record) => record.versionId === "version-parent")
        ?.sourceRelationships?.map((record) => record.relationshipId),
    ).toEqual(["relation-extension-parent"]);
    expect(contextAt("2026-10-06", "corpus_observed").contextRecords).toEqual(
      [],
    );
    const observed = contextAt("2026-10-07", "corpus_observed");
    expect(
      observed.contextRecords
        .find((record) => record.versionId === "version-parent")
        ?.sourceRelationships?.map((record) => record.relationshipId)
        .sort(),
    ).toEqual(["relation-extension-parent", "relation-unknown-parent"]);
  });

  it("does not promote a resolved target that was unavailable at the observation cutoff", async () => {
    const { corpus } = await fixture({ extraText: relationshipText });
    const related = relatedCorpus(corpus, [
      {
        id: "relation-regional-extension",
        from: "regional",
        to: "extension",
        type: "amends",
      },
    ]);
    const body = corpusInput(related);
    const lateTarget = createAnalyzedCorpusV2({
      ...body,
      captures: body.captures.map(({ contentDigest: digest, ...capture }) => {
        void digest;
        return {
          ...capture,
          retrievedAt:
            capture.id === "capture-extension"
              ? "2026-10-08T00:00:00Z"
              : capture.retrievedAt,
        };
      }),
      versions: body.versions.map(({ contentDigest: digest, ...version }) => {
        void digest;
        return {
          ...version,
          observedAt:
            version.id === "version-extension"
              ? "2026-10-08T00:00:00Z"
              : version.observedAt,
        };
      }),
    });
    const index = createPolicySearchIndex(lateTarget);
    const earlyResults = searchPolicyCorpus(index, {
      query: "Cascades",
      asOf: "2026-10-07",
      basis: "corpus_observed",
    });
    expect(earlyResults.hits.map((hit) => hit.versionId)).toEqual([
      "version-regional",
    ]);
    expect(
      studySearchContext(null, lateTarget, earlyResults).contextRecords,
    ).toEqual([]);
    const laterResults = searchPolicyCorpus(index, {
      query: "Cascades",
      asOf: "2026-10-08",
      basis: "corpus_observed",
    });
    expect(
      studySearchContext(null, lateTarget, laterResults).contextRecords.map(
        (record) => record.versionId,
      ),
    ).toEqual(["version-extension"]);
  });

  it("terminates cycles and reports bounded context separately from the exact total", async () => {
    const { corpus } = await fixture({ extraText: relationshipText });
    const related = relatedCorpus(corpus, [
      {
        id: "relation-regional-extension",
        from: "regional",
        to: "extension",
        type: "amends",
      },
      {
        id: "relation-extension-parent",
        from: "extension",
        to: "parent",
        type: "supersedes",
      },
      {
        id: "relation-parent-regional",
        from: "parent",
        to: "regional",
        type: "amends",
      },
    ]);
    const results = searchPolicyCorpus(createPolicySearchIndex(related), {
      query: "Cascades",
    });
    const bounded = studySearchContext(null, related, results, {
      contextLimit: 1,
    });
    expect(bounded.contextRecords.map((record) => record.versionId)).toEqual([
      "version-extension",
    ]);
    expect(bounded.totalContextRecords).toBe(2);
    expect(bounded.contextTruncated).toBe(true);
    expect(bounded.contextLimit).toBe(1);
    const complete = studySearchContext(null, related, results);
    expect(complete.contextRecords.map((record) => record.versionId)).toEqual([
      "version-extension",
      "version-parent",
    ]);
    expect(complete.contextTruncated).toBe(false);
    expect(complete.contextLimit).toBe(1000);
    for (const contextLimit of [0, -1, 1001, 1.5, Infinity])
      expect(() =>
        studySearchContext(null, related, results, { contextLimit }),
      ).toThrow("Context limit");
  });

  it("preserves transitive resolved procedural source context before a study exists, without duplicate matches", async () => {
    const { corpus } = await fixture({ extraText: relationshipText });
    const related = relatedCorpus(corpus, [
      {
        id: "relation-regional-extension",
        from: "regional",
        to: "extension",
        type: "amends",
      },
      {
        id: "relation-extension-parent",
        from: "extension",
        to: "parent",
        type: "supersedes",
      },
      {
        id: "relation-regional-parent",
        from: "regional",
        to: "parent",
        type: "corrects",
      },
    ]);
    const results = searchPolicyCorpus(createPolicySearchIndex(related), {
      query: "Cascades",
    });
    expect(
      results.hits.every((hit) => hit.versionId === "version-regional"),
    ).toBe(true);
    const context = studySearchContext(null, related, results);
    expect(context.contextRecords.map((row) => row.versionId).sort()).toEqual([
      "version-extension",
      "version-parent",
    ]);
    expect(
      new Set(context.contextRecords.map((row) => row.versionId)).size,
    ).toBe(context.contextRecords.length);
    const parent = context.contextRecords.find(
      (row) => row.versionId === "version-parent",
    )!;
    expect(parent.proceedingId).toBeNull();
    expect(parent.reason).toBe("source_stated_procedural_relationship");
    expect(
      parent.sourceRelationships?.map((row) => row.relationshipId).sort(),
    ).toEqual(["relation-extension-parent", "relation-regional-parent"]);
    for (const row of context.contextRecords) {
      expect(results.hits.some((hit) => hit.versionId === row.versionId)).toBe(
        false,
      );
      expect(row.sourceSegmentIds?.length).toBeGreaterThan(0);
      for (const evidence of row.sourceRelationships ?? []) {
        const relationship = related.relationships.find(
          (item) => item.id === evidence.relationshipId,
        )!;
        expect(evidence.relationshipDigest).toBe(relationship.contentDigest);
        expect(evidence.sourceLabel).toBe(relationship.sourceLabel);
        expect(evidence.sourceSegmentIds).toEqual(relationship.segmentIds);
        expect(evidence.targetWorkId).toBe(relationship.target.workId);
        expect(evidence.targetVersionId).toBe(relationship.target.versionId);
      }
    }
    const allDirect = searchPolicyCorpus(createPolicySearchIndex(related), {
      query: "Synthetic",
    });
    expect(studySearchContext(null, related, allDirect).contextRecords).toEqual(
      [],
    );
  });

  it("does not expand unrelated, ordinary citation, ambiguous or unresolved relationships", async () => {
    const { corpus } = await fixture({ extraText: relationshipText });
    const unrelated = relatedCorpus(corpus, [
      {
        id: "relation-unrelated-repeal",
        from: "copy",
        to: "parent",
        type: "repeals",
      },
      { id: "relation-cites", from: "regional", to: "parent", type: "cites" },
      {
        id: "relation-ambiguous",
        from: "regional",
        to: "extension",
        type: "amends",
        state: "ambiguous",
      },
      {
        id: "relation-unresolved",
        from: "regional",
        to: "parent",
        type: "corrects",
        state: "unresolved",
      },
    ]);
    const index = createPolicySearchIndex(unrelated);
    expect(
      studySearchContext(
        null,
        unrelated,
        searchPolicyCorpus(index, { query: "Cascades" }),
      ).contextRecords,
    ).toEqual([]);
    const copyOnly = searchPolicyCorpus(index, {
      query: '"Synthetic Roadless Rule Copy"',
    });
    expect(copyOnly.hits.some((hit) => hit.versionId === "version-copy")).toBe(
      true,
    );
    const repealContext = studySearchContext(null, unrelated, copyOnly);
    expect(
      repealContext.contextRecords.find(
        (row) => row.versionId === "version-parent",
      )?.sourceRelationships?.[0].type,
    ).toBe("repeals");
  });

  it("withholds source relationship wording under metadata-only display while keeping exact citation navigation", async () => {
    const { corpus } = await fixture({ extraText: relationshipText });
    const related = relatedCorpus(corpus, [
      {
        id: "relation-regional-extension",
        from: "regional",
        to: "extension",
        type: "amends",
      },
    ]);
    const body = corpusInput(related);
    // Reseal the changed policy and capture bindings through the corpus constructor.
    const profiles = body.sourceProfiles.map(
      ({ contentDigest: digest, ...profile }) => {
        void digest;
        return {
          ...profile,
          uses: { ...profile.uses, localDisplay: "metadata_link" },
        };
      },
    );
    const captures = body.captures.map(
      ({ contentDigest: digest, ...capture }) => {
        void digest;
        return {
          ...capture,
          sourceProfileDigest: canonicalV2Digest(
            profiles.find((profile) => profile.id === capture.sourceProfileId)!,
          ),
        };
      },
    );
    const restricted = createAnalyzedCorpusV2({
      ...body,
      sourceProfiles: profiles,
      captures,
    });
    const results = searchPolicyCorpus(createPolicySearchIndex(restricted), {
      query: "Cascades",
    });
    const context = studySearchContext(null, restricted, results);
    expect(
      context.contextRecords[0].sourceRelationships?.[0].sourceLabel,
    ).toBeNull();
    expect(context.contextRecords[0].sourceSegmentIds).toEqual(
      restricted.relationships[0].segmentIds,
    );
  });
  it("reopens an exact snapshot and preserves environmental tuples, provenance and historical deadlines", async () => {
    const { study, corpus } = await fixture();
    const resumed = await parseResearchStudy(
      await serializeResearchStudy(study, corpus),
      corpus,
    );
    const products = await buildStudyProducts(resumed, corpus);
    expect(products.records.environmentalEvidence).toEqual(
      study.environmentalEvidence,
    );
    expect(products.records.deadlines).toEqual(study.deadlines);
    expect(products.provenance.history).toEqual(study.revisions);
    expect(
      products.evidence.every(
        (row) => row.citation.corpusDigest === corpus.contentDigest,
      ),
    ).toBe(true);
    expect(
      products.evidence.every(
        (row) => row.citation.locator && row.citation.objectDigest,
      ),
    ).toBe(true);
    expect(products.evidenceCsv).toContain("textDigest");
    expect(products.timelineCsv).toContain("replacesDeadlineId");
    expect(products.authorityCsv).toContain("sourceStatement");
    expect(products.dossierHtml).toContain("Environmental evidence");
  });

  it("keeps private notes out of every public product and preserves them in explicit local exports", async () => {
    const { study, corpus, ids } = await fixture();
    const secret = "PRIVATE-ANALYST-NOTE-unique-7291";
    const changed = await reviseResearchStudy(
      study,
      {
        updatedAt: "2026-10-08T23:00:00Z",
        actorId: study.updatedBy,
        records: [
          {
            collection: "annotations",
            record: {
              id: "private-export-test-note",
              targetId: ids.question,
              actorId: study.updatedBy,
              createdAt: "2026-10-08T23:00:00Z",
              provenance: "analyst_authored",
              reviewState: "unreviewed",
              sensitivity: "restricted",
              text: secret,
            },
          },
        ],
      },
      corpus,
    );
    const local = await buildStudyProducts(changed, corpus);
    const publicProducts = await buildStudyProducts(changed, corpus, {
      audience: "public",
    });
    expect(JSON.stringify(local)).toContain(secret);
    expect(JSON.stringify(publicProducts)).not.toContain(secret);
    expect(publicProducts.provenance.history).toEqual([]);
    expect(publicProducts.evidence).toEqual([]); // Current v2 profiles prohibit source redistribution.
    for (const rows of Object.values(publicProducts.records))
      for (const row of rows) expect(row.sensitivity).toBe("public");
  });

  it("exports attributed graph nodes and edges with replayable citations and no dangling endpoints", async () => {
    const { study, corpus } = await fixture();
    const { graph } = await buildStudyProducts(study, corpus);
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    ajv.addSchema(studySchema);
    const validate = ajv.compile(graphSchema);
    expect(validate(graph), JSON.stringify(validate.errors)).toBe(true);
    expect(
      validate({
        ...graph,
        nodes: [{ ...graph.nodes[0], legalConclusion: true }],
      }),
    ).toBe(false);
    const refs = new Set(graph.nodes.map((node) => JSON.stringify(node.ref)));
    expect(graph.nodes.some((node) => node.ref.kind === "Study")).toBe(true);
    expect(graph.nodes.some((node) => node.ref.kind === "SourceDocument")).toBe(
      true,
    );
    expect(
      graph.nodes.some((node) => node.ref.kind === "ConsultationEvent"),
    ).toBe(true);
    for (const edge of graph.edges) {
      expect(refs.has(JSON.stringify(edge.from))).toBe(true);
      expect(refs.has(JSON.stringify(edge.to))).toBe(true);
      expect(edge.actorId).toBeTruthy();
      expect(edge.createdAt).toBeTruthy();
      if (["supportedBy", "challengedBy"].includes(edge.type))
        expect(edge.citations.length).toBeGreaterThan(0);
    }
  });

  it("applies source export policy and stale bindings to extracted derivatives and history", async () => {
    const { study, corpus } = await fixture({
      uses: { localExport: "metadata_link" },
    });
    const metadata = await buildStudyProducts(study, corpus);
    expect(metadata.evidence.length).toBeGreaterThan(0);
    expect(
      metadata.evidence.every(
        (row) => row.text === null && row.reason === "source_export_policy",
      ),
    ).toBe(true);
    expect(metadata.records.environmentalEvidence).toEqual([]);
    expect(metadata.timeline).toEqual([]);
    expect(metadata.provenance.history).toEqual([]);
    expect(JSON.stringify(metadata)).not.toContain(
      study.environmentalEvidence[0].sourceStatement,
    );
    const prohibited = await fixture({ uses: { localExport: "prohibited" } });
    const hidden = await buildStudyProducts(
      prohibited.study,
      prohibited.corpus,
    );
    expect(prohibited.study.candidates.length).toBeGreaterThan(0);
    expect(hidden.records.candidates).toEqual([]);
    expect(hidden.provenance.history).toEqual([]);
    const full = await fixture();
    const other = await fixture({ generatedAt: "2026-10-08T03:00:00Z" });
    const rebound = await rebindResearchStudy(full.study, other.corpus, {
      updatedAt: "2026-10-08T23:00:00Z",
      actorId: full.study.updatedBy,
    });
    const stale = await buildStudyProducts(rebound, other.corpus);
    expect(stale.records.environmentalEvidence).toEqual([]);
    expect(stale.timeline).toEqual([]);
    expect(stale.provenance.history).toEqual([]);
    expect(JSON.stringify(stale)).not.toContain(
      full.study.environmentalEvidence[0].sourceStatement,
    );
  });

  it("keeps common-origin copies in one group without assigning corroboration confidence", async () => {
    const { study, corpus, passages } = await fixture();
    const { evidence, provenance } = await buildStudyProducts(study, corpus);
    expect(
      evidence.find((row) => row.id === passages.parent.id)?.originGroup,
    ).toBe(evidence.find((row) => row.id === passages.copy.id)?.originGroup);
    expect(JSON.stringify(provenance)).not.toContain('"confidence"');
  });

  it("retains governing docket context separately from regional direct evidence and explains zero matches", async () => {
    const { study, corpus, ids } = await fixture();
    const index = createPolicySearchIndex(corpus);
    const results = searchPolicyCorpus(index, { query: "Cascades" });
    expect(
      results.hits.some((hit) => hit.versionId === ids.regionalVersion),
    ).toBe(true);
    const context = studySearchContext(study, corpus, results);
    expect(() =>
      studySearchContext(
        JSON.parse(JSON.stringify(study)) as ResearchStudy,
        corpus,
        results,
      ),
    ).toThrow("VALIDATED_STUDY_REQUIRED");
    expect(
      context.contextRecords.some(
        (row) =>
          row.versionId === ids.parentVersion && row.docketIds.length > 0,
      ),
    ).toBe(true);
    expect(
      context.contextRecords.every(
        (row) => !results.hits.some((hit) => hit.versionId === row.versionId),
      ),
    ).toBe(true);
    const empty = searchPolicyCorpus(index, { query: "zzznomatch7291" });
    const emptyContext = studySearchContext(study, corpus, empty);
    expect(empty.total).toBe(0);
    expect(emptyContext.coverage).toHaveLength(corpus.coverage.length);
    expect(emptyContext.limitations.join(" ")).toContain(
      "not whether an event occurred",
    );
    expect(emptyContext.limitations.join(" ")).toContain("date scope");
  });

  it("does not treat unsupported proceeding membership as governing context", async () => {
    const { study, corpus } = await fixture();
    const relation = study.authorityRelationships[0];
    const changed = await reviseResearchStudy(
      study,
      {
        updatedAt: "2026-10-08T23:00:00Z",
        actorId: study.updatedBy,
        records: [
          {
            collection: "authorityRelationships",
            record: { ...relation, reviewState: "unreviewed" },
          },
        ],
      },
      corpus,
    );
    const results = searchPolicyCorpus(createPolicySearchIndex(corpus), {
      query: "Cascades",
    });
    expect(studySearchContext(changed, corpus, results).contextRecords).toEqual(
      [],
    );
  });

  it.each(["rejected", "challenged"] as const)(
    "does not make a %s passage a governing study anchor",
    async (reviewState) => {
      const { study, corpus, passages } = await fixture();
      const reviewedAt = "2026-10-08T23:00:00Z";
      const parentReview = study.reviews.find(
        (review) => review.targetId === passages.parent.id,
      )!;
      const changed = await reviseResearchStudy(
        study,
        {
          updatedAt: reviewedAt,
          actorId: study.updatedBy,
          records: [
            {
              collection: "passages",
              record: { ...passages.parent, reviewState },
            },
            {
              collection: "reviews",
              record: {
                ...parentReview,
                id: "review-parent-" + reviewState,
                createdAt: reviewedAt,
                decision: reviewState,
              },
            },
            ...study.consultations
              .filter((event) =>
                event.participants.some(
                  (participant) => participant.scope === "tribal_nation",
                ),
              )
              .map((event) => ({
                collection: "consultations" as const,
                record: { ...event, reviewState: "unreviewed" as const },
              })),
          ],
        },
        corpus,
      );
      expect(
        changed.passages.find((passage) => passage.id === passages.parent.id)
          ?.bindingStatus,
      ).toBe("verified");
      expect(changed.proceedings[0].reviewState).toBe("accepted");
      const results = searchPolicyCorpus(createPolicySearchIndex(corpus), {
        query: "Cascades",
      });
      expect(
        studySearchContext(changed, corpus, results).contextRecords,
      ).toEqual([]);
    },
  );

  it("escapes authored HTML and neutralizes spreadsheet formulas without altering stored assertions", async () => {
    const { study, corpus, ids } = await fixture();
    const text =
      '=HYPERLINK("https://example.invalid")<script>alert(1)</script>';
    const changed = await reviseResearchStudy(
      study,
      {
        updatedAt: "2026-10-08T23:00:00Z",
        actorId: study.updatedBy,
        records: [
          {
            collection: "gaps",
            record: {
              id: "export-escaping-gap",
              questionId: ids.question,
              text,
              status: "open",
              followUpDiscoveryId: null,
              actorId: study.updatedBy,
              createdAt: "2026-10-08T23:00:00Z",
              provenance: "analyst_authored",
              reviewState: "unreviewed",
              sensitivity: "restricted",
            },
          },
        ],
      },
      corpus,
    );
    const products = await buildStudyProducts(changed, corpus);
    expect(products.dossierHtml).not.toContain("<script>");
    expect(products.dossierHtml).toContain("&lt;script&gt;");
    expect(products.gapsCsv).toContain("'=HYPERLINK");
    expect(
      products.records.gaps.find((row) => row.id === "export-escaping-gap")
        ?.text,
    ).toBe(text);
  });
});
