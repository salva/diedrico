# Cycle 017 Proposal Direct — Add a 3D presentation read port and align realization adapters

## Summary

Introduce a narrow `ThreeWorldReadPort` for active 3D presentation, keep selectors responsibility-split, and reuse/align the existing canvas read-port realization capabilities so active 2D and 3D presentation no longer have two different raw-`World` access patterns. This is the smallest implementation that closes the next central post-Wave-016 boundary without redesigning the domain realization model.

## Files to change

- `frontend/src/application/threePresentation/ThreePresentationModel.ts` — replace `ThreePresentationInput.world: World` with `readPort: ThreeWorldReadPort` or equivalent narrow input type.
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` (new) — define the read port and `createThreeWorldReadPort(world)` adapter.
- `frontend/src/application/threePresentation/ThreePresentationController.ts` — accept/pass the read port input.
- `frontend/src/application/threePresentation/ThreePresentationSelector.ts` — pass the read port to concern-specific selectors.
- `frontend/src/application/threePresentation/ProjectionPlane3DSelector.ts` — consume read-port methods for projection planes, 3D realizations, grid inputs, and plane lookup instead of full `World`.
- `frontend/src/application/threePresentation/PlanarElement3DSelector.ts` — consume read-port methods for planes, plane realizations, and 2D element realization.
- `frontend/src/application/threePresentation/ReconstructedElement3DSelector.ts` — consume read-port methods for 3D point/line/segment/plane collections and realizations.
- `frontend/src/application/threePresentation/Guide3DSelector.ts` and `Hinge3DSelector.ts` — consume only the read capabilities they need.
- `frontend/src/components/panels/ThreeView.vue` — wrap injected `World` with `createThreeWorldReadPort(world)` at the runtime boundary, analogous to Wave 016 canvas wrapping.
- `frontend/src/rendering/threeView/ThreeViewRuntime.ts` — update the refresh input type only; no scene-host redesign.
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts` — only if needed to share small realization adapter types or helper functions; no broad canvas selector rewrite.
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts` — optional tiny deletion of the `world as World` cast only if a narrow visibility/process-tree read port naturally falls out of the shared read-port contract.
- `frontend/tests/unit/application/threePresentation/*.spec.ts` — update/add focused read-port tests and replace selector-spy `as any` only where the constructor/input types change.
- `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts` — update only if shared realization helper types alter the canvas read-port contract.
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts` — update boundary assertion if `ThreeView.vue` now imports the read-port adapter.

## Files/tests/docs/fixtures to DELETE

- Delete `ThreePresentationInput.world: World` as a public application-presentation API.
- Delete direct full-`World` selector method signatures in `ThreePresentationSelector`, `ProjectionPlane3DSelector`, `PlanarElement3DSelector`, `ReconstructedElement3DSelector`, `Guide3DSelector`, and `Hinge3DSelector` where a read port is sufficient.
- Delete three-presentation unit-test `as any` constructor/input workarounds that only exist because selectors accept broad concrete dependencies.
- Delete any duplicate helper functions introduced during transition; keep one 3D read-port adapter path.
- Delete the `CanvasVisibilityPolicy` `world as World` cast only if replaced with a typed visibility/process-tree capability in the same bounded change.
- Do not delete scene-host, OrbitControls, package scripts, e2e specs, command/persistence code, or unrelated dirty files.

## Expected behavior change

No intentional user-visible behavior change. The 3D view should render the same projection planes, grids, reference axes, planar elements, reconstructed 3D objects, guides, and hinge lines. The architectural behavior changes: 3D presentation selectors receive explicit read capabilities instead of a mutable `World`, and tests can mock those capabilities without broad `any` casts.

## No-backcompat / aggressive-deletion rationale

Backward compatibility for internal full-`World` selector APIs has no value. Delete the full-`World` presentation API rather than preserving wrappers or overloads. If tests or helper code depend on raw `World` inputs only to observe traversal internals, replace them with read-port contract tests rather than adapting them through compatibility shims.

## Risks

- A too-large `ThreeWorldReadPort` could become a renamed `World` facade. Mitigation: methods must correspond to selector-owned read needs and should be grouped/named by presentation use, not by mirroring all `World` methods.
- Sharing canvas and 3D read-port code could overreach into a broad presentation snapshot god-module. Mitigation: direct path may share tiny realization helper types but must not introduce a global snapshot factory.
- Realization methods still ultimately call domain entities with a context. This direct path accepts that as an adapter detail and focuses on application-presentation dependency direction.
- Tightening test types may reveal stale expectations; delete stale test seams rather than restoring full-World APIs.

## Validation plan

1. Pre-edit static scan: `grep -RIn "ThreePresentationInput.*world\|select(world: World\|World'" frontend/src/application/threePresentation frontend/src/rendering/threeView frontend/src/components/panels/ThreeView.vue` plus scan for `as any` in touched tests.
2. Focused Vitest: `npm run test --workspace=frontend -- frontend/tests/unit/application/threePresentation frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts` (adjust exact Vitest filter to existing script behavior).
3. Root lint and frontend lint where defined.
4. Full root and frontend Vitest.
5. Root and frontend build.
6. Root and frontend Playwright e2e because the 3D/rendering path is user-observable.
7. Refresh preview on `0.0.0.0:5173`, capture HTTP 200, and run focused live browser evidence that the 3D panel renders and canvas/projected elements still appear.

## Residuals intentionally deferred

- `ThreeSceneHost` camera/OrbitControls/lights/animation ownership remains a possible later scene-interaction wave.
- A deeper domain-level realization context redesign remains possible if read-port adapters still duplicate too much; that is the restructure alternative below, not part of the smallest direct path unless review chooses it.
- Broader `styleService`/process-tree visibility ownership remains deferred unless the tiny cast deletion is naturally included.
