# Proposal Direct — Narrow RuntimeSession consumer ports in place

## Summary

Implement Wave 023 by keeping the existing `RuntimeSession` as the app-shell runtime owner and replacing its broad app-shell consumer accessors with behavior-sized ports. This is the smallest architecture-forward change that directly addresses the residual seams identified after Wave 022: active-plane use cases, keyboard undo/redo history, selection read/cascade preview, selection-delete command execution, and adapter-private persistence handles.

No production code is changed by this proposal stage.

## Target outcome

After implementation:

- `RuntimeSession` remains the only app-shell owner of the current `World` and `CommandStack`.
- App-shell use cases consume named capabilities rather than full mutable runtime objects:
  - active-plane port;
  - selection read/dependency-preview port;
  - command-history undo/redo port shared by keyboard shortcuts and toolbar undo/redo;
  - selection-delete command port/session executor;
  - adapter-local typed persistence runtime handles that remove casts without becoming general consumer-facing `World` / `CommandStack` exposure.
- `AppShellRuntime` wires those ports and no longer unwraps `World`/`CommandStack` for active-plane, selection, selection deletion, keyboard history, or toolbar history.
- `worldForView()` remains only as an explicitly documented view/rendering handoff for `SvgCanvas` and descendants.
- No broad canvas/tool/rendering/persistence-schema/backend/package/docs cleanup is performed.

## Files to change

### Production source

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Add behavior-sized port-returning methods, for example:
    - `activePlanePort()` exposing subscribe/unsubscribe, active-plane id, plane summaries, set/cycle support, and name lookup;
    - `selectionReadPort()` exposing `getSelectableIdsInPlane(planeId)` and `getCascadePreviewIds(selectedIds)`;
    - `commandHistoryPort()` exposing `canUndo`, `undo`, `canRedo`, `redo` for every app-shell command-history consumer in this wave, including keyboard shortcuts and toolbar undo/redo;
    - `selectionDeletionPort()` or `selectionDeletionCommandPort()` that internally creates/pushes the delete command through the owned world/command stack;
    - typed persistence snapshot/restore handles with concrete runtime internals represented only by adapter-local/exported-for-adapter types, not by general consumer-facing interfaces.
  - Delete raw use-case/history accessors selected by review.
  - Keep `worldForView()` with an implementation-log justification as the remaining rendering/view seam.

- `frontend/src/application/appShell/AppShellPorts.ts`
  - Define narrow port interfaces if they are app-shell contracts rather than private `RuntimeSession` implementation details.
  - Keep public project-session persistence payload opaque; do not re-expose serialized DTO shape.
  - If persistence handle types are declared here, mark them adapter-only and do not include them in active-plane, selection, keyboard, or toolbar consumer contracts.

- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Wire `ActivePlaneUseCases`, `SelectionUseCases`, `KeyboardShortcutRouter`, and selection deletion through named `RuntimeSession` ports.
  - Stop storing `commandStack = session.commandStackForShortcuts()` for keyboard use and stop exposing a raw command stack to toolbar history.
  - Retain `world = session.worldForView()` only for existing provide/view-facing runtime return, unless review approves a tiny read-port handoff.

- `frontend/src/application/appShell/ActivePlaneUseCases.ts`
  - Replace direct `World` import/dependency with `ActivePlanePort`.
  - Preserve start/dispose subscription behavior, active-plane name updates, direct update, and cycling behavior.

- `frontend/src/application/appShell/SelectionUseCases.ts`
  - Replace direct `World` import/dependency with a `SelectionWorldReadPort`/`SelectionReadPort`.
  - Preserve select-all-in-active-plane and cascade-preview semantics.

- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
  - Replace `CommandStack` dependency with `CommandHistoryPort`.
  - Preserve Ctrl/Cmd+Z, Ctrl/Cmd+Y, and Cmd/Ctrl+Shift+Z behavior.

- `frontend/src/application/selectionDeletion/SelectionDeletionCommandService.ts`
  - Either keep as an internal helper constructed by `RuntimeSession` or replace constructor raw arguments with a narrow command execution context.
  - Do not change `Command`, `DeletionSequenceFactory`, command descriptors, or replay.

- `frontend/src/application/toolbar/ToolbarHistoryUseCases.ts`
  - Replace the direct `CommandStack` dependency with the same `CommandHistoryPort` used by `KeyboardShortcutRouter`.
  - Preserve existing undo/redo availability and command execution semantics; this is an in-scope command-history consumer, not a broader toolbar/UI composition rewrite.

- `frontend/src/application/toolbar/ToolbarHistoryController.ts`
  - Update constructor/fakes only as needed to pass a `CommandHistoryPort` into `ToolbarHistoryUseCases`; do not redesign toolbar state or component composition.

- `frontend/src/components/toolbars/Toolbar.vue`
  - Remove raw `CommandStack` handoff for toolbar history only if current wiring requires the component to pass it. Keep all unrelated toolbar UI behavior unchanged.

- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts`
  - Include cast removal as a bounded adapter-local cleanup: replace private opaque-handle casts with typed adapter-only handles from `RuntimeSession` / `AppShellPorts`.
  - These handle types may carry the concrete internals needed by `ProjectService.serializeCommands` / `deserializeCommands`, but they must be named as persistence-adapter handles and must not be reused by active-plane, selection, keyboard, toolbar, or other general consumers.
  - Keep `ProjectService` as the only serialization bridge and avoid schema/replay redesign. If clean typed handles require changing `ProjectService`, command serialization, replay, schema, or command descriptors, stop and defer persistence-handle cleanup instead of broadening Cycle 023.

### Tests / validation source

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Add/adjust static assertions that `ActivePlaneUseCases`, `SelectionUseCases`, `KeyboardShortcutRouter`, and toolbar history use cases/controllers do not import `World`/`CommandStack` for command-history consumption.
  - Assert selected raw `RuntimeSession` use-case/history accessors are gone and no dual raw/port path remains for keyboard or toolbar undo/redo.
  - If persistence handle casts are removed, assert `ProjectSessionPersistenceAdapter` no longer imports `World` / `CommandStack` only when the typed handle makes that true; otherwise document explicit deferral.

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Update fakes to port-based dependencies.
  - Cover active-plane subscription/cycle/update, selection active-plane select-all, cascade preview, delete command flow, keyboard undo/redo routing, toolbar undo/redo routing, and project-session restore/autosave behavior that could be affected by the port changes.

- Add focused unit tests only if existing app-shell tests cannot express a port contract cleanly.

## Files/tests/docs/fixtures to DELETE

- Delete `RuntimeSession.worldForUseCases()` if active-plane, selection, and selection-delete no longer need raw `World`.
- Delete `RuntimeSession.commandStackForCommandServices()` if selection-delete no longer receives raw `CommandStack`.
- Delete `RuntimeSession.commandStackForShortcuts()` after both keyboard shortcuts and toolbar history receive `CommandHistoryPort` instead of raw `CommandStack`.
- Delete direct `World` imports from `ActivePlaneUseCases.ts` and `SelectionUseCases.ts`.
- Delete direct `CommandStack` import from `KeyboardShortcutRouter.ts`.
- Delete direct `CommandStack` imports/constructor expectations from `ToolbarHistoryUseCases.ts` and any toolbar history controller/wiring fakes touched by the migration.
- Delete `ProjectSessionPersistenceAdapter` casts to `{ commandStack }` / `{ world; commandStack }` by replacing them with adapter-local typed handles; do not replace them with a general runtime facade.
- Delete tests/fakes that assert raw `World` / `CommandStack` injection into these consumers.
- Delete any transitional overloads, compatibility wrappers, broad runtime facades, or dead exports introduced while migrating.

Do not delete canvas/tool/construction/process-history command producers, rendering read ports, persistence schema/replay fixtures, backend files, docs/spec source, package/tooling, or e2e files in this direct wave.

## Expected behavior change

No user-visible behavior change is intended. Active-plane name/state updates, Tab/Shift+Tab cycling, select-all-in-active-plane, cascade preview, delete, undo/redo keyboard shortcuts, toolbar undo/redo buttons, autosave/project restore, and view rendering should behave equivalently. The behavior change is architectural: consumers express the capabilities they need rather than receiving full mutable runtime objects.

## No-backcompat rationale

These are internal app-shell dependencies. Keeping both raw-object accessors and new ports would preserve the ambiguity Wave 023 is meant to remove. Once a narrow port replaces a consumer, delete the raw accessor and update tests/callers directly. Do not add compatibility overloads or a broad `RuntimeFacade` that mirrors `World`/`CommandStack`.

## Risks

- Ports can become broad facades if they expose raw `World` methods one-for-one; keep each interface behavior-scoped.
- Active-plane subscription timing could drift if the port hides world change notifications incorrectly.
- Undo/redo shortcut or toolbar availability could change if `canUndo`/`canRedo` checks are not preserved exactly.
- Selection cascade preview and deletion order are correctness-sensitive; tests must cover selected-plus-dependent ids.
- Moving `SelectionDeletionCommandService` behind `RuntimeSession` may accidentally broaden `RuntimeSession`; keep the delete command port focused on selected ids only.
- Typed persistence handles may not remove casts without exposing concrete runtime types somewhere else; if the only clean route requires broad consumer exposure or persistence-service redesign, defer that slice rather than hiding a persistence redesign.
- Existing unrelated dirty state can confuse status/diff; implementation must remain path-scoped.

## Validation plan

Capture logs under `architecture-audit/cycle-023-runtime-session-consumer-ports-command-history-boundary/validation/`:

1. Pre-edit scoped status/diff and static raw-accessor/import scans.
2. Focused Vitest for app-shell boundary and use-case tests, including active-plane, selection, keyboard, toolbar history, selection deletion, and persistence adapter if touched.
3. Static scan proving selected raw accessors/imports/casts are gone and no dual path remains, including no raw `CommandStack` path for keyboard or toolbar undo/redo.
4. `npm run lint` at root and `npm run lint --workspace=frontend` where defined.
5. Full root Vitest and frontend workspace Vitest where defined.
6. `npm run build` at root and `npm run build --workspace=frontend` where defined.
7. Root/frontend Playwright e2e where defined because behavior is user-observable.
8. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and browser smoke for active-plane cycling, select-all/delete/keyboard undo-redo/toolbar undo-redo, startup/new project, and credential-free behavior.

## Stop conditions / explicit non-goals

Stop and request plan-edit/review if the direct implementation needs to:

- change `ProjectService`, command serialization, persistence schema, replay, descriptors, migrations, or operation registry;
- replace app-wide `World` identity or remove the view-facing injected `World` for `SvgCanvas`;
- migrate canvas movement/style/construction/process-history/tool command producers;
- redesign canvas/Three presentation read ports, rendering selectors, domain realization contexts, or `SvgCanvas` internals;
- require toolbar/UI composition changes beyond replacing toolbar history's raw command-stack dependency with `CommandHistoryPort`;
- include backend, Drive/auth, docs/spec, package/tooling, validation-platform, or debug cleanup;
- introduce compatibility shims or parallel raw-object and port paths.

## Recommendation

Select this proposal if review agrees the Wave 023 plan is still valid and the priority is deleting app-shell raw runtime seams without broadening into a larger application-kernel redesign.
