# Wave 007 Implementation Log — 2D rendering selectors and adapters

## Implemented scope

Implemented Proposal Restructure by introducing a read-only canvas presentation boundary under `frontend/src/application/canvasPresentation/`:

- `CanvasPresentationModel.ts` defines render/query/grid/snap/style/plane-transform DTOs and explicit render discriminants.
- `CanvasPresentationSelector.ts` is the only new module that traverses `World`, projection planes, concrete 2D domain classes, 2D realizations, and projected-3D-on-2D read output for the 2D canvas model.
- `CanvasStylePolicy.ts` centralizes point/line/segment/circle/guide/hinge/projected style decisions, selection/hover/cascade/snap state, active-plane opacity, and z-order.
- `CanvasVisibilityPolicy.ts` centralizes visibility resolution behind the selector boundary.
- `CanvasGridSelector.ts` extracts active-plane grid and label DTO generation from `SvgCanvas.vue`.
- `CanvasInteractionQuery.ts` answers hit/snap/properties/selection-mask queries from `CanvasQueryItem` DTOs, including finite-segment clamping and active-plane filtering.
- `CanvasPresentationController.ts` is the thin Vue-facing facade.

Updated 2D rendering consumers:

- `frontend/src/components/workspace/SvgCanvas.vue` now builds and consumes `CanvasPresentationModel` for render primitives, grid lines/labels, and interaction queries. It no longer constructs `PrimitiveContext`, calls `paperService.generatePrimitives`, calls `Paper.hitTest`, or owns active-plane grid/label realization logic.
- `frontend/src/services/SVGRenderer.ts` now clips infinite lines with explicit canvas bounds passed by the caller instead of hidden hard-coded/TODO viewport dimensions.
- `frontend/src/domain/presentation/Paper.ts` is reduced to primitive DTO/collection helpers with no raw `World` imports and no hit-test implementation.
- `frontend/src/tools/ITool.ts` and `frontend/src/tools/ArgumentCollectorTool.ts` use `CanvasInteractionQuery` instead of `Paper.hitTest`, preserving Wave 006a command-intent/controller boundaries.

## Deleted legacy surfaces

Deleted as required by the Wave 007 decision:

- `frontend/src/services/RenderService.ts`
- `frontend/src/services/PaperService.ts`
- `frontend/tests/unit/services/renderService.spec.ts`
- `frontend/tests/unit/services/paperService.spec.ts`
- `frontend/tests/unit/domain/paperHitTesting.spec.ts`
- `frontend/tests/unit/selectionMask.spec.ts`
- `frontend/tests/unit/services/projectionDisplay.spec.ts`

No compatibility overload for `Paper.hitTest(world, ...)` or `PaperService.generatePrimitives(context)` remains.

## Tests added/updated

Added focused coverage:

- `frontend/tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts`
- `frontend/tests/unit/application/canvasPresentation/canvasInteractionQuery.spec.ts`
- `frontend/tests/unit/application/canvasPresentation/canvasGridSelector.spec.ts`
- `frontend/tests/unit/services/svgCanvasRenderer.spec.ts`

Updated tool/controller tests to use the query boundary instead of `Paper`:

- `frontend/tests/unit/application/canvasToolControllers.spec.ts`
- `frontend/tests/unit/tools/CircleTool.spec.ts`
- `frontend/tests/unit/tools/pointTool.spec.ts`
- `frontend/tests/unit/tools/toolValidation.spec.ts`

## Static architecture checks

Final static boundary scan: `architecture-audit/cycle-007-2d-rendering-selectors-adapters/validation/t1-static-boundary-scan-final.stdout` / `.stderr`.

Results:

