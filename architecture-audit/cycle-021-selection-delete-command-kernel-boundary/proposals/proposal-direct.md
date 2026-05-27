# Proposal Direct — Extract a narrow selection-delete command service

## Summary

Move delete-selected command construction out of `SelectionUseCases` into a focused application command service while leaving broader runtime, persistence, canvas/tool, process-history, and command descriptor architecture unchanged. `SelectionUseCases` becomes an orchestrator over selection state and typed collaborators; the new service owns `Command`, `DeletionSequenceFactory`, `commit()`, and `CommandStack.push()` for the selection/delete slice only.

This is the recommended direct path because it removes the explicit Wave 020 residual with the least architectural spread.

## Files to change

Production source:

- `frontend/src/application/appShell/SelectionUseCases.ts`
  - Replace constructor parameters `world` and `commandStack` for delete purposes with narrower collaborators.
  - Keep active-plane select-all and cascade-preview reads either through a small read port or a minimally named `SelectionWorldReadPort` in the same implementation.
  - Replace direct command construction in `deleteSelected()` with a call to `deleteSelectionCommand.execute(selectedIds)` or equivalent.
- `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts` (new)
  - Owns `Command`, `CommandStack`, `DeletionSequenceFactory`, and `World` for delete-selected command execution.
  - Provides a small result contract such as `{ status: 'deleted'; deletedIds: readonly string[] } | { status: 'empty' }` or throws on command failure if the existing app-shell error style is retained.
  - Performs command creation, cascade factory invocation, commit, and stack push.
- `frontend/src/application/selectionDeletion/SelectionDeletionPorts.ts` or `frontend/src/application/appShell/SelectionDeletionPorts.ts` (new, if useful)
  - Defines `SelectionDeletionCommandPort` and `SelectionReadPort`/`CascadePreviewPort` interfaces without exposing `Command`/`CommandStack` to `SelectionUseCases`.
- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Instantiate the new delete command service at the existing composition point using the current `world` and `commandStack`.
  - Pass the service and any narrow read/query port into `SelectionUseCases`.
- `frontend/src/application/appShell/AppShellPorts.ts`
  - Only change if the selected implementation decides the narrow selection read/delete ports belong there. Prefer a dedicated module to avoid bloating app-shell ports.
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
  - No behavior change expected. Touch only if type shape changes require narrowing the dependency from concrete `SelectionUseCases` to a tiny keyboard selection port.

Tests:

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Update runtime fake/setup expectations for explicit delete command service wiring if needed.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Replace the current residual assertion that expects `SelectionUseCases` to contain `DeletionSequenceFactory|new Command` with a prohibition assertion.
  - Add an assertion that only the new service imports `DeletionSequenceFactory` for this slice.
- `frontend/tests/unit/application/appShell/KeyboardShortcutRouter.test.ts`
  - Preserve Delete/Backspace routing to `selection.deleteSelected()` and Ctrl/Cmd+A routing to `selectAllInActivePlane()`.
- New focused test such as `frontend/tests/unit/application/selectionDeletion/SelectionDeletionCommandService.test.ts`
  - Covers successful cascade deletion with real `World`/`CommandStack` where practical.
  - Proves empty input/no-op behavior returns without constructing, committing, or pushing a command.
  - Proves command construction, cascade factory invocation, `commit()`, and `CommandStack.push()` all complete before the caller is allowed to clear selection.
  - Covers failures during command creation, cascade operation building, commit, and stack push; each failure path must propagate/return failure and must not clear selection.
  - Covers `CommandStack.push()` invariants that are semantically relevant to this boundary: committed-only push behavior, preservation of non-undoable command handling if encountered, subscriber notification timing, undo/redo stack counts, and redo invalidation after a new delete command.
  - Covers undo/redo integration by asserting stack counts and restored/deleted element state before push, after push, after undo, after redo, and after a new command clears redo history.
- New or updated focused test for `SelectionUseCases`
  - Covers no-op empty selection, successful service call followed by selection clearing, failed service call not clearing selection, cascade preview through typed query, and select-all in active plane.

## Files/tests/docs/fixtures to DELETE

- Delete `SelectionUseCases.ts` imports of `Command`, `CommandStack`, and `DeletionSequenceFactory`.
- Delete `SelectionUseCases.deleteSelected()` direct `new Command(...)`, `DeletionSequenceFactory.createCascadeDeletion(...)`, `commit()`, and `commandStack.push(...)` calls.
- Delete the `AppShellBoundary.test.ts` expectation that `SelectionUseCases` still matches `DeletionSequenceFactory|new Command`.
- Delete any touched broad fake helpers that cast `World as any` or `CommandStack as any` solely to observe command internals from selection tests.
- Delete any transitional compatibility wrapper or overload that preserves both old direct selection deletion and the new service path.

Do not delete `DeletionSequenceFactory`, command operation descriptors, project persistence tests, canvas/tool/panel/toolbar tests, backend files, docs/specs, package metadata, or debug/README surfaces in this wave.

## Expected behavior change

User-visible behavior should remain equivalent:

- Empty selection remains a no-op.
- Delete and Backspace remove selected elements and dependent cascade elements in the existing dependency order.
- Selection clears only after successful deletion.
- Cascade highlight still shows dependent elements while selection is active.
- Ctrl/Cmd+A still selects elements in the active plane.
- Escape still clears selection and returns to select tool.
- Undo/redo still restores/deletes the same elements and updates the command stack.

