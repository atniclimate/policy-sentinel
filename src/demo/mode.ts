/**
 * Page modes (design section 2). A mode changes which panels open first and
 * which export template is offered. It never filters by Nation or relevance
 * and never re-runs results. Only the mode is kept in the URL fragment.
 */
export type Mode = "research" | "grants" | "tracking" | "committee";
export type ExportTemplate = "citations" | "briefing";
/** Page panels a mode may open by default; demo/main.tsx maps these to its own. */
export type ModePanel =
  "document" | "cited" | "following" | "sources" | "committee-library";

export const MODE_DEFAULTS: Readonly<
  Record<
    Mode,
    { readonly panels: readonly ModePanel[]; readonly template: ExportTemplate }
  >
> = Object.freeze({
  research: { panels: ["document", "cited"], template: "citations" },
  grants: { panels: ["document", "cited"], template: "briefing" },
  tracking: { panels: ["following", "cited"], template: "briefing" },
  committee: {
    panels: ["committee-library", "document"],
    template: "citations",
  },
});

/** Committee libraries only when an approved library exists (N5). */
export function availableModes(committeeLibrary: boolean): readonly Mode[] {
  return committeeLibrary
    ? ["research", "grants", "tracking", "committee"]
    : ["research", "grants", "tracking"];
}

/** The mode in a fragment such as "#mode=grants"; anything else is Research. */
export function modeFromHash(hash: string, committeeLibrary: boolean): Mode {
  const named = new URLSearchParams(hash.replace(/^#/, "")).get("mode");
  return (
    availableModes(committeeLibrary).find((mode) => mode === named) ??
    "research"
  );
}

export const modeHash = (mode: Mode): string => `#mode=${mode}`;

/** Display settings the page reads from the query string; no other field is kept. */
const KEPT_PARAMS = ["embed", "theme"];

/** The page URL with only the mode in the fragment and only display settings in the query. */
export function modeUrl(href: string, mode: Mode): string {
  const url = new URL(href);
  const kept = new URLSearchParams();
  for (const name of KEPT_PARAMS) {
    const value = url.searchParams.get(name);
    if (value !== null) kept.set(name, value);
  }
  url.search = kept.toString();
  url.hash = modeHash(mode);
  return url.toString();
}
