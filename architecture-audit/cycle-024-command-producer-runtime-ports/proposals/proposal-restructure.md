# Proposal Restructure — Small application command-production boundary before leaf ports

## Summary

Move one conceptual layer higher than the direct wiring proposal by introducing a small application command-production boundary that owns command lifecycle primitives for the current leaf producers, then expose canvas and process-history ports from that boundary through `RuntimeSession`.

This proposal asks whether the right fix is not only replacing Vue/raw-stack injection, but also consolidating duplicate command lifecycle patterns (`new Command`, `addAndExecute`, `commit`, `push`, `rollback`) behind a focused internal service. It is still bounded to Wave 024’s canvas, construction, style/movement, and process-history producers. It must not become a broad command-kernel, persistence, or app-shell runtime redesign.

## Proposed structure

Introduce a narrow module such as `frontend/src/application/commandProduction/` containing:

- `CommandProductionSession` or `RuntimeCommandProducerFactory`
  - constructed only by `RuntimeSession` from its private `world` and `commandStack`;
  - creates scoped ports for canvas/tools and process history;
  - does not expose raw `World`/`CommandStack`.
- `CommandExecutionPort` or internal helper
  - private/internal helper for safe command lifecycle: create command, execute operations, commit/push, rollback on failure;
  - supports specialized movement preview sessions without leaking stack operations to Vue/tool classes.
- `CanvasCommandProducerPort`
  - implements `ToolCommandSink`, free-point move sessions, style updates, and quick construction execution.
- `ProcessHistoryCommandProducerPort`
  - implements `ProcessHistoryIntentSink` plus state read behavior.

`RuntimeSession` would expose named behavior ports created by this boundary, e.g. `canvasCommandProducerPort(toolStore)` and `processHistoryCommandProducerPort()`, then delete `commandStackForDeferredCommandProducers()`.

## Files to change

Production source:

- Add new focused application boundary files under `frontend/src/application/commandProduction/` or an equivalent reviewed name.
- `frontend/src/application/appShell/RuntimeSession.ts`
  - Create the command-production boundary internally from private `world`/`commandStack`.
  - Expose only named canvas/process-history command-producer ports.
  - Delete `commandStackForDeferredCommandProducers()`.
- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Return/inject named producer ports, not raw `commandStack`.
- `frontend/src/App.vue`
  - Provide named producer ports and delete raw `provide('commandStack')`.
- `frontend/src/components/workspace/SvgCanvas.vue`
  - Consume the canvas command-producer port as `commandSink`; keep current `world` interaction/read dependency out of this wave.
- `frontend/src/components/panels/ActionsPanel.vue`
  - Consume the process-history command-producer port instead of constructing a controller from raw stack injection.
- `frontend/src/application/tools/CanvasToolController.ts`
  - Either become a thin adapter over `CanvasCommandProducerPort` or be deleted/merged into the new command-production boundary if it no longer has independent responsibility.
- `frontend/src/application/canvas/CanvasPointMovementUseCase.ts`
- `frontend/src/application/canvas/CanvasStyleUseCase.ts`
- `frontend/src/application/construction/ConstructionUseCases.ts`
- `frontend/src/application/construction/QuickToolUseCases.ts`
- `frontend/src/application/processHistory/ProcessHistoryUseCases.ts`
- `frontend/src/application/processHistory/ProcessHistoryController.ts`
  - Move duplicate command lifecycle handling to the internal boundary where practical.
  - Keep operation/factory construction in existing use-case modules unless moving a small helper is necessary to avoid circular imports.

Tests:

- Add focused `frontend/tests/unit/application/commandProduction/*` tests for command lifecycle helper behavior, preview command behavior, construction execution, and process-history producer behavior.
- Update existing canvas/tool/process-history/app-shell tests to use the named ports.
- Update architecture boundary tests to enforce no raw accessor/provide/inject remains.

## Files/tests/docs/fixtures to DELETE

