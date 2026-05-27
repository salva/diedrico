# Cycle 018 Implementation Log — Domain realization context boundary

## Selected path followed

Implemented the Cycle 018 decision-selected direct path from `proposal-direct.md`. No proposal-restructure work was introduced: there is no new realization query service, no projection-plane mutation/cache ownership redesign, no Wave 019 scene-host/platform work, and no broad selector/rendering/app-shell/persistence/backend/tooling changes.

The implementation found that most central domain contracts had already been narrowed in the current source before this retry began: `Element3D.realize3D(context: Element3DRealizationContext)`, `Plane3D.getPlaneEquation(context: PlaneEquationRealizationContext)`, `Plane3D.realize3D(context: PlaneEquationRealizationContext)`, and active `Point3D`/`Line3D`/`Segment3D`/`BrokenHingeLine` realization signatures were typed and no longer imported concrete `World`. This retry completed the remaining approved presentation/domain seam: the canvas and three read ports now wrap runtime `World` in explicit named typed realization-context adapter objects rather than assigning/passing the full `World` directly as the realization context.

## Caller inventory and classification

Inventory evidence is captured in validation logs:

- `validation/static-scan-current.stdout` — current pre-edit scan for broad realization contracts, concrete `World` imports, and read-port raw-world calls.
- `validation/remaining-any-world-scan.stdout` — supplemental broad pattern scan across source/tests.
- `validation/static-scan-post-edit.stdout` — broad scan after first adapter edit; intentionally broad and includes many already-typed 2D calls with variables named `world` in domain/tests.
- `validation/static-scan-final.stdout` — final decision-targeted scan.

Classifications:

- `Element3D.realize3D(world: any): any`: proven already deleted/inapplicable in current source; final scan has no match.
- `Plane.getPlaneEquation(world: any)` / `Plane.realize3D(world: any)`: proven already deleted/inapplicable in current source; final scan has no match.
- Concrete `World` imports in active realization domain files (`Element3D.ts`, `Point3D.ts`, `Line3D.ts`, `Segment3D.ts`, `Plane.ts`, `BrokenHingeLine.ts`): proven already absent; final scan has no match.
- `CanvasWorldReadPort` realization seam: changed. Added `createCanvasRealizationContext(world)` returning `ProjectionElementRealizationContext & Element3DRealizationContext`, and all canvas realization calls now use that adapter object.
- `ThreeWorldReadPort` realization seam: changed. Added `createThreeRealizationContext(world)` returning `ProjectionElementRealizationContext & Element3DRealizationContext`, and planar/guide/hinge realization calls now use that adapter object.
- Projection-plane realization helpers: mechanical naming alignment only. `realizePoint2D`, `realizeLine2D`, and `realizeCircle2D` parameters are named/documented as typed `context`, preserving existing plane-owned cache mutation semantics.
- Existing domain/tests calls such as `line.realize2D(world)` where `world` structurally satisfies `ProjectionElementRealizationContext`: deferred/out of scope unless tied to the presentation read-port seam. The decision explicitly states the important boundary is concrete `World`/`any` capability, not variable naming.

## Source files changed

- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - Added a local `createCanvasRealizationContext(world)` adapter exposing only named realization lookup/read methods required by `ProjectionElementRealizationContext & Element3DRealizationContext`.
  - Removed the direct full-`World` structural assignment `const realizationContext: ... = world`.
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`
  - Added a local `createThreeRealizationContext(world)` adapter exposing only named realization lookup/read methods required by `ProjectionElementRealizationContext & Element3DRealizationContext`.
  - Removed the direct full-`World` structural assignment `const realizationContext: ... = world`.
- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`
  - Renamed the read-only realization helper parameter/docs from `world` to `context` for `realizePoint2D`, `realizeLine2D`, and `realizeCircle2D`; cache ownership remains plane-owned and unchanged.
- `frontend/src/domain/world/Line3D.ts`
  - Updated stale documentation to refer to the typed realization context instead of a `World` instance.

## Required deletes / proof of inapplicability

- Deleted in current source before this retry and verified absent: `Element3D.realize3D(world: any): any`.
- Deleted in current source before this retry and verified absent: `Plane.getPlaneEquation(world: any)` and `Plane.realize3D(world: any)` broad contracts.
- Deleted in current source before this retry and verified absent: concrete `World` imports in active `Point3D`, `Line3D`, `Segment3D`, `Plane`, and `BrokenHingeLine` realization paths.
- Deleted by this retry: direct read-port full-`World` realization-context assignments in `CanvasWorldReadPort.ts` and `ThreeWorldReadPort.ts`.
- No transitional overloads, compatibility wrappers, duplicate aliases, or new service-locator contexts were added.
- No obsolete tests/fixtures were found that existed solely to preserve the removed full-`World`/`any` contracts; focused tests remained valid.

