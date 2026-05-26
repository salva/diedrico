# Wave 008 Scope Check — 3D rendering scene adapters

## Stage and source-control guard

- Stage: `cycle-008-fresh-scout-proposals`.
- Wave entry checked: Wave 008 in `architecture-audit/wave-plan.md`.
- Source-code change policy for this stage: **no application/source/test implementation changes**. This stage only creates scout/proposal artifacts.
- Secret-safety note: this check used source files, baseline/wave artifacts, package scripts, and test filenames only; it did not read `.saivage/saivage.json`, auth profiles, env files, provider configs, OAuth/Drive credentials, or shell history.

## Wave 008 premise verdict

**Verdict: Wave 008 can proceed without editing `wave-plan.md`.**

The current tree still matches Wave 008's central premise: `ThreeView.vue` is a large 3D rendering god component, and `Element2DRenderer3D.ts` is a service-shaped raw scene renderer that still reaches directly into `World`, projection planes, realizations, visibility policy, and Three.js object construction. Wave 007 changed the 2D rendering path by adding a selector/read-model boundary, but it intentionally did not touch `ThreeView.vue`, `Element2DRenderer3D.ts`, or 3D scene adapters. That means Wave 008 remains the next central rendering-boundary cleanup after 2D selector extraction.

No plan edit is needed because the wave's target outcome remains exactly right: make `ThreeView.vue` a lifecycle/composition shell over focused scene adapters/selectors, isolating scene setup, projection-plane meshes, labels, guide/hinge geometry, domain-to-view conversion, and 2D-on-plane / reconstructed-3D object rendering.

## Evidence from current `ThreeView.vue`

`ThreeView.vue` still combines Vue lifecycle, Pinia store reads, raw domain traversal, Three.js scene creation, geometry construction, labels, animation, resizing, and cleanup in one file.

- Vue/store/domain wiring is embedded in the component: it imports Vue lifecycle/watch/inject, Three.js, OrbitControls, CSS2DRenderer/CSS2DObject, domain `World`, `ProjectionPlane`, `AuxiliaryProjectionPlane`, `Plane3DRealization3D`, rendering config, both `viewStore` and `selectionStore`, domain guide predicates, grid utilities, and coordinate utilities in one script block (`frontend/src/components/panels/ThreeView.vue:35-77`).
- Component-level state owns the Three.js infrastructure directly: `scene`, `camera`, `renderer`, `labelRenderer`, `controls`, `element2DRenderer`, and `animationFrameId` are module variables (`frontend/src/components/panels/ThreeView.vue:107-117`).
- Store access remains: `useViewStore()` drives `displayOptions`, and `useSelectionStore()` drives guide perpendicular-plane rendering (`frontend/src/components/panels/ThreeView.vue:121-128`). This is not the old deleted geometry store, but it is still UI/store coupling inside the scene renderer.
- Scene setup is inline: `initThreeScene()` constructs the scene, camera, renderer, CSS2D renderer, OrbitControls, ambient/directional lights, `Element2DRenderer3D`, initial render calls, axes, and animation loop (`frontend/src/components/panels/ThreeView.vue:138-216`).
- Projection-plane grid construction is inline and domain-coupled: `renderProjectionPlanes()` clears scene children by `userData.type`, iterates `world.projectionPlanes`, fetches projection-plane and 3D-plane realizations, computes matrix basis/origin values, clips grids, transforms grid segment vertices, builds `BufferGeometry`, `Float32BufferAttribute`, `LineBasicMaterial`, and `LineSegments`, and optionally renders auxiliary axes (`frontend/src/components/panels/ThreeView.vue:239-373`).
- Fallback grid creation is inline (`frontend/src/components/panels/ThreeView.vue:84-105`) even though grid/read-model style responsibilities now have precedent in Wave 007's canvas selectors.
- 2D-on-plane rendering is delegated only to the raw `Element2DRenderer3D` service; the component still passes the full `world` and display options (`frontend/src/components/panels/ThreeView.vue:379-387`).
- Reconstructed 3D element rendering is inline: `render3DElements()` removes prior scene objects, reads all 3D points/lines/segments/planes from `World`, fetches realizations, converts domain coordinates to Three.js, creates sphere/line/plane geometry/materials/meshes, assigns `userData`, and adds them to the scene (`frontend/src/components/panels/ThreeView.vue:394-598`).
- Guide perpendicular-plane behavior is inline: selected IDs are read from `selectionStore`, domain guides are looked up via `world.getLine2D`, guide 2D realizations are computed, plane normals are derived from matrices, perpendicular plane meshes are created, and intersections are rendered (`frontend/src/components/panels/ThreeView.vue:611-707`).
- Guide intersection markers are inline and separately traverse all 3D points, lines, and segments (`frontend/src/components/panels/ThreeView.vue:716-767`).
- Hinge lines are inline and noisy: `renderHingeLines()` logs to console, reads `world.getAllHingeLines()`, calls `hingeLine.realize3D(world)`, constructs dashed `THREE.Line` geometry/material, and tags scene objects (`frontend/src/components/panels/ThreeView.vue:775-838`). The two `console.log` statements at lines 778 and 787 should be deleted during implementation, not wrapped.
- Reference axes, auxiliary axes, and labels are inline DOM/Three.js creation helpers (`frontend/src/components/panels/ThreeView.vue:857-957`, `frontend/src/components/panels/ThreeView.vue:967-1024`).
- Lifecycle and refresh orchestration are inline: display-option changes call all render functions (`frontend/src/components/panels/ThreeView.vue:1029-1035`), animation and resize are owned in the component (`frontend/src/components/panels/ThreeView.vue:1040-1062`), cleanup disposes controls/renderer/2D renderer (`frontend/src/components/panels/ThreeView.vue:1067-1087`), and mount hooks subscribe to `World` changes, watch selection/options, and store a handler on `window as any` (`frontend/src/components/panels/ThreeView.vue:1090-1154`).

