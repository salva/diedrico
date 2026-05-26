# Wave 007 Proposal Direct — Extract 2D render selectors and keep Paper/SVG as adapters

## Summary

Implement Wave 007 by introducing a focused 2D rendering read-model/selector layer between the domain `World` and the canvas renderer. The selector owns domain traversal, realization lookup, style/visibility resolution, active-plane emphasis, projected-3D-on-2D inclusion, and hit-test/query geometry. Renderer adapters then convert those DTOs into `Paper` primitives and SVG attributes. `SvgCanvas.vue` becomes a composition/input shell over selectors, query adapters, and the existing Wave 006a command controllers.

This is the smallest direct implementation that achieves the wave target without pulling Wave 008 or Wave 009 forward.

## Target architecture after this proposal

```text
SvgCanvas.vue
  ├─ injects World only as selector input / existing command-controller input
  ├─ calls buildCanvas2DViewModel(world, uiState)
  ├─ calls PaperCanvasQuery.hitTest(viewModel.hitItems, ...)
  └─ renders SvgRenderAdapter.render(viewModel.renderItems, viewport)

frontend/src/application/rendering2d/selectors/*
  ├─ walks World/projection planes
  ├─ resolves realizations, style, visibility, active-plane emphasis
  ├─ emits explicit DTOs: Canvas2DViewModel, RenderItem2D, HitItem2D, PlaneGridModel
  └─ contains all raw domain-type branching still required for rendering decisions

frontend/src/services/PaperService.ts or replacement adapter modules
  └─ maps RenderItem2D DTOs to Paper primitives; no World traversal or style decisions

frontend/src/services/SVGRenderer.ts
  └─ maps Paper primitives/DTO primitives to SVG attributes with explicit viewport bounds

frontend/src/domain/presentation/Paper.ts
  └─ stores/query primitives or is reduced to pure primitive collection; no raw World hit-test dependency
```

## Files to change

### New selector/read-model modules

- Add `frontend/src/application/rendering2d/Canvas2DViewModel.ts` defining explicit DTOs:
  - `Canvas2DViewModel` with `renderItems`, `hitItems`, `planeTransforms`, optional `gridModel`, and metadata for active plane/view toggles.
  - `RenderItem2D` discriminated union for point, line, segment, circle, guide, hinge-line, arc, projected-3D point/line/segment, and text/label if needed.
  - `HitItem2D` discriminated union carrying source entity ID, selectable type, plane ID, plane-space geometry, paper-space geometry where needed, and selection-mask metadata.
  - `ResolvedRenderStyle2D` replacing ad hoc primitive style construction.
- Add `frontend/src/application/rendering2d/Canvas2DSelectors.ts` to build `Canvas2DViewModel` from `{ world, activePlaneId, selectedIds, hoveredId, cascadeHighlightIds, highlightedEntityIds, showProjectedElements }`.
- Add `frontend/src/application/rendering2d/VisibilitySelector.ts` or `ElementVisibilitySelector.ts` to wrap current `resolveVisibility(element, world)` behavior behind selector output. This may initially call the existing domain service, but renderers must not call it.
- Add `frontend/src/application/rendering2d/StyleSelector.ts` to centralize point/line/segment/circle/guide/hinge/projected-3D style rules currently embedded in `PaperService.ts`.
- Add `frontend/src/application/rendering2d/PaperHitQuery.ts` to perform hit testing over `HitItem2D` DTOs rather than raw `World`/active-plane iteration.

### Existing rendering services

- Refactor `frontend/src/services/PaperService.ts` into a DTO-to-primitive adapter, or replace it with:
  - `frontend/src/services/rendering2d/PaperPrimitiveAdapter.ts`
  - `frontend/src/services/rendering2d/SvgRenderAdapter.ts` if keeping `SVGRenderer` unchanged is awkward.
