# Proposal Direct — Typed Operation Registry + Explicit Command/Undo Restoration APIs

## Summary

Keep the existing command-sourced persistence architecture, but make it explicit and typed. Move operation serialization/deserialization into a dedicated operation contract/registry module, add typed `Command`/`CommandStack` APIs for restoration and inspection, add a typed `World` ID-counter restore/peek API, and shrink `ProjectService` to project-file orchestration.

This proposal is the direct implementation of Wave 004 because it preserves the chosen command-stream model described by current `ProjectService` (`frontend/src/services/ProjectService.ts:1-15`) while deleting the private casts and monolithic service-layer reconstruction switch.

## Current evidence

- `Command` already has `getOperations(): readonly IOperation[]` but persistence ignores it and reads `(cmd as any).operations` (`frontend/src/commands/Command.ts:101-107`; `frontend/src/services/ProjectService.ts:267-282`).
- `CommandStack` exposes committed commands for serialization but lacks restoration APIs, forcing `(commandStack as any).undoStack.push(command)` during load (`frontend/src/commands/CommandStack.ts:132-137`; `frontend/src/services/ProjectService.ts:369-370`).
- `World.nextId` is private and only has incrementing getters/generators (`frontend/src/domain/world/World.ts:136`, `frontend/src/domain/world/World.ts:267-300`), forcing `(world as any).nextId = data.nextElementId` (`frontend/src/services/ProjectService.ts:311-314`).
- The main operation boundary is untyped: `SerializedOperation` is `{ opType: string; [key: string]: any }`, `IOperation.parameters` and `outputs` are `Record<string, any>`, and `validateProjectData(data: any)` validates only top-level shape (`frontend/src/commands/operations/IOperation.ts:116-160`; `frontend/src/services/ProjectService.ts:90-96`; `frontend/src/services/ProjectService.ts:764-793`).
- `ProjectService` imports all concrete operation classes and reconstructs them through one switch (`frontend/src/services/ProjectService.ts:23-65`, `frontend/src/services/ProjectService.ts:395-761`).
- Migration/backcompat/corruption branches remain contrary to no-backcompat priorities (`frontend/src/services/ProjectService.ts:99-255`, `frontend/src/services/ProjectService.ts:423-429`, `frontend/src/services/ProjectService.ts:572-581`, `frontend/src/services/ProjectService.ts:583-630`).

## Target outcome

- Project files remain command streams.
- `ProjectService` depends on a small persistence contract module instead of every operation class.
- Every persisted operation has a discriminated descriptor type and a registered restore function.
- Commands and command stacks expose explicit typed APIs for snapshot/restore. No persistence code constructs fake command objects or writes private stacks.
- `World` exposes a narrow ID-counter restore/peek API. No persistence code writes private `nextId`.
- Main persistence boundaries use typed project data and runtime validation, not broad `any`.
- Old schema migration, corrupted-operation skip, and legacy format fallbacks are deleted.

## Files to change

### Command and undo APIs

- `frontend/src/commands/Command.ts`
  - Add `CommandSnapshot` / `RestoredCommandInput` types containing `{ id, timestamp, description, operations }`.
  - Add `toSnapshot()` or `getSerializableOperations()` that uses `getOperations()` internally and never exposes mutable internals.
  - Add a static restoration factory, e.g. `Command.restore(input, world)`, that creates a real committed command with restored ID/timestamp/status/operations.
  - Make constructor optionally accept a typed internal identity argument only for restore, or introduce a private constructor path if TypeScript allows a clean factory.
  - Delete stale comments tying persistence to broad operation `parameters` once the registry owns serialization.

- `frontend/src/commands/CommandStack.ts`
  - Add `getCommittedCommands(): readonly Command[]` or keep `getCommands()` but return readonly.
  - Add `restoreCommittedCommands(commands: readonly Command[]): void` or `replaceHistory({ undo, redo })` if redo restoration is explicitly chosen. For this wave, restore committed/undo stack only unless tests prove redo state is persisted.
  - Ensure restore notifies listeners once and enforces committed command status.
  - Delete any need for callers to write `undoStack`/`redoStack`.

- `frontend/src/domain/world/World.ts`
  - Add `peekNextId(): number` (or redefine `getNextId()` usage carefully) for serialization without incrementing.
  - Add `restoreNextId(nextElementId: number): void` with positive-integer validation.
  - Keep actual ID generation methods unchanged except for using the restored counter.

### Operation contract and registry

- `frontend/src/commands/operations/IOperation.ts`
  - Replace `Record<string, any>` parameters/outputs/serialized shapes at the main interface with JSON value types and generic operation descriptor types.
  - Example types:
    - `type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }`
    - `interface OperationDescriptor<TType extends string, TPayload extends JsonObject> { opType: TType; payload: TPayload; outputs?: JsonObject }`
    - `interface IOperation<TDescriptor extends OperationDescriptor = OperationDescriptor> { readonly type: TDescriptor['opType']; serialize(): TDescriptor; ... }`
  - Delete fallback-oriented documentation that says ProjectService will use `parameters` when `serialize()` is absent.

