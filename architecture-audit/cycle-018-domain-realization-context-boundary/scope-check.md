# Cycle 018 Scope Check — Domain realization context boundary

## Status and hygiene

This is a scouting/proposal artifact only. No production source, tests, package/tooling, backend, docs/spec, persistence, command/undo, app-shell, rendering-platform, or secret/config files were intentionally modified. Path-focused status was captured in `status-pre-scout.stdout` / `status-pre-scout.stderr`; it shows substantial pre-existing unrelated dirty audit/stage work plus the new Cycle 018 directory. Those unrelated changes are not reverted or mined.

Forbidden paths were not read. The incorrect starting-point path `frontend/src/domain/world/ProjectionPlaneContext.ts` was found not to exist; current source places the context at `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts` (the first broad line-capture command records the missing-path stderr, then `source-line-evidence-targeted.stdout` captures the correct file).

## Reviewed Wave 018 entry evidence

The reviewed wave-plan entry is present at `architecture-audit/wave-plan.md:939-1033`, captured in `wave-018-entry.stdout`. It defines Wave 018 as **Domain realization context boundary**, with scope over realization context contracts, active 2D/3D realization classes, `CanvasWorldReadPort`, `ThreeWorldReadPort`, focused realization/read-port tests, and mandatory validation (`architecture-audit/wave-plan.md:945-967`). The scope guard requires a caller inventory for `realize2D(...)`, `realize3D(...)`, `getPlaneEquation(...)`, and projection-plane realization helper APIs, then the smallest typed context boundary that removes concrete `World`/`any` from active realization contracts without creating a god context (`architecture-audit/wave-plan.md:969-973`).

The plan-extension note confirms this wave follows Waves 016 and 017 because both read-port adapters still call domain realization with concrete runtime `World`, making the residual central issue a domain-realization boundary rather than a selector boundary (`architecture-audit/cycle-018-wave-plan-extension/plan-extension-note.md`, “Evidence inspected” and “Ranking rationale”). Wave 017 closure says the same residual is now the most central presentation/domain risk: both canvas and three read ports still call domain realization APIs requiring full `World`, while broader 3D scene-host lifecycle debt is lower centrality until the realization/read contract is stable (`architecture-audit/cycle-017-three-presentation-read-port-realization-boundary/implementation-log.md`, “Residual risks after closure” and “Next-wave recommendation / re-rank”).

## Current source evidence

### Existing typed 2D vocabulary

`ProjectionElementRealizationContext` already exists and is intentionally narrow: it exposes projection-plane lookup plus point/line/circle/3D element lookup methods (`frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:9-20`, captured in `source-line-evidence-targeted.stdout`). `ProjectionPlaneRealizationContext` currently extends it without adding capabilities (`frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts:22`). `Element2D.realize2D(context: ProjectionElementRealizationContext)` already uses that contract (`frontend/src/domain/world/Element2D.ts:1`, `frontend/src/domain/world/Element2D.ts:108`, captured in `source-line-evidence.stdout`).

2D subclasses still name the parameter `world`, but their type is the context. Representative examples: `Point2D.realize2D(world: ProjectionElementRealizationContext)` (`frontend/src/domain/world/Point.ts:228`), `Line2D.realize2D(world: ProjectionElementRealizationContext)` (`frontend/src/domain/world/Line.ts:161`), `Circle2D.realize2D(world: ProjectionElementRealizationContext)` (`frontend/src/domain/world/Circle.ts:89`), and `Guide2D.realize2D(world: ProjectionElementRealizationContext)` (`frontend/src/domain/world/Guide.ts:100`), all captured in `realization-seam-scan.stdout`. This supports renaming/alignment but not a broad 2D redesign.

### Remaining broad 3D and plane contracts

