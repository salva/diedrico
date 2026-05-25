# Wave 006a Scope Check — Canvas/tool command controllers

**Stage:** `cycle-006a-fresh-scout-proposals`  
**Wave:** 006a — Canvas/tool command controllers  
**Source-code changes in this stage:** none; this document is scout/proposal evidence only.

## Decision

Wave 006a premises **still hold** after Waves 001–005 and the reviewed Wave 006 split. The accepted `architecture-audit/wave-plan.md` now separates the active canvas/tool command-construction surface from the panel/toolbar surface. The current source tree confirms that Wave 006a can proceed without another wave-plan edit, provided implementation stays limited to `SvgCanvas.vue`, `frontend/src/tools/**`, the command/sequence factory path used by canvas tools, and any command-execution adapter/deletion decision around `useCommandExecution.ts`.

The remaining waves should remain ordered as:

1. **006a — Canvas/tool command controllers** (current): extract canvas/tool command construction and execution into application controllers/use-cases.
2. **006b — Panel/toolbar command-intent cleanup**: `ActionsPanel.vue` and `Toolbar.vue` remain excluded residuals.
3. Wave 007 — 2D rendering selectors/adapters.
4. Wave 008 — 3D rendering scene adapters.
5. Wave 009 — App shell services.
6. Wave 010 — backend/frontend project-contract architecture.
7. Wave 011 — architecture tests and root validation gates.
8. Wave 012 — placeholders/debug surfaces.
9. Wave 013 — docs/spec reconciliation.

No premise invalidation was found: the reviewed split artifact accepted 006a/006b with no blockers (`architecture-audit/cycle-006-ui-command-controllers/reviews/plan-split-review.md`).

## Current-code evidence for the 006a canvas/tool path

### `SvgCanvas.vue` remains a command-construction and command-execution component

- The component imports `CommandStack`, `Command`, `UpdateElementStyleOp`, and `UpdateFreePoint2DPositionOp` directly (`frontend/src/components/workspace/SvgCanvas.vue:188-191`). This violates the desired target where the component emits user intents/render state rather than command internals.
- It also imports and instantiates the active tool classes from the UI layer (`frontend/src/components/workspace/SvgCanvas.vue:192-210`) and recreates a tool instance on tool-store changes (`frontend/src/components/workspace/SvgCanvas.vue:528-546`). This is acceptable interaction composition only if the tools no longer own command lifecycle.
- The component injects `CommandStack` directly from the app shell (`frontend/src/components/workspace/SvgCanvas.vue:429-432`). That stack then enters the tool context for every canvas click (`frontend/src/components/workspace/SvgCanvas.vue:1267-1275`).
- Point dragging is still implemented as an open command held by component state: `endPointDrag()` commits and pushes the command (`frontend/src/components/workspace/SvgCanvas.vue:314-323`), while mouse move rolls back and re-adds `UpdateFreePoint2DPositionOp` directly (`frontend/src/components/workspace/SvgCanvas.vue:1497-1531`).
- Style/properties editing builds a `Command`, constructs `UpdateElementStyleOp`, commits, and pushes directly in the component (`frontend/src/components/workspace/SvgCanvas.vue:1440-1462`). This is an in-scope 006a canvas-side command leak.
- Selection click handling is read/UI state only (`frontend/src/components/workspace/SvgCanvas.vue:1229-1255`) and should remain in the component unless a controller proposal deliberately narrows it; it is not a command-construction problem.

### Tools currently accept execution infrastructure and create commands/operations

