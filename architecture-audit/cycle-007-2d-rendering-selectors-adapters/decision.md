# Wave 007 Decision — 2D rendering selectors and renderer adapters

**Stage:** `cycle-007-decision`  
**Wave:** 007 — Extract 2D rendering selectors and renderer adapters  
**Decision status:** Review convergence complete after round 02; proceed to implementation.  
**Selected proposal:** `proposals/proposal-restructure.md` — Extract a canvas presentation read model before renderer adapters.  
**Source-code changes in this decision stage:** none.

## Inputs and convergence record

This decision is based on the following Wave 007 artifacts:

- `architecture-audit/wave-plan.md`, Wave 007 entry, which scopes the wave to `PaperService.ts`, `SVGRenderer.ts`, `RenderService.ts`, `SvgCanvas.vue`, `Paper.ts`, style/visibility selectors, and focused Paper/SVG/e2e validation.
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/scope-check.md`, which confirms the Wave 007 premise still holds after Waves 006a/006b: command-construction leaks are sufficiently addressed, but the 2D canvas still couples Vue, raw `World` traversal, Paper primitives, SVG conversion, style/visibility resolution, active-plane grid reads, and hit testing.
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/proposals/proposal-direct.md`.
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/proposals/proposal-restructure.md`.
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/reviews/round-01-review.md`, which raised three blocking issues: non-point/non-circle hit semantics were underspecified, Proposal Direct left grid responsibility ambiguous, and both validation plans needed explicit architecture boundary assertions.
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/corrections-round-01-note.md`, which records the in-place proposal edits addressing all three blockers.
- `architecture-audit/cycle-007-2d-rendering-selectors-adapters/reviews/round-02-review.md`, which marks all three blockers **RESOLVED**, declares **NO BLOCKING ISSUES**, and recommends Proposal Restructure as the preferred implementation path.

Review convergence is therefore complete after round 02. No third review round or second-opinion review is required.

## Decision

Implement **Proposal Restructure**.

Wave 007 must establish a coherent **canvas presentation read-model boundary** for the active 2D canvas. `SvgCanvas.vue` should become a UI/event shell over a read-only canvas presentation model, interaction query, and renderer adapters. Raw domain traversal and realization lookup are allowed in the new canvas-presentation selector/query layer, not in Vue rendering code or renderer adapters.

This choice follows the round-02 review recommendation because the current architectural leak is broader than primitive rendering. The scope check shows raw-domain reads in primitive generation, active-plane grid/label generation, Paper hit testing, snap/hover/properties target resolution, style/visibility decisions, and projected 3D-on-2D output. A canvas presentation read model fixes those reads behind one coherent boundary and reduces drift between visible objects and selectable/snap-able objects.

## Rejected / deferred alternative

`proposal-direct.md` is rejected for this wave as the primary implementation plan, though it is now implementation-ready as a fallback after corrections.

Reason for rejection: Proposal Direct improves the Paper/SVG pipeline and now includes grid/label extraction and hit-query parity, but it remains conceptually narrower. It risks creating a render-selector layer while leaving adjacent canvas read concerns to accrete around `SvgCanvas.vue` or a renamed selector god-module. Proposal Restructure better matches the actual leak surface by making rendering, grid/labels, hit/snap/properties queries, style, and visibility consumers of one presentation read snapshot.

Deferred work remains:

- Wave 008 3D scene-adapter extraction from `ThreeView.vue` is explicitly excluded.
- Wave 009 app-shell lifecycle, keyboard routing, project persistence orchestration, and broader shell extraction are explicitly excluded.
- Waves 006a/006b command-construction boundaries must not be reopened or duplicated.

## Exact implementation scope

Implementation must follow `proposal-restructure.md` and include the following concrete scope.

### Canvas presentation read model

Create a new read-only canvas-presentation layer, expected under `frontend/src/application/canvasPresentation/`, with focused modules equivalent to:

- `CanvasPresentationModel.ts` defining the presentation DTOs:
  - `CanvasPresentationModel`;
  - `CanvasRenderItem`;
  - `CanvasQueryItem`;
  - `CanvasGridLine` and `CanvasGridLabel`;
  - `CanvasSnapPoint` / snap-output DTOs;
  - `CanvasPlaneTransformModel`;
  - `CanvasStyleState`;
  - explicit discriminants for point, infinite line, finite segment, circle, guide, sibling guide, hinge line, half-hinge line, arc, and current projected-3D-on-2D point/line/segment output.
- `CanvasPresentationSelector.ts` as the only new 2D canvas presentation module that may traverse `World`, projection planes, concrete domain element classes, and 2D realization APIs to build the read model.
- `CanvasStylePolicy.ts` centralizing visual style, selection, hover, cascade-highlight, active-plane emphasis, layer/z-order, projected-3D styling, and visibility-derived render-state decisions now scattered through rendering code.
- `CanvasVisibilityPolicy.ts` centralizing current `visualStyle.visible` and process-tree/subprocess visibility behavior. It may call the existing domain `resolveVisibility(element, world)` during this wave, but renderer adapters must not call visibility/domain services directly.
- `CanvasGridSelector.ts` moving active-plane grid and label output out of `SvgCanvas.vue` and into the presentation model.
- `CanvasInteractionQuery.ts` answering selection, hover, snap-preview, properties-target lookup, closest-element priority, selection-mask filtering, active-plane filtering, and snap-point output from `CanvasQueryItem` DTOs.
- A thin Vue-facing facade such as `CanvasPresentationController.ts` or `useCanvasPresentation.ts` that composes selector inputs from world/view/UI state without owning command construction.

The read model must derive render items and query items from the same world/view snapshot so visible/selectable/snap-able state cannot drift.

### Renderer adapters

Refactor or replace the current rendering services so renderer adapters consume canvas presentation DTOs and explicit viewport/canvas bounds:

- Replace or radically shrink `frontend/src/services/PaperService.ts`. No remaining method may traverse `World`, call visibility services, realize domain elements, branch on concrete domain classes, or inspect raw domain implementation details such as ad hoc arc fields.
- Update `frontend/src/services/SVGRenderer.ts` or replace it with a `SvgCanvasRenderer`/adapter so line clipping and SVG conversion receive explicit viewport/canvas bounds rather than relying on hard-coded/TODO dimension behavior.
- If `frontend/src/domain/presentation/Paper.ts` remains, it must be reduced to a pure primitive collection/DTO helper. It must not import `World`, projection-plane classes, concrete domain element classes, domain realization types, or perform raw realization traversal.
- No compatibility overload may keep `Paper.hitTest(world, ...)` alive.

### `SvgCanvas.vue` boundary

Update `frontend/src/components/workspace/SvgCanvas.vue` so it delegates 2D canvas read behavior to the canvas presentation boundary:

- Rendering buckets must come from `CanvasPresentationModel` / renderer-adapter output.
- Active-plane grid lines and labels must come from `CanvasGridSelector`/presentation-model output, not component-owned domain realization.
- Selection, hover, snap-preview, properties dialog target lookup, point-drag target lookup, and construction-mask hit behavior must use `CanvasInteractionQuery` over query DTOs.
- `SvgCanvas.vue` must no longer construct `PrimitiveContext`, call `paperService.generatePrimitives(context)`, call `Paper.hitTest(..., world, ...)`, or directly own active-plane grid/label realization.
- Existing Wave 006a command-controller/use-case boundaries for construction, point movement, and style updates must remain the mutation path.

### Paper hit-test / query DTO extraction

The new query DTO and `CanvasInteractionQuery` contract must preserve and test current hit semantics for:

- points;
- infinite lines;
- finite segments, including endpoint/interior hits and misses outside finite extents;
- guides and sibling guides;
- hinge and half-hinge line paths as currently pickable through active-plane realization semantics;
- circles;
- active-plane filtering;
- selection-mask filtering;
- closest-element priority;
- snap-point output used by snap preview and construction input;
- properties-target lookup behavior.

Finite segments must not be collapsed into unbounded line-like query geometry. Guide/sibling-guide and hinge/half-hinge query behavior must remain line-like only where the current active-plane realization semantics make them pickable.

### Grid/label extraction

Grid and label extraction is in Wave 007 scope and may not be deferred. The implementation must remove component-owned active-plane grid/label domain realization from `SvgCanvas.vue` and provide explicit grid/label DTOs in the canvas presentation model.

### Style/visibility

Style and visibility decisions must be explicit selector/policy outputs. Renderer adapters may consume resolved style/visibility DTOs, but they must not call domain style/visibility services or reimplement scattered `visible: true // TODO` branches.

