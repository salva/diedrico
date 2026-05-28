# Proposal Restructure — Split persistence contract from operation runtime before descriptor cleanup

## Summary

This proposal tests whether Cycle 031 should move one conceptual layer higher before editing every operation class. It keeps command-stream persistence as the likely target, but first introduces a **persistence contract module** that is independent of mutable operation runtime objects. If review finds registry/operation cleanup cannot safely delete private casts without a stable persistence DTO layer, select this proposal.

This is not a domain snapshot proposal by default. It is a deliberate split between:

1. Runtime operations: apply/undo objects with transient outputs and world access.
2. Persistence descriptors: current-schema DTOs validated and restored by contract modules.
3. ProjectService: envelope orchestration only.

A full snapshot-vs-command-sourcing decision is a stop condition unless evidence shows command descriptors cannot be made stable.

## Target architecture after implementation

- New command persistence contract modules own DTO types, validation, and registry composition, e.g. `frontend/src/commands/persistence/` or `frontend/src/application/projectPersistence/commandStream/`.
- Runtime operation classes may keep internal fields, but persistence descriptors are created through explicit adapter functions rather than by exposing `parameters` bags.
- The operation registry becomes a persistence registry, not a generic runtime singleton. It maps descriptor types to operation factories and operation instances to descriptor factories through typed registrations.
- Process-tree action persistence is explicitly modeled as an action descriptor, not `Action` cast-through JSON.
- `ProjectService` imports the command-stream persistence contract module, not `OperationRegistry` directly if a clearer boundary emerges.
- Unsupported old schemas remain rejected; no migration layer is reintroduced.

## Files to change

### New or moved contract boundary

- Add a focused module such as:
  - `frontend/src/commands/persistence/CommandStreamContract.ts`
  - `frontend/src/commands/persistence/OperationDescriptorRegistry.ts`
  - `frontend/src/commands/persistence/descriptors/worldDescriptors.ts`
  - `frontend/src/commands/persistence/descriptors/processTreeDescriptors.ts`

These modules define:

- `PersistedCommandStream` or equivalent alias for current `ProjectData.commands` command-stream content.
- Discriminated union(s) of operation descriptors for active persisted operation types.
- Pure validation functions for project/command/operation descriptors.
- Restore functions from descriptor to runtime operation.
- Snapshot functions from runtime operation to descriptor.

### Existing modules to simplify

- `frontend/src/commands/operations/OperationRegistry.ts`
  - Either move into `commands/persistence/` or reduce it to the persistence registry implementation.
  - Delete global mutable default registration if a composed registry can be injected/tested cleanly.

- `frontend/src/commands/operations/world/registerWorldOperationDescriptors.ts`
- `frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts`
  - Move descriptor definitions/validators out of runtime operation folders if that yields cleaner dependency direction.
  - Keep concrete operation imports only in the persistence adapter layer.

- `frontend/src/commands/operations/**/*.ts`
  - Remove serializer responsibility from operation classes if selected boundary says runtime operations should not own persistence.
  - Or keep `serialize()` as a thin call into descriptor adapter only if that avoids overreach.

- `frontend/src/commands/Command.ts`
  - `toSnapshot()` should call the command-stream persistence contract, not a generic operation singleton, if the registry is moved.
  - `Command.restore(...)` remains the only command history restoration API.

- `frontend/src/services/ProjectService.ts`
  - Delegate to a single command-stream contract: validate command stream, restore operations, replay world, restore stack.
  - Continue strict current-schema validation.

### Tests

- Add a new contract test suite for the persistence module.
- Update operation registry tests to target the new persistence registry or delete them if superseded.
- Keep ProjectService roundtrip/determinism/subprocess tests but assert they use the contract boundary rather than operation internals.
- Add architecture tests for dependency direction: `ProjectService` -> command-stream contract only; contract -> concrete operations; runtime operations do not import `ProjectService`.

## Files/tests/docs/fixtures to DELETE

- Delete `OperationRegistry` global singleton functions if replaced by an explicit command-stream persistence registry.
- Delete `serialize()` methods from operation classes if persistence adapters fully own descriptor extraction.
- Delete operation `parameters: Record<string, any>` bags where they exist only for persistence serialization.
- Delete process-tree action JSON-to-`Action` cast-through path.
- Delete tests that inspect operation `parameters`, global registry ordering, or ProjectService concrete-operation reconstruction.
- Delete compatibility branches, migrations, corrupted-operation fallbacks, or dual descriptor formats if any are discovered.

## Expected behavior changes

User-visible behavior should still be unchanged. Internal behavior changes are larger than direct proposal:

- Runtime operations no longer have to expose persistence-shaped mutable state.
- Persistence contract can validate descriptor payloads without instantiating operations.
- Test setup may use an injected/constructed registry rather than global default registry.
- Malformed descriptors fail at pure validation before runtime replay.

## Risks and regressions

- Higher churn than direct proposal: moving registry ownership may touch many operation files and tests.
- Removing `serialize()` from operation classes could affect factories/tests that currently snapshot commands directly.
- If descriptor extraction needs access to private operation constructor fields, implementation must either add intentional read methods or keep operation-owned `serialize()`; do not use private casts.
- A pure persistence module can become a new god-module if all operation descriptors live in one file. Keep operation-family files small.
- If implementation discovers a domain snapshot would be more stable than command sourcing, stop for plan correction; do not smuggle snapshot redesign into this wave.

## Validation plan

Same mandatory cadence as direct proposal, plus:

1. Architecture test that only the command persistence contract imports concrete operations for persistence restore/snapshot.
2. Contract-only tests that validate descriptors without constructing a `World`.
3. Tests for registry composition/injection if global singleton is removed.
4. Focused ProjectService tests proving save/open/replay/undo-redo after load still use current schema and reject unsupported schemas.
5. Static scans proving deleted serializer/global-registry/private-cast surfaces are gone.

## Protected surfaces

Same as direct proposal: no rendering/CSS/canvas/3D redesign, Drive/auth internals, backend/docs/spec rewrite, package/tooling churn, app-shell composition redesign, validation-platform work, broad e2e rewrite, protected config/secret reads, stale audit mining, or unrelated dirty-file normalization.

## Preservation requirements

- Preserve command-stream persistence unless review explicitly decides this wave must become a plan-correction cycle.
- Preserve Cycle 030 app-shell DTO port boundary.
- Preserve current schema-only strict rejection.
- Preserve save/open/autosave/undo-redo/deterministic replay behavior.
- Preserve live preview and 3D overlay behavior.

## Stop conditions / plan-correction triggers

Choose a plan-correction or delta review before implementation if any of these become true:

- Current command descriptors cannot represent required world state without reading broad domain private internals.
- ProcessTree action DTO cleanup requires Wave 005 process-tree ownership redesign first.
- The clean solution is a domain snapshot rather than command sourcing.
- Moving registry ownership would reopen app-shell, rendering, Drive/auth, backend, package/tooling, or UI composition surfaces.
- The implementation would need a dual old+new descriptor format, migration shim, or corrupted-operation compatibility path.

## Recommendation against overuse

Do not select this proposal merely because it is cleaner in the abstract. Select it only if critic/reviewer agrees direct operation-level typing would leave a muddled boundary or fail to delete the process-tree cast/private serialization seams. Otherwise the direct proposal better fits the bounded central wave.
