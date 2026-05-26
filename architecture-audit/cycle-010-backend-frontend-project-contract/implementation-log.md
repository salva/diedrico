# Wave 010 Implementation Log — Backend/frontend project-contract architecture

## Selected decision implemented

Implemented `architecture-audit/cycle-010-backend-frontend-project-contract/decision.md` selected Proposal Restructure: the active project persistence boundary remains the frontend app-shell `ProjectPersistencePort`/`ProjectService` path, and the disconnected backend project DTO/API/storage/test path was deleted rather than wrapped or converted into a speculative shared backend contract.

## Source files changed

- `package.json`: removed the `backend` workspace from root workspaces; root scripts already delegated only to frontend.
- `package-lock.json`: removed backend workspace package metadata and the `node_modules/diedrico-backend` workspace link entry.
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`: renamed the stale `showOpenProjectDialog` method to `showStartupProjectChooser` to reflect the active StartupDialog/app-shell flow instead of the deleted component surface.
- `frontend/src/application/appShell/AppShellRuntime.ts`: updated the app-shell action from `openProjectDialog` to `showProjectChooser`, delegating to `showStartupProjectChooser`.
- `frontend/src/application/appShell/KeyboardShortcutRouter.ts`: updated Ctrl/Cmd+O to show the active startup project chooser rather than the deleted OpenProjectDialog surface.
- `frontend/tests/unit/application/appShell/KeyboardShortcutRouter.test.ts`: updated the project-session mock to the renamed app-shell method.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`: added Wave 010 architecture guards that scan frontend source/tests and fail if frontend imports `backend/src/**` or reintroduces stale backend project route/DTO/dialog assumptions.
- `specs/001-dihedral-learning-mvp/contracts/api.yaml`: replaced the obsolete backend project CRUD OpenAPI contract with an empty contract noting that active project persistence is app-shell/ProjectService/Drive-owned.
- `specs/001-dihedral-learning-mvp/quickstart.md`: removed backend install/run/storage/troubleshooting instructions made false by backend deletion and documented frontend app-shell persistence.
- `specs/001-dihedral-learning-mvp/research.md`: removed the directly false backend project CRUD snippet and replaced it with a Wave 010 deletion note.
- `specs/001-dihedral-learning-mvp/plan.md`: removed directly false backend project/source references and updated persistence wording to the frontend app-shell boundary.

## Deleted legacy surfaces

- Deleted the entire `backend/` workspace because after removing the project API/storage/tests no proven current non-project backend responsibility remained. This removes:
  - `backend/src/api/projects.ts`
  - `backend/src/models/Project.ts`
  - `backend/src/storage/FileStorage.ts`
  - `backend/src/storage/ProjectRepository.ts`
  - `backend/tests/integration/projects.spec.ts`
  - `backend/src/server.ts` and the remaining health placeholder along with backend package/tsconfig files.
- Deleted `frontend/src/components/dialogs/OpenProjectDialog.vue`, removing the direct frontend import from `backend/src/models/Project`.
- `frontend/tests/e2e/persistence.spec.ts` was already absent at implementation start and remains absent; no stale `localhost:3000` backend-project e2e coverage was reintroduced.

No compatibility shims, DTO adapters, backend placeholder server, or dual project persistence path were retained.

## Validation logs

Validation logs were captured under `architecture-audit/cycle-010-backend-frontend-project-contract/validation/`.

### Focused Wave 010 checks

- `focused-wave010-vitest-final.stdout` / `.stderr`: PASS. Ran focused app-shell boundary/runtime and ProjectService persistence coverage:
  - `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
  - `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`
  - `frontend/tests/unit/services/ProjectService.selfContainment.spec.ts`
  - `frontend/tests/unit/services/ProjectService.subprocess.spec.ts`
  - `frontend/tests/integration/projectService.determinism.spec.ts`
  - `frontend/tests/integration/projectService.cascadeDeletion.spec.ts`
  - Result: 7 files passed, 52 tests passed.
- `static-scan-no-frontend-backend-src-clean.stdout` / `.stderr`: PASS. No `backend/src` references in `frontend/src` or `frontend/tests`.
- `static-scan-no-stale-project-api-empty.stdout` / `.stderr`: PASS. No active source/test/current-doc references to stale backend project route literals, backend project DTO names, or `OpenProjectDialog` remain in scanned surfaces.
- `static-scan-deleted-surfaces-clean.stdout` / `.stderr`: PASS. `backend/`, `frontend/src/components/dialogs/OpenProjectDialog.vue`, and `frontend/tests/e2e/persistence.spec.ts` are absent.

### Mandatory cadence attempted

- Root lint: `root-npm-lint.stdout` / `.stderr` — FAIL, known validation debt: `eslint: not found` from frontend lint script.
- Frontend lint: `frontend-npm-lint.stdout` / `.stderr` — FAIL, same known `eslint: not found` debt.
- Backend lint/test/build: not applicable; backend workspace was deleted by the selected stance.
- Root full Vitest: `root-npm-test.stdout` / `.stderr` — FAIL due existing non-Wave-010 calculation test failures in `frontend/tests/unit/calculations/intersections.spec.ts` (10 line-line intersection expectation failures). Focused Wave 010 tests passed.
- Frontend full Vitest: `frontend-npm-test.stdout` / `.stderr` — FAIL for the same pre-existing intersections spec failures.
- Root build: `root-npm-build.stdout` / `.stderr` — FAIL, known Node 24 / `vue-tsc` incompatibility: `Search string not found: "/supportedTSExtensions = .*(?=;)/"`.
- Frontend build: `frontend-npm-build.stdout` / `.stderr` — FAIL, same `vue-tsc`/Node 24 incompatibility.
- Frontend e2e: `frontend-npm-test-e2e.stdout` / `.stderr` — FAIL before execution because existing e2e specs are syntactically corrupted (`keyboard-shortcuts.spec.ts` unexpected token at line 267 and `selection-mask.spec.ts` unexpected token at line 188). This is not attributable to Wave 010 and no stale backend persistence e2e file remains.

## Live preview refresh

- Attempted to start a fresh Vite preview/dev server on `0.0.0.0`; log `live-preview-refresh.stdout` shows port `5173` was already in use and the new process fell back to `5174`.
- Stopped the extra fallback process and kept the existing in-container preview on `0.0.0.0`/port `5173`.
- Reachability probes:
  - `live-preview-probe2.stdout`: HTTP 200 from `http://127.0.0.1:5173/`.
  - `live-preview-final-probe.stdout`: HTTP 200 from `http://127.0.0.1:5173/` after stopping the extra fallback process.

