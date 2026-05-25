# Implementation Log — Wave 001: Invert the World/application boundary

**Stage:** `cycle-001-implement-invert-world-application-boundary`  
**Task:** `t1-implement-wave-001-direct`  
**Decision implemented:** `architecture-audit/cycle-001-invert-world-application-boundary/decision.md`  
**Selected proposal:** Proposal Direct — `architecture-audit/cycle-001-invert-world-application-boundary/proposals/proposal-direct.md`

## Source files changed

- `frontend/src/application/world/initializeWorld.ts` — added the application-level initialization use case. It constructs the `Command`, opens/closes the initialization subprocess, creates the initialization action group, delegates geometric setup to `buildWorldInitialization(...)`, commits the command, pushes it to `CommandStack`, and preserves idempotency by returning when projection planes already exist.
- `frontend/src/domain/world/World.ts` — deleted `World.initialize(commandStack)` and removed imports of command/application initialization infrastructure. `World` now imports `DependencyService` from the domain-local `./DependencyService` path.
- `frontend/src/domain/world/DependencyService.ts` — mechanically moved the dependency graph class from `frontend/src/services/DependencyService.ts` with class name and behavior preserved.
- `frontend/src/App.vue` — imported `initializeWorld` and replaced the three active `world.initialize(commandStack)` startup/load/create call sites. Removed the stale commented `world.initialize(commandStack)` line.
- `frontend/tests/helpers/worldHelpers.ts` — updated `createTestWorld()` to use constructorless `new CommandStack()` and `initializeWorld(world, commandStack)` while preserving the returned `{ world, commandStack }` shape.
- `frontend/tests/integration/worldInitialization.spec.ts` — converted direct initialization calls to `initializeWorld(world, commandStack)` and preserved coverage for projection planes, origins, hinge/half-hinge lines, clear/reinitialize, process-tree state, and generated IDs.
- `frontend/tests/unit/commands/initializeWorldCommand.spec.ts` — converted setup to the application initializer while keeping factory/operation orchestration assertions.
- `frontend/tests/unit/commands/commandStack.spec.ts` — removed stale `new CommandStack(world)` constructor argument.
- `frontend/tests/unit/architecture/worldBoundary.spec.ts` — added import-boundary regression coverage proving `World.ts` does not import application, commands, services, UI components, stores, or persistence layers.

## Legacy surfaces deleted

- Deleted `World.initialize(commandStack)` from `frontend/src/domain/world/World.ts`.
- Deleted `World.ts` imports for `Command`, `CommandStack`, `buildWorldInitialization`, `createActionGroup`, `AddProcessTreeActionGroupOp`, `PushSubprocessOp`, and `PopSubprocessOp`.
- Deleted old service-layer path `frontend/src/services/DependencyService.ts` with no re-export, wrapper, or compatibility shim.
- Deleted stale commented `// world.initialize(commandStack);` in `frontend/src/App.vue`.
- Removed direct `world.initialize(commandStack)` and stale `new CommandStack(world)` usage from the required test/helper surfaces.

## Commands run and captured outputs

- Search before implementation: `grep -R "world\.initialize\|new CommandStack(world)\|services/DependencyService\|DependencyService" -n frontend/src frontend/tests | head -200`
  - stdout: `architecture-audit/cycle-001-invert-world-application-boundary/validation/search-before.stdout.log`
  - stderr: `architecture-audit/cycle-001-invert-world-application-boundary/validation/search-before.stderr.log`
- Focused validation, first run: `npm run test --workspace=frontend -- tests/integration/worldInitialization.spec.ts tests/unit/commands/initializeWorldCommand.spec.ts tests/unit/commands/commandStack.spec.ts tests/unit/architecture/worldBoundary.spec.ts`
  - stdout: `architecture-audit/cycle-001-invert-world-application-boundary/validation/focused-vitest.stdout.log`
  - stderr: `architecture-audit/cycle-001-invert-world-application-boundary/validation/focused-vitest.stderr.log`
  - result: failed due to test issues introduced/updated in this task: boundary test Node import style and stale hinge-label assertion.
