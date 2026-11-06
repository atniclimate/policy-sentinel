/** One official document, followed by every identifier its own source stated. */
import type { FollowKindDef } from "./types";

export const documentKind: FollowKindDef = {
  label: "Document",
  id: (sourceId, value) => `${sourceId}#document:${value}`,
  // The UTC calendar day of the last check (or the follow time, before the first).
  baseline: (lastChecked, followedAt) =>
    (lastChecked ?? followedAt).slice(0, 10),
  versionKey: (listing) => listing.date,
  isNew: (baseline, key) => key >= baseline,
};
