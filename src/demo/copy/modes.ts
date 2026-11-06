/** Mode tabs (src/demo/mode.ts): a mode changes default panels and the export only. */
export const modes = {
  label: "Mode",
  names: {
    research: "Research",
    grants: "Grants",
    tracking: "Tracking",
    committee: "Committee libraries",
  },
  /** One line under the tabs; no mode filters, ranks or re-runs results. */
  help: "A mode changes which panels open first and which export is offered. It does not filter, rank, or re-run results.",
  exports: {
    citations: "Cited Policies",
    briefing: "Briefing",
  },
} as const;