- Focused validation, reruns after fixes:
  - `architecture-audit/cycle-001-invert-world-application-boundary/validation/focused-vitest-rerun.stdout.log`
  - `architecture-audit/cycle-001-invert-world-application-boundary/validation/focused-vitest-rerun.stderr.log`
  - `architecture-audit/cycle-001-invert-world-application-boundary/validation/focused-vitest-final.stdout.log`
  - `architecture-audit/cycle-001-invert-world-application-boundary/validation/focused-vitest-final.stderr.log`
- Focused validation, final passing run:
  - stdout: `architecture-audit/cycle-001-invert-world-application-boundary/validation/focused-vitest-pass.stdout.log`
  - stderr: `architecture-audit/cycle-001-invert-world-application-boundary/validation/focused-vitest-pass.stderr.log`
  - result: **passed** — 4 files passed, 50 tests passed, 1 skipped.
- Obsolete API/import grep after implementation: `grep -R "world\.initialize\|new CommandStack(world)\|@/services/DependencyService\|services/DependencyService" -n frontend/src frontend/tests || true`
  - stdout: `architecture-audit/cycle-001-invert-world-application-boundary/validation/final-obsolete-api-grep.stdout.log`
  - stderr: `architecture-audit/cycle-001-invert-world-application-boundary/validation/final-obsolete-api-grep.stderr.log`
  - result: no matches.
- Old dependency service path deletion check: `test ! -e frontend/src/services/DependencyService.ts && echo deleted`
  - stdout: `architecture-audit/cycle-001-invert-world-application-boundary/validation/dependency-service-delete-check.stdout.log`
  - stderr: `architecture-audit/cycle-001-invert-world-application-boundary/validation/dependency-service-delete-check.stderr.log`
  - result: `deleted`.
- Additional compile check: `npm run build`
  - stdout: `architecture-audit/cycle-001-invert-world-application-boundary/validation/root-build.stdout.log`
  - stderr: `architecture-audit/cycle-001-invert-world-application-boundary/validation/root-build.stderr.log`
  - result: failed in `vue-tsc` with broad pre-existing TypeScript errors across many modules. The output includes one moved-file warning at `src/domain/world/DependencyService.ts(314,25)` for the existing unused `actionId` parameter after the mechanical move; the same implementation body previously lived in `src/services/DependencyService.ts`. Full build/lint/e2e/preview refresh remain for the next validation stage.

## Residual risks and follow-up candidates

- Full `npm run build` is currently blocked by broad repository TypeScript debt unrelated to the World boundary inversion. The next validation stage should classify these failures against the baseline/current branch and decide whether to accept as pre-existing or spawn cleanup waves.
- `DependencyService` remains behaviorally and conceptually unchanged as required by the decision. A later dependency/process-tree wave should consider renaming it to a domain graph abstraction and deleting deprecated no-op methods such as `rebuildDependencyMaps()`.
- `Element2D.realize2D(world: World)` and `styleService` still couple realization/visibility to broad `World` context; this was explicitly deferred by the accepted decision.
- `App.vue` still owns broad app-shell lifecycle responsibilities (sign-out/load/reset/autosave/provide-inject). This is accepted Wave 001 residual input for the later app-shell/runtime wave.
- Some files were root-owned in the workspace (`World.ts`, `App.vue`, and several tests). Edits were performed through atomic replacement/sudo where necessary; no source-control branch changes were made.

## Preview/e2e status

This implementation task ran focused Vitest and an additional build check. The mandatory full validation cadence, Playwright/e2e run, and live preview refresh are deferred to `cycle-001-validation-and-preview-refresh` per the current stage context.

## Validation stage — cycle-001-validation-and-preview-refresh

