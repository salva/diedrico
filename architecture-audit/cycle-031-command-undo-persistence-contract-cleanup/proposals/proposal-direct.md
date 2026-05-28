# Proposal Direct — Typed operation descriptor cleanup inside current command-stream persistence

## Summary

Keep the current architecture choice: **current-schema command-stream persistence**. Do not introduce snapshots. Implement a bounded cleanup that makes operation descriptors and command inspection/restoration explicit enough that `ProjectService` can remain a thin orchestrator and operation serialization no longer depends on broad mutable `parameters: Record<string, any>` bags or private descriptor casts.

This proposal is preferred if review agrees that the remaining smell is contract sharpness, not a missing conceptual layer.

## Target architecture after implementation

- `Command` remains the generic container and owns undo/redo execution state.
- `CommandSnapshot` remains the persistence-facing command DTO.
- `CommandStack` exposes committed-command inspection/restoration through typed public methods only.
- `IOperation` has explicit generic descriptor/output contracts; active persisted operations implement concrete descriptor/output types.
- `OperationRegistry` is the only restore/serialize boundary. It owns descriptor validation, maps op types to restorers, and is the only module that imports all concrete operation classes for persistence.
- `ProjectService` validates the project envelope/current schema, delegates operation descriptor validation/restoration to the registry, replays operations, and restores committed command history. It does not inspect operation parameters, import concrete operations, migrate old schemas, or cast into command/world internals.

## Files to change

### Core contracts

- `frontend/src/commands/operations/IOperation.ts`
  - Keep/finish generic descriptor and output typing.
  - Introduce named aliases if helpful: `OperationType`, `OperationPayload`, `OperationOutputs`, `FlatOperationDescriptor` or similar.
  - Decide one descriptor shape: preferably flat current descriptors for minimal churn, with typed descriptor aliases per operation. Do not add a dual flat+payload path.

- `frontend/src/commands/Command.ts`
  - Preserve `CommandSnapshot` and `Command.restore(...)`.
  - Ensure `addAndExecute(...)` returns the operation-specific `OperationResult` without broad `OperationResult` erasure.
  - Consider deleting or narrowing `getOperations()` if tests no longer need live operation objects; otherwise document it as runtime/test inspection, not persistence.

- `frontend/src/commands/CommandStack.ts`
  - Keep `getCommittedCommands()` and `restoreCommittedCommands(...)` as the public persistence API.
  - Add no private-stack escape hatches.

### Registry and descriptor ownership

- `frontend/src/commands/operations/OperationRegistry.ts`
  - Strengthen registry generics enough to avoid central `as OperationRestorer` where practical.
  - Make `assertOperationDescriptor(...)` only the outer guard and add per-operation descriptor guards/restorers in registration modules.
  - Keep default registration if needed, but tests should prove duplicate registration and unknown op behavior.

- `frontend/src/commands/operations/world/registerWorldOperationDescriptors.ts`
  - Convert helper parsing to named descriptor guard/restorer functions for operation families where direct implementation touches them.
  - Replace untyped `JsonObject` field access with typed descriptor constructors/validators.
  - Keep the registry import of concrete operations here; do not move concrete-operation imports back into `ProjectService`.

- `frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts`
  - Delete `obj(d, 'action') as unknown as Action` by adding an explicit serialized action descriptor/validator or typed action rehydration function.
  - Keep process-tree restorers current-schema only.

### Operation classes

- `frontend/src/commands/operations/world/*.ts`
- `frontend/src/commands/operations/processTree/*.ts`

For actively persisted operations:

- Replace `parameters: Record<string, any>` with private readonly constructor fields and typed descriptor serializers.
- Replace broad `outputs: Record<string, any>` with operation-specific output interfaces where output IDs are required for redo/replay.
- Ensure each `serialize()` returns its declared descriptor type.
- Keep behavior unchanged for `apply`, `undo`, redo ID reuse, and process-tree updates.
- Do not fix unrelated domain private casts unless the specific operation descriptor being converted requires it.

### ProjectService and tests

- `frontend/src/services/ProjectService.ts`
  - Keep current schema version policy.
  - Optionally replace shallow operation validation in `validateSerializedCommand(...)` with a registry-backed descriptor assertion if it can be done without applying operations.
  - Do not add migrations, snapshots, Drive/auth logic, or concrete-operation imports.

- `frontend/tests/unit/commands/operations/operationRegistry.spec.ts`
  - Add coverage for typed descriptor validation, unknown operation rejection, duplicate registration, and no unregistered serialization.

- `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`
- `frontend/tests/integration/projectService.determinism.spec.ts`
- `frontend/tests/unit/services/ProjectService.subprocess.spec.ts`
  - Add/adjust current-schema roundtrip tests for typed descriptors, process-tree action descriptor restore, deterministic IDs/outputs, undo/redo after load.

