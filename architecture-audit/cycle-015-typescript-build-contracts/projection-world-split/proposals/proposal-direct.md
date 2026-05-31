# Proposal Direct — Bounded Context Contract Completion

**Stage:** `cycle-015-projection-world-split-scout-proposals`  
**Purpose:** make the projection-plane/world realization lane compile with the smallest coherent contract correction, without broad geometry redesign.

## Summary

Complete the already-started narrow context direction by making 2D element realization depend on an explicit projection realization context rather than concrete `World`, then add strict guards at the existing dependency lookup sites. This is a direct correction because it does not change geometric algorithms, projection-plane ownership, cache semantics, or command behavior; it only aligns the type contract with how `ProjectionPlane` is already trying to call element realization.

**Reviewer correction:** this direct path is valid only if the resulting read-only context stays a genuinely narrow, evidence-backed lookup/realization port. It must not become a structural subset of `World`. If implementation confirms that both auxiliary matrix helpers (`AuxiliaryProjectionPlane.ts:67-75`, `:118-126`; `projectionPlaneUtils.ts:179-186`) and sibling owner lookup (`ProjectionPlane.ts:1075-1080`) remain required in the same public read-only contract, this proposal yields to `proposal-restructure.md` rather than growing a pseudo-`World` interface.

## Files to change

Primary lane files:

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
  - Define one explicit required read-only realization context only for current, cited read needs. The direct interface may include methods only when backed by an active call site:
    - `getProjectionPlaneById` for same-plane/cross-plane element lookup currently exercised by element realization classes (`Point.ts`, `Line.ts`, `Circle.ts`) and projection orchestration.
    - `getPoint2D`, `getLine2D`, and `getCircle2D` only where current realization code dereferences existing realized elements from projection orchestration or element classes.
    - `getProjectionPlane2DRealization` and `getProjectionPlane3DRealization` only if the auxiliary-plane matrix helper can be proven to need plane realizations and not broader `World` state.
    - `getPlaneForElement` only if it is deliberately named as an owner-plane query for sibling/intersection creation at `ProjectionPlane.ts:1075-1080`.
  - Do **not** include methods merely because `World` has them. Exclude mutation, dependency-registration, dirty-marking, id-generation, project-state, rendering, persistence, and command/undo behavior from the read-only context.
  - Remove optional methods unless a call site truly branches on absence. The current optional `getPoint2D?` is misleading because callers invoke realization as if lookup services exist.
  - Keep mutation-only methods (`generatePoint2DId`, `getDependencyService`, `markElementDirty`, etc.) in `ProjectionPlaneMutationContext`; do not let read-only realization depend on mutation services.
  - **Direct-path exit rule:** if the narrow list above must expand to satisfy both auxiliary projection matrix computation and owner-plane/sibling lookup as generic read services, stop direct implementation and select the restructure proposal.
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
  - If this helper needs both projection realizations and owner-plane discovery through a broad shared contract, reject this direct path and use the restructure proposal.
- `frontend/src/utils/projectionPlaneUtils.ts` if and only if `computeProjectionPlaneMatrices` currently types its context as `World` while using only the read-only subset.
- `frontend/src/domain/world/World.ts`
  - Keep implementing the selected read-only realization context through its existing lookup methods.
  - Apply the `World.getPlaneForElement` exit criteria below; it must not remain public merely for structural compatibility.

## `World.getPlaneForElement` exit criteria

The decision/implementation must choose exactly one outcome:

1. **Intentional public owner-plane query:** `World.getPlaneForElement` remains public only if the selected contract names it as an owner-plane query required by sibling/intersection realization or creation. The only sanctioned consumers for this mini-cycle are the projection-plane sibling/intersection path evidenced at `ProjectionPlane.ts:1075-1080` and any named projection realization port that directly serves that path.
2. **Narrower port / restored non-public method:** if implementation can replace owner lookup with a narrower port method or avoid exposing the aggregate method, `World.getPlaneForElement` must return to non-public visibility. No proposal may leave it public because structural typing happened to require it.

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
2. Add or adjust focused tests for every changed strict guard category rather than relying on build success. At minimum, if changed by the implementation, include one missing-dependency or missing-owner assertion for each of: line-line intersections, line-circle intersections, circle-circle intersections, guide/reference-line lookup, auxiliary projection plane realization/matrix lookup, and sibling owner-plane lookup.
3. Run any existing world/hinge-line tests that cover `BrokenHalfHingeLine2D`, `Guide2D`, or auxiliary projection planes if present.
4. Rerun the focused process-tree deletion/undo regression required by the Wave 015 correction decision, proving `RemoveActionFromProcessTreeOp(actionId)` still receives authoritative action-node ids and undo preserves those identities. This is required even though this mini-cycle is projection/world scoped because the parent wave protects that repair.
5. `npm run build --workspace=frontend` to verify this lane’s errors are gone. Other Wave 015 categories may remain red; the implementation log must separate residual non-projection errors from projection-lane errors.

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
- changing geometry algorithms, persistence, rendering DTOs, command factory semantics, or process-tree deletion contracts;
- satisfying both auxiliary matrix helpers and sibling-owner lookup by aggregating unrelated `World` read methods into one undifferentiated context.
