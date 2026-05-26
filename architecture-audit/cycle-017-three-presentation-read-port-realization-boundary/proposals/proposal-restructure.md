# Cycle 017 Proposal Restructure — Promote presentation realization to a shared domain read-context boundary

## Summary

Solve the same risk one conceptual layer higher: define a domain/application presentation realization context that is shared by canvas and 3D presentation. Rather than adding a separate `ThreeWorldReadPort` beside `CanvasWorldReadPort`, this path creates a small `PresentationWorldReadContext` / realization reader boundary with explicit 2D, 3D, plane, visibility, and collection capabilities. Canvas and 3D selectors consume slices of that context, and concrete `World` is wrapped once at the presentation boundary.

## Files to change

- `frontend/src/application/presentation/PresentationWorldReadContext.ts` or similarly named module (new) — owns the shared read-context interfaces and `createPresentationWorldReadContext(world)` adapter.
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts` — either becomes a canvas-specific type alias/slice over the shared context or is deleted/replaced by the shared context slice.
- `frontend/src/application/canvasPresentation/CanvasPresentationController.ts`, `CanvasPresentationSelector.ts`, `Projected3DCanvasSelector.ts`, and `CanvasVisibilityPolicy.ts` — consume the relevant context slice instead of the bespoke canvas read port where practical.
- `frontend/src/application/threePresentation/ThreePresentationModel.ts`, `ThreePresentationController.ts`, `ThreePresentationSelector.ts`, `ProjectionPlane3DSelector.ts`, `PlanarElement3DSelector.ts`, `ReconstructedElement3DSelector.ts`, `Guide3DSelector.ts`, and `Hinge3DSelector.ts` — consume context slices rather than full `World`.
- `frontend/src/components/workspace/SvgCanvas.vue` and `frontend/src/components/panels/ThreeView.vue` — create the shared presentation context at the component/runtime boundary.
- `frontend/src/rendering/threeView/ThreeViewRuntime.ts` — update refresh input to the shared context slice.
- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts` — only if the reviewed design proves a small exported read-context alias can reuse existing domain interfaces without pulling application concerns into domain.
- Focused tests under `frontend/tests/unit/application/canvasPresentation/`, `frontend/tests/unit/application/threePresentation/`, and `frontend/tests/unit/components/panels/`.

## Files/tests/docs/fixtures to DELETE

- Delete bespoke `CanvasWorldReadPort` adapter code if it becomes a duplicate wrapper around the shared presentation context.
- Delete `ThreePresentationInput.world: World` and all full-`World` three-presentation selector signatures.
- Delete duplicate 2D/3D realization adapter methods if the shared context can express them once.
- Delete the `CanvasVisibilityPolicy` cast from narrow world to `World` by giving visibility a typed process-tree/visibility context.
- Delete touched tests that assert concrete `World` reaches selectors or use `as any` solely to bypass broad selector dependencies.
- Delete any transitional compatibility overloads or dual adapter paths before the wave completes.

## Expected behavior change

No intentional user-visible behavior change. Internally, the presentation layer gets a single named read-context boundary that can support both 2D canvas and 3D presentation without each path inventing its own mini-`World` facade.

## No-backcompat / aggressive-deletion rationale

The old internal selector APIs are not public contracts. This path deletes parallel full-`World`, canvas-read-port, and 3D-read-port entry points and preserves only the reviewed shared context. It also deletes compatibility overloads and stale tests rather than maintaining two presentation access models.

## Risks

- The shared context can become a new god-module if it absorbs every selector concern. Mitigation: define small interfaces/slices per selector group and compose them structurally; avoid a large class with behavior.
- Touching both canvas and 3D presentation increases validation surface and regression risk compared with the direct path.
- Pulling `ProjectionPlaneContext` into application presentation could invert dependencies if done carelessly. The shared context should live in application unless a pure domain interface is genuinely dependency-free.
- The restructure may be too broad for one wave if it forces many canvas selector rewrites beyond adapter types. If review sees that risk as high, choose the direct proposal.

## Validation plan

1. Pre-edit static scans for canvas and 3D full-`World` presentation APIs, duplicate read-port adapters, `CanvasVisibilityPolicy` casts, and touched-test `as any` seams.
2. Focused Vitest for all touched canvas-presentation and three-presentation modules, plus component shell boundary tests for `SvgCanvas.vue`/`ThreeView.vue` if import boundaries change.
3. Root/frontend lint.
4. Full root/frontend Vitest.
5. Root/frontend build.
6. Root/frontend Playwright e2e because both 2D and 3D presentation paths are user-observable.
7. Live preview refresh/probe and focused live browser evidence covering both 2D canvas rendering and 3D panel rendering.

## When to choose this over direct

Choose restructure only if review agrees the remaining `CanvasWorldReadPort` delegation and 3D full-`World` selectors are two symptoms of the same missing presentation read-context abstraction, and that a small composed context can be implemented without creating a god snapshot. Otherwise choose the direct `ThreeWorldReadPort` path and leave deeper realization-context convergence as a future wave.
