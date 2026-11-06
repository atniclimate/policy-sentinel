/**
 * A court case, followed by its GovInfo package id (which carries the court
 * code). New means a new package or a changed `lastModified`: either one
 * shows as a `lastModified` after the last check. GovInfo says that stamp is
 * not an official publication date, so it is shown only as "changed".
 */
import type { FollowKindDef } from "./types";

const instant = (value: string | undefined): number =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)
    ? Date.parse(value)
    : NaN;

export const caseKind: FollowKindDef = {
  label: "Case",
  id: (sourceId, value) => `${sourceId}#case:${value}`,
  // The exact instant, not the day: lastModified is a timestamp.
  baseline: (lastChecked, followedAt) => lastChecked ?? followedAt,
  versionKey: (listing) =>
    Number.isFinite(instant(listing.lastModified))
      ? (listing.lastModified ?? null)
      : null,
  isNew: (baseline, key) => instant(key) > instant(baseline),
};
