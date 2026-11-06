/**
 * Relation names a source prints beside a related record (owner decision 12,
 * 2026-11-06): GovInfo related-records relation names and Congress.gov
 * related-bill relationship types. A closed list. A name on it is shown in the
 * source's own words; any other name is withheld and the row says so.
 *
 * Every value is written in an official answer, a committed fixture or the
 * source's own documentation. Each was screened in development for whether it
 * only says how two records relate and states no legal effect of one on the
 * other; the scores stay outside the repository. Owner approval: pending.
 */
const SHOWN: ReadonlySet<string> = new Set([
  // GovInfo related records (relationships[].relationship).
  "bill versions",
  "bill history",
  "congressional reports",
  "congressional committee prints",
  "presidential signing statements and remarks",
  "public and private laws",
  "statutes at large",
  "u.s. code",
  // Congress.gov related bills (relationshipDetails[].type).
  "identical bill",
  "related bill",
  "procedurally-related",
]);

/** The data-verbatim field name a shown relation name is marked with. */
export const RELATION_FIELD = "relation";

/** True when a source's relation name is on the closed list; case is ignored. */
export const relationShown = (name: string): boolean =>
  SHOWN.has(name.trim().toLowerCase());
