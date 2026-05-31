# Wave 010 Review — Round 01

**Stage:** `cycle-010-review-round-01`  
**Wave:** `cycle-010-backend-frontend-project-contract`  
**Artifacts reviewed:**
- `architecture-audit/cycle-010-backend-frontend-project-contract/scope-check.md`
- `architecture-audit/cycle-010-backend-frontend-project-contract/proposals/proposal-direct.md`
- `architecture-audit/cycle-010-backend-frontend-project-contract/proposals/proposal-restructure.md`
- `architecture-audit/wave-plan.md`

**Code/evidence checked:**
- `backend/src/models/Project.ts`
- `backend/src/api/projects.ts`
- `backend/src/server.ts`
- `backend/package.json`
- `package.json`
- `frontend/src/components/dialogs/OpenProjectDialog.vue`
- `frontend/src/services/ProjectService.ts`
- `frontend/src/application/appShell/AppShellPorts.ts`
- `frontend/src/application/appShell/ProjectSessionUseCases.ts`
- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
- `frontend/tests/e2e/persistence.spec.ts`
- repo search log: `architecture-audit/cycle-010-backend-frontend-project-contract/validation/review-rg.stdout.log`

## Summary

**BLOCKING ISSUES**

Both proposals correctly identify the core architectural reality from the scope check: the active project persistence boundary is frontend command-stream `ProjectData` via `ProjectPersistencePort` and Drive/app-shell flows, while the backend `/api/projects` stack is a disconnected stale DTO path and `OpenProjectDialog.vue` is a dead frontend surface with a direct backend implementation import (`scope-check.md`; `frontend/src/services/ProjectService.ts`; `frontend/src/application/appShell/ProjectSessionUseCases.ts`; `frontend/src/components/dialogs/OpenProjectDialog.vue`; `backend/src/models/Project.ts`; `backend/src/api/projects.ts`).

Both proposals also correctly state that any retained-backend/shared-contract alternative must become a real validated boundary with explicit backend/root validation, not a preserved stale server.

However, both proposals miss one required in-place correction before decision: they do not explicitly delete or replace the still-present frontend e2e spec that targets the stale backend `/api/projects` contract. That leaves behind a direct test artifact for the disconnected backend path they are proposing to remove, which conflicts with the wave's aggressive-deletion priority and would create immediate validation/doc drift after implementation.

## Proposal scoring

### proposal-direct.md

| Criterion | Score | Notes |
|---|---:|---|
| 1. Advances target outcome | 5/5 | Strongly aligned: deletes stale backend DTO/API/storage/tests and dead frontend dialog import leak. |
| 2. Improves architecture/code quality | 4/5 | Clear simplification and deletion-first stance. Would be stronger with explicit stale e2e deletion and a concrete architecture guard test. |
| 3. Respects no-backcompat/aggressive deletion | 5/5 | Best fit to project priorities; prefers deleting disconnected surfaces over preserving them. |
| 4. Avoids overfeaturism | 5/5 | Avoids inventing a shared contract/backend path without current product usage. |
| 5. Introduced risks/hidden regressions | 3/5 | Main hidden risk is incomplete cleanup: obsolete frontend e2e spec still targets `/api/projects`; backend-workspace retention criteria are slightly under-specified. |
| 6. Validation sufficiency | 4/5 | Good focused validation, and correctly requires backend validation if backend is retained. Missing explicit cleanup/validation of obsolete e2e coverage tied to removed backend path. |

**Recommendation:** Preferred direction after correction.

### proposal-restructure.md

| Criterion | Score | Notes |
|---|---:|---|
| 1. Advances target outcome | 5/5 | Correctly reframes the higher-level question as the persistence boundary, then still lands on deletion of the stale backend path. |
| 2. Improves architecture/code quality | 5/5 | Best articulation of the true boundary (`ProjectPersistencePort` + `ProjectData`) and why backend DTOs are a competing model. |
| 3. Respects no-backcompat/aggressive deletion | 5/5 | Strong deletion-first stance; properly rejects speculative shared-contract work for an unused server path. |
| 4. Avoids overfeaturism | 4/5 | Slightly broader than direct because it discusses optional contract-promotion churn, but recommendation remains disciplined. |
| 5. Introduced risks/hidden regressions | 3/5 | Same hidden cleanup gap: obsolete frontend e2e spec for `/api/projects` is not named in files-to-change/delete list. |
| 6. Validation sufficiency | 4/5 | Good architecture-boundary validation and strong retained-backend requirements. Still missing explicit stale e2e removal/replacement. |

**Recommendation:** Architecturally strongest framing after correction.

## Required blocker corrections

1. **Explicitly handle obsolete frontend e2e persistence spec.** Both proposals must add `frontend/tests/e2e/persistence.spec.ts` to the delete-or-replace list, because it still targets `localhost:3000/api/projects` and stale backend DTO behavior rather than the active app-shell/Drive `ProjectData` flow. This artifact was already identified as obsolete in Wave 004 review history and remains present now. Leaving it unnamed would preserve a disconnected stale backend test path after this wave.
2. **Tie validation plan to that deletion/replacement.** The corrected proposal should state that e2e/Playwright validation for Wave 010 must cover the active startup/open project flow and must not rely on the deleted backend `/api/projects` test path.

## Specific assessment of the backend decision

- **Delete-backend stance:** justified by current code evidence. The frontend active path uses `ProjectService` command-stream persistence and Drive/app-shell flows, not backend HTTP (`frontend/src/services/ProjectService.ts`; `frontend/src/application/appShell/ProjectSessionUseCases.ts`). The only frontend/backend coupling found is the dead `OpenProjectDialog.vue` type import from backend implementation source. The backend DTO/API is therefore stale and disconnected.
- **Retain-backend/shared-contract stance:** only acceptable if it becomes a real boundary with shared typed contract plus backend API/storage validation. Both proposals state this correctly. I agree that such a path would require focused backend tests for request validation, storage round-trip validation, and root/workspace validation inclusion, and is not justified by present runtime evidence.
- **Disconnected stale backend preservation:** not acceptable. Any decision that keeps the current `ProjectDTO` + `/api/projects` path without converting it to the active command-stream contract would fail the wave objective.

## Recommendation

**Recommended winner after in-place correction:** `proposal-restructure.md`.

Reason: it most clearly identifies the actual architectural seam — the application persistence contract — while still concluding that the right Wave 010 action is deletion of the stale competing backend path. `proposal-direct.md` is also viable after the same correction and may produce a simpler implementation plan, but `proposal-restructure.md` provides the clearest guard against future reintroduction of a second disconnected project model.

## Verification notes

- Confirmed backend mounts `/api/projects` in `backend/src/server.ts`.
- Confirmed backend `ProjectDTO` is broad and stale relative to frontend `ProjectData`.
- Confirmed `OpenProjectDialog.vue` imports `ProjectMetadata` from `backend/src/models/Project` and calls nonexistent `projectService.listProjects()` / `loadProject()` methods, reinforcing that it is dead/stale.
- Confirmed current app-shell project flows go through `ProjectPersistencePort` and Drive-backed session use cases.
- Confirmed current `AppShellBoundary.test.ts` does **not yet** enforce the frontend→backend import rule proposed for this wave.
- Confirmed repo still contains `frontend/tests/e2e/persistence.spec.ts` targeting stale backend `/api/projects`, so proposals must explicitly clean it up.

