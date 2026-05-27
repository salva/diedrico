# Cycle 020 Scope Check — App-shell project session and browser integration boundary

## Stage and source-control hygiene

This is a planning-only scout for Wave 020. I inspected scoped git status, the reviewed Wave 020 wave-plan entry, the plan-extension note/summary, the Wave 019 completion log, current app-shell source, current project/Drive services, dialog integration, and existing app-shell/e2e tests. No production source, tests, package metadata, backend, docs/spec implementation content, or forbidden secret/config paths were modified or read.

Full MCP `git_status` is too large in this workspace, so this stage captured path-scoped evidence instead: `.saivage/stages/cycle-020-fresh-scout-proposals/initial-scoped-status.stdout`. It shows pre-existing/unrelated dirty work in the scoped frontend/audit tree; this scout does not revert or depend on that work. The Wave 020 entry was extracted to `.saivage/stages/cycle-020-fresh-scout-proposals/wave-020-entry.stdout`.

## Reviewed Wave 020 premise

The reviewed plan entry selects **App-shell project session and browser integration boundary** after Wave 019. Its core premise still holds: the Vue shell is now relatively passive, but runtime/application modules still own hidden browser/static-service composition and concrete project-session persistence shapes. The plan explicitly scopes `AppShellRuntime.ts`, `AppShellPorts.ts`, `ProjectSessionUseCases.ts`, `AutoSaveUseCases.ts`, `SelectionUseCases.ts`, `KeyboardShortcutRouter.ts`, a small browser production composition module if selected, `App.vue` only as shell wiring, and narrow adapter seams for `ProjectService.ts` / `GoogleDriveService.ts`.

No wave-plan edit is required before proposals. Current evidence aligns with the reviewed Wave 020 entry rather than invalidating it.

## Current evidence

### App.vue is mostly a composition shell, not the main god module anymore

`App.vue` delegates project/session UI events to `runtime.actions` in the template: startup sign-in/request-files/open/create-project at `frontend/src/App.vue:12`-`15`, project rename at `frontend/src/App.vue:24`, toolbar new/open/sign-in/sign-out at `frontend/src/App.vue:29`-`33`, and canvas active-plane/coordinate callbacks at `frontend/src/App.vue:56`-`59`. It imports `createAppShellRuntime` at `frontend/src/App.vue:107`, builds `GOOGLE_CONFIG` from Vite env at `frontend/src/App.vue:109`-`113`, creates runtime at `frontend/src/App.vue:126`-`138`, provides `runtime.world` and `runtime.commandStack` to descendants at `frontend/src/App.vue:141`-`142`, and only starts/disposes the runtime at `frontend/src/App.vue:169`-`170`.

This supports a bounded implementation that keeps `App.vue` small and avoids reintroducing lifecycle/autosave/keyboard logic into the component.

### Runtime core still performs browser/static-service production composition

`createAppShellRuntime` imports concrete `GoogleDriveService` and `ProjectService` at `frontend/src/application/appShell/AppShellRuntime.ts:4`-`5`. It constructs `World` and `CommandStack` at `frontend/src/application/appShell/AppShellRuntime.ts:22`-`23`, creates a default `GoogleDriveService` at `frontend/src/application/appShell/AppShellRuntime.ts:24`, binds default persistence to static `ProjectService` at `frontend/src/application/appShell/AppShellRuntime.ts:27`, reaches for `window.localStorage` at `frontend/src/application/appShell/AppShellRuntime.ts:28`, creates a browser scheduler at `frontend/src/application/appShell/AppShellRuntime.ts:29`, and installs keyboard handling directly on `window` at `frontend/src/application/appShell/AppShellRuntime.ts:101`.

This is the central Wave 020 seam: runtime creation can already accept fake ports, but the core factory still contains production browser/default adapter decisions.

### AppShellPorts exposes concrete persistence/domain command types

`AppShellPorts.ts` imports `CommandStack`, `World`, `GoogleDriveFile`, `GoogleUserProfile`, and `ProjectData` at `frontend/src/application/appShell/AppShellPorts.ts:2`-`5`. `ProjectPersistencePort` exposes `serializeCommands(commandStack, nextElementId, projectName): ProjectData`, `validateProjectData(data): asserts data is ProjectData`, and `deserializeCommands(data, world, commandStack)` at `frontend/src/application/appShell/AppShellPorts.ts:24`-`28`.

This means project-session use cases know that persistence is command-stream serialization over concrete `World`/`CommandStack`. Wave 020 should narrow the app-shell-facing port without redesigning `ProjectService` serialization internals.

### Project session use cases mix storage keys, Drive, persistence, world reset, command-stack lifecycle, and UI state

