# Wave 007 Proposal Restructure — Extract a canvas presentation read model before renderer adapters

## Summary

The direct proposal extracts 2D render selectors around the existing Paper/SVG pipeline. This restructure proposal asks whether the right abstraction is one conceptual layer higher: a **canvas presentation read model** that owns all canvas-visible read concerns, with rendering, hit-testing, grid labels, hover/snap affordances, and properties-target resolution as separate consumers of the same DTOs. This avoids creating a narrow render-only selector that still leaves `SvgCanvas.vue` coordinating raw domain queries for grid, hit, snap, and properties behavior.

This proposal is larger than the direct proposal but may be the cleaner architectural move because the current leak is not only Paper/SVG rendering; it is the entire 2D canvas read path consuming raw domain internals.

## Target architecture after this proposal

```text
SvgCanvas.vue
  ├─ UI shell: DOM events, refs, viewport composable, existing Wave 006a command controller
  ├─ CanvasPresentationController / useCanvasPresentation(world, uiState)
  ├─ SvgCanvasRenderer renders CanvasPresentationModel.svgItems
  └─ CanvasInteractionQuery answers hit/snap/properties queries from model.queryItems

frontend/src/application/canvasPresentation/*
  ├─ CanvasPresentationModel.ts      # shared read DTOs for rendering + interaction
  ├─ CanvasPresentationSelector.ts   # raw World traversal and realization lookup
  ├─ CanvasStylePolicy.ts            # visual style and active-plane emphasis
  ├─ CanvasVisibilityPolicy.ts       # current subprocess/visualStyle visibility behavior
  ├─ CanvasGridSelector.ts           # active-plane grid and label model
  ├─ CanvasInteractionQuery.ts       # hit/snap/properties target lookup from DTOs
  └─ CanvasPresentationController.ts # thin composition facade for Vue

frontend/src/services/rendering2d/*
  ├─ PaperPrimitiveAdapter.ts        # optional compatibility adapter for existing primitive shapes
  └─ SvgCanvasRenderer.ts           # DTO/Paper primitive to SVG attribute mapping
```

The key difference from Proposal Direct is that grid generation, snap-target updates, hit testing, and properties-target lookup are not treated as side effects of the Paper abstraction. They become part of a canvas presentation read model built once per world/view state change.

## Why this may be conceptually better

Current evidence shows several raw-domain reads are outside the `PaperService.generatePrimitives()` call:

- `SvgCanvas.vue` computes active-plane grid and labels directly from `world.getActivePlaneId()`, `world.getProjectionPlaneById()`, and `plane.realize2D(world)` (`frontend/src/components/workspace/SvgCanvas.vue:677`-`706`, `:836`-`:854`).
- `SvgCanvas.vue` calls `Paper.hitTest(..., world, selectionMask)` for selection, drag, properties, hover, and snap preview (`frontend/src/components/workspace/SvgCanvas.vue:1212`-`1227`, `:1350`-`:1357`, `:1411`-`:1418`, `:1531`-`:1547`).
- `Paper.ts` itself reaches back into `world.projectionPlanes` and active-plane realizations for hit behavior (`frontend/src/domain/presentation/Paper.ts:331`-`340`, `:363`, `:403`-`:441`).
- `PaperService.ts` mixes raw-domain traversal, style/visibility, primitive conversion, projected-3D inclusion, and special cases in one class (`frontend/src/services/PaperService.ts:120`-`196`, `:229`-`:653`, `:893`-`:984`).

A render-only selector would improve `PaperService` but could leave grid/hit/snap/properties as raw-domain leaks in `SvgCanvas.vue`. The restructure proposal fixes the higher-level canvas read boundary in one wave while still respecting Wave 007's 2D rendering scope.

## Files to change

### New canvas-presentation layer

