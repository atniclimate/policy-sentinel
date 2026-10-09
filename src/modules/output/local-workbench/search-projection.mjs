import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  createSupportedAnalyzedCorpus,
  parseSupportedAnalyzedCorpus,
  serializeSupportedAnalyzedCorpus,
  canonicalV2Digest,
} from "../../../pipeline/analyzed-corpus-v2.mjs";
import { policyDateBounds } from "../../../engine/temporal-operations.mjs";

export const MAX_SEARCH_PROJECTION_BYTES = 128 * 1024 ** 2;
export const MAX_SEARCH_PROJECTION_MANIFEST_BYTES = 8 * 1024 ** 2;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (code) => {
  throw new TypeError(`Search projection rejected: ${code}`);
};
const member = ({ contentDigest: _digest, ...value }) => {
  void _digest;
  return value;
};
const sorted = (values) => [...values].sort();
const catalogIsSorted = (rows) =>
  rows.every((row, index) => index === 0 || rows[index - 1].id < row.id);
const fields = (record) =>
  (record.fieldProvenance ?? []).flatMap((field) => field.segmentIds);

/** Retain whole works and exact evidence dependencies; never truncate source text to fit a budget. */
export function createSearchProjection(input, selection, replayOptions) {
  const parent = parseSupportedAnalyzedCorpus(input, replayOptions);
  if (
    !selection ||
    typeof selection !== "object" ||
    Array.isArray(selection) ||
    Object.keys(selection).some(
      (key) =>
        !["sourceProfileIds", "from", "through", "maxBytes"].includes(key),
    )
  )
    fail("INVALID_SELECTION");
  const {
    sourceProfileIds,
    from = null,
    through = null,
    maxBytes = MAX_SEARCH_PROJECTION_BYTES,
  } = selection;
  const availableProfileIds = new Set(
    parent.sourceProfiles.map((profile) => profile.id),
  );
  if (
    !Array.isArray(sourceProfileIds) ||
    !sourceProfileIds.length ||
    new Set(sourceProfileIds).size !== sourceProfileIds.length ||
    sourceProfileIds.some((id) => !availableProfileIds.has(id))
  )
    fail("UNKNOWN_SOURCE_SELECTION");
  for (const value of [from, through])
    if (
      value !== null &&
      (!/^\d{4}-\d{2}-\d{2}$/u.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    )
      fail("INVALID_SELECTION_DATE");
  if (from && through && from > through) fail("REVERSED_DATE_RANGE");
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > MAX_SEARCH_PROJECTION_BYTES
  )
    fail("INVALID_BYTE_CEILING");
  const works = new Map(parent.works.map((row) => [row.id, row]));
  const versions = new Map(parent.versions.map((row) => [row.id, row]));
  const renditions = new Map(parent.renditions.map((row) => [row.id, row]));
  const segments = new Map(parent.segments.map((row) => [row.id, row]));
  const captures = new Map(parent.captures.map((row) => [row.id, row]));
  const requestedProfileIds = new Set(sourceProfileIds);
  const worksByProfile = new Map();
  for (const work of parent.works) {
    const rows = worksByProfile.get(work.sourceProfileId) ?? [];
    rows.push(work);
    worksByProfile.set(work.sourceProfileId, rows);
  }
  const degradedProfileIds = new Set(
    parent.coverage
      .filter((row) => row.status === "degraded")
      .map((row) => row.sourceProfileId),
  );
  const dependencyProfileIds = new Set();
  const selected = new Set();
  const selectedProfileIds = new Set();
  const selectWork = (id) => {
    selected.add(id);
    selectedProfileIds.add(works.get(id).sourceProfileId);
  };
  const directlySelectedVersionIds = [];
  for (const version of parent.versions) {
    if (!requestedProfileIds.has(works.get(version.workId).sourceProfileId))
      continue;
    const bounds = policyDateBounds(version.dates.publication);
    if (
      (from || through) &&
      (!bounds ||
        (from && bounds.latest < `${from}T00:00:00.000Z`) ||
        (through && bounds.earliest > `${through}T23:59:59.999Z`))
    )
      continue;
    selectWork(version.workId);
    directlySelectedVersionIds.push(version.id);
  }
  let size;
  do {
    size = selected.size;
    // A degraded source must retain the complete previously verified source snapshot.
    for (const profileId of degradedProfileIds) {
      if (selectedProfileIds.has(profileId)) {
        for (const work of worksByProfile.get(profileId) ?? [])
          selectWork(work.id);
      }
    }
    const selectedVersions = parent.versions.filter((row) =>
      selected.has(row.workId),
    );
    const selectedIds = new Set(selectedVersions.map((row) => row.id));
    const evidenceRecords = [
      ...parent.works.filter((row) => selected.has(row.id)),
      ...selectedVersions,
      ...parent.events.filter((row) => selectedIds.has(row.versionId)),
    ];
    // Capture-property evidence has no passage segment. Preserve its admitted
    // source and observation rather than losing the dependency during selection.
    for (const field of evidenceRecords.flatMap(
      (row) => row.fieldProvenance ?? [],
    )) {
      if (field.segmentIds.length) continue;
      const profileId = captures.get(field.captureId).sourceProfileId;
      dependencyProfileIds.add(profileId);
      if (!selectedProfileIds.has(profileId))
        for (const work of worksByProfile.get(profileId) ?? [])
          selectWork(work.id);
    }
    const dependencies = [
      ...parent.works.filter((row) => selected.has(row.id)).flatMap(fields),
      ...parent.works
        .filter((row) => selected.has(row.id))
        .flatMap((row) => row.jurisdictionRefs ?? [])
        .flatMap((association) => association.segmentIds),
      ...selectedVersions.flatMap(fields),
      ...parent.events
        .filter((row) => selectedIds.has(row.versionId))
        .flatMap((row) => [...row.segmentIds, ...fields(row)]),
    ];
    // Explicit procedural actions retain their governing targets across works
    // and selected collections. Degraded sources additionally preserve every
    // outgoing relationship to keep their verified source snapshot unchanged.
    const degradedProfiles = new Set(
      [...degradedProfileIds].filter((id) => selectedProfileIds.has(id)),
    );
    for (const relation of parent.relationships) {
      const fromWork = works.get(versions.get(relation.fromVersionId).workId);
      if (
        !degradedProfiles.has(fromWork.sourceProfileId) &&
        (!selected.has(fromWork.id) ||
          !["amends", "corrects", "repeals", "supersedes"].includes(
            relation.type,
          ))
      )
        continue;
      dependencies.push(...relation.segmentIds);
      const targets =
        relation.target.state === "resolved"
          ? [relation.target.versionId]
          : relation.target.candidateVersionIds;
      for (const id of targets) selectWork(versions.get(id).workId);
    }
    for (const id of dependencies)
      selectWork(
        versions.get(renditions.get(segments.get(id).renditionId).versionId)
          .workId,
      );
  } while (size !== selected.size);
  const retainedWorks = parent.works.filter((row) => selected.has(row.id));
  const retainedVersions = parent.versions.filter((row) =>
    selected.has(row.workId),
  );
  const versionIds = new Set(retainedVersions.map((row) => row.id));
  const retainedRenditions = parent.renditions.filter((row) =>
    versionIds.has(row.versionId),
  );
  const renditionIds = new Set(retainedRenditions.map((row) => row.id));
  const retainedSegments = parent.segments.filter((row) =>
    renditionIds.has(row.renditionId),
  );
  const segmentIds = new Set(retainedSegments.map((row) => row.id));
  const profileIds = new Set(retainedWorks.map((row) => row.sourceProfileId));
  for (const id of dependencyProfileIds) profileIds.add(id);
  for (const row of parent.coverage)
    if (
      row.status === "unavailable" &&
      requestedProfileIds.has(row.sourceProfileId)
    )
      profileIds.add(row.sourceProfileId);
  if (!profileIds.size) fail("EMPTY_SELECTED_POPULATION");
  const keepEvidence = (row) =>
    row.segmentIds.every((id) => segmentIds.has(id));
  const relationships = parent.relationships.filter(
    (row) =>
      versionIds.has(row.fromVersionId) &&
      keepEvidence(row) &&
      (row.target.state === "resolved"
        ? versionIds.has(row.target.versionId)
        : row.target.candidateVersionIds.every((id) => versionIds.has(id))),
  );
  const analyses = parent.analyses.filter(
    (row) => versionIds.has(row.versionId) && row.codes.every(keepEvidence),
  );
  const analysisIds = new Set(analyses.map((row) => row.id));
  const findings = parent.findings.filter(
    (row) =>
      row.populationVersionIds.every((id) => versionIds.has(id)) &&
      [...row.supportingSegmentIds, ...row.contrarySegmentIds].every((id) =>
        segmentIds.has(id),
      ) &&
      row.analysisIds.every((id) => analysisIds.has(id)),
  );
  const relationshipIds = new Set(relationships.map((row) => row.id));
  const findingIds = new Set(findings.map((row) => row.id));
  const coverage = parent.coverage
    .filter((row) => profileIds.has(row.sourceProfileId))
    .map((row) => ({
      ...member(row),
      documentCount: retainedWorks.filter(
        (work) => work.sourceProfileId === row.sourceProfileId,
      ).length,
      versionCount: retainedVersions.filter(
        (version) =>
          works.get(version.workId).sourceProfileId === row.sourceProfileId,
      ).length,
    }));
  const retainedProfiles = parent.sourceProfiles.filter((row) =>
    profileIds.has(row.id),
  );
  const retainedCaptures = parent.captures.filter((row) =>
    profileIds.has(row.sourceProfileId),
  );
  const retainedEvents = parent.events.filter((row) =>
    versionIds.has(row.versionId),
  );
  // Closure can retain the complete parent, including for a narrower requested
  // selection. Reuse only exact, canonically ordered catalog contents and unchanged coverage counts;
  // the manifest still records the actual selection and all byte limits apply.
  const unchanged =
    [
      [retainedProfiles, parent.sourceProfiles],
      [retainedCaptures, parent.captures],
      [retainedWorks, parent.works],
      [retainedVersions, parent.versions],
      [retainedRenditions, parent.renditions],
      [retainedSegments, parent.segments],
      [retainedEvents, parent.events],
      [relationships, parent.relationships],
      [analyses, parent.analyses],
      [findings, parent.findings],
    ].every(
      ([retained, original]) =>
        retained.length === original.length &&
        catalogIsSorted(original) &&
        retained.every((row, index) => row === original[index]),
    ) &&
    coverage.length === parent.coverage.length &&
    catalogIsSorted(parent.coverage) &&
    coverage.every(
      (row, index) =>
        row.documentCount === parent.coverage[index].documentCount &&
        row.versionCount === parent.coverage[index].versionCount,
    );
  const corpus = unchanged
    ? parent
    : createSupportedAnalyzedCorpus(
        {
          id: parent.id,
          runId: parent.runId,
          trustDomain: parent.trustDomain,
          generatedAt: parent.generatedAt,
          sourceProfiles: retainedProfiles.map(member),
          captures: retainedCaptures.map(member),
          works: retainedWorks.map(member),
          versions: retainedVersions.map(member),
          renditions: retainedRenditions.map(member),
          segments: retainedSegments.map(member),
          events: retainedEvents.map(member),
          relationships: relationships.map(member),
          analyses: analyses.map(member),
          findings: findings.map(member),
          coverage,
        },
        parent.schemaVersion,
        replayOptions,
      );
  const bytes = Buffer.from(
    serializeSupportedAnalyzedCorpus(corpus, replayOptions),
  );
  if (bytes.length > maxBytes) fail("PROJECTION_BYTE_CEILING");
  const manifest = {
    kind: "bounded_search_projection",
    schemaVersion: "1.0.0",
    ruleVersion: "whole-work-evidence-closure/1",
    parentCorpusDigest: parent.contentDigest,
    corpusDigest: corpus.contentDigest,
    fileDigest: hash(bytes),
    bytes: bytes.length,
    selection: {
      sourceProfileIds: sorted(sourceProfileIds),
      from,
      through,
      maxBytes,
      dateBasis: "publication_overlap",
    },
    directlySelectedVersionIds: sorted(directlySelectedVersionIds),
    retainedVersionIds: sorted(versionIds),
    retainedSegmentIds: sorted(segmentIds),
    excludedVersionIds: sorted(
      parent.versions
        .filter((row) => !versionIds.has(row.id))
        .map((row) => row.id),
    ),
    omittedRelationshipIds: sorted(
      parent.relationships
        .filter((row) => !relationshipIds.has(row.id))
        .map((row) => row.id),
    ),
    omittedAnalysisIds: sorted(
      parent.analyses
        .filter((row) => !analysisIds.has(row.id))
        .map((row) => row.id),
    ),
    omittedFindingIds: sorted(
      parent.findings
        .filter((row) => !findingIds.has(row.id))
        .map((row) => row.id),
    ),
    coverage: parent.coverage.map((row) => ({
      ...row,
      selected: requestedProfileIds.has(row.sourceProfileId),
      searched:
        requestedProfileIds.has(row.sourceProfileId) &&
        row.status !== "unavailable",
      retained: profileIds.has(row.sourceProfileId),
      directlyMatchedVersionIds: sorted(
        directlySelectedVersionIds.filter(
          (id) =>
            works.get(versions.get(id).workId).sourceProfileId ===
            row.sourceProfileId,
        ),
      ),
      retainedVersionIds: sorted(
        retainedVersions
          .filter(
            (version) =>
              works.get(version.workId).sourceProfileId === row.sourceProfileId,
          )
          .map((version) => version.id),
      ),
    })),
    limitations: [
      "Whole-work and source-evidence dependencies may extend beyond the requested date/source population.",
      "Excluded records and omitted relationships are unsearched, not negative evidence.",
      "Coverage dates and source health retain the parent observation; retained IDs identify this projection's actual population.",
    ],
  };
  const sealed = Object.freeze({
    ...manifest,
    contentDigest: canonicalV2Digest(manifest),
  });
  serializeSearchProjectionManifest(sealed);
  return { corpus, bytes, manifest: sealed };
}

