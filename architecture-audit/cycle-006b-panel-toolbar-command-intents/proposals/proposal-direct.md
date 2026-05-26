# Proposal Direct — Panel/toolbar intent controllers with minimal application use-cases

## Summary

Extract the current `ActionsPanel.vue` process-history mutations plus the `Toolbar.vue` command-stack execution leaks (undo/redo) and Alt+E/example command leak into small application-owned use-cases/controllers. Leave the completed Wave 006a canvas/tool controller path intact. Vue components keep render state, keyboard/button wiring, tool selection, and emitted file/auth/view events; they no longer construct concrete commands, operations, or directly execute command-stack actions.

## Target outcome

- `ActionsPanel.vue` renders process history and emits/delegates typed process-history intents.
- `Toolbar.vue` renders toolbar state and delegates undo/redo read/actions plus retained setup behavior through typed application use-cases/controllers.
- Application modules own `Command` construction, process-tree operation instantiation, validation/guard checks, commit/rollback, `CommandStack.push()`, and `CommandStack.undo()` / `CommandStack.redo()` execution.
- No new parallel construction boundary competes with the Wave 006a `frontend/src/application/**` controller pattern.

## Files to change

### Add

- `frontend/src/application/processHistory/ProcessHistoryIntents.ts`
  - Define intent/request types such as `PushSubprocessRequest`, `PopSubprocessRequest`, `ToggleEncapsulationRequest`, `ToggleOutputRequest`, `RenameSubprocessRequest`, `ProcessHistoryResult`, and optionally a narrow read state for `canPop` / active subprocess.
- `frontend/src/application/processHistory/ProcessHistoryUseCases.ts`
  - Own `new Command(...)`, `PushSubprocessOp`, `PopSubprocessOp`, `RenameSubprocessOp`, `ToggleEncapsulationOp`, `ToggleOutputOp`, `cmd.commit()`, rollback on error, and `commandStack.push(cmd)`.
  - Provide methods: `pushSubprocess({ name? })`, `popSubprocess()`, `toggleEncapsulation(nodeId)`, `toggleOutput(nodeId)`, `renameSubprocess(nodeId, newName)`.
- `frontend/src/application/processHistory/ProcessHistoryController.ts`
  - Small injected-dependency adapter from Vue composition to use-cases, mirroring `createCanvasToolController()` in `frontend/src/application/tools/CanvasToolController.ts:22-30`.
- `frontend/src/application/toolbar/ToolbarHistoryIntents.ts`
  - Define typed toolbar history requests/results such as `UndoToolbarIntent`, `RedoToolbarIntent`, `ToolbarHistoryState`, and `ToolbarHistoryResult` without exposing `CommandStack` to Vue.
- `frontend/src/application/toolbar/ToolbarHistoryUseCases.ts`
  - Own `commandStack.canUndo()` / `canRedo()` read state and `commandStack.undo()` / `redo()` execution for toolbar history actions.
- `frontend/src/application/toolbar/ToolbarHistoryController.ts`
  - Small injected-dependency adapter used by `Toolbar.vue`, mirroring the Wave 006a application controller pattern and keeping command-stack access out of the component.
- Optional if retained: `frontend/src/application/examples/ProjectionPlaneExampleSetupUseCase.ts`
  - Own the current Alt+E example command construction if review decides it is user-facing enough to keep.
  - If deleted, do not add this file.

### Modify

- `frontend/src/components/panels/ActionsPanel.vue`
  - Delete imports of `Command` and concrete process-tree operations (`frontend/src/components/panels/ActionsPanel.vue:54-60`).
  - Keep `world`/process-tree read model as needed for rendering, but inject/create a `ProcessHistoryController` instead of directly injecting `CommandStack` for command construction.
  - Replace handlers at `frontend/src/components/panels/ActionsPanel.vue:265-314` with typed controller calls and UI version refresh based on controller result/subscription.
  - Remove routine debug logs at `frontend/src/components/panels/ActionsPanel.vue:88`, `130-150`, and `166-188` unless an error path genuinely needs logging.
  - Leave process-tree related-action highlighting (`frontend/src/components/panels/ActionsPanel.vue:223-246`) as a read-side concern unless implementation finds a small selector extraction is necessary.
- `frontend/src/components/toolbars/Toolbar.vue`
  - Delete imports of `Command`, concrete world operations, and `Vector3` used only for Alt+E (`frontend/src/components/toolbars/Toolbar.vue:122-126`).
  - Prefer deleting the Alt+E shortcut and `addProjectionPlaneSetup()` because current comments label it “for testing” (`frontend/src/components/toolbars/Toolbar.vue:205-223`, `248-305`).
  - If review retains Alt+E, route it through `ProjectionPlaneExampleSetupUseCase` and inject/create a controller rather than constructing operations in the component.
  - Replace direct undo/redo read/actions (`frontend/src/components/toolbars/Toolbar.vue:327-339`) with typed toolbar-history controller calls. This is mandatory Wave 006b scope; direct `CommandStack` execution/read ownership in `Toolbar.vue` is not an acceptable residual for Wave 009. Keep broader App-shell orchestration out of scope by limiting the controller to toolbar history state and undo/redo intents.