`ProjectSessionUseCases` depends on concrete `World`, `CommandStack`, `AutoSaveUseCases`, and all runtime ports at `frontend/src/application/appShell/ProjectSessionUseCases.ts:12`-`24`. Initialization branches between local-only world initialization and Drive startup at `frontend/src/application/appShell/ProjectSessionUseCases.ts:27`-`58`, reads duplicated local-storage keys at `frontend/src/application/appShell/ProjectSessionUseCases.ts:40`-`41`, removes them on failed restore at `frontend/src/application/appShell/ProjectSessionUseCases.ts:47`-`48`, and initializes/resets world/command stack in several flows (`frontend/src/application/appShell/ProjectSessionUseCases.ts:29`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:51`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:96`-`99`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:127`-`129`). It serializes current commands through the persistence port at `frontend/src/application/appShell/ProjectSessionUseCases.ts:100`-`104`, validates/deserializes loaded project data at `frontend/src/application/appShell/ProjectSessionUseCases.ts:122`-`123`, and writes the same local-storage keys at `frontend/src/application/appShell/ProjectSessionUseCases.ts:161`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:191`-`192`.

This supports extracting a last-project/session repository and a project-session persistence adapter, while documenting retained `World`/`CommandStack` use as intentional application state lifecycle.

### Autosave use cases mix polling/debounce, persistence serialization, Drive fallback, storage key writes, alert policy, and broad errors

`AutoSaveUseCases` owns timer handles and dirty-version polling at `frontend/src/application/appShell/AutoSaveUseCases.ts:7`-`36`, schedules debounce/status timers at `frontend/src/application/appShell/AutoSaveUseCases.ts:39`-`45` and `frontend/src/application/appShell/AutoSaveUseCases.ts:84`-`90`, serializes commands and updates Drive at `frontend/src/application/appShell/AutoSaveUseCases.ts:51`-`60`, catches `error: any` at `frontend/src/application/appShell/AutoSaveUseCases.ts:63`, handles deleted-file recreation and writes `diedrico_last_file_id` at `frontend/src/application/appShell/AutoSaveUseCases.ts:93`-`106`, and classifies authentication/quota failures by string matching at `frontend/src/application/appShell/AutoSaveUseCases.ts:114`-`122`.

This supports a bounded error-classification helper/port and shared session repository, but not a broader Drive API redesign.

### Selection and keyboard are in scope only at the app-shell boundary

`SelectionUseCases` imports and constructs `Command`, uses `DeletionSequenceFactory`, commits, pushes to `CommandStack`, and clears selection at `frontend/src/application/appShell/SelectionUseCases.ts:2`-`4` and `frontend/src/application/appShell/SelectionUseCases.ts:33`-`40`. It also queries the active plane and dependency service for select-all/cascade preview at `frontend/src/application/appShell/SelectionUseCases.ts:46`-`63`. This direct command construction is a real app-shell application-use-case dependency; Wave 020 should either keep it documented as intentional selection application behavior or introduce a tiny delete-selection command port if the direct proposal needs a cleaner boundary. It should not reopen command/undo descriptors.

`KeyboardShortcutRouter` declares a typed target at `frontend/src/application/appShell/KeyboardShortcutRouter.ts:8`-`11` and supports injectable install targets, but defaults `install(target = window)` at `frontend/src/application/appShell/KeyboardShortcutRouter.ts:28`. It routes Escape/Delete/F2/Tab/tool shortcuts/project shortcuts/undo-redo at `frontend/src/application/appShell/KeyboardShortcutRouter.ts:43`-`92`. Current runtime, not the router's public API, is the stronger hidden-global issue because runtime passes `window` explicitly.

### Services expose adapter seams but still contain browser globals internally

`ProjectService` is static command-stream persistence: it imports `World`, `CommandStack`, `Command`, operation descriptors, and `deserializeOperation` at `frontend/src/services/ProjectService.ts:5`-`9`; `serializeCommands` is static at `frontend/src/services/ProjectService.ts:25`-`41`; `deserializeCommands` replays operations into `World` and restores the command stack at `frontend/src/services/ProjectService.ts:43`-`73`; validation is static at `frontend/src/services/ProjectService.ts:75`-`121`. Wave 020 should not change this persistence contract beyond hiding it behind a narrower app-shell adapter.

`GoogleDriveService` declares `Window.google` at `frontend/src/services/GoogleDriveService.ts:37`-`41`, reads `window.google` at `frontend/src/services/GoogleDriveService.ts:47`, uses `gapi.load` / `gapi.client.init` at `frontend/src/services/GoogleDriveService.ts:87`-`101`, uses `localStorage` for auth-session restoration at `frontend/src/services/GoogleDriveService.ts:125`-`127`, `frontend/src/services/GoogleDriveService.ts:162`, and `frontend/src/services/GoogleDriveService.ts:206`, and checks `navigator.onLine` during load/update error handling at `frontend/src/services/GoogleDriveService.ts:384` and `frontend/src/services/GoogleDriveService.ts:465`. Wave 020 may wrap construction behind a Drive adapter factory; it should not redesign the Drive service internals.

### Dialog integration is already event/prop based

`StartupDialog.vue` consumes files/loading/error/isSignedIn props at `frontend/src/components/dialogs/StartupDialog.vue:68`-`76` and emits `sign-in`, `open`, `close`, `create-project`, and `request-files` at `frontend/src/components/dialogs/StartupDialog.vue:79`-`85`. It watches `isSignedIn` and emits `request-files` at `frontend/src/components/dialogs/StartupDialog.vue:91`-`93`. This is a dialog integration surface to preserve, not an implementation target except if tests need adjusted fake ports.

### Existing tests cover current boundaries but also encode current smells

`AppShellBoundary.test.ts` currently ensures `App.vue` no longer imports moved shell orchestration and app-shell modules do not import Vue components (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:13`-`25`). `AppShellRuntimeUseCases.test.ts` has fake scheduler/drive/persistence/storage helpers at `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts:11`-`86`, but its runtime lifecycle test spies on `window.addEventListener` / `window.removeEventListener` and expects one global keydown listener at `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts:90`-`130`, meaning implementation should replace this with explicit target/composition tests. Existing autosave and project-session tests cover fake scheduler, auth failure, and create/open/rename/sign-out at `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts:167`-`399`.

Keyboard unit coverage exists at `frontend/tests/unit/application/appShell/KeyboardShortcutRouter.test.ts:30`-`70`. Browser coverage exists for app-shell project chooser and stale backend absence at `frontend/tests/e2e/wave010-app-shell-project-flow.spec.ts:3`-`35`, and keyboard shortcuts at `frontend/tests/e2e/keyboard-shortcuts.spec.ts:3`-`28`.

### Validation scripts

Root workspaces list only `frontend` at `package.json:7`-`9`. Root scripts delegate lint/test/build/e2e to frontend at `package.json:13`-`21`; frontend defines `lint`, `test`, `build`, and `test:e2e` at `frontend/package.json:8`-`16`. Cycle 020 validation must capture root and frontend variants because both are defined.

## Selected bounded scope

Cycle 020 proposals should target these implementation seams:

1. Split production browser composition from app-shell runtime core: construct default Drive, persistence adapter, storage, scheduler, alert, and keyboard target in one explicit production composition module/factory rather than hidden inside `createAppShellRuntime`.
2. Replace the app-shell-facing persistence port shape with a narrower project-session persistence adapter that exposes use-case needs without direct static `ProjectService` binding in runtime core. Internals may still delegate to `ProjectService`.
3. Centralize last-project storage keys behind a named session repository/port consumed by project-session and autosave use cases.
4. Type unknown error handling in touched autosave/session paths with a small classifier/helper; delete `error: any` in the touched save path.
5. Keep `App.vue` passive and limit edits to invoking a production composition factory if selected.
6. Decide explicitly whether `SelectionUseCases` direct delete command construction remains an intentional application-use-case dependency or is hidden behind a small deletion command port. Either choice must be proposal-reviewed and cannot redesign command descriptors.
7. Preserve dialog event/prop integration; do not convert dialogs into service-aware components.

## Explicit out of scope

- No production source implementation in this scout stage.
- No persistence schema/command descriptor redesign.
- No `GoogleDriveService` internal Google API/auth/storage redesign.
- No backend implementation or backend/frontend contract work; current root workspace contains only `frontend`.
- No docs/spec reconciliation or debug/comment cleanup.
- No package/tooling changes.
- No broad store redesign; stores are ports/adapters only where consumed by app shell.
- No canvas/Three rendering, domain realization, presentation read-port, or scene-host lifecycle changes.
- No broad e2e/test rewrite; only focused tests around touched app-shell seams should change in implementation.

## DELETE list candidates for proposals

- Hidden default construction of `GoogleDriveService`, static `ProjectService`, `window.localStorage`, browser scheduler, and `window` keyboard target from `createAppShellRuntime` core.
- Duplicated `diedrico_last_file_id` and `diedrico_last_file_name` string literals in `ProjectSessionUseCases` and `AutoSaveUseCases`.
- `ProjectPersistencePort` app-shell shape that exposes concrete static `ProjectService` command-stream methods to runtime/use cases.
- `error: any` in touched autosave/session error-handling paths.
- Tests that assert runtime core itself touches `window.addEventListener`; replace with explicit production composition/target tests.
- Any compatibility wrapper that keeps both hidden-global and explicit-port runtime creation paths.

## Validation requirements for implementation

Implementation proposals must preserve the reviewed Wave 020 validation cadence with logs under `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/validation/`:

- pre/post scoped git status/diff and static scans for hidden globals/service construction/storage keys/port shapes;
- focused Vitest for app-shell runtime/use cases/ports/adapters and any touched ProjectService/GoogleDriveService adapter tests;
- `npm run lint` at root and `npm run lint --workspace=frontend`;
- full `npm run test` at root and `npm run test --workspace=frontend`;
- `npm run build` at root and `npm run build --workspace=frontend`;
- `npm run test:e2e` at root and `npm run test:e2e --workspace=frontend`;
- live preview refresh on `0.0.0.0:5173`, HTTP 200 reachability probe, and Playwright/live smoke for startup/new-project, representative keyboard shortcuts, and visible save/status behavior where possible without real Drive credentials.

## Wave-plan edit decision

No wave-plan edit is required. The reviewed Wave 020 entry accurately describes the current central risk. The proposals below align with it and should proceed to `cycle-020-review-round-01` before any implementation.
