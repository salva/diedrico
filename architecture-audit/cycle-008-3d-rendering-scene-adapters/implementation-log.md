# Wave 008 Implementation Log — 3D rendering scene adapters

## Selected proposal

Implemented `proposal-restructure.md` per `decision.md`: `ThreeView.vue` is now a Vue lifecycle/composition shell over a `ThreeViewRuntime`, with domain traversal isolated in concern-split `application/threePresentation` selectors and DTO-only Three.js adapters under `rendering/threeView`.

## Source files changed

- `frontend/src/components/panels/ThreeView.vue`
  - Removed inline Three.js scene setup, projection plane rendering, 2D-on-plane rendering, reconstructed 3D rendering, guide/perpendicular-plane rendering, hinge rendering, axis/label creation, animation, resize, cleanup internals, and the `window as any.__threeViewWorldChangeHandler` bridge.
  - Now passes `{ world, displayOptions, selectedIds }` to `ThreeViewRuntime.refresh()` and delegates mount/resize/dispose.
- Added `frontend/src/application/threePresentation/`
  - `ThreePresentationModel.ts`
  - `ThreePresentationController.ts`
  - `ThreePresentationSelector.ts`
  - `ProjectionPlane3DSelector.ts`
  - `PlanarElement3DSelector.ts`
  - `ReconstructedElement3DSelector.ts`
  - `Guide3DSelector.ts`
  - `Hinge3DSelector.ts`
  - `ThreeStylePolicy.ts`
- Added `frontend/src/rendering/threeView/`
  - `ThreeViewRuntime.ts`
  - `ThreeSceneHost.ts`
  - `ThreeObjectRegistry.ts`
  - `ProjectionPlaneSceneAdapter.ts`
  - `PlanarElementSceneAdapter.ts`
  - `ReconstructedElementSceneAdapter.ts`
  - `GuideSceneAdapter.ts`
  - `HingeSceneAdapter.ts`
  - `AxisLabelSceneAdapter.ts`
- Added focused tests:
  - `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts`
  - `frontend/tests/unit/rendering/threeView/threeObjectRegistry.spec.ts`
  - `frontend/tests/unit/rendering/threeView/threeSceneAdapters.spec.ts`

## Deleted legacy surfaces

- Deleted `frontend/src/services/Element2DRenderer3D.ts`.
- Removed all `Element2DRenderer3D` imports/usages from `ThreeView.vue`.
- Static scan found no remaining `Element2DRenderer3D` references in `frontend/src` or `frontend/tests`.
- Removed repeated `scene.children.filter(...).forEach(scene.remove)` clearing patterns from `ThreeView.vue`; scene objects are replaced through `ThreeObjectRegistry` groups.
- Removed routine 3D rendering `console.log` diagnostics from the refactored ThreeView boundary.
- No compatibility shim, old-path barrel, backend/docs/tooling cleanup, Wave 009 App.vue extraction, or Wave 007 2D canvas changes were introduced.

## Validation commands and logs

Logs are under `architecture-audit/cycle-008-3d-rendering-scene-adapters/validation/`.

### Static boundary scans

- `static-threeview-boundary.stdout.log` / `.stderr.log`: clean; no forbidden low-level Three.js/CSS2D construction, scene-child clearing, raw domain traversal, guide predicates, or `realize2D(world)` / `realize3D(world)` calls remain in `ThreeView.vue`.
- `static-rendering-domain-boundary.stdout.log` / `.stderr.log`: clean; `frontend/src/rendering/threeView/**` has no domain `World` imports or `World` type usage.
- `static-application-boundary.stdout.log` / `.stderr.log`: clean; `frontend/src/application/threePresentation/**` has no Vue/Pinia/renderer class imports.
- `static-element2drenderer-deleted.stdout.log` / `.stderr.log`: confirms `frontend/src/services/Element2DRenderer3D.ts` is absent.
- `static-no-3d-console-log.stdout.log` / `.stderr.log`: clean for `ThreeView.vue`, `rendering/threeView`, and `application/threePresentation`.
- `static-deleted-imports-and-module-list.stdout.log` / `.stderr.log`: no `Element2DRenderer3D` references found; lists concern-split selector and adapter modules.

### Focused tests

