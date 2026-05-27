# Cycle 028 Scope Check — Canvas projection DTO selectors and realization-read context ownership

## Source-control hygiene and protected surfaces

- Broad `git_status` overflowed in this dirty worktree, so this scout used path-scoped status/diff style checks.
- Path-scoped status for Wave 028-relevant files showed pre-existing modifications in `frontend/src/domain/calculations/Intersections.ts` and `frontend/src/domain/processTree/ActionGroup.ts`, plus this stage's `.saivage/stages/cycle-028-fresh-scout-proposals/` report directory. These source modifications are unrelated to Wave 028 and were not read for conclusions, reverted, staged, or incorporated.
- Secret/config/provider/env/Drive/auth files were not read. No production source, tests, package/tooling, backend, docs/specs, persistence, command history, preview scripts, or UI feature files were modified by this design task.
- The assignment reference to `frontend/src/components/workspace/ThreeView.vue` is stale for the current tree: `frontend/src/components/panels/ThreeView.vue` exists and `frontend/src/components/workspace/ThreeView.vue` is absent.

## Wave-plan and prior-wave premises

Wave 028 is valid against current source. The reviewed wave-plan entry targets the residual seams Wave 027 intentionally left: `CanvasWorldReadPort.getAllProjectionPlanes()` and the raw projected-3D getter trio, plus public realization methods used by canvas selectors. Wave 027 explicitly deleted `CanvasWorldReadPort.getProcessTree()` but retained raw projection-plane and 3D collection seams because `CanvasPresentationSelector` and `Projected3DCanvasSelector` still owned traversal (`architecture-audit/cycle-027-runtime-read-model-extractors/implementation-log.md`, “CanvasWorldReadPort caller-map/residual evidence”). The Wave 028 plan extension and synthesized critique/review found no blocking issue with selecting this as the next central wave (`architecture-audit/cycle-028-wave-plan-extension/plan-extension-note.md`; `architecture-audit/cycle-028-wave-plan-extension/critique/round-01-critique.md`; `architecture-audit/cycle-028-wave-plan-extension/reviews/round-01-review.md`).

No plan edit is required before proposals. The current evidence supports a bounded canvas DTO selector wave, not an implementation-stage expansion into persistence, command history, backend, docs/specs, tooling, broad domain realization rewrite, or 3D scene extraction.

## Current caller inventory by seam

### `CanvasWorldReadPort` raw/public seams

`CanvasWorldReadPort` currently imports concrete domain element and projection-plane types and exposes raw domain collections plus realization methods as its public canvas contract (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:1-29`). Its implementation adapts a concrete `World`, builds a broad realization context, and forwards raw collection calls to `world.getAllProjectionPlanes()`, `world.getAll3DPoints()`, `world.getAll3DLines()`, and `world.getAll3DSegments()` (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:32-70`).

Behavior classification:

- `getAllProjectionPlanes()` is used for canvas plane transform collection and for 2D plane-owned render/query item traversal.
- `getProjectionPlane2DTransform(planeId)` is already behavior-sized for rendering/input transform DTOs and should remain or be renamed only if the selector contract becomes clearer.
- `getProjectionPlane3DRealization(planeId)` is used only for projected-3D-on-2D projection support.
- `getAll3DPoints()`, `getAll3DLines()`, and `getAll3DSegments()` are used together by projected-3D-on-2D item generation and must be deleted/retained as a group.
- `realizePoint2D`, `realizeLine2D`, `realizeCircle2D`, `realizePoint3D`, `realizeLine3D`, and `realizeSegment3D` leak realization ownership to selectors; these should move behind focused item selectors/read methods if behavior-sized DTOs replace the current loops.
- `isElementVisible(element)` remains the Wave 027 narrow visibility capability and must not regress to process-tree/world visibility access (`frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts:1-9`).

### `CanvasPresentationSelector`

`CanvasPresentationSelector.select(...)` currently:

- creates `renderItems`, `queryItems`, and `planeTransforms` (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:22-25`);
- iterates all raw projection planes once to build transform DTOs (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:27-30`);
- iterates all raw projection planes again and calls `plane.getAllPoints()`, `plane.getAllLines()`, and `plane.getAllCircles()` (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:32-84`);
- applies visibility checks and calls read-port realization methods for each entity (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:36-50`, `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:74-77`);
- classifies domain line subtypes with `instanceof` against `HalfHingeLine2D`, `Segment2DByPoints`, `SiblingGuide2D`, and `Guide2D` (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:1-3`, `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:47-63`);
- emits both render primitives and hit/query geometry, then appends projected-3D render items and grid DTOs (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:86-90`).

