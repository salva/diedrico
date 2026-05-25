# Wave 006 Scope Check — UI command controllers

**Stage:** `cycle-006-fresh-scout-proposals`  
**Wave:** 006 — Move UI command construction into application use-cases/tool controllers  
**Source-code changes in this stage:** none intended; this document is evidence/proposal work only.

## Decision

Wave 006 premises still hold after Waves 001–005: the command, persistence, process-tree, and dependency ownership boundaries are now stable enough to move UI command construction out of the canvas/tool path. However, the current source shows **two distinct UI command-construction surfaces**:

1. **Canvas/tool construction path** — `SvgCanvas.vue` instantiates tools and passes `world` + `commandStack`; `ArgumentCollectorTool` and many concrete tools create `Command`s, add operations, create process-tree action groups/actions, and push commands.
2. **Panel/toolbar command path** — `ActionsPanel.vue` directly creates process-tree commands, while `Toolbar.vue` contains an Alt+E example setup that directly constructs world operations.

Because these surfaces require separate controller concepts and validation surfaces, **Wave 006 cannot proceed to implementation under the current one-wave plan entry**. The required outcome of this scout stage is a **gating decision**: before any implementation stage is scheduled, the authoritative `architecture-audit/wave-plan.md` must go through a reviewed plan-edit mini-cycle that formalizes **006a canvas/tool command controllers** and **006b panel/toolbar command-intent cleanup** as separate dependent waves. The proposals below are therefore candidate implementation proposals for 006a only; they are not implementation-ready until that reviewed wave-plan split is accepted.

## Accounting for completed Waves 001–005

- Wave 001 removed the original domain/application inversion around `World`; this wave can now make controllers depend on `World` as an application boundary without requiring `World` to import commands/services.
- Wave 002 split projection-plane responsibilities; tool controllers can now interact with projection-plane/domain APIs without preserving a monolithic plane split concern.
- Wave 003 deleted the dead store-backed workspace path; the active 2D command surface is now `SvgCanvas.vue` plus `frontend/src/tools/**`, not `Workspace2D.vue`.
- Wave 004 established typed command/undo/persistence contracts; controllers can own command creation/execution without preserving private-cast or migration paths.
- Wave 005 deleted deprecated process-tree/dependency APIs. The implementation log explicitly deferred `ActionsPanel.vue` use-case extraction to Wave 006 and states no Wave 006 work was implemented during Wave 005 (`architecture-audit/cycle-005-process-tree-dependency-ownership/implementation-log.md`).

## Current-code evidence

### Active canvas/tool path still constructs commands in UI-adjacent modules

- `SvgCanvas.vue` imports `CommandStack`, `Command`, `UpdateElementStyleOp`, and `UpdateFreePoint2DPositionOp` directly (`frontend/src/components/workspace/SvgCanvas.vue:188-191`). It injects the stack from Vue composition (`frontend/src/components/workspace/SvgCanvas.vue:429-432`) and manages command commit/push for point drag (`frontend/src/components/workspace/SvgCanvas.vue:314-323`, `frontend/src/components/workspace/SvgCanvas.vue:1498-1530`) and properties/style edits (`frontend/src/components/workspace/SvgCanvas.vue:1443-1462`).
- `SvgCanvas.vue` owns tool instance creation for many concrete tool classes (`frontend/src/components/workspace/SvgCanvas.vue:192-210`, `frontend/src/components/workspace/SvgCanvas.vue:528-546`) and passes execution infrastructure to tools via the active click path (`frontend/src/components/workspace/SvgCanvas.vue:1174`, `frontend/src/components/workspace/SvgCanvas.vue:1260-1272`).
- `ITool` documents the current inverted responsibility explicitly: tools translate user input into commands and execute them via `CommandStack` (`frontend/src/tools/ITool.ts:4-13`). Its `ToolContext` includes `commandStack` and `world` (`frontend/src/tools/ITool.ts:26-35`).
- `ArgumentCollectorTool` imports `Command`, creates one with `new Command(...)`, calls subclass `executeOperations(...)`, checks created elements, commits, and pushes to `commandStack` (`frontend/src/tools/ArgumentCollectorTool.ts:44`, `frontend/src/tools/ArgumentCollectorTool.ts:100`, `frontend/src/tools/ArgumentCollectorTool.ts:138-155`).
- Concrete tools import command/factory/process-operation surfaces and add operations directly. Examples: `PointTool` imports `Command`, `PointSequenceFactory`, and `AddProcessTreeActionGroupOp` (`frontend/src/tools/PointTool.ts:18-21`) then adds an action group and calls the factory (`frontend/src/tools/PointTool.ts:58-85`); `GuideTool` imports `Command`, `GuideSequenceFactory`, and process-tree operations (`frontend/src/tools/GuideTool.ts:30-36`) then adds process-tree actions itself (`frontend/src/tools/GuideTool.ts:90-127`); `IntersectionTool` imports `Command`, `IntersectionSequenceFactory`, and process operations (`frontend/src/tools/IntersectionTool.ts:25-28`) and contains validation plus factory dispatch (`frontend/src/tools/IntersectionTool.ts:86-173`).

### Factories are command-sequence helpers, not an application boundary

- `PointSequenceFactory` takes an open `Command`, imports concrete operations, executes an `AddFreePoint2DOp`, creates a process-tree action, and adds `AddProcessTreeActionOp` (`frontend/src/commands/factories/PointSequenceFactory.ts:15-20`, `frontend/src/commands/factories/PointSequenceFactory.ts:35-50`).
- `LineSequenceFactory` documents the open-command pattern and imports concrete world/process operations (`frontend/src/commands/factories/LineSequenceFactory.ts:10-17`, `frontend/src/commands/factories/LineSequenceFactory.ts:35-44`), then executes operations in static methods (`frontend/src/commands/factories/LineSequenceFactory.ts:69-90`).
- `CreateProjectionPlaneTool` imports `PlaneSequenceFactory` from `services/factories`, while other construction sequences live under `commands/factories`, confirming the misleading split called out in the wave plan (`frontend/src/tools/CreateProjectionPlaneTool.ts:27-32`, `frontend/src/tools/CreateProjectionPlaneTool.ts:191-214`).

