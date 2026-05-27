# Proposal Direct — Runtime-owned command-producer ports

## Summary

Replace the residual raw `CommandStack` handoff with explicit runtime-owned command-producer ports for the existing canvas/tool and process-history application producers. Keep current command construction logic in application use-case modules, but wire it through `RuntimeSession` ports instead of exposing `commandStackForDeferredCommandProducers()` or Vue `provide/inject('commandStack')`.

This is the focused implementation of Wave 024 as planned. It deletes the raw accessor and raw command-stack injection while preserving the existing command, operation, persistence, rendering, and tool-interaction contracts.

## Files to change

Production source:

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Add behavior-sized factory/port methods for scoped command producers, e.g. `canvasCommandPort(toolStore)` or `canvasCommandProducerPort(...)`, and `processHistoryCommandPort()`.
  - Own the concrete construction of those ports from the session's private `World` and `CommandStack`; no other runtime/app-shell object may unwrap or cache a raw stack for producers.
  - Delete `commandStackForDeferredCommandProducers()` after all consumers are rewired.
- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Stop unwrapping raw `commandStack` from the session.
  - Return named command-producer ports/controllers instead of `commandStack` for canvas and process-history consumers.
  - The returned runtime shape should have explicit fields such as `canvasCommandProducerPort` and `processHistoryCommandPort` (or equivalently named behavior fields), not a generic `commands`, `services`, `runtimeContext`, or mutable dependency bag.
- `frontend/src/App.vue`
  - Replace raw `provide('commandStack', runtime.commandStack)` with named provides for selected command-producer ports, e.g. canvas tool command port and process-history port.
  - Use typed Vue `InjectionKey` exports or direct prop/factory wiring with named TypeScript interfaces; string-keyed catch-all provides are forbidden for the replacement path.
- `frontend/src/components/workspace/SvgCanvas.vue`
  - Inject the selected canvas command-producer port or controller, not raw `commandStack`.
  - Continue using injected `world` for current rendering/interaction reads; cite it as deferred `worldForView()`/read seam.
- `frontend/src/components/panels/ActionsPanel.vue`
  - Inject the selected process-history command port/controller, not raw `commandStack`.
- `frontend/src/application/tools/CanvasToolController.ts`
  - Replace provider dependency `{ world, commandStack: unknown }` and cast with a typed command-producer dependency from the runtime/session.
  - Keep the `ToolCommandSink` shape where practical because tools already depend on it.
- `frontend/src/application/canvas/CanvasPointMovementUseCase.ts`
- `frontend/src/application/canvas/CanvasStyleUseCase.ts`
- `frontend/src/application/construction/ConstructionUseCases.ts`
- `frontend/src/application/construction/QuickToolUseCases.ts` if still raw-stack wired through the same controller
  - Keep command construction semantics but receive an internal command execution capability from the runtime-created service instead of public raw stack from Vue/app runtime.
  - If a small helper is introduced, keep it private to `frontend/src/application/commandProduction/` or similar and avoid exposing a generic mutable stack facade.
- `frontend/src/application/processHistory/ProcessHistoryController.ts`
- `frontend/src/application/processHistory/ProcessHistoryUseCases.ts`
  - Replace raw provider cast with typed process-history command port/controller dependency.
- `frontend/src/application/tools/ToolCommandIntents.ts` and `frontend/src/application/processHistory/ProcessHistoryIntents.ts` only if a small type addition is needed to express the named ports.

### Required runtime-port ownership contract

The implementation must make command-producer ownership explicit and non-generic:

- `RuntimeSession` remains the only object that owns the concrete `CommandStack` for scoped producers. It may create behavior-specific ports/controllers from its private stack, but it must not expose the stack, a stack-like wrapper, or a generic `execute(commandBuilder)` service to Vue components.
- `AppShellRuntime` may return only named behavior fields for this wave, such as a canvas/tool command producer and a process-history command producer. It must not replace `runtime.commandStack` with another broad mutable service (`commandRuntime`, `commandServices`, `appServices`, `runtimeContext`, etc.) that gives consumers arbitrary command execution.
- Vue wiring must be type-addressable: either typed `InjectionKey<Canvas...>` / `InjectionKey<ProcessHistory...>` constants with behavior-sized interfaces, or direct imports/factory/prop wiring. A new string-keyed provider such as `provide('commands', ...)` or `inject('runtime')` is a blocker because it recreates the current hidden dependency seam.
- Port interfaces should name user/application behaviors already present in the scoped producers: construction intent execution, quick intent execution, free-point movement sessions, style updates, process-history state reads, and process-history mutations. They should not expose raw `World`, raw `CommandStack`, `Command.push`, `new Command`, persistence saves, rendering state, or arbitrary operation replay.

Tests:

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Replace the current expectation that `commandStackForDeferredCommandProducers()` exists with an assertion that it is absent.
  - Add static assertions that raw `provide('commandStack')` / `inject('commandStack')` are absent from `App.vue`, `SvgCanvas.vue`, and `ActionsPanel.vue` for command-producer wiring.
- `frontend/tests/unit/application/AppShellRuntimeUseCases.test.ts` or current runtime tests
  - Update tests that read `runtime.commandStack` or call `session.commandStackForDeferredCommandProducers()` to use command-history/producer ports or focused behavior assertions.
- `frontend/tests/unit/application/canvasToolControllers.spec.ts`
- `frontend/tests/unit/tools/pointTool.spec.ts`
- `frontend/tests/unit/tools/CircleTool.spec.ts`
- `frontend/tests/unit/tools/toolValidation.spec.ts`
- `frontend/tests/unit/application/panelToolbarIntentControllers.spec.ts`
  - Update fakes and assertions to consume typed command-producer ports rather than public raw stack handoff where the tests target application wiring.
  - Retain tests that use `CommandStack` as a test fixture for command behavior only where they construct the command-production service directly.

## Files/tests/docs/fixtures to DELETE

- Delete `RuntimeSession.commandStackForDeferredCommandProducers()`.
- Delete `AppShellRuntime` returned `commandStack` field if no remaining production consumer needs it after rewiring.
- Delete raw Vue command-stack provide/inject for active canvas/process producers:
  - `provide('commandStack', runtime.commandStack)` in `frontend/src/App.vue`.
  - `inject('commandStack')` in `frontend/src/components/workspace/SvgCanvas.vue`.
  - `inject<unknown>('commandStack')` in `frontend/src/components/panels/ActionsPanel.vue`.
- Delete `CanvasToolControllerProviderDependencies.commandStack: unknown` and the `as CommandStack` cast.
- Delete `ProcessHistoryControllerProviderDependencies.commandStack: unknown` and the `as CommandStack` cast.
- Delete boundary-test assertions that preserve the deferred raw accessor.
- Delete any transitional overloads, shims, or dual raw-stack/port execution paths created during implementation.

No docs/spec fixtures are proposed for deletion in this wave. No command factories, concrete operations, ProjectService tests, backend files, or rendering tests should be deleted by the direct path.

## Expected behavior change

No intentional user-visible behavior change. Canvas construction, quick tools, free-point movement preview/commit/cancel, style updates, process-history push/pop/toggle/rename, undo/redo, save/autosave dirty signaling, and project round-trip behavior should remain equivalent.

Architectural behavior changes:

- Runtime no longer exposes a raw `CommandStack` to deferred producers.
- Vue components no longer inject a raw command stack.
- Command production is entered through named application ports/controllers.
- Remaining full `World` access is explicitly limited to current view/interaction/read seams and is not a command-stack handoff.

## Risks

