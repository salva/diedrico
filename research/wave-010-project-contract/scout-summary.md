# Wave 010 project-contract scout summary

**Date:** 2026-05-26  
**Task:** `t1-scout-wave-010-contract`  
**Stage:** `cycle-010-fresh-scout-proposals`

## Executive summary

The current source tree still has a disconnected backend project CRUD/file-storage architecture and a frontend source import leak into backend models. After Wave 009, active frontend project lifecycle is routed through `AppShellRuntime`, `ProjectPersistencePort`, Google Drive ports, and frontend `ProjectService` command-stream persistence. The backend `ProjectDTO` is a stale parallel shape, not a shared contract.

Recommended proposal: delete the unused backend project API/storage/model/tests and delete the dead `OpenProjectDialog.vue` import leak. If backend is kept, it must be rebuilt as a real validated adapter around the Wave 004 `ProjectData` command-stream contract and included in root validation; current evidence does not justify that scope.

## Key artifacts written

- `architecture-audit/cycle-010-backend-frontend-project-contract/scope-check.md`
- `architecture-audit/cycle-010-backend-frontend-project-contract/proposals/proposal-direct.md`
- `architecture-audit/cycle-010-backend-frontend-project-contract/proposals/proposal-restructure.md`

## Main evidence

- Backend DTO has broad `any` fields and a different model from frontend persistence: `backend/src/models/Project.ts:6-52`.
- Backend route/storage accepts and stores unvalidated JSON/partial DTOs: `backend/src/api/projects.ts:65-77`, `backend/src/storage/FileStorage.ts:28-52`, `backend/src/storage/ProjectRepository.ts:78-95`.
- Active frontend `ProjectData` is command-stream schema version `6.0.0`: `frontend/src/services/ProjectService.ts:11-133`.
- Wave 009 app-shell injects `ProjectService` through `ProjectPersistencePort`: `frontend/src/application/appShell/AppShellPorts.ts:24-28`, `frontend/src/application/appShell/AppShellRuntime.ts:21-35`.
- Project create/open/autosave uses Drive plus persistence port, not backend HTTP: `frontend/src/application/appShell/ProjectSessionUseCases.ts:96-136`, `frontend/src/application/appShell/AutoSaveUseCases.ts:50-64`.
- Direct frontend backend import remains only in stale `OpenProjectDialog.vue`: `frontend/src/components/dialogs/OpenProjectDialog.vue:54-58`.
- Current `App.vue` renders `StartupDialog`, not `OpenProjectDialog`: `frontend/src/App.vue:1-16`, `frontend/src/App.vue:91-108`.
- Root scripts still skip backend even though root workspaces list frontend/backend: `package.json:7-20`.

## Validation/debt notes for implementer

Wave 009 validation already classified missing `eslint`, Node 24/`vue-tsc` failure, broad frontend/root Vitest failures, TypeScript no-emit debt, and corrupted e2e specs as pre-existing. Wave 010 implementation should still attempt the mandatory cadence and require focused import-boundary/project-contract tests and static scans to pass.
