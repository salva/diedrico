# Agent development workflow

Diedrico ships an OpenCode workflow for AI-assisted changes: a written design,
adversarial review of every revision, a merit decision, then serialized
implementation. It applies to new features and fixes alike.

The binding instructions live in the repository, not here:

- `.github/skills/diedrico-adversarial-development/SKILL.md` — the workflow:
  roles, design requirements, review loop, merit gate, freshness check, lock
  protocol, dispositions.
- `.opencode/agents/` — the seven agent profiles that implement it.

This page only explains how the parts fit, so a human can review what an agent
did.

## Roles

| Agent | Job | May write |
| --- | --- | --- |
| `fixer` | Owns one item end to end: delegation, triage, merit gate, freshness, read-only reconciliation | read-only |
| `designer` | Writes and revises the design/plan | `docs/working/` only |
| `reviewer-1` | Adversarial review of every plan revision: correctness, root cause, layer ownership, scope, merit, persistence; emits `NO_MATERIAL_FINDINGS` or `MATERIAL_FINDING_FOUND` | read-only |
| `reviewer-2` | Second independent reviewer of every plan revision, same mission and checklist, running in parallel with `reviewer-1`; neither sees the other's findings | read-only |
| `implementation-manager` | Sole orchestrator of mutation, validation, implementation review, staging, commits | repository, under the lock |
| `implementation-reviewer` | Read-only review of developer output against the approved plan, inside the manager's lock; emits `READY_TO_COMMIT` or `CHANGES_REQUIRED` | read-only |
| `developer` | Implements tasks assigned by the manager | repository |

A primary session (Build) acts as coordinator and launches one `fixer` per item.
`implementation-manager` holds `.opencode/locks/implementation-manager-working.md`
for the whole mutating phase: `developer` writes the code as its delegated
implementer, and only the manager validates, stages and commits.

Each profile is pinned to an `opencode-go` model chosen for its task profile.
Reviewers use a family distinct from the author they review, so blind spots do not
correlate:

| Agent | Model |
| --- | --- |
| `fixer` | `opencode-go/deepseek-v4.1-flash` |
| `designer` | `opencode-go/deepseek-v4-pro` |
| `reviewer-1` | `opencode-go/glm-5.3` |
| `reviewer-2` | `opencode-go/gpt-6-luna` |
| `implementation-reviewer` | `opencode-go/glm-5.3-flash` |
| `implementation-manager` | `opencode-go/deepseek-v4.1-flash` |
| `developer` | `opencode-go/deepseek-v4.1-flash` |

The `model:` line in each agent file is the authority; this table only explains
the choice. A model that is unavailable fails loudly at launch, which is the
intended behaviour: there is no fallback chain.

## Working files

Each item gets `docs/working/<YYYY-MM-DD>-<slug>/` holding the current
`plan.md`. Reviews are not persisted: each reviewer returns its findings and
verdict to the agent that invoked it.

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

1. **Review closure** — no confirmed material finding remains, from both
   `reviewer-1` and `reviewer-2`, which review every revision concurrently.
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

The workflow governs work on Diedrico, not work on itself. Editing the skill, an
agent profile, or a model routing is meta-work: the primary session makes those
changes directly on the project owner's instruction, because a broken workflow
cannot run the loop that would repair it. Keep the OpenCode frontmatter
conventions, and keep `AGENTS.md` and this page aligned with what the files
actually say.
