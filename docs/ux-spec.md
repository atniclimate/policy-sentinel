# Policy Sentinel UX specification

Status: Phase A design contract

Applies to: public GitHub Pages beta

Last reviewed: 2026-07-30

Product-space interpretation converged under PS09 Run 1: this specification remains
binding for the current static application output. The application is one
output precursor within the general Policy Sentinel engine; it is not
the entire PNW definition of done. Future document, web-module, application,
and structured-output adapters must consume one accepted corpus without
changing record identity, evidence, `whyShown`, review state, or non-claims.

The sole local release root is `PS09-06-LOCAL-RC`; historical application and
PNW acceptance scopes provide evidence without a second mandatory release
root. The owner-selected cohort and planned scenario manifests require Run 2;
no current-membership count controls this retained fixture interface.

Implementation status: the B1 application exercises these interaction patterns
over a validated synthetic artifact, now built from the existing analyzed
corpus's exact three-fixture 1.1 compatibility profile. This migration changes
no UI features. The local curated-pack spine does not add public full-text or
pack export. A production Nation registry, production
records, comparison mode, scheduled/manual deployment refresh, Pages
publication, and the successor PNW output-adapter architecture do not yet
exist.

## Experience contract

Policy Sentinel is a source-reference and discovery tool for Tribal government leadership and staff, policy staff, grants staff, and program staff. The interface must be calm, compact, plain-language, and usable without policy or technical expertise. It must not imply that results are comprehensive, legally determinative, or a complete statement of a Nation's interests.

Every results view must identify the selected Nation context, policy criteria, covered jurisdictions, data-as-of time, and material source limitations. The persistent footer and every dossier must state that Policy Sentinel is not legal advice, a comprehensive legal database, a rights-impact engine, or a substitute for official sources.

The public beta contains no maps or public/private land context. It makes no telemetry, analytics, search-logging, tracking-pixel, browser-side AI, or automatic data-transmission requests.

## Information architecture

The home dashboard offers three equally visible entry points. Each converges on the same results and filter model:

1. **Guided Nation search:** select one Nation, select policy scope, review coverage, then apply the search.
2. **Browse by policy area:** choose one or more taxonomy categories, then select one Nation before viewing results.
3. **Landmark timeline:** browse verified landmarks by date and type, then apply one Nation as the viewing context. A landmark is not Nation-specific unless its official source explicitly supports that association.

A persistent navigation area exposes Home, Search, Policy areas, Landmark timeline, Unclassified and other records, Source coverage, Methodology, and About. Browser Back and Forward must restore route, selection, filters, and the open detail record without silently resubmitting a query.

The document-type vocabulary supports proposed, active, committee, enacted, and historical bills and statutes; regulations and rulemakings; executive actions; notices and implementation material; grants and funding opportunities; litigation, court decisions, and administrative decisions; public state/federal intergovernmental accords and agreements; eligible county policies and ordinances; and officially published Tribal government documents. Municipal and city sources are outside the public beta. Status labels must preserve the official source status alongside any normalized status and must not imply that unlike source statuses are legally equivalent. An Accord whose source supplies only narrative execution language shows `Current status: Not stated by source`; it never relabels `Executed` or `Signed` as a present status.

Accord cards show exact governmental or collective parties rather than an issuing body and use the exact executed/signed event for chronology. Details, print dossiers, and CSV distinguish a source-provided identifier from a reviewed project fallback, carry party roles and evidence links, and visibly state that reviewed sources do not establish current legal effect, a complete supersession history, or a Nation association. Collective party language cannot populate a Nation-specific result.

## Guided single-Nation flow

Single-Nation discovery is the default and must be complete before comparison mode is enabled.

1. **Select a Nation.** For production, use a searchable,
   keyboard-accessible single-select control populated with the approved
   575-entity United States federal-recognition collection after its identity
   reconciliation passes. The current B1 build uses an explicitly synthetic
   575-row collection.
