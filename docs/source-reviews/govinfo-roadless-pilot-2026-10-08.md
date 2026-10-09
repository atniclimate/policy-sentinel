# GovInfo roadless pilot source review

Access date: **2026-10-08 Pacific / 2026-10-09 UTC**. Observation checkpoint:
`2026-10-09T06:06:16Z`. Reviewer: Policy Sentinel source-evidence reviewer.
Review/profile expiry: **2026-10-10T00:00:00Z**, without automatic renewal.
This review applies to one fresh D-089 operation and expires earlier if its
allowlist, provider conditions, intended uses or transport contract change.

The reviewer applied the
[source-review skill](../../.agents/skills/policy-sentinel-source-review/SKILL.md)
after reading the existing source-specific stops, governance, catalog and
[October 7 federal review](nationwide/federal-2026-10-07.md). The
[D-089 execution record](../development/2026-10-08-roadless-real-source-pilot.md)
supplies the selected local scope. This review makes no historical acquisition
resumable and changes no retained source profile.

**Outcome: viable bounded direct-document contract; item admission pending.**
The three HTML URLs below are documented-template candidates with independently
evidenced publication dates and document numbers. They have not been downloaded
by this review. Current availability, exact response identity, rendition bytes,
source-version digests and meaningful extraction remain observations for the
accounted pilot operation, not facts established by a documentation read.

## Authority, access and reproduction

The instrument issuer is the **U.S. Department of Agriculture, Forest Service**.
The Office of the Federal Register / NARA publishes the Federal Register;
**GPO/GovInfo is the distribution and custody service**. Preserve these distinct
roles in source attribution. A publisher or service response is not independent
corroboration of the originating instrument.

Current originating documentation was read at:

