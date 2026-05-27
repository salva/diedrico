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

---

## Validation/preview closure — cycle-018-validation-and-preview-refresh

**Wave 018 COMPLETE.** The validation/preview closure stage independently rechecked the implementation evidence and reran the mandatory gates with fresh `closure-*` log names under `architecture-audit/cycle-018-domain-realization-context-boundary/validation/`. No production source, package/tooling, backend, docs/spec, app-shell, command/undo, persistence, or Wave 019 implementation files were modified during closure.

### Current workspace and protected-surface check

- `closure-targeted-status.stdout` / `.stderr` — path-focused status for Wave 018 source/artifact/report paths and `architecture-audit/wave-plan.md`. It shows no uncommitted production-source diff in the Wave 018 implementation files; remaining untracked entries are audit/report/log artifacts from this and prior Cycle 018 stages.
- `closure-wave-plan-grep.stdout` / `.stderr` — reread evidence for Wave 018/Wave 019 ordering in `architecture-audit/wave-plan.md`.
- MCP `git diff` for the Wave 018 source files and `implementation-log.md`/`wave-plan.md` was empty before this closure log append.

### Fresh validation log index

All gates below are current closure-stage evidence and supersede stale implementation attempts where named.

- Root lint: `closure-root-lint.stdout` / `.stderr` — passed (`11 passed`).
- Frontend lint: `closure-frontend-lint-rerun.stdout` / `.stderr` — passed (`11 passed`). The earlier `closure-frontend-lint.stdout` / `.stderr` showed architecture tests passed but the Node/V8 process aborted with exit code 134; it is superseded by the green rerun.
- Focused realization/read-port Vitest: `closure-focused-vitest.stdout` / `.stderr` — passed (`3 passed`, `22 passed`).
- Root full Vitest: `closure-root-vitest.stdout` / `.stderr` — passed (`107 passed | 1 skipped`, `1231 passed | 45 skipped | 11 todo`).
- Frontend full Vitest: `closure-frontend-vitest.stdout` / `.stderr` — passed (`107 passed | 1 skipped`, `1231 passed | 45 skipped | 11 todo`).
- Root build: `closure-root-build.stdout` / `.stderr` — passed (`✓ built in 3.71s`); Vite emitted the pre-existing large chunk warning.
- Frontend build: `closure-frontend-build.stdout` / `.stderr` — passed (`✓ built in 3.62s`); Vite emitted the pre-existing large chunk warning.
- Root e2e: `closure-root-e2e.stdout` / `.stderr` — passed (`8 passed`).
- Frontend e2e: `closure-frontend-e2e.stdout` / `.stderr` — passed (`8 passed`).

### Live preview and Playwright evidence

- Preview refresh command target: `npm run dev --workspace=frontend -- --host 0.0.0.0`, recorded with PID in `validation/live-preview-server.pid` and live server logs in `closure-live-preview-server.stdout` / `.stderr`.
- `closure-live-preview-refresh-rerun.stdout` / `.stderr` — captured preview PID, `http://127.0.0.1:5173/`, HTTP `200`, and explicit `0.0.0.0:5173` host binding evidence. The command wrapper returned a nonzero status despite printing the HTTP 200 evidence, so the separate probe below is the authoritative reachability result.
- `closure-live-preview-probe.stdout` / `.stderr` — passed independent HTTP probe with `http_status=200`, `remote_ip=127.0.0.1`, `content_type=text/html`.
- `closure-live-playwright-smoke-final.stdout` / `.stderr` — passed live browser smoke against the refreshed preview: title `Diedrico - Dihedral Learning MVP`, `canvasCount: 1`, `svgCount: 19`, `buttons: 45`, app-shell text containing `P_H`, `P_V`, `Tool: Select`, and 3D controls.
- Superseded live smoke command errors: `closure-live-playwright-smoke.stdout` failed due to a `/tmp`-relative Playwright import; `closure-live-playwright-smoke-rerun.stdout` failed due to CommonJS named-export import shape. Both are command-script errors and are superseded by `closure-live-playwright-smoke-final.stdout`.
- Superseded preview refresh command error: `closure-live-preview-refresh.stdout` failed because `/bin/sh` does not support `set -o pipefail`; it is superseded by the bash rerun plus independent probe.

### Residual risks after closure

- Existing Vite large-chunk warnings remain pre-existing and unrelated to Wave 018.
- The closure stage observed substantial unrelated/unowned untracked Cycle 018 audit artifacts. They were not reverted or mined beyond necessary validation evidence and do not indicate a Wave 018 source gate failure.
- Local read-port realization-context factories remain intentionally local to `CanvasWorldReadPort` and `ThreeWorldReadPort`; future cleanup may evaluate sharing only if it does not create a god context.

### Next-wave recommendation / re-rank

After rereading `architecture-audit/wave-plan.md`, Wave 019 remains the most central next wave because Wave 018 completed the typed domain-realization context boundary that Wave 019 depends on. Start the next canonical stage as `cycle-019-fresh-scout-proposals` for **Wave 019 — Three scene-host lifecycle and renderer platform boundary**. The Wave 019 scout must first re-read the current code and confirm that no residual full-`World`/`any` realization seam blocks scene-host/platform work; if a material premise changed, update `wave-plan.md` through a reviewed plan-edit mini-cycle before implementation.
