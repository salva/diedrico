# Proposal Restructure — Introduce an application interaction port before command controllers

## Summary

Solve Wave 006a one conceptual layer higher than a direct controller extraction: introduce a typed **application interaction port** that all canvas tools use to request domain/application actions. Instead of tools calling a controller method that still mirrors command sequences, tools emit domain-level construction intents (`CreatePointIntent`, `CreateGuideIntent`, `CreateIntersectionIntent`, `CreateAuxiliaryPlaneIntent`, `MovePointIntent`, `UpdateStyleIntent`). A central application command router validates and dispatches these intents to use-cases, each of which owns command construction/execution.

This is heavier than Proposal Direct but produces a sharper boundary: tools no longer know whether the application uses `Command`, `CommandStack`, sequence factories, process-tree actions, or another execution mechanism. The port becomes the stable seam that Wave 006b can later consume for panel/toolbar intents without reopening canvas tool internals.

`ActionsPanel.vue` and `Toolbar.vue` remain out of implementation scope in 006a; they are only considered as future consumers of the same port in Wave 006b.

## Target architecture after this proposal

- **Presentation/interaction:** `SvgCanvas.vue` and `frontend/src/tools/**` create typed intent objects and render interaction state.
- **Application interaction port:** a small public API accepts intents plus interaction metadata and returns typed success/error/user-feedback results.
- **Use-case router:** maps each intent kind to a focused use-case for construction, movement, style, or quick setup.
- **Command implementation:** command/operation classes and process-tree action assembly are hidden behind use-cases and construction sequence helpers.
- **Factory cleanup:** sequence factories become private application implementation helpers or disappear entirely when folded into use-cases.

## Files to change

- `frontend/src/components/workspace/SvgCanvas.vue`
  - Replace direct command/operation imports and stack push code with intent-port calls.
  - Build only UI-level metadata: click coordinates, active plane, selected element ID, drag lifecycle event, style form values.
  - Keep selection read/write behavior local unless a future wave extracts selection orchestration.
- `frontend/src/tools/ITool.ts`
  - Replace command-stack context with `ToolIntentPort` or `emitIntent(intent)`.
  - Define return types that separate interaction result from application execution result.
- `frontend/src/tools/ArgumentCollectorTool.ts`
  - Remove `Command` and `executeOperations` entirely.
  - Make subclasses return `ToolIntent` when a complete argument set is selected.
  - Keep masks, any-order collection, validators, warnings, status, and completion behavior.
- `frontend/src/tools/**`
  - Convert concrete tools to intent producers. For example:
    - `PointTool` emits `CreateFreePointIntent`.
    - line/segment/circle/tangent tools emit construction intents with selected IDs and plane IDs.
    - `GuideTool` emits one `CreateGuideWithSiblingIntent` instead of manually adding two actions.
    - `IntersectionTool` emits an intersection intent with the resolved variant and selected index.
    - `CreateProjectionPlaneTool` emits `CreateAuxiliaryProjectionPlaneIntent` with T1/T2/T2′ references.
    - quick/3D tools emit retained quick setup or 3D construction intents.
- New application modules, recommended location:
  - `frontend/src/application/interaction/ToolIntent.ts`
  - `frontend/src/application/interaction/ToolIntentPort.ts`
  - `frontend/src/application/interaction/CanvasInteractionController.ts`
  - `frontend/src/application/construction/useCases/*.ts`
  - `frontend/src/application/command/CommandExecutionService.ts`
- Existing factory modules:
  - Move command-sequence logic from `frontend/src/commands/factories/**` and `frontend/src/services/factories/PlaneSequenceFactory.ts` behind construction use-cases.
  - Delete public UI-facing sequence-factory imports from all tools/components.
- Tests under `frontend/tests/**`
  - Add intent contract tests to ensure tools produce stable intent DTOs without command imports.
  - Add use-case/router tests for dispatch, validation, rollback, command-stack push, process-tree action creation, and undo/redo.

## Files/tests/docs/fixtures to DELETE

- Delete direct `Command`, `CommandStack`, and concrete operation imports from `SvgCanvas.vue` and all active canvas tools.
- Delete `ToolContext.commandStack` and any comments describing tools as command creators/executors.
- Delete the `ArgumentCollectorTool.executeOperations(cmd, ...)` abstraction because it is command-shaped and leaks implementation details.
- Delete public sequence-factory APIs from `commands/factories` / `services/factories` where their only consumer becomes the application use-case layer; keep only private implementation helpers in the new application location if still useful.
- Delete `frontend/src/composables/useCommandExecution.ts` if still unused; if a caller exists, replace it with a typed adapter over `CommandExecutionService` and delete the `any` result shape.
- Delete obsolete tool/component tests that inspect concrete commands, operation instances, or `CommandStack.push()` from UI code.
- Do not delete `ActionsPanel.vue` or `Toolbar.vue` in this wave; they are explicit Wave 006b residuals.

## Expected behavior change

No intentional user-visible behavior change. The intended internal behavior change is stronger than Proposal Direct: the UI/tool layer becomes independent of command implementation, and construction is represented as typed application intents. Existing construction, guide/intersection, auxiliary-plane, quick/3D, style, point movement, selection, and undo/redo behavior must remain equivalent.

## Validation plan

Focused validation:

- Intent DTO tests for every active tool path: point, line, segment, circle, guide+sibling guide, intersection variants, parallel/perpendicular/tangent lines, 3D point/line/segment/plane, dynamic projection plane, quick setup, point drag, and style update.
- Application router/use-case tests for each intent kind covering validation, command creation, process-tree action creation, rollback on failure, stack push, and undo/redo.
- Tool interaction tests for masks, argument collection, any-order collection, warnings, status messages, and completion without importing command classes.
- Canvas tests for coordinate conversion and intent-port delegation, including selection behavior remaining component/store-owned.

Mandatory full cadence for implementation wave:

1. root/frontend lint where defined;
2. focused Vitest for intent, use-case, tool, and canvas tests;
3. full Vitest suite;
4. root/frontend build where defined;
5. Playwright/e2e covering construction, guide, intersection, dynamic-plane, selection, properties/style, point movement, undo/redo;
6. live Playwright MCP smoke for at least representative point/line/guide/intersection/undo flows;
7. live preview refresh and reachability probe recorded in `implementation-log.md`.

All logs should be captured under `architecture-audit/cycle-006a-canvas-tool-command-controllers/validation/` during implementation/validation.

## Risks

- The intent-port design may be broader than needed for one cycle and could delay removal of concrete imports if over-abstracted.
- A generic router can become a new god module if not split into focused use-cases; use discriminated unions and per-intent handlers rather than a large switch with inline operation assembly.
- Because 006b may later consume the same port, there is a temptation to design for panel/toolbar now. Do not modify or specialize for `ActionsPanel.vue`/`Toolbar.vue` in 006a.
- If sequence factories are only moved behind a router without deleting UI-facing APIs, the wave would fail its aggressive-deletion goal. The public old path must be removed from the selected canvas/tool surface.
