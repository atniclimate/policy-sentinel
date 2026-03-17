# [Tribe Name] Policy Sentinel
## Claude Code Project Instructions -- Tribe-Specific Repository

---

## What this repository is

This is the **[Tribe Name]-specific deployment** of the policy-sentinel engine. It contains:
- The organization's policy corpus configuration
- Sovereignty framing and branding settings
- Selected output adapter configuration
- Generated output artifacts

**This repository is private.** It is not forked from policy-sentinel and should never be made public. It consumes the policy-sentinel engine as a dependency.

---

## Repository structure

```
[tribe]-policy-sentinel/
├── corpus/
│   └── corpus.json              <- The organization's policy list (PRIMARY FILE)
├── config/
│   ├── sovereignty.json         <- Rights frame, branding, language settings
│   ├── state_machines.json      <- Per-category status transitions
│   └── templates/               <- Override Jinja2 templates
├── output/                      <- Generated artifacts
│   ├── documents/               <- PDF/DOCX briefings
│   ├── app/                     <- Built dashboard
│   └── component/               <- Web component bundle
├── reviews/                     <- Weekly review logs
├── pyproject.toml
├── main.py                      <- Entry point
└── CLAUDE.md                    <- This file
```

---

## Engine dependency

This repo uses policy-sentinel as a pip dependency:

```toml
# In pyproject.toml
[project]
dependencies = [
    "policy-sentinel @ git+https://github.com/atniclimate/policy-sentinel.git@main",
]
```

To update the engine:
```bash
pip install --upgrade "policy-sentinel @ git+https://github.com/atniclimate/policy-sentinel.git@main"
```

If a feature is missing from the engine, open a PR to the policy-sentinel repo. Do not reimplement engine logic here.

---

## Corpus file

`corpus/corpus.json` follows the `CorpusConfig` schema from policy-sentinel.

**Sovereignty classification of this file:**
- Policies drawn from public federal/state sources: T0/T1 (can be shared)
- Tribal code references, internal governance documents: T2 (share only with consent)
- Sensitive Tribal data, unreleased documents: T3 (never leaves this environment)

The corpus file should be tagged at the highest classification level it contains.

---

## Running

```bash
# Set up the environment
make setup

# Run the policy sentinel
python main.py

# Run with automated web status queries (requires network)
python main.py --query-status

# Generate output
python main.py --adapter document
```

---

## Sovereignty instructions for Claude Code

When working in this repository:

1. **Corpus data stays local.** Do not send corpus content to any external API, logging service, or analytics endpoint. The engine's `query_policy_status` hook queries public sources using only the public `doc_id` -- never the full corpus record.

2. **Rights framing is in `config/sovereignty.json`.** Alert language and summary generation should use the sovereignty frame value in that file. Do not override or neutralize sovereignty framing in generated outputs.

3. **T2/T3 content.** If any corpus entries are classified T2 or T3, those entries must not appear in any output that leaves the local environment without explicit authorization.

4. **Engine changes go upstream.** If a capability is missing, open a PR to policy-sentinel. Do not duplicate engine logic in this repo.

---

## Contact

[Organization name]
[Contact for this deployment]
[ATNI Climate Resilience Program liaison, if applicable]
