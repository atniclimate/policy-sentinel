# Regulations.gov v2 fields: docket lookup, type filter, comment dates

Access date: 2026-10-23 (Pacific); the calls ran at 2026-10-24 00:48 UTC. This
note covers the three demo Worker paths held behind `REGULATIONS_V2_CONFIRMED`
in `src/demo/search-contract.ts`. It opens no engine source gate and changes no
deployment. The flag stays `false`: the terms page could not be read (below).

## Originating URLs

- <https://open.gsa.gov/api/regulationsgov/>: read directly.
- <https://api.data.gov/docs/developer-manual/>: read directly (rate limits).
- <https://www.regulations.gov/api-terms-of-service>,
  <https://www.regulations.gov/user-notice> and <https://www.regulations.gov/>:
  HTTP 403 to automated reads (WebFetch and a plain Node fetch). No bypass was
  tried.
- <https://catalog.data.gov/dataset/regulations-gov-api>: GSA publisher, access
  level public, no license or terms link, modified 2022-07-11.
- `https://api.data.gov/terms/`: HTTP 404. The api.data.gov pages link only to
  website and privacy policies, not to API terms.

## Later read through Parallel Extract (same day, D-114)

- <https://www.regulations.gov/user-notice> read through Parallel Extract:
  "Information presented on this website is considered public information and
  may be distributed or copied." It also says inclusion or exclusion of
  material "has no independent legal significance" and points to the official
  Federal Register edition to verify status and comment requirements.
- <https://www.regulations.gov/api-terms-of-service> renders no text even
  through Parallel Extract (a client-side page). It stays unread.

## Terms

- The developer page's Terms of Participation govern the Comment API (POST):
  "By registering for, receiving and using a key to the Comment API, the key
  holder agrees to the following terms." It names no separate GET terms and no
  attribution, display, disclaimer or last-updated requirement.
- The API terms of service page is still unread on the primary site. A copy on
  a third-party government site (data.palmcoastgov.com, currency unconfirmed)
  asks redistributors to show a "last updated" date near the content, to state
  that the government is not accountable for derived analyses, and not to use
  agency logos. Product copy must not rely on that copy.
- Nothing read limits showing document types or comment dates as source
  metadata. Comment dates stay source wording, never a computed deadline.

## Fields (as the Worker reads them)

`GET https://api.regulations.gov/v4/documents` returns `{data, meta}`. Rows are
`{type, id, attributes}`. The Worker reads `id` and the attributes `title`,
`agencyId`, `documentType`, `postedDate`, `frDocNum`, `docketId` and
`commentEndDate`, and `meta.totalElements`.

- `commentEndDate`: a string or null. Every stated value was a UTC instant at
  23:59:59 Eastern: `2026-11-24T04:59:59Z` in winter, `2025-06-22T03:59:59Z` in
  summer. Its UTC date is the day after the Eastern closing day. The Worker
  withholds UTC instants rather than show a late date, so with the flag on every
  stated date would read "states a comment closing time that this demo does not
  show". Showing the Eastern day needs the owner's ruling.
- `postedDate`: `2026-10-23T04:00:00Z` (midnight Eastern); its first ten
  characters are the Eastern date.
- `docketId`: a string or null (two of ten Proposed Rule rows had null).
- `frDocNum`: a string; one 1997 row carries an en dash (`97`, U+2013, `5879`), which the
  match key rejects.
- `filter[docketId]` matched exactly: both documents of `USCG-2024-0407`.
- `filter[documentType]` as the Worker encodes it (`Proposed+Rule`, `Rule`,
  `Notice`) returned only that type in every row; `Rule` excludes
  `Proposed Rule`.

The trimmed rows are `REGULATIONS_LIVE_DOCKET_ROWS` and
`REGULATIONS_LIVE_TYPE_ROWS` in `tests/demo/fixtures.ts`.

## Authentication, limits, CORS, cadence, failures

- Authentication: an api.data.gov key in the `X-Api-Key` header. The calls used
  the public `DEMO_KEY` in that header, never in the URL.
- Limits: api.data.gov defaults to 1,000 requests per hour per key; `DEMO_KEY`
  is 30 per IP per hour and 50 per day. Regulations.gov answered
  `X-RateLimit-Limit: 10` for `DEMO_KEY`. Counters reset on a rolling hour; no
  `Retry-After` was sent. Over the limit is HTTP 429 `OVER_RATE_LIMIT`.
- CORS: `Access-Control-Allow-Origin: *`. The browser still never calls the
  provider (safeguard 5).
- Cadence: rows posted the same day appeared; no update schedule is published.
- Failures: 403 for a missing or invalid key, 429 over the limit. The Worker
  shows any non-200 as unavailable, never empty.

## Calls made (4 of a budget of 6, sequential, no retry)

| UTC | Path (key in header) | Status | Remaining |
| --- | --- | --- | --- |
| 00:48:09 | `filter[searchTerm]=tribal`, `filter[documentType]=Proposed Rule` | 200 | 9 |
| 00:48:39 | `filter[docketId]=USCG-2024-0407` | 200 | 8 |
| 00:48:45 | `filter[searchTerm]=tribal`, `filter[documentType]=Rule` | 200 | 7 |
| 00:48:50 | `filter[searchTerm]=tribal`, `filter[documentType]=Notice` | 200 | 6 |

Each also sent `page[size]=10`, `page[number]=1` and `sort=-postedDate`. The
log is at `C:\dev\_scratch\policy-sentinel\regs-v2-20261023\calls.jsonl`.

## What remains

1. Read the API terms of service on the primary page, for example through the
   owner's browser as the Federal Register documentation was read on
   2026-10-20.
2. Owner ruling: show `commentEndDate` as its Eastern calendar day, or keep it
   withheld.
3. Then set `REGULATIONS_V2_CONFIRMED` to `true`. With it on, the focused tests
   pass (checked 2026-10-23 with the flag set temporarily).
