# Cycle 024 Scope Check — Command-producer runtime ports for canvas, construction, and process history

## Stage boundary

This is a fresh-scout/design artifact for `cycle-024-fresh-scout-proposals-command-producer-runtime-ports-for-canvas-construction-and-process-history`. It does **not** implement production source/test changes, run validation/preview, change package tooling, touch backend/docs/spec source, redesign persistence schema/replay, alter command descriptors/serialization/`OperationRegistry`, or inspect protected secret/config/env/provider files.

## Inputs inspected

Evidence was captured before authoring this artifact under `.saivage/stages/cycle-024-fresh-scout-proposals-command-producer-runtime-ports-for-canvas-construction-and-process-history/design-notes/`:

- `pre-status.stdout` and `pre-diffstat.stdout` — path-scoped source-control state.
- `wave-024-entry.stdout` — current Wave 024 entry from `architecture-audit/wave-plan.md:1469-1569`.
- `source-lines.stdout` / `focused-source-lines.stdout` — line-numbered excerpts from runtime, app-shell, command-producer, canvas/tool, and e2e files.
- `static-command-seams.stdout` — scans for raw command-stack/command-producer seams.
- `overlay-pointer-scan.stdout` — 3D overlay pointer contract evidence.
- `unrelated-command-diff.stdout` — scoped diff in `frontend/src/commands/Command.ts`.

Cycle 023 closure artifacts inspected:

- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/decision.md`
- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/scope-check.md`
- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/implementation-log.md`

## Source-control reconciliation

Path-scoped status at task start showed:

- `M frontend/src/commands/Command.ts`
- untracked current stage notes under `.saivage/stages/cycle-024-fresh-scout-proposals-command-producer-runtime-ports-for-canvas-construction-and-process-history/`

Path-scoped diffstat showed only `frontend/src/commands/Command.ts | 6 +++---`. The diff changes `Command.addAndExecute` typing and removes the `OperationResult` type import (`design-notes/unrelated-command-diff.stdout`). This task treats that production diff as pre-existing/unrelated dirty context: it was inspected only to classify scope risk, not reverted, normalized, or incorporated into proposals as an implementation premise.

## Wave-plan status and premise assessment

**Decision: Wave 024 is valid as the next central wave, but its current plan text contains stale wording that implementation proposals must correct locally.**

The Wave 024 entry is correctly ordered after Cycle 023 because Cycle 023 closed the runtime-session consumer-port and command-history boundary, while remaining command-producing controllers still receive private runtime `world`/`commandStack` pairs. Current source confirms the active seam:

- `RuntimeSession` owns private runtime state (`frontend/src/application/appShell/RuntimeSession.ts:24-26`).
- `RuntimeSession.canvasCommandProducerPort(...)` constructs `CanvasToolController` with `world` and `commandStack` (`RuntimeSession.ts:109-114`).
- `RuntimeSession.processHistoryCommandPort()` constructs `ProcessHistoryController` with `world` and `commandStack` (`RuntimeSession.ts:117-121`).
- `AppShellRuntime` creates those command-producer ports and returns them to production composition (`frontend/src/application/appShell/AppShellRuntime.ts:17-18`, `:107-115`).

However, the Wave 024 plan entry's references to `RuntimeSession.commandStackForDeferredCommandProducers()` and raw `commandStack` provide/inject are stale against current source:

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:113` asserts `commandStackForDeferredCommandProducers()` is absent.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:127` asserts toolbar no longer injects raw `commandStack`.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:135-136` asserts `App.vue` does not provide raw `commandStack` and `AppShellRuntime` does not mention `commandStackForDeferredCommandProducers` or return `commandStack`.
- `SvgCanvas.vue` now injects `CanvasCommandProducerInjectionKey` as `ToolCommandSink`, not raw `CommandStack` (`frontend/src/components/workspace/SvgCanvas.vue:205-207`, `:348-352`).

This does **not** invalidate Wave 024. It narrows it: the raw runtime handoff is no longer an accessor/provide/inject surface, but it still exists inside runtime-owned command-producer object construction and downstream command-producing use cases.

## Current command-producer inventory

### Runtime composition seams

- `RuntimeSession.canvasCommandProducerPort(toolStore)` exposes a concrete `CanvasToolController` port but wires private `world` and `commandStack` into it (`RuntimeSession.ts:109-114`).
- `RuntimeSession.processHistoryCommandPort()` exposes `ProcessHistoryController` but wires private `world` and `commandStack` into it (`RuntimeSession.ts:117-121`).
- `AppShellRuntime` constructs the canvas and process-history command ports once at startup and returns them in the runtime object (`AppShellRuntime.ts:17-18`, `:107-115`).

### Canvas movement producer

`CanvasPointMovementUseCase` is a command lifecycle owner today:

- imports `Command`, `CommandStack`, `World`, and `UpdateFreePoint2DPositionOp` (`frontend/src/application/canvas/CanvasPointMovementUseCase.ts:1-6`);
- constructor accepts `world` and `commandStack` (`CanvasPointMovementUseCase.ts:8-9`);
- creates a `Command`, previews by rollback/add-and-execute, commits, and pushes to the stack (`CanvasPointMovementUseCase.ts:11-39`).

