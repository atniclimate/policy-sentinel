# Federal Register: agency and topic lists, and the executive order lookup

Accessed: 2026-11-18 (Pacific). This note adds to
`federal-register-api-2026-09-02.md`; that review still describes the service.

Standing rule (D-136, 2026-11-06): the keyless API reading is the rule for
this source. Acronym searches within the D-130 budget and the official agency
and topic list fetch are allowed within stated budgets. No National Archives
or Office of the Federal Register seal or logo is ever shown.

## Documentation read

The deployed OpenAPI document,
https://www.federalregister.gov/api/v1/documentation.json, read 2026-11-18.
The developer page written for people redirects an automated reader to an
access notice, so it was not read again; its wording was recorded on
2026-11-06.

## Agency and topic lists (suggestions)

Owner approval of the fetch: D-180 (2026-11-18), two requests.

- `GET https://www.federalregister.gov/api/v1/agencies`: a list. Used: `slug`,
  `name`, `short_name` and the parent agency's slug. Not used: descriptions,
  addresses, numeric ids, logos.
- `GET https://www.federalregister.gov/api/v1/documents/facets/topic`: an
  object keyed by topic slug. Used: the slug and `name`. Not used: counts.

Fetched 2026-11-19 06:54:34 to 06:54:36 UTC by
`scripts/acquire-demo-index.mjs vocab`, 1.1 seconds apart, no retry; the agency
list was fetched once more at 07:48:57 UTC after the review. Kept in
`docs/demo-data/vocab/`: 466 agency names and 888 topic names. The Nation-name
check left out 6 agency names and 12 topic names; it is deliberately broad, so
it also leaves out plain official names such as the topic "Indians" and names
holding "Community" or "Islands". One more agency name is held out by a hashed
list in `scripts/demo-index/vocab.mjs`: it includes two Nations' everyday
names, which the probes (built from full official names) do not catch, and the
owner has not named it in (D-186). The lists carry no as-of date; the manifest
records when they were retrieved. Rights wording in the manifest is the About
page sentence the owner read on 2026-11-06: "Any person may reproduce or
republish any material appearing in any regular or special edition of the
Federal Register (1 CFR 2.6)."

Named in on 2026-11-19 (D-191, the owner: "I approve now"): the 6 agency names
and 12 topic names above are on a closed list in `scripts/demo-index/vocab.mjs`
and skip only the broad word check. The hashed recognition list, an exact
probe name, the URL, personal-pattern and markup checks still apply to them,
and the held-out agency name stays out (D-192). Both lists were fetched once
more at 10:45:35 and 10:45:36 UTC, no retry: 472 agency names and 900 topic
names, the 18 added and nothing else changed. The first build of that fetch
failed in the validator, which refused the topic id `indians` itself; the files
were rebuilt from the kept downloads after the fix, with no second request.

In 0.9.7, choosing an agency or topic name in the search box only fills the
box with that official wording as search words and filters nothing. From 0.9.8
the page can also narrow a Federal Register search by the same entry, using the
source's own agency or topic condition (D-188).

## Executive order lookup (D-177)

The documented search conditions hold no condition for an executive order
number. The lookup therefore asks for presidential documents of type executive
order that mention the number, and keeps only the rows whose
`executive_order_number` field equals it:

```text
GET /api/v1/documents.json
  conditions[term]=<number>
  conditions[type][]=PRESDOCU
  conditions[presidential_document_type][]=executive_order
  per_page=100  page=1  order=relevance
  fields[]=... executive_order_number
```

One live call on 2026-11-18 for 13175: status 200, 9 documents, one with
`executive_order_number` "13175" (a string): document 00-29003, 65 FR 67249.
The other 8 are later orders that mention the number; the page says how many
listings the lookup left out. Trimmed answer:
`tests/demo/fixtures/federal-register/executive-order-13175.json`.

Limits: the Federal Register API holds documents published from 1994, so an
order numbered below 12890 is not looked up, and the page says it is not
covered in this release. When more orders mention a number than the one
request read, the Worker answers that further pages could not be established,
so the page never shows an order as absent on a partial reading.

## Access

Authentication: none. Rate limits: none stated; one request per lookup, no
retry. CORS: not relevant, the Worker makes the call. Failure behavior: as in
the 2026-09-02 review.
