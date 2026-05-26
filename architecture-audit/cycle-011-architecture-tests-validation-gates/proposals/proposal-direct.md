# Wave 011 Proposal Direct — Centralize import-boundary tests and make validation gates truthful

## Summary

Implement Wave 011 as a focused architecture-test and script hardening wave. Keep application source behavior unchanged. Consolidate current architecture checks under `frontend/tests/unit/architecture/`, add shared scanner helpers, promote the Wave 010 frontend/backend guards out of app-shell tests, add missing import-boundary rules for the full domain and UI layers, and make package validation commands/reporting reflect the single active frontend workspace after backend deletion.

This proposal intentionally does **not** delete `ExamplesMenu.vue` or debug/example operations. Instead, it adds a named temporary allowlist for that single residual UI-to-operation violation so the architecture gate is truthful today while making the exception visible and removable in Wave 012.

## Evidence driving the proposal

- Root workspaces now include only `frontend` (`package.json:7-9`), so root build/test/lint delegation to `--workspace=frontend` is structurally correct after Wave 010 (`package.json:13-16`).
- Frontend lint currently invokes `eslint` (`frontend/package.json:15`) but `eslint` is not present in frontend dev dependencies (`frontend/package.json:25-39`), causing known lint debt from Wave 010.
- Current architecture tests include a narrow `World.ts`-only domain import check (`frontend/tests/unit/architecture/worldBoundary.spec.ts:3-31`), a deleted legacy path string scan (`frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts:3-12`, `frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts:40-50`), and a shell/grep-based no-command-subclasses test that can warn-and-pass on tool failures (`frontend/tests/unit/architecture/noCommandSubclasses.spec.ts:24-51`, `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts:99-107`).
- Wave 010 backend guards currently live in an app-shell unit test (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:43-50`) rather than the architecture test directory.
- The only active frontend/backend project API strings are guard strings in the focused Wave 010 e2e test (`frontend/tests/e2e/wave010-app-shell-project-flow.spec.ts:7-21`), which should be allowlisted as negative-test evidence.
- A direct UI command/operation leak remains in `ExamplesMenu.vue`: imports (`frontend/src/components/menus/ExamplesMenu.vue:50-55`) and command construction/push (`frontend/src/components/menus/ExamplesMenu.vue:70-75`). Treat as a visible Wave 012/debug-example residual rather than silently ignoring it.
- Playwright config still contains stale backend webServer comments (`frontend/playwright.config.ts:46-53`) even though the backend was deleted.

## Files to change

### Test/helper changes

- Add `frontend/tests/unit/architecture/helpers/sourceScanner.ts` (or equivalent) with deterministic Vitest-native helpers:
  - enumerate text files under `src/` and `tests/` for `.ts`, `.tsx`, `.vue`, `.js`, `.mjs`, `.cjs`;
  - normalize project-relative paths;
  - extract static import lines and full raw text;
  - support explicit allowlists with comments/reasons.
- Replace `frontend/tests/unit/architecture/worldBoundary.spec.ts` with broader domain-layer boundary coverage:
  - fail on any `frontend/src/domain/**` import from `@/commands`, `@/application`, `@/services`, `@/components`, `@/stores`, or persistence modules;
  - allow domain-to-domain/presentation/calculation/processTree imports where already established;
  - keep an explicit `World.ts` assertion as a named case.
- Replace/refactor `frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts` to use the shared scanner while keeping the same deleted duplicate-geometry terms from lines 3-12 of the current test.
- Replace/refactor `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts` to remove `execSync`/`grep` and warning-pass behavior. Use the shared scanner and fail deterministically on production `extends Command` matches, while preserving the source documentation check if still useful.
- Add `frontend/tests/unit/architecture/importBoundaries.spec.ts` (or split files) covering:
  - UI components (`frontend/src/components/**`) must not import `@/commands/**`, concrete operation classes, or command stack implementation;
  - active exceptions: `frontend/src/components/menus/ExamplesMenu.vue` as a named temporary residual for Wave 012, and no broad glob exceptions;
  - application layer may import commands/operations as the current command-construction boundary;
  - frontend source/tests must not import `backend/src/**`;
  - stale backend project API route/DTO/dialog terms are forbidden except in the focused negative e2e guard file.
- Trim `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` so it keeps app-shell-specific runtime/UI assertions (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:25-40`) but no longer owns generic frontend/backend architecture rules.

### Package/script/config changes

- Root `package.json`:
  - keep `workspaces: ["frontend"]` and root `lint`/`test`/`build` delegation to frontend (`package.json:7-16`);
  - add focused architecture script aliases, e.g. `test:architecture` -> `npm run test:architecture --workspace=frontend`, if selected by implementation.
- `frontend/package.json`:
  - add `test:architecture` script, e.g. `vitest run tests/unit/architecture`;
  - add/fix lint dependencies and config only if implementation chooses to turn lint from known red to executable within Wave 011. Because `eslint` is currently referenced but missing (`frontend/package.json:15`, `frontend/package.json:25-39`), a minimal local ESLint configuration/dependency addition is within scope if it is required for truthful gates.
  - do not add backend scripts because backend is no longer active.
- `frontend/playwright.config.ts`:
  - delete stale commented backend webServer block (`frontend/playwright.config.ts:46-53`) because it points to a deleted workspace and makes validation setup misleading.

### Optional validation-debt classification artifact

- Add `architecture-audit/cycle-011-architecture-tests-validation-gates/validation-debt.md` or include in implementation log:
  - lint: missing ESLint dependency/config if not fully remediated;
  - build: Node 24 / `vue-tsc` incompatibility;
  - Vitest: pre-existing intersections failures;
  - e2e: corrupted broad e2e specs;
  - focused architecture gates: expected to pass after implementation.

## Files/tests/fixtures to DELETE

- Delete or fully replace the old shell-driven `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts` implementation if a new deterministic test supersedes it. Do not keep a wrapper that still shells out and warning-passes.
- Delete duplicated generic backend-boundary assertions from `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` after moving them to architecture tests.
- Delete stale commented backend webServer block in `frontend/playwright.config.ts` (`frontend/playwright.config.ts:46-53`).
- Delete any obsolete architecture-test helper/fixture created only for pre-refactor paths if discovered during implementation. Do not preserve compatibility shims.

## Expected behavior change

- User-visible behavior: none.
- Developer/validation behavior:
  - architecture tests fail immediately on domain-to-command/service/application/UI/store leaks across the entire domain, not only `World.ts`;
  - architecture tests fail on new UI components importing command/operation/CommandStack surfaces, while the existing `ExamplesMenu.vue` leak is a documented temporary allowlist;
  - architecture tests fail on frontend imports of deleted backend implementation files and stale backend project API assumptions;
  - root/frontend scripts provide a direct focused architecture-test gate;
  - stale backend validation comments are gone.

## Validation plan

Capture logs under `architecture-audit/cycle-011-architecture-tests-validation-gates/validation/`.

1. Static pre/post scans:
   - domain import scan for commands/application/services/components/stores/persistence;
   - UI import scan for commands/operations/CommandStack with allowlist verification;
   - frontend backend-source/API string scan with negative e2e guard allowlist.
2. Focused architecture tests:
   - `npm run test:architecture --workspace=frontend` (or direct `npx vitest run tests/unit/architecture`).
3. Focused app-shell boundary tests after moving generic rules:
   - `npx vitest run tests/unit/application/appShell/AppShellBoundary.test.ts tests/unit/application/appShell/KeyboardShortcutRouter.test.ts`.
4. Root and frontend mandatory cadence:
   - `npm run lint` at root and `npm run lint --workspace=frontend`; if still red, classify with exact cause and whether Wave 011 remediates it;
   - `npm run test` at root and frontend full Vitest; expected pre-existing intersections failures unless fixed by a chosen validation-debt remediation within scope;
   - `npm run build` at root and frontend; expected pre-existing Node 24 / `vue-tsc` issue unless remediated;
   - `npm run test:e2e --workspace=frontend`; expected pre-existing broad e2e syntax debt unless implementation scopes a direct syntax repair.
5. Focused Playwright/live smoke because validation config changed and frontend tests are user-facing validation infrastructure:
   - focused Wave 010 app-shell project flow (`tests/e2e/wave010-app-shell-project-flow.spec.ts`) to ensure backend deletion guard still works;
   - live preview refresh/reachability probe after validation.

## Known debt classification/remediation strategy

- **Lint:** Prefer remediation in Wave 011 because root validation gates cannot be truthful while `lint` invokes a missing executable. Add the missing ESLint dependency/config or replace the lint script with a real supported static gate. Do not make lint a no-op.
- **Build/vue-tsc:** If the Node 24 / `vue-tsc` issue is small dependency/config debt, remediate in Wave 011; otherwise classify as pre-existing tooling debt and keep focused architecture gates green.
- **Full Vitest intersections failures:** Do not change geometry expectations in this wave unless the failure is caused by an architecture-test change. Classify and leave to a future correctness wave if still red.
- **Broad e2e syntax corruption:** Repair only if it is a narrow syntax cleanup required to make the validation gate runnable and reviewers agree it is validation-gate debt. Do not rewrite broad e2e behavior in this wave.

## Risks

- A UI-to-operation rule with an allowlist can become another hidden shim if not explicit. Mitigation: single-file allowlist with a comment pointing to Wave 012 and a failing test message that names the residual.
- Moving backend rules out of app-shell tests could accidentally weaken Wave 010 coverage. Mitigation: preserve the same regex intent in architecture tests and run the focused Wave 010 e2e guard.
- Fixing lint/build tooling can expand scope. Mitigation: restrict tooling changes to making declared validation commands executable; do not refactor source to satisfy style beyond necessary config/dependencies.
- Broad e2e/Vitest debt may keep mandatory cadence red. Mitigation: focused gates must pass, and residual failures must be classified with exact file/line evidence in implementation log.
