# Wave 006a Implementation Log — Canvas/tool command controllers

## Summary

Implemented Proposal Direct for the active `SvgCanvas.vue` / `frontend/src/tools/**` canvas command-construction path. Canvas and retained tools now delegate command creation/execution to application-owned controllers/use-cases. Tools remain interaction/argument collectors; application modules own command construction, operation/factory sequencing, command-stack push, point movement preview/commit/cancel, and style updates.

`ActionsPanel.vue` and `Toolbar.vue` were not modified and remain Wave 006b residual command-leak scope.

## Source files changed

### New application boundary

- `frontend/src/application/tools/ToolCommandIntents.ts` — typed tool construction, quick-tool, movement, style, and command-sink contracts.
- `frontend/src/application/tools/CanvasToolController.ts` — canvas/tool command sink and factory for DI from Vue.
- `frontend/src/application/construction/ConstructionUseCases.ts` — application-owned command creation/execution for retained construction intents.
- `frontend/src/application/construction/QuickToolUseCases.ts` — explicit non-active quick-tool handler after quick/example tools were removed from the active canvas registry.
- `frontend/src/application/canvas/CanvasPointMovementUseCase.ts` — point drag preview/commit/cancel command lifecycle.
- `frontend/src/application/canvas/CanvasStyleUseCase.ts` — style update command lifecycle.

### Canvas/tool path

- `frontend/src/components/workspace/SvgCanvas.vue` — removed direct `Command`, concrete style/move operation imports, direct point-drag command assembly, direct style command assembly, and active quick/example registrations; delegates through `createCanvasToolController()`.
- `frontend/src/tools/ITool.ts` — removed `CommandStack` from `ToolContext`; added typed `ToolCommandSink`; comments now describe tools as intent/argument collectors.
- `frontend/src/tools/ArgumentCollectorTool.ts` — removed open-command lifecycle (`new Command`, `executeOperations`, rollback/commit, `commandStack.push`) and now emits `ToolConstructionIntent` through `context.commandSink`.
- Retained required tools migrated to intent emission by deleting concrete command/factory/operation/process-tree imports and command-sequencing overrides:
  - `PointTool.ts`
  - `LineTool.ts`
  - `SegmentTool.ts`
  - `CircleTool.ts`
  - `GuideTool.ts`
  - `IntersectionTool.ts`
  - `ParallelLineTool.ts`
  - `PerpendicularLineTool.ts`
  - `TangentLineToCircleThroughPointTool.ts`
  - `TangentLineToCircleParallelToLineTool.ts`
  - `CreateProjectionPlaneTool.ts`
- Conditionally retained user-facing 3D construction tools retained and migrated to the same intent boundary:
  - `Create3DPointTool.ts`
  - `Create3DLineTool.ts`
  - `Create3DSegmentTool.ts`
  - `Create3DPlaneTool.ts`

### Tests changed/deleted

- Updated retained tool tests to provide the new `commandSink` instead of `commandStack` in `ToolContext`:
  - `frontend/tests/unit/tools/pointTool.spec.ts`
  - `frontend/tests/unit/tools/CircleTool.spec.ts`
  - `frontend/tests/unit/tools/toolValidation.spec.ts`
  - `frontend/tests/integration/pointCreation.spec.ts`
- Deleted obsolete quick/example command-internals test:
  - `frontend/tests/unit/tools/Quick3DSegmentTool.spec.ts`

## Explicit DELETE / retain-or-delete completion

Deleted from the selected active canvas/tool path:

- Direct concrete operation imports from `SvgCanvas.vue` for point movement and style updates.
- Direct `Command` construction and direct command-stack push for point movement/style edits in `SvgCanvas.vue`.
- `CommandStack` exposure in `ToolContext`.
- `Command` imports and `executeOperations` hooks in `ArgumentCollectorTool.ts` and retained tools.
- Concrete operation/process-tree imports from retained tools.
- UI-facing sequence factory imports from retained tools.
- `frontend/src/composables/useCommandExecution.ts` after static search confirmed it had no active import.
- Active canvas quick/example/debug tool files and registry entries:
  - `frontend/src/tools/QuickProjectionSetupTool.ts`
  - `frontend/src/tools/Quick3DLineTool.ts`
  - `frontend/src/tools/Quick3DSegmentTool.ts`
  - `frontend/src/tools/ExampleConstructionsTool.ts`
  - `frontend/tests/unit/tools/Quick3DSegmentTool.spec.ts`