- Update `frontend/src/services/SVGRenderer.ts` so line clipping receives explicit viewport/canvas bounds instead of the current TODO/hard-coded dimension branch (`frontend/src/services/SVGRenderer.ts:220`).
- Reduce `frontend/src/domain/presentation/Paper.ts` to pure primitive collection/hover state or move query behavior into `PaperHitQuery`. `Paper.hitTest()` should no longer accept `World` or realize domain objects.

### Canvas component

- Update `frontend/src/components/workspace/SvgCanvas.vue` to:
  - Build a render selector input from existing UI state and `worldVersion`.
  - Consume `Canvas2DViewModel.renderItems` / Paper primitives and `SvgRenderAdapter` output for rendered buckets.
  - Use `PaperHitQuery` for selection, properties, hover, snap-preview, and drag hit behavior.
  - Keep existing Wave 006a `createCanvasToolController()` boundaries for tool execution, point movement, and style updates.
  - Remove component-owned `PrimitiveContext` creation and direct `Paper.hitTest(..., world, selectionMask)` calls.

### Tests

- Add `frontend/tests/unit/application/rendering2d/canvas2DSelectors.spec.ts` covering selector output for points, lines, segments, circles, guides, hinge lines, active-plane emphasis, selected/hovered/cascade style, visibility, z-order, projected-3D toggling, and plane transforms.
- Add `frontend/tests/unit/application/rendering2d/paperHitQuery.spec.ts` covering hit behavior previously dependent on `Paper.hitTest()`: active-plane filtering, selection masks, point/line/segment/circle/guide hits, snap points, and closest-element priority.
- Add/replace adapter tests under `frontend/tests/unit/services/` for DTO-to-Paper and Paper/SVG conversion.
- Update existing tests:
  - `frontend/tests/unit/services/paperService.spec.ts`
  - `frontend/tests/unit/services/renderService.spec.ts`
  - `frontend/tests/unit/domain/paperHitTesting.spec.ts`
  - `frontend/tests/unit/selectionMask.spec.ts`
  - `frontend/tests/unit/components/SvgCanvas.gridLabels.spec.ts`
  - `frontend/tests/unit/application/canvasToolControllers.spec.ts` static assertions if they mention old canvas rendering boundaries.

## Files/tests/docs/fixtures to DELETE

- Delete `frontend/src/services/RenderService.ts` if static search confirms it is only used by tests. Its own comments state `renderPlane()` and `renderLine()` are test-only while production uses `SVGRenderer` (`frontend/src/services/RenderService.ts:111`, `:163`), and `renderLine()` contains test-compatibility-only `planeName` fields (`frontend/src/services/RenderService.ts:181`).
- Delete `frontend/tests/unit/services/renderService.spec.ts` or rewrite it as adapter/selector coverage if it only validates the old test-only production service.
- Delete `PaperService` methods that traverse raw `World`, resolve visibility, branch on domain classes, or inspect `(line as any).arcGeometry` after equivalent selector DTO behavior exists.
- Delete rendering TODO branches replaced by selector outputs, especially `visible: true // TODO` in `PaperService` (`frontend/src/services/PaperService.ts:238`, `:343`, `:437`, `:610`) and `SVGRenderer`'s canvas-dimension TODO (`frontend/src/services/SVGRenderer.ts:220`).
- Delete normal-path `console.log`/debug output from rendering code (`frontend/src/services/PaperService.ts:146`, `:156`-`:158`; `frontend/src/components/workspace/SvgCanvas.vue:497`, `:500`, `:1094`, `:1420`, `:1674`) where touched by rendering extraction.
- Delete direct `Paper.hitTest(..., world, ...)` usage in `SvgCanvas.vue` and `Paper.ts`; do not leave a compatibility overload.
- Delete duplicate primitive special cases that exist only because `PaperService` mixes selector and adapter responsibilities, such as separate raw-domain guide/segment/half-hinge branches in renderer code after selector DTOs discriminate them.

## Expected behavior change

Intended user-visible behavior is equivalent:

- Existing 2D canvas output remains visually equivalent for points, lines, segments, circles, guides, hinge lines, arcs, projected 3D elements, selected/hovered/cascade-highlight states, active-plane emphasis, and z-order.
- Hit behavior remains equivalent for selection, hover tooltip, snap-preview, properties dialog opening, point movement, construction selection masks, and active-plane filtering.
- Style/visibility behavior becomes explicit in selector outputs instead of scattered through renderers; any current bugs revealed by tests should be fixed in selector logic rather than preserved through shims.
- Obsolete debug/test-only rendering surfaces are removed.

## Validation plan

Run and capture mandatory validation under `architecture-audit/cycle-007-2d-rendering-selectors-adapters/validation/`:

1. Static deletion/boundary scans:
   - Verify `SvgCanvas.vue` has no `Paper.hitTest(... world ...)`, no `PrimitiveContext`, and no direct `paperService.generatePrimitives(context)` path.
   - Verify renderer adapters do not import `World`, `ProjectionPlane`, or concrete domain element classes except selector modules.
   - Verify deleted `RenderService.ts` has no imports.
2. Root/workspace lint where scripts exist:
   - `npm run lint`
   - `npm run lint --workspace=frontend`
   - Note existing missing-`eslint` blocker if still present, but still capture logs.
3. Focused Vitest:
   - `npm run test --workspace=frontend -- --run tests/unit/application/rendering2d/canvas2DSelectors.spec.ts tests/unit/application/rendering2d/paperHitQuery.spec.ts tests/unit/services/paperService.spec.ts tests/unit/domain/paperHitTesting.spec.ts tests/unit/selectionMask.spec.ts tests/unit/components/SvgCanvas.gridLabels.spec.ts tests/unit/application/canvasToolControllers.spec.ts`
   - Include `tests/unit/services/renderService.spec.ts` only if rewritten rather than deleted.
4. Full Vitest:
   - `npm run test`
   - `npm run test --workspace=frontend`
   - `npm run test --workspace=backend` if backend scripts remain relevant to full cadence.
5. Build:
   - `npm run build`
   - `npm run build --workspace=frontend`
   - `npm run build --workspace=backend`
   - Capture and classify known `vue-tsc`/Node compatibility failures if still present.
6. E2E / Playwright:
   - `npm run test:e2e --workspace=frontend`
   - Must include or be supplemented by smoke/manual Playwright coverage for basic construction, selection, snap-adjacent behavior, properties/style/visibility, guide creation, intersection creation, dynamic projection planes, active-plane switching/emphasis, point move, and undo/redo.
   - If existing malformed e2e files still block collection, record the blocker and run a live Playwright smoke against the preview for canvas/rendering behavior.
7. Live preview refresh:
   - Restart `npm run dev --workspace=frontend -- --host 0.0.0.0`.
   - Probe `http://127.0.0.1:5173/` and record `HTTP 200` evidence.

## Risks and mitigations

- **Risk: hit testing changes while visual rendering passes.** Mitigate by treating hit/query DTOs as first-class selector output and adding focused `PaperHitQuery` tests before deleting old `Paper.hitTest()` behavior.
- **Risk: selector layer becomes a renamed `PaperService` god module.** Mitigate by splitting DTO types, visibility, style, domain traversal, hit query, and adapter mapping into focused modules; renderer adapters must not import raw domain classes.
- **Risk: projected 3D-on-2D output overlaps Wave 008.** Mitigate by including only the current 2D projected output selector, not Three.js scene extraction; explicitly document any residual for Wave 008.
- **Risk: Vue canvas remains too large.** Mitigate by removing rendering computations and query logic from `SvgCanvas.vue`, but leave app-shell/keyboard/lifecycle work to Wave 009.
- **Risk: existing red full-suite/e2e blockers obscure regressions.** Mitigate with strong focused selector/query/adapter tests and live Playwright smoke while still capturing full cadence logs.