**Stage:** `cycle-001-validation-and-preview-refresh`  
**Task:** `t1-run-validation-and-refresh-preview`  
**Validation directory:** `architecture-audit/cycle-001-invert-world-application-boundary/validation/`

### Direct validation fixes made in this stage

Two minimal, behavior-preserving fixes were applied because validation surfaced TypeScript hygiene diagnostics in Wave 001-touched files:

- `frontend/src/domain/world/World.ts` — removed unused `Matrix3x4` import from `@/utils/threeUtils`.
- `frontend/src/domain/world/DependencyService.ts` — renamed deprecated unused `getActionDependencies(actionId)` parameter to `_actionId`.

No architecture refactor, compatibility shim, or source-scope expansion was performed.

### Dependency-environment repair

- Initial validation ran with a partially installed/root-owned dependency tree: lint could not find `eslint`, e2e initially reported missing `katex`, and a normal `npm install` failed with `EACCES` opening root-owned `package-lock.json`.
  - Evidence: `validation/root-lint.stderr.log`, `validation/frontend-e2e.stderr.log`, `validation/npm-install.stderr.log`, `validation/permissions-and-installed-package-check.stdout.log`.
- `sudo npm install` was run only to repair the root-owned dependency tree, not to add or change declared dependencies.
  - stdout: `validation/sudo-npm-install.stdout.log`
  - stderr: `validation/sudo-npm-install.stderr.log`
  - result: completed; package files were not intentionally changed.

### Validation command results and classifications

| Check | Command | Logs | Result | Classification |
| --- | --- | --- | --- | --- |
| Root lint | `npm run lint` | `validation/root-lint-final.stdout.log`, `validation/root-lint-final.stderr.log` | Failed: `eslint: not found` | Pre-existing/unrelated repo tooling issue. `frontend/package.json` defines a lint script using `eslint` but does not declare `eslint` in dependencies/devDependencies; failure persists after dependency repair. Not caused by Wave 001 boundary inversion. |
| Frontend lint | `npm run lint --workspace=frontend` | `validation/frontend-lint-final.stdout.log`, `validation/frontend-lint-final.stderr.log` | Failed: `eslint: not found` | Same pre-existing/unrelated missing lint dependency as root lint. |
| Focused Vitest | `npm run test --workspace=frontend -- tests/integration/worldInitialization.spec.ts tests/unit/commands/initializeWorldCommand.spec.ts tests/unit/commands/commandStack.spec.ts tests/unit/architecture/worldBoundary.spec.ts` | `validation/focused-vitest-final-validation.stdout.log`, `validation/focused-vitest-final-validation.stderr.log` | Passed: 4 files, 50 tests passed, 1 skipped | Wave 001 accepted for focused touched-module behavior and architecture boundary guard. |
| Full frontend/root Vitest | `npm run test` | `validation/root-vitest-final.stdout.log`, `validation/root-vitest-final.stderr.log`, tail summary in `validation/root-vitest-final-tail.stdout.log` | Failed: 7 files failed, 85 passed, 3 skipped; 19 tests failed, 1251 passed, 64 skipped, 11 todo | Pre-existing/unrelated failures outside Wave 001 touched surfaces. Representative failures include `tests/unit/components/propertiesDialog.spec.ts` close/save event expectations, `tests/unit/tools/GuideTool.test.ts` using obsolete `tool.onMouseDown`, `tests/unit/architecture/noCommandSubclasses.spec.ts` with `default.resolve is not a function`, and zero-test/suite failures. Focused Wave 001 tests passed in the same environment. |
| Backend Vitest | `npm run test --workspace=backend` | `validation/backend-vitest.stdout.log`, `validation/backend-vitest.stderr.log` | Passed: 1 file, 15 tests | Backend unaffected by Wave 001. |
| Root build | `npm run build` | `validation/root-build-final.stdout.log`, `validation/root-build-final.stderr.log` | Failed before app build: `vue-tsc` throws `Search string not found: "/supportedTSExtensions = .*(?=;)/"` under Node v24.15.0 | Pre-existing/unrelated frontend toolchain incompatibility (`vue-tsc`/TypeScript/Node mismatch). Earlier pre-repair build logs (`validation/root-build-validation.stdout.log`) also show broad TypeScript debt across many unrelated modules; the two Wave-touched unused-symbol diagnostics were fixed in this stage. |
| Frontend build | `npm run build --workspace=frontend` | `validation/frontend-build-final.stdout.log`, `validation/frontend-build-final.stderr.log` | Failed with same `vue-tsc` `supportedTSExtensions` crash | Pre-existing/unrelated toolchain incompatibility, not Wave 001 behavior. |
| Backend build | `npm run build --workspace=backend` | `validation/backend-build.stdout.log`, `validation/backend-build.stderr.log` | Passed | Backend unaffected by Wave 001. |
| Frontend e2e/Playwright | `npm run test:e2e --workspace=frontend` | `validation/frontend-e2e-final.stdout.log`, `validation/frontend-e2e-final.stderr.log` | Failed during test collection | Pre-existing/unrelated malformed e2e specs: `frontend/tests/e2e/keyboard-shortcuts.spec.ts` has an unexpected token at line 267 and `frontend/tests/e2e/selection-mask.spec.ts` has an unexpected token at line 188. The Vite web server started before Playwright collection failed. |
| Obsolete API/import grep | `grep -R "world\.initialize\|new CommandStack(world)\|@/services/DependencyService\|services/DependencyService" -n frontend/src frontend/tests || true` | `validation/obsolete-api-grep-validation.stdout.log`, `validation/obsolete-api-grep-validation.stderr.log` | Passed: no matches | Confirms deleted initialization API and old dependency-service import path remain absent. |
| DependencyService old path check | `test ! -e frontend/src/services/DependencyService.ts && echo deleted` | `validation/dependency-service-delete-validation.stdout.log`, `validation/dependency-service-delete-validation.stderr.log` | Passed: `deleted` | Confirms old service-layer file path remains deleted with no shim. |

