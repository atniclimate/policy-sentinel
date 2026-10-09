# GD-60 federal probe and local refreshability entry packet

Prepared 2026-10-09 under D-092. This is the next-session work packet, not a
dispatch manifest or evidence that any provider is reliable. Start with the
[GD-57 collection assessment](gd57-federal-expansion-access-reliability-2026-10-09.md),
the [federal source review](../source-reviews/nationwide/federal-2026-10-07.md),
the [GD-31 closed operation packets](gd31-operation-packets.md), and the
[GD-18 storage report](gd18-storage-report-2026-10-07.md). The prior three-document
GovInfo pilot and historical request ceilings do not renew access or authorize
another operation. This preparation makes no provider request, accepts no terms,
registers no key, and acquires no source content.

## Next-session sequence

1. Recheck the originating publisher's current interface, coverage, authentication,
   host policy, rate limits, attribution, use and reproduction terms for each
   *selected* collection. Record the access date and exact URLs. Keep GovInfo
   `PLAW`, `BILLS`, `BUDGET` and `USCOURTS`; Congress.gov bills, resolutions and
   laws; OMB budget books/tables; and issuing-court opinions as separate routes.
   Select a small named population and expected versions before any request.
2. Create a fresh, source-specific manifest for each permitted route. Bind exact
   host/path, query, identifiers, date or fiscal-year/term window, advertised
   format, allowed fields and uses, credential reference (never the value),
   timeout, attempt and byte ceilings including failures and pagination, storage
   forecast, external custody namespace, and stop conditions. The GD-31 limits
   are proposal ceilings only: at most 16 attempts and 128 MiB per named API,
   8 MiB per response, no retry, one concurrent request, four attempts/minute
   and 30 seconds/request. Narrow these after review; do not pool them across
   collections or treat them as dispatch permission. Confirm the current managed
   inventory, per-volume free space and rebuild reservation before approval.
3. Dispatch only a manifest whose source-specific access, rights, credentials
   and storage conditions have actually cleared. `G-B-GOVINFO` and
   `G-B-CONGRESS` remain closed for keyed calls. A directly published document
   or keyless route needs its own current review and cannot satisfy the keyed
   API's acceptance. OMB and court pages are discovery candidates until their
   exact permitted retrieval route is reviewed. Do not probe by inducing 429s,
   scrape an undocumented population, or reuse the spent roadless pilot profile.
4. For each allowed canary, record status, elapsed time, bytes, content type,
   redirects, response/version IDs, update timestamps, pagination cursor and
   termination, rate/retry headers when present, schema/field gaps, checksum and
   source URL. Validate one missing/malformed synthetic response, one duplicate
   or changed-version case, and an offline timeout/5xx/429 simulation. Revisit
   a permitted item after the publisher's stated cadence if that fits a new
   manifest. A handful of successful calls proves only that bounded sample,
   never uptime, complete history or comprehensive coverage.
5. Test recovery against the *same adapter and collection*: use only a
   checksum-validated prior approved shard with its original as-of time and a
   stale/degraded label. Without it, emit an unavailable source/collection and
   no source records. An alternate official interface may be listed as a future
   independently reviewed route, not silently substituted as identical evidence.
   Keep proposed, enacted, slip, final and corrected versions distinct.

The execution owners remain GD-39 (Federal Register API), GD-40 (GovInfo API),
GD-42 (Congress.gov API), and GD-33 (source landscape). Budget-specific and
court-specific intake require the explicit successors proposed in GD-57 before
implementation. The GD-31 five-API claim, GD-27 release and any public artifact
remain unaccepted until their own evidence and gates pass.

## Local refreshable database requirements to decide

The current engine has an immutable, externally owned corpus and local workbench
outputs, with checksum-bound source health and last-known-good logic. A database
would be a local projection over that evidence, not the authority for official
source bytes. First measure whether indexed corpus snapshots already meet the
refresh and query needs; do not add a database solely because more sources exist.

If needed, evaluate a single-file local transactional index (SQLite is a
candidate, not a selected dependency) with these minimum contracts:

- Stable source/collection, instrument and version IDs; official URL, issuer,
  retrieval and publisher timestamps; source-object digest; field-level
  provenance and validation state. Preserve original and normalized identities.
- Idempotent refresh runs with a bounded cursor/window and immutable receipts.
  Stage and validate new rows before one atomic promotion; retain prior accepted
  rows on partial failure. Treat deletions, withdrawals, revised opinions and
  missing pages as explicit observations, not silent row loss.
- Separate public reference data, raw restricted custody and private analyst
  notes. The public build must reject private inputs. Never store provider
  credentials or unrelated raw response fields in the database.
- A collection-level health/LKG record, original as-of timestamp, checksum and
  stale/unavailable state. Search and exports must expose the same version,
  provenance and caveats as the corpus; replay must work with the network off.
- Measured storage for originals, text, indexes, database, write-ahead/temporary
  copies, backups and rebuilds under the 50,000,000,000-byte managed cap and
  per-volume floor. Define schema migration, integrity check, backup/restore,
  locking and crash-recovery tests before accepting a store.

The next session should compare an offline synthetic refresh/query prototype
with the existing file corpus using the same representative versions and failure
cases. Report measured size, refresh time, search time and recovery behavior,
then choose a store or retain the file design. No production database or new
dependency is authorized by this packet.