- Create `frontend/src/commands/operations/OperationRegistry.ts`
  - Own the mapping from `opType` to typed `deserialize` functions.
  - Export `serializeOperation(op: IOperation): SerializedOperationDescriptor` and `deserializeOperation(descriptor: SerializedOperationDescriptor): IOperation`.
  - Register operation descriptors by importing operation groups or explicit per-operation descriptor modules.
  - Include a runtime assertion that every registered descriptor has a unique `opType`.

- Operation files under `frontend/src/commands/operations/world/**`, `processTree/**`, and active `viewState/**` if persisted
  - Convert each active operation to return a typed descriptor from `serialize()`.
  - Provide a colocated `restore`/`fromDescriptor` function or static factory used by the registry.
  - Stop mutating broad `parameters` for persistence. Operations may keep typed readonly input fields and typed output fields, but serialization must be explicit.
  - Normalize current format only. Use one canonical vector/matrix representation (arrays are already emitted by several serializers, e.g. `AddFreePoint2DOp.serialize()` at `frontend/src/commands/operations/world/AddFreePointOp.ts:56-62`) and delete old object-vs-array acceptance.

### Project service

- `frontend/src/services/ProjectService.ts`
  - Keep `ProjectData` as the app-level file shape but type it around command snapshots and operation descriptors.
  - Replace direct imports of concrete operations (`frontend/src/services/ProjectService.ts:23-65`) with imports from the registry/contract module only.
  - Replace `serializeCommands(commandStack, nextElementId, projectName)` internals with typed command-stack and operation-registry APIs.
  - Replace `deserializeCommands(...)` fake command object and private stack mutation with `Command.restore(...)` + `commandStack.restoreCommittedCommands(...)`.
  - Delete `migrateIdToCamelCase`, `migrateHierarchicalId`, `migrateOperationParams`, and `migrateProjectData`.
  - Delete `reconstructOperation()` switch from `ProjectService`; if callers still need deserialization for tests, expose it from `OperationRegistry` instead.
  - Replace `validateProjectData(data: any)` with a typed parser/validator for the current schema only.
  - Remove debug logging tied to load/replay internals.

- `frontend/src/App.vue`
  - Replace `world.getNextId()` save calls with non-mutating `world.peekNextId()` or equivalent. Current save call passes `world.getNextId()` (`frontend/src/App.vue:386`, `frontend/src/App.vue:524`, `frontend/src/App.vue:547`, `frontend/src/App.vue:584`), which increments the counter during save if unchanged.
  - Keep Drive/local orchestration unchanged except for adjusted ProjectService API names/types.

### Tests

- `frontend/tests/unit/commands/command.spec.ts`
  - Add command snapshot/restore tests covering restored identity, timestamp, status, operation order, undo, and redo.

- `frontend/tests/unit/commands/commandStack.spec.ts`
  - Add restore API tests and remove any assumptions that tests can inspect private stacks.

- Create or replace with `frontend/tests/unit/commands/operations/operationRegistry.spec.ts`
  - Assert every active operation type is registered exactly once.
  - Assert deserializing unknown current-schema operation fails loudly.
  - Assert registered descriptor round trips preserve IDs/outputs.

- `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`, `ProjectService.selfContainment.spec.ts`, `ProjectService.subprocess.spec.ts`, and integration determinism/cascade deletion specs
  - Update to the typed current-schema contract.
  - Repair stale `serializeCommands(commandStack, 'name')` call sites rather than adding compatibility overloads.

- `frontend/tests/unit/architecture/serializationCoverage.spec.ts`
  - Replace with a registry coverage test. Delete instructions to edit `ProjectService.reconstructOperation()`.

- `frontend/tests/unit/services/ProjectService.serialization.test.ts`
  - Delete or rewrite as registry contract tests. It currently directly calls the private/service reconstruction path for ad hoc shapes (`frontend/tests/unit/services/ProjectService.serialization.test.ts:11-79` and following), which should no longer exist.

- `frontend/tests/e2e/persistence.spec.ts`
  - Delete or replace. Current file targets `localhost:3000/api/projects` and legacy `elements2D` DTOs (`frontend/tests/e2e/persistence.spec.ts:18-101`, `frontend/tests/e2e/persistence.spec.ts:103-169`) rather than active frontend/Drive/local command persistence.

## Explicit DELETE list

- Delete private-cast patterns:
  - `(cmd as any).operations` in `ProjectService.serializeCommands()` (`frontend/src/services/ProjectService.ts:271`).
  - `(world as any).nextId` in `ProjectService.deserializeCommands()` (`frontend/src/services/ProjectService.ts:313`).
  - `(op as any).parameters` debug path (`frontend/src/services/ProjectService.ts:356-358`).
  - `(commandStack as any).undoStack.push(...)` (`frontend/src/services/ProjectService.ts:369-370`).
