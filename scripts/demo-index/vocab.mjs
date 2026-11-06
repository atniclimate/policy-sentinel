// Federal Register API answers to vocabulary files (condition F4): slug,
// name, short name and parent slug only. No description, URL or numeric id.
import { compareCodeUnits } from "../../src/core/canonical-json.mjs";
import { SCHEMA_REF, StageError, wordingProblem } from "./common.mjs";
import { collapse } from "./xml.mjs";

const ID = /^[0-9a-z]+(?:-[0-9a-z]+)*$/;

function finish(kind, rows, names) {
  const report = { dropped: [] };
  const seen = new Set();
  const kept = [];
  for (const row of rows) {
    if (typeof row.id !== "string" || !ID.test(row.id) || row.id.length > 120) {
      report.dropped.push({
        id: String(row.id).slice(0, 40),
        reason: "id_form",
      });
      continue;
    }
    if (seen.has(row.id))
      throw new StageError(
        "normalize",
        `vocabulary id ${row.id} appears twice`,
      );
    seen.add(row.id);
    const label = collapse(String(row.label ?? ""));
    const shortLabel = row.shortLabel
      ? collapse(String(row.shortLabel)) || null
      : null;
    const problem =
      !label || label.length > 200 || (shortLabel && shortLabel.length > 80)
        ? "length"
        : (wordingProblem(label, names) ??
          (shortLabel && wordingProblem(shortLabel, names)));
    if (problem) {
      // A label is required, so an entry whose wording cannot be carried is left out.
      report.dropped.push({ id: row.id, reason: problem });
      continue;
    }
    kept.push({
      id: row.id,
      label,
      shortLabel,
      parentId: row.parentId ?? null,
    });
  }
  const ids = new Set(kept.map((e) => e.id));
  for (const e of kept)
    if (e.parentId !== null && !ids.has(e.parentId)) e.parentId = null;
  kept.sort((a, b) => compareCodeUnits(a.id, b.id));
  return {
    file: {
      $schema: SCHEMA_REF,
      schemaVersion: "1.0.0",
      artifactType: "vocabulary",
      kind,
      entries: kept,
    },
    report,
  };
}

/** GET /api/v1/agencies: an array of agencies with numeric parent_id. */
export function mapFrAgencies(json, names) {
  if (!Array.isArray(json))
    throw new StageError("normalize", "agencies answer is not a list");
  const slugById = new Map(json.map((a) => [a?.id, a?.slug]));
  const rows = json.map((a) => ({
    id: a?.slug,
    label: a?.name,
    shortLabel: a?.short_name,
    parentId: a?.parent_id == null ? null : (slugById.get(a.parent_id) ?? null),
  }));
  return finish("fr_agency", rows, names);
}

/** GET /api/v1/documents/facets/topic: an object keyed by slug with name and count. */
export function mapFrTopics(json, names) {
  if (!json || typeof json !== "object" || Array.isArray(json))
    throw new StageError("normalize", "topics answer is not an object");
  const rows = Object.entries(json).map(([slug, value]) => ({
    id: slug,
    label: value?.name,
    shortLabel: null,
    parentId: null,
  }));
  return finish("fr_topic", rows, names);
}