- Add `frontend/src/application/canvasPresentation/CanvasPresentationModel.ts` with:
  - `CanvasPresentationModel`
  - `CanvasRenderItem`
  - `CanvasQueryItem`
  - `CanvasGridLine` / `CanvasGridLabel`
  - `CanvasPlaneTransformModel`
  - `CanvasStyleState`
  - explicit discriminants for point, line, segment, circle, guide, hinge line, arc, projected 3D point/line/segment.
- Add `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts` to build the model from `World` and UI state. This is the only new module allowed to branch on raw domain classes and call domain realization APIs for 2D canvas presentation.
- Add `frontend/src/application/canvasPresentation/CanvasStylePolicy.ts` and `CanvasVisibilityPolicy.ts` to centralize current style and visibility decisions. `CanvasVisibilityPolicy` can call current `resolveVisibility(element, world)` during this wave but renderer adapters cannot.
- Add `frontend/src/application/canvasPresentation/CanvasGridSelector.ts` to move active-plane grid computations out of `SvgCanvas.vue`.
- Add `frontend/src/application/canvasPresentation/CanvasInteractionQuery.ts` to answer hit/snap/properties queries from `CanvasQueryItem` DTOs and selection masks.
- Add `frontend/src/application/canvasPresentation/CanvasPresentationController.ts` or a composable `useCanvasPresentation.ts` as the Vue-facing facade.

### Rendering adapters and Paper cleanup

- Replace `frontend/src/services/PaperService.ts` with one or more adapter modules that map `CanvasRenderItem` to `Paper`/SVG primitives. If a compatibility adapter is temporarily needed during the same implementation, it must be deleted before the wave completes.
- Update `frontend/src/services/SVGRenderer.ts` or replace it with `SvgCanvasRenderer.ts` so adapters consume explicit viewport/canvas bounds and no longer contain TODO-based dimension behavior.
- Refactor `frontend/src/domain/presentation/Paper.ts` so it no longer imports `World` or raw domain realization types. Either keep it as a pure primitive collection or delete it if `SvgCanvasRenderer` can render directly from canvas DTOs.

### Canvas component

- Update `frontend/src/components/workspace/SvgCanvas.vue` to delegate:
  - primitive/render buckets to the canvas presentation model;
  - grid lines/labels to `CanvasGridSelector` output;
  - selection/hover/snap/properties hit resolution to `CanvasInteractionQuery`;
  - style mutations to the existing Wave 006a `canvasToolController.updateElementStyle()` path.
- Remove direct world traversal for rendering/grid/hit behavior from the component.

### Tests

- Add `frontend/tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts` for end-to-end model construction from a test world.
- Add `frontend/tests/unit/application/canvasPresentation/canvasInteractionQuery.spec.ts` for selection-mask/hit/snap/properties behavior.
- Add `frontend/tests/unit/application/canvasPresentation/canvasGridSelector.spec.ts` for active-plane grid output currently embedded in `SvgCanvas.vue`.
- Add/adjust renderer adapter tests under `frontend/tests/unit/services/`.
- Update/delete old Paper/RenderService tests as below.

## Files/tests/docs/fixtures to DELETE

- Delete `frontend/src/services/RenderService.ts` and obsolete `frontend/tests/unit/services/renderService.spec.ts` if the latter only protects the test-only production service.
- Delete or radically shrink `frontend/src/services/PaperService.ts`; no method that traverses `World`, calls `resolveVisibility`, realizes elements, or branches on raw domain classes should remain in a renderer adapter.
- Delete `Paper.hitTest(world, ...)` from `frontend/src/domain/presentation/Paper.ts`; replace with `CanvasInteractionQuery`. No compatibility overload should remain.
- Delete direct grid-domain realization code from `SvgCanvas.vue` once `CanvasGridSelector` exists.
- Delete direct canvas rendering access to raw domain internals replaced by `CanvasPresentationSelector`, including direct `world.projectionPlanes` iteration in rendering code and direct `paperService.generatePrimitives(context)` calls.
- Delete rendering TODO branches and debug output made obsolete by the canvas presentation model: `visible: true // TODO` branches in `PaperService` (`frontend/src/services/PaperService.ts:238`, `:343`, `:437`, `:610`), missing-element TODOs (`frontend/src/services/PaperService.ts:202`, `:888`), `SVGRenderer` viewport TODO (`frontend/src/services/SVGRenderer.ts:220`), and normal-path render logs in `PaperService`/`SvgCanvas.vue`.
- Delete duplicate render special cases that only existed because `PaperService` simultaneously identified domain kind and rendered primitives.

