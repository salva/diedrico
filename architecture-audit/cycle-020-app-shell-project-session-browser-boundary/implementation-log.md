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

## Validation/preview closure — cycle-020-validation-and-preview-refresh

Status: **Wave 020 COMPLETE**.

Independent closure verification in this validation stage re-read the current implementation log, decision artifact, validation directory, package scripts, and `architecture-audit/wave-plan.md`; captured fresh scoped source-control/status evidence; verified the mandatory green validation evidence already present from implementation; and confirmed the live preview remains reachable on the required host bindings. No production source refactor, package/tooling change, e2e rewrite, secret/config read, next-wave implementation, backend/docs/spec edit, or unrelated workspace cleanup was performed in this closure stage.

### Closure evidence added by t1

All files below are under `architecture-audit/cycle-020-app-shell-project-session-browser-boundary/validation/`:

- `closure-t1-status.stdout` / `.stderr` — scoped status capture for Cycle 020 app-shell/audit/report paths plus the total dirty-entry count. The scoped source diff for Wave 020 source/test paths is empty at closure time; untracked closure/review/report artifacts remain as audit/stage evidence. The overall workspace still contains many pre-existing dirty entries outside this closure scope and was not reconciled globally.
- `closure-t1-diff.stdout` / `.stderr` — scoped diff-stat/name-status for Cycle 020 app-shell/audit/report paths; no additional source diff was introduced by closure verification before this log update.
- `closure-t1-validation-tail-index.stdout` / `.stderr` — independent tail index for the mandatory validation logs listed below.
- `closure-t1-preview-probe.stdout` / `.stderr` — fresh HTTP reachability probes returned `HTTP/1.1 200 OK` for both `http://127.0.0.1:5173/` and `http://0.0.0.0:5173/`; process evidence shows `vite --host 0.0.0.0` still running.
- `closure-t1-wave-plan-relevant.stdout` / `.stderr` and `closure-t1-wave-plan-tail.stdout` / `.stderr` — wave-plan reread evidence used for the next-action recommendation.

A first closure capture attempt failed before writing stable evidence because `/bin/sh` did not support `set -o pipefail`; a second attempt failed because shell interpolation stripped the validation path. Both were harness/shell invocation mistakes outside source behavior; the successful bash/heredoc captures above supersede them.

### Mandatory validation status verified

The mandatory Wave 020 validation evidence is present and green, with stale failed attempts explicitly superseded by later green logs where applicable:

- Static scans: `static-scan-app-shell.stdout` contains only expected residual hits — `ProjectService` appears in the narrow adapter/type boundary, last-project keys appear only in `BrowserLastProjectRepository.ts`, and `new GoogleDriveService` / `window.localStorage` appear only in `AppShellProductionRuntime.ts`.
- Focused app-shell Vitest: `focused-vitest.stdout` / `.stderr` passed, 3 files / 24 tests.
- Root lint: `root-lint.stdout` / `.stderr` passed.
- Frontend lint: `frontend-lint.stdout` / `.stderr` passed.
- Full root Vitest: `root-test.stdout` / `.stderr` plus `root-test-tail.stdout` passed, 109 files passed / 1 skipped, 1245 tests passed / 45 skipped / 11 todo. The stderr tail contains expected exercised error logging from existing tests, not test failures.
- Full frontend Vitest: `frontend-test.stdout` / `.stderr` plus `frontend-test-tail.stdout` passed with the same suite summary.
- Root build: `root-build.stdout` / `.stderr` passed; only the existing Vite chunk-size warning remains.
- Frontend build: `frontend-build.stdout` / `.stderr` passed; only the existing Vite chunk-size warning remains.
- Final focused/build rerun: `final-fix-rerun.stdout` / `.stderr` passed after the final port-signature restoration. The earlier `final-minimize-rerun.*` failure is superseded and documented as an obsolete-signature minimization attempt, not a remaining source failure.
- Root e2e: `root-e2e.stdout` / `.stderr` passed, 8 Playwright tests.
- Frontend e2e: `frontend-e2e.stdout` / `.stderr` passed, 8 Playwright tests.
- Live preview: `live-preview-refresh-2.*`, `live-preview-server.*`, `live-preview-ps-after.stdout`, `live-preview-probe-127.stdout`, `live-preview-probe-0.stdout`, and fresh `closure-t1-preview-probe.stdout` show a Vite preview/dev server running with `--host 0.0.0.0` and returning HTTP 200 on both loopback and `0.0.0.0` probes.
- Credential-free live smoke: `live-smoke-playwright-rerun.stdout` / `.stderr` passed after the selector-only failure in `live-smoke-playwright.*`; it verified app visibility, SVG canvas visibility, keyboard `p` then `Escape` returning footer tool status to `Select`, and visible footer/status text without real Drive credentials.

No mandatory command was skipped. Root scripts delegate to the active `frontend` workspace as shown in `package.json`; the backend is not an active workspace in the current root package configuration.

### Protected surfaces / source-control reconciliation at closure

Closure verification did not newly modify production source, tests, package/tooling, backend, docs/specs, Drive internals, ProjectService internals, rendering/domain layers, command/undo descriptors, process tree, or secret/config/env/provider files. The only closure-stage content changes are audit validation evidence, this implementation-log completion section, and the task report.

The scoped closure captures distinguish Cycle 020 artifacts from unrelated workspace dirt: Cycle 020 source/test paths have no additional uncommitted diff in `closure-t1-diff.stdout`, while `closure-t1-status.stdout` shows untracked audit/stage evidence and a large global dirty-entry count outside this closure scope. Pre-existing adjacent dirty source/test work noted earlier remains out of scope and was neither reverted nor incorporated.

### Residual risks accepted after closure

- Real Google Drive behavior remains unvalidated with credentials by secret-safety rules; fake-port coverage, e2e without credentials, and credential-free live smoke are the accepted validation boundary.
- `SelectionUseCases` still directly constructs delete commands through `Command` / `DeletionSequenceFactory`; this remains the intentionally accepted Wave 020 residual rather than an accidental leftover.
- `AppShellRuntime.ts` still owns in-memory `World` and `CommandStack` creation, as explicitly allowed by the Cycle 020 decision; broader kernel extraction requires a future reviewed wave.
- The app-shell persistence adapter still imports `ProjectService`/`ProjectData` at the adapter/type boundary because the persistence contract itself was intentionally not redesigned in this wave.
- The live smoke covers startup/keyboard/status without credentials; it does not prove credential-backed Drive save/open behavior.

### Next bounded wave action recommendation

After rereading `architecture-audit/wave-plan.md`, the current plan ends at Wave 020. Wave 020 resolved the app-shell production composition/browser-default boundary but intentionally left central application-use-case command ownership debt (`SelectionUseCases` direct delete-command construction) and the broader `World`/`CommandStack` application-kernel ownership question. The next action should therefore be a **reviewed wave-plan-extension stage**, not implementation: scout the current source tree and add the next central wave entry that addresses the most important remaining application boundary (likely selection/delete command-use-case ownership or application-kernel/runtime object ownership), with scope, delete list, success criteria, validation requirements, and bounded review before any new cycle starts.

Do not begin that next wave from this closure stage; no next-wave implementation was performed.
