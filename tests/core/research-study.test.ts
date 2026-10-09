// @vitest-environment node
import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "../../schemas/research-study.schema.v1.json";
import { canonicalV2Digest } from "../../src/pipeline/analyzed-corpus-v2.mjs";
import type {
  AnalyzedCorpusV2,
  AnalyzedCorpusV21,
  AnalyzedCorpus,
  PolicySourceProfile,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import {
  MAX_RESEARCH_STUDY_BYTES,
  assertValidatedResearchStudy,
  captureStudyPassage,
  createResearchStudy,
  normalizeStudySourceDate,
  parseResearchStudy,
  readResearchStudyRevision,
  rebindResearchStudy,
  reviseResearchStudy,
  serializeResearchStudy,
  studyActiveDeadlines,
  studyReadPassage,
  studyRecordReferences,
} from "../../src/core/research-study.mjs";
import type {
  ResearchStudy,
  StudyChange,
  StudyPassage,
} from "../../src/core/research-study.mjs";
// @ts-expect-error Authored JavaScript fixture has no separate declaration.
import * as studyFixtures from "../../fixtures/study/research-study.mjs";
const { createSyntheticResearchStudyFixture, createSyntheticStudyCorpus } =
  studyFixtures;

interface Fixture {
  corpus: AnalyzedCorpusV2;
  study: ResearchStudy;
  passages: Record<"parent" | "regional" | "extension" | "copy", StudyPassage>;
  ids: Record<
    | "study"
    | "question"
    | "proceeding"
    | "parentVersion"
    | "regionalVersion"
    | "extensionVersion"
    | "copyVersion"
    | "analyst"
    | "agency"
    | "organization"
    | "nation",
    string
  >;
}
const fixture: () => Promise<Fixture> = createSyntheticResearchStudyFixture;
const corpusFixture: (options?: {
  uses?: Partial<PolicySourceProfile["uses"]>;
  extraText?: string;
  documentKeys?: string[];
  generatedAt?: string;
}) => AnalyzedCorpusV2 = createSyntheticStudyCorpus;
const updateTime = "2026-10-08T02:00:00Z";
const actor = {
  id: "analyst",
  label: "Synthetic Analyst",
  kind: "analyst",
  sensitivity: "public",
} as const;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function mutate(
  study: ResearchStudy,
  records: readonly StudyChange[],
  corpus: AnalyzedCorpus,
) {
  return reviseResearchStudy(
    study,
    { updatedAt: updateTime, actorId: actor.id, records },
    corpus,
  );
}
async function passageOnly(corpus: AnalyzedCorpusV2) {
  const study = await createResearchStudy(
    {
      id: "study-policy",
      title: "Private working title",
      createdAt: "2026-10-08T01:00:00Z",
      actor,
    },
    corpus,
  );
  const passage = await captureStudyPassage(
    {
      id: "passage-policy",
      segmentId: corpus.segments[0].id,
      actorId: actor.id,
      createdAt: updateTime,
      sensitivity: "public",
    },
    corpus,
  );
  return {
    passage,
    study: await mutate(
      study,
      [{ collection: "passages", record: passage }],
      corpus,
    ),
  };
}

describe("persistent research study", () => {
  it.each([
    ["September 19, 2025", "2025-09-19", "day"],
    ["September 1 2025", "2025-09-01", "day"],
    ["September 2025", "2025-09", "month"],
    ["  FEBRUARY 29, 2024  ", "2024-02-29", "day"],
    ["February\n2000", "2000-02", "month"],
  ])(
    "normalizes only the explicit precision in %s",
    (text, value, precision) => {
      const normalized = normalizeStudySourceDate(text);
      expect(normalized).toEqual({ value, precision });
      expect(Object.isFrozen(normalized)).toBe(true);
    },
  );

  it.each([
    "February 29, 2025",
    "February 29, 1900",
    "April 31, 2025",
    "September 0, 2025",
    "September 32, 2025",
    "September 19",
    "September",
    "September 19, 25",
    "Sept. 19, 2025",
    "09/19/2025",
    "19 September 2025",
    "September 19–20, 2025",
    "September 2025 through October 2025",
    "September 19, 2025 or September 20, 2025",
    "30 days after September 19, 2025",
    "next September",
    "tomorrow",
    "",
  ])("does not infer a source date from %s", (text) => {
    expect(normalizeStudySourceDate(text)).toBeNull();
  });

  it("replays original month-name dates across actions, deadlines and consultation records without changing review requirements", async () => {
    const proposalText = "A synthetic rule was proposed on September 1, 2025.";
    const deadlineText =
      "Comments close September 19, 2025 Pacific Time, received by midnight.";
    const consultationText =
      "A consultation notice was issued in September 2025.";
    const isoText = "A synthetic action was recorded on 2025-09-01.";
    const unsupportedDates = [
      "February 29, 2025",
      "September 2025 through October 2025",
      "September 19, 2025 or September 20, 2025",
      "30 days after September 19, 2025",
    ];
    const corpus = corpusFixture({
      documentKeys: ["parent"],
      extraText:
        "\n" +
        [
          proposalText,
          deadlineText,
          consultationText,
          isoText,
          ...unsupportedDates,
        ].join("\n"),
    });
    const { study, passage } = await passageOnly(corpus);
    const base = {
      actorId: actor.id,
      createdAt: updateTime,
      provenance: "extracted_evidence",
      reviewState: "unreviewed",
      sensitivity: "public",
      passageIds: [passage.id],
    } as const;
    const proceeding = {
      ...base,
      id: "date-proceeding",
      title: "Synthetic proceeding with source-stated dates",
      parentProceedingId: null,
      docketIds: [],
      rins: [],
      versionIds: [passage.citation.versionId],
      sourceStatement: proposalText,
    };
    const action = {
      ...base,
      id: "date-action",
      proceedingId: proceeding.id,
      versionId: passage.citation.versionId,
      type: "proposed_rule",
      date: { value: "2025-09-01", precision: "day" },
      sourceDateText: "September 1, 2025",
      sourceStatement: proposalText,
      previousActionId: null,
    } as const;
    const deadline = {
      ...base,
      id: "date-deadline",
      actionId: action.id,
      type: "comment",
      date: { value: "2025-09-19", precision: "day" },
      sourceDateText: "September 19, 2025",
      timeZone: "Pacific Time",
      qualifications: "received by midnight",
      replacesDeadlineId: null,
      sourceStatement: deadlineText,
    } as const;
    const consultation = {
      ...base,
      id: "date-consultation",
      proceedingId: proceeding.id,
      type: "notice",
      date: { value: "2025-09", precision: "month" },
      sourceDateText: "September 2025",
      sourceStatement: consultationText,
      relatedEventIds: [],
      respondsToEventId: null,
      participants: [],
    } as const;
    const records: StudyChange[] = [
      { collection: "proceedings", record: proceeding },
      { collection: "actions", record: action },
      { collection: "deadlines", record: deadline },
      { collection: "consultations", record: consultation },
      {
        collection: "actions",
        record: {
          ...action,
          id: "date-iso-action",
          sourceDateText: "2025-09-01",
          sourceStatement: isoText,
        },
      },
    ];
    const saved = await mutate(study, records, corpus);
    const reopened = await parseResearchStudy(
      await serializeResearchStudy(saved, corpus),
      corpus,
    );
    expect(reopened.actions.find((record) => record.id === action.id)).toEqual(
      action,
    );
    expect(reopened.deadlines[0]).toEqual(deadline);
    expect(reopened.consultations[0]).toEqual(consultation);
    expect(
      reopened.actions.find((record) => record.id === "date-iso-action")?.date,
    ).toEqual(action.date);
    expect((await studyReadPassage(passage, corpus)).text).toContain(
      deadlineText,
    );

    for (const wrongDate of [
      { value: "2025-09-02", precision: "day" },
      { value: "2025-09", precision: "month" },
      { value: "2025", precision: "year" },
    ] as const) {
      await expect(
        mutate(
          study,
          [
            records[0],
            { collection: "actions", record: { ...action, date: wrongDate } },
          ],
          corpus,
        ),
      ).rejects.toThrow(/SOURCE_DATE_NORMALIZATION/u);
    }
    await expect(
      mutate(
        study,
        [
          records[0],
          {
            collection: "actions",
            record: { ...action, sourceDateText: "September 01, 2025" },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/SOURCE_DATE_REPLAY/u);
    await expect(
      mutate(
        study,
        [
          records[0],
          {
            collection: "actions",
            record: { ...action, reviewState: "accepted" },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/REVIEW_REQUIRED/u);
    for (const sourceDateText of unsupportedDates) {
      await expect(
        mutate(
          study,
          [
            records[0],
            {
              collection: "actions",
              record: {
                ...action,
                date: { value: "2025", precision: "year" },
                sourceDateText,
                sourceStatement: sourceDateText,
              },
            },
          ],
          corpus,
        ),
      ).rejects.toThrow(/SOURCE_DATE_NORMALIZATION/u);
    }
    for (const date of [
      { value: "2025", precision: "year" },
      { value: "2025-09", precision: "month" },
      { value: "2025-09-01", precision: "day" },
    ] as const) {
      const iso = await mutate(
        study,
        [
          records[0],
          {
            collection: "actions",
            record: {
              ...action,
              date,
              sourceDateText: date.value,
              sourceStatement: isoText,
            },
          },
        ],
        corpus,
      );
      expect(iso.actions[0].date).toEqual(date);
    }
  });

  it("compiles the closed schema and round trips exact canonical digests and immutable records", async () => {
    const { study, corpus, passages } = await fixture();
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    expect(validate(study), JSON.stringify(validate.errors)).toBe(true);
    const { contentDigest, ...body } = study;
    expect(contentDigest).toBe(canonicalV2Digest(body));
    const text = await serializeResearchStudy(study, corpus);
    const parsed = await parseResearchStudy(text, corpus);
    expect(parsed).toEqual(study);
    expect(Object.isFrozen(parsed.questions[0])).toBe(true);
    expect(Object.isFrozen(parsed.revisions[1].changes)).toBe(true);
    expect(() => assertValidatedResearchStudy(parsed, corpus)).not.toThrow();
    expect(() => assertValidatedResearchStudy(clone(parsed), corpus)).toThrow(
      /VALIDATED_STUDY_REQUIRED/u,
    );
    expect(() => assertValidatedResearchStudy(parsed, clone(corpus))).toThrow(
      /VALIDATED_CORPUS_REQUIRED/u,
    );
    const otherCorpus = corpusFixture({ generatedAt: "2026-10-08T00:30:00Z" });
    await createResearchStudy(
      { id: "study-other", title: "Other", createdAt: updateTime, actor },
      otherCorpus,
    );
    expect(() => assertValidatedResearchStudy(parsed, otherCorpus)).toThrow(
      /CORPUS_BINDING/u,
    );
    expect(passages.regional.citation.sourceOrigin.publisher).toBe(
      "Synthetic Agency",
    );
    expect(passages.regional.citation.sourceDates.publication.value).toBe(
      "2026-10-01",
    );
    expect(passages.regional).not.toHaveProperty("quote");
    expect(
      (
        await studyReadPassage(
          parsed.passages.find(
            (passage) => passage.id === passages.regional.id,
          )!,
          corpus,
        )
      ).text,
    ).toContain("habitat loss 2.5 ha");
  });

  it("restores earlier authored text and provenance after edits, without overwriting prior records", async () => {
    const { study, corpus } = await fixture();
    const oldQuestion = study.questions[0];
    const changed = await mutate(
      study,
      [
        {
          collection: "questions",
          record: {
            ...oldQuestion,
            text: "A revised private research question",
            reviewState: "unreviewed",
            sensitivity: "restricted",
          },
        },
      ],
      corpus,
    );
    expect(changed.revision).toBe(study.revision + 1);
    expect(changed.previousDigest).toBe(study.contentDigest);
    expect(changed.questions[0].text).not.toBe(oldQuestion.text);
    const restored = await readResearchStudyRevision(
      await parseResearchStudy(
        await serializeResearchStudy(changed, corpus),
        corpus,
      ),
      study.revision,
    );
    expect(restored).toEqual(study);
    expect(restored.questions[0].text).toBe(oldQuestion.text);
    expect(
      (await readResearchStudyRevision(changed, 1)).questions,
    ).toHaveLength(0);
    expect(changed.revisions.at(-1)?.changes[0].record).toEqual(oldQuestion);
  });

  it("rejects missing fields, extra fields, malformed bytes and tampered current or historical records", async () => {
    const { study, corpus } = await fixture();
    const missing = { ...study } as { sensitivity?: string };
    delete missing.sensitivity;
    await expect(
      parseResearchStudy(JSON.stringify(missing), corpus),
    ).rejects.toThrow(/SHAPE/u);
    await expect(
      parseResearchStudy(
        JSON.stringify({ ...study, hiddenJurisdiction: "inferred" }),
        corpus,
      ),
    ).rejects.toThrow(/SHAPE/u);
    await expect(parseResearchStudy("{", corpus)).rejects.toThrow(
      /STUDY_JSON/u,
    );
    await expect(
      parseResearchStudy(" ".repeat(MAX_RESEARCH_STUDY_BYTES + 1), corpus),
    ).rejects.toThrow(/STUDY_BYTE_LIMIT/u);
    await expect(
      parseResearchStudy(
        JSON.stringify({ ...study, title: "Tampered" }),
        corpus,
      ),
    ).rejects.toThrow(/STUDY_DIGEST/u);
    const history = clone(study);
    const changedHistory = {
      ...history,
      revisions: history.revisions.map((revision, index) =>
        index ? revision : { ...revision, updatedAt: "2026-10-08T00:59:00Z" },
      ),
    };
    const { contentDigest: ignored, ...body } = changedHistory;
    void ignored;
    await expect(
      parseResearchStudy(
        JSON.stringify({ ...body, contentDigest: canonicalV2Digest(body) }),
        corpus,
      ),
    ).rejects.toThrow(/STUDY_DIGEST|REVISION/u);
  });

  it("rejects hostile getters before invocation, custom prototypes and cycles in every controlled update", async () => {
    const { study, corpus } = await fixture();
    let calls = 0;
    const input = {
      id: "study-hostile",
      title: "Title",
      createdAt: updateTime,
      actor,
    };
    Object.defineProperty(input, "title", {
      enumerable: true,
      get() {
        calls++;
        return "Hostile";
      },
    });
    await expect(createResearchStudy(input, corpus)).rejects.toThrow(
      /PLAIN_JSON_REQUIRED/u,
    );
    const change = {
      updatedAt: updateTime,
      actorId: actor.id,
      records: [] as StudyChange[],
    };
    Object.defineProperty(change, "records", {
      enumerable: true,
      get() {
        calls++;
        return [];
      },
    });
    await expect(reviseResearchStudy(study, change, corpus)).rejects.toThrow(
      /PLAIN_JSON_REQUIRED/u,
    );
    const item = {
      collection: "questions",
      record: study.questions[0],
    } as StudyChange;
    Object.defineProperty(item, "collection", {
      enumerable: true,
      get() {
        calls++;
        return "questions";
      },
    });
    await expect(mutate(study, [item], corpus)).rejects.toThrow(
      /PLAIN_JSON_REQUIRED/u,
    );
    const cyclic = {
      updatedAt: updateTime,
      actorId: actor.id,
      records: [] as unknown[],
    };
    cyclic.records.push(cyclic);
    await expect(
      reviseResearchStudy(
        study,
        cyclic as Parameters<typeof reviseResearchStudy>[1],
        corpus,
      ),
    ).rejects.toThrow(/PLAIN_JSON_REQUIRED/u);
    await expect(
      createResearchStudy(
        Object.assign(Object.create({ hidden: true }), {
          id: "study-prototype",
          title: "Title",
          createdAt: updateTime,
          actor,
        }),
        corpus,
      ),
    ).rejects.toThrow(/PLAIN_JSON_REQUIRED/u);
    expect(calls).toBe(0);
  });

  it("requires the capture API and keeps source identity and original content separate from authored claims", async () => {
    const { study, corpus, passages } = await fixture();
    await expect(
      mutate(
        study,
        [
          {
            collection: "passages",
            record: { ...passages.parent, id: "passage-forged" },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/CAPTURE_API_REQUIRED/u);
    await expect(
      mutate(
        study,
        [
          {
            collection: "passages",
            record: {
              ...passages.parent,
              citation: {
                ...passages.parent.citation,
                sourceUrl: "https://other.invalid/policy/a",
              },
            },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/IMMUTABLE_EVIDENCE/u);
    await expect(
      mutate(
        study,
        [
          {
            collection: "assertions",
            record: {
              ...study.assertions[0],
              id: "assertion-forged",
              provenance: "source_content",
              reviewState: "unreviewed",
            },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/SOURCE_PROVENANCE/u);
    const model = {
      id: "model",
      label: "Synthetic model",
      kind: "model",
      sensitivity: "public",
    } as const;
    await expect(
      mutate(
        study,
        [
          { collection: "actors", record: model },
          {
            collection: "assertions",
            record: {
              ...study.assertions[0],
              id: "assertion-model",
              actorId: model.id,
              reviewState: "unreviewed",
            },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/MODEL_PROVENANCE/u);
  });

  it("requires a fresh attributed review after changing an accepted interpretation", async () => {
    const { study, corpus } = await fixture();
    const record = { ...study.assertions[0], text: "A changed interpretation" };
    await expect(
      mutate(study, [{ collection: "assertions", record }], corpus),
    ).rejects.toThrow(/REVIEW_REQUIRED/u);
    await expect(
      reviseResearchStudy(
        study,
        {
          updatedAt: study.updatedAt,
          actorId: actor.id,
          records: [{ collection: "assertions", record }],
        },
        corpus,
      ),
    ).rejects.toThrow(/REVIEW_REQUIRED/u);
    const reviewed = await mutate(
      study,
      [
        { collection: "assertions", record },
        {
          collection: "reviews",
          record: {
            id: "review-fresh",
            actorId: actor.id,
            createdAt: updateTime,
            provenance: "analyst_authored",
            sensitivity: "restricted",
            targetId: record.id,
            decision: "accepted",
            notes: "New local review.",
          },
        },
      ],
      corpus,
    );
    expect(reviewed.assertions[0].text).toBe(record.text);
  });

  it("rejects a rehashed history that substitutes original evidence or historical authorship", async () => {
    const { study, corpus } = await fixture();
    const historical = await readResearchStudyRevision(study, 2);
    expect(() =>
      studyActiveDeadlines(historical, "proceeding-roadless"),
    ).toThrow(/VALIDATED_STUDY_REQUIRED/u);
    const original = historical.passages[0];
    const forged = {
      ...original,
      citation: {
        ...original.citation,
        sourceIdentifier: "Invented old source identity",
      },
    };
    const { contentDigest: oldDigest, ...oldBody } = {
      ...historical,
      passages: historical.passages.map((passage) =>
        passage.id === original.id ? forged : passage,
      ),
    };
    void oldDigest;
    const fakeDigest = canonicalV2Digest(oldBody);
    const revisions = study.revisions.map((entry) =>
      entry.revision !== 2
        ? entry
        : {
            ...entry,
            contentDigest: fakeDigest,
            changes: entry.changes.map((change) =>
              change.id === original.id
                ? { ...change, record: forged }
                : change,
            ),
          },
    );
    const { contentDigest: currentDigest, ...currentBody } = {
      ...study,
      revisions,
      previousDigest: fakeDigest,
    };
    void currentDigest;
    const envelope = {
      ...currentBody,
      contentDigest: canonicalV2Digest(currentBody),
    };
    await expect(
      parseResearchStudy(JSON.stringify(envelope), corpus),
    ).rejects.toThrow(/HISTORY_IMMUTABLE_EVIDENCE/u);
    await expect(
      rebindResearchStudy(
        envelope,
        corpusFixture({ generatedAt: "2026-10-08T00:30:00Z" }),
        { updatedAt: updateTime, actorId: actor.id },
      ),
    ).rejects.toThrow(/HISTORY_IMMUTABLE_EVIDENCE/u);
  });

  it("retains all six consultation events and never turns organization activity into Nation participation", async () => {
    const { study, corpus, ids } = await fixture();
    expect(new Set(study.consultations.map((event) => event.type))).toEqual(
      new Set([
        "notice",
        "invitation",
        "meeting_held",
        "submission",
        "response",
        "outcome",
      ]),
    );
    const invitation = study.consultations.find(
      (event) => event.type === "invitation",
    )!;
    expect(invitation.participants[0].scope).toBe("intertribal");
    expect(
      study.consultations.filter((event) =>
        event.participants.some(
          (participant) => participant.scope === "tribal_nation",
        ),
      ),
    ).toHaveLength(1);
    const participant = {
      ...invitation.participants[0],
      actorId: ids.nation,
      scope: "tribal_nation" as const,
      sourceName: "Example Nation",
    };
    await expect(
      mutate(
        study,
        [
          {
            collection: "consultations",
            record: {
              ...invitation,
              id: "consultation-inferred",
              reviewState: "unreviewed",
              participants: [participant],
            },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/PARTICIPANT_NAME|SOURCE_STATEMENT_REPLAY/u);
    const meeting = study.consultations.find(
      (event) => event.type === "meeting_held",
    )!;
    const passage = study.passages.find(
      (item) => item.id === meeting.passageIds[0],
    )!;
    await expect(
      mutate(
        study,
        [
          {
            collection: "passages",
            record: { ...passage, reviewState: "unreviewed" },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/NATION_EVIDENCE_REVIEW/u);
  });

  it("replays every environmental value and authority subject against the exact source statement", async () => {
    const { study, corpus } = await fixture();
    const metric = study.environmentalEvidence[0];
    expect([
      metric.alternativeId,
      metric.baselineYear,
      metric.value,
      metric.unit,
      metric.spatialScale,
      metric.uncertainty,
    ]).toEqual([
      "Alternative A",
      2020,
      "2.5",
      "ha",
      "Cascades watershed",
      "±0.5 ha",
    ]);
    for (const patch of [
      { value: "12.5" },
      { value: "2.50" },
      { baselineYear: 2021 },
      { unit: "acres" },
      { sourceStatement: "Invented habitat loss 2.5 ha" },
    ]) {
      await expect(
        mutate(
          study,
          [
            {
              collection: "environmentalEvidence",
              record: {
                ...metric,
                ...patch,
                id: "environment-false",
                reviewState: "unreviewed",
              },
            },
          ],
          corpus,
        ),
      ).rejects.toThrow(/ENVIRONMENTAL_VALUE_REPLAY|SOURCE_STATEMENT_REPLAY/u);
    }
    const relation = study.authorityRelationships[0];
    await expect(
      mutate(
        study,
        [
          {
            collection: "authorityRelationships",
            record: {
              ...relation,
              id: "authority-false",
              reviewState: "unreviewed",
              subjectLabel: "Nearby watershed",
            },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/AUTHORITY_SUBJECT/u);
    await expect(
      mutate(
        study,
        [
          {
            collection: "authorityRelationships",
            record: {
              ...relation,
              id: "authority-inferred",
              reviewState: "unreviewed",
              provenance: "model_interpretation",
            },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/AUTHORITY_PROVENANCE/u);
  });

  it("preserves historical deadlines and exposes ambiguous independent deadlines without choosing the latest", async () => {
    const { study, corpus, ids } = await fixture();
    const active = studyActiveDeadlines(study, ids.proceeding);
    expect(active[0].state).toBe("active");
    expect(active[0].candidates.map((deadline) => deadline.id)).toEqual([
      "deadline-extension",
    ]);
    expect(
      study.deadlines.find((deadline) => deadline.id === "deadline-original")
        ?.date.value,
    ).toBe("2026-10-20");
    const original = study.deadlines.find(
      (deadline) => deadline.id === "deadline-original",
    )!;
    const extra = {
      ...original,
      id: "deadline-independent",
      reviewState: "unreviewed" as const,
    };
    const ambiguous = await mutate(
      study,
      [{ collection: "deadlines", record: extra }],
      corpus,
    );
    expect(studyActiveDeadlines(ambiguous, ids.proceeding)[0].state).toBe(
      "ambiguous",
    );
    await expect(
      mutate(
        study,
        [
          {
            collection: "deadlines",
            record: {
              ...extra,
              id: "deadline-branch",
              replacesDeadlineId: original.id,
            },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/DEADLINE_BRANCH/u);
    await expect(
      mutate(
        study,
        [
          {
            collection: "deadlines",
            record: {
              ...extra,
              id: "deadline-cycle",
              replacesDeadlineId: "deadline-cycle",
            },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/DEADLINE_CYCLE/u);
    await expect(
      mutate(
        study,
        [
          {
            collection: "deadlines",
            record: {
              ...extra,
              date: { value: "2027-01-01", precision: "day" },
            },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/SOURCE_DATE_NORMALIZATION/u);
    await expect(
      mutate(
        study,
        [{ collection: "deadlines", record: { ...extra, timeZone: "UTC" } }],
        corpus,
      ),
    ).rejects.toThrow(/DEADLINE_QUALIFICATION_REPLAY/u);
    await expect(
      mutate(
        study,
        [
          {
            collection: "deadlines",
            record: {
              ...original,
              date: { value: "2027-01-01", precision: "day" },
              reviewState: "unreviewed",
            },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/IMMUTABLE_EVIDENCE/u);
    const extension = study.deadlines.find(
      (deadline) => deadline.id === "deadline-extension",
    )!;
    const pending = await mutate(
      study,
      [
        {
          collection: "deadlines",
          record: { ...extension, reviewState: "unreviewed" },
        },
      ],
      corpus,
    );
    expect(studyActiveDeadlines(pending, ids.proceeding)[0].state).toBe(
      "review_required",
    );
    expect(
      studyActiveDeadlines(pending, ids.proceeding)[0].candidates.map(
        (deadline) => deadline.id,
      ),
    ).toEqual(["deadline-original", "deadline-extension"]);
    const action = study.actions.find(
      (item) => item.id === extension.actionId,
    )!;
    const actionPending = await mutate(
      study,
      [
        {
          collection: "actions",
          record: { ...action, reviewState: "unreviewed" },
        },
      ],
      corpus,
    );
    expect(studyActiveDeadlines(actionPending, ids.proceeding)[0].state).toBe(
      "review_required",
    );
  });

  it("keeps local authored sensitivity independent of public evidence and exposes reference closure", async () => {
    const corpus = corpusFixture();
    const { study, passage } = await passageOnly(corpus);
    expect(study.sensitivity).toBe("restricted");
    expect(passage.sensitivity).toBe("public");
    const full = await fixture();
    const privateQuestion = {
      ...full.study.questions[0],
      sensitivity: "restricted" as const,
      reviewState: "unreviewed" as const,
    };
    const changed = await mutate(
      full.study,
      [{ collection: "questions", record: privateQuestion }],
      full.corpus,
    );
    expect(changed.assertions[0].sensitivity).toBe("public");
    expect(
      studyRecordReferences("assertions", changed.assertions[0]),
    ).toContain(privateQuestion.id);
    expect(
      studyRecordReferences(
        "consultations",
        changed.consultations.find((event) => event.type === "meeting_held")!,
      ),
    ).toContain(full.ids.nation);
    expect(await serializeResearchStudy(changed, full.corpus)).toContain(
      privateQuestion.text,
    );
  });

  it("enforces source display/export policies including bounded excerpts", async () => {
    for (const uses of [
      { localDisplay: "metadata_link", localExport: "metadata_link" },
      { localDisplay: "full_text", localExport: "prohibited" },
    ] as const) {
      const corpus = corpusFixture({ uses });
      const { passage } = await passageOnly(corpus);
      expect(
        (await studyReadPassage(passage, corpus, { purpose: "export" })).reason,
      ).toBe("source_export_policy");
      if (uses.localDisplay === "metadata_link")
        expect((await studyReadPassage(passage, corpus)).reason).toBe(
          "source_display_policy",
        );
      else
        expect((await studyReadPassage(passage, corpus)).text).not.toBeNull();
    }
    const boundedCorpus = corpusFixture({
      uses: { localDisplay: "excerpt", localExport: "excerpt" },
    });
    expect(
      (
        await studyReadPassage(
          (await passageOnly(boundedCorpus)).passage,
          boundedCorpus,
        )
      ).text,
    ).not.toBeNull();
    const largeCorpus = corpusFixture({
      uses: { localDisplay: "excerpt", localExport: "excerpt" },
      extraText: "x".repeat(1500),
    });
    const { passage } = await passageOnly(largeCorpus);
    expect(await studyReadPassage(passage, largeCorpus)).toEqual({
      text: null,
      reason: "excerpt_selection_required",
    });
    expect(
      await studyReadPassage(passage, largeCorpus, { purpose: "export" }),
    ).toEqual({ text: null, reason: "excerpt_selection_required" });
  });

  it("requires explicit verified import rebind and preserves missing evidence identity as review required", async () => {
    const { study, corpus, passages, ids } = await fixture();
    const replacement = corpusFixture({
      documentKeys: ["regional", "extension", "copy"],
      generatedAt: "2026-10-08T00:30:00Z",
    });
    const json = await serializeResearchStudy(study, corpus);
    await expect(parseResearchStudy(json, replacement)).rejects.toThrow(
      /CORPUS_BINDING/u,
    );
    const rebound = await rebindResearchStudy(
      JSON.parse(json) as ResearchStudy,
      replacement,
      { updatedAt: updateTime, actorId: ids.analyst },
    );
    const missing = rebound.passages.find(
      (passage) => passage.id === passages.parent.id,
    )!;
    expect(missing.bindingStatus).toBe("review_required");
    expect(missing.bindingIssue).toBe("source_segment_missing");
    expect(missing.citation).toEqual(passages.parent.citation);
    expect(rebound.assertions[0].reviewState).toBe("unreviewed");
    expect(studyActiveDeadlines(rebound, ids.proceeding)[0].state).toBe(
      "review_required",
    );
    expect(await studyReadPassage(missing, replacement)).toEqual({
      text: null,
      reason: "review_required",
    });
    expect(
      await parseResearchStudy(
        await serializeResearchStudy(rebound, replacement),
        replacement,
      ),
    ).toEqual(rebound);
    expect(
      (await readResearchStudyRevision(rebound, study.revision)).contentDigest,
    ).toBe(study.contentDigest);
    await expect(
      rebindResearchStudy({ ...study, title: "Forged import" }, replacement, {
        updatedAt: updateTime,
        actorId: ids.analyst,
      }),
    ).rejects.toThrow(/STUDY_DIGEST/u);
  });

  it("persists exact discovery filters and preserves unrecorded legacy scope without adding fields", async () => {
    const { study, corpus } = await fixture();
    const discovery = study.discoveries.find(
      (item) => item.followUpGapId === null,
    )!;
    for (const basis of [
      "source_available",
      "corpus_observed",
      "source_effective",
    ] as const) {
      const searchScope = {
        matchMode: "all_terms" as const,
        temporal: {
          asOf:
            basis === "corpus_observed"
              ? "2026-10-07T12:34:56.789Z"
              : "2026-10-07",
          basis,
        },
        governmentContext: "Source-stated synthetic federal context",
        instrumentClass: "proposed_rule" as const,
      };
      const scoped = await mutate(
        study,
        [
          {
            collection: "discoveries",
            record: { ...discovery, searchScope, reviewState: "unreviewed" },
          },
        ],
        corpus,
      );
      const reopened = await parseResearchStudy(
        await serializeResearchStudy(scoped, corpus),
        corpus,
      );
      expect(
        reopened.discoveries.find((item) => item.id === discovery.id)!
          .searchScope,
      ).toEqual(searchScope);
      expect(
        Object.isFrozen(
          reopened.discoveries.find((item) => item.id === discovery.id)!
            .searchScope,
        ),
      ).toBe(true);
      expect(
        (await readResearchStudyRevision(scoped, study.revision)).discoveries,
      ).toEqual(study.discoveries);
    }
    const legacyDiscovery = {
      ...discovery,
      reviewState: "unreviewed" as const,
    };
    delete legacyDiscovery.searchScope;
    const initial = await readResearchStudyRevision(study, 1);
    const legacy = await mutate(
      initial,
      [
        {
          collection: "questions",
          record: { ...study.questions[0], reviewState: "unreviewed" },
        },
        { collection: "discoveries", record: legacyDiscovery },
      ],
      corpus,
    );
    const bytes = await serializeResearchStudy(legacy, corpus);
    const reopened = await parseResearchStudy(bytes, corpus);
    expect(Object.hasOwn(reopened.discoveries[0], "searchScope")).toBe(false);
    expect(await serializeResearchStudy(reopened, corpus)).toBe(bytes);
  });

  it("resumes a 2.1 study with exact jurisdiction source evidence and a saved identifier filter", async () => {
    const { corpus, study, passages } =
      (await createSyntheticResearchStudyFixture({
        schemaVersion: "2.1.0",
      })) as Omit<Fixture, "corpus"> & { corpus: AnalyzedCorpusV21 };
    const discovery = study.discoveries.find(
      (row) => row.followUpGapId === null,
    )!;
    const scoped = await mutate(
      study,
      [
        {
          collection: "discoveries",
          record: {
            ...discovery,
            reviewState: "unreviewed",
            searchScope: {
              ...discovery.searchScope!,
              jurisdictionRef: "us-state:WA",
            },
          },
        },
      ],
      corpus,
    );
    const reopened = await parseResearchStudy(
      await serializeResearchStudy(scoped, corpus),
      corpus,
    );
    expect(
      reopened.discoveries.find((row) => row.id === discovery.id)!.searchScope!
        .jurisdictionRef,
    ).toBe("us-state:WA");
    const association = corpus.works.find((row) => row.id === "work-regional")!
      .jurisdictionRefs[0];
    expect((await studyReadPassage(passages.regional, corpus)).text).toContain(
      association.evidence.exactSubject!.text,
    );
    expect(passages.regional.citation.workDigest).toBe(
      corpus.works.find((row) => row.id === "work-regional")!.contentDigest,
    );
    await expect(
      mutate(
        study,
        [
          {
            collection: "discoveries",
            record: {
              ...discovery,
              reviewState: "unreviewed",
              searchScope: {
                ...discovery.searchScope!,
                jurisdictionRef: "us-state:ZZ",
              },
            },
          },
        ],
        corpus,
      ),
    ).rejects.toThrow(/DISCOVERY_JURISDICTION_STATE/u);
    const forged = clone(corpus);
    const work = forged.works.find((row) => row.id === "work-regional")!;
    (work.jurisdictionRefs[0].evidence.exactSubject as { text: string }).text =
      "Invented Washington jurisdiction source statement";
    const { contentDigest: oldWorkDigest, ...workBody } = work;
    void oldWorkDigest;
    (work as { contentDigest: string }).contentDigest =
      canonicalV2Digest(workBody);
    const { contentDigest: oldCorpusDigest, ...corpusBody } = forged;
    void oldCorpusDigest;
    (forged as { contentDigest: string }).contentDigest =
      canonicalV2Digest(corpusBody);
    await expect(
      createResearchStudy(
        {
          id: "study-forged",
          title: "Rejected forged association",
          createdAt: updateTime,
          actor,
        },
        forged,
      ),
    ).rejects.toThrow(/CORPUS_JURISDICTION_REPLAY/u);
  });

  it("rejects rehashed state bindings to another state or ambiguous text in the exact source passage", async () => {
    const cases = [
      ["us-state:WA", "The synthetic scope includes California."],
      ["us-state:VA", "The synthetic scope includes West Virginia."],
      ["us-state:WA", "The synthetic meeting took place in Washington, D.C."],
      ["us-state:OR", "Choose one OR another synthetic alternative."],
      ["us-state:WA", "The synthetic source says us-state:WA-extra."],
    ];
    const corpus = createSyntheticStudyCorpus({
      schemaVersion: "2.1.0",
      extraText: cases.map(([, statement]) => statement).join("\n"),
    }) as AnalyzedCorpusV21;
    const regional = corpus.works.find((row) => row.id === "work-regional")!;
    cases.push([
      "us-state:WA",
      regional.jurisdictionRefs.find(
        (row) => row.jurisdictionRef === "us-state:CA",
      )!.evidence.exactSubject!.text,
    ]);
    for (const [ref, statement] of cases) {
      const forged = clone(corpus);
      const work = forged.works.find((row) => row.id === "work-regional")!;
      const association = work.jurisdictionRefs[0] as {
        jurisdictionRef: string;
        evidence: { exactSubject: { ref: string; text: string } };
        segmentIds: readonly string[];
      };
      const segment = forged.segments.find(
        (row) => row.id === association.segmentIds[0],
      )!;
      expect(
        forged.renditions.find((row) => row.id === segment.renditionId)!.text,
      ).toContain(statement);
      association.jurisdictionRef = association.evidence.exactSubject.ref = ref;
      association.evidence.exactSubject.text = statement;
      const { contentDigest: oldWorkDigest, ...workBody } = work;
      void oldWorkDigest;
      (work as { contentDigest: string }).contentDigest =
        canonicalV2Digest(workBody);
      const { contentDigest: oldCorpusDigest, ...corpusBody } = forged;
      void oldCorpusDigest;
      (forged as { contentDigest: string }).contentDigest =
        canonicalV2Digest(corpusBody);
      await expect(
        createResearchStudy(
          {
            id: "study-state-identity",
            title: "Rejected mismatched state identity",
            createdAt: updateTime,
            actor,
          },
          forged,
        ),
      ).rejects.toThrow(/CORPUS_JURISDICTION_STATE_IDENTITY/u);
    }
  });

  it("rejects missing, malformed and invented discovery filter fields", async () => {
    const { study, corpus } = await fixture();
    const discovery = study.discoveries[0];
    const unbounded = {
      temporal: null,
      governmentContext: null,
      instrumentClass: null,
    };
    for (const searchScope of [
      {},
      { ...unbounded, temporal: { asOf: "2026-10-07" } },
      { ...unbounded, temporal: { asOf: "2026-10-07", basis: "latest" } },
      {
        ...unbounded,
        temporal: { asOf: "2026-02-30", basis: "source_available" },
      },
      {
        ...unbounded,
        temporal: { asOf: "2026-02-30T00:00:00Z", basis: "source_available" },
      },
      {
        ...unbounded,
        temporal: {
          asOf: "2026-10-07T00:00:00+01:00",
          basis: "source_available",
        },
      },
      {
        ...unbounded,
        temporal: {
          asOf: "2026-10-07",
          basis: "source_available",
          currentLaw: true,
        },
      },
      { ...unbounded, governmentContext: "" },
      { ...unbounded, instrumentClass: "inferred_rule" },
      { ...unbounded, matchMode: "unknown" },
      { ...unbounded, jurisdiction: "inferred" },
    ]) {
      await expect(
        mutate(
          study,
          [
            {
              collection: "discoveries",
              record: { ...discovery, searchScope: searchScope as never },
            },
          ],
          corpus,
        ),
      ).rejects.toThrow(/SHAPE|DATE/u);
    }
  });

  it("resumes a source-discovery candidate before passage capture when its saved version is absent", async () => {
    const { study, corpus } = await fixture();
    const initial = await readResearchStudyRevision(study, 1);
    const question = {
      ...study.questions[0],
      reviewState: "unreviewed" as const,
    };
    const discovery = {
      ...study.discoveries.find((item) => item.followUpGapId === null)!,
      reviewState: "unreviewed" as const,
    };
    const candidate = {
      ...study.candidates[0],
      reviewState: "unreviewed" as const,
    };
    const partial = await mutate(
      initial,
      [
        { collection: "questions", record: question },
        { collection: "discoveries", record: discovery },
        { collection: "candidates", record: candidate },
      ],
      corpus,
    );
    const replacement = corpusFixture({
      documentKeys: ["parent", "extension", "copy"],
    });
    const rebound = await rebindResearchStudy(partial, replacement, {
      updatedAt: "2026-10-08T03:00:00Z",
      actorId: actor.id,
    });
    expect(rebound.candidates[0].versionId).toBeNull();
    expect(rebound.candidates[0].url).toBe(candidate.url);
    expect(rebound.candidates[0].reason).toContain(candidate.versionId);
    expect(
      (await readResearchStudyRevision(rebound, partial.revision)).candidates[0]
        .versionId,
    ).toBe(candidate.versionId);
  });
});