Retained and migrated:

- Core 006a construction tools: point, line, segment, circle, guide, intersection, parallel/perpendicular, both tangent flows.
- Dynamic projection-plane creation: `CreateProjectionPlaneTool.ts`.
- 3D construction tools: retained as active canvas tool-registry entries and migrated through the controller boundary.

Deleted rather than retained:

- Quick/example tools (`quickprojectionsetup`, `quick3dline`, `quick3dsegment`, `interactiveprojectionsetup`) were classified as example/debug quick flows based on names/comments and removed from `SvgCanvas.vue` active factory registration so no parallel command-construction path remains in the selected canvas path. Toolbar shortcut/example decisions remain Wave 006b.

Retained untouched/deferred:

- `frontend/src/components/panels/ActionsPanel.vue` — not modified; Wave 006b residual.
- `frontend/src/components/toolbars/Toolbar.vue` — not modified; Wave 006b residual.

## Validation commands and logs

All logs are under `architecture-audit/cycle-006a-canvas-tool-command-controllers/validation/`.

- Initial static search: `t1-initial-static-search.stdout/.stderr`.
- Source/tool inventory snippets: `t1-source-snippets.*`, `t1-tool-inventory.*`, `t1-context-usage.*`, `t1-svg-targets.*`, `t1-svg-targets2.*`.
- Build attempt: `npm run build --workspace=frontend` → failed before source diagnostics due `vue-tsc` runtime patch error `Search string not found: "/supportedTSExtensions = .*(?=;)/"`; logs `t1-first-frontend-build.stdout/.stderr`.
- Lint attempt: `npm run lint --workspace=frontend` → failed because `eslint` binary is unavailable (`sh: 1: eslint: not found`); logs `t1-first-frontend-lint.stdout/.stderr`.
- TypeScript fallback: `npx tsc --noEmit -p frontend/tsconfig.json` with filtered changed-file diagnostics. Final filtered run reported no diagnostics for changed application/tools/SvgCanvas/tests files; logs `t1-tsc-noemit-final.combined`, `t1-tsc-noemit-final-filtered.stdout/.stderr`. Full project tsc still reports pre-existing unrelated command/operation typing errors outside the 006a changed files.
- Static architecture boundary check: `t1-final-static-architecture-check.stdout/.stderr` and `t1-post-svg-commandstack-removal.stdout/.stderr`. Results: no selected-path hits for `executeOperations`, `new Command`, concrete move/style operations, active tool factory imports, process-tree operation imports, or `useCommandExecution`; only remaining `commandStack` mention in `SvgCanvas.vue` is DI passed into `createCanvasToolController`.
- Focused Vitest: `npm run test --workspace=frontend -- tests/unit/tools/pointTool.spec.ts tests/unit/tools/CircleTool.spec.ts tests/unit/tools/toolValidation.spec.ts` passed 40/40 tests; logs `t1-focused-vitest-5.stdout/.stderr`.

## Validation not completed in this implementation task

The stage task required focused validation; the mandatory full cadence remains for the next validation/preview stage. During implementation, root/frontend lint and frontend build were attempted and blocked by environment/tooling issues noted above, not by changed source diagnostics. Full Vitest/e2e/Playwright/live preview refresh were not run in this coding task and must be performed in `cycle-006a-validation-and-preview-refresh`.

## Residual risks and candidate future waves

- Application construction use-cases still call existing low-level sequence factories as implementation details. The selected Vue/tool path no longer imports them, but a later cleanup wave may fully relocate/fold factory implementations once non-UI callers are audited.
- `ActionsPanel.vue` and `Toolbar.vue` remain direct command-construction leak candidates for Wave 006b by design.
- Quick/example tool deletion removes those debug/example canvas registrations; if product wants user-facing examples later, they should be reintroduced through a reviewed application intent/controller design, not by resurrecting tool-owned command construction.
- Full e2e/live validation is still required in the next validation stage because this wave touches user-observable canvas behavior.

