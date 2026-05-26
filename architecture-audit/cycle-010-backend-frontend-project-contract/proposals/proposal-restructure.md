# Wave 010 Proposal Restructure — Make project persistence an explicit application contract, then choose delete-backend as the higher-level stance

## Summary

This proposal evaluates whether the right fix sits one conceptual layer higher than deleting files: the architecture needs a single project persistence contract owned by application/shared contract code, with concrete storage adapters behind it. On inspection, the current code already has a strong frontend-side application contract from Wave 004 and Wave 009: command-stream `ProjectData` plus `ProjectPersistencePort`. The backend’s `ProjectDTO` is not a storage adapter for that contract; it is a competing project model.

Therefore the higher-level restructuring decision should be:

1. Promote the existing frontend `ProjectData`/`ProjectPersistencePort` contract as the only active project persistence boundary for now.
2. Delete the backend project API rather than retrofit a server boundary that no current app-shell flow uses.
3. Add focused architecture/contract tests that prevent future frontend→backend implementation imports and disconnected project contracts.

A reviewed alternative could keep backend by moving `ProjectData` into a shared contract package and making the backend store/serve that schema. This proposal documents that option but recommends against it because it introduces a server boundary, HTTP adapter, validation layer, and root-gate work without current product usage.

## Higher-level architecture question

Wave 010 asks whether to delete unused backend/project API, establish a shared typed contract, or take another stance. The answer from current code is:

- **The active boundary is already an application persistence port.** `ProjectPersistencePort` is typed in app-shell ports and wraps `ProjectData` serialization/validation/deserialization (`frontend/src/application/appShell/AppShellPorts.ts:24-28`). `AppShellRuntime` injects `ProjectService` as the default implementation (`frontend/src/application/appShell/AppShellRuntime.ts:21-35`).
- **The active storage adapter is Google Drive.** Project/session and autosave use the Drive port to create/load/update files containing `ProjectData` (`frontend/src/application/appShell/ProjectSessionUseCases.ts:96-136`, `frontend/src/application/appShell/AutoSaveUseCases.ts:50-64`).
- **The backend is not an adapter for that boundary.** It exposes `/api/projects` over a separate `ProjectDTO` shape (`backend/src/models/Project.ts:6-52`) and unvalidated file repository (`backend/src/storage/ProjectRepository.ts:27-95`).
- **The frontend import leak is not a valid shared contract.** `OpenProjectDialog.vue` imports `ProjectMetadata` from backend implementation source (`frontend/src/components/dialogs/OpenProjectDialog.vue:54-58`) but the component appears unused by current `App.vue`, which renders `StartupDialog` (`frontend/src/App.vue:1-16`, `frontend/src/App.vue:91-108`).

## Recommended target outcome

- `frontend/src/services/ProjectService.ts` remains the current command-stream project contract implementation.
- App-shell project lifecycle continues to depend on `ProjectPersistencePort` and `DrivePort`, not backend implementation files or direct HTTP fetches.
- Backend project DTO/API/storage/tests are deleted as a non-adapter competing model.
- A focused architecture test forbids frontend imports from `backend/src/**`.
- If a backend is needed in a future product wave, it must be introduced as a true adapter for the existing project contract, not revived from stale DTOs.

## Alternative considered: shared typed backend contract

A keep-backend restructuring would require all of the following:

- Create a shared contract module/package, for example `shared/project-contract` or `specs/contracts` generated types, containing `ProjectData`, `SerializedCommand`, operation descriptor union references, `ProjectMetadata`, and runtime validators.
- Move or duplicate-free factor the frontend `ProjectData` type out of `frontend/src/services/ProjectService.ts` into that shared contract.
- Change backend models from `ProjectDTO` to the shared command-stream `ProjectData` contract, deleting `elements2D`, `elements3D`, `dependencyGraph`, `planes`, `hingeLines`, `view2D`, `processTree`, and `commandHistory` as standalone backend DTO fields.
- Add backend runtime validation of request bodies and stored JSON, not just TypeScript interfaces.
- Add an app-shell backend project adapter behind a new port if backend is meant to be user-facing, with frontend tests proving create/open/save use it in a supported deployment mode.
- Add root validation scripts covering backend build/test and any shared package.

