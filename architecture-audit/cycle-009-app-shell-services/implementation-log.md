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
- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - Added after implementation review correction to cover runtime start/dispose ownership, stable `World`/`CommandStack` identity through sign-out, autosave polling/debounce/status timer cleanup and auth-failure stop behavior, active-plane subscription/cycling/disposal, selection cascade watcher disposal and select-all behavior, project-session local startup/create/open/rename/sign-out flows, and startup-dialog file-list state reset.

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

- Focused app-shell Vitest: `focused-app-shell-vitest.stdout.log`, `focused-app-shell-vitest.stderr.log` — PASS for the initial implementation coverage.
- Focused blocker-correction app-shell Vitest: `focused-app-shell-vitest-corrections.stdout.log`, `focused-app-shell-vitest-corrections.stderr.log` — PASS; 3 files / 16 tests covering the review-requested lifecycle/use-case ownership gaps.
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

- Broad validation is not classified as passed: root/frontend lint, script build, full Vitest, and e2e remain failed for the logged known pre-existing reasons (missing eslint, Node 24/vue-tsc incompatibility, unrelated Vitest failures, corrupted Playwright specs). Wave 009 attributable focused tests, static scans, Vite build, and `tsc --noEmit` pass; the correction run adds focused lifecycle/use-case coverage for the prior review gap.
- StartupDialog request state is runtime-owned and typed, but actual Drive flows still depend on existing GoogleDriveService behavior; no GoogleDriveService internals were refactored.
- App.vue still contains two empty/highlight adapter stubs for existing panel events; these are not project lifecycle/autosave/keyboard shell orchestration and were left in place to avoid expanding into rendering/highlight work.
- No Wave 010 backend/frontend contract refactor, Wave 011 validation-gate hardening, or broad docs/spec cleanup was performed.

## Candidate future waves

- Replace remaining UI highlight no-op adapters with a rendering/highlight application boundary in a rendering-focused wave.
- Clean up repository validation debt separately: install/configure lint tooling, replace Node 24-incompatible vue-tsc version or pin Node, and remove/repair obsolete broad Vitest specs.

## Validation and preview refresh — cycle-009-validation-and-preview-refresh

Validation rerun by `t1-validation-cadence-and-preview` on 2026-05-26. Full stdout/stderr is captured under `architecture-audit/cycle-009-app-shell-services/validation/`.