| Evidence | Observed contract and qualification |
| --- | --- |
| [GovInfo policies](https://www.govinfo.gov/about/policies) | Supports downloading and locally storing access packages. Government-authored works generally permit reuse, but embedded copyrighted material and website imagery require separate treatment. Attribute the originating agency and GPO. Publications may later be redacted for PII. No access-as-agreement clause was observed in the reviewed page. |
| [NARA Federal Register FAQ](https://www.archives.gov/federal-register/faqs) | Expressly permits reproduction/republication of published FR content. Distinguishes official digitally signed PDFs from endorsed, unofficial HTML/XML. Published documents remain historical records; correction, withdrawal and rescission require subsequent published documents. |
| [GovInfo Developer Hub](https://www.govinfo.gov/developers) | Documents bulk/direct distribution and sitemaps separately from the key-requiring API. No API registration, credential or key is used here. |
| [GovInfo Federal Register help](https://www.govinfo.gov/help/fr) | Documents date/package/document identifiers and predictable document-specific HTML/PDF paths. The page identifies its update date as 2025-04-10. FR coverage is format-dependent; 1995 onward supports document sections. Document dates automatically extracted into metadata can be missing or inaccurate. The published-day update description is not an SLA. |
| [GovInfo sitemaps documentation](https://www.govinfo.gov/sitemaps) | Provides a documented discovery mechanism; this review did not enumerate sitemaps or authorize a crawl. |
| [GovInfo robots.txt](https://www.govinfo.gov/robots.txt) | A bounded direct documentation GET returned HTTP 200, `text/plain`, without redirect. The generic user-agent rules exclude `/search/` and `/app/search/*`, among administrative paths. They do not exclude `/content/pkg/` or `/app/details/`. No numeric direct-route quota or crawl delay was stated. |

The research browser's robots attempt returned an internal tool error. That was
not a provider denial; the later direct robots response resolved this particular
host-policy evidence gap. The successful request did not authenticate, supply
cookies, accept terms or follow a redirect. No GovInfo site-search endpoint was
requested. No numeric direct-document quota, retry guarantee, retention guarantee
for a particular rendition, or service availability commitment was verified.

The Federal Register API's retained R7 digest-drift outcome and closed FR-A1 lane
remain unchanged. The historical `govinfo-direct` profile expired on 2026-10-05
for new dispatch. GovInfo's keyed API and its API-specific rates are not this
route's contract. eCFR's access-consent stop is untouched; no eCFR host was read.

## Exact selection and finite operation

The three targets are the complete allowlist, not examples or path-prefix
permissions. All use `GET`, HTTPS port 443 and the exact host
`www.govinfo.gov`, with no query string, credentials or cookies:

| Role | Document and published version | Exact allowed URL |
| --- | --- | --- |
| Historical parent final rule | FR Doc. `01-726`; 2001-01-12; 66 FR 3244; Special Areas; Roadless Area Conservation | `https://www.govinfo.gov/content/pkg/FR-2001-01-12/html/01-726.htm` |
| Proposed rescission | FR Doc. `2026-16965`; 2026-08-20; 91 FR 53827; Special Areas; Roadless Area Conservation | `https://www.govinfo.gov/content/pkg/FR-2026-08-20/html/2026-16965.htm` |
| Comment deadline extension | FR Doc. `2026-18648`; 2026-09-11; 91 FR 57841; Special Areas; Roadless Area Conservation | `https://www.govinfo.gov/content/pkg/FR-2026-09-11/html/2026-18648.htm` |

The parent identity was corroborated by the official indexed
[2001 document PDF](https://www.govinfo.gov/content/pkg/FR-2001-01-12/pdf/01-726.pdf).
The proposal identity was corroborated by the official indexed
[2026 proposal PDF](https://www.govinfo.gov/content/pkg/FR-2026-08-20/pdf/2026-16965.pdf).
The indexed [September 11 official issue](https://www.govinfo.gov/content/pkg/FR-2026-09-11/pdf/FR-2026-09-11.pdf)
identifies the extension, expressly refers to the August 20 proposal and retains
both the original September 21 and extended October 6, 2026 comment deadlines.
The proceeding identifiers are RIN `0596-AD66` and docket `FS-2025-0001`.
These are discovery observations to be replayed against acquired exact text.
The PDFs are evidence links, **not additional acquisition targets**.

The selected range is three publication dates spanning 2001-01-12 through
2026-09-11, not a continuous or exhaustive collection. The 2001 parent and HTML
format are explicit D-089 successor choices; they do not mutate the older GD31
preparation's prospective 2025-2026 selection or PDF/XML description. The
2025-08-29 NOI, FR Doc. `2025-16581`, was identified during research but is
**not selected**. Neither are any draft EIS, cost-benefit analysis, consultation
summary, docket attachment, comment, state exception, litigation document or
later action. Their absence is a coverage gap, not evidence of non-occurrence.

| Enforced operation bound | Value |
| --- | --- |
| Selected documents | At most 3, only the exact URLs above |
| HTTP attempts | At most 3 total; at most one GET per target; failed attempts count |
| Retries / redirects | 0 / 0; no implicit fallback or alternative rendition fetch |
| Concurrency | 1 |
| Request spacing | At least 15 seconds between request starts |
| Request deadline | 30 seconds |
| Response size | At most 8,388,608 bytes (8 MiB) per response |
| Aggregate response size | At most 25,165,824 bytes (24 MiB) |
| Content handling | HTML only; retain existing identity-encoding, URL/DNS, media-type and bounded transport checks; reject unexpected bodies |
| Execution | Build-time/local only, no source requests from browser code |
| Storage | Fresh external operation namespace; prior roots remain sealed; fresh forecast within the 50 GB total managed ceiling |

These limits are stricter than the prospective 12-attempt/32-MiB preparation.
An error or rejected body consumes its attempt and establishes failure or a gap;
it does not authorize another request. CORS was not observed and is unnecessary
for this build-time route. Freeze the concrete operation manifest and confirm
the existing runner enforces its bounds before dispatch. This review itself is
not a dispatch receipt or storage measurement.

## Uses, privacy and evidence admission

| Use | Decision for the selected government-authored instrument text |
| --- | --- |
| Immutable capture / local retention | Permitted in the new external custody namespace; never in Git or public assets |
| Local analysis | Permitted after source identity, rendition and content-boundary validation |
| Local full-text display | Permitted for the reviewed normalized government text with its source identity and citation |
| Exact excerpts | Permitted with original source wording, version, locator and attribution |
| Local export | Permitted for reviewed evidence and attributed analyst content, with permissions preserved |
| Public redistribution | Not authorized by this pilot; source reproduction permission does not open the publication gate |

The profile must reference this review and use the stated expiry. Bind capture,
analysis, display, excerpt and export decisions separately; do not derive them
from a public URL or provider name. The ordinary build remains synthetic and
network-free. Only separately reviewed local output may be served on loopback.

Original bytes remain immutable custody evidence. Derivatives must whitelist
document identity, title, issuer, exact action/status wording, explicit
publication and other typed dates, RIN/docket, official subject labels, reviewed
passages and explicit source references. Preserve retrieval time separately
from publication and any source update time. Missing source update information
is unknown, not replaced by the retrieval clock. A local digest establishes
byte identity, not a verified PDF signature or present legal effect.

Exclude contacts, personal data, signatures, submission instructions with
personal fields, linked comments, attachments, embedded third-party material,
website imagery, maps and prohibited sensitive location content from searchable
or exported evidence. Do not follow links during extraction. Validate exact FR
document boundaries so a neighboring instrument cannot supply text or dates.
Quarantine an unreviewed third-party or privacy-bearing passage rather than
silently extending the permission profile. Keep private notes separate and
excluded from public-facing products; never send them in source requests.

Retain the original deadline and the subsequent extension as distinct evidence.
The proposal is a proposed rescission, not proof of an effective rescission.
Agency descriptions of aggregate consultation do not identify participating
Nations; no Nation relationship, homeland, jurisdiction or organizational
position is inferred. Docket/RIN and explicit references support procedural
links only after exact citation replay. Unmapped official subject labels remain
Unclassified; title keywords do not supply category mappings.

Failure handling remains fail-closed. Without a checksum-validated prior approved
output for this same new source profile, an unsuccessful source is unavailable.
Historical output from a different or expired operation does not automatically
become this pilot's last-known-good shard. Do not label a documentation read or
partial extraction as healthy source coverage.

## Documentation and discovery request accounting

This review made **10 research-browser opens, 7 search-engine queries restricted
to official domains, and 1 direct HTTP documentation GET**. The tool opens below
are research requests; the tool's provider-side fetch/cache count and bytes are
not observable and are not claimed as product operation accounting. No document
body URL was directly opened or downloaded. Search results displayed indexed
official excerpts, sometimes with neighboring text; none became a custody object.

| ID | Request | Observed result |
| --- | --- | --- |
| R01 | Open `https://www.govinfo.gov/robots.txt` | Internal research-tool error; no provider prohibition established |
| R02 | Open `https://www.govinfo.gov/about/policies` | Read current policy page |
| R03 | Open `https://www.archives.gov/federal-register/faqs` | Read current reproduction, rendition and historical-record guidance |
| R04 | Direct GET `https://www.govinfo.gov/robots.txt` | HTTP 200 `text/plain`; no redirect; response read only in memory |
| R05 | Open `https://www.govinfo.gov/developers` | Read current interface documentation |
| R06 | Open `https://www.govinfo.gov/help/fr` | Read current collection/format documentation |
| R07 | Open `https://www.govinfo.gov/sitemaps` | Read current sitemap documentation; no sitemap enumeration |
| R08 | Query `"roadless" "2026-16965"`; domains `govinfo.gov`, `federalregister.gov` | Indexed official proposal evidence |
| R09 | Query `"roadless" "2026-18648"`; same two domains | No separately sufficient extension hit in this batch |
| R10 | Query `"roadless" "2025-16581"`; same two domains | Indexed official NOI evidence; not selected |
| R11 | Query `"roadless" "01-726"`; same two domains | Indexed official parent-rule evidence |
| R12 | Open `https://www.govinfo.gov/help/fr` at sample-URL section | Verified documented HTML/PDF/details templates |
| R13 | Open `https://www.govinfo.gov/app/details/FR-2026-09-11/2026-18648` | Internal research-tool error; no item-availability conclusion |
| R14 | Open `https://www.govinfo.gov/app/details/FR-2026-08-20/2026-16965` | Empty rendered content; no item-availability conclusion |
| R15 | Open `https://www.govinfo.gov/app/details/FR-2001-01-12/01-726` | Empty rendered content; no item-availability conclusion |
| R16 | Query `"2026-18648" "Roadless"`; domain `govinfo.gov` | Indexed official September 11 issue evidence |
| R17 | Query `"Roadless" "September 11, 2026" "October 6"`; domains `govinfo.gov`, `federalregister.gov`, `fs.usda.gov` | Indexed deadline/relationship evidence |
| R18 | Query `"Roadless" "October" "2026" "comment period"`; domains `govinfo.gov`, `federalregister.gov` | Selected indexed hits only; no exhaustive or latest-action claim |

R04 used one request, a 20-second timeout, 65,536-byte maximum response buffer
and automatic redirects disabled. It wrote no file. The research was completed
at the observation checkpoint above; no requests were added while writing this
review. No API, registration, credential, provider-term acceptance, paid access,
contact, private input or historical-operation replay occurred. No tests, corpus
capture, source activation or deployment were performed by this review.

The remaining acceptance evidence is concrete: exact manifest and runner review,
fresh storage forecast, accounted target responses, per-item identity/rights and
boundary checks, immutable digest custody, extraction/citation replay, and the
pilot's persistent-study/output checks. Failure or absence must remain visible.
This federal subset does not complete required API integration, the broader
three-family pilot, regional source qualification or the general release.
