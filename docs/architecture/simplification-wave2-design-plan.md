# Simplification Wave 2 Design And Execution Plan

Date: 2026-06-04

Source review: [`simplification-wave2-review.md`](./simplification-wave2-review.md)

Objective: execute a second simplification wave focused on simple, clean architecture. Backward compatibility with old serialized operations, old tests, old component APIs, and old file names is not a constraint.

## Design Principles

1. Prefer deleting unused API over preserving symmetry.
2. Keep domain vocabulary when it names real geometry or invariants.
3. Keep presentation boundaries, but remove read-port choreography that only forwards calls.
4. Prefer small helpers over generic frameworks.
5. Keep components declarative; avoid event/pass-through chains and hidden singleton state.
6. Tests should guard behavior and durable layer boundaries, not historical class names.

## Chosen Designs

### Design 1: Dead Code And Narrow API Cleanup

Findings: W2-F01, W2-F02, W2-F03, W2-F05 partial, W2-F06 partial, W2-F07, W2-F18 partial, W2-F21, W2-F22, W2-F23, W2-F24

Design:

- Delete production files with no production importers.
- Delete tests that only preserve dead modules.
- Remove unused dependency query methods and tests.
- Remove dead operation `redo()` methods.
- Remove old operation alias support because serialized backward compatibility is not required.
- Delete `MainToolbar.vue` and obsolete tool ID exports if unused.

### Design 2: Runtime Facade Simplification

Findings: W2-F09, W2-F10, W2-F11, W2-F12, W2-F16

Design:

- `RuntimeSession` remains the private owner of `World`, `CommandStack`, and runtime change state.
- Components and app shell consume final models/actions, not read-port factories.
- Active-plane state becomes one runtime-facing object/API.
- Three presentation exposes `buildThreePresentationModel(displayOptions, selectedIds): ThreePresentationModel` rather than `getReadPorts()`.
- `ThreeView.vue` consumes a final `ThreePresentationModel`, not read ports.
- Canvas presentation exposes `buildCanvasPresentationModel(viewport, state): CanvasPresentationModel` and computes plane transforms once per model build.
- The same transform list/map is used for plane-item collection and returned in the model.
- Project persistence simplification is a separate stage: if `ProjectSessionPersistenceAdapter` is deleted, `ProjectService` calls move to the exact runtime/session methods that snapshot, validate, and restore projects.

### Design 3: Component State Ownership Cleanup

Findings: W2-F13, W2-F25, W2-F26, W2-F27, W2-F31, W2-F32

Design:

- `SvgCanvas` owns local hover state or uses a local composable, not a hidden global singleton.
- `SvgCanvas` renders each primitive exactly once from a single rendered primitive list or non-overlapping partitions.
- Canvas interaction dependencies are grouped into one concrete runtime/dependency object.
- Toolbar owns dropdown open state centrally.
- Fit-to-view has one app/runtime route.
- Elements panel renders data-driven sections instead of hard-coded repeated groups.

### Design 4: Rendering Functions Instead Of Stateless Adapter Classes

Findings: W2-F28, W2-F29, W2-F30, W2-F34

Design:

- Replace stateless scene adapter classes with pure functions.
- Keep `ThreeSceneHost` and registry/disposal ownership.
- Convert `SVGRenderer` to pure functions and remove singleton wrapper.
- Tests validate object creation/group replacement/disposal behavior, not class choreography.

### Design 5: Command And Tool Helpers

Findings: W2-F17, W2-F19, W2-F20

Design:

- Add small operation/factory helpers for result handling, output extraction, and action recording.
- Add argument spec helpers for common tool shapes.
- Do not create generic operation classes or generic tool mega-configs.

### Design 6: Defer Large Domain Aggregate Surgery

Findings: W2-F04, W2-F08, W2-F06 partial

Design:

- Do not rewrite `ProjectionPlane` wholesale in this wave.
- Do not collapse projection-plane context interfaces unless a contained implementation slice is clear.
- Record remaining aggregate simplification opportunities after completing safe cleanup.

## Execution Plan

Run every command from `/home/salva/g/ml/diedrico`.

### Stage 1: Dead API And Test Cleanup

