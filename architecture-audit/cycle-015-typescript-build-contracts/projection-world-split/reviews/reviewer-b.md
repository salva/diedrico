# Reviewer B — Projection Plane / World Split

## Scope reviewed

Reviewed independently:

- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/scope-check.md`
- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/proposals/proposal-direct.md`
- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/proposals/proposal-restructure.md`
- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/reviews/reviewer-a.md`
- `architecture-audit/cycle-015-typescript-build-contracts/validation/frontend-build.correction-after-regression-fix.stdout`
- current source evidence in `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`, `ProjectionPlane.ts`, `AuxiliaryProjectionPlane.ts`, `World.ts`, `Element2D.ts`, `Point.ts`, `Line.ts`, `Circle.ts`, and `frontend/src/utils/projectionPlaneUtils.ts`

No source/test/package/tooling files were modified in this review stage.

## Independent evidence summary

- The current split is incomplete at the contract boundary, not just at a few call sites. `ProjectionPlane.ts` already passes `ProjectionPlaneMutationContext` into element realization (`ProjectionPlane.ts:260`, `:284`, `:308`, `:428-429`, `:475-476`, `:527-528`, `:593-594`, `:647`, `:694`, `:805`, `:968`, `:1017`), but the element base classes still require concrete `World` (`frontend/src/domain/world/Element2D.ts:108`, `Point.ts:101`, `Line.ts:148`, `Circle.ts:82`).
- `ProjectionPlaneContext.ts:6-26` is internally inconsistent: the read-only side only exposes `getLine2D`, optional `getPoint2D?`, and `getProjectionPlaneById`, while active call sites also need circle lookup, plane realization lookup, and owner-plane lookup.
- `frontend/src/utils/projectionPlaneUtils.ts:179-186` still types `computeProjectionPlaneMatrices(..., world: World)`, and `AuxiliaryProjectionPlane.ts:67-75` / `:118-126` now passes `ProjectionPlaneRealizationContext`, proving the leak reaches shared realization utilities, not only element classes.
- `World.getPlaneForElement` is public and currently exercised by sibling intersection creation (`World.ts:494-500`, `ProjectionPlane.ts:1075-1080`). That means the decision must bind whether owner lookup is an intentional port or a temporary structural escape hatch.
- The red frontend build log confirms both the contract mismatch and the strict-null gaps (`frontend-build.correction-after-regression-fix.stdout` entries for `ProjectionPlane.ts`, `AuxiliaryProjectionPlane.ts`, `Circle.ts`, `Line.ts`, `Segment.ts`).
- There are also element implementations that assume same-plane lookup via `world.getProjectionPlaneById(this.planeId)` and `plane.get*` (`Point.ts`, `Line.ts`, `Circle.ts`). Any final context contract must either preserve that assumption honestly or explicitly separate same-plane element lookup from cross-plane lookup.

## Response to Reviewer A

I **agree with Reviewer A's primary recommendation**: `proposal-restructure.md` is the safer decision path.

I also agree with Reviewer A's core diagnosis that the problem is already a conceptual owner split, not a purely local typing cleanup. The strongest evidence is the combination of:

1. element APIs still typed to `World`;
2. `ProjectionPlane` already trying to operate through a smaller context;
3. `computeProjectionPlaneMatrices()` still demanding `World`; and
4. `World.getPlaneForElement` having been made public to keep the partial split compiling.

I refine Reviewer A in one place: the key danger in the direct path is not only that it may become a renamed `World` subset, but that it may preserve two conflicting lookup models at once — same-plane direct lookup inside elements and cross-plane/owner lookup in projection-plane orchestration — without naming which contract owns each behavior.

## Proposal scoring

Scale: 1 (poor) to 5 (strong).

### Proposal Direct — `proposals/proposal-direct.md`

1. **Advances wave target outcome:** 3/5  
   Could clear the immediate TS2345 errors, but only if the read-only contract expands enough to satisfy both element realization and auxiliary-plane utility code.
2. **Improves architecture/code quality:** 2/5  
   It improves type honesty relative to passing `World`, but its current interface list trends toward a structural compatibility patch rather than a clean owner split.
3. **Respects no-backcompat / aggressive deletion:** 4/5  
   Good discipline against shims, casts, and dual paths.
4. **Avoids overfeaturism:** 4/5  
   Bounded in intent.
