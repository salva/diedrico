# Cycle 018 Decision (post-017) — Domain realization context boundary

## Decision status

Cycle 018 is **approved for implementation** after reviewed proposal convergence.

Reviewed artifacts inspected for this decision:

- `architecture-audit/cycle-018-domain-realization-context-boundary/scope-check.md`
- `architecture-audit/cycle-018-domain-realization-context-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-018-domain-realization-context-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-018-domain-realization-context-boundary/critique/round-01-critique.md`
- `architecture-audit/cycle-018-domain-realization-context-boundary/reviews/round-01-review-post-017.md`
- `architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/implementation-log-post-028.md`
- `architecture-audit/wave-plan.md` Wave 018 entry
- Path-scoped decision evidence captured for this stage under `.saivage/stages/cycle-018-decision-post-017/design-notes/`.

`round-01-review-post-017.md` reports **Blocking issues: None for proposal approval** and recommends advancing with `proposal-direct.md`. No correction round is required before implementation.

The design critique prerequisite is satisfied through the documented failure-tolerance path: `critique/round-01-critique.md` is marked `synthesized_by: manager` with `reason: critic_dispatch_unavailable` after two failed critic dispatches, and it raises **no blocking issues**. This is accepted design-loop evidence for the proposal set; it does not broaden implementation scope.

## Source-control hygiene context

Broad `git status` is too large/noisy in this workspace, so this decision relies on path-scoped status/diff evidence. The scoped evidence shows the following unrelated dirty production files remain present and protected:

- `frontend/src/domain/calculations/Intersections.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`

Wave 018 implementers must not stage, revert, incorporate, or depend on those modifications unless a separate reviewed assignment explicitly brings them into scope. Existing audit/validation/live-preview noise under `architecture-audit/cycle-018-domain-realization-context-boundary/validation/` is also not authorization for source implementation and must not be cleaned up or folded into Wave 018 implementation except for new logs required by that implementation stage.

This decision stage performs no source, test, package, tooling, backend, secret/config, or production implementation changes.

## Selected implementation path

Select **`proposal-direct.md` — narrow the existing realization context family**.

Rationale:

- It targets the actual current seam: `ProjectionElementRealizationContext` still exposes lookup, realization lookup, and broad collection traversal to every realization algorithm, and the specialized context names currently extend that same full capability set.
- It preserves the post-Wave-017 and post-Wave-028 presentation boundaries instead of reopening selector/read-port architecture.
- It improves architecture by narrowing capabilities and deleting duplicate context/binder surfaces rather than introducing a new query-service layer before evidence requires it.
- It respects the no-backcompat priority: old broad aliases, duplicate binders, compatibility overloads, weak whole-World mocks, and dead exports must be deleted rather than wrapped.

## Rejected alternative and fallback rule

Reject **`proposal-restructure.md`** as the primary Cycle 018 implementation path.

Reason: current source already has typed 3D/plane realization signatures, and the remaining architectural defect can be addressed by capability narrowing at the existing domain boundary. A new domain realization query boundary would be broader, risk reopening cache/mutation ownership, and could become a service-locator-shaped renamed `World`.

Fallback/stop path: keep `proposal-restructure.md` only as the documented stop path. If implementation evidence proves the direct path cannot narrow contexts without recreating a broad `World` facade, collapsing projection-plane mutation/cache concerns into read-only realization, or changing geometric semantics, implementation must stop and request a reviewed delta/plan-edit mini-cycle. Do not smuggle the restructure path into the selected direct implementation.

## Exact bound implementation scope

Implementation may change only the surfaces needed to execute the direct proposal.

### Primary domain contracts

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
  - Split broad read-only realization capabilities into explicit interfaces.
  - Keep `ProjectionPlaneMutationContext` separate from read-only realization contracts.
- `frontend/src/domain/world/Element2D.ts`
- `frontend/src/domain/world/Element3D.ts`
- `frontend/src/domain/world/Plane.ts`
- `frontend/src/domain/world/HingeLine.ts`
- `frontend/src/domain/world/BrokenHingeLine.ts`
- 2D/3D realization classes only where signatures/imports must consume narrower contexts:
  - `frontend/src/domain/world/Point.ts`
  - `frontend/src/domain/world/Line.ts`
  - `frontend/src/domain/world/Segment.ts`
  - `frontend/src/domain/world/Circle.ts`
  - `frontend/src/domain/world/Guide.ts`
  - `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`
  - `frontend/src/domain/world/Point3D.ts`
  - `frontend/src/domain/world/Line3D.ts`
  - `frontend/src/domain/world/Segment3D.ts`