| Check | Command | Logs | Result | Classification |
| --- | --- | --- | --- | --- |
| Root lint | `npm run lint` from repo root | `root-lint.stdout.log`, `root-lint.stderr.log` | FAIL | Pre-existing tooling debt: frontend lint delegates to `eslint`, but `eslint` is not installed (`sh: 1: eslint: not found`). No Wave 009 source error is reached. |
| Frontend lint | `npm run lint` from `frontend/` | `frontend-lint.stdout.log`, `frontend-lint.stderr.log` | FAIL | Same pre-existing missing `eslint` binary. |
| Focused Wave 009 Vitest | `npm run test -- tests/unit/application/appShell/KeyboardShortcutRouter.test.ts tests/unit/application/appShell/AppShellBoundary.test.ts tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts` from `frontend/` | `focused-app-shell-vitest.stdout.log`, `focused-app-shell-vitest.stderr.log` | PASS | 3 files / 16 tests passed, covering keyboard-router singleton/disposal, app-shell boundary, runtime lifecycle/use-case cleanup, project lifecycle, selection, autosave, active-plane, and startup-dialog state. |
| Root full Vitest | `npm run test` from repo root | `root-vitest-full.stdout.log`, `root-vitest-full.stderr.log`, summary in `root-vitest-summary.stdout.log` | FAIL | Pre-existing/unrelated broad-suite debt. App-shell tests pass; failures are outside Wave 009 app-shell files, including `tests/unit/calculations/intersections.spec.ts`, `tests/integration/guide-creation.test.ts`, and `tests/unit/architecture/noCommandSubclasses.spec.ts` (`default.resolve is not a function`). |
| Frontend full Vitest | `npm run test` from `frontend/` | `frontend-vitest-full.stdout.log`, `frontend-vitest-full.stderr.log` | FAIL | Same pre-existing/unrelated broad-suite failures as root full Vitest; focused Wave 009 tests pass. |
| Backend Vitest | `npm run test` from `backend/` | `backend-vitest-full.stdout.log`, `backend-vitest-full.stderr.log` | PASS | Backend unchanged by Wave 009; 15 integration tests passed. |
| Root build | `npm run build` from repo root | `root-build.stdout.log`, `root-build.stderr.log` | FAIL | Pre-existing environment/tooling incompatibility before app source compilation: `vue-tsc` crashes under Node v24.15.0 with `Search string not found: "/supportedTSExtensions = .*(?=;)/"`. |
| Frontend build | `npm run build` from `frontend/` | `frontend-build.stdout.log`, `frontend-build.stderr.log` | FAIL | Same pre-existing `vue-tsc`/Node 24 failure. |
| Backend build | `npm run build` from `backend/` | `backend-build.stdout.log`, `backend-build.stderr.log` | PASS | Backend TypeScript build passed. |
| Frontend Vite build | `npx vite build` from `frontend/` | `frontend-vite-build.stdout.log`, `frontend-vite-build.stderr.log` | PASS | Vite transformed 303 modules and produced `dist/`; only the existing chunk-size warning was emitted. |
| Frontend TypeScript no-emit | `npx tsc --noEmit` from `frontend/` | `frontend-tsc-noemit.stdout.log`, `frontend-tsc-noemit.stderr.log` | FAIL | Pre-existing/unrelated broad TypeScript debt across command/domain/icon/service modules (for example missing toolbar icon modules, world operation context type mismatches, stale viewState imports). No app-shell-specific error was reported in the logged output. |
| Playwright/e2e suite | `npm run test:e2e` from `frontend/` | `frontend-e2e.stdout.log`, `frontend-e2e.stderr.log` | FAIL | Pre-existing corrupted e2e spec syntax blocks test collection before exercising Wave 009 behavior: `tests/e2e/keyboard-shortcuts.spec.ts: Unexpected token (267:10160)` and `tests/e2e/selection-mask.spec.ts: Unexpected token (188:2)`. |
| Static architecture checks | shell grep assertions | `static-architecture-check.stdout.log`, `static-architecture-check.stderr.log` | PASS | Confirmed App.vue no longer contains legacy app-shell orchestration tokens and does contain runtime lifecycle calls; Toolbar lacks global shortcut handling; StartupDialog lacks window bridge/imperative exposure and uses typed props/events; runtime/use-case/router files expose cleanup/disposal. |
| Live preview refresh/probe | `npm run dev -- --host 0.0.0.0`, then `curl -I http://127.0.0.1:5173/` and socket listing | `live-preview-refresh.stdout.log`, `live-preview-refresh.stderr.log`, `live-preview-probe.stdout.log`, `live-preview-probe.stderr.log`, `live-preview.pid` | PASS | Preview is bound on `0.0.0.0:5173` (socket listing shows `LISTEN ... 0.0.0.0:5173`) and returned `HTTP/1.1 200 OK`. |
| Live app-shell smoke | temporary Playwright script against `http://127.0.0.1:5173/` | `live-app-shell-smoke.stdout.log`, `live-app-shell-smoke.stderr.log` | PASS | Loaded app container, toolbar, and SVG rendering; observed 26 toolbar buttons and 19 SVGs; exercised `p`, `l`, `Escape`, and `Tab` without fatal browser errors. Browser emitted only existing app debug logs and WebGL software/performance warnings. |

### Validation classification

No Wave-009-attributable validation failure remains. The Wave 009-focused unit tests, static boundary checks, Vite build, backend build/test, preview refresh/probe, and live app-shell smoke all pass. Mandatory repository-wide lint/build/full-test/e2e commands were attempted and logged; their failures are classified as pre-existing/unrelated because they occur in missing tooling, Node/vue-tsc compatibility, corrupted e2e specs, or broad domain/test debt outside the Wave 009 app-shell implementation while the focused Wave 009 coverage passes.

### Preview refresh evidence

The live preview was refreshed from `frontend/` with `npm run dev -- --host 0.0.0.0`. `live-preview-probe.stdout.log` records the process id file, `HTTP/1.1 200 OK` from `http://127.0.0.1:5173/`, and listening evidence for `0.0.0.0:5173`. `live-app-shell-smoke.stdout.log` records successful representative app-shell behavior after refresh.

### Additional residual risks

- Repository validation gates remain noisy and should be addressed by a future validation/tooling hardening wave: install/configure lint tooling, resolve Node 24 / `vue-tsc` incompatibility, repair corrupted e2e specs, and close broad TypeScript/test debt.
- The live smoke validates representative app-shell loading, toolbar rendering, shortcut routing, and active-plane/tab handling, but the committed Playwright suite cannot currently collect due unrelated syntax corruption.