- Delete broad fallback serialization path that uses `op.parameters`/`op.outputs` when `serialize()` is absent (`frontend/src/services/ProjectService.ts:271-281`; `frontend/src/commands/operations/IOperation.ts:150-154`).
- Delete migration/backcompat code:
  - ID migration helpers and logs (`frontend/src/services/ProjectService.ts:99-255`).
  - Corrupted `AddLine2DPerpendicularToLine` skip returning `null as any` (`frontend/src/services/ProjectService.ts:423-429`).
  - Legacy `AddIntersectionPoint2D` branch if no active current-format command still emits it (`frontend/src/services/ProjectService.ts:564-566`).
  - Legacy `AddPlane3D` orientation branch (`frontend/src/services/ProjectService.ts:572-581`).
  - Object-format vector fallbacks and parameter-name fallbacks (`frontend/src/services/ProjectService.ts:583-630`) unless the current serializer still emits them; if so, change the serializer and tests to one current shape.
- Delete the monolithic operation reconstruction switch from `ProjectService` (`frontend/src/services/ProjectService.ts:395-761`) after registry replacement.
- Delete stale tests/docs that encode old architecture:
  - `frontend/tests/unit/architecture/serializationCoverage.spec.ts` old switch coverage.
  - `frontend/tests/unit/services/ProjectService.serialization.test.ts` direct service-switch tests, unless rewritten into registry tests.
  - `frontend/tests/e2e/persistence.spec.ts` backend/legacy DTO e2e, unless rewritten around current app persistence.

## Expected behavior change

- Current-format project save/open continues to work for active command histories.
- Undo/redo after load uses real restored `Command` instances and the typed `CommandStack` restoration API, not fake object literals.
- Saving a project no longer increments the world element counter as a side effect.
- Old schema versions, corrupted operation records, and legacy object/parameter aliases fail fast with clear current-schema errors instead of being migrated or skipped.
- Drive-backed persistence behavior remains the same at the user level because `App.vue` still hands project data to `GoogleDriveService`; only the project data contract changes internally.

## Validation plan for implementation wave

Capture all logs under `architecture-audit/cycle-004-command-undo-persistence-contract/validation/`.

1. Static deletion checks:
   - `rg -n "as any|Record<string, any>|reconstructOperation|migrateProjectData|migrateIdToCamelCase|migrateOperationParams|undoStack\.push|Skipping corrupted|Legacy|backward compatibility" frontend/src/commands frontend/src/services/ProjectService.ts frontend/tests`
   - Allow only intentional test strings in new architecture tests.
2. Focused Vitest:
   - `npm run test --workspace=frontend -- tests/unit/commands/command.spec.ts tests/unit/commands/commandStack.spec.ts tests/unit/commands/operations/operationRegistry.spec.ts tests/unit/services/ProjectService.roundTrip.spec.ts tests/unit/services/ProjectService.selfContainment.spec.ts tests/unit/services/ProjectService.subprocess.spec.ts tests/integration/projectService.determinism.spec.ts tests/integration/projectService.cascadeDeletion.spec.ts`
3. Contract/determinism tests to add or update:
   - Save/open preserves current world geometry and process tree.
   - Load then undo/redo works for point/line/circle/guide/intersection/auxiliary-plane/process-tree operations.
   - Repeated serialization of the same command history is stable except known metadata fields (`id`, `created`, `modified`) if still nondeterministic.
   - Unknown op type and old schema fail fast.
   - Saving does not increment the world ID counter.
4. Full suite/cadence per project protocol:
   - `npm run lint` at root and frontend where defined.
   - Full `npm run test` at root plus backend tests if root still delegates poorly.
   - `npm run build` at root, frontend, and backend where defined.
   - `npm run test:e2e --workspace=frontend` for persistence/user-facing frontend changes, with existing malformed e2e debt classified if still present.
5. Live app / Playwright MCP verification:
   - Create a project, construct representative geometry, save/open through current UI/Drive/local path if credentials/UI allow without secret access.
   - If Drive credentials are unavailable, validate Drive-backed code path with mocked `GoogleDriveService` unit/integration tests and document why live Drive was not exercised.
   - Verify undo/redo after load in the live app.
6. Preview refresh:
   - Restart preview on `0.0.0.0`, probe `http://127.0.0.1:5173/`, and log PID/probe output.

## Risks

- Operation registry churn is broad because many operation files expose `Record<string, any>` today. Keep the change mechanical and current-format-only.
- Some existing tests are stale or encode old ProjectService internals. Implementation should delete/rewrite them rather than introduce overloads/shims.
- A registry can become a new god-module if every descriptor lives in one file. Prefer operation-family descriptor modules imported by a small registry composer.
- Project metadata still uses timestamps and generated project IDs; deterministic tests should compare domain/command content while explicitly excluding metadata unless the implementation also chooses deterministic metadata inputs.
