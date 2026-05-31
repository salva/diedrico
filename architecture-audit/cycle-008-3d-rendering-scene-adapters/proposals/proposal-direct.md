# Proposal Direct — Extract focused 3D scene adapters from `ThreeView.vue`

## Summary

Round-01 correction: the extraction is implementation-ready only if selected IDs enter the `threePresentation` boundary as plain input and all selected-guide/perpendicular-plane DTO production, domain lookup, and scene-object construction are outside `ThreeView.vue`. The read-model side must remain concern-split across projection planes, planar 2D-on-3D elements, reconstructed 3D elements, guides, and hinge/axis geometry; `ThreePresentationSelector.ts` is only an orchestrator, not a replacement god selector. The scene side must validate grouped object replacement, CSS2D label cleanup/replacement, and removal of repeated `scene.children` clearing patterns from `ThreeView.vue`.

Implement Wave 008 as a direct extraction of the existing 3D rendering behavior into focused 3D presentation and Three.js adapter modules. `ThreeView.vue` becomes a Vue lifecycle/composition shell: it owns refs, watchers, injected `World`, display/selection state, and calls a `ThreeViewController`/scene facade. All low-level Three.js object creation and all domain-to-view conversion move out of the component. `ThreeView.vue` may read UI stores for display options and selected IDs, but selected IDs must cross into the `threePresentation` input and guide/perpendicular-plane DTO production plus scene-object construction must live outside the component.

This proposal preserves the current behavior and visual semantics while deleting large inline helpers from the component. It is intentionally smaller than the restructure option: the 3D selector is introduced, but only for the current scene needs; it does not attempt to generalize a cross-2D/3D presentation package.

## Current evidence addressed

- `ThreeView.vue` currently owns scene/camera/renderer/label renderer/controls variables and inline setup (`frontend/src/components/panels/ThreeView.vue:107-216`).
- Projection-plane grid and auxiliary axes logic are inline and raw-domain-coupled (`frontend/src/components/panels/ThreeView.vue:239-373`, `frontend/src/components/panels/ThreeView.vue:915-957`).
- Reconstructed 3D points/lines/segments/planes are inline scene-object construction (`frontend/src/components/panels/ThreeView.vue:394-598`).
- Guide perpendicular plane and intersection rendering are inline selection/domain/scene logic (`frontend/src/components/panels/ThreeView.vue:611-767`).
- Hinge rendering is inline and contains debug `console.log` statements (`frontend/src/components/panels/ThreeView.vue:775-838`).
- `Element2DRenderer3D` mixes raw domain traversal, visibility, realization, style TODOs, conversion, geometry creation, scene mutation, cache cleanup, and an unused visibility update path (`frontend/src/services/Element2DRenderer3D.ts:60-77`, `frontend/src/services/Element2DRenderer3D.ts:83-112`, `frontend/src/services/Element2DRenderer3D.ts:118-443`).
- Rendering constants already live in `rendering3D.ts` and should be consumed by extracted modules (`frontend/src/config/rendering3D.ts:16-83`).

## Target outcome

- `ThreeView.vue` is reduced to:
  - template/control checkboxes and styles,
  - refs for container/canvas,
  - injected `World`, view options, selected IDs,
  - lifecycle mount/unmount and watchers,
  - calls to a controller/facade such as `threeViewController.mount(...)`, `refresh(...)`, `resize()`, and `dispose()`.
- Raw Three.js scene setup, projection-plane grids, 2D-on-plane elements, reconstructed 3D elements, hinge lines, guide perpendicular-plane/intersections, labels, axes, cleanup/disposal, and domain-to-view conversion are isolated in focused modules.
- The new selector/read-model boundary mirrors Wave 007's pattern without touching the 2D canvas path. It is not a single replacement god selector: projection planes, planar 2D-on-3D elements, reconstructed 3D elements, guides, and hinge/axis geometry are separate selector/read-model concerns, even if a thin controller orchestrates them.

