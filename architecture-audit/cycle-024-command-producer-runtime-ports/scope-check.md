# Cycle 024 Scope Check — Command-producer runtime ports

## Stage and source-control reconciliation

This is a planning/scout artifact for Wave 024. No production source, tests, package/tooling, backend, docs/specs, persistence schema/replay, rendering/view, command-kernel internals, Drive/auth internals, or protected config were changed.

Path-scoped source-control evidence was captured before writing these artifacts:

- `source-control/scoped-status.stdout.log`
- `source-control/scoped-diffstat.stdout.log`

The scoped status shows adjacent pre-existing dirty production files that are not owned by this scout task: `frontend/src/commands/Command.ts`, command factories/operations under `frontend/src/commands/**`, and `frontend/src/components/toolbars/MainToolbar.vue`. This planning task did not revert, incorporate, or depend on those edits. The only intended new files from this task are under `architecture-audit/cycle-024-command-producer-runtime-ports/` plus the `.saivage` task report.

## Wave-plan entry read

Wave 024 exists in `architecture-audit/wave-plan.md` as “Command-producer runtime ports for canvas, construction, and process history” (`architecture-audit/wave-plan.md:1487`). The entry states that it owns the residual seam left by Wave 023: `RuntimeSession.commandStackForDeferredCommandProducers()` and active canvas movement/style, construction, and process-history producers still constructing/committing/pushing commands (`architecture-audit/wave-plan.md:1511-1513`). The explicit delete list includes deleting `RuntimeSession.commandStackForDeferredCommandProducers()` after scoped producers consume reviewed command-production ports/services (`architecture-audit/wave-plan.md:1535`), and success criteria require no production source calls to that accessor (`architecture-audit/wave-plan.md:1547`). Validation requirements require static scans for the raw accessor, raw provide/inject, `CommandStack` imports, direct `Command` construction, stack `push(...)`, and intentionally deferred `worldForView()`/rendering seams (`architecture-audit/wave-plan.md:1563-1565`).

The Wave 024 plan extension confirms the same scope and explicitly says the next stage should write `scope-check.md`, `proposal-direct.md`, and `proposal-restructure.md` without implementation (`architecture-audit/cycle-024-wave-plan-extension/plan-extension-note.md`). Wave 023 completion left `worldForView()` and `commandStackForDeferredCommandProducers()` as named residual raw seams, recommending command-producer ports as a next-wave candidate (`architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/implementation-log.md`).

## Current source evidence

### Runtime/session seam

- `RuntimeSession` owns concrete `World` and `CommandStack` (`frontend/src/application/appShell/RuntimeSession.ts:18-19`).
- It still exposes `worldForView()` for the separate rendering/view seam (`RuntimeSession.ts:21-23`) and `commandStackForDeferredCommandProducers()` for deferred command producers (`RuntimeSession.ts:25-27`).
- `AppShellRuntime` unwraps both raw objects: `const world = session.worldForView()` and `const commandStack = session.commandStackForDeferredCommandProducers()` (`frontend/src/application/appShell/AppShellRuntime.ts:15-17`).
- `AppShellRuntime` returns `commandStack` in the public runtime object (`AppShellRuntime.ts:99-102`), which feeds Vue `provide('commandStack', runtime.commandStack)` in `frontend/src/App.vue:143` per `evidence/test-and-source-consumer-scan.stdout.log`.

### Canvas/tool command-producer seam

- `SvgCanvas.vue` injects raw `World` and raw `commandStack`, then creates `CanvasToolController` from both (`frontend/src/components/workspace/SvgCanvas.vue:411-421`).
- The same component passes `commandSink: canvasToolController` to active tools while still passing full `world` for interaction/read needs (`SvgCanvas.vue:742-753`).
- `CanvasToolController` depends on concrete `World` and `CommandStack` (`frontend/src/application/tools/CanvasToolController.ts:1-13`), casts an unknown provider value to `CommandStack` (`CanvasToolController.ts:18-31`), and wires raw stack to movement/style/construction/quick-tool use cases (`CanvasToolController.ts:37-59`).
- `ITool.ToolContext` already has a typed `commandSink`, but also carries full `World` for hit-test/argument collection/read behavior (`frontend/src/tools/ITool.ts:19-29`).
- `ArgumentCollectorTool` builds typed construction intents and delegates command execution to `context.commandSink.executeConstructionIntent(...)` (`frontend/src/tools/ArgumentCollectorTool.ts:91-104`, `:130-143`). It still reads `world` for plane lookup, element lookup, and collection context (`ArgumentCollectorTool.ts:162-216`). This supports a command-producer/runtime-port wave, not a broad tool/read-port/rendering rewrite.