- Projection-plane helper classes only for context-type alignment:
  - `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`
  - `frontend/src/domain/world/projectionPlane/FixedProjectionPlane.ts`
  - `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts`

### Application/presentation adapter surfaces

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/canvasPresentation/Projected3DCanvasReadPort.ts`
- `frontend/src/application/threePresentation/ThreeRealizationContext.ts`
- `frontend/src/application/threePresentation/ThreePlanarElementReadPort.ts`
- `frontend/src/application/threePresentation/ThreeGuideReadPort.ts`
- `frontend/src/application/threePresentation/ThreeHingeReadPort.ts`

A new tiny shared application helper, for example under `frontend/src/application/presentation/`, is allowed only if it is purely a `World` → domain realization-context adapter. It must not expose `getWorld()`, selector DTOs, app-shell state, command state, persistence, renderer lifecycle, style/visibility policy, or a generic read-model/app-kernel facade.

### Focused tests and architecture guards

Implementation may update focused tests for changed context/domain/read-port surfaces, especially:

- `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts`
- `frontend/tests/unit/application/canvasPresentation/projected3DCanvasSelector.spec.ts`
- `frontend/tests/unit/application/appShell/Cycle027Architecture.test.ts`
- `frontend/tests/unit/application/threePresentation/threePresentationArchitectureBoundary.spec.ts`
- `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
- representative domain realization tests for touched point/line/segment/plane/hinge/projection-plane/cache paths.

Do not rewrite broad test suites or change package/tooling to make this wave pass.

## Required ownership rules and context narrowing rules

### `ProjectionElementRealizationContext`

Treat this as the primary defect to correct. It must no longer be the default god-context that grants every realization algorithm both normal lookup and broad collection traversal by convenience.

Expected direction:

- A normal read-only realization context should include only element/plane lookup and realization lookup capabilities needed by ordinary `realize2D`, `realize3D`, `getPlaneEquation`, and projection-plane helper calls.
- `getAllProjectionPlanes()` and `getAllHingeLines()` must be removed from the default context if implementation inventory confirms they are collection/diagnostic-only concerns.
- If a realization path genuinely needs collection traversal, that capability must move to a separately named collection/diagnostic context consumed only by that path.

### `Element3DRealizationContext`

Do not leave `Element3DRealizationContext` as a meaningless alias that extends the whole broad `ProjectionElementRealizationContext`. Either make it an explicit capability-sized interface/composition or delete the alias if a clearer context name replaces it.

Active 3D realization signatures must stay typed and must not regress to `any` or concrete `World` parameters.

### `ProjectionPlaneRealizationContext` and `PlaneEquationRealizationContext`

Do not preserve aliases that simply recreate the old full context. Plane/projection-plane realization should consume the narrowest read-only capabilities required. `ProjectionPlaneMutationContext` may extend an appropriate read-only context plus mutation-only capabilities, but dependency registration, `markDirty`, ID generation, and default-label generation must remain mutation-only concerns.

### `realize2D` / `realize3D` / `getPlaneEquation` callers

Implementation must first produce an authoritative caller inventory for:

- `realize2D(...)`
- `realize3D(...)`
- `getPlaneEquation(...)`
- projection-plane realization helper APIs
- current uses of `ProjectionElementRealizationContext`, `Element3DRealizationContext`, and collection methods
- concrete `World` imports or `any` realization contracts
- canvas/three presentation adapter realization calls

Each category must be marked in the implementation log as changed, mechanically updated, deliberately deferred, or out of scope. Parameter renaming from `world` to `context` is allowed only where files are already touched for contract changes; broad cosmetic churn is out of scope.

### Canvas and three binder ownership

Canvas and three presentation may bind a concrete `World` at the application adapter boundary, but the binder must expose only the selected narrow realization capabilities.