## Evidence from `Element2DRenderer3D.ts`

`Element2DRenderer3D` is not yet the desired scene-adapter boundary. It mixes selection of domain elements, visibility policy, 2D realization, domain-to-Three conversion, style fallback, geometry/material creation, scene mutation, and object cache cleanup.

- The service imports raw `World`, `Element2D`, projection-plane and element domain types, `ThreeViewDisplayOptions`, coordinate utilities, and domain `resolveVisibility` (`frontend/src/services/Element2DRenderer3D.ts:21-29`).
- `renderElements()` takes the whole `World`, clears the scene cache, leaves `activePlaneId` as a TODO, iterates `world.projectionPlanes`, and delegates per plane (`frontend/src/services/Element2DRenderer3D.ts:60-77`).
- `renderPlaneElements()` walks plane-owned points, lines, and circles, calls `resolveVisibility(element, world)`, calls `line.realize2D(world)`, branches bounded vs infinite, and dispatches render methods (`frontend/src/services/Element2DRenderer3D.ts:83-112`). This is the same read-selection concern Wave 007 moved out of the 2D renderer path.
- Point, line, segment, and circle rendering all call element `realize2D(world)`, transform points via a private `transform2DTo3D`, construct Three.js geometries/materials, add objects to `scene`, and cache by element ID (`frontend/src/services/Element2DRenderer3D.ts:118-321`).
- Infinite lines still have a local clipping TODO and hard-coded `1000` extents (`frontend/src/services/Element2DRenderer3D.ts:172-178`).
- `transform2DTo3D()` reaches back into `World` for projection-plane 3D realization and computes z-fighting offsets from matrix axes (`frontend/src/services/Element2DRenderer3D.ts:336-378`).
- `resolveVisualStyle()` is a local placeholder with a TODO and default blue style rather than consuming explicit selector DTO styles (`frontend/src/services/Element2DRenderer3D.ts:384-402`).
- `updateVisibility()` remains available but has no current evidence of being the primary visibility path; implementation proposals should delete it if extraction makes it unused (`frontend/src/services/Element2DRenderer3D.ts:407-415`).
- `clear()` owns scene removal and WebGL resource disposal for cached objects (`frontend/src/services/Element2DRenderer3D.ts:419-443`), a valid adapter concern but currently co-located with raw domain traversal.

## Evidence from `rendering3D.ts`

`rendering3D.ts` is already a small rendering-config module and should remain a config boundary rather than a domain or adapter god-module.

- It defines `PLANE_RENDERING_CONFIG` with clipping/mesh extents and fallback grid settings (`frontend/src/config/rendering3D.ts:16-55`).
- It exposes `getPlaneBoundaries()` and `getPlaneMeshSize()` as rendering helpers (`frontend/src/config/rendering3D.ts:62-83`).
- The current implementation has per-plane extension comments but no actual per-plane behavior (`frontend/src/config/rendering3D.ts:62-83`); Wave 008 should not add compatibility shims for hypothetical per-plane configs unless demanded by extracted adapter tests.

## Domain realization access relevant to 3D rendering

The 3D rendering path uses domain realization APIs that should be consumed behind a selector/read-model boundary, not directly throughout a Vue component.

- Projection-plane 3D realization lookup lives on `World.getProjectionPlane3DRealization()` (`frontend/src/domain/world/World.ts:588`).
- Reconstructed 3D collections live on `World.getAllPlanes()`, `World.getAllHingeLines()`, `World.getAll3DPoints()`, `World.getAll3DLines()`, and `World.getAll3DSegments()` (`frontend/src/domain/world/World.ts:884`, `frontend/src/domain/world/World.ts:916`, `frontend/src/domain/world/World.ts:1105`, `frontend/src/domain/world/World.ts:1138`, `frontend/src/domain/world/World.ts:1171`).
- Realization lookups live on `World.get3DPlane()`, `World.get3DPointRealization()`, `World.get3DLineRealization()`, `World.get3DSegmentRealization()`, and `World.get3DPlaneRealization()` (`frontend/src/domain/world/World.ts:1187`, `frontend/src/domain/world/World.ts:1221`, `frontend/src/domain/world/World.ts:1240`, `frontend/src/domain/world/World.ts:1259`, `frontend/src/domain/world/World.ts:1278`).
- Hinge lines and guide/domain elements also call back into projection-plane realization APIs internally, which reinforces that the selector boundary must be careful not to move domain algorithms into scene adapters (`frontend/src/domain/world/HingeLine.ts:173`, `frontend/src/domain/world/HingeLine.ts:193`, `frontend/src/domain/world/Guide.ts:320-321`).