### Projected 3D-on-2D output

Current projected 3D-on-2D canvas output may be represented in the canvas presentation model as read DTOs. This is limited to the current 2D canvas projection output. Do not refactor `ThreeView.vue`, Three.js scene adapters, 3D mesh/label helpers, or Wave 008 scene responsibilities in this wave.

## Exact DELETE list

The implementation must aggressively delete obsolete surfaces rather than preserve shims or parallel paths:

1. Delete `frontend/src/services/RenderService.ts` if static search confirms it is only used by tests, as indicated by the current artifacts. Delete or rewrite `frontend/tests/unit/services/renderService.spec.ts` as selector/adapter coverage; do not keep a production rendering service solely for tests.
2. Delete test-only production rendering functions and fields, including old `renderPlane()` / `renderLine()` style helpers and test-compatibility-only output such as `planeName` if they remain only to support obsolete tests.
3. Delete raw-domain traversal/rendering methods from `PaperService.ts` after equivalent selector DTO behavior exists. No compatibility method may keep `generatePrimitives(context)` as a domain-walking production path.
4. Delete `Paper.hitTest(world, ...)` and all direct canvas calls to it. Do not leave a compatibility overload.
5. Delete direct raw-domain canvas rendering/hit-test/grid access replaced by selectors, including `PrimitiveContext` construction, `paperService.generatePrimitives(context)`, direct `world.projectionPlanes` rendering iteration, and component-owned active-plane grid/label realization in `SvgCanvas.vue`.
6. Delete obsolete rendering TODO branches replaced by explicit selector/policy outputs, including visible-state TODOs in `PaperService`, missing-element TODO branches in rendering code, and the `SVGRenderer` viewport/canvas-dimension TODO.
7. Delete normal-path rendering debug output touched by the wave in `PaperService`/`SvgCanvas.vue` rather than moving it behind compatibility flags.
8. Delete duplicate render special cases that existed only because `PaperService` identified domain kinds and rendered primitives in one place, including duplicated guide/segment/half-hinge branches after DTO discriminants express those cases.
9. Delete obsolete tests/fixtures that encode the removed `RenderService`, raw `Paper.hitTest(world)`, or `PaperService.generatePrimitives(context)` architecture. Replace them with canvas-presentation selector, interaction-query, grid-selector, and renderer-adapter tests.
10. Delete compatibility shims, transitional overloads, and parallel old/new rendering paths before marking the implementation complete.

