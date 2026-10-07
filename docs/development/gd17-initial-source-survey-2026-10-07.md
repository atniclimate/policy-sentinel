# GD-17 initial source survey

Date: 2026-10-07. Work item: `GD-17-NATIONWIDE-SOURCE-SURVEY`.
Authority: D-086/D-087 and `G-GENERAL-DEV-01`, documentation only.

## Result and evidence map

This finite survey covers five federal families, seven states, selected local
instrument routes, three intertribal resolution publishers, and seven selected
official public Tribal-government publishers. It identifies candidates for
successor contract preparation and records why none is newly dispatch-ready.
It does not complete any API integration, acquire a policy corpus, or accept an
output. Full nationwide coverage remains GD-33 work.

| Review | Scope |
| --- | --- |
| [Federal](../source-reviews/nationwide/federal-2026-10-07.md) | Federal Register, GovInfo, eCFR, Congress.gov, Regulations.gov |
| [Regional index](../source-reviews/nationwide/regional-2026-10-07.md) | Common state/local conditions and pilot comparison |
| [WA](../source-reviews/nationwide/wa-2026-10-07.md), [OR](../source-reviews/nationwide/or-2026-10-07.md), [ID](../source-reviews/nationwide/id-2026-10-07.md) | Legislation, codes, rules, opinions and selected local instruments |
| [AK](../source-reviews/nationwide/ak-2026-10-07.md), [CA](../source-reviews/nationwide/ca-2026-10-07.md), [MT](../source-reviews/nationwide/mt-2026-10-07.md), [NV](../source-reviews/nationwide/nv-2026-10-07.md) | The same five classes, with explicit unresolved cells |
| [Tribal and intertribal](../source-reviews/nationwide/tribal-intertribal-2026-10-07.md) | ATNI, NCAI, USET/USET SPF; selected originating public Tribal publishers |

The seven state documents preserve the addendum's per-jurisdiction descriptor
arrangement. Shared federal and organizational reviews preserve issuer-level
distinctions. These are prose descriptor drafts, not machine-admissible catalog
rows or real Nation-specific configuration. No identity slug, jurisdiction
binding, membership list, community-to-county map or source activation is
created. GD-12 owns the future catalog contract; GD-09/GD-22 own identifier and
registry bindings.

## Qualification and pilot selection

**Newly dispatch-ready pilot subset: empty.** Qualification requires current
source terms/rights, a reviewed successor profile and finite manifest, tested
normalization, measured storage headroom, transport canaries, and output
acceptance. The following **contract-preparation shortlist** identifies work
toward that qualification. This is an explicit survey finding, not a completed
three-family pilot.

| Family | Initial selection | Why retain it | Remaining contract/dispatch evidence |
| --- | --- | --- | --- |
| Federal | Government-authored Federal Register instruments via GovInfo direct document routes | Official publisher, retained custody/extractor experience, documented direct/bulk routes; avoids making a keyed-API claim from direct imports | Current robots/access evidence, exact item rights and official locators, fresh finite host/path/format/custody manifest, transport and output proofs; historical profiles expired 2026-10-05 |
| Regional | Washington Legislature bill/session-law documents | Originating legislature and retained narrowly reviewed direct-document route | Current route and reuse review, version/status and official inventory bindings, finite manifest/canaries; RCW/WAC compilations are excluded from this shortlist and historical profiles remain expired |
| Intertribal | ATNI organizational resolutions, reserved candidate slot | Owner-selected organizational source and official resolution index/process leads | Direct index and document evidence, rights, robots/access, adoption/version state and finite document selection remain unresolved; no intertribal text-output source is currently accepted |
| Public Tribal | Tlingit & Haida resolutions and the other named publisher leads | Originating public government indexes make D-087 concrete | Not an extra mandatory pilot tranche; no runtime identity binding, document custody, rights or output acceptance from this survey |

The first two candidates merit independent GD-31 contract work; the third is a
visible evidence gap. Neither NCAI nor USET is a silent substitute for ATNI:
their observed access-consent terms require source-specific resolution before
further access. Lack of an immediately usable intertribal source does not block
independent federal/regional preparation or GD-18's measured storage inventory.
It does prevent claiming the intended federal/regional/intertribal pilot is
delivered. No blanket public-source permission is being requested again.

