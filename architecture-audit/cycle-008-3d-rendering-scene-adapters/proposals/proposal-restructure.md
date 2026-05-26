# Proposal Restructure — Create a 3D presentation boundary, then adapt Three.js scene rendering

## Summary

Implement Wave 008 one conceptual layer higher than a mechanical `ThreeView.vue` extraction: introduce an application-owned `threePresentation` read-model boundary parallel to Wave 007's `canvasPresentation`, then make Three.js adapters pure consumers of that model. The component delegates lifecycle to a `ThreeViewRuntime`, while all domain traversal happens in selectors and all Three.js mutation happens in adapters.

This option treats `Element2DRenderer3D.ts` as an architectural smell to delete, not merely move. It also avoids letting `ThreeView.vue` call individual adapters directly; the component talks to one runtime/facade that composes selector + scene host + adapters.

## Why this is higher-level than the direct extraction

The direct extraction moves helper functions into smaller files. This proposal establishes a sharper boundary:

- **Domain/application read side:** `ThreePresentationSelector` converts `World` + display/selection state into immutable DTOs.
- **Scene adapter side:** adapter modules convert DTOs into Three.js objects and manage disposal.
- **Vue shell side:** `ThreeView.vue` controls lifecycle and UI options only.

This mirrors the Wave 007 boundary where `CanvasPresentationSelector` is the raw-domain traversal point and `CanvasPresentationController` is the Vue-facing facade (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:13-72`, `frontend/src/application/canvasPresentation/CanvasPresentationController.ts:5-9`). It also prevents the replacement from becoming a collection of scene helpers that still accept `World` everywhere.

## Current evidence addressed

- `ThreeView.vue` imports and combines Vue, Three.js, CSS labels, domain types, stores, utilities, rendering config, and guide predicates (`frontend/src/components/panels/ThreeView.vue:35-77`).
- `ThreeView.vue` owns global scene variables and initializes scene/camera/renderers/controls/lights directly (`frontend/src/components/panels/ThreeView.vue:107-216`).
- Projection-plane and auxiliary-axis rendering combines `World` traversal, matrix interpretation, grid clipping, coordinate conversion, Three.js geometry/material creation, and scene mutation (`frontend/src/components/panels/ThreeView.vue:239-373`, `frontend/src/components/panels/ThreeView.vue:915-957`).
- Reconstructed 3D elements are rendered inline from `World` collections and realizations (`frontend/src/components/panels/ThreeView.vue:394-598`).
- Guide perpendicular-plane rendering combines selection-store reads, domain guide checks, realization math, plane construction, and intersection markers (`frontend/src/components/panels/ThreeView.vue:611-767`).
- Hinge rendering uses direct domain realization and still logs debug output (`frontend/src/components/panels/ThreeView.vue:775-838`).
- Lifecycle hooks store a world-change handler on `window as any`, a bridge that should be deleted (`frontend/src/components/panels/ThreeView.vue:1090-1154`).
- `Element2DRenderer3D` accepts full `World`, iterates `world.projectionPlanes`, applies visibility, calls `realize2D(world)`, computes transforms, creates Three.js geometry, and owns cache/disposal (`frontend/src/services/Element2DRenderer3D.ts:60-112`, `frontend/src/services/Element2DRenderer3D.ts:118-443`).
- `Element2DRenderer3D` has unresolved TODOs for active-plane state, infinite-line clipping, and style resolution (`frontend/src/services/Element2DRenderer3D.ts:70`, `frontend/src/services/Element2DRenderer3D.ts:172-178`, `frontend/src/services/Element2DRenderer3D.ts:384-402`).

## Target architecture

```text
ThreeView.vue
  └─ ThreeViewRuntime / ThreeViewController
       ├─ ThreePresentationController
       │    └─ ThreePresentationSelector(s)
       │         └─ World/domain realization APIs, visibility/style policies
       └─ ThreeSceneHost
            ├─ ProjectionPlaneSceneAdapter
            ├─ PlanarElementSceneAdapter
            ├─ ReconstructedElementSceneAdapter
            ├─ GuideSceneAdapter
            ├─ HingeSceneAdapter
            └─ AxisLabelSceneAdapter / ObjectRegistry
```

Rules:

- `ThreeView.vue` may import Vue, stores for UI state, injected `World`, and the runtime/facade only.
- Three.js adapters must not import `World`, projection-plane/domain element classes, Pinia stores, or Vue.
- Selectors may import domain types/realization APIs and pure utilities, but must not import Three.js renderer classes, Vue, Pinia, `Scene`, `Mesh`, `Line`, or `CSS2DObject`. They may use vector/matrix value types only where unavoidable.
- Scene host/adapters consume DTOs and manage Three.js objects/disposal.
- `Element2DRenderer3D.ts` is deleted; no replacement accepts `World`.

## Files to change

### Component shell

- `frontend/src/components/panels/ThreeView.vue`
  - Keep template and controls.
  - Replace scene variables with one runtime instance.
  - On mount, create runtime with container/canvas refs and controller dependencies.
  - Subscribe to world changes with local closure/unsubscribe, not `window as any`.
  - Watch display options and selected IDs; call `runtime.refresh({ world, displayOptions, selectedIds })`.
  - Call `runtime.resize()` and `runtime.dispose()`.

### New application read-model boundary

Create `frontend/src/application/threePresentation/`:

- `ThreePresentationModel.ts`
  - DTO discriminants:
    - `projection-plane-grid`, `projection-plane-surface`, `reference-axis`, `auxiliary-axis`, `axis-label`,
    - `planar-point`, `planar-line`, `planar-segment`, `planar-circle`,
    - `reconstructed-point`, `reconstructed-line`, `reconstructed-segment`, `reconstructed-plane`,
    - `hinge-line`, `guide-perpendicular-plane`, `guide-intersection-marker`.
  - Shared DTO fields: `id`, `sourceEntityId`, `planeId`, `visible`, `style`, `geometry`, `renderGroup`.
  - Display-state DTOs for options currently from `ThreeViewDisplayOptions`.
- `ThreePresentationSelector.ts`
  - Orchestrates subselectors and returns one `ThreePresentationModel`.
- `ProjectionPlane3DSelector.ts`
  - Produces plane surface/grid/auxiliary-axis/reference-axis DTOs.
- `PlanarElement3DSelector.ts`
  - Replaces `Element2DRenderer3D` domain traversal; produces 2D-on-plane DTOs for visible points/lines/segments/circles.
- `ReconstructedElement3DSelector.ts`
  - Produces DTOs for 3D points/lines/segments/planes.
- `Guide3DSelector.ts`
  - Produces guide perpendicular-plane and intersection marker DTOs for selected guide IDs.
- `Hinge3DSelector.ts`
  - Produces hinge-line DTOs.
- `ThreeStylePolicy.ts`
  - Centralizes colors, opacity, point/tube radii, line extents, guide/hinge/reference-axis styles, and z-fighting offsets.
- `ThreePresentationController.ts`
  - Thin facade for Vue/runtime, analogous to Wave 007's controller.

### New scene/runtime adapter boundary

Create `frontend/src/rendering/threeView/`:

- `ThreeViewRuntime.ts`
  - Composes `ThreeSceneHost`, `ThreePresentationController`, and scene adapters.
  - Public API: `mount()`, `refresh(input)`, `resize()`, `dispose()`.
- `ThreeSceneHost.ts`
  - Creates scene/camera/WebGLRenderer/CSS2DRenderer/OrbitControls/lights/animation loop.
- `ThreeObjectRegistry.ts`
  - Replaces render groups atomically and disposes geometry/material/CSS labels.
- `ProjectionPlaneSceneAdapter.ts`
- `PlanarElementSceneAdapter.ts`
- `ReconstructedElementSceneAdapter.ts`
- `GuideSceneAdapter.ts`
- `HingeSceneAdapter.ts`
- `AxisLabelSceneAdapter.ts`
  - Each consumes DTOs only.

### Existing modules

- `frontend/src/services/Element2DRenderer3D.ts`
  - Delete entirely.
- `frontend/src/config/rendering3D.ts`
  - Keep as low-level config; move any display-style constants that belong to `ThreeStylePolicy`, or import constants into policy.
- `frontend/src/types/ThreeViewDisplayOptions.ts`
  - Keep as UI display-state type unless the new model needs a more explicit display-state DTO.
- `frontend/src/utils/threeUtils.ts` and `frontend/src/utils/rectangleGrid.ts`
  - Use from selectors/policies. Move no behavior unless tests prove a pure helper belongs there.

### Tests to add/update

- `frontend/tests/unit/application/threePresentation/projectionPlane3DSelector.spec.ts`
- `frontend/tests/unit/application/threePresentation/planarElement3DSelector.spec.ts`
- `frontend/tests/unit/application/threePresentation/reconstructedElement3DSelector.spec.ts`
- `frontend/tests/unit/application/threePresentation/guide3DSelector.spec.ts`
- `frontend/tests/unit/application/threePresentation/hinge3DSelector.spec.ts`
- `frontend/tests/unit/rendering/threeView/threeObjectRegistry.spec.ts`
- `frontend/tests/unit/rendering/threeView/threeSceneAdapters.spec.ts`
- `frontend/tests/unit/components/ThreeView.shell.spec.ts` or equivalent shell test.
- Keep existing domain/math tests for `Line3DReconstruction`, `Plane3DFromTraces`, `Point3DReconstruction`, `segment3DRealization`, and `threeUtils` in focused validation.

## Files/tests/docs/fixtures to DELETE

Aggressive delete list:

- Delete `frontend/src/services/Element2DRenderer3D.ts`; do not leave a compatibility wrapper.
- Delete all imports/usages of `Element2DRenderer3D` from `ThreeView.vue` and tests.
- Delete all low-level helper functions from `ThreeView.vue` once runtime/adapters exist:
  - `generateFallbackGrid()` (`frontend/src/components/panels/ThreeView.vue:84-105`).
  - `initThreeScene()` body (`frontend/src/components/panels/ThreeView.vue:138-216`).
  - `compute3DPlaneRectangleCorners()` (`frontend/src/components/panels/ThreeView.vue:229-231`).
  - `renderProjectionPlanes()` (`frontend/src/components/panels/ThreeView.vue:239-373`).
  - `render2DElements()` (`frontend/src/components/panels/ThreeView.vue:379-387`).
  - `render3DElements()` (`frontend/src/components/panels/ThreeView.vue:394-598`).
  - `renderGuidePerpendicularPlane()` and `renderGuideIntersections()` (`frontend/src/components/panels/ThreeView.vue:611-767`).
  - `renderHingeLines()` (`frontend/src/components/panels/ThreeView.vue:775-838`).
  - `renderReferenceAxes()`, `renderAuxiliaryPlaneAxes()`, `createAxisLabel()`, `createAuxiliaryAxisLabel()` (`frontend/src/components/panels/ThreeView.vue:857-1024`).
  - inline `animate()`, `handleResize()`, `cleanup()` implementations (`frontend/src/components/panels/ThreeView.vue:1040-1087`).
- Delete `console.log` hinge diagnostics (`frontend/src/components/panels/ThreeView.vue:778`, `frontend/src/components/panels/ThreeView.vue:787`).
- Delete `window as any.__threeViewWorldChangeHandler` bridge (`frontend/src/components/panels/ThreeView.vue:1143-1151`).
- Delete raw `world.projectionPlanes`, `world.getAll3D*`, `world.getAllHingeLines`, `realize2D(world)`, and `realize3D(world)` calls from `ThreeView.vue` and scene adapters; keep such calls only inside `application/threePresentation` selectors.
- Delete duplicated 2D/3D special-case style defaults from `Element2DRenderer3D.resolveVisualStyle()` by replacing them with explicit DTO style policy (`frontend/src/services/Element2DRenderer3D.ts:384-402`).
- Delete infinite-line clipping TODO by making line extent/clipping an explicit selector/policy decision (`frontend/src/services/Element2DRenderer3D.ts:172-178`).
- Delete any obsolete tests/fixtures that instantiate `Element2DRenderer3D` with a raw `World`; replace with selector and adapter tests.
- Delete any new shim/barrel that exists only to keep old import paths compiling.

## Expected behavior change

User-visible behavior should remain equivalent:

- Projection planes, grids, axes, labels, hinge lines, guide perpendicular planes/intersections, 2D-on-plane elements, and reconstructed 3D elements continue to render.
- Orbit controls, resize behavior, display toggles, world-change refresh, and selection-change guide highlighting continue to work.
- Routine hinge debug logs disappear.

Architectural behavior changes:

- 3D scene adapters no longer receive `World`.
- All domain read/model conversion for the 3D view is concentrated in `frontend/src/application/threePresentation/`.
- `ThreeView.vue` no longer owns scene-object construction or raw domain realization traversal.

## Validation plan

Capture all logs under `architecture-audit/cycle-008-3d-rendering-scene-adapters/validation/`.

### Static architecture checks

Run scans that fail the wave if any forbidden pattern remains:

- `ThreeView.vue` contains no `new THREE.`, `scene.children`, `Float32BufferAttribute`, `LineBasicMaterial`, `MeshBasicMaterial`, `SphereGeometry`, `TubeGeometry`, `PlaneGeometry`, `ArrowHelper`, `CSS2DObject`, `world.projectionPlanes`, `getAll3DPoints`, `getAll3DLines`, `getAll3DSegments`, `getAllPlanes`, `getAllHingeLines`, `realize2D(world)`, or `realize3D(world)`.
- `frontend/src/rendering/threeView/**` contains no imports from `frontend/src/domain/world/**` and no `World` type.
- `frontend/src/application/threePresentation/**` contains no imports from Vue, Pinia, `OrbitControls`, `CSS2DRenderer`, `CSS2DObject`, `WebGLRenderer`, or `Scene` adapter classes.
- `frontend/src/services/Element2DRenderer3D.ts` is absent.
- No `console.log` remains in 3D rendering modules.

### Mandatory command cadence

- Root lint: `npm run lint`.
- Frontend lint: `npm run lint --workspace=frontend`.
- Focused Vitest:
  - new `application/threePresentation` selector tests,
  - new `rendering/threeView` adapter/registry tests,
  - `frontend/tests/unit/components/ThreeView.shell.spec.ts` if added,
  - existing `frontend/tests/unit/domain/Line3DReconstruction.test.ts`, `frontend/tests/unit/domain/Plane3DFromTraces.test.ts`, `frontend/tests/unit/domain/Point3DReconstruction.test.ts`, `frontend/tests/unit/domain/segment3DRealization.spec.ts`, and `frontend/tests/unit/utils/threeUtils.spec.ts`.
- Full root Vitest: `npm run test`.
- Full frontend Vitest: `npm run test --workspace=frontend`.
- Root build: `npm run build`.
- Frontend build: `npm run build --workspace=frontend`.
- Playwright/e2e: `npm run test:e2e --workspace=frontend`.
- Live preview refresh/probe:
  - refresh Vite on `0.0.0.0`,
  - HTTP 200 probe,
  - Playwright/browser smoke that confirms `canvas.three-canvas` mounts, display controls are present, and representative scene groups/objects appear after default project initialization and at least one constructed geometry flow.

If known project-level blockers from Wave 007 persist (missing eslint, `vue-tsc`/Node issue, malformed e2e specs), classify them with exact log output; do not skip the commands.

### Behavioral coverage expectations

- Projection planes: P_H/P_V and auxiliary projection-plane grid/surface DTOs and adapter objects.
- Hinge lines: feasible hinge DTOs and dashed line object creation.
- Guides: selected guide yields perpendicular plane and intersection marker DTOs/objects.
- 2D-on-plane: points, infinite lines, finite segments, and circles render as DTOs and objects with visibility/style policy applied.
- Reconstructed 3D: points, lines, segments, and planes render as DTOs and objects with infeasible/invisible elements skipped.
- Lifecycle: mount, refresh on world/display/selection changes, resize, and disposal.

## Risks and mitigations

- **Risk: larger implementation than direct extraction.** Mitigation: keep selectors concern-split but narrowly scoped to current 3D view; no app-shell/persistence/tool changes.
- **Risk: over-generalizing a presentation model.** Mitigation: DTOs must map to current `ThreeView` responsibilities only; reject generic scene graph abstractions not exercised by current behavior.
- **Risk: raw domain traversal simply moves from component to one giant selector.** Mitigation: split selectors by concern and add architecture scans/tests for adapter/domain import direction.
- **Risk: 2D Wave 007 boundary is accidentally reopened.** Mitigation: consume only shared policies/utilities where necessary; no `SvgCanvas.vue`, `CanvasPresentationSelector`, `Paper`, `SVGRenderer`, command/tool, or 2D interaction changes unless a reviewed mini-cycle approves them.
- **Risk: scene object disposal regressions.** Mitigation: central `ThreeObjectRegistry` with focused disposal tests for meshes, lines, materials, and CSS labels.
- **Risk: e2e/live smoke cannot create required 3D state due existing e2e issues.** Mitigation: combine focused selector/adapter tests with live DOM/scene smoke and exact classification of external blockers.

## Preferred decision

Prefer this restructure proposal over the direct proposal if the review agrees that a DTO/read-model boundary is required to prevent `Element2DRenderer3D` from reappearing as a domain-aware renderer under a new name. The direct proposal is acceptable only if it still enforces the non-negotiable rule that Three.js adapters do not accept `World` and `ThreeView.vue` does not retain low-level geometry construction.
