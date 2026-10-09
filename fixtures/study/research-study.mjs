import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  canonicalV2Digest,
  createAnalyzedCorpusV2,
  createEvidenceSegment,
} from "../../src/pipeline/analyzed-corpus-v2.mjs";
import {
  captureStudyPassage,
  createResearchStudy,
  reviseResearchStudy,
} from "../../src/core/research-study.mjs";

const capturedAt = "2026-10-07T00:00:00Z";
const createdAt = "2026-10-08T01:00:00Z";
const recordedAt = "2026-10-08T01:01:00Z";
const reviewedAt = "2026-10-08T01:02:00Z";
const day = (value) => ({ value, precision: "day" });
const titles = {
  parent: "Synthetic Roadless Rule",
  regional: "Synthetic Cascades Review",
  extension: "Synthetic Comment Extension",
  copy: "Synthetic Roadless Rule Copy",
};
const identifiers = {
  parent: "SYN-ROADLESS-2026",
  regional: "SYN-REGIONAL-2026",
  extension: "SYN-EXTENSION-2026",
  copy: "SYN-COPY-2026",
};
const statements = {
  proceeding: "Docket SYN-2026-001; RIN 0000-AA00.",
  proposed: "Synthetic Roadless Rule is proposed on 2026-10-01.",
  deadline: "Comments close 2026-10-20 Pacific Time; received by midnight.",
  extension: "The comment deadline extension was issued on 2026-10-05.",
  extendedDeadline:
    "Comments extended to 2026-11-20 Pacific Time; received by midnight.",
  notice: "Synthetic Agency issued a consultation notice on 2026-10-01.",
  invitation: "Synthetic Council was invited to consultation on 2026-10-02.",
  meeting_held:
    "Example Nation attended the consultation meeting held on 2026-10-03.",
  submission:
    "Synthetic Council submitted consultation comments on 2026-10-04.",
  response:
    "Synthetic Agency responded to the consultation submission on 2026-10-05.",
  outcome: "Synthetic Agency published a consultation outcome on 2026-10-06.",
  environment:
    "Alternative A; baseline 2020; habitat loss 2.5 ha; spatial scale Cascades watershed; uncertainty ±0.5 ha; modeled estimate.",
  authority:
    "Synthetic Cascades Review depends procedurally on SYN-ROADLESS-2026.",
  origin: "This record republishes SYN-ROADLESS-2026 from Synthetic Agency.",
};
function documentText(key) {
  const body =
    key === "parent"
      ? [
          statements.proceeding,
          statements.proposed,
          statements.deadline,
          ...[
            "notice",
            "invitation",
            "meeting_held",
            "submission",
            "response",
            "outcome",
          ].map((type) => statements[type]),
        ]
      : key === "regional"
        ? [statements.environment, statements.authority]
        : key === "extension"
          ? [
              statements.proceeding,
              statements.extension,
              statements.extendedDeadline,
            ]
          : [statements.origin];
  return (
    [
      titles[key],
      identifiers[key] + "; Edition 2026; Published.",
      "Published 2026-10-01.",
      ...body,
    ].join("\n") + "\n"
  );
}

