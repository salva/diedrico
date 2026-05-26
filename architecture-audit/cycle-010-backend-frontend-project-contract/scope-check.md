# Wave 010 Scope Check — Backend/frontend project-contract architecture

**Stage:** `cycle-010-fresh-scout-proposals`  
**Wave:** 010 — Resolve backend/frontend project-contract architecture  
**Source-code changes in this stage:** none intended; this artifact only scouts current state.

## Decision

Wave 010 can proceed without editing `architecture-audit/wave-plan.md`.

The core premise still holds after Wave 009: the repository contains a backend Express/file-storage project API with its own broad `any` project DTO shape, while the active frontend project lifecycle uses the Wave 004 command-stream `ProjectService` through the Wave 009 app-shell runtime and Google Drive ports. The only frontend/backend coupling found in active source is not a real API boundary; it is a direct TypeScript import from `frontend/src/components/dialogs/OpenProjectDialog.vue` into `backend/src/models/Project.ts`. The active app shell no longer renders that dialog, so the import leak is also attached to a dead/obsolete frontend component rather than a validated backend integration.

Recommended stance for proposals: prefer deleting the unused backend project API and the dead `OpenProjectDialog.vue` surface. A keep-backend alternative is still viable for review, but it must make the backend a real typed project boundary and add backend/root validation; it should not preserve the current disconnected backend plus frontend implementation import leak.

## Re-rank after Wave 009

Wave 009 successfully moved app-shell project lifecycle, autosave, Drive routing, startup dialog state, keyboard routing, and runtime ownership out of `App.vue`. Its implementation log states the new runtime owns stable `World` and `CommandStack`, project/session use cases, autosave use cases, typed app-shell ports, and StartupDialog request-file routing, while explicitly excluding Wave 010 backend/frontend contract work (`architecture-audit/cycle-009-app-shell-services/implementation-log.md`, sections “Source changes”, “Deleted legacy surfaces”, and “Residual risks and exclusions”).

That makes Wave 010 more sharply scoped, not invalidated:

1. **Wave 010 remains next and central.** App-shell persistence now flows through `AppShellRuntime`/ports, so the backend stance can be decided against the current runtime boundary instead of old `App.vue` orchestration.
2. **Wave 011 remains after Wave 010.** Root validation gates should be tightened only after the backend is either deleted or made active; otherwise Wave 011 would freeze the wrong workspace set.
3. **Waves 012–013 remain peripheral.** Delete docs/spec references only where directly required by the backend stance in Wave 010; broad docs/spec reconciliation remains later.

## Evidence: backend project API/storage/models

### Backend DTO is a parallel shape, not Wave 004 command-stream persistence

`backend/src/models/Project.ts` defines `ProjectDTO` with separate `elements2D`, `elements3D`, `dependencyGraph`, `planes`, `hingeLines`, `view2D`, `processTree`, and optional `commandHistory` fields (`backend/src/models/Project.ts:6-52`). Several central fields are `Array<any>` or `any` (`backend/src/models/Project.ts:13-14`, `backend/src/models/Project.ts:43`, `backend/src/models/Project.ts:50`). This does not match the active Wave 004 frontend contract, where `ProjectData` contains `schemaVersion`, `nextElementId`, and committed command snapshots (`frontend/src/services/ProjectService.ts:11-19`) and is validated as schema version `6.0.0` (`frontend/src/services/ProjectService.ts:24-31`, `frontend/src/services/ProjectService.ts:80-129`).

