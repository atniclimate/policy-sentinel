// Every row kind, notice and expansion the panel can show, from the chain fixtures.
import type {
  ChainExpansion,
  ChainIndexNotice,
} from "../../../../demo/app/LinkedRecordsPanel";
import { chain } from "../../../../src/demo/copy/chain";
import {
  cfrPartLinks,
  citationsInText,
  recordLinks,
  uscSectionLinks,
} from "../../../../src/demo/links";
import type { ChainRow } from "../../../../src/demo/links";
import {
  blocks,
  cfrFile,
  cfrShard,
  frRecord,
  frRecordNoAuth,
  NOW,
  SOURCES,
  staleCfrFile,
  uscFile,
  uscShard,
} from "./index";

export function allRows(): ChainRow[] {
  return [
    ...recordLinks(frRecord, SOURCES),
    ...recordLinks(frRecordNoAuth, SOURCES).slice(-1),
    ...(cfrPartLinks(cfrShard, "100", cfrFile, NOW) ?? []),
    ...(cfrPartLinks(cfrShard, "200", cfrFile, NOW) ?? []),
    ...(cfrPartLinks(cfrShard, "300", staleCfrFile, NOW) ?? []),
    ...(uscSectionLinks(uscShard, "/us/usc/t99/s1001", uscFile, NOW) ?? []),
    ...(uscSectionLinks(uscShard, "/us/usc/t99/s450", uscFile, NOW) ?? []),
    ...citationsInText(blocks, frRecord),
  ];
}

export const notices: ChainIndexNotice[] = [
  chain.indexUnavailable,
  chain.notYetAvailable,
  chain.withdrawn("2099-02-15"),
].map((text) => ({
  text,
  sourceName: "U.S. Code (OLRC)",
  liveUrl: "https://uscode.house.gov/",
}));

export const idle: ChainExpansion[] = [
  { id: "govinfo_related", state: "idle" },
  { id: "congress_related_bills", state: "idle" },
];

/** A GovInfo expansion answered with GovInfo's own relation name as the label. */
export function answered(): ChainExpansion[] {
  const [base] = recordLinks(frRecord, SOURCES);
  return [
    {
      id: "govinfo_related",
      state: "done",
      rows: [{ ...base, label: "Related Documents", labelVerbatim: true }],
    },
    { id: "congress_related_bills", state: "error" },
  ];
}
