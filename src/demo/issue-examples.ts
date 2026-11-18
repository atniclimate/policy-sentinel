/**
 * Example issues: a set of searches chosen by hand for one public issue and run
 * together, so a first-time reader sees how the sources answer one question.
 * Policy Sentinel chose every search; the context page did not. Each search
 * names its own source, so an example runs the same whatever is checked.
 *
 * Safeguard 2: an example names identifiers and official texts only. It never
 * says what a bill or rule does; the context page's description stays there.
 */
import type { PlanSearch } from "./discovery";
import { cfrPartUrl, uscSectionUrl } from "./links";
import { govinfoSearch } from "./ncai-2026";

export interface IssueExample {
  readonly label: string;
  /** The identifiers the searches look for, as one sentence. */
  readonly about: string;
  /** A page that describes the issue: context, never a source or a result. */
  readonly context: { readonly url: string; readonly label: string };
  /** Official texts the reader can open; the page fetches none of them. */
  readonly texts: readonly { readonly url: string; readonly label: string }[];
  /** At most AUTO_REQUEST_BUDGET searches, all automatic; a test holds this. */
  readonly searches: readonly PlanSearch[];
}

const SECTION_106 = "National Historic Preservation Act Section 106";
const BILL_TITLE = "Bipartisan American Affordability and Jobs Act";
const PART_800_TITLE = '"Protection of Historic Properties"';

export const ISSUE_EXAMPLES: readonly IssueExample[] = [
  {
    label: "Section 106 and S. 5653",
    about:
      "Section 106 of the National Historic Preservation Act (54 U.S.C. 306108), the regulations at 36 CFR Part 800, Protection of Historic Properties, and S. 5653 in the 119th Congress.",
    // Who runs the site is not verified here, so the label does not say.
    context: {
      url: "https://protect106.org/",
      label: "protect106.org, an advocacy site",
    },
    texts: [
      { url: uscSectionUrl(54, "306108"), label: "54 U.S.C. 306108" },
      { url: cfrPartUrl(36, "800"), label: "36 CFR Part 800" },
    ],
    searches: [
      // "legislation", not "bill": that section is titled for a draft's title.
      {
        group: "legislation",
        source: "congress",
        query: "s 5653 119",
        auto: true,
      },
      // The bill's short title as Congress.gov states it, so its printed
      // versions list without every bill that mentions the Act (live check
      // of 2026-11-18: the Act's name alone matched 3,190 bills).
      {
        ...govinfoSearch(
          "legislation",
          `collection:BILLS AND ("${BILL_TITLE}")`,
          BILL_TITLE,
          "Federal bills and resolutions",
        ),
        auto: true,
      },
      {
        group: "policy",
        source: "federal-register",
        query: "36 CFR 800",
        match: "cfr",
        auto: true,
      },
      // Part 800's own title, as a phrase: the Act's name and "Section 106"
      // as loose words matched thousands of unrelated notices (same check).
      // Regulations.gov is left out: its one live call with this phrase timed
      // out on 2026-11-18, so the lane is not verified against the service.
      {
        group: "policy",
        source: "federal-register",
        query: PART_800_TITLE,
        auto: true,
      },
      {
        ...govinfoSearch(
          "case",
          `collection:USCOURTS AND (${SECTION_106} tribal consultation)`,
          `${SECTION_106} tribal consultation`,
          "Federal court opinions",
        ),
        auto: true,
      },
    ],
  },
];