## t3 reviewer-blocker corrections — ambiguous intents and focused tests

Follow-up task `t3-correct-ambiguous-intents-and-tests` corrected the reviewer blockers from `t2-review-stage`.

### Source corrections

- `frontend/src/application/tools/ToolCommandIntents.ts` now models ambiguous construction metadata as typed intent variants:
  - tangent intents require `{ tangentIndex, selectionPoint }` metadata;
  - intersection intents require `{ selectionPoint }` metadata;
  - non-ambiguous construction intents cannot carry ambiguity metadata.
- `frontend/src/tools/IntersectionTool.ts` overrides `buildConstructionIntent()` to pass the cursor/selection point used for line-circle and circle-circle disambiguation across the tool/controller boundary.
- `frontend/src/tools/TangentLineToCircleThroughPointTool.ts` overrides `buildConstructionIntent()` to pass typed tangent metadata. It computes `tangentIndex` by comparing the cursor selection point with the two actual candidate tangent points derived from the current circle/through-point geometry.
- `frontend/src/tools/TangentLineToCircleParallelToLineTool.ts` overrides `buildConstructionIntent()` to pass typed tangent metadata. It computes `tangentIndex` by comparing the cursor selection point with the two actual parallel tangent candidates derived from the current circle/reference-line geometry.
- `frontend/src/application/construction/ConstructionUseCases.ts` now consumes the typed metadata and no longer reads tangent choice through an ad-hoc `(intent as any).tangentIndex` fallback or recomputes intersection cursor choice from the second generic argument value.
- `frontend/src/tools/ArgumentCollectorTool.ts` keeps the default builder only for non-ambiguous construction intents; ambiguous tools must supply typed metadata explicitly.

### Focused tests added

- Added `frontend/tests/unit/application/canvasToolControllers.spec.ts` covering:
  - construction use-case command lifecycle and rollback/no-stack-pollution on failed construction;
  - typed line-circle intersection metadata selecting the intended intersection branch;
  - typed tangent metadata preserving non-default tangent index selection;
  - point movement preview/cancel/commit plus undo stack effects;
  - style update command creation plus undo stack effects;
  - tool delegation through `ToolCommandSink` with explicit tangent/intersection metadata;
  - static SvgCanvas delegation assertions for controller-owned movement/style paths;
  - PointTool delegation through `CanvasToolController`.

### t3 validation commands and logs

All logs are under `architecture-audit/cycle-006a-canvas-tool-command-controllers/validation/`.

- Initial controller test run exposed an expected-test mismatch, not a source failure: `t3-focused-controllers-v1.stdout/.stderr`.
- Intermediate controller/static-test iterations fixed test harness path/import issues: `t3-focused-controllers-v2` through `t3-focused-controllers-v6`.
- Existing t1 focused tool coverage rerun: `t3-focused-tools.stdout/.stderr` passed 40/40 tests.
- Final controller-only focused run: `t3-focused-controllers-final.stdout/.stderr` passed 8/8 tests.
- Final combined focused run after geometry-based tangent choice tightening: `t3-focused-combined-postchoice.stdout/.stderr` passed 48/48 tests across `canvasToolControllers.spec.ts`, `pointTool.spec.ts`, `CircleTool.spec.ts`, and `toolValidation.spec.ts`.
- Static metadata/controller boundary scan: `t3-static-metadata-boundary.stdout/.stderr` confirms selected-path ambiguity metadata now appears in the typed tool/application boundary, with command internals remaining in application modules and tests only.
- TypeScript fallback filtered to changed Wave 006a files: `t3-tsc-filtered-final.stdout/.stderr` produced no diagnostics; full unfiltered output remains captured in `t3-tsc-noemit-final.combined` and still includes unrelated project-wide diagnostics outside the changed files as previously documented.

### Residual scope notes

- This correction did not modify `ActionsPanel.vue` or `Toolbar.vue`; they remain Wave 006b residual command-intent cleanup scope.
- The full mandatory validation/e2e/preview cadence remains for the dedicated validation-and-preview-refresh stage; this t3 task supplied the missing focused controller/use-case/canvas/tool delegation evidence required by the reviewer blocker.
