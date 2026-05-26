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

## t1b continuation verification

The continuation worker found the Wave 007 source implementation already committed in `951230c30997adb262ba2cbdfb6a17f370803114` and did not need to modify application source.

Additional evidence captured for this handoff/reporting task:

- Focused Vitest rerun: `npm run test --workspace=frontend -- --run tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts tests/unit/application/canvasPresentation/canvasInteractionQuery.spec.ts tests/unit/application/canvasPresentation/canvasGridSelector.spec.ts tests/unit/services/svgCanvasRenderer.spec.ts tests/unit/application/canvasToolControllers.spec.ts tests/unit/tools/CircleTool.spec.ts tests/unit/tools/toolValidation.spec.ts tests/unit/tools/pointTool.spec.ts`
  - Logs: `validation/t1b-focused-vitest.stdout`, `validation/t1b-focused-vitest.stderr`
  - Result: passed; 8 files passed, 55 tests passed.
- Static boundary scan rerun:
  - Logs: `validation/t1b-static-boundary-scan.stdout`, `validation/t1b-static-boundary-scan.stderr`
  - Result: no `RenderService.ts`, `PaperService.ts`, obsolete Paper/PaperService/RenderService test files, `PrimitiveContext`, `generatePrimitives`, or `Paper.hitTest` compatibility path found in the Wave 007 2D canvas boundary. Remaining `hitTest` references are `CanvasInteractionQuery` calls/tests. Remaining `world.projectionPlanes` / `realize2D(world)` references are either in the allowed canvas-presentation selector boundary, domain tests, tool tests that build worlds, or `Element2DRenderer3D.ts` (Wave 008 3D scope, unchanged). `SvgCanvas.vue` uses the interaction query and presentation model rather than the deleted raw PaperService/Paper hit-test paths.
- Git status scoped to Wave 007 source paths showed no uncommitted frontend source/test changes after the prior implementation commit; this continuation task only added verification/reporting artifacts.

Residual validation blockers remain as classified above: missing `eslint`, `vue-tsc` failing under the current Node/toolchain, existing root Vitest failures, and malformed e2e specs. No new Wave 007-attributable focused test failure was found during t1b verification.


## t3 live preview smoke correction

Addressed the reviewer live-preview smoke blocker with a fresh preview refresh, HTTP reachability probe, and browser smoke/diagnostic runs. No application source was changed by this correction task.

Preview refresh/probe evidence:

- Initial refresh wrapper attempt failed because `/bin/sh` did not support `set -o pipefail`; logs: `validation/t3-preview-refresh.stdout`, `validation/t3-preview-refresh.stderr`.
- First root-level restart attempt mis-forwarded `--host` through npm, leaving Vite localhost-only as `vite 0.0.0.0`; logs: `validation/t3-live-preview.stdout`, `validation/t3-live-preview.stderr`, `validation/t3-preview-process-after-failed-probe.stdout`, `validation/t3-preview-http-probe.stdout`, `validation/t3-preview-http-probe.stderr`.
- Corrected refresh used `npm run dev --workspace=frontend -- --host 0.0.0.0`, replacing the stale process and starting Vite as `node /work/diedrico/node_modules/.bin/vite --host 0.0.0.0`; logs: `validation/t3-preview-refresh2.stdout`, `validation/t3-preview-refresh2.stderr`, `validation/t3-live-preview-refresh2.stdout`, `validation/t3-live-preview-refresh2.stderr`, `validation/t3-live-preview-refresh2.pid`.
- HTTP probe succeeded on the refreshed preview: `curl http://127.0.0.1:5173/` returned HTTP 200 and the Diedrico index HTML; logs: `validation/t3-preview-http-probe2.stdout`, `validation/t3-preview-http-probe2.stderr`.

Browser smoke evidence:

- A Playwright diagnostic run loaded `http://127.0.0.1:5173/`, mounted `svg.svg-canvas` at approximately `980x613`, mounted the Wave 007 presentation groups `g.background-grid` and `g.grid-labels`, and reported no page errors; logs: `validation/t3-playwright-diagnostic.stdout`, `validation/t3-playwright-diagnostic.stderr`.
- The same diagnostic captured that the default empty project state has `0` grid line DTOs, `0` grid label DTOs, and `0` rendered SVG geometry even though the `Toggle Grid` control is active. This is not an environment blocker: the app served and mounted the canvas, but the default world/active-plane state did not produce visible grid/read-model entries in this browser smoke.
- A controls diagnostic verified accessible toolbar controls including `Free Point`, `Selection Tool`, and `Toggle Grid`; logs: `validation/t3-controls-diagnostic.stdout`, `validation/t3-controls-diagnostic.stderr`.
- A user-interaction diagnostic clicked `Free Point` and the center of the SVG canvas. The UI switched to `Tool: Point / Pick` and logged `[SvgCanvas] Created new tool instance: point`, but no SVG circle was rendered and no page error was emitted; logs: `validation/t3-point-click-diagnostic.stdout`, `validation/t3-point-click-diagnostic.stderr`.
- Strict smoke scripts that required visible grid lines or rendered point creation failed with stable evidence, respectively: `validation/t3-playwright-smoke2.stdout`/`.stderr` and `validation/t3-playwright-smoke-final.stdout`/`.stderr`.
- The first log-update helper attempted `python` and failed because only `python3` is present; logs: `validation/t3-update-implementation-log.stdout`, `validation/t3-update-implementation-log.stderr`.

