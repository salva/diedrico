# Cycle 021 Scope Check — Selection/delete command-kernel boundary

## Stage and source-control reconciliation

Stage: `cycle-021-fresh-scout-proposals`  
Wave: `Wave 021 — Selection/delete command-kernel boundary`  
Mode: planning/scout only; no production source or test implementation changes.

Scoped pre-scout source-control evidence was captured before writing these artifacts:

- `pre-scout-scoped-status.stdout` / `.stderr`
- `pre-scout-scoped-diff-stat.stdout` / `.stderr`

The scoped status shows pre-existing dirty command files adjacent to this wave, including `frontend/src/commands/Command.ts`, `frontend/src/commands/factories/DeletionSequenceFactory.ts`, `frontend/src/commands/operations/IOperation.ts`, and several world operation files. The scoped diff-stat reports eight dirty command/operation files with 50 insertions and 27 deletions. These are not incorporated, reverted, formatted, or treated as Wave 021 implementation. This stage writes only planning artifacts under `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/` plus the Saivage task report.

## Planning evidence inspected

- `architecture-audit/wave-plan.md`, specifically the reviewed-ready Wave 021 entry captured in `wave-021-entry.stdout`.
- `architecture-audit/cycle-021-wave-plan-extension/plan-extension-note.md`, which states that Wave 020 left `SelectionUseCases` direct delete-command construction as the next central residual.
- `architecture-audit/cycle-021-wave-plan-extension/reviews/synthesized-stage-review.md`, which passed the Wave 021 plan extension and recommended this fresh scout/proposal stage.
- `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/implementation-log.md`, which marks Wave 020 complete and explicitly retains `SelectionUseCases` direct construction of delete commands through `Command` / `DeletionSequenceFactory` as residual debt.
- Current scoped source/test files listed in the stage assignment; line-number and static-scan evidence was captured in `source-evidence-lines.stdout` and `static-scan-command-boundary.stdout`.

## Current source evidence

### Active selection/delete seam

`SelectionUseCases` is the active app-shell owner for selection intent, selection-store mutation, active-plane select-all, cascade preview, and delete-selected execution. It imports command-kernel primitives directly: `Command` at `frontend/src/application/appShell/SelectionUseCases.ts:2`, `CommandStack` at `frontend/src/application/appShell/SelectionUseCases.ts:3`, and `DeletionSequenceFactory` at `frontend/src/application/appShell/SelectionUseCases.ts:4`. Its constructor receives the full mutable `World` and concrete command stack at `SelectionUseCases.ts:12-13`.

The delete path is the central leak: `deleteSelected()` reads selected ids at `SelectionUseCases.ts:34`, short-circuits empty selection at `SelectionUseCases.ts:35`, constructs `new Command('Delete elements', this.world)` at `SelectionUseCases.ts:36`, asks `DeletionSequenceFactory.createCascadeDeletion(...)` to mutate the open command at `SelectionUseCases.ts:37`, commits at `SelectionUseCases.ts:38`, pushes into the concrete stack at `SelectionUseCases.ts:39`, and clears selection at `SelectionUseCases.ts:40`.

The same class reaches through the full domain root for read behavior. `selectAllInActivePlane()` pulls an active plane from `World` at `SelectionUseCases.ts:50` and enumerates points, lines, and circles at `SelectionUseCases.ts:53-55`. Cascade preview asks `world.getDependencyService().getElementsInDeletionOrder(selectedIds)` at `SelectionUseCases.ts:64` and stores only the dependent portion at `SelectionUseCases.ts:65`.

### Keyboard routing and undo/redo boundary

`KeyboardShortcutRouter` routes user-visible keyboard behavior into selection and history. Delete/Backspace prevents default and calls `selection.deleteSelected()` at `frontend/src/application/appShell/KeyboardShortcutRouter.ts:119-122`; Ctrl/Cmd+A calls `selection.selectAllInActivePlane()` at `KeyboardShortcutRouter.ts:162`; Escape clears selection at `KeyboardShortcutRouter.ts:113-117`; undo/redo still call the concrete `CommandStack` at `KeyboardShortcutRouter.ts:164-168`. This means Wave 021 implementation must preserve keyboard Delete/Backspace, Ctrl/Cmd+A, Escape, undo, and redo behavior, but should not absorb general history routing unless selected by review.

### Runtime composition point

`AppShellRuntime` remains the current composition owner for in-memory command/domain objects. It creates `new World()` and `new CommandStack()` at `frontend/src/application/appShell/AppShellRuntime.ts:186-187`, wires both directly into `new SelectionUseCases(...)` at `AppShellRuntime.ts:208-209`, and passes the same concrete `CommandStack` to keyboard routing at `AppShellRuntime.ts:238-247`. The Wave 021 plan allows this runtime object ownership to remain if the selected proposal keeps the slice narrow; it only requires the selection/delete command creation seam to become explicit.

### Command-side execution contract

`Command` is a generic container over operations. It executes operations as they are added in `addAndExecute()` and rolls back on failure; committed commands can be pushed, undone, redone, and snapshotted (`frontend/src/commands/Command.ts`, documented and implemented around `addAndExecute`, `commit`, `undo`, and `redo`). `CommandStack.push()` accepts only committed commands and skips non-undoable commands; it clears redo history and notifies subscribers (`frontend/src/commands/CommandStack.ts`, `push()`). Therefore any new delete-selection command boundary must either keep using this contract internally or explicitly replace it through reviewed restructure. The current wave should not change command descriptors, replay, persistence, or stack semantics.

