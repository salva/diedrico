# Cycle 021 Review Round 02 — Selection/delete command-kernel boundary

**Verdict:** NO BLOCKING ISSUES

## Scope and source-control verification

- Re-reviewed `reviews/round-01-review.md`, `corrections-round-01.md`, `proposals/proposal-direct.md`, `proposals/proposal-restructure.md`, and `scope-check.md`.
- Confirmed this remains a planning-only review stage. Current dirty files relevant to this cycle are proposal/review artifacts under `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/` plus the stage report path; no production source implementation was reviewed as changed in this stage.
- The review continues to respect Wave 021 bounds: no source refactor, no package/tooling churn, no persistence redesign, no migration of unrelated command producers.

## Round-01 blocker resolution check

Round 01 required both proposals to make semantic-preservation validation explicit for the extracted command lifecycle boundary. That blocker is now resolved in both proposals.

### Resolved items

- **Selection clears only after successful lifecycle completion:** now explicit in the direct proposal’s focused tests and validation requirements (`proposals/proposal-direct.md`, semantic-preservation section and validation plan) and in the restructure proposal’s executor/service validation requirements (`proposals/proposal-restructure.md`, semantic-preservation section and validation plan).
- **Failures during build/commit/push do not clear selection:** both proposals now explicitly require failure coverage for command creation/build/commit/push paths with selection unchanged on failure.
- **Undo/redo counts and redo invalidation preserve current `CommandStack.push()` behavior:** both proposals now explicitly call for stack-count, redo-invalidation, and notification-timing assertions rather than generic integration coverage.
- **Committed-only and non-undoable push behavior stay explicit:** both proposals now name these `CommandStack` contract invariants directly.
- **Empty/no-op behavior does not create or push commands:** both proposals now explicitly require no-op coverage with unchanged undo/redo counts.
- **Executor/scope limits remain bounded:** the direct proposal limits the new service to selection/delete command execution only, and the restructure proposal now explicitly constrains the executor to command-lifecycle choreography rather than a general application kernel.

## Proposal scoring

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances target outcome:** **Pass**. It still removes the exact leak in `SelectionUseCases.deleteSelected()` with the narrowest change surface.
2. **Improves architecture/code quality:** **Pass**. It introduces a named owner for selection/delete command construction while keeping `SelectionUseCases` focused on orchestration.
3. **Respects no-backcompat / aggressive deletion:** **Pass**. It explicitly deletes the direct imports/calls and rejects dual-path compatibility.
4. **Avoids overfeaturism:** **Pass**. It stays tightly bounded to the selection/delete slice and does not try to absorb unrelated command producers or infrastructure concerns.
5. **Introduces new risks or hidden regressions:** **Pass with manageable risk**. The previously underspecified lifecycle-semantics risk is now addressed by explicit validation requirements; remaining risks are honestly disclosed and bounded.
6. **Validation sufficiency:** **Pass**. The proposal now explicitly requires semantic-preservation checks for selection clearing, failure behavior, undo/redo counts, redo invalidation, notification timing, committed-only push behavior, non-undoable handling, empty/no-op behavior, and scope limits.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances target outcome:** **Pass**. It also removes the leak and does so at a slightly higher layer.
2. **Improves architecture/code quality:** **Pass**. A tiny executor could reduce repetition and provide a reusable lifecycle owner if kept narrow.
3. **Respects no-backcompat / aggressive deletion:** **Pass**. It deletes the direct path and rejects compatibility wrappers.
4. **Avoids overfeaturism:** **Pass with caution**. The revised scope limits are materially better and now explicitly forbid broad kernel expansion in this wave, though this path still carries more expansion pressure than the direct proposal.
5. **Introduces new risks or hidden regressions:** **Pass with caution**. The executor remains more structurally ambitious, but the proposal now names the semantic and scope risks clearly and constrains them.
6. **Validation sufficiency:** **Pass**. The revised validation plan explicitly covers lifecycle semantics, failure behavior, undo/redo counts, redo invalidation, committed-only push behavior, non-undoable treatment, empty/no-op behavior, and executor boundary limits.

## Decision considerations

- **Preferred proposal:** `proposal-direct.md`.
- **Why:** it resolves the accepted Wave 020 residual with the smallest architectural surface area, best matches the Wave 021 stop conditions, and now has explicit semantic-preservation validation requirements.
- **When restructure would still be reasonable:** if the manager/implementer has strong evidence that a tiny executor can remain strictly limited to selection/delete lifecycle choreography without pulling in other command producers or widening runtime responsibilities in this wave.

## Residual non-blocking cautions

- The restructure path still deserves close implementation discipline because the codebase contains multiple other direct command-construction sites; any sign that the executor must expand to absorb those should trigger a reviewed delta instead of opportunistic widening.
- During implementation, validation logs must show the semantic-preservation assertions were actually executed rather than merely restated in the implementation log.

## Recommendation

Proceed to **cycle-021-decision**. No additional proposal correction round is required.
