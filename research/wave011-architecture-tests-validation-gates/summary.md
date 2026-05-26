# Wave 011 Research Summary — Architecture tests and validation gates

Access date: 2026-05-26. Sources are current repository files and command outputs only; no external web research was needed.

## Key findings

- Wave 011 can proceed without a wave-plan edit. Wave 010 deleted the backend workspace, and root `package.json` now lists only `frontend` in workspaces (`package.json:7-9`). Root `build`, `test`, and `lint` scripts delegate to frontend (`package.json:13-16`).
- Existing architecture tests are useful but too narrow/fragile:
  - `worldBoundary.spec.ts` checks only `World.ts` imports, not the whole domain (`frontend/tests/unit/architecture/worldBoundary.spec.ts:3-31`).
  - `deletedLegacyWorldStatePaths.spec.ts` protects deleted duplicate geometry/store surfaces (`frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts:3-12`, `frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts:40-50`).
  - `noCommandSubclasses.spec.ts` shells out to grep and can warn/pass on scanner failures (`frontend/tests/unit/architecture/noCommandSubclasses.spec.ts:24-51`, `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts:99-107`).
  - Wave 010 frontend/backend boundary rules live in `AppShellBoundary.test.ts` instead of the architecture directory (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:43-50`).
- Static scans found no current domain-to-command/service/application/UI/store/persistence imports.
- Static scans found a real residual UI-to-command leak: `ExamplesMenu.vue` imports `Command`, `AddExampleSetupOp`, and `CommandStack` (`frontend/src/components/menus/ExamplesMenu.vue:50-55`) and constructs/pushes a command from component code (`frontend/src/components/menus/ExamplesMenu.vue:70-75`). Proposal Direct records a temporary allowlist; Proposal Restructure deletes or moves this surface first.
- Validation debt remains from Wave 010: missing `eslint` despite the lint script (`frontend/package.json:15`, `frontend/package.json:25-39`), Node 24 / `vue-tsc` build failure, intersections unit failures, and broad e2e syntax corruption.
- Playwright config still contains stale commented backend server setup (`frontend/playwright.config.ts:46-53`), which should be deleted as part of truthful validation gates.

## Artifacts written

- `architecture-audit/cycle-011-architecture-tests-validation-gates/scope-check.md`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/proposals/proposal-direct.md`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/proposals/proposal-restructure.md`

## Raw scan logs

- `architecture-audit/cycle-011-architecture-tests-validation-gates/scout-line-evidence.stdout`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/static-scout-scans.stdout`
- `architecture-audit/cycle-011-architecture-tests-validation-gates/boundary-source-excerpts.stdout`
