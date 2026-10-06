# Live demo status

Written 2026-10-06 so a later session can continue. Owner rulings: D-083 and
D-084 in [the decision register](decision-register.md).

## What is live

- Page: <https://atniclimate.github.io/policy-sentinel/> (GitHub Pages, `main`
  `/docs`, legacy build). Source in `demo/`, built by `npm run demo:build` into
  `docs/index.html`, `docs/demo-assets/` and `docs/.nojekyll`.
- Worker: <https://policy-sentinel-demo.atniclimate.workers.dev> (Cloudflare account
  of patrickfreeland@atnitribes.org). Source in `worker/`; deploy with
  `npm run demo:worker:deploy`. Version at last deploy: `180deb6c-e72b-4eea-861c-51aa3259ce99`.
  Observability off, rate limit binding `RATE` (30 per 60 seconds) plus an in-memory guard.
- Live sources: Federal Register (search, official text from GovInfo, issues,
  SHA-256 receipt) and Washington Legislature (bill lookup by number, for example
  `HB 1100`, text from `lawfilesext.leg.wa.gov`).
- Embed: `?embed=1`. Local Worker for testing: `?api=http://127.0.0.1:8787` on localhost.

## What is pending

GovInfo, Congress.gov and Regulations.gov are written and switched off until one
api.data.gov key exists as a Worker secret. They were not tested against the real
APIs (no key was available); the response normalizers are defensive and covered by
unit tests with invented payloads only. Policy text is not read for those three
sources, so they show citations and no issues. To enable them:

```powershell
npx wrangler secret put DATA_GOV_API_KEY --config worker/wrangler.toml
```

Oregon and Idaho are shown as "not available" (agreement and credentials not
accepted; no machine-readable source), per `docs/source-feasibility.md`.

## How issues are found

`src/pipeline/policy-text.mjs` (Sentinel's own extractor) reads the official
rendition and drops contact and location blocks. `src/demo/rules.ts`
(`demo-rules-1.0.0`) then applies deterministic checks: consultation wording,
Tribal wording, dates and deadlines, cross-references, status signals, and absence
of consultation wording in a rule. They are labelled as automated demo rules and are
not Sentinel's curated findings. Sentinel's passage search and findings need a built
analyzed corpus and were not wired to live text.

## Checks run

- `npx vitest run tests/demo`: 33 passed (rules, Worker, PDF).
- `node scripts/verify-demo-browser.mjs`: 19 of 19 passed against the deployed
  Worker from a local copy of the page (search, issues, annotation, PDF text checked
  with `pdftotext`, axe WCAG A/AA, 390 and 320 px, embed). Screenshots at 1280 and 390 wide.
- `typecheck`, `validate:roadmap`, `validate:backbone`, `scan:source`,
  `validate:runtime`, `hooks:test` (18 of 18) pass; `lint` passes after the last
  commit (one unused-directive warning fixed).
- `npm run test:unit` at the starting commit (before any change) had 5 failures,
  all timeouts of 5 seconds or more under load: `tests/pipeline/pipeline.test.ts`,
  `tests/experimental/spatial/schema-runtime-parity.test.ts`,
  `tests/kernel/lifecycle/projection.test.ts` (1) and
  `tests/contracts/washington-lws/canary-observer.test.ts` (2). Two reproduced when
  rerun alone. 1617 passed. The full suite was not rerun after the demo changes.
- `format:check` flags `.claude/settings.local.json`, which is not part of this work.

## Unfinished

1. Run the full `npm test` on a quiet machine and compare with the five baseline timeouts.
2. Verify the page on the live Pages URL with
   `node scripts/verify-demo-browser.mjs --url https://atniclimate.github.io/policy-sentinel/ --out <folder>`.
3. Add the api.data.gov key and test the three keyed sources for real.
4. The Worker has not been checked under the free plan CPU limit with the largest
   documents (tested up to about 270,000 characters, a few hundred milliseconds).
5. LICENSE: the earlier Python project's Apache-2.0 file was removed in the merge
   with it (see D-084); the owner should choose the license for this project.
6. Embedding in the TERRA showcase is not done.
7. The 36 untracked `docs/*.md` working-tree files belong to other work and are
   not committed.
