# Wave 009 Proposal Direct — Extract focused shell services from `App.vue`

## Summary

Move the existing `App.vue` orchestration into focused application-shell composables/services while preserving the current conceptual structure: `App.vue` remains the root layout and provider, but delegates project lifecycle, autosave, selection/delete/select-all/cascade preview, active-plane status, and keyboard routing to typed modules under `frontend/src/application/appShell/` (or equivalent). This proposal is intentionally direct: it extracts the current responsibilities without redesigning the whole runtime container.


## Required ownership constraints from round-01 review

- Wave 009 must leave exactly **one** authoritative app-shell keyboard interpreter/registry: `AppKeyboardRouter`. It owns all global `keydown` interpretation for Escape, Delete/Backspace, F2, Tab/Shift+Tab, Ctrl/Cmd+N/O/A/0, undo/redo, D projection toggle, and P/L/S/C/G/tool-family shortcuts.
- `Toolbar.vue` must not retain a parallel keydown handler, switch statement, shortcut registry, watcher, or fallback path that decides global shortcut behavior. After implementation it may keep only button rendering, click emits/actions, and passive shortcut labels/metadata consumed by `AppKeyboardRouter` through a typed port.
- Removing `Toolbar.vue`'s global shortcut owner is in Wave 009 scope because a shell keyboard extraction cannot be correct while a toolbar component still owns competing global shell shortcuts. This is not Wave 006b command-controller work or Wave 010 backend-contract work; broader toolbar command/controller redesign remains out of scope.
- Each extracted shell controller must expose explicit lifecycle ownership. `App.vue` may install/start controllers at mount/runtime creation and must call one disposer at unmount/shell replacement. No controller may hide browser listeners, world subscriptions, intervals, or debounce timers without returning/owning a typed cleanup path.

## Files to change

- `frontend/src/App.vue`
  - Keep template/layout, component refs, simple event bindings, and providers.
  - Remove direct imports of `Command`, `DeletionSequenceFactory`, `ProjectService`, and most Drive/autosave/keyboard logic.
  - Consume typed shell composables/controllers.
- Add `frontend/src/application/appShell/AppShellState.ts`
  - Typed state model for project name/file id, startup dialog, sign-in, save status, renaming, coordinates, active-plane label, and 3D overlay flag.
- Add `frontend/src/application/appShell/ProjectSessionController.ts`
  - Own initialize/sign-in/sign-out/create/open/new/rename flows using `World`, `CommandStack`, `ProjectService`, `GoogleDriveService` through narrow ports, `authStore`, and storage adapters.
- Add `frontend/src/application/appShell/AutoSaveController.ts`
  - Own world-version polling/debounce, status transitions, Drive update/recreate/auth/quota/network error classification, and timer cleanup via typed scheduler/window ports.
- Add `frontend/src/application/appShell/SelectionShellController.ts`
  - Own cascade preview, delete-selected command creation, select-all traversal, and selection-store updates.
- Add `frontend/src/application/appShell/ActivePlaneController.ts`
  - Own world subscription, active-plane id/name DTO, and active-plane cycle/update actions.
- Add `frontend/src/application/appShell/AppKeyboardRouter.ts`
  - Become the single global keyboard owner for app-shell shortcuts: escape, delete/backspace, F2, Tab/Shift+Tab active-plane cycling, Ctrl/Cmd+N/O/A/0, undo/redo, D projection toggle, and all toolbar/tool-family shortcuts currently split between `App.vue` and `Toolbar.vue`.
  - Accept typed adapters for shell actions, tool-family selection, projection-display toggle, fit-to-view, and rename focus so it does not import Vue components.
  - Export an explicit `install(target): () => void` or equivalent disposer; repeated installation against the same shell must be rejected or idempotently replace the old listener so singleton keyboard ownership is testable.
- Update `frontend/src/components/toolbars/Toolbar.vue`
  - Delete its `window.addEventListener('keydown', handleKeyDown)` / `removeEventListener` ownership and route Escape, D, and tool-family shortcut behavior through the app-shell keyboard router instead.
  - Keep button rendering and click handlers only; keyboard shortcut metadata may remain as display/registry data if consumed by the router through a typed port.
- Add `frontend/src/application/appShell/BrowserProjectListPort.ts` or equivalent only if needed to remove the `StartupDialog` window event bridge.
- Update `frontend/src/components/dialogs/StartupDialog.vue`
  - Replace `window.dispatchEvent(new CustomEvent('load-files'))` with typed `emit('load-files')` or an explicit `files/loading/error` prop flow.
