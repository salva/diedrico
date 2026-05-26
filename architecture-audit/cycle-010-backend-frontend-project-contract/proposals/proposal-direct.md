# Wave 010 Proposal Direct — Delete disconnected backend project API and dead frontend import leak

## Summary

Adopt one explicit backend stance by removing the unused backend project API from the active architecture. The current active project persistence is frontend command-stream `ProjectData` routed through the Wave 009 app-shell runtime and Google Drive ports. The backend stores a stale `ProjectDTO` shape with broad `any` fields and is skipped by root validation. The direct fix is to delete the disconnected backend project API/storage/tests and delete the dead `OpenProjectDialog.vue` component that imports backend source.

This proposal is “direct” because it implements the Wave 010 target with the smallest conceptual change: do not invent a new backend boundary when the current app does not use backend HTTP for project lifecycle.

## Target outcome

- No frontend code imports backend implementation files by relative path.
- The stale backend project CRUD/file-storage route is gone from active source and tests.
- Root workspace/scripts no longer claim an active backend project API unless other backend surfaces remain explicitly active.
- Frontend project persistence remains the Wave 004 command-stream contract via `ProjectService` and the Wave 009 app-shell runtime/Drive ports.

## Current evidence

- Backend `ProjectDTO` is not the frontend project contract: it defines `elements2D`, `elements3D`, `dependencyGraph`, `planes`, `hingeLines`, `view2D`, `processTree`, and optional command history with multiple `any` fields (`backend/src/models/Project.ts:6-52`).
- Frontend `ProjectData` is command-stream persistence with `schemaVersion`, `nextElementId`, and command snapshots (`frontend/src/services/ProjectService.ts:11-19`, `frontend/src/services/ProjectService.ts:27-78`).
- Wave 009 app-shell uses `ProjectPersistencePort` and defaults to `ProjectService` (`frontend/src/application/appShell/AppShellPorts.ts:24-28`, `frontend/src/application/appShell/AppShellRuntime.ts:21-35`). Project creation/open/autosave use Drive plus that persistence port, not backend HTTP (`frontend/src/application/appShell/ProjectSessionUseCases.ts:96-136`, `frontend/src/application/appShell/AutoSaveUseCases.ts:50-64`).
- The only frontend→backend source import found is in `OpenProjectDialog.vue` (`frontend/src/components/dialogs/OpenProjectDialog.vue:54-58`), but `App.vue` renders `StartupDialog`, not `OpenProjectDialog` (`frontend/src/App.vue:1-16`, `frontend/src/App.vue:91-108`).
- Root scripts skip backend despite the backend workspace declaration (`package.json:7-20`).

## Files to change

### Delete backend project API/storage/model surfaces

- Delete `backend/src/api/projects.ts`.
- Delete `backend/src/models/Project.ts`.
- Delete `backend/src/storage/FileStorage.ts`.
- Delete `backend/src/storage/ProjectRepository.ts`.
- Delete `backend/tests/integration/projects.spec.ts`.
- Update `backend/src/server.ts` to remove the `projectsRouter` import and `/api/projects` mount. If the backend only has health after this deletion and is not used by any runtime, consider deleting the entire backend workspace in this same implementation rather than preserving a server shell.

### Delete frontend import leak/dead dialog

- Delete `frontend/src/components/dialogs/OpenProjectDialog.vue`.
- Confirm no active source/test imports `OpenProjectDialog.vue`; if any emerge, replace with the Wave 009 `StartupDialog`/runtime flow or delete obsolete tests.

### Package/workspace stance

Two acceptable direct variants, to be decided during implementation by static search after route deletion:

1. **Delete backend workspace entirely if no non-project backend capability remains user-facing.** Delete `backend/package.json`, `backend/tsconfig.json`, backend source/test directory remnants, remove `"backend"` from root `workspaces`, and remove backend package lock references as needed.
2. **Keep a minimal backend only if health/server is still intentionally active.** Then root scripts must either include backend build/test or clearly leave backend hardening to Wave 011 only if the backend no longer has project-contract responsibility. This variant is weaker and should be rejected if it preserves an unused server shell for no current product purpose.

### Docs/spec references directly affected

Delete only backend project API references that would otherwise describe removed active behavior. Candidate stale references identified by search:

- `specs/001-dihedral-learning-mvp/contracts/api.yaml` backend project metadata/routes.
- `specs/001-dihedral-learning-mvp/quickstart.md` references to `backend/data/projects`.
- `specs/001-dihedral-learning-mvp/research.md` references to `/api/projects` and backend file storage.
- `specs/001-dihedral-learning-mvp/plan.md` references to `backend/src/api/projects.ts` output.

Do not broaden into Wave 013 docs reconciliation beyond these direct stale backend-project references.

## Explicit DELETE list

- `frontend/src/components/dialogs/OpenProjectDialog.vue`.
- `backend/src/api/projects.ts`.
- `backend/src/models/Project.ts`.
- `backend/src/storage/FileStorage.ts`.
- `backend/src/storage/ProjectRepository.ts`.
- `backend/tests/integration/projects.spec.ts`.
- `/api/projects` import/mount from `backend/src/server.ts`.
- Backend workspace/package files if no active non-project backend remains.
- Obsolete docs/spec references that describe backend project CRUD/file storage after deletion.

## Expected behavior change