Findings: W2-F01, W2-F02, W2-F03, W2-F05 partial, W2-F06 partial, W2-F07, W2-F18, W2-F21, W2-F22, W2-F23, W2-F24

Tasks:

1. Delete `CoordinateTransform.ts` and `transform.spec.ts` if no production imports exist.
2. Delete duplicate `Point3DRealization3D` from `Point.ts`.
3. Delete `domain/viewState/ProjectionPlane.ts`.
4. Delete unused `World.getPoint3DRealization()` if no callers.
5. Delete `createSubprocess` if unused.
6. Remove unused dependency query/service methods, including `getAllDependencies`, `getElementDependencies`, and `wouldCreateCycle`, and update tests.
7. Remove old `AddIntersectionPoint2D` registry alias and tests.
8. Move tool argument collector types from `types/` to `tools/`.
9. Delete unused `CommandTypes.ts` and `ResultTypes.ts`.
10. Remove operation-level `redo()` methods.
11. Delete `MainToolbar.vue` and obsolete `TOOL_TYPE` if unused.

Validation:

```bash
npm run build --workspace=frontend
npm run test:architecture --workspace=frontend
npm test --workspace=frontend -- tests/unit/commands/operations/operationRegistry.spec.ts tests/unit/application/appShell/ProjectService.roundTrip.spec.ts tests/unit/types/SelectionMask.spec.ts tests/unit/stores/toolStore.spec.ts tests/unit/rendering/threeView/threeViewRuntime.spec.ts
npm test --workspace=frontend
```

### Stage 2A: Runtime Minor Cleanup

Findings: W2-F14

Tasks:

1. Remove unused `CanvasToolController` tool-store dependency.
2. Update construction sites and tests.
3. Do not change runtime read-port topology in this stage.

Validation:

```bash
npm test --workspace=frontend -- tests/unit/application/canvasToolControllers.spec.ts tests/unit/tools/pointTool.spec.ts tests/unit/tools/CircleTool.spec.ts tests/unit/tools/toolValidation.spec.ts
npm run build --workspace=frontend
npm test --workspace=frontend
```

### Stage 2B: Active Plane Runtime API

Findings: W2-F10

Target API:

- `runtime.activePlaneId`
- `runtime.activePlaneName`
- `runtime.planeOptions`
- `runtime.setActivePlaneId(id)`
- `runtime.cycleActivePlane(direction)`

Tasks:

1. Remove duplicate active-plane port/use-case split if the target runtime API can replace it cleanly.
2. Update `PlaneSelector.vue`, keyboard routing, and tests to use one route.
3. Keep `World` private inside runtime/session.
4. Update architecture tests in the same stage if they lock old active-plane names.

Validation:

```bash
npm test --workspace=frontend -- tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts tests/unit/application/appShell/RuntimeReadModels.test.ts tests/unit/application/appShell/KeyboardShortcutRouter.test.ts tests/unit/components/panelToolbarBehavior.spec.ts
npm run build --workspace=frontend
npm test --workspace=frontend
```

### Stage 2C: Three Presentation Final Model API

Findings: W2-F11

Target API:

- Component-facing port exposes `buildThreePresentationModel(displayOptions, selectedIds): ThreePresentationModel`.
- Remove `getReadPorts()` from component-facing ports.
- Remove `ThreePresentationReadPorts` from component/runtime flow if no longer needed.
- `ThreeView.vue` receives or builds a final model and passes it to rendering runtime.
- `ThreeViewRuntime.refresh(model: ThreePresentationModel)` receives the final model and no longer receives read ports or selector input.
- Delete `ThreePresentationInput` / `getReadPorts()` only after `ThreeViewRuntime` consumes `ThreePresentationModel` directly.

Tasks:

1. Move read-port creation behind runtime/session model builder.
2. Keep `ThreePresentationModel` DTOs and domain-free rendering boundary.
3. Update `ThreeView.vue` and `ThreeViewRuntime` as needed.
4. Update any architecture tests that lock old read-port names in the same stage.

Validation:

```bash
npm test --workspace=frontend -- tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts tests/unit/application/threePresentation/threePresentationSelector.spec.ts tests/unit/application/threePresentation/threePresentationArchitectureBoundary.spec.ts tests/unit/rendering/threeView/threeViewRuntime.spec.ts tests/unit/components/panels/threeViewShellBoundary.spec.ts
npm run build --workspace=frontend
npm test --workspace=frontend
```

