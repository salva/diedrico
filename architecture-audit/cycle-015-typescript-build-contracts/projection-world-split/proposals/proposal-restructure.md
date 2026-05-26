# Proposal Restructure — Split Mutation, Realization, and Element APIs

**Stage:** `cycle-015-projection-world-split-scout-proposals`  
**Purpose:** evaluate whether the projection lane needs a small conceptual split before implementation rather than another local context patch.

## Summary

Create a mini split between three contracts that are currently conflated:

1. **Element realization context** — read-only lookup/realization services consumed by `Point2D`, `Line2D`, `Circle2D`, guides, segments, and hinge-line derived elements.
2. **Projection-plane mutation context** — id generation, dependency registration, dirty marking, and owner-plane discovery used while adding/removing elements from a `ProjectionPlane`.
3. **World implementation** — the concrete aggregate that owns projection planes, caches, dependency services, and project-level state.

This proposal is preferred if review agrees that the residual errors are not merely missing guards but a leaked owner boundary: `ProjectionPlane` already wants to pass a context, element APIs still demand concrete `World`, and `World.getPlaneForElement` has been made public under structural compatibility pressure.

## Target outcome

After implementation, no projection-plane or element realization method should require concrete `World` unless it truly needs full world aggregate behavior. `World` may implement the read-only and mutation ports, but callers depend on named ports rather than the class. Mutation methods remain separated from realization methods. `ProjectionPlane.ts` can realize dependencies with strict guards, and `AuxiliaryProjectionPlane.ts` can compute matrices from a read-only context without pretending the context is a full `World`.

## Files to change

Contract split:

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
  - Replace the current mixed/optional context with named interfaces such as:
    - `ProjectionElementRealizationContext` for element `realize2D` methods.
    - `ProjectionPlaneRealizationContext` for plane `realize2D/realize3D` and auxiliary matrix computation.
    - `ProjectionPlaneMutationContext` for add/remove/id/dependency/dirty operations.
  - Define explicit inheritance only where behavior is conceptually required. Mutation may extend realization if mutation operations realize dependencies, but realization must not extend mutation.
  - Decide whether `getPlaneForElement` belongs in realization as an owner-plane query or mutation as an owner bookkeeping query; do not leave it public only to satisfy structural typing.

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
  - Keep `getPlaneForElement` public only if the selected contract names it as an intentional query and documents why `ProjectionPlane.ts:1075-1080` needs it. Otherwise restore private visibility and route the call through a better named context method.

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
- missing dependencies are explicit invariant failures rather than unchecked undefined dereferences;
- `World.getPlaneForElement` is either a named port or no longer exposed.

## Validation plan

Capture command output under `architecture-audit/cycle-015-typescript-build-contracts/validation/`.

Required focused validation:

1. `npm run test --workspace=frontend -- --run tests/unit/domain/projectionPlaneRealization.spec.ts tests/unit/projectionPlane.spec.ts`
2. Focused hinge/guide/auxiliary tests if present. If none cover `Guide2D`, `SiblingGuide2D`, `HalfHingeLine2D`, or `BrokenHalfHingeLine2D`, add a small focused unit test before claiming this lane complete.
3. `npm run build --workspace=frontend` after implementation; projection/world errors in `ProjectionPlane.ts`, `AuxiliaryProjectionPlane.ts`, `Element2D.ts`, `Point.ts`, `Line.ts`, `Circle.ts`, `Guide.ts`, `Segment.ts`, `HingeLine.ts`, and `BrokenHalfHingeLine2D.ts` must be gone or separately justified as outside this lane.
4. If any guard changes behavior, add tests that demonstrate the invariant/failure mode rather than relying on build success.

Parent Wave 015 full validation remains blocked until every TypeScript build category is closed.

## Risks

- This split touches more files than the direct proposal, but they are all within the projection/world realization owner boundary already identified by the correction decision.
- The split may reveal that some element realization methods need a broader domain query model than current context names can honestly express. If so, stop and propose a higher-level domain realization service in a new reviewed mini-cycle.
- Retyping `computeProjectionPlaneMatrices` may expose hidden utility coupling to `World`; that should be treated as evidence for the split, not patched by a cast.

## Stop conditions

Stop implementation and return to review if:

- the realization context grows beyond read-only projection/element lookup and realization-cache methods;
- any element requires mutation/dependency registration during `realize2D`;
- auxiliary projection matrix computation requires full `World` aggregate state unrelated to projection realization;
- retaining `World.getPlaneForElement` cannot be justified as a named owner query;
- focused tests show changed projection, hinge-line, sibling guide, or intersection geometry behavior that cannot be corrected inside this boundary.

## Why this avoids broad redesign

The proposal does not create new geometry concepts, new services, or new storage. It only names the contracts already implied by current code: `ProjectionPlane.ts` performs mutations and realization orchestration, element classes compute their own realizations from lookup services, and `World` is the concrete aggregate. The split prevents the next implementation from satisfying TypeScript by making every narrow context look like `World`.