## Non-negotiable shell and selector boundaries

- `ThreeView.vue` may keep Vue lifecycle, template controls, local refs, injected `World`, display-state reads, selection-state reads, and calls into a runtime/controller.
- `ThreeView.vue` must not perform direct selected-element domain lookup, guide/perpendicular-plane geometry derivation, domain realization traversal, or raw Three.js object construction.
- Selected IDs flow into the `threePresentation` boundary as plain input (`selectedIds` or equivalent). The boundary returns guide/perpendicular-plane DTOs, guide intersection DTOs, hinge DTOs, and other scene DTOs.
- Scene-object construction for projection planes, planar elements, reconstructed elements, guides, hinges, axes, and CSS2D labels lives only in `frontend/src/rendering/threeView/` adapters/host modules.
- The implementation must split read-model construction by concern: projection planes, planar 2D-on-3D elements, reconstructed 3D elements, guides, and hinge/axis geometry each get a focused selector/read-model module or equivalent focused internal module. A monolithic `ThreePresentationSelector` that absorbs all current `ThreeView.vue` and `Element2DRenderer3D` traversal is explicitly rejected.

## Files to change

### Component shell

- `frontend/src/components/panels/ThreeView.vue`
  - Delete inline helper functions and scene variables.
  - Keep the controls/template and lifecycle/watch coordination.
  - Replace direct render calls with calls into the new 3D controller.
  - Replace `window as any.__threeViewWorldChangeHandler` with a local unsubscribe closure held in component scope.

### 3D presentation/read-model modules to add

Suggested location: `frontend/src/application/threePresentation/`.

- `ThreePresentationModel.ts`
  - DTOs for projection-plane grids, auxiliary axes, reference axes, hinge lines, 2D-on-plane elements, reconstructed 3D points/lines/segments/planes, guide perpendicular planes, guide intersection markers, labels, display options, and object group names.
- `ThreePresentationSelector.ts`
  - Thin orchestrator for concern-specific selectors; it must not become the one large replacement god module.
  - Accepts `World`, display options, and selected IDs as input, then delegates to the focused selectors below.
  - Produces DTOs; does not import Vue or mutate Three.js `Scene`.
- `ProjectionPlane3DSelector.ts`
  - Produces projection-plane surface/grid, reference-axis, auxiliary-axis, and axis-label DTOs.
- `PlanarElement3DSelector.ts`
  - Replaces `Element2DRenderer3D` raw `World` traversal with planar 2D-on-3D DTO production for points, lines, segments, and circles.
- `ReconstructedElement3DSelector.ts`
  - Produces reconstructed 3D point/line/segment/plane DTOs from domain realizations.
- `Guide3DSelector.ts`
  - Receives selected IDs through the presentation input, performs selected-guide lookup and perpendicular-plane/intersection DTO derivation, and returns DTOs only.
- `HingeAxis3DSelector.ts`
  - Produces hinge-line, reference-axis, and auxiliary-axis DTOs if axis concerns are not kept with projection-plane selection.
- `ThreeDisplayStylePolicy.ts`
  - Centralize colors, opacity, tube radii, point radii, line extent constants, guide highlight colors, reference-axis colors, z-fighting offset, and visibility/style mapping for 3D DTOs.
  - May import/reuse existing 2D visibility policy or domain `resolveVisibility` only inside selector/policy, not adapters.
- `ThreePresentationController.ts`
  - Thin facade matching Wave 007's `CanvasPresentationController`: `buildModel(world, displayOptions, selectedIds)`.

### Three.js scene adapter modules to add

Suggested location: `frontend/src/rendering/threeView/` or `frontend/src/adapters/threeView/`.

- `ThreeSceneHost.ts`
  - Owns `THREE.Scene`, `PerspectiveCamera`, `WebGLRenderer`, `CSS2DRenderer`, `OrbitControls`, lights, animation loop, resize, and disposal.
