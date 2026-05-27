# Cycle 018 Decision — Domain realization context boundary

## Decision status

Cycle 018 is **unblocked for implementation**.

Reviewed artifacts inspected for this decision:

- `architecture-audit/cycle-018-domain-realization-context-boundary/scope-check.md`
- `architecture-audit/cycle-018-domain-realization-context-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-018-domain-realization-context-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-018-domain-realization-context-boundary/reviews/round-01-review.md`
- `architecture-audit/wave-plan.md` Wave 018 entry

Current path correction is binding for implementation: the active context file is `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`, not the stale `frontend/src/domain/world/ProjectionPlaneContext.ts` path.

Review convergence is complete. `round-01-review.md` declares **NO BLOCKING ISSUES** and recommends proceeding with `proposal-direct.md`, while preserving explicit stop conditions for projection-plane mutation ownership and god-context risk. No correction round is required before implementation.

## Selected implementation path

Select **`proposal-direct.md` — Typed realization contexts at the existing domain boundary**.

Rationale:

- It directly advances Wave 018's target outcome: domain realization APIs consume explicit typed realization/read contexts instead of concrete mutable `World` or broad `any`.
- It uses the existing `ProjectionElementRealizationContext` vocabulary already present in `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts` rather than creating a parallel abstraction.
- It deletes the known central seams: `Element3D.realize3D(world: any): any`, `Plane` broad `any` realization/plane-equation contracts, concrete `World` realization signatures in active 3D paths where typed context suffices, and raw read-port adapter calls that pass full `World` into realization APIs.
- It keeps ownership bounded: domain elements retain realization algorithms, projection planes retain cache/helper ownership, and canvas/three read-port adapters remain the runtime boundary that wraps concrete `World`.
- It best respects the project priorities: clean boundary first, precise types, no compatibility shims, no broadening into lower-centrality waves.

## Rejected / fallback alternative

Reject **`proposal-restructure.md`** for Cycle 018 implementation as the primary path.

Reason: the restructure path may become appropriate only if the direct context evolution proves impossible, but current evidence shows an existing narrow context vocabulary and no reviewed need for a new realization query service. Selecting restructure now would add churn, risk a service-locator-shaped renamed `World`, and reopen projection-plane cache ownership before proving the smaller domain-boundary fix is insufficient.

Fallback handling: if implementation inventory proves the direct path necessarily creates a god context, requires projection-plane mutation/dependency ownership redesign, or needs a new domain realization query service, the implementer must stop and request a reviewed delta/plan-edit mini-cycle. Do not smuggle the restructure path into implementation under the direct decision.

## Bound implementation scope

Cycle 018 implementation may change only the files and surfaces needed for the selected direct path.

Primary in-scope domain contracts and elements:

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
- `frontend/src/domain/world/Element2D.ts` only where needed for type/name alignment
- `frontend/src/domain/world/Element3D.ts`
- `frontend/src/domain/world/Point3D.ts`
- `frontend/src/domain/world/Line3D.ts`
- `frontend/src/domain/world/Segment3D.ts`
- `frontend/src/domain/world/Plane.ts`
- `frontend/src/domain/world/HingeLine.ts` only if type alignment is needed
- `frontend/src/domain/world/BrokenHingeLine.ts`
- 2D realization classes only where needed to align with the existing projection-element context:
  - `frontend/src/domain/world/Point.ts`
  - `frontend/src/domain/world/Line.ts`
  - `frontend/src/domain/world/Segment.ts`
  - `frontend/src/domain/world/Circle.ts`
  - `frontend/src/domain/world/Guide.ts`
  - `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`
- Projection-plane helper classes only where helper signatures must consume the refined context while preserving plane-owned cache mutation:
  - `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`
  - `frontend/src/domain/world/projectionPlane/FixedProjectionPlane.ts`
  - `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts`

In-scope application adapter surfaces:

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`

In-scope focused tests:

- `frontend/tests/unit/domain/realizationCache.spec.ts`
- representative existing domain realization tests covering 2D and 3D realization, including point/line/circle/guide/plane/hinge/segment paths touched by the implementation
- `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts`
- `frontend/tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts` only if adapter expectations change
- `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
- `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts` only if orchestration expectations change

Implementation must begin by recording a caller inventory in `implementation-log.md` for active `realize2D(...)`, `realize3D(...)`, `getPlaneEquation(...)`, projection-plane realization helper APIs, concrete realization `World` imports, broad `any` realization contracts, and presentation read-port adapter realization calls. Each discovered category must be marked changed, mechanical update, deferred, or out of scope.

## Required deletes

The implementation must delete, not preserve behind overloads or shims:

