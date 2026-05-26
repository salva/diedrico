# Wave 006b Scope Check — Panel/toolbar command-intent cleanup

**Stage:** `cycle-006b-fresh-scout-proposals`  
**Wave:** 006b — Panel/toolbar command-intent cleanup  
**Source-code changes in this stage:** none; this document is evidence/proposal work only.

## Decision

Wave 006b premises still hold after Wave 006a. The active canvas/tool path now has an application-owned command boundary under `frontend/src/application/**`, while `ActionsPanel.vue` and `Toolbar.vue` remain untouched residual command-construction leaks. Wave 006b can proceed without editing `architecture-audit/wave-plan.md` because the current Wave 006b entry still matches the current tree: panels/toolbars should emit typed user intents/render state, and application use-cases/controllers should own command construction, process-tree mutations, validation, and command-stack execution.

## Re-rank after Wave 006a

Remaining centrality order should remain:

1. **006b — Panel/toolbar command-intent cleanup**: remaining UI-to-command leaks in `ActionsPanel.vue` and `Toolbar.vue` are still central command-boundary issues.
2. **007 — Extract 2D rendering selectors and renderer adapters**: should wait until UI command leaks are closed so rendering selectors do not preserve controller leakage.
3. **008 — Extract 3D rendering scene adapters from `ThreeView.vue`**.
4. **009 — Extract application shell services from `App.vue`**.
5. **010 — Resolve backend/frontend project-contract architecture**.
6. **011 — Tighten architecture tests and root validation gates**.
7. **012 — Remove vacant placeholders, noisy debug surfaces, and obsolete operation docs**.
8. **013 — Reconcile docs/specs with the cleaned architecture**.

No premise invalidation was found that requires a wave-plan edit before Wave 006b.

## Current-code evidence

### 006a application boundary is available and should be reused, not reopened

- Wave 006a implementation log states that `ActionsPanel.vue` and `Toolbar.vue` were intentionally not modified and remain Wave 006b residual command-leak scope (`architecture-audit/cycle-006a-canvas-tool-command-controllers/implementation-log.md`).
- `frontend/src/application/tools/ToolCommandIntents.ts:36-55` defines typed construction intent variants; `frontend/src/application/tools/ToolCommandIntents.ts:91-96` defines `ToolCommandSink` methods for construction, quick intents, point movement, and style updates.
- `frontend/src/application/tools/CanvasToolController.ts:22-30` adapts injected dependencies into a controller, while `frontend/src/application/tools/CanvasToolController.ts:33-67` owns dispatch to construction, quick-tool, movement, and style use-cases.
- `frontend/src/application/construction/ConstructionUseCases.ts:35-49` creates/commits/rolls back a `Command` and pushes it to `CommandStack` for construction intents. This confirms the post-006a pattern: Vue/tool code emits intent; application code owns commands.
- `frontend/src/application/construction/ConstructionUseCases.ts:56-164` centralizes the selected canvas construction switch and operation/factory calls. Wave 006b should not broaden this canvas/tool implementation surface except for shared command-execution conventions or unavoidable compile fallout.
- `frontend/src/application/canvas/CanvasPointMovementUseCase.ts:11-40` and `frontend/src/application/canvas/CanvasStyleUseCase.ts:10-21` show the intended application-owned command lifecycle for non-construction UI requests.

### ActionsPanel still directly creates process-tree commands

- `frontend/src/components/panels/ActionsPanel.vue:54-60` imports `Command` plus concrete process-tree operations: `PushSubprocessOp`, `PopSubprocessOp`, `RenameSubprocessOp`, `ToggleEncapsulationOp`, and `ToggleOutputOp`.
- `frontend/src/components/panels/ActionsPanel.vue:72-73` injects `world` and `commandStack` directly into the Vue component.
- `frontend/src/components/panels/ActionsPanel.vue:108-118` binds process-tree keyboard shortcuts directly to component command handlers.
- `frontend/src/components/panels/ActionsPanel.vue:130-150`, `frontend/src/components/panels/ActionsPanel.vue:166-188` contain noisy routine `console.log` calls around mount/subscription/world-change behavior.
- `frontend/src/components/panels/ActionsPanel.vue:223-246` computes selected-element related actions by reading `processTree.getAllActions()` and `world.dependencyService.getDependencies(...)`; this read-side relation/highlight concern is separate from command construction and may become a small selector/read-model if the implementation touches it.
- `frontend/src/components/panels/ActionsPanel.vue:265-281` constructs and pushes `Push subprocess` / `Pop subprocess` commands in component handlers.
- `frontend/src/components/panels/ActionsPanel.vue:289-314` constructs and pushes `Toggle subprocess encapsulation`, `Toggle output status`, and `Rename subprocess` commands in component handlers.

