# Cycle 026 Implementation Log — Tool interaction read context

## Source-control hygiene

- Implementation decision followed: `architecture-audit/cycle-026-tool-interaction-read-context/decision.md`, selecting corrected `proposals/proposal-direct.md`.
- This validation/log task did not modify production source. Production implementation was completed in task `t1-implement-tool-read-ports`, commit `f77d80f739761820ca4a2052083eac8d5cf749b0`.
- Path-scoped status/diff evidence for this task is captured in:
  - `validation/t2-scoped-status-before.stdout.log`
  - `validation/t2-scoped-diff-before.stdout.log`
  - `validation/t2-scoped-status-after-validation.stdout.log`
  - `validation/t2-scoped-diff-after-validation.stdout.log`
- Broad repository status is intentionally not normalized here; Cycle 026 touched only the selected source/test paths, validation logs, this implementation log, and task reports.

## Source files changed by implementation

Production source changed by `t1-implement-tool-read-ports`:

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Creates one runtime-owned `ToolInteractionReadPort` from private `World` inside `canvasViewPort()`.
  - Invokes active tools via `tool.handleClick({ ...context, readPort: toolReadPort })` instead of injecting raw `world`.
  - Leaves protected RuntimeSession world ownership for view/read/control ports, properties/process reads, persistence handles, and command-controller construction as accepted residual seams.
- `frontend/src/application/appShell/RuntimeViewPorts.ts`
  - Aligns canvas invocation typing with world-free tool context.
- `frontend/src/application/tools/ToolInteractionReadPort.ts`
  - Adds the behavior-sized tool read/realization port and factory from private `World`.
- `frontend/src/commands/factories/ProjectionSetupFactory.ts`
  - Type alignment required by projection-plane tool validation.
- `frontend/src/tools/ITool.ts`
  - Deletes `ToolContext.world` and the direct tool-context `World` import.
- `frontend/src/tools/ArgumentCollectorTool.ts`
  - Uses `readPort` for active plane lookup, hit-result element lookup, and collection validator context.
- `frontend/src/types/ToolArgumentCollector.ts`
  - Deletes `CollectionContext.world`; collection validators receive bounded read capabilities.
- Concrete active tools updated to use named read/realization methods instead of `context.world` / `realize2D(context.world)`:
  - `frontend/src/tools/CircleTool.ts`
  - `frontend/src/tools/Create3DPointTool.ts`
  - `frontend/src/tools/Create3DLineTool.ts`
  - `frontend/src/tools/Create3DSegmentTool.ts`
  - `frontend/src/tools/Create3DPlaneTool.ts`
  - `frontend/src/tools/CreateProjectionPlaneTool.ts`
  - `frontend/src/tools/ParallelLineTool.ts`
  - `frontend/src/tools/PerpendicularLineTool.ts`
  - `frontend/src/tools/TangentLineToCircleThroughPointTool.ts`
  - `frontend/src/tools/TangentLineToCircleParallelToLineTool.ts`

Tests changed/added by implementation:

- `frontend/tests/unit/application/tools/ToolInteractionReadPort.test.ts`
- `frontend/tests/unit/application/canvasToolControllers.spec.ts`
- `frontend/tests/unit/tools/CircleTool.spec.ts`
- `frontend/tests/unit/tools/pointTool.spec.ts`
- `frontend/tests/unit/tools/toolValidation.spec.ts`

## Delete/proof list

Deleted/removed from active production tool path:

- `ITool.ToolContext.world` and the concrete `World` import from `frontend/src/tools/ITool.ts`.
- `CollectionContext.world` from `frontend/src/types/ToolArgumentCollector.ts`.
- Active production tool `context.world` usages.
- Active production tool `realize2D(context.world)` usages.
- Runtime raw-world injection into `tool.handleClick`.
- Stale tests constructing active `ToolContext` with full raw `World` as the tool context dependency.

Proof logs:

- `validation/t2-refined-boundary-scan.stdout.log` shows no forbidden active-tool matches for `context.world`, `realize2D(context.world)`, `CollectionContext.world`, or `world: World` in the active tool/type path, and shows RuntimeSession invoking tools with `readPort`.
- `validation/t2-static-forbidden-scan.stdout.log` is a broad scan. It intentionally reports accepted residual RuntimeSession/CanvasToolController world ownership and `getAll...` view-port reads; those are protected out-of-scope seams from the decision, not active tool-context compatibility paths.

No transitional overload, compatibility wrapper, dual raw-world/read-port path, generic `WorldView`/`ToolWorld`/`RuntimeWorld`/`WorldQuery`, or tool-port `query`/`traverse`/`getAll...` facade was introduced.

## Caller-map evidence for new read-port methods