- `frontend/tests/**`
  - Add focused application tests for process-history use-cases/controllers.
  - Add/update component/static tests for `ActionsPanel.vue` and `Toolbar.vue` intent delegation / deletion of command internals.
  - Update e2e tests if any reference Alt+E or command-internal setup details.

## Files/tests/docs/fixtures to DELETE

- Delete `ActionsPanel.vue` imports of `Command`, `PushSubprocessOp`, `PopSubprocessOp`, `RenameSubprocessOp`, `ToggleEncapsulationOp`, and `ToggleOutputOp`.
- Delete `ActionsPanel.vue` command-assembly methods as component-owned command internals; replace with controller calls.
- Delete noisy routine `console.log` calls in `ActionsPanel.vue` mount/subscription/update paths if still present in implementation scope.
- Delete `Toolbar.vue` imports/injection paths that expose `CommandStack` for direct undo/redo read or execution; replace them with a toolbar-history controller/use-case dependency.
- Delete `Toolbar.vue` imports of `Command`, `Vector3`, `AddFreePoint2DOp`, `AddLine2DByTwoPointsOp`, and any other concrete operation dependency used only by Alt+E.
- Prefer deleting `Toolbar.vue` Alt+E example/debug shortcut and `addProjectionPlaneSetup()` entirely.
- Delete panel/toolbar tests that assert concrete command or operation classes are used from Vue components.
- Delete any compatibility shim that preserves the old component methods under new names.
- Do not delete or modify the already-completed `SvgCanvas.vue` / `frontend/src/tools/**` Wave 006a controller path except for unavoidable type/import fallout.

## Expected behavior change

- User-visible process-history panel behavior should remain equivalent: push/pop subprocess, toggle encapsulation/output, rename, keyboard shortcuts, auto-scroll, and highlighting continue to work.
- Toolbar user-visible behavior should remain equivalent except for Alt+E. Direct proposal default: remove Alt+E because source labels it “for testing”; this is an intentional deletion of a debug/example shortcut, not a regression. If retained by review, behavior should remain equivalent through an application use-case.
- Undo/redo availability and effects from toolbar buttons should remain equivalent, but `Toolbar.vue` should now express typed history intents while application use-cases/controllers own `CommandStack` reads and execution.
- Undo/redo stack effects should remain equivalent for retained process-history mutations and any retained setup use-case.

## Risks

- `ActionsPanel.vue` currently increments local `stackVersion` after direct command execution; replacing handlers must still trigger UI refresh through ProcessTree subscription and/or explicit result handling.
- `ProcessTree` replacement on `world.clear()` currently resubscribes inside the panel; controller/use-case extraction must not accidentally capture a stale tree instance. Use-cases should depend on `World` and call `world.getProcessTree()` through operations rather than retaining old tree references.
- Alt+E deletion could surprise a developer/test workflow if e2e/manual tests used the shortcut despite it being labeled “for testing.” Static search/update tests must remove references if deletion is selected.
- Moving toolbar undo/redo reads behind a controller can stale button disabled state if the component does not refresh after stack changes; implementation should expose a narrow history-state query/subscription or reuse the current reactive trigger without leaking `CommandStack` execution into Vue.
- Existing validation environment blockers from Wave 006a may recur; implementation logs must classify them precisely instead of treating skipped validation as success.

## Validation plan

- Static checks:
  - assert no `Command`, concrete `frontend/src/commands/operations/**`, world operation, `CommandStack`, or `Vector3` construction imports remain in `ActionsPanel.vue` / `Toolbar.vue` for command construction or command-stack execution;
  - assert no `new Command`, `.addAndExecute(new ...Op`, `commandStack.push(cmd)`, `commandStack.undo()`, or `commandStack.redo()` remain in the two components.
- Focused Vitest:
  - new `frontend/tests/unit/application/processHistoryUseCases.spec.ts` covering all five process-history mutations, rollback on thrown op/application error, stack push count, and undo/redo effects;
  - component tests for `ActionsPanel.vue` buttons/keyboard shortcuts delegating typed intents;
  - toolbar-history use-case/controller tests for `canUndo` / `canRedo`, undo/redo execution, and no-op/error behavior;
  - toolbar tests for tool selection, typed undo/redo intent delegation, undo/redo availability/actions, grid/projection toggles, and Alt+E deletion or retained setup use-case.
- Full cadence:
  - `npm run lint` at root and `npm run lint --workspace=frontend` where defined;
  - focused Vitest above;
  - `npm run test` at root and `npm run test --workspace=frontend`;
  - `npm run build` at root and `npm run build --workspace=frontend`; backend build if root cadence includes it;
  - `npm run test:e2e --workspace=frontend` / Playwright for process-tree panel, toolbar, undo/redo, and retained/deleted Alt+E behavior;
  - persistence replay/open-save if any retained setup/process-history command serialization is touched;
  - live Playwright MCP smoke and live preview refresh/reachability probe.
