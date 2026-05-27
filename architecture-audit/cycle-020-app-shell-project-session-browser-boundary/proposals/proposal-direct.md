# Proposal Direct — Extract explicit app-shell production composition and narrow session ports

## Summary

Implement Wave 020 by separating production browser/default adapter construction from app-shell runtime core while preserving the current project/session behavior. The direct path keeps the existing app-shell use-case classes, introduces small named ports/adapters for project-session persistence and last-project storage, and keeps `App.vue` passive by calling a production composition factory.

## Files to change

Production source:

- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Remove default `GoogleDriveService`, static `ProjectService`, `window.localStorage`, browser scheduler, and `window` keyboard-target decisions from the runtime core.
  - Require explicit `drive`, `persistence`, `lastProjectRepository`/storage, `scheduler`, and `keyboardTarget` dependencies from options.
  - Keep creation of `World` and `CommandStack` here unless implementation evidence shows they belong in the production factory; document retained ownership.
- `frontend/src/application/appShell/AppShellPorts.ts`
  - Replace the app-shell-facing `ProjectPersistencePort` with a narrower project-session persistence port such as `snapshotCurrentSession({ commandStack, world, projectName })`, `assertProjectData(data)`, and `restoreSession(data, world, commandStack)`, or a similarly named adapter contract.
  - Add a `LastProjectRepositoryPort` with named `getLastProject()`, `setLastProject({ id, name })`, and `clearLastProject()` methods.
  - Add or require a `KeyboardTargetPort` at runtime options if not already satisfied by `KeyboardShortcutRouterTarget`.
- New `frontend/src/application/appShell/AppShellProductionRuntime.ts` (name may vary)
  - Own production-only composition: `new GoogleDriveService(googleConfig)`, `ProjectService` adapter binding, `window.localStorage` repository adapter, `createBrowserScheduler()`, `window` keyboard target, and browser alert callback where appropriate.
  - Export one function consumed by `App.vue`, e.g. `createProductionAppShellRuntime(...)`.
- New adapter modules under `frontend/src/application/appShell/` or a sibling `adapters/` folder, e.g.:
  - `ProjectSessionPersistenceAdapter.ts` delegating to `ProjectService`.
  - `BrowserLastProjectRepository.ts` centralizing `diedrico_last_file_id` and `diedrico_last_file_name`.
  - Optional `AppShellErrorClassifier.ts` for `unknown` error normalization in touched save/session paths.
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
  - Consume last-project repository instead of literal storage keys.
  - Consume the narrowed persistence port instead of static-shaped `ProjectPersistencePort` methods.
  - Keep world reset/initialization and command-stack clearing as application lifecycle work; document with tests.
  - Replace touched `catch (error)` message construction with `unknown` normalization if changed.
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
  - Use narrowed persistence adapter for save data.
  - Use last-project repository when recreating deleted Drive files.
  - Replace `catch (error: any)` with `unknown` plus classifier/helper.
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
  - Remove default `= window` from `install` if runtime production composition now supplies target explicitly.
- `frontend/src/App.vue`
  - Import/use the production composition factory instead of `createAppShellRuntime` directly if selected.
  - Remain a passive shell: it may read Vite environment values into a plain `googleConfig` object and pass simple UI callbacks/refs such as startup/status alert callbacks, canvas element refs, and provide/inject values.
  - Must not construct concrete browser/service adapters. `GoogleDriveService`, `ProjectService` adapter binding, browser storage/last-project repository, browser scheduler, and keyboard target ownership belong only in the production composition module.
  - Keep template/state/provide wiring otherwise unchanged.
- `frontend/src/services/ProjectService.ts`
  - No internals change expected; may only be imported by the new adapter.
- `frontend/src/services/GoogleDriveService.ts`
  - No internals change expected; may only be imported by production composition.
- `frontend/src/application/appShell/SelectionUseCases.ts`
  - Keep unchanged for Wave 020 with respect to delete-command construction. Direct construction of `Command` / `DeletionSequenceFactory` remains an intentional application-layer dependency and residual debt for this wave.
  - Do not introduce a delete-selection port, command-controller abstraction, undo/redo redesign, or command descriptor redesign in this cycle. Any future change to this boundary must be proposed as a separate reviewed wave/delta.

Tests:

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Update runtime lifecycle tests to use explicit fake target/storage/repository/persistence adapters instead of spying on global `window` as runtime-core behavior.
  - Add coverage for production composition defaults with stubbed browser dependencies where practical.
  - Add/adjust project-session and autosave tests for last-project repository and narrowed persistence port.
  - Include a focused assertion that runtime core requires explicit dependencies and no longer creates hidden browser/service defaults.
  - Include a focused assertion that the last-project repository/adapter is the single owner of `diedrico_last_file_id` / `diedrico_last_file_name` persistence and that use cases consume the repository instead of duplicating key literals.
- `frontend/tests/unit/application/appShell/KeyboardShortcutRouter.test.ts`
  - Assert explicit target install/dispose remains correct and no default `window` behavior is required by unit tests.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Strengthen raw-source assertions: runtime core should not match `new GoogleDriveService`, `ProjectService`, `window.localStorage`, or `keyboard.install(window)`; production composition module is the only allowed owner.
- `frontend/tests/e2e/wave010-app-shell-project-flow.spec.ts` and `frontend/tests/e2e/keyboard-shortcuts.spec.ts`
  - Keep current user-flow coverage; add small assertions only if implementation changes startup/status behavior.

## Files/tests/docs/fixtures to DELETE

