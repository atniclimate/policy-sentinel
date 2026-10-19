# Court opinion references for the NCAI panel

Accessed: 2026-10-19

Implementation state: demo-only GovInfo searches of two court collections
through the existing demo Worker, plus outbound CourtListener and NILL links
the reader opens; no engine source, adapter, acquisition or new Worker host

External authorization: D-093 (owner ruling of 2026-10-10 switching on GovInfo,
Congress.gov and Regulations.gov in the demo) and D-105 (owner ruling of
2026-10-19 on the NCAI 2026 draft resolutions). The GovInfo source profile for
engine acquisition expired 2026-10-05; this use reopens no engine gate. No
CourtListener account, token or API call.

## Primary sources

- [GovInfo help: United States Courts Opinions](https://www.govinfo.gov/help/uscourts)
- [GovInfo help: United States Reports](https://www.govinfo.gov/help/usreports)
- [GovInfo API README (usgpo/api)](https://github.com/usgpo/api)
- [GovInfo policies](https://www.govinfo.gov/about/policies)
- [CourtListener REST API v4](https://wiki.free.law/c/courtlistener/help/api/rest/v4/rest-api-v47)
  and [search API](https://wiki.free.law/c/courtlistener/help/api/rest/v4/search)
- [CourtListener federal cases and filings coverage](https://wiki.free.law/c/courtlistener/help/data-coverage/federal-cases-and-filings)
- [PACER](https://pacer.uscourts.gov/)
- [NILL Tribal Law Gateway](https://narf.org/nill/triballaw/index.html)
  and [NILL disclaimer](https://www.narf.org/nill/about/disclaimer.html)

The GovInfo collections are the federal government's official publication of
these opinions. CourtListener and NILL are not official court sources.

## GovInfo USCOURTS

The help page describes opinions "from selected United States appellate,
district, and bankruptcy courts" and select national courts such as the Court
of International Trade. Content "dates back, generally, to 2004," holdings for
some courts may be incomplete for that earlier period, and older opinions
appear "on a select and non-comprehensive basis." The help page does not
mention Supreme Court, state or Tribal courts. The director recorded the start
as generally April 2004; the help page read on 2026-10-19 says only 2004.

Opinions in cases still open appear when the court publishes them. GovInfo is
not a docket list. GPO "can only remove an opinion at the direction of the
court." No update schedule is published.

## GovInfo USREPORTS

The help page says the Supreme Court's cases "are published officially in the
United States Reports," compiled for the Court by the Reporter of Decisions.
The collection holds volumes 2 (1790) "through volume 586 (2018)"; volume 1 is
excluded. Later volumes are added as published, and the page points to the
Supreme Court's own site for volumes 502 to the present. Recent Supreme Court
opinions are therefore not in USREPORTS on GovInfo.

## Query form and live checks

The panel composes `collection:USCOURTS AND <words>` and
`collection:USREPORTS AND <words>` from words named in a draft title, and sends
them through the demo Worker to `api.govinfo.gov`, a host already allowlisted.
As recorded by the director, one request each on 2026-10-19:

- `collection:USCOURTS AND "Native American Housing Assistance and
  Self-Determination Act"` reported 35 matches, all USCOURTS.
- `collection:USREPORTS AND "Indian Child Welfare Act"` reported 4 entries,
  including Mississippi Band of Choctaw Indians v. Holyfield, 490 U.S. 30
  (1989).

## Access, authentication, rate limits and CORS

The API "requires the use of an API.data.gov key," held only as a Worker
secret; the page never holds a key. The README's default limits are 36,000
requests per rolling hour, 1,200 per minute and 40 per second, with
`X-RateLimit-Limit` and `X-RateLimit-Remaining` headers, 401 `API_KEY_MISSING`
and a 429 section. Reset and retry behavior is not documented. The browser
makes no GovInfo request, so CORS is not relied on (see
`govinfo-api-2026-07-31.md`).

## Reuse and attribution

GovInfo's policies say United States government works are not subject to
copyright, while publications "may contain copyrighted material which was used
with permission of the copyright owner." The panel shows result metadata and
GovInfo links only, attributed to GovInfo and the issuing court, and copies no
opinion text. GPO collects IP address, user agent and pages viewed for
statistics.

## CourtListener outbound links

The panel offers two links the reader opens in a new tab:
`https://www.courtlistener.com/?q=<words>&type=o` (opinions, all courts) and
`&type=r` (federal dockets in the RECAP archive). Both forms were opened in a
browser on 2026-10-19 and returned results, as recorded by the director. The
search words reach CourtListener only when a link is opened.

Free Law Project's coverage page says the RECAP archive is filled with PACER
purchases sent by the RECAP extension, its own purchases for client projects
and its bots, plus metadata for new district and bankruptcy cases from court
feeds where courts enable them. It describes the goal as collecting "any PACER
data that we can"; it does not claim any one case or filing is present. Pending
federal cases appear only to that extent. PACER is the official federal docket
system; as read on 2026-10-19 it requires an account and charges $0.10 per
page, capped at $3.00 per document, with quarterly charges of $30 or less
waived, and it announces a fee change effective 2027-01-01.

The CourtListener API needs a token, limits authenticated users to 5 requests
per minute, 50 per hour and 125 per day, and logs API queries. Policy Sentinel
uses none of it. As recorded by the director, CourtListener returns 403 to
automated page fetches, so its own pages were read only through wiki.free.law.

## NILL Tribal Law Gateway outbound link

The Gateway is linked outward only. It states that a Tribal Nation's
permission to share in NILL's collection "does not serve as implied consent to
use the materials in any other way," that use in another database needs the
Nation's separate permission, and that NILL "will deny requests that appear to
be frequent or systematic." Its disclaimer makes no warranty of completeness
and says NILL does not provide legal advice. That wording is on the Gateway
page, not on NILL's collection policy page.

## Failure behavior and limits

A GovInfo error, rate limit or unusable cursor is shown as unavailable, never
as no matches. A count of matches is not a count of cases. Results are text
matches; the interface says a match is not a finding that a case is relevant,
controlling or still good law, and no case is linked to a Nation (safeguards 1
and 2). Neither collection covers state or Tribal courts.

## Open items

- Renewing the expired GovInfo source profile before any engine use of these
  collections.
- Any CourtListener account, token or Worker host needs a separate owner
  decision and source review.
