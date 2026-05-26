# Wave 009 Proposal Restructure — Introduce an application runtime/shell boundary above `App.vue`

## Summary

Instead of merely extracting helper composables from `App.vue`, introduce a higher-level `ApplicationRuntime` / `AppShellRuntime` boundary that owns the app's long-lived domain object, command stack, project session, keyboard routing, autosave, active-plane state, and selection orchestration. `App.vue` becomes a pure Vue composition shell over this runtime: it renders layout and binds runtime DTOs/intents to child components. This addresses the deeper smell that `App.vue` is currently both dependency-injection root and application use-case coordinator.

## Why one layer higher is warranted

The current shell problem is not just file size. `App.vue` constructs global runtime objects (`World`, `CommandStack`, Drive service) (`frontend/src/App.vue:147-159`), provides them to children (`frontend/src/App.vue:149-153`), then later replaces `world` on sign-out and calls `provide()` again (`frontend/src/App.vue:779-782`) despite comments elsewhere saying replacement breaks injected references (`frontend/src/App.vue:428-430`). It also directly imports command classes/factories for deletion (`frontend/src/App.vue:115-117`, `frontend/src/App.vue:803-821`), persistence services for project lifecycle (`frontend/src/App.vue:125-126`, `frontend/src/App.vue:377-467`), browser timers/window globals for autosave (`frontend/src/App.vue:474-493`), and global keyboard listeners (`frontend/src/App.vue:903-1030`). A runtime boundary can centralize these application concerns and make Vue only one adapter.

## Files to change

- `frontend/src/App.vue`
  - Use a single `useAppShellRuntime()` composition function or imported runtime factory.
  - Keep layout and pass runtime state/actions to child components.
  - Continue `provide('world', runtime.world)` and `provide('commandStack', runtime.commandStack)` from stable runtime-owned instances.
- Add `frontend/src/application/appShell/AppShellRuntime.ts`
  - Runtime factory that creates/stabilizes `World`, `CommandStack`, Drive adapter, project session controller, autosave controller, selection controller, active-plane controller, and keyboard router.
  - Exposes typed state DTO and action methods for the component.
- Add `frontend/src/application/appShell/AppShellPorts.ts`
  - Ports for Drive, project persistence, auth store, selection store, tool store, view/store if needed, browser storage, scheduler, alert/notification, and component callbacks such as fit-to-view/start-rename.
- Add `frontend/src/application/appShell/ProjectSessionUseCases.ts`
  - Pure-ish use-case class for initialize/sign-in/sign-out/create/open/new/rename/restore-last-file.
- Add `frontend/src/application/appShell/AutoSaveUseCases.ts`
  - Timer-driven autosave use-case with explicit lifecycle methods.
- Add `frontend/src/application/appShell/SelectionUseCases.ts`
  - Cascade preview/delete/select-all use-cases; owns command construction using `DeletionSequenceFactory` so `App.vue` does not import it.