Classification:

- Live preview refresh and reachability are complete: the refreshed Vite process is bound on `0.0.0.0` and the app answers HTTP 200.
- Browser smoke is partially successful: the application loads, the 2D SVG canvas mounts, Wave 007 grid/read-model groups exist in the DOM, controls are accessible, and no browser/page errors occur.
- User-visible 2D geometry smoke remains inconclusive/blocked by default-state behavior: the empty initial project exposes no visible grid labels/lines and a Free Point click did not render a point. The stable logs above classify the observed behavior precisely for the validation stage/reviewer rather than hiding it as a generic Playwright failure.

## cycle-007-validation-and-preview-refresh / t1 validation cadence

Validation-stage worker `t1-validation-cadence-static-preview-log` reran the required cadence and captured stable logs under `architecture-audit/cycle-007-2d-rendering-selectors-adapters/validation/` with the `t1-stage-*` prefix. No application architecture refactor was performed in this stage; only stale comments that still named `Paper.hitTest()` were updated to reference the Wave 007 `CanvasInteractionQuery` boundary.

### Commands attempted and classification

- Root lint: `npm run lint`
  - Logs: `validation/t1-stage-root-lint.stdout`, `validation/t1-stage-root-lint.stderr`
  - Result: **failed, non-attributable/pre-existing tooling blocker**. The command delegates to frontend lint and fails before linting with `sh: 1: eslint: not found`, matching the implementation-stage blocker.
- Frontend lint: `npm run lint --workspace=frontend`
  - Logs: `validation/t1-stage-frontend-lint.stdout`, `validation/t1-stage-frontend-lint.stderr`
  - Result: **failed, non-attributable/pre-existing tooling blocker** for the same missing `eslint` executable.
- Backend lint probe:
  - Logs: `validation/t1-stage-backend-lint.stdout`, `validation/t1-stage-backend-lint.stderr`
  - Result: **not applicable/pass**. `backend/package.json` has no lint script.
- Focused Wave 007 Vitest: `npm run test --workspace=frontend -- --run tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts tests/unit/application/canvasPresentation/canvasInteractionQuery.spec.ts tests/unit/application/canvasPresentation/canvasGridSelector.spec.ts tests/unit/services/svgCanvasRenderer.spec.ts tests/unit/application/canvasToolControllers.spec.ts tests/unit/tools/CircleTool.spec.ts tests/unit/tools/toolValidation.spec.ts tests/unit/tools/pointTool.spec.ts tests/unit/components/SvgCanvas.gridLabels.spec.ts`
  - Logs: `validation/t1-stage-focused-vitest.stdout`, `validation/t1-stage-focused-vitest.stderr`
  - Result: **passed**. 9 files passed / 65 tests passed, covering selector DTOs, interaction/hit query, grid/labels, renderer adapter, controller/tool boundaries, point/circle construction behavior, and SvgCanvas grid-label behavior.
- Root Vitest: `npm run test`
  - Logs: `validation/t1-stage-root-test.stdout`, `validation/t1-stage-root-test.stderr`
  - Result: **failed, non-attributable/pre-existing/unrelated suite failures**. Failure set includes `tests/integration/guide-creation.test.ts` importing removed/renamed `../../src/commands/operations/AddFreePoint2DOp`, `tests/unit/architecture/noCommandSubclasses.spec.ts` failing on `default.resolve is not a function`, many unrelated `tests/unit/calculations/intersections.spec.ts` expectation mismatches, and `tests/unit/components/propertiesDialog.spec.ts` close/save event expectations. Focused Wave 007 tests passed inside the same codebase.
- Full frontend Vitest: `npm run test --workspace=frontend`
  - Logs: `validation/t1-stage-frontend-test.stdout`, `validation/t1-stage-frontend-test.stderr`
  - Result: **failed, non-attributable/pre-existing/unrelated suite failures** with the same failure classes as root Vitest.
- Backend Vitest: `npm run test --workspace=backend`
  - Logs: `validation/t1-stage-backend-test.stdout`, `validation/t1-stage-backend-test.stderr`
  - Result: **passed**. 1 file passed / 15 tests passed.
- Root build: `npm run build`
  - Logs: `validation/t1-stage-root-build.stdout`, `validation/t1-stage-root-build.stderr`
  - Result: **failed, non-attributable/pre-existing toolchain blocker**. `vue-tsc` aborts before app compilation with `Search string not found: "/supportedTSExtensions = .*(?=;)/"` under Node v24.15.0.
- Frontend build: `npm run build --workspace=frontend`
  - Logs: `validation/t1-stage-frontend-build.stdout`, `validation/t1-stage-frontend-build.stderr`
  - Result: **failed, non-attributable/pre-existing toolchain blocker** with the same `vue-tsc`/Node v24.15.0 error.
