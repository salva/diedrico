# Cycle 021 Decision — Selection/delete command-kernel boundary

## Decision status

**Review convergence:** complete.  
**Final review artifact:** `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/reviews/round-02-review.md`.  
**Round-02 verdict:** **NO BLOCKING ISSUES**.  
**Recommended next stage:** `cycle-021-implement-selection-delete-command-kernel-boundary`.

Cycle 021 may proceed to implementation because the reviewed proposal set has converged with no blocking issues. This decision is planning-only: it does not implement source, test, package, backend, docs, config, or tooling changes.

## Artifacts inspected

- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/scope-check.md`
- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/reviews/round-01-review.md`
- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/corrections-round-01.md`
- `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/reviews/round-02-review.md`
- `architecture-audit/wave-plan.md`
- Scoped source-control evidence captured for this decision:
  - `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/decision-scoped-status.stdout`
  - `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/decision-scoped-status.stderr`
  - `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/decision-scoped-diff-stat.stdout`
  - `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/decision-scoped-diff-stat.stderr`
  - `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/existing-decision-check.stdout`
  - `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/existing-decision-check.stderr`

The scoped status/diff inspection was intentionally path-limited to Cycle 021 artifacts, the stage report path, and the selection/app-shell source areas relevant to the next implementation. It was used only to verify source-control hygiene before writing this decision.

## Correction and review history

Round 01 reported one blocking issue: both implementation proposals needed explicit semantic-preservation validation for the command lifecycle boundary being extracted. The blocker required concrete proof that the extracted boundary preserves selection clearing, failure behavior, undo/redo counts, redo invalidation, empty/no-op behavior, committed-only push behavior, non-undoable command treatment, notification timing, and executor/service scope limits.

`corrections-round-01.md` records that both proposals were edited in place to resolve those requirements:

- `proposal-direct.md` now requires focused tests proving selection clears only after successful command creation, cascade operation construction, `commit()`, and `CommandStack.push()`.
- `proposal-direct.md` now requires failure coverage for command creation, cascade factory invocation, commit, and push, with selection unchanged on failure.
- `proposal-direct.md` now requires undo/redo stack-count, redo-invalidation, notification-timing, committed-only push, non-undoable command behavior, and empty/no-op assertions.
- `proposal-restructure.md` now applies the same semantic-preservation requirements to its proposed tiny `ApplicationCommandExecutor` path and explicitly forbids broadening the executor into a general application kernel.

Round 02 re-reviewed the corrected proposals and states **NO BLOCKING ISSUES**. It explicitly confirms that both proposals now satisfy the semantic-preservation validation requirements and that `proposal-direct.md` remains the preferred path because it removes the accepted residual with the narrowest surface area.

## Selected implementation path

**Selected:** `proposals/proposal-direct.md` — extract a narrow selection-delete command service.

### Rationale

The direct proposal is selected because it removes the exact Wave 020 residual: `SelectionUseCases.deleteSelected()` directly owns command-kernel construction and push choreography. It does so without broadening Cycle 021 into general command-kernel redesign, runtime ownership redesign, persistence changes, or migration of unrelated command producers. This best matches the Wave 021 target outcome and the round-02 review recommendation.

The selected implementation must introduce a focused application boundary for selection/delete command execution. `SelectionUseCases` should remain responsible for selection intent orchestration, while the new command service owns `Command`, `DeletionSequenceFactory`, `commit()`, and `CommandStack.push()` for this slice.

### Rejected alternative

`proposals/proposal-restructure.md` is rejected for Cycle 021 implementation. It is reviewed and no longer blocked, but it is broader than necessary because it introduces a reusable `ApplicationCommandExecutor`. Static scan evidence shows several other direct command-construction sites in the codebase, so an executor carries more expansion pressure and greater risk of becoming a hidden application kernel in this wave.

The restructure path remains a future fallback only if a later reviewed wave decides that shared command lifecycle choreography should be extracted across multiple command-producing use cases. It must not be smuggled into Cycle 021 implementation.

## Bound implementation scope

The next implementation stage may change only files directly required by the selected direct path.

### Production source allowed

- `frontend/src/application/appShell/SelectionUseCases.ts`
  - Remove direct command-kernel imports and direct delete command construction.
  - Keep orchestration responsibilities: selected-id read, empty-selection no-op, delete-service invocation, selection clearing after success, cascade preview, and select-all in active plane.
- New focused selection-delete boundary module(s), preferably under `frontend/src/application/selectionDeletion/`, such as:
  - `SelectionDeletionCommandService.ts`
  - `SelectionDeletionPorts.ts` if explicit ports are useful.
- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Wire the new service at the existing composition point using the current `World` and `CommandStack`.
- `frontend/src/application/appShell/AppShellPorts.ts`
  - Only if a small port definition genuinely belongs there; prefer a dedicated selection-deletion module to avoid app-shell port bloat.
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
  - Touch only if type narrowing is necessary. Keyboard behavior must not change.

### Tests allowed

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
- `frontend/tests/unit/application/appShell/KeyboardShortcutRouter.test.ts`
- New focused tests under `frontend/tests/unit/application/selectionDeletion/`
- Focused `SelectionUseCases` tests if they already exist or are needed to prove orchestration/failure behavior.

### Required DELETE list

The implementation must delete, not wrap, these surfaces:

- `SelectionUseCases.ts` imports of `Command`, `CommandStack`, and `DeletionSequenceFactory`.
- Direct `new Command(...)`, `DeletionSequenceFactory.createCascadeDeletion(...)`, `commit()`, and `commandStack.push(...)` calls from `SelectionUseCases.deleteSelected()`.
- The `AppShellBoundary.test.ts` expectation that `SelectionUseCases` still matches `DeletionSequenceFactory|new Command`.
- Any touched broad test fake that casts `World as any` or `CommandStack as any` solely to observe command internals, when a typed port/fake can replace it in scope.
- Any transitional compatibility wrapper, overload, or dual path that allows both old direct selection deletion and the new service path to remain active.

### Explicitly protected out-of-scope surfaces

Do not change, repair, format, or delete these in Cycle 021 unless a reviewed delta/mini-cycle explicitly broadens the wave:

- Backend code, backend tests, backend package scripts, and backend project contracts.
- `docs/`, `specs/`, README/debug cleanup, placeholder operation docs, or stale audit-history artifacts.
- Package metadata, lockfiles, test runner configuration, Playwright infrastructure, Vite/Vitest tooling, or Node/toolchain configuration.
- Project persistence schema, `ProjectService` contract redesign, command descriptors, operation replay/serialization, Drive/auth behavior, autosave architecture, or migration/backcompat logic.
- Canvas/tool command paths, process-history panel/toolbar command paths, construction use cases, world initialization command paths, rendering services, Three view, and non-selection command producers.
- `DeletionSequenceFactory` cascade semantics, process-tree deletion behavior, and command/operation execution semantics.
- Moving `World` or `CommandStack` ownership out of `AppShellRuntime`.

## Executor boundary rules

- The new service is the executor boundary for selection/delete only.
- It may depend on the current concrete `World`, `CommandStack`, `Command`, and `DeletionSequenceFactory` internally.
- `SelectionUseCases` must not import or instantiate `Command`, `CommandStack`, or `DeletionSequenceFactory` after the implementation.
- `SelectionUseCases` may call a typed delete-selection port and may consume narrow read/query ports for active-plane enumeration and cascade-preview ordering if implementation chooses to introduce them.
- The service must not own persistence, autosave, UI notifications, command serialization/replay, operation registry redesign, backend/API behavior, package/tooling, docs/specs, or other command-producer migration.

## Semantic-preservation requirements

The implementation must prove the extracted boundary preserves existing selection/delete command lifecycle semantics:

- Empty selection remains a no-op and does not create, commit, or push a command.
- Delete/Backspace still removes selected elements and their dependent cascade elements in the existing dependency order.
- Selection clears only after selected ids are read and command creation, cascade operation building, `commit()`, and `CommandStack.push()` all succeed.
- Failures during command creation, `DeletionSequenceFactory.createCascadeDeletion(...)`, `commit()`, or `CommandStack.push(...)` propagate or return failure using the project’s selected style and do not clear selection.
- Undo stack count, redo stack count, redo invalidation after a new delete command, committed-only push behavior, non-undoable command handling, and `CommandStack.push()` notification timing remain consistent with the current `CommandStack` contract.
- Ctrl/Cmd+A still selects elements in the active plane.
- Escape still clears selection and returns to select-tool behavior where currently applicable.
- Undo/redo still restore/delete the same elements and update stack state as before.
- Cascade preview still shows dependent elements while selection is active.

## Validation and log requirements for implementation

All implementation validation stdout/stderr must be captured under:

`architecture-audit/cycle-021-selection-delete-command-kernel-boundary/validation/`

The implementation log must cite the exact log filenames and summarize outcomes.

Minimum required validation:

1. Pre-edit scoped git status/diff plus static scans for:
   - `SelectionUseCases`
   - `new Command`
   - `DeletionSequenceFactory`
   - `CommandStack.push`
   - delete-selected call sites
   - cascade-preview dependency reads
   - keyboard delete routing
2. Focused Vitest for:
   - the new selection-delete command service, including success ordering, failure paths, empty/no-op behavior, undo/redo counts, redo invalidation, notification timing, committed-only push behavior, and non-undoable handling;
   - `SelectionUseCases`, including success clears selection, failure preserves selection, empty/no-op behavior, cascade preview, and select-all in active plane;
   - app-shell boundary/runtime wiring proving only the new service owns `DeletionSequenceFactory` for this slice and `SelectionUseCases` no longer imports command-kernel primitives;
   - keyboard shortcut routing for Delete/Backspace, Ctrl/Cmd+A, Escape, undo, and redo.
3. Root `npm run lint` and frontend lint where scripts are defined.
4. Root and frontend full Vitest suites.
5. Root and frontend `npm run build` where scripts are defined.
6. Root and frontend e2e/Playwright because this wave touches user-observable frontend selection/delete/undo behavior.
7. Live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and credential-free Playwright/live smoke that creates/selects/deletes/restores representative elements via keyboard or UI.

If an existing unrelated dirty file or pre-existing failing gate affects validation, the implementation log must identify the exact file/log evidence and explain why the failure is unrelated. Do not patch unrelated failures under Cycle 021.

## Source-control hygiene constraints

- Stay on the active `develop` branch; do not switch branches, rebase, push, or create remote-tracking changes.
- Before editing source in the implementation stage, capture scoped status/diff for the allowed paths.
- Do not revert or incorporate adjacent dirty files unless they are directly required by the selected implementation and the implementation log explains why.
- Current scoped source-control evidence from this decision shows pre-existing modified Cycle 021 planning artifacts and generated review/status artifacts. Prior scope-check evidence also reported adjacent dirty command/operation files outside the selection-delete implementation boundary. Those are not authorization to reformat or repair unrelated command code.
- Commit only files intentionally changed by the implementation stage.
- Do not read or log secret/config files, including `.saivage/auth-profiles.json`, `.saivage/saivage.json`, env files, OAuth tokens, Drive credentials, provider configs, or shell history.

## Stop conditions

Stop and request a reviewed delta/mini-cycle if the implementation appears to require any of the following:

- Changing command descriptor serialization, operation replay, persistence snapshots, migration logic, or `ProjectService` internals.
- Changing `CommandStack` public behavior, undo/redo semantics, autosave dirty-version timing, or command notification timing rather than preserving it.
- Rewriting `DeletionSequenceFactory`, cascade deletion order, process-tree deletion behavior, or dependency-service semantics.
- Introducing a generic `ApplicationCommandExecutor`, global application kernel, UI/event bus, autosave owner, or command-replay coordinator.
- Migrating canvas/tool/process-history/toolbar/world-initialization command producers into the new boundary.
- Moving `World` or `CommandStack` construction out of `AppShellRuntime`.
- Modifying package/tooling/e2e infrastructure, backend, docs/specs, debug cleanup, or stale audit-history artifacts to make the wave pass.
- Preserving both old direct selection deletion and new service deletion as parallel active paths.

## Residual risks accepted for implementation

- Other direct command-construction sites remain in the application. They are known residuals and are not Cycle 021 failures unless the selected implementation expands into them.
- Existing adjacent dirty command/operation files may complicate validation attribution. The implementation stage must isolate its own diff and report unrelated failures precisely.
- The new service may still depend internally on concrete `World` and `CommandStack`; this is acceptable for Cycle 021 because the goal is to remove command-kernel construction from `SelectionUseCases`, not to redesign runtime ownership.
- If tests only restate semantic-preservation requirements without actually executing failure/order/undo-redo assertions, validation is insufficient and the wave must not be marked complete.

## Final recommendation

Proceed to `cycle-021-implement-selection-delete-command-kernel-boundary` using `proposal-direct.md` exactly as constrained above. Do not implement `proposal-restructure.md` in Cycle 021, and do not broaden beyond the reviewed direct selection/delete command-service boundary.