- `ITool` states that tools translate user input into commands and execute them through `CommandStack` (`frontend/src/tools/ITool.ts:4-13`). Its `ToolContext` exposes both `commandStack` and `world` (`frontend/src/tools/ITool.ts:26-35`). Wave 006a should delete `commandStack` from active tool context and replace command execution with typed controller calls or intents.
- `ArgumentCollectorTool` imports `Command` (`frontend/src/tools/ArgumentCollectorTool.ts:44`), requires subclasses to implement `executeOperations(cmd, args, context)` (`frontend/src/tools/ArgumentCollectorTool.ts:90-104`), creates `new Command(...)`, checks created elements, commits, and pushes to the stack (`frontend/src/tools/ArgumentCollectorTool.ts:132-155`). This base class is the main open-command lifecycle that 006a must replace.
- `PointTool` imports `Command`, `PointSequenceFactory`, and `AddProcessTreeActionGroupOp` (`frontend/src/tools/PointTool.ts:18-21`), then creates an action group operation and delegates to the sequence factory inside `executeOperations()` (`frontend/src/tools/PointTool.ts:58-85`).
- `GuideTool` imports `Command`, `GuideSequenceFactory`, process-tree action creators, and process-tree operations (`frontend/src/tools/GuideTool.ts:30-36`), then creates guide/sibling-guide actions in the tool (`frontend/src/tools/GuideTool.ts:90-127`).
- `IntersectionTool` imports `Command`, `IntersectionSequenceFactory`, and `AddProcessTreeActionGroupOp` (`frontend/src/tools/IntersectionTool.ts:25-28`), combines UI argument selection with validation and command-sequence creation (`frontend/src/tools/IntersectionTool.ts:86-173`). Its geometric feasibility choices are useful controller inputs, but command assembly should move out of the tool class.
- `CreateProjectionPlaneTool` imports `Command`, `PlaneSequenceFactory` from `services/factories`, and `AddProcessTreeActionGroupOp` (`frontend/src/tools/CreateProjectionPlaneTool.ts:27-32`), then opens an action group and calls plane factories (`frontend/src/tools/CreateProjectionPlaneTool.ts:172-214`). This confirms dynamic-plane creation belongs in 006a validation.

### Factory split is still misleading for the active construction path

- `PointSequenceFactory` lives under `commands/factories`, takes an already-open `Command`, imports concrete operations, executes `AddFreePoint2DOp`, then adds a process-tree action (`frontend/src/commands/factories/PointSequenceFactory.ts:15-20`, `frontend/src/commands/factories/PointSequenceFactory.ts:35-50`). It is a command-sequence helper, not an application use-case boundary.
- `LineSequenceFactory` documents an “Open Command” pattern and imports concrete world/process operations (`frontend/src/commands/factories/LineSequenceFactory.ts:10-17`, `frontend/src/commands/factories/LineSequenceFactory.ts:35-44`), then executes operations and process-tree additions from static methods (`frontend/src/commands/factories/LineSequenceFactory.ts:69-90`, `frontend/src/commands/factories/LineSequenceFactory.ts:103-158`).
- `PlaneSequenceFactory` lives under `services/factories` but also takes an open `Command`, imports concrete operations, and executes process-tree/world/style operations (`frontend/src/services/factories/PlaneSequenceFactory.ts:18-34`, `frontend/src/services/factories/PlaneSequenceFactory.ts:52-80`, `frontend/src/services/factories/PlaneSequenceFactory.ts:106-184`). The namespace split (`commands/factories` versus `services/factories`) should be deleted or collapsed for the selected path into an application-owned construction/use-case location.

### `useCommandExecution.ts` is unused/misaligned with the active canvas path

`useCommandExecution.ts` imports `processStore` and `Command`, exposes `CommandResult<T = any>`, calls `command.addAndExecute()` without a concrete operation argument, then pushes into `processStore` (`frontend/src/composables/useCommandExecution.ts:1-18`, `frontend/src/composables/useCommandExecution.ts:27-43`). It is not injected into the `SvgCanvas.vue` path above. Static search during this scout found no active `useCommandExecution` call site by name, so implementation should delete it unless a final focused search finds a current import.

### Explicit 006b residuals to keep out of scope

The reviewed split made `ActionsPanel.vue` and `Toolbar.vue` the Wave 006b surface. Wave 006a proposals must not patch them except to cite them as residuals in implementation logs. If implementation discovers a necessary change to either component, it should stop and run a reviewed plan edit instead of broadening this wave.

## Scope conclusion

Wave 006a can proceed to review on the artifacts in this directory without further wave-plan edits. The implementation should target the active canvas/tool command lifecycle: component point movement/style updates, tool argument collection, construction/use-case execution, factory relocation/deletion, and tests that currently inspect command internals in that path. It must leave `ActionsPanel.vue` and `Toolbar.vue` untouched as explicit Wave 006b residuals.
