# Federal court opinion datastores source review (Ninth Circuit and Western District of Washington)

Accessed: 2026-09-15

Implementation state: one bounded acquisition-runner profile,
`federal-court-opinions-direct` in `config/policy-sources.v2.mjs`, covering
exactly two hosts and two path prefixes for the two court-hosted PDFs approved
by D-069. No source registry entry, adapter, record, excerpt, Nation association
or public artifact output. The retained curated Supreme Court adapter, the
closed `G-DOI-IBIA-DOCUMENT-CONTRACT`, `G-WA-APPELLATE-CITATION-REVISION-CONTRACT`
and `G-ID-APPELLATE-CITATION-FINALITY-CONTRACT` gates and the GovInfo USCOURTS
contract behind `G-B-GOVINFO` are unchanged.

External authorization: D-069 (2026-09-15) authorizes one credential-free GET
of each of the two court-hosted documents below, with no retry. This review
does not extend that authorization to any other document or path.

## Primary sources reviewed

- [Ninth Circuit privacy policy](https://www.ca9.uscourts.gov/privacy-policy/)
- [Ninth Circuit robots policy](https://cdn.ca9.uscourts.gov/robots.txt)
- [Western District of Washington privacy notice](https://www.wawd.uscourts.gov/privacy)
- [Western District of Washington robots policy](https://www.wawd.uscourts.gov/robots.txt)

The two courts are the originating judicial publishers of the documents in
scope. Both privacy pages describe routine access logging for site evaluation
and warn that the systems are for official judiciary business and are
monitored. Neither page, and no footer or navigation link on either home page,
states copyright, public-domain, reuse, redistribution or linking terms. A
general judiciary terms page was looked for at two guessed `uscourts.gov`
paths and was **not located**; no further guessing was done.

## Exact scope of the profile

| Attribute | Observation |
| --- | --- |
| Hosts | `cdn.ca9.uscourts.gov` (Ninth Circuit opinion datastore); `www.wawd.uscourts.gov` (Western District document files) |
| Path prefixes | `/datastore/opinions/`; `/sites/wawd/files/` |
| Documents in scope (D-069) | Ninth Circuit No. 13-35474, opinion, 2016-06-27, `https://cdn.ca9.uscourts.gov/datastore/opinions/2016/06/27/13-35474.pdf`; W.D. Wash. C70-9213 Subproceeding 09-01, findings of fact and conclusions of law, 2015-07-09, `https://www.wawd.uscourts.gov/sites/wawd/files/Makah09-01FFCLandMemorandum.pdf` |
| Rendition | Court-published PDF; the runner stores the bytes as an immutable digested object and performs no parsing or text extraction |
| Discovery contract | None. Both datastores are per-document URLs with no documented listing, pagination, identity or currentness contract; the profile admits only the two exact paths above through the frozen manifest |
| Robots policy | `cdn.ca9.uscourts.gov` allows `/` and disallows only `/datastore/newsletters/` and `/newsletters/`; `/datastore/opinions/` is not disallowed. `www.wawd.uscourts.gov` uses a standard Drupal file: `/sites/wawd/files/` is not disallowed; the file declares a 10 second crawl delay for all agents. The run issues one request to each host, so the delay is honored trivially |
| Authentication and rate limits | No key or account; no published numeric limit. The runner's 2 second same-host spacing, 60 second deadline, 64 MiB per-response ceiling and zero-retry rule apply |
| Reuse and reproduction terms | **Not located** on either host. Treat both documents as metadata-and-link for any output: cite court, docket, date and official URL; retain no opinion text, caption text, counsel or signature block in any excerpt, export or display |
| Privacy screen | Court PDFs contain counsel names, signature blocks and, for the Western District document, party and witness detail. These exist inside the immutable object only and must never reach an output, excerpt or export |
| Failure behavior | Fail closed on non-200, non-PDF content type, byte ceiling or deadline; a failed receipt is recorded and there is no retry without a separate owner decision |

## Uses recorded on the profile

`capture: true`, `analysis: true`, `excerpts: true`, `localDisplay: full_text`,
`localExport: full_text`, `publicRedistribution: prohibited`. These match the
GovInfo profile as the launch packet specifies. Because reuse terms were not
located, the effective boundary for this run is stricter than the profile's
local-display value: the acquisition stores bytes and records identity; no
display, excerpt or export of these two objects is produced by this run.

## Gaps

- No court-stated reuse, copyright or public-domain statement was located for
  either host; the profile review therefore rests on the courts being the
  originating publishers and on the fail-closed no-output boundary above.
- The Western District site returned HTTP 403 to one automated fetch of a
  guessed `/privacy-policy` path before the linked `/privacy` page was found;
  the runner's request to the document URL may be refused the same way. A 403
  would be recorded as a failed receipt with no retry.
- Neither datastore provides a discovery or currentness contract; nothing here
  supports a court-coverage claim.

## Priority and status

Reviewed for the D-069 bounded acquisition only; not admitted. The profile
review expires 2026-10-15. Gates: `G-J` per document; `G-BIA-IDENTITY` before
any Nation association; the existing court-source gates are unchanged.
