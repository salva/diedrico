# Wave 010 Decision — Backend/frontend project-contract architecture

**Stage:** `cycle-010-decision`  
**Wave:** 010 — Resolve backend/frontend project-contract architecture  
**Decision status:** convergence complete after review round 02  
**Blocking issues:** none remaining  
**Selected proposal:** `proposals/proposal-restructure.md`

## Artifacts cited

This decision is based on the reviewed Wave 010 artifact set:

- `architecture-audit/wave-plan.md`, Wave 010 entry: requires one explicit backend stance, deletion of the frontend backend-source import, and either deletion of the unused backend/project API or conversion to a real validated shared typed contract with root validation.
- `architecture-audit/cycle-010-backend-frontend-project-contract/scope-check.md`: confirms the premise still holds after Wave 009; active frontend project lifecycle uses `ProjectService`/`ProjectPersistencePort`/Drive through the app-shell runtime, while the backend exposes a disconnected stale `ProjectDTO` CRUD path.
- `architecture-audit/cycle-010-backend-frontend-project-contract/proposals/proposal-direct.md`: viable deletion-first proposal that removes stale backend project API/storage/tests and the dead frontend import leak.
- `architecture-audit/cycle-010-backend-frontend-project-contract/proposals/proposal-restructure.md`: preferred proposal that frames the architectural seam as the existing application project persistence contract, then selects deletion of the competing backend model.
- `architecture-audit/cycle-010-backend-frontend-project-contract/corrections-round-01-note.md`: records in-place corrections requiring stale backend-route e2e coverage to be deleted or replaced and requiring e2e/Playwright validation against the active app-shell/startup/open-project path.
- `architecture-audit/cycle-010-backend-frontend-project-contract/reviews/round-01-review.md`: found both proposals directionally correct but blocked on explicit handling of obsolete `frontend/tests/e2e/persistence.spec.ts` / `localhost:3000/api/projects` coverage.
- `architecture-audit/cycle-010-backend-frontend-project-contract/reviews/round-02-review.md`: declares **NO BLOCKING ISSUES**, accepts the corrections, and recommends `proposal-restructure.md`.

## Convergence decision

Review convergence is complete. Round 02 reports **NO BLOCKING ISSUES** after the proposals were corrected in place. The implementation stage must proceed from `proposal-restructure.md`.

The winning architecture decision is:

1. Treat the existing frontend command-stream `ProjectData` plus app-shell `ProjectPersistencePort` as the only active project persistence boundary for this wave.
2. Delete the backend `/api/projects` DTO/API/storage stack because it is not an adapter for that boundary and no current app-shell flow uses it.
3. Delete the frontend backend-source import leak by removing the stale/dead `OpenProjectDialog.vue` surface rather than preserving or wrapping it.
4. Add or update focused boundary tests/static checks so frontend code cannot import from `backend/src/**` and stale backend project route assumptions are not reintroduced.
5. Do not create a speculative shared backend contract package in Wave 010. A future backend may only return through a reviewed wave as a real adapter for the existing project contract, with runtime validation and root validation.

## Rejected/deferred alternatives

### Rejected: preserve the disconnected backend project API

Keeping the current backend `ProjectDTO`/`/api/projects`/file-storage path is rejected. The scope check shows it is a competing model with broad `any` fields, unvalidated JSON storage, and tests around stale DTO defaults, while active frontend persistence uses command-stream `ProjectData` through the app-shell runtime and Drive ports. Preserving that backend would violate Wave 010's target outcome and the project's no-backcompat/aggressive-deletion priorities.

### Deferred: shared typed backend project contract

A shared typed backend contract is architecturally acceptable only if the backend becomes a real validated adapter for the existing command-stream `ProjectData` contract. That path would require shared contract extraction, backend request/response validation, validated storage, frontend app-shell adapter tests, and root validation inclusion. It is deferred because no current app behavior needs backend HTTP project storage, and adding it now would broaden Wave 010 into unused feature infrastructure.

### Viable but not selected: `proposal-direct.md`

`proposal-direct.md` is viable and no longer blocked after corrections, but it is not selected because `proposal-restructure.md` better identifies the long-term seam: project persistence is an application contract, not a backend implementation detail. The implementation should still use the direct proposal's concrete deletion guidance where it matches the selected restructure decision.

## Binding implementation scope

The next implementation stage must stay within Wave 010's backend/frontend project-contract boundary.

### Source/test files likely to change or delete

- Delete or remove use of `backend/src/api/projects.ts`.
- Delete `backend/src/models/Project.ts`.
- Delete `backend/src/storage/FileStorage.ts`.
- Delete `backend/src/storage/ProjectRepository.ts`.
- Delete `backend/tests/integration/projects.spec.ts`.
- Update or delete `backend/src/server.ts` so `/api/projects` is not imported or mounted.
- Delete `frontend/src/components/dialogs/OpenProjectDialog.vue`.
- Add/update focused frontend architecture tests, likely under `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` or a nearby architecture-boundary spec, to forbid frontend imports from `backend/src/**` and stale project route assumptions.
- If `frontend/tests/e2e/persistence.spec.ts` exists in the implementation tree, delete it or replace it with active app-shell/startup/open-project/project-persistence coverage that does not call `localhost:3000/api/projects`. Round 02 notes this file appears absent already, so the implementation should not claim a fresh deletion if it is still absent; it must ensure the stale path is not reintroduced.
- Remove or update directly affected docs/spec/test fixtures that describe backend project CRUD/file storage as current behavior, limited to backend-project references made false by this wave. Candidate paths from the proposals include `specs/001-dihedral-learning-mvp/contracts/api.yaml`, `specs/001-dihedral-learning-mvp/quickstart.md`, `specs/001-dihedral-learning-mvp/research.md`, and `specs/001-dihedral-learning-mvp/plan.md` if those references remain.
- Root/package/workspace files may change only as required by the chosen backend stance: if deleting the project API leaves no meaningful active backend capability, delete the backend workspace and remove root workspace/package-lock references; if a backend remains for a proven current reason, ensure it is not preserving the stale project contract.

