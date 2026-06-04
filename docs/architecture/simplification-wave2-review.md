# Simplification Wave 2 Review

Date: 2026-06-04

Goal: identify remaining architecture/code simplifications after the first abstraction simplification wave. Backward compatibility with old tests, old serialized command names, and old UI shapes is intentionally not a constraint. The priority is simple, clean code and architecture.

## Findings

### W2-F01 Dead CoordinateTransform Module

Severity: Medium

Evidence:

- `frontend/src/domain/calculations/CoordinateTransform.ts`
- `frontend/tests/unit/calculations/transform.spec.ts`

`CoordinateTransform.ts` is not used by production code. It defines a local tuple-style `Matrix3` and old plane/canvas/3D helpers while current production uses Three.js matrix utilities, `CanvasCoordinateConverter`, and projection-plane transforms. Keeping a second transform API creates conceptual duplication.

Fix: delete `CoordinateTransform.ts` and its tests.

### W2-F02 Duplicate `Point3DRealization3D`

Severity: Medium

Evidence:

- `frontend/src/domain/world/Point.ts`
- `frontend/src/domain/world/Element3DRealization3D.ts`

There are two `Point3DRealization3D` definitions. The active one belongs in `Element3DRealization3D.ts`; the one in `Point.ts` is misleading dead API in a mostly 2D point module.

Fix: remove the duplicate from `Point.ts`; keep 3D realizations together.

### W2-F03 Dead Domain View-State Projection Plane

Severity: Low

Evidence:

- `frontend/src/domain/viewState/ProjectionPlane.ts`

This file has no production importers and duplicates projection-plane read-model concerns. View state should live in application/presentation, not domain.

Fix: delete the file.

### W2-F04 `ProjectionPlane` Mixes Too Many Concerns

Severity: High

Evidence:

- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`

`ProjectionPlane` combines identity, element storage, element factory methods, dependency registration, realization/cache coordination, and matrix helpers. This is the largest remaining domain concentration.

Fix direction: do not rewrite the whole class in one step. First remove pure pass-through duplication and move matrix helpers to a small math module. Then move construction methods out only when operation/factory code can preserve invariants clearly.

### W2-F05 `World` Has Unused 2D-to-3D Realization Path and Duplicated Registry Patterns

Severity: Medium

Evidence:

- `frontend/src/domain/world/World.ts`

`World` still has a likely unused `getPoint3DRealization(pointId)` path distinct from active reconstructed 3D point realization, and repetitive 3D map/counter accessors.

Fix: delete unused 2D-point lift path if no callers. Do not introduce a broad generic registry unless it clearly reduces code without hiding domain vocabulary.

### W2-F06 ProcessTree Dead Export and Tombstones

Severity: Medium

Evidence:

- `frontend/src/domain/processTree/ProcessTree.ts`

`createSubprocess` is now dead after the first wave. `ActionGroup.children` still allows `null` tombstones to preserve sparse indexes for undo/redo. Backward compatibility is irrelevant, so dense child arrays may be a better future shape, but that rewrite must preserve current undo/redo invariants.

Fix: delete `createSubprocess` now. Defer tombstone removal to a separate process-tree rewrite with explicit undo/redo invariants and focused tests.

### W2-F07 Dependency Query Port Exposes Unused Methods

Severity: Medium

Evidence:

- `frontend/src/domain/world/DependencyPorts.ts`
- `frontend/src/domain/world/DependencyService.ts`
- `frontend/tests/unit/DependencyService.test.ts`

`getAllDependencies` and `getElementDependencies` appear unused by production and are exposed through dependency query/service APIs. `wouldCreateCycle` is an unused `DependencyService` method rather than part of `DependencyQueryPort`. Tests preserve at least part of this unused API.

Fix: remove unused dependency methods and update tests to cover only production behavior.

### W2-F08 ProjectionPlane Context Interface Proliferation

Severity: Medium

Evidence:

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`

This file has many tiny overlapping interfaces and a runtime capability assertion. If a realization needs collections, its type should require them directly.

Fix: consolidate to a small set of explicit context types and remove runtime capability assertions.

### W2-F09 RuntimeSession Still Creates Too Many Read Ports

Severity: High

Evidence:

- `frontend/src/application/appShell/RuntimeSession.ts`

The previous wave simplified only `CommandHistoryPort`. `RuntimeSession` still creates many anonymous port objects that forward to private runtime state.

Fix: make `RuntimeSession` the direct application runtime facade for component read models and simple use-case dependencies. Keep external/test seams only for real dependencies.

