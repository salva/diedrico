# Proposal Direct — Typed realization contexts at the existing domain boundary

## Summary

Implement Wave 018 by evolving the existing `ProjectionElementRealizationContext` vocabulary into a minimal realization-context family and updating active 3D/plane/read-port realization contracts to consume those contexts instead of concrete `World` or `any`. Keep the existing ownership shape: domain elements still own realization algorithms, projection planes still own their caches/helpers, and canvas/three read-port adapters remain the boundary that wraps the runtime `World`. This is the smallest architectural fix that deletes the current full-`World`/`any` seams without reopening rendering, commands, tools, persistence, or app-shell work.

## Files to change

Primary contract/domain files:

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts` — define or refine named contexts such as `ProjectionElementRealizationContext`, `ProjectionPlaneRealizationContext`, `Element3DRealizationContext`, and `PlaneEquationRealizationContext` with only lookup/realization capabilities proven by the caller inventory.
- `frontend/src/domain/world/Element3D.ts` — replace `realize3D(world: any): any` with a typed result/context contract.
- `frontend/src/domain/world/Point3D.ts`
- `frontend/src/domain/world/Line3D.ts`
- `frontend/src/domain/world/Segment3D.ts`
- `frontend/src/domain/world/Plane.ts`
- `frontend/src/domain/world/HingeLine.ts` only if type alignment is needed.
- `frontend/src/domain/world/BrokenHingeLine.ts`
- 2D realization files only for parameter naming/type alignment where the current context already suffices: `Point.ts`, `Line.ts`, `Segment.ts`, `Circle.ts`, `Guide.ts`, `elements/BrokenHalfHingeLine2D.ts`.
- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`, `FixedProjectionPlane.ts`, `AuxiliaryProjectionPlane.ts` only where helper signatures must consume the refined context while preserving plane-owned cache mutation.

Presentation adapters:

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts` — create/use a typed context wrapper around `World`, then pass that context to plane/2D/3D realization APIs instead of passing raw `World` as the realization dependency.
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts` — same context wrapper use for read-model construction.

Focused tests:

- `frontend/tests/unit/domain/realizationCache.spec.ts`
- representative existing domain tests for point/line/circle/guide/3D/plane realization, e.g. `Point3DReconstruction.test.ts`, `Line3DReconstruction.test.ts`, `segment3DRealization.spec.ts`, `Plane3DFromTraces.test.ts`, `projectionPlaneRealization.spec.ts`.
- `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts`
- `frontend/tests/unit/application/canvasPresentation/canvasPresentationSelector.spec.ts` if adapter expectations change.
- `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
- `frontend/tests/unit/application/threePresentation/threePresentationSelector.spec.ts` if orchestration expectations change.

## Files/tests/docs/fixtures to DELETE

- Delete `Element3D.realize3D(world: any): any` from `Element3D.ts`.
- Delete `Plane.getPlaneEquation(world: any)` and `Plane.realize3D(world: any)` broad signatures in favor of typed context/result contracts.
- Delete concrete `World` realization signatures/imports in active `Point3D`, `Line3D`, `Segment3D`, and `BrokenHingeLine` realization paths where the typed context provides needed lookups.
- Delete direct raw-`World` adapter realization calls in `CanvasWorldReadPort.ts` and `ThreeWorldReadPort.ts` once the context wrapper exists.
- Delete transitional overloads or aliases that keep both old full-`World` and new context signatures.
- Delete touched test helper `as any` mocks or whole-World test doubles that only exist because the old contracts were weak; replace with typed realization-context builders.
- Do not delete unrelated docs/specs, backend files, command/tool files, or rendering-platform files in this wave.

## Expected behavior change

No intentional user-visible behavior change. The behavior target is equivalence: existing 2D canvas primitives, projected 3D-on-2D overlays, 3D reconstructed point/line/segment/plane/hinge rendering, guides, intersections, and realization caches continue to work. The architectural behavior changes are compile-time enforced:

- Domain realization algorithms can ask only for typed lookup capabilities, not an arbitrary mutable `World`.
- `Element3D` and `Plane` no longer erase realization contracts to `any`.
- Presentation read ports remain runtime adapters, but their domain calls consume explicit realization contexts.

## Implementation sequence

1. Capture a full pre-edit caller inventory in `implementation-log.md` and validation logs, using the current `caller-inventory-scan.stdout` categories as the starting point.
2. Define the minimal context types in `ProjectionPlaneContext.ts`. Prefer extending the current interface rather than duplicating lookup responsibilities under new names.
3. Update `Element3D`, 3D elements, `Plane`, and hinge variants to typed contexts/results.
4. Update projection-plane helper signatures only as needed. Preserve cache ownership and dirty/dependency semantics inside `ProjectionPlane`; do not turn this into mutation-ownership redesign.
5. Create a small context adapter/factory in or near the read-port adapter modules if needed, so `World` is wrapped once at the application/presentation boundary.
6. Update mechanical call sites and focused tests to the typed contracts. If command/tool/UI call sites only pass a `World` value that structurally satisfies the context, keep changes mechanical and do not refactor those layers.
7. Delete old overloads/imports/helpers and run static scans proving the targeted full-`World`/`any` seams are gone.

## Validation plan

- Static scans under `validation/` for `realize3D(world: any)`, `getPlaneEquation(world: any)`, concrete `World` imports in active realization classes, `.realize2D(world)` / `.realize3D(world)` adapter calls, and duplicate context aliases.
- Focused Vitest for changed domain realization and read-port modules:
  - `npm run test --workspace=frontend -- --run frontend/tests/unit/domain/realizationCache.spec.ts frontend/tests/unit/domain/Point3DReconstruction.test.ts frontend/tests/unit/domain/Line3DReconstruction.test.ts frontend/tests/unit/domain/segment3DRealization.spec.ts frontend/tests/unit/domain/Plane3DFromTraces.test.ts frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`
  - Adjust exact paths to existing scripts if needed; capture stdout/stderr.
- Root and frontend lint.
- Full root and frontend Vitest.
- Root and frontend build.
- Root/frontend Playwright e2e.
- Refresh preview with `npm run -w frontend dev -- --host 0.0.0.0`, capture PID/logs, probe HTTP 200 via `127.0.0.1:5173`, and run live smoke for representative 2D canvas and 3D view rendering.

## No-backcompat rationale

The old signatures are not compatibility surfaces; they are the architectural smell. Keeping overloads like `realize3D(world: World)` alongside `realize3D(context: Element3DRealizationContext)` would preserve the bypass and let future adapters keep using full mutable `World`. The implementation should delete the old contracts and update active callers directly.

## Risks

- A single context can become a renamed `World` if it exposes too many methods. Mitigation: build the interface from actual realization caller needs only.
- Projection-plane helper methods mix realization and cache mutation. Mitigation: keep mutation/caching plane-owned and narrow only the parameter capability; stop for plan edit if this requires deeper redesign.
- Mechanical changes may touch many tests/call sites. Mitigation: scope changes to signature alignment and do not redesign command/tool/UI layers.
- 3D plane/hinge realization may expose missing capabilities late. Mitigation: caller inventory first; stop conditions below.

## Stop conditions for broader redesign

Stop and request a reviewed mini-cycle if:

- The minimal context needs command execution, process-tree mutation, persistence/project-service access, stores, Vue state, or renderer objects.
- Projection-plane cache/dependency mutation cannot be separated from realization capability by typing alone.
- Fixing `Plane` or hinge contracts requires changing geometric result semantics rather than only context/result typing.
- The change requires reopening Wave 016/017 selector architecture, Wave 019 scene-host lifecycle, or app-shell/tool/persistence ownership.
