# Wave 010 Corrections Round 01 Note

**Stage:** `cycle-010-corrections-round-01`  
**Source review:** `architecture-audit/cycle-010-backend-frontend-project-contract/reviews/round-01-review.md`  
**Edited artifacts:**
- `architecture-audit/cycle-010-backend-frontend-project-contract/proposals/proposal-direct.md`
- `architecture-audit/cycle-010-backend-frontend-project-contract/proposals/proposal-restructure.md`

No application source files were edited in this corrections task.

## Blocker 1 — Explicitly handle obsolete frontend e2e persistence spec

**Reviewer blocker:** Both proposals must add `frontend/tests/e2e/persistence.spec.ts` to the delete-or-replace list because it targets `localhost:3000/api/projects` and stale backend DTO behavior instead of the active app-shell/Drive `ProjectData` flow.

**Edits made in `proposal-direct.md`:**
- Added the target outcome that obsolete e2e coverage for the removed backend `/api/projects` contract is deleted or replaced with active app-shell/startup/open-project/project-persistence coverage.
- Renamed the frontend cleanup section to “Delete frontend import leak/dead dialog and obsolete e2e backend-path coverage.”
- Added `frontend/tests/e2e/persistence.spec.ts` to the section's delete-or-replace constraints, with the reason that it targets `localhost:3000/api/projects` and stale backend DTO behavior.
- Added `frontend/tests/e2e/persistence.spec.ts` to the explicit DELETE list as a delete-or-rewrite item.
- Expanded stale docs/spec/test fixture cleanup to include current-guidance references to `localhost:3000/api/projects`, `/api/projects`, backend `ProjectDTO`, backend file storage, and the old backend metadata/list/load project flow.

**Edits made in `proposal-restructure.md`:**
- Added the recommended target outcome that obsolete e2e coverage for `localhost:3000/api/projects` is deleted or replaced with active app-shell/startup/open-project/project-persistence coverage.
- Renamed the stale frontend cleanup section to “Delete stale frontend surface and obsolete backend-path e2e coverage.”
- Added `frontend/tests/e2e/persistence.spec.ts` to the delete-or-replace constraints, with the reason that it validates the stale backend DTO path instead of `ProjectPersistencePort`/Drive/app-shell flows.
- Added `frontend/tests/e2e/persistence.spec.ts` to the explicit DELETE list as a delete-or-rewrite item.
- Expanded stale docs/spec/test fixture cleanup to include retained references to `localhost:3000/api/projects`, `/api/projects`, backend `ProjectDTO`, and backend file storage.

## Blocker 2 — Tie validation plan to deletion/replacement

**Reviewer blocker:** Corrected proposals must state that e2e/Playwright validation for Wave 010 covers active startup/open-project behavior and must not rely on the deleted backend `/api/projects` path.

**Edits made in `proposal-direct.md`:**
- Added a focused static validation item requiring no `localhost:3000/api/projects` or stale backend-project e2e paths in active tests, and requiring `frontend/tests/e2e/persistence.spec.ts` to be absent or rewritten around active app-shell/startup/open-project behavior.
- Updated mandatory `npm run test:e2e` language to require the active app-shell/startup/open-project/project-persistence path and forbid reliance on the deleted backend `/api/projects` spec.
- Added Playwright/live smoke requirements for current app-shell startup/open-project behavior, no stale backend fetch errors, and no `localhost:3000/api/projects` expectation.
- Clarified that the stale backend-route e2e spec is Wave 010-attributable and cannot be carried forward as unrelated pre-existing e2e debt.

**Edits made in `proposal-restructure.md`:**
- Added stale-route scan language requiring no retained `localhost:3000/api/projects` e2e tests and requiring `frontend/tests/e2e/persistence.spec.ts` to be absent or rewritten around active app-shell/startup/open-project behavior.
- Updated mandatory `npm run test:e2e` language to require active app-shell/startup/open-project/project-persistence behavior and forbid dependence on the deleted backend `/api/projects` test path.
- Added Playwright/live smoke requirements for current app-shell startup/open-project behavior, no stale backend fetch errors, and no expectation that `localhost:3000/api/projects` exists.
- Clarified that the stale backend-route e2e spec is Wave 010-attributable and must be deleted or replaced, not classified as unrelated validation debt.

## Scope-boundary preservation

Both corrected proposals keep Wave 010 bounded to backend/frontend project-contract resolution:

- The preferred stance remains deletion of the disconnected backend project API and dead frontend backend-source import leak.
- If backend/shared-contract capability is retained instead, both proposals still require focused backend contract/API/storage validation in Wave 010.
- Validation-gate hardening remains deferred to Wave 011 except where backend deletion/retention directly determines which workspace commands must run.
- Broad docs cleanup remains deferred to Wave 013 except for stale backend-project references that would be false after the Wave 010 backend stance is implemented.