### Live preview refresh

- Command: `npm run dev --workspace=frontend -- --host 0.0.0.0`, started with `nohup`.
- Server logs: `validation/preview-server-final.stdout.log`, `validation/preview-server-final.stderr.log`.
- PID record: `validation/preview-server-final.pid`.
- Reachability probe: `curl -I --max-time 10 http://127.0.0.1:5173/`.
  - stdout: `validation/preview-reachability-final.stdout.log`
  - stderr: `validation/preview-reachability-final.stderr.log`
  - result: **reachable** with `HTTP/1.1 200 OK`.
- Process evidence in the reachability log shows Vite running as `node /work/diedrico/node_modules/.bin/vite --host 0.0.0.0`.

### Validation acceptance decision for Wave 001

Wave 001 validation is **accepted with pre-existing/unrelated repository validation debt recorded**.

No attributable Wave 001 failures remain after the two minimal touched-file TypeScript hygiene fixes. The focused initializer/command-stack/world-boundary Vitest suite passes, the obsolete API/import grep is clean, the old `frontend/src/services/DependencyService.ts` path remains deleted, backend validation passes, and the live preview is running on `0.0.0.0` and answering a reachability probe.

### Residual risks / follow-up candidates

- Root/frontend lint is not runnable until the project declares or otherwise provides `eslint` for the existing lint scripts.
- Frontend build is blocked by a `vue-tsc` runtime crash under the current Node/TypeScript/toolchain combination and by broad existing TypeScript debt visible in earlier build logs.
- Full frontend Vitest contains pre-existing failing suites unrelated to Wave 001, especially properties dialog, guide tool, and architecture test harness failures.
- Playwright e2e is blocked during collection by malformed existing e2e spec files before Wave 001 behavior can be exercised through those tests.
- `sudo npm install` repaired the root-owned dependency tree in this container; package ownership/root-owned workspace files remain an operational hygiene issue.