Full evidence is captured in `validation/t2-caller-map-evidence.stdout.log`.

- `getProjectionPlaneById(id)`
  - Callers: `ArgumentCollectorTool`, `Create3DPointTool`, `Create3DLineTool`, `Create3DSegmentTool`, `Create3DPlaneTool`, `CreateProjectionPlaneTool`.
  - Purpose: active plane lookup, projection-plane existence validation, projection-plane construction validation.
- `getElement2D(id)`
  - Caller: `ArgumentCollectorTool`.
  - Purpose: resolve hit-test result element ids into collected element candidates.
- `getPoint2D(id)`
  - Caller: `TangentLineToCircleThroughPointTool`.
  - Purpose: ensure tangent-through-point arguments resolve to points before realization and tangent selection.
- `getLine2D(id)`
  - Callers: `CreateProjectionPlaneTool`, `TangentLineToCircleParallelToLineTool`.
  - Purpose: projection-plane trace/T2-prime validation and tangent-parallel reference-line validation.
- `getCircle2D(id)`
  - Callers: `TangentLineToCircleThroughPointTool`, `TangentLineToCircleParallelToLineTool`.
  - Purpose: circle-specific tangent validation and geometry realization.
- `realizePoint2D(point)`
  - Callers: `CircleTool`, `TangentLineToCircleThroughPointTool`.
  - Purpose: circle radius validation and tangent-through-point geometry.
- `realizeLine2D(line)`
  - Callers: `ParallelLineTool`, `PerpendicularLineTool`, `CreateProjectionPlaneTool`, `TangentLineToCircleParallelToLineTool`.
  - Purpose: reference-line feasibility/geometry checks, projection-plane T2-prime validation, tangent-parallel geometry.
- `realizeCircle2D(circle)`
  - Callers: tangent tools.
  - Purpose: circle tangent geometry validation/variant selection.
- `areProjectionPlanesDistinct(firstPlaneId, secondPlaneId)`
  - Callers: `Create3DPointTool`, `Create3DLineTool`, `Create3DSegmentTool`, `Create3DPlaneTool`.
  - Purpose: 3D construction requires two distinct projection planes.
- `getExpectedT2PrimeLineRealization(t1HingeTraceId, t2OtherTraceId)`
  - Caller: `CreateProjectionPlaneTool`.
  - Purpose: projection-plane construction validation of expected `T2'` geometry without exposing a generic world/query surface.

## Protected-surface checks

Protected surfaces were not broadened in this validation/log task and were not redesigned by the implementation:

- `CanvasWorldReadPort.getProcessTree()`, canvas raw selector/read DTO surfaces, and three presentation read models remain out of Cycle 026 scope.
- `RuntimeSession` properties/process reads and private world ownership remain accepted residual seams.
- `CanvasToolController` still owns `World`/`CommandStack` for mutation/use-case orchestration, as explicitly allowed by the decision.
- Command history/producers/undo-redo semantics, persistence schema/replay, Drive/auth, backend, package/tooling, docs/specs, and global domain realization ownership were not modified.
- `SvgCanvas.vue` remains a typed runtime-port consumer; no raw `World` access was added there.

## Validation log index

All logs are under `architecture-audit/cycle-026-tool-interaction-read-context/validation/`.

Static/source-control evidence:

- `t2-scoped-status-before.stdout.log` / `.stderr.log` — passed.
- `t2-scoped-diff-before.stdout.log` / `.stderr.log` — passed, no source diff from this task before validation/log work.
- `t2-static-forbidden-scan.stdout.log` / `.stderr.log` — broad scan; contains accepted residual RuntimeSession/CanvasToolController world ownership and view-port `getAll...` reads.
- `t2-refined-boundary-scan.stdout.log` / `.stderr.log` — passed for active tool-context forbidden patterns.
- `t2-caller-map-evidence.stdout.log` / `.stderr.log` — caller-map evidence for every read-port method.
- `t2-scoped-status-after-validation.stdout.log` / `.stderr.log` — validation directory untracked before this log/report commit.
- `t2-scoped-diff-after-validation.stdout.log` / `.stderr.log` — no source diff from this task before log/report write.

Required commands:

- Root lint: `npm run lint` from `/work/diedrico` — passed; logs `t2-root-lint.*.log`.
- Frontend lint: `npm run lint` from `/work/diedrico/frontend` — passed; logs `t2-frontend-lint.*.log`.
- Focused Vitest: `npm run test -- --run tests/unit/tools/pointTool.spec.ts tests/unit/tools/toolValidation.spec.ts tests/unit/tools/CircleTool.spec.ts tests/unit/application/tools/ToolInteractionReadPort.test.ts tests/unit/application/canvasToolControllers.spec.ts` from frontend — passed; logs `t2-focused-vitest.*.log`.
- Root full Vitest: `npm run test` from root — passed; logs `t2-root-vitest.*.log`.
- Frontend full Vitest: `npm run test` from frontend — passed; logs `t2-frontend-vitest.*.log`.
- Root build: `npm run build` from root — passed; logs `t2-root-build.*.log`. Vite emitted the existing chunk-size warning only.
- Frontend build: `npm run build` from frontend — passed; logs `t2-frontend-build.*.log`. Vite emitted the existing chunk-size warning only.
- Root e2e: `npm run test:e2e` from root — passed, 9/9 Playwright tests; logs `t2-root-e2e.*.log`.
- Frontend e2e: `npm run test:e2e` from frontend — passed, 9/9 Playwright tests; logs `t2-frontend-e2e.*.log`.

Live preview and smoke:

- Existing listener evidence: `t2-preview-before.*.log`.
- First root-script refresh attempt: `t2-preview-refresh.*.log` and `t2-preview-server.*.log` — failed to expose on `0.0.0.0` because `npm run dev:frontend -- --host 0.0.0.0` passed the host argument incorrectly through the root script (`vite 0.0.0.0`, listener on `[::1]:5173`).
- Diagnostics: `t2-preview-diagnostics.*.log`.
- Successful refresh: `npm run dev -- --host 0.0.0.0` from `/work/diedrico/frontend`; logs `t2-preview-refresh-retry.*.log` and `t2-preview-server-retry.*.log`. Listener evidence shows `0.0.0.0:5173`.
- HTTP reachability probe: `t2-preview-http-probe.*.log` — HTTP 200 from `http://127.0.0.1:5173/` and listener on `0.0.0.0:5173`.
- Live smoke: `t2-live-smoke-retry.*.log` — passed. Covered app shell/toolbar, 2D point construction, line argument collection, circle/read-port realization path, hover/3D coordinate status, projection overlay toggle/3D refresh, undo/redo, and status bar responsiveness without credentials.
- A failed preliminary live-smoke attempt is preserved as `t2-live-smoke.*.log`; it failed only because a `/tmp` script could not resolve workspace `@playwright/test`, and the retry from the frontend workspace passed.

## Behavior evidence

- Argument collection and command sink behavior are covered by focused Vitest and e2e:
  - `t2-focused-vitest.stdout.log`: 50 focused tests passed, including `ToolInteractionReadPort`, `CircleTool`, `toolValidation`, `pointTool`, and `canvasToolControllers`.
  - `t2-root-e2e.stdout.log` / `t2-frontend-e2e.stdout.log`: current UI contract and keyboard/undo/redo tests passed.
- Representative live behavior is covered by `t2-live-smoke-retry.stdout.log`:
  - point, line, and circle construction through active tool invocation;
  - hover/3D coordinate status;
  - 3D projection overlay refresh toggle;
  - undo/redo command flow;
  - status-bar/dirty-status responsiveness.
- Parallel/perpendicular/tangent/projection-plane/3D construction are covered by focused unit/controller validation and full Vitest. The existing live/e2e suite does not expose a stable high-level test for every nested advanced construction flow; adding new e2e specs would broaden this validation task beyond log/validation capture, so the remaining live evidence is limited to stable existing UI/test-id flows.

## Residual risks and accepted debt

- The tool read port remains narrow today, but future waves should guard against method creep into a renamed `World` facade.
- RuntimeSession still has accepted residual raw `World` reads for properties, process, selection, active-plane, screen-to-3D, and persistence handles.
- Canvas/three presentation read-model seams and raw presentation collection surfaces remain future-wave candidates.
- The root `dev:frontend` script does not forward `--host 0.0.0.0` as intended; live preview was refreshed successfully from the frontend workspace instead. This is tooling ergonomics debt, not a Cycle 026 source failure.
- Existing e2e coverage exercises stable UI construction/selection/undo flows but does not yet provide exhaustive live coverage for every nested advanced tool. Unit/controller coverage currently carries the advanced-tool behavior proof.

## Next-wave candidates

- Introduce stable e2e helpers/test IDs for nested advanced tools so live smoke can directly exercise parallel, perpendicular, tangent, projection-plane, and 3D construction flows without brittle dropdown geometry assumptions.
- Extract or narrow RuntimeSession properties/process/read-port residual world reads in a future centrality-appropriate wave.
- Address presentation read-model seams in `CanvasWorldReadPort`/`ThreeWorldReadPort` only through a reviewed wave that targets canvas/three presentation boundaries explicitly.
- Consider a small tooling wave for preview-script host forwarding if live-preview refresh continues to require workspace-specific commands.
