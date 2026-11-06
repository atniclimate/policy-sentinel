/** A Regulation Identifier Number, followed in the source that states it. */
import type { FollowKindDef } from "./types";

export const rinKind: FollowKindDef = {
  label: "RIN",
  id: (sourceId, value) => `${sourceId}#rin:${value}`,
  // The UTC calendar day of the last check (or the follow time, before the first).
  baseline: (lastChecked, followedAt) =>
    (lastChecked ?? followedAt).slice(0, 10),
  versionKey: (listing) => listing.date,
  isNew: (baseline, key) => key >= baseline,
};
