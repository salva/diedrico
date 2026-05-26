# Decision — Projection Plane / World Split

**Stage:** `cycle-015-projection-world-split-decision`  
**Parent wave:** Cycle 015 — TypeScript build contracts  
**Decision status:** review convergence complete after proposal corrections.  
**Reviewer convergence:** Reviewer A and Reviewer B both recommend `proposal-restructure.md` after the corrected proposals resolved their documented blockers.  
**Selected implementation path:** `projection-world-split/proposals/proposal-restructure.md`.  
**Source/test/package/tooling implementation edits in this decision stage:** none.

## Artifacts cited

- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/scope-check.md`
- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/proposals/proposal-direct.md`
- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/proposals/proposal-restructure.md`
- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/reviews/reviewer-a.md`
- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/reviews/reviewer-b.md`
- `architecture-audit/cycle-015-typescript-build-contracts/correction-decision.md`
- `architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md`
- `architecture-audit/cycle-015-typescript-build-contracts/validation/frontend-build.correction-after-regression-fix.stdout`
- `architecture-audit/cycle-015-typescript-build-contracts/validation/projection-context.final.stdout`

## Convergence basis

This mini-cycle was required because the prior Cycle 015 correction implementation hit the projection-plane/world split stop condition. The implementation log records that the attempted narrow context migration was reverted/deferred, focused projection tests still passed, and `npm run build --workspace=frontend` remained red on projection/world ownership errors. The scope check then isolated this lane without implementation edits.

Reviewer A found three blocking proposal-document issues: the direct proposal risked recreating `World` structurally, both proposals needed sharper `World.getPlaneForElement` exit criteria, and validation needed explicit strict-guard plus process-tree identity proof. Reviewer B independently agreed and additionally required a minimum contract table mapping each required method to an owning interface and call-site evidence.

The corrected proposals now address those blockers:

- `proposal-direct.md` states that it yields to restructure if auxiliary matrix helpers plus sibling-owner lookup remain required in the same public read-only contract.
- Both proposals define explicit `World.getPlaneForElement` exit criteria: it may remain public only as an intentional named owner-plane query, otherwise it must be replaced/restored non-public.
- `proposal-restructure.md` now includes the required contract table for `getPoint2D`, `getLine2D`, `getCircle2D`, `getProjectionPlaneById`, `getProjectionPlane2DRealization`, `getProjectionPlane3DRealization`, and `getPlaneForElement`.
- Validation plans now require focused guard-path proof plus the protected process-tree deletion/undo regression.

No remaining reviewer blocker is accepted into implementation. Residual risk is limited to implementation discovery: if the named contracts still cannot honestly express the owner boundary, the implementation must stop again rather than widen the context into a pseudo-`World`.

## Selected alternative

Select `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/proposals/proposal-restructure.md` as the binding implementation path.

Rationale:

- The red build evidence is not a local call-site mismatch; it spans element `realize2D` APIs typed to concrete `World`, projection-plane mutation orchestration trying to pass smaller contexts, auxiliary projection matrix utilities still typed to `World`, strict undefined lookup failures, and public owner-plane lookup pressure.
- Restructure names the actual boundaries: element realization, projection-plane realization, owner-plane query, projection-plane mutation, and concrete `World` aggregate implementation.
- It better satisfies the project priority order by improving contract ownership and code quality rather than making the compiler accept a broad structural read-only subset of `World`.
- It incorporates the direct proposal's anti-shim, anti-cast, no-tooling-weakening, protected-surface, and focused-validation constraints.

## Rejected / defer-incorporated alternative

`proposal-direct.md` is rejected as the implementation winner.

Rejected aspects:

- A single read-only context is too likely to aggregate same-plane element lookup, cross-plane realization lookup, auxiliary matrix reads, and owner-plane discovery into a renamed `World` subset.
- The current evidence already shows two separate read models: element same-plane lookup through projection planes and projection-plane/auxiliary orchestration through cross-plane realization caches.

Incorporated aspects:

- no source-module deletion is required for this mini-cycle;
- optional context declarations/imports that are not consumed by the final selected contracts must be removed or reverted;
- no `World` casts, dual old/new paths, compatibility overloads, or TypeScript/tooling suppressions are allowed;
- validation must include focused projection tests, guard-path tests, protected process-tree identity proof, and frontend build rerun.

## Binding implementation scope

The next implementation stage may touch only this projection/world realization owner boundary and direct tests/logs needed to validate it:

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
- `frontend/src/domain/world/Element2D.ts`
- `frontend/src/domain/world/Point.ts`
- `frontend/src/domain/world/Line.ts`
- `frontend/src/domain/world/Circle.ts`
- `frontend/src/domain/world/Guide.ts`
- `frontend/src/domain/world/Segment.ts`
- `frontend/src/domain/world/HingeLine.ts`
- `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`
- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`
- `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts`
- `frontend/src/utils/projectionPlaneUtils.ts` only if matrix helper typing is directly required
- `frontend/src/domain/world/World.ts` only to implement the selected named contracts and apply the `getPlaneForElement` exit decision
- focused unit tests directly covering changed projection/world, hinge/guide/auxiliary, strict-guard, owner-plane, and protected process-tree identity behavior
- `architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md` and stable validation logs under `architecture-audit/cycle-015-typescript-build-contracts/validation/`