- `CanvasWorldReadPort.ts` must keep the public `CanvasWorldReadPort` API limited to `getCanvasPlaneTransforms`, `getPlaneCanvasItems`, and `getProjected3DCanvasItems`.
- `Projected3DCanvasReadPort.ts` remains the localized projected-3D raw traversal adapter; do not move that traversal into a generic public canvas seam.
- `ThreeRealizationContext.ts` must not directly own broad collection traversal. Wave 017’s correction remains binding: collection providers are supplied by concern adapters/read ports that own that traversal.
- `ThreePlanarElementReadPort.ts`, `ThreeGuideReadPort.ts`, and `ThreeHingeReadPort.ts` must continue to own or decline collection traversal according to their concern responsibilities.

### Collection traversal ownership

Collection traversal must not be reintroduced as a default realization capability just because structural typing makes it convenient. Known current consumers such as `HingeLine.realize3D` diagnostics and `BrokenHalfHingeLine2D` must be inventoried before deleting collection methods from the default context. If collection traversal remains necessary, it must be named as a special collection/diagnostic capability and passed only to the paths that require it.

### `World` structural typing and casts

Do not solve compile errors by casting `World` to a broad structural context, adding `as any`, or introducing a `RuntimeWorld` / `WorldReadModel` / `PresentationWorld` facade. Touched tests should use typed fixtures for the required capability interface rather than whole-World mocks or `as any` shims.

## Required DELETE list

Delete, not wrap or preserve:

- `getAllProjectionPlanes()` and `getAllHingeLines()` from the default realization context if caller inventory confirms they are not normal realization dependencies.
- Context aliases that only extend the old full context without narrowing, including `ProjectionPlaneRealizationContext`, `Element3DRealizationContext`, and `PlaneEquationRealizationContext`, where replaced by explicit capability interfaces.
- One duplicate context binder body (`createCanvasRealizationContext` or `createThreeRealizationContext`) if a shared tiny binder is introduced; otherwise delete broad collection methods from both binder outputs.
- Diagnostic full-collection payload coupling inside normal realization signatures where it is the only reason collection methods remain on the base context.
- Touched test `as any` / whole-World mocks used only to satisfy the old weak context type.
- Transitional overloads, compatibility aliases, dead exports, and dual old/new context APIs.

Already-deleted surfaces must stay deleted:

- `Element3D.realize3D(world: any): any`
- `Plane.getPlaneEquation(world: any)` / `Plane.realize3D(world: any)`
- concrete `World` realization signatures in active 3D element realization classes
- broad public `ThreeWorldReadPort` selector/god-interface role
- public canvas raw collection/realization seams deleted by Wave 028

Do not delete docs/specs/backend/package/tooling files in this wave.

## Relation to Wave 017 and Wave 028 boundaries

Wave 018 is a follow-up to the realization-context ownership issue documented at Wave 017 closure. It must preserve, not reopen, the Wave 017 three-presentation split:

- `ThreeWorldReadPort.ts` remains a composition/type-export module, not a broad read-port facade.
- Three concern selectors/read ports must not regain `Pick<ThreeWorldReadPort, ...>` or other broad selector dependencies.
- `ThreeView.vue` must remain a composition shell; do not change scene-host, OrbitControls, camera, renderer, CSS, layout, or overlay pointer handling.

Wave 018 must also preserve Wave 028 canvas selector/read-port boundaries:

- Public canvas consumers must not receive raw collection or realization seams.
- `Projected3DCanvasReadPort.ts` remains the protected internal adapter for projected-3D raw traversal.
- Canvas selector DTO contracts and user-visible item shapes are not redesigned by this wave.

## 3D overlay and user-observable behavior preservation

No intentional user-visible behavior change is authorized. The following must remain equivalent:

- 2D canvas rendering, transforms, style/visibility, selection/hit-adjacent behavior, and projected 3D-on-2D overlays.
- 3D rendering of projection planes, planar elements, selected guides, guide intersections, hinges, and reconstructed 3D elements.
- `.three-view-overlay` keeps `pointer-events: auto` and drag gestures inside the overlay do not pass through to move the SVG canvas.

E2E and live/browser smoke must explicitly preserve the 3D overlay pointer-boundary behavior.

## Forbidden generic facades and out-of-scope surfaces

