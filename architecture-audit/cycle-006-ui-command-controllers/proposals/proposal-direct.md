# Proposal Direct — 006a Canvas/tool command controllers

## Summary

Implement Wave 006 as a reviewed split: **006a extracts canvas/tool command construction into application tool controllers**, and **006b handles `ActionsPanel.vue`/`Toolbar.vue` command-intent cleanup** in a dependent wave. This direct proposal keeps 006a to one cycle and targets the active canvas construction path.

## Target outcome

`SvgCanvas.vue` becomes a render/input shell. Tool classes and Vue components emit typed user intents / collected arguments; application controllers own command creation, operation/factory orchestration, validation that belongs to construction, commit/rollback, feasibility checks, and command-stack push.

## Files to change in 006a

### New application/controller layer

- Add `frontend/src/application/tools/ToolController.ts` (or equivalent) for the typed controller interface.
- Add `frontend/src/application/tools/ToolExecutionContext.ts` to replace `ToolContext.commandStack`/open `Command` exposure with read/query dependencies and a command executor port.
- Add controller modules for active construction families, for example:
  - `frontend/src/application/tools/controllers/PointToolController.ts`
  - `LineToolController.ts`
  - `SegmentToolController.ts`
  - `CircleToolController.ts`
  - `GuideToolController.ts`
  - `IntersectionToolController.ts`
  - `ProjectionPlaneToolController.ts`
  - `ThreeDToolController.ts` or smaller 3D point/line/segment/plane controllers.
- Add `frontend/src/application/commands/CommandExecutor.ts` for command lifecycle: create, execute operations through factories/use-cases, feasibility check, commit/rollback, push.

### Refactor existing UI/tool path

- `frontend/src/components/workspace/SvgCanvas.vue`
  - Remove direct imports of `Command`, `UpdateElementStyleOp`, and `UpdateFreePoint2DPositionOp`.
  - Stop passing `commandStack` into tool context.
  - Delegate point-drag commit/move and style updates to use-cases/controllers.
  - Keep rendering, hit-testing orchestration, viewport, selection, and user-event translation only.
- `frontend/src/tools/ITool.ts`
  - Redefine tools as interaction-state machines that return typed intents/results rather than executing commands.
  - Delete `commandStack` from `ToolContext`.
- `frontend/src/tools/ArgumentCollectorTool.ts`
  - Delete `Command` import and the open-command lifecycle.
  - Keep collection, masks, status, and completion behavior; invoke a controller or return a `ToolIntent` when a set is complete.
- All concrete tools under `frontend/src/tools/**`
  - Remove direct `Command` imports, concrete operation imports, process-tree operation imports, and factory calls from tool classes.
  - Move operation/factory orchestration into the controller layer.
  - Keep argument specs, UI validation masks, status messages, and interaction-specific validators only when they are genuinely UI selection constraints.
- `frontend/src/commands/factories/**` and `frontend/src/services/factories/PlaneSequenceFactory.ts`
  - Rehome sequence factories used by tool controllers to one coherent application command-construction location if needed, e.g. `frontend/src/application/commands/sequences/**`.
  - Keep low-level operation descriptors/registries under `commands` only if they are command-contract concerns from Wave 004, not UI factories.
- `frontend/src/composables/useCommandExecution.ts`
  - Delete if unused, or replace with a thin adapter around `CommandExecutor` if an active caller needs it.

### Tests to add/update

- New focused controller/use-case tests under `frontend/tests/unit/application/tools/**` or equivalent.
- Update existing tool tests (`frontend/tests/unit/tools/*`) so they assert argument collection/status/selection masks and emitted intents rather than command internals.
- Update `SvgCanvas` tests only for rendering/input behavior; do not mount components to inspect concrete operations.

## Explicit DELETE list

- Delete direct concrete operation imports from `SvgCanvas.vue` for style update and point movement.
- Delete `Command` / `CommandStack` from `ToolContext` and active tool execution APIs.
- Delete `Command` imports from `ArgumentCollectorTool.ts` and concrete tool files.
- Delete direct process-tree operation imports from concrete tool files in the selected canvas/tool path.
- Delete duplicate/misleading factory split for selected path: move or delete `frontend/src/services/factories/PlaneSequenceFactory.ts` if it only exists as a construction sequence peer of `commands/factories`.
- Delete `useCommandExecution.ts` if static search confirms it is unused by active source.
- Delete tests that inspect tool-created `Command` internals; replace with controller tests and behavior assertions.
- Do **not** delete `ActionsPanel.vue`/`Toolbar.vue` command leaks in 006a; instead add the reviewed 006b wave before implementation or record them as explicit next-wave targets in the edited plan.

## Expected behavior change

No intentional user-visible behavior change. Construction, guide/sibling-guide creation, intersections, dynamic projection-plane setup, 3D creation helpers, point drag, style editing, selection behavior, and undo/redo should behave the same. Architectural behavior changes: UI no longer owns concrete command/operation assembly, and command lifecycle becomes testable outside Vue.

## Risks

- Tool interaction state and command lifecycle are currently intertwined in `ArgumentCollectorTool`; extracting them may accidentally change completion behavior or status messaging.
- Some validation is mixed between UI selection constraints and domain construction constraints, especially intersections and projection-plane trace validation. The controller split must avoid moving hit-test/mask concerns into application use-cases while also removing command construction from tools.
- Quick/example construction tools (`QuickProjectionSetupTool`, `Quick3DLineTool`, `Quick3DSegmentTool`, `ExampleConstructionsTool`) may reveal debug/demo paths that should be deleted rather than migrated if not user-facing.
- Leaving panel/toolbar leaks for 006b requires an explicit reviewed wave-plan edit; otherwise Wave 006 success criteria would be ambiguous.

## Validation plan for implementation

Focused tests:

- Tool-controller/use-case tests for point, line, segment, circle, parallel/perpendicular/tangent lines, guide+sibling, line-line/line-circle/circle-circle intersections, projection-plane creation, 3D point/line/segment/plane tools, quick setup tools if retained, point drag/move, and style update.
- Tool interaction tests for masks/status/argument collection independent of command internals.
- Factory/sequence tests updated at the new application location.
- Focused undo/redo tests proving controller-created commands commit and revert correctly.

Full cadence:

- `npm run lint` at root and workspaces where defined.
- Focused Vitest for touched modules.
- Full root Vitest.
- `npm run build` at root and workspaces where defined.
- `npm run test:e2e --workspace=frontend` / Playwright, including construction, guide, intersection, dynamic-plane, selection, properties/style, point move, and undo/redo flows.
- Live Playwright MCP smoke for representative user construction behavior.
- Live preview refresh bound to `0.0.0.0` plus reachability probe.
