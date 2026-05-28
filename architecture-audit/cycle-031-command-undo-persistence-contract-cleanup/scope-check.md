# Cycle 031 Scope Check — Command/undo persistence contract cleanup

## Stage stance

Cycle 031 remains a **design-only scout/proposal stage**. It must not implement production or test source changes. Current source confirms the Wave 004 premise still holds, but it has partially shifted: `ProjectService` no longer owns a monolithic concrete-operation reconstruction switch, while broad operation descriptor/output contracts and registry-owned casts remain central cleanup targets.

## Current source evidence

### Wave 004 premise and centrality

The current plan entry for Wave 004 targets `Command.ts`, `CommandStack.ts`, `IOperation.ts`, all operation modules, `ProjectService.ts`, serialization/determinism tests, and persistence e2e. Its stated target is explicit typed APIs for command inspection/restoration/serialization and one chosen persistence contract without private-field casts, migration fallbacks, broad `any`, or a monolithic reconstruction switch (`architecture-audit/wave-plan.md`, Wave 004 section). Cycle 030 closure explicitly recommends this next central command descriptor / operation serialization cleanup after DTO port cleanup, while leaving preview process hygiene lower centrality (`architecture-audit/cycle-030-app-shell-persistence-dto-port-contract-cleanup/implementation-log.md`, “Next-wave recommendation”).

The premise remains next by centrality because app-shell persistence now passes typed `ProjectData` to/from `ProjectService`, but `ProjectData.commands` still depends on command snapshots and operation descriptors. `ProjectService.serializeCommands(...)` maps `commandStack.getCommittedCommands()` through `command.toSnapshot()` (`frontend/src/services/ProjectService.ts:27-33`), and restore replays deserialized operations into a fresh world before restoring committed commands (`frontend/src/services/ProjectService.ts:45-67`). That is the command/undo persistence boundary.

### Command and undo inspection APIs

`CommandSnapshot` is already an explicit public snapshot with `operations: OperationDescriptor[]` (`frontend/src/commands/Command.ts:73-79`). `Command.restore(...)` is an explicit restoration API and avoids a caller-side private cast into `operations` (`frontend/src/commands/Command.ts:114-126`). `toSnapshot()` serializes through the registry (`frontend/src/commands/Command.ts:136-146`). `CommandStack.getCommittedCommands()` and `restoreCommittedCommands(...)` expose stack inspection/restoration without reading `undoStack` privately (`frontend/src/commands/CommandStack.ts:137-149`).

Residual issue: `Command.getOperations()` still returns live operation objects (`frontend/src/commands/Command.ts:129-134`). It may remain as a test/runtime inspection API, but Wave 031 implementation should verify whether persistence tests can assert snapshots/descriptors instead of inspecting operation internals.

### Operation descriptor / serialization contracts

`IOperation` has a generic descriptor/output shape, but the default boundary is still broad JSON object: `OperationDescriptor<TType, TPayload>` allows `payload?` and inherited arbitrary keys via `JsonObject` (`frontend/src/commands/operations/IOperation.ts:11-26`), and `IOperation` defaults to untyped descriptor/output contracts (`frontend/src/commands/operations/IOperation.ts:30-39`). Pre-existing dirty diffs show someone already began generic output typing in `Command.ts`, `IOperation.ts`, and five intersection/free-point operations; this stage must attribute those diffs as pre-existing and not adopt or normalize them.

Most operation classes still expose `parameters: Record<string, any>` and `outputs: Record<string, any>`. Examples include line operations (`frontend/src/commands/operations/world/AddLineOp.ts:10-13`, `frontend/src/commands/operations/world/AddLineOp.ts:76-80`, `frontend/src/commands/operations/world/AddLineOp.ts:208-211`) and process-tree action operations (`frontend/src/commands/operations/processTree/AddProcessTreeActionOp.ts:14-17`). Serializers read from these mutable parameter/output bags (`frontend/src/commands/operations/world/AddLineOp.ts:60-67`, `frontend/src/commands/operations/processTree/AddProcessTreeActionOp.ts:66-72`). This is the core cleanup seam.

### OperationRegistry ownership