No command-output, UI/store, project dialog, Google Drive, persistence, rendering DTO, toolbar, or unrelated service/domain build-category repairs are authorized by this decision.

## Contract boundaries to implement

The implementation must define named contracts in `ProjectionPlaneContext.ts` or an equivalently narrow projection-plane context module. Names may vary only if the implementation log maps them back to these responsibilities.

| Responsibility | Required boundary |
| --- | --- |
| Element same-plane/dependent realization lookup | `ProjectionElementRealizationContext` or equivalent read-only element realization port. It may expose only lookup/plane access required by element `realize2D` methods: `getProjectionPlaneById`, `getPoint2D`, `getLine2D`, and `getCircle2D` where active call sites prove the need. |
| Projection-plane/auxiliary realization lookup | `ProjectionPlaneRealizationContext` or equivalent read-only projection realization port. It owns `getProjectionPlane2DRealization` and `getProjectionPlane3DRealization` where auxiliary matrix computation or plane realization needs cached plane realizations. It must not become a generic bag of `World` reads. |
| Owner-plane query | A named `ProjectionOwnerPlaneQuery` or equivalent. It owns `getPlaneForElement(elementId)` only for sanctioned sibling/intersection owner lookup. |
| Mutation orchestration | `ProjectionPlaneMutationContext` or equivalent. It owns id generation, dependency registration, dirty marking, add/remove bookkeeping, and may extend the read-only ports only where mutation orchestration currently realizes dependencies. |
| Concrete aggregate | `World` implements/satisfies the selected ports intentionally, but no projection or element API may require concrete `World` unless it truly needs full aggregate behavior. |

Interface inheritance rules:

- Realization ports must not extend mutation/id/dependency/dirty services.
- Mutation may extend read-only realization/query ports only because current mutation orchestration realizes dependencies while adding/removing elements.
- Same-plane lookup should remain named as same-plane/element realization behavior where that is the truer owner; do not force all element realization into global lookup merely to satisfy type shape.
- Optional methods are forbidden when callers treat them as required. The current optional `getPoint2D?` pattern must not survive unless all callers branch safely on absence.

## `World.getPlaneForElement` decision

The implementation must choose and record exactly one of these outcomes in the implementation log:

1. **Public named owner-plane query:** `World.getPlaneForElement` remains public only as an intentional owner-plane query serving a named projection owner-plane port. Sanctioned consumers are limited to the projection-plane sibling/intersection creation path evidenced by `ProjectionPlane.ts:1075-1080` and the selected narrow port serving that path.
2. **Narrower port / non-public aggregate method:** if owner lookup can be moved behind a narrower projection-plane method or no sanctioned consumer remains, `World.getPlaneForElement` must return to non-public visibility.

It must not remain public merely because a projection context is being made structurally compatible with `World`.

## Files/surfaces to revert, remove, or preserve

Required cleanup inside this lane:

- Remove/revert optional or duplicate context members that are not part of the final named contracts.
- Remove `World` imports from element classes where they only type `realize2D`.
- Remove unused imports introduced by the split, including any currently build-cited projection-plane unused imports if still present.
- Remove any dual old/new `realize2D(World | Context)` or compatibility overload path.

No source module, package file, tooling file, fixture, or documentation file is scheduled for deletion by this mini-cycle.

Protected surfaces:

- Wave 014 protected files remain off-limits unless a current direct build-cited dependency requires them; none is expected for this projection/world lane.
- `frontend/src/components/panels/ActionsPanel.vue` is protected and is not in scope.
- The process-tree identity correction is protected: `RemoveActionFromProcessTreeOp(actionId)` must continue receiving authoritative action-node ids, not element ids, group ids, subprocess ids, or payload ids.

## Forbidden repairs

Implementation must not introduce:

- `@ts-ignore`, `@ts-expect-error`, skipped tests, build allowlists, tsconfig/package/tooling weakening, or alternate build paths;
- `as any`, `as unknown as`, context-to-`World` casts, or structural typing escape hatches;
- adapter classes whose only purpose is to forward broad `World` shape;
- dual old/new realization APIs or compatibility shims;
- mutation services in read-only realization contracts;
- public `World.getPlaneForElement` solely for compiler shape compatibility;
- broad geometry algorithm redesign, persistence change, rendering DTO rewrite, command/controller cleanup, toolbar repair, dialog/service repair, Google Drive repair, or arbitrary formatting/cleanup.

## Validation requirements

Capture full stdout/stderr under `architecture-audit/cycle-015-typescript-build-contracts/validation/` and record commands, log paths, and outcomes in `implementation-log.md`.

Required focused validation for the implementation stage:

1. Run the existing projection-focused tests from the frontend workspace, including `tests/unit/domain/projectionPlaneRealization.spec.ts` and `tests/unit/projectionPlane.spec.ts` where present.
2. Run focused hinge/guide/auxiliary tests if present. If no existing tests cover changed `Guide2D`, sibling guide, half/broken hinge-line, or auxiliary projection behavior, add focused tests before claiming this lane complete.
3. Add or update guard-path tests for every changed strict undefined/missing-owner category. At minimum, when touched, cover line-line intersections, line-circle intersections, circle-circle intersections, guide/reference-line lookup, auxiliary projection matrix/realization lookup, and sibling owner-plane lookup.
4. Rerun the protected process-tree deletion/undo regression proving action-node ids remain the authoritative removal ids and undo preserves action identity.
5. Run `npm run build --workspace=frontend` on the existing `vue-tsc && vite build` path. Projection/world errors in the scoped files must be gone or the lane is not complete. Residual non-projection Wave 015 build errors must be separated explicitly in the implementation log.

Full Wave 015 validation and live preview refresh remain later stages after all TypeScript build-contract categories are closed.

## Stop conditions

The next implementation must stop and return for a new reviewed mini-cycle if any of these occur:

- the realization context grows beyond read-only projection/element lookup and realization-cache methods;
- same-plane lookup, cross-plane realization lookup, and owner-plane lookup cannot be assigned to named interfaces without creating a pseudo-`World`;
- element realization needs mutation/dependency registration services;
- auxiliary projection matrix computation requires full `World` aggregate state unrelated to projection realization;
- retaining public `World.getPlaneForElement` cannot be justified as a named owner-plane query with sanctioned consumers;
- implementation requires casts, suppressions, compatibility overloads, tooling weakening, broad geometry redesign, or unrelated category repair;
- focused tests show projection, hinge-line, sibling guide, intersection, or protected process-tree identity behavior divergence that cannot be fixed inside this boundary.

## Expected behavior change

No user-observable geometry behavior is intended. The intended change is architectural and type-level: element realization and projection-plane realization/mutation depend on explicit named ports instead of concrete `World`; owner-plane lookup is either named honestly or hidden again; missing dependencies fail through explicit guarded invariants or existing nullable return contracts.

## Accepted residual risks

- The split touches more files than a local direct repair, but the file set is exactly the owner boundary exposed by the red build and reviewed scope check.
- Retyping `computeProjectionPlaneMatrices` may expose further utility coupling to `World`; if it requires unrelated aggregate behavior, the stop condition applies.
- The parent Wave 015 build may remain red after this lane because other build-contract categories are still unresolved; this decision only authorizes the projection/world lane.

## Next stage recommendation

Proceed to a projection/world implementation stage only if this decision artifact passes stage review. The implementation should use `proposal-restructure.md`, this decision, `correction-decision.md`, and the current `implementation-log.md` as binding constraints. It must not implement any unrelated Cycle 015 build-contract category and must not claim completion without the focused validation and build evidence required above.
