# Proposal Direct — Runtime-owned command producer services for current canvas/construction/process-history seams

## Summary

Implement a bounded command-producer cleanup that keeps the current intent-based canvas/tool surface and moves raw `World`/`CommandStack` pairs out of controller/use-case constructors. `RuntimeSession` will still privately own `World` and `CommandStack`, but it will compose behavior-sized command-production services and expose only existing intent ports (`ToolCommandSink` and `ProcessHistoryIntentSink`) to production wiring.

This proposal corrects the stale Wave 024 plan wording: there is no current `commandStackForDeferredCommandProducers()` accessor and no raw `commandStack` provide/inject in `SvgCanvas.vue`. The active seam is the runtime constructor handoff from `RuntimeSession` to `CanvasToolController` and `ProcessHistoryController`, then raw-stack use inside canvas movement/style/construction/process-history producers. The Cycle 024 review/decision must cite this corrected proposal set as superseding those stale plan details for implementation scope; implementation must not rely on the stale accessor/provide-inject claims.

## Target outcome

- `RuntimeSession` no longer passes raw `commandStack` into `CanvasToolController` or `ProcessHistoryController`.
- Canvas point movement, canvas style update, construction intents, and process-history actions depend on behavior-sized command-production dependencies rather than `CommandStack`.
- Vue components and tools remain intent/read-model surfaces; `SvgCanvas.vue` continues to inject `CanvasCommandProducerInjectionKey` as `ToolCommandSink` and must not regain raw `CommandStack` access.
- Concrete command construction and stack push semantics are centralized in runtime-owned application command producer services, not in UI/controller shells.

## Proposed contracts

Introduce small application-level command producer dependencies. Exact names may be adjusted during implementation, but responsibilities should remain behavior-sized.

### `frontend/src/application/commandProduction/CommandProductionPorts.ts`

Define private application contracts, not public UI facades:

- `CommandExecutionPort`
  - `execute(description: string, build: (command: Command) => void): ToolCommandResult` or equivalent typed callback.
  - Owns `new Command(description, world)`, rollback on failure, commit, and `commandStack.push(command)`.
  - Must not expose `push`, `CommandStack`, undo/redo, serialized commands, or generic stack mutation.
- `PreviewCommandSessionFactory` or dedicated movement port
  - Creates a free-point move session with preview rollback, commit push, and cancel rollback semantics.
  - May remain a specialized `CanvasPointMovementCommandProducer` if a generic preview API is too abstract.
- `ProcessCommandExecutionPort`
  - Executes one process-tree operation with state reads around it, or a process-history-specific command producer if simpler.

The implementation may keep these contracts package-private to command-production modules if exporting them through `AppShellPorts.ts` would create a broad app-shell facade. `AppShellPorts.ts` should be touched only if a named session port type belongs there; avoid adding `CommandStack`-shaped APIs.

### Runtime-owned concrete producer

Create a concrete adapter such as `RuntimeCommandProducer` / `WorldCommandExecutor` under `frontend/src/application/commandProduction/` that accepts the private `World` and `CommandStack` once inside `RuntimeSession` composition and implements the contracts above. This is the only new owner of generic `Command` creation/commit/push mechanics.

## Files to change

Expected production files:

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Compose runtime-owned command producer services from private `world`/`commandStack`.
  - Pass behavior producers into `CanvasToolController` and `ProcessHistoryController` instead of raw `commandStack`.
  - Keep `world` private and keep existing view/read/persistence ports unchanged.
- `frontend/src/application/tools/CanvasToolController.ts`
  - Replace `commandStack` dependency with named command producers.
  - Keep implementing `ToolCommandSink`.
  - Delegate construction, quick intent, point movement, and style update to injected producers/use cases.
- `frontend/src/application/canvas/CanvasPointMovementUseCase.ts`
  - Remove `CommandStack` dependency and direct `commandStack.push`.
  - Either use a specialized movement command producer or receive an executor that owns commit/push.
  - Preserve preview rollback, no-preview commit no-op, cancel rollback, and final undo behavior.
- `frontend/src/application/canvas/CanvasStyleUseCase.ts`
  - Remove `CommandStack` dependency and direct push.
  - Delete the `as any` cast if the current `Command.addAndExecute` typing (including the pre-existing dirty generic typing if separately accepted) makes this safe; otherwise isolate typing in the producer without touching descriptors/registry.
- `frontend/src/application/construction/ConstructionUseCases.ts`
  - Replace `ExecuteConstructionParams.commandStack` with a behavior command executor or convert to a class receiving the executor.
  - Keep the current construction operation/factory switch in this wave; do not redesign command descriptors, sequence factories, or operation registry.
- `frontend/src/application/construction/QuickToolUseCases.ts`
  - Delete unused `world`/`commandStack` params if static usage confirms quick tools only return the existing removed/debug message.
- `frontend/src/application/processHistory/ProcessHistoryUseCases.ts`
  - Remove `CommandStack` dependency and direct push.
  - Use a process command executor while preserving `getState()` and root-pop disabled behavior.
- `frontend/src/application/processHistory/ProcessHistoryController.ts`
  - Replace raw dependency contract with a `ProcessHistoryUseCases` instance or process command producer plus read dependency.
