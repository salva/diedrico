# Wave 009 Scope Check — Extract application shell services from `App.vue`

## Status

Wave 009 can proceed without editing `architecture-audit/wave-plan.md`.

The Wave 009 premise still holds after Wave 008: `App.vue` remains a god shell that owns UI composition plus project lifecycle, Drive/auth orchestration, autosave timers, selection cascade/delete/select-all, keyboard routing, active-plane/status coordination, and low-level browser event wiring. Wave 008 successfully moved 3D rendering internals out of `ThreeView.vue` into `application/threePresentation` and `rendering/threeView`, and did not address `App.vue` shell orchestration (`architecture-audit/cycle-008-3d-rendering-scene-adapters/implementation-log.md`). Therefore the planned dependency chain still supports Wave 009: persistence contract cleanup (Wave 004), command/use-case cleanup (Waves 006a/006b), 2D/3D presentation extraction (Waves 007/008), then app-shell extraction.

## Source-control hygiene note

A pre-scout `git status --short` was captured in `architecture-audit/cycle-009-app-shell-services/research-logs/git-status-before.log`. The working tree already contained many modified/untracked audit and `.saivage` files before this scout. This task did not inspect secret file contents and does not modify application source under `frontend/`, `backend/`, or `specs/`.

## Current `App.vue` responsibilities with evidence

### 1. UI layout/composition (should mostly remain)

`App.vue` composes the startup dialog, header, toolbar, side panels, canvas, 3D overlay, and footer/status bar in its template (`frontend/src/App.vue:1-84`). Keeping this layout shell in `App.vue` is appropriate, but the backing script currently mixes layout state with domain, command, persistence, and browser services.

### 2. Domain/runtime singleton creation and dependency injection

`App.vue` imports `CommandStack`, `Command`, `DeletionSequenceFactory`, `World`, `initializeWorld`, `GoogleDriveService`, and `ProjectService` directly (`frontend/src/App.vue:115-126`). It constructs and provides a mutable `World` and `CommandStack` at module setup (`frontend/src/App.vue:147-153`). Sign-out replaces `world = new World()` and calls `provide('world', world)` again after initial setup (`frontend/src/App.vue:779-782`), which risks stale injected references in children that already captured the original provided object. This is directly related to the existing open-project comment that clears the existing world rather than replacing it to avoid stale `SvgCanvas` references (`frontend/src/App.vue:428-430`).

### 3. Environment/Drive configuration and debug logging

`App.vue` builds `GOOGLE_CONFIG` from Vite env values (`frontend/src/App.vue:127-132`) and logs debug environment state, including `allEnvVars: import.meta.env` (`frontend/src/App.vue:134-140`) plus credential-presence logging (`frontend/src/App.vue:142-145`). Wave 009 should delete this routine/debug logging from the shell rather than move it into a new service.

### 4. Project startup, authentication, restore-last-file, and Drive integration

`initializeApp()` handles local-only startup, Google Drive initialization, auth-store restore, user-profile refresh, last-file localStorage reads, last-file open, failed-open cleanup, world initialization fallback, and startup-dialog visibility (`frontend/src/App.vue:272-337`). `handleSignIn()` and toolbar sign-in duplicate Drive sign-in/profile/auth-store flows (`frontend/src/App.vue:343-371`, `frontend/src/App.vue:734-758`). `handleToolbarSignOut()` revokes Drive auth, clears auth store/project state, resets world/command stack, and toggles startup dialog (`frontend/src/App.vue:764-790`).

The lower-level Drive service remains a browser integration boundary using `gapi` and Google Identity Services (`frontend/src/services/GoogleDriveService.ts:41-61`, `frontend/src/services/GoogleDriveService.ts:66-120`, `frontend/src/services/GoogleDriveService.ts:219-235`, `frontend/src/services/GoogleDriveService.ts:370-410`, `frontend/src/services/GoogleDriveService.ts:623-640`). Wave 009 should not rewrite the Drive API client itself; it should introduce an application shell/session service that orchestrates it through a typed port.

