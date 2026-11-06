/** Source capability strings: what the demo does with each federal source. */

/** What the demo does with each federal source, shown under its name. One line in the search rail: keep each short. */
export const capability = {
  "federal-register": "Topic search, official text, and passage checks",
  govinfo:
    "Topic search, metadata, and official links; current results, with historical versions excluded",
  regulations: "Topic search, metadata, and official links",
  congress: "Looks up one bill by reference",
} as Readonly<Record<string, string>>;
