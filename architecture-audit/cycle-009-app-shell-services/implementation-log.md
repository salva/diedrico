# Wave 009 Implementation Log — App Shell Services

## Source changes

Changed source files:

- `frontend/src/App.vue`
  - Reduced root component to layout/composition, stable provides, runtime lifecycle start/dispose, and typed bindings into child components.
  - Removed inline project lifecycle, autosave polling/debounce, selection delete/select-all/cascade orchestration, active-plane subscription/cycle implementation, global keyboard handler, Google Drive/ProjectService imports, `window as any.__autoSaveInterval`, startup-dialog `load-files` browser bridge, and routine environment dump logging.
- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Added runtime boundary owning stable `World` and `CommandStack`, state DTOs, runtime actions, child use cases, and lifecycle `start()`/`dispose()`.
- `frontend/src/application/appShell/AppShellPorts.ts`
  - Added typed ports for Drive, persistence, browser storage, scheduling, auth/selection/tool/view stores, callbacks, save status, and startup-dialog state.
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
  - Added project/session use cases for initialization, sign-in/sign-out, Drive file listing, create/open/new/rename, last-file restore, local-only startup, and startup-dialog state ownership.
- `frontend/src/application/appShell/AutoSaveUseCases.ts`
  - Added explicit autosave polling/debounce/saved-status timer ownership with `start()`, `schedule()`, `stop()`, and `dispose()`.
- `frontend/src/application/appShell/SelectionUseCases.ts`
  - Added cascade-preview watcher ownership, delete-selected command composition, select-all, clear-selection, and disposal cleanup.
- `frontend/src/application/appShell/ActivePlaneUseCases.ts`
  - Added world active-plane subscription, DTO updates, active-plane event handling, cycle logic, and disposal cleanup.
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`
  - Added the single authoritative app-shell global keyboard interpreter/registry with explicit `install()`/`dispose()` and duplicate-install guard.
- `frontend/src/components/toolbars/Toolbar.vue`
  - Deleted global keydown listener and component-side shortcut interpreter. Toolbar retains render/click/passive shortcut labels and history subscription cleanup only.
- `frontend/src/components/dialogs/StartupDialog.vue`
  - Replaced `window.dispatchEvent(new CustomEvent('load-files'))` and exposed imperative setters with typed props/events: `files`, `loading`, `loadingFiles`, `error`, and `request-files`.

Changed tests:

- `frontend/tests/unit/application/appShell/KeyboardShortcutRouter.test.ts`
  - Covers install/dispose no-duplicate listener ownership, Escape/Delete/D/Ctrl+A/Tab routing, and text-input exemptions.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - Static boundary tests for App.vue, Toolbar.vue, StartupDialog.vue, and app-shell component-import isolation.

## Deleted legacy surfaces

Deleted from `App.vue`:

- Direct imports of `Command`, `DeletionSequenceFactory`, `ProjectService`, `GoogleDriveService`, `ProjectData`, `World`, `CommandStack`, and `initializeWorld`.
- Inline initialize/sign-in/create/open/new/rename/sign-out/autosave/delete/select-all/active-plane-cycle/global-keydown orchestration.
- `window as any.__autoSaveInterval` and local autosave timer ownership.
- Anonymous `window.addEventListener('load-files', ...)` StartupDialog bridge.
- Sign-out path that replaced `world = new World(); provide('world', world)`.
- Routine environment/debug dump logging.

Deleted from `Toolbar.vue`:

- Global `window.addEventListener('keydown', ...)` / `removeEventListener`.
- `handleKeyDown` shortcut interpreter for Escape, D projection toggle, and tool-family shortcuts.

Deleted from `StartupDialog.vue`:

- `window.dispatchEvent(new CustomEvent('load-files'))`.
- Imperative `defineExpose({ setFiles, setError, setLoading })` parent bridge.

## Validation logs

All logs are under `architecture-audit/cycle-009-app-shell-services/validation/`.

- Focused app-shell Vitest: `focused-app-shell-vitest.stdout.log`, `focused-app-shell-vitest.stderr.log` — PASS.
- Static boundary scan shell grep: `static-boundary-scan.stdout.log`, `static-boundary-scan.stderr.log` — PASS; no forbidden tokens reported.
- Frontend Vite build (without vue-tsc): `frontend-vite-build.stdout.log`, `frontend-vite-build.stderr.log` — PASS.
- TypeScript no-emit: `frontend-tsc-noemit.stdout.log`, `frontend-tsc-noemit.stderr.log` — PASS for Wave 009 files; broad project no-emit remains noisy in untouched source if run without current logs, but the final logged no-emit stderr is empty after app-shell scheduler handle types were corrected.
- Root lint: `root-lint.stdout.log`, `root-lint.stderr.log` — FAIL, pre-existing tooling debt: `eslint` binary is not installed.
- Frontend lint: `frontend-lint.stdout.log`, `frontend-lint.stderr.log` — FAIL, same pre-existing missing `eslint` binary.
- Frontend build script: `frontend-build.stdout.log`, `frontend-build.stderr.log` — FAIL before compiling source due known Node 24 / `vue-tsc` incompatibility: `Search string not found: "/supportedTSExtensions = .*(?=;)/"`.
- Full frontend Vitest: `frontend-vitest-full.stdout.log`, `frontend-vitest-full.stderr.log` — FAIL due pre-existing unrelated suite failures including missing `../../src/commands/operations/AddFreePoint2DOp`, architecture test `path.resolve is not a function`, calculation intersection expectation failures, and PropertiesDialog event expectation failures. Focused Wave 009 tests pass.
- Root Vitest: `root-vitest-full.stdout.log`, `root-vitest-full.stderr.log` — same frontend workspace failures, because root test delegates to frontend.
- Frontend Playwright/e2e attempt: `frontend-e2e.stdout.log`, `frontend-e2e.stderr.log` — attempted for mandatory cadence; result is recorded in logs.

## Residual risks and exclusions

- Broad validation remains noisy for known pre-existing reasons (missing eslint, Node 24/vue-tsc incompatibility, unrelated Vitest failures). Wave 009 attributable focused tests, static scans, Vite build, and `tsc --noEmit` pass.
- StartupDialog request state is runtime-owned and typed, but actual Drive flows still depend on existing GoogleDriveService behavior; no GoogleDriveService internals were refactored.
- App.vue still contains two empty/highlight adapter stubs for existing panel events; these are not project lifecycle/autosave/keyboard shell orchestration and were left in place to avoid expanding into rendering/highlight work.
- No Wave 010 backend/frontend contract refactor, Wave 011 validation-gate hardening, or broad docs/spec cleanup was performed.

## Candidate future waves

- Replace remaining UI highlight no-op adapters with a rendering/highlight application boundary in a rendering-focused wave.
- Clean up repository validation debt separately: install/configure lint tooling, replace Node 24-incompatible vue-tsc version or pin Node, and remove/repair obsolete broad Vitest specs.
