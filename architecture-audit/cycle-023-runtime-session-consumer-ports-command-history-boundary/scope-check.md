# Cycle 023 Scope Check — Runtime-session consumer ports and command-history boundary

## Stage boundary

This is a planning/scout stage only. It does **not** implement source changes, modify tests, alter package/tooling, touch backend code, change docs/spec source, or normalize unrelated dirty state. The next required stage is `cycle-023-review-round-01` before any decision or implementation.

## Source-control reconciliation

Scoped status was captured before writing this cycle's artifacts in `evidence/cycle-023-fresh-scout-status.stdout` / `.stderr`. The workspace is noisy and contains broad pre-existing dirty/untracked state, including old audit artifacts, `.saivage` stage files, protected config paths listed by name only, deleted speckit scaffolding, and unrelated frontend source/test paths such as `frontend/src/commands/Command.ts`, command factories/operations, panel/toolbar/view-store files, and deleted e2e specs. This stage did not revert, inspect protected file contents, or incorporate unrelated dirty files.

Files intentionally created by this task are limited to:

- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/scope-check.md`
- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/proposals/proposal-direct.md`
- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/proposals/proposal-restructure.md`
- `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/evidence/*`
- `.saivage/stages/cycle-023-fresh-scout-proposals/reports/t1-scope-and-proposals.json`

## Inputs inspected

- Wave 023 entry from `architecture-audit/wave-plan.md`, captured in `evidence/cycle-023-wave023-entry.stdout`.
- Cycle 023 wave-plan extension note, especially the selected next-wave ranking and residual-risk evidence.
- Cycle 022 implementation log, especially Wave 022 completion, validation closure, and residual raw `World` / `CommandStack` accessors.
- Current source evidence captured in `evidence/cycle-023-source-evidence.stdout` for `RuntimeSession`, `AppShellRuntime`, `ActivePlaneUseCases`, `KeyboardShortcutRouter`, `SelectionUseCases`, `SelectionDeletionCommandService`, `ProjectSessionPersistenceAdapter`, and `SvgCanvas.vue`.
- Current boundary scan captured in `evidence/cycle-023-boundary-scan.stdout` for app-shell raw accessors, app/application command producers, canvas/tool/rendering consumers, and persistence casts.

## Wave 023 premises checked

### Premise: RuntimeSession owns concrete runtime objects but still exposes raw consumer accessors

Confirmed. `RuntimeSession` imports and owns `CommandStack` and `World` at `frontend/src/application/appShell/RuntimeSession.ts:1-2` and instantiates both at `RuntimeSession.ts:17-18` (`evidence/cycle-023-source-evidence.stdout:1-18`). It still exposes:

- `worldForView()` returning `World` at `RuntimeSession.ts:20-22` (`evidence/...:20-22`);
- `commandStackForShortcuts()` returning `CommandStack` at `RuntimeSession.ts:24-26` (`evidence/...:24-26`);
- `worldForUseCases()` returning `World` at `RuntimeSession.ts:28-30` (`evidence/...:28-30`);
- `commandStackForCommandServices()` returning `CommandStack` at `RuntimeSession.ts:32-34` (`evidence/...:32-34`).

### Premise: AppShellRuntime unwraps session into broad runtime objects for app-shell consumers

Confirmed. `createAppShellRuntime()` creates one `RuntimeSession`, stores `world = session.worldForView()` and `commandStack = session.commandStackForShortcuts()` at `frontend/src/application/appShell/AppShellRuntime.ts:107-110` (`evidence/...:106-110`), then wires raw objects into:

- `ActivePlaneUseCases(session.worldForUseCases(), ...)` at `AppShellRuntime.ts:130`;
- `SelectionDeletionCommandService(session.worldForUseCases(), session.commandStackForCommandServices())` at `AppShellRuntime.ts:131`;
- `SelectionUseCases(session.worldForUseCases(), ...)` at `AppShellRuntime.ts:132`;
- `KeyboardShortcutRouter({ commandStack, ... })` at `AppShellRuntime.ts:159-168`.

The returned runtime still exposes `world` and `commandStack` at `AppShellRuntime.ts:190-192`, and `SvgCanvas.vue` consumes an injected `World` (`frontend/src/components/workspace/SvgCanvas.vue:695`, `:665`, and source-evidence lines `693-727`, `661-668`). That view-facing seam is broader than this wave unless the reviewed proposal deliberately includes only an app-shell read-port handoff.

### Premise: ActivePlaneUseCases needs a behavior-sized active-plane port, not full World

Confirmed. `ActivePlaneUseCases` imports `World` at `frontend/src/application/appShell/ActivePlaneUseCases.ts:2` (`evidence/...:229-240`) and uses only:

- `subscribeToChanges` / `unsubscribeFromChanges` at `ActivePlaneUseCases.ts:17-23` (`evidence/...:242-252`);
- `getActivePlaneId` / `setActivePlaneId` at `ActivePlaneUseCases.ts:28-29`, `34-42` (`evidence/...:255-270`);
- `getAllProjectionPlanes` at `ActivePlaneUseCases.ts:34` (`evidence/...:261-263`);
- `getProjectionPlaneById` for the active-plane name at `ActivePlaneUseCases.ts:54` (`evidence/...:273-284`).

### Premise: KeyboardShortcutRouter needs a command-history port, not full CommandStack

Confirmed. `KeyboardShortcutRouter` imports `CommandStack` at `frontend/src/application/appShell/KeyboardShortcutRouter.ts:1` (`evidence/...:286-303`) and uses it only for undo/redo predicates and actions at `KeyboardShortcutRouter.ts:97-100` (`evidence/...:376-386`).

### Premise: SelectionUseCases needs selection read/cascade-preview capabilities, not full World

Confirmed. `SelectionUseCases` imports `World` at `frontend/src/application/appShell/SelectionUseCases.ts:2` (`evidence/...:389-399`) and uses only:

- active-plane element enumeration through `getProjectionPlaneById(...).getAllPoints/getAllLines/getAllCircles()` at `SelectionUseCases.ts:45-50` (`evidence/...:430-439`);
- cascade-preview dependency order through `getDependencyService().getElementsInDeletionOrder(...)` at `SelectionUseCases.ts:59` (`evidence/...:442-448`).

### Premise: SelectionDeletionCommandService still needs raw world/command stack for command creation unless a command-service port is introduced

Confirmed. `SelectionDeletionCommandService` imports `CommandStack`, `Command`, `DeletionSequenceFactory`, and `World` (`frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts:1-4`; `evidence/...:451-455`) and constructs/pushes a concrete delete command at `SelectionDeletionCommandService.ts:32-37` (`evidence/...:480-487`). This is a command-service boundary seam. A direct implementation can move this behind a narrow session command port, but it should not redesign `Command`, `DeletionSequenceFactory`, command descriptors, or replay in this wave.

### Premise: ProjectSessionPersistenceAdapter casts opaque handles back to concrete runtime objects

Confirmed. `RuntimeSession`'s private handles still contain concrete `world` and `commandStack` at `RuntimeSession.ts:77-89` (`evidence/...:77-89`). `ProjectSessionPersistenceAdapter` imports `ProjectService`, `ProjectData`, `CommandStack`, and `World` at `ProjectSessionPersistenceAdapter.ts:1-4` (`evidence/...:489-492`), casts snapshot handles to `{ commandStack }` at `ProjectSessionPersistenceAdapter.ts:8` (`evidence/...:494-498`), casts validated payloads to `ProjectData` at `ProjectSessionPersistenceAdapter.ts:14-17` (`evidence/...:500-506`), and casts restore targets to `{ world; commandStack }` at `ProjectSessionPersistenceAdapter.ts:22-23` (`evidence/...:509-512`). This cast removal is in scope only if it remains a typed adapter-handle refactor without persistence schema/replay redesign.

### Premise: broader canvas/tool/rendering/raw-world consumers exist but should not broaden Cycle 023 by default

Confirmed. Boundary scan shows direct `World` / `CommandStack` dependencies in canvas/tool/construction/process-history/toolbar/application modules, including `CanvasToolController`, `CanvasPointMovementUseCase`, `CanvasStyleUseCase`, `ConstructionUseCases`, `QuickToolUseCases`, `ProcessHistoryUseCases`, and `ToolbarHistoryUseCases` (`evidence/cycle-023-boundary-scan.stdout`). `SvgCanvas.vue` injects full `World`, polls version, derives active plane, passes `world` to `PropertiesDialog`, and builds canvas presentation read ports (`frontend/src/components/workspace/SvgCanvas.vue:665`, `695`, `741-746`, `824-850`, `872-900`; `evidence/...:661-727`, `741-850`, `872-900`). Those seams are real, but broad rendering/presentation/tool migration is explicitly out of scope for this scout unless review chooses the restructure path.

## Selected bounded scope for Wave 023

Cycle 023 should stay centered on app-shell runtime-session consumer ports and command-history boundary:

1. Define narrow behavior ports/capabilities owned or produced by `RuntimeSession` for:
   - active-plane subscription/read/write/cycle support;
   - selection active-plane element IDs and dependency cascade preview;
   - command-history undo/redo availability and execution;
   - selection-delete command execution if review accepts moving `SelectionDeletionCommandService` behind a session-created command port;
   - typed persistence snapshot/restore adapter handles if casts can be deleted without `ProjectService` redesign.
2. Update app-shell consumers to depend on those ports instead of full `World`/`CommandStack`.
3. Keep `RuntimeSession` as sole owner of current in-memory `World` and `CommandStack`.
4. Keep `worldForView()` only as an explicitly documented rendering/view seam for `AppShellRuntime`/`SvgCanvas` if not addressed by review.
5. Do not implement leaf command-producer cleanup, rendering rewrite, persistence schema/replay redesign, backend/frontend contract changes, package/tooling churn, or docs/debug cleanup.

## Invalidated assumptions

No Wave 023 premise was invalidated by current evidence. One caveat emerged: `ToolbarHistoryUseCases` / `ToolbarHistoryController` are also command-history consumers in `frontend/src/application/toolbar` (`evidence/cycle-023-boundary-scan.stdout`), but they are not listed in the Wave 023 starting points. They should be inventoried during implementation pre-edit scans. Include them only if they are wired from the same app-shell command-history seam and can be migrated without broad toolbar/UI composition work; otherwise record them as an adjacent future wave candidate.

No wave-plan edit is required before review. The current Wave 023 entry already contains suitable stop conditions for adapter casts, rendering/view-facing world exposure, command-kernel work, backend, and broader canvas/tool migration.

## Explicit out-of-scope items / stop conditions

Stop and request a reviewed plan-edit mini-cycle if implementation would require any of the following:

- changing persistence schema, serialized project shape, command descriptors, operation registry, replay algorithm, migration behavior, or `ProjectService` internals to remove adapter casts;
- replacing `World` identity, command-stack identity, or app-wide provide/inject behavior for rendering descendants;
- migrating canvas movement/style/construction/process-history/tool command producers beyond adding typed port consumption required by app-shell wiring;
- redesigning rendering/presentation read ports, Three scene-host, domain realization contexts, or `SvgCanvas` as a whole;
- changing backend, Drive/auth, browser credentials, package/tooling, docs/spec source, validation-platform/debug surfaces, or e2e fixture strategy;
- preserving old raw-object and new port paths in parallel as compatibility shims.

## DELETE list candidates

Implementation should delete, not wrap, the following if selected by review:

- `RuntimeSession.worldForUseCases()` once active-plane, selection, and selection-delete app-shell consumers use narrow ports;
- `RuntimeSession.commandStackForCommandServices()` once selection-delete consumes a narrow command execution/session port;
- `RuntimeSession.commandStackForShortcuts()` once keyboard and any app-shell history consumers use a command-history port;
- direct `World` import/dependency in `ActivePlaneUseCases`;
- direct `World` import/dependency in `SelectionUseCases`;
- direct `CommandStack` import/dependency in `KeyboardShortcutRouter`;
- adapter-private casts in `ProjectSessionPersistenceAdapter` if a typed runtime adapter handle can replace them without changing persistence internals;
- tests/fakes that assert raw `World` / `CommandStack` injection into these consumers;
- any transitional overloads, broad runtime facades, dead exports, or dual raw-object/port paths created during the migration.

Do **not** delete canvas/style/construction/process-history command producers, `ProjectService` serialization internals, rendering read ports, backend/docs/spec/package files, or validation/debug surfaces in this wave without review-approved scope change.

## Validation requirements for implementation stage

The future implementation must capture full stdout/stderr under `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/validation/` and run the mandatory cadence:

1. Pre-edit scoped git status/diff and static scans for all raw `RuntimeSession` accessors, app-shell `World`/`CommandStack` imports, keyboard undo/redo history consumers, selection active-plane/cascade reads, adapter casts, and explicitly deferred direct command producers.
2. Focused Vitest for `RuntimeSession` ports, `ActivePlaneUseCases`, `SelectionUseCases`, `KeyboardShortcutRouter`, selection-delete wiring, and persistence adapter handle behavior if changed.
3. Static architecture/boundary tests or scans proving selected app-shell consumers no longer import concrete `World`/`CommandStack` and no dual paths remain.
4. `npm run lint` at root and root workspace invocation for frontend where defined.
5. Full Vitest at root and frontend workspace where defined.
6. `npm run build` at root and frontend workspace where defined.
7. Playwright/e2e at root and frontend workspace where defined because keyboard, selection, active-plane, deletion, undo/redo, and project-session behavior are user-observable.
8. Live preview refresh bound to `0.0.0.0:5173`, HTTP 200 reachability probe, and focused browser smoke for active-plane cycling, select-all/delete/undo/redo, startup/new-project behavior, and no real Drive credential use.

## Recommendation

Proceed to `cycle-023-review-round-01` with the two proposals in this directory. Do not implement Cycle 023 until review convergence and a decision are recorded.