## Residual risks and classifications

- Broad lint/build/full-test/e2e gates remain red due known validation debt unrelated to Wave 010: missing `eslint`, Node 24 / `vue-tsc` incompatibility, existing intersections unit failures, and corrupted e2e specs. These are candidates for Wave 011 validation-gate hardening or later test-debt waves, not reasons to preserve the deleted backend project path.
- The docs/spec cleanup was deliberately limited to directly false backend-project API/storage references. Broader historical references to backend as a general concept in old planning notes were not reconciled beyond Wave 010 scope.
- Future backend project persistence remains possible only through a reviewed wave as a real adapter for the app-shell project contract with runtime/root validation; no such adapter was introduced here.

## Explicit exclusions honored

- Did not implement Wave 011 root validation-gate hardening beyond attempting/logging the mandatory cadence.
- Did not perform Wave 012 debug/log cleanup.
- Did not perform broad Wave 013 docs/spec reconciliation beyond directly false backend project API/storage references.
- Did not retain compatibility shims, DTO adapters, stale route fixtures/tests, or a placeholder backend shell.

## Reviewer-blocker correction — focused app-shell Playwright evidence

Task `t3-correct-focused-e2e-evidence` added focused user-facing Playwright evidence for the active app-shell/startup/open-project boundary without depending on the corrupted broad e2e suite.

### Additional source/test changes

- `frontend/src/App.vue`: corrected the toolbar `@open-project` binding from the stale deleted `runtime.actions.openProjectDialog` name to the active `runtime.actions.showProjectChooser` app-shell action. This is directly within Wave 010 because the selected implementation renamed the app-shell chooser action and deleted the stale `OpenProjectDialog.vue` surface.
- `frontend/tests/e2e/wave010-app-shell-project-flow.spec.ts`: added a dedicated Playwright spec that starts the app with no Google credentials, verifies the app-shell initializes to the local `Untitled Project` state, opens the project chooser via the user-facing toolbar `Open Project` control, verifies the StartupDialog sign-in/open-project affordance appears, and fails if any stale `localhost:3000/api/projects` or `/api/projects` request is attempted.

### Additional focused validation logs

- `focused-wave010-playwright-app-shell-project-flow.stdout` / `.stderr`: initial focused run failed because the combined shell command attempted to patch `App.vue` with unavailable `python`, so the app still used the stale `openProjectDialog` handler and the chooser did not open. The failure exposed a real Wave 010 binding gap in `frontend/src/App.vue`.
- `focused-wave010-playwright-app-shell-project-flow-rerun.stdout` / `.stderr`: PASS. Ran `npx playwright test tests/e2e/wave010-app-shell-project-flow.spec.ts --reporter=line` from `frontend/`; result: 1 Chromium test passed. This is the focused user-facing evidence for app startup/open-project chooser behavior while avoiding the known syntactically corrupted broad e2e files.
- `t3-static-scan-focused-e2e-stale-project-api.stdout` / `.stderr`: informational scan. The only `localhost:3000/api/projects` and `/api/projects` matches in the focused e2e surface are guard strings inside `wave010-app-shell-project-flow.spec.ts` that abort/fail stale backend-project requests; they are not active route expectations or compatibility coverage.

### Scope note

This correction did not harden the broad e2e suite, root validation gates, lint/build tooling, debug output, or unrelated docs. The broad `npm run test:e2e` result remains classified as pre-existing e2e corruption (`keyboard-shortcuts.spec.ts`, `selection-mask.spec.ts`), while the focused Wave 010 Playwright evidence now covers the reviewed app-shell/startup/open-project project-boundary requirement.
