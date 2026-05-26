# Proposal Direct — Bounded Context Contract Completion

**Stage:** `cycle-015-projection-world-split-scout-proposals`  
**Purpose:** make the projection-plane/world realization lane compile only if the required contract remains a genuinely narrow read-only realization port. If implementation still needs both auxiliary matrix helpers and sibling owner-plane lookup, this proposal must yield to `proposal-restructure.md` rather than grow into a structural `World` subset.

## Summary

Complete the already-started narrow context direction by making 2D element realization depend on an explicit projection realization context rather than concrete `World`, then add strict guards at the existing dependency lookup sites. This is a direct correction only while the context remains limited to current-code, evidence-backed, read-only realization needs. It must not absorb mutation services, global aggregate behavior, or every `World` lookup simply because structural typing would make the compiler pass.

If the implementation proves that auxiliary projection matrix computation and sibling-intersection owner lookup are both required by the same read-only surface, stop the direct path and select the restructure proposal. That combination is evidence of multiple owner boundaries, not a small local contract completion.

## Files to change

Primary lane files:

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
  - Define one explicit required read-only realization context only if its members are all proven by current call sites. The direct context may include:
    - `getLine2D` for line realization and projection-plane intersection call sites already using line lookups;
    - `getPoint2D` only where existing point/line/segment/guide realization call sites dereference point dependencies;
    - `getCircle2D` only where existing circle/intersection realization call sites dereference circle dependencies;
    - `getProjectionPlaneById` only for existing same-plane or referenced-plane element lookup code;
    - `getProjectionPlane2DRealization` and `getProjectionPlane3DRealization` only if auxiliary matrix/projection realization code demonstrably reads cached plane realizations through the port.
  - Do **not** add methods merely because `World` has them. Each method added to the direct context must have a cited call site in the implementation log or decision.
  - `getPlaneForElement` is not a default member of the direct context. It may remain only under the explicit owner-plane exit criteria below; otherwise direct implementation must restore `World.getPlaneForElement` to non-public visibility.
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
  - Either update `computeProjectionPlaneMatrices` to accept the read-only realization context if it only uses read-only methods, or introduce a tiny helper signature that names the exact projection realization methods. Do not cast context to `World`.
  - If this helper also requires owner-plane lookup, stop and use `proposal-restructure.md`.
- `frontend/src/utils/projectionPlaneUtils.ts` if and only if `computeProjectionPlaneMatrices` currently types its context as `World` while using only the read-only subset.
- `frontend/src/domain/world/World.ts`
  - Keep implementing the selected read-only realization context through its existing lookup methods.
  - Retain public `getPlaneForElement` only under the owner-plane exit criteria below. If that criterion is not met, restore private/non-public visibility.

## Contract ownership constraints for the direct path

The direct path may proceed only if the final contract table in the decision stays smaller than the table below and each retained method has a cited call site. If the table must be accepted in full, choose `proposal-restructure.md` instead.