The central unresolved seam is 3D realization: `Element3D.realize3D(world: any): any` remains a broad base contract (`frontend/src/domain/world/Element3D.ts:40`, `realization-seam-scan.stdout`). `Line3D` imports concrete `World` and declares `abstract realize3D(world: World)` (`frontend/src/domain/world/Line3D.ts:36`), while its implementation resolves 2D projections and planes through that full context (`frontend/src/domain/world/Line3D.ts:73`, `frontend/src/domain/world/Line3D.ts:99-123`). `Point3D` and `Segment3D` similarly use concrete `World` for realization (`frontend/src/domain/world/Point3D.ts:51`, `frontend/src/domain/world/Point3D.ts:106`, `frontend/src/domain/world/Segment3D.ts:58`). `Plane` keeps `getPlaneEquation(world: any)` and `realize3D(world: any)` (`frontend/src/domain/world/Plane.ts:30-37`, `frontend/src/domain/world/Plane.ts:159`, `frontend/src/domain/world/Plane.ts:269`). Hinge paths are mixed: `HingeLine.realize3D(world: ProjectionElementRealizationContext)` is already context-typed (`frontend/src/domain/world/HingeLine.ts:237`), while `BrokenHingeLine.realize3D(world: World, context?: { planeId?: string })` still imports full `World` (`frontend/src/domain/world/BrokenHingeLine.ts:69`).

### Presentation read-port adapter seams

`CanvasWorldReadPort` is now a read-port boundary, but its adapter still wraps concrete `World` and passes it directly into projection-plane helper and 3D realization calls: `plane.realizePoint2D(point, world)`, `plane.realizeLine2D(line, world)`, `plane.realizeCircle2D(circle, world)`, `point.realize3D(world)`, `line.realize3D(world)`, and `segment.realize3D(world)` (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:30`, `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:46-51`; captured in `realization-seam-scan.stdout` and `source-line-evidence-targeted.stdout`).

`ThreeWorldReadPort` similarly wraps concrete `World` and builds read models by calling `point.realize2D(world)`, `line.realize2D(world)`, `circle.realize2D(world)`, selected-guide `line.realize2D(world)`, and hinge `hingeLine.realize3D(world)` inside the adapter (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:65`, `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:84-86`, `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:98`, `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:117`). This is exactly the post-Wave-017 residual: selectors consume read ports, but realization calls still require the adapter to provide full `World`.

### Projection-plane helper boundary and mutation caveat

`ProjectionPlane.realizePoint2D`, `realizeLine2D`, and `realizeCircle2D` are helper/cache methods that take a `ProjectionPlaneMutationContext` parameter and call element `realize2D(world)` (`frontend/src/domain/world/projectionPlane/ProjectionPlane.ts:252-260`, `:276-284`, `:300-308`, captured in `caller-inventory-scan.stdout`). The implementation proposal must distinguish read-only realization lookup from cache mutation/dirty behavior; it should not smuggle dependency registration or projection-plane mutation redesign into this wave. If the implementation inventory proves the helper parameter cannot be narrowed without redesigning mutation ownership, that subset must be deferred or trigger a reviewed plan edit.

### Caller inventory overview

`caller-inventory-scan.stdout` captures active source/test callers. Important categories:

- Domain-internal recursive realization calls in `Point.ts`, `Line.ts`, `Circle.ts`, `Guide.ts`, `Segment.ts`, hinge/plane/3D files.
- Command/tool/construction call sites that pass `world` into existing typed `realize2D` contracts, e.g. world operations (`Add3DPointOp.ts:85-86`, `Add3DLineOp.ts:78-79`, `Add3DSegmentOp.ts:79-80`, `Add3DPlaneOp.ts:79-80`), tools (`CircleTool.ts:55-56`, tangent/parallel/perpendicular tools), and construction use cases (`ConstructionUseCases.ts:171-231`). These are out of direct architectural target unless signature changes require mechanical update; they are not authorization to reopen command/tool waves.
- UI/panel calls in `PropertiesDialog.vue:265/275` and `ProcessTreeNode.vue:261`, out of scope except mechanical typing if necessary.
- Presentation read-port adapters at `CanvasWorldReadPort.ts:46-51` and `ThreeWorldReadPort.ts:84-117`, in scope.
- Tests with realization calls across domain and presentation suites. `test-surface-scan.stdout` identifies focused read-port/presentation tests: `frontend/tests/unit/application/canvasPresentation/canvasWorldReadPort.spec.ts`, `canvasPresentationSelector.spec.ts`, `projected3DCanvasSelector.spec.ts`, `frontend/tests/unit/application/threePresentation/threePresentationConcernSelectors.spec.ts`, `threePresentationSelector.spec.ts`, plus domain `realizationCache.spec.ts`.

## Selected bounded scope for proposals

In scope for Cycle 018 proposals:

1. Evolve `ProjectionElementRealizationContext` / `ProjectionPlaneRealizationContext` into an explicit realization context family with the minimum lookup capabilities needed by active 2D, 3D, plane-equation, hinge, and projection-plane realization paths.
2. Replace `Element3D.realize3D(world: any): any` and active concrete `World`/`any` 3D realization signatures with typed context/result contracts.
3. Align `Plane.getPlaneEquation` / `Plane.realize3D` away from `any` where current caller needs are simple lookup/realization capabilities.
4. Update `CanvasWorldReadPort` and `ThreeWorldReadPort` adapters so concrete `World` is wrapped once as a realization context and typed contexts are passed into domain realization calls.
5. Update focused domain/read-port tests and typed test context builders affected by the changed contracts.
6. Record a full caller inventory in the future implementation log before edits, then classify each call site as changed, mechanical update, deferred, or out of scope.

Out of scope:

- Wave 019 3D scene-host lifecycle/runtime/platform cleanup.
- Broad rendering selector redesign, canvas/three presentation selector architecture, overlay pointer behavior, or scene adapter extraction beyond adapter calls needed by this contract.
- Command/undo, persistence/project schema, process tree, tools/controllers, app-shell, backend/frontend contract stance, package/tooling, validation-platform, docs/spec/comment cleanup, Drive/local services, and debug placeholder work.
- Redesign of projection-plane mutation/dependency registration/cache ownership unless caller inventory proves it is a prerequisite; in that case stop for a reviewed plan edit rather than hiding it here.

## Premises and invalidated assumptions

Premises still hold:

- Wave 018 is central because Waves 016/017 moved selectors behind read ports but left domain realization contracts forcing read-port adapters to depend on full `World` (`CanvasWorldReadPort.ts:46-51`, `ThreeWorldReadPort.ts:84-117`).
- Existing 2D context vocabulary means the implementation can evolve rather than invent a duplicate context (`ProjectionPlaneContext.ts:9-22`; `Element2D.ts:108`).
- 3D and plane contracts still contain broad `World`/`any` seams (`Element3D.ts:40`; `Plane.ts:30-37`; `Line3D.ts:36`; `BrokenHingeLine.ts:69`).

Invalidated/adjusted assumptions:

- The assignment’s `frontend/src/domain/world/ProjectionPlaneContext.ts` path is stale; the current source path is `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`.
- Wave 018 should not be framed as “all realization calls stop receiving variables named world.” Many 2D calls are already typed to `ProjectionElementRealizationContext`; the important boundary is concrete `World`/`any` capability, not variable naming.
- Projection-plane helper methods currently combine realization with cache mutation. The proposal must avoid promising that all helper contexts become read-only unless implementation proves cache mutation can remain plane-owned with a narrow mutation context.

## DELETE list candidates

- Delete `Element3D.realize3D(world: any): any`.
- Delete `Plane.getPlaneEquation(world: any)` and `Plane.realize3D(world: any)` broad contracts where touched.
- Delete concrete `World` realization signatures from active `Point3D`, `Line3D`, `Segment3D`, `Plane3DFromTraces`, and `BrokenHingeLine` paths where typed context suffices.
- Delete `CanvasWorldReadPort` / `ThreeWorldReadPort` adapter calls that pass full `World` directly into domain realization APIs once a typed context wrapper exists.
- Delete duplicate/parallel realization-context aliases or overloads that preserve both old full-`World` and new typed-context APIs.
- Delete touched test helper `as any`/whole-World mocks used only to satisfy weak realization contracts; replace with typed context builders.

## Validation requirements for implementation

Proposal implementation must capture logs under `architecture-audit/cycle-018-domain-realization-context-boundary/validation/` and run:

1. Pre-edit static scans for `realize2D`, `realize3D`, `getPlaneEquation`, realization `World` imports, `any` realization contracts, and read-port adapter calls.
2. Focused Vitest for changed realization context/domain element/read-port modules, at minimum representative domain 2D/3D realization tests plus `canvasWorldReadPort` and three-presentation read-port/concern-selector tests.
3. Root and frontend lint where scripts exist.
4. Full root and frontend Vitest.
5. Root and frontend build.
6. Root/frontend Playwright e2e because realization affects user-visible 2D/3D rendering.
7. Live preview refresh on `0.0.0.0:5173`, HTTP 200 reachability probe, and Playwright/live smoke proving representative 2D primitives and 3D view render.

## Wave-plan edit need

No wave-plan edit is required before review. The current evidence aligns with the reviewed Wave 018 entry: the scope remains the domain realization context boundary, Wave 019/app-shell/backend/docs/debug work stays later, and no source implementation is claimed.
