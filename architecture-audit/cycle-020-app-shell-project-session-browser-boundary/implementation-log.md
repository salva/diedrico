# Cycle 020 Implementation Log — App-shell project session / browser boundary

## Selected path followed

Implemented the decision-selected direct path from `decision.md` / `proposals/proposal-direct.md`. No `AppSession` facade, proposal-restructure work, command/undo redesign, ProjectService schema change, GoogleDriveService internals change, backend/docs/package/tooling change, or rendering/domain refactor was performed.

## Source files changed

- `frontend/src/application/appShell/AppShellRuntime.ts` — removed hidden production defaults; runtime core now requires explicit `AppShellRuntimePorts`, including drive, project-session persistence, last-project repository, scheduler, keyboard target, stores, and callbacks. Runtime still owns `World` and `CommandStack` as approved by the decision.
- `frontend/src/application/appShell/AppShellPorts.ts` — replaced the static-shaped `ProjectPersistencePort` plus generic app-shell storage port with `ProjectSessionPersistencePort`, `LastProjectRepositoryPort`, and explicit `keyboardTarget` on runtime ports.
- `frontend/src/application/appShell/AppShellProductionRuntime.ts` — new production composition owner for `GoogleDriveService`, `ProjectSessionPersistenceAdapter`, `BrowserLastProjectRepository(window.localStorage)`, browser scheduler, keyboard `window`, and browser/UI callbacks passed from `App.vue`.
- `frontend/src/application/appShell/ProjectSessionPersistenceAdapter.ts` — new narrow adapter binding app-shell session operations to `ProjectService` without changing ProjectService internals.
- `frontend/src/application/appShell/BrowserLastProjectRepository.ts` — new single owner of `diedrico_last_file_id` / `diedrico_last_file_name` persistence.
- `frontend/src/application/appShell/AppShellErrorClassifier.ts` — new `unknown` error normalization/classification helper used by touched autosave/session paths.
- `frontend/src/application/appShell/ProjectSessionUseCases.ts` — uses `lastProjectRepository` and narrowed persistence operations; touched error handling now uses `unknown` normalization.
- `frontend/src/application/appShell/AutoSaveUseCases.ts` — uses narrowed persistence and `lastProjectRepository`; `error: any` removed from touched save-error handling.
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts` — `install` now requires an explicit target and no longer defaults to `window`.
- `frontend/src/App.vue` — now calls `createProductionAppShellRuntime` and passes only env-derived config, stores, and UI callbacks/refs. It does not instantiate services/adapters/repositories/schedulers/storage/keyboard targets.

## Tests changed

- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts` — updated runtime/use-case tests for explicit fake dependencies, production composition construction, repository-backed last-project operations, autosave/session narrow port use, and explicit keyboard target behavior.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` — strengthened raw-source assertions that runtime core no longer owns hidden production defaults, production composition is the only browser/default owner, and last-project key literals live only in `BrowserLastProjectRepository.ts`.
- `frontend/tests/unit/application/appShell/KeyboardShortcutRouter.test.ts` — existing explicit target install/dispose coverage remains valid; no hidden-window default is asserted.

## Legacy surfaces deleted / replaced

- Deleted hidden default construction from `AppShellRuntime.ts` for `new GoogleDriveService(...)`, `ProjectService`, `window.localStorage`, `createBrowserScheduler()`, and `keyboard.install(window)`.
- Deleted duplicated `diedrico_last_file_id` / `diedrico_last_file_name` literals from `ProjectSessionUseCases.ts` and `AutoSaveUseCases.ts`; `BrowserLastProjectRepository.ts` is the only key owner.
- Deleted static-shaped app-shell `ProjectPersistencePort`; replaced by `ProjectSessionPersistencePort` and `ProjectSessionPersistenceAdapter.ts`.
- Deleted `error: any` from touched autosave save-error handling; session/autosave catches use `unknown` plus `AppShellErrorClassifier.ts`.
- Deleted tests that asserted runtime core attaches to global `window`; focused runtime lifecycle tests now use explicit fake targets.
- No compatibility overload or parallel hidden-global runtime creation path was left behind.

## Protected-surface checks

Not modified: backend, docs/specs, package scripts/tooling, ProjectService internals, GoogleDriveService internals, rendering/domain layers, command/undo descriptors, process tree, SelectionUseCases implementation, and secret/config/env/provider files.

`SelectionUseCases` direct delete-command construction remains intentionally retained as accepted Cycle 020 residual debt. Boundary tests explicitly assert this residual remains rather than introducing a delete-selection port or command-controller abstraction.

## Source-control reconciliation

Pre-edit evidence:

- `validation/pre-scoped-status.stdout`
- `validation/pre-scoped-diff.stdout`

Post/final evidence:

- `validation/post-scoped-status.stdout`
- `validation/post-scoped-diff.stdout`
- `validation/final-status-short.stdout`
- `validation/final-diff-stat.stdout`

Pre-existing adjacent dirty files from Cycle 020 reconciliation remain present and were not reverted or incorporated as implementation work:

- `frontend/tests/e2e/active-plane-shortcuts.spec.ts` — pre-existing deletion.
- `frontend/tests/e2e/selection-mask.spec.ts` — pre-existing deletion.
- `frontend/src/application/appShell/AppShellPorts.ts` was pre-existing dirty and necessarily overlapped with this implementation because the selected direct path required replacing the port shape. The `AuthStorePort.setAuthenticated(..., expiry?: Date)` signature is retained because the current auth store implementation requires it; a brief minimization attempt with the older `refreshToken?: string` shape failed `vue-tsc` and is captured in `validation/final-minimize-rerun.*`, then reverted.

## Validation log index

All logs are under `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/validation/`.

- Static scan: `static-scan-app-shell.stdout` (expected remaining hits: ProjectService only in the narrow adapter/type imports; last-project keys only in `BrowserLastProjectRepository.ts`; `new GoogleDriveService`/`window.localStorage` only in `AppShellProductionRuntime.ts`).
- Focused Vitest: `focused-vitest.stdout` / `.stderr` — passed, 3 files / 24 tests.
- Root lint: `root-lint.stdout` / `.stderr` — passed.
- Frontend lint: `frontend-lint.stdout` / `.stderr` — passed.
- Root Vitest: `root-test.stdout` / `.stderr`; summary tail in `root-test-tail.stdout` — passed, 109 files passed / 1 skipped, 1245 passed / 45 skipped / 11 todo.
- Frontend Vitest: `frontend-test.stdout` / `.stderr`; summary tail in `frontend-test-tail.stdout` — passed, same suite summary.
- Root build: `root-build.stdout` / `.stderr` — passed; existing Vite chunk-size warning only.
- Frontend build: `frontend-build.stdout` / `.stderr` — passed; existing Vite chunk-size warning only.
- Final focused rerun after last port-signature restoration: `final-fix-rerun.stdout` / `.stderr` — focused app-shell Vitest and frontend build passed. A prior minimization attempt is captured in `final-minimize-rerun.*` and failed only because it restored an obsolete `AuthStorePort` signature incompatible with the current auth store; the source was immediately corrected.
- Root e2e: `root-e2e.stdout` / `.stderr` — passed, 8 Playwright tests.
- Frontend e2e: `frontend-e2e.stdout` / `.stderr` — passed, 8 Playwright tests.

## Live preview / browser smoke

- First preview refresh attempt `live-preview-refresh.stdout` / `.stderr` exited non-zero before creating server logs; it did not leave a running process.
- Successful refresh: `live-preview-refresh-2.stdout` / `.stderr`; server PID in `live-preview-server.pid`; server output in `live-preview-server.stdout` shows Vite bound with `--host 0.0.0.0`.
- Reachability probes: `live-preview-probe-127.stdout` and `live-preview-probe-0.stdout` both returned HTTP 200.
- Running process evidence: `live-preview-ps-after.stdout` shows `vite --host 0.0.0.0`.
- Credential-free browser smoke: initial script `live-smoke-playwright.stdout` / `.stderr` failed only because selector `#app` matched both mount and app container. Rerun `live-smoke-playwright-rerun.stdout` / `.stderr` passed: app visible, SVG canvas visible, keyboard `p` then `Escape` returned footer tool status to `Select`, and status footer text was visible.

## Residual risks / future wave candidates

- Real Google Drive behavior remains unvalidated with credentials by project secret-safety rules; fake-port tests, e2e without credentials, and live smoke cover credential-free behavior.
- `SelectionUseCases` still directly constructs delete commands via `Command` / `DeletionSequenceFactory`; this is accepted Cycle 020 residual debt and remains a candidate for a future command/use-case boundary wave.
- `AppShellRuntime.ts` still creates `World` and `CommandStack`, as explicitly allowed by the decision; a broader application kernel extraction would require a future reviewed wave.
- Static scan still sees `ProjectService` type imports in app-shell port/session files because `ProjectData` is the current project-data contract crossing the narrow adapter boundary. No ProjectService internals or static method shape leaks remain in use cases/runtime.