### Process-tree operations are concrete command internals, not component API

- `frontend/src/commands/operations/processTree/PopSubprocessOp.ts:11-42`, `PushSubprocessOp.ts`, `RenameSubprocessOp.ts`, `ToggleEncapsulationOp.ts`, and `ToggleOutputOp.ts` are undoable `IOperation` implementations over `World.getProcessTree()` and should remain behind an application use-case boundary.
- `frontend/src/commands/operations/processTree/AddProcessTreeActionGroupOp.ts:12-31` and `AddProcessTreeActionOp.ts:15-40` are also command internals used by construction use-cases; their existence reinforces that process-tree mutation belongs in application/command layers, not Vue panels.

### Toolbar still directly creates an example/debug construction command

- `frontend/src/components/toolbars/Toolbar.vue:121-126` imports `CommandStack`, `Command`, `Vector3`, `AddFreePoint2DOp`, and `AddLine2DByTwoPointsOp` directly.
- `frontend/src/components/toolbars/Toolbar.vue:163-173` injects `commandStack` and `world` for undo/redo and example setup.
- `frontend/src/components/toolbars/Toolbar.vue:205-223` documents and handles `Alt+E` as “Add projection plane example setup (for testing)”.
- `frontend/src/components/toolbars/Toolbar.vue:248-305` implements `addProjectionPlaneSetup()` in the component: it finds `P_H`/`P_V`, creates a `Command`, executes point/line operations, labels lines, commits, and pushes to the stack.
- `frontend/src/components/toolbars/Toolbar.vue:327-339` uses `CommandStack` directly for undo/redo availability/actions. This is not concrete operation construction, but proposals should decide whether the toolbar keeps a thin history controller/read model or delegates undo/redo intent handling with the same panel/toolbar boundary.

## Scope conclusion

Wave 006b should target only the panel/toolbar surfaces and their focused application use-cases/controllers:

- `ActionsPanel.vue` should become a process-history view/intent emitter. It should no longer import `Command` or concrete process-tree operations, and its process-tree mutation handlers should delegate typed intents to application code.
- `Toolbar.vue` should stop importing concrete world operations and stop implementing `Alt+E` setup command assembly. Because the code labels the shortcut “for testing,” the preferred direct path is deletion unless review decides the behavior is user-facing. If retained, it should be routed through an explicit application example/setup use-case.
- The completed 006a `SvgCanvas.vue` / `frontend/src/tools/**` controller path should stay out of this implementation except for reusing stable application patterns and shared validation helpers.

## Validation implications for eventual implementation

Minimum focused coverage should include:

- process-history use-case/controller tests for push subprocess, pop subprocess, toggle encapsulation, toggle output, rename subprocess, stack-depth/can-pop behavior, undo/redo stack effects, and rollback/no-stack-pollution on failures;
- component/intent tests for `ActionsPanel.vue` showing button/keyboard handlers emit or call typed use-case intents without importing command internals;
- toolbar behavior tests for tool selection, undo/redo intent handling, grid/projection toggles, and either deleted `Alt+E` absence or retained example/setup through an application use-case;
- static architecture checks that `ActionsPanel.vue` and `Toolbar.vue` no longer import `Command`, concrete operations, `Vector3` for construction, or direct operation/factory modules;
- full mandatory cadence: root/workspace lint where defined, focused Vitest, full Vitest, root/workspace build, Playwright/e2e for process-tree panel, toolbar, undo/redo, persistence replay if touched, plus live preview refresh/probe.

Known non-attributable validation blockers from Wave 006a remain relevant to planning: missing `eslint`, `vue-tsc`/Node 24 build failure, unrelated Vitest failures, and syntactically corrupt e2e specs were documented in `architecture-audit/cycle-006a-canvas-tool-command-controllers/implementation-log.md`. Wave 006b validation should still run and classify them rather than silently skipping mandatory cadence.
