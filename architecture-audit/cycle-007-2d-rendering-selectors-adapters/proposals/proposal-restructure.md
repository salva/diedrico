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
  ├─ CanvasPresentationModel.ts      # shared read DTOs for rendering + interaction + grid/labels
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
  - `CanvasSnapPoint` / snap-output DTOs for current snap-preview and construction-input behavior
  - `CanvasPlaneTransformModel`
  - `CanvasStyleState`
  - explicit discriminants for point, infinite line, finite segment, circle, guide, sibling guide, hinge line, half-hinge line, arc, and projected 3D point/line/segment. Query DTOs must not collapse finite segments into unbounded line-like geometry.
- Add `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts` to build the model from `World` and UI state. This is the only new module allowed to branch on raw domain classes and call domain realization APIs for 2D canvas presentation.
- Add `frontend/src/application/canvasPresentation/CanvasStylePolicy.ts` and `CanvasVisibilityPolicy.ts` to centralize current style and visibility decisions. `CanvasVisibilityPolicy` can call current `resolveVisibility(element, world)` during this wave but renderer adapters cannot.
- Add `frontend/src/application/canvasPresentation/CanvasGridSelector.ts` to move active-plane grid computations out of `SvgCanvas.vue`.
- Add `frontend/src/application/canvasPresentation/CanvasInteractionQuery.ts` to answer hit/snap/properties queries from `CanvasQueryItem` DTOs and selection masks. The query contract must preserve current `Paper.hitTest()` behavior for points, infinite lines, finite segments, circles, guides, sibling guides, hinge lines, half-hinge lines, active-plane filtering, selection-mask filtering, closest-element priority, and snap-point output. Segment matching must remain finite; line-like guides/hinges must remain pickable only through the active-plane realization semantics that currently make them pickable.
- Add `frontend/src/application/canvasPresentation/CanvasPresentationController.ts` or a composable `useCanvasPresentation.ts` as the Vue-facing facade.

### Rendering adapters and Paper cleanup

- Replace `frontend/src/services/PaperService.ts` with one or more adapter modules that map `CanvasRenderItem` to `Paper`/SVG primitives. If a compatibility adapter is temporarily needed during the same implementation, it must be deleted before the wave completes. Renderer adapters must not import `World`, projection-plane classes, concrete domain element classes, or domain realization types.
- Update `frontend/src/services/SVGRenderer.ts` or replace it with `SvgCanvasRenderer.ts` so adapters consume explicit viewport/canvas bounds and no longer contain TODO-based dimension behavior.
- Refactor `frontend/src/domain/presentation/Paper.ts` so it no longer imports `World`, projection-plane classes, concrete domain element classes, or raw domain realization types, and no longer performs raw realization traversal. Either keep it as a pure primitive collection or delete it if `SvgCanvasRenderer` can render directly from canvas DTOs.

### Canvas component

- Update `frontend/src/components/workspace/SvgCanvas.vue` to delegate:
  - primitive/render buckets to the canvas presentation model;
  - grid lines/labels to `CanvasGridSelector` output;
  - selection/hover/snap/properties hit resolution to `CanvasInteractionQuery`;
  - style mutations to the existing Wave 006a `canvasToolController.updateElementStyle()` path.
- Remove direct world traversal for rendering/grid/hit behavior from the component.

### Tests

- Add `frontend/tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts` for end-to-end model construction from a test world, including render/query DTOs for points, infinite lines, finite segments, circles, guides, sibling guides, hinge/half-hinge lines, projected-3D output, style/visibility, active-plane emphasis, plane transforms, grid lines, and labels.
- Add `frontend/tests/unit/application/canvasPresentation/canvasInteractionQuery.spec.ts` for selection-mask/hit/snap/properties behavior, including active-plane filtering, point hits, infinite-line hits, finite-segment endpoint/interior/outside misses, circle hits, guide/sibling-guide hits, hinge/half-hinge hits, snap-point output, and closest-element priority.
- Add `frontend/tests/unit/application/canvasPresentation/canvasGridSelector.spec.ts` for active-plane grid and label output currently embedded in `SvgCanvas.vue`.
- Add/adjust renderer adapter tests under `frontend/tests/unit/services/`.
- Update/delete old Paper/RenderService tests as below.

## Files/tests/docs/fixtures to DELETE

- Delete `frontend/src/services/RenderService.ts` and obsolete `frontend/tests/unit/services/renderService.spec.ts` if the latter only protects the test-only production service.
- Delete or radically shrink `frontend/src/services/PaperService.ts`; no method that traverses `World`, calls `resolveVisibility`, realizes elements, or branches on raw domain classes should remain in a renderer adapter.
- Delete `Paper.hitTest(world, ...)` from `frontend/src/domain/presentation/Paper.ts`; replace with `CanvasInteractionQuery`. No compatibility overload should remain.
- Delete direct grid-domain realization code from `SvgCanvas.vue` once `CanvasGridSelector` exists; grid and label read-model extraction is part of Wave 007 restructure scope and is not deferred.
- Delete direct canvas rendering access to raw domain internals replaced by `CanvasPresentationSelector`, including direct `world.projectionPlanes` iteration in rendering code and direct `paperService.generatePrimitives(context)` calls.
- Delete rendering TODO branches and debug output made obsolete by the canvas presentation model: `visible: true // TODO` branches in `PaperService` (`frontend/src/services/PaperService.ts:238`, `:343`, `:437`, `:610`), missing-element TODOs (`frontend/src/services/PaperService.ts:202`, `:888`), `SVGRenderer` viewport TODO (`frontend/src/services/SVGRenderer.ts:220`), and normal-path render logs in `PaperService`/`SvgCanvas.vue`.
- Delete duplicate render special cases that only existed because `PaperService` simultaneously identified domain kind and rendered primitives, including duplicate guide/segment/half-hinge renderer branches after canvas-presentation DTOs discriminate those cases.

