# OLRC Table of Acts Cited by Popular Name (law alias source)

Accessed: 2026-11-18 (Pacific). Owner approval of this use: D-134 (OLRC terms
accepted for the alias fetch, 2026-11-06), D-181 (the fetch, 2026-11-18) and
D-184 (the 143 rows, 2026-11-18).
Terms reading: the 2026-11-06 review of uscode.house.gov (no terms page; the
robots file blocks only one named crawler; visits are logged under the privacy
policy).

## What it is

The United States Code Table of Acts Cited by Popular Name, kept by the Office
of the Law Revision Counsel of the U.S. House of Representatives. One HTML page
lists each popular name with its public law or act date, its Statutes at Large
citation and, where the act is classified mainly to one part of the Code, a
U.S. Code citation.

- Address: https://uscode.house.gov/popularnames/popularnames.html
- The older address ending `popularnames.htm` answers 404 (one request on
  2026-11-18, not retried). `config/law-aliases.v1.json` names the current one.
- The site said on that day that it was "currently operating in a temporary
  format" and that the Code online was "current through Public Law 119-142
  (November 10, 2026)".

## The one fetch

One GET on 2026-11-19 06:56:50 UTC: status 200, `text/html`, Last-Modified
2026-11-13 20:57:50 GMT, 8,156,075 bytes, SHA-256
`701d9c90311a8595f3f84a05f4114c41e8ee675761b597b66f396763b3394996`, 13,670
entries, every entry marked release point 119-142. The raw page stays outside
the repository; the trimmed shape is the test fixture
`tests/demo/fixtures/demo-index/olrc-popular-names-trimmed.html`.

## Fields used

From each entry: its anchor id, the popular name, and the U.S. Code citation
printed in a `cite` line's parentheses or, failing that, in the `short-title-ref`
line ("Short title, see ... note"). A `see` line is followed one step. Not
used: public law numbers, dates, Statutes at Large pages, `also-known-as` and
`renamed` lines.

A row enters the alias table only with the table's exact wording
(`scripts/build-law-aliases.mjs`, no network). The popular name is the
official name, never a nickname from another source; a name the Nation-name
probe or the treaty-word check flags stays out until the owner names it in
(D-142), and the review table says which rows were named in. A classification
in this table is the Office's editorial placement; a row states where the
table points and nothing about legal effect. Some rows still print a
classification from before a title was restated (the table's own wording);
the page links the Office's section page, which shows the current state.

An acronym is carried only where a Federal Register document's own title or
abstract prints "<name> (<ACRONYM>)": 41 keyless searches on 2026-11-18 under
D-130 and D-136, 26 acronyms kept, each with the document's short address.

## Access

- Authentication: none. No key, account or click-through.
- Rate limits: none stated. This use is one request per address, at least one
  second apart, no retry.
- Reuse: no restriction found on the pages read on 2026-11-06. The table is a
  work of the federal government (17 U.S.C. 105). The page names the Office of
  the Law Revision Counsel as the source; no seal or logo is used.
- Cadence: the page is regenerated with the Code's release points. A refresh
  is one new fetch, a rebuild and the owner's review of changed rows.
- CORS: not relevant. The fetch runs in a session; the page never calls OLRC.
- Failure behavior seen: a moved address answers 404 with the site's own
  navigation, which names the current address.