- `ThreeSceneObjectRegistry.ts`
  - Owns grouped object replacement, `userData.type` normalization, CSS2D label ownership, and geometry/material/label disposal.
  - Replaces repeated `scene.children.filter(...).forEach(scene.remove)` patterns with atomic group replacement.
  - Provides focused tests proving old group objects and CSS2D labels are removed/replaced and disposed when a group refreshes.
- `ProjectionPlaneSceneAdapter.ts`
  - Converts projection-plane grid/mesh/auxiliary-axis DTOs into `BufferGeometry`, `LineSegments`, `ArrowHelper`, and CSS labels.
- `ThreeElementSceneAdapter.ts`
  - Converts reconstructed 3D point/line/segment/plane DTOs into meshes/lines.
- `PlanarElementSceneAdapter.ts`
  - Replacement for `Element2DRenderer3D`; consumes 2D-on-plane DTOs and creates point/line/segment/circle objects.
- `GuideSceneAdapter.ts`
  - Renders guide perpendicular plane DTOs and guide intersection marker DTOs.
- `HingeSceneAdapter.ts`
  - Renders hinge-line DTOs with dashed line materials.
- `LabelSceneAdapter.ts` if label creation is not kept inside `ProjectionPlaneSceneAdapter` / `ThreeSceneHost`; whichever module owns labels must also own replacement cleanup for CSS2D DOM elements/objects.

### Existing support modules

- `frontend/src/services/Element2DRenderer3D.ts`
  - Delete after replacement by `PlanarElementSceneAdapter`, or reduce to a thin re-export only if all call sites are migrated in the same commit. Preference: delete the file and update imports.
- `frontend/src/config/rendering3D.ts`
  - Keep as config. Add only missing constants if needed by DTO/style policy; do not add per-plane compatibility shims.
- `frontend/src/utils/threeUtils.ts`, `frontend/src/utils/rectangleGrid.ts`
  - Consume existing helpers. Only change if extraction reveals a tiny pure helper belongs there; otherwise leave untouched.

### Tests to add/update

- Add focused selector tests under `frontend/tests/unit/application/threePresentation/`, e.g.:
  - `threePresentationSelector.projectionPlanes.spec.ts`
  - `threePresentationSelector.elements.spec.ts`
  - `threePresentationSelector.guidesHinges.spec.ts`
- Add focused adapter tests under `frontend/tests/unit/rendering/threeView/`, e.g.:
  - `threeSceneObjectRegistry.spec.ts`
  - `projectionPlaneSceneAdapter.spec.ts`
  - `planarElementSceneAdapter.spec.ts`
  - `threeElementSceneAdapter.spec.ts`
  - `guideAndHingeSceneAdapters.spec.ts`
- Add or update a Vue shell test under `frontend/tests/unit/components/` only to verify mount calls controller methods and responds to display/selection/world changes without asserting geometry internals.
- Add or update e2e/live smoke coverage for the 3D canvas if feasible; if existing malformed specs still block global e2e, capture and classify as in Wave 007 validation.

## Files/tests/docs/fixtures to DELETE

Aggressive delete list for this direct implementation:

- Delete inline helper functions from `ThreeView.vue` after extraction; do not leave forwarding wrappers that still derive geometry, perform selected-element lookup, or construct Three.js/CSS2D objects:
  - `generateFallbackGrid()` (`frontend/src/components/panels/ThreeView.vue:84-105`).
  - `initThreeScene()` scene setup body (`frontend/src/components/panels/ThreeView.vue:138-216`) except shell call delegation.
  - `compute3DPlaneRectangleCorners()` if it remains a one-line wrapper (`frontend/src/components/panels/ThreeView.vue:229-231`).
  - `renderProjectionPlanes()` (`frontend/src/components/panels/ThreeView.vue:239-373`).
  - `render2DElements()` (`frontend/src/components/panels/ThreeView.vue:379-387`).
  - `render3DElements()` (`frontend/src/components/panels/ThreeView.vue:394-598`).
  - `renderGuidePerpendicularPlane()` and `renderGuideIntersections()` (`frontend/src/components/panels/ThreeView.vue:611-767`).
  - `renderHingeLines()` (`frontend/src/components/panels/ThreeView.vue:775-838`).
  - `renderReferenceAxes()`, `renderAuxiliaryPlaneAxes()`, `createAxisLabel()`, and `createAuxiliaryAxisLabel()` (`frontend/src/components/panels/ThreeView.vue:857-1024`).
  - Inline `animate()`, `handleResize()`, and `cleanup()` implementations once delegated to `ThreeSceneHost` (`frontend/src/components/panels/ThreeView.vue:1040-1087`).