- Backend build: `npm run build --workspace=backend`
  - Logs: `validation/t1-stage-backend-build.stdout`, `validation/t1-stage-backend-build.stderr`
  - Result: **passed**.
- Frontend Playwright/e2e: `npm run test:e2e --workspace=frontend`
  - Logs: `validation/t1-stage-e2e.stdout`, `validation/t1-stage-e2e.stderr`
  - Result: **failed, non-attributable/pre-existing malformed e2e specs**. Playwright aborts during spec parsing with syntax errors in `frontend/tests/e2e/keyboard-shortcuts.spec.ts` at line 267 and `frontend/tests/e2e/selection-mask.spec.ts` at line 188, before browser execution.

### Static architecture boundary checks

- Consolidated scans: `validation/t1-stage-static-boundary-scan.stdout` / `.stderr` and final scan `validation/t1-stage-static-boundary-scan-final.stdout` / `.stderr`.
- Result: **passed with expected scoped findings**.
  - `frontend/src/services/RenderService.ts`, `frontend/src/services/PaperService.ts`, and obsolete RenderService/PaperService/Paper hit-testing tests remain absent.
  - No active `SvgCanvas.vue` references to `PrimitiveContext`, `paperService`, `generatePrimitives`, `Paper.hitTest`, direct `world.projectionPlanes`, component-owned `computeAdaptiveGridParams`, or `realize2D(world)` grid logic were found.
  - `frontend/src/domain/presentation/Paper.ts` has no raw `domain/world` imports and no hit-test API.
  - `frontend/src/services/SVGRenderer.ts` imports only presentation primitives from `domain/presentation/Paper`, not raw `domain/world` classes.
  - Raw domain traversal remains confined to the reviewed `frontend/src/application/canvasPresentation/` selector/policy boundary.
  - No Wave 008 3D scene-adapter files were changed by this stage.
  - No UI command/operation construction was reintroduced in `SvgCanvas.vue`; the only command-scan match was an error-message string in `ArgumentCollectorTool.ts`.
- Comment cleanup: `frontend/src/types/ToolArgumentCollector.ts` and `frontend/src/types/SelectionMask.ts` no longer mention `Paper.hitTest()` in comments; logs: `validation/t1-stage-comment-boundary-fix.stdout`, `validation/t1-stage-comment-boundary-fix.stderr`.

### Live preview refresh and browser smoke

- Preview refresh/probe evidence:
  - Initial process-management attempts: `validation/t1-stage-preview-refresh.stdout` / `.stderr`, `validation/t1-stage-preview-refresh2.stdout` / `.stderr` show the hazard that broad process matching can kill the wrapper itself.
  - Successful detached preview start/probe: `validation/t1-stage-live-preview-detached.stdout`, `validation/t1-stage-live-preview-detached.stderr`, `validation/t1-stage-live-preview-detached.pid`, `validation/t1-stage-preview-detached-probe.stdout`, `validation/t1-stage-preview-detached-probe.stderr`.
  - Binding/reachability: `ss` showed `0.0.0.0:5173` served by `node /work/diedrico/node_modules/.bin/vite --host 0.0.0.0`; `curl http://127.0.0.1:5173/` returned HTTP 200 and the Diedrico index HTML.
- Live browser smoke:
  - Strict click smoke: `validation/t1-stage-live-browser-smoke2.stdout`, `validation/t1-stage-live-browser-smoke2.stderr` loaded the app and resolved `svg.svg-canvas`, but clicking the SVG center timed out because the existing `canvas.three-canvas` overlay intercepted pointer events.
  - Diagnostic smoke: `validation/t1-stage-live-browser-diagnostic.stdout`, `validation/t1-stage-live-browser-diagnostic.stderr` passed. It confirmed the title `Diedrico - Dihedral Learning MVP`, one mounted SVG canvas at about `980x612.5`, Wave 007 presentation groups `g.background-grid` and `g.grid-labels`, no page/console errors, and HTTP-served app reachability. The diagnostic also recorded default-state behavior: zero grid lines/labels and center point hit target is the 3D overlay canvas, making user-visible 2D point-click smoke inconclusive without changing app state or 3D overlay behavior.
- Classification: preview refresh and reachability are **complete**. Browser smoke is **partially successful/inconclusive for point construction**, blocked by the current overlay/default-state behavior rather than a Wave 007 selector/adapter test failure; focused Wave 007 tests provide the behavioral coverage for hit semantics, grid/labels, style/visibility, and construction/controller boundaries.

### Residual risks for reviewer

- Full lint/build/e2e remain blocked by project/toolchain/spec problems that predate this validation stage: missing eslint, `vue-tsc` incompatibility with Node v24.15.0, malformed e2e specs, and unrelated frontend Vitest failures.
- Live 2D click smoke remains inconclusive because the 3D overlay intercepts pointer events at the SVG center; this may be a future UI layering/preview concern, not a Wave 007 canvas-presentation boundary regression.
- No Wave-007-attributable validation failure remains after the comment-boundary cleanup and focused Vitest pass.