- `frontend/src/application/tools/ToolCommandIntents.ts`
  - Only if needed for clearer command-producer result/session typing; do not add stack concepts.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Update/extend static assertions for current Wave 024 seams: no `CommandStack` imports in `CanvasToolController`, `CanvasPointMovementUseCase`, `CanvasStyleUseCase`, `ProcessHistoryController`, `ProcessHistoryUseCases`, and no raw stack params in construction/quick-tool contracts.

Expected new test files or updates:

- focused command-production tests for the new executor/service;
- canvas point movement use-case tests for preview/commit/cancel and undo/redo after commit;
- canvas style update tests;
- construction intent tests covering at least point/line/guide or representative command/process group behavior;
- process-history use-case/controller tests for push/pop/root-pop/rename/toggle and undo/redo;
- runtime/app-shell wiring tests proving `RuntimeSession` does not hand raw stack to controllers.

## Files/tests/docs/fixtures to DELETE

Delete during implementation, not in this proposal stage:

- raw `CommandStack` constructor params and imports from scoped producer/controller modules where replaced;
- `commandStack.push(...)` calls from `CanvasPointMovementUseCase`, `CanvasStyleUseCase`, `ConstructionUseCases`, and `ProcessHistoryUseCases`;
- stale `ExecuteQuickToolParams.world` / `commandStack` fields if quick behavior remains a removed/debug response;
- `CanvasStyleUseCase` `as any` cast if safe inside current command typing;
- tests that assert raw stack injection or inspect command internals from controller shells;
- transitional raw-and-port overloads, compatibility wrappers, dead exports, and duplicate command-production paths.

Do not delete `worldForView()`, persistence target handles, `initializeWorld(world, commandStack)`, `SelectionDeletionCommandService`, rendering/Three/CSS files, command descriptor/registry files, backend/docs/specs, package/tooling, or protected config/env files.

## Expected behavior change

No user-visible behavior change. Preserved behavior includes:

- point creation and line/segment/circle/guide/intersection/3D construction flows;
- point drag preview, commit, cancel, and undo/redo;
- style/property update and undo/redo;
- process-history push/pop/root-pop disabled state/rename/toggle output/encapsulation;
- toolbar/keyboard undo/redo via the existing `CommandHistoryPort`;
- 3D overlay pointer ownership and non-pass-through drag behavior.

Architectural behavior changes:

- command lifecycle ownership becomes runtime-owned and behavior-sized;
- UI/tool/controller shells cannot push raw commands to a stack;
- future rendering/read-port waves can consume stable command-producer boundaries rather than raw runtime object handoffs.

## No-backcompat / aggressive deletion rationale

Raw stack injection is internal architecture debt, not a compatibility surface. Do not preserve dual constructors or raw-stack fallbacks. If a module migrates to a producer port, delete its raw `CommandStack` import/param immediately and update tests to the new contract.

## Protected surfaces and preservation requirements

- Preserve Waves 020-023 boundaries: app-shell consumers use ports, `CommandHistoryPort` remains the only history surface, no `commandStackForDeferredCommandProducers()` accessor is reintroduced, and selection deletion remains behind its existing port.
- Do not change persistence schema/replay, operation serialization descriptors, `OperationRegistry`, `ProjectService`, Drive/auth internals, backend/docs/specs, package/tooling, rendering/Three/CSS, or app-shell project lifecycle.
- Do not rely on or overwrite the unrelated dirty `frontend/src/commands/Command.ts` change. If implementation needs that typing change, stop for source-control reconciliation or a reviewed delta because it is already dirty outside this design task.

## Validation plan

Implementation must capture stable logs under the Cycle 024 validation directory:

1. pre/post scoped status/diff and static seam scans;
2. focused Vitest for new command producer services, point movement, style update, construction execution, process-history actions, runtime wiring, and undo/redo;
3. architecture/static boundary tests for absence of raw stack imports/params/push calls in scoped shells;
4. root and frontend lint;
5. root and frontend full Vitest;
6. root and frontend build;
7. root/frontend Playwright e2e;
8. live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and Playwright/live smoke for representative construction, point movement, style, process-history, undo/redo, and 3D overlay pointer contract. Preview refresh/probe is required only in the future implementation/validation stage; this scout/proposal correction stage performs no preview refresh and does not change preview-server behavior.

## Risks and mitigations

- **Risk: generic executor becomes a renamed `CommandStack`.** Mitigate by exposing behavior/callback execution only; no public `push`, undo/redo, stack arrays, serialization, or raw command stack.
- **Risk: point-move preview rollback semantics change.** Mitigate with focused tests for repeated preview, commit with preview, commit without preview, cancel, and undo.
- **Risk: construction use case remains a god module.** Accept as residual; Wave 024 only moves command lifecycle/stack ownership. Broader construction decomposition is a future wave unless required to remove raw stack.
- **Risk: process-history disabled/root-pop behavior regresses.** Mitigate with state-before/state-after tests.
- **Risk: stale Wave 024 text causes over-deletion.** Mitigate by not searching for or reintroducing `commandStackForDeferredCommandProducers()`; target current constructor seams.

## Why this proposal is preferred

It fits current source with minimal conceptual churn: existing UI/tools already emit typed intents, so the remaining central problem is command lifecycle ownership. This direct path deletes raw stack dependencies from active command producers without absorbing rendering, persistence, descriptor, or app-shell redesign.