## Wave 007 impact and reusable pattern

Wave 007 completed a 2D presentation boundary rather than a 3D boundary. The implementation log says it added `frontend/src/application/canvasPresentation/` DTOs/selectors/style/visibility/grid/query/controller, deleted `RenderService.ts` and `PaperService.ts`, and intentionally did not refactor `ThreeView.vue` or 3D scene adapters (`architecture-audit/cycle-007-2d-rendering-selectors-adapters/implementation-log.md`).

Current code confirms the reusable pattern:

- `CanvasPresentationModel.ts` defines explicit render/query/grid/plane-transform DTOs (`frontend/src/application/canvasPresentation/CanvasPresentationModel.ts:4-106`).
- `CanvasPresentationSelector.select()` is the one raw-domain traversal boundary for 2D canvas rendering, iterating projection planes, realizations, points, lines, circles, and projected 3D elements before returning DTOs (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:13-72`, `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:77-87`).
- `CanvasPresentationController` is a thin Vue-facing facade over the selector (`frontend/src/application/canvasPresentation/CanvasPresentationController.ts:5-9`).

Wave 008 should share this selector/read-model pattern where appropriate, but **must not reopen Wave 007's 2D implementation scope**. The 3D selector can reuse style/visibility concepts or common small policies, but should not reintroduce `PaperService`, `RenderService`, `Paper.hitTest`, 2D canvas grid generation, or direct canvas rendering changes.

## Existing test and validation surface

Existing focused 3D-adjacent unit coverage is mostly domain/math, not scene-adapter coverage:

- Domain 3D reconstruction tests exist for line, plane, point, and segment realization (`frontend/tests/unit/domain/Line3DReconstruction.test.ts`, `frontend/tests/unit/domain/Plane3DFromTraces.test.ts`, `frontend/tests/unit/domain/Point3DReconstruction.test.ts`, `frontend/tests/unit/domain/segment3DRealization.spec.ts`).
- Three.js coordinate utility coverage exists in `frontend/tests/unit/utils/threeUtils.spec.ts`.
- There are no current unit-test files matching `ThreeView` or `Element2DRenderer3D` by filename in `frontend/tests/`.
- E2e tests exist for construction, guides, intersections, HHL intersections, active plane, parametric update, selection, undo/redo, and navigation (`frontend/tests/e2e/*.spec.ts`), but no dedicated `three-view` e2e spec is evident from filenames.
- Root scripts delegate lint/test/build to frontend only: `package.json:11-20`; frontend defines `build`, `test`, `test:e2e`, and `lint` scripts (`frontend/package.json:6-15`). Wave 007 validation classified full lint/build/e2e blockers as existing tooling/spec issues; Wave 008 implementation validation must still run the mandatory cadence and capture logs.

## Remaining-wave re-rank after Wave 007

No premise invalidation was found for Wave 008. After Wave 007, rendering centrality now points to the 3D path as the next rendering god-module cleanup before broader app shell extraction.

1. **Wave 008 — Extract 3D rendering scene adapters from `ThreeView.vue`**: still central and unimplemented; should proceed now.
2. **Wave 009 — Extract application shell services from `App.vue`**: remains next after rendering boundaries are stable, especially because preview/startup and active-plane coordination interact with both canvases.
3. **Wave 010 — Resolve backend/frontend project-contract architecture**: still depends on persistence/app-shell stance.
4. **Wave 011 — Tighten architecture tests and root validation gates**: should freeze cleaned boundaries after structural waves.
5. **Wave 012 — Remove placeholders/debug surfaces**: still later cleanup; however, Wave 008 should delete 3D debug `console.log` lines in its own scope.
6. **Wave 013 — Reconcile docs/specs**: still last.

## Scope boundary for Wave 008 proposals

In scope:

- `frontend/src/components/panels/ThreeView.vue` lifecycle/composition shell extraction.
- `frontend/src/services/Element2DRenderer3D.ts` replacement or relocation into adapter/renderer modules.
- `frontend/src/config/rendering3D.ts` as shared rendering config.
- New 3D presentation selector/read-model DTO modules under an application/presentation boundary.
- New Three.js scene adapter modules for scene setup, object grouping/clearing/disposal, projection-plane grid/mesh, axes/labels, 2D-on-plane elements, reconstructed 3D elements, guide perpendicular planes/intersections, and hinge lines.
- Focused unit tests for selector DTO production and adapter object creation using Three.js objects without mounting the whole Vue component where practical.
- E2e/live preview checks that exercise the visible 3D canvas and representative 3D rendering behavior.

Out of scope:

- Reopening the Wave 007 2D canvas selector/adapter implementation except to consume/share small style/visibility/read-model policies.
- Changing command/tool/controller behavior.
- Changing persistence, backend contracts, or app-shell project lifecycle.
- Reading or modifying secret/provider/env configuration.