`OperationRegistry` owns persistence restore/serialize dispatch: it registers operation restorers by type, rejects duplicates, serializes through `operation.serialize()`, and restores by `descriptor.opType` (`frontend/src/commands/operations/OperationRegistry.ts:5-34`). `ProjectService` imports only `deserializeOperation`, not every concrete operation (`frontend/src/services/ProjectService.ts:5-10`), so the old monolithic reconstruction switch premise is already resolved in current source. However, registry typing is weak because `OperationRestorer` returns untyped `IOperation`, `register(...)` stores restorers through a cast, `assertOperationDescriptor(...)` only checks non-empty `opType`, and default registration is global mutable module state (`frontend/src/commands/operations/OperationRegistry.ts:3-19`, `frontend/src/commands/operations/OperationRegistry.ts:41-63`).

The current registry modules are still centralized constructor maps. `registerWorldOperationDescriptors.ts` imports every world operation and converts flat `JsonObject` fields via helper functions (`frontend/src/commands/operations/world/registerWorldOperationDescriptors.ts:1-44`), then registers all world operation types in one long function (`frontend/src/commands/operations/world/registerWorldOperationDescriptors.ts:46-80`). Process-tree registration includes a private cast from descriptor object to `Action` (`frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts:19-25`).

### ProjectService persistence contract

`ProjectService` is now a current-schema command-stream persistence orchestrator (`frontend/src/services/ProjectService.ts:1-10`). It rejects non-current schema versions instead of migrating (`frontend/src/services/ProjectService.ts:80-87`), validates the envelope and command shape (`frontend/src/services/ProjectService.ts:80-128`), restores `nextElementId` through a public world API (`frontend/src/services/ProjectService.ts:45-49`), deserializes operations through the registry (`frontend/src/services/ProjectService.ts:50-58`), and restores committed command history through `Command.restore` / `CommandStack.restoreCommittedCommands` (`frontend/src/services/ProjectService.ts:59-67`).

Residual issue: operation validation in `ProjectService` is shallow; it only verifies the operation is an object with string `opType` (`frontend/src/services/ProjectService.ts:124-127`). The deeper descriptor contract is deferred to the registry/deserializers. That boundary can be acceptable if made explicit, but it should be guarded by tests.

### Private casts, migration/backcompat, corrupted-operation paths

Static search found no `ProjectService` migration helper or monolithic reconstruction switch in current source. The only active schema policy is strict current version rejection (`frontend/src/services/ProjectService.ts:84-87`). That invalidates any Cycle 031 implementation that spends effort deleting nonexistent `ProjectService` migration code.

Private/broad casts still exist in the command/persistence-adjacent registry and operation layer:

- `OperationRegistry.register(...)` stores typed restorers as untyped restorers (`frontend/src/commands/operations/OperationRegistry.ts:8-13`).
- `assertOperationDescriptor(...)` casts to read `opType` (`frontend/src/commands/operations/OperationRegistry.ts:41-48`); this is a validation guard cast and lower-risk than operation-internal private casts.
- `registerProcessTreeOperationDescriptors.ts` casts `obj(d, 'action') as unknown as Action` (`frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts:19-20`). This is a true persistence contract gap.
- Many operations use mutable `Record<string, any>` `parameters` / `outputs` and serializers read those bags; see line and process-tree examples above.
- Some world operations still use private world/domain casts for undo or internal relations, e.g. sibling intersection writes `(primaryPoint as any).siblingPointId` (static search evidence: `frontend/src/commands/operations/world/AddSiblingIntersectionPoint2DOp.ts:74`) and initialization undo touches private world maps (`frontend/src/commands/operations/world/InitializationOps.ts:81`, `:157`, `:314-315`). Those are related but broader than descriptor serialization and should be stop-condition candidates unless touched operation descriptors require them.

### Tests and validation surfaces

Relevant current tests include command/stack unit tests, operation registry tests, ProjectService roundtrip/determinism/subprocess tests, app-shell boundary/runtime tests, and e2e project flow (`frontend/tests/unit/commands/operations/operationRegistry.spec.ts`, `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`, `frontend/tests/integration/projectService.determinism.spec.ts`, `frontend/tests/unit/services/ProjectService.subprocess.spec.ts`, `frontend/tests/e2e/wave010-app-shell-project-flow.spec.ts`).

The proposal validation plan must include focused registry/ProjectService command persistence tests, command/undo/redo tests, full Vitest/build/lint, frontend/root e2e, and live preview reachability because command persistence affects save/open/autosave/undo-redo behavior.

