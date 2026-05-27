# Proposal Direct — Narrow the existing realization context family

## Summary

Implement Wave 018 by tightening the realization context contracts that already exist in `ProjectionPlaneContext.ts`. Current source has already deleted the oldest `Element3D.realize3D(world: any)` / `Plane.realize3D(world: any)` signatures, so the direct path should not redo that work. The current architectural smell is subtler: `ProjectionElementRealizationContext` is a broad structural context that gives every realization algorithm lookup, realization, and collection traversal capability, while canvas and three adapters maintain duplicated `World`-to-context binders.

The direct path keeps the existing architecture shape: domain elements own realization algorithms, projection planes own mutation/cache helpers, and canvas/three read-port adapters remain the only runtime boundary that wraps a concrete `World`. It narrows capabilities, deletes duplicate/parallel context shapes, and preserves Wave 017/028 presentation boundaries.

## Files to change

Primary domain contract files:

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
  - Split broad context capabilities into named read-only interfaces.
  - Keep mutation/dependency/ID generation in `ProjectionPlaneMutationContext`; do not move them into read-only realization contexts.
- `frontend/src/domain/world/Element2D.ts`
  - Type-only alignment if the base 2D context name changes.
- `frontend/src/domain/world/Element3D.ts`
  - Preserve typed `Element3DRealizationContext` result contract; update imports if context names are narrowed.
- 2D/3D realization classes only where signatures must consume narrower contexts:
  - `frontend/src/domain/world/Point.ts`
  - `frontend/src/domain/world/Line.ts`
  - `frontend/src/domain/world/Segment.ts`
  - `frontend/src/domain/world/Circle.ts`
  - `frontend/src/domain/world/Guide.ts`
  - `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`
  - `frontend/src/domain/world/Point3D.ts`
  - `frontend/src/domain/world/Line3D.ts`
  - `frontend/src/domain/world/Segment3D.ts`
  - `frontend/src/domain/world/Plane.ts`
  - `frontend/src/domain/world/HingeLine.ts`
  - `frontend/src/domain/world/BrokenHingeLine.ts`
- Projection-plane helpers only for context-type alignment, not mutation redesign:
  - `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`
  - `frontend/src/domain/world/projectionPlane/FixedProjectionPlane.ts`
  - `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts`

Presentation adapter/context-binder files:

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - Replace the duplicated canvas-local broad context binder with the selected narrow binder or context family.
  - Keep public canvas read-port methods unchanged.
- `frontend/src/application/canvasPresentation/Projected3DCanvasReadPort.ts`
  - Update `Element3DRealizationContext` import/parameter if narrowed.
  - Keep projected-3D traversal ownership localized here.
- `frontend/src/application/threePresentation/ThreeRealizationContext.ts`
  - Either delete in favor of a tiny shared binder or reduce to a three-local wrapper over the narrowed context.
  - Must not own broad collection traversal directly.
- `frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts`
- `frontend/src/application/threePresentation/ThreeGuideReadPort.ts`
- `frontend/src/application/threePresentation/ThreeHingeReadPort.ts`
  - Update concern adapters to pass the narrowest context needed and keep collection traversal owned by the concern adapter.

Optional tiny shared helper:

- New `frontend/src/application/presentation/WorldRealizationContext.ts` (name illustrative) is allowed only if it exports a small factory that binds concrete `World` to the selected domain realization-context interfaces. It must not expose selector DTOs, app-shell state, command state, persistence, style/visibility policy, renderer lifecycle, or a generic `getWorld()`.

Focused tests/guards:

- `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts`
- `frontend/tests/unit/application/canvasPresentation/projected3DCanvasSelector.spec.ts`
- `frontend/tests/unit/application/appShell/Cycle027Architecture.test.ts`
- `frontend/tests/unit/application/threePresentation/threePresentationArchitectureBoundary.spec.ts`
- `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
- Representative domain realization tests only where signatures change, such as `Point3DReconstruction.test.ts`, `Line3DReconstruction.test.ts`, `segment3DRealization.spec.ts`, `Plane3DFromTraces.test.ts`, `projectionPlaneRealization.spec.ts`, and `realizationCache.spec.ts`.

## Required DELETE list

Delete, not wrap:

- `getAllProjectionPlanes()` and `getAllHingeLines()` from the default realization context if implementation confirms they are not normal realization dependencies. If some paths need collection traversal, move them into a separately named collection/diagnostic context consumed only by those paths.
- Context aliases that merely extend the full broad context without narrowing (`ProjectionPlaneRealizationContext`, `Element3DRealizationContext`, `PlaneEquationRealizationContext`) if replaced by explicit capability interfaces.
- One of the duplicate context binder bodies (`createCanvasRealizationContext` or `createThreeRealizationContext`) if a shared tiny binder is introduced.
- Full-collection diagnostic payloads in normal realization code if they are the only reason collection methods remain on the base context, especially `HingeLine.realize3D` structural-error diagnostics.
- Touched test helper `as any`/whole-World mocks used only to satisfy weak context typing.
- Transitional overloads, compatibility aliases, dead exports, or dual old/new context APIs.

Already-deleted surfaces that must stay gone:

- `Element3D.realize3D(world: any): any`.
- `Plane.getPlaneEquation(world: any)` / `Plane.realize3D(world: any)`.
- Concrete `World` imports/signatures in active 3D realization classes.
- Broad public `ThreeWorldReadPort` selector dependency/god-interface role.
- Public canvas raw collection/realization seams deleted by Wave 028.

Do not delete docs/specs/backend/package/tooling files in this wave.

## Expected behavior change

No intentional user-visible behavior change. The implementation should be a compile-time architecture improvement:

- Normal domain realization algorithms receive only lookup/realization capabilities they need.
- Collection traversal is not part of the default context and stays owned by adapter/concern modules or explicitly named special contexts.
- Canvas and three presentation consumers keep their Wave 017/028 read-port DTO boundaries.
- 2D canvas primitives, projected 3D-on-2D items, selected guides, hinges, reconstructed 3D elements, and projection-plane/grid behavior render as before.

## Implementation sequence

1. Capture implementation-stage caller inventory and scans before source edits. Classify each active call site as changed, mechanically updated, deferred, or out of scope.
2. In `ProjectionPlaneContext.ts`, define a capability-sized context family. A likely shape:
   - `ProjectionElementLookupContext` for `getProjectionPlaneById`, `getPoint2D`, `getLine2D`, `getCircle2D`, `getHingeLineById`.
   - `ProjectionRealizationLookupContext` for `getProjectionPlane2DRealization`, `getProjectionPlane3DRealization`, `get3DPlaneRealization`.
   - `ProjectionElementRealizationContext` as the normal read-only composition of lookup + realization lookup.
   - `ProjectionCollectionContext` or `ProjectionRealizationDiagnosticContext` only if collection traversal is truly needed by realization paths.
   - `ProjectionPlaneMutationContext` remains the mutation/caching context and may extend read-only context plus mutation-only capabilities.
3. Update domain signatures to consume the narrowest context. Avoid broadening via structural aliases that recreate the old full context.
4. Decide whether a tiny shared application binder replaces duplicated canvas/three binders. If yes, keep it purely as `World` → domain context adapter. If not, at least make both binders implement the same narrowed interfaces without duplicate broad collection methods.
5. Update `CanvasWorldReadPort` and three concern adapters mechanically to pass the narrowed context and preserve their current traversal ownership.
6. Update focused tests and architecture guards to assert:
   - no `any`/concrete-`World` realization signatures return;
   - base context has no broad collection methods unless explicitly retained by reviewed rationale;
   - `ThreeRealizationContext.ts` still does not call `world.getAllProjectionPlanes()` / `world.getAllHingeLines()` directly;
   - `CanvasWorldReadPort` public raw seams remain deleted;
   - no generic `RuntimeWorld`, `WorldReadModel`, `PresentationWorld`, `getWorld()`, or app-kernel facade was added.
7. Run validation and update `implementation-log.md` with the caller inventory, changed/deleted/deferred classifications, command logs, residual risks, and preview evidence.

## Validation plan

Capture full stdout/stderr under `architecture-audit/cycle-018-domain-realization-context-boundary/validation/`:

- Static scans for:
  - `realize3D(world: any)`, `getPlaneEquation(world: any)`, concrete `World` imports in realization classes;
  - `getAllProjectionPlanes` / `getAllHingeLines` on default context definitions;
  - duplicate context binders and forbidden generic facades;
  - public canvas raw seams and broad three read-port selector dependencies.
- Focused Vitest for changed context/domain/read-port surfaces. Suggested set:
  - `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts`
  - `frontend/tests/unit/application/canvasPresentation/projected3DCanvasSelector.spec.ts`
  - `frontend/tests/unit/application/appShell/Cycle027Architecture.test.ts`
  - `frontend/tests/unit/application/threePresentation/threePresentationArchitectureBoundary.spec.ts`
  - `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
  - representative domain tests for any touched realization classes.