- `focused-vitest-rerun.stdout.log` / `.stderr.log`
  - Command: `npm run test --workspace=frontend -- threePresentation threeObjectRegistry threeSceneAdapters`
  - Result: passed, 3 files / 5 tests.
  - Covers selector orchestration/selected-ID flow, DTO-to-Three.js adapter conversion, grouped replacement disposal, and CSS2D label element cleanup.

### Additional checks attempted

- `frontend-build-initial.stdout.log` / `.stderr.log`
  - Command: `npm run build --workspace=frontend`
  - Result: failed before project compilation in `vue-tsc` with known Node 24 / vue-tsc unsupported TypeScript extension patch error: `Search string not found: "/supportedTSExtensions = .*(?=;)/"`.
- `frontend-tsc.stdout.log` / `.stderr.log`
  - Command: `npx tsc -p frontend/tsconfig.json --noEmit`
  - Result: failed with numerous pre-existing project-wide TypeScript errors (command factories, missing toolbar icon modules, process tree types, etc.). One in-scope adapter narrowing issue identified by this run was fixed before the final focused Vitest rerun.

Full mandatory cadence, e2e, live preview refresh, and browser smoke remain for the dedicated `cycle-008-validation-and-preview-refresh` stage.

## Residual risks / follow-up candidates

- Existing project-level build/typecheck blockers still prevent `vue-tsc` and whole-project `tsc` from proving the entire frontend; logs classify the failures.
- Some domain realization classes outside Wave 008 still contain routine `console.log` / `console.error` diagnostics; not changed because Wave 008 scope is the 3D view boundary and adapters.
- Selector tests are focused on orchestration and adapter/registry behavior; deeper world-fixture tests for every geometric construction type can be expanded in the validation/correction stage if review requires more behavioral evidence.

## Round-01 implementation review corrections

The correction task addressed the review concern that the first implementation evidence did not include enough focused per-concern selector coverage, shell-boundary test coverage, or live/behavior evidence inside this implementation stage.

### Additional tests added

- Added `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`.
  - Verifies `ProjectionPlane3DSelector` emits projection-plane surface/grid DTOs plus reference-axis/label DTOs without owning scene objects.
  - Verifies `PlanarElement3DSelector` honors the 2D-on-plane display flag and lifts visible planar point DTOs through projection-plane realization.
  - Verifies `ReconstructedElement3DSelector` emits reconstructed point, line, segment, and plane DTOs and respects the show-planes display flag.
  - Verifies `Guide3DSelector` consumes selected IDs and emits selected-guide perpendicular-plane plus intersection-marker DTOs outside `ThreeView.vue`.
  - Verifies `Hinge3DSelector` emits feasible hinge-line DTOs only when planes are visible.
- Added `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`.
  - Imports `ThreeView.vue` as raw source and asserts it delegates to `ThreeViewRuntime` for mount/refresh/resize/dispose.
  - Asserts `ThreeView.vue` does not import/use low-level Three.js, CSS2D, scene child clearing, raw realization calls, guide predicates, or `Element2DRenderer3D`.

### Correction validation and live evidence

- `t3-focused-vitest-expanded.stdout.log` / `.stderr.log`
  - Command: `npm run test --workspace=frontend -- threePresentation threeViewShellBoundary threeObjectRegistry threeSceneAdapters`
  - Result: failed due to new test-fixture issues only: Node built-in import shape in the shell test and invalid guide test ID format.
- `t3-focused-vitest-expanded-rerun.stdout.log` / `.stderr.log`
  - Result: failed because the attempted patch command used unavailable `python`; source was unchanged.
- `t3-focused-vitest-expanded-rerun2.stdout.log` / `.stderr.log`
  - Result: selector concern tests passed; shell test still failed due to Node built-in import shape.
- `t3-focused-vitest-expanded-final.stdout.log` / `.stderr.log`
  - Result: selector concern tests passed; shell test still failed because static Node filesystem import was incompatible with the Vitest environment.
- `t3-focused-vitest-expanded-final2.stdout` / `.stderr.log`
  - Command: `npm run test --workspace=frontend -- threePresentation threeViewShellBoundary threeObjectRegistry threeSceneAdapters`
  - Result: passed, 5 files / 11 tests. Covers the original selector orchestration, per-concern selector DTO production, ThreeView shell boundary, scene adapters, grouped replacement disposal, and CSS2D label cleanup.
