# Proposal Restructure — Promote realization to an explicit domain query boundary

## Summary

This alternative asks whether Wave 018 should move one conceptual layer higher than context-interface narrowing. Instead of only splitting `ProjectionElementRealizationContext`, introduce a domain-owned realization query boundary that owns realization dispatch, cache policy, and dependency lookup contracts explicitly. Presentation adapters and domain callers would ask this boundary to realize elements/planes rather than passing a context through recursive element methods.

This path is intentionally heavier. It should win only if review concludes the direct proposal will inevitably recreate a structural `World` facade or cannot keep projection-plane cache/mutation separate from read-only realization. Current source evidence favors the direct path because base `any`/concrete-`World` signatures are already gone and an existing context vocabulary can likely be narrowed.

## Files to change

Potential new domain realization layer:

- New module such as `frontend/src/domain/world/realization/RealizationQuery.ts` or `frontend/src/domain/world/realization/RealizationContext.ts`.
- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts` moved, reduced, or re-exported only if the new boundary supersedes it.
- `frontend/src/domain/world/Element2D.ts`, `Element3D.ts`, all active 2D/3D realization classes, `Plane.ts`, hinge files, and projection-plane helpers updated to use or delegate to the query boundary.
- `frontend/src/domain/world/World.ts` only as a domain composition point for creating the query from current domain state; it must not gain application/service dependencies.
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`, `Projected3DCanvasReadPort.ts`, and three concern read ports updated to consume the query boundary.
- Focused domain/query/read-port tests and architecture guards.

## Files/tests/docs/fixtures to DELETE

- Delete the broad `ProjectionElementRealizationContext` shape if it is superseded by the query boundary.
- Delete full-context aliases that only mirror the old broad interface.
- Delete recursive direct realization call chains that require passing broad context where replaced by query dispatch.
- Delete duplicated canvas/three `World`-to-context binders.
- Delete presentation adapter raw full-context realization calls replaced by query calls.
- Delete touched broad `as any` / whole-World mocks that exist only for the old context shape.
- Delete compatibility overloads/shims preserving both element-method and query-service realization paths if the query path is selected.

Already-deleted surfaces that must stay gone:

- `Element3D.realize3D(world: any): any`.
- `Plane.getPlaneEquation(world: any)` / `Plane.realize3D(world: any)`.
- Broad `ThreeWorldReadPort` god-interface and canvas public raw seams.

Do not delete unrelated docs/specs/backend/package/tooling files or unrelated dirty `Intersections.ts` / `ActionGroup.ts` changes.

## Expected behavior change

No user-visible behavior change is intended. The architectural behavior would change more than the direct path:

- Realization dispatch becomes a named domain query boundary instead of ad hoc recursive calls receiving a context.
- Cache/realization ownership becomes explicit in one place or split by deliberate contracts.
- Presentation adapters use the query to obtain realized values while keeping Wave 017/028 DTO/read-port boundaries.

## Why this may be better

The current realization context still risks becoming a renamed `World` because normal, plane, and 3D contexts all extend the same full interface and include collection traversal. If implementation inventory shows collection traversal, cache mutation, and recursive realization are inseparable, an explicit realization query boundary may be cleaner than progressively splitting interfaces.

## Why this is likely too broad now

Current source already has typed realization contracts and working adapter boundaries. A query service would touch many domain files, tests, and potentially `World` cache policy. It could become overengineered or duplicate `World` if not designed very tightly. It also risks reopening projection-plane mutation/dependency registration, which Wave 018 explicitly guards against. Therefore this proposal should be treated as the stop/fallback path, not the default.

## Validation plan

Same mandatory validation as Proposal Direct, plus query-specific contract tests:

- Static scans proving old `any`/concrete-`World` signatures and broad context aliases are gone.
- Focused unit tests for the query boundary covering representative 2D point/line/circle/guide, 3D point/line/segment, plane traces, hinge/broken hinge, projection-plane realization/cache behavior, and infeasible cases.
- Focused canvas/three adapter tests proving they consume the query boundary without changing public read-port DTOs.
- Architecture guards banning generic `RuntimeWorld`, `WorldReadModel`, `PresentationWorld`, `getWorld()`, public canvas raw seams, and broad three read-port dependencies.
- Root/frontend lint, full Vitest, build, Playwright e2e, live preview refresh/probe, and live smoke for 2D/3D rendering.

## No-backcompat rationale

If selected, the query boundary must replace the old broad context path rather than coexist with it. Maintaining both query dispatch and old full-context recursive APIs would create parallel realization paths and preserve the bypass Wave 018 is meant to remove.

## Risks

- High churn across domain tests and recursive realization paths.
- Query boundary can become a service locator if it exposes most of `World`.
- Cache invalidation and dirty marking may become ambiguous if moved out of projection-plane/domain owners.
- More difficult to keep behavior identical because realization dispatch order and caching can affect infeasible cases.
- Could pull command/tool/UI/app-shell updates into scope if call sites are not kept mechanical.

## Stop conditions / when a reviewed plan edit is required

Select this path only after review or implementation evidence shows one of these is true:

- Direct context narrowing would require the default context to expose broad collection traversal, mutation, command, persistence, store, renderer, or app-shell capabilities.
- Projection-plane helper/cache semantics cannot remain correct with a narrowed read-only context and separate mutation context.
- A shared canvas/three binder cannot be kept tiny and instead needs query/dispatch/cache ownership.
- Domain realization result semantics must change, requiring a larger domain-model redesign.

If any of those are discovered after Proposal Direct is selected, stop implementation and run a reviewed wave-plan edit or delta proposal before proceeding. Do not hide the deeper redesign inside Wave 018.

## Protected Wave 017/028 and 3D interaction surfaces

Even if this restructure path is chosen:

- Do not change public canvas read-port DTO methods or projected-3D selector contracts except to replace internal realization calls.
- Do not recreate a broad three read-port facade.
- Do not change `ThreeView.vue` lifecycle, scene-host, OrbitControls, camera, renderer, overlay CSS/layout, or pointer-event behavior.
- Preserve `current-ui-contract.spec.ts` overlay test: 3D overlay owns pointer interaction and does not pass drag gestures through to the 2D canvas.
- Do not touch command/undo, persistence, backend, package/tooling, docs/specs, or UI feature work without a reviewed plan edit.

## Recommendation

Prefer Proposal Direct for Wave 018 review. It matches the now-current source: typed realization contracts already exist, and the remaining work is capability narrowing plus binder cleanup. Keep this restructure proposal as the explicit fallback if the critic/reviewer finds that direct narrowing would produce a god-context or require mutation/cache redesign.
