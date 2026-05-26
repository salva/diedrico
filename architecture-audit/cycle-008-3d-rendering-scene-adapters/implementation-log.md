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