### Canvas style producer

`CanvasStyleUseCase` is also a command lifecycle owner:

- imports `Command`, `CommandStack`, `World`, and `UpdateElementStyleOp` (`frontend/src/application/canvas/CanvasStyleUseCase.ts:1-5`);
- constructor accepts `world` and `commandStack` (`CanvasStyleUseCase.ts:7-8`);
- creates/executes/commits/pushes a command and still uses an `as any` operation cast (`CanvasStyleUseCase.ts:10-20`).

### Construction producer

`executeConstructionIntent` owns broad construction command lifecycle:

- accepts `World` and `CommandStack` in `ExecuteConstructionParams` (`frontend/src/application/construction/ConstructionUseCases.ts:29-35`);
- imports command factories, concrete operations, process-tree operations/actions, geometric classes, and intersection helpers (`ConstructionUseCases.ts:1-27`);
- creates a command, creates a process action group, executes construction operations, checks feasibility, commits, and pushes to `CommandStack` (`ConstructionUseCases.ts:35-49`);
- contains broad construction logic for points, lines, segments, circles, guides, intersections, tangent lines, 3D element creation, 3D plane creation, and auxiliary projection-plane creation (`ConstructionUseCases.ts:52-238`).

### Quick tool producer

`QuickToolUseCases.ts` still types `world`/`commandStack` in its parameter contract (`frontend/src/application/construction/QuickToolUseCases.ts:1-9`), but the active implementation ignores them and returns a removed/debug-flow failure (`QuickToolUseCases.ts:11-15`). This is a deletion candidate in Wave 024 if static usage confirms no active quick command behavior remains.

### Process-history producer

`ProcessHistoryUseCases` owns process-history command lifecycle:

- imports `Command`, `CommandStack`, process-tree operations, `IOperation`, and `World` (`frontend/src/application/processHistory/ProcessHistoryUseCases.ts:1-9`);
- constructor accepts `world` and `commandStack` (`ProcessHistoryUseCases.ts:20-24`);
- creates/executes/commits/pushes commands in `executeProcessCommand` (`ProcessHistoryUseCases.ts:72-90`).

`ProcessHistoryController` currently passes raw runtime objects into those use cases:

- dependency contract requires `world` and `commandStack` (`frontend/src/application/processHistory/ProcessHistoryController.ts:15-18`);
- constructor creates `ProcessHistoryUseCases(deps.world, deps.commandStack)` (`ProcessHistoryController.ts:20-25`).

### Tool/canvas interaction surface

The Vue/tool surface is already mostly intent-based and should be preserved, not reopened as a broad tool rewrite:

- `ToolContext` carries `commandSink: ToolCommandSink`, `readPort: ToolInteractionReadPort`, and interaction/query state (`frontend/src/tools/ITool.ts:19-29`).
- `ArgumentCollectorTool.execute` delegates typed construction intents to `context.commandSink.executeConstructionIntent(...)` and handles completion (`frontend/src/tools/ArgumentCollectorTool.ts:130-144`).
- `SvgCanvas.vue` injects `CanvasCommandProducerInjectionKey` as a `ToolCommandSink` (`SvgCanvas.vue:205-207`, `:348-352`), passes it to tool clicks (`SvgCanvas.vue:651-655`), obtains point-move sessions via the view port with `commandSink` (`SvgCanvas.vue:757-762`), and routes style updates through `canvasToolController.updateElementStyle(...)` (`SvgCanvas.vue:829-850`).

## Protected surfaces and out-of-scope items

Wave 024 implementation proposals must not change:

- persistence schema/replay, migrations, `ProjectService`, `ProjectSessionPersistenceAdapter`, command descriptors/serialization, or `OperationRegistry`;
- `CommandStack` internals except as a private implementation detail inside a new runtime-owned command-production factory/service if required; avoid modifying `Command.ts` unless the pre-existing dirty generic typing change is separately owned;
- rendering selectors, `SVGRenderer`, Three scene/runtime/CSS, `worldForView()`/runtime read ports, canvas presentation model, or overlay event ownership;
- Drive/auth/browser credential internals, protected config/env/provider files, backend APIs, docs/specs, package/tooling, validation-platform work, or UI feature additions;
- broad app-shell production composition beyond replacing command-producer wiring.

## 3D overlay implications

Cycle 024 touches user-observable canvas and tool command behavior, so implementation validation must preserve the current overlay pointer contract. Current e2e explicitly asserts the 3D overlay is visible, has `pointer-events: auto`, is the element under the tested point, and drag gestures over it do not mutate the SVG canvas viewBox (`frontend/tests/e2e/current-ui-contract.spec.ts:89-117`). The implementation must not change Three overlay CSS, `ThreeView.vue`, canvas CSS pointer rules, or event routing except through a reviewed plan edit.

## Preview implications and boundary

