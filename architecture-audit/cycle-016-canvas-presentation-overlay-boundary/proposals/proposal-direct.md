# Proposal Direct — Canvas presentation read ports and explicit overlay interaction ownership

## Summary

Implement the newly added Wave 016 wave-plan entry as the preferred bounded candidate for review round 02. The direct implementation keeps the existing 2D and 3D presentation architecture, but sharpens its seams: introduce narrow read ports for canvas selectors, remove `any` helper seams, split projected-3D-on-2D selection into an explicit adapter, and make 3D overlay pointer behavior deliberate and test-covered.

## Files to change

- `frontend/src/application/canvasPresentation/CanvasPresentationController.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
- `frontend/src/application/canvasPresentation/CanvasPresentationModel.ts`
- `frontend/src/application/canvasPresentation/CanvasInteractionQuery.ts`
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
- `frontend/src/application/canvasPresentation/CanvasStylePolicy.ts`
- new `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts` or equivalent narrow port module
- new `frontend/src/application/canvasPresentation/Projected3DCanvasSelector.ts` or equivalent adapter
- `frontend/src/application/threePresentation/ThreePresentationModel.ts` only if shared overlay/projection DTO types need to move out of the selector
- `frontend/src/rendering/threeView/*` only for explicit pointer-event/overlay boundary behavior
- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/components/panels/ThreeView.vue`
- `frontend/src/domain/presentation/Paper.ts`
- focused tests under `frontend/tests/unit/application/canvasPresentation/` and current e2e contract tests if overlay behavior changes

## Files/tests/docs/fixtures to DELETE

- Delete `CanvasPresentationSelector` helper signatures that use `any`, specifically the untyped primitive/kind and plane-transform helper seams evidenced at `CanvasPresentationSelector.ts:76-77`.
- Delete direct projected-3D rendering loops from `CanvasPresentationSelector.ts` if moved into a named `Projected3DCanvasSelector`.
- Delete mutable/spatial-query code from `frontend/src/domain/presentation/Paper.ts` if static search proves current hit-testing/query ownership has moved to `CanvasInteractionQuery` and tests do not require the old `Paper` collection/query class.
- Delete obsolete tests that assert selectors require a concrete `World` rather than a narrow read port; replace with selector-port tests.
- Delete e2e workarounds that deliberately avoid overlay interception if the implementation makes the overlay non-intercepting where it visually should not own input.

## Expected behavior change

- Rendering output should remain visually equivalent.
- User input in the 2D canvas/3D overlay overlap should become intentional and testable. If the 3D overlay is decorative/non-interactive over that region, it should not intercept 2D canvas pointer events. If it is intentionally interactive, the behavior and e2e click regions should encode that contract explicitly.
- No command, persistence, app-shell lifecycle, or backend behavior should change.

## Architecture outcome

- Canvas selectors consume a narrow read port instead of a full mutable `World`.
- 2D primitive selection, projected-3D-on-2D projection, hit/query input, style policy, and visibility policy have named owners.
- Broad `any` seams in active presentation code are deleted rather than suppressed.
- 3D overlay event behavior is owned by the rendering/runtime layer instead of being a hidden e2e coordinate hazard.

## No-backcompat / aggressive-deletion rationale

The current priority gives no weight to preserving obsolete intermediate APIs. If the mutable `Paper` query collection or concrete-World selector API is no longer the active architecture, delete or narrow it rather than wrapping it. If e2e tests only encode old overlay workarounds, delete/rewrite them as current behavior contracts.

## Risks

- Over-scoping into a broad rendering redesign would repeat old god-module extraction work. Keep changes limited to current presentation ports, projected-3D adapter ownership, `any` deletion, and overlay pointer contract.
- Making the 3D overlay non-intercepting could break legitimate 3D interaction if such interaction exists; implementation must inventory current 3D pointer handlers before changing CSS/event behavior.
- Removing `Paper` query methods requires a static usage scan and focused tests to prove `CanvasInteractionQuery` is the active owner.

## Validation plan

1. Static scans for `CanvasPresentationSelector` full-`World`/`any` seams and `Paper` query usage before and after.
2. Focused Vitest for `CanvasPresentationSelector`, `Projected3DCanvasSelector`, `CanvasInteractionQuery`, and any shared DTO/port module.
3. Focused e2e or Playwright live-browser check for clicking the previously overlay-intercepted canvas area, if pointer behavior changes.
4. Root/frontend lint.
5. Full root/frontend Vitest.
6. Root/frontend build.
7. Root/frontend e2e if any user-observable overlay/canvas interaction changes.
8. Refresh live preview on `0.0.0.0:5173` and capture HTTP 200 reachability plus live browser evidence.

## Relationship to wave-plan entry

This proposal is the preferred bounded implementation of the new `architecture-audit/wave-plan.md` Wave 016 entry. It should be reviewed again in `cycle-016-review-round-02` after corrections; implementation may proceed only after the corrected wave-plan entry and this proposal are accepted by the bounded review/decision path.