### Panel/toolbar command leaks are real but separate

- `ActionsPanel.vue` directly imports `Command` and five concrete process-tree operations (`frontend/src/components/panels/ActionsPanel.vue:54-60`), injects `CommandStack` (`frontend/src/components/panels/ActionsPanel.vue:73`), and constructs/pushes commands in five handlers (`frontend/src/components/panels/ActionsPanel.vue:267-312`). It also queries `world.dependencyService` for selection-related history highlighting (`frontend/src/components/panels/ActionsPanel.vue:228-238`), a read-side concern distinct from canvas construction controllers.
- `Toolbar.vue` imports `Command`, `CommandStack`, `Vector3`, `AddFreePoint2DOp`, and `AddLine2DByTwoPointsOp` (`frontend/src/components/toolbars/Toolbar.vue:121-126`). Its Alt+E example setup constructs points/lines with concrete operations and pushes the command (`frontend/src/components/toolbars/Toolbar.vue:252-299`). This is a debug/example shortcut, not the same interaction model as canvas tools or process-tree panel controls.

### `useCommandExecution` is not the target boundary

`useCommandExecution.ts` claims to build/execute commands but uses the legacy `processStore`, calls `command.addAndExecute()` without operations, and exposes broad `CommandResult<T = any>` (`frontend/src/composables/useCommandExecution.ts:1-18`, `frontend/src/composables/useCommandExecution.ts:27-43`, `frontend/src/composables/useCommandExecution.ts:56-80`). It is not used by the active canvas/tool path found above and should be deleted or replaced by the new application execution helper if no active call sites remain.

## Gating outcome / remaining-wave re-rank

The remaining wave order after Wave 005 should stay centrality-first, but this stage must **stop before implementation** and route to a reviewed wave-plan edit. The required plan edit is:

1. **006a — Canvas/tool command controllers** (new immediate implementation wave only after reviewed plan-edit sign-off): `SvgCanvas.vue`, `frontend/src/tools/**`, `useCommandExecution.ts`, and command/sequence factories used by canvas tools.
2. **006b — Panel/toolbar command-intent cleanup** (new dependent wave after 006a): `ActionsPanel.vue`, `Toolbar.vue`, any process-history use-cases, example/debug construction use-cases, and related tests.
3. Wave 007 — 2D rendering selectors/adapters.
4. Wave 008 — 3D rendering adapters.
5. Wave 009 — App shell services.
6. Wave 010 — backend/frontend project contract.
7. Wave 011 — architecture tests/root validation.
8. Wave 012 — placeholders/debug surfaces.
9. Wave 013 — docs/spec reconciliation.

Proceeding without the reviewed split is a blocker: it would either leave `ActionsPanel.vue`/`Toolbar.vue` as accidental residue or force the implementation wave to solve canvas tools, process-history mutations, and debug/example toolbar construction in one cycle, which violates the Wave 006 scope guard. Therefore the next stage after this scout/review correction must be a reviewed wave-plan edit or decision that explicitly records the accepted split; no 006 implementation should be dispatched from the current single Wave 006 entry.

## Concrete wave-plan delta for the gating edit

The decision/plan-edit stage can apply this delta to `architecture-audit/wave-plan.md` before implementation:

- Replace current Wave 006 with **006a — Canvas/tool command controllers**. Scope: `SvgCanvas.vue`, `frontend/src/tools/**`, selected command/sequence factories used by canvas tools, `useCommandExecution.ts` if unused or adapter-worthy, and controller/use-case tests. Target: Vue/canvas/tools emit intent and interaction state while application controllers/use-cases own command construction, validation orchestration, command-stack execution, and undo/redo command lifecycle for canvas construction, point movement, and style update. DELETE: direct concrete operation/`Command`/`CommandStack` imports from the selected canvas/tool path; open-command tool APIs; obsolete tests that inspect tool command internals; misleading duplicate factory namespace for selected canvas construction. Success: no active canvas/tool source imports concrete operations or pushes commands directly, focused controller/use-case tests pass, full validation cadence/e2e/preview refresh recorded. Depends on Waves 001–005.
- Insert **006b — Panel/toolbar command-intent cleanup** immediately after 006a. Scope: `ActionsPanel.vue`, `Toolbar.vue`, process-history edit use-cases, debug/example construction setup, and related tests. Target: panel/toolbar components emit typed user intents and application use-cases own process-tree mutations/example setup command construction. DELETE: `ActionsPanel.vue` operation/`Command` imports, `Toolbar.vue` Alt+E concrete operation construction or the shortcut itself if deemed debug-only, and panel/toolbar command-internal tests. Success: no panel/toolbar source directly creates concrete commands/operations, behavior/e2e coverage for action edits and any retained example setup passes. Depends on 006a.

## Validation implications for eventual implementation

Minimum focused coverage for 006a must include controller/use-case tests for point, line, segment, circle, guide+sibling guide, intersection variants, dynamic projection plane creation, quick 3D line/segment paths if kept active, point drag/move, style update, selection-mask/status behavior, and undo/redo command-stack effects. Full cadence must still include root/workspace lint, focused Vitest, full Vitest, root/workspace build, Playwright/e2e construction flows, live Playwright MCP smoke, and live preview refresh/probe.