This scout/proposal stage performs no implementation and therefore performs **no live-preview refresh, no preview-server restart, no reachability probe, and no Playwright/live browser exercise**. Preview-server behavior is otherwise out of scope for this stage: do not change dev-server scripts, host/port settings, Vite configuration, Playwright configuration, or preview lifecycle files as part of Cycle 024 scouting/proposal correction.

A future Cycle 024 implementation/validation stage must refresh the live application preview after successful validation, bind it to `0.0.0.0:5173`, and capture stable HTTP reachability evidence under that cycle's `validation/` directory. Because Wave 024 can affect user-observable canvas/tool/process-history behavior, the implementation log must also record the preview refresh command, PID/log/probe evidence, and the live/Playwright smoke coverage used to verify representative command-producer flows.

## DELETE candidates for Wave 024 implementation

Authorized candidates only after critic/review decision and implementation stage:

- Delete stale Wave 024 assumptions from tests if any remain: no `commandStackForDeferredCommandProducers()` accessor should be introduced or deleted because it is already absent.
- Delete raw `CommandStack` constructor/parameter dependencies from `CanvasToolController`, `CanvasPointMovementUseCase`, `CanvasStyleUseCase`, `executeConstructionIntent`, `QuickToolUseCases`, `ProcessHistoryUseCases`, and `ProcessHistoryController` where replaced by behavior-sized command-production ports/services.
- Delete direct `commandStack.push(...)` calls from scoped producers once command lifecycle is centralized in the selected runtime-owned producers.
- Delete direct `Command` construction and concrete operation imports from controller/shell modules where the selected owner moves them behind application command-production services.
- Delete `CanvasStyleUseCase`'s `as any` operation cast if the style command producer remains in scope and can use typed operation results without descriptor/registry changes.
- Delete quick-tool `world`/`commandStack` params if static usage confirms quick tools are removed/debug-only and no active behavior requires them.
- Delete dual raw-stack/port paths, overload shims, compatibility wrappers, dead exports, and tests that assert raw stack injection.

Do **not** delete `worldForView()`, rendering/read-model paths, persistence DTO casts, `initializeWorld(world, commandStack)`, or selection-deletion internals in this wave unless a reviewed plan edit broadens scope. `SelectionDeletionCommandService` still imports `CommandStack` and pushes delete commands (`frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:2`, `:24`, `:36`), but Cycle 023 deliberately treats it as a narrow selection-deletion port implementation; folding it into Wave 024 would broaden the canvas/construction/process-history producer scope.

## Validation requirements for implementation stage

No validation is run in this design stage. A future Wave 024 implementation must capture logs under `architecture-audit/cycle-024-command-producer-runtime-ports-for-canvas-construction-and-process-history/validation/` for:

1. pre/post scoped git status/diff and static scans for `CommandStack` imports, raw stack params, `commandStack.push`, `new Command`, quick-tool stale params, and protected surfaces;
2. focused Vitest for runtime/app-shell wiring, `CanvasToolController`, point movement preview/commit/cancel, style update, construction execution including process action groups, process-history actions, and undo/redo after produced commands;
3. boundary/static tests proving no raw stack producer handoff or dual raw/port path remains in scoped modules;
4. root and frontend lint where defined;
5. root and frontend full Vitest;
6. root and frontend build;
7. root/frontend Playwright e2e because canvas/process-history/tool behavior is user-observable;
8. live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and live/Playwright smoke for point creation, representative construction, point drag commit/cancel, style update, process-history action, undo/redo, and the 3D overlay pointer contract.

## Premise decision, stale-plan reconciliation, and next-stage recommendation

Proceed with Cycle 024 proposals/review. A wave-plan edit is not required before review because the central Wave 024 ordering and target remain valid, but the stale accessor/provide-inject claims in `architecture-audit/wave-plan.md:1473-1503` must not be used as implementation authority. For this cycle, the reviewed Cycle 024 proposal set (`scope-check.md`, `proposals/proposal-direct.md`, `proposals/proposal-restructure.md`) and the eventual Cycle 024 review/decision artifact must explicitly supersede those stale Wave 024 wording details and cite the current-source scope basis: `RuntimeSession.canvasCommandProducerPort(...)` and `RuntimeSession.processHistoryCommandPort()` pass private `world`/`commandStack` into command-producing controllers, while `commandStackForDeferredCommandProducers()` and raw `commandStack` provide/inject are already absent.

Recommended next canonical stage after critic approval of these corrected artifacts: `cycle-024-review-round-01` for review of `scope-check.md`, `proposals/proposal-direct.md`, and `proposals/proposal-restructure.md`. The review and subsequent `decision.md` must record that the proposal set supersedes stale Wave 024 accessor/provide-inject wording for this cycle before any implementation stage is authorized. If the reviewer/decision owner is unwilling to let the reviewed proposal set supersede stale plan wording, then the fallback is a reviewed wave-plan/decision correction mini-cycle before implementation; direct implementation must not proceed while relying on the stale `commandStackForDeferredCommandProducers()` or raw provide/inject claims.
