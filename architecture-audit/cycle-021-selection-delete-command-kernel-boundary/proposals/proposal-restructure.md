# Proposal Restructure — Introduce a tiny application command executor, then migrate selection/delete first

## Summary

Create a small application command-execution primitive that owns the generic `new Command` → build operations → `commit()` → `CommandStack.push()` lifecycle, and use it immediately for selection/delete. This asks whether the right fix is one conceptual layer higher than a delete-only service: application use cases should not repeat commit/push/error/rollback choreography. However, the implementation slice remains bounded to selection/delete; other application command paths are left as explicit future candidates.

This proposal is more structural than the direct path, but still rejects a broad all-command kernel wave.

## Files to change

Production source:

- `frontend/src/application/commandKernel/ApplicationCommandExecutor.ts` (new)
  - Defines an executor such as `execute(description, buildOperations)` where `buildOperations` receives an open `Command` and may call existing factories/operations.
  - Owns `Command`, `World`, `CommandStack`, `commit()`, `push()`, and consistent failure behavior.
  - Returns a narrow success/failure result or throws using the current project style; no persistence descriptor behavior is changed.
- `frontend/src/application/selectionDeletion/SelectionDeletionUseCase.ts` or `SelectionDeletionCommandService.ts` (new)
  - Uses `ApplicationCommandExecutor` plus `DeletionSequenceFactory` to implement selection deletion.
  - Owns selected-id deletion command naming and cascade factory invocation.
- `frontend/src/application/appShell/SelectionUseCases.ts`
  - Depends on a `SelectionDeletionPort` and narrow read/query ports rather than `Command`, `CommandStack`, or `DeletionSequenceFactory`.
  - Keeps selection clearing, no-op, select-all, and cascade-preview orchestration.
- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Instantiates the `ApplicationCommandExecutor` with the existing `world` and `commandStack`.
  - Instantiates the selection deletion service with the executor and wires it into `SelectionUseCases`.
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
  - No user-visible change. Optionally narrow the dependency on selection to a keyboard-facing interface only if this falls out naturally.
- `frontend/src/application/appShell/AppShellPorts.ts`
  - Avoid changes unless needed for a typed selection port; do not fold the whole command executor into app-shell persistence ports.

Tests:

- New `frontend/tests/unit/application/commandKernel/ApplicationCommandExecutor.test.ts`
  - Covers committed command push, rollback/failure propagation, empty command handling, non-undoable command behavior if currently needed, and stack notification/count behavior.
  - Proves the executor preserves the current command lifecycle contract: build operations into an open command, commit before push, push only committed commands, preserve non-undoable command handling if encountered, notify subscribers on the same boundary as `CommandStack.push()`, and leave undo/redo stack counts observable as before.
  - Proves redo invalidation after a newly pushed delete command and verifies undo/redo counts and element state across push, undo, redo, and new-command-after-undo sequences.
  - Proves failures during executor command creation, operation building, commit, or push propagate/return failure without letting selection deletion clear selection or treating a partial command as accepted.
  - Proves empty/no-op selection deletion does not call the executor in a way that creates, commits, or pushes a command.
- New or updated selection deletion tests as in the direct proposal.
- Updated app-shell boundary/runtime tests to enforce that `SelectionUseCases` no longer imports command primitives and that the executor is wired at runtime.
- Existing keyboard shortcut router tests remain focused on routing.

## Files/tests/docs/fixtures to DELETE

- Delete `SelectionUseCases.ts` imports of `Command`, `CommandStack`, and `DeletionSequenceFactory`.
- Delete direct command construction/commit/push calls from `SelectionUseCases.deleteSelected()`.
- Delete tests that assert the residual remains in `SelectionUseCases`, especially the boundary assertion currently matching `DeletionSequenceFactory|new Command`.
- Delete any duplicate helper introduced by the direct path if the executor owns the lifecycle instead.
- Delete compatibility wrappers that allow selection deletion to bypass `ApplicationCommandExecutor`.

Do not delete or migrate these in this wave:

- Existing command construction in canvas movement/style, construction, process-history, toolbar history, world initialization, or factories README examples.
- `DeletionSequenceFactory` or cascade-deletion operations.
- Command descriptors, operation registry, project persistence, Drive/auth, backend, docs/specs, package/tooling, rendering, or debug/placeholder surfaces.

## Expected behavior change

User-visible behavior remains equivalent to the direct proposal: empty selection no-op, cascade deletion order, selection clearing after success, cascade preview, Ctrl/Cmd+A, Delete/Backspace, Escape, undo, and redo should all remain the same.

Architectural behavior changes:

- The repeated application command lifecycle gets a named owner for selection/delete.
- Selection deletion becomes the first consumer of a reusable executor, making future waves easier without prematurely touching all command paths.
- `SelectionUseCases` is protected from both command construction and generic commit/push choreography.

## No-backcompat rationale

A command executor is an internal architecture boundary. Once introduced for selection/delete, the old direct selection path must be deleted. The executor should not expose a compatibility API that invites `SelectionUseCases` to pass concrete `World`, `CommandStack`, or raw command internals around.