## Source-control reconciliation

Path-scoped status/diff were captured under `.saivage/stages/cycle-031-fresh-scout-proposals-command-undo-persistence-contract-cleanup/design-notes/` before authoring this document.

Pre-existing scoped dirty diffs:

- Modified: `frontend/src/commands/Command.ts` — generic `addAndExecute` return typing.
- Modified: `frontend/src/commands/operations/IOperation.ts` — generic output typing.
- Modified: five world operation files adding typed output interfaces for free point/intersection operations.
- Deleted: `frontend/tests/e2e/active-plane-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts`.

These are treated as pre-existing context only. Cycle 031 design artifacts must not stage, revert, normalize, or incorporate those diffs as implementation output.

## Selected bounded scope for Cycle 031 implementation proposals

A bounded direct implementation can target:

1. Make the operation descriptor contract explicit and discriminated for active world/process-tree operations.
2. Move each operation toward private constructor fields plus typed `serialize()` output rather than mutable `parameters: Record<string, any>`.
3. Keep `OperationRegistry` as the single descriptor restore/serialize boundary, but strengthen its typing and descriptor validation helpers.
4. Keep `ProjectService` as current-schema command-stream orchestration and avoid broad schema or snapshot redesign.
5. Delete or replace private-cast persistence seams that are directly in descriptor restore/serialization, especially `as unknown as Action` for process-tree action descriptors.
6. Add contract tests proving ProjectService does not import concrete operations and persistence roundtrips through registry descriptors.

## Out of scope / protected surfaces

Do not touch rendering, CSS, canvas interaction, ThreeView/3D overlay behavior, Drive/auth internals, protected config/env files, backend, docs/specs rewrite, package/tooling churn, app-shell production composition redesign, validation-platform work, broad e2e rewrites, unrelated dirty e2e deletions, or old stale audit cycles. Do not read protected `.saivage` config/secret files.

Do not broaden into fixing all private world/domain casts unless the reviewed proposal explicitly accepts a higher-level restructure. If descriptor cleanup hits initialization private world-map undo (`InitializationOps.ts`) or sibling link mutation, stop for a delta proposal rather than silently expanding.

## Dependencies and preservation requirements

Preserve Waves 024-030 outcomes, especially the Cycle 030 app-shell DTO port boundary: app-shell runtime should still pass `ProjectData` through `ProjectSessionPersistenceAdapter`, `DrivePort.createFile/updateFile` stay typed to the session payload, and `DrivePort.loadFile` remains unknown until validation. Save/open/autosave, local persistence, Drive-backed persistence where testable without credentials, undo/redo after load, deterministic replay, current UI/e2e flows, active-plane status, 3D overlay pointer behavior, and live preview must be preserved.

## DELETE candidates

- Delete operation `parameters: Record<string, any>` bags where they only duplicate constructor fields for serialization.
- Delete operation `outputs: Record<string, any>` defaults where a typed output descriptor/result is known.
- Delete `obj(d, 'action') as unknown as Action` by introducing an explicit serialized action descriptor/validator or by excluding process-tree action payload from persistence if proven obsolete by reviewed scope.
- Delete registry/module comments or tests that encode ProjectService concrete-operation switch behavior, if any remain.
- Delete obsolete tests that inspect private operation parameter bags; replace with descriptor/roundtrip contract tests.
- Do not attempt to delete nonexistent ProjectService migration helpers or nonexistent monolithic switch code.

## Stop conditions

Stop and request a reviewed plan/delta correction if:

- The implementation requires a domain snapshot persistence decision instead of command-stream descriptor cleanup.
- ProcessTree action serialization requires a broader process-tree/action model redesign beyond typed descriptor extraction.
- Initialization operation undo requires changing World private ownership APIs.
- Existing dirty e2e deletions need to be resolved to validate the wave.
- Any proposed fix requires rendering/CSS/canvas/3D, Drive/auth internals, backend, package/tooling, or app-shell composition changes.

## Preview and Drive implications

The wave does not redesign Drive/auth. Drive-backed save/open behavior is affected only through the already-typed `ProjectData` payload; live credential-backed smoke may remain unavailable without protected credentials. Validation must still include credential-free ProjectService/app-shell tests, e2e project flow where available, and live preview reachability because command replay errors would be user-visible after open/load.