Forbidden in Wave 018 implementation:

- generic read-model/world/app-kernel facades such as `RuntimeWorld`, `WorldReadModel`, `PresentationWorld`, broad `getWorld()`, or equivalent service-locator APIs
- command/undo, process-tree, persistence, project schema, Drive/local services, app-shell orchestration, backend/frontend contract work
- broad canvas/three rendering selector redesign beyond mechanical adapter wiring
- scene-host, OrbitControls, camera, renderer, overlay CSS/layout/pointer implementation changes
- UI feature work, tool/controller redesign, package/tooling churn, dependency upgrades, formatter/config changes
- docs/spec cleanup or stale audit-history mining
- secret/config reads or edits

If any of these become necessary, stop and request a reviewed delta/plan edit.

## Validation requirements

Implementation validation logs must be captured under:

- `architecture-audit/cycle-018-domain-realization-context-boundary/validation/`

Minimum required evidence:

1. Pre-edit and post-edit static scans for `realize2D`, `realize3D`, `getPlaneEquation`, `ProjectionElementRealizationContext`, `Element3DRealizationContext`, broad collection methods, concrete `World` realization imports, `any` realization contracts, duplicate binders, and forbidden generic facades.
2. Focused Vitest for changed realization contexts/domain elements/read-port adapters, including representative 2D realization, 3D point/line/segment/plane/hinge realization, projection-plane realization/cache behavior, canvas read-port, projected-3D canvas read-port, and three concern read-port/architecture guards.
3. Root `npm run lint` where defined.
4. Frontend/workspace `npm run lint` where defined.
5. Focused Vitest for touched modules.
6. Full root Vitest.
7. Full frontend/workspace Vitest.
8. Root `npm run build` where defined.
9. Frontend/workspace `npm run build`.
10. Root and frontend/workspace Playwright e2e because this wave touches frontend rendering behavior, including `current-ui-contract.spec.ts` overlay pointer-boundary coverage.
11. Live preview refresh bound to `0.0.0.0:5173`, HTTP 200 reachability probe, and live/browser smoke proving representative 2D canvas primitives and the 3D view still render.

Any validation failure attributable to the implementation rejects the wave until fixed. Any skipped command must be explicitly justified in `implementation-log.md`; Playwright/e2e and preview smoke may not be skipped silently for this wave.

## Stop conditions

Stop implementation and request a reviewed delta/plan-edit mini-cycle if:

- the context needs command execution, process-tree mutation, persistence/project-service access, Vue stores/components, renderer lifecycle, scene-host state, style/visibility policy, or app-shell services;
- the context grows into a broad renamed `World` facade;
- projection-plane cache/dependency mutation cannot remain separate from read-only realization context;
- narrowing requires changing geometric result semantics, infeasibility semantics, construction behavior, or rendering behavior rather than only context capability typing;
- public canvas read-port DTOs, three selector/read-port decomposition, scene-host/OrbitControls/CSS/pointer behavior, command/undo, persistence, app-shell, backend, docs/specs, package/tooling, or unrelated dirty source files become necessary;
- implementation needs to modify `frontend/src/domain/calculations/Intersections.ts` or `frontend/src/domain/processTree/ActionGroup.ts` for compile/test success.

## Residual risks accepted for implementation

- Collection traversal may be legitimately needed by a small hinge or diagnostic path. Accepted only if isolated in a named special context, not the default context.
- Structural TypeScript compatibility may hide accidental over-broad contexts. Mitigate with architecture guards/static scans and typed fixtures.
- Binder deduplication could become a generic application facade if overdone. Mitigate by keeping any shared helper tiny and purely context-binding.
- Realization-context typing touches rendering-adjacent paths. Mitigate with focused domain/read-port tests, full suites, e2e, preview refresh, and live smoke.
- Worktree noise is significant. Mitigate by path-scoped status/diff, staging only Wave 018 implementation files, and leaving unrelated production changes untouched.

## Next stage recommendation

Because review convergence has no blockers, proceed to the unique canonical implementation stage:

- `cycle-018-implement-domain-realization-context-boundary-post-017`

Implementation must follow this decision and `proposal-direct.md` exactly. Any deviation requires a reviewed delta/mini-cycle before source changes continue.
