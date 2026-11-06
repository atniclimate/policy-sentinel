/**
 * Public prose for the live demo page and its PDF, in one place so the page,
 * the print view and the PDF say the same thing. House voice: plain, direct,
 * no hype, institutional third person (no "we", "I" or "you"; instructions
 * are imperatives), Oxford comma, no em dashes, Title Case headings and
 * sentence case for everything else. The list is called My Citations by name.
 *
 * This file is a thin re-export shim: the prose itself lives in
 * src/demo/copy/<area>.ts, one file per page area, so each area can be
 * edited on its own lane. COPY, EXAMPLES and namesItsKind keep their exact
 * value and type here, so every existing importer keeps working unchanged.
 * Imports carry the .ts extension because scripts/verify-demo-browser.mjs
 * loads this file in Node, which resolves only explicit extensions.
 */
import { capability } from "./copy/sources.ts";
import { documentCopy } from "./copy/document.ts";
import { frame } from "./copy/frame.ts";
import { grants, grantsDatesSkipped } from "./copy/grants.ts";
import { issues } from "./copy/issues.ts";
import { report } from "./copy/report.ts";
import { results } from "./copy/results.ts";
import { search } from "./copy/search.ts";
import { follow } from "./copy/tracking.ts";

export { namesItsKind } from "./copy/shared.ts";

export const COPY = {
  ...frame,
  ...search,
  capability,
  ...results,
  grants,
  grantsDatesSkipped,
  ...issues,
  ...report,
  follow,
  ...documentCopy,
} as const;

export const EXAMPLES: readonly {
  readonly source: string;
  readonly query: string;
  readonly label: string;
}[] = [
  {
    source: "federal-register",
    query: "Executive Order 13175",
    label: "Executive Order 13175",
  },
  {
    source: "federal-register",
    query: "government-to-government consultation",
    label: "Government-to-government consultation",
  },
  {
    source: "federal-register",
    query: "water quality standards",
    label: "Water quality standards",
  },
  {
    source: "federal-register",
    query: "wildfire hazardous fuels",
    label: "Wildfire and hazardous fuels",
  },
  { source: "washington", query: "HB 1100", label: "Washington HB 1100" },
  { source: "washington", query: "SB 5100", label: "Washington SB 5100" },
];