- User-facing frontend project open/create/save/autosave behavior should not change, because active behavior already uses `StartupDialog`, `AppShellRuntime`, Google Drive service, and frontend `ProjectService` command-stream persistence.
- Backend `/api/projects` HTTP endpoints will be removed. This is intentional because they are disconnected from active frontend persistence and encode a stale DTO.
- If the entire backend workspace is deleted, backend health/dev/start scripts disappear too; this is acceptable if no active user-observable behavior depends on them.

## Validation plan

### Focused static/contract validation expected to pass

- Static scan: no `frontend/` import references to `backend/src`.
- Static scan: no `/api/projects` route references remain in active source, tests, docs retained as current guidance.
- Static scan: no `OpenProjectDialog` references remain.
- Focused frontend ProjectService tests:
  - `npm run test -- tests/unit/services/ProjectService.roundTrip.spec.ts tests/unit/services/ProjectService.selfContainment.spec.ts tests/unit/services/ProjectService.subprocess.spec.ts` from `frontend/`.
  - Include integration persistence specs if they remain passing/focused enough: `tests/integration/projectService.determinism.spec.ts`, `tests/integration/projectService.cascadeDeletion.spec.ts`.
- Focused app-shell tests for project routing after backend deletion:
  - `tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`.
  - `tests/unit/application/appShell/AppShellBoundary.test.ts` updated to forbid frontend→backend implementation imports if not already covered.

### Mandatory cadence to attempt and log

- Root `npm run lint`.
- Frontend `npm run lint`.
- Backend lint only if backend remains and a backend lint script exists after implementation; otherwise record as not applicable due backend deletion/no script.
- Root `npm run test`.
- Frontend full `npm run test`.
- Backend `npm run test` only if backend remains; if backend is deleted, not applicable.
- Root `npm run build`.
- Frontend `npm run build`.
- Backend `npm run build` only if backend remains; if backend is deleted, not applicable.
- Frontend `npm run test:e2e`, because persistence/open-project behavior is user-facing.
- Live preview refresh: `npm run dev -- --host 0.0.0.0` from `frontend/`, reachability probe, and a live smoke covering app load plus startup/open-project affordance. If Google credentials are absent, smoke should verify local/no-credentials startup remains usable and no backend fetch errors are emitted.

### Required validation if implementation retains backend or creates a shared contract

The preferred direct stance is deletion. If implementation instead keeps any backend project capability, or introduces a shared `ProjectData` contract package, the following focused backend contract/API validation is required and must pass; it is not optional Wave 011 hardening:

- Backend model/contract tests proving the backend accepts, persists, returns, and rejects the exact shared command-stream `ProjectData` schema, including `schemaVersion`, `nextElementId`, serialized command descriptors, metadata timestamps, and malformed/unsupported-schema rejection cases.
- Backend API integration tests for `POST`, `GET`, `PUT/PATCH`, list, and delete project endpoints using the shared contract only; tests must prove no stale `ProjectDTO` fields such as `elements2D`, `elements3D`, `dependencyGraph`, `planes`, `hingeLines`, `view2D`, `processTree`, or `commandHistory` survive as accepted backend contract fields.
- Backend storage round-trip tests proving stored JSON is runtime-validated on read and write before it is exposed through the API, with corrupt or obsolete files rejected/quarantined rather than cast to TypeScript types.
- Frontend adapter tests, if a backend adapter is exposed to the app shell, proving create/open/save/autosave go through an app-shell port adapter and never through Vue component imports or direct backend-source type imports.
- Shared-package build/type tests, if a shared package is added, proving both frontend and backend import the same contract and validators from that package with no duplicate project schema definitions.
- Mandatory commands for the retained-backend path: backend focused Vitest for contract/API/storage, backend full `npm run test`, backend `npm run build`, root test/build commands that include the shared package/backend path as required by the chosen workspace stance, plus the frontend focused persistence/app-shell tests listed above.

A retained-backend/shared-contract implementation that lacks these focused backend API and storage validation checks fails Wave 010 even if frontend deletion/import-boundary checks pass.

### Known pre-existing failures to classify separately

From Wave 009 validation: missing `eslint`, Node 24/`vue-tsc` incompatibility, unrelated broad frontend Vitest failures, broad TypeScript no-emit debt, and corrupted e2e specs. These must be attempted and logged; a focused Wave 010 failure in import boundaries, app-shell project routing, ProjectService contract, retained-backend API contract, backend storage validation, or shared-contract type/runtime validation is attributable and blocks completion.

## Risks

- **Deleting entire backend may remove a server shell someone expected for future use.** Project priorities give no weight to speculative/backcompat surfaces; preserve only if current source proves active use.
- **Docs/spec deletion could expand into Wave 013.** Limit deletion to direct backend project API references that would become false after this wave.
- **OpenProjectDialog deletion could expose hidden import through dynamic registration.** Static search currently finds no component import; implementation should confirm with full search/build logs.
- **Root package lock/workspace cleanup may be noisy.** If backend workspace is deleted, update only package/workspace metadata required to keep install/scripts coherent; do not perform broad tooling hardening reserved for Wave 011.

## Why this follows no-backcompat priorities

This proposal removes, rather than wraps, the stale backend DTO/API and the frontend→backend implementation import leak. It preserves the current authoritative project persistence contract established by Wave 004 and routed by Wave 009, and deletes disconnected surfaces instead of maintaining parallel project architectures.
