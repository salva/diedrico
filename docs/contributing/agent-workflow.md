# Agent development workflow

Diedrico ships an OpenCode workflow for AI-assisted changes: a written design,
adversarial review of every revision, a merit decision, then serialized
implementation. It applies to new features and fixes alike.

The binding instructions live in the repository, not here:

- `.github/skills/diedrico-adversarial-development/SKILL.md` — the workflow:
  roles, design requirements, review loop, merit gate, freshness check, lock
  protocol, dispositions.
- `.opencode/agents/` — the five agent profiles that implement it.

This page only explains how the parts fit, so a human can review what an agent
did.

## Roles

| Agent | Job | May write |
| --- | --- | --- |
| `fixer` | Owns one item end to end: delegation, triage, merit gate, freshness, read-only reconciliation | `docs/working/` only |
| `designer` | Writes and revises the design/plan | `docs/working/` only |
| `reviewer` | Adversarial review of every plan revision; emits `NO_MATERIAL_FINDINGS` or `MATERIAL_FINDING_FOUND` | `docs/working/` only |
| `implementation-manager` | Sole orchestrator of mutation, validation, staging, commits | repository, under the lock |
| `developer` | Implements tasks assigned by the manager | repository |

A primary session (Build) acts as coordinator and launches one `fixer` per item.
Only `implementation-manager` touches implementation, and only while holding
`.opencode/locks/implementation-manager-working.md`.

All five profiles are pinned to `opencode/deepseek-v4.1-flash-free`. That model
has a usage quota: when it is exhausted, every subagent launch fails until it
resets or you switch the `model:` line in the five files to a paid equivalent
(`opencode-go/deepseek-v4.1-flash`). Changing models requires re-running the
preflight described in the skill.

## Working files

Each item gets `docs/working/<YYYY-MM-DD>-<slug>/` containing `brief.md` (new
features), the current `plan.md`, and one `review-round-<N>.md` per review.

`docs/working/` is Git-ignored and excluded from the VitePress build. Nothing
there is published, committed, or treated as project documentation. Tracked
documentation changes are separate tasks inside the plan.

## What a plan must contain

The full list is in the skill. The parts reviewers check hardest:

- Which layer owns the new behavior, per `docs/architecture/overview.md`.
- One logical user action stays one command, so undo/redo remains chronological.
- Persistence impact: affected `opType` set, `schemaVersion` decision, registry
  registration, replay validation, round-trip test into a fresh `World`.
- Documentation updates as implementation tasks, not a later phase.
- Validation proportional to risk: focused Vitest files, architecture tests
  affected by boundary changes, and which root gates apply.

## Gates

1. **Review closure** — no confirmed material finding remains.
2. **Merit** — `WORTH_IMPLEMENTING`: solves the problem at the owning layer, is
   net simpler, follows `AGENTS.md`, and stays in scope. Review closure alone
   never authorizes implementation.
3. **Freshness** — the plan still matches current `HEAD` and the worktree,
   checked immediately before implementation.
4. **Lock** — the manager serializes all mutation. A second manager reports
   contention and performs no work.

## Validation

The manager runs what the plan requires, using root scripts:
`npm run validate:routine`, `npm run lint`, `npm run validate:docs`,
`npm run test:e2e`, or focused `npm run test --workspace=frontend -- <pattern>`.
See [Testing](testing.md).

## Changing the workflow

Workflow edits go through the workflow: write the plan, have the reviewer
attack it, then implement. For skill or agent-prompt edits, also follow the
OpenCode frontmatter conventions and keep this page aligned with what the files
actually say.
