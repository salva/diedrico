---
name: Diedrico adversarial development
description: 'Mandatory Diedrico workflow for new features and fixes. Use for bugs, regressions, behavior gaps, review findings, design flaws, architectural issues, and new user-visible capabilities: require a written design/plan, adversarial review of every revision, a merit gate, then serialized implementation through the implementation-manager lock. It does not govern its own modification unless the operator explicitly asks.'
---

# Diedrico adversarial development

Use this workflow before implementing any non-trivial change in Diedrico: new
features, bugs, regressions, review findings, architectural flaws, and behavior
gaps. It applies to both "make it work" and "make it exist".

It does not govern its own modification. Editing this skill, an agent profile, or
a model routing is meta-work, and follows this workflow only when the operator
explicitly asks for it: a broken workflow cannot run the loop that would repair
it.

Not required for typo fixes, formatting-only edits, dependency bumps, or
single-line corrections with no design choice, unless the user frames the work
as a feature or an issue.

Also follow `AGENTS.md` throughout. It stays authoritative for architecture,
scope, documentation, validation, and safety. This skill adds cadence, not
policy.

## Ownership model

| Role | Agent | Owns |
| --- | --- | --- |
| Coordinator | primary | Accepts the request, assigns one working directory per item, launches and tracks one `fixer` per item, records exact returned task IDs and dispositions, decides when a waiting fixer may resume. Never designs, reviews, or implements. |
| Fixer | `fixer` | One item end to end: delegation, finding triage, merit gate, freshness check, read-only reconciliation after manager return. Writes nothing; never implementation edits, validation, staging, or commits. |
| Designer | `designer` | Writes and revises the item's design/plan. |
| First reviewer | `reviewer-1` | Adversarially reviews every current design/plan revision. |
| Second reviewer | `reviewer-2` | Reviews every current revision in parallel with `reviewer-1`, with the same mission and checklist, without seeing its findings. |
| Implementation manager | `implementation-manager` | Sole implementation orchestrator and the only agent that invokes `developer`. Its lock covers all mutation, required validation, implementation review, generated artifacts, staging, commits, and stabilization. |
| Implementation reviewer | `implementation-reviewer` | Read-only review of developer output against the approved plan, inside the manager's lock. |
| Developer | `developer` | Leaf implementer for manager-assigned plan tasks. |

Each item completes its own design/review loop. Items that may collide still
plan and review concurrently; plan approval reserves no file or contract.
Implementation stays serialized regardless of apparent independence. For a
single item the primary is a one-item coordinator and drives the same workflow.

## Working files

Create one directory per item: `docs/working/<YYYY-MM-DD>-<slug>/`, holding the
current design/plan.

- `docs/working/` is Git-ignored and must never be committed. It is not a
  substitute for canonical documentation.
- Every revised plan is self-contained; a reader must not need earlier
  revisions or the review history.
- Reviews are not persisted. Each reviewer returns its findings and verdict to
  the agent that invoked it.
- Reviews stay factual and actionable. Do not preserve weak critiques as
  required work.

## Feature work

Fixes inherit their problem statement from a demonstrated defect. New features
have no defect, so establish the need before designing:

1. **Establish the need first.** The plan's problem statement covers: the
   user-visible outcome, who needs it, what exists today, what stays out of
   scope, and how success is observed. The fixer confirms it before the designer
   drafts the rest of the plan. If the owner's request already answers these,
   copy it faithfully instead of inventing rationale.
2. **Interaction is part of the design.** Any user-visible capability states
   its UI surface: which panel, control, or canvas interaction, what the states
   are (empty / busy / blocked / failed), and how it is discovered and undone.
   `frontend/src/components` renders; it does not decide policy.
3. **Capability honesty.** Declare what the change deliberately does not
   support. A feature does not ship silently degraded; unavailable paths return
   an honest result rather than a placeholder that looks functional.

Feature plans still pass the merit gate below, with "worth building" replacing
"root cause" as the first condition.

## Design and plan requirements

Keep each design/plan concise, self-contained, and proportional to the change's
risk. A one-line statement that a subject is unaffected is enough.

The plan must include:

- Problem statement with evidence, or the established need for a new capability.
- Root-cause analysis for fixes, or the best current hypothesis.
- Scope and non-scope. Non-essential robustness and rare edge cases are
  deferred follow-ups unless deferral blocks the core change or leaves the
  system unsafe.
- Proposed design: affected modules, contracts, Vue surfaces, and public
  application seams as applicable, named against the layer table in
  `docs/architecture/overview.md`. State which layer owns each new behavior.
