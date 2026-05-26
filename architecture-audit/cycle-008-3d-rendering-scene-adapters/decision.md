# Wave 008 Decision — 3D rendering scene adapters

## Decision status

Review convergence for Wave 008 is complete. Review round 02 reports **NO BLOCKING ISSUES** and recommends proceeding with **Proposal Restructure**.

This decision selects `architecture-audit/cycle-008-3d-rendering-scene-adapters/proposals/proposal-restructure.md` for implementation.

## Artifacts considered

- `architecture-audit/wave-plan.md`, Wave 008 entry: scopes the wave to `ThreeView.vue`, `Element2DRenderer3D.ts`, `rendering3D.ts`, and new Three.js scene/geometry/label helpers; target outcome is a lifecycle/composition shell over scene adapters/selectors.
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/scope-check.md`: confirms Wave 008 remains valid after Wave 007 and that `ThreeView.vue` / `Element2DRenderer3D.ts` are still the next central rendering-boundary cleanup.
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/proposals/proposal-direct.md`: corrected fallback extraction proposal.
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/proposals/proposal-restructure.md`: corrected preferred proposal creating a `threePresentation` read-model boundary and DTO-consuming Three.js adapters.
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/corrections-round-01-note.md`: records in-place corrections for shell selected-ID flow, concern-split selectors, grouped replacement/disposal, and CSS2D label lifecycle validation.
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/reviews/round-01-review.md`: found blocking issues but recommended Proposal Restructure after correction.
- `architecture-audit/cycle-008-3d-rendering-scene-adapters/reviews/round-02-review.md`: verifies the round-01 blockers were resolved and declares no blocking issues.

## Selected proposal

**Selected: Proposal Restructure.**

Rationale:

- It best satisfies the Wave 008 target by making `ThreeView.vue` a lifecycle/composition shell and moving domain traversal into an application-owned 3D presentation/read-model boundary.
- It prevents `Element2DRenderer3D.ts` from reappearing as a domain-aware renderer under a new name by requiring scene adapters to consume DTOs only.
- It aligns with the Wave 007 selector/read-model pattern without reopening Wave 007 implementation.
- It explicitly requires concern-split selectors for projection planes, planar 2D-on-3D elements, reconstructed 3D elements, guides, hinges, axes, and labels rather than a renamed god selector.
- It has the strongest delete posture: `Element2DRenderer3D.ts`, inline `ThreeView.vue` geometry/mesh helpers, debug logs, raw-`World` scene adapters, repeated scene-child clearing, compatibility shims, and obsolete tests/fixtures must be removed rather than wrapped.

## Rejected/deferred alternative

**Rejected as the primary implementation path: Proposal Direct.**

Proposal Direct is now an acceptable fallback shape after corrections, but it is rejected for implementation because it still frames the work as a smaller extraction. Wave 008 needs the higher-level application read-model boundary chosen by Proposal Restructure so scene adapters cannot continue to receive `World`, perform selected-guide lookup, or own domain-to-view conversion. Direct’s useful details remain incorporated as implementation constraints where they match Proposal Restructure, especially grouped scene-object replacement, CSS2D label cleanup, and static shell-boundary scans.

## Exact implementation scope

Implementation must stay within Wave 008 and include the following scope.

### ThreeView lifecycle shell boundaries

- Refactor `frontend/src/components/panels/ThreeView.vue` into a Vue shell that keeps template controls, refs, injected `World`, display-option reads, selected-ID reads, lifecycle hooks, watchers, and calls into a runtime/facade only.
- `ThreeView.vue` must pass `{ world, displayOptions, selectedIds }` or equivalent into the runtime / `threePresentation` boundary.
- `ThreeView.vue` must not perform selected-element domain lookup, guide/perpendicular-plane derivation, projection-plane matrix interpretation, domain-to-view coordinate conversion, raw Three.js object construction, CSS2D object creation, or scene-child clearing.
- Replace the `window as any.__threeViewWorldChangeHandler` style bridge with a local subscription/unsubscribe owned by component lifecycle.

### Scene setup extraction

- Create a runtime/host boundary under `frontend/src/rendering/threeView/` or equivalent.
- `ThreeViewRuntime` composes the presentation controller, `ThreeSceneHost`, object registry, and scene adapters.
- `ThreeSceneHost` owns `THREE.Scene`, `PerspectiveCamera`, `WebGLRenderer`, `CSS2DRenderer`, `OrbitControls`, lights, animation loop, resize, and disposal.

### Projection-plane meshes, labels, guide/hinge geometry, and adapters

- Extract projection-plane surface/grid/mesh, reference axis, auxiliary axis, axis label, and projection-plane label object creation into scene adapters.
- Extract hinge-line rendering into a hinge adapter consuming hinge DTOs only.
- Extract selected-guide perpendicular-plane and guide-intersection rendering into a guide adapter consuming guide DTOs only.
- CSS2D labels must be owned by the scene host/registry/adapters with explicit cleanup/replacement semantics.

### 2D-on-3D and domain-to-view conversion

- Delete `frontend/src/services/Element2DRenderer3D.ts` and replace its responsibilities with:
  - `PlanarElement3DSelector` or equivalent for domain traversal and DTO production;
  - `PlanarElementSceneAdapter` for DTO-to-Three.js object creation.
- Domain-to-view coordinate conversion, visibility resolution, line extents, z-fighting offsets, and styles must be explicit selector/policy/model concerns, not hidden in scene adapters.

### Element2DRenderer3D role

- No replacement module may accept `World` as a scene-rendering input.
- No compatibility wrapper or re-export for `Element2DRenderer3D` may remain at wave completion.
- Any obsolete tests/fixtures that instantiate `Element2DRenderer3D` with raw `World` must be deleted or replaced with selector/adapter tests.

### rendering3D config boundaries

- Keep `frontend/src/config/rendering3D.ts` as a low-level rendering configuration boundary.
- Move style/display constants into `ThreeStylePolicy` or import existing constants there as needed.
- Do not add speculative per-plane compatibility shims or make `rendering3D.ts` a new mixed domain/adapter hub.

### Selected-guide / perpendicular-plane DTO handling

- Selected IDs enter `threePresentation` as plain input from the shell.
- `Guide3DSelector` performs selected-guide eligibility/lookup and emits guide perpendicular-plane DTOs plus guide intersection marker DTOs.
- `GuideSceneAdapter` consumes DTOs only; it must not import domain guide classes, `World`, stores, or Vue.

### Concern-split 3D selectors/read models

Create or equivalent-focus modules under `frontend/src/application/threePresentation/`:

- `ThreePresentationModel.ts` for DTOs and render groups.
- `ThreePresentationController.ts` as a thin facade.
- `ThreePresentationSelector.ts` as an orchestrator only.
- `ProjectionPlane3DSelector.ts` for projection-plane surfaces/grids/meshes/reference axes/auxiliary axes/labels.
- `PlanarElement3DSelector.ts` for 2D-on-3D point/line/segment/circle DTOs.
- `ReconstructedElement3DSelector.ts` for reconstructed 3D point/line/segment/plane DTOs.
- `Guide3DSelector.ts` for selected-guide perpendicular planes/intersections.
- `Hinge3DSelector.ts` plus dedicated or projection-plane-owned axis/label concern.
- `ThreeStylePolicy.ts` or equivalent for colors, opacity, radii, line extents, guide/reference styles, z-offsets, and visibility/style mapping.

A single giant selector file that absorbs all current `ThreeView.vue` and `Element2DRenderer3D.ts` traversal is not accepted.

### Wave 007 selector reuse without reopening Wave 007

- Reuse Wave 007 patterns and small stable selector/read-model policies where helpful.
- Do not modify `SvgCanvas.vue`, `CanvasPresentationSelector`, Paper/SVG rendering, 2D interaction, command/tool behavior, or Wave 007 implementation except for tiny shared pure utility/policy consumption if strictly necessary.

## Aggressive DELETE list

The implementation is incomplete until these surfaces are gone where applicable:

- `frontend/src/services/Element2DRenderer3D.ts` and all imports/usages.
- Large inline geometry/mesh/render helpers from `frontend/src/components/panels/ThreeView.vue`, including fallback grid generation, scene setup body, projection-plane rendering, 2D-on-plane rendering, reconstructed 3D rendering, guide perpendicular-plane/intersection rendering, hinge rendering, reference/auxiliary axes, axis-label creation, inline animation/resize/cleanup logic once delegated.
- Repeated `scene.children.filter(...).forEach(scene.remove)` clearing patterns from `ThreeView.vue`; use grouped object replacement instead.
- Direct raw-domain traversal from `ThreeView.vue` and scene adapters: `world.projectionPlanes`, `getAll3D*`, `getAllPlanes`, `getAllHingeLines`, `getLine2D`, `realize2D(world)`, `realize3D(world)`, guide predicates, and guide-plane math.
- Legacy store access if any remains only from deleted legacy geometry/store paths. UI display/selection store reads may remain in `ThreeView.vue` only as shell inputs.
- Duplicated 2D/3D rendering special cases replaced by explicit selector DTOs and style policy.
- Placeholder `Element2DRenderer3D.resolveVisualStyle()` defaults/TODOs and infinite-line clipping TODOs, replaced by explicit selector/policy decisions.
- Hinge debug `console.log` diagnostics and any other routine 3D rendering debug logs.
- CSS2D/group disposal leaks: old orphan-label creation/clearing patterns must be deleted in favor of registry-owned label cleanup/replacement.
- Obsolete tests/fixtures tied to raw-`World` 3D renderers or old import paths.
- Any compatibility shim, temporary barrel, or wrapper that exists only to keep deleted old imports compiling.

## Validation requirements for implementation

Implementation must run the mandatory cadence with stable logs under `architecture-audit/cycle-008-3d-rendering-scene-adapters/validation/`.

### Static boundary checks

Record scans proving:

- `ThreeView.vue` contains no low-level Three.js construction, CSS2D object creation, scene-child clearing, projection-plane mesh helpers, guide/hinge geometry derivation, direct domain collection traversal, `realize2D(world)`, or `realize3D(world)`.
- Scene setup lives in `ThreeSceneHost` / `ThreeViewRuntime`, not in `ThreeView.vue`.
- `frontend/src/rendering/threeView/**` contains no imports from domain `World` modules and no `World` type.
- `frontend/src/application/threePresentation/**` contains no Vue/Pinia/renderer classes and remains concern-split.
- `frontend/src/services/Element2DRenderer3D.ts` is absent.
- No routine `console.log` remains in 3D rendering modules.

### Focused tests

Add/update focused tests covering:

- 3D scene adapter tests for projection-plane meshes, labels, guide geometry, hinge geometry, planar element objects, reconstructed element objects, and DTO-to-object conversion.
- Selector tests for projection planes/grids/labels, 2D-on-plane elements, reconstructed 3D elements, selected-guide perpendicular-plane/intersection DTO handling, hinge lines, axes, style/visibility, and domain-to-view conversion metadata.
- `ThreeObjectRegistry` grouped scene-object replacement/disposal for projection planes, planar elements, reconstructed elements, guides, hinges, axes, labels, and repeated refreshes.
- CSS2D label cleanup/replacement on group refresh and disposal.
- `ThreeView.vue` shell behavior: mount delegates scene setup, refresh runs on world/display/selection changes, resize delegates, and dispose cleans runtime resources.

### Behavioral requirements

Validate that the 3D view still renders and updates:

- projection planes and grids;
- reference and auxiliary axes/labels;
- hinge lines;
- guides and selected-guide perpendicular planes/intersections;
- 2D-on-plane points, lines, segments, circles;
- reconstructed 3D points, lines, segments, planes;
- grouped scene-object replacement/disposal;
- CSS2D label cleanup/replacement;
- selected-guide shell-boundary flow;
- live 3D canvas smoke.

### Mandatory command cadence

Run and log:

1. Root lint: `npm run lint`.
2. Frontend lint: `npm run lint --workspace=frontend`.
3. Focused Vitest for new `application/threePresentation` and `rendering/threeView` tests plus existing 3D/domain utilities affected by the boundary.
4. Full root Vitest: `npm run test`.
5. Full frontend Vitest: `npm run test --workspace=frontend`.
6. Root build: `npm run build`.
7. Frontend build: `npm run build --workspace=frontend`.
8. Playwright/e2e: `npm run test:e2e --workspace=frontend`, or exact classification of pre-existing blockers with logs if the suite remains externally blocked.
9. Live preview refresh bound to `0.0.0.0`, HTTP reachability probe, and browser/Playwright smoke confirming `canvas.three-canvas` mounts and representative 3D render groups/objects appear.

## Accepted residual risks

- Proposal Restructure is larger than Proposal Direct and will require disciplined implementation to avoid boundary drift between selectors, runtime, adapters, and registry.
- The architecture depends on static scans and focused tests actually being added to the implementation validation logs; review must verify those logs rather than accepting compilation alone.
- Existing project-level e2e/tooling issues may limit Playwright evidence; if so, the implementation stage must run the commands and classify failures with exact logs rather than skipping or waiving them silently.

These residual risks are accepted because round-02 review found no blocking issues and the selected proposal best advances the project priorities: clean architecture first, code quality second, and verified behavior third.

## Explicit out-of-scope constraints

The implementation stage must not include:

- Wave 009 `App.vue` shell extraction or project lifecycle/autosave/keyboard/selection orchestration changes.
- Backend, persistence, docs, specs, tooling-only cleanup, or package-script refactors unrelated to Wave 008 validation.
- Command/tool/controller behavior changes.
- Reopening Wave 007 2D rendering implementation except for consuming stable selector/read-model patterns or tiny pure shared policies/utilities.
- Compatibility layers, backcompat migration work, or old-path shims.

## Next implementation scope

Proceed to `cycle-008-implement-3d-rendering-scene-adapters` with Proposal Restructure as the binding implementation plan. The implementer must follow this decision exactly; any deviation that changes scope or weakens boundaries requires a reviewed mini-cycle before coding continues.
