# Proposal Restructure — Split Mutation, Realization, and Element APIs

**Stage:** `cycle-015-projection-world-split-scout-proposals`  
**Purpose:** evaluate whether the projection lane needs a small conceptual split before implementation rather than another local context patch.

## Summary

Create a mini split between three contracts that are currently conflated:

1. **Element realization context** — read-only lookup/realization services consumed by `Point2D`, `Line2D`, `Circle2D`, guides, segments, and hinge-line derived elements.
2. **Projection-plane realization context** — read-only projection-plane and realization-cache queries consumed by `ProjectionPlane`, `AuxiliaryProjectionPlane`, and matrix/realization helpers.
3. **Projection-plane mutation context** — id generation, dependency registration, dirty marking, and owner-plane bookkeeping used while adding/removing elements from a `ProjectionPlane`.
4. **World implementation** — the concrete aggregate that owns projection planes, caches, dependency services, and project-level state while satisfying the selected named ports.

This proposal is preferred because the residual errors are not merely missing guards but a leaked owner boundary: `ProjectionPlane` already wants to pass a context, element APIs still demand concrete `World`, `computeProjectionPlaneMatrices()` still demands `World`, and `World.getPlaneForElement` has been made public under structural compatibility pressure.

## Target outcome

After implementation, no projection-plane or element realization method should require concrete `World` unless it truly needs full world aggregate behavior. `World` may implement the read-only and mutation ports, but callers depend on named ports rather than the class. Mutation methods remain separated from realization methods. Same-plane element lookup, cross-plane projection realization lookup, and owner-plane lookup are assigned to explicit contracts instead of being bundled into one pseudo-`World` context. `ProjectionPlane.ts` can realize dependencies with strict guards, and `AuxiliaryProjectionPlane.ts` can compute matrices from a read-only context without pretending the context is a full `World`.

## Required contract table

The implementation decision must preserve this ownership table unless a new reviewed mini-cycle changes it. Each method has an owner interface and an evidence-backed call site from the current reviewers/source citations.

| Required method | Owning interface | Evidence-backed call site / use | Contract rule |
| --- | --- | --- | --- |
| `getPoint2D` | `ProjectionElementRealizationContext` when element realization needs point dependencies; also available to `ProjectionPlaneRealizationContext` only if plane orchestration directly realizes point-dependent geometry | Reviewer A cites dependent realization through `ProjectionPlane.ts:252-315`; Reviewer B cites point/line/segment element implementations using point dependencies | Required, not optional, for callers that dereference point dependencies. Guard `undefined` before use. |
| `getLine2D` | `ProjectionElementRealizationContext` for line-dependent element realization; `ProjectionPlaneRealizationContext` for plane orchestration/intersection lookup | Existing context exposes it; reviewers cite `ProjectionPlane.ts:426-429`, `475-476`, `527-528`, `593-594`, `647`, `694`, `805`, `968`, `1017` | Guard missing line dependencies and keep lookup read-only. |
| `getCircle2D` | `ProjectionElementRealizationContext` for circle-dependent element realization; `ProjectionPlaneRealizationContext` for plane orchestration/intersection lookup | Reviewers cite circle lookup and strict-null failures in `ProjectionPlane.ts`, `Circle.ts`, `Line.ts`, and `Segment.ts` | Guard missing circle dependencies and keep lookup read-only. |
| `getProjectionPlaneById` | `ProjectionElementRealizationContext` for same-plane/referenced-plane element lookup; `ProjectionPlaneRealizationContext` for cross-plane projection realization helpers | Reviewer B cites `Point.ts`, `Line.ts`, and `Circle.ts` using `world.getProjectionPlaneById(this.planeId)` and plane `get*` methods; reviewers cite `ProjectionPlaneContext.ts:6-26` | Preserve the same-plane ownership assumption where that is the truer dependency; do not replace it with broad global lookup unless the code already needs that. |
| `getProjectionPlane2DRealization` | `ProjectionPlaneRealizationContext` | Reviewer B cites `AuxiliaryProjectionPlane.ts:67-75` and `projectionPlaneUtils.ts:179-186`; Reviewer A cites auxiliary utility mismatch | Read-only realization-cache query for auxiliary/projection matrix computation; not part of mutation. |
| `getProjectionPlane3DRealization` | `ProjectionPlaneRealizationContext` | Reviewer B cites `AuxiliaryProjectionPlane.ts:118-126` and `projectionPlaneUtils.ts:179-186`; Reviewer A cites auxiliary utility mismatch | Read-only realization-cache query for auxiliary/projection matrix computation; not part of mutation. |
| `getPlaneForElement` | Prefer a named `ProjectionOwnerPlaneQuery` / owner-plane lookup port used by mutation/sibling-intersection orchestration; include in realization only if sibling realization truly requires owner lookup | Reviewers cite public `World.ts:494-500` and consumer `ProjectionPlane.ts:1075-1080` | Must follow the exit criteria below. It is never retained only for structural compatibility with `World`. |

