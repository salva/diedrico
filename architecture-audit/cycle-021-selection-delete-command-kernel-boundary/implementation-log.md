# Cycle 021 Implementation Log — Selection/delete command-kernel boundary

## Selected path followed

Implemented the decision-selected direct path from `proposal-direct.md`: `SelectionUseCases` remains the selection orchestration owner, while a new narrow selection/delete command service owns the command-kernel lifecycle for this slice only. No `proposal-restructure.md` generic `ApplicationCommandExecutor`, application kernel, persistence/replay work, backend/docs/tooling change, or broad non-selection command migration was introduced.

## Source files changed

Production:

- `frontend/src/application/selectionDeletion/SelectionDeletionPorts.ts` — added the narrow `SelectionDeletionCommandPort` with only `execute(selectedIds)`.
- `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts` — added the focused service that creates `Command`, delegates cascade construction to `DeletionSequenceFactory`, commits, and pushes to `CommandStack` for selection/delete only. Test-only injectable internals are private to this class and do not widen the public application boundary.
- `frontend/src/application/appShell/SelectionUseCases.ts` — removed direct imports/use of `Command`, `CommandStack`, and `DeletionSequenceFactory`; `deleteSelected()` now reads selection ids, no-ops on empty selection, invokes the narrow delete command port, and clears selection only after the port returns successfully. Existing cascade preview and select-all active-plane behavior remain in place.
- `frontend/src/application/appShell/AppShellRuntime.ts` — wires `SelectionDeletionCommandService` at the existing runtime composition point using the current `world` and `commandStack`, then passes it into `SelectionUseCases`.

Tests:

- `frontend/tests/unit/application/selectionDeletion/SelectionDeletionCommandService.test.ts` — new focused tests for cascade deletion, lifecycle ordering, failure propagation, empty/no-op behavior, undo/redo counts, redo invalidation, notification timing, committed-only push behavior, non-undoable commands, and boundary scope.
- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts` — updated `SelectionUseCases` construction for the new port and added tests proving successful deletion clears selection, failure preserves selection, and empty selection does not call the command boundary.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` — replaced the Cycle 020 residual assertion with a prohibition on `SelectionUseCases` command-kernel construction and positive assertions that only the new service owns `DeletionSequenceFactory`, `new Command`, `commit()`, and `commandStack.push()` for this slice.
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts` — added credential-free user-observable coverage for create/select, Ctrl+A, Escape, Delete, undo, and redo keyboard behavior.

Audit/log artifacts:

- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/validation/*` — stable stdout/stderr and scan logs for required validation.
- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/implementation-log.md` — this log.

## DELETE/proof list

Deleted from `SelectionUseCases.ts`:

- `Command` import.
- `CommandStack` import and constructor dependency.
- `DeletionSequenceFactory` import.
- Direct `new Command(...)` call.
- Direct `DeletionSequenceFactory.createCascadeDeletion(...)` call.
- Direct `deleteCommand.commit()` call.
- Direct `commandStack.push(deleteCommand)` call.

Deleted from tests:

- The `AppShellBoundary.test.ts` expectation that `SelectionUseCases` still matches `DeletionSequenceFactory|new Command` as accepted residual debt.

No compatibility wrapper, overload, or dual active selection-delete path was added. No broad fake helper casts were added solely to inspect command internals from `SelectionUseCases`; command lifecycle inspection lives in the focused service tests.

## Semantic-preservation evidence

Focused tests in `focused-vitest.stdout` prove:

- Empty selection remains a no-op: service does not create/commit/push, `SelectionUseCases` does not clear selection, and undo/redo counts are unchanged.
- Successful selection deletion removes selected and cascade-dependent elements through existing `DeletionSequenceFactory` ordering and pushes one committed delete command.
- Selection clears only after the command port returns successfully.
- Failure during command creation, cascade building, commit, or push propagates and does not clear selection at the `SelectionUseCases` boundary.
- Undo/redo counts, redo invalidation, notification timing, committed-only push behavior, and non-undoable command handling continue to be enforced by the existing `CommandStack` path.
- Cascade preview still reads dependency deletion order while selection is active.
- Ctrl/Cmd+A select-all-in-active-plane and Escape/Delete/undo/redo keyboard routing remain covered.

Focused e2e in `focused-e2e-keyboard.stdout` provides credential-free browser evidence for create/select/delete/undo/redo plus Ctrl+A and Escape status/keyboard behavior.

## Validation log index

All logs are under `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/validation/`.

Source-control/static scans:

- `pre-edit-scoped-status.stdout` / `.stderr` — captured scoped status before editing.
- `pre-edit-scoped-diff-stat.stdout` / `.stderr` — captured scoped diff stat before editing.
- `pre-edit-static-scan.stdout` / `.stderr` — captured initial direct command-kernel references.
- `post-edit-scoped-status.stdout` / `.stderr` and `post-edit-scoped-diff-stat.stdout` / `.stderr` — captured post-edit scoped status/diff.
- `post-edit-static-scan.stdout` / `.stderr` — captured post-edit direct reference scan.
- `final-scoped-status.stdout` / `.stderr`, `final-scoped-diff-stat.stdout` / `.stderr`, `final-static-scan.stdout` / `.stderr` — final scoped source-control and boundary evidence before report/commit.

Green validation gates:

- `root-lint.stdout` / `.stderr` — `npm run lint` from root: pass.
- `frontend-lint.stdout` / `.stderr` — `npm run lint` from `frontend/`: pass.
- `focused-vitest.stdout` / `.stderr` — focused service/app-shell/boundary/keyboard unit tests: pass.
- `root-vitest.stdout` / `.stderr` — root `npm run test`: pass.
- `frontend-vitest.stdout` / `.stderr` — frontend `npm run test`: pass.
- `root-build.stdout` / `.stderr` — root `npm run build`: pass.
- `frontend-build.stdout` / `.stderr` — frontend `npm run build`: pass.
- `focused-e2e-keyboard.stdout` / `.stderr` — focused keyboard selection/delete e2e: pass.
- `root-e2e.stdout` / `.stderr` — root `npm run test:e2e`: pass.
- `frontend-e2e.stdout` / `.stderr` — frontend `npm run test:e2e`: pass.

Live preview:

- `live-preview.stdout` / `.stderr` — refreshed persistent Vite preview with `npm run dev --workspace=frontend -- --host 0.0.0.0`.
- `live-preview-probe.stdout` — reachable at `http://127.0.0.1:5173/` on attempt 1, pid `556868`.
- `live-preview-probe.html` / `.stderr` — HTTP probe artifact.

## Protected-surface checks

No backend, docs/specs, package metadata, lockfiles, Vite/Vitest/Playwright config, persistence schema/replay internals, `ProjectService`/Drive/auth internals, rendering/domain layers, canvas/tool command producers, process-history/toolbar producers, or secret/config/env files were read or modified. The e2e spec change was directly required by the Cycle 021 validation requirement for user-visible selection/delete/keyboard behavior.

## Source-control reconciliation

Pre-edit scoped evidence was captured because full `git_status` exceeded MCP output limits. The implementation touched only the selected Cycle 021 production/test/audit paths listed above. Adjacent dirty files outside this scoped implementation were not inspected for content, incorporated, reformatted, or reverted.

## Residual risks

- Other direct command-construction sites remain known residuals outside Cycle 021 scope.
- `SelectionDeletionCommandService` intentionally depends internally on concrete `World`, `CommandStack`, `Command`, and `DeletionSequenceFactory`; this is accepted by the decision for the direct path and should be revisited only in a later reviewed wave if a broader command lifecycle boundary is selected.

## Next-wave candidates observed

- Consider a future reviewed wave for other command-producing use cases if repeated command lifecycle choreography remains a central architectural leak.
