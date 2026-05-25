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