- Update focused tests under `frontend/tests/unit/application/appShell/` and possibly `frontend/tests/unit/components/appShell/`.
- Add or update e2e/live smoke specs only where focused existing e2e corruption allows; otherwise add a standalone smoke script/log in validation.

## Files/tests/docs/fixtures to DELETE

- Delete inline project lifecycle/open/save/autosave/sign-in/sign-out orchestration from `frontend/src/App.vue` after extraction.
- Delete inline selection cascade/delete/select-all command orchestration from `frontend/src/App.vue` after extraction.
- Delete inline active-plane subscription/cycling DTO logic from `frontend/src/App.vue` after extraction.
- Delete inline global keyboard decision tree from `frontend/src/App.vue` after extraction.
- Delete `Toolbar.vue`'s second global keyboard listener and any duplicate Escape/D/tool-shortcut handling that competes with the app-shell router.
- Delete `window as any.__autoSaveInterval` bridge and all untyped window interval storage in `App.vue`.
- Delete `StartupDialog.vue`'s `CustomEvent('load-files')` / `window.dispatchEvent` bridge and matching `App.vue` `window.addEventListener('load-files', ...)` listener.
- Delete debug logging from touched App shell paths, especially environment dump logging and routine autosave command-count logs (`frontend/src/App.vue:134-145`, `frontend/src/App.vue:523-530`).
- Delete TODO/log-only highlight stubs if no implementation is made in this wave; otherwise make them typed no-op boundaries with tests only if review accepts them as still required (`frontend/src/App.vue:640-655`).
- Delete obsolete App.vue-focused tests that inspect inline methods once replaced by service/controller tests.


## Install/start and dispose/stop contract

- `AppKeyboardRouter` owns the only `window`/document `keydown` listener. `start()`/`install()` registers that listener and returns/stores its disposer; `stop()`/`dispose()` removes it. Tests must prove a second router/listener is not installed while one is active and that unmount removes the listener.
- `AutoSaveController` owns version-poll intervals, debounce timers, and transient saved/idle timeouts. `start()` begins polling only when a project/session is eligible; `schedule()` owns debounce replacement; `stop()` clears polling/debounce/status timers; `dispose()` is safe to call multiple times.
- `ActivePlaneController` owns the world subscription that derives active-plane id/name. `start(world)` subscribes once to the current stable world; `stop()` unsubscribes. World reset/open/create must reuse the same world instance or explicitly stop and restart the subscription before exposing state.
- `ProjectSessionController` owns startup/open/create/sign-in/sign-out flows and any storage/auth subscriptions it introduces. It must not replace the provided `World`; it clears/reinitializes the stable world and command stack through typed reset methods.
- `StartupDialog` file-list handling must become a typed parent/runtime flow. Any request-files listener/subscription belongs to the shell controller or Vue event binding and has a matching cleanup; the current anonymous `window.addEventListener('load-files', ...)` bridge is deleted rather than moved.
- Selection cascade watchers/subscriptions introduced by `SelectionShellController` must return a stop handle and be disposed with the shell.

## Expected behavior change

No intentional user-visible behavior change except removal of routine debug logging. Local-only startup should still initialize the default world and hide the startup dialog when Drive credentials are unavailable. Drive sign-in/open/create/rename/autosave should remain equivalent. Delete/Backspace, Ctrl/Cmd+A, Ctrl/Cmd+N/O/0, undo/redo, Escape, F2, Tab/Shift+Tab, and tool shortcuts should still work with the same input-field exemptions.

## Implementation outline

1. Add typed ports for browser storage, timers, alerts, and Drive operations so tests can run without real Google APIs.
2. Extract `AutoSaveController` first, including cleanup and status refs/callbacks, because it removes the most obvious `window as any` bridge.
3. Extract `ProjectSessionController`, preserving current `world.clear()` semantics for open/create and avoiding sign-out world replacement that creates stale provides; prefer clearing/reinitializing the existing world object over `world = new World()`.
4. Extract `SelectionShellController` for cascade preview, delete command construction, and select-all.
5. Extract `ActivePlaneController` for subscription/name/cycling/update.
6. Extract `AppKeyboardRouter` and install/uninstall it from `App.vue` through a typed listener disposer.
7. Move the overlapping `Toolbar.vue` Escape/D/tool-family shortcut behavior into the same router and delete Toolbar's own global listener, leaving toolbar buttons as click-only UI adapters.
8. Replace `StartupDialog` file-list `CustomEvent` with typed emit/prop flow.
9. Reduce `App.vue` to layout, state/controller composition, and event wiring.