- The port can become a broad `World`/`CommandStack` facade if it simply exposes `execute(commandBuilder)` or raw mutation hooks. Keep ports named by user/application behavior.
- Point movement preview relies on rollback semantics of a long-lived command. Tests must cover preview, commit with preview, commit without preview, cancel, and failed preview rollback.
- Construction covers many operation families and process-tree action groups. Focused tests must cover representative point/line/circle/guide/intersection/3D/projection-plane flows rather than only one happy path.
- Process-history state reads still need `World.getProcessTree()`. Keep this inside a process-history port/use case; do not expand to process-tree redesign.
- `CanvasToolController` and `ProcessHistoryController` may be simplified, but deleting or merging them is allowed only if the resulting replacement remains equally narrow: canvas command production, process-history command production, and no unrelated read/render/persistence/tool-state responsibilities.
- Tool/controller seam changes must preserve the existing `ToolCommandSink` intent boundary. Do not absorb tool hit-testing, argument collection, active-plane reads, `world` interaction reads, or the tool state machine into command-producer ports.
- Existing dirty command operation files may affect validation. Implementation must capture scoped status/diff and avoid depending on unrelated edits.

## Validation plan

Capture logs under the implementation cycle’s `validation/` directory:

1. Pre-edit scoped status/diff and static scans for raw accessor/provide/inject/stack imports.
2. Focused unit/static tests:
   - `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
   - app-shell runtime tests covering no raw `commandStack` return
   - canvas tool controller and point/style movement tests
   - representative tool tests for construction intent execution
   - process-history controller/use-case tests
   - keyboard and toolbar undo/redo tests proving history behavior still flows through the existing `commandHistoryPort`, not through any new command-producer port
3. Post-edit static scans proving:
   - no `commandStackForDeferredCommandProducers` in production source;
   - no production `provide('commandStack')` or command-producer `inject('commandStack')`;
   - no provider cast from unknown to `CommandStack` in canvas/process-history controllers;
   - no replacement string-keyed catch-all provider/injection or generic mutable command service has been introduced;
   - keyboard/toolbar undo-redo call sites still use `commandHistoryPort`;
   - `worldForView()` remains only as an explicitly deferred view/read seam.
4. Root/frontend lint where defined.
5. Root/frontend full Vitest where defined.
6. Root/frontend build where defined.
7. Root/frontend Playwright/e2e because affected flows are user-observable.
8. Focused persistence/autosave guard evidence: run existing tests or smoke flows that verify command-producer changes still mark projects dirty, autosave/save through the same paths, and preserve project round-trip behavior without editing schema/replay code.
9. Refresh live preview on `0.0.0.0:5173`, capture HTTP 200 probe, and run credential-free live smoke for representative construction, point move/style, process-history edit, and undo/redo.

## No-backcompat rationale

The raw `commandStackForDeferredCommandProducers()` accessor and raw Vue command-stack injection are internal architecture debt. Preserving them next to named command-producer ports would keep ownership ambiguous and let future UI/tool code bypass application use cases. The direct path deletes the old raw path and updates active callers/tests directly.

## Stop conditions

Stop for a reviewed plan edit if implementation requires any of the following:

- Changing `CommandStack` history behavior, `Command` snapshot format, operation descriptors, or persistence replay semantics.
- Redesigning `ProjectService`, schema, migrations, Drive/auth, or backend contracts.
- Replacing `worldForView()` or introducing broad rendering/view/read selectors.
- Moving `world` reads in `SvgCanvas.vue`, tool hit-testing, active-plane/argument collection reads, or process-tree rendering into command-producer ports.
- Rewriting the whole tool state machine or domain realization model.
- Deleting or merging `CanvasToolController` or `ProcessHistoryController` in a way that broadens responsibilities beyond the current command-producer seam.
- Changing keyboard/toolbar history routing away from `commandHistoryPort`, or changing autosave dirty signaling / persistence round-trip behavior beyond the command-producer boundary.
- Creating a generic application kernel/god service that absorbs selection, persistence, rendering, and construction/process command production in one facade.