/** Authored synthetic material only; no acquired documents or real Nation claims. */
export function createSyntheticStudyCorpus(options = {}) {
  const keys = options.documentKeys ?? [
    "parent",
    "regional",
    "extension",
    "copy",
  ];
  const profiles = ["agency", "council"].map((key) => ({
    id: "profile-" + key,
    sourceId: "source-" + key,
    interfaceId: "interface-" + key,
    operator: key === "agency" ? "Synthetic Agency" : "Synthetic Council",
    publisher: key === "agency" ? "Synthetic Agency" : "Synthetic Council",
    authorityLabel: "Authored synthetic source; no legal authority",
    hosts: [key + ".invalid"],
    pathPrefixes: ["/policy/"],
    review: {
      reviewer: "Synthetic reviewer",
      reviewedAt: "2026-10-01T00:00:00Z",
      expiresAt: "2026-12-01T00:00:00Z",
      evidenceUrls: ["https://" + key + ".invalid/policy/terms"],
    },
    uses: {
      capture: true,
      analysis: true,
      localDisplay: "full_text",
      localExport: "full_text",
      excerpts: true,
      publicRedistribution: "prohibited",
      ...options.uses,
    },
  }));
  const input = {
    id: "synthetic-study-corpus",
    runId: "synthetic-study-run",
    trustDomain: "synthetic_test_only",
    generatedAt: options.generatedAt ?? "2026-10-08T00:00:00Z",
    sourceProfiles: profiles,
    captures: [],
    works: [],
    versions: [],
    renditions: [],
    segments: [],
    events: [],
    relationships: [],
    analyses: [],
    findings: [],
    coverage: [],
  };
  const deterministic = [
    "/instrumentClass",
    "/governmentContext",
    "/issuerRoles/0/role",
    "/issuerRoles/0/label",
  ];
  for (const key of keys) {
    const profile = profiles[key === "copy" ? 1 : 0];
    const text = documentText(key) + (options.extraText ?? "");
    const bytes = Buffer.from(text, "utf8");
    const digest = createHash("sha256").update(bytes).digest("hex");
    const segment = createEvidenceSegment({
      renditionId: "rendition-" + key,
      renditionDigest: digest,
      renditionBytes: bytes,
      startByte: 0,
      endByte: bytes.length,
      locator: {
        type: "structural_path",
        value: "/policy/section-1",
        headingPath: [titles[key]],
        printedPageLabel: null,
        physicalPageIndex: null,
      },
    });
    const provenance = (fields) =>
      fields.map((field) => ({
        field,
        mode: deterministic.includes(field)
          ? "deterministic"
          : "source_attested",
        captureId: "capture-" + key,
        sourceLocator: "document/paragraphs",
        segmentIds: [segment.id],
        ruleId: deterministic.includes(field)
          ? "synthetic-source-profile-mapping-v1"
          : null,
      }));
    input.captures.push({
      id: "capture-" + key,
      sourceProfileId: profile.id,
      sourceProfileDigest: canonicalV2Digest(profile),
      operationId: "operation-" + key,
      requestedUrl: "https://" + profile.hosts[0] + "/policy/" + key,
      finalUrl: "https://" + profile.hosts[0] + "/policy/" + key,
      retrievedAt: capturedAt,
      mediaType: "text/plain",
      encodedBytes: bytes.length,
      decodedBytes: bytes.length,
      objectDigest: digest,
      objectPath:
        "objects/sha256/" +
        digest.slice(0, 2) +
        "/" +
        digest.slice(2, 4) +
        "/" +
        digest,
    });
    input.works.push({
      id: "work-" + key,
      sourceProfileId: profile.id,
      sourceIdentifier: identifiers[key],
      title: titles[key],
      instrumentClass: key === "parent" ? "regulation" : "agency_policy",
      governmentContext: "Synthetic general jurisdiction",
      issuerRoles: [{ role: "issuer", label: profile.publisher }],
      relevance: "general_jurisdiction",
      taxonomy: "Unclassified",
      fieldProvenance: provenance([
        "/sourceIdentifier",
        "/title",
        ...deterministic,
      ]),
    });
    input.versions.push({
      id: "version-" + key,
      workId: "work-" + key,
      sourceVersionIdentifier: "Edition 2026",
      sourceStatusLabel: "Published",
      dates: {
        publication: day("2026-10-01"),
        sourceVersion: day("2026-10-01"),
      },
      observedAt: capturedAt,
      renditionIds: ["rendition-" + key],
      fieldProvenance: provenance([
        "/sourceVersionIdentifier",
        "/sourceStatusLabel",
        "/dates/publication/value",
        "/dates/sourceVersion/value",
      ]),
    });
    input.renditions.push({
      id: "rendition-" + key,
      versionId: "version-" + key,
      captureId: "capture-" + key,
      parser: {
        id: "synthetic-utf8-lf",
        version: "1.0.0",
        configDigest: canonicalV2Digest({
          encoding: "utf8",
          lineEndings: "LF",
        }),
      },
      mediaType: "text/plain",
      outputDigest: digest,
      byteLength: bytes.length,
      text,
      authorityLabel: profile.authorityLabel,
      warnings: [],
      omittedSourceLocators: [],
    });
    input.segments.push(segment);
  }
  input.coverage = profiles.map((profile) => {
    const count = input.works.filter(
      (work) => work.sourceProfileId === profile.id,
    ).length;
    return {
      id: "coverage-" + profile.sourceId,
      sourceProfileId: profile.id,
      status: count ? "healthy" : "unavailable",
      documentCount: count,
      versionCount: count,
      from: count ? day("2026-10-01") : { value: null, precision: "unknown" },
      through: count
        ? day("2026-10-01")
        : { value: null, precision: "unknown" },
      dataAsOf: count ? capturedAt : null,
      lastSuccessfulAt: count ? capturedAt : null,
      failureStage: count ? null : "synthetic_source_absent",
      lastKnownGoodDigest: null,
      limitations: ["Authored synthetic test population only."],
      exclusions: [],
    };
  });
  return createAnalyzedCorpusV2(input);
}