Behavior classification: this selector mixes presentation composition, raw domain traversal, domain classification, realization, paper-coordinate transformation, render primitive construction, query geometry construction, grid selection, and projected-3D delegation. The selected bounded scope should move raw traversal/realization/classification into focused DTO selectors while keeping final composition/grid ownership small and explicit.

### `Projected3DCanvasSelector`

`Projected3DCanvasSelector` currently loops over every raw projection plane and, for each plane, loops over every raw 3D point/line/segment, realizes the 3D element, filters infeasible realizations, projects through `threeDToPlane`, applies the plane-to-paper transform, and emits projected render primitives (`frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts:9-74`). This is the cleanest all-or-nothing deletion candidate: replace the raw plane + raw 3D collection + realization public calls with a focused projected-3D canvas DTO method/selector that returns behavior-sized source data or final projected render items.

### Runtime wiring/input seams

`RuntimeSession.canvasViewPort()` owns concrete `World` privately, creates `CanvasWorldReadPort`, creates `CanvasPresentationController`, and wires `buildPresentationModel(...)` to the read port (`frontend/src/application/appShell/RuntimeSession.ts:31-40`, `frontend/src/application/appShell/RuntimeSession.ts:52-63`). It still computes input transforms by directly iterating `this.world.getAllProjectionPlanes()` and `this.world.getProjectionPlane2DRealization(...)` (`frontend/src/application/appShell/RuntimeSession.ts:44-50`), and delegates `screenTo3D(...)` with the concrete world (`frontend/src/application/appShell/RuntimeSession.ts:71-73`).

Behavior classification: runtime transform/input support is adjacent but bounded. Wave 028 may route `getPlaneTransformsForInput()` through the same plane-transform read capability used by canvas presentation if that deletes duplicate raw plane traversal. It should not redesign tool command producers, free-point move sessions, screen-to-3D implementation, or active-plane selector ownership unless necessary to compile the selected DTO contract.

### Three presentation residuals