## Validation requirements for implementation

The implementation stage must run and capture the mandatory cadence under `architecture-audit/cycle-007-2d-rendering-selectors-adapters/validation/`. Stable stdout/stderr log files are required for each command/check.

### Static architecture boundary assertions

Run explicit static scans proving:

- `RenderService.ts` is deleted, or if a reviewed implementation note temporarily retained it, it is proven fully unused before wave completion; deletion is the required target.
- Renderer adapter modules do not import `World`, projection-plane classes, concrete domain element classes, or domain realization types.
- Raw domain imports for 2D canvas presentation are confined to selector/query/policy modules where explicitly allowed.
- `SvgCanvas.vue` no longer contains `PrimitiveContext`, `paperService.generatePrimitives`, `Paper.hitTest(... world ...)`, direct rendering iteration over projection planes, or component-owned active-plane grid/label realization.
- `Paper.ts`, if retained, no longer imports `World`, projection-plane classes, concrete domain element classes, or performs raw realization traversal.
- Old rendering TODO branches, duplicate raw-domain render special cases, debug logs, and compatibility shims identified in the DELETE list are absent.
- Waves 006a/006b command boundaries remain intact: `SvgCanvas.vue` and tools/panels/toolbar must not regain direct command/operation construction as part of this rendering wave.
- Wave 008 remains excluded: no `ThreeView.vue` scene-adapter extraction or broad Three.js scene refactor is included.

### Focused tests

Add/update and run focused Vitest coverage for the touched modules, including at minimum:

- `frontend/tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts` for model construction: point, infinite line, finite segment, circle, guide, sibling guide, hinge/half-hinge, arc where relevant, projected-3D-on-2D output, style/visibility, active-plane emphasis, selection/hover/cascade state, layer/z-order, plane transforms, grid lines, and labels.
- `frontend/tests/unit/application/canvasPresentation/canvasInteractionQuery.spec.ts` for active-plane filtering, selection masks, point hits, infinite-line hits, finite-segment endpoint/interior/outside misses, circle hits, guide/sibling-guide hits, hinge/half-hinge hits, snap-point output, properties-target lookup, closest-element priority, and hidden/non-active/non-mask misses.
- `frontend/tests/unit/application/canvasPresentation/canvasGridSelector.spec.ts` for active-plane grid and label DTO output.
- Renderer-adapter coverage under `frontend/tests/unit/services/` for DTO-to-Paper/SVG conversion and explicit viewport/canvas bounds.
- Updated/deleted legacy tests such as `paperService.spec.ts`, `paperHitTesting.spec.ts`, `selectionMask.spec.ts`, `SvgCanvas.gridLabels.spec.ts`, `canvasToolControllers.spec.ts`, and `renderService.spec.ts` as appropriate to the new boundary.

### Full cadence

Run the mandatory validation cadence where scripts exist:

- Root lint: `npm run lint`.
- Frontend lint: `npm run lint --workspace=frontend` if defined.
- Backend lint if defined and relevant to root cadence.
- Focused Vitest command covering the canvas-presentation, interaction-query, grid, adapter, selection-mask, canvas grid-label, and Wave 006a controller boundary tests.
- Full Vitest at root: `npm run test`.
- Full frontend Vitest: `npm run test --workspace=frontend`.
- Backend tests if workspace scripts remain part of the root cadence.
- Root build: `npm run build`.
- Frontend build: `npm run build --workspace=frontend`.
- Backend build if defined.
- Frontend Playwright/e2e: `npm run test:e2e --workspace=frontend` for this frontend/user-observable rendering change.

If existing project-level blockers unrelated to Wave 007 still prevent a full command from passing, the implementation log must capture the failure, classify it with evidence, and provide compensating focused/live verification. Failures attributable to Wave 007 reject the implementation.

### E2E / live Playwright behavior

E2E or live Playwright smoke coverage must exercise user-observable 2D canvas behavior affected by the read-model extraction:

- basic construction flows;
- selection and hover/hit behavior;
- snap-adjacent behavior and snap-point output;
- point move/drag behavior;
- properties/style/visibility behavior;
- guide and sibling-guide behavior;
- intersection behavior;
- dynamic projection planes and active-plane switching/emphasis;
- grid/label display;
- undo/redo after construction/move/style operations;
- projected-3D-on-2D toggle/output if retained.

### Live preview refresh

At the end of a successful implementation/validation wave, refresh the live preview server with the frontend dev server bound to `0.0.0.0`, probe `http://127.0.0.1:5173/`, and record reachability evidence in `implementation-log.md`.

## Accepted residual risks

- Proposal Restructure is larger than Proposal Direct. This is accepted because the broader canvas presentation boundary better fits the actual leak surface, but implementation must stay read-only and avoid app-shell/3D scope creep.
- Focused selector/query tests may carry more confidence than existing full-suite/e2e tests if unrelated pre-existing blockers remain. This is accepted only if failures are captured, classified, and supplemented by live Playwright smoke evidence.
- `CanvasPresentationSelector` could become a new god-module if responsibilities are not split. This risk is mitigated by requiring separate model, selector traversal, style policy, visibility policy, grid selector, interaction query, and renderer adapter modules.
- Projected 3D-on-2D DTO output may expose overlap with Wave 008. This is accepted only for the current 2D canvas projection read output; `ThreeView.vue` scene extraction remains Wave 008.

## Implementation constraints

- Do not modify or reintroduce UI command-construction responsibilities solved by Waves 006a/006b. Style mutations, point movement, construction commands, undo/redo, panel actions, and toolbar actions must continue through their established application/controller boundaries.
- Do not pull in Wave 008 `ThreeView.vue` / Three.js scene-adapter work.
- Do not pull in Wave 009 app-shell lifecycle, persistence, keyboard, or project orchestration extraction.
- Do not preserve legacy behavior through compatibility shims, overloads, or parallel old/new rendering paths.
- Do not mark the wave complete while any item in the DELETE list remains active without a reviewed mini-cycle changing this decision.
- The implementation log must enumerate source files changed, deleted legacy surfaces/tests/fixtures, validation commands/log paths, residual risks, preview refresh/probe evidence, and any newly observed architectural issues for future waves.

## Next implementation scope

The next stage should be `cycle-007-implement-2d-rendering-selectors-adapters` (or equivalent active implementation stage name) implementing Proposal Restructure exactly as recorded above. Any deviation from this decision requires a delta proposal and one bounded review round before source changes proceed.
