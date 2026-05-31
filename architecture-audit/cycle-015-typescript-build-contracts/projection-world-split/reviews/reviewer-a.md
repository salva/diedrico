# Reviewer A — Projection Plane / World Split

## Scope reviewed

Reviewed:

- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/scope-check.md`
- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/proposals/proposal-direct.md`
- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/proposals/proposal-restructure.md`
- `architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md`
- `architecture-audit/cycle-015-typescript-build-contracts/correction-decision.md`
- `architecture-audit/cycle-015-typescript-build-contracts/validation/frontend-build.correction-after-regression-fix.stdout`
- `architecture-audit/cycle-015-typescript-build-contracts/validation/projection-context.final.stdout`
- current source boundaries in `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`, `ProjectionPlane.ts`, `AuxiliaryProjectionPlane.ts`, and `World.ts`

No source/test/package/tooling files were modified in this review stage.

## Current evidence summary

- The build is still red specifically on the projection/world lane because `ProjectionPlane.ts` and `AuxiliaryProjectionPlane.ts` now call through context types, while element and utility contracts still require concrete `World` (`frontend-build.correction-after-regression-fix.stdout`).
- Focused projection tests still pass (`projection-context.final.stdout`: 34 passed, 3 skipped), so the failure is currently a contract-boundary/type-ownership problem, not evidence of an already-broken focused behavior path.
- The current context file is internally inconsistent: `ProjectionPlaneRealizationContext` only has `getLine2D`, `ProjectionPlaneElementRealizationContext` adds optional `getPoint2D?` and `getProjectionPlaneById`, and `ProjectionPlaneMutationContext` adds owner/mutation helpers including `getPlaneForElement` (`frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:6-27`).
- `ProjectionPlane.ts` already treats the mutation context as if it were a complete read-only realization service for points, lines, circles, sibling lookups, and owner-plane discovery (`ProjectionPlane.ts:252-315`, `426-429`, `475-476`, `527-528`, `593-594`, `647`, `694`, `805`, `968`, `1017`, `1075-1080`).
- `World.getPlaneForElement` is public in the current partial diff (`frontend/src/domain/world/World.ts:494-500`) and is directly consumed by sibling-intersection creation (`ProjectionPlane.ts:1075-1080`), confirming the owner-boundary pressure described in scope-check and correction-decision.
- `AuxiliaryProjectionPlane.ts` now accepts `ProjectionPlaneRealizationContext`, but its utility call still expects `World` (`AuxiliaryProjectionPlane.ts:62-75`, `114-126`; build log at lines for TS2345), proving the split is not limited to element classes.

## Proposal scoring

Scale: 1 (poor) to 5 (strong).

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances wave target outcome:** 3/5  
   It would likely clear the immediate compiler mismatch if the read-only context is completed cleanly, but it understates how many distinct responsibilities are already entangled in the current context and utility surface.
2. **Improves architecture/code quality:** 3/5  
   It improves type honesty versus passing `World`, but the proposal still frames the lane as “smallest coherent contract correction” even though the current evidence already spans element realization, auxiliary-plane utility typing, strict lookup guards, and owner-plane discovery.
3. **Respects no-backcompat / aggressive deletion:** 4/5  
   Strong on forbidding shims/casts/dual paths.
4. **Avoids overfeaturism:** 4/5  
   Bounded and disciplined.
5. **Introduced risks / hidden regressions:** 2/5  
   The main risk is accidental reconstruction of a structural `World` clone under a supposedly direct fix, especially because the proposal includes `getProjectionPlane2DRealization`, `getProjectionPlane3DRealization`, `getPoint2D`, `getLine2D`, `getCircle2D`, and maybe `getPlaneForElement` in one read-only interface.
6. **Validation sufficiency:** 3/5  
   Reasonable focused tests/build check, but it does not require enough guard-path proof for the newly introduced strict-undefined branches and does not explicitly require validating owner-query semantics if `getPlaneForElement` remains public.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances wave target outcome:** 5/5  
   Best match to the actual decision point exposed by the current partial diff: separate element realization, projection-plane realization/mutation, and concrete `World` implementation.
2. **Improves architecture/code quality:** 5/5  
   It names the leaked boundaries explicitly and prevents “context by compiler pressure” from hardening into architecture.
3. **Respects no-backcompat / aggressive deletion:** 4/5  
   Strong on deleting duplicate/optional/compatibility surfaces; no broad backward-compat concessions.
4. **Avoids overfeaturism:** 4/5  
   Broader than direct, but still constrained to the already-exposed owner boundary and does not invent new services/storage.
5. **Introduced risks / hidden regressions:** 4/5  
   More files move, but the risks are honestly named and bounded by explicit stop conditions. Safer than silently growing one pseudo-`World` context.
6. **Validation sufficiency:** 4/5  
   Better than direct because it requires hinge/guide/auxiliary coverage and behavior tests if guard semantics change. Still needs one addition noted below.

## Reviewer A recommendation

**Recommended path: `proposal-restructure.md`**.

Reason: the current evidence no longer supports treating this as a narrow local typing cleanup. The residual errors show three distinct concerns already leaking into one another:

1. element `realize2D` APIs still depend on concrete `World`;
2. projection-plane mutation code is trying to reuse that path through a smaller context;
3. auxiliary-plane matrix computation still types against `World`, which means realization utilities also participate in the same leak.

That is exactly the situation the restructure proposal addresses. Reviewer B should evaluate the same path as presumptive winner unless they find concrete evidence that `computeProjectionPlaneMatrices` and all element realization sites can be satisfied by a truly small, non-`World` read-only contract.

## Blocking issues requiring proposal correction before decision

### 1. Proposal Direct understates the owner split and risks recreating `World` structurally

**Blocking.** The direct proposal should not go to decision in its current wording because its listed read-only context already aggregates plane lookup, plane realizations, element lookups, and optional owner-plane discovery. Without a sharper contract partition, this can converge to a renamed `World` subset rather than a true bounded read-only interface.

**Required correction:** revise `proposal-direct.md` to either:

- shrink the direct context list to only currently proven read-only needs and explicitly exclude any method not evidenced at the cited call sites; or
- state that if auxiliary-plane matrix helpers and sibling-owner lookup both remain required, the direct path automatically yields to the restructure path.

### 2. Neither proposal is explicit enough about `World.getPlaneForElement` semantics and visibility exit criteria

**Blocking.** Both proposals mention `getPlaneForElement`, but the decision stage needs a sharper contract statement because the correction decision explicitly rejected leaving it public merely for structural compatibility pressure. Current evidence shows active use at `ProjectionPlane.ts:1075-1080` and public exposure at `World.ts:494-500`.

**Required correction:** both proposals should state the exact acceptance rule:

- if `getPlaneForElement` remains public, it must be documented as an intentional owner-plane query required by sibling intersection realization/creation; and
- if the final split can replace it with a narrower named port, public `World.getPlaneForElement` must be reverted.

### 3. Validation plans need explicit proof for strict undefined guards and process-tree identity non-regression

**Blocking.** The mini-cycle is projection/world scoped, but the parent wave still carries the protected process-tree identity repair from the failed correction attempt. The review brief explicitly asked for process-tree identity preservation, and both proposals currently rely on “do not break it” language rather than explicit verification. Also, the new guard work in `ProjectionPlane.ts`, `Circle.ts`, `Line.ts`, and `Segment.ts` changes failure boundaries and needs targeted tests, not just build success plus existing happy-path projection tests.

**Required correction:** selected proposal must add focused validation that:

- exercises at least one missing-dependency path for each newly guarded projection intersection/reference lookup category; and
- reruns the focused process-tree deletion/undo test that proves authoritative action-node ids remain preserved, citing the existing correction-decision requirement rather than assuming this mini-cycle cannot affect it.

## Non-blocking observations

- The focused projection tests currently passing while the build is red is useful evidence that the lane is still mostly contract-shape work, but it is not enough to approve silent semantic guard changes without new assertions.
- `ProjectionPlaneContext.ts:11` optional `getPoint2D?` is especially suspect because `ProjectionPlane.ts` call sites use dependent realization as if required lookup services exist.
- `ProjectionPlane.ts:1110` still contains `(primaryPoint as any).siblingPointId = siblingPoint.id`; this is outside the main proposal comparison but should not be normalized by the implementation path.

## Bottom line

**BLOCKING ISSUES** remain in the proposal set documentation.  
Primary recommendation after corrections: **select `proposal-restructure.md`**.  
Reviewer B should test whether they agree that the auxiliary-plane utility typing plus public owner-plane lookup prove this is already a conceptual split, not a local direct cleanup.