- Delete `console.log` debug statements in hinge rendering rather than moving them (`frontend/src/components/panels/ThreeView.vue:778`, `frontend/src/components/panels/ThreeView.vue:787`).
- Delete `window as any.__threeViewWorldChangeHandler` storage (`frontend/src/components/panels/ThreeView.vue:1143-1151`).
- Delete `frontend/src/services/Element2DRenderer3D.ts` after its responsibilities are replaced by selector DTOs + `PlanarElementSceneAdapter`.
- Delete `Element2DRenderer3D.updateVisibility()` if no longer used (`frontend/src/services/Element2DRenderer3D.ts:407-415`).
- Delete local placeholder style/TODO paths in `Element2DRenderer3D.resolveVisualStyle()` and infinite-line clipping TODO in `renderLine()` by replacing them with explicit DTO style/extents (`frontend/src/services/Element2DRenderer3D.ts:172-178`, `frontend/src/services/Element2DRenderer3D.ts:384-402`).
- Delete any new compatibility re-export or shim created during extraction before the wave is complete.
- Delete obsolete tests that assert `Element2DRenderer3D` raw-World traversal if any are discovered; replace with selector/adapter tests.

## Expected behavior change

Intended user-visible behavior: **none**, except removal of routine debug console output from hinge rendering.

The 3D view should still render:

- projection-plane grids and surfaces according to display options,
- reference axes and auxiliary plane axes/labels,
- hinge lines,
- guide perpendicular planes and intersection highlights when guides are selected,
- 2D point/line/segment/circle geometry positioned on projection planes,
- reconstructed 3D points, lines, segments, and planes,
- resize and orbit-control animation behavior.

## Validation plan

Minimum mandatory cadence with stable logs under `architecture-audit/cycle-008-3d-rendering-scene-adapters/validation/`:

1. Static scans before/after implementation:
   - no `Element2DRenderer3D` import remains if file is deleted,
   - no `new THREE.*`, `scene.children.filter`, `userData.type` scene clearing, `world.projectionPlanes`, `getAll3D*`, `getAllHingeLines`, `realize2D(world)`, or `realize3D(world)` remain in `ThreeView.vue` except allowed shell/controller wiring,
   - no `console.log` remains in 3D rendering code.
2. Root lint: `npm run lint`.
3. Frontend lint: `npm run lint --workspace=frontend`.
4. Focused Vitest:
   - `npm run test --workspace=frontend -- --run frontend/tests/unit/application/threePresentation/... frontend/tests/unit/rendering/threeView/...` adjusted to real paths.
   - Include existing 3D/domain utility tests: `frontend/tests/unit/domain/Line3DReconstruction.test.ts`, `frontend/tests/unit/domain/Plane3DFromTraces.test.ts`, `frontend/tests/unit/domain/Point3DReconstruction.test.ts`, `frontend/tests/unit/domain/segment3DRealization.spec.ts`, `frontend/tests/unit/utils/threeUtils.spec.ts`.