`ThreeWorldReadPort` already exposes named read-model methods (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:56-64`), but internally duplicates broad realization context assembly (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:66-78`) and traverses raw projection planes/2D elements/3D collections inside those named methods (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:84-134`). This confirms it is a real residual, but its public surface is already more behavior-shaped than `CanvasWorldReadPort`. Wave 028 should inventory it and may extract a tiny shared realization-context factory only if it reduces direct duplication without creating a global world facade. Broad 3D scene/read-port redesign remains out of scope.

### Properties/process/elements read-model residuals

Properties and process read-model builders still receive concrete `World` or a `{ world }` context and call realization through the world/context (`frontend/src/application/appShell/readModels/PropertiesDialogReadModel.ts:50-58`; `frontend/src/application/appShell/readModels/ProcessTreeReadModel.ts:70`). Elements panel read models also read projection planes and 3D collections (`frontend/src/application/appShell/readModels/ElementsPanelReadModel.ts:12-27`). These are outside the selected Wave 028 implementation unless a tiny shared realization-read context helper can be introduced without changing their public ownership. Reworking properties/process/elements panel read ports would reopen Wave 027-adjacent app-shell read-model scope and is deferred.

### UI/overlay/testability implications

`SvgCanvas.vue` consumes a `CanvasViewPort` and renders current `CanvasPresentationModel` primitives and query data; its comments document the intended pipeline from world/domain realizations through `CanvasPresentationSelector` to `SVGRenderer` (`frontend/src/components/workspace/SvgCanvas.vue:158-177`). `RuntimeViewPorts.CanvasViewPort` exposes `getPlaneTransformsForInput()`, `buildPresentationModel(...)`, `screenTo3D(...)`, and `getPropertiesDialogViewModel(...)` (`frontend/src/application/appShell/RuntimeViewPorts.ts:53-62`).

`ThreeView.vue` is a small shell over `ThreeViewRuntime`; its controls have `pointer-events: auto` and it consumes `ThreePresentationInjectionKey`, not concrete `World` (`frontend/src/components/panels/ThreeView.vue:27-50`, `frontend/src/components/panels/ThreeView.vue:76-99`). The current e2e contract verifies the 3D overlay has `pointer-events: auto`, owns `elementFromPoint`, and does not pass drag gestures through to the 2D canvas (`frontend/tests/e2e/current-ui-contract.spec.ts:89-117`). Wave 028 must preserve this test if any presentation/overlay-adjacent file is touched.

## Selected bounded scope for proposals

In scope for Cycle 028 proposals:

1. Replace canvas selector dependencies on raw projection-plane traversal with behavior-sized plane-item DTO/read selectors.
2. Replace projected-3D selector dependencies on raw projection-plane and raw 3D collection traversal with a behavior-sized projected-3D canvas item selector/read method, deleting the raw 3D getter trio together if implemented.
3. Localize canvas realization-read context assembly behind the adapter/selector boundary rather than exposing public `realize*` methods to presentation selectors.
4. Keep or tighten plane transform DTO ownership for rendering and input; avoid breaking `getPlaneTransformsForInput()`, active-plane/grid, hit/query, free-point move, and `screenTo3D` behavior.
5. Inventory `ThreeWorldReadPort` and optionally extract a small shared realization-context factory only if it directly prevents duplicated canvas/three context assembly and does not become a global facade.
6. Update focused canvas-presentation tests and static/architecture scans to prove raw seams are deleted or explicitly retained with a caller map.

Out of scope:

- Production implementation during this fresh-scout stage.
- Persistence schema/replay, `ProjectService`, command stack/history/producer, command-backed visibility, backend/frontend contract, Drive/auth/browser adapters, package/tooling, docs/specs, validation-platform/live-preview tooling, broad app-kernel, UI feature work, broad domain realization API redesign, 3D scene-host extraction, toolbar/history typing cleanup, and properties/process/elements panel read-model redesign.

## DELETE-list candidates

Implementation proposals should target these deletions where the selected design replaces all current callers:

- `CanvasWorldReadPort.getAllProjectionPlanes()` as a public canvas selector dependency.
- `CanvasWorldReadPort.getAll3DPoints()`, `getAll3DLines()`, and `getAll3DSegments()` together.
- Public canvas selector `realizePoint2D`, `realizeLine2D`, `realizeCircle2D`, `realizePoint3D`, `realizeLine3D`, and `realizeSegment3D` methods.
- `CanvasPresentationSelector` raw `plane.getAllPoints()`, `plane.getAllLines()`, and `plane.getAllCircles()` loops.
- `Projected3DCanvasSelector` raw nested loops over planes and 3D points/lines/segments.
- Selector-level domain `instanceof` classification seams where DTOs can provide explicit element kinds.
- Tests/mocks that assert raw getters are part of the canvas selector contract, especially current `projected3DCanvasSelector.spec.ts` mock methods (`frontend/tests/unit/application/canvasPresentation/projected3DCanvasSelector.spec.ts:12-31`).

Must remain deleted/forbidden:

- `CanvasWorldReadPort.getProcessTree()`, `Pick<World, 'getProcessTree'>`, process-tree-shaped canvas visibility, generic `RuntimeWorld` / `WorldReadModel` facades, concrete `World` injection into Vue components, broad app-kernel facades, compatibility wrappers, and dual raw-and-DTO selector paths.

## Validation requirements for implementation stage

The implementation stage must capture full stdout/stderr under `architecture-audit/cycle-028-canvas-projection-dto-selectors/validation/` and include:

1. Pre/post scoped status and static scans for all raw canvas seams, forbidden process-tree visibility regressions, generic facade names, production Vue concrete `World`, runtime transform/input wiring, `ThreeWorldReadPort` context duplication, and overlay pointer rules.
2. Focused Vitest for canvas DTO/read-port selectors, `CanvasPresentationSelector`, `Projected3DCanvasSelector`, `CanvasWorldReadPort`, `CanvasVisibilityPolicy` if touched, and `RuntimeSession` canvas wiring.
3. Focused transform/input/hit/query/active-plane/grid tests if transform ownership changes.
4. Root and frontend lint, full Vitest, build, and e2e where scripts are defined.
5. Playwright/e2e preservation of `current-ui-contract.spec.ts`, especially canvas creation, selection masks, 3D coordinate status, and overlay pointer ownership.
6. Live preview refresh on `0.0.0.0:5173`, HTTP 200 reachability, and focused live/browser smoke for representative canvas rendering/hit/hover, projected-3D display, active-plane/grid behavior, screen-to-3D coordinate support, 3D overlay interaction, visibility display, and undo/redo regression.

## Stop conditions

Stop and request a reviewed plan edit or delta proposal if:

- deleting raw canvas getters requires changing domain realization semantics, projection-plane mutation ownership, command/persistence behavior, or 3D scene adapter architecture broadly;
- the raw 3D getter trio cannot be deleted together but a proposal attempts partial deletion;
- implementation needs to alter UI features, toolbar/history, backend, docs/specs, packages/tooling, Drive/auth, preview scripts, command history, or validation infrastructure;
- the chosen selector shape mirrors `World` collections under a new name rather than behavior-sized canvas DTOs;
- unrelated dirty files become necessary to make tests pass.
