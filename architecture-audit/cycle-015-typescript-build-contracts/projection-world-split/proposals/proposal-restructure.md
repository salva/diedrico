# Proposal Restructure — Split Mutation, Realization, and Element APIs

**Stage:** `cycle-015-projection-world-split-scout-proposals`  
**Purpose:** evaluate whether the projection lane needs a small conceptual split before implementation rather than another local context patch.

## Summary

Create a mini split between three contracts that are currently conflated:

1. **Element realization context** — read-only lookup/realization services consumed by `Point2D`, `Line2D`, `Circle2D`, guides, segments, and hinge-line derived elements.
2. **Projection-plane realization context** — read-only cross-plane projection realization services used by `ProjectionPlane` orchestration and auxiliary matrix computation.
3. **Projection-plane mutation context** — id generation, dependency registration, dirty marking, and owner-plane bookkeeping used while adding/removing elements from a `ProjectionPlane`.
4. **World implementation** — the concrete aggregate that owns projection planes, caches, dependency services, and project-level state.

This proposal is preferred because the residual errors are not merely missing guards but a leaked owner boundary: `ProjectionPlane` already wants to pass a context, element APIs still demand concrete `World`, `computeProjectionPlaneMatrices()` still demands `World`, and `World.getPlaneForElement` has been made public under structural compatibility pressure.

## Target outcome

After implementation, no projection-plane or element realization method should require concrete `World` unless it truly needs full world aggregate behavior. `World` may implement the read-only and mutation ports, but callers depend on named ports rather than the class. Mutation methods remain separated from realization methods. `ProjectionPlane.ts` can realize dependencies with strict guards, and `AuxiliaryProjectionPlane.ts` can compute matrices from a read-only context without pretending the context is a full `World`.

## Required contract table

The selected implementation must bind each required method to the narrowest honest owner. Evidence lines are from the current partial-diff/codebase cited by Reviewer A/B; if exact line numbers drift during implementation, update the decision/implementation log with the new call site rather than broadening the contract silently.

| Method | Owning interface | Purpose / responsibility | Evidence-backed call site |
| --- | --- | --- | --- |
| `getPoint2D(id)` | `ProjectionElementRealizationContext` when element realization needs realized point lookup; also available through `ProjectionPlaneMutationContext` only by extension when mutation orchestration realizes elements | Read-only lookup of realized 2D points for dependent element realization and guarded projection orchestration. Must not imply mutation or global world access. | `ProjectionPlane.ts:252-315` and later guarded intersection/reference lookups cited by Reviewer A (`:426-429`, `:475-476`, `:527-528`, `:593-594`, `:647`, `:694`, `:805`, `:968`, `:1017`); optional `getPoint2D?` in `ProjectionPlaneContext.ts:11` is currently misleading. |
| `getLine2D(id)` | `ProjectionElementRealizationContext` for same-plane/dependent line realization; `ProjectionPlaneRealizationContext` only where projection orchestration or matrix computation reads realized lines | Read-only lookup of realized 2D lines for intersections, guides/reference-line realization, hinge-derived geometry, and auxiliary matrix inputs. | Current `ProjectionPlaneRealizationContext` exposes only `getLine2D` at `ProjectionPlaneContext.ts:6-8`; build/review evidence cites undefined line dereferences in `ProjectionPlane.ts` and element implementations still typed to `World` (`Line.ts:148`). |
| `getCircle2D(id)` | `ProjectionElementRealizationContext` where element/circle-dependent realization needs it; exposed to orchestration only as read-only lookup | Read-only lookup of realized circles for line-circle and circle-circle intersection realization. | Reviewer A/B cite active circle lookup gaps in `ProjectionPlane.ts` and `Circle.ts:82`; build evidence includes strict-null failures in `Circle.ts` and `ProjectionPlane.ts`. |
| `getProjectionPlaneById(id)` | `ProjectionElementRealizationContext` for same-plane element lookup and `ProjectionPlaneRealizationContext` for cross-plane orchestration when a plane object is the true dependency | Locates the owning or referenced projection plane so element realization can ask that plane for same-plane elements without depending on concrete `World`. | `ProjectionPlaneElementRealizationContext` currently contains `getProjectionPlaneById` in `ProjectionPlaneContext.ts:10-14`; Reviewer B notes `Point.ts`, `Line.ts`, and `Circle.ts` use `world.getProjectionPlaneById(this.planeId)` followed by `plane.get*`. |
| `getProjectionPlane2DRealization(id)` | `ProjectionPlaneRealizationContext` | Read-only access to cached 2D projection-plane realization data used by auxiliary projection/matrix computations or projection orchestration. Must not drag in mutation services. | Reviewer A/B cite `AuxiliaryProjectionPlane.ts:67-75`, `:118-126` passing a context while `projectionPlaneUtils.ts:179-186` still expects `World`; this method is required only if that helper reads plane realization caches. |
| `getProjectionPlane3DRealization(id)` | `ProjectionPlaneRealizationContext` | Read-only access to cached 3D projection-plane realization data used by auxiliary projection/matrix computations. | Same auxiliary-plane evidence: `AuxiliaryProjectionPlane.ts:67-75`, `:118-126` and `projectionPlaneUtils.ts:179-186`; keep separate from element lookup so auxiliary utilities do not force element APIs to know full world state. |
| `getPlaneForElement(elementId)` | Prefer a named owner-plane port such as `ProjectionOwnerPlaneQuery` used by projection-plane mutation/orchestration; include in `ProjectionPlaneMutationContext` only if owner bookkeeping is a mutation/orchestration concern, or in a narrowly named read-only port if sibling realization truly needs it | Answers “which projection plane owns this element?” for sibling/intersection creation. It is not a generic `World` compatibility method and must have sanctioned consumers. | `World.ts:494-500` is currently public; `ProjectionPlane.ts:1075-1080` consumes it for sibling intersection creation. Reviewer A/B require exact visibility exit criteria. |

