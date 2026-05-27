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
  - Keep template/state/provide wiring otherwise unchanged.
- `frontend/src/services/ProjectService.ts`
  - No internals change expected; may only be imported by the new adapter.
- `frontend/src/services/GoogleDriveService.ts`
  - No internals change expected; may only be imported by production composition.

Tests:

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Update runtime lifecycle tests to use explicit fake target/storage/repository/persistence adapters instead of spying on global `window` as runtime-core behavior.
  - Add coverage for production composition defaults if the production factory is easily testable with stubbed browser dependencies.
  - Add/adjust project-session and autosave tests for last-project repository and narrowed persistence port.
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

## Expected behavior change

User-visible behavior should be equivalent: startup without Google credentials still initializes the local world and hides startup dialog; with credentials, Drive initialization/sign-in/file listing/open/create/rename/autosave flows behave as before; keyboard shortcuts and delete/select-all remain equivalent; project name/save status remain visible in the same places.

Architectural behavior changes: app-shell runtime core is testable without browser globals; production browser integration is explicit and centralized; last-project storage keys have one owner; project-session use cases no longer know `ProjectService` static method shape.

## Risks

- Moving composition can accidentally break startup without credentials if the production factory does not preserve `drive: null` behavior.
- Autosave timing/status behavior can regress if fake scheduler semantics or saved-status timer cleanup changes.
- Replacing the persistence port can sprawl into persistence schema redesign; stop if changes require altering `ProjectService` serialization/deserialization internals.
- Removing `KeyboardShortcutRouter.install` default `window` requires all call sites/tests to pass an explicit target.
- Google Drive validation cannot use real credentials; rely on fake-port unit tests plus credential-free e2e/live smoke.

## Validation plan

Capture all logs under `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/validation/`:

1. Pre/post static scans: `grep -RIn "new GoogleDriveService\|ProjectService\|window.localStorage\|keyboard.install(window)\|diedrico_last_file\|error: any" frontend/src/application/appShell frontend/src/App.vue`.
2. Focused Vitest:
   - `npm run test --workspace=frontend -- tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts tests/unit/application/appShell/KeyboardShortcutRouter.test.ts tests/unit/application/appShell/AppShellBoundary.test.ts`
   - Add any new adapter test files to the command.
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
- replacing selection/delete command construction with a new command-controller architecture larger than a tiny app-shell port;
- editing backend/docs/spec/package/tooling or rendering/domain realization layers.