`DeletionSequenceFactory` is the command-side cascade owner today. It receives an open `Command`, selected ids, and `World`; computes dependency deletion order through `world.getDependencyService()`; adds type-specific remove operations for points, lines, segments, guides, and circles; and appends process-tree action removal operations (`frontend/src/commands/factories/DeletionSequenceFactory.ts`). This factory is a likely dependency of the new command boundary, not a target for semantic redesign in the direct proposal.

### Static scan findings and stop conditions

`static-scan-command-boundary.stdout` confirms the targeted residual is not the only application command-construction path. Other application modules still construct commands directly, including world initialization, canvas point movement/style, construction, and process-history use cases. Those paths are not selection/delete and are out of scope for the direct implementation. They are stop-condition evidence for the restructure proposal: if review wants a shared application command executor, it must be a small extracted primitive consumed by selection/delete first, not a hidden rewrite of canvas/tool/panel/toolbar/persistence paths.

The same scan shows `DeletionSequenceFactory` examples in README text and command-factory debug logging. The Wave 021 implementation should not perform docs/debug cleanup unless a reviewed plan edit broadens scope.

## Selected bounded scope for Wave 021

In scope for implementation proposals:

- Introduce a typed delete-selection command boundary under `frontend/src/application/`, such as `selectionDeletion/SelectionDeletionCommandService.ts` or `appShell/SelectionDeletionCommandPort.ts` plus an implementation module.
- Move direct `Command`, `CommandStack`, and `DeletionSequenceFactory` usage out of `SelectionUseCases.deleteSelected()` and into the new boundary.
- Keep `SelectionUseCases` responsible for intent orchestration: read selected ids, no-op empty selection, call delete boundary, clear selection on success, clear/update cascade preview, select all in active plane.
- Optionally introduce a narrow selection read port for active-plane enumeration and cascade-order preview if implementation can do so without widening the wave.
- Update focused app-shell/selection/keyboard tests so they assert ports/results and behavior, not concrete command internals.
- Add a command-boundary test that covers cascade deletion, command commit/push, empty-selection no-op, undo/redo integration, and failure propagation/selection-clearing behavior.
- Preserve existing keyboard Delete/Backspace, Ctrl/Cmd+A, Escape, undo, and redo behavior.

Out of scope unless a reviewed mini-cycle broadens Wave 021:

- Project persistence schema, command snapshots/descriptors, operation replay, Drive/auth behavior, ProjectService internals, or app-shell persistence ports except for types directly needed by the delete boundary.
- Canvas/tool, construction, process-history panel/toolbar, or toolbar history command paths.
- General application-kernel/runtime ownership of `World` and `CommandStack` beyond wiring the new delete boundary.
- Rendering, Three view, backend, package/tooling, validation-platform, docs/spec, placeholder/debug/noisy logging cleanup.
- Deleting or redesigning `DeletionSequenceFactory` cascade semantics.

## Premises and invalidated assumptions

Premises still valid:

- Wave 020 is complete and intentionally left `SelectionUseCases` direct command construction as residual debt.
- The active app-shell delete path still routes through `SelectionUseCases.deleteSelected()` from keyboard Delete/Backspace.
- `AppShellRuntime` remains the correct current composition point for wiring the new selection/delete command service.
- `DeletionSequenceFactory` remains the current cascade deletion algorithm owner and can be consumed behind an application boundary.

No Wave 021 premise was invalidated by the current source check. The wave-plan entry does not require edit before review. Static scan did reveal broader direct command construction in application modules, but the Wave 021 scope guard already anticipates this and reserves it for future/restructure review rather than direct implementation.

## DELETE list candidates

Implementation should delete, not wrap, these surfaces if the direct or restructure proposal is selected:

- `SelectionUseCases.ts` imports of `Command`, `CommandStack`, and `DeletionSequenceFactory`.
- `SelectionUseCases.deleteSelected()` direct `new Command(...)`, `DeletionSequenceFactory.createCascadeDeletion(...)`, `commit()`, and `commandStack.push(...)` calls.
- Boundary test assertions that require `SelectionUseCases` to construct commands directly; `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` currently has a residual assertion expecting `SelectionUseCases` to contain `DeletionSequenceFactory|new Command` (captured in `static-scan-command-boundary.stdout`).
- Broad `World as any` / `CommandStack as any` selection test doubles if touched; replace with typed ports/fakes where possible.
- Any transitional dual path that lets both old direct delete construction and the new boundary remain active.

Do not delete in this wave:

- `DeletionSequenceFactory` itself or its cascade semantics.
- Command/operation descriptor persistence code.
- Other application command use cases outside selection/delete.
- README/debug/placeholder surfaces unrelated to the selection/delete boundary.

## Validation requirements for the future implementation stage

The implementation stage must capture all logs under `architecture-audit/cycle-021-selection-delete-command-kernel-boundary/validation/` and include them in `implementation-log.md`:

1. Pre-edit scoped status/diff and static scans for `SelectionUseCases`, `new Command`, `DeletionSequenceFactory`, `CommandStack.push`, delete-selected call sites, cascade-preview dependency reads, and keyboard delete routing.
2. Focused Vitest for selection use cases, the new delete command boundary/service, app-shell runtime wiring, and keyboard shortcut routing.
3. Root lint and frontend lint where scripts are defined.
4. Full root and frontend Vitest.
5. Root and frontend build.
6. Root and frontend Playwright/e2e because selection/delete/undo/keyboard behavior is user-observable.
7. Live preview refresh on `0.0.0.0:5173`, HTTP reachability probes, and credential-free Playwright/live smoke that creates/selects/deletes/restores representative elements via keyboard or UI.

## Recommendation

Proceed to `cycle-021-review-round-01` to review the two proposals in this directory. Do not implement from this fresh-scout stage.