This would satisfy Wave 010 only if the backend becomes a real active boundary. It is not recommended for this wave because current app behavior is Drive-based, no frontend source fetches `/api/projects`, and adding a second storage adapter now would broaden scope toward product feature work rather than architectural deletion.

## Files to change for recommended restructuring

### Contract/application boundary cleanup

- `frontend/src/services/ProjectService.ts`: leave public contract intact unless tests need exporting `ProjectData` from a narrower local contract file. Do not move it to a shared package unless backend is retained.
- `frontend/src/application/appShell/AppShellPorts.ts`: keep `ProjectPersistencePort` as the app-shell boundary. Optionally add a boundary comment naming it the single active project persistence contract if implementation touches this file for tests; otherwise avoid source churn.
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` or a new focused architecture spec: add/adjust assertions that no frontend source imports from `backend/src` and no active component imports `OpenProjectDialog`.

### Delete stale backend/project surfaces

- Delete `backend/src/api/projects.ts`.
- Delete `backend/src/models/Project.ts`.
- Delete `backend/src/storage/FileStorage.ts`.
- Delete `backend/src/storage/ProjectRepository.ts`.
- Delete `backend/tests/integration/projects.spec.ts`.
- Remove `/api/projects` from `backend/src/server.ts`, or delete the backend workspace if no active backend capability remains.

### Delete stale frontend surface

- Delete `frontend/src/components/dialogs/OpenProjectDialog.vue`.

### Package/root stance

- If backend becomes empty/useless after deleting project API, delete backend workspace and remove it from root `workspaces`.
- If backend health remains for an explicit current reason, keep backend package but add root scripts needed to build/test backend for the retained active backend. Do not perform general root-gate hardening beyond this stance; Wave 011 owns broad validation-gate cleanup.

### Directly affected docs/specs

Delete or mark obsolete only references that describe backend project API/file storage as current behavior:

- `specs/001-dihedral-learning-mvp/contracts/api.yaml` project routes/metadata.
- `specs/001-dihedral-learning-mvp/quickstart.md` backend data/project references.
- `specs/001-dihedral-learning-mvp/research.md` `/api/projects` backend storage snippets.
- `specs/001-dihedral-learning-mvp/plan.md` output references to `backend/src/api/projects.ts`.

## Explicit DELETE list

- Direct frontend import from `backend/src/models/Project` by deleting `frontend/src/components/dialogs/OpenProjectDialog.vue`.
- Backend project DTO fields and `any` contracts by deleting `backend/src/models/Project.ts` instead of migrating them.
- Backend project CRUD routes/storage/repository/tests listed above.
- Root workspace/backend package references if backend has no active non-project responsibility.
- Stale backend-project docs/spec references made false by the deletion.

## Expected behavior change

- Frontend user behavior should remain equivalent for startup, create/open project, autosave, and persistence because those flows use `StartupDialog`, Drive, and `ProjectService` today.
- The stale backend `/api/projects` feature disappears. This is intentional architectural behavior change: project persistence has one active boundary.
- Future contributors get a clearer rule: backend code cannot be treated as a type-only shared package by frontend components.

## Validation plan

### Focused tests/scans expected to pass

- Add/update focused architecture test forbidding frontend imports from `backend/src/**`.
- Static scan for forbidden imports:
  - `grep -R "backend/src" frontend/src frontend/tests` should produce no active references.
- Static scan for stale backend route references:
  - no `/api/projects` in retained source/tests/current docs except historical notes intentionally deleted or marked obsolete.
- Focused project persistence tests:
  - `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`
  - `frontend/tests/unit/services/ProjectService.selfContainment.spec.ts`
  - `frontend/tests/unit/services/ProjectService.subprocess.spec.ts`
  - `frontend/tests/integration/projectService.determinism.spec.ts`
  - `frontend/tests/integration/projectService.cascadeDeletion.spec.ts`
- Focused app-shell project flow tests:
  - `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
  - `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`

### Mandatory validation cadence

- `npm run lint` at root.
- `npm run lint` from `frontend/`.
- Backend lint only if retained and script exists.
- Focused Vitest commands above.
- Full `npm run test` at root.
- Full `npm run test` from `frontend/`.
- Backend `npm run test` only if backend remains; not applicable if deleted.
- `npm run build` at root.
- `npm run build` from `frontend/`.
- Backend `npm run build` only if backend remains; not applicable if deleted.
- `npm run test:e2e` from `frontend/`, because project open/save UX is touched by deletion of obsolete project surfaces.
- Live preview refresh on `0.0.0.0`, reachability probe, and live smoke for app load plus project/startup dialog affordance. If no Google credentials are configured, smoke should verify no-credentials local startup and absence of backend fetch errors.

### Required validation for the shared typed backend-contract alternative

If review selects the alternative that retains backend project capability through a shared typed contract, implementation must add and pass explicit focused backend contract/API validation. This is part of Wave 010, not deferrable to Wave 011:

- Shared contract tests proving the single exported `ProjectData`/metadata/serialized-command schema and runtime validators are consumed by both frontend and backend, with no duplicate backend `ProjectDTO` schema or frontend-only contract copy.
- Backend request/response validation tests covering valid command-stream project payloads and invalid payloads: unsupported `schemaVersion`, missing `nextElementId`, malformed command descriptors, invalid metadata, unknown stale DTO fields, and corrupt stored JSON.
- Backend API integration tests for every retained project endpoint (`POST`, `GET`, update, list, delete) using the shared contract; each test must assert the HTTP response body is the shared contract/metadata shape and not the deleted `elements2D`/`elements3D`/`dependencyGraph`/`planes`/`hingeLines`/`view2D`/`processTree` DTO shape.
- Backend storage adapter tests proving persisted JSON round-trips through the shared validator on both read and write, rejects/quarantines obsolete files, and never casts arbitrary JSON to TypeScript interfaces.
- Frontend app-shell adapter tests, if backend storage becomes user-facing, proving project create/open/save/autosave are routed through `ProjectPersistencePort`/an explicit backend adapter and that Vue components do not import backend implementation files.
- Required commands for this retained-backend path: focused backend Vitest for contract/API/storage, backend full `npm run test`, backend `npm run build`, shared-package type/build tests if a package is introduced, root `npm run test`/`npm run build` including the chosen workspace set, and the frontend focused ProjectService/app-shell tests listed above.

A shared-contract/backend-retained implementation is incomplete unless these backend API and storage validation checks exist and pass, even if the import leak is removed.

### Known pre-existing validation debt

Use Wave 009 classifications for failures unrelated to Wave 010: missing `eslint`, Node 24/`vue-tsc` incompatibility, broad frontend/root Vitest debt, TypeScript no-emit debt, and corrupted e2e specs. Focused import-boundary/project-contract tests must pass; failures there are Wave 010-attributable.

## Risks

- **Risk: backend deletion is too aggressive if hidden external clients use `/api/projects`.** Project objectives explicitly assign zero weight to backward compatibility and on-disk/source tree is the sole authority; no current frontend usage was found.
- **Risk: leaving backend health server after deleting projects creates a new placeholder.** Prefer deleting the backend workspace unless current source proves health/server is actively needed.
- **Risk: shared-contract alternative is architecturally cleaner for a future multi-client backend.** It is overbuilt for current evidence and would preserve/add a backend path without user-facing integration; defer until a future wave with a concrete backend requirement.
- **Risk: docs/spec cleanup grows too large.** Keep this wave limited to direct backend project API references; leave broad documentation reconciliation to Wave 013.

## Why this is the restructuring answer

The conceptual layer above backend files is “project persistence boundary.” That boundary already exists in the frontend application layer after Waves 004 and 009. The backend is not the boundary; it is a stale competing implementation. The cleanest architecture is to delete the competing model now and prevent the import leak with a focused architecture test, rather than create a shared package and HTTP adapter for an unused server path.
