# Keys and access

Which services Policy Sentinel needs a key or an agreement for, where each
credential lives, who may obtain one, and how keys are added, rotated and
revoked. It is written for ATNI Climate and for any Nation or organization that
runs its own copy. No key, token or password appears in this file or anywhere
in the repository.

## Rules that do not change

- The browser never holds a key and never calls a provider directly. Keyed
  calls go through the demo Worker, which holds the key as a Cloudflare secret.
- No key in source code, commits, fixtures, logs, source maps, build output or
  documentation. Local secret files (`.env`, `.dev.vars`) stay outside version
  control.
- Registering a key or account, accepting a provider's terms, spending money,
  deploying the Worker and rotating a production secret each need an explicit
  owner decision (AGENTS.md safeguard 6). Each is recorded in
  [the decision register](decision-register.md).
- Read a provider's current terms before first use and record them in a source
  note under [source-reviews](source-reviews/) (safeguard 5).
- Development tools (Jev and Parallel, D-114) use their own keys from the
  developer's environment only. Their code stays in `scripts/dev-ai/`, and
  nothing public depends on them.

## Inventory

| Credential | Used for | Where it is held | Status |
| --- | --- | --- | --- |
| api.data.gov key | GovInfo and Congress.gov (and Regulations.gov when switched on) through the demo Worker | Cloudflare Worker secret `DATA_GOV_API_KEY` | Registered by the owner under D-093 on a personal account; to be replaced by a program-account key before pre-release (below) |
| Shared key allowance | Protects the provider's limit for all visitors | Worker rate limit `KEY_RATE`, 15 keyed calls a minute shared by everyone (`worker/wrangler.toml`) | In force |
| Visitor allowance | Protects the Worker | Worker rate limit `RATE`, 60 calls a minute per visitor | In force |
| api.data.gov `DEMO_KEY` | Bounded development probes only | Public value, no storage | Never used by the live page |
| Cloudflare account | Deploying the `policy-sentinel-demo` Worker (`npm run demo:worker:deploy`) | Owner's Wrangler login | Each deployment needs owner approval |
| GitHub account | Repository, pull requests, Pages (served from `main`) | `gh` CLI login | Each push, merge and publication needs an owner command |
| Oregon Legislature Open Data Service | Oregon measures and committees (OData) | No key; an acceptable use agreement | Accepted for ATNI on 2026-11-05 (D-119, [note](source-reviews/oregon-olis-odata-aua-2026-11-05.md)) |
| SAM.gov API key | Assistance Listing authorizations | Not registered | No personal key for 0.9.1; a public bulk file is checked instead |
| TypeSafe (Jev) key | Development judgments only | Developer environment variable `TYPESAFE_API_KEY` | Development only (D-114) |
| Parallel key | Development source research only | Developer environment variable `PARALLEL_API_KEY` | Development only (D-114) |

Keyless sources used today or planned: Federal Register, Grants.gov, the
Washington Legislature (bill files; web services pending approval), the U.S.
Code from the Office of the Law Revision Counsel and eCFR (both pending their
terms read), and Supreme Court slip-opinion feeds (pending approval).

## Adding a new key

1. The owner decides the source is needed and reads its current terms; the
   decision and a source note are recorded before registration.
2. Register under the program account (below), never under a personal
   address once the program account is in use.
3. Store it as a Worker secret, from the repository root:
   `npx wrangler secret put <NAME> --config worker/wrangler.toml`. For local
   Worker development, put it in `worker/.dev.vars`, which is never committed.
4. Add a rate limit binding in `worker/wrangler.toml` when the provider limits
   the key, so all visitors share it fairly.
5. Make one bounded live call, keep the trimmed response shape as a synthetic
   fixture, and deploy only with the owner's approval of that deployment.

## Moving to the program account before pre-release

Before the 0.9 pre-release is presented to ATNI, every service key will be
registered to climate@atnitribes.org, the ATNI Climate program account, so no
key depends on one person.

1. Register a new api.data.gov key under the program account.
2. Replace the Worker secret with `wrangler secret put DATA_GOV_API_KEY` and
   deploy with the owner's approval; record the Worker version and the rollback
   version.
3. Make one bounded keyed call through the Worker to confirm it works.
4. Revoke the old personal key at the provider.
5. Record the change in the decision register and update this file.
6. Where a service allows it, move account ownership (Cloudflare, GitHub
   organization roles, provider agreements such as the Oregon agreement) to the
   program account or record that it stays with a named role.

## Running your own copy

A Nation or organization that runs Policy Sentinel uses its own credentials,
never ATNI's:

- Get your own api.data.gov key and store it in your own Worker as above.
- Provider agreements are made by each client. If you use the Oregon
  Legislature Open Data Service, accept its agreement yourself.
- The local build can run without any key; keyed sources then show as not
  available rather than empty.

## If a key may have leaked

Revoke it at the provider first, store a new key as the Worker secret, deploy
with the owner's approval, confirm with one bounded call, and record what
happened and when in the decision register. Do not try to remove the key from
Git history without a separate owner decision; revocation is what makes it safe.