`createEmptyProject()` creates backend-only default state with `P_H`, `P_V`, `HL_HV`, empty element arrays, empty dependency graph, and process root (`backend/src/models/Project.ts:67-120`). The active frontend initializes its world through `initializeWorld()` inside app-shell session flows instead (`frontend/src/application/appShell/ProjectSessionUseCases.ts:27-32`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:96-110`).

### Backend routes are CRUD over the stale DTO

`backend/src/server.ts` mounts `projectsRouter` at `/api/projects` (`backend/src/server.ts:1-15`). `backend/src/api/projects.ts` exposes list/create/get/update/delete route handlers (`backend/src/api/projects.ts:11-110`) backed by `ProjectRepository` (`backend/src/api/projects.ts:1-5`). Update accepts the request body as `updates` with no DTO validation beyond existence (`backend/src/api/projects.ts:65-77`). Error handlers use `error: any` (`backend/src/api/projects.ts:15-18`, `backend/src/api/projects.ts:35-38`, `backend/src/api/projects.ts:55-58`, `backend/src/api/projects.ts:78-84`, `backend/src/api/projects.ts:103-108`).

### Backend storage is unvalidated JSON file storage

`FileStorage.readJSON<T>()` parses arbitrary file JSON directly to `T` (`backend/src/storage/FileStorage.ts:28-38`) and `writeJSON<T>()` serializes arbitrary data (`backend/src/storage/FileStorage.ts:44-52`). `ProjectRepository.list()` trusts files as `ProjectDTO` and extracts metadata, logging and skipping unreadable files (`backend/src/storage/ProjectRepository.ts:27-47`). `ProjectRepository.update()` merges `Partial<ProjectDTO>` into an existing project and rewrites `updatedAt`, preserving id/createdAt (`backend/src/storage/ProjectRepository.ts:78-95`). This is a backend persistence path, but it is neither the frontend command-stream contract nor a validated shared contract.

### Backend tests validate the stale backend route, not frontend behavior

`backend/tests/integration/projects.spec.ts` tests `/api/projects` creation, loading, update, list, sort, and delete behavior (`backend/tests/integration/projects.spec.ts:39-342`). The tests assert backend DTO defaults such as `planes`, `hingeLines`, `elements2D`, `elements3D`, `dependencyGraph`, `processTree`, and `view2D` (`backend/tests/integration/projects.spec.ts:51-81`, `backend/tests/integration/projects.spec.ts:135-154`, `backend/tests/integration/projects.spec.ts:171-215`). They do not exercise frontend `ProjectService` command streams or the app-shell Drive flow.

## Evidence: frontend project metadata usage and import leak

`frontend/src/components/dialogs/OpenProjectDialog.vue` imports the runtime `projectService` and imports `ProjectMetadata` by reaching across the monorepo into backend implementation source: `import type { ProjectMetadata } from '../../../../backend/src/models/Project';` (`frontend/src/components/dialogs/OpenProjectDialog.vue:54-58`). It stores `projects` as `ProjectMetadata[]` (`frontend/src/components/dialogs/OpenProjectDialog.vue:68`) and calls `projectService.listProjects()` / `projectService.loadProject()` (`frontend/src/components/dialogs/OpenProjectDialog.vue:83-108`). Those methods do not exist on the current `frontend/src/services/ProjectService.ts`, which only exposes static command-stream serialization, validation, and deserialization (`frontend/src/services/ProjectService.ts:24-133`).

Search found no active source import of the component by component name; current app-shell UI renders `StartupDialog`, not `OpenProjectDialog` (`frontend/src/App.vue:1-16`, `frontend/src/App.vue:91-108`). Toolbar open-project emits to `runtime.actions.openProjectDialog` (`frontend/src/App.vue:26-32`), which only sets the StartupDialog visible (`frontend/src/application/appShell/AppShellRuntime.ts:137-145`, `frontend/src/application/appShell/ProjectSessionUseCases.ts:150-152`). Therefore the direct backend import leak is real in the source tree but appears attached to a dead dialog surface.

## Evidence: active frontend persistence and Wave 009 app-shell boundary

The active frontend persistence contract is command-stream based:

- `ProjectData` is `{ id, name, schemaVersion, created, modified, nextElementId, commands }` (`frontend/src/services/ProjectService.ts:11-19`).
- `serializeCommands()` snapshots committed commands and next element id (`frontend/src/services/ProjectService.ts:27-43`).
- `deserializeCommands()` validates, clears the command stack, restores `World` next id, replays operation descriptors through `deserializeOperation()`, restores committed commands, and repairs active plane if needed (`frontend/src/services/ProjectService.ts:45-78`).
- Validation rejects unsupported schema versions and malformed command descriptors (`frontend/src/services/ProjectService.ts:80-129`).

Wave 009 routed that contract through typed app-shell ports:

- `ProjectPersistencePort` has `serializeCommands`, `validateProjectData`, and `deserializeCommands` methods typed around `ProjectData` (`frontend/src/application/appShell/AppShellPorts.ts:24-28`).
- `createAppShellRuntime()` injects `ProjectService` as the default persistence port (`frontend/src/application/appShell/AppShellRuntime.ts:21-35`).
- Project/session use cases create, open, and autosave projects through Drive plus the persistence port, not backend HTTP (`frontend/src/application/appShell/ProjectSessionUseCases.ts:96-136`, `frontend/src/application/appShell/AutoSaveUseCases.ts:50-64`).
- `StartupDialog` emits file IDs from `GoogleDriveFile[]`, not backend project IDs or metadata (`frontend/src/components/dialogs/StartupDialog.vue:67-89`, `frontend/src/components/dialogs/StartupDialog.vue:103-109`).

This is consistent with Wave 004’s current-format-only command/undo persistence direction and inconsistent with backend `ProjectDTO`.

## Evidence: root/workspace scripts and validation debt

Root `package.json` still declares workspaces for both `frontend` and `backend` (`package.json:7-10`), but root `build`, `test`, and `lint` only delegate to the frontend workspace (`package.json:11-20`). Backend has its own `build` and `test` scripts (`backend/package.json:6-11`), but no lint script (`backend/package.json:6-11`). Frontend has `build`, `test`, `test:e2e`, and `lint` scripts (`frontend/package.json:6-15`).

Wave 009 validation classified the following as known pre-existing debt: missing `eslint`, Node 24 / `vue-tsc` incompatibility, broad frontend Vitest failures, TypeScript no-emit debt, and corrupted e2e specs, while backend build/test passed and preview/live smoke passed (`architecture-audit/cycle-009-app-shell-services/implementation-log.md`, “Validation and preview refresh — cycle-009-validation-and-preview-refresh”). Wave 010 proposals must still include mandatory validation attempts and classify these known failures separately from Wave 010-attributable contract regressions.

## Consistency with Wave 004 persistence contract

The current frontend code is aligned with the Wave 004 outcome: `ProjectService` uses typed command snapshots and operation descriptors instead of backend DTO migration/private-cast paths (`frontend/src/services/ProjectService.ts:11-133`). A backend-keep proposal must therefore make the backend store/serve this same `ProjectData` contract, not preserve or translate into stale `elements2D`/`processTree` DTOs. A backend-delete proposal is simpler and more consistent: retain the frontend `ProjectData`/Drive contract as the one active project persistence boundary and delete the disconnected backend project API.

## Consistency with Wave 009 app-shell runtime boundary

Wave 009 established `AppShellRuntime` as the runtime owner of `World`, `CommandStack`, persistence port, Drive port, startup dialog state, and project/session use cases (`frontend/src/application/appShell/AppShellRuntime.ts:21-153`). Wave 010 must not reintroduce project routing directly into `App.vue` or dead dialogs. If backend remains active, it should be introduced as a port adapter behind `AppShellRuntimePorts`, not as a component import or direct UI fetch path. If backend is deleted, no app-shell source change is needed except removing obsolete dead surfaces/imports that contradict the current runtime.

## Known validation/tooling debt to carry into proposals

- Root/frontend lint currently fails because `eslint` is missing, per Wave 009 validation logs.
- Root/frontend script build currently fails before source compilation because `vue-tsc` is incompatible with the current Node 24 environment, per Wave 009 validation logs.
- Full frontend/root Vitest currently has broad unrelated failures outside Wave 009; backend Vitest passed in Wave 009.
- Frontend Playwright/e2e cannot currently collect because of corrupted e2e spec syntax, per Wave 009 validation logs.

Wave 010 implementation validation must attempt the mandatory cadence and classify failures by attribution. Focused contract tests and static import scans should be expected to pass for the chosen backend stance.

## Scope boundaries for Wave 010

Included:

- Backend project models/API/storage/tests and backend package participation.
- Direct frontend backend-source import and dead/open-project dialog surface.
- App-shell persistence routing and frontend project persistence port alignment.
- Root/workspace scripts only as required by the chosen backend stance.
- Focused validation coverage for project contract/import boundaries.

Excluded unless directly required by the chosen stance:

- Wave 011 broad architecture-test/root-gate hardening beyond backend inclusion/deletion required by this contract decision.
- Wave 012 noisy debug/placeholder cleanup.
- Wave 013 broad docs/spec reconciliation. Only backend/project API docs/spec references made obsolete by the Wave 010 stance should be delete candidates.