| Required method | Direct-path owner | Evidence-backed call site / use | Direct-path constraint |
| --- | --- | --- | --- |
| `getPoint2D` | Read-only realization context only if point dependencies are dereferenced by existing element realization | Reviewer B cites point dependency realization in `Point.ts`, `Line.ts`, `Segment.ts`; Reviewer A cites `ProjectionPlane.ts:252-315` dependent realization | Required, not optional, only when callers do not branch on absence. |
| `getLine2D` | Read-only realization context | Existing `ProjectionPlaneRealizationContext` already exposes it; reviewers cite `ProjectionPlane.ts:426-429`, `475-476`, `527-528`, `593-594`, `647`, `694`, `805`, `968`, `1017` | Guard undefined before dereference. |
| `getCircle2D` | Read-only realization context only for existing circle/intersection lookup sites | Reviewers cite strict-null failures and circle lookup use in `ProjectionPlane.ts`, `Circle.ts`, `Line.ts`, `Segment.ts` | Guard undefined before dereference. |
| `getProjectionPlaneById` | Read-only realization context only for same-plane/referenced-plane element lookup | Reviewers cite `ProjectionPlaneContext.ts:6-26` and element implementations in `Point.ts`, `Line.ts`, `Circle.ts` using plane lookup | Do not substitute global lookup if same-plane ownership is the actual dependency. |
| `getProjectionPlane2DRealization` | Read-only plane realization context only if auxiliary/projection matrix code reads cached 2D realizations | Reviewers cite `AuxiliaryProjectionPlane.ts:67-75`, `projectionPlaneUtils.ts:179-186` | If combined with owner lookup, direct path stops. |
| `getProjectionPlane3DRealization` | Read-only plane realization context only if auxiliary/projection matrix code reads cached 3D realizations | Reviewers cite `AuxiliaryProjectionPlane.ts:118-126`, `projectionPlaneUtils.ts:179-186` | If combined with owner lookup, direct path stops. |
| `getPlaneForElement` | No default direct owner; allowed only as named owner-plane query | Reviewers cite `ProjectionPlane.ts:1075-1080` and `World.ts:494-500` | See exit criteria below; if retained plus auxiliary matrix helpers are both required, direct yields to restructure. |

## `World.getPlaneForElement` visibility exit criteria

The decision and implementation must choose exactly one outcome:

1. **Public named owner-plane query:** `getPlaneForElement` remains public only because it is documented as an intentional owner-plane query for sibling intersection realization/creation. The sanctioned consumers must be named explicitly; current evidence identifies `ProjectionPlane.ts:1075-1080` as the consumer. No unrelated code may use the public method for structural compatibility.
2. **Narrower port or non-public world method:** if the final split can express the need through a narrower owner lookup port/method, then public `World.getPlaneForElement` must be reverted to non-public visibility and the implementation must route the call through that named port.

Leaving `World.getPlaneForElement` public merely so a context structurally resembles `World` is forbidden.

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
2. Add or adjust focused tests so at least one missing-dependency or missing-owner path is exercised for each guarded lookup category actually changed by implementation:
   - line-line intersection missing line dependency;
   - line-circle intersection missing line or circle dependency;
   - circle-circle intersection missing circle dependency;
   - guide/reference-line missing reference-line dependency;
   - sibling/owner-plane lookup failure if `getPlaneForElement` or its narrower replacement is touched;
   - auxiliary projection realization missing plane-realization dependency if matrix helpers are retyped.
3. Run focused tests covering `Guide2D`, sibling guides, `HalfHingeLine2D`, `BrokenHalfHingeLine2D`, and auxiliary projection planes where present. If no existing fixture covers a changed path, add a small focused unit test rather than relying on build success.
4. Rerun the focused process-tree deletion/undo regression required by the correction decision, proving action-node ids remain authoritative for removal (`RemoveActionFromProcessTreeOp(actionId)` still receives action-node ids, not element ids or legacy process ids).
5. `npm run build --workspace=frontend` to verify this lane’s errors are gone. Other Wave 015 categories may remain red; the implementation log must separate residual non-projection errors from projection-lane errors.

Full Wave 015 validation remains required later by the parent wave after all build-contract categories are closed.

## Risks

- The context may need more read-only methods than initially listed because element realization still reaches across plane/hinge/sibling relationships. This is acceptable only if each method is current-code evidence-backed and read-only.
- If `computeProjectionPlaneMatrices` uses broad `World` behavior beyond read-only projection lookups, this direct path must stop.
- If many element realization APIs require domain semantics beyond lookup/realization caches, the direct proposal risks turning into a structural `World` clone and must be rejected.

## Stop conditions

Stop and return to review if implementation requires:

- adding mutation methods to the read-only realization context;
- making optional context methods required without updating all callers and implementations coherently;
- preserving `World.getPlaneForElement` public solely for structural compatibility rather than a named owner-plane query;
- using both auxiliary matrix helper retyping and sibling owner-plane lookup in the same broad direct context;
- broadening the context until it mirrors `World`;
- changing geometry algorithms, persistence, rendering DTOs, command factory semantics, or process-tree deletion contracts.
