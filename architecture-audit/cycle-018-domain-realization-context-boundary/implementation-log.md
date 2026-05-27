# Cycle 018 Implementation Log — Domain realization context boundary

## Scope and source-control reconciliation

Implemented the decision-selected direct path from `decision-post-017.md` / `proposal-direct.md` only. The implementation touched the realization-context contracts, the canvas/three context binders, one projection-plane utility signature, and the two known collection-traversal realization paths.

Path-scoped diff/status was used because broad `git status` is too noisy in this workspace. Scoped reconciliation is captured in `validation/scoped-source-control-reconciliation.stdout`.

Protected unrelated dirty production files remained out of scope and were not read for implementation, staged, reverted, or depended on:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`

No backend, docs/specs, package/tooling, persistence/schema/replay, command history/producer redesign, scene-host/OrbitControls/CSS/pointer behavior, app-kernel facade, Drive/auth, or UI feature work was touched.

## Source files changed

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
  - Split the former broad `ProjectionElementRealizationContext` into explicit lookup capabilities:
    - `ProjectionElementLookupContext`
    - `ProjectionRealizationLookupContext`
    - default `ProjectionElementRealizationContext` = lookup + realization lookup only
    - `ProjectionRealizationCollectionContext` for collection traversal
    - `ProjectionElementDiagnosticRealizationContext` for explicitly collection-aware diagnostic realization paths
    - `HingeLineRealizationContext` for hinge realization paths that need collection diagnostics
  - `getAllProjectionPlanes()` and `getAllHingeLines()` were removed from the default realization context.
  - `ProjectionPlaneRealizationContext`, `Element3DRealizationContext`, and `PlaneEquationRealizationContext` now explicitly compose narrow lookup interfaces instead of extending a full broad context.
  - `ProjectionPlaneMutationContext` remains separate and continues to add mutation-only capabilities (`getNextId`, label generation, dependency service, `markDirty`, sibling-plane query) on top of read-only realization/owner lookup.
  - Added `requireProjectionRealizationCollections(...)` as a narrow assertion for the two existing collection-diagnostic realization paths instead of broadening the default context.
- `frontend/src/application/presentation/WorldRealizationContext.ts` (new)
  - Tiny pure `World` → realization-context binder for lookup and realization lookup only.
  - Does not expose `getWorld()`, selector DTOs, app-shell state, command state, persistence, renderer lifecycle, style/visibility policy, or a generic read-model/app-kernel facade.
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - Deleted duplicate canvas-local `createCanvasRealizationContext` binder body.
  - Uses the shared narrow binder while preserving public `CanvasWorldReadPort` methods: `getCanvasPlaneTransforms`, `getPlaneCanvasItems`, `getProjected3DCanvasItems`.
- `frontend/src/application/threePresentation/ThreeRealizationContext.ts`
  - Reuses the shared narrow binder and adds only concern-supplied collection functions.
  - ThreeRealizationContext still does not directly call `world.getAllProjectionPlanes()` / `world.getAllHingeLines()`; traversal ownership remains in `ThreePlanarElementReadPort`, `ThreeGuideReadPort`, and `ThreeHingeReadPort` via supplied callbacks.
- `frontend/src/domain/world/HingeLine.ts`
  - Keeps normal realization signature compatible with `ProjectionElementRealizationContext`.
  - Requires the named collection capability only inside the structural-error diagnostic branch that logs all planes/hinges when referenced planes are missing.
- `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`
  - Keeps normal realization signature compatible with `ProjectionElementRealizationContext`.
  - Requires the named collection capability only at the T1 hinge discovery path that genuinely traverses all hinge lines.
- `frontend/src/utils/projectionPlaneUtils.ts`
  - `computeAuxiliaryPlaneLayout(...)` now requests `ProjectionRealizationCollectionContext` directly because it only needs collection traversal for layout counting and does not need realization lookup.

## Deleted / narrowed surfaces

Deleted or narrowed as approved:

- Deleted default-context `getAllProjectionPlanes()` and `getAllHingeLines()` from `ProjectionElementRealizationContext`.
- Deleted duplicate canvas binder body `createCanvasRealizationContext`.
- Removed collection traversal from the canvas realization context output.
- Converted weak broad context aliases into explicit narrow interface compositions.
- Kept collection traversal only in named capabilities (`ProjectionRealizationCollectionContext`, `ProjectionElementDiagnosticRealizationContext`, `HingeLineRealizationContext`) and only at callers that need it.

Already-deleted protected surfaces stayed deleted by static scan evidence:

- No `realize3D(world: any)` or `getPlaneEquation(world: any)` signature was reintroduced.
- No `RuntimeWorld`, `WorldReadModel`, `PresentationWorld`, `getWorld()`, `WorldInjectionKey`, `worldForView`, or `Pick<ThreeWorldReadPort...>` seam was introduced.
- Canvas public raw collection/realization seams remain absent.
- No scene-host/OrbitControls/CSS/pointer implementation was changed.

## Caller inventory

Evidence: `validation/pre-edit-static-scan.stdout`, `validation/post-edit-static-scan.stdout`.

- `realize2D(...)`: mechanically preserved across 2D element/domain/projection-plane callers; signatures remain typed against the narrowed default context. Special collection traversal in `BrokenHalfHingeLine2D.realize2D` was changed to assert the named collection capability at the exact traversal point.
- `realize3D(...)`: mechanically preserved across 3D point/line/segment/plane/hinge and presentation read ports. `HingeLine.realize3D` was changed to assert the named collection capability only for structural diagnostics when referenced planes are missing.
- `getPlaneEquation(...)`: mechanically preserved; `PlaneEquationRealizationContext` now explicitly composes lookup capabilities and does not carry default collection traversal.
- Projection-plane helper APIs: `ProjectionPlane.realizePoint2D/Line2D/Circle2D`, `FixedProjectionPlane.realize2D/3D`, and `AuxiliaryProjectionPlane.realize2D/3D` remain behaviorally unchanged. `computeAuxiliaryPlaneLayout` was changed from broad realization context to explicit collection context.
- `ProjectionElementRealizationContext`: changed; now default lookup/realization lookup only.
- `Element3DRealizationContext`: changed; now explicit narrow lookup composition, not a broad alias.
- `ProjectionPlaneRealizationContext`: changed; explicit narrow lookup composition.
- `PlaneEquationRealizationContext`: changed; explicit narrow lookup composition.
- Collection methods: changed; removed from default context and localized to named collection/diagnostic capabilities. Current in-scope consumers are three concern adapters, `HingeLine.realize3D` diagnostics, `BrokenHalfHingeLine2D.realize2D` T1 hinge lookup, `computeAuxiliaryPlaneLayout`, and raw traversal read ports that already own traversal.
- Concrete `World` imports / `any` realization contracts: static scans found no reintroduced concrete `World` realization signatures or `any` contracts in active 3D/plane realization contracts.
- Canvas/three adapter realization calls: changed mechanically to use `createWorldRealizationContext` for narrow lookup and concern-supplied collections where needed. Public read-port DTO seams unchanged.
- Deferred/out of scope: no broad realization query-service restructure, no persistence/command/app-shell redesign, no rendering behavior redesign.

## Protected boundary evidence

- Wave 017 three-presentation boundary preserved: `ThreeRealizationContext.ts` remains a binder; concern read ports own/decline traversal through callbacks; no `ThreeView`, scene host, OrbitControls, camera, renderer, CSS, layout, or overlay pointer code changed.
- Wave 028 canvas boundary preserved: `CanvasWorldReadPort` public API remains behavior-sized; `Projected3DCanvasReadPort` remains localized raw projected-3D adapter; no public raw world/collection seam added.
- Wave 025–028 raw seams remained absent by static scans for `WorldInjectionKey`, `worldForView`, `getWorld()`, generic world/read-model facades, and broad ThreeWorldReadPort picks.

## Validation log index

All logs are under `architecture-audit/cycle-018-domain-realization-context-boundary/validation/`.

Static/source-control:

- `pre-edit-static-scan.stdout` / `.stderr` — captured caller/context/collection/facade inventory before edits.
- `post-edit-static-scan.stdout` / `.stderr` — captured caller/context/collection/facade inventory after edits.
- `scoped-source-control-reconciliation.stdout` / `.stderr` — scoped source-control reconciliation and protected dirty path note.

Focused and full tests:

- `focused-vitest-initial.stdout` / `.stderr` — focused read-port/architecture suite before final build fixes; passed.
- `focused-vitest.stdout` / `.stderr` — focused read-port/architecture suite; passed (5 files, 18 tests).
- `root-vitest.stdout` / `.stderr` — root `npm run test`; passed (exit 0).
- `frontend-vitest.stdout` / `.stderr` — frontend full Vitest; passed (exit 0).

Lint/build:

- `root-lint.stdout` / `.stderr` — root `npm run lint`; passed.
- `frontend-lint.stdout` / `.stderr` — frontend `npm run lint --workspace=frontend`; passed.
- `frontend-build-initial.stdout` / `.stderr` — initial build failed because `computeAuxiliaryPlaneLayout` still used broad context after collection removal; fixed by typing it as `ProjectionRealizationCollectionContext`.
- `frontend-build-after-context.stdout` / `.stderr` — frontend build passed after helper fix.
- `root-build.stdout` / `.stderr` — root `npm run build`; passed.
- `frontend-build.stdout` / `.stderr` — frontend `npm run build --workspace=frontend`; passed.
- `frontend-build-after-explicit-contexts.stdout` / `.stderr` — final build after making aliases explicit; passed.

E2E and overlay pointer-boundary evidence:

- `root-e2e.stdout` / `.stderr` — root `npm run test:e2e`; passed (10/10), including `current-ui-contract.spec.ts` overlay pointer-boundary test.
- `frontend-e2e.stdout` / `.stderr` — frontend `npm run test:e2e --workspace=frontend`; passed (10/10), including the overlay pointer-boundary test.

Live preview / browser smoke:

- `live-preview.stdout` / `.stderr` — refreshed Vite dev server bound by `npm run dev --workspace=frontend -- --host 0.0.0.0`.
- `live-preview.pid` — PID of the refreshed live preview server.
- `live-preview-probe.stdout` / `.stderr` — HTTP 200 from `http://127.0.0.1:5173/` after refresh.
- `live-browser-smoke.stdout` / `.stderr` — first smoke script failed due CommonJS named import; harness/script error, not source-attributable.
- `live-browser-smoke-fixed.stdout` / `.stderr` — second smoke used wrong historical test id (`canvas-svg`), not source-attributable.
- `live-browser-smoke-current-ui.stdout` / `.stderr` — credential-free browser smoke passed: SVG canvas visible, 2 circles rendered, 3D overlay visible, overlay pointer-events `auto`.

## Residual risks and notes

- TypeScript structural typing can still allow callers to pass an object with more capability than requested. Mitigated by removing collection members from the default interface, isolating named collection capabilities, and static scans.
- `requireProjectionRealizationCollections` throws if the special diagnostic paths receive a default-only context. Current adapter paths that can reach these branches supply collection-capable three contexts or full mutation/world contexts; ordinary canvas read-port realization no longer exposes collection traversal by default. This is acceptable because the assertion localizes the exceptional capability instead of broadening all realization algorithms.
- Build warnings about large chunks are pre-existing package/build behavior and not attributable to this wave.

## Next-wave candidates

- Domain debug logging remains noisy in several realization algorithms (`Plane3DFromTraces`, `Line3DFromProjections`, `BrokenHalfHingeLine2D`). A future wave could separate domain diagnostics from console side effects.
- Structural interface compatibility could be further hardened with architecture guard tests that parse `ProjectionPlaneContext.ts` and forbid collection methods on default contexts.