- `frontend/tests/unit/architecture/importBoundaries.spec.ts` or a new architecture test
  - Assert `ProjectService.ts` does not import concrete operation files.
  - Assert no command persistence path uses `(cmd as any).operations` or `(commandStack as any).undoStack`.
  - Optionally assert operation source no longer declares `parameters: Record<string, any>` for converted persisted operations.

## Files/tests/docs/fixtures to DELETE

- Delete mutable `parameters: Record<string, any>` properties in converted operation classes.
- Delete broad `outputs: Record<string, any>` for converted operations where a typed output interface replaces it.
- Delete the process-tree action descriptor cast `obj(d, 'action') as unknown as Action`.
- Delete tests that assert `operation.parameters` shape or inspect command/private stack internals; replace with descriptor snapshot/roundtrip tests.
- Delete any obsolete serialization test fixtures that encode old broad `any` descriptor behavior.
- Do **not** delete unrelated e2e specs already dirty in the worktree; attribute them as pre-existing.
- Do **not** delete nonexistent ProjectService migration/switch code.

## Expected behavior changes

User-visible behavior should be unchanged:

- Same construction commands and undo/redo behavior.
- Same save/open/autosave payload shape except for rejecting malformed current-schema operation descriptors earlier and more precisely.
- Same deterministic replay and restored command history.
- Same active-plane restoration fallback after load.
- Same live preview, canvas, 3D overlay, and Drive/auth behavior.

Expected internal behavior changes:

- Malformed current-version operation descriptors fail at the registry/descriptor boundary with operation-specific messages instead of failing later during constructor/apply or via broad cast.
- Tests assert descriptors rather than operation mutable `parameters` bags.

## Risks and regressions

- Converting all operation files may be broad. Mitigation: sequence by operation families and keep behavior tests green after each family.
- Process-tree action serialization may reveal the action model is not a stable persistence DTO. If so, stop for restructure/delta rather than casting.
- Initialization operations have private world-map casts for undo; do not expand into World mutation API redesign unless descriptor cleanup cannot pass without it.
- Current dirty e2e deletions may affect mandatory validation; implementation log must attribute and resolve validation status without adopting them silently.
- Global default registry state may create test-order coupling; add tests or reset helpers only if needed.

## Validation plan

Capture logs under `architecture-audit/cycle-031-command-undo-persistence-contract-cleanup/validation/`:

1. Pre-edit scoped `git status --short` and `git diff --stat` for Wave 004 paths, including attribution of pre-existing dirty diffs.
2. Static scans for forbidden persistence seams: `(cmd as any).operations`, `(commandStack as any).undoStack`, `parameters: Record<string, any>` in converted operations, `as unknown as Action`, ProjectService concrete-operation imports, migration/fallback helpers.
3. Focused Vitest:
   - `frontend/tests/unit/commands/operations/operationRegistry.spec.ts`
   - `frontend/tests/unit/commands/command.spec.ts`
   - `frontend/tests/unit/commands/commandStack.spec.ts`
   - `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`
   - `frontend/tests/integration/projectService.determinism.spec.ts`
   - `frontend/tests/unit/services/ProjectService.subprocess.spec.ts`
   - affected operation/factory tests.
4. Root and frontend lint where defined.
5. Root and frontend full Vitest.
6. Root and frontend build.
7. Root/frontend Playwright e2e, including project save/open or current project-flow coverage where credential-free.
8. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and live smoke of create/save/open-equivalent/undo-redo where possible without credentials.

## Protected surfaces

No rendering/CSS/canvas/3D behavior redesign; no Drive/auth internals; no backend/docs/spec rewrite; no package/tooling churn; no app-shell composition redesign; no validation-platform work; no broad e2e rewrite; no protected config/secret reads; no stale audit-history mining; no unrelated dirty-file normalization.

## Preservation requirements

- Preserve Cycle 030 DTO port: app-shell persistence payload remains `ProjectData`, create/update use typed payload, load remains `unknown` until validation.
- Preserve Waves 024-030 behavior around runtime session restore, selection, active planes, 3D overlay pointer ownership, and live preview.
- Preserve current schema-only policy: unsupported schema versions are rejected, not migrated.
- Preserve command-sourced persistence unless restructure proposal is separately selected.

## Stop conditions

- Process-tree action descriptors cannot be made current-schema typed without changing the action/domain model.
- Operation redo/replay IDs require new World/domain mutation APIs.
- Validation requires fixing unrelated dirty e2e deletions or rendering/3D behavior.
- A domain snapshot is required to remove private casts.
- Any implementation wants to reintroduce migrations, compatibility shims, broad `any`, `@ts-ignore`, or dual flat/payload descriptor formats.