## Required API set and completion standard

The required federal set remains Federal Register, GovInfo, eCFR, Congress.gov
and Regulations.gov. The state set is the official statewide interface for each
selected state where an admissible one exists, with WA's legislative service and
OR's legislative OData recorded as concrete existing contracts. A document-only
portal or a missing API is a gap, never an invented API implementation. No API
was exercised in this survey.

Each future API packet needs originating documentation, terms and credentials
resolved for that operation, a finite query/range, representative/missing/
malformed fixtures, pagination and partial-result behavior, source-specific
normalization and privacy projection, custody/provenance, source-health and
checksum-validated same-adapter fallback, and an actual end-to-end API run.
Manually imported documents cannot satisfy API acceptance. A whole-state API
query does not create a Nation association, and an API's existence does not
prove historical completeness. Candidate documents, keyed endpoints, and
third-party publishers retain separate contracts.

## Evidence levels and coverage

The reports distinguish direct documentation observations, official indexed
discovery leads, carried dated evidence, tool-level retrieval failures and
known closed terms/credential gates. A rendered public page does not prove
bounded-runner transport, headers, CORS, rate behavior or byte costs. Tool
errors are not claims that the publisher is unavailable. No raw research pages
or document bodies were saved into the repository.

Every source remains at discovery/documentation review in this work. Existing
offline fixtures and historical sealed acquisitions retain only their recorded
evidence; this survey neither renews them nor promotes them into current API
or pilot acceptance. New fixture tests, live acquisition, new searchable corpus
and accepted output: none. Selected build date range and measured new corpus
weight: none. Documented archive dates are not selected or emitted coverage.

Local instruments may be discovered as `general_jurisdiction` without a Nation
name under D-087. Final/executed status still needs official evidence. Public
Tribal codes and administrative policies are eligible public sources; restricted
internal material and its derivatives retain their permissions. Organizational
resolutions are acts of their issuing body, not inferred positions of members.
Exact source evidence remains necessary for any public Nation relationship.

## Storage and successor work

GD-18 next inventories existing managed roots and measures retained originals,
renditions, metadata, indexes, cases/exports and peak staging/rebuild copies
together against **50,000,000,000 bytes**. Historical custody and managed cold
storage count. This survey supplies format/coverage uncertainty, not measured
per-record or whole-state sizes. Keep the current independent disk floor and
run cap unchanged; do not estimate headroom by subtracting projections from an
unmeasured baseline, fill the cap, delete evidence or auto-evict.

GD-31 represents D-086/D-087 successor authority, exact source manifests,
source-specific unresolved gates, API acceptance and release ownership before
later dispatch. GD-32 specifies/measures bounded search with retained or
synthetic inputs. GD-33 completes all states, DC, territories, local platform
classes and the retained international/transboundary class; seven states and
seven Tribal publisher leads are not an exhaustive national inventory.

## Coordination and write boundaries

The owner said Continue after pickup of the GD-26 handoff. Startup read the full
roadmap and required general-engine context through a read-only context auditor;
root reconciled Git, existing receipts and protected-file hashes. Both mandated
startup validators passed before edits. The operating model supplied bounded
source-scout and independent-review roles.

Write leases for this task:

- Federal scout: only `docs/source-reviews/nationwide/federal-2026-10-07.md`.
- Regional scout: only `regional-2026-10-07.md` and the seven state documents
  listed above in that directory.
- Root: this development record, the Tribal/intertribal matrix, the GD-17
  handoff, `ROADMAP.yaml` and `docs/continuation-prompt.md`; sole Git writer.
- Independent reviewers: read-only, no implementation or activation authority.

Protected: all runtime, schemas, source configuration/registry, historical
reviews and grants, kernel/experimental/vision, demo/Worker, sealed external
custody and the 36 pre-existing untracked files. No profile renewal, product
acquisition, credential registration, terms acceptance, private transfer,
contact, paid call, optional AI, outbound notification, remote or publication
operation belongs to this checkpoint. Current review/test receipts and the
exact next task are recorded in the [handoff](../handoffs/2026-10-07-gd17-initial-source-survey.md).