- Persistence impact, including none. Diedrico persists committed command
  descriptors through `ProjectService` under the current command schema (see
  `docs/architecture/commands.md` and `docs/contributing/project-persistence-ownership.md`).
  Old project formats are not an active compatibility surface. If the change
  alters operation descriptors, name the affected `opType` set, the
  `schemaVersion` decision, registry registration, replay validation, and the
  tests that prove round-trip replay into a fresh `World`.
- Alternatives, including a broader or root-cause alternative when reasonable.
- An ordered implementation plan with three explicit sections:
  - Main work tasks.
  - Cleanup tasks for obsolete code, tests, fixtures, docs, and scripts.
  - Documentation-update tasks naming each document to update and how.
    Documentation is implementation work, not a later phase. Consider
    `docs/architecture/overview.md`, `docs/architecture/commands.md`,
    `docs/contributing/testing.md`, `README.md`, and the VitePress pages that
    describe the changed behavior.
- Related stale documentation in scope, with concrete correction tasks.
- Validation appropriate to the risk: name the focused Vitest files, the
  architecture tests affected by boundary changes, and whether
  `npm run validate:routine`, `npm run lint`, `npm run validate:docs`, or
  `npm run test:e2e` are required. Do not substitute prose-regex assertions or
  repository-wide spelling bans for semantic evidence.
- Risks, rollback considerations, and unresolved questions.

## Adversarial review and revision loop

The fixer uses `designer` for all plan authoring, and reviews every revision with
`reviewer-1` and `reviewer-2` concurrently. Both have the same mission and the same
checklist, and both read the same revision; neither sees the other's findings
before writing, so the two passes stay independent.

1. Ask `designer` to write or revise the self-contained plan at the item's
   unique path. For revisions, provide all confirmed material findings.
2. Invoke `reviewer-1` and `reviewer-2` on the complete current plan concurrently,
   and await both before triaging. Each returns its findings and verdict to you;
   nothing is written to `docs/working/`.
3. Triage every finding using the rules below. When the reviewers contradict each
   other, evidence wins and the fixer is the arbiter.
4. If any finding is material, decide whether the periodic merit gate is due.
   When it is not due, revise and repeat directly. When it is due, continue to
   revision only on `WORTH_CONTINUING`.
5. When every finding is false, minor, or explicitly deferred and no confirmed
   material finding remains, run the mandatory final merit gate. Review closure
   alone never authorizes freshness or implementation.

## Merit gate

The fixer, not the designer or the reviewers, owns this decision. Apply it twice:

- **Periodically during revision:** reassess immediately when findings recur, a
  revision widens or shifts scope, adds a material mechanism, or pulls a
  deferred concern into the core change. Otherwise reassess no later than every
  second review round with confirmed material findings. Run it after triage and
  before another designer revision.
- **After review closure:** always reassess the complete closed plan before
  recording approval, checking freshness, or invoking `implementation-manager`.
  An earlier periodic result cannot satisfy this final gate.

Use a concise pass/fault decision, not a scorecard or a new artifact. Confirm:

- **Value and cause:** measured against the original evidenced need, the plan
  solves the problem at the layer that owns it rather than compensating for a
  symptom or preserving a disproved premise. When an introduced mechanism
  created the problem, first consider removing that mechanism instead of adding
  machinery to make it correct.
- **Net simplicity:** the result is easier to understand and change, and its new
  mechanisms, states, contracts, and exceptions are not comparable to or worse
  than the complexity removed unless concrete value justifies them.
- **Project alignment:** the plan follows `AGENTS.md` and the layer boundaries
  in `docs/architecture/overview.md`; domain code owns geometry; application
  code translates intents into commands; components render and forward; no
  second command stack, no duplicate geometry path, no compatibility layer for
  superseded project formats.
- **Scope discipline:** the plan is the minimal coherent safe change, and
  deferred concerns stay deferred unless they block core behavior or leave the
  system unsafe.

Record exactly one outcome with concise evidence:

- **`WORTH_CONTINUING`:** valid only at a due periodic gate while material
  findings remain. Permits the next designer revision and reviewer round; it
  cannot approve the plan, record an examined `HEAD`, run freshness, or
  authorize implementation.
- **`WORTH_IMPLEMENTING`:** valid only at the mandatory post-closure gate, and
  the sole merit outcome that permits approval, freshness checking, and manager
  delegation.
- **`REDESIGN_REQUIRED`:** the design is faulty but salvageable. Record the
  failed conditions and the precise constraints that can plausibly restore a
  worthwhile compliant design. Do not patch or partially implement it; give the
  complete item, evidence, and constraints to `designer` and restart the full
  loop on a self-contained plan.
- **`ABANDONED`:** no credible compliant redesign is worthwhile, for example
  when the premise is disproved, the required complexity outweighs the value,
  or the objective conflicts with `AGENTS.md`. End without freshness or
  implementation and report the evidence and failed conditions. Do not relaunch
  it automatically.
