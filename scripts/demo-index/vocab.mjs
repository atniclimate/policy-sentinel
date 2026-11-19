// Federal Register API answers to vocabulary files (condition F4): slug,
// name, short name and parent slug only. No description, URL or numeric id.
import { createHash } from "node:crypto";

import { compareCodeUnits } from "../../src/core/canonical-json.mjs";
import {
  SCHEMA_REF,
  StageError,
  namedInWordingProblem,
  wordingProblem,
} from "./common.mjs";
import { collapse } from "./xml.mjs";

const ID = /^[0-9a-z]+(?:-[0-9a-z]+)*$/;

/**
 * Official names held out of the suggestion lists (index condition G3): each
 * includes a Nation's everyday name that the probes, built from full official
 * names, do not catch. Kept as the SHA-256 of the entry id, so no name is
 * written here (as the probe hash file does). Found by the review of
 * 2026-11-18; the owner has not named the entry in (D-186). The validator
 * refuses a file that carries one.
 */
export const HELD_OUT_SHA256 = Object.freeze({
  fr_agency: Object.freeze([
    "63636c1cedb953e91739041981f5ad9dfac0cc7d9f9885a7d525dc5619f9cfa6",
  ]),
  fr_topic: Object.freeze([]),
});

/** True when this vocabulary entry id is held out; `list` is for tests. */
export const heldOut = (kind, id, list = HELD_OUT_SHA256) =>
  (list[kind] ?? []).includes(
    createHash("sha256").update(String(id), "utf8").digest("hex"),
  );

/**
 * The 18 official Federal Register agency and topic names the Nation-name
 * check left out for a general word ("Indians", "Community", "Islands")
 * that names no Nation on the recognition list (D-191, 2026-11-19: "I
 * approve now"). A frozen, closed list by kind, modeled on
 * ANCHOR_WORD_TITLES (scripts/build-vocab.mjs): each id with the exact label
 * the owner approved, so a label the source later changes gets the full
 * check again. The one entry the owner has not named in (HELD_OUT_SHA256,
 * D-186, D-192) is never named in even so; `heldOut` is checked first in
 * `finish` and still wins.
 */
export const NAMED_IN = Object.freeze({
  fr_agency: Object.freeze({
    "community-development-financial-institutions-fund":
      "Community Development Financial Institutions Fund",
    "community-living-administration": "Community Living Administration",
    "corporation-for-national-and-community-service":
      "Corporation for National and Community Service",
    "national-civilian-community-corps": "National Civilian Community Corps",
    "rural-housing-and-community-development-service":
      "Rural Housing and Community Development Service",
    "special-trustee-for-american-indians-office":
      "Special Trustee for American Indians Office",
  }),
  fr_topic: Object.freeze({
    indians: "Indians",
    "loan-programs-housing-community-development":
      "Loan programs-housing and community development",
    "grant-programs-housing-community-development":
      "Grant programs-housing and community development",
    "virgin-islands": "Virgin Islands",
    "community-development": "Community development",
    "northern-mariana-islands": "Northern Mariana Islands",
    "community-facilities": "Community facilities",
    "community-development-block-grants": "Community development block grants",
    "pacific-islands-trust-territory": "Pacific Islands Trust Territory",
    "wake-island": "Wake Island",
    "midway-islands": "Midway Islands",
    "community-action-programs": "Community action programs",
  }),
});

/** True when this id is named in for this kind under this exact label (D-191). */
export const namedIn = (kind, id, label) =>
  typeof id === "string" &&
  Object.hasOwn(NAMED_IN[kind] ?? {}, id) &&
  NAMED_IN[kind][id] === label;

function finish(kind, rows, names, list) {
  const report = { dropped: [], namedIn: [] };
  const seen = new Set();
  const kept = [];
  for (const row of rows) {
    if (heldOut(kind, row.id, list)) {
      // The id is not repeated in the report: it would carry the name.
      report.dropped.push({ id: "(held out)", reason: "held_out" });
      continue;
    }
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
    // Named in (D-191): the STRUCTURAL mask is skipped, never the hashed
    // recognition list, an injected probe name, a URL, a personal pattern or
    // markup.
    // Only the approved label itself; a short label always gets the full check.
    const exempt = namedIn(kind, row.id, label);
    const check = exempt ? namedInWordingProblem : wordingProblem;
    const problem =
      !label || label.length > 200 || (shortLabel && shortLabel.length > 80)
        ? "length"
        : (check(label, names) ??
          (shortLabel && wordingProblem(shortLabel, names)));
    if (problem) {
      // A label is required, so an entry whose wording cannot be carried is left out.
      report.dropped.push({ id: row.id, reason: problem });
      continue;
    }
    if (exempt) report.namedIn.push({ id: row.id, label });
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
export function mapFrAgencies(json, names, list) {
  if (!Array.isArray(json))
    throw new StageError("normalize", "agencies answer is not a list");
  const slugById = new Map(json.map((a) => [a?.id, a?.slug]));
  const rows = json.map((a) => ({
    id: a?.slug,
    label: a?.name,
    shortLabel: a?.short_name,
    parentId: a?.parent_id == null ? null : (slugById.get(a.parent_id) ?? null),
  }));
  return finish("fr_agency", rows, names, list);
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