5. **Introduces new risks / hidden regressions:** 2/5  
   High risk of creating a pseudo-`World` read-only contract while leaving `getPlaneForElement` and same-plane lookup semantics under-specified.
6. **Validation sufficiency:** 3/5  
   Needs stronger proof for new guard behavior, owner-query behavior, and one protected regression check from the parent correction lane.

### Proposal Restructure — `proposals/proposal-restructure.md`

1. **Advances wave target outcome:** 5/5  
   Best fit for the actual owner-boundary problem shown by the build and source evidence.
2. **Improves architecture/code quality:** 5/5  
   Makes realization, mutation, and concrete aggregate responsibilities explicit instead of compiler-driven.
3. **Respects no-backcompat / aggressive deletion:** 4/5  
   Strong on removing compatibility surfaces and refusing dual signatures.
4. **Avoids overfeaturism:** 4/5  
   Broader than direct, but still bounded to the projection/world realization seam already opened by the partial diff.
5. **Introduces new risks / hidden regressions:** 4/5  
   More files move, but the risks are visible and stop conditions are honest.
6. **Validation sufficiency:** 4/5  
   Better than direct; still needs one explicit addition described below.

## Blocking issues requiring correction before decision

### 1. The proposal set still does not define the minimum required realization contract precisely enough

**Blocking.** `ProjectionPlaneContext.ts:6-26`, `ProjectionPlane.ts`, and `projectionPlaneUtils.ts:179-186` show at least three read paths in play: same-plane element lookup, cross-plane projection realization lookup, and owner-plane lookup. Neither proposal currently binds which of these belong to the element realization context versus projection-plane realization context.

**Required correction:** before decision, the selected proposal should include a contract table listing each required method, its owning interface, and one evidence-backed call site. At minimum cover `getPoint2D`, `getLine2D`, `getCircle2D`, `getProjectionPlaneById`, `getProjectionPlane2DRealization`, `getProjectionPlane3DRealization`, and `getPlaneForElement`.

### 2. `World.getPlaneForElement` exit criteria are still too vague for decision

**Blocking.** Current code keeps it public (`frontend/src/domain/world/World.ts:494-500`) and uses it in sibling intersection creation (`ProjectionPlane.ts:1075-1080`). The decision stage cannot leave this as a generic “retain if needed” clause.

**Required correction:** both proposals, or the chosen decision artifact, must state one of two explicit outcomes:

- `getPlaneForElement` remains public as a named owner-plane query, with the only sanctioned consumers identified; or
- it is replaced by a narrower port/method and `World.getPlaneForElement` returns to non-public visibility.

### 3. Validation plans still under-specify guard-path and protected-regression proof

**Blocking.** The build evidence includes new strict-null failures in `ProjectionPlane.ts`, `Circle.ts`, `Line.ts`, and `Segment.ts`. Build success alone is not enough because these guards change invariant boundaries. Also, the correction decision protected the process-tree identity repair, and this mini-cycle should explicitly re-run the relevant focused test rather than rely on a “should be unaffected” assumption.

**Required correction:** selected path must require:

- focused tests for at least one missing-dependency / missing-owner case in each guarded lookup category actually changed; and
- rerun of the focused process-tree deletion/undo regression that proves action-node ids are still the authoritative removal ids.

## Non-blocking observations

- Reviewer A correctly called out `ProjectionPlaneContext.ts:11` optional `getPoint2D?` as misleading; I agree it should not survive into the decision unchanged.
- `ProjectionPlane.ts:1110` still uses `(primaryPoint as any).siblingPointId = siblingPoint.id`; that is outside the immediate proposal choice but is evidence that this area already has contract shortcuts and should not absorb another one.
- Because `Point.ts`, `Line.ts`, and `Circle.ts` currently do same-plane lookup via `plane.get*`, the selected proposal should be careful not to force every element realization method into global lookup if same-plane ownership is the truer dependency.

## Recommended decision path

**BLOCKING ISSUES remain.** After correcting the proposal wording above, I recommend choosing **`proposal-restructure.md`**.

Reason: the current evidence shows a real split among element realization, projection-plane realization/mutation orchestration, and concrete world ownership. The restructure path is the only proposal that acknowledges that split directly and gives the implementation permission to keep read-only realization contracts narrow instead of silently rebuilding `World` through structural typing.
