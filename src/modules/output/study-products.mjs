import {
  assertValidatedResearchStudy,
  serializeResearchStudy,
  studyReadPassage,
  studyRecordReferences,
} from "../../core/research-study.mjs";
import { resolveCorpusRelationships } from "../../engine/temporal-operations.mjs";

const collections = [
  "actors",
  "questions",
  "discoveries",
  "candidates",
  "passages",
  "assertions",
  "reviews",
  "gaps",
  "annotations",
  "proceedings",
  "actions",
  "deadlines",
  "consultations",
  "environmentalEvidence",
  "authorityRelationships",
  "originGroups",
];
const escape = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const cell = (value) => {
  let text =
    typeof value === "object" && value !== null
      ? JSON.stringify(value)
      : String(value ?? "");
  // Control-prefixed formulas must remain inert when opened in a spreadsheet.
  // eslint-disable-next-line no-control-regex
  if (/^[\s\u0000-\u001f]*[=+@-]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
const csv = (columns, rows) =>
  [
    columns.map(cell).join(","),
    ...rows.map((row) => columns.map((key) => cell(row[key])).join(",")),
  ].join("\r\n") + "\r\n";
const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const evidenceIds = (record) => [
  ...new Set([
    ...(record.passageIds ?? []),
    ...(record.supportingPassageIds ?? []),
    ...(record.challengingPassageIds ?? []),
    ...(record.participants ?? []).flatMap(
      (participant) => participant.passageIds,
    ),
  ]),
];

function audienceRecords(
  study,
  audience,
  readablePassageIds,
  candidateAllowed,
) {
  const records = Object.fromEntries(
    collections.map((key) => [key, [...study[key]]]),
  );
  if (audience === "local") {
    records.candidates = records.candidates.filter(candidateAllowed);
    records.passages = records.passages.filter(
      (row) => row.citation.uses.localExport !== "prohibited",
    );
  } else {
    for (const key of collections) {
      records[key] = records[key].filter(
        (row) =>
          row.sensitivity === "public" &&
          (key !== "passages" ||
            row.citation.uses.publicRedistribution !== "prohibited"),
      );
    }
    // Candidate titles and source IDs are source-derived even when an analyst marks the row public.
    records.candidates = [];
  }
  // Source permissions apply to extracted statements and their dependents too.
  for (const key of collections) {
    if (key !== "passages")
      records[key] = records[key].filter((row) =>
        evidenceIds(row).every((id) => readablePassageIds.has(id)),
      );
  }
  // Close over every authored/actor reference; a public label cannot disclose a restricted dependency.
  let removed;
  do {
    removed = false;
    const ids = new Set(
      collections.flatMap((key) => records[key].map((row) => row.id)),
    );
    for (const key of collections) {
      records[key] = records[key].filter((row) => {
        const keep = studyRecordReferences(key, row).every((id) => ids.has(id));
        if (!keep) removed = true;
        return keep;
      });
    }
  } while (removed);
  return records;
}

function originGroups(records) {
  const parent = new Map();
  const find = (id) => {
    if (!parent.has(id)) parent.set(id, id);
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root);
    return root;
  };
  for (const group of records.originGroups) {
    if (group.reviewState !== "accepted") continue;
    for (const versionId of group.versionIds) {
      const roots = [find(group.versionIds[0]), find(versionId)].sort();
      parent.set(roots[1], roots[0]);
    }
  }
  const digests = new Map();
  for (const passage of records.passages) {
    const { versionId, objectDigest } = passage.citation;
    const first = digests.get(objectDigest);
    if (first) {
      const roots = [find(first), find(versionId)].sort();
      parent.set(roots[1], roots[0]);
    } else digests.set(objectDigest, versionId);
  }
  return find;
}

function attributedGraph(study, records, evidence, audience) {
  const citations = new Map(evidence.map((row) => [row.id, row.citation]));
  const nodes = [];
  const edges = [];
  const key = (ref) => JSON.stringify([ref.kind, ref.id]);
  const addNode = (kind, row, label, passageIds = []) =>
    nodes.push({
      ref: { kind, id: row.id },
      label,
      actorId: row.actorId ?? null,
      createdAt: row.createdAt,
      provenance: row.provenance ?? "analyst_authored",
      reviewState: row.reviewState ?? "unreviewed",
      sensitivity: row.sensitivity,
      citations: passageIds.map((id) => citations.get(id)).filter(Boolean),
    });
  const studyPublic = audience === "local" || study.sensitivity === "public";
  if (studyPublic)
    addNode(
      "Study",
      {
        ...study,
        actorId: records.actors.some((actor) => actor.id === study.updatedBy)
          ? study.updatedBy
          : null,
      },
      study.title,
    );
  for (const row of records.questions) addNode("Question", row, row.text);
  for (const row of records.assertions)
    addNode("Assertion", row, row.text, evidenceIds(row));
  for (const row of records.consultations)
    addNode("ConsultationEvent", row, row.type, evidenceIds(row));
  for (const row of records.gaps) addNode("Gap", row, row.text);
  for (const versionId of new Set(
    evidence.map((row) => row.citation.versionId),
  )) {
    const sourceRows = evidence.filter(
      (row) => row.citation.versionId === versionId,
    );
    const source = sourceRows[0];
    addNode(
      "SourceDocument",
      {
        ...source,
        id: versionId,
        actorId: null,
        createdAt: source.citation.retrievedAt,
        sensitivity:
          audience === "public"
            ? "public"
            : records.passages.find((row) => row.id === source.id).sensitivity,
      },
      source.citation.sourceTitle,
      sourceRows.map((row) => row.id),
    );
  }
  const known = new Set(nodes.map((node) => key(node.ref)));
  const addEdge = (type, from, to, row, passageIds = []) => {
    if (!known.has(key(from)) || !known.has(key(to))) return;
    const id = JSON.stringify([
      type,
      from.kind,
      from.id,
      to.kind,
      to.id,
      row.id,
    ]);
    if (edges.some((edge) => edge.id === id)) return;
    edges.push({
      id,
      type,
      from,
      to,
      actorId: row.actorId,
      createdAt: row.createdAt,
      reviewState: row.reviewState,
      provenance: row.provenance,
      sensitivity: row.sensitivity,
      citations: passageIds
        .map((passageId) => citations.get(passageId))
        .filter(Boolean),
    });
  };
  const support = (kind, row, type, ids) => {
    for (const versionId of new Set(
      ids.map((id) => citations.get(id)?.versionId).filter(Boolean),
    )) {
      addEdge(
        type,
        { kind, id: row.id },
        { kind: "SourceDocument", id: versionId },
        row,
        ids.filter((id) => citations.get(id)?.versionId === versionId),
      );
    }
  };
  for (const row of records.assertions) {
    support("Assertion", row, "supportedBy", row.supportingPassageIds);
    support("Assertion", row, "challengedBy", row.challengingPassageIds);
    addEdge(
      "respondsTo",
      { kind: "Assertion", id: row.id },
      { kind: "Question", id: row.questionId },
      row,
    );
    if (row.supersedesAssertionId)
      addEdge(
        "supersededBy",
        { kind: "Assertion", id: row.supersedesAssertionId },
        { kind: "Assertion", id: row.id },
        row,
        evidenceIds(row),
      );
  }
  for (const row of records.consultations) {
    support("ConsultationEvent", row, "supportedBy", evidenceIds(row));
    if (row.respondsToEventId)
      addEdge(
        "respondsTo",
        { kind: "ConsultationEvent", id: row.id },
        { kind: "ConsultationEvent", id: row.respondsToEventId },
        row,
        evidenceIds(row),
      );
  }
  for (const row of records.gaps)
    addEdge(
      "respondsTo",
      { kind: "Gap", id: row.id },
      { kind: "Question", id: row.questionId },
      row,
    );
  return {
    $schema:
      "https://policy-sentinel.invalid/schemas/attributed-study-graph.schema.v1.json",
    schemaVersion: "1.0.0",
    kind: "attributed_study_graph",
    audience,
    studyId: studyPublic ? study.id : null,
    studyDigest: audience === "local" ? study.contentDigest : null,
    corpusDigest: audience === "local" ? study.corpusDigest : null,
    generatedAt: studyPublic ? study.updatedAt : null,
    actors: records.actors,
    nodes,
    edges,
  };
}

function htmlTable(caption, columns, rows) {
  return `<section><h2>${escape(caption)}</h2>${rows.length ? `<table><thead><tr>${columns.map((column) => `<th scope="col">${escape(column)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${escape(typeof row[column] === "object" ? JSON.stringify(row[column]) : row[column])}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "<p>No retained records in this export.</p>"}</section>`;
}

/** Export a validated snapshot. This function performs no filesystem, network or publication operation. */
export async function buildStudyProducts(
  study,
  corpus,
  { audience = "local" } = {},
) {
  if (!["local", "public"].includes(audience))
    throw new TypeError("Unknown study export audience");
  const checked = JSON.parse(await serializeResearchStudy(study, corpus));
  const candidateAllowed = (candidate) =>
    !corpus.sourceProfiles.some(
      (profile) =>
        profile.sourceId === candidate.sourceId &&
        profile.uses.localExport === "prohibited",
    );
  const passageContent = new Map(
    await Promise.all(
      checked.passages.map(async (passage) => [
        passage.id,
        await studyReadPassage(passage, corpus, { purpose: "export" }),
      ]),
    ),
  );
  const readablePassageIds = new Set(
    [...passageContent]
      .filter(([, value]) => value.text !== null)
      .map(([id]) => id),
  );
  const records = audienceRecords(
    checked,
    audience,
    readablePassageIds,
    candidateAllowed,
  );
  const origin = originGroups(records);
  const evidence = await Promise.all(
    records.passages.map(async (passage) => {
      const content = passageContent.get(passage.id);
      return {
        id: passage.id,
        actorId: passage.actorId,
        reviewState: passage.reviewState,
        provenance: "source_content",
        citation: passage.citation,
        ...content,
        originGroup: origin(passage.citation.versionId),
      };
    }),
  );
  const timeline = [
    ...records.actions,
    ...records.deadlines,
    ...records.consultations,
  ].sort(
    (a, b) =>
      (a.date.value ?? "9999").localeCompare(b.date.value ?? "9999") ||
      a.id.localeCompare(b.id),
  );
  const limitations = [
    "Evidence is limited to this retained corpus snapshot; absent records do not establish non-occurrence.",
    "Common-origin groups describe documented dependencies, not confidence or independent corroboration. Ungrouped publications are not automatically independent.",
    "Source statements, extracted evidence, model interpretations and analyst-authored records retain separate provenance and review states.",
    "Source export restrictions and unresolved passage bindings exclude dependent statements and revision history, even when their text was previously extracted.",
    ...(audience === "public"
      ? [
          "Restricted metadata, revision history, notes and dependent records are excluded. Source redistribution restrictions also remove passages and their dependent records.",
        ]
      : [
          "This local export contains independently classified analyst material. Local saving does not authorize sharing or publication.",
        ]),
  ];
  const studyPublic = audience === "local" || checked.sensitivity === "public";
  const graph = attributedGraph(checked, records, evidence, audience);
  const provenance = {
    schemaVersion: "1.0.0",
    audience,
    studyId: studyPublic ? checked.id : "public-study",
    studyDigest: audience === "local" ? checked.contentDigest : null,
    corpusDigest: audience === "local" ? checked.corpusDigest : null,
    evidence,
    records,
    history:
      audience === "local" &&
      checked.candidates.every(candidateAllowed) &&
      checked.revisions.every((revision) =>
        revision.changes.every(
          (change) =>
            change.collection !== "candidates" ||
            change.record === null ||
            candidateAllowed(change.record),
        ),
      ) &&
      checked.passages.every(
        (passage) =>
          passage.citation.uses.localExport === "full_text" &&
          readablePassageIds.has(passage.id),
      ) &&
      checked.revisions.every((revision) =>
        revision.changes.every(
          (change) =>
            change.collection !== "passages" ||
            change.record === null ||
            (change.record.citation.uses.localExport === "full_text" &&
              change.record.bindingStatus === "verified" &&
              change.record.citation.corpusDigest === corpus.contentDigest),
        ),
      )
        ? checked.revisions
        : [],
    limitations,
  };
  const evidenceRows = evidence.map((row) => ({ ...row, ...row.citation }));
  const evidenceColumns = [
    "id",
    "versionId",
    "segmentId",
    "sourceUrl",
    "locator",
    "text",
    "reason",
    "originGroup",
    "actorId",
    "reviewState",
    "provenance",
    "objectDigest",
    "renditionOutputDigest",
    "textDigest",
    "retrievedAt",
    "sourceDates",
  ];
  const timelineColumns = [
    "id",
    "type",
    "date",
    "sourceDateText",
    "timeZone",
    "sourceStatement",
    "qualifications",
    "participants",
    "replacesDeadlineId",
    "previousActionId",
    "passageIds",
    "actorId",
    "reviewState",
    "provenance",
  ];
  const authorityColumns = [
    "id",
    "type",
    "subject",
    "object",
    "subjectLabel",
    "objectLabel",
    "sourceStatement",
    "passageIds",
    "actorId",
    "reviewState",
    "provenance",
  ];
  const gapColumns = [
    "id",
    "questionId",
    "text",
    "status",
    "followUpDiscoveryId",
    "actorId",
    "reviewState",
    "provenance",
  ];
  const title = studyPublic
    ? checked.title
    : "Research study (restricted metadata omitted)";
  const dossierHtml = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escape(title)}</title></head><body><main><h1>${escape(title)}</h1><p>Audience: ${escape(audience)}</p><ul>${limitations.map((text) => `<li>${escape(text)}</li>`).join("")}</ul>${htmlTable("Research questions", ["text", "theme", "status", "reviewState"], records.questions)}${htmlTable("Assertions", ["text", "supportingPassageIds", "challengingPassageIds", "actorId", "reviewState", "provenance"], records.assertions)}${htmlTable("Source evidence", evidenceColumns, evidenceRows)}${htmlTable("Procedural and consultation timeline", timelineColumns, timeline)}${htmlTable("Environmental evidence", ["alternativeId", "baselineYear", "metric", "value", "unit", "spatialScale", "uncertainty", "qualifications", "sourceStatement", "versionId", "passageIds", "reviewState"], records.environmentalEvidence)}${htmlTable("Authority matrix", authorityColumns, records.authorityRelationships)}${htmlTable(
    "Unresolved gaps",
    gapColumns,
    records.gaps.filter((row) => row.status === "open"),
  )}</main></body></html>\n`;
  return freeze({
    dossierHtml: dossierHtml.replace(
      "</main>",
      `${htmlTable("Regulatory proceedings", ["id", "title", "parentProceedingId", "docketIds", "rins", "versionIds", "sourceStatement", "passageIds", "reviewState"], records.proceedings)}${htmlTable("Source coverage", ["sourceProfileId", "status", "documentCount", "versionCount", "from", "through", "dataAsOf", "limitations", "exclusions"], audience === "local" ? corpus.coverage : [])}</main>`,
    ),
    evidenceCsv: csv(evidenceColumns, evidenceRows),
    timelineCsv: csv(timelineColumns, timeline),
    authorityCsv: csv(authorityColumns, records.authorityRelationships),
    gapsCsv: csv(gapColumns, records.gaps),
    graph,
    provenance,
    records,
    evidence,
    timeline,
    authorityMatrix: records.authorityRelationships,
    gapRegister: records.gaps,
    coverage: audience === "local" ? corpus.coverage : [],
    limitations,
  });
}

/** Procedural context follows exact resolved source relationships and reviewed study evidence. */
export function studySearchContext(
  study,
  corpus,
  results,
  { sourceProfileId, contextLimit = 1000 } = {},
) {
  if (
    !Number.isSafeInteger(contextLimit) ||
    contextLimit < 1 ||
    contextLimit > 1000
  )
    throw new TypeError("Context limit must be an integer from 1 through 1000");
  if (study) assertValidatedResearchStudy(study, corpus);
  if (
    results.corpusDigest !== corpus.contentDigest ||
    (study && study.corpusDigest !== corpus.contentDigest)
  )
    throw new TypeError("Study search snapshot mismatch");
  const direct = new Set(results.hits.map((hit) => hit.versionId));
  const contextByVersion = new Map();
  const addContext = (record) => {
    if (direct.has(record.versionId)) return;
    const prior = contextByVersion.get(record.versionId);
    if (!prior) {
      contextByVersion.set(record.versionId, record);
      return;
    }
    for (const field of [
      "docketIds",
      "rins",
      "passageIds",
      "sourceSegmentIds",
    ]) {
      prior[field] = [
        ...new Set([...(prior[field] ?? []), ...(record[field] ?? [])]),
      ];
    }
    if (record.sourceRelationships?.length) {
      const relationships = new Map(
        (prior.sourceRelationships ?? []).map((item) => [
          item.relationshipId,
          item,
        ]),
      );
      for (const item of record.sourceRelationships)
        relationships.set(item.relationshipId, item);
      prior.sourceRelationships = [...relationships.values()];
      prior.relationshipId ??= record.relationshipId;
    }
  };
  const trusted = new Set(
    study?.passages
      .filter(
        (passage) =>
          passage.bindingStatus === "verified" &&
          passage.reviewState === "accepted",
      )
      .map((passage) => passage.id) ?? [],
  );
  const proceedings = new Map(
    (study?.proceedings ?? [])
      .filter(
        (row) =>
          row.reviewState === "accepted" &&
          row.passageIds.length &&
          row.passageIds.every((id) => trusted.has(id)),
      )
      .map((row) => [row.id, row]),
  );
  const passages = new Map(study?.passages.map((row) => [row.id, row]) ?? []);
  const refKey = (kind, id) => JSON.stringify([kind, id]);
  const dependencies = new Map();
  for (const row of study?.authorityRelationships ?? []) {
    if (
      row.reviewState !== "accepted" ||
      !["statutory_dependency", "procedural_dependency"].includes(row.type) ||
      !row.passageIds.length ||
      !row.passageIds.every((id) => trusted.has(id))
    )
      continue;
    const from = refKey(row.subject.kind, row.subject.id);
    if (!dependencies.has(from)) dependencies.set(from, []);
    dependencies.get(from).push(refKey(row.object.kind, row.object.id));
  }
  const anchors = (row) =>
    new Set(
      row.passageIds
        .map((id) => passages.get(id)?.citation.versionId)
        .filter((id) => row.versionIds.includes(id)),
    );
  const reaches = (start, row) => {
    const targets = new Set(
      [...anchors(row)].map((id) => refKey("version", id)),
    );
    targets.add(refKey("proceeding", row.id));
    const pending = [start],
      visited = new Set();
    while (pending.length) {
      const next = pending.pop();
      if (targets.has(next)) return true;
      if (visited.has(next)) continue;
      visited.add(next);
      pending.push(...(dependencies.get(next) ?? []));
    }
    return false;
  };
  const retained = new Set(corpus.versions.map((version) => version.id));
  const selected = new Set();
  for (const row of proceedings.values()) {
    if (
      !row.versionIds.some(
        (id) => direct.has(id) && reaches(refKey("version", id), row),
      )
    )
      continue;
    let current = row;
    while (current && !selected.has(current.id)) {
      selected.add(current.id);
      for (const versionId of anchors(current)) {
        if (retained.has(versionId) && !direct.has(versionId))
          addContext({
            versionId,
            proceedingId: current.id,
            title: current.title,
            docketIds: current.docketIds,
            rins: current.rins,
            passageIds: current.passageIds,
            reason: "governing_proceeding_context",
          });
      }
      const parent = proceedings.get(current.parentProceedingId);
      current =
        parent &&
        (reaches(refKey("proceeding", current.id), parent) ||
          [...anchors(current)].some((id) =>
            reaches(refKey("version", id), parent),
          ))
          ? parent
          : undefined;
    }
  }
  const versions = new Map(corpus.versions.map((row) => [row.id, row]));
  const works = new Map(corpus.works.map((row) => [row.id, row]));
  const profiles = new Map(corpus.sourceProfiles.map((row) => [row.id, row]));
  const segments = new Map(corpus.segments.map((row) => [row.id, row]));
  const renditions = new Map(corpus.renditions.map((row) => [row.id, row]));
  const outgoing = new Map();
  for (const relation of corpus.relationships) {
    if (
      !["amends", "corrects", "repeals", "supersedes"].includes(
        relation.type,
      ) ||
      relation.target.state !== "resolved"
    )
      continue;
    const from = versions.get(relation.fromVersionId);
    const target = versions.get(relation.target.versionId);
    const targetWork = works.get(relation.target.workId);
    if (
      !from ||
      !target ||
      !targetWork ||
      target.workId !== targetWork.id ||
      targetWork.sourceIdentifier !== relation.target.sourceIdentifier ||
      relation.target.candidateVersionIds.length ||
      !relation.segmentIds.length ||
      !relation.segmentIds.every(
        (id) =>
          renditions.get(segments.get(id)?.renditionId)?.versionId === from.id,
      )
    )
      continue;
    if (!outgoing.has(from.id)) outgoing.set(from.id, []);
    outgoing.get(from.id).push(relation);
  }
  const pending = [...direct];
  const visited = new Set();
  for (let position = 0; position < pending.length; position++) {
    const fromVersionId = pending[position];
    if (visited.has(fromVersionId)) continue;
    visited.add(fromVersionId);
    const relations = outgoing.get(fromVersionId) ?? [];
    if (!relations.length) continue;
    const eligibleRelationships = results.temporal
      ? new Set(
          resolveCorpusRelationships(corpus, {
            versionId: fromVersionId,
            asOf: results.temporal.asOf,
            basis: results.temporal.basis,
          })
            .relationships.filter((relation) => relation.state === "resolved")
            .map((relation) => relation.relationshipId),
        )
      : null;
    for (const relation of relations) {
      if (eligibleRelationships && !eligibleRelationships.has(relation.id))
        continue;
      const target = versions.get(relation.target.versionId);
      const fromWork = works.get(versions.get(fromVersionId).workId);
      const targetWork = works.get(target.workId);
      const uses = profiles.get(fromWork.sourceProfileId).uses;
      const sourceLabel =
        (uses.localDisplay === "full_text" && uses.excerpts) ||
        (uses.localDisplay === "excerpt" &&
          uses.excerpts &&
          relation.sourceLabel.length <= 1200)
          ? relation.sourceLabel
          : null;
      const evidence = {
        relationshipId: relation.id,
        relationshipDigest: relation.contentDigest,
        type: relation.type,
        fromWorkId: fromWork.id,
        fromVersionId,
        targetWorkId: targetWork.id,
        targetVersionId: target.id,
        sourceLabel,
        sourceStatedAt: relation.sourceStatedAt,
        sourceSegmentIds: relation.segmentIds,
      };
      addContext({
        versionId: target.id,
        proceedingId: null,
        title: targetWork.title,
        docketIds: [],
        rins: [],
        passageIds: [],
        reason: "source_stated_procedural_relationship",
        relationshipId: relation.id,
        sourceSegmentIds: [...relation.segmentIds],
        sourceRelationships: [evidence],
      });
      if (!visited.has(target.id)) pending.push(target.id);
    }
  }
  return freeze({
    contextRecords: [...contextByVersion.values()].slice(0, contextLimit),
    totalContextRecords: contextByVersion.size,
    contextLimit,
    contextTruncated: contextByVersion.size > contextLimit,
    coverage: corpus.coverage.map((row) => ({
      ...row,
      searched:
        (!sourceProfileId || row.sourceProfileId === sourceProfileId) &&
        row.status !== "unavailable",
    })),
    limitations: [
      "Zero matches describe the selected retained collections and date scope, not whether an event occurred.",
      "Contextual proceeding records are not direct matches and may fall outside the geography or date filter.",
      "Resolved source-stated amendments, corrections, repeals and supersessions preserve procedural history; citations and ambiguous targets do not establish a governing parent.",
      "Source-stated relationships must be available under the search cutoff and date basis. Reviewed study context preserves retained analyst reviews and does not establish legal effect at the cutoff.",
      results.temporal
        ? `Search cutoff: ${results.temporal.asOf}; date basis: ${results.temporal.basis}.`
        : "Search date scope: all retained versions, including unknown dates.",
    ],
  });
}
