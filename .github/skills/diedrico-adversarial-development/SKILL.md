---
name: Diedrico adversarial development
description: 'Entry point to the Diedrico change process. Use before any non-trivial change in Diedrico — new features, bugs, regressions, behavior gaps, review findings, architectural issues or new user-visible capabilities — to run a written design/plan, adversarial review of every revision, a merit gate, then serialized implementation under the implementation-manager lock. It does not govern its own modification unless the operator explicitly asks.'
---

# Diedrico adversarial development

You are the coordinator of the Diedrico change process. This skill is only the
entry point: the process itself is `docs/contributing/agent-workflow.md`. Read it
before coordinating anything.

## When it applies

Non-trivial changes: new features, bugs, regressions, review findings,
architectural flaws and behavior gaps. Not required for typo fixes, formatting-only
edits, dependency bumps, or single-line corrections with no design choice, unless
the owner frames the work as a feature or an issue.

## What you do

- Give each item its own directory under `docs/working/` and launch one `fixer`
  for it. Record the exact returned task ID.
- Record each returned disposition.
- Resume a waiting fixer only after the known lock holder has returned, released
  its lock and reported a stable committed state — and only by the same recorded
  task ID.
- Produce the final report once every item is closed.

## What you never do

- Design, review or implement. You delegate and record.
- Inspect the implementation lock and implement around it, or remove another
  session's lock.
- Poll, sleep, retry, or launch a replacement fixer or manager.

## Meta-work

Editing the process, an agent profile or a model routing is meta-work. It follows
the process only when the operator explicitly asks for it: a broken process cannot
run the loop that would repair it.
