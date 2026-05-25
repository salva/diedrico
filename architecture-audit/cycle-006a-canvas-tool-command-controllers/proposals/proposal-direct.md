# Proposal Direct — Extract canvas/tool command controllers in-place

## Summary

Create an application-owned canvas/tool controller boundary for Wave 006a while preserving the existing tool interaction model. `SvgCanvas.vue` continues to handle rendering, coordinate conversion, hit testing, selection state, and tool instance lifecycle, but it no longer imports concrete command/operation classes or pushes commands. Tools continue to collect arguments and expose status/masks, but they emit typed construction requests to a controller/use-case layer. The new controller layer owns command creation, validation orchestration, process-tree action group creation, operation sequencing, commit/rollback, command-stack push, point-drag preview/commit, style update, and feasibility checks.

`ActionsPanel.vue` and `Toolbar.vue` are deliberately excluded and should be named as Wave 006b residuals after implementation.

## Target architecture after this proposal

- **Vue canvas:** emits typed intents such as `canvasClick`, `moveFreePointPreview`, `commitFreePointMove`, `cancelFreePointMove`, and `updateElementStyle`; renders controller/tool feedback.
- **Tool interaction classes:** collect arguments and compute masks/status. They do not receive `CommandStack`, do not create `Command`, and do not import concrete operations.
- **Application controllers/use-cases:** convert tool intents and collected arguments into commands, operations, action groups, validation results, and undoable command-stack entries.
- **Factory/use-case location:** active construction sequence helpers move from UI-facing `commands/factories` / `services/factories` split into a coherent application construction module, or are folded into focused use-cases where simpler.

## Files to change

- `frontend/src/components/workspace/SvgCanvas.vue`
  - Remove imports of `Command`, `CommandStack` where only needed for construction, `UpdateElementStyleOp`, and `UpdateFreePoint2DPositionOp` from the component path.
  - Inject/compose a typed canvas command controller instead of handing `commandStack` to tools.
  - Replace point-drag open-command state with controller-managed preview/commit/cancel calls.
  - Replace `handleSaveProperties()` command assembly with a `updateElementStyle` intent/use-case call.
- `frontend/src/tools/ITool.ts`
  - Redefine `ToolContext` so it carries read/interaction dependencies (`world`, `paper`, transforms, tool store, coordinates) and a typed `ToolCommandSink`/controller facade, not `CommandStack`.
  - Update comments to state tools produce intents/argument selections rather than commands.
- `frontend/src/tools/ArgumentCollectorTool.ts`
  - Delete the open-command lifecycle (`new Command`, `executeOperations(cmd, ...)`, `commit`, `rollback`, `commandStack.push`).
  - Replace subclass hook with a typed `buildIntent(args, context)` or `executeIntent(args, controller)` hook.
  - Keep argument collection, set validation, masks, warnings, status, and completion behavior.
- `frontend/src/tools/*.ts` in the verified active `SvgCanvas.vue` factory path (`frontend/src/components/workspace/SvgCanvas.vue:437-461`), but implemented in two explicitly bounded groups rather than as a blanket 3D/example sweep:
  - **Required core 006a canvas construction tools:** `PointTool.ts`, `LineTool.ts`, `SegmentTool.ts`, `CircleTool.ts`, `GuideTool.ts`, `IntersectionTool.ts`, `ParallelLineTool.ts`, `PerpendicularLineTool.ts`, `TangentLineToCircleThroughPointTool.ts`, and `TangentLineToCircleParallelToLineTool.ts`. These are standard canvas construction flows currently instantiated directly by `SvgCanvas.vue` (`frontend/src/components/workspace/SvgCanvas.vue:438-447`) and currently import `Command`, sequence factories, and/or process-tree operations, so they must be migrated to typed construction intents/use-cases in 006a.
  - **Required dynamic-plane tool:** `CreateProjectionPlaneTool.ts`. The scope check specifically cites this as the active dynamic projection-plane creation path (`frontend/src/tools/CreateProjectionPlaneTool.ts:172-214`) and the wave success criteria require dynamic projection-plane behavior to remain covered, so it remains in 006a even though it uses `PlaneSequenceFactory` from the service/factory split.
  - **Conditionally retained 3D construction tools:** `Create3DPointTool.ts`, `Create3DLineTool.ts`, `Create3DSegmentTool.ts`, and `Create3DPlaneTool.ts` are in scope only because `SvgCanvas.vue` actively imports and exposes their factories (`frontend/src/components/workspace/SvgCanvas.vue:202-205`, `frontend/src/components/workspace/SvgCanvas.vue:448-452`) and the accepted Wave 006a criteria require retained quick/3D tool flows to remain equivalent. Implementation must first decide for each whether it is a current user-facing canvas flow. If retained, migrate it through the same controller/use-case boundary; if proven debug-only or unreachable, delete its factory/import/tool/test path rather than preserving a parallel command path.
  - **Conditionally retained quick/example tools:** `QuickProjectionSetupTool.ts`, `Quick3DLineTool.ts`, `Quick3DSegmentTool.ts`, and `ExampleConstructionsTool.ts`/`InteractiveProjectionSetupTool` are not automatically mandatory migration targets merely because they exist. They are in scope only to the extent that `SvgCanvas.vue` actively registers them (`frontend/src/components/workspace/SvgCanvas.vue:455-460`) and they would otherwise keep direct command/factory imports inside the selected canvas/tool path. Implementation must classify each as retained user-facing behavior, delete it as debug/example-only, or defer only if it can be removed from the active canvas factory path without leaving a command-construction leak. Do not broaden into `Toolbar.vue` example/debug setup; that remains Wave 006b.
  - Remove direct `Command`, operation, and sequence-factory imports from every retained tool in these groups. Deleted debug/example tools must leave no active factory, store, test, or documentation references.
  - Preserve validation logic as intent validation input where it is interaction-specific (for example intersection choice by cursor proximity); command sequencing moves to the controller/use-case layer.
