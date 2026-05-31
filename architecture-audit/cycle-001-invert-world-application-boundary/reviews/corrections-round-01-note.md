# Corrections Round 01 Note — Wave 001 proposals

**Stage:** cycle-001-corrections-round-01  
**Task:** t1-correct-wave-001-proposals  
**Purpose:** map round-01 review blockers/warnings to proposal edits before review round 02.

## B1 — Test update surface undercounted

Addressed in both `proposals/proposal-direct.md` and `proposals/proposal-restructure.md` by adding a complete verified direct-call inventory for `world.initialize(commandStack)`:

- `frontend/src/domain/world/World.ts:193`
- `frontend/src/App.vue:157`, `frontend/src/App.vue:323`, `frontend/src/App.vue:384`, `frontend/src/App.vue:439`
- `frontend/tests/integration/worldInitialization.spec.ts:21`, `:50`, `:67`, `:82`, `:114`, `:124`, `:149`, `:151`, `:169`, `:184`, `:198`, `:221`, `:247`, `:260`
- `frontend/tests/unit/commands/initializeWorldCommand.spec.ts:26`
- `frontend/tests/helpers/worldHelpers.ts:43`, `:44`

Both proposals now require updating `createTestWorld()` to call the new application initializer while continuing to return `{ world, commandStack }`, so downstream helper users avoid broad churn. Both proposals also now inventory `frontend/tests/unit/commands/commandStack.spec.ts:38` for stale constructor-argument cleanup.

## B2 — `ProjectRuntime` lifecycle gap

Addressed in `proposal-restructure.md` by explicitly rejecting `ProjectRuntime` for Wave 001. The corrected restructure proposal states that a runtime without sign-out/load/reset/autosave lifecycle semantics would be an incoherent partial wrapper, while adding those semantics would enter Wave 009 app-shell scope. It recommends choosing the direct proposal and carrying runtime extraction forward as Wave 009 input.

## W1 — DependencyService target location

Addressed in both proposals by committing to a mechanical move from `frontend/src/services/DependencyService.ts` to `frontend/src/domain/world/DependencyService.ts`, retaining the `DependencyService` class name/behavior, updating `World.ts` to import the domain-local path, and deleting the old service-layer file with no re-export/shim. The proposals cite current evidence that `World.ts` is the only direct importer.

## W2 — CommandStack dependency direction

Addressed in both proposals by documenting current source evidence: `CommandStack` imports `Command` only and declares no constructor, while `frontend/tests/helpers/worldHelpers.ts` passes a stale `world` argument. The corrected proposals require removing that stale helper argument and preserving the allowed direction `application initializer -> commands/CommandStack -> domain World`, never `World -> CommandStack`.
