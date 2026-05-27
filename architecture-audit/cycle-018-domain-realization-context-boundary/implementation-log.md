# Cycle 018 Implementation Log — Domain realization context boundary

## Selected path followed

Implemented `proposal-direct.md` as selected by `decision.md`. No restructure path was introduced. The change keeps domain elements owning realization algorithms, keeps projection-plane cache/helper ownership in `ProjectionPlane`, and narrows authorized full-`World`/`any` realization seams to named typed contexts.

## Caller inventory and classification

Pre-edit inventory was captured in:

- `validation/status-pre-edit.stdout`
- `validation/pre-edit-realization-seams.stdout`

Categories:

- `Element3D.realize3D(world: any): any` — **changed/deleted**. Replaced with `realize3D(context: Element3DRealizationContext): Element3DRealization3D` in `frontend/src/domain/world/Element3D.ts`.
- `Plane.getPlaneEquation(world: any)` / `Plane.realize3D(world: any)` — **changed/deleted**. Replaced with `PlaneEquationRealizationContext` in `frontend/src/domain/world/Plane.ts` and added explicit missing-trace/plane-realization guards exposed by the stronger type.
- Concrete `World` imports/signatures in active 3D realization classes — **changed/deleted** in `Point3D.ts`, `Line3D.ts`, `Segment3D.ts`, and `BrokenHingeLine.ts`. `Point3D.validateProjectionCompatibility` was mechanically aligned to `ProjectionElementRealizationContext` because it was in the same realization boundary and only needed read context typing.
- `BrokenHingeLine` broad `as any` auxiliary-plane trace access — **changed/deleted**. It now checks `AuxiliaryProjectionPlane` and reads typed `t2PrimeLineId` / `t2OtherTraceId` properties.
- Projection-plane realization helper APIs — **changed where authorized**. `ProjectionPlane.realizePoint2D`, `realizeLine2D`, and `realizeCircle2D` now accept `ProjectionElementRealizationContext` rather than `ProjectionPlaneMutationContext`, preserving plane-owned cache mutation while narrowing the dependency needed by realization computation. Factory/mutation methods in `ProjectionPlane.ts` still accept `ProjectionPlaneMutationContext`; these are out of scope for this realization boundary.
- Presentation read-port adapter calls — **changed**. `CanvasWorldReadPort` and `ThreeWorldReadPort` now establish a typed realization context at the adapter boundary and pass that context into domain realization calls instead of passing raw `World` directly.
- Command/tool/UI call sites — **deferred/out of scope**. No changes were required because `World` structurally satisfies the narrow context interfaces and those layers were protected except for mechanical signature alignment.
- Tests — **unchanged**. Existing focused domain/read-port tests exercised the typed contracts after source changes. No touched helper required an `as any`/whole-World mock replacement.