### Exact aggressive DELETE list

The implementation must delete or prove absent:

- The direct frontend import from `backend/src/models/Project`.
- `frontend/src/components/dialogs/OpenProjectDialog.vue`.
- `frontend/tests/e2e/persistence.spec.ts` as stale backend-route coverage, if present; otherwise keep it absent and do not reintroduce `localhost:3000/api/projects` e2e coverage.
- Backend project DTO/API/storage/test surfaces:
  - `backend/src/api/projects.ts`
  - `backend/src/models/Project.ts`
  - `backend/src/storage/FileStorage.ts`
  - `backend/src/storage/ProjectRepository.ts`
  - `backend/tests/integration/projects.spec.ts`
  - the `/api/projects` import/mount in `backend/src/server.ts`
- Backend workspace/package files if static search after route deletion shows no active non-project backend responsibility remains.
- Current-guidance docs/spec/test references to `/api/projects`, `localhost:3000/api/projects`, backend `ProjectDTO`, backend project metadata/list/load flow, or backend project file storage where those references would describe removed active behavior.

No compatibility shims, DTO adapters, or placeholder backend shells may be left behind merely to preserve the old path.

## Backend stance constraint

The selected stance is backend project API deletion. Backend project API/storage/tests are **not** retained.

If implementation discovers a genuine current non-project backend capability, it may keep only that capability after deleting all project-contract surfaces. It must not keep a disconnected stale backend project API, and it must document the current reason for any retained backend shell in `implementation-log.md`.

If implementers believe backend project capability must instead be retained, they must stop and request a mini-cycle. Retention is only consistent with this decision if backend project API/storage/tests are rebuilt behind a real shared typed and runtime-validated command-stream `ProjectData` contract, with focused backend contract/API/storage tests and root validation. That is not the selected Wave 010 implementation.

## Required validation for the implementation stage

Validation logs must be written under `architecture-audit/cycle-010-backend-frontend-project-contract/validation/` with stable stdout/stderr files.

### Focused checks expected to pass

- Static scan proving no frontend source/test imports `backend/src/**`.
- Static scan proving no active source/test/current docs retain `localhost:3000/api/projects` or stale backend-project route expectations.
- Static scan proving no `OpenProjectDialog` references remain.
- Focused architecture-boundary test forbidding frontend→backend implementation imports.
- Focused ProjectService persistence tests:
  - `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`
  - `frontend/tests/unit/services/ProjectService.selfContainment.spec.ts`
  - `frontend/tests/unit/services/ProjectService.subprocess.spec.ts`
  - include `frontend/tests/integration/projectService.determinism.spec.ts` and `frontend/tests/integration/projectService.cascadeDeletion.spec.ts` if still present and focused enough.
- Focused app-shell project flow tests, including `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts` and the updated boundary test.

### Mandatory cadence to attempt and log

- Root `npm run lint`.
- Frontend `npm run lint`.
- Backend lint only if backend remains and has a lint script; otherwise record not applicable because backend was deleted or no backend lint script exists.
- Focused Vitest for touched ProjectService/app-shell/boundary modules.
- Root `npm run test`.
- Frontend full `npm run test`.
- Backend `npm run test` only if backend remains; otherwise record not applicable due backend deletion.
- Root `npm run build`.
- Frontend `npm run build`.
- Backend `npm run build` only if backend remains; otherwise record not applicable due backend deletion.
- Frontend `npm run test:e2e`, because project open/save/startup behavior is user-facing. It must not rely on deleted backend `/api/projects` coverage.
- Playwright/live smoke for app load plus current app-shell startup/open-project affordance. With no Google credentials, verify no-credentials/local startup remains usable, no stale backend fetch expectations exist, and no `localhost:3000/api/projects` behavior is expected.
- Live preview refresh on `0.0.0.0`, reachability probe, and implementation-log entry documenting the refresh and probe result.

Known Wave 009 validation debt may be classified separately only when failures are unrelated to Wave 010. Import-boundary failures, stale backend route references, ProjectService/app-shell persistence regressions, or retained backend project-contract gaps are Wave 010-attributable and block completion.

## Accepted residual risks

1. **Backend workspace closure requires implementation-time search.** If removing `/api/projects` leaves only a health/server placeholder, deletion is preferred; if a current non-project backend reason exists, it must be documented and must not include stale project-contract code.
2. **Pre-existing validation debt remains.** Missing `eslint`, Node 24 / `vue-tsc` incompatibility, broad Vitest debt, and existing e2e corruption may still appear during mandatory validation and must be attributed honestly.
3. **Docs/spec cleanup can expand if not disciplined.** Implementation must delete directly false backend-project references but must not broaden into Wave 013 documentation reconciliation.
4. **Future backend needs are not blocked but must not revive stale DTOs.** Any future backend project storage must be introduced as a reviewed adapter for the active command-stream contract.

## Explicit exclusions

- Do not modify source code during this decision stage.
- Do not perform Wave 011 architecture-test/root-gate hardening except package/script changes directly required by the chosen backend deletion/retention stance and the focused Wave 010 import-boundary guard.
- Do not perform Wave 012 debug/placeholder cleanup except directly affected stale backend project references.
- Do not perform Wave 013 broad docs/spec reconciliation except directly affected backend-project API/storage references made false by this wave.
- Do not preserve compatibility shims, dual project persistence paths, old DTO adapters, disconnected backend tests, or a stale backend route hidden behind renamed files.
