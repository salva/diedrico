# Proposal Restructure — Separate realization query service before changing element contracts

## Summary

Instead of directly evolving the existing context interfaces, introduce a domain-owned realization query service/read model that centralizes recursive realization lookup for 2D, 3D, plane, and hinge elements. Domain element methods would become thinner and call the realization query boundary, or the query service would own realization dispatch entirely. Presentation read-port adapters would ask the service for read models through typed capabilities, avoiding full `World` and avoiding many recursive element-to-element calls.

This asks whether the right fix is one conceptual layer higher than individual `realize2D`/`realize3D` signatures. It may be attractive if implementation evidence shows current recursive realization plus projection-plane cache mutation cannot be made clean with simple contexts. It is **not** selected by default because current evidence shows an existing context vocabulary already exists and can likely be evolved with less architectural churn.

## Files to change

Potential new/changed domain realization layer:

- New module such as `frontend/src/domain/world/realization/RealizationQuery.ts` or `frontend/src/domain/world/projectionPlane/RealizationContext.ts` defining typed query/read capabilities and realization dispatch APIs.
- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts` either moved/renamed into the new realization module or kept as a narrow adapter to it.
- `frontend/src/domain/world/Element2D.ts`, `Element3D.ts`, `Point.ts`, `Line.ts`, `Segment.ts`, `Circle.ts`, `Guide.ts`, 3D element files, `Plane.ts`, hinge files, and projection-plane helper files updated to delegate through the query boundary.
- `frontend/src/domain/world/World.ts` only if it becomes the composition point for creating the realization query object from current domain state; it must not gain application/service dependencies.
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts` and `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` updated to consume the query boundary.
- Focused domain/read-port tests updated or replaced with query-service contract tests.

## Files/tests/docs/fixtures to DELETE

- Delete `Element3D.realize3D(world: any): any`.
- Delete `Plane.getPlaneEquation(world: any)` and `Plane.realize3D(world: any)`.
- Delete direct recursive element call chains that require passing full `World` where replaced by the query service.
- Delete duplicated `ProjectionElementRealizationContext` aliases if the new query boundary supersedes them.
- Delete presentation adapter raw-`World` realization calls in `CanvasWorldReadPort.ts` and `ThreeWorldReadPort.ts`.
- Delete tests that mock broad `World` solely to exercise realization recursion; replace with realization-query tests and typed fixtures.
- Delete compatibility overloads/shims preserving old element method signatures.

## Expected behavior change

No intentional user-visible behavior change. The architectural behavior changes more substantially than the direct proposal:

- Recursive realization lookup becomes a named domain service/query boundary rather than each element freely walking a context that may be structurally equivalent to `World`.
- Presentation adapters receive typed realized read models from the query boundary or use it to realize elements through a single domain-owned API.
- Projection-plane caching can be audited as either query-owned, plane-owned, or explicitly split.

## Why this may be better

The caller inventory shows realization is not only presentation-facing. Commands, tools, UI panels, construction use cases, projection-plane helpers, and many tests call realization directly (`caller-inventory-scan.stdout`). If direct signature changes reveal that the context interface must expose almost every `World` lookup to support recursive element methods, then a query service with explicit dispatch and cache policy may be a cleaner abstraction than a large structural context.

## Why this may be too broad now

Current evidence also shows a usable starting point: `ProjectionElementRealizationContext` already exists with a narrow set of lookup methods (`ProjectionPlaneContext.ts:9-20`), and much of 2D realization is already typed to that context rather than concrete `World`. A full realization query layer would touch more files, risk changing cache semantics, and may accidentally redesign domain ownership beyond Wave 018’s bounded goal. It should only win if review concludes the direct context evolution would create a renamed `World` facade.

## Validation plan

Same mandatory validation as the direct proposal, plus extra focused query-boundary tests:

- Static scans proving no old full-`World`/`any` realization signatures or compatibility overloads remain.
- Focused unit tests for the new realization query service: representative point/line/circle/guide, 3D point/line/segment, plane trace, hinge, and projection-plane cache behavior.
- Focused canvas/three read-port tests proving adapters consume the query/context boundary.
- Full root/frontend lint, Vitest, build, Playwright e2e.
- Live preview refresh, HTTP 200 probe, and live smoke for 2D/3D rendering.

## No-backcompat rationale

If this path is chosen, the old element-contract API should be deleted rather than wrapped. A query layer plus old `realize3D(world)` methods would be a parallel path and would preserve the exact bypass Wave 018 is meant to remove.

## Risks

- High churn across domain, commands/tools/UI tests, and projection-plane caching.
- Could become an overengineered service locator if it merely renames `World` to `RealizationQuery` while exposing the same mutable surface.
- May accidentally reopen projection-plane mutation/dependency ownership, which Wave 018 explicitly guards against.
- More difficult validation because cache semantics and recursive realization dispatch are central to many tests.

## Stop conditions for broader domain redesign

Stop and request a wave-plan edit or delta review if:

- The realization query service needs to own dependency registration, command construction, process-tree updates, persistence, renderer state, stores, or Vue component lifecycle.
- Cache invalidation and dirty marking cannot be preserved without redesigning projection-plane mutation ownership.
- The new service would duplicate `World` APIs wholesale rather than provide a small query/realization contract.
- The implementation requires deleting/replacing large command/tool/UI surfaces rather than mechanically updating call sites.

## Recommendation

Prefer the direct proposal for implementation unless review identifies a specific blocker: the direct typed-context path is central, smaller, aligns with the existing `ProjectionElementRealizationContext`, and can delete the `World`/`any` seams without creating a new domain service. Keep this restructure proposal as the fallback if the reviewer believes direct context evolution will necessarily become a god-context.