### W2-F10 Duplicate Active-Plane APIs

Severity: Medium

Evidence:

- `frontend/src/application/appShell/ActivePlaneUseCases.ts`
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
- `frontend/src/application/appShell/RuntimeSession.ts`

Active-plane state is represented through both use-case and selector ports. Both forward to the same runtime state.

Fix: collapse active-plane behavior into a single runtime API: options, active id/name, set, cycle.

### W2-F11 Three Presentation Still Has Too Many Read Ports

Severity: High

Evidence:

- `frontend/src/application/threePresentation/*ReadPort.ts`
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
- `frontend/src/components/panels/ThreeView.vue`

Three presentation still passes read ports through component/runtime layers. Components need a final `ThreePresentationModel`, not read ports.

Fix: expose `buildThreePresentationModel(displayOptions, selectedIds)` from the runtime/port and keep renderer domain-free.

### W2-F12 Canvas Presentation Context Can Be Simpler

Severity: Medium

Evidence:

- `frontend/src/application/canvasPresentation/CanvasPresentationContext.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`

The canvas context is now concrete but still recomputes plane transforms and wraps world lookups more than needed.

Fix: use one model builder that computes transforms once and produces the canvas presentation model.

### W2-F13 CanvasInteractionController Has Fragmented Local Ports

Severity: Medium

Evidence:

- `frontend/src/application/canvas/CanvasInteractionController.ts`
- `frontend/src/components/workspace/SvgCanvas.vue`

`SvgCanvas` constructs several anonymous objects only to forward local store/composable calls into `CanvasInteractionController`.

Fix: replace fragmented local ports with one concrete dependency object or pass concrete collaborators directly.

### W2-F14 CanvasToolController Has Unused ToolStore Dependency

Severity: Low

Evidence:

- `frontend/src/application/tools/CanvasToolController.ts`

The constructor accepts `toolStore`, but does not use it.

Fix: remove the dependency and update construction/tests.

### W2-F15 SelectionDeletionCommandService Has Test-Only Internals Injection

Severity: Medium

Evidence:

- `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts`

The service supports custom internals to simplify tests. Production only needs world, command stack, and notifier.

Fix: remove internals injection and test through behavior.

### W2-F16 ProjectSessionPersistencePort/Adapter Is Over-Indirected

Severity: Medium

Evidence:

- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
- `frontend/src/application/appShell/AppShellPorts.ts`
- `frontend/src/application/appShell/RuntimeSession.ts`

The adapter forwards to static `ProjectService`. The port exists as a test seam, but the indirection splits persistence orchestration too widely.

Fix: either inject `ProjectService` directly into runtime/session code or move snapshot/validate/restore onto `RuntimeSession` using `ProjectService`.

### W2-F17 Operation Boilerplate Remains

Severity: Medium

Evidence:

- `frontend/src/commands/operations/world/*.ts`

Many operations repeat success/failure wrapping, projection-plane lookup, output handling, and undo removal.

Fix: add tiny operation helpers, not a generic operation framework.

### W2-F18 Registry Descriptor Duplication and Legacy Alias

Severity: Medium

Evidence:

- `frontend/src/commands/operations/world/registerWorldOperationDescriptors.ts`
- `frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts`

Descriptor readers are duplicated and the old `AddIntersectionPoint2D` alias remains. Backward compatibility is irrelevant.

Fix: remove legacy alias and centralize descriptor readers.

### W2-F19 Sequence Factories Repeat Execute-Require-Action Pattern

Severity: Medium

Evidence:

- `frontend/src/commands/factories/*.ts`

Factories repeat `execute op`, require output ID, and add a process-tree action.

Fix: add small factory helpers for output extraction and action recording while keeping domain-specific factories explicit.

### W2-F20 Tool Argument Spec Duplication Remains

Severity: Medium

Evidence:

- `frontend/src/tools/*.ts`

Tools repeat common argument spec shapes. The first wave extracted 3D distinct-plane validation, but argument-set declarations still duplicate two-point and line-through-point patterns.

Fix: add spec helper builders, not generic tools.

### W2-F21 Global ToolArgumentCollector Types Are Overly Broad

Severity: Low

Evidence:

- `frontend/src/types/ToolArgumentCollector.ts`

These are tool-framework-local types in global `types/` and use awkward back-imports.

Fix: move them to `frontend/src/tools/ArgumentCollectorTypes.ts`.

