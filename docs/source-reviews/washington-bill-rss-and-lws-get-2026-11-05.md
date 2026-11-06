# Washington Legislature: per-bill RSS and LWS over HTTP GET (Tier 2 row N10)

Accessed: 2026-11-05 (evidence of the Full 0.9 planning swarm, raw follow-up
fu1 and lane washington-law). Owner answer N10 (D-124): yes for
`app.leg.wa.gov` and `wslwebservices.leg.wa.gov`, per-bill RSS, bill status
and `GetRcwCitesAffected` over HTTP GET; no statewide call in the Worker.
Earlier review: `washington-lws-2026-07-31.md` (SOAP 1.1 contracts; its open
question about preferring GET for reads is settled by N10).

## Per-bill RSS

- Documentation: https://leg.wa.gov/bills-meetings-and-session/bills/how-to-track-a-bill/bill-tracking-with-rss-feeds
  ("one feed per bill" for every bill introduced, and topic feeds).
- URL form: `https://app.leg.wa.gov/billsummary/Home/Rss/{number}/{year}/{House|Senate}/False`,
  where `year` is the first year of the biennium (2025 for 2025-26) and the
  last segment is the initiative flag.
- Shape seen (2026-11-05): RSS 2.0 with an Atom self link; channel title such
  as "WA Leg - HB 1001"; items titled "01 - December 2, 2024 - Prefiled for
  introduction.", numbered in order, with a link to the bill summary, a guid
  and a `pubDate` carrying a date with a Pacific offset; amendments appear by
  name, unnumbered; no `ttl` and no copyright element.
- Terms, exact: "The feeds are provided free of charge and you may subscribe to
  any number of feeds to track the bills that interest you." and "it might be
  necessary for us to place some limits on feeds if the volume and frequency of
  feed updates becomes too high."
- Use: a follow of one bill, checked only when a person presses "Check for new"
  (at most 10 checks per press, never on page load). It cannot discover new
  bills.

## LWS over HTTP GET

- Host `wslwebservices.leg.wa.gov`, the documented `.asmx/<Operation>?...` GET
  binding, plain XML in namespace `http://WSLWebServices.leg.wa.gov/`.
- Bill status: `legislationservice.asmx/GetLegislation?biennium=2025-26&billNumber=<n>`.
- RCW sections a bill affects: `legislationservice.asmx/GetRcwCitesAffected?biennium=2025-26&billId=<id>`
  (the source-stated bill-to-RCW relation, one biennium per call).
- Seen 2026-11-05: `rcwciteaffectedservice.asmx/GetLegislationAffectingRcwCite`
  answered `ArrayOfLegislationInfo` (BillId `HB 2281` and `SHB 2281`). Status
  values carry trailing spaces; the raw value is kept and trimmed only for
  display.
- Substitute bills (SHB, ESSB and similar) collapse to the base bill number for
  a follow; the biennium is carried in the follow value.
- Not used in the Worker: `GetLegislativeStatusChangesByDateRange` (a one-day
  window answered about 1.3 MB with 3,181 rows), and every other statewide call.

## Access, limits, failure

- Authentication: none. Rate limits: none numeric documented; the Worker makes
  one call per press and caches by bill and biennium.
- CORS: not relevant; the Worker calls, never the page.
- Failure: LWS throws for an invalid biennium or citation; any non-200 answer,
  wrong content type or unparseable XML is shown as unavailable, never as "no
  changes".
- Rights: no redistribution license beyond the feed sentence above; bill text
  republication rights are unchanged from the July review (not granted). The
  page shows status lines and links, not bill text.
- Bounded live calls for this row (0.9.1 build): one per URL form above, after
  this note, no retry.