Interface inheritance rules:

- `ProjectionPlaneMutationContext` may extend the read-only realization interfaces only because mutation orchestration currently realizes dependencies while adding/removing elements.
- `ProjectionElementRealizationContext` must not extend mutation/id/dependency/dirty services.
- `ProjectionPlaneRealizationContext` must not become a generic bag of every `World` read method; auxiliary matrix needs and element lookup needs should remain named even if `World` implements both.
- If same-plane element realization is the truer dependency, preserve that by using `getProjectionPlaneById(...).get*` behind the element context rather than forcing every element into global lookup.

## `World.getPlaneForElement` exit criteria

The decision/implementation must choose exactly one outcome and record it in `decision.md` and `implementation-log.md`:

1. **Public named owner-plane query:** keep `World.getPlaneForElement` public only as an intentional owner-plane query. Sanctioned consumers are limited to the projection-plane sibling/intersection creation path evidenced at `ProjectionPlane.ts:1075-1080` and a narrowly named port such as `ProjectionOwnerPlaneQuery` serving that path. The method must not be cited as proof that arbitrary projection contexts may structurally satisfy `World`.
2. **Narrower port / non-public aggregate method:** replace the public aggregate method with a narrower port or move owner lookup behind projection-plane orchestration, then restore `World.getPlaneForElement` to non-public visibility. If no sanctioned consumer remains, public visibility is forbidden.

## Files to change

Contract split:

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
  - Replace the current mixed/optional context with named interfaces such as:
    - `ProjectionElementRealizationContext` for element `realize2D` methods.
    - `ProjectionPlaneRealizationContext` for plane `realize2D/realize3D` and auxiliary matrix computation.
    - `ProjectionOwnerPlaneQuery` if owner lookup remains a read-only named port.
    - `ProjectionPlaneMutationContext` for add/remove/id/dependency/dirty operations.
  - Define explicit inheritance only where behavior is conceptually required. Mutation may extend realization if mutation operations realize dependencies, but realization must not extend mutation.
  - Bind `getPlaneForElement` using the exit criteria above; do not leave it public only to satisfy structural typing.

Element API alignment:

- `frontend/src/domain/world/Element2D.ts`
- `frontend/src/domain/world/Point.ts`
- `frontend/src/domain/world/Line.ts`
- `frontend/src/domain/world/Circle.ts`
- `frontend/src/domain/world/Guide.ts`
- `frontend/src/domain/world/Segment.ts`
- `frontend/src/domain/world/HingeLine.ts`
- `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`
  - Move `realize2D` signatures from `World` to the selected element realization context.
  - Remove concrete `World` imports where they only support `realize2D` typing.
  - Add strict dependency guards before dereference. Guard behavior must follow existing domain style: assert/fail-fast for invariant violations, return `null` only where the existing return type already models non-realizable geometry.

Projection plane implementation:

- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`
  - Keep mutation operations on `ProjectionPlaneMutationContext` only where mutation behavior is required.
  - Use a read-only realization view for calls into element realization; if the same object is passed, it must be because the mutation context explicitly extends the read-only contract.
  - Add build-cited guards for possibly undefined line/circle/point/reference-line values.
  - Remove unused imports cited by the build.
- `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts`
- `frontend/src/utils/projectionPlaneUtils.ts` if needed
  - Retype matrix computation against the plane realization context if the helper only reads projection plane/line/hinge data.

World implementation:

- `frontend/src/domain/world/World.ts`
  - Explicitly implement or satisfy the selected context contracts through existing methods.
  - Apply the `World.getPlaneForElement` exit criteria above.

## Files/tests/docs/fixtures to delete or revert

- Delete no modules.
- Revert any context edits that leave optional methods unused, duplicate old/new context names, or retain a `World`-typed overload beside a context-typed overload.
- Delete no fixtures/docs/tests.
- Do not alter package/tooling, protected Wave 014 files, `ActionsPanel.vue`, or unrelated Wave 015 categories.

## Explicit forbidden repairs

- Do not make `ProjectionPlaneRealizationContext` a broad clone of `World`.
- Do not cast context to `World` or use `as any` / `as unknown as`.
- Do not keep compatibility overloads such as `realize2D(worldOrContext: World | ProjectionElementRealizationContext)`.
- Do not add no-op adapter classes whose only job is to satisfy structural typing while forwarding every `World` method.
- Do not rewrite geometry algorithms, introduce new persistence format, alter command/undo semantics, touch rendering DTOs, or fix unrelated build errors opportunistically.
- Do not weaken process-tree identity repairs or restore legacy process/action fields.

## Expected behavior change

No intentional geometric behavior change. The architectural behavior changes are:

- concrete `World` is no longer the public API for element realization;
- mutation and realization dependencies are visible in separate contracts;
- same-plane element lookup, cross-plane projection realization lookup, and owner-plane lookup have named owners instead of being collapsed into `World`;
- missing dependencies are explicit invariant failures rather than unchecked undefined dereferences;
- `World.getPlaneForElement` is either a named owner-plane query or no longer exposed.

## Validation plan

Capture command output under `architecture-audit/cycle-015-typescript-build-contracts/validation/`.

Required focused validation:

1. `npm run test --workspace=frontend -- --run tests/unit/domain/projectionPlaneRealization.spec.ts tests/unit/projectionPlane.spec.ts`
2. Focused hinge/guide/auxiliary tests if present. If none cover `Guide2D`, `SiblingGuide2D`, `HalfHingeLine2D`, or `BrokenHalfHingeLine2D`, add a small focused unit test before claiming this lane complete.
3. Add or adjust guard-path tests for each changed missing-dependency or missing-owner lookup category. At minimum, when the category is touched, prove behavior for line-line intersections, line-circle intersections, circle-circle intersections, guide/reference-line lookup, auxiliary projection plane realization/matrix lookup, and sibling owner-plane lookup. Tests should assert the selected invariant/failure mode or `null` outcome according to existing return types.
4. Rerun the focused process-tree deletion/undo regression protected by the Wave 015 correction decision, proving action-node ids remain the authoritative removal ids and undo preserves action identity. Record the exact command and log path; do not rely on “projection/world should be unrelated” as proof.
5. `npm run build --workspace=frontend` after implementation; projection/world errors in `ProjectionPlane.ts`, `AuxiliaryProjectionPlane.ts`, `Element2D.ts`, `Point.ts`, `Line.ts`, `Circle.ts`, `Guide.ts`, `Segment.ts`, `HingeLine.ts`, and `BrokenHalfHingeLine2D.ts` must be gone or separately justified as outside this lane.
6. If any guard changes behavior, add tests that demonstrate the invariant/failure mode rather than relying on build success.

Parent Wave 015 full validation remains blocked until every TypeScript build category is closed.

## Risks

- This split touches more files than the direct proposal, but they are all within the projection/world realization owner boundary already identified by the correction decision.
- The split may reveal that some element realization methods need a broader domain query model than current context names can honestly express. If so, stop and propose a higher-level domain realization service in a new reviewed mini-cycle.
- Retyping `computeProjectionPlaneMatrices` may expose hidden utility coupling to `World`; that should be treated as evidence for the split, not patched by a cast.

## Stop conditions

Stop implementation and return to review if:

- the realization context grows beyond read-only projection/element lookup and realization-cache methods;
- same-plane lookup, cross-plane realization lookup, and owner-plane lookup cannot be assigned to named interfaces without creating a pseudo-`World`;
- any element requires mutation/dependency registration during `realize2D`;
- auxiliary projection matrix computation requires full `World` aggregate state unrelated to projection realization;
- retaining `World.getPlaneForElement` cannot be justified as a named owner query with sanctioned consumers;
- focused tests show changed projection, hinge-line, sibling guide, or intersection geometry behavior that cannot be corrected inside this boundary.

## Why this avoids broad redesign

The proposal does not create new geometry concepts, new services, or new storage. It only names the contracts already implied by current code: `ProjectionPlane.ts` performs mutations and realization orchestration, element classes compute their own realizations from lookup services, auxiliary helpers read projection realizations, and `World` is the concrete aggregate. The split prevents the next implementation from satisfying TypeScript by making every narrow context look like `World`.