## Expected behavior change

Behavior should remain user-visible equivalent, but the internal read boundary changes more substantially than the direct proposal:

- `SvgCanvas.vue` no longer performs rendering, grid, or hit-test domain computations; it consumes a canvas presentation model.
- Rendering, hit testing, snapping, snap-point output, properties-target lookup, style/visibility, active-plane emphasis, and grid/label output derive from one coherent selector snapshot, reducing drift between what is visible and what is selectable. Current pick semantics are preserved for points, infinite lines, finite segments, circles, guides/sibling guides, hinge/half-hinge line paths, active-plane filtering, and selection masks.
- Existing command/undo behavior from Waves 006a/006b is untouched; presentation DTOs are read-only and cannot mutate domain state.

## Validation plan

Use the same mandatory cadence as Proposal Direct, with focused coverage shifted to the broader canvas presentation layer:

1. Static boundary/deletion scans:
   - `SvgCanvas.vue` no longer contains direct `world.projectionPlanes` rendering iteration, direct active-plane grid realization code, `PrimitiveContext`, `paperService.generatePrimitives`, or `Paper.hitTest(... world ...)`.
   - Renderer adapters do not import `World`, projection-plane classes, concrete domain element classes, or domain realization types; raw domain imports are permitted only in canvas-presentation selector/query modules.
   - `Paper.ts`, if retained, no longer imports `World`, projection-plane classes, concrete domain element classes, or performs raw realization traversal.
   - `RenderService.ts` is deleted, or if an implementation decision temporarily retains a named file, it is proven fully unused before wave completion; the preferred outcome is deletion with no shim.
   - Rendering TODO branches, duplicate raw-domain render special cases, normal-path debug logs, and obsolete tests/fixtures are deleted rather than rewritten as compatibility paths.
2. Focused Vitest:
   - `npm run test --workspace=frontend -- --run tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts tests/unit/application/canvasPresentation/canvasInteractionQuery.spec.ts tests/unit/application/canvasPresentation/canvasGridSelector.spec.ts tests/unit/services/paperService.spec.ts tests/unit/domain/paperHitTesting.spec.ts tests/unit/selectionMask.spec.ts tests/unit/components/SvgCanvas.gridLabels.spec.ts tests/unit/application/canvasToolControllers.spec.ts`
   - Selector/model tests must assert DTO output for point, infinite-line, finite-segment, circle, guide, sibling-guide, hinge/half-hinge, projected-3D, style/visibility, active-plane emphasis, grid, labels, and plane transforms.
   - Interaction tests must assert active-plane filtering, selection masks, point/line/finite-segment/circle/guide/sibling-guide/hinge/half-hinge hits, snap-point output, properties-target lookup, closest-element priority, and misses outside finite segment extents.
3. Full Vitest, lint, build, e2e, live preview refresh/probe, and live Playwright smoke exactly as required by the Wave 007 validation cadence.
4. E2E/browser behavior must explicitly cover construction/selection/snap-adjacent/undo-redo, style/visibility/properties, guide/intersection, dynamic planes, active-plane/grid behavior, and projected-3D toggle if retained.

## Risks and mitigations

- **Risk: scope creep into Wave 009.** Mitigate by limiting the controller/composable to read-only canvas presentation; do not move project lifecycle, keyboard routing, persistence, or app shell services.
- **Risk: scope creep into Wave 008.** Mitigate by representing current projected-3D-on-2D output only; do not refactor `ThreeView.vue` scene adapters.
- **Risk: too much change for one cycle.** Mitigate by keeping the model DTOs narrow and by preserving SVG output via an adapter if possible, while still deleting compatibility shims before completion.
- **Risk: one selector god-module replaces `PaperService`.** Mitigate with separate modules for model types, selector traversal, style policy, visibility policy, grid selector, interaction query, and rendering adapter.
- **Risk: hit/select mismatch.** Mitigate by deriving visible render items and query items from the same selector snapshot and adding focused tests that assert invisible/non-active/non-mask-matching elements are not hit, finite segments remain finite, guide/sibling-guide and hinge/half-hinge paths remain pickable where current active-plane realization allows, and snap-point output remains equivalent.

## Recommendation

Prefer this restructure proposal if reviewers agree that grid/hit/snap/properties raw-domain reads are part of the same architectural leak as 2D rendering. Proposal Direct has now been tightened to include grid/label extraction, but this restructure remains the recommended path because it places rendering, grid/labels, hit/snap/properties queries, style, and visibility behind one coherent read boundary without drifting into Wave 008 `ThreeView.vue` scene-adapter work or Wave 009 app-shell extraction.