- Add `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
  - Converts `KeyboardEvent` into runtime action calls through a small adapter. Tests can exercise a typed key event abstraction.
  - Owns the full app-level shortcut registry, including shortcuts currently in `App.vue` plus `Toolbar.vue`'s Escape, D projection toggle, and tool-family shortcuts, so there is exactly one global `keydown` listener.
- Add `frontend/src/application/appShell/ActivePlaneUseCases.ts`
  - Active-plane status DTO, update, cycle, subscribe/unsubscribe.
- Update `frontend/src/components/dialogs/StartupDialog.vue`
  - Remove global file-list event bridge; accept files/loading/error as props and emit typed `request-files`, `sign-in`, `open`, `create-project` events.
- Update `frontend/src/components/toolbars/Toolbar.vue`
  - Required for this wave: delete its global `keydown` listener and local shortcut owner for Escape, D projection toggle, and tool-family shortcuts.
  - Keep toolbar button rendering/click behavior and expose shortcut metadata or typed actions to the runtime router only through explicit ports/registry data.
- Tests under `frontend/tests/unit/application/appShell/` and focused shell component tests.

## Files/tests/docs/fixtures to DELETE

- Delete `App.vue` direct imports of `Command`, `DeletionSequenceFactory`, `GoogleDriveService`, `ProjectService`, and `ProjectData` if all are routed through runtime/ports.
- Delete all inline project lifecycle methods from `App.vue`: `initializeApp`, `handleSignIn`, `handleCreateProject`, `handleOpenProject`, `performAutoSave`, `handleRenameProject`, `handleNewProject`, toolbar sign-in/out bodies.
- Delete `App.vue` autosave globals: `autoSaveTimer`, `AUTO_SAVE_DELAY_MS`, `startAutoSave`, `scheduleAutoSave`, `performAutoSave`, `window as any.__autoSaveInterval`.
- Delete `App.vue` selection command orchestration: cascade watcher body, `handleDeleteSelected`, `handleSelectAll` internals.
- Delete `App.vue` active-plane implementation internals: subscription/update/cycle logic, retaining only runtime state binding.
- Delete `App.vue` global keyboard decision tree and listener setup, replacing with runtime-owned install/uninstall.
- Delete `Toolbar.vue` global keyboard decision tree/listener setup, replacing Escape/D/tool-family keyboard handling with the same runtime-owned router.
- Delete `StartupDialog.vue` `CustomEvent('load-files')` dispatch and `App.vue` matching anonymous window listener.
- Delete sign-out `world = new World(); provide('world', world)` replacement path; runtime must keep stable instances and expose reset/clear semantics.
- Delete routine debug/environment/autosave logs and touched TODO stubs that have no tested behavior.
- Delete tests that assert App.vue owns these internals; replace with runtime/use-case tests.

## Expected behavior change

The only intended user-visible behavior change is removal of routine debug logging and more consistent runtime reset semantics on sign-out. Existing flows should remain functionally equivalent: startup/local-only initialization, sign-in/sign-out, create/open/new/rename/autosave, delete/select-all, active-plane cycle/update, 3D overlay presence, undo/redo, fit-to-view, and tool shortcuts.

## Implementation outline

1. Create `AppShellRuntime` with stable `world` and `commandStack` instances and typed state refs/readonly DTOs.
2. Build runtime ports around existing services/stores rather than passing Vue components into use cases. Component-only actions (fit-to-view, start rename) are callbacks registered by `App.vue`.
3. Move project session use cases into the runtime and route Drive/localStorage/session/auth interactions through ports.
4. Move autosave into the runtime with explicit `start`, `schedule`, `stop`, and `dispose` methods.
5. Move selection and active-plane use cases into runtime controllers.
6. Install one runtime keyboard router from `App.vue` lifecycle and fold `Toolbar.vue`'s Escape/D/tool-family shortcuts into that router in the same implementation. Toolbar must not retain a global keyboard listener.
7. Convert `StartupDialog` file loading to typed events/props.
8. Add architecture tests that assert `App.vue` is a composition shell and app-shell runtime has no component/rendering imports.

## Validation plan

Focused tests:

- `npm run test --workspace=frontend -- appShell AppShellRuntime StartupDialog`
  - Runtime construction provides stable `world`/`commandStack` instances and sign-out clears/resets without replacing provided instances.
  - Project session use cases cover local-only startup, Drive init, auth restore/profile refresh, last-file restore success/failure, create/open/new/rename, and unsupported/no-Drive errors.
  - Autosave use cases cover debounce, status, update success, deleted-file recreation, auth/quota/network failures, and disposal.
  - Selection use cases cover cascade preview, delete command composition/push/clear, select-all on active plane, no-active-plane/no-selection no-ops.
  - Active-plane use cases cover subscription updates, update from canvas event, cycle wrap-around.
  - Keyboard router covers all shell and toolbar shortcuts plus text-input exemptions: Escape, D projection toggle, P/L/S/C/G and toolbar family shortcuts, Delete/Backspace, F2, Tab/Shift+Tab, Ctrl/Cmd+N/O/A/0, undo, and redo.
  - Toolbar component tests verify no global listener registration remains and button/click behavior still routes through typed actions.
  - StartupDialog emits `request-files` and renders provided file/loading/error state without `window.dispatchEvent`.
- Static scans:
  - `App.vue` contains no `Command`, `DeletionSequenceFactory`, `ProjectService`, `GoogleDriveService`, `window as any`, `__autoSaveInterval`, `CustomEvent('load-files')`, or environment dump logging.
  - `frontend/src/application/appShell/**` contains no Vue component imports and no rendering adapter imports.
  - `StartupDialog.vue` contains no `window.dispatchEvent`.
  - `Toolbar.vue` contains no `window.addEventListener('keydown'`, `window.removeEventListener('keydown'`, or local global shortcut handler.

Mandatory implementation validation:

- Root/frontend lint, focused Vitest, full root/frontend Vitest, root/frontend build, frontend Playwright e2e, and live preview refresh/probe.
- Classify known pre-existing failures if unchanged: missing eslint, Node 24/vue-tsc patch error, broad Vitest unrelated failures, corrupted Playwright specs.
- Live smoke via Playwright/headless browser against refreshed preview on `0.0.0.0:5173`: app root loads, local-only startup initializes default planes, toolbar new/open buttons surface project/session actions, Ctrl/Cmd+A and Delete behavior on a simple constructed fixture or seeded world, Tab/Shift+Tab active-plane status changes, Escape returns to select/clears selection, 3D overlay/control surface still appears, autosave status can transition in mocked/focused tests.

## Risks

- This is a larger conceptual change than direct extraction and may touch more files, but it better matches the clean-architecture priority by making the runtime/application boundary explicit.
- `App.vue` currently relies on component refs for startup-dialog imperative error/file setters and fit-to-view/start-rename. The runtime must avoid depending on Vue component instances directly; `App.vue` should adapt runtime state/actions to component props/events.
- Global keyboard conflicts with `Toolbar.vue` are resolved deliberately by deleting Toolbar's listener and making the runtime router the single global keyboard owner; implementation must avoid reintroducing shortcut logic as an untyped component-side shim.
- Because e2e specs are currently syntactically corrupted, implementation validation needs both mandatory attempted e2e logs and focused live smoke to prove user-observable shell behavior.

## Recommendation

Prefer this restructure proposal unless review finds the runtime boundary too broad for one cycle. It deletes the same inline shell code as the direct proposal, but also fixes the deeper lifetime/DI problem by stabilizing the application runtime above Vue component setup.