- `Element3D.realize3D(world: any): any`.
- `Plane.getPlaneEquation(world: any)` and `Plane.realize3D(world: any)` broad contracts where touched.
- Concrete `World` realization signatures/imports in active `Point3D`, `Line3D`, `Segment3D`, `Plane`, and `BrokenHingeLine` paths where typed context supplies the required capabilities.
- `CanvasWorldReadPort` and `ThreeWorldReadPort` calls that pass raw `World` directly into domain realization APIs once the typed context wrapper is available.
- Transitional overloads, compatibility wrappers, duplicate context aliases, dead exports, or type aliases that preserve both old full-`World` and new typed-context APIs.
- Touched test helper `as any` mocks or whole-`World` test doubles that only exist to satisfy weak realization contracts; replace them with typed realization-context fixtures.

## Forbidden repairs and protected out-of-scope surfaces

Do not broaden Cycle 018 into any of the following without a reviewed delta/plan-edit mini-cycle:

- Wave 019 3D scene-host lifecycle/runtime/platform cleanup.
- Broad canvas or three rendering selector redesign beyond adapter calls required by the realization-context contract.
- Command/undo architecture, broad command-persistence work, process-tree ownership, tool/controller redesign, or construction-use-case redesign beyond mechanical signature updates.
- Persistence/project schema, Drive/local project services, app-shell orchestration, backend/frontend contract stance, backend code, docs/spec cleanup, debug placeholder cleanup, validation-platform hardening, package/tooling churn, dependency upgrades, or formatter/config changes.
- Projection-plane mutation/dependency registration/cache ownership redesign. If the helper parameter cannot be narrowed without redesigning mutation ownership, stop and request reviewed plan edit instead.
- Source mining of stale discarded audit cycles or forbidden secret/config files.

Mechanical call-site updates in command/tool/UI code are allowed only if required by changed TypeScript signatures and must not become architecture changes to those layers.

## Validation requirements

Implementation validation logs must be written under:

- `architecture-audit/cycle-018-domain-realization-context-boundary/validation/`

Minimum required validation:

1. Pre-edit and post-edit static scans for `realize2D`, `realize3D`, `getPlaneEquation`, concrete `World` imports in realization classes, broad `any` realization contracts, duplicate realization-context aliases, and read-port adapter calls that pass full `World` into realization APIs.
2. Focused Vitest for changed realization context/domain element/read-port adapter modules, including representative 2D realization, 3D realization, plane/hinge behavior, `canvasWorldReadPort`, and three-presentation read-port/concern-selector coverage.
3. Root lint where defined.
4. Frontend lint where defined.
5. Full root Vitest where defined.
6. Full frontend Vitest.
7. Root build where defined.
8. Frontend build.
9. Root/frontend Playwright e2e because this wave touches user-observable canvas and 3D rendering behavior.
10. Live preview refresh bound to `0.0.0.0:5173`, an HTTP 200 reachability probe, and a Playwright/live smoke check proving representative 2D canvas primitives and the 3D view still render.

Any validation failure attributable to the implementation rejects the wave until fixed. Any skipped command must be explicitly justified in `implementation-log.md`; Playwright/e2e and preview smoke may not be skipped silently.

## Stop conditions

Stop implementation and request a reviewed delta/plan-edit mini-cycle if any of the following occur:

- The smallest realization context needs command execution, process-tree mutation, persistence/project-service access, Vue stores/components, renderer objects, or app-shell services.
- The context grows into a broad renamed `World` facade rather than a narrow set of realization lookup/read capabilities.
- Projection-plane cache/dependency mutation cannot remain plane-owned while narrowing the realization parameter.
- Plane or hinge changes require changing geometric semantics rather than only typing/context boundaries.
- The work requires reopening Wave 016/017 selector architecture, Wave 019 scene-host lifecycle, command/undo, persistence, app-shell, backend, docs/specs, debug cleanup, or package/tooling.
- A source/test change outside the bound scope is needed for anything other than mechanical signature alignment.

## Residual risks accepted for implementation

- The direct context can still become too broad if implementation exposes capabilities by convenience rather than caller inventory. Mitigation: build interfaces from inventory, keep capabilities read-oriented, and use static scans.
- Projection-plane helpers combine realization with cache/dependency behavior. Mitigation: preserve plane-owned mutation semantics and stop if ownership redesign is required.
- Signature changes may ripple through tests and some command/tool/UI call sites. Mitigation: keep those edits mechanical and record them in the implementation log.
- No user-visible behavior change is intended, but realization affects canvas and 3D rendering. Mitigation: focused realization/read-port tests, full suites, Playwright e2e, preview refresh, and live smoke are mandatory.

## Next stage recommendation

Proceed to `cycle-018-implement-domain-realization-context-boundary` only under the constraints above. No blockers remain before implementation according to `round-01-review.md`.