- Root and frontend `npm run lint` where defined.
- Root and frontend full Vitest.
- Root and frontend `npm run build`.
- Root and frontend Playwright e2e, explicitly including `frontend/tests/e2e/current-ui-contract.spec.ts` overlay pointer-boundary test.
- Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and live/browser smoke for representative 2D canvas primitives plus 3D view rendering.

## No-backcompat rationale

The old broad context shape is architectural debt, not a compatibility surface. Keeping full-context aliases or overloads would let future realization algorithms and adapters continue depending on a structural `World` surrogate. Delete old aliases/methods where the narrower contract replaces them and update active callers/tests directly.

## Risks

- Over-narrowing could miss a legitimate recursive realization need. Mitigate with caller inventory and focused domain tests before full validation.
- A shared binder could become an app-kernel facade. Mitigate by allowing only a tiny `World` → realization-context adapter and banning selector/read-model/app-shell methods.
- Collection methods may be needed for a small hinge/diagnostic path. Mitigate by isolating them in a named special context rather than the default context.
- Projection-plane helper methods combine realization and cache/mutation. Mitigate by preserving `ProjectionPlaneMutationContext` and stopping if dependency registration/cache ownership must be redesigned.

## Stop conditions

Stop and request a reviewed delta/plan edit if:

- The context needs command execution, process-tree mutation, persistence/project-service access, stores, Vue state, renderer lifecycle, scene-host state, or style/visibility policy.
- Projection-plane cache/dependency mutation cannot stay separate from read-only realization context.
- Narrowing contexts requires changing geometric result semantics, infeasibility semantics, or construction behavior rather than only context capability typing.
- Public canvas read-port DTO contracts, three selector/read-port decomposition, scene-host/OrbitControls/CSS/pointer behavior, command/undo, persistence, package/tooling, backend/docs/specs, or app-shell ownership changes become necessary.
- The unrelated dirty `Intersections.ts` / `ActionGroup.ts` files become necessary for compile/test success.

## Protected Wave 017/028 surfaces

- `ThreeView.vue` remains a composition shell; no concrete `World` injection/imports, no scene-host/OrbitControls/camera/renderer/CSS/layout changes.
- `ThreeWorldReadPort.ts` remains only a composition/type export unless a narrow rename is separately reviewed; do not recreate a broad read-port facade.
- `CanvasWorldReadPort` keeps behavior-sized public methods only and does not expose `getWorld`, raw collection getters, or public realization methods.
- `Projected3DCanvasReadPort.ts` remains the localized projected-3D raw traversal adapter.
- `.three-view-overlay` pointer behavior is unchanged and validated by e2e/live smoke.