- `t3-static-boundary-scans-corrected.stdout` / `.stderr.log`
  - Result: passed. Confirms no low-level Three.js/CSS2D imports, scene child clearing, direct `realize2D(world)` / `realize3D(world)`, guide predicates, or `Element2DRenderer3D` remain in `ThreeView.vue`; `rendering/threeView` remains free of domain `World` imports; `application/threePresentation` remains free of Vue/Pinia/scene-object construction imports; `Element2DRenderer3D.ts` is absent with no source references.
- `t3-live-preview-reachability.stdout` / `.stderr.log`
  - Result: passed. Existing live preview answered `200` at `http://127.0.0.1:5173/` and returned the Diedrico app shell (`<title>Diedrico - Dihedral Learning MVP</title>`, `id="app"`, `/src/main.ts`).
- `t3-live-3d-playwright-smoke-rerun.stdout` / `.stderr.log`
  - Result: passed. Headless Chromium loaded the live app, found the app root, found one canvas after 3D navigation attempt, and found the `Show Planes`, `Show 2D Elements on Planes`, `Show Grid`, and `Show Reference Axes` 3D controls. Console output contains existing app/local-only/diagnostic messages and WebGL software-rendering warnings, but no crash blocked the 3D smoke.

### Residual status after corrections

- The missing focused selector/shell test evidence is now corrected by passing `t3-focused-vitest-expanded-final2` logs.
- Required implementation-stage live evidence is now corrected by reachability and browser-smoke logs against the running preview on port 5173.
- Full mandatory validation cadence and preview refresh still belong to `cycle-008-validation-and-preview-refresh`; this correction did not attempt unrelated Wave 009 App.vue extraction, backend/docs/tooling cleanup, or Wave 007 rendering changes.

## Manager mandatory cadence completion after review blocker

After reviewer round 01 flagged omitted mandatory command evidence, the Manager ran the missing cadence commands directly and captured stable logs under `architecture-audit/cycle-008-3d-rendering-scene-adapters/validation/`:

- `manager-mandatory-cadence-run.stdout` / `.stderr`: wrapper log for the full command batch.
- `t3-root-lint.stdout.log` / `.stderr.log`: `npm run lint` exited 127. Classification: pre-existing/tooling environment blocker; eslint is not installed/resolvable for the frontend workspace (`sh: 1: eslint: not found`).
- `t3-frontend-lint.stdout.log` / `.stderr.log`: `npm run lint --workspace=frontend` exited 127 with the same eslint-not-found blocker.
- `t3-root-test.stdout.log` / `.stderr.log`: `npm run test` exited 1. Classification: pre-existing broad suite failures outside Wave 008, including unresolved stale import `tests/integration/guide-creation.test.ts -> ../../src/commands/operations/AddFreePoint2DOp`, path built-in import shape failure in `tests/unit/architecture/noCommandSubclasses.spec.ts`, old `calculations/intersections.spec.ts` expectation failures, and old `propertiesDialog.spec.ts` event failures. Wave 008 focused tests are covered separately by the passing `t3-focused-vitest-expanded-final2` log.
- `t3-frontend-test.stdout.log` / `.stderr.log`: `npm run test --workspace=frontend` exited 1 with the same pre-existing broad suite failures.
- `t3-root-build.stdout.log` / `.stderr.log`: `npm run build` exited 1 before project compilation in `vue-tsc` with the known Node 24 / vue-tsc unsupported TypeScript-extension patch error: `Search string not found: "/supportedTSExtensions = .*(?=;)"`.
- `t3-frontend-build.stdout.log` / `.stderr.log`: `npm run build --workspace=frontend` exited 1 with the same vue-tsc/Node runtime blocker.
- `t3-frontend-e2e.stdout.log` / `.stderr.log`: `npm run test:e2e --workspace=frontend` exited 1. Classification: Playwright/e2e command was executed and failed at the existing suite level; focused browser smoke evidence for the 3D canvas/control surface is recorded separately in `t3-live-3d-playwright-smoke-rerun.stdout.log` / `.stderr.log` and passed.

These command failures are recorded as residual project/tooling risks rather than Wave 008 implementation blockers because the focused Wave 008 selector/shell/adapter/registry tests and static boundary scans pass, the live 3D smoke/reachability probes pass, and the failing broad-suite/tooling errors are outside the changed 3D presentation/adapter boundary.