5. Full root Vitest: `npm run test`.
6. Full frontend Vitest: `npm run test --workspace=frontend`.
7. Root build: `npm run build`.
8. Frontend build: `npm run build --workspace=frontend`.
9. E2e/Playwright: `npm run test:e2e --workspace=frontend`, or classify known malformed e2e blockers with exact logs if still present.
10. Live preview refresh:
    - restart/refresh Vite bound to `0.0.0.0`,
    - `curl http://127.0.0.1:5173/` returns HTTP 200,
    - browser smoke confirms `canvas.three-canvas` mounts and representative 3D objects exist after creating/selecting geometry or loading default projection-plane state.

Representative focused assertions:

- `ThreeView.vue` shell-boundary scan proves it no longer imports domain projection/guide/hinge types for geometry derivation, no longer performs selected-element domain lookup, and no longer constructs `THREE.*`/`CSS2DObject` objects; it only passes display options, injected `World`, and selected IDs into the runtime/controller.
- Selector emits projection-plane grid/surface, reference-axis, auxiliary-axis, and label DTOs for P_H/P_V and auxiliary planes with clipped/fallback behavior.
- Selector emits hinge-line DTOs from `world.getAllHingeLines()` and skips infeasible hinge realizations.
- Selector emits 2D-on-plane DTOs for visible points, lines, segments, and circles with explicit style and z-fighting offset metadata.
- Selector emits reconstructed 3D element DTOs for feasible points, lines, segments, and planes.
- Guide selector receives selected IDs from the presentation input and emits perpendicular-plane DTOs plus intersection-marker DTOs for selected guides; `ThreeView.vue` contains no guide-plane math.
- Adapter tests cover projection-plane meshes, labels, guide/hinge geometry, planar element objects, reconstructed element objects, and domain-to-view conversion through DTOs rather than raw domain objects.
- Object-registry/adapter tests prove grouped scene-object replacement disposes old geometries/materials and removes/replaces CSS2D labels; no repeated `scene.children.filter(...).forEach(scene.remove)` clearing pattern remains in `ThreeView.vue`.
- `ThreeView.vue` shell calls controller refresh on world/display/selection changes and resize/dispose on lifecycle.

## Risks and mitigations

- **Risk: selector becomes a second god-module.** Mitigation: make the concern split mandatory: projection planes, planar 2D-on-3D elements, reconstructed 3D elements, guides, and hinge/axis geometry are separate selector modules or focused internal modules with tests per concern.
- **Risk: adapter tests couple to exact Three.js internals.** Mitigation: assert object class/group/userData/material essentials and disposal behavior, not renderer pixel output.
- **Risk: behavior changes in line clipping/styles.** Mitigation: encode current hard-coded extents/styles as explicit constants first, then improve only if reviewed.
- **Risk: guide/hinge math accidentally moves from domain to adapters.** Mitigation: selectors may call domain realizations, but adapters consume DTO geometry only.
- **Risk: e2e remains blocked by pre-existing malformed specs/tooling.** Mitigation: still run mandatory commands, capture logs, and add focused/live browser smoke to prove 3D behavior where global e2e cannot run.

## Round 01 correction addendum — non-negotiable implementation constraints

This addendum resolves the Wave 008 round-01 review blockers and supersedes any earlier wording that could be read as allowing a single god selector or retaining guide/selection geometry in `ThreeView.vue`.

### Shell boundary for selection, guide behavior, and scene construction

`ThreeView.vue` may read `viewStore`, `selectionStore`, and the injected `World` only as shell-level inputs. It must pass the current display options and selected entity IDs into the `threePresentation` boundary as an explicit input object, for example `ThreePresentationInput { world, displayOptions, selectedIds }`. The component must not perform direct selected-element domain lookup, guide/perpendicular-plane geometry derivation, projection-plane matrix interpretation, domain-to-view coordinate conversion, or raw Three.js object construction after the wave.

