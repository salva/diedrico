# Implementation Log — Wave 004 Command/Undo Persistence Contract

**Stage:** `cycle-004-implement-command-undo-persistence-contract`  
**Task:** `t1-implement-proposal-direct`  
**Decision implemented:** `architecture-audit/cycle-004-command-undo-persistence-contract/decision.md` selected Proposal Direct.

## Source files changed

- `frontend/src/commands/Command.ts`
  - Added `CommandSnapshot`, `RestoredCommandInput`, `Command.restore(...)`, and `toSnapshot()`.
  - Restored identity/timestamp/status are only available through `Command.restore(...)`; normal construction still creates fresh IDs/timestamps.
- `frontend/src/commands/CommandStack.ts`
  - Added readonly committed-command inspection and `restoreCommittedCommands(...)`.
  - Restore clears redo state and notifies through the stack API.
- `frontend/src/domain/world/World.ts`
  - Added `peekNextId()` and validated `restoreNextId(...)`.
- `frontend/src/App.vue`
  - Replaced save-time `world.getNextId()` calls with non-mutating `world.peekNextId()`.
- `frontend/src/commands/operations/IOperation.ts`
  - Replaced the old ProjectService-switch documentation with descriptor/registry persistence contract types.
- `frontend/src/commands/operations/OperationRegistry.ts`
  - Added typed operation descriptor registry, unique-registration checks, serialization, deserialization, and all-operation composer.
- `frontend/src/commands/operations/world/registerWorldOperationDescriptors.ts`
  - Added world-operation descriptor restoration registrations.
- `frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts`
  - Added process-tree operation descriptor restoration registrations.
- `frontend/src/services/ProjectService.ts`
  - Replaced concrete operation imports, migration helpers, private casts, fake command objects, debug replay logging, and the monolithic reconstruction switch with command snapshots and the operation registry.
  - Current schema is validated fail-fast only; no migration/backcompat/corrupt-operation skip paths remain.
- Operation serializer/output-state fixes:
  - `frontend/src/commands/operations/world/AddGuideOp.ts` removes generated guide ID back-fill into mutable `parameters` and serializes from output state.
  - Added current-format serializers for active operations that lacked them: 3D point/line/segment, segment, style update, process-tree operations, and legacy-active `AddIntersectionPoint2DOp`.
  - Added current-format serializer for the tangent-line operation missing one.
- Tests updated:
  - `frontend/tests/unit/commands/command.spec.ts`
  - `frontend/tests/unit/commands/commandStack.spec.ts`
  - `frontend/tests/unit/commands/initializeWorldCommand.spec.ts`
  - `frontend/tests/unit/commands/operations/operationRegistry.spec.ts`
  - `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`
  - `frontend/tests/unit/services/ProjectService.selfContainment.spec.ts`
  - `frontend/tests/unit/services/ProjectService.subprocess.spec.ts`
  - `frontend/tests/integration/projectService.determinism.spec.ts`
  - `frontend/tests/integration/projectService.cascadeDeletion.spec.ts`

## Legacy surfaces and tests deleted

- `frontend/tests/unit/architecture/serializationCoverage.spec.ts`
- `frontend/tests/unit/services/ProjectService.serialization.test.ts`
- `frontend/tests/e2e/persistence.spec.ts`

## Validation run in this implementation stage

Logs are under `architecture-audit/cycle-004-command-undo-persistence-contract/validation/`.

- Initial reference scan: `initial-rg.stdout.log`, `initial-rg.stderr.log`.
- Source permission/chown diagnostics: `permissions.*.log`, `sudo-check.*.log`, `chown.*.log`.
- Build probe: `build-compile-01.stdout.log`, `build-compile-01.stderr.log`.
  - Result: failed before source compilation because `vue-tsc` crashes under the container Node 24 runtime with `Search string not found: "/supportedTSExtensions = .*(?=;)/"`.
  - This appears environmental/toolchain-related and is not attributable to the Wave 004 source changes.
- TypeScript probe: `tsc-01.*.log` captured broad pre-existing/type-surface issues and guided serializer/test repair.
- Focused Vitest iterations: `focused-vitest-01.*.log` through `focused-vitest-06.*.log`.
  - Final focused command passed: `focused-vitest-06.stdout.log` / `focused-vitest-06.stderr.log`.
  - Result: 9 files passed, 116 tests passed.
- Static deletion/reference checks:
  - `static-deletion-check.stdout.log`
  - `static-deletion-check-02.stdout.log`
  - Final targeted private persistence casts, migration helpers, `reconstructOperation`, corrupted-operation skip strings, and private undo-stack mutation are absent. The only remaining match is an unrelated architecture test path containing the word `Legacy`.

## Residual risks / follow-up candidates

- Full mandatory validation cadence, Playwright/e2e, and live preview refresh remain for the next `cycle-004-validation-and-preview-refresh` stage.
- `vue-tsc` currently fails under Node 24 before source compilation; validation stage should either run under a compatible Node version or record the environment issue explicitly.
- Several operation classes still carry runtime `parameters` fields for tool/test ergonomics, but ProjectService no longer uses them as a persistence fallback. A future cleanup wave can remove remaining operation runtime bags more aggressively after the persistence boundary has stabilized.
- Some process-tree removal operations remain behaviorally not implemented by prior design; this wave only gives them explicit current-format descriptors and does not expand their domain behavior.