- Delete `RuntimeSession.commandStackForDeferredCommandProducers()`.
- Delete `AppShellRuntime` public `commandStack` return if only used for these producers.
- Delete raw command-stack provide/inject in `App.vue`, `SvgCanvas.vue`, and `ActionsPanel.vue`.
- Delete `CanvasToolController` if the new `CanvasCommandProducerPort` fully replaces it without loss of responsibility. If it remains, delete only the raw-stack provider/cast path.
- Delete `ProcessHistoryController` if the new `ProcessHistoryCommandProducerPort` fully replaces it. If it remains, delete only the raw-stack provider/cast path.
- Delete duplicated local command lifecycle blocks in canvas style/movement, construction, and process-history modules where the new internal helper owns them.
- Delete tests that assert raw stack injection, command-stack provider casts, or the presence of `commandStackForDeferredCommandProducers()`.
- Delete any compatibility shim that keeps both old raw stack injection and new ports active.

No backend/docs/spec/package/persistence fixtures are proposed for deletion. Do not delete command operations or factories merely because their lifecycle is invoked through a new helper.

## Expected behavior change

No intended user-facing change. The restructure should preserve construction, quick tools, process-history edits, movement preview/commit/cancel, style updates, undo/redo, save/autosave dirty behavior, and project open/save semantics.

Internal behavior changes:

- One command-production boundary owns command lifecycle for the scoped leaf producers.
- Leaf use cases can focus on operation selection/validation rather than stack push mechanics.
- Runtime exposes behavior ports instead of raw command-stack ownership.

## Benefits over the direct path

- Reduces duplicated lifecycle patterns across canvas, construction, style, and process history rather than only hiding raw stack injection.
- Makes future command-producer waves less likely to invent parallel helpers.
- Provides a clearer place for lifecycle tests around rollback on operation failure and push failure.
- Can remove `as any` and unknown-provider casts as part of a typed command-production boundary.

## Risks

- Higher refactor surface than the direct path. Moving lifecycle code can accidentally alter command descriptions, operation order, rollback timing, or command-stack notification timing.
- A generic command-production helper can become a hidden command-kernel redesign if it exposes operation descriptors, serialization, or arbitrary stack mutation. Keep it private and scoped.
- If too much construction logic is moved, the wave may become a broad construction-controller rewrite. Preserve existing operation/factory ownership unless a small move is necessary for cohesion.
- Tests may need more updates than the direct path, especially tool tests that instantiate `CanvasToolController` with a concrete stack.

## Validation plan

Same mandatory cadence as the direct proposal, with additional focused tests for the new boundary:

1. Pre-edit scoped status/diff and static scans.
2. Focused command-production boundary tests for:
   - commit/push success;
   - rollback on operation failure;
   - push failure handling if supported;
   - movement preview/commit/cancel;
   - representative construction intent;
   - process-history command execution and state reads.
3. Existing canvas/tool/process-history/app-shell focused tests updated to consume ports.
4. Post-edit static scans for absence of raw accessor/provide/inject/provider casts.
5. Root/frontend lint, full Vitest, build, e2e.
6. Live preview refresh/probe and Playwright/live smoke for construction, point move/style, process-history edit, undo/redo.

## No-backcompat rationale

The raw stack handoff is internal debt. The restructure path deletes it and also deletes duplicated local lifecycle code where that duplication is itself architecture debt. It should not retain old and new command-production paths because dual paths would obscure command ownership.

## Stop conditions

Stop for reviewed plan edit if the restructure requires:

- changing command serialization, command snapshots, command-stack history semantics, operation descriptor/replay contracts, or ProjectService behavior;
- changing persistence schema, Drive/auth, backend, package tooling, or e2e infrastructure;
- replacing rendering/view `worldForView()` or broad tool read/hit-test architecture;
- redesigning process-tree/domain semantics rather than only command-production ownership;
- absorbing unrelated selection deletion, persistence, keyboard history, rendering, or project-session concerns into the new command-production boundary.

## Recommendation

Use this restructure only if review concludes the duplicated command lifecycle itself is the central defect to remove in Wave 024. If review prioritizes minimal risk and the existing use-case lifecycle code is acceptable for one more wave, choose `proposal-direct.md` and defer deeper command-lifecycle consolidation.