Guide/perpendicular-plane behavior is part of the `threePresentation` read-model boundary: selected guide IDs enter the selector input, `Guide3DSelector` resolves selected guides and emits guide perpendicular-plane and guide intersection marker DTOs, and `GuideSceneAdapter` consumes those DTOs to create/replace scene objects. `ThreeView.vue` must only trigger runtime refreshes and must not contain guide/perpendicular-plane DTO production or scene-object construction.

### Required concern-split 3D read models

The `ThreePresentationSelector` named earlier is an orchestrator only, not a large replacement module. The implementation must split read-model production by concern under `frontend/src/application/threePresentation/`:

- `ProjectionPlane3DSelector` for projection-plane surfaces, grids, reference axes, auxiliary axes, and projection-plane labels.
- `PlanarElement3DSelector` for 2D-on-3D-plane point/line/segment/circle DTOs formerly mixed into `Element2DRenderer3D`.
- `ReconstructedElement3DSelector` for reconstructed 3D point/line/segment/plane DTOs.
- `Guide3DSelector` for selected-guide perpendicular-plane and intersection-marker DTOs.
- `Hinge3DSelector` and an axis/label concern (`Axis3DSelector` or the projection-plane selector's axis submodule) for hinge/reference/auxiliary axis geometry and labels.

A single top-level controller may compose these selectors, but no file may absorb all projection-plane, planar-element, reconstructed-element, guide, hinge, and axis traversal. This direct proposal remains a fallback only if it preserves that split.

### Lifecycle, grouped replacement, and CSS2D label disposal requirements

The implementation must introduce a scene-object registry/group-replacement boundary that replaces complete render groups atomically and disposes all removed resources. Validation must prove:

- repeated `scene.children.filter(...).forEach(scene.remove)` clearing patterns are removed from `ThreeView.vue` and replaced by grouped registry replacement;
- geometries, materials, line materials, meshes/lines, and CSS2D label objects are cleaned up or replaced when render groups refresh;
- CSS2D labels created for projection planes, auxiliary axes, reference axes, guide markers, or future scene labels are not orphaned across refresh, resize, or unmount;
- `ThreeView.vue` delegates mount, refresh, resize, and dispose to the runtime/scene host rather than manually clearing object families.

### Tightened validation gates for the direct fallback

The implementation-stage validation must include stable logs for all mandatory cadence commands and these additional Wave 008 checks:

- shell-boundary static scan proving `ThreeView.vue` contains no `new THREE.*`, `scene.children`, `Float32BufferAttribute`, `LineBasicMaterial`, `MeshBasicMaterial`, `SphereGeometry`, `TubeGeometry`, `PlaneGeometry`, `ArrowHelper`, `CSS2DObject`, direct projection/guide domain realization calls, `world.projectionPlanes`, `getAll3D*`, `getAllHingeLines`, `realize2D(world)`, or `realize3D(world)` except shell/controller wiring;
- scene setup extraction check proving scene/camera/WebGLRenderer/CSS2DRenderer/OrbitControls/lights/animation/resize/dispose live in `ThreeSceneHost`/runtime, not `ThreeView.vue`;
- selector tests for projection-plane meshes/grids/labels, planar 2D-on-3D elements, reconstructed 3D elements, guide perpendicular planes/intersections, hinge lines, axes, and domain-to-view conversion metadata;
- adapter/registry tests for projection-plane meshes, CSS2D label replacement/cleanup, guide and hinge objects, grouped object replacement, and disposal semantics;
- mandatory root and frontend lint/test/build cadence plus e2e/Playwright or exact classification of pre-existing blockers;
- live 3D smoke proving `canvas.three-canvas` mounts, scene setup occurs through the runtime, display/selection refreshes produce representative 3D groups, and the preview refresh/probe is recorded.

These gates intentionally align with no-backcompat/aggressive-deletion priorities: inline `ThreeView.vue` geometry/mesh helpers, `Element2DRenderer3D`, raw-`World` scene adapters, duplicated 2D/3D render special cases, obsolete tests/fixtures, compatibility shims, and debug logging must be deleted rather than wrapped.