### Canvas point movement and style producers

- `CanvasPointMovementUseCase` imports `Command`, `CommandStack`, `World`, and `UpdateFreePoint2DPositionOp` (`frontend/src/application/canvas/CanvasPointMovementUseCase.ts:1-5`).
- It constructs a command, repeatedly rolls back/applies preview operations, commits, and pushes to the stack (`CanvasPointMovementUseCase.ts:8-37`).
- `CanvasStyleUseCase` imports `Command`, `CommandStack`, `World`, and `UpdateElementStyleOp` (`frontend/src/application/canvas/CanvasStyleUseCase.ts:1-4`).
- It constructs, commits, and pushes a style command, including an `as any` operation cast (`CanvasStyleUseCase.ts:7-20`).

### Construction producer

- `ConstructionUseCases` imports `Command`, `CommandStack`, `World`, factories, concrete world operations, process-tree operations, action creators, and geometry calculators (`frontend/src/application/construction/ConstructionUseCases.ts:1-27`).
- `executeConstructionIntent` accepts raw `world` and `commandStack`, constructs `new Command`, executes construction operations, checks feasibility, commits, and pushes (`ConstructionUseCases.ts:29-48`).
- The construction helper owns broad command-production behavior: process action groups, point/line/segment/circle/guide/intersection/tangent/3D/projection-plane operations, feasibility diagnostics, and dynamic projection-plane setup (`ConstructionUseCases.ts:50-246`).
- This producer should remain application-owned but should not receive raw stack from the app-shell runtime via Vue provide/inject.

### Process-history producer

- `ProcessHistoryController` accepts raw `World` and unknown `commandStack`, checks truthiness, casts to `CommandStack`, then constructs `ProcessHistoryUseCases` (`frontend/src/application/processHistory/ProcessHistoryController.ts:1-35`, `:39-42`).
- `ProcessHistoryUseCases` imports `Command`, `CommandStack`, concrete process-tree operations, `IOperation`, and `World` (`frontend/src/application/processHistory/ProcessHistoryUseCases.ts:1-9`).
- It reads process-tree state from `world` (`ProcessHistoryUseCases.ts:25-33`), creates concrete operations for push/pop/toggle/rename (`ProcessHistoryUseCases.ts:35-69`), and wraps each in `new Command`, `commit()`, `commandStack.push(...)`, and rollback handling (`ProcessHistoryUseCases.ts:71-90`).
- `ActionsPanel.vue` creates the controller with `commandStack: inject<unknown>('commandStack')` (`frontend/src/components/panels/ActionsPanel.vue:54`, `:67-69` in `evidence/test-and-source-consumer-scan.stdout.log`). This panel path is in scope only as a process-history command-producer consumer of the runtime port, not as a broad UI/panel redesign.

## Selected bounded scope for Wave 024

Wave 024 should replace the raw runtime command-stack handoff with behavior-sized command-producer ports/services for these active command-production paths:

1. Canvas/tool command sink wiring: `AppShellRuntime`, `App.vue` provide/inject boundary, `SvgCanvas.vue`, and `CanvasToolController`.
2. Canvas movement/style command production: `CanvasPointMovementUseCase` and `CanvasStyleUseCase`.
3. Construction command production: `ConstructionUseCases`, `QuickToolUseCases` only where it shares the same raw `CommandStack` handoff, and tool-controller wiring.
4. Process-history command production: `ProcessHistoryController`, `ProcessHistoryUseCases`, and the `ActionsPanel.vue` injection boundary needed to consume the new port.
5. Focused tests/architecture scans that enforce deletion of `RuntimeSession.commandStackForDeferredCommandProducers()` and raw `commandStack` provide/inject for these consumers.

The implementation proposal should prefer ports that name behavior, for example:

- a canvas/tool command-producer port exposing construction intent execution, quick intent execution, free-point move sessions, and style updates;
- a process-history command port exposing process state plus push/pop/toggle/rename behavior;
- optional shared internal command executor helpers that are private to application command-production services and do not become a broad `World`/`CommandStack` facade.

## Premises confirmed / invalidated assumptions

Confirmed:

- The Wave 024 plan premise still holds: `RuntimeSession.commandStackForDeferredCommandProducers()` is present and actively unwrapped (`RuntimeSession.ts:25-27`; `AppShellRuntime.ts:15-17`).
- Raw `commandStack` injection still reaches canvas and process-history controllers (`SvgCanvas.vue:417-420`; `ActionsPanel.vue:67-69` from scan evidence).
- Tool classes already emit typed command intents through `commandSink`; this lowers implementation risk and argues for port wiring around existing application controllers rather than rewriting all tools.
- Broader `World` reads remain in canvas/tool/rendering paths; they are real but separable from command-stack handoff.

No Wave 024 premise was invalidated. No `wave-plan.md` edit is recommended from this scope check.

## Explicit out-of-scope / stop conditions

Out of scope for Wave 024 unless a reviewed mini-cycle broadens it:

- Persistence schema, ProjectService command serialization/replay, operation descriptor registry, migration behavior, Drive/auth internals, or backend stance.
- `CommandStack` internals, command snapshot format, `Command` operation semantics, and broad command-kernel redesign.
- Rendering/view read seams, `worldForView()`, canvas/Three selectors, Paper/SVG rendering internals, and broad tool read-port/hit-test redesign.
- Domain realization contexts, process-tree model redesign, dependency-graph semantics, geometry correctness redesign, or operation factory rewrites beyond call-site ownership.
- Docs/spec/debug cleanup, package/tooling changes, broad test rewrites, or stale audit-history mining.

Stop and request reviewed plan edit if narrowing these producers requires changing command serialization/replay semantics, operation descriptors, `CommandStack` history behavior, persistence DTOs, or a broad app-kernel facade that absorbs unrelated selection/persistence/rendering responsibilities.

## DELETE-list candidates for implementation proposals

- Delete `RuntimeSession.commandStackForDeferredCommandProducers()`.
- Delete `AppShellRuntime` raw `commandStack` unwrap and returned `commandStack` field for command producers.
- Delete app-level raw `provide('commandStack', runtime.commandStack)` where it only feeds canvas/process producers.
- Delete `SvgCanvas.vue` and `ActionsPanel.vue` raw `inject('commandStack')` command-producer handoffs.
- Delete `CanvasToolController` and `ProcessHistoryController` provider casts from `unknown` to `CommandStack`.
- Delete direct `CommandStack` dependencies from canvas movement/style/construction/process-history controller constructors where the selected ports replace them.
- Delete stale boundary-test expectations that require `commandStackForDeferredCommandProducers()` to remain present; replace with assertions that it is absent.
- Delete any dual raw-stack/port compatibility paths introduced during implementation.

Do not delete command factories/operations, process-tree operations, or ProjectService/serialization tests unless a reviewed delta explicitly broadens scope.

## Validation requirements for the eventual implementation wave

The implementation stage must capture full stdout/stderr logs under `architecture-audit/cycle-024-command-producer-runtime-ports/validation/` (or the reviewed implementation directory if renamed). Minimum required evidence:

1. Pre/post scoped git status and diff.
2. Static scans for `commandStackForDeferredCommandProducers`, raw `provide('commandStack')`, raw `inject('commandStack')`, `CommandStack` imports/casts in scoped producers/controllers, direct command push sites in scoped producers, and intentionally deferred `worldForView()`.
3. Focused Vitest for app-shell boundary, canvas tool controllers, point movement/style, construction tools, process-history controller/use cases, and updated architecture tests.
4. Root and frontend lint where defined.
5. Root and frontend full Vitest where defined.
6. Root and frontend build where defined.
7. Root and frontend Playwright/e2e because canvas construction, process history, undo/redo, point movement, and style updates are user-observable.
8. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and credential-free Playwright/live smoke for representative construction, point move/style, process-history edit, undo/redo behavior.

## Recommendation

Proceed to `cycle-024-review-round-01` after reviewing these scout/proposal artifacts. Do not implement until a decision selects a proposal.