export async function createSyntheticResearchStudyFixture(options = {}) {
  const corpus = createSyntheticStudyCorpus(options);
  const ids = {
    study: "study-roadless",
    question: "question-roadless",
    proceeding: "proceeding-roadless",
    parentVersion: "version-parent",
    regionalVersion: "version-regional",
    extensionVersion: "version-extension",
    copyVersion: "version-copy",
    analyst: "analyst",
    agency: "agency",
    organization: "organization",
    nation: "nation",
  };
  const analyst = {
    id: ids.analyst,
    label: "Synthetic Analyst",
    kind: "analyst",
    sensitivity: "public",
  };
  let study = await createResearchStudy(
    {
      id: ids.study,
      title: "Synthetic roadless research",
      createdAt,
      actor: analyst,
      sensitivity: "public",
    },
    corpus,
  );
  const base = (id, provenance = "extracted_evidence") => ({
    id,
    actorId: ids.analyst,
    createdAt: recordedAt,
    provenance,
    reviewState: "unreviewed",
    sensitivity: "public",
  });
  const passages = {};
  for (const key of ["parent", "regional", "extension", "copy"]) {
    passages[key] = await captureStudyPassage(
      {
        id: "passage-" + key,
        segmentId: corpus.segments.find(
          (segment) => segment.renditionId === "rendition-" + key,
        ).id,
        actorId: ids.analyst,
        createdAt: recordedAt,
        sensitivity: "public",
      },
      corpus,
    );
  }
  const records = [
    ...[
      {
        id: ids.agency,
        label: "Synthetic Agency",
        kind: "agency",
        sensitivity: "public",
      },
      {
        id: ids.organization,
        label: "Synthetic Council",
        kind: "organization",
        sensitivity: "public",
      },
      {
        id: ids.nation,
        label: "Example Nation",
        kind: "tribal_nation",
        sensitivity: "public",
      },
    ].map((record) => ({ collection: "actors", record })),
    {
      collection: "questions",
      record: {
        ...base(ids.question, "analyst_authored"),
        parentQuestionId: null,
        text: "How does the roadless proceeding address the Cascades review?",
        theme: "Roadless",
        status: "open",
        discoveryGeographies: ["Cascades"],
      },
    },
    {
      collection: "discoveries",
      record: {
        ...base("discovery-roadless", "analyst_authored"),
        questionId: ids.question,
        query: "roadless Cascades",
        sourceIds: ["source-agency"],
        searchScope: {
          temporal: { asOf: "2026-10-07", basis: "corpus_observed" },
          governmentContext: null,
          instrumentClass: null,
        },
        followUpGapId: null,
        status: "completed",
      },
    },
    {
      collection: "discoveries",
      record: {
        ...base("discovery-follow-up", "analyst_authored"),
        questionId: ids.question,
        query: "roadless consultation outcome",
        sourceIds: ["source-agency"],
        searchScope: {
          temporal: null,
          governmentContext: null,
          instrumentClass: null,
        },
        followUpGapId: "gap-outcome",
        status: "planned",
      },
    },
    ...Object.values(passages).map((record) => ({
      collection: "passages",
      record,
    })),
    {
      collection: "candidates",
      record: {
        ...base("candidate-regional", "analyst_authored"),
        discoveryId: "discovery-roadless",
        url: "https://agency.invalid/policy/regional",
        title: titles.regional,
        sourceId: "source-agency",
        versionId: ids.regionalVersion,
        disposition: "retained",
        reason: "Direct regional evidence.",
      },
    },
    {
      collection: "assertions",
      record: {
        ...base("assertion-roadless", "analyst_authored"),
        questionId: ids.question,
        text: "The regional review is part of the documented roadless proceeding.",
        supportingPassageIds: [passages.parent.id, passages.regional.id],
        challengingPassageIds: [],
        supersedesAssertionId: null,
      },
    },
    {
      collection: "gaps",
      record: {
        ...base("gap-outcome", "analyst_authored"),
        questionId: ids.question,
        text: "Find the subsequent response to the regional alternatives.",
        status: "open",
        followUpDiscoveryId: "discovery-follow-up",
      },
    },
    {
      collection: "annotations",
      record: {
        ...base("annotation-regional", "analyst_authored"),
        targetId: passages.regional.id,
        text: "Retain the baseline year alongside the resource estimate.",
      },
    },
    {
      collection: "proceedings",
      record: {
        ...base(ids.proceeding),
        title: titles.parent,
        parentProceedingId: null,
        docketIds: ["SYN-2026-001"],
        rins: ["0000-AA00"],
        versionIds: [
          ids.parentVersion,
          ids.regionalVersion,
          ids.extensionVersion,
        ],
        sourceStatement: statements.proceeding,
        passageIds: [passages.parent.id],
      },
    },
    {
      collection: "actions",
      record: {
        ...base("action-proposed"),
        proceedingId: ids.proceeding,
        versionId: ids.parentVersion,
        type: "proposed_rule",
        date: day("2026-10-01"),
        sourceDateText: "2026-10-01",
        sourceStatement: statements.proposed,
        previousActionId: null,
        passageIds: [passages.parent.id],
      },
    },
    {
      collection: "actions",
      record: {
        ...base("action-extension"),
        proceedingId: ids.proceeding,
        versionId: ids.extensionVersion,
        type: "comment_deadline_extension",
        date: day("2026-10-05"),
        sourceDateText: "2026-10-05",
        sourceStatement: statements.extension,
        previousActionId: "action-proposed",
        passageIds: [passages.extension.id],
      },
    },
    {
      collection: "deadlines",
      record: {
        ...base("deadline-original"),
        actionId: "action-proposed",
        type: "comment",
        date: day("2026-10-20"),
        sourceDateText: "2026-10-20",
        timeZone: "Pacific Time",
        qualifications: "received by midnight",
        replacesDeadlineId: null,
        sourceStatement: statements.deadline,
        passageIds: [passages.parent.id],
      },
    },
    {
      collection: "deadlines",
      record: {
        ...base("deadline-extension"),
        actionId: "action-extension",
        type: "comment",
        date: day("2026-11-20"),
        sourceDateText: "2026-11-20",
        timeZone: "Pacific Time",
        qualifications: "received by midnight",
        replacesDeadlineId: "deadline-original",
        sourceStatement: statements.extendedDeadline,
        passageIds: [passages.extension.id],
      },
    },
    {
      collection: "environmentalEvidence",
      record: {
        ...base("environment-regional"),
        versionId: ids.regionalVersion,
        alternativeId: "Alternative A",
        baselineYear: 2020,
        metric: "habitat loss",
        value: "2.5",
        unit: "ha",
        spatialScale: "Cascades watershed",
        uncertainty: "±0.5 ha",
        qualifications: ["modeled estimate"],
        sourceStatement: statements.environment,
        passageIds: [passages.regional.id],
      },
    },
    {
      collection: "authorityRelationships",
      record: {
        ...base("authority-regional"),
        subject: { kind: "version", id: ids.regionalVersion },
        object: { kind: "version", id: ids.parentVersion },
        subjectLabel: titles.regional,
        objectLabel: identifiers.parent,
        type: "procedural_dependency",
        sourceStatement: statements.authority,
        passageIds: [passages.regional.id],
      },
    },
    {
      collection: "originGroups",
      record: {
        ...base("origin-roadless"),
        versionIds: [ids.parentVersion, ids.copyVersion],
        originVersionId: ids.parentVersion,
        basis: "documented_republication",
        sourceStatement: statements.origin,
        passageIds: [passages.copy.id],
      },
    },
  ];
  const eventTypes = [
    "notice",
    "invitation",
    "meeting_held",
    "submission",
    "response",
    "outcome",
  ];
  const roles = [
    "agency",
    "invited",
    "attended",
    "submitter",
    "respondent",
    "outcome_subject",
  ];
  const participants = [
    [ids.agency, "Synthetic Agency", "agency"],
    [ids.organization, "Synthetic Council", "intertribal"],
    [ids.nation, "Example Nation", "tribal_nation"],
    [ids.organization, "Synthetic Council", "intertribal"],
    [ids.agency, "Synthetic Agency", "agency"],
    [ids.agency, "Synthetic Agency", "agency"],
  ];
  eventTypes.forEach((type, index) =>
    records.push({
      collection: "consultations",
      record: {
        ...base("consultation-" + type),
        type,
        proceedingId: ids.proceeding,
        date: day("2026-10-0" + (index + 1)),
        sourceDateText: "2026-10-0" + (index + 1),
        sourceStatement: statements[type],
        relatedEventIds: index ? ["consultation-" + eventTypes[index - 1]] : [],
        respondsToEventId:
          type === "response"
            ? "consultation-submission"
            : type === "outcome"
              ? "consultation-response"
              : null,
        participants: [
          {
            actorId: participants[index][0],
            role: roles[index],
            scope: participants[index][2],
            sourceName: participants[index][1],
            sourceStatement: statements[type],
            passageIds: [passages.parent.id],
          },
        ],
        passageIds: [passages.parent.id],
      },
    }),
  );
  study = await reviseResearchStudy(
    study,
    { updatedAt: recordedAt, actorId: ids.analyst, records },
    corpus,
  );
  const reviewedRecords = records
    .filter((change) => change.collection !== "actors")
    .flatMap((change) => [
      {
        collection: change.collection,
        record: { ...change.record, reviewState: "accepted" },
      },
      {
        collection: "reviews",
        record: {
          id: "review-" + change.record.id,
          actorId: ids.analyst,
          createdAt: reviewedAt,
          provenance: "analyst_authored",
          sensitivity: "public",
          targetId: change.record.id,
          decision: "accepted",
          notes: "Reviewed against the authored synthetic fixture source.",
        },
      },
    ]);
  study = await reviseResearchStudy(
    study,
    { updatedAt: reviewedAt, actorId: ids.analyst, records: reviewedRecords },
    corpus,
  );
  return {
    corpus,
    study,
    ids,
    passages: Object.fromEntries(
      Object.keys(passages).map((key) => [
        key,
        study.passages.find((passage) => passage.id === passages[key].id),
      ]),
    ),
  };
}