## Validation plan

Focused tests:

- `npm run test --workspace=frontend -- appShell`
  - `ProjectSessionController`: local-only initialize creates default planes, create/new/open call ProjectService/Drive ports, last-file restore success/failure updates storage and state, sign-in/profile/auth store flows, sign-out clears existing world/stack without stale re-provide semantics.
  - `AutoSaveController`: version polling schedules debounce, updateFile success transitions `saving -> saved -> idle`, deleted-file recovery creates replacement and updates storage, auth/quota/network failures are classified, cleanup clears timers.
  - `SelectionShellController`: cascade preview excludes directly selected ids, delete builds/commits/pushes cascade command and clears selection, no-selection is no-op, select-all traverses active-plane points/lines/circles.
  - `ActivePlaneController`: subscription updates id/name and tab cycling wraps through planes.
  - `AppKeyboardRouter`: all shortcuts dispatch expected intents and ignore text inputs where current behavior does, including Escape, D projection toggle, P/L/S/C/G and toolbar family shortcuts, Delete/Backspace, F2, Tab/Shift+Tab, Ctrl/Cmd+N/O/A/0, undo, and redo.
  - `Toolbar.vue`: no longer registers a global keydown listener; button clicks still invoke tool/projection actions through typed emits/ports; it contains no shortcut decision switch/map for Escape/D/tool-family keyboard behavior.
  - `StartupDialog` emits typed file-list request without touching `window`.
- Static boundary tests/scans:
  - `App.vue` has no imports of `Command`, `DeletionSequenceFactory`, or `ProjectService` if those are fully moved to app-shell services.
  - `App.vue` contains no `window as any`, `__autoSaveInterval`, `CustomEvent('load-files')`, or environment dump logging.
  - `Toolbar.vue` contains no `window.addEventListener('keydown'`, `window.removeEventListener('keydown'`, local global shortcut handler, keyboard shortcut `switch`, or shortcut registry used to interpret keydown events.
  - Exactly one app-shell keyboard router module contains global shortcut interpretation; static scan fails if `App.vue`, `Toolbar.vue`, or other components contain `keydown` shortcut trees for these shell shortcuts.
  - App-shell lifecycle tests prove `AppKeyboardRouter.dispose()` removes its listener, `AutoSaveController.dispose()` clears polling/debounce/status timers, `ActivePlaneController.dispose()` unsubscribes from world changes, `SelectionShellController` stops cascade watchers, and StartupDialog request-files state/listeners are cleaned up on unmount or shell replacement.
  - App-shell application services do not import Vue components or rendering adapters.

Mandatory cadence for implementation stage:

- `npm run lint` at root and `npm run lint --workspace=frontend` where defined; classify known missing-eslint blocker if still present.
- Focused Vitest as above.
- `npm run test` and `npm run test --workspace=frontend`; classify known broad failures if unchanged and unrelated.
- `npm run build` and `npm run build --workspace=frontend`; classify known Node 24/vue-tsc blocker if still present.
- `npm run test:e2e --workspace=frontend`; if existing syntax-corrupt specs still block parsing, record failure and run standalone Playwright smoke.
- Live preview refresh with `npm run dev --workspace=frontend -- --host 0.0.0.0`, reachability probe, and Playwright/browser smoke covering app root, local-only startup, startup dialog/open/new affordances as available, Delete/Ctrl+A/Tab keyboard behavior, active-plane status, and 3D overlay still present.

## Risks

- The current sign-out path replaces the provided `World`, while open/create clear the existing object to avoid stale child injections. Fixing this by always retaining the world instance is architecturally correct but may expose assumptions in children.
- Keyboard routing currently overlaps with `Toolbar.vue`'s global listener; this proposal resolves the risk by making the app-shell router the only global keyboard owner and deleting Toolbar's listener rather than preserving parallel shortcut paths.
- Autosave tests need timer/storage/Drive ports to avoid brittle fake-window code.
- Existing broad validation failures may obscure regressions; focused tests and static boundary checks must be strong enough to attribute failures.