### Stage 2D: Canvas Presentation Model Builder

Findings: W2-F12

Target data flow:

- Build plane transforms once.
- Pass the transform map/list into plane-item collection.
- Return the same transforms in `CanvasPresentationModel` for rendering/query/input coordination.
- Delete or shrink `CanvasPresentationContext` only after callers no longer need it.

Target API shape:

```ts
function buildCanvasPresentationModel(
  world: World,
  viewport: CanvasViewportModel,
  state: CanvasPresentationState,
): CanvasPresentationModel

function getPlaneCanvasItems(
  plane: ProjectionPlane,
  transform: CanvasPlaneTransformModel,
  state: CanvasPresentationState,
): CanvasPlaneItem[]
```

Tasks:

1. Replace repeated transform recomputation with a single transform build per model.
2. Keep `CanvasPresentationModel` as the Vue-facing boundary.
3. Update tests for canvas selector/context behavior.

Validation:

```bash
npm test --workspace=frontend -- tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts tests/unit/application/canvasPresentation/canvasInteractionQuery.spec.ts tests/unit/components/SvgCanvas.gridLabels.spec.ts
npm run build --workspace=frontend
npm test --workspace=frontend
```

### Stage 2E: Project Session Persistence Simplification

Findings: W2-F16

Tasks:

1. Remove `ProjectSessionPersistenceAdapter` only if `ProjectService` calls can move directly to runtime/session methods without reducing test clarity.
2. If deleted, update `RuntimeSession` snapshot/validate/restore flows directly.
3. Update app-shell tests in the same stage; do not leave architecture tests expecting deleted adapter names.

Validation:

```bash
npm test --workspace=frontend -- tests/unit/application/appShell/ProjectService.roundTrip.spec.ts tests/unit/application/appShell/ProjectService.selfContainment.spec.ts tests/unit/application/appShell/ProjectService.subprocess.spec.ts tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts tests/unit/application/appShell/AppShellBoundary.test.ts tests/integration/projectService.determinism.spec.ts tests/integration/projectService.cascadeDeletion.spec.ts
npm run build --workspace=frontend
npm test --workspace=frontend
```

### Stage 3A: Canvas Interaction Dependencies And Primitive Rendering

Findings: W2-F13, W2-F25, W2-F27

Tasks:

1. Group `CanvasInteractionController` dependencies into one concrete object or direct collaborators.
2. Render canvas primitives without duplicate guide rendering.
3. Replace global hover singleton with local canvas hover state/composable.
4. Preserve hover tooltip and snap behavior.

Validation:

```bash
npm test --workspace=frontend -- tests/unit/application/canvasInteractionController.spec.ts tests/unit/components/SvgCanvas.gridLabels.spec.ts tests/unit/composables/hoverHighlight.spec.ts tests/unit/application/canvasPresentation/canvasInteractionQuery.spec.ts
npm run build --workspace=frontend
npm test --workspace=frontend
```

### Stage 3B: Toolbar And ElementsPanel Simplification

Findings: W2-F26, W2-F31, W2-F32

Tasks:

1. Pick one fit-to-view route and remove the duplicate path.
2. Make toolbar dropdown open state owned by `Toolbar.vue` with one outside-click handler.
3. Make `ElementsPanel` render data-driven groups or inline simple group rendering.

Validation:

```bash
npm test --workspace=frontend -- tests/unit/components/panelToolbarBehavior.spec.ts tests/unit/application/panelToolbarIntentControllers.spec.ts tests/unit/application/appShell/KeyboardShortcutRouter.test.ts
npm run build --workspace=frontend
npm test --workspace=frontend
```

### Stage 4A: Three Rendering Function Simplification

Findings: W2-F28, W2-F29, W2-F30

Tasks:

1. Convert stateless Three scene adapter classes to pure object factory functions.
2. Inline axis-label adapter as helper functions.
3. Simplify `ThreeViewRuntime` to compose object factories directly while keeping host/registry behavior.
4. Update tests to assert final rendered objects and group replacement, not adapter choreography.

Target exported functions:

```ts
createProjectionPlaneSceneObjects(dtos: ProjectionPlanePresentationDto[]): THREE.Object3D[]
createPlanarElementSceneObjects(dtos: PlanarElementPresentationDto[]): THREE.Object3D[]
createReconstructedElementSceneObjects(dtos: ReconstructedElementPresentationDto[]): THREE.Object3D[]
createGuideSceneObjects(dtos: GuidePresentationDto[]): THREE.Object3D[]
createHingeSceneObjects(dtos: HingePresentationDto[]): THREE.Object3D[]
```

Validation:

```bash
npm test --workspace=frontend -- tests/unit/rendering/threeView/threeSceneAdapters.spec.ts tests/unit/rendering/threeView/threeViewRuntime.spec.ts tests/unit/rendering/threeView/threeSceneHost.spec.ts tests/unit/rendering/threeView/threeObjectRegistry.spec.ts
npm run build --workspace=frontend
npm test --workspace=frontend
```

### Stage 4B: SVG Rendering Function Simplification

Findings: W2-F34

Tasks:

1. Convert `SVGRenderer` to pure functions and remove the singleton wrapper.
2. Update tests to cover the function used by `SvgCanvas`.

Target exported functions:

```ts
renderSvgPrimitive(item: CanvasRenderItem, viewport: CanvasViewportModel): RenderedCanvasPrimitive | null
transformSvgPoint(point: CanvasPoint, viewport: CanvasViewportModel): CanvasPoint
inverseTransformSvgPoint(point: CanvasPoint, viewport: CanvasViewportModel): CanvasPoint
```

Validation:

```bash
npm test --workspace=frontend -- tests/unit/rendering/svgCanvasRenderer.spec.ts tests/unit/components/SvgCanvas.gridLabels.spec.ts
npm run build --workspace=frontend
npm test --workspace=frontend
```

### Stage 5: Command/Tool Helper Cleanup

Findings: W2-F17, W2-F19, W2-F20

Tasks:

1. Add small operation result helpers where they remove repeated error-prone code.
2. Add sequence-factory helpers for output extraction and process-tree action recording.
3. Add tool argument spec helpers for two-point, line-through-point, and projection-pair patterns.
4. Keep named operations and explicit tool classes.

Validation:

```bash
npm test --workspace=frontend -- tests/unit/commands/operations/operationRegistry.spec.ts tests/unit/commands/factories/DeletionSequenceFactory.spec.ts tests/unit/commands/factories/GuideSequenceFactory.spec.ts tests/unit/commands/factories/IntersectionSequenceFactory.spec.ts tests/unit/tools/toolValidation.spec.ts tests/unit/tools/CircleTool.spec.ts tests/unit/tools/GuideTool.test.ts tests/unit/application/canvasToolControllers.spec.ts
npm run build --workspace=frontend
npm test --workspace=frontend
```

### Stage 6: Architecture Test Cleanup And Decision Record

Findings: W2-F04, W2-F08, W2-F33

Tasks:

1. Remove any remaining architecture tests that lock historical class/function names not already updated in prior stages.
2. Keep durable boundary tests: forbidden imports, domain side effects, command subclass rule if still desired.
3. Add/refresh a decision record for deferred aggregate work: `ProjectionPlane`, projection-plane contexts, process-tree tombstones, `World` registry/storage.
4. Do not rewrite `ProjectionPlane`/`World` wholesale in this stage.
5. Explicitly defer `ProjectionPlane` matrix-helper extraction and context-interface collapse unless a contained implementation slice is already complete from prior stages.

Validation:

```bash
npm run test:architecture --workspace=frontend
npm run docs:build
npm run build --workspace=frontend
npm test --workspace=frontend
```

## Commit Cadence

Commit after each stage passes validation:

1. `Remove stale APIs and tests`
2. `Simplify runtime presentation models`
3. `Simplify component interaction state`
4. `Replace stateless rendering adapters`
5. `Extract command and tool helpers`
6. `Refresh architecture tests and decisions`

## Success Criteria

1. No production files remain that are imported only by tests.
2. Components consume final models/actions rather than read-port choreography.
3. Canvas primitives render once.
4. Hidden singleton hover state is gone.
5. Stateless rendering classes are functions.
6. Tests validate behavior and durable boundaries, not historical implementation names.
7. Full validation passes.