- **`BLOCKED`:** evidence is insufficient or an owner-owned tradeoff prevents a
  reliable decision. Ask the user rather than guessing.

## Finding triage

- **False:** disproved, speculative, preference-only, or contradicted by current
  requirements. Reject it. A finding is not false merely because it is outside
  scope.
- **Minor:** correct but too small to affect the plan. Note it without forcing
  another round.
- **Material:** real and significant enough to change the design or plan. Revise
  directly.
- **Deferred:** supported but outside the minimal coherent change. Record a
  brief reason and any needed follow-up. Never defer a defect that blocks the
  core change or leaves the system unsafe.

Accepting a defect does not accept its proposed remedy. Separate the evidence
and the violated requirement from the suggested correction. When an unsupported
plan claim caused the defect, narrow that claim; do not weaken a real
requirement merely to close review.

## Escalation

Ask the user when the merit gate cannot resolve unclear scope, repeated
disagreement, or a required product tradeoff. Ask before introducing stronger
user-visible guarantees, removing unrelated capability, or changing the
persistence schema's compatibility posture. Generic slogans such as "fail
fast", "root cause", or "remove dead code" do not authorize those tradeoffs.

If the required subagent tooling is unavailable, report `BLOCKED`. Never claim
review or implementation passed. Do not substitute self-review or direct
implementation for the missing agent.

## Approval and freshness gate

Only after review closes and the final merit gate returns `WORTH_IMPLEMENTING`
may the fixer record this approval:

```text
Plan approval:
Review closure: <both reviewers' verdicts>
Final merit outcome: WORTH_IMPLEMENTING
Supporting evidence: <concise evidence covering the four merit conditions>
Examined HEAD: <commit>
```

Immediately before every manager attempt, including every attempt after lock
waiting, the fixer performs a read-only semantic freshness check against the
current `HEAD`, commits since the last approval, and current worktree changes.
Compare the plan's assumptions, named files, contracts, call sites, cleanup,
documentation, and validation.

- **`PLAN_STILL_VALID`:** intervening changes do not materially affect the
  premise, intended contract, affected components, ordered tasks, or
  validation. Record the evidence and invoke the manager.
- **`PLAN_REVIEW_REQUIRED`:** a contract or assumption changed, a target was
  removed or substantially rewritten, planned changes conflict, scope changed,
  or validation and docs no longer establish correctness. Do not invoke the
  manager. Send the current evidence to `designer` and repeat the full loop.
- **`BLOCKED`:** the worktree is broken, unclassified, or unsafe for a reliable
  check. Do not mutate or improvise.

A freshness-driven return to design invalidates the prior approval. A newly
closed revision needs a new final `WORTH_IMPLEMENTING` decision. A successful
check reserves nothing; the manager must still acquire the lock.

## Implementation boundary

Every approved fixer invokes the `implementation-manager` subagent with the
absolute approved-plan path. No primary and no fixer inspects the lock and
implements around it. The lock file is
`.opencode/locks/implementation-manager-working.md` at the repository root, and
both it and the approved-plan path are absolute; every other path this workflow
names is relative to the repository root. The lock is the only serialization
boundary.

The manager must:

1. Atomically acquire the lock before reading the plan or mutating anything.
   Create `.opencode/locks/` if it does not exist. On
   contention it edits and delegates nothing and returns the existing lock
   description.
2. Capture pre-existing Git status and diff sufficiently to preserve unrelated
   work.
3. Decompose the plan into developer assignments. Assign sequentially when work
   overlaps or has ordering dependencies. Launch a concurrent group only after
   positively determining that assignments do not conflict in files, contracts,
   generated outputs, validation side effects, or required order.
4. Await every developer in a concurrent group and reconcile each result plus
   the combined repository state against the assigned scopes and the plan. No
   shared validation, staging, or commit while any developer is active.
5. Run all validation the plan requires and handle generated artifacts.
   Developer-run checks are progress evidence, not substitutes.
6. Invoke `implementation-reviewer` with the absolute plan path. It reviews the
   implementation against the plan, and uses read-only Git commands to see what
   actually changed so it can also flag work the plan did not authorize. On
   `CHANGES_REQUIRED`, return the material findings to `developer` and repeat
   validation and review under the same lock. Stage only intended paths and
   commit coherent stable units only after `READY_TO_COMMIT` for the current
   state.
7. Prepare the final report with command results and commit hashes. Before
   normal release, confirm completed work is stable and committed and no
   plan-owned uncommitted mutation remains.
8. On partial completion or redesign-worthy learning after edits, validate and
   commit only coherent completed units, then finish or remove only this run's
   incomplete uncommittable changes while preserving pre-existing work. If safe
   stabilization is impossible, retain the lock and escalate.
