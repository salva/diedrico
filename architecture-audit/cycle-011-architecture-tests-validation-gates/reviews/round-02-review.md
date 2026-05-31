# Wave 011 Review Round 02 — Architecture tests and root validation gates

## Artifacts reviewed

- `architecture-audit/cycle-011-architecture-tests-validation-gates/reviews/round-01-review.md`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/corrections-round-01-note.md`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/proposals/proposal-direct.md`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/proposals/proposal-restructure.md`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/scope-check.md`

## Source immutability check

Reviewed current working-tree status. This review stage adds only audit/saivage artifacts. No `frontend/`, `backend/`, `specs/`, `docs/`, or package application source changes were introduced by this review.

## Round-01 blocker disposition

### Blocker 1 — sharpen root/frontend lint gate plan

**Resolved for both proposals.**

Evidence:

- `proposal-direct.md` now defines an exact executable lint/static contract under `Concrete validation command contract after Wave 010`: root `npm run lint` must delegate to frontend, frontend lint must be a real executable gate, the preferred direct path is `vue-tsc --noEmit`, the alternative is restoring minimal ESLint dependencies/config, and missing executables / no-op scripts / residual `eslint: not found` classification are explicitly forbidden.
- `proposal-restructure.md` now makes the same contract concrete, with a preference for restoring minimal ESLint if the scope stays small and `vue-tsc --noEmit` as an allowed fallback.
- `corrections-round-01-note.md` accurately describes those edits and explicitly says the missing executable may not remain as residual debt.

This closes the round-01 ambiguity: both proposals now require a truthful, runnable lint/static gate instead of merely classifying a missing binary.

### Blocker 2 — state root validation contract after Wave 010 backend deletion more explicitly

**Resolved for both proposals.**

Evidence:

- `proposal-direct.md` now provides an exact command table covering root/frontend `lint`, `test`, `build`, `test:e2e`, and `test:architecture`, and it clearly states that Direct intentionally does **not** add a root `test:e2e` alias; mandatory e2e is satisfied by `npm run test:e2e --workspace=frontend` with that root-alias absence recorded in `implementation-log.md`.
- `proposal-restructure.md` now provides the same command table and explicitly chooses the opposite policy: add a root `test:e2e` alias delegating to the frontend workspace.
- `corrections-round-01-note.md` accurately maps this difference and makes the post-backend-deletion contract explicit rather than implicit.

I do not consider the Direct/Restructure difference itself a blocker: each proposal now defines a truthful, reviewable root/workspace contract that the decision stage can choose between.

### Blocker 3 — tighten Proposal Direct `ExamplesMenu.vue` exception language

**Resolved for Proposal Direct.**

Evidence:

- `proposal-direct.md` now limits the exception to the exact file `frontend/src/components/menus/ExamplesMenu.vue`, not a glob.
- It further constrains the exception to the known `Command`, `AddExampleSetupOp`, and `CommandStack` leak only.
- It requires the test output to name the residual `TEMPORARY Wave 012 ExamplesMenu debug/example command leak` and to state that expanding the allowlist requires a reviewed proposal.
- It also requires the implementation log to track the residual as a Wave 012 delete/move target.
- `corrections-round-01-note.md` accurately records those changes.

This is the specificity round 01 asked for. I still prefer the Restructure approach on architecture purity, but the Direct exception is now narrow and visible enough to be a non-blocking trade-off rather than a vague carve-out.

## Updated proposal scoring

Scale: 1 (poor) to 5 (strong)

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances target outcome:** 4/5  
   Still a good fit for the wave’s validation/architecture-gate goal.
2. **Improves architecture/code quality:** 4/5  
   Deterministic scanner-based architecture tests and truthful command gates are solid improvements.
3. **Respects no-backcompat/aggressive deletion:** 3/5  
   Acceptable, but weaker than Restructure because it preserves the debug/example leak behind an explicit temporary exception.
4. **Avoids overfeaturism:** 5/5  
   Very disciplined scope with no unnecessary Wave 012/013 expansion.
5. **Introduced risks / hidden regressions:** 4/5  
   Main remaining risk is the temporary allowlist lingering too long, but the revised wording makes that residual visible and bounded.
6. **Validation sufficiency:** 4/5  
   Now concrete on exact root/frontend gates, focused architecture tests, mandatory cadence, e2e invocation, and preview refresh evidence.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances target outcome:** 5/5  
   Best match because it makes the UI-boundary rule truthful without exceptions.
2. **Improves architecture/code quality:** 5/5  
   Strongest architectural outcome: delete/move the residual leak before codifying the gate.
3. **Respects no-backcompat/aggressive deletion:** 5/5  
   Best aligned with project priorities, especially if `ExamplesMenu.vue` is debug-only.
4. **Avoids overfeaturism:** 4/5  
   Still acceptably scoped because the extra source cleanup is justified by the validation-gate objective.
5. **Introduced risks / hidden regressions:** 4/5  
   User-visible behavior risk remains if the examples menu is relied upon, but the proposal contains a narrow delete-vs-move decision path.
6. **Validation sufficiency:** 5/5  
   Now fully concrete on executable lint/static gates, root/frontend aliases, strict architecture tests, focused cleanup validation, mandatory cadence, and live verification.

## Residual risks accepted for decision

These are not blocking issues for proposal selection, but the decision/implementation stages should keep them explicit:

- If Proposal Direct is chosen, the `ExamplesMenu.vue` exception must remain exactly single-file/single-purpose and be called out in `decision.md` and `implementation-log.md` as accepted temporary Wave 012 debt.
- If Proposal Restructure is chosen, implementation must verify quickly whether the examples menu is debug-only before deleting it; if not, it must use the narrow application-use-case move rather than ad hoc UI exceptions.
- For either proposal, pre-existing Node 24/`vue-tsc`, intersections Vitest, and broad e2e syntax debt may remain red after focused Wave 011 fixes; implementation must classify them with exact command/file/error evidence if they are not caused by Wave 011 changes.

## Recommendation

**NO BLOCKING ISSUES.**

**Preferred for decision: Proposal Restructure.** It better matches the project’s clean-architecture and aggressive-deletion priorities by refusing to freeze a known UI-to-command leak into the architecture gate.

**Proposal Direct is also decision-ready** if the Manager prefers the smaller-scope path and explicitly accepts the temporary `ExamplesMenu.vue` residual.