### W2-F22 Dead General Types

Severity: Low

Evidence:

- `frontend/src/types/CommandTypes.ts`
- `frontend/src/types/ResultTypes.ts`

These appear unused after command simplification.

Fix: delete if no imports.

### W2-F23 Operation-Level `redo()` Methods Are Dead

Severity: Low

Evidence:

- process-tree operation classes

`Command.redo()` re-applies operations through `apply()`. Operation-level `redo()` methods are not part of `IOperation`.

Fix: remove operation-level `redo()` methods.

### W2-F24 MainToolbar Is Dead

Severity: Medium

Evidence:

- `frontend/src/components/toolbars/MainToolbar.vue`

The app uses `Toolbar.vue`; `MainToolbar.vue` preserves an older hard-coded toolbar model.

Fix: delete `MainToolbar.vue` and related obsolete tool identifiers.

### W2-F25 SvgCanvas Renders Guides Twice

Severity: High

Evidence:

- `frontend/src/components/workspace/SvgCanvas.vue`

`renderedLines` includes all line primitives and `renderedGuides` separately includes guide line primitives, causing duplicate rendering. It also repeats per-type render pipelines.

Fix: produce one primitive render list or partition without duplication.

### W2-F26 App/Toolbar Fit-To-View Has Two Paths

Severity: Medium

Evidence:

- `frontend/src/App.vue`
- `frontend/src/components/toolbars/Toolbar.vue`

Fit-to-view can flow through a runtime callback and through toolbar event handling.

Fix: keep one route, preferably runtime/app action for keyboard and toolbar.

### W2-F27 Hover Highlight Singleton Is Unnecessary

Severity: Medium

Evidence:

- `frontend/src/composables/useHoverHighlight.ts`
- `frontend/src/components/workspace/SvgCanvas.vue`

Only `SvgCanvas` consumes hover state. The singleton hides state ownership.

Fix: inline/localize hover state to `SvgCanvas` or use a local composable without global singleton.

### W2-F28 Three Rendering Adapters Are Stateless Classes

Severity: Medium

Evidence:

- `frontend/src/rendering/threeView/*SceneAdapter.ts`

Adapters are stateless classes with one method, plus duplicated helper code.

Fix: replace with plain factory functions and keep `ThreeSceneHost`/object registry ownership.

### W2-F29 AxisLabelSceneAdapter Is Private Helper Class

Severity: Low

Evidence:

- `frontend/src/rendering/threeView/AxisLabelSceneAdapter.ts`

Only used inside projection-plane rendering; no state.

Fix: inline as helper functions.

### W2-F30 ThreeViewRuntime Has Injection-Heavy Test Seams

Severity: Medium

Evidence:

- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`

The runtime exports many interfaces to support tests that verify adapter choreography.

Fix: test group replacement/disposal behavior and use direct object factory composition.

### W2-F31 ElementsPanel Repeats Hard-Coded Groups

Severity: Medium

Evidence:

- `frontend/src/components/panels/ElementsPanel.vue`
- `frontend/src/components/panels/ElementTypeGroup.vue`

The component repeats near-identical group blocks and event forwarding.

Fix: have the read model expose sections and render with one `v-for`, or inline simple group rendering.

### W2-F32 ToolFamilyButton Has Per-Instance Global Click Listeners

Severity: Medium

Evidence:

- `frontend/src/components/toolbars/ToolFamilyButton.vue`

Each button registers a document click listener and uses broad DOM querying.

Fix: move `openFamilyId` and one outside-click handler to `Toolbar.vue`.

### W2-F33 Architecture Tests Lock Historical Names

Severity: High

Evidence:

- `frontend/tests/unit/application/threePresentation/threePresentationArchitectureBoundary.spec.ts`
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
- `frontend/tests/unit/application/appShell/Cycle027Architecture.test.ts`
- `frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts`

Several tests check source strings, exact class/function names, and prior-cycle details rather than durable behavior.

Fix: keep only durable boundary tests and replace name-locking tests with behavior or import-boundary checks.

### W2-F34 SVGRenderer Is Stateless Class Wrapped by Stateless Adapter

Severity: Medium

Evidence:

- `frontend/src/rendering/svg/SVGRenderer.ts`
- `frontend/src/application/canvas/CanvasSvgRendering.ts`

`SVGRenderer` has no instance state and `CanvasSvgRendering` creates one singleton to call `renderPrimitive`.

Fix: convert to pure functions and test the function used by `SvgCanvas`.