Interface naming may differ during implementation, but these ownership boundaries must remain visible: element lookup, projection realization cache lookup, owner-plane query, and mutation operations cannot collapse into one broad `World` clone.

## `World.getPlaneForElement` visibility exit criteria

The decision and implementation must choose exactly one outcome:

1. **Public named owner-plane query:** `getPlaneForElement` remains public only because it is documented as an intentional owner-plane query required by sibling intersection realization/creation. The sanctioned consumers must be named explicitly; current evidence identifies `ProjectionPlane.ts:1075-1080`. If more consumers are found, each must be listed and justified as owner-plane lookup, not structural convenience.
2. **Narrower port with non-public `World` method:** if the final split can replace the public method with a narrower named port/method, route the sibling/owner lookup through that port and restore `World.getPlaneForElement` to non-public visibility.

A decision that leaves public `World.getPlaneForElement` in place without naming its sanctioned consumers is not acceptable.

## Files to change

Contract split:

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
  - Replace the current mixed/optional context with named interfaces such as:
    - `ProjectionElementRealizationContext` for element `realize2D` methods and same-plane/referenced-plane element dependency lookups.
    - `ProjectionPlaneRealizationContext` for projection-plane realization orchestration, auxiliary plane matrix computation, and projection realization-cache lookups.
    - `ProjectionOwnerPlaneQuery` or equivalent for owner-plane lookup if sibling-intersection creation still needs to locate an element's owning plane.
    - `ProjectionPlaneMutationContext` for add/remove/id/dependency/dirty operations.
  - Define explicit inheritance only where behavior is conceptually required. Mutation may extend realization if mutation operations realize dependencies, but realization must not extend mutation.
  - Do not leave `getPoint2D` optional if callers dereference it unconditionally.
  - Do not leave `getPlaneForElement` public only to satisfy structural typing; bind it to the owner-plane exit criteria.

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
  - Preserve same-plane lookup semantics where element code currently uses `getProjectionPlaneById(this.planeId)` followed by plane-local `get*` methods; do not force those paths into a broad global lookup unless the implementation demonstrates that global lookup is the actual dependency.
  - Add strict dependency guards before dereference. Guard behavior must follow existing domain style: assert/fail-fast for invariant violations, return `null` only where the existing return type already models non-realizable geometry.

Projection plane implementation:

- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`
  - Keep mutation operations on `ProjectionPlaneMutationContext` only where mutation behavior is required.
  - Use a read-only realization view for calls into element realization; if the same object is passed, it must be because the mutation context explicitly extends the read-only contract.
  - Use the owner-plane query only for sibling/owner lookup paths sanctioned by the exit criteria.
  - Add build-cited guards for possibly undefined line/circle/point/reference-line values.
  - Remove unused imports cited by the build.
- `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts`
- `frontend/src/utils/projectionPlaneUtils.ts` if needed
  - Retype matrix computation against `ProjectionPlaneRealizationContext` if the helper only reads projection plane/line/hinge data and cached plane realizations.
  - Do not cast a context to `World`.

World implementation:

- `frontend/src/domain/world/World.ts`
  - Explicitly implement or satisfy the selected context contracts through existing methods.
  - Keep `getPlaneForElement` public only under the public named owner-plane query exit. Otherwise restore private/non-public visibility and route sibling/owner lookup through a narrower named port.

## Files/tests/docs/fixtures to delete or revert

- Delete no modules.
- Revert any context edits that leave optional methods unused, duplicate old/new context names, or retain a `World`-typed overload beside a context-typed overload.
- Delete no fixtures/docs/tests.
- Do not alter package/tooling, protected Wave 014 files, `ActionsPanel.vue`, or unrelated Wave 015 categories.

## Explicit forbidden repairs

- Do not make `ProjectionPlaneRealizationContext`, `ProjectionElementRealizationContext`, or any owner-plane query a broad clone of `World`.
- Do not cast context to `World` or use `as any` / `as unknown as`.
- Do not keep compatibility overloads such as `realize2D(worldOrContext: World | ProjectionElementRealizationContext)`.
- Do not add no-op adapter classes whose only job is to satisfy structural typing while forwarding every `World` method.
- Do not rewrite geometry algorithms, introduce new persistence format, alter command/undo semantics, touch rendering DTOs, or fix unrelated build errors opportunistically.
- Do not weaken process-tree identity repairs or restore legacy process/action fields.

## Expected behavior change

No intentional geometric behavior change. The architectural behavior changes are:

- concrete `World` is no longer the public API for element realization;
- mutation, element realization, projection realization-cache lookup, and owner-plane query dependencies are visible in separate contracts;
- missing dependencies are explicit invariant failures rather than unchecked undefined dereferences;
- `World.getPlaneForElement` is either a named owner-plane query with sanctioned consumers or no longer exposed publicly.

## Validation plan

Capture command output under `architecture-audit/cycle-015-typescript-build-contracts/validation/`.

Required focused validation:

1. `npm run test --workspace=frontend -- --run tests/unit/domain/projectionPlaneRealization.spec.ts tests/unit/projectionPlane.spec.ts`
2. Add or adjust focused tests so at least one missing-dependency or missing-owner path is exercised for each guarded lookup category actually changed by implementation:
   - line-line intersection missing line dependency;
   - line-circle intersection missing line or circle dependency;
   - circle-circle intersection missing circle dependency;
   - guide/reference-line missing reference-line dependency;
   - point/segment dependency lookup failure if changed by element realization guards;
   - sibling/owner-plane lookup failure if `getPlaneForElement` or its narrower replacement is touched;
   - auxiliary projection realization missing plane-realization dependency if matrix helpers are retyped.
3. Focused hinge/guide/auxiliary tests if present. If none cover `Guide2D`, `SiblingGuide2D`, `HalfHingeLine2D`, or `BrokenHalfHingeLine2D` on a changed path, add a small focused unit test before claiming this lane complete.
4. Rerun the focused process-tree deletion/undo regression required by the Wave 015 correction decision, proving action-node ids remain authoritative removal ids. This validation protects the prior correction that `RemoveActionFromProcessTreeOp(actionId)` receives action-node ids rather than element ids or legacy process ids.
5. `npm run build --workspace=frontend` after implementation; projection/world errors in `ProjectionPlane.ts`, `AuxiliaryProjectionPlane.ts`, `Element2D.ts`, `Point.ts`, `Line.ts`, `Circle.ts`, `Guide.ts`, `Segment.ts`, `HingeLine.ts`, and `BrokenHalfHingeLine2D.ts` must be gone or separately justified as outside this lane.
6. If any guard changes behavior, tests must demonstrate the invariant/failure mode rather than relying on build success.

Parent Wave 015 full validation remains blocked until every TypeScript build category is closed.

## Risks

- This split touches more files than the direct proposal, but they are all within the projection/world realization owner boundary already identified by the correction decision.
- The split may reveal that some element realization methods need a broader domain query model than current context names can honestly express. If so, stop and propose a higher-level domain realization service in a new reviewed mini-cycle.
- Retyping `computeProjectionPlaneMatrices` may expose hidden utility coupling to `World`; that should be treated as evidence for the split, not patched by a cast.

## Stop conditions

Stop implementation and return to review if:

- any realization context grows beyond read-only projection/element lookup and realization-cache methods;
- any element requires mutation/dependency registration during `realize2D`;
- auxiliary projection matrix computation requires full `World` aggregate state unrelated to projection realization;
- retaining `World.getPlaneForElement` cannot be justified as a named owner query with sanctioned consumers;
- focused tests show changed projection, hinge-line, sibling guide, or intersection geometry behavior that cannot be corrected inside this boundary;
- implementation would require changing geometry algorithms, persistence, rendering DTOs, command factory semantics, or process-tree deletion contracts.

## Why this avoids broad redesign

The proposal does not create new geometry concepts, new services, or new storage. It only names the contracts already implied by current code: `ProjectionPlane.ts` performs mutations and realization orchestration, element classes compute their own realizations from lookup services, auxiliary helpers read projection realizations, and `World` is the concrete aggregate. The split prevents the next implementation from satisfying TypeScript by making every narrow context look like `World`.
