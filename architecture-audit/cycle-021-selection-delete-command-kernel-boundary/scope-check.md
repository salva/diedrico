# Cycle 021 Scope Check — Selection/delete command-kernel boundary

## Status

**Wave 021 implementation premise is invalidated by current source.** The wave-plan entry says this wave should remove direct `Command` / `CommandStack` / `DeletionSequenceFactory` construction from `SelectionUseCases`, but current post-Wave-020 source already has that boundary: `SelectionUseCases` depends on a `SelectionDeletionCommandPort` and does not import command construction primitives (`frontend/src/application/appShell/SelectionUseCases.ts:1-3`, `frontend/src/application/appShell/SelectionUseCases.ts:8-13`, `frontend/src/application/appShell/SelectionUseCases.ts:30-35`). The concrete command lifecycle is already isolated in `SelectionDeletionCommandService` (`frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:1-5`, `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:12-17`, `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:30-37`).

**Recommended stage outcome:** do not implement Wave 021 as written. Send the corrected finding through review/critic, then schedule a small plan-edit/review stage that marks Wave 021 already satisfied/superseded and re-ranks to the next central remaining command/runtime boundary. The best candidate from current evidence is the broader command-producer/runtime-port work named later in the current plan, not another selection-delete extraction.

## Evidence inspected first

Source-control and evidence logs captured for this scope check:

- `.saivage/stages/cycle-021-fresh-scout-proposals-post-020/logs/path-scoped-status.stdout`
- `.saivage/stages/cycle-021-fresh-scout-proposals-post-020/logs/path-scoped-diff-names.stdout`
- `.saivage/stages/cycle-021-fresh-scout-proposals-post-020/logs/protected-dirty-diff-preview.stdout`
- `.saivage/stages/cycle-021-fresh-scout-proposals-post-020/logs/wave021-exact-search.stdout`
- `.saivage/stages/cycle-021-fresh-scout-proposals-post-020/logs/appshell-source-evidence.stdout`
- `.saivage/stages/cycle-021-fresh-scout-proposals-post-020/logs/selection-deletion-source-evidence.stdout`
- `.saivage/stages/cycle-021-fresh-scout-proposals-post-020/logs/active-command-producers-grep.stdout`
- `architecture-audit/cycle-020-app-shell-project-session-browser-integration/implementation-log-post-019.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-integration/decision-post-019.md`
- `architecture-audit/cycle-020-app-shell-project-session-browser-integration/validation/`
- `architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md`

No secret/config/env files were read.

## Wave-plan premise status

The current `architecture-audit/wave-plan.md` Wave 021 entry still states stale facts from an earlier source shape:

- It says `SelectionUseCases` imports `Command`, `CommandStack`, `DeletionSequenceFactory`, and `World`, receives `world` / `commandStack`, and creates/commits/pushes a delete command directly. That claim appears in the Wave 021 plan text (`architecture-audit/wave-plan.md:1237-1241`).
- It sets a delete list that includes removing `SelectionUseCases.ts` imports/calls for `Command`, `CommandStack`, `DeletionSequenceFactory`, `new Command(...)`, `commit()`, and `commandStack.push(...)` (`architecture-audit/wave-plan.md:1253-1257`).

Current source contradicts that premise:

- `SelectionUseCases` imports only Vue watch types, `SelectionDeletionCommandPort`, and app-shell selection/read-store ports (`frontend/src/application/appShell/SelectionUseCases.ts:1-3`).
- Its constructor receives `selectionRead`, `deleteSelectionCommand`, `selectionStore`, and `getActivePlaneId`, not `World` or `CommandStack` (`frontend/src/application/appShell/SelectionUseCases.ts:8-13`).
- `deleteSelected()` reads selected IDs, returns on empty selection, calls `deleteSelectionCommand.execute(selectedIds)`, and clears selection; it does not construct, commit, or push a `Command` (`frontend/src/application/appShell/SelectionUseCases.ts:30-35`).
- `SelectionReadPort` exposes cascade preview and active-plane selectable reads as narrow queries (`frontend/src/application/appShell/AppShellPorts.ts:45-48`).
- The command lifecycle is in `SelectionDeletionCommandService`: it creates `new Command`, delegates cascade operation construction to `DeletionSequenceFactory`, commits, and pushes to `CommandStack` (`frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:12-17`, `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:30-37`).
- `RuntimeSession.selectionDeletionCommandPort()` wires the concrete service using runtime-owned `world` and `commandStack` (`frontend/src/application/appShell/RuntimeSession.ts:31-33`, `frontend/src/application/appShell/RuntimeSession.ts:170-172`).
- Current boundary tests already assert the Wave 021 target state: `SelectionUseCases` must not contain `DeletionSequenceFactory`, `new Command`, `CommandStack`, `commandStack.push`, or `.commit(`, while `SelectionDeletionCommandService` owns those tokens (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:62-69`).

Conclusion: the Wave 021 entry was already implemented by current source (possibly by an intervening/discarded or prior local wave), so implementing it again would either be a no-op or would broaden into unrelated command-kernel work without review.

## Current selection/delete command-kernel seam inventory

### Selection intent orchestration

- `SelectionUseCases.start()` watches `selectionStore.selectedIdsArray` and immediately refreshes cascade preview (`frontend/src/application/appShell/SelectionUseCases.ts:15-21`).
- `deleteSelected()` delegates the delete command to `SelectionDeletionCommandPort` and clears selection only after the command port returns (`frontend/src/application/appShell/SelectionUseCases.ts:30-35`).
- `selectAllInActivePlane()` remains selection-intent logic: it asks `SelectionReadPort.getSelectableIdsInPlane(activePlaneId)` and updates the selection store (`frontend/src/application/appShell/SelectionUseCases.ts:41-46`).
- `updateCascadePreview()` asks `SelectionReadPort.getCascadePreviewIds(selectedIds)` and updates cascade highlight state (`frontend/src/application/appShell/SelectionUseCases.ts:48-55`).

### Cascade-preview dependency reads

- `SelectionReadPort` is a narrow app-shell port with `getSelectableIdsInPlane` and `getCascadePreviewIds` (`frontend/src/application/appShell/AppShellPorts.ts:45-48`).
- `RuntimeSession.selectionReadPort()` implements `getSelectableIdsInPlane` by reading projection-plane points/lines/circles and implements `getCascadePreviewIds` through `world.getDependencyService().getElementsInDeletionOrder(...)`, returning only IDs not directly selected (`frontend/src/application/appShell/RuntimeSession.ts:142-158`).
- The selection store owns selected IDs and cascade-highlight IDs as UI state (`frontend/src/stores/selectionStore.ts:21-32`, `frontend/src/stores/selectionStore.ts:96-107`).

### Delete command construction and commit/push

- `SelectionDeletionCommandPort` is a behavior-sized application boundary with one method: `execute(selectedIds: readonly string[]): void` (`frontend/src/application/selectionDeletion/SelectionDeletionPorts.ts:1-3`).
- `SelectionDeletionCommandService` is the only active selection-delete production service found. It owns command creation, cascade sequence construction, commit, and stack push (`frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:1-5`, `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:12-17`, `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:30-37`).
- `DeletionSequenceFactory.createCascadeDeletion` still owns deletion-order, element-type operation selection, and process-tree action removal (`frontend/src/commands/factories/DeletionSequenceFactory.ts:54-58`, `frontend/src/commands/factories/DeletionSequenceFactory.ts:59-70`, `frontend/src/commands/factories/DeletionSequenceFactory.ts:91-138`). This remains intentionally inside the command layer for the selection-delete slice.
- `Command` enforces building/committed/undone lifecycle, applies operations immediately, marks world dirty, and commits only non-empty commands (`frontend/src/commands/Command.ts:99-112`, `frontend/src/commands/Command.ts:160-188`, `frontend/src/commands/Command.ts:206-212`).
- `CommandStack.push()` accepts only committed commands, skips non-undoable commands, appends to undo stack, clears redo stack, and notifies subscribers (`frontend/src/commands/CommandStack.ts:40-68`).

### Keyboard Delete/Backspace routing

- `KeyboardShortcutRouter.handle()` routes `Delete` and `Backspace` to `this.deps.selection.deleteSelected()` only when the target is not a text input, and prevents default browser behavior (`frontend/src/application/appShell/KeyboardShortcutRouter.ts:40-54`).
- The router depends on `SelectionUseCases`, not directly on `CommandStack` or command factories (`frontend/src/application/appShell/KeyboardShortcutRouter.ts:1-5`, `frontend/src/application/appShell/KeyboardShortcutRouter.ts:16-25`).

### AppShellRuntime / RuntimeSession wiring

- `createAppShellRuntime()` constructs one `RuntimeSession`, obtains `selectionDeletion = session.selectionDeletionCommandPort()`, and passes that port into `SelectionUseCases` (`frontend/src/application/appShell/AppShellRuntime.ts:14-18`, `frontend/src/application/appShell/AppShellRuntime.ts:44-47`).
- The runtime return still exposes `internals.selectionDeletion` for tests/introspection (`frontend/src/application/appShell/AppShellRuntime.ts:147-148`). This is a residual testing surface, not production UI behavior.
- `RuntimeSession` remains owner of the in-memory `World` and `CommandStack` (`frontend/src/application/appShell/RuntimeSession.ts:31-33`). It also wires canvas tool command production and process-history command production through separate controllers (`frontend/src/application/appShell/RuntimeSession.ts:116-128`). Those producers are out of scope for a selection-delete-only implementation.

### Other command producers relevant to re-rank, not Wave 021 implementation

Static scan shows other active application command producers remain outside the selection-delete slice:

- world initialization uses `new Command`, `commit`, and `commandStack.push` (`frontend/src/application/world/initializeWorld.ts:19-34`).
- canvas point movement and style use cases still accept `CommandStack`, create commands, commit, and push (`frontend/src/application/canvas/CanvasPointMovementUseCase.ts:3-33`, `frontend/src/application/canvas/CanvasStyleUseCase.ts:2-15`).
- construction/process-history use cases still own direct command lifecycle (`frontend/src/application/construction/ConstructionUseCases.ts:2-44`, `frontend/src/application/processHistory/ProcessHistoryUseCases.ts:2-78`).

Those are candidate next-wave surfaces. They are not a reason to mutate selection-delete code in this stage.

## Bounded scope selected for this stage

Design-only artifacts only:

- This `scope-check.md`.
- `proposals/proposal-direct.md` recommending no source implementation for Wave 021 and a corrective plan-edit/review stage because the target boundary is already present.
- `proposals/proposal-restructure.md` testing whether to broaden into a higher-level command kernel now; it rejects silent broadening and recommends re-ranking through `wave-plan.md` instead.

No production source, tests, package/tooling, validation scripts, preview, docs/specs, backend, persistence schema, command descriptors, command replay, Drive/auth, rendering, Three/canvas, UI feature work, or e2e rewrite is performed.

## Out-of-scope and protected surfaces

Do not touch during this design-only stage or any direct Wave 021 implementation attempt:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`
- `frontend/src/stores/viewStore.ts`
- unrelated e2e deletions or audit/validation noise
- `frontend/src/commands/Command.ts` and `frontend/src/commands/factories/DeletionSequenceFactory.ts` currently show pre-existing dirty diffs; treat them as protected until a reviewed implementation wave explicitly owns them
- command descriptor serialization, `OperationRegistry`, persistence schema/replay, `ProjectService`, Drive/auth internals, backend, docs/specs, package metadata, lockfiles, validation-platform work
- Three scene host/runtime/registry/adapters, `ThreeView.vue`, OrbitControls, overlay CSS, canvas drag behavior
- app-shell production browser composition hardened by Wave 020

## Source-control reconciliation

Full `git_status` overflowed the MCP buffer, so this stage used path-scoped status/diff logs.

Path-scoped status before writing artifacts showed these relevant/protected dirty files:

- `frontend/src/commands/Command.ts`
- `frontend/src/commands/factories/DeletionSequenceFactory.ts`
- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`
- `frontend/src/stores/viewStore.ts`

The dirty `Command.ts` and `DeletionSequenceFactory.ts` changes are small type/unused-binding edits in files relevant to command construction, but they are not Wave 021 design outputs and must not be staged or normalized by this task. The dirty `Intersections.ts`, `ActionGroup.ts`, and `viewStore.ts` files are unrelated/protected. This design stage changes only audit artifacts, stage logs, and the task report.

## DELETE list candidates

Already satisfied / no-op for current source:

- Delete `SelectionUseCases.ts` imports of `Command`, `CommandStack`, and `DeletionSequenceFactory` — already absent.
- Delete direct `new Command(...)`, `DeletionSequenceFactory.createCascadeDeletion(...)`, `commit()`, and `commandStack.push(...)` calls from `SelectionUseCases.deleteSelected()` — already absent.
- Delete selection-use-case tests requiring `SelectionUseCases` to construct commands — current boundary test asserts the opposite.
- Delete transitional old/new delete-selected paths — only the port/service path was found for app-shell selection-delete.

Still possible but **not justified as Wave 021 implementation** without a plan edit:

- Remove or narrow `createAppShellRuntime().internals.selectionDeletion` if broader runtime test introspection cleanup is selected in a later wave.
- Introduce a more general application command executor for canvas/style/construction/process-history command producers. This is a different wave because it touches multiple producers and risks a broad command-kernel facade.
- Refactor `SelectionDeletionCommandService` internals around typed result/error reporting. This would change the already-satisfied selection-delete boundary and should be justified by concrete behavior/test needs, not by the stale Wave 021 premise.

## Validation requirements if a later reviewed plan edit selects source work

Minimum validation for any future source implementation that touches selection/delete, command lifecycle, app-shell runtime wiring, or keyboard behavior:

1. Pre/post path-scoped git status and diff for selected files and protected dirty paths.
2. Static scans proving `SelectionUseCases.ts` remains free of `Command`, `CommandStack`, `DeletionSequenceFactory`, `new Command`, `commit()`, and `commandStack.push`, and that app-shell production browser composition remains behind Wave 020 boundaries.
3. Focused Vitest:
   - `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
   - `frontend/tests/unit/application/selectionDeletion/SelectionDeletionCommandService.test.ts`
   - `frontend/tests/unit/application/appShell/KeyboardShortcutRouter.test.ts` where present/current
   - focused command/factory tests only if the selected change touches those files
4. Root and frontend lint where scripts exist.
5. Root and frontend full Vitest.
6. Root and frontend build where scripts exist.
7. Root and frontend Playwright e2e because Delete/Backspace, selection, undo/redo, and 3D overlay behavior are user-observable.
8. Live preview refresh on `0.0.0.0:5173`, HTTP reachability probe, and a credential-free browser smoke for representative selection-delete-undo keyboard behavior plus 3D overlay no-click-through.

Undefined scripts may be skipped only with exact package-script evidence in the implementation log.

## Wave 020 boundary preservation

Any future work must preserve Wave 020’s app-shell composition boundaries:

- `createAppShellRuntime()` remains environment-free and uses injected browser/runtime ports (`frontend/src/application/appShell/AppShellRuntime.ts:14-24`, `frontend/src/application/appShell/AppShellRuntime.ts:87-95`).
- Keyboard listener installation remains explicit through `ports.keyboardTarget` (`frontend/src/application/appShell/AppShellRuntime.ts:91-94`; `frontend/src/application/appShell/KeyboardShortcutRouter.ts:27-38`).
- Production browser/Drive/localStorage composition remains out of scope; no Drive/auth or persistence schema work belongs in a selection-delete cleanup.

## 3D overlay / preview implications

Wave 021 should not modify 3D scene-host, OrbitControls, canvas drag behavior, or CSS. However, validation for any later source change touching app-shell/keyboard/UI behavior must protect the user-reported 3D interaction regression:

- Cycle 026 root cause was `.three-view-overlay` hit-testing/pointer ownership, fixed by `pointer-events: auto` (`architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md`).
- Current e2e contract asserts `.three-view-overlay` computed pointer events are `auto`, `document.elementFromPoint(...)` resolves inside the overlay, and drag inside the overlay does not change the SVG `viewBox` (`frontend/tests/e2e/current-ui-contract.spec.ts:89-117`).

## Stop conditions

Stop and request a reviewed plan edit rather than broadening Wave 021 if implementation would require:

- changing canvas/tool, construction, process-history, panel/toolbar, or initialization command producers;
- changing command descriptors, operation registry, replay, persistence schema, or `ProjectService` serialization;
- changing Drive/auth internals, backend/docs/specs, package/tooling, validation platform, or UI features;
- touching Three/canvas/rendering/overlay pointer behavior;
- retaining dual selection-delete command paths or compatibility shims;
- normalizing unrelated dirty files.

## Next-stage recommendation

Proceed to `cycle-021-review-round-01-post-020` only as a review of these design artifacts and the premise-invalidated conclusion. If review agrees, the next actionable stage should be a precise `wave-plan.md` edit/review stage that:

1. marks Wave 021 selection/delete command-kernel extraction as already satisfied by current source;
2. removes stale Wave 021 evidence that claims `SelectionUseCases` still constructs commands;
3. re-ranks to the next central remaining command/runtime boundary using current source evidence, likely the broader application command-producer/runtime-port seam rather than a no-op selection-delete implementation.