## Risks

- The executor can become a new god service if it starts accepting arbitrary application concerns, persistence, autosave, UI callbacks, operation registries, replay/serialization, backend/API behavior, package/tooling, docs/specs, or non-selection command producers. Keep it to the command lifecycle needed by selection/delete only.
- A generic executor may tempt implementation to migrate all application command paths in one cycle. That would violate Wave 021 scope; leave those paths as future candidates with static-scan evidence.
- If executor failure semantics differ from current `Command.addAndExecute()` rollback behavior, deletion correctness and undo/redo may regress. Focused tests must cover failure and stack state.
- If the executor hides too much, command-boundary tests may become less precise. Expose only typed result/exception behavior, not command internals.
- Existing dirty command files may change the executor’s compile/test surface; implementation must isolate its own diff and report unrelated state.

## Semantic-preservation validation requirements

The executor path must prove that extracting the `new Command` → build operations → `commit()` → `CommandStack.push()` choreography preserves current selection/delete semantics and does not silently broaden into an application kernel. Focused tests and validation notes must explicitly assert all of the following:

- Selection clearing happens only after successful selected-id command creation, cascade operation construction, executor commit, and `CommandStack.push()`.
- Failures from the selection deletion service, command operation builder, `DeletionSequenceFactory.createCascadeDeletion(...)`, executor commit path, or stack push path propagate/return failure using the chosen project style and do not clear selection.
- Undo stack count, redo stack count, redo invalidation after a new selection-delete command, and stack notification timing remain consistent with the current `CommandStack.push()` contract.
- Empty selection and empty/no-op deletion paths do not allocate/commit/push a command and do not change undo/redo stack counts.
- Existing non-undoable command behavior remains at the `CommandStack` contract boundary; the executor must not add a broad policy layer that changes which commands are accepted, rejected, or counted.
- Executor scope is limited to command lifecycle choreography needed by selection/delete in this wave. It must not absorb persistence/autosave, UI concerns, replay/serialization, operation registry redesign, backend/API behavior, package/tooling, docs/specs, or migration of canvas/tool/process-history/toolbar/world-initialization command producers.

## Validation plan

Same mandatory cadence as the direct proposal, with additional focused executor tests. Validation must explicitly prove semantic preservation of the command lifecycle being moved behind the executor:

- Selection clears only after successful command creation, operation build, commit, and stack push through the selection/delete service and executor.
- Failures during command creation, operation building, commit, or push leave selection unchanged and do not accept a partial delete.
- Undo/redo stack counts, redo invalidation, committed-only push behavior, non-undoable command treatment where relevant, and `CommandStack.push()` notification timing remain consistent with the current stack contract.
- Empty/no-op selection deletion does not create, commit, or push any command and does not change undo/redo counts.
- The executor scope is deliberately tiny: command lifecycle choreography only. It must not own persistence/autosave/UI behavior, command descriptor serialization/replay, schema migration, operation registry redesign, backend/docs/debug/package-tooling, non-selection command migration, or application-kernel/runtime ownership redesign.

Same mandatory cadence as the direct proposal, with additional focused executor tests:

1. Pre-edit scoped status/diff and static scans.
2. Focused Vitest for `ApplicationCommandExecutor`, selection deletion service, `SelectionUseCases`, app-shell runtime/boundary, and keyboard routing, including explicit semantic-preservation assertions for success ordering, build/commit/push failures, selection clearing, undo/redo counts, redo invalidation, notification timing, non-undoable command behavior, empty/no-op behavior, and executor scope limits.
3. Root/frontend lint.
4. Root/frontend full Vitest.
5. Root/frontend build.
6. Root/frontend e2e/Playwright for keyboard delete/select-all/undo/redo behavior.
7. Live preview refresh on `0.0.0.0:5173`, HTTP probes, and live browser smoke for create/select/delete/undo without real Drive credentials.

## Stop conditions for broader redesign

The executor stops at a reusable command lifecycle primitive for the selection/delete slice. It is not a new application kernel, persistence coordinator, command replay system, UI/event bus, autosave owner, or migration vehicle for every direct command producer found by static scan. The implementation must stop and request a reviewed delta before widening beyond the selected deletion boundary.

Stop for a reviewed plan edit or future wave if any of these become necessary:

- Migrating canvas/tool, process-history, toolbar, construction, world initialization, or persistence command paths to the executor to make selection/delete compile.
- Adding command serialization/deserialization responsibilities to the executor.
- Changing `CommandStack` public behavior, undo/redo semantics, autosave dirty-version timing, or persistence snapshots.
- Making `AppShellRuntime` stop owning `World`/`CommandStack` as a prerequisite.
- Replacing `DeletionSequenceFactory` with a new deletion planner or process-tree deletion model.

## When to choose this over direct

Choose restructure if review concludes that the direct service would duplicate generic lifecycle code that already appears in several application use cases and would soon need to be extracted again. Reject restructure if the proposed executor becomes a wide application kernel or tries to migrate unrelated command paths in Wave 021.
