# Library of Congress: Statutes at Large volume items (Tier 2 row N6, link target)

Accessed: 2026-11-05 (raw follow-up fu1 and lane treaties-historic of the Full
0.9 planning swarm). Owner answer N6 (D-124): the Library of Congress volume
item (`https://www.loc.gov/item/llsl-v<NN>/`, rights text verbatim) is approved
as the link target for an exact Statutes at Large volume; the reviewed treaty
table is deferred until one exists to review.

## What it is

The Law Library of Congress digitization of the United States Statutes at
Large, one item per volume, in the collection
https://www.loc.gov/collections/united-states-statutes-at-large/ (the
collection record lists 64 digitized volumes). Volume items carry page-level
segments and a PDF. It is an archive rendition of a Government publication,
not the originating publisher; GovInfo's STATUTE collection is the
publisher-side rendition (its link service syntax is unverified, so it is not
used as a target).

## Fields used

Per volume item, from the item's JSON (`?fo=json`): `item.title` (such as
"Vol 11 (1856-1857)") and `item.rights`, shown verbatim beside the link. Nothing
else is stored. No treaty title, Nation, state or region field exists in this
use; the link is offered only for a citation found in text with an exact
volume and start page (`citation_in_text`), and the page names no relation.

## Rights wording seen (raw bytes, 2026-11-05)

- Volume 11 item: "The vast majority of the U.S. Statutes at Large is in the
  public domain as a work of the U.S. Government. However, where the U.S.
  Statutes at Large reprints copyrighted material, copyright protections may
  apply..." (truncated in the evidence note; the full value is read again on
  the bounded call below).
- Volume 30 item: "No known restrictions on use or reproduction."
- Rights differ by volume, so the page shows a volume's own rights text only
  when it was read; otherwise it says to read the rights statement on the
  item page.

## Access, limits, failure

- Authentication: none. Rate limits: none numeric documented; the HTML about
  page answered 403 to an automated fetch, while the JSON path answered 200.
- The page links to the item; no call is made from the page or the Worker for
  a link. A build-time read of an item's rights uses one request per volume.
- Bounded live calls for this row (0.9.1 build): one item JSON (volume 7, the
  volume most cited for treaties), after this note, no retry.
- Failure: a non-200 answer or a missing `item.rights` leaves the link with the
  "read the rights statement on the item page" sentence; never an invented
  statement.