Final proof: `validation/static-scan-final.stdout` contains no matches under these sections:

- Forbidden broad realization contracts
- Concrete World imports in active realization domain files
- Read-port direct full-World realization context assignment/calls
- Duplicate realization context aliases

## Validation log index

All validation logs are under `architecture-audit/cycle-018-domain-realization-context-boundary/validation/`.

Static scans:

- `static-scan-current.stdout` / `.stderr` — pre-edit scan.
- `remaining-any-world-scan.stdout` / `.stderr` — supplemental broad scan.
- `static-scan-post-edit.stdout` / `.stderr` — broad post-edit scan; includes expected out-of-scope variable-name matches.
- `static-scan-final.stdout` / `.stderr` — final targeted scan; no decision-targeted seams remain.

Focused tests:

- `focused-vitest.stdout` / `.stderr` — failed because root-relative paths were passed while the command ran inside the frontend workspace (`No test files found`). This was a command invocation error, not a source failure.
- `focused-vitest-rerun.stdout` / `.stderr` — passed with frontend-relative paths: `3 passed`, `22 passed`.

Mandatory gates:

- `root-lint.stdout` / `.stderr` — passed (`11 passed`).
- `frontend-lint.stdout` / `.stderr` — passed (`11 passed`).
- `root-vitest.stdout` / `.stderr` and `root-vitest-summary.stdout` — passed (`107 passed | 1 skipped`, `1231 passed | 45 skipped | 11 todo`).
- `frontend-vitest.stdout` / `.stderr` and `frontend-vitest-summary.stdout` — passed (`107 passed | 1 skipped`, `1231 passed | 45 skipped | 11 todo`).
- `root-build.stdout` / `.stderr` — passed (`✓ built`); Vite emitted the pre-existing large chunk warning.
- `frontend-build.stdout` / `.stderr` — passed (`✓ built`); Vite emitted the pre-existing large chunk warning.
- `root-e2e.stdout` / `.stderr` — passed (`8 passed`).
- `frontend-e2e.stdout` / `.stderr` — passed (`8 passed`).

Preview/live evidence:

- `live-preview-refresh-rerun.stdout` / `.stderr` — refreshed frontend dev server on `0.0.0.0:5173` and received `HTTP 200` from `http://127.0.0.1:5173/`.
- `live-preview-server.pid`, `live-preview-server.stdout`, `live-preview-server.stderr` — persistent preview process/logs.
- `live-preview-probe.stdout` / `.stderr` — HTTP probe evidence (`200`).
- `live-playwright-smoke.stdout` / `.stderr` — live browser smoke passed: title `Diedrico - Dihedral Learning MVP`, `canvasCount: 1`, `svgCount: 19`, `buttons: 45`, and recognizable app-shell text present.

## Protected-surface checks

Not modified:

- Wave 019 scene-host lifecycle/runtime/platform files.
- Backend, docs/specs, package/tooling/dependency configuration, persistence/project services, Drive/local project services, command/undo architecture, process-tree ownership, app-shell orchestration, and tool/controller layers.
- Secret/config paths and environment files were not read or modified.
- Projection-plane cache/dependency mutation ownership was not redesigned; only typed read-context naming changed for realization helpers.

A broad `git status` through MCP exceeded the output buffer because the workspace contains substantial unrelated dirty work. This implementation used path-focused diffs and committed only the Cycle 018 source/artifact/report files listed in the task.

## Residual risks / next-wave candidates

- The read-port realization-context factories are intentionally local to the two presentation adapters to avoid introducing a cross-layer service in Cycle 018. A future wave may decide whether a shared adapter module is worthwhile after additional realization-boundary cleanup, but no duplicate public context alias was added here.
- Many domain/test call sites still use a parameter or variable named `world` for already-typed `ProjectionElementRealizationContext` calls. This is naming noise, not the deleted full-`World`/`any` seam; broad renaming across tests/tools/commands would exceed Cycle 018 scope.
- Existing Vite build chunk-size warning remains pre-existing and unrelated to this implementation.