- New application modules, recommended location:
  - `frontend/src/application/tools/CanvasToolController.ts`
  - `frontend/src/application/tools/ToolCommandIntents.ts`
  - `frontend/src/application/construction/ConstructionUseCases.ts`
  - `frontend/src/application/construction/ConstructionSequences.ts` (or smaller per-domain files)
  - `frontend/src/application/canvas/CanvasPointMovementUseCase.ts`
  - `frontend/src/application/canvas/CanvasStyleUseCase.ts`
- Factory modules used by the active path:
  - Move/fold relevant logic from `frontend/src/commands/factories/*SequenceFactory.ts` and `frontend/src/services/factories/PlaneSequenceFactory.ts` into the application construction modules when they are only serving UI construction use-cases.
  - Keep low-level command/operation classes under `commands/operations/**`; the application layer may import them, but tools/components may not.
- Tests under `frontend/tests/**`
  - Add focused controller/use-case tests independent of Vue rendering.
  - Update tool tests to assert emitted intents, masks, status, and completion behavior rather than concrete command internals.
  - Update canvas tests to assert delegation/behavior rather than operation construction.

## Files/tests/docs/fixtures to DELETE

- Delete direct concrete operation imports from `SvgCanvas.vue` for point movement and style updates.
- Delete direct `Command` and `CommandStack` exposure from active `ToolContext` and tool APIs.
- Delete `Command` imports from `ArgumentCollectorTool.ts` and concrete canvas tools.
- Delete process-tree operation imports from concrete tools in the selected canvas path.
- Delete or move `frontend/src/services/factories/PlaneSequenceFactory.ts` if its only active role is construction command sequencing; do not preserve the misleading service-factory namespace for this path.
- Delete `frontend/src/composables/useCommandExecution.ts` if implementation confirms the scout finding that it has no active import; if it is kept, delete its broad legacy executor shape and replace it with a thin typed adapter around the new controller boundary.
- Delete obsolete tests that inspect `Command.getOperations()`, concrete operation classes, or stack pushes from tool/component internals for this path; replace with controller/use-case tests plus interaction behavior tests.
- Do **not** delete or patch `ActionsPanel.vue` or `Toolbar.vue`; record them as Wave 006b residuals.

## Expected behavior change

No intentional user-visible behavior change. Canvas construction, guide/sibling-guide creation, intersections, dynamic projection-plane setup, quick/3D construction flows, point dragging, style editing, selection behavior, and undo/redo should remain equivalent. The internal behavior changes are architectural: command creation and execution move out of Vue/tools into application controllers.

## Validation plan

Focused validation:

- Controller/use-case Vitest for free point, line, segment, circle, guide plus sibling guide, line-line/line-circle/circle-circle intersections, dynamic projection-plane creation, retained quick 3D line/segment flows, point movement preview/commit/cancel, style update, command rollback on failure, and undo/redo stack effects.
- Tool interaction Vitest for argument collection, any-order collection, masks, status messages, warning propagation, completion behavior, and emitted typed intents.
- Canvas/component tests for coordinate-to-intent delegation, selection behavior staying local, properties/style intent dispatch, and point-drag lifecycle.

Mandatory full cadence for implementation wave:

1. root and frontend `npm run lint` where defined;
2. focused Vitest for controller/use-case/tool/canvas tests;
3. full Vitest suite at root/frontend as defined;
4. root and frontend `npm run build` where defined;
5. Playwright/e2e for construction, guide, intersection, dynamic-plane, selection, properties/style, point-move, undo/redo behavior;
6. live Playwright MCP smoke for representative canvas construction and undo/redo;
7. live preview refresh on `0.0.0.0` plus reachability probe recorded in `implementation-log.md`.

All stdout/stderr must be captured under `architecture-audit/cycle-006a-canvas-tool-command-controllers/validation/` during implementation/validation stages.

## Risks

- The open-command preview pattern for point dragging may hide rollback assumptions; controller tests must cover preview/cancel/commit explicitly.
- Some sequence factories are reused by quick/3D/example tools that are actively registered in `SvgCanvas.vue`; implementation must not treat their registration as automatic proof that every example flow is worth migrating. Each must be classified as retained user-facing canvas behavior or deleted from the active path, with no parallel command-construction leftovers.
- Intersection and dynamic-plane tools mix interaction validation with command sequencing; extracting too aggressively could duplicate geometric checks. Keep interaction-specific choice logic near tools, command sequencing in use-cases.
- E2e coverage may expose existing flaky construction flows; distinguish pre-existing failures from controller regressions with focused tests and stable validation logs.