export function serializeSearchProjectionManifest(manifest) {
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  if (bytes.length > MAX_SEARCH_PROJECTION_MANIFEST_BYTES)
    fail("MANIFEST_BYTE_CEILING");
  return bytes;
}

/** Check the delivered envelope; parent replay remains mandatory at serve admission. */
export function validateSearchProjectionEnvelope(manifest, corpus, bytes) {
  if (
    !manifest ||
    manifest.kind !== "bounded_search_projection" ||
    manifest.schemaVersion !== "1.0.0" ||
    manifest.ruleVersion !== "whole-work-evidence-closure/1" ||
    !/^[a-f0-9]{64}$/.test(manifest.parentCorpusDigest) ||
    manifest.corpusDigest !== corpus.contentDigest ||
    manifest.fileDigest !== hash(bytes) ||
    manifest.bytes !== bytes.length ||
    manifest.contentDigest !== canonicalV2Digest(member(manifest)) ||
    JSON.stringify(manifest.retainedVersionIds) !==
      JSON.stringify(sorted(corpus.versions.map((row) => row.id))) ||
    JSON.stringify(manifest.retainedSegmentIds) !==
      JSON.stringify(sorted(corpus.segments.map((row) => row.id)))
  )
    fail("INVALID_PROJECTION_ENVELOPE");
  serializeSearchProjectionManifest(manifest);
  return manifest;
}

/** Rebuild from the reviewed parent; checksums alone do not establish selection or dependency correctness. */
export function verifySearchProjection(parent, manifest, bytes, replayOptions) {
  if (
    !manifest ||
    manifest.parentCorpusDigest !== parent.contentDigest ||
    manifest.ruleVersion !== "whole-work-evidence-closure/1"
  )
    fail("PARENT_OR_RULE_MISMATCH");
  const { sourceProfileIds, from, through, maxBytes } =
    manifest.selection ?? {};
  const rebuilt = createSearchProjection(
    parent,
    { sourceProfileIds, from, through, maxBytes },
    replayOptions,
  );
  if (
    canonicalV2Digest(rebuilt.manifest) !== canonicalV2Digest(manifest) ||
    !Buffer.isBuffer(bytes) ||
    !rebuilt.bytes.equals(bytes)
  )
    fail("PROJECTION_REPLAY_MISMATCH");
  return rebuilt;
}