- Delete hidden default adapter construction from `AppShellRuntime.ts`: `new GoogleDriveService(...)`, default `ProjectService`, default `window.localStorage`, default `createBrowserScheduler()` in runtime core, and `keyboard.install(window)`.
- Delete duplicated literal storage-key usage: `diedrico_last_file_id` and `diedrico_last_file_name` from `ProjectSessionUseCases.ts` and `AutoSaveUseCases.ts`.
- Delete the static-shaped `ProjectPersistencePort` surface from `AppShellPorts.ts` if replaced by a narrower session-persistence adapter.
- Delete `error: any` in touched autosave save-error handling.
- Delete/replace tests that assert runtime core attaches listeners to global `window` as a hidden side effect.
- Delete any old runtime-creation overloads or compatibility helpers that preserve both hidden-global and explicit-composition paths.
- Do not delete `ProjectService` command-stream internals, `GoogleDriveService` internals, dialog components, backend/docs/spec files, package scripts, or e2e specs.

## Production composition ownership decision

Production browser composition has one owner: the new production composition module/factory. It alone constructs concrete services/adapters and chooses browser integrations: `GoogleDriveService`, the `ProjectService` persistence adapter, browser storage and last-project repository, browser scheduler, keyboard target, and browser alert/error callbacks where those callbacks are concrete browser behavior.

`App.vue` remains a passive Vue shell. It may read Vite env into simple data (`googleConfig`) and pass UI refs/callbacks, but it must not instantiate services, adapters, repositories, schedulers, storage, or keyboard targets. `AppShellRuntime.ts` remains runtime core and must receive dependencies explicitly; it must not recreate hidden production defaults.

## SelectionUseCases decision

Wave 020 explicitly retains `SelectionUseCases` direct delete-command construction as intentional application-use-case behavior and residual architectural debt. This proposal forbids broad command/undo redesign, command descriptor redesign, or a new command-controller layer in this cycle. The implementation may adjust imports only if mechanically required by the app-shell port changes, but it must not change selection/delete command ownership.

## Expected behavior change

User-visible behavior should be equivalent: startup without Google credentials still initializes the local world and hides startup dialog; with credentials, Drive initialization/sign-in/file listing/open/create/rename/autosave flows behave as before; keyboard shortcuts and delete/select-all remain equivalent; project name/save status remain visible in the same places.

Architectural behavior changes: app-shell runtime core is testable without browser globals; production browser integration is explicit and centralized; last-project storage keys have one owner; project-session use cases no longer know `ProjectService` static method shape.

## Risks

- Moving composition can accidentally break startup without credentials if the production factory does not preserve `drive: null` behavior.
- Autosave timing/status behavior can regress if fake scheduler semantics or saved-status timer cleanup changes.
- Replacing the persistence port can sprawl into persistence schema redesign; stop if changes require altering `ProjectService` serialization/deserialization internals.
- Removing `KeyboardShortcutRouter.install` default `window` requires all call sites/tests to pass an explicit target.
- Google Drive validation cannot use real credentials; rely on fake-port unit tests plus credential-free e2e/live smoke.
- `SelectionUseCases` direct command construction remains known residual debt after Wave 020; this is accepted to keep the wave centered on app-shell production composition and session/browser adapter ownership.

## Validation plan

Capture all logs under `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/validation/`:

1. Pre/post static scans: `grep -RIn "new GoogleDriveService\|ProjectService\|window.localStorage\|keyboard.install(window)\|diedrico_last_file\|error: any" frontend/src/application/appShell frontend/src/App.vue`.
2. Focused Vitest:
   - `npm run test --workspace=frontend -- tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts tests/unit/application/appShell/KeyboardShortcutRouter.test.ts tests/unit/application/appShell/AppShellBoundary.test.ts`
   - Add any new adapter test files to the command.
   - Required focused boundary coverage: prove `AppShellRuntime.ts` no longer owns hidden production browser/service defaults by constructing runtime with explicit fake dependencies and by static/boundary assertions that only the production composition module may reference `new GoogleDriveService`, the `ProjectService` adapter binding, browser storage, browser scheduler defaults, and the keyboard target.
   - Required focused repository coverage: prove the last-project repository/adapter is the single owner of `diedrico_last_file_id` and `diedrico_last_file_name` persistence, and that `ProjectSessionUseCases` / `AutoSaveUseCases` interact only through repository methods.
   - Required SelectionUseCases coverage decision: no new selection/delete command-port tests are required in Wave 020 because direct command construction is intentionally retained; existing keyboard/delete user-flow coverage remains the regression guard.
3. Root/frontend lint: `npm run lint`; `npm run lint --workspace=frontend`.
4. Root/frontend full Vitest: `npm run test`; `npm run test --workspace=frontend`.
5. Root/frontend build: `npm run build`; `npm run build --workspace=frontend`.
6. Root/frontend e2e: `npm run test:e2e`; `npm run test:e2e --workspace=frontend`.
7. Refresh live preview on `0.0.0.0:5173`, capture HTTP 200 from `127.0.0.1:5173` and `0.0.0.0:5173`, and run live browser smoke for startup/no-credentials project chooser, representative keyboard shortcuts, and visible save/status behavior where credential-free.

## No-backcompat rationale

The hidden browser/static-service construction path is internal architecture debt. Do not keep compatibility wrappers around old default runtime creation. A single explicit production composition boundary is cleaner and easier to test than dual hidden-global and port-based paths.

## Stop conditions for broader redesign

Stop and request a reviewed delta/plan edit if implementation requires any of the following:

- changing `ProjectService` schema, command descriptors, or operation replay behavior;
- redesigning `GoogleDriveService` authentication/GAPI internals;
- moving `World`/`CommandStack` creation out of app shell into a broader application kernel;
- replacing selection/delete command construction with any new delete-selection port, command-controller architecture, command descriptor redesign, or undo/redo redesign;
- editing backend/docs/spec/package/tooling or rendering/domain realization layers.
