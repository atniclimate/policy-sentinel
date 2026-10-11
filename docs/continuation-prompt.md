# Continuation prompt

This page stays at this path because other documents and tools link to it. It is short on purpose.

The working set for a fresh session is now three files:

1. [`AGENTS.md`](../AGENTS.md): what the product is, the safeguards, what needs the owner, how to work, and the commands.
2. [`docs/STATUS.md`](STATUS.md): the current state, what is live, the next step and the open owner decisions. It is overwritten at the end of each session.
3. [`docs/PLAN.md`](PLAN.md): the milestones with their acceptance checks, what needs the owner, and what is deferred.

Start there, run `git status` and `git log --oneline -10`, then read only the code the task touches. The owner's rulings are in the [decision register](decision-register.md). The live demo is in the [demo status](DEMO-STATUS.md).

## Scope-specific startup context (retired)

An earlier rule here required the full ordered read of `ROADMAP.yaml` and the documents it names for general-engine work, and a dependency closure for demo work. D-095 (the owner's direction of 2026-10-10 on demo follow-ups and planning) replaced it with the working set above. `ROADMAP.yaml`, its validators, the operating model and the older handoffs are retained record: read them for a specific fact, not at the start of a session.

## Earlier state narrative

The long current-state narrative that was on this page, through 2026-10-10, is in Git history. Read it with `git show c602468:docs/continuation-prompt.md`.

## Completed grants do not resume

A completed launch, cutoff, handoff or outcome document grants nothing now. Authority for external or irreversible actions comes only from the owner's exact current direction, as `AGENTS.md` sets out.
