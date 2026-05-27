# Cycle 021 Review Round 01 — Selection/delete command-kernel boundary

**Verdict:** BLOCKING ISSUES

## Scope and source-control verification

- Reviewed artifacts: `scope-check.md`, `proposals/proposal-direct.md`, `proposals/proposal-restructure.md`, `architecture-audit/cycle-021-wave-plan-extension/plan-extension-note.md`, `architecture-audit/wave-plan.md`, current source files `frontend/src/application/appShell/SelectionUseCases.ts`, `frontend/src/application/appShell/KeyboardShortcutRouter.ts`, `frontend/src/application/appShell/AppShellRuntime.ts`, `frontend/src/commands/factories/DeletionSequenceFactory.ts`, and `frontend/src/commands/CommandStack.ts`.
- Current dirty adjacent files remain pre-existing and out of scope for this review/next implementation unless a reviewed delta broadens scope: `frontend/src/commands/Command.ts`, `frontend/src/commands/factories/DeletionSequenceFactory.ts`, `frontend/src/commands/factories/PointSequenceFactory.ts`, `frontend/src/commands/operations/IOperation.ts`, and several world operation files (`post-t1-scoped-status.stdout`).
- Backend, docs/specs, debug/README cleanup, package/tooling churn, persistence-schema redesign, broad command replay/descriptor work, and non-selection application command paths remain correctly out of scope for Wave 021. The static scan confirms other direct `new Command(...)` sites still exist in initialization, canvas, construction, and process-history modules; those are stop-condition evidence, not justification to broaden this wave by default (`static-scan-command-boundary.stdout`).

## Current boundary assessment

`SelectionUseCases` still directly imports and constructs command-kernel primitives (`SelectionUseCases.ts:2-4`) and performs the full delete lifecycle inline: read selection, `new Command`, `DeletionSequenceFactory.createCascadeDeletion(...)`, `commit()`, `commandStack.push(...)`, and `clearSelection()` (`SelectionUseCases.ts:33-40`). That is the exact residual debt Wave 020 left behind and the correct center of this wave.

The broader command-kernel redesign stop condition is also supported by source evidence: multiple other application modules still build commands directly, but Wave 021 only promises to remove the selection/delete leak first. `AppShellRuntime` is still an acceptable composition point for concrete `World` and `CommandStack` wiring in this wave (`AppShellRuntime.ts:186-209`). Keyboard routing should stay split: delete/select-all route through selection, undo/redo remain on `CommandStack` (`KeyboardShortcutRouter.ts:119-122`, `KeyboardShortcutRouter.ts:162-168`).

## Proposal scoring

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances target outcome:** **Pass**. It removes the exact leak in `SelectionUseCases.deleteSelected()` without dragging unrelated command paths into scope.
2. **Improves architecture/code quality:** **Pass**. A dedicated selection-delete command service would give the delete seam a named owner and reduce app-shell knowledge of `Command`/`DeletionSequenceFactory` internals.
3. **Respects no-backcompat / aggressive deletion:** **Pass**. The proposal explicitly deletes direct imports/calls from `SelectionUseCases` and rejects dual-path compatibility wrappers.
4. **Avoids overfeaturism:** **Pass**. It keeps runtime ownership, persistence, and other command producers unchanged.
5. **Risks/regressions:** **Mixed**. The proposal names ordering and failure risks, but its test plan is still too implicit about preserving current stack semantics around committed/non-undoable behavior and notification timing.
6. **Validation sufficiency:** **Mixed**. The command-boundary test list is directionally correct, but it needs an explicit requirement to prove the new service/executor preserves `CommandStack.push()` contract behavior rather than merely exercising happy-path deletion.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances target outcome:** **Pass**. It also removes the selection/delete leak and does so at a slightly higher, still-relevant layer.
2. **Improves architecture/code quality:** **Pass**. A tiny `ApplicationCommandExecutor` could centralize repeated commit/push choreography and leave `SelectionUseCases` cleaner than today.
3. **Respects no-backcompat / aggressive deletion:** **Pass**. It deletes the direct path and rejects compatibility wrappers.
4. **Avoids overfeaturism:** **Caution**. It is still bounded on paper, but it has a stronger tendency to expand into a general application kernel because the static scan shows many other direct command sites.
5. **Risks/regressions:** **Mixed**. The executor abstraction could become a new god service or subtly alter failure/undo/redo semantics if its contract is underspecified.
6. **Validation sufficiency:** **Mixed**. Like the direct proposal, it needs an explicit semantic-preservation test requirement for stack/history behavior, not only focused deletion tests.

## Blocking issues

1. **Validation and test scope do not yet explicitly require semantic-preservation checks for the command lifecycle boundary being extracted.** Both proposals say they will cover commit/push/undo/redo integration, but neither proposal commits to verifying the concrete `CommandStack.push()` invariants that matter here: only committed commands can be pushed, non-undoable command behavior is preserved, redo clearing/notification timing stays unchanged, and selection is not cleared on a failed command build/push path. Because the wave’s whole architectural move is to relocate this choreography, vague “integration” coverage is not enough.

## Required corrections before decision

- Edit both proposals in place to add an explicit semantic-preservation requirement for the extracted boundary. The focused tests must prove, not imply:
  - selection clears only after successful command creation/commit/push;
  - failures during command building or push do not clear selection;
  - undo/redo stack counts and redo invalidation remain consistent with current `CommandStack.push()` behavior;
  - any empty/no-op path does not create/push a command;
  - if an executor abstraction is chosen, it does **not** absorb persistence/autosave/UI concerns and does **not** require migration of other application command producers in this wave.
- Update the proposal validation sections to call out these assertions directly, not as generic “integration” coverage.

## Preferred decision considerations after correction

- **Current preference:** `proposal-direct.md`, assuming the above semantic-preservation coverage is added. It removes the accepted residual with the narrowest surface area and best respects the wave stop conditions.
- **When restructure becomes preferable:** only if the revised proposal keeps the executor tiny and demonstrates it is limited to command lifecycle choreography for selection/delete first, without dragging in the other direct command producers identified by the static scan.

## Recommendation

Proceed to **corrections-round-01**, not decision yet.