Architectural behavior changes:

- `SelectionUseCases` no longer knows how to construct or push commands.
- The delete command kernel is explicitly named and independently testable.
- `AppShellRuntime` remains the composition point for concrete `World` and `CommandStack`, preserving the Wave 020 runtime boundary while making command ownership visible.

## No-backcompat rationale

The old direct command construction path is internal implementation debt, not a compatibility contract. Keeping both old and new delete-selected paths would preserve ambiguity and make future app-shell code free to bypass the command boundary. The implementation must delete direct imports/calls from `SelectionUseCases` in the same change that introduces the service.

## Risks

- If the service returns success before `CommandStack.push()` notifies subscribers, autosave/dirty behavior could shift. Keep commit/push ordering identical and test stack counts.
- If failure handling is introduced carelessly, selection may clear after a failed command. Tests should assert no clearing on thrown/failed service results.
- The read-port extraction could become broad if it tries to model all `World` behavior. Keep it to active-plane element enumeration and cascade deletion order preview.
- `DeletionSequenceFactory` has existing debug logging and process-tree behavior. Do not alter those semantics in this direct path.
- Existing unrelated dirty command files may affect validation. Implementation must capture path-scoped diffs and avoid depending on unowned changes.

## Semantic-preservation validation requirements

The implementation must prove the extracted selection/delete command boundary preserves the current command lifecycle semantics, not merely that deletion succeeds on the happy path. Focused tests and validation notes must explicitly assert all of the following:

- Selection clearing happens only after successful command creation, cascade operation construction, `commit()`, and `CommandStack.push()`.
- Failures during selected-id command building, `DeletionSequenceFactory.createCascadeDeletion(...)`, `commit()`, or `CommandStack.push(...)` propagate or return failure using the chosen project style and do not clear selection.
- Undo stack count, redo stack count, redo invalidation after a new delete command, and stack notification timing remain consistent with the current `CommandStack.push()` contract.
- Empty selection and empty/no-op deletion results do not create, commit, or push a command, and do not change undo/redo stack counts.
- Existing non-undoable command behavior is preserved at the command-stack boundary; the service must not introduce a side path that pushes commands the stack would currently reject or ignore.
- The service boundary remains limited to selection/delete command construction and execution; it must not absorb persistence, autosave, UI notification, replay/serialization, backend/API, package/tooling, docs/specs, or other application command-producer responsibilities.

## Validation plan

The implementation validation must explicitly prove semantic preservation of the extracted selection/delete command boundary, not merely exercise a happy path. Required assertions are:

- Selection is cleared only after successful selected-id read, command creation, cascade operation build, `commit()`, and `CommandStack.push()`.
- Failures thrown or reported during command construction, cascade building, commit, or push leave the selection unchanged and do not silently create a partially accepted delete.
- Undo/redo stack counts, redo invalidation after a new delete, and `CommandStack.push()` notification behavior match the current stack contract.
- Empty selection or empty service input is a no-op that does not instantiate, commit, or push a command and does not perturb undo/redo counts.
- The new service remains the executor boundary for selection/delete only: it owns `Command`, `DeletionSequenceFactory`, `commit()`, and `CommandStack.push()` for this slice, but it does not absorb persistence/autosave/UI callbacks, command serialization/replay, schema migration, backend/docs/debug/package-tooling, or non-selection command producers.

Implementation logs must capture stdout/stderr under `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/validation/`:

1. Pre-edit scoped git status/diff plus static scans for `SelectionUseCases`, `new Command`, `DeletionSequenceFactory`, `CommandStack.push`, cascade preview, and keyboard delete routing.
2. Focused Vitest:
   - new selection-delete command service tests, including the semantic-preservation assertions above for success ordering, build/commit/push failure, undo/redo counts, redo invalidation, notification timing, non-undoable command behavior, and empty/no-op behavior;
   - selection use-case tests proving selection clears only after a successful service result and remains unchanged for failures and empty/no-op paths;
   - app-shell boundary/runtime tests proving `SelectionUseCases` no longer imports or constructs `Command`, `CommandStack`, or `DeletionSequenceFactory`, and that the new service is wired only at the existing runtime composition point;
   - keyboard shortcut router tests.
3. Root `npm run lint` and frontend lint where defined.
4. Root and frontend full Vitest.
5. Root and frontend `npm run build`.
6. Root and frontend e2e/Playwright, with at least keyboard shortcut coverage for Delete/Backspace and undo/redo retained.
7. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probes, and credential-free Playwright/live smoke for create/select/delete/undo via keyboard.

## Stop conditions

Stop and request a reviewed delta/mini-cycle if implementation discovers any of the following is necessary:

- Changing command descriptor serialization, operation replay, or persistence schema to support the delete boundary.
- Moving all application command construction paths, including canvas/tool/process-history/toolbar, into a global kernel.
- Rewriting `DeletionSequenceFactory` cascade semantics or process-tree deletion behavior.
- Moving `World`/`CommandStack` creation out of `AppShellRuntime` as a prerequisite.
- Changing package/tooling/e2e infrastructure or deleting stale docs/debug surfaces to make this wave pass.