## Expected behavior change

Behavior should remain user-visible equivalent, but the internal read boundary changes more substantially than the direct proposal:

- `SvgCanvas.vue` no longer performs rendering, grid, or hit-test domain computations; it consumes a canvas presentation model.
- Rendering, hit testing, snapping, properties-target lookup, style/visibility, active-plane emphasis, and grid output derive from one coherent selector snapshot, reducing drift between what is visible and what is selectable.
- Existing command/undo behavior from Waves 006a/006b is untouched; presentation DTOs are read-only and cannot mutate domain state.

## Validation plan

Use the same mandatory cadence as Proposal Direct, with focused coverage shifted to the broader canvas presentation layer:

1. Static boundary/deletion scans:
   - `SvgCanvas.vue` no longer contains direct `world.projectionPlanes` rendering iteration, direct active-plane grid realization code, `PrimitiveContext`, `paperService.generatePrimitives`, or `Paper.hitTest(... world ...)`.
   - Renderer adapters do not import raw domain classes or `World`.
   - `Paper.ts` no longer imports `World`; `RenderService.ts` is deleted if obsolete.
2. Focused Vitest:
   - `npm run test --workspace=frontend -- --run tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts tests/unit/application/canvasPresentation/canvasInteractionQuery.spec.ts tests/unit/application/canvasPresentation/canvasGridSelector.spec.ts tests/unit/services/paperService.spec.ts tests/unit/domain/paperHitTesting.spec.ts tests/unit/selectionMask.spec.ts tests/unit/components/SvgCanvas.gridLabels.spec.ts tests/unit/application/canvasToolControllers.spec.ts`
3. Full Vitest, lint, build, e2e, live preview refresh/probe, and live Playwright smoke exactly as required by the Wave 007 validation cadence.
4. E2E/browser behavior must explicitly cover construction/selection/snap-adjacent/undo-redo, style/visibility/properties, guide/intersection, dynamic planes, active-plane/grid behavior, and projected-3D toggle if retained.

## Risks and mitigations

- **Risk: scope creep into Wave 009.** Mitigate by limiting the controller/composable to read-only canvas presentation; do not move project lifecycle, keyboard routing, persistence, or app shell services.
- **Risk: scope creep into Wave 008.** Mitigate by representing current projected-3D-on-2D output only; do not refactor `ThreeView.vue` scene adapters.
- **Risk: too much change for one cycle.** Mitigate by keeping the model DTOs narrow and by preserving SVG output via an adapter if possible, while still deleting compatibility shims before completion.
- **Risk: one selector god-module replaces `PaperService`.** Mitigate with separate modules for model types, selector traversal, style policy, visibility policy, grid selector, interaction query, and rendering adapter.
- **Risk: hit/select mismatch.** Mitigate by deriving visible render items and query items from the same selector snapshot and adding focused tests that assert invisible/non-active/non-mask-matching elements are not hit.

## Recommendation

Prefer this restructure proposal if reviewers agree that grid/hit/snap/properties raw-domain reads are part of the same architectural leak as 2D rendering. Prefer Proposal Direct if the implementation must be smaller and reviewers accept leaving grid extraction as a documented residual. Under the project priorities, the restructure proposal is architecturally cleaner because it avoids a partial selector boundary that fixes visual rendering while preserving raw-domain canvas interaction reads.
