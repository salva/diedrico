# Proposal Direct — Bounded Context Contract Completion

**Stage:** `cycle-015-projection-world-split-scout-proposals`  
**Purpose:** make the projection-plane/world realization lane compile with the smallest coherent contract correction, without broad geometry redesign.

## Summary

Complete the already-started narrow context direction by making 2D element realization depend on an explicit projection realization context rather than concrete `World`, then add strict guards at the existing dependency lookup sites. This is a direct correction because it does not change geometric algorithms, projection-plane ownership, cache semantics, or command behavior; it only aligns the type contract with how `ProjectionPlane` is already trying to call element realization.

## Files to change

Primary lane files:

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
  - Define one explicit required read-only realization context. It should include only methods actually needed by current element/plane realization code: `getProjectionPlaneById`, `getProjectionPlane2DRealization`, `getProjectionPlane3DRealization`, `getPoint2D`, `getLine2D`, `getCircle2D`, and `getPlaneForElement` if sibling/intersection realization requires owner-plane discovery.
  - Remove optional methods unless a call site truly branches on absence. The current optional `getPoint2D?` is misleading because callers invoke realization as if lookup services exist.
  - Keep mutation-only methods (`generatePoint2DId`, `getDependencyService`, `markElementDirty`, etc.) in `ProjectionPlaneMutationContext`; do not let read-only realization depend on mutation services.
- `frontend/src/domain/world/Element2D.ts`
- `frontend/src/domain/world/Point.ts`
- `frontend/src/domain/world/Line.ts`
- `frontend/src/domain/world/Circle.ts`
- `frontend/src/domain/world/Guide.ts`
- `frontend/src/domain/world/Segment.ts`
- `frontend/src/domain/world/HingeLine.ts`
- `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`
  - Change `realize2D(world: World)` signatures to `realize2D(context: ProjectionPlaneRealizationContext)` or a more specific derived read-only context if needed.
  - Update imports away from concrete `World` where only the context is needed.
  - Add explicit guards where `getProjectionPlaneById`, `getPoint2D`, `getLine2D`, or `getCircle2D` can return `undefined`; fail with existing assertion style or return `null` only where the existing return type already permits it.
- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`
  - Keep its mutation methods accepting `ProjectionPlaneMutationContext` because they need id generation/dependency registration/dirty marking.
  - Pass the mutation context to element `realize2D` only because mutation context extends the read-only realization context, not because it structurally resembles `World`.
  - Guard every build-cited nullable lookup before dereference (`l1`, `l2`, `lineElement`, `circleElement`, `circle1Element`, `circle2Element`, `refLineElement`).
  - Remove the unused `IntersectionPoint2D` import cited at `ProjectionPlane.ts:6` if still present.
- `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts`
  - Either update `computeProjectionPlaneMatrices` to accept the read-only realization context if it only uses read-only methods, or introduce a tiny adapter/helper call that supplies only the required projection realization methods. Do not cast context to `World`.
- `frontend/src/utils/projectionPlaneUtils.ts` if and only if `computeProjectionPlaneMatrices` currently types its context as `World` while using only the read-only subset.
- `frontend/src/domain/world/World.ts`
  - Keep implementing the selected read-only realization context through its existing lookup methods.
  - Retain public `getPlaneForElement` only if the read-only context explicitly includes it as an owner-plane query used by projection realization. If the implementation finds it is not needed after guards/refactors, restore private visibility.

## Files/tests/docs/fixtures to delete or revert

- Delete no source modules in this direct correction.
- Revert any lingering optional context declarations or imports that are not consumed by the final selected context.
- Delete no tests/docs/fixtures.
- Do not edit `frontend/package.json`, lockfiles, tsconfig, build scripts, Wave 014 protected tests/files, or `ActionsPanel.vue`.

## Explicit forbidden repairs

- No `@ts-ignore`, `@ts-expect-error`, skipped tests, build allowlists, or TypeScript/tooling weakening.
- No `as any`, `as unknown as`, or cast from realization context to `World`.
- No compatibility shim where element `realize2D` accepts both `World` and context.
- No dual old/new realization paths.
- No broad geometry redesign, new dependency graph, persistence change, rendering rewrite, or command/controller cleanup.
- No local service instantiation or UI repairs from unrelated Wave 015 categories.
- No change that weakens the process-tree deletion identity correction; `RemoveActionFromProcessTreeOp(actionId)` must continue receiving action-node ids.

## Expected behavior change

No user-observable geometry behavior should change. The expected change is architectural/type-level: element realization consumes an explicit read-only projection context, and missing dependencies fail through clear guards rather than TypeScript-unsafe dereferences.

## Validation plan

Capture all stdout/stderr under `architecture-audit/cycle-015-typescript-build-contracts/validation/` with stable names and record outcomes in the implementation log.

Focused validation:

1. `npm run test --workspace=frontend -- --run tests/unit/domain/projectionPlaneRealization.spec.ts tests/unit/projectionPlane.spec.ts`
2. Add or adjust focused tests only if an existing fixture does not cover a new guard path. New tests should assert missing dependency behavior for line-line, line-circle, circle-circle, guide/reference-line, and auxiliary plane realization without introducing skipped cases.
3. Run any existing world/hinge-line tests that cover `BrokenHalfHingeLine2D`, `Guide2D`, or auxiliary projection planes if present.
4. `npm run build --workspace=frontend` to verify this lane’s errors are gone. Other Wave 015 categories may remain red; the implementation log must separate residual non-projection errors from projection-lane errors.

Full Wave 015 validation remains required later by the parent wave after all build-contract categories are closed.

## Risks

- The context may need more read-only methods than initially listed because element realization still reaches across plane/hinge/sibling relationships. This is acceptable only if each method is current-code evidence-backed and read-only.
- If `computeProjectionPlaneMatrices` uses broad `World` behavior beyond read-only projection lookups, this direct path may no longer be small and must stop.
- If many element realization APIs require domain semantics beyond lookup/realization caches, the direct proposal risks turning into a structural `World` clone and must be rejected.

## Stop conditions

Stop and return to review if implementation requires:

- adding mutation methods to the read-only realization context;
- making optional context methods required without updating all callers and implementations coherently;
- preserving `World.getPlaneForElement` public solely for structural compatibility rather than a named owner-plane query;
- broadening the context until it mirrors `World`;
- changing geometry algorithms, persistence, rendering DTOs, command factory semantics, or process-tree deletion contracts.