### 5. Project create/open/rename/autosave lifecycle

`handleCreateProject()` clears world/stack, initializes the world, serializes command history, creates a Drive file, updates project refs/localStorage, starts autosave, and sets save status (`frontend/src/App.vue:377-413`). `handleOpenProject()` loads Drive file data, validates/deserializes via `ProjectService`, contains legacy-file initialization fallback, marks the world dirty, updates project refs/localStorage, starts autosave, and sets save status (`frontend/src/App.vue:418-467`). `handleRenameProject()` calls Drive rename, updates local state/localStorage, logs, and schedules autosave (`frontend/src/App.vue:657-685`). `handleNewProject()` generates a default Drive name, clears world/stack, delegates to create, logs, and falls back to startup dialog on failure (`frontend/src/App.vue:692-715`).

`ProjectService` is now a current-schema command-stream persistence service with typed validation/serialization/replay entry points (`frontend/src/services/ProjectService.ts:24-78`, `frontend/src/services/ProjectService.ts:80-129`). Wave 009 should consume this boundary; it must not reopen Wave 004's persistence-contract decisions or introduce migration/backcompat code.

### 6. Autosave timer/browser-global bridge

Autosave is implemented inline via a `window as any` global interval slot, world-version polling every 100ms, a debounce timer, and direct Drive update/recreate/error recovery (`frontend/src/App.vue:474-621`). This directly matches the Wave 009 delete list: `window as any.__autoSaveInterval` appears at setup, auth-expiry cleanup, and unmount cleanup (`frontend/src/App.vue:476-493`, `frontend/src/App.vue:573-576`, `frontend/src/App.vue:1055-1058`). The extracted service should own timers through typed scheduler/window ports and expose status (`idle | saving | saved`) to the component.

### 7. Selection cascade preview, delete, select-all, and keyboard orchestration

`App.vue` watches `selectionStore.selectedIdsArray`, computes cascade deletion through `world.getDependencyService().getElementsInDeletionOrder`, and updates cascade highlights (`frontend/src/App.vue:242-267`). It performs deletion by constructing a `Command`, asking `DeletionSequenceFactory` to populate cascade deletion operations, committing, pushing to the stack, and clearing selection (`frontend/src/App.vue:793-831`). It implements select-all by traversing the active plane's points, lines, and circles and calling `selectionStore.selectMultiple` (`frontend/src/App.vue:833-865`).

The selection store itself is only selection/cascade state with simple actions (`frontend/src/stores/selectionStore.ts:17-119`), so deletion/select-all/cascade preview belongs in an application selection service/use-case rather than the store or component.

### 8. Global keyboard routing, active-plane cycling, tool shortcuts, undo/redo, fit-to-view

`App.vue` handles Escape, Delete/Backspace, F2, Tab/Shift+Tab active-plane cycling, P/L/S/C/G tool shortcuts, Ctrl/Cmd+N/O/A/0, undo, and redo (`frontend/src/App.vue:879-1026`) and registers the global keydown listener on mount (`frontend/src/App.vue:1028-1030`). `Toolbar.vue` also registers a global keydown listener for Escape, D projection toggle, and tool-family shortcuts (`frontend/src/components/toolbars/Toolbar.vue:189-239`), so Wave 009 must avoid duplicating or worsening keyboard ownership. A single typed app keyboard router should coordinate shell-level actions and either consume or supersede the toolbar listener where the implementation scope touches it.

### 9. Active-plane and 2D/3D coordination