2. **Select policy scope.** Require an explicit choice of All policy areas or at least one category or subcategory.
3. **Review coverage.** Show the jurisdictions and source date ranges available for the selected Nation context, including any degraded or unavailable source.
4. **Apply.** A clearly labeled button runs the search. Filters never auto-submit while the visitor is still making choices.
5. **Review results.** Announce the result count in a polite live region and move focus only when the visitor explicitly requests it.

The Nation control searches official names and authorized aliases only. It displays the official name as the selected value; aliases may help matching but must not replace or alter the official name. It supports typing, arrow keys, Home, End, Enter, and Escape without creating a keyboard trap. A labeled native `<select>` containing the same list is the reliable fallback when the enhanced control is unavailable.

The selected Nation's coverage designation comes only from the validated public Nation registry. The UI never derives it from an address, map, parcel, land record, browser location, or keyword. When the selected Nation is outside Washington, Oregon, and Idaho coverage, the results contain federal records only and display:

> State and county source coverage in this beta is limited to Washington, Oregon, and Idaho. Results for this Nation currently show federal sources only.

An ambiguous coverage designation defaults to federal-only until it is resolved and documented.

## Advanced comparison mode

Comparison is an explicit control labeled **Advanced: compare Nations**. It remains disabled or absent until the single-Nation flow passes its acceptance tests. Entering comparison mode explains that comparison shows source records and their stated relationship bases, not differences in legal rights or impacts.

Comparison uses the same official-name and authorized-alias controls, requires the visitor to select each Nation deliberately, and never retains a hidden Nation from the single-select flow. The supported maximum, if any, will be set only after performance and accessibility testing and must be stated beside the control.

The comparison result set is a deduplicated union. Each card and detail view shows, for every selected Nation, one of:

- an official-source explicit Nation reference with its evidence;
- general jurisdiction, clearly marked as not Nation-specific;
- a verified landmark basis; or
- no association, in which case the record is not presented as related to that Nation.

County records appear for a selected Nation only when the official county record explicitly names that Nation. General-jurisdiction records are not converted into Nation-specific records merely because they appear for multiple Nations. Comparison dossiers list criteria and relevance evidence separately for each selected Nation.

## Policy-area selection

The ten top-level categories come from the versioned taxonomy configuration. They are presented as a responsive group of real checkboxes or selectable cards with visible checked, focus, and disabled states. They must not be implemented as a multi-select drop-down or hard-coded into UI logic.

An explicit **All policy areas** checkbox is mutually exclusive with category and subcategory selections. No unmarked state silently means "all." If neither All nor a category is selected, the interface explains what is required and does not apply the search.

Each category has a separate, keyboard-operable expand control that reveals optional subcategory checkboxes:

- A selected parent with no selected subcategory means all records mapped to that category.
- One or more selected subcategories narrow that parent to the union of those subcategories.
- Selections across different parent categories are combined with OR.
- Non-policy facets are combined with the policy selection using AND.
- Many-to-many records are returned once and display all applicable mapped categories.

The selection summary states these semantics in plain language. Expanding or collapsing a category never changes its selection.

Official source subjects map to the taxonomy only through the documented deterministic mapping configuration. The UI does not categorize from keywords or AI. A persistent **Unclassified and other records** route, with an available count, finds records whose official source subject did not map cleanly. Selecting a category does not imply that unclassified records are irrelevant; the results page links to that route and explains why records may be unclassified.

## Global search and facets

Global search covers exact official titles, source names, and official source text or indexes only where technically feasible and legally permitted. It runs locally against the deployed static artifact and sends no query to a server or third party. Search terms do not create a Nation relationship, policy category, landmark designation, or relevance claim.

Facets include:

- jurisdiction;
- document type;
- source-reported or normalized status;
- inclusive date range with the date basis named;
- official source;
- relevance basis; and
- policy category or subcategory.

Facet controls are labeled fieldsets or equivalent semantic groups. Counts state whether they describe the current result set. Changes are staged until the visitor selects **Apply filters**; **Reset filters** has a confirmation-free, predictable effect and restores the documented initial state. Active criteria appear as removable text controls, not color alone. Invalid date ranges produce an inline error associated with both date fields.