- `RenderService.ts` and `PaperService.ts` are deleted.
- No active source/test references to `PaperService`, `RenderService`, `PrimitiveContext`, `paper.hitTest`, or `generatePrimitives` remain.
- `SvgCanvas.vue` has no `PrimitiveContext`, `paperService`, `generatePrimitives`, `paper.hitTest`, direct `world.projectionPlanes`, embedded `computeAdaptiveGridParams`, or component-owned `plane.realize2D(world)` grid logic.
- `SVGRenderer.ts` has no domain/world imports and receives explicit canvas bounds for line clipping.
- `Paper.ts` has no raw domain imports and no `hitTest` method; one doc line says it has no `World` dependency.
- No Wave 008 files (`ThreeView.vue`, Three scene adapters) were changed.
- No UI command-construction responsibility was reintroduced in `SvgCanvas.vue`/tools/panels; construction/style/move still flow through existing controllers/use cases.

## Validation commands and logs

Implementation-stage focused validation:

- Focused Vitest pass: `npm run test --workspace=frontend -- --run tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts tests/unit/application/canvasPresentation/canvasInteractionQuery.spec.ts tests/unit/application/canvasPresentation/canvasGridSelector.spec.ts tests/unit/services/svgCanvasRenderer.spec.ts tests/unit/application/canvasToolControllers.spec.ts tests/unit/tools/CircleTool.spec.ts tests/unit/tools/toolValidation.spec.ts tests/unit/tools/pointTool.spec.ts`
  - Logs: `validation/t1-focused-vitest-final.stdout`, `validation/t1-focused-vitest-final.stderr`
  - Result: 8 files passed, 55 tests passed.
- Root Vitest: `npm run test`
  - Logs: `validation/t1-root-test.stdout`, `validation/t1-root-test.stderr`, tail summary in `validation/t1-root-test-tail.stdout`
  - Result: failed with 4 failing pre-existing suites / 16 failing tests; failures observed in properties dialog expectations and unrelated suites, while all new canvas-presentation tests passed in the full run.
- Root lint: `npm run lint`
  - Logs: `validation/t1-root-lint.stdout`, `validation/t1-root-lint.stderr`
  - Result: failed before linting because `eslint` executable is not installed/found in the workspace (`sh: 1: eslint: not found`).
- Root build: `npm run build`
  - Logs: `validation/t1-root-build.stdout`, `validation/t1-root-build.stderr`
  - Result: failed before app compilation due existing `vue-tsc`/Node compatibility error: `Search string not found: "/supportedTSExtensions = .*(?=;)/"` under Node v24.15.0.
- Plain TypeScript probe: `npx tsc -p frontend/tsconfig.json --noEmit`
  - Logs: `validation/t1-tsc-2.combined`, filtered output in `validation/t1-tsc-2-filtered.stdout`
  - Result: no task-attributable errors after fixes; broader project still has unrelated type errors when run unfiltered.
- Frontend Playwright/e2e: `npm run test:e2e --workspace=frontend`
  - Logs: `validation/t1-e2e.stdout`, `validation/t1-e2e.stderr`
  - Result: failed before browser execution due pre-existing syntax errors in e2e specs (`keyboard-shortcuts.spec.ts` and `selection-mask.spec.ts`).

## Residual risks and blockers

- Mandatory full validation remains blocked by pre-existing project/tooling issues unrelated to Wave 007: missing `eslint`, `vue-tsc` incompatible with current Node/TypeScript patching behavior, existing root Vitest failures, and malformed e2e spec files. These are captured in stable logs for the validation stage.
- `CanvasPresentationSelector` is intentionally the raw-domain traversal boundary; it should be monitored in later waves to avoid becoming a god-module as more read concerns accrete.
- Live preview refresh/probe was not performed in this implementation task because full mandatory validation did not pass; it remains for the validation/preview-refresh stage once blockers are classified/accepted or resolved.

## Out-of-scope guards

- Did not refactor `ThreeView.vue` or 3D scene adapters (Wave 008).
- Did not move application shell, persistence, keyboard routing, or lifecycle orchestration (Wave 009).
- Did not reintroduce direct UI command construction; tools still emit intents and controllers/use cases own mutations.