`App.vue` maintains active-plane refs by subscribing to world changes (`frontend/src/App.vue:183-218`) and passes active-plane/status/coördinates/save state into `StatusBar` (`frontend/src/App.vue:72-82`). It accepts canvas coordinate and active-plane events (`frontend/src/App.vue:59-63`, `frontend/src/App.vue:623-638`). `SvgCanvas.vue` derives the active plane from `world.getActivePlaneId()` and passes it to canvas presentation/interaction (`frontend/src/components/workspace/SvgCanvas.vue:228-233`, `frontend/src/components/workspace/SvgCanvas.vue:562-580`, `frontend/src/components/workspace/SvgCanvas.vue:690-717`). Wave 008's `ThreeView.vue` extraction means the 3D view now consumes selected IDs through the three-presentation boundary, but `App.vue` still owns the overlay toggle state (`frontend/src/App.vue:223-224`, `frontend/src/App.vue:65-68`).

### 10. StartupDialog parent bridge

`StartupDialog.vue` emits `sign-in`, `open`, and `create-project`, but it loads files by dispatching a browser `CustomEvent('load-files')` on `window` (`frontend/src/components/dialogs/StartupDialog.vue:76-84`, `frontend/src/components/dialogs/StartupDialog.vue:105-118`). `App.vue` registers a matching `window.addEventListener('load-files', async () => ...)` without retaining/removing the handler on unmount (`frontend/src/App.vue:1035-1049`). This should be deleted in favor of typed props/emits or a dialog-facing project-list controller.

## Wave 008 outcomes and validation/tooling debt to account for

Wave 008 completed its architectural target: `ThreeView.vue` is a shell over `ThreeViewRuntime`; `application/threePresentation` owns selectors; `rendering/threeView` owns scene adapters; `Element2DRenderer3D.ts` was deleted; focused 3D tests and live smoke passed (`architecture-audit/cycle-008-3d-rendering-scene-adapters/implementation-log.md`).

Residual validation debt is pre-existing and must be classified in Wave 009 validation logs if still present: root/frontend lint fail because `eslint` is not installed; root/frontend build fail because Node 24 and `vue-tsc` are incompatible; broad Vitest has unrelated stale/import/expectation failures; Playwright e2e has syntactically corrupted existing specs (`architecture-audit/cycle-008-3d-rendering-scene-adapters/implementation-log.md`). Wave 009 still must run the mandatory cadence and focused app-shell tests, and it must add live/browser smoke evidence for app startup, shell keyboard, project dialog/local-only behavior, selection/delete/select-all, active-plane cycling, and autosave status where feasible.

## Re-rank of remaining waves after Wave 008

1. **Wave 009 — App shell services** remains next and central because `App.vue` is now the largest remaining composition/application leak after rendering and command-controller cleanup.
2. **Wave 010 — Backend/frontend project-contract architecture** remains after Wave 009 because persistence routing should first leave `App.vue` and land behind an application project-session boundary before deciding whether the backend contract is deleted or made real.
3. **Wave 011 — Architecture tests/root validation gates** remains after backend stance because validation should freeze the cleaned architecture, including backend decision and app-shell boundary.
4. **Wave 012 — Debug/placeholder cleanup** remains after App.vue extraction and backend/validation stance because Wave 009 will delete directly touched shell debug/TODO/window bridges, but broader debug cleanup is still peripheral.
5. **Wave 013 — Docs/spec reconciliation** remains last.

## Out of scope for Wave 009

- Do not implement Wave 010 backend-contract decisions.
- Do not harden root validation gates beyond focused app-shell architecture tests required for this wave; Wave 011 owns broad validation-gate cleanup.
- Do not perform broad docs/spec cleanup except deleting or updating directly touched obsolete comments/TODOs in App.vue/app-shell tests.
- Do not rewrite `GoogleDriveService` internals except to type a narrow shell port if needed.
- Do not reopen Wave 004 persistence schema or migration/backcompat decisions.

## Conclusion

Wave 009 premises hold. The implementation should extract project session/lifecycle, autosave, keyboard routing, and selection shell use-cases from `App.vue`, delete inline orchestration and `window as any` bridges, keep `App.vue` as a layout/composition shell, and add focused tests around the new application-shell services plus live/e2e smoke coverage.