## Results

Results default to a stable, documented sort and offer only understandable alternatives such as newest source update, oldest event, official title, and urgent deadline. The current sort and total count remain visible. Pagination or incremental loading must preserve keyboard position, URL state, and selected records.

Each short result card contains:

- a selection checkbox for dossier and CSV output;
- exact official title;
- document type;
- jurisdiction and issuing body where available;
- source-reported or normalized status, clearly distinguished;
- official source;
- relevant updated date and its label;
- a prominent **Why shown** label;
- new or changed badge when the current build supports it; and
- an urgent deadline or status badge when supported by exact source data.

The Why shown value is limited to a schema-approved relevance basis. **Explicit Nation reference** links to exact official evidence in the detail view. **General jurisdiction** includes the words "not Nation-specific." **Landmark** links to the written inclusion basis. No card contains an AI summary, legal conclusion, rights determination, inferred relationship, or geography-derived claim.

In the production acceptance target, new and changed badges compare the current
validated source record with the prior successful public build and state the
comparison window. Urgent badges show the exact source-provided deadline or
status, date, time zone when provided, and retrieval age; the application does
not predict urgency. Badges are visible in the site and dossier only. They never
trigger email, text, Slack, push, or other outbound notification. Current tests
exercise this behavior with synthetic artifacts, not a prior published build.

## On-demand record detail

Opening a card retrieves its separate static detail asset on demand. The detail is a navigable route or an accessible in-page panel with a visible heading, labeled close control, predictable focus return, and a direct-link URL. Failure to load a detail asset leaves the result card intact and reports the error without inventing content.

The detail view may show, where the official source provides and terms permit:

- exact official metadata and identifiers;
- official abstract, short permitted excerpt, or full official language;
- sponsors, committees, action history, and status history;
- official subject headings and deterministic taxonomy mappings;
- exact Nation-association evidence and evidence URL;
- official source and full-text links;
- retrieval, source-update, validation, and provenance information;
- historical treatment and, for a landmark, its written criterion, project
  editorial review state, exact official evidence link/date, and visible
  reproduction boundary; and
- source health and coverage limitations.

Full official language or a lengthy abstract appears in a collapsed section only when reuse terms allow it. Otherwise, show an exact citation, a short source-provided excerpt when permitted, and an official full-text link. Links identify that they open an external official source.

An optional build-time summary appears only in this detail view. It is labeled **AI-generated source summary**, appears after official metadata, and places its cited official inputs, source dates, source links, model/build provenance, and generation time beside it. It must be succinct, objective, professional, contain no em dash, and make no legal conclusion, rights determination, relevance claim, or source-independent assertion. If an approved summary is absent or fails validation, show official material only; do not generate or display a replacement in the browser.

## Landmark timeline

The timeline includes only records that pass the written landmark criteria and source validation. Each item shows date, verified record type, official citation or identifier, source, and relationship basis. Details distinguish project editorial selection from source approval or a legal-effect, rights, or Nation-relationship determination and expose the exact evidence and reproduction boundary. The timeline does not visually imply uninterrupted historical coverage.

Source-specific coverage bands and gaps are visible. Before 1980, non-landmark records are normally represented by citation and official link rather than an expanded summary. The Boldt decision and Washington Centennial Accord may appear only after their exact official sources, dates, record identities, and inclusion bases are recorded; neither example authorizes unofficial text or unsupported Nation associations. Record 1.4 proves the Accord presentation with a fictional metadata-only landmark fixture; that fixture is not evidence that the real GOIA source is enabled.

## Coverage, freshness, and source health

The dashboard and results page show:

- overall data-as-of time;
- a link to the visible source-coverage matrix;
- each enabled source's actual historical range;
- source status of current, delayed, degraded, unavailable, or range-limited;
- last successful retrieval and source update time where available; and
- a clear state-coverage notice for the current Nation context.

