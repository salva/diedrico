# Wave 011 Proposal Direct — Centralize import-boundary tests and make validation gates truthful

## Summary

Implement Wave 011 as a focused architecture-test and script hardening wave. Keep application source behavior unchanged. Consolidate current architecture checks under `frontend/tests/unit/architecture/`, add shared scanner helpers, promote the Wave 010 frontend/backend guards out of app-shell tests, add missing import-boundary rules for the full domain and UI layers, and make package validation commands reflect the single active frontend workspace after backend deletion.

This proposal intentionally does **not** delete `ExamplesMenu.vue` or debug/example operations. Instead, it adds a named, single-file, temporary allowlist for that one residual UI-to-operation violation so the architecture gate is truthful today while making the exception visible, narrow, and scheduled for deletion/migration in Wave 012.

## Evidence driving the proposal

- Root workspaces now include only `frontend` (`package.json:7-9`), so root build/test/lint delegation to `--workspace=frontend` is structurally correct after Wave 010 (`package.json:13-16`).
- Frontend lint currently invokes `eslint` (`frontend/package.json:15`) but `eslint` is not present in frontend dev dependencies (`frontend/package.json:25-39`), causing the known `eslint: not found` lint failure from Wave 010.
- Current architecture tests include a narrow `World.ts`-only domain import check (`frontend/tests/unit/architecture/worldBoundary.spec.ts:3-31`), a deleted legacy path string scan (`frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts:3-12`, `frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts:40-50`), and a shell/grep-based no-command-subclasses test that can warn-and-pass on tool failures (`frontend/tests/unit/architecture/noCommandSubclasses.spec.ts:24-51`, `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts:99-107`).
- Wave 010 backend guards currently live in an app-shell unit test (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:43-50`) rather than the architecture test directory.
- The only active frontend/backend project API strings are guard strings in the focused Wave 010 e2e test (`frontend/tests/e2e/wave010-app-shell-project-flow.spec.ts:7-21`), which should be allowlisted only as negative-test evidence.
- A direct UI command/operation leak remains in `ExamplesMenu.vue`: imports (`frontend/src/components/menus/ExamplesMenu.vue:50-55`) and command construction/push (`frontend/src/components/menus/ExamplesMenu.vue:70-75`). Treat as a visible Wave 012/debug-example residual rather than silently ignoring it.
- Playwright config still contains stale backend webServer comments (`frontend/playwright.config.ts:46-53`) even though the backend was deleted.

## Concrete validation command contract after Wave 010

Wave 011 must leave the validation command surface below. Root commands are delegators to the single active frontend workspace; frontend commands are the executable implementations.

| Command surface | Required Wave 011 state |
| --- | --- |
| Root `npm run lint` | Delegates to `npm run lint --workspace=frontend` and must execute a real frontend static gate. It must not call a missing binary and must not be `true`, `echo`, or `|| true`. |
| Frontend `npm run lint --workspace=frontend` | Replace the current missing-ESLint script with the already-supported static gate `vue-tsc --noEmit` (or an equivalent TypeScript static check using installed project tooling) unless implementation deliberately adds full ESLint dependencies/config. The preferred direct outcome is `vue-tsc --noEmit` because it is executable with the existing TypeScript toolchain and avoids broad style churn. |
| Root `npm run test` | Remains `npm run test --workspace=frontend`; full Vitest failures from pre-existing intersections debt are classified with exact files/errors if still red. |
| Frontend `npm run test --workspace=frontend` | Remains `vitest run`; full-suite failures are classified unless caused by Wave 011 changes. |
| Root `npm run build` | Remains `npm run build --workspace=frontend`; Node 24/`vue-tsc` debt is remediated if the lint/static-gate `vue-tsc --noEmit` choice exposes the same small tooling fix, otherwise classified exactly. |
| Frontend `npm run build --workspace=frontend` | Remains the active frontend build command; no backend build command is reintroduced. |
| Root `npm run test:e2e` | **Do not add a root alias in Proposal Direct.** The root workspace has no existing e2e script and adding one is not necessary to make the single-workspace contract truthful. The mandatory e2e cadence is satisfied by explicitly running the active workspace command `npm run test:e2e --workspace=frontend` and recording in the implementation log that root e2e is intentionally absent after backend deletion. |
| Frontend `npm run test:e2e --workspace=frontend` | Remains the sole e2e entrypoint; broad e2e syntax debt is classified unless Wave 011 touches the affected file or the failure blocks the focused Wave 010 guard. |
| Root `npm run test:architecture` | Add this alias to delegate to `npm run test:architecture --workspace=frontend` so architecture gates are easy to run from the root. |
| Frontend `npm run test:architecture --workspace=frontend` | Add `vitest run tests/unit/architecture` as the focused architecture gate. |

The implementation must choose one lint/static path up front and document it in `implementation-log.md`:

1. **Preferred direct path:** change frontend `lint` to `vue-tsc --noEmit` (or the project’s equivalent installed TypeScript static check) and keep root delegation unchanged. This makes lint executable now without pretending ESLint exists.
2. **Allowed alternative:** add/restore minimal ESLint dependencies and config and keep `eslint` as lint. If this alternative is selected, validation must include the exact package/config files changed and prove `npm run lint --workspace=frontend` uses the newly installed executable.

Either path must be a real executable gate; missing executables, no-op scripts, `--fix`-only style churn, or “classify if still red” for `eslint: not found` are not acceptable Wave 011 outcomes.

## Files to change

### Test/helper changes

- Add `frontend/tests/unit/architecture/helpers/sourceScanner.ts` (or equivalent) with deterministic Vitest-native helpers:
  - enumerate text files under `src/` and `tests/` for `.ts`, `.tsx`, `.vue`, `.js`, `.mjs`, `.cjs`;
  - normalize project-relative paths;
  - extract static import lines and full raw text;
  - support explicit allowlists with comments/reasons and failure messages that print each allowlist entry.
- Replace `frontend/tests/unit/architecture/worldBoundary.spec.ts` with broader domain-layer boundary coverage:
  - fail on any `frontend/src/domain/**` import from `@/commands`, `@/application`, `@/services`, `@/components`, `@/stores`, or persistence modules;
  - allow domain-to-domain/presentation/calculation/processTree imports where already established;
  - keep an explicit `World.ts` assertion as a named case.
- Replace/refactor `frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts` to use the shared scanner while keeping the same deleted duplicate-geometry terms from lines 3-12 of the current test.
- Replace/refactor `frontend/tests/unit/architecture/noCommandSubclasses.spec.ts` to remove `execSync`/`grep` and warning-pass behavior. Use the shared scanner and fail deterministically on production `extends Command` matches, while preserving the source documentation check if still useful.
- Add `frontend/tests/unit/architecture/importBoundaries.spec.ts` (or split files) covering:
  - UI components (`frontend/src/components/**`) must not import `@/commands/**`, concrete operation classes, or command stack implementation;
  - the only UI exception is `frontend/src/components/menus/ExamplesMenu.vue`, listed exactly by path, not by glob, and only for the known `Command`, `AddExampleSetupOp`, and `CommandStack` imports/usage;
  - the exception must be named in the test output as `TEMPORARY Wave 012 ExamplesMenu debug/example command leak` and must include a failure message stating that adding any other component or import to the allowlist is forbidden without a reviewed proposal;
  - the exception must be referenced in `architecture-audit/cycle-011-architecture-tests-validation-gates/implementation-log.md` as a Wave 012 delete/move target;
  - application layer may import commands/operations as the current command-construction boundary;
  - frontend source/tests must not import `backend/src/**`;
  - stale backend project API route/DTO/dialog terms are forbidden except in the focused negative e2e guard file.
- Trim `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts` so it keeps app-shell-specific runtime/UI assertions (`frontend/tests/unit/application/appShell/AppShellBoundary.test.ts:25-40`) but no longer owns generic frontend/backend architecture rules.

### Package/script/config changes

- Root `package.json`:
  - keep `workspaces: ["frontend"]` and root `lint`/`test`/`build` delegation to frontend (`package.json:7-16`);
  - add `test:architecture` -> `npm run test:architecture --workspace=frontend`;
  - do **not** add root `test:e2e`; document that root e2e is intentionally absent and the active e2e command is `npm run test:e2e --workspace=frontend`.
- `frontend/package.json`:
  - add `test:architecture` -> `vitest run tests/unit/architecture`;
  - make `lint` executable and truthful by either replacing missing `eslint` with the installed TypeScript static gate (`vue-tsc --noEmit`) or adding minimal ESLint dependencies/config. The preferred direct path is the static TypeScript gate; no no-op lint script is allowed;
  - do not add backend scripts because backend is no longer active.
- `frontend/playwright.config.ts`:
  - delete stale commented backend webServer block (`frontend/playwright.config.ts:46-53`) because it points to a deleted workspace and makes validation setup misleading.

### Validation-debt classification artifact

- Include in `implementation-log.md` (or a dedicated `validation-debt.md` referenced by it):
  - lint/static gate: exact script chosen and proof the missing-ESLint failure is gone;
  - build: Node 24 / `vue-tsc` incompatibility if still present after the lint/static choice;
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
  - architecture tests fail on new UI components importing command/operation/CommandStack surfaces, while the existing `ExamplesMenu.vue` leak is a documented temporary allowlist that is visible in failure output and the implementation log;
  - architecture tests fail on frontend imports of deleted backend implementation files and stale backend project API assumptions;
  - root/frontend scripts provide a direct focused architecture-test gate;
  - root/frontend lint/static commands are real executable commands, not missing-tool declarations;
  - stale backend validation comments are gone.

## Validation plan

Capture logs under `architecture-audit/cycle-011-architecture-tests-validation-gates/validation/`.

1. Static pre/post scans:
   - domain import scan for commands/application/services/components/stores/persistence;
   - UI import scan for commands/operations/CommandStack, proving the only allowlist entry is exactly `frontend/src/components/menus/ExamplesMenu.vue` and that test output names it as a temporary Wave 012 residual;
   - frontend backend-source/API string scan with negative e2e guard allowlist.
2. Focused architecture tests:
   - root: `npm run test:architecture`;
   - frontend: `npm run test:architecture --workspace=frontend`.
3. Focused app-shell boundary tests after moving generic rules:
   - `npx vitest run tests/unit/application/appShell/AppShellBoundary.test.ts tests/unit/application/appShell/KeyboardShortcutRouter.test.ts` from `frontend/` or equivalent workspace invocation.
4. Root and frontend mandatory cadence:
   - root: `npm run lint`, `npm run test`, `npm run build`;
   - frontend workspace: `npm run lint --workspace=frontend`, `npm run test --workspace=frontend`, `npm run build --workspace=frontend`;
   - lint must no longer fail because `eslint` is missing. If lint fails, it must fail from the chosen real static checker and be classified/remediated with exact output;
   - full Vitest intersections failures and build `vue-tsc`/Node failures are classified only if not caused by Wave 011 changes.
5. E2E and live smoke because validation config changed and frontend tests are user-facing validation infrastructure:
   - do **not** run a root e2e alias because Proposal Direct intentionally does not add one; record this intentional absence in `implementation-log.md`;
   - run the active workspace e2e entrypoint `npm run test:e2e --workspace=frontend`, with known broad e2e syntax failures classified by exact file/error if they remain pre-existing;
   - run the focused Wave 010 app-shell project flow through the frontend workspace, e.g. `npx playwright test tests/e2e/wave010-app-shell-project-flow.spec.ts`, to ensure the backend-deletion guard still works;
   - refresh the live preview after validation by stopping/restarting the frontend preview/dev server bound to `0.0.0.0` (for example `npm run dev --workspace=frontend -- --host 0.0.0.0`) and capture logs under the cycle `validation/` directory;
   - probe the refreshed preview with `curl -I http://127.0.0.1:5173/` (or the configured preview port if implementation changes it) and record the HTTP response in the implementation log.

## Known debt classification/remediation strategy

- **Lint/static gate:** Remediate in Wave 011. The current `eslint: not found` state is not acceptable as classified residual debt because it makes a declared validation command non-executable. Prefer replacing `lint` with `vue-tsc --noEmit`; alternatively add minimal ESLint dependencies/config.
- **Build/vue-tsc:** If the Node 24 / `vue-tsc` issue is small dependency/config debt, remediate in Wave 011; otherwise classify as pre-existing tooling debt and keep focused architecture gates green.
- **Full Vitest intersections failures:** Do not change geometry expectations in this wave unless the failure is caused by an architecture-test change. Classify and leave to a future correctness wave if still red.
- **Broad e2e syntax corruption:** Repair only if it is a narrow syntax cleanup required to make the validation gate runnable and reviewers agree it is validation-gate debt. Do not rewrite broad e2e behavior in this wave.
- **Wave 012/013 overreach guard:** Do not delete the examples/debug menu or reconcile broad docs/specs in this direct proposal; only make the residual visible and scheduled.

## Risks

- A UI-to-operation rule with an allowlist can become another hidden shim if not explicit. Mitigation: single-file, exact-path allowlist with failure text naming `TEMPORARY Wave 012 ExamplesMenu debug/example command leak`, implementation-log tracking, and no glob or broad-import exceptions.
- Moving backend rules out of app-shell tests could accidentally weaken Wave 010 coverage. Mitigation: preserve the same regex intent in architecture tests and run the focused Wave 010 e2e guard.
- Fixing lint/build tooling can expand scope. Mitigation: restrict tooling changes to making declared validation commands executable; do not refactor source to satisfy style beyond necessary config/dependencies or the selected static gate.
- Broad e2e/Vitest debt may keep mandatory cadence red. Mitigation: focused gates must pass, and residual failures must be classified with exact file/line evidence in implementation log.