## Source files changed

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`
- `frontend/src/domain/world/Element3D.ts`
- `frontend/src/domain/world/Point3D.ts`
- `frontend/src/domain/world/Line3D.ts`
- `frontend/src/domain/world/Segment3D.ts`
- `frontend/src/domain/world/Plane.ts`
- `frontend/src/domain/world/BrokenHingeLine.ts`
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
- `frontend/src/application/threePresentation/ThreeWorldReadPort.ts`

No backend, docs/specs, app-shell, package/tooling, command/undo, persistence, Wave 019 scene-host, secret/config, or unrelated dirty files were intentionally modified.

## Required deletes / proofs

Deleted or replaced:

- `Element3D.realize3D(world: any): any` is gone.
- `Plane.getPlaneEquation(world: any)` and `Plane.realize3D(world: any)` are gone.
- Concrete `World` realization imports/signatures in active `Point3D`, `Line3D`, `Segment3D`, and `BrokenHingeLine` paths are gone.
- `CanvasWorldReadPort` / `ThreeWorldReadPort` no longer pass raw `world` directly into `realize2D` / `realize3D`; both pass a typed `realizationContext` variable.
- `BrokenHingeLine` no longer uses `(auxPlane as any)` for trace IDs.

Post-edit target scan:

- `validation/post-edit-target-seams.stdout` found no matches for the central deleted seams in the main target files.
- `validation/post-edit-realization-seams-final.stdout` still lists `ProjectionPlane.ts` internal `realize2D(world)` calls. These are in projection-plane factory/cache methods where the parameter is now typed as `ProjectionElementRealizationContext` for realization helpers or remains `ProjectionPlaneMutationContext` for creation/mutation helpers; they are not remaining concrete-`World` or `any` contracts.

## Validation log index

All logs are under `architecture-audit/cycle-018-domain-realization-context-boundary/validation/`.

- Pre-edit status/static scans: `status-pre-edit.*`, `pre-edit-realization-seams.*`
- Edit/build diagnostics: `frontend-build-initial.*`, `frontend-build-postedit.*`, `frontend-build-after-plane-fix.*`
- Post-edit static scans/diff/status: `post-edit-target-seams.*`, `post-edit-realization-seams-final.*`, `source-diff-final.*`, `status-final-prelog.*`
- Root lint: `root-lint.stdout` / `.stderr` — passed, architecture Vitest 4 files / 11 tests.
- Frontend lint: `frontend-lint.stdout` / `.stderr` — passed, architecture Vitest 4 files / 11 tests.
- Focused Vitest: `focused-vitest.stdout` / `.stderr` — passed, 7 files / 51 tests.
- Root Vitest: `root-vitest.stdout` / `.stderr` — passed, exit code 0.
- Frontend Vitest: `frontend-vitest.stdout` / `.stderr` — passed, exit code 0.
- Root build: `root-build.stdout` / `.stderr` — passed; Vite emitted the existing chunk-size warning only.
- Frontend build: `frontend-build.stdout` / `.stderr` — passed; Vite emitted the existing chunk-size warning only.
- Root Playwright e2e: `root-e2e.stdout` / `.stderr` — passed, 8 tests.
- Frontend Playwright e2e: `frontend-e2e.stdout` / `.stderr` — passed, 8 tests.
- Preview refresh/probe: `preview-dev-server.stdout`, `preview-dev-server.stderr`, `preview-dev-server.pid`, `preview-reachability-retry.stdout`, `preview-reachability-retry.stderr` — refreshed with `npm run -w frontend dev -- --host 0.0.0.0`; HTTP probe returned `HTTP/1.1 200 OK` from `127.0.0.1:5173` and fetched the app HTML.

## Preview/live evidence

The persistent preview server was restarted on `0.0.0.0:5173`; PID is recorded in `validation/preview-dev-server.pid`. Reachability probe in `validation/preview-reachability-retry.stdout` shows `HTTP/1.1 200 OK` and fetched the app shell HTML. Playwright e2e coverage in `root-e2e.stdout` and `frontend-e2e.stdout` exercised current canvas/tool/plane-selector behavior affected by realization/read-port changes.

## Protected surface checks

- No secret/config files were read or modified.
- No backend, docs/specs, package/tooling, app-shell, persistence/project schema, Drive/local project services, command/undo redesign, or Wave 019 3D scene-host lifecycle work was performed.
- Projection-plane mutation/dependency ownership was not redesigned; only realization helper parameter types were narrowed while cache writes remain owned by `ProjectionPlane`.
- No stale discarded audit cycles were mined.

## Residual risks and next-wave candidates

- `ProjectionPlane.ts` still has many factory/mutation methods whose local parameter is named `world`; those are mutation contexts and were intentionally left out of this realization boundary. A future wave could rename/separate creation/mutation context vocabulary if it becomes central.
- Presentation adapters still receive concrete `World` at their factory boundary by design; this wave narrows what they pass into domain realization calls, not the outer application composition boundary.
- Vite build continues to emit the existing chunk-size warning; not source-attributable to this wave.