When refresh fails, last-known-good records remain available with their original data-as-of time. A warning names the affected source, failure state, last successful refresh, and resulting freshness limitation. The interface never changes an old timestamp to the failed attempt time or labels stale data current. A source with no last-known-good data is marked unavailable and contributes no records.

Coverage notices distinguish source availability from record relevance. A zero result count means no matching record was found in the currently available data; it does not mean no relevant policy exists.

## Selection, dossier, and CSV

Selection checkboxes have visible labels, expose the selected count, and persist
in bounded URL state through filters, detail views, and browser Back and Forward.
Malformed, duplicate, or stale record IDs are removed after validation against
the loaded public artifact. **Clear selection** is explicit. A record removed
from the current filter remains selected only if the UI says so and offers a
review list. Selection and result-window changes preserve unapplied form edits;
only the explicit Apply action serializes a new search.

Because an explicit selection may span several filter views, a dossier labels
the applied filters as **Current view criteria** rather than claiming every
selected record matches them. It separately states that records were explicitly
selected across the browser session and may not match the current view.

The print-ready dossier is assembled in the browser from selected, validated public records and uses a dedicated print stylesheet before any server-side PDF approach is considered. It contains:

- selected Nation or comparison Nations;
- exact search and filter criteria;
- generated local time and time zone;
- data-as-of time;
- source list and per-source health;
- coverage and historical-range limitations;
- exact official metadata, citation, source language or permitted excerpt, and link for each record;
- Why shown and exact Nation-reference evidence where applicable, without
  labeling landmark evidence as Nation evidence;
- landmark criterion, project editorial review state, exact official evidence,
  and reproduction boundary where applicable;
- visible urgent source deadlines or statuses; and
- the not-legal-advice notice.

AI summaries are excluded from beta dossiers and CSV files so those outputs remain source-reference products. Printing removes navigation and controls, preserves readable URLs or link labels, avoids clipped cards and orphaned headings, and works in common letter and A4 print layouts.

CSV export includes selected records only. Its documented columns cover stable ID, source ID, official title, document type, jurisdiction, issuing body, status, applicable dates, source and full-text URLs, permitted official abstract or excerpt, official subjects, mapped categories, relevance basis, exact Nation evidence and evidence URL, source update/retrieval times, data-quality state, source health, and urgent source fields. Repeated fields use a documented delimiter or JSON encoding. Export is UTF-8, quotes fields correctly, and neutralizes spreadsheet-formula prefixes without changing the displayed source value.

Neither output contains private documents, land context, credentials, hidden source fields, telemetry identifiers, or unapproved copyrighted full text.

## Accessibility and responsive behavior

The beta targets WCAG 2.2 AA. Implementation and acceptance testing cover:

- semantic landmarks, headings, lists, forms, tables, and buttons;
- a skip link and meaningful page titles;
- complete keyboard operation with no hover-only action;
- visible focus indicators that meet contrast requirements;
- text and non-text contrast, zoom, reflow, and 200% text resizing;
- labels, instructions, errors, status announcements, and result counts exposed to assistive technology;
- no color-only meaning and no unexpected context change;
- reduced-motion preferences and no required animation;
- touch targets and controls usable on narrow screens;
- accessible names for badges, icon-only controls, external links, and file downloads; and
- automated checks plus manual keyboard and screen-reader smoke tests.

On small screens, filters become an explicitly opened region rather than covering results, cards remain in document order, tables reflow or offer an accessible alternative, and primary actions remain reachable without horizontal scrolling. Desktop density must not come at the expense of readable line length or target size.

The application uses progressive enhancement for the Nation selector, disclosure controls, and printing. A source or detail loading error is conveyed in text and leaves navigation and already loaded results operable.

## Empty, error, and offline states

Every empty state repeats the active Nation and criteria, distinguishes no matches from unavailable sources, links to Unclassified and other records, and suggests only deterministic actions such as clearing a facet. It never asserts that no policy or legal authority exists.

Network errors identify the static asset or source group that could not load, offer a retry, and show the artifact's data-as-of state. The application may use browser caching for public static assets but must not register background transmission, telemetry, or outbound alert behavior.