9. Remove only the lock this run created, as the final mutation, then return the
   prepared report. Abnormal termination may leave the lock; no other agent
   removes or takes it over.

The lock spans tracked edits, generated outputs, mutating validation commands,
staging, commit hooks, commits, and final cleanup. Concurrent developers stay
inside one lock holder's single item.

## Implementation review

`implementation-reviewer` covers what a green build cannot. Its main job is to
confirm that what was built is what was designed, and to surface problems the
design did not anticipate. The manager already ran the tests, typecheck, lint and
docs build, so the reviewer does not re-run them and does not report what they
would already have reported. It checks plan fidelity, owning layer, contract
completeness, documentation updates, leftovers, and whether the new tests assert
behavior or only shape.

It is read-only: no edits, no staging, no commits, no lock. It may run
`git status`, `git diff`, `git log` and `git show` to see what actually changed,
which is how it detects work the plan did not authorize. It never runs a mutating
command.

Its verdict governs the commit. `READY_TO_COMMIT` for the current state is
required before staging; `CHANGES_REQUIRED` sends the material findings back to
`developer` as a new assignment under the same lock. A finding that the plan
itself is wrong, rather than the implementation, returns the item to `designer`
and the review loop instead.

## Contention and resume

A manager return that acquired no lock, edited nothing, and delegated nothing
maps to `WAITING_FOR_IMPLEMENTATION_LOCK`. It is not failure, partial
implementation, divergence, or design evidence. The fixer keeps ownership and
must not poll or launch another manager.

The coordinator may resume a waiting fixer only after the known holder has
returned, released its lock, and reported a stable committed state. Resume the
**same recorded task ID**, not a new fixer session. On resume, the fixer must
re-run the freshness gate above before any manager delegation. There is no
queue, scheduler, fairness promise, timer, watcher, or extra lock.

## Manager returns

**Contention-only:** do not revise or re-review solely because of contention.
Return control to the coordinator and wait for the resume condition.

**Acquired lock:** the fixer performs read-only reconciliation only — manager
report, commit hashes, `HEAD`, status and diff, and supplied validation
evidence. It must not mutate, stage or commit.

- Fully executed, no divergence, repository stable: report completion.
- Work remains, run partial, or learning changes the design: return to
  `designer` and the full review loop. A later attempt needs a fresh freshness
  check and lock acquisition.
- Manager cannot stabilize and retains the lock: report `BLOCKED`. No
  implementation resumes until explicit owner or operator verification and
  repair.

## Dispositions

Every fixer return starts with exactly one disposition:

- `COMPLETED`
- `ABANDONED`
- `WAITING_FOR_IMPLEMENTATION_LOCK`
- `BLOCKED`
- `FAILED`
- `CANCELLED`

A waiting return includes:

```text
Disposition: WAITING_FOR_IMPLEMENTATION_LOCK
Item: <identifier and summary>
Plan: <absolute path>
Plan approval: <the block above, unchanged>
Lock holder: <concise faithful description of the existing lock>
Work performed: none
Resume condition: known lock-holder run has returned and released its lock
```

A completed report includes item identity, plan path, the unchanged approval
block, files changed, manager-supplied validation results, commit hashes,
remaining work or divergence, and repository stability. An `ABANDONED` report
includes the review outcome, merit evidence, failed conditions, and why redesign
cannot make the item worthwhile; it claims no files changed, no validation, and
no commits. The fixer generates no new implementation evidence after manager
return.

## Cancellation and errors

- **Waiting fixer cancelled:** mark `CANCELLED`, make no resume call, do not
  touch the lock. Other items continue unless directed otherwise.
- **Resume mismatch or a fixer that cannot identify its own prior episode:**
  mark `BLOCKED`; never adopt a replacement session's output.
- **Design or review tooling unavailable:** `BLOCKED`. **Item-local failure:**
  `FAILED`. Other items may continue if the worktree is safe.
- **Design abandoned on merit:** `ABANDONED`, an intentional terminal decision,
  not a failure.
- **Manager cannot stabilize or dies:** leave the lock and report a blocker
  requiring explicit owner action. No other session takes the lock over.
- **Coordinator cancelled:** stop launches and resumes, report last dispositions
  and any active holder, never remove another session's lock.

## Prohibited mechanisms

No branches, worktrees, or merge orchestration: one lock serializes one item in
one working tree.

## Final reporting

Report the items, core design choice, plan paths, review and merit outcomes,
material findings, main docs and files changed, validation commands and results,
commit hashes, repository stability, residual risks and follow-ups, and any
abandoned, blocked, or cancelled item. Never imply an abandoned item was
implemented. Never commit `docs/working/` artifacts.
